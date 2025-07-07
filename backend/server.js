require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const policyData = require(path.join(__dirname, '..', 'policiesandlaws.json'));
const { GoogleGenerativeAI } = require('@google/generative-ai');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3001;

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
    const permitsPath = path.join(__dirname, 'permits.json');
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
🧾 Policy: Animal Factory Farming (Regulation) Bill, 2020

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
- Cites Animal Factory Farming Bill 2020
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

    if (!emailUser  || !emailPass) {
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

// Root route
app.get('/', (req, res) => {
    res.send('Backend server is running!');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});