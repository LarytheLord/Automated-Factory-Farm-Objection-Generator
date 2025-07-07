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
    // Add logging for debugging
    logger: true,
    debug: true,
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
    try {
        const { permitDetails } = req.body;
        
        // Destructure personal details from permitDetails
        const { yourName, yourAddress, yourCity, yourPostalCode, yourPhone, yourEmail, currentDate } = permitDetails;

        // Construct a more detailed prompt using all permit details and personal details
        const prompt = `Generate a formal objection letter regarding the following permit application:
          - Applicant: ${permitDetails.applicant || 'Unknown Applicant'}
          - Address: ${permitDetails.address || 'Unknown Address'}
          - Permit Type: ${permitDetails.type || 'Unknown Type'}
          - Description: ${permitDetails.description || 'No Description Provided'}
          - Permit ID: ${permitDetails.id || 'Not Available'}
          - Additional Details from User: ${permitDetails.customDetails || 'None'}

          Please include the following personal details in the letter where appropriate:
          - Your Name: ${yourName || '[Your Name]'}
          - Your Address: ${yourAddress || '[Your Address]'}
          - Your City: ${yourCity || '[Your City]'}
          - Your Postal Code: ${yourPostalCode || '[Your Postal Code]'}
          - Your Phone Number: ${yourPhone || '[Your Phone Number]'}
          - Your Email Address: ${yourEmail || '[Your Email Address]'}
          - Date: ${currentDate || '[Current Date]'}
          
          The letter should be professional, cite relevant regulations, and clearly state the objections. Please ensure all fields like applicant name, address, permit type, description, permit ID, and your personal details are filled in from the provided details. Do not use placeholders like [Your Name] or [Applicant Name]. If a specific detail is not provided, state 'Not Available' or 'Unknown'.`;
    
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
    
        res.json({ letter: text });
    } catch (error) {
        console.error('Error generating letter:', error);
        res.status(500).json({ error: 'Failed to generate letter' });
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
        // Log the full error object for more details
        console.error('Nodemailer error details:', error);
        res.status(500).json({ message: 'Error sending email', error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('Backend server is running!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});