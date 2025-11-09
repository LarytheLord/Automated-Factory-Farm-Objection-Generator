const { GoogleGenerativeAI } = require('@google/generative-ai');

const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
    console.error('GEMINI_API_KEY environment variable is not set.');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

// Test permit data
const testPermit = {
    project_title: "ABC Poultry Farm Expansion",
    location: "Near Sanjay Gandhi National Park, Mumbai",
    activity: "Poultry farming and processing",
    capacity: "2000 birds",
    effluent_limit: {
        trade: "7.5 mg/L",
        sewage: "15 mg/L"
    },
    notes: "Standard farming practices",
    air_emission_standard: {
        SPM: 250
    }
};

const testSubmitter = {
    name: "Rahul Sharma",
    address: "123 MG Road",
    city: "Mumbai",
    postalCode: "400001",
    phone: "+91-9876543210",
    email: "rahul.sharma@example.com"
};

// Enhanced violation detection
function detectViolations(permitDetails) {
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

    return violations;
}

async function testImprovedPrompt() {
    console.log("Testing improved prompt with sample permit data...\n");

    const violations = detectViolations(testPermit);

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
 You are an expert public advocate and environmental lawyer specializing in Indian environmental and animal welfare laws.

 Write a strong, formal objection letter regarding this factory farm permit application. The letter should be structured as a formal business letter with proper salutation, body paragraphs, and closing.

 📄 PERMIT DETAILS:
 - Project: ${testPermit.project_title}
 - Location: ${testPermit.location}
 - Activity: ${testPermit.activity}
 - Capacity: ${testPermit.capacity}
 - Effluent (Trade/Sewage): ${testPermit.effluent_limit?.trade} / ${testPermit.effluent_limit?.sewage}
 - Notes: ${testPermit.notes}

 📚 LEGAL FRAMEWORK & VIOLATIONS:
 ${policySummary}

 🧍 SUBMITTER INFORMATION:
 Name: ${testSubmitter.name}
 Address: ${testSubmitter.address}, ${testSubmitter.city}, ${testSubmitter.postalCode}
 Phone: ${testSubmitter.phone}
 Email: ${testSubmitter.email}
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

        console.log("Generated Objection Letter:");
        console.log("==========================\n");
        console.log(letter);
        console.log("\n==========================");
        console.log("Test completed successfully!");
        
        return letter;
    } catch (error) {
        console.error('Error generating letter:', error);
        return null;
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testImprovedPrompt().catch(console.error);
}

module.exports = { testImprovedPrompt };