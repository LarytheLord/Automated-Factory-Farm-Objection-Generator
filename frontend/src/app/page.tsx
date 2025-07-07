"use client";

import { useEffect, useState } from 'react';

export default function Home() {
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPermit, setSelectedPermit] = useState(null); // Change: Store the full permit object
  const [customDetails, setCustomDetails] = useState('');
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [letterError, setLetterError] = useState(null);

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
  const [emailError, setEmailError] = useState(null);

  useEffect(() => {
    const fetchPermits = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/permits'); // Assuming your backend runs on port 3001
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
      setLetterError('Please select a permit first.');
      return;
    }
    setGeneratingLetter(true);
    setLetterError(null);
    setGeneratedLetter('');
    setEmailSentMessage('');
    setEmailError(null);

    try {
      const response = await fetch('http://localhost:3001/api/generate-letter', {
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
    } catch (e) {
      setLetterError(e.message);
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

    try {
      const response = await fetch('http://localhost:3001/api/send-email', {
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
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <p>Loading permits...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <p className="text-red-500">Error: {error}</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold mb-8">Permit Objection App</h1>
      <p className="text-lg mb-8">Here are the permits:</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {permits.length > 0 ? (
          permits.map((permit) => (
            <div key={permit.id} className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-2">{permit.address}</h2>
              <p className="text-gray-700">**Permit ID:** {permit.id}</p>
              <p className="text-gray-700">**Description:** {permit.description}</p>
              <p className="text-gray-700">**Status:** {permit.status}</p>
              <button
                onClick={() => setSelectedPermit(permit)} // Change: Pass the full permit object
                className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Select for Objection
              </button>
            </div>
          ))
        ) : (
          <p>No permits found.</p>
        )}
      </div>

      {selectedPermit && ( // Change: Check for selectedPermit object
        <section className="w-full max-w-2xl bg-white shadow-md rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold mb-4">Generate Objection Letter for Permit ID: {selectedPermit.id}</h2>
          <form onSubmit={handleGenerateLetter} className="space-y-4">
            {/* New input fields for personal details */}
            <div>
              <label htmlFor="yourName" className="block text-gray-700 text-sm font-bold mb-2">Your Name:</label>
              <input
                type="text"
                id="yourName"
                value={yourName}
                onChange={(e) => setYourName(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            <div>
              <label htmlFor="yourAddress" className="block text-gray-700 text-sm font-bold mb-2">Your Address:</label>
              <input
                type="text"
                id="yourAddress"
                value={yourAddress}
                onChange={(e) => setYourAddress(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            <div>
              <label htmlFor="yourCity" className="block text-gray-700 text-sm font-bold mb-2">Your City:</label>
              <input
                type="text"
                id="yourCity"
                value={yourCity}
                onChange={(e) => setYourCity(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            <div>
              <label htmlFor="yourPostalCode" className="block text-gray-700 text-sm font-bold mb-2">Your Postal Code:</label>
              <input
                type="text"
                id="yourPostalCode"
                value={yourPostalCode}
                onChange={(e) => setYourPostalCode(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            <div>
              <label htmlFor="yourPhone" className="block text-gray-700 text-sm font-bold mb-2">Your Phone Number:</label>
              <input
                type="tel"
                id="yourPhone"
                value={yourPhone}
                onChange={(e) => setYourPhone(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            <div>
              <label htmlFor="yourEmail" className="block text-gray-700 text-sm font-bold mb-2">Your Email Address:</label>
              <input
                type="email"
                id="yourEmail"
                value={yourEmail}
                onChange={(e) => setYourEmail(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            <div>
              <label htmlFor="currentDate" className="block text-gray-700 text-sm font-bold mb-2">Date:</label>
              <input
                type="date"
                id="currentDate"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="customDetails" className="block text-gray-700 text-sm font-bold mb-2">Custom Details (e.g., specific objections):</label>
              <textarea
                id="customDetails"
                value={customDetails}
                onChange={(e) => setCustomDetails(e.target.value)}
                rows="5"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter any additional details or specific objections here..."
              ></textarea>
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={generatingLetter}
            >
              {generatingLetter ? 'Generating...' : 'Generate Objection Letter'}
            </button>
          </form>

          {letterError && (
            <p className="text-red-500 mt-4">Error generating letter: {letterError}</p>
          )}

          {generatedLetter && (
            <div className="mt-8 p-6 bg-gray-100 rounded-lg">
              <h3 className="text-xl font-bold mb-4">Generated Objection Letter:</h3>
              <div className="whitespace-pre-wrap border p-4 rounded bg-white text-gray-800">
                {generatedLetter}
              </div>
              <div className="mt-4">
                <label htmlFor="recipientEmail" className="block text-gray-700 text-sm font-bold mb-2">Recipient Email:</label>
                <input
                  type="email"
                  id="recipientEmail"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter recipient email address"
                />
                <button
                  onClick={handleSendEmail}
                  className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  disabled={sendingEmail}
                >
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </button>
                {emailSentMessage && (
                  <p className="text-green-500 mt-2">{emailSentMessage}</p>
                )}
                {emailError && (
                  <p className="text-red-500 mt-2">Error sending email: {emailError}</p>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}