// Legal Citation Library for Indian Environmental and Animal Welfare Laws

const legalCitations = {
  environmentProtectionAct: {
    name: "Environment Protection Act, 1986",
    sections: [
      {
        section: "Section 6",
        title: "Powers of Central Government to take measures to protect and improve environment",
        content: "The Central Government may take all such measures as it deems necessary for the purpose of protecting and improving the quality of environment and preventing, controlling and abating environmental pollution in a comprehensive manner.",
        relevance: "Applicable to industrial activities that may cause environmental pollution"
      },
      {
        section: "Section 7",
        title: "Restrictions on location of industries",
        content: "No person carrying on any industry, operation or process shall discharge or emit or permit to be discharged or emitted any environmental pollutant in excess of such standards as may be prescribed.",
        relevance: "Critical for factory farms that discharge effluents or emit pollutants"
      },
      {
        section: "Section 8",
        title: "Standards of environmental quality",
        content: "The Central Government may, having regard to the use of an area or the presence of a natural monument, prescribe standards for that area or monument for the purpose of carrying out the provisions of this Act.",
        relevance: "Applicable when factory farms are located near sensitive areas"
      }
    ]
  },
  preventionOfCrueltyToAnimalsAct: {
    name: "Prevention of Cruelty to Animals Act, 1960",
    sections: [
      {
        section: "Section 11",
        title: "Prohibition of cruelty to animals",
        content: "If any person beats, kicks, over-rides, over-drives, over-loads, tortures or otherwise treats any animal so as to subject it to unnecessary pain or suffering or causes or permits any animal to be so treated, he shall be guilty of an offence.",
        relevance: "Central to animal welfare concerns in factory farming"
      },
      {
        section: "Section 13",
        title: "Experimentation on animals",
        content: "No experiment shall be performed on any animal in contravention of the provisions of this Act or the rules made thereunder.",
        relevance: "Applicable to research or breeding facilities"
      },
      {
        section: "Section 19",
        title: "Constitution of Animal Welfare Board",
        content: "The Central Government shall constitute a body to be called the Animal Welfare Board of India.",
        relevance: "Governing body for animal welfare standards"
      }
    ]
  },
  factoryFarmingRegulationBill: {
    name: "Animal Factory Farming (Regulation) Bill, 2020",
    sections: [
      {
        section: "Article 5",
        title: "Registration and licensing",
        content: "No person shall establish or operate an animal factory farming facility without obtaining a valid registration and license from the Animal Factory Farming Regulatory Board.",
        relevance: "Mandatory compliance for all factory farming operations"
      },
      {
        section: "Article 8",
        title: "Animal welfare standards",
        content: "All animal factory farming facilities must comply with prescribed standards of animal welfare including space, feeding, veterinary care, and humane treatment.",
        relevance: "Core welfare requirements for livestock"
      },
      {
        section: "Article 12",
        title: "Environmental impact assessment",
        content: "Any animal factory farming facility exceeding the prescribed threshold limits must conduct an environmental impact assessment before establishment.",
        relevance: "Critical for large-scale operations"
      },
      {
        section: "Article 15",
        title: "Waste management",
        content: "Proper scientific disposal of animal waste, including solid waste and effluents, must be ensured in compliance with environmental laws.",
        relevance: "Essential for preventing environmental pollution"
      },
      {
        section: "Article 18",
        title: "Antibiotic use regulation",
        content: "Use of antibiotics and other medicines in animal farming shall be strictly regulated to prevent development of antibiotic resistance.",
        relevance: "Public health concern related to factory farming"
      }
    ]
 },
  waterAct: {
    name: "Water (Prevention and Control of Pollution) Act, 1974",
    sections: [
      {
        section: "Section 24",
        title: "Prohibition of discharge of pollutants",
        content: "No person shall discharge or permit to be discharged any pollutant into the stream or well or sewer or on land except in compliance with the standards laid down.",
        relevance: "Applicable to effluent discharge from factory farms"
      }
    ]
  },
  airAct: {
    name: "Air (Prevention and Control of Pollution) Act, 1981",
    sections: [
      {
        section: "Section 21",
        title: "Power to declare emission standards",
        content: "The Central Government may, having regard to the technology available for the control of emission of any air pollutant, specify the maximum concentration of such air pollutant that may be released into the atmosphere from any source.",
        relevance: "Applicable to air emissions from factory farms"
      }
    ]
  }
};

// Function to get relevant citations based on violations
function getRelevantCitations(violations) {
  const relevantCitations = [];
  
  // Map violations to relevant legal sections
  violations.forEach(violation => {
    if (violation.includes("effluent") || violation.includes("discharge") || violation.includes("pollutant")) {
      relevantCitations.push(...legalCitations.environmentProtectionAct.sections);
      relevantCitations.push(...legalCitations.waterAct.sections);
    }
    
    if (violation.includes("animal") || violation.includes("welfare") || violation.includes("cruelty")) {
      relevantCitations.push(...legalCitations.preventionOfCrueltyToAnimalsAct.sections);
      relevantCitations.push(...legalCitations.factoryFarmingRegulationBill.sections.filter(s => s.section === "Article 8"));
    }
    
    if (violation.includes("waste") || violation.includes("disposal")) {
      relevantCitations.push(...legalCitations.factoryFarmingRegulationBill.sections.filter(s => s.section === "Article 15"));
      relevantCitations.push(...legalCitations.environmentProtectionAct.sections);
    }
  });
  
  // Add general citations
  relevantCitations.push(...legalCitations.factoryFarmingRegulationBill.sections.filter(s => 
    s.section === "Article 5" || s.section === "Article 12"
  ));
  
  return [...new Set(relevantCitations)]; // Remove duplicates
}

module.exports = {
 legalCitations,
  getRelevantCitations
};