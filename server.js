require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const policyData = require(path.join(__dirname, 'policiesandlaws.json'));
const { GoogleGenerativeAI } = require('@google/generative-ai');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables
const geminiApiKey = process.env.GEMINI_API_KEY;
const emailUser  = process.env.USER_EMAIL;
const emailPass = process.env.USER_PASS;

// Validate environment variables
if (!geminiApiKey) {
    console.error('GEMINI_API_KEY environment variable is not set.');
    process.exit(1);
}
if (!emailUser  || !emailPass) {
    console.warn('USER_EMAIL or USER_PASS environment variables are not set. Email functionality may not work.');
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

app.use(cors());
app.use(express.json());

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

// GET /api/permits
app.get('/api/permits', async (req, res) => {
    const permitsPath = path.join(__dirname, 'backend', 'permits.json');
    try {
        const data = await fs.promises.readFile(permitsPath, 'utf8');
        const permits = JSON.parse(data);
        res.json(permits);
    } catch (err) {
        console.error('Error reading or parsing permits.json:', err);
        res.status(500).json({ message: 'Error reading permit data' });
    }
});

// POST /api/generate-letter
app.post('/api/generate-letter', async (req, res) => {
    try {
        const { permitDetails } = req.body;
        const {
            yourName, yourAddress, yourCity,
            yourPostalCode, yourPhone, yourEmail, currentDate
        } = permitDetails;

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
 🧾 Legal Framework:
 
 1. Environment Protection Act, 1986
    - Section 6: Powers of Central Government to take measures to protect and improve environment
    - Section 7: Restrictions on location of industries
 
 2. Prevention of Cruelty to Animals Act, 1960
    - Section 11: Prohibition of cruelty to animals
    - Section 13: Experimentation on animals
 
 3. Animal Factory Farming (Regulation) Bill, 2020
    - Article 5: Registration and licensing requirements
    - Article 8: Animal welfare standards
    - Article 12: Environmental impact assessment
    - Article 15: Waste management requirements
 
 4. Water (Prevention and Control of Pollution) Act, 1974
    - Section 24: Prohibition of discharge of pollutants
 
 5. Air (Prevention and Control of Pollution) Act, 1981
    - Section 21: Power to declare emission standards
 
 Detected Violations:
 ${violations.length ? "- " + violations.join("\n- ") : "None clearly stated, but further audit required."}
 `;

        const prompt = `
 You are an expert public advocate and environmental lawyer.

 Write a strong, formal objection letter regarding this factory farm permit:

 📄 Permit Info:
 - Project: ${permitDetails.project_title}
 - Location: ${permitDetails.location}
 - Activity: ${permitDetails.activity}
 - Capacity: ${permitDetails.capacity}
 - Effluent (Trade/Sewage): ${permitDetails.effluent_limit?.trade} / ${permitDetails.effluent_limit?.sewage}
 - Notes: ${permitDetails.notes}

 📚 Legal Basis:
 ${policySummary}

 🧍 Personal Info:
 Name: ${yourName}
 Address: ${yourAddress}, ${yourCity}, ${yourPostalCode}
 Phone: ${yourPhone}
 Email: ${yourEmail}
 Date: ${currentDate}

 Structure the letter as:
 - Professional tone
 - Based on real legal violations from policy
 - Cites specific sections of Indian environmental and animal welfare laws
 - Include specific legal citations from the provided list
 - Ends with a strong request to reject or review the permit
 `;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
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

// Check if we have a built frontend
const frontendBuildPath = path.join(__dirname, 'frontend', '.next');
if (fs.existsSync(frontendBuildPath)) {
    console.log('Frontend build found, serving static files...');
    
    // Serve static files from Next.js build
    app.use('/_next', express.static(path.join(__dirname, 'frontend', '.next')));
    
    // For all non-API routes, serve the Next.js app
    app.get(/^(?!\/api\/).*$/, (req, res) => {
        // For now, just redirect to the development server or show a simple HTML page
        res.send(`
            <html>
            <head>
                <title>Automated Factory Farm Objection Generator</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                    .container { max-width: 800px; margin: 0 auto; }
                    .status { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .api-links { background: #f0f8ff; padding: 15px; border-radius: 5px; }
                    code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🌿 Automated Factory Farm Objection Generator (AFOG)</h1>
                    <p><strong>Mission:</strong> Auto-detect permit filings, generate compelling objection letters with legal citations. Scale objection capacity 100x.</p>
                    
                    <div class="status">
                        <h3>✅ Status: Backend Server Running</h3>
                        <p>The backend server is operational and ready to process permit objections.</p>
                    </div>
                    
                    <div class="api-links">
                        <h3>🔗 Available API Endpoints:</h3>
                        <ul>
                            <li><a href="/api/permits">GET /api/permits</a> - View available permits</li>
                            <li><code>POST /api/generate-letter</code> - Generate objection letters</li>
                            <li><code>POST /api/send-email</code> - Send objection emails</li>
                        </ul>
                    </div>
                    
                    <h3>🚀 For Full UI Experience:</h3>
                    <p>Run the frontend development server:</p>
                    <pre><code>cd frontend && npm run dev</code></pre>
                    <p>Then access the application at <a href="http://localhost:3000">http://localhost:3000</a></p>
                    
                    <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                        <p><em>"We help communities say NO to unethical farms, instantly."</em></p>
                    </footer>
                </div>
            </body>
            </html>
        `);
    });
} else {
    // Development mode fallback
    app.get(/^(?!\/api\/).*$/, (req, res) => {
        res.send(`
            <h1>AFOG - Development Mode</h1>
            <p>Frontend build not found. For full functionality:</p>
            <ol>
                <li>Build the frontend: <code>cd frontend && npm run build</code></li>
                <li>Or run frontend dev server: <code>cd frontend && npm run dev</code></li>
            </ol>
            <p>Backend API is running at <a href="/api/permits">/api/permits</a></p>
        `);
    });
}

// Export the app for use in the main server
module.exports = app;

// Only start the server if this file is run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🌿 AFOG Server running on port ${PORT}`);
        console.log(`📊 Backend API ready`);
        console.log(`🎯 Frontend build available: ${fs.existsSync(frontendBuildPath)}`);
        console.log(`🔗 Access application at: http://localhost:${PORT}`);
    });
}