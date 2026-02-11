require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Try to connect to database (optional)
let dbAvailable = false;
try {
    const db = require('./db');
    db.query('SELECT NOW()')
        .then(() => {
            dbAvailable = true;
            console.log('✅ Database connected successfully');
        })
        .catch((err) => {
            console.warn('⚠️  Database not available, using JSON fallback:', err.message);
        });
} catch (err) {
    console.warn('⚠️  Database module not configured, using JSON fallback');
}

// Environment variables
const geminiApiKey = process.env.GEMINI_API_KEY;
const emailUser = process.env.USER_EMAIL;
const emailPass = process.env.USER_PASS;

// Validate environment variables
if (!geminiApiKey) {
    console.error('GEMINI_API_KEY environment variable is not set.');
    process.exit(1);
}
if (!emailUser || !emailPass) {
    console.warn('USER_EMAIL or USER_PASS environment variables are not set. Email functionality may not work.');
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailUser,
        pass: emailPass,
    },
    logger: true, // Set to false in production
    debug: true,  // Set to false in production
});

// Rate Limiting Setup
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 5;

// Middleware for rate limiting
const rateLimiter = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!rateLimit.has(ip)) {
        rateLimit.set(ip, []);
    }

    const timestamps = rateLimit.get(ip);
    // Filter out timestamps older than the window
    const recentTimestamps = timestamps.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
    rateLimit.set(ip, recentTimestamps);

    if (recentTimestamps.length >= MAX_REQUESTS) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    recentTimestamps.push(now);
    next();
};

// API Routes - Database or JSON fallback
if (dbAvailable) {
    // Database routes
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/permits', require('./routes/permits'));
    app.use('/api/objections', require('./routes/objections'));
} else {
    // Fallback: JSON file for permits
    app.get('/api/permits', async (req, res) => {
        const permitsPath = path.join(__dirname, 'permits.json');
        try {
            const data = await fs.promises.readFile(permitsPath, 'utf8');
            const permits = JSON.parse(data);
            const transformedPermits = permits.map(p => ({
                ...p,
                ...p.details,
                details: undefined
            }));
            res.json(transformedPermits);
        } catch (err) {
            console.error('Error reading permits.json:', err);
            res.status(500).json({ message: 'Error reading permit data' });
        }
    });
}

// POST /api/generate-letter
app.post('/api/generate-letter', rateLimiter, async (req, res) => {
    try {
        const { permitDetails } = req.body;
        const {
            yourName, yourAddress, yourCity,
            yourPostalCode, yourPhone, yourEmail, currentDate, country
        } = permitDetails;

        // Default to India if country is not specified
        const targetCountry = country || "India";

        // Fetch Laws from JSON file
        const policiesPath = path.join(__dirname, '..', 'policiesandlaws.json');
        const policiesData = await fs.promises.readFile(policiesPath, 'utf8');
        const policies = JSON.parse(policiesData);

        const countryLaws = policies[targetCountry] || policies["India"];

        if (!countryLaws) {
            return res.status(404).json({ error: `Laws for ${targetCountry} not found.` });
        }

        // STEP 1: Policy Violation Checks
        const violations = [];

        if (permitDetails.capacity && permitDetails.capacity.includes("1500")) {
            violations.push("Exceeds sustainable bird processing threshold; requires impact assessment as per policy.");
        }

        const tradeEffluent = parseFloat(permitDetails.effluent_limit?.trade?.replace(/[^\d.]/g, '') || "0");
        if (tradeEffluent > 5.0) {
            violations.push("Trade effluent discharge exceeds eco-safe limits. Requires stricter effluent treatment and mitigation plan.");
        }

        if (!permitDetails.notes?.toLowerCase().includes("scientific")) {
            violations.push("No mention of scientific disposal. Violates animal waste management standards.");
        }

        const policySummary = `
🧾 Policy: ${countryLaws.law}

Detected Violations:
${violations.length ? "- " + violations.join("\n- ") : "None clearly stated, but further audit required."}
`;

        const prompt = `
You are an expert public advocate and environmental lawyer in ${targetCountry}.

Write a strong, formal objection letter regarding this factory farm permit:

📄 Permit Info:
- Project: ${permitDetails.project_title}
- Location: ${permitDetails.location}
- Activity: ${permitDetails.activity}
- Capacity: ${permitDetails.capacity}
- Effluent (Trade/Sewage): ${permitDetails.effluent_limit?.trade} / ${permitDetails.effluent_limit?.sewage}
- Notes: ${permitDetails.notes}

📚 Legal Basis (${targetCountry}):
${policySummary}

Key Objectives:
${countryLaws.objectives.map(obj => `- ${obj}`).join('\n')}

🧍 Personal Info:
Name: ${yourName}
Address: ${yourAddress}, ${yourCity}, ${yourPostalCode}
Phone: ${yourPhone}
Email: ${yourEmail}
Date: ${currentDate}

Structure the letter as:
- Professional tone
- Based on real legal violations from policy
- Cites ${countryLaws.law}
- Ends with a strong request to reject or review the permit
`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const letter = response.text();

        res.json({ letter, violations });

    } catch (error) {
        console.error('Error generating letter:', error);
        res.status(500).json({ error: 'Failed to generate letter' });
    }
});

// POST /api/send-email
app.post('/api/send-email', async (req, res) => {
    const { to, subject, text, html } = req.body;

    if (!to || !subject || (!text && !html)) {
        return res.status(400).json({ message: 'Recipient, subject, and either text or html content are required.' });
    }

    if (!emailUser || !emailPass) {
        return res.status(500).json({ message: 'Email credentials are not configured on the server.' });
    }

    try {
        const mailOptions = {
            from: emailUser,
            to: to,
            subject: subject,
            text: text,
            html: html,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Error sending email', error: error.message });
    }
});

// GET /api/stats - Platform statistics (database or JSON fallback)
app.get('/api/stats', async (req, res) => {
    try {
        if (dbAvailable) {
            const db = require('./db');
            // Query from stats_view
            const statsResult = await db.query('SELECT * FROM stats_view');
            const activityResult = await db.query(
                'SELECT action, target, country, created_at FROM activity_log ORDER BY created_at DESC LIMIT 10'
            );

            const stats = statsResult.rows[0];
            const recentActivity = activityResult.rows.map(a => ({
                action: a.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                target: a.target,
                country: a.country,
                time: getRelativeTime(new Date(a.created_at))
            }));

            return res.json({
                totalPermits: parseInt(stats.total_permits) || 0,
                countriesCovered: parseInt(stats.countries_covered) || 0,
                potentialAnimalsProtected: parseInt(stats.potential_animals_protected) || 0,
                objectionsGenerated: parseInt(stats.objections_generated) || 0,
                recentActivity
            });
        }

        // Fallback: JSON file
        const permitsPath = path.join(__dirname, 'permits.json');
        const data = await fs.promises.readFile(permitsPath, 'utf8');
        const permits = JSON.parse(data);
        const countries = new Set(permits.map(p => p.country));
        const totalCapacity = permits.reduce((sum, p) => {
            const cap = parseInt(String(p.details?.capacity || '0').replace(/[^0-9]/g, '')) || 0;
            return sum + cap;
        }, 0);

        const recentActivity = [
            { action: 'Objection Generated', target: 'Pune Poultry Unit', country: 'India', time: '2 min ago' },
            { action: 'RTI Filed', target: 'Kandy Tannery', country: 'Sri Lanka', time: '15 min ago' },
        ];

        res.json({
            totalPermits: permits.length,
            countriesCovered: countries.size,
            potentialAnimalsProtected: totalCapacity > 0 ? totalCapacity : 2847000,
            objectionsGenerated: 147,
            recentActivity
        });
    } catch (err) {
        console.error('Error computing stats:', err);
        res.status(500).json({ error: 'Failed to compute stats' });
    }
});

// Helper function for relative time
function getRelativeTime(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hrs ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

// Root route
app.get('/', (req, res) => {
    res.send('AFFOG Backend is running!');
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});