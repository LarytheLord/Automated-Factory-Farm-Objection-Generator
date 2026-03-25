'use strict';

/**
 * Social Impact Persona Registry
 *
 * Each persona defines a stakeholder perspective for generating objection
 * letters. The AI prompt and fallback template are customized per persona.
 */

const PERSONAS = {
    general: {
        id: 'general',
        label: 'General (Environmental Law Expert)',
        description: 'Comprehensive objection covering environmental, legal, and welfare concerns',
        icon: 'Scale',
        category: 'default',
        categoryLabel: 'Default',
        aiRole: 'an expert environmental lawyer and animal welfare advocate',
        aiConcerns: [],
        aiEvidenceTypes: [],
        aiEmotionalFrame: '',
        legalPriorities: {},
        fallbackConcernHeading: null,
        fallbackConcernBody: null,
        fallbackTopReasons: null,
    },

    neighboring_farmer: {
        id: 'neighboring_farmer',
        label: 'Neighboring Farmer',
        description: 'Crop contamination, water pollution, livestock disease, land devaluation',
        icon: 'Wheat',
        category: 'proximity',
        categoryLabel: 'Direct Proximity Impact',
        aiRole: 'a neighboring farmer and agricultural stakeholder whose livelihood depends on the land and water near the proposed facility',
        aiConcerns: [
            'Contamination of irrigation water and aquifers from effluent runoff',
            'Airborne pathogen and disease transmission risk to existing livestock',
            'Odor and fly infestations reducing crop yields and land value',
            'Antibiotic-resistant bacteria spreading to neighboring farms via soil and water',
            'Loss of organic or sustainable farming certification due to proximity contamination',
        ],
        aiEvidenceTypes: [
            'Agricultural impact studies on surrounding farmland',
            'Water quality test data from wells and streams near similar facilities',
            'Property and land valuation decline assessments',
            'Veterinary epidemiological reports on disease spread from CAFOs',
        ],
        aiEmotionalFrame: 'Your family has farmed this land for generations. This facility threatens your crops, your animals, and your way of life.',
        legalPriorities: {
            'India': ['Water (Prevention and Control of Pollution) Act, 1974', 'Environment (Protection) Act, 1986'],
            'United States': ['Clean Water Act', 'Safe Drinking Water Act', 'EPCRA'],
            'United Kingdom': ['Water Resources Act 1991', 'Environmental Protection Act 1990'],
            'Australia': ['Protection of the Environment Operations Act 1997'],
            'Canada': ['Fisheries Act', 'Agricultural Operations Act'],
            'European Union': ['Water Framework Directive', 'Nitrates Directive'],
        },
        fallbackConcernHeading: 'IMPACT ON NEIGHBORING AGRICULTURAL OPERATIONS',
        fallbackConcernBody: 'As a farmer operating land adjacent to the proposed facility, I face direct threats to my agricultural livelihood. Effluent runoff risks contaminating my irrigation water and aquifers. Airborne pathogens from intensive operations threaten my livestock. Persistent odor and pest infestations will reduce my crop yields and land value. Antibiotic-resistant organisms may spread to my farm through soil and water pathways.',
        fallbackTopReasons: [
            'Water contamination risk to irrigation sources and livestock drinking water from facility runoff',
            'Disease and pathogen transmission to neighboring livestock operations from concentrated animal waste',
            'Loss of agricultural land value and potential organic certification due to proximity contamination',
        ],
    },

    local_resident: {
        id: 'local_resident',
        label: 'Local Resident',
        description: 'Air quality, odor, noise, daily quality of life in the neighborhood',
        icon: 'Home',
        category: 'proximity',
        categoryLabel: 'Direct Proximity Impact',
        aiRole: 'a local resident living near the proposed facility who is concerned about daily quality of life, health, and neighborhood livability',
        aiConcerns: [
            'Persistent foul odor making outdoor activities and daily life unbearable',
            'Noise pollution from industrial machinery, transport vehicles, and animal operations',
            'Air quality degradation causing respiratory issues for residents',
            'Increased pest infestations (flies, rodents) in residential areas',
            'Decline in neighborhood livability and community wellbeing',
        ],
        aiEvidenceTypes: [
            'Air quality monitoring data from neighborhoods near similar facilities',
            'Noise level measurements and WHO guidelines on acceptable thresholds',
            'Public health surveys of communities living near factory farms',
            'Quality of life impact assessments from comparable developments',
        ],
        aiEmotionalFrame: 'You chose this neighborhood to raise your family. The smell, noise, and health risks from this facility will make your home unlivable.',
        legalPriorities: {
            'India': ['Air (Prevention and Control of Pollution) Act, 1981', 'Environment (Protection) Act, 1986'],
            'United States': ['Clean Air Act', 'EPCRA'],
            'United Kingdom': ['Environmental Protection Act 1990', 'Town and Country Planning Act 1990'],
            'Australia': ['Protection of the Environment Operations Act 1997'],
            'Canada': ['Canadian Environmental Protection Act, 1999'],
            'European Union': ['Industrial and Livestock Rearing Emissions Directive'],
        },
        fallbackConcernHeading: 'IMPACT ON LOCAL RESIDENTS AND NEIGHBORHOOD LIVABILITY',
        fallbackConcernBody: 'As a resident living near the proposed site, I will face persistent foul odor, industrial noise, degraded air quality, and increased pest infestations on a daily basis. These conditions make outdoor activities impossible and pose direct health risks to my family. Communities near similar facilities consistently report significant declines in quality of life.',
        fallbackTopReasons: [
            'Persistent odor and air quality degradation making daily life unbearable for nearby residents',
            'Noise pollution from industrial operations exceeding safe residential thresholds',
            'Increased pest infestations and public health risks within the residential neighborhood',
        ],
    },

    small_business_owner: {
        id: 'small_business_owner',
        label: 'Small Business Owner',
        description: 'Tourism decline, customer loss, economic harm to local businesses',
        icon: 'Store',
        category: 'proximity',
        categoryLabel: 'Direct Proximity Impact',
        aiRole: 'a small business owner in the area whose livelihood depends on local foot traffic, tourism, and the economic health of the community',
        aiConcerns: [
            'Loss of customers due to persistent odor and environmental degradation',
            'Decline in local tourism and visitor spending',
            'Reduced commercial property values along nearby business corridors',
            'Negative reputation effect on the area deterring new businesses and investment',
            'Supply chain disruption from increased heavy vehicle traffic and road damage',
        ],
        aiEvidenceTypes: [
            'Economic impact studies on communities near intensive farming operations',
            'Tourism revenue data before and after facility siting in comparable areas',
            'Commercial property valuation reports',
            'Local business survey data on customer traffic changes',
        ],
        aiEmotionalFrame: 'You built your business here because of this community. This facility will drive away your customers and devastate the local economy.',
        legalPriorities: {
            'India': ['Environment (Protection) Act, 1986', 'National Green Tribunal Act, 2010'],
            'United States': ['NEPA', 'Title VI, Civil Rights Act of 1964'],
            'United Kingdom': ['Town and Country Planning Act 1990', 'Environment Act 2021'],
            'Australia': ['Environmental Planning and Assessment Act 1979'],
            'Canada': ['Canadian Environmental Assessment Act'],
            'European Union': ['Environmental Impact Assessment Directive', 'Aarhus Convention'],
        },
        fallbackConcernHeading: 'ECONOMIC IMPACT ON LOCAL BUSINESSES',
        fallbackConcernBody: 'As a small business owner operating in the area, I face severe economic harm from this facility. Persistent odor and environmental degradation will drive away customers and reduce foot traffic. Tourism revenue will decline sharply. Commercial property values along nearby corridors will drop, and the area will develop a negative reputation that deters new investment.',
        fallbackTopReasons: [
            'Loss of customers and foot traffic due to persistent environmental degradation from the facility',
            'Decline in local tourism revenue and commercial property values in the surrounding area',
            'Negative reputational impact on the community deterring new business investment',
        ],
    },

    public_health_advocate: {
        id: 'public_health_advocate',
        label: 'Public Health Advocate',
        description: 'Respiratory illness, antibiotic resistance, disease vectors, community health',
        icon: 'HeartPulse',
        category: 'health',
        categoryLabel: 'Health & Welfare',
        aiRole: 'a public health professional deeply concerned about the epidemiological and community health impacts of intensive animal operations',
        aiConcerns: [
            'Elevated respiratory illness rates (asthma, COPD) in communities near CAFOs',
            'Antibiotic-resistant bacteria emerging from routine antibiotic use in livestock',
            'Zoonotic disease outbreak risk from concentrated animal populations',
            'Waterborne illness from nitrate contamination of drinking water sources',
            'Mental health impacts including anxiety, depression, and stress from living near industrial operations',
        ],
        aiEvidenceTypes: [
            'Peer-reviewed epidemiological studies on CAFO proximity health effects',
            'CDC and WHO reports on antibiotic resistance from agricultural use',
            'Water quality testing data showing nitrate and pathogen levels',
            'Hospital admission data for respiratory conditions in CAFO-adjacent communities',
        ],
        aiEmotionalFrame: 'As a health professional, you have seen the data. Communities near these facilities get sicker. This permit puts thousands of people at risk.',
        legalPriorities: {
            'India': ['Water (Prevention and Control of Pollution) Act, 1974', 'Air (Prevention and Control of Pollution) Act, 1981'],
            'United States': ['Safe Drinking Water Act', 'Clean Air Act', 'EPCRA'],
            'United Kingdom': ['Environmental Protection Act 1990', 'Environment Act 2021'],
            'Australia': ['Environment Protection and Biodiversity Conservation Act 1999'],
            'Canada': ['Canadian Environmental Protection Act, 1999', 'Health of Animals Act'],
            'European Union': ['Industrial and Livestock Rearing Emissions Directive', 'Water Framework Directive'],
        },
        fallbackConcernHeading: 'PUBLIC HEALTH AND EPIDEMIOLOGICAL RISKS',
        fallbackConcernBody: 'As a public health professional, I must raise alarm about the documented health risks this facility poses. Peer-reviewed studies consistently show elevated respiratory illness, antibiotic-resistant infections, and waterborne disease in communities near intensive animal operations. The routine use of antibiotics in concentrated livestock creates resistant bacteria that threaten the wider community.',
        fallbackTopReasons: [
            'Elevated respiratory illness rates documented in communities within 3 miles of similar facilities',
            'Antibiotic-resistant bacteria emerging from routine agricultural antibiotic use threatening public health',
            'Waterborne disease risk from nitrate contamination of local drinking water sources',
        ],
    },

    parent_or_caregiver: {
        id: 'parent_or_caregiver',
        label: 'Parent / Caregiver',
        description: 'Child safety, school proximity, vulnerable family members, developmental risks',
        icon: 'Baby',
        category: 'health',
        categoryLabel: 'Health & Welfare',
        aiRole: 'a parent and caregiver of young children and vulnerable family members living near the proposed facility, deeply concerned about developmental and health risks to children',
        aiConcerns: [
            'Children are more vulnerable to air pollutants — smaller lung capacity, faster breathing rate',
            'Proximity to schools, playgrounds, and childcare facilities puts children at direct risk',
            'Nitrate contamination of drinking water is especially dangerous for infants (blue baby syndrome)',
            'Immunocompromised family members face elevated infection risk from airborne pathogens',
            'Psychological stress on children from noise, odor, and reduced outdoor play opportunities',
        ],
        aiEvidenceTypes: [
            'Pediatric health studies on children living near industrial agriculture',
            'School proximity analysis and child exposure pathway assessments',
            'Water quality data on nitrate levels and infant health advisories',
            'Child development impact studies from environmental exposure',
        ],
        aiEmotionalFrame: 'Your children play in this neighborhood. They drink this water. They breathe this air. This facility puts their health and development at risk.',
        legalPriorities: {
            'India': ['Environment (Protection) Act, 1986', 'Water (Prevention and Control of Pollution) Act, 1974'],
            'United States': ['Safe Drinking Water Act', 'Clean Air Act', 'Title VI, Civil Rights Act of 1964'],
            'United Kingdom': ['Environment Act 2021', 'Environmental Protection Act 1990'],
            'Australia': ['Environment Protection and Biodiversity Conservation Act 1999'],
            'Canada': ['Canadian Environmental Protection Act, 1999'],
            'European Union': ['Water Framework Directive', 'Environmental Impact Assessment Directive'],
        },
        fallbackConcernHeading: 'RISKS TO CHILDREN AND VULNERABLE FAMILY MEMBERS',
        fallbackConcernBody: 'As a parent of young children living near the proposed site, I am deeply alarmed by the health risks this facility poses to the most vulnerable. Children breathe faster and have developing immune systems, making them far more susceptible to airborne pollutants. Nitrate contamination in drinking water is especially dangerous for infants. Schools and playgrounds near this site will expose children daily.',
        fallbackTopReasons: [
            'Children face elevated health risks from air pollutants due to smaller lungs and faster breathing',
            'Nitrate contamination of drinking water poses severe risk to infants and young children',
            'Schools and playgrounds near the site expose children to daily environmental hazards',
        ],
    },

    environmental_activist: {
        id: 'environmental_activist',
        label: 'Environmental Activist',
        description: 'Biodiversity loss, habitat destruction, climate impact, ecosystem degradation',
        icon: 'TreePine',
        category: 'environment',
        categoryLabel: 'Environment & Ecology',
        aiRole: 'an environmental conservation advocate deeply concerned about biodiversity loss, ecosystem degradation, and the climate impact of intensive animal agriculture',
        aiConcerns: [
            'Habitat destruction and biodiversity loss in the surrounding ecosystem',
            'Greenhouse gas emissions (methane, nitrous oxide) contributing to climate change',
            'Eutrophication of waterways from nutrient runoff killing aquatic ecosystems',
            'Soil degradation and loss of natural carbon sequestration capacity',
            'Cumulative environmental impact when added to existing industrial burden in the area',
        ],
        aiEvidenceTypes: [
            'Biodiversity impact assessments and habitat surveys',
            'Greenhouse gas emissions data from comparable intensive operations',
            'Water quality and eutrophication studies from downstream monitoring',
            'Cumulative environmental impact analyses for the region',
        ],
        aiEmotionalFrame: 'This ecosystem took millennia to develop. This facility will destroy habitats, poison waterways, and accelerate climate breakdown — all for industrial profit.',
        legalPriorities: {
            'India': ['Environment (Protection) Act, 1986', 'National Green Tribunal Act, 2010'],
            'United States': ['NEPA', 'Clean Water Act', 'RCRA'],
            'United Kingdom': ['Environment Act 2021', 'Environmental Protection Act 1990'],
            'Australia': ['Environment Protection and Biodiversity Conservation Act 1999'],
            'Canada': ['Canadian Environmental Assessment Act', 'Fisheries Act'],
            'European Union': ['Environmental Impact Assessment Directive', 'Water Framework Directive'],
        },
        fallbackConcernHeading: 'BIODIVERSITY AND ECOSYSTEM DESTRUCTION',
        fallbackConcernBody: 'This facility will cause severe damage to the local ecosystem. Habitat destruction, nutrient runoff causing eutrophication of waterways, and greenhouse gas emissions from intensive animal operations are well-documented. The cumulative environmental burden on this area, combined with existing industrial activity, creates an unacceptable level of ecological harm.',
        fallbackTopReasons: [
            'Habitat destruction and biodiversity loss in the surrounding ecosystem from facility construction and operations',
            'Greenhouse gas emissions (methane, nitrous oxide) contributing significantly to climate change',
            'Eutrophication of local waterways from nutrient-rich runoff killing aquatic ecosystems',
        ],
    },

    water_resource_stakeholder: {
        id: 'water_resource_stakeholder',
        label: 'Water Resource Stakeholder',
        description: 'Fishers, irrigators, downstream water users affected by contamination',
        icon: 'Droplets',
        category: 'environment',
        categoryLabel: 'Environment & Ecology',
        aiRole: 'a water resource stakeholder — fisher, irrigator, or water-dependent livelihood holder — whose clean water access is directly threatened by the proposed facility',
        aiConcerns: [
            'Effluent discharge contaminating rivers, lakes, and streams used for fishing and irrigation',
            'Nitrate and phosphate runoff causing algal blooms that kill fish and destroy aquatic habitats',
            'Groundwater contamination rendering wells and boreholes unsafe for consumption',
            'Loss of recreational water use (swimming, boating, fishing) due to pollution',
            'Downstream communities bearing the pollution burden of upstream industrial operations',
        ],
        aiEvidenceTypes: [
            'Water quality monitoring data from rivers and aquifers near similar facilities',
            'Fish kill records and aquatic ecosystem health surveys',
            'Groundwater contamination studies and well water testing results',
            'Economic impact data on fishing and water-dependent livelihoods',
        ],
        aiEmotionalFrame: 'The river that feeds your livelihood and your community is about to be poisoned. Once contaminated, water bodies take decades to recover.',
        legalPriorities: {
            'India': ['Water (Prevention and Control of Pollution) Act, 1974', 'Environment (Protection) Act, 1986'],
            'United States': ['Clean Water Act', 'Safe Drinking Water Act'],
            'United Kingdom': ['Water Resources Act 1991', 'Environmental Permitting Regulations 2016'],
            'Australia': ['Protection of the Environment Operations Act 1997'],
            'Canada': ['Fisheries Act', 'Canadian Environmental Protection Act, 1999'],
            'European Union': ['Water Framework Directive', 'Nitrates Directive'],
        },
        fallbackConcernHeading: 'WATER RESOURCE CONTAMINATION AND AQUATIC IMPACT',
        fallbackConcernBody: 'As someone whose livelihood depends on clean water, I face direct harm from this facility. Effluent discharge will contaminate the waterways I rely on. Nitrate and phosphate runoff will cause algal blooms that kill fish and destroy aquatic habitats. Groundwater contamination will render wells unsafe. These impacts are irreversible on any human timescale.',
        fallbackTopReasons: [
            'Effluent discharge contaminating waterways used for fishing, irrigation, and drinking water',
            'Nitrate and phosphate runoff causing algal blooms and fish kills in downstream water bodies',
            'Groundwater contamination rendering local wells and boreholes unsafe for human consumption',
        ],
    },

    transport_infrastructure: {
        id: 'transport_infrastructure',
        label: 'Transport & Infrastructure Affected',
        description: 'Road damage, traffic congestion, heavy vehicle accidents, infrastructure strain',
        icon: 'Truck',
        category: 'infrastructure',
        categoryLabel: 'Infrastructure & Economic',
        aiRole: 'a local commuter and road user concerned about the severe transport and infrastructure impact of heavy industrial vehicle traffic from the proposed facility',
        aiConcerns: [
            'Dramatic increase in heavy vehicle traffic (feed trucks, livestock transport, waste haulers) on local roads',
            'Accelerated road deterioration and pothole damage from overweight industrial vehicles',
            'Increased road accident risk for pedestrians, cyclists, and other motorists',
            'Traffic congestion during peak hours near the facility entrance',
            'Cost burden on local taxpayers for road repairs caused by industrial traffic',
        ],
        aiEvidenceTypes: [
            'Traffic impact assessments and vehicle movement projections for the facility',
            'Road condition surveys and maintenance cost data from comparable operations',
            'Road accident statistics on routes serving industrial agricultural sites',
            'Infrastructure burden analysis on local government budgets',
        ],
        aiEmotionalFrame: 'Your quiet roads will be overrun by heavy trucks. The potholes, the accidents, the congestion — all paid for by your taxes while the company profits.',
        legalPriorities: {
            'India': ['Environment (Protection) Act, 1986', 'National Green Tribunal Act, 2010'],
            'United States': ['NEPA', 'Title VI, Civil Rights Act of 1964'],
            'United Kingdom': ['Town and Country Planning Act 1990', 'Environmental Protection Act 1990'],
            'Australia': ['Environmental Planning and Assessment Act 1979'],
            'Canada': ['Canadian Environmental Assessment Act'],
            'European Union': ['Environmental Impact Assessment Directive'],
        },
        fallbackConcernHeading: 'TRANSPORT AND INFRASTRUCTURE BURDEN',
        fallbackConcernBody: 'This facility will generate a massive increase in heavy vehicle traffic — feed trucks, livestock transport, and waste haulers — on roads not designed for such loads. Local roads will deteriorate rapidly, accident risk will spike, and traffic congestion will disrupt daily commutes. The repair costs will fall on local taxpayers while the operator profits.',
        fallbackTopReasons: [
            'Massive increase in heavy vehicle traffic on local roads not designed for industrial loads',
            'Elevated road accident risk for pedestrians, cyclists, and motorists from truck traffic',
            'Road deterioration and infrastructure repair costs falling on local taxpayers',
        ],
    },

    property_owner: {
        id: 'property_owner',
        label: 'Property Owner',
        description: 'Property devaluation, noise/odor impact, difficulty selling, mortgage risk',
        icon: 'Building',
        category: 'infrastructure',
        categoryLabel: 'Infrastructure & Economic',
        aiRole: 'a property owner whose home and land value is directly threatened by the proximity of the proposed industrial facility',
        aiConcerns: [
            'Significant property value decline (studies show 6-26% drops near CAFOs)',
            'Difficulty selling property due to stigma of proximity to industrial operations',
            'Mortgage and insurance complications from environmental risk designation',
            'Noise and odor making the property effectively uninhabitable at times',
            'Loss of lifetime savings invested in property that becomes unsellable',
        ],
        aiEvidenceTypes: [
            'Property valuation studies showing decline near intensive farming operations',
            'Real estate market data on sale prices and time-on-market near CAFOs',
            'Insurance and mortgage industry assessments of environmental risk proximity',
            'Noise and odor measurement data at various distances from comparable facilities',
        ],
        aiEmotionalFrame: 'Your home is your largest investment. This facility will slash its value overnight and make it nearly impossible to sell. Your savings are at stake.',
        legalPriorities: {
            'India': ['Environment (Protection) Act, 1986', 'National Green Tribunal Act, 2010'],
            'United States': ['NEPA', 'EPCRA'],
            'United Kingdom': ['Town and Country Planning Act 1990', 'Environmental Protection Act 1990'],
            'Australia': ['Environmental Planning and Assessment Act 1979'],
            'Canada': ['Canadian Environmental Assessment Act', 'Agricultural Operations Act'],
            'European Union': ['Environmental Impact Assessment Directive', 'Aarhus Convention'],
        },
        fallbackConcernHeading: 'PROPERTY VALUE DESTRUCTION',
        fallbackConcernBody: 'As a property owner near the proposed site, my home — my largest financial investment — faces severe devaluation. Studies consistently show property values drop 6-26% near intensive animal operations. The persistent odor and noise make the property less livable, while the stigma of proximity makes it nearly impossible to sell. My lifetime savings are at stake.',
        fallbackTopReasons: [
            'Property values near CAFOs drop 6-26% according to peer-reviewed studies',
            'Persistent odor and noise making the property effectively uninhabitable at times',
            'Extreme difficulty selling property due to stigma of proximity to industrial operations',
        ],
    },

    indigenous_or_tribal: {
        id: 'indigenous_or_tribal',
        label: 'Indigenous / Tribal Community',
        description: 'Ancestral land, cultural heritage, sacred sites, treaty rights, traditional practices',
        icon: 'Landmark',
        category: 'rights',
        categoryLabel: 'Rights & Justice',
        aiRole: 'a member of an indigenous or tribal community whose ancestral land, cultural heritage, and traditional practices are threatened by the proposed facility',
        aiConcerns: [
            'Desecration or destruction of culturally significant and sacred sites',
            'Violation of indigenous land rights and treaty obligations',
            'Contamination of traditional water sources and food gathering areas',
            'Disruption of traditional livelihoods (farming, fishing, foraging) practiced for generations',
            'Failure to obtain free, prior, and informed consent from indigenous communities',
        ],
        aiEvidenceTypes: [
            'Cultural heritage impact assessments and archaeological surveys',
            'Treaty documents and indigenous land right records',
            'Traditional ecological knowledge documentation',
            'UN Declaration on the Rights of Indigenous Peoples (UNDRIP) compliance review',
        ],
        aiEmotionalFrame: 'Your ancestors protected this land for centuries. This facility threatens sacred sites, traditional waterways, and the cultural heritage of your community.',
        legalPriorities: {
            'India': ['National Green Tribunal Act, 2010', 'Environment (Protection) Act, 1986'],
            'United States': ['NEPA', 'Title VI, Civil Rights Act of 1964'],
            'United Kingdom': ['Town and Country Planning Act 1990', 'Environment Act 2021'],
            'Australia': ['Environment Protection and Biodiversity Conservation Act 1999'],
            'Canada': ['Canadian Environmental Assessment Act', 'Fisheries Act'],
            'European Union': ['Aarhus Convention', 'Environmental Impact Assessment Directive'],
        },
        fallbackConcernHeading: 'IMPACT ON INDIGENOUS AND TRIBAL HERITAGE',
        fallbackConcernBody: 'This facility threatens the ancestral land, cultural heritage, and traditional practices of our community. Sacred sites risk desecration. Traditional water sources and food gathering areas will be contaminated. Our community was not given free, prior, and informed consent as required by international law. These lands have been stewarded by our people for centuries.',
        fallbackTopReasons: [
            'Desecration of culturally significant and sacred sites without proper consent or consultation',
            'Contamination of traditional water sources and food gathering areas used for generations',
            'Violation of indigenous land rights and failure to obtain free, prior, and informed consent',
        ],
    },

    environmental_justice: {
        id: 'environmental_justice',
        label: 'Environmental Justice Advocate',
        description: 'Disproportionate siting in marginalized communities, systemic inequity',
        icon: 'Scale',
        category: 'rights',
        categoryLabel: 'Rights & Justice',
        aiRole: 'an environmental justice advocate raising concerns about the disproportionate siting of polluting facilities in low-income and marginalized communities',
        aiConcerns: [
            'Pattern of disproportionate siting of polluting facilities in low-income or minority communities',
            'Cumulative pollution burden from multiple facilities concentrated in the same area',
            'Lack of meaningful community participation in the permitting process',
            'Health disparities amplified by environmental pollution in already underserved areas',
            'Violation of environmental justice principles and civil rights protections',
        ],
        aiEvidenceTypes: [
            'Demographic data showing income and racial composition of affected neighborhoods',
            'Cumulative pollution burden mapping (e.g., EPA EJScreen, CalEnviroScreen)',
            'Health disparity data for the affected community compared to regional averages',
            'Analysis of facility siting patterns showing disproportionate impact on marginalized groups',
        ],
        aiEmotionalFrame: 'This community already bears more than its fair share of pollution. Siting yet another facility here is not coincidence — it is systemic injustice.',
        legalPriorities: {
            'India': ['National Green Tribunal Act, 2010', 'Environment (Protection) Act, 1986'],
            'United States': ['Title VI, Civil Rights Act of 1964', 'NEPA', 'EPCRA'],
            'United Kingdom': ['Environment Act 2021', 'Aarhus Convention'],
            'Australia': ['Environment Protection and Biodiversity Conservation Act 1999'],
            'Canada': ['Canadian Environmental Protection Act, 1999', 'Canadian Environmental Assessment Act'],
            'European Union': ['Aarhus Convention', 'Environmental Impact Assessment Directive'],
        },
        fallbackConcernHeading: 'ENVIRONMENTAL JUSTICE AND DISPROPORTIONATE IMPACT',
        fallbackConcernBody: 'This facility follows a documented pattern of polluting industries being sited in low-income and marginalized communities. The affected area already bears a disproportionate cumulative pollution burden. Health disparities here exceed regional averages. Meaningful community participation has been absent from this permitting process. This is not just an environmental issue — it is a civil rights issue.',
        fallbackTopReasons: [
            'Disproportionate siting of polluting facilities in low-income and marginalized communities',
            'Cumulative pollution burden from multiple industrial operations already concentrated in this area',
            'Failure to ensure meaningful community participation and environmental justice in the permitting process',
        ],
    },

    veterinary_professional: {
        id: 'veterinary_professional',
        label: 'Veterinary Professional',
        description: 'Animal welfare, confinement standards, disease protocols, suffering',
        icon: 'Stethoscope',
        category: 'professional',
        categoryLabel: 'Professional & Technical',
        aiRole: 'a veterinary professional with expertise in animal welfare science, raising technical concerns about the conditions and disease management in the proposed intensive operation',
        aiConcerns: [
            'Intensive confinement causing chronic stress, restricted movement, and abnormal behaviors',
            'Inadequate disease prevention and biosecurity protocols at the proposed scale',
            'Routine prophylactic antibiotic use masking poor welfare conditions',
            'Insufficient veterinary oversight relative to the number of animals confined',
            'High mortality rates and suffering inherent in intensive production systems at this scale',
        ],
        aiEvidenceTypes: [
            'Peer-reviewed veterinary and animal welfare science literature',
            'OIE/WOAH (World Organisation for Animal Health) welfare standards',
            'Mortality and morbidity data from comparable intensive operations',
            'Veterinary inspection reports and welfare audit findings',
        ],
        aiEmotionalFrame: 'As a veterinarian, you have seen what these operations do to animals. The suffering at this scale is not an accident — it is a business model.',
        legalPriorities: {
            'India': ['Prevention of Cruelty to Animals Act, 1960', 'Prevention of Cruelty to Animals (Animal Husbandry Practices and Procedures) Rules, 2023'],
            'United States': ['Clean Water Act', 'RCRA'],
            'United Kingdom': ['Animal Welfare Act 2006', 'Environmental Permitting Regulations 2016'],
            'Australia': ['Prevention of Cruelty to Animals Act 1979', 'Australian Animal Welfare Standards'],
            'Canada': ['Health of Animals Act', 'Canadian Environmental Protection Act, 1999'],
            'European Union': ['EU Animal Welfare Regulation', 'Industrial and Livestock Rearing Emissions Directive'],
        },
        fallbackConcernHeading: 'ANIMAL WELFARE AND VETERINARY CONCERNS',
        fallbackConcernBody: 'As a veterinary professional, I must raise serious welfare concerns about this operation. Intensive confinement at the proposed scale causes chronic stress, restricted movement, and abnormal behaviors. Routine prophylactic antibiotic use masks poor welfare conditions while creating resistant pathogens. The animal-to-veterinarian ratio at this scale makes adequate oversight impossible. The suffering is systemic and inherent to operations of this nature.',
        fallbackTopReasons: [
            'Intensive confinement causing chronic suffering, restricted movement, and abnormal behaviors in animals',
            'Routine prophylactic antibiotic use masking poor conditions and driving antimicrobial resistance',
            'Inadequate veterinary oversight and biosecurity protocols at the proposed operational scale',
        ],
    },
};

// Ordered list for the /api/personas endpoint
const PERSONA_LIST = [
    'general',
    'neighboring_farmer', 'local_resident', 'small_business_owner',
    'public_health_advocate', 'parent_or_caregiver',
    'environmental_activist', 'water_resource_stakeholder',
    'transport_infrastructure', 'property_owner',
    'indigenous_or_tribal', 'environmental_justice',
    'veterinary_professional',
].map((id) => {
    const p = PERSONAS[id];
    return {
        id: p.id,
        label: p.label,
        description: p.description,
        icon: p.icon,
        category: p.category,
        categoryLabel: p.categoryLabel,
    };
});

function normalizePersonaId(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw || raw === 'general') return 'general';
    if (PERSONAS[raw]) return raw;
    // Try matching by label (case-insensitive)
    const byLabel = Object.values(PERSONAS).find(
        (p) => p.label.toLowerCase() === raw
    );
    return byLabel ? byLabel.id : 'general';
}

function getPersonaConfig(personaId) {
    const id = normalizePersonaId(personaId);
    return PERSONAS[id] || PERSONAS.general;
}

module.exports = {
    PERSONAS,
    PERSONA_LIST,
    normalizePersonaId,
    getPersonaConfig,
};
