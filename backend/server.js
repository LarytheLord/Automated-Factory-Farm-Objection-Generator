require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const populators = require('./populator/populators.js');
const policyData = require(path.join(__dirname, '..', 'policiesandlaws.json'));
const { GoogleGenerativeAI } = require('@google/generative-ai');
const nodemailer = require('nodemailer');
const submissionTracker = require('./submissionTracker');
const { getRelevantCitations } = require('./legalCitationLibrary');
const emailTemplates = require('./emailTemplates');
const { generateObjectionLetterPDF } = require('./pdfGenerator');
const { connectToDatabase } = require('./db/mongodb.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Environment variables
const geminiApiKey = process.env.GEMINI_API_KEY;
const emailUser  = process.env.USER_EMAIL;
const emailPass = process.env.USER_PASS;

// (async () => {
//     try {
//       await connectToDatabase();
//       console.log("✅ MongoDB connected");
//       app.listen(3000, () => console.log("🚀 Server running on port 3000"));
//     } catch (err) {
//       console.error("❌ MongoDB connection failed:", err);
//       process.exit(1);
//     }
// })();

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
app.get('/api/get-permit-url', async (req, res) => {
    try {

        // const { country, region } = req.query;
        const country = "usa";
        const region = "north carolina";
        const id = "ADS240005 Ver A";

        const filter = {};
        if (country) {
            filter.country = country;
        }
        if (region) {
            filter.region = region;
        }

        const openai = require('./ai/openai.js');
        const model = "gpt-4o-search-preview"; // or whichever model you'd like to use
        const state = "north carolina"; // matches region variable in the call
        const completion = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: "Search and return a plaintext URL for the most likely result for the given permit application number in the specific area of the USA. It should be a link to the original application that matches the application number."},
                { role: "user", content: `For the application ID ${id} in the ${state} state of ${region}, return a link to the permit application that matches` }
            ],
        });

        
        
        const message = completion.choices[0].message;
        console.log(message);
        
        res.status(200).json("Found a URL?");
            
        
    } catch (error) {
        console.error('OpenAI API error:', error);
        throw error;
    }

});

// GET /api/permits
app.get('/api/permits', async (req, res) => {

    // Accept country and region as query parameters to filter the results
    try {
        // const { country, region } = req.query;
        const country = "usa";
        const region = "north carolina"
        const filter = {};
        if (country) {
            filter.country = country;
        }
        if (region) {
            filter.region = region;
        }

        console.log(">>>>>>", country, region)

        const result = await populators[country][region]();

        res.status(201).json(result);

    } catch (err) {
        console.error('Error fetching permits:', err);
        res.status(500).json({ error: 'Internal server error while fetching permits' });
    }

    // try {
    //     const permitsPath = path.join(__dirname, 'permits.json');
    //     if (!fs.existsSync(permitsPath)) {
    //         console.error('permits.json file not found');
    //         return res.status(404).json({ error: 'Permit data not found' });
    //     }
        
    //     const data = await fs.promises.readFile(permitsPath, 'utf8');
    //     if (!data.trim()) {
    //         console.error('permits.json file is empty');
    //         return res.status(404).json({ error: 'Permit data is empty' });
    //     }
        
    //     let permits;
    //     try {
    //         permits = JSON.parse(data);
    //     } catch (parseErr) {
    //         console.error('Error parsing permits.json:', parseErr);
    //         return res.status(400).json({ error: 'Invalid permit data format' });
    //     }
        
    //     if (!Array.isArray(permits)) {
    //         console.error('Permits data is not an array');
    //         return res.status(500).json({ error: 'Permit data format is invalid' });
    //     }
        
    //     res.json(permits);
    // } catch (err) {
    //     console.error('Error reading permits:', err);
    //     res.status(500).json({ error: 'Internal server error while reading permits' });
    // }
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

        // Check capacity violations
        if (permitDetails.capacity) {
            const capacityNumber = parseInt(permitDetails.capacity.replace(/[^\d]/g, '')) || 0;
            if (capacityNumber > 1000) {
                violations.push(`Exceeds sustainable animal processing threshold of 1000 animals; requires comprehensive impact assessment as per policy. Current capacity: ${permitDetails.capacity}`);
            } else if (capacityNumber > 500) {
                violations.push(`Large-scale operation requiring enhanced environmental safeguards. Current capacity: ${permitDetails.capacity}`);
            }
        }

        // Check effluent violations
        const tradeEffluent = parseFloat(permitDetails.effluent_limit?.trade?.replace(/[^\d.]/g, '') || "0");
        if (tradeEffluent > 5.0) {
            violations.push(`Trade effluent discharge (${permitDetails.effluent_limit?.trade}) exceeds eco-safe limits of 5.0 mg/L. Requires stricter effluent treatment and mitigation plan.`);
        } else if (tradeEffluent > 0 && tradeEffluent <= 5.0) {
            violations.push(`Effluent discharge present (${permitDetails.effluent_limit?.trade}) requires proper treatment and monitoring systems.`);
        }

        const sewageEffluent = parseFloat(permitDetails.effluent_limit?.sewage?.replace(/[^\d.]/g, '') || "0");
        if (sewageEffluent > 10.0) {
            violations.push(`Sewage effluent discharge (${permitDetails.effluent_limit?.sewage}) exceeds safe limits of 10.0 mg/Nm³.`);
        }

        // Check waste disposal violations
        if (!permitDetails.notes?.toLowerCase().includes("scientific") && !permitDetails.notes?.toLowerCase().includes("proper")) {
            violations.push("No mention of scientific disposal methods. Violates animal waste management standards.");
        }

        // Check for air emission violations
        if (permitDetails.air_emission_standard) {
            const spmValue = parseFloat(permitDetails.air_emission_standard.SPM ||
                                        permitDetails.air_emission_standard['SPM/TPM'] ||
                                        permitDetails.air_emission_standard['suspended particulate matter'] || "0");
            if (spmValue > 200) {
                violations.push(`Air emission standards for suspended particulate matter (${spmValue}) exceed acceptable limits of 200 mg/Nm³, posing health risks to surrounding communities.`);
            }
        }

        // Check for location violations (if near sensitive areas)
        if (permitDetails.location &&
            (permitDetails.location.toLowerCase().includes("sanctuary") ||
             permitDetails.location.toLowerCase().includes("reserve") ||
             permitDetails.location.toLowerCase().includes("forest") ||
             permitDetails.location.toLowerCase().includes("eco-sensitive"))) {
            violations.push(`Proposed location in or near environmentally sensitive area (${permitDetails.location}) violates environmental protection regulations.`);
        }

        // Check for missing environmental impact assessment
        if (!permitDetails.notes?.toLowerCase().includes("environmental impact") &&
            !permitDetails.notes?.toLowerCase().includes("assessment") &&
            !permitDetails.notes?.toLowerCase().includes("environmental clearance")) {
            violations.push("No mention of Environmental Impact Assessment (EIA) or environmental clearance, which is mandatory for factory farming operations of this nature.");
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
 You are an expert public advocate and environmental lawyer specializing in environmental and animal welfare laws.

Write a strong, formal objection letter regarding this factory farm permit application. The letter should be structured as a formal business letter with proper salutation, body paragraphs, and closing.

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

 REQUIREMENTS FOR THE OBJECTION LETTER:
 1. FORMAT: Follow formal letter structure with:
    - Proper date
    - Recipient address (use generic "To: Competent Authority" if specific not provided)
    - Subject line clearly stating "Objection to Factory Farm Permit Application"
    - Salutation (e.g., "Dear Sir/Madam" or "To the Competent Authority,")
    - Introduction paragraph stating your name, address, and grounds for objection
    - Body paragraphs addressing specific violations with legal citations
    - Conclusion with strong request for rejection of the permit
    - Formal closing (e.g., "Yours sincerely," or "Respectfully submitted,")
    - Signature line with your name and contact details
 
 2. CONTENT: Include specific details about:
    - Environmental impact of the proposed facility
    - Animal welfare concerns based on the capacity and type of operation
    - Public health risks from effluent discharge and air emissions
    - Violation of specific legal provisions with exact citations
    - Impact on local communities and ecosystems
 
 3. TONE: Maintain professional, factual, and legally sound language throughout
 4. CITATIONS: Reference specific legal provisions and explain how the proposed facility violates them
5. CONCLUSION: End with a clear, strong request to reject the permit application
 
 The letter should be comprehensive, legally grounded, and persuasive in nature. Avoid generic statements and focus on specific violations and legal breaches.
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


// api.post({
//     res.status(201).json({message: 'created new '})
// })


app.delete( '/api/permits', async (req, res) => {
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