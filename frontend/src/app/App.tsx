import { useState, useEffect } from 'react';
import { Search, MapPin, Globe, ChevronRight, ArrowLeft, FileText, Mail, Download, Edit3, Check } from 'lucide-react';

interface SolidWaste {
  type: string;
  quantity?: string;
  disposal: string;
}

interface AirEmissionStandard {
  [key: string]: string;
}

interface Permit {
  project_title: string;
  location: string;
  activity: string;
  capacity: string;
  effluent_limit: {
    trade: string;
    sewage: string;
  };
  solid_waste: SolidWaste[];
  air_emission_standard: AirEmissionStandard;
  notes: string;
  status: string;
}

function App() {
  const [step, setStep] = useState<'filter' | 'permits' | 'generate'>('filter');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [keywords, setKeywords] = useState('');

  const [permits, setPermits] = useState<Permit[]>([]);
  const [filteredPermits, setFilteredPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);

  const [yourName, setYourName] = useState('');
  const [yourAddress, setYourAddress] = useState('');
  const [yourCity, setYourCity] = useState('');
  const [yourPostalCode, setYourPostalCode] = useState('');
  const [yourPhone, setYourPhone] = useState('');
  const [yourEmail, setYourEmail] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [customDetails, setCustomDetails] = useState('');

  const [generatedLetter, setGeneratedLetter] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedLetter, setEditedLetter] = useState('');
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [letterError, setLetterError] = useState<string | null>(null);

  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentMessage, setEmailSentMessage] = useState('');

  useEffect(() => {
    if (step === 'permits') {
      fetchPermits();
    }
  }, [step]);

  useEffect(() => {
    if (permits.length > 0) {
      const filtered = permits.filter(permit => {
        const matchesLocation = !region || permit.location.toLowerCase().includes(region.toLowerCase());
        const matchesKeywords = !keywords ||
          permit.project_title.toLowerCase().includes(keywords.toLowerCase()) ||
          permit.activity.toLowerCase().includes(keywords.toLowerCase()) ||
          permit.notes.toLowerCase().includes(keywords.toLowerCase());
        return matchesLocation && matchesKeywords;
      });
      setFilteredPermits(filtered);
    }
  }, [permits, region, keywords]);

  const mockPermits: Permit[] = [
    {
      project_title: 'Greenfield Dairy Farm Expansion',
      location: 'Iowa, USA',
      activity: 'Large-scale dairy farming operation',
      capacity: '5,000 head of cattle',
      effluent_limit: {
        trade: '2.5 million gallons/day',
        sewage: '500,000 gallons/day',
      },
      solid_waste: [
        { type: 'Manure', quantity: '50 tons/day', disposal: 'Land spreading' },
      ],
      air_emission_standard: {
        ammonia: '10 ppm',
        methane: 'monitored',
      },
      notes: 'Facility will operate 24/7 with automated feeding systems',
      status: 'Under Review',
    },
    {
      project_title: 'Prairie Pork Processing Complex',
      location: 'Minnesota, USA',
      activity: 'Industrial hog confinement and processing',
      capacity: '12,000 head of pigs',
      effluent_limit: {
        trade: '4.2 million gallons/day',
        sewage: '800,000 gallons/day',
      },
      solid_waste: [
        { type: 'Manure', quantity: '35 tons/day', disposal: 'Anaerobic digestion' },
        { type: 'Processing waste', quantity: '15 tons/day', disposal: 'Rendering' },
      ],
      air_emission_standard: {
        ammonia: '12 ppm',
        hydrogen_sulfide: '5 ppm',
      },
      notes: 'Confined animal feeding operation (CAFO) with wastewater treatment',
      status: 'Approved',
    },
    {
      project_title: 'Sunbelt Poultry Production Facility',
      location: 'Georgia, USA',
      activity: 'Large-scale chicken production',
      capacity: '250,000 broiler chickens',
      effluent_limit: {
        trade: '1.8 million gallons/day',
        sewage: '300,000 gallons/day',
      },
      solid_waste: [
        { type: 'Litter and manure', quantity: '25 tons/day', disposal: 'Composting' },
      ],
      air_emission_standard: {
        ammonia: '8 ppm',
        particulate: 'monitored',
      },
      notes: 'Multi-house operation with environmental monitoring',
      status: 'Pending',
    },
    {
      project_title: 'Central Valley Beef Feedlot',
      location: 'California, USA',
      activity: 'Concentrated beef cattle feedlot',
      capacity: '8,500 head of beef cattle',
      effluent_limit: {
        trade: '3.1 million gallons/day',
        sewage: '600,000 gallons/day',
      },
      solid_waste: [
        { type: 'Manure and bedding', quantity: '60 tons/day', disposal: 'Compost pile storage' },
      ],
      air_emission_standard: {
        ammonia: '11 ppm',
        methane: 'uncontrolled',
      },
      notes: 'Open-lot beef feedlot with retention ponds',
      status: 'Under Review',
    },
    {
      project_title: 'Heartland Egg Layer Complex',
      location: 'Indiana, USA',
      activity: 'Industrial egg production facility',
      capacity: '180,000 laying hens',
      effluent_limit: {
        trade: '1.2 million gallons/day',
        sewage: '200,000 gallons/day',
      },
      solid_waste: [
        { type: 'Manure and litter', quantity: '18 tons/day', disposal: 'Incineration' },
      ],
      air_emission_standard: {
        ammonia: '7 ppm',
        dust: 'minimized',
      },
      notes: 'Cage-free operation with automated waste management',
      status: 'Approved',
    },
    {
      project_title: 'Mountain Spring Turkey Farm',
      location: 'North Carolina, USA',
      activity: 'Turkey production and processing',
      capacity: '45,000 turkeys',
      effluent_limit: {
        trade: '900,000 gallons/day',
        sewage: '150,000 gallons/day',
      },
      solid_waste: [
        { type: 'Litter waste', quantity: '22 tons/day', disposal: 'Agricultural use' },
      ],
      air_emission_standard: {
        ammonia: '9 ppm',
        odor: 'controlled',
      },
      notes: 'Seasonal operation with peak production in fall',
      status: 'Pending',
    },
  ];

  const fetchPermits = async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPermits(mockPermits);
      setFilteredPermits(mockPermits);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('permits');
  };

  const handleSelectPermit = (permit: Permit) => {
    setSelectedPermit(permit);
    setStep('generate');
  };

  const generateMockLetter = (): string => {
    return `FORMAL OBJECTION TO PERMIT APPLICATION

${currentDate}

To Whom It May Concern:

I am writing to formally object to the permit application for "${selectedPermit?.project_title}" located in ${selectedPermit?.location}.

OBJECTOR INFORMATION:
Name: ${yourName}
Address: ${yourAddress}, ${yourCity}, ${yourPostalCode}
Phone: ${yourPhone}
Email: ${yourEmail}

PROJECT DETAILS:
Project Title: ${selectedPermit?.project_title}
Location: ${selectedPermit?.location}
Activity: ${selectedPermit?.activity}
Proposed Capacity: ${selectedPermit?.capacity}

GROUNDS FOR OBJECTION:

1. ENVIRONMENTAL PROTECTION CONCERNS
Under the Environment Protection Act, 1986, this facility's proposed effluent discharge presents significant environmental risks:
- Trade effluent discharge: ${selectedPermit?.effluent_limit.trade}
- Sewage discharge: ${selectedPermit?.effluent_limit.sewage}

These discharge levels may contaminate local water resources and violate established environmental standards.

2. ANIMAL WELFARE CONCERNS
In accordance with the Prevention of Cruelty to Animals Act, 1960, the confinement practices described for ${selectedPermit?.capacity} animals raise serious animal welfare concerns. The proposed facility will cause suffering through:
- Extreme crowding and restriction of natural behaviors
- Inadequate space per animal as per industry standards
- Chronic stress from intensive confinement conditions

The Animal Factory Farming Regulation Bill, 2020 establishes standards that this facility fails to meet.

3. WATER POLLUTION CONCERNS
Under the Water (Prevention and Control of Pollution) Act, 1974:
The facility's wastewater management system inadequately addresses nutrient runoff, which will contribute to:
- Eutrophication of nearby water bodies
- Contamination of groundwater resources
- Violation of water quality standards

4. AIR QUALITY AND EMISSION CONCERNS
Per the Air (Prevention and Control of Pollution) Act, 1981:
The facility will generate harmful air emissions including ammonia and hydrogen sulfide at levels that exceed acceptable standards for nearby communities, causing respiratory health problems and nuisance odors.

5. PUBLIC HEALTH CONSIDERATIONS
Large-scale concentrated animal operations increase risks of:
- Zoonotic disease transmission to humans
- Antibiotic resistance due to routine prophylactic use
- Environmental pathogen contamination

ADDITIONAL CONCERNS:
${customDetails ? customDetails : 'No additional comments provided.'}

CONCLUSION:

For the reasons stated above, I respectfully urge the permitting authority to DENY this permit application. This facility would cause unacceptable environmental degradation, animal suffering, and public health risks.

I request that:
1. The permit application be rejected
2. A comprehensive environmental and health impact assessment be conducted
3. Public hearings be held to address community concerns
4. Alternative, more humane agricultural practices be required

Respectfully submitted,

${yourName}
${yourAddress}
${yourCity}, ${yourPostalCode}
${yourPhone}
${yourEmail}

---
This objection letter was generated using the Factory Farm Objection Generator, citing relevant federal and state environmental and animal welfare legislation.`;
  };

  const handleGenerateLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPermit) return;

    setGeneratingLetter(true);
    setLetterError(null);
    setGeneratedLetter('');
    setEmailSentMessage('');

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const letter = generateMockLetter();
      setGeneratedLetter(letter);
      setEditedLetter(letter);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setLetterError(e.message);
      } else {
        setLetterError('An unknown error occurred');
      }
    } finally {
      setGeneratingLetter(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedPermit) return;

    setSendingEmail(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));

      setEmailSentMessage(`Letter successfully sent to ${recipientEmail}! The objection has been delivered.`);
    } catch (e) {
      setLetterError(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
      setSendingEmail(false);
    }
  };

  const downloadLetter = (format: 'txt' | 'pdf') => {
    const content = isEditing ? editedLetter : generatedLetter;
    const blob = new Blob([content], { type: format === 'pdf' ? 'application/pdf' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `objection-letter-${selectedPermit?.project_title || 'permit'}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-green-50">
      {step === 'filter' && (
        <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-8 animate-slide-down">
              <h1 className="text-5xl font-bold text-gray-900 mb-4">Factory Farm Objection Generator</h1>
              <p className="text-lg text-gray-600">AI-powered legal objection letters to oppose factory farm permits</p>
            </div>

            <form onSubmit={handleFilterSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-6 animate-slide-up">
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                  <Globe className="w-5 h-5 mr-2 text-blue-600" />
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                  placeholder="Enter country"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                  <MapPin className="w-5 h-5 mr-2 text-green-600" />
                  Region
                </label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                  placeholder="Enter region or state"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                  <Search className="w-5 h-5 mr-2 text-orange-600" />
                  Keywords
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none"
                  placeholder="Search permits by keywords"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-105 flex items-center justify-center shadow-lg"
              >
                Search Permits
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </form>
          </div>
        </div>
      )}

      {step === 'permits' && (
        <div className="min-h-screen p-6 animate-fade-in">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex items-center justify-between animate-slide-down">
              <button
                onClick={() => setStep('filter')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Search
              </button>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-gray-900">Available Permits</h2>
                <p className="text-gray-600">{filteredPermits.length} permits found</p>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-red-700 animate-slide-up">
                <p className="font-semibold">Error: {error}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPermits.map((permit, index) => (
                  <div
                    key={permit.project_title}
                    className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-6 border-2 border-gray-100 animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{permit.project_title}</h3>
                    <div className="space-y-2 text-sm mb-4">
                      <p className="text-gray-600">
                        <span className="font-semibold">Location:</span> {permit.location}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-semibold">Activity:</span> {permit.activity}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-semibold">Capacity:</span> {permit.capacity}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-semibold">Status:</span>{' '}
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                          {permit.status}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleSelectPermit(permit)}
                      className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center"
                    >
                      Generate Objection
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'generate' && selectedPermit && (
        <div className="min-h-screen p-6 animate-fade-in">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6 animate-slide-down">
              <button
                onClick={() => setStep('permits')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Permits
              </button>
              <h2 className="text-3xl font-bold text-gray-900">Generate Objection Letter</h2>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 mb-6 border-2 border-blue-100 animate-slide-up">
              <h3 className="font-bold text-lg mb-3 text-gray-900">Selected Permit</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <p><span className="font-semibold">Project:</span> {selectedPermit.project_title}</p>
                <p><span className="font-semibold">Location:</span> {selectedPermit.location}</p>
                <p><span className="font-semibold">Activity:</span> {selectedPermit.activity}</p>
                <p><span className="font-semibold">Capacity:</span> {selectedPermit.capacity}</p>
              </div>
            </div>

            {!generatedLetter ? (
              <form onSubmit={handleGenerateLetter} className="bg-white rounded-xl shadow-xl p-8 space-y-6 animate-slide-up">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 border-b-2 border-gray-200 pb-2">Your Information</h3>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={yourName}
                        onChange={(e) => setYourName(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Address *</label>
                      <input
                        type="text"
                        value={yourAddress}
                        onChange={(e) => setYourAddress(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">City *</label>
                        <input
                          type="text"
                          value={yourCity}
                          onChange={(e) => setYourCity(e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Postal Code *</label>
                        <input
                          type="text"
                          value={yourPostalCode}
                          onChange={(e) => setYourPostalCode(e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Phone *</label>
                      <input
                        type="tel"
                        value={yourPhone}
                        onChange={(e) => setYourPhone(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        value={yourEmail}
                        onChange={(e) => setYourEmail(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
                      <input
                        type="date"
                        value={currentDate}
                        onChange={(e) => setCurrentDate(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 border-b-2 border-gray-200 pb-2">Additional Details</h3>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Custom Objections</label>
                      <textarea
                        value={customDetails}
                        onChange={(e) => setCustomDetails(e.target.value)}
                        rows={6}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none resize-none"
                        placeholder="Add any specific concerns or objections..."
                      />
                    </div>

                    <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                      <h4 className="font-semibold text-amber-900 mb-2 flex items-center">
                        <FileText className="w-5 h-5 mr-2" />
                        Legal Citations Included
                      </h4>
                      <ul className="text-sm text-amber-800 space-y-1 list-disc pl-5">
                        <li>Environment Protection Act, 1986</li>
                        <li>Prevention of Cruelty to Animals Act, 1960</li>
                        <li>Animal Factory Farming Regulation Bill, 2020</li>
                        <li>Water Pollution Control Act, 1974</li>
                        <li>Air Pollution Control Act, 1981</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={generatingLetter}
                  className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {generatingLetter ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                      Generating Letter...
                    </>
                  ) : (
                    <>
                      Generate Objection Letter
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>

                {letterError && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-red-700 animate-slide-up">
                    <p className="font-semibold">Error: {letterError}</p>
                  </div>
                )}
              </form>
            ) : (
              <div className="space-y-6 animate-slide-up">
                <div className="bg-white rounded-xl shadow-xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                      <FileText className="w-7 h-7 mr-3 text-blue-600" />
                      Generated Letter
                    </h3>
                    <div className="flex gap-2">
                      {!isEditing ? (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all"
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsEditing(false)}
                          className="flex items-center px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-all"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Done
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <textarea
                      value={editedLetter}
                      onChange={(e) => setEditedLetter(e.target.value)}
                      className="w-full h-96 px-4 py-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none font-mono text-sm resize-none"
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                        {editedLetter || generatedLetter}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-xl p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <Mail className="w-6 h-6 mr-3 text-green-600" />
                    Send & Download
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Recipient Email</label>
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                        placeholder="authority@example.com"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleSendEmail}
                        disabled={sendingEmail || !recipientEmail}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {sendingEmail ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Email
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => downloadLetter('txt')}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download TXT
                    </button>
                    <button
                      onClick={() => downloadLetter('pdf')}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(editedLetter || generatedLetter)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center"
                    >
                      Copy to Clipboard
                    </button>
                  </div>

                  {emailSentMessage && (
                    <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-lg p-4 text-green-700 animate-slide-up">
                      <p className="font-semibold">{emailSentMessage}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
