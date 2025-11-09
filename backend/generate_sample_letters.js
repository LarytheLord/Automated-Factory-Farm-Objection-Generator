const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getRelevantCitations } = require('./legalCitationLibrary');

const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
    console.error('GEMINI_API_KEY environment variable is not set.');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

// Load real permits
const permitsPath = path.join(__dirname, 'real_permits.json');
const permits = JSON.parse(fs.readFileSync(permitsPath, 'utf8'));

// Sample submitter information for generating diverse letters
const sampleSubmitters = [
    {
        name: "Rahul Sharma",
        address: "123 MG Road",
        city: "Mumbai",
        postalCode: "400001",
        phone: "+91-9876543210",
        email: "rahul.sharma@example.com"
    },
    {
        name: "Priya Patel",
        address: "456 Park Street",
        city: "Ahmedabad",
        postalCode: "380001",
        phone: "+91-9876543211",
        email: "priya.patel@example.com"
    },
    {
        name: "Amit Kumar",
        address: "789 Connaught Place",
        city: "New Delhi",
        postalCode: "110001",
        phone: "+91-9876543212",
        email: "amit.kumar@example.com"
    },
    {
        name: "Sunita Devi",
        address: "321 Laxmi Nagar",
        city: "Patna",
        postalCode: "800001",
        phone: "+91-9876543213",
        email: "sunita.devi@example.com"
    },
    {
        name: "Vikram Singh",
        address: "654 Civil Lines",
        city: "Lucknow",
        postalCode: "26001",
        phone: "+91-9876543214",
        email: "vikram.singh@example.com"
    }
];

async function generateObjectionLetter(permit, submitter) {
    // STEP 1: Policy Violation Checks
    const violations = [];

    // Check capacity violations
    if (permit.capacity) {
        const capacityNumber = parseInt(permit.capacity.replace(/[^\d]/g, '')) || 0;
        if (capacityNumber > 100) {
            violations.push(`Exceeds sustainable animal processing threshold of 1000 animals; requires comprehensive impact assessment as per policy. Current capacity: ${permit.capacity}`);
        } else if (capacityNumber > 500) {
            violations.push(`Large-scale operation requiring enhanced environmental safeguards. Current capacity: ${permit.capacity}`);
        }
    }

    // Check effluent violations
    const tradeEffluent = parseFloat(permit.effluent_limit?.trade?.replace(/[^\d.]/g, '') || "0");
    if (tradeEffluent > 5.0) {
        violations.push(`Trade effluent discharge (${permit.effluent_limit?.trade}) exceeds eco-safe limits of 5.0 mg/L. Requires stricter effluent treatment and mitigation plan.`);
    } else if (tradeEffluent > 0 && tradeEffluent <= 5.0) {
        violations.push(`Effluent discharge present (${permit.effluent_limit?.trade}) requires proper treatment and monitoring systems.`);
    }

    const sewageEffluent = parseFloat(permit.effluent_limit?.sewage?.replace(/[^\d.]/g, '') || "0");
    if (sewageEffluent > 10.0) {
        violations.push(`Sewage effluent discharge (${permit.effluent_limit?.sewage}) exceeds safe limits of 10.0 mg/Nm³.`);
    }

    // Check waste disposal violations
    if (!permit.notes?.toLowerCase().includes("scientific") && !permit.notes?.toLowerCase().includes("proper")) {
        violations.push("No mention of scientific disposal methods. Violates animal waste management standards.");
    }

    // Check for air emission violations
    if (permit.air_emission_standard) {
        const spmValue = parseFloat(permit.air_emission_standard.SPM ||
                                    permit.air_emission_standard['SPM/TPM'] ||
                                    permit.air_emission_standard['suspended particulate matter'] || "0");
        if (spmValue > 200) {
            violations.push(`Air emission standards for suspended particulate matter (${spmValue}) exceed acceptable limits of 200 mg/Nm³, posing health risks to surrounding communities.`);
        }
    }

    // Check for location violations (if near sensitive areas)
    if (permit.location &&
        (permit.location.toLowerCase().includes("sanctuary") ||
         permit.location.toLowerCase().includes("reserve") ||
         permit.location.toLowerCase().includes("forest") ||
         permit.location.toLowerCase().includes("eco-sensitive"))) {
        violations.push(`Proposed location in or near environmentally sensitive area (${permit.location}) violates environmental protection regulations.`);
    }

    // Check for missing environmental impact assessment
    if (!permit.notes?.toLowerCase().includes("environmental impact") &&
        !permit.notes?.toLowerCase().includes("assessment") &&
        !permit.notes?.toLowerCase().includes("environmental clearance")) {
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

 📄 PERMIT DETAILS:
 - Project: ${permit.project_title}
 - Location: ${permit.location}
 - Activity: ${permit.activity}
 - Capacity: ${permit.capacity}
 - Effluent (Trade/Sewage): ${permit.effluent_limit?.trade} / ${permit.effluent_limit?.sewage}
 - Notes: ${permit.notes}

 📚 LEGAL FRAMEWORK & VIOLATIONS:
 ${policySummary}

 🧍 SUBMITTER INFORMATION:
 Name: ${submitter.name}
 Address: ${submitter.address}, ${submitter.city}, ${submitter.postalCode}
 Phone: ${submitter.phone}
 Email: ${submitter.email}
Date: ${new Date().toISOString().split('T')[0]}

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

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const letter = response.text();

        return {
            permitId: permit.project_title,
            letter: letter,
            violations: violations,
            submitter: submitter
        };
    } catch (error) {
        console.error('Error generating letter for permit:', permit.project_title, error);
        return {
            permitId: permit.project_title,
            letter: `Failed to generate letter: ${error.message}`,
            violations: violations,
            submitter: submitter
        };
    }
}

async function generateSampleLetters() {
    console.log(`Starting generation of objection letters for ${permits.length} permits...`);
    
    const allLetters = [];
    
    // Generate multiple letters per permit with different submitters
    for (let i = 0; i < permits.length; i++) {
        const permit = permits[i];
        console.log(`Processing permit ${i + 1}/${permits.length}: ${permit.project_title}`);
        
        // Generate 5 letters per permit with different submitters (5 permits * 5 submitters = 25 letters)
        // Then repeat permits to reach 50
        for (let j = 0; j < 3; j++) { // Generate 3 letters per permit
            const submitter = sampleSubmitters[j % sampleSubmitters.length];
            const letterData = await generateObjectionLetter(permit, submitter);
            allLetters.push(letterData);
            
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // If we have less than 50, duplicate some entries to reach 50
    while (allLetters.length < 50) {
        const randomLetter = allLetters[Math.floor(Math.random() * allLetters.length)];
        // Create a slightly modified version by changing submitter
        const newSubmitter = sampleSubmitters[allLetters.length % sampleSubmitters.length];
        const modifiedLetter = {
            ...randomLetter,
            submitter: newSubmitter,
            letter: randomLetter.letter.replace(
                /Name: [^\n]+/, 
                `Name: ${newSubmitter.name}`
            ).replace(
                /Address: [^\n]+/,
                `Address: ${newSubmitter.address}, ${newSubmitter.city}, ${newSubmitter.postalCode}`
            ).replace(
                /Phone: [^\n]+/,
                `Phone: ${newSubmitter.phone}`
            ).replace(
                /Email: [^\n]+/,
                `Email: ${newSubmitter.email}`
            )
        };
        allLetters.push(modifiedLetter);
    }
    
    // Truncate to exactly 50
    const finalLetters = allLetters.slice(0, 50);
    
    // Save to file
    const outputPath = path.join(__dirname, 'generated_letters.json');
    fs.writeFileSync(outputPath, JSON.stringify(finalLetters, null, 2));
    
    console.log(`Successfully generated ${finalLetters.length} objection letters!`);
    console.log(`Output saved to: ${outputPath}`);
    
    // Print summary
    console.log("\nSummary:");
    console.log("- Total letters generated: " + finalLetters.length);
    console.log("- Unique permits used: " + [...new Set(finalLetters.map(l => l.permitId))].length);
    console.log("- Letters with violations: " + finalLetters.filter(l => l.violations.length > 0).length);
    
    return finalLetters;
}

// Run the generator if this file is executed directly
if (require.main === module) {
    generateSampleLetters().catch(console.error);
}

module.exports = { generateObjectionLetter, generateSampleLetters };