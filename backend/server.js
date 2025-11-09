require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const policyData = require(path.join(__dirname, '..', 'policiesandlaws.json'));
const { GoogleGenerativeAI } = require('@google/generative-ai');
const nodemailer = require('nodemailer');
const submissionTracker = require('./submissionTracker');
const { getRelevantCitations } = require('./legalCitationLibrary');
const emailTemplates = require('./emailTemplates');
const { generateObjectionLetterPDF } = require('./pdfGenerator');
const { PermitApplication } = require('./db/models');

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
    try {
        const permitsPath = path.join(__dirname, 'permits.json');
        if (!fs.existsSync(permitsPath)) {
            console.error('permits.json file not found');
            return res.status(404).json({ error: 'Permit data not found' });
        }
        
        const data = await fs.promises.readFile(permitsPath, 'utf8');
        if (!data.trim()) {
            console.error('permits.json file is empty');
            return res.status(404).json({ error: 'Permit data is empty' });
        }
        
        let permits;
        try {
            permits = JSON.parse(data);
        } catch (parseErr) {
            console.error('Error parsing permits.json:', parseErr);
            return res.status(400).json({ error: 'Invalid permit data format' });
        }
        
        if (!Array.isArray(permits)) {
            console.error('Permits data is not an array');
            return res.status(500).json({ error: 'Permit data format is invalid' });
        }
        
        res.json(permits);
    } catch (err) {
        console.error('Error reading permits:', err);
        res.status(500).json({ error: 'Internal server error while reading permits' });
    }
});

// POST /api/generate-letter
app.post('/api/generate-letter', async (req, res) => {
    try {
        const { permitDetails } = req.body;
        
        // Validate input
        if (!permitDetails) {
            return res.status(400).json({ error: 'Missing permitDetails in request body' });
        }
        
        const {
            yourName, yourAddress, yourCity,
            yourPostalCode, yourPhone, yourEmail, currentDate
        } = permitDetails;

        // Validate required fields
        if (!yourName || !yourAddress || !yourCity || !yourPostalCode || !yourPhone || !yourEmail || !currentDate) {
            return res.status(400).json({ error: 'Missing required submitter information' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(yourEmail)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(currentDate)) {
            return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD' });
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

        // Get relevant legal citations based on violations
        const relevantCitations = getRelevantCitations(violations);

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
 
 Relevant Legal Citations:
${relevantCitations.length ? relevantCitations.map(c => `  - ${c.section}: ${c.title}`).join("\n") : "No specific citations identified."}
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

        if (!genAI) {
            return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not set. Letter generation functionality is not available.' });
        }
        
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

// POST /api/submit-objection - Create a new objection submission
app.post('/api/submit-objection', async (req, res) => {
    try {
        const { permitDetails, objectionLetter, submitterInfo } = req.body;

        // Validate required fields
        if (!permitDetails) {
            return res.status(400).json({
                error: 'Missing required field: permitDetails'
            });
        }
        
        if (!objectionLetter) {
            return res.status(400).json({
                error: 'Missing required field: objectionLetter'
            });
        }
        
        if (!submitterInfo) {
            return res.status(400).json({
                error: 'Missing required field: submitterInfo'
            });
        }

        // Validate submitter info
        const requiredSubmitterFields = ['name', 'address', 'city', 'postalCode', 'phone', 'email'];
        for (const field of requiredSubmitterFields) {
            if (!submitterInfo[field]) {
                return res.status(400).json({
                    error: `Missing required submitter field: ${field}`
                });
            }
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(submitterInfo.email)) {
            return res.status(400).json({
                error: 'Invalid email format'
            });
        }

        // Validate permit details
        if (!permitDetails.project_title) {
            return res.status(400).json({
                error: 'Missing required permit field: project_title'
            });
        }

        const submission = submissionTracker.createSubmission({
            permitDetails,
            objectionLetter,
            submitterInfo,
            status: 'submitted'
        });

        // Send email notifications
        try {
            // Send email to the submitter confirming submission
            const confirmationEmail = {
                to: submitterInfo.email,
                subject: emailTemplates.submissionConfirmation.subject(permitDetails.project_title),
                html: emailTemplates.submissionConfirmation.html(objectionLetter, submitterInfo, permitDetails)
            };

            await transporter.sendMail(confirmationEmail);

            // Send email to authorities (in a real implementation, this would be the actual authority email)
            // For demo purposes, sending to a designated email (could be admin or authority email)
            const authorityEmail = {
                to: process.env.AUTHORITY_EMAIL || submitterInfo.email, // This would be the authority's email in a real implementation
                subject: emailTemplates.objectionSubmission.subject(permitDetails.project_title),
                html: emailTemplates.objectionSubmission.html(objectionLetter, submitterInfo, permitDetails)
            };

            await transporter.sendMail(authorityEmail);
        } catch (emailError) {
            console.error('Error sending email notifications:', emailError);
            // Don't fail the submission if emails fail to send
        }

        res.json(submission);
    } catch (error) {
        console.error('Error creating submission:', error);
        res.status(500).json({ error: 'Failed to create submission' });
    }
});

// GET /api/submissions - Get all submissions (with optional filtering)
app.get('/api/submissions', (req, res) => {
    try {
        const { status, email } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (email) filter.email = email;
        
        const submissions = submissionTracker.getAllSubmissions(filter);
        res.json(submissions);
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

// GET /api/submissions/:id - Get a specific submission
app.get('/api/submissions/:id', (req, res) => {
    try {
        const { id } = req.params;
        const submission = submissionTracker.getSubmission(id);
        
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        
        res.json(submission);
    } catch (error) {
        console.error('Error fetching submission:', error);
        res.status(500).json({ error: 'Failed to fetch submission' });
    }
});

// PUT /api/submissions/:id - Update a submission status
app.put('/api/submissions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Only allow updating status and notes for security
        const allowedUpdates = {};
        if (updateData.status) allowedUpdates.status = updateData.status;
        if (updateData.notes) allowedUpdates.notes = updateData.notes;

        // Get the current submission to access submitter info
        const currentSubmission = submissionTracker.getSubmission(id);
        if (!currentSubmission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        const updatedSubmission = submissionTracker.updateSubmission(id, allowedUpdates);
        
        if (!updatedSubmission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        // Send email notification if status was updated
        if (updateData.status && currentSubmission.submitterInfo?.email) {
            try {
                const statusUpdateEmail = {
                    to: currentSubmission.submitterInfo.email,
                    subject: emailTemplates.statusUpdate.subject(
                        currentSubmission.permitDetails.project_title,
                        updateData.status
                    ),
                    html: emailTemplates.statusUpdate.html(
                        id,
                        updateData.status,
                        updateData.notes,
                        currentSubmission.permitDetails
                    )
                };

                await transporter.sendMail(statusUpdateEmail);
            } catch (emailError) {
                console.error('Error sending status update email:', emailError);
                // Don't fail the update if email fails to send
            }
        }
        
        res.json(updatedSubmission);
    } catch (error) {
        console.error('Error updating submission:', error);
        res.status(500).json({ error: 'Failed to update submission' });
    }
});

// GET /api/submissions/:id/pdf - Generate and download PDF of objection letter
app.get('/api/submissions/:id/pdf', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id) {
            return res.status(400).json({ error: 'Submission ID is required' });
        }
        
        const submission = submissionTracker.getSubmission(id);
        
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        // Verify that required fields exist
        if (!submission.objectionLetter || !submission.permitDetails || !submission.submitterInfo) {
            return res.status(400).json({ error: 'Incomplete submission data for PDF generation' });
        }

        // Generate PDF from the objection letter
        try {
            const pdfBuffer = await generateObjectionLetterPDF(
                submission.objectionLetter,
                submission.permitDetails,
                submission.submitterInfo
            );

            // Set response headers for PDF download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="objection-letter-${id}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);

            // Send the PDF buffer as response
            res.send(pdfBuffer);
        } catch (pdfError) {
            console.error('Error generating PDF:', pdfError);
            res.status(500).json({ error: 'Failed to generate PDF. Please try again later.' });
        }
    } catch (error) {
        console.error('Error in PDF endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



/* 
           ____  ____  __  __  ____ 
          (_  _)( ___)(  \/  )(  _ \
            )(   )__)  )    (  )___/
           (__) (____)(_/\/\_)(__)  
                _      
               ( )     
               /_\/    
              (__/\()  
  ___  ____  _  _  ____  ____    __   ____  ____  _____  _  _ 
 / __)( ___)( \( )( ___)(  _ \  /__\ (_  _)(_  _)(  _  )( \( )
( (_-. )__)  )  (  )__)  )   / /(__)\  )(   _)(_  )(_)(  )  ( 
 \___/(____)(_)\_)(____)(_)\_)(__)(__)(__) (____)(_____)(_)\_)

*/


api.post({
    res.status(201).json({message: 'created new '})
})


api.delete( '/api/permits', (req, res) => {
    try {
        // Remove all PermitApplication documents from the collection
        const result = await PermitApplication.deleteMany({});
        res.status(200).json({
            message: `Deleted ${result.deletedCount} permit applications.`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error deleting permit applications:', error);
        res.status(500).json({ error: 'Failed to delete permit applications' });
    }
})


// Root route
app.get('/', (req, res) => {
    res.send('Backend server is running!');
});

// Export the app for use in the main server
module.exports = app;

// Only start the server if this file is run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}