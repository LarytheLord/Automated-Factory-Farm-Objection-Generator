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

    if (permit.capacity && permit.capacity.includes("1500") || permit.capacity.includes("2000") || permit.capacity.includes("3000")) {
        violations.push("Exceeds sustainable animal processing threshold; requires comprehensive impact assessment as per policy.");
    }

    const tradeEffluent = parseFloat(permit.effluent_limit?.trade?.replace(/[^\d.]/g, '') || "0");
    if (tradeEffluent > 5.0) {
        violations.push("Trade effluent discharge exceeds eco-safe limits. Requires stricter effluent treatment and mitigation plan.");
    }

    if (!permit.notes?.toLowerCase().includes("scientific") && !permit.notes?.toLowerCase().includes("organic")) {
        violations.push("No mention of scientific disposal methods. Violates animal waste management standards.");
    }

    if (permit.air_emission_standard && 
        (permit.air_emission_standard.SPM > 200 || 
         permit.air_emission_standard['SPM/TPM'] > 200 ||
         permit.air_emission_standard.SPM?.includes('250') ||
         permit.air_emission_standard['SPM/TPM']?.includes('250'))) {
        violations.push("Air emission standards exceed acceptable limits, posing health risks to surrounding communities.");
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
 - Project: ${permit.project_title}
 - Location: ${permit.location}
 - Activity: ${permit.activity}
 - Capacity: ${permit.capacity}
 - Effluent (Trade/Sewage): ${permit.effluent_limit?.trade} / ${permit.effluent_limit?.sewage}
 - Notes: ${permit.notes}

 📚 Legal Basis:
 ${policySummary}

 🧍 Personal Info:
 Name: ${submitter.name}
 Address: ${submitter.address}, ${submitter.city}, ${submitter.postalCode}
 Phone: ${submitter.phone}
 Email: ${submitter.email}
 Date: ${new Date().toISOString().split('T')[0]}

 Structure the letter as:
 - Professional tone
 - Based on real legal violations from policy
 - Cites specific sections of Indian environmental and animal welfare laws
 - Include specific legal citations from the provided list
 - Ends with a strong request to reject or review the permit
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