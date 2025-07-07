require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const nodemailer = require('nodemailer'); // Import nodemailer

const app = express();
const PORT = process.env.PORT || 3001;

// Access your API key as an environment variable (recommended)
const geminiApiKey = process.env.GEMINI_API_KEY;
const emailUser = process.env.EMAIL_USER; // Your email address
const emailPass = process.env.EMAIL_PASS; // Your email password or app-specific password

// Check if API key is provided
if (!geminiApiKey) {
    console.error('GEMINI_API_KEY environment variable is not set.');
    process.exit(1); // Exit if API key is missing
}

// Check if email credentials are provided
if (!emailUser || !emailPass) {
    console.warn('EMAIL_USER or EMAIL_PASS environment variables are not set. Email functionality may not work.');
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

app.use(cors());
app.use(express.json());

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use other services like 'outlook', 'yahoo', etc.
    auth: {
        user: emailUser,
        pass: emailPass,
    },
});

// Endpoint to get all permits
app.get('/api/permits', (req, res) => {
    const permitsPath = path.join(__dirname, 'permits.json');
    fs.readFile(permitsPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading permits.json:', err);
            return res.status(500).json({ message: 'Error reading permit data' });
        }
        try {
            const permits = JSON.parse(data);
            res.json(permits);
        } catch (parseErr) {
            console.error('Error parsing permits.json:', parseErr);
            res.status(500).json({ message: 'Error parsing permit data' });
        }
    });
});

// Endpoint to generate objection letter using Gemini API
app.post('/api/generate-letter', async (req, res) => {
    const { permitDetails } = req.body;

    if (!permitDetails) {
        return res.status(400).json({ message: 'Permit details are required.' });
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        const prompt = `Generate a compelling objection letter against a factory farm planning permit application based on the following details:\n\n${JSON.stringify(permitDetails, null, 2)}\n\nFocus on environmental impact, animal welfare, and potential negative effects on local community and infrastructure. Reference Indian regulations and land use guidelines where applicable.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ letter: text });
    } catch (error) {
        console.error('Error generating letter:', error);
        res.status(500).json({ message: 'Error generating objection letter', error: error.message });
    }
});

// Endpoint to send email alert
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

app.get('/', (req, res) => {
    res.send('Backend server is running!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});