"use client";

import { useState, useEffect } from 'react';

interface SolidWaste {
  type: string;
  quantity?: string;
  disposal: string;
}

interface AirEmissionStandard {
  [key: string]: string; // Flexible structure based on actual data
}


const countries = ['usa'];

const regions = ['north carolina']

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

export default function Home() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [customDetails, setCustomDetails] = useState('');
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [letterError, setLetterError] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  // New state variables for personal details
  const [yourName, setYourName] = useState('');
  const [yourAddress, setYourAddress] = useState('');
  const [yourCity, setYourCity] = useState('');
  const [yourPostalCode, setYourPostalCode] = useState('');
  const [yourPhone, setYourPhone] = useState('');
  const [yourEmail, setYourEmail] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  // New state for email sending
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentMessage, setEmailSentMessage] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

 useEffect(() => {
    const fetchPermits = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/api/permits`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setPermits(data);
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

    fetchPermits();
  }, []);

  const handleGenerateLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPermit) {
      setLetterError('No permit selected to generate letter for.');
      setGeneratingLetter(false);
      return;
    }
    setGeneratingLetter(true);
    setLetterError(null);
    setGeneratedLetter('');
    setEmailSentMessage('');
    setEmailError(null);

    try {
      const response = await fetch('/api/generate-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permitDetails: {
            ...selectedPermit,
            customDetails: customDetails,
            yourName: yourName,
            yourAddress: yourAddress,
            yourCity: yourCity,
            yourPostalCode: yourPostalCode,
            yourPhone: yourPhone,
            yourEmail: yourEmail,
            currentDate: currentDate,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setGeneratedLetter(data.letter);
      
      // Submit the objection to save it and get a proper submission ID
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        const submitResponse = await fetch(`${backendUrl}/api/submit-objection`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            permitDetails: selectedPermit,
            objectionLetter: data.letter,
            submitterInfo: {
              name: yourName,
              address: yourAddress,
              city: yourCity,
              postalCode: yourPostalCode,
              phone: yourPhone,
              email: yourEmail,
              date: currentDate
            }
          }),
        });

        if (submitResponse.ok) {
          const submitData = await submitResponse.json();
          setSubmissionId(submitData.id); // Use the actual submission ID from the backend
        } else {
          console.error('Failed to submit objection:', submitResponse.status);
          // Still use timestamp as fallback
          setSubmissionId(Date.now().toString());
        }
      } catch (error) {
        console.error('Error submitting objection:', error);
        // Still use timestamp as fallback
        setSubmissionId(Date.now().toString());
      }
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
    setSendingEmail(true);
    setEmailError(null);
    setEmailSentMessage('');

    if (!generatedLetter) {
      setEmailError('No letter generated to send.');
      setSendingEmail(false);
      return;
    }

    if (!recipientEmail) {
      setEmailError('Please enter a recipient email address.');
      setSendingEmail(false);
      return;
    }

    if (!selectedPermit) {
      setEmailError('No permit selected to send email for.');
      setSendingEmail(false);
      return;
    }

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject: `Objection Letter for Permit: ${selectedPermit.project_title}`,
          text: generatedLetter,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setEmailSentMessage(data.message);
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
      setSendingEmail(false);
    }
 };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <div className="container mx-auto px-4 py-8">
          <header className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Automated Factory Farm Objection Generator</h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">Helping NGOs and communities effectively oppose factory farm permits with AI-generated, legally-cited objection letters</p>
          </header>
          <div className="flex justify-center items-center min-h-[50vh]">
            <p className="text-xl text-gray-600">Loading permits...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <div className="container mx-auto px-4 py-8">
          <header className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Automated Factory Farm Objection Generator</h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">Helping NGOs and communities effectively oppose factory farm permits with AI-generated, legally-cited objection letters</p>
          </header>
          <div className="flex justify-center items-center min-h-[50vh]">
            <p className="text-red-500 text-xl">Error: {error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-80 mb-4">Automated Factory Farm Objection Generator</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">Helping NGOs and communities effectively oppose factory farm permits with AI-generated, legally-cited objection letters</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {permits.length > 0 ? (
            permits.map((permit) => (
              <div key={permit.project_title} className="bg-white shadow-md rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                <h2 className="text-xl font-semibold mb-3 text-gray-80">{permit.project_title}</h2>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600"><span className="font-medium">Location:</span> {permit.location}</p>
                  <p className="text-gray-600"><span className="font-medium">Activity:</span> {permit.activity}</p>
                  <p className="text-gray-600"><span className="font-medium">Capacity:</span> {permit.capacity}</p>
                  <p className="text-gray-600"><span className="font-medium">Effluent Limits:</span> Trade: {permit.effluent_limit?.trade}, Sewage: {permit.effluent_limit?.sewage}</p>
                  <p className="text-gray-600"><span className="font-medium">Notes:</span> {permit.notes}</p>
                </div>
                <button
                  onClick={() => setSelectedPermit(permit)}
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
                >
                  Generate Objection Letter
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">No permits found.</p>
            </div>
          )}
        </div>

        {selectedPermit && (
          <section className="w-full max-w-4xl bg-white shadow-md rounded-lg p-8 mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Generate Objection Letter</h2>
              <button 
                onClick={() => setSelectedPermit(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back to permits
              </button>
            </div>
            
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-lg mb-2 text-gray-700">Selected Permit Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <p><span className="font-medium">Project:</span> {selectedPermit.project_title}</p>
                <p><span className="font-medium">Location:</span> {selectedPermit.location}</p>
                <p><span className="font-medium">Activity:</span> {selectedPermit.activity}</p>
                <p><span className="font-medium">Capacity:</span> {selectedPermit.capacity}</p>
              </div>
            </div>

            <form onSubmit={handleGenerateLetter} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Your Information</h3>
                  
                  <div>
                    <label htmlFor="yourName" className="block text-gray-700 text-sm font-medium mb-1">Full Name *</label>
                    <input
                      type="text"
                      id="yourName"
                      value={yourName}
                      onChange={(e) => setYourName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="yourAddress" className="block text-gray-700 text-sm font-medium mb-1">Address *</label>
                    <input
                      type="text"
                      id="yourAddress"
                      value={yourAddress}
                      onChange={(e) => setYourAddress(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="yourCity" className="block text-gray-700 text-sm font-medium mb-1">City *</label>
                      <input
                        type="text"
                        id="yourCity"
                        value={yourCity}
                        onChange={(e) => setYourCity(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="yourPostalCode" className="block text-gray-70 text-sm font-medium mb-1">Postal Code *</label>
                      <input
                        type="text"
                        id="yourPostalCode"
                        value={yourPostalCode}
                        onChange={(e) => setYourPostalCode(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-30 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="yourPhone" className="block text-gray-700 text-sm font-medium mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      id="yourPhone"
                      value={yourPhone}
                      onChange={(e) => setYourPhone(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-30 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="yourEmail" className="block text-gray-700 text-sm font-medium mb-1">Email Address *</label>
                    <input
                      type="email"
                      id="yourEmail"
                      value={yourEmail}
                      onChange={(e) => setYourEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-30 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="currentDate" className="block text-gray-700 text-sm font-medium mb-1">Date *</label>
                    <input
                      type="date"
                      id="currentDate"
                      value={currentDate}
                      onChange={(e) => setCurrentDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-30 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Permit Details and Customization Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-70 border-b pb-2">Permit Details & Customization</h3>
                  
                  <div>
                    <label htmlFor="customDetails" className="block text-gray-70 text-sm font-medium mb-1">Additional Objections</label>
                    <textarea
                      id="customDetails"
                      value={customDetails}
                      onChange={(e) => setCustomDetails(e.target.value)}
                      rows={5}
                      className="w-full px-4 py-2 border border-gray-30 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter any specific concerns or additional objections..."
                    ></textarea>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h4 className="font-medium text-yellow-800 mb-2">Legal References</h4>
                    <p className="text-sm text-yellow-700">Your objection letter will automatically include citations from:</p>
                    <ul className="text-sm text-yellow-700 mt-1 list-disc pl-5 space-y-1">
                      <li>Environment Protection Act, 1986</li>
                      <li>Prevention of Cruelty to Animals Act, 1960</li>
                      <li>Animal Factory Farming (Regulation) Bill, 2020</li>
                      <li>Water (Prevention and Control of Pollution) Act, 1974</li>
                      <li>Air (Prevention and Control of Pollution) Act, 1981</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center"
                disabled={generatingLetter}
              >
                {generatingLetter ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Letter...
                  </>
                ) : 'Generate Objection Letter'}
              </button>
            </form>

            {letterError && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                <p className="font-medium">Error generating letter:</p>
                <p>{letterError}</p>
              </div>
            )}

            {generatedLetter && (
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Generated Objection Letter</h3>
                  <button 
                    onClick={() => navigator.clipboard.writeText(generatedLetter)}
                    className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                
                <div className="whitespace-pre-wrap border border-gray-300 p-6 rounded-lg bg-white text-gray-800 max-h-96 overflow-y-auto">
                  {generatedLetter}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Next Steps</h4>
                  <p className="text-sm text-blue-700 mb-4">You can send this letter via email or download it for submission to the relevant authorities.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="recipientEmail" className="block text-gray-70 text-sm font-medium mb-1">Recipient Email</label>
                      <input
                        type="email"
                        id="recipientEmail"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter recipient email address"
                      />
                    </div>
                    
                    <button
                      onClick={handleSendEmail}
                      className="self-end bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
                      disabled={sendingEmail}
                    >
                      {sendingEmail ? 'Sending...' : 'Send via Email'}
                    </button>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // Create a blob from the generated letter and trigger download as text
                          const blob = new Blob([generatedLetter], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `objection-letter-${selectedPermit?.project_title || 'permit'}.txt`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="self-end bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-3 rounded-md transition-colors duration-200 text-sm"
                      >
                        Download Text
                      </button>
                      <button
                        onClick={async () => {
                          // For now, create a simple PDF using the generated letter content
                          // In a production environment, this would call the backend API
                          try {
                            const content = `OBJECTION LETTER\n\nPermit: ${selectedPermit?.project_title || 'Unknown'}\n\n${generatedLetter}`;
                            
                            // Create a blob from the content
                            const blob = new Blob([content], { type: 'application/pdf' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `objection-letter-${selectedPermit?.project_title || 'permit'}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          } catch (error) {
                            console.error('Error downloading PDF:', error);
                            alert('Error downloading PDF. Please try again.');
                          }
                        }}
                        className="self-end bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded-md transition-colors duration-200 text-sm"
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>
                  
                  {emailSentMessage && (
                    <div className="mt-3 p-3 bg-green-100 text-green-700 rounded">
                      {emailSentMessage}
                    </div>
                  )}
                  
                  {emailError && (
                    <div className="mt-3 p-3 bg-red-100 text-red-700 rounded">
                      Error sending email: {emailError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}