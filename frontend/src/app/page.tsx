"use client";

import { useState, useEffect } from 'react';
import { FileText, MapPin, AlertTriangle, CheckCircle, Clock, XCircle, Search, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Permit {
  project_title: string;
  location: string;
  activity: string;
  status: string;
  country: string;
  notes: string;
  details?: any;
}

export default function Home() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);

  // Consolidated Form Data
  const [formData, setFormData] = useState({
    yourName: '',
    yourAddress: '',
    yourCity: '',
    yourPostalCode: '',
    yourPhone: '',
    yourEmail: '',
  });

  const [generatedLetter, setGeneratedLetter] = useState('');
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [letterError, setLetterError] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState('');

  // Email State
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentMessage, setEmailSentMessage] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermits = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/permits`);
        if (!response.ok) {
          throw new Error('Failed to fetch permits');
        }
        const data = await response.json();
        setPermits(data);
      } catch (error) {
        console.error('Error fetching permits:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPermits();
    const now = new Date();
    setCurrentDate(now.toISOString().split('T')[0]);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateObjectionLetter = async () => {
    if (!selectedPermit) return;

    setGeneratingLetter(true);
    setLetterError(null);
    setGeneratedLetter('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate-letter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permitDetails: {
            ...selectedPermit,
            ...formData,
            currentDate,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate letter');
      }

      const data = await response.json();
      setGeneratedLetter(data.letter);
    } catch (err) {
      setLetterError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setGeneratingLetter(false);
    }
  };

  const sendEmail = async () => {
    if (!generatedLetter || !recipientEmail) {
      setEmailError("Please generate a letter and provide a recipient email.");
      return;
    }

    setSendingEmail(true);
    setEmailError(null);
    setEmailSentMessage('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject: `Objection to Permit: ${selectedPermit?.project_title}`,
          text: generatedLetter,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      setEmailSentMessage('Email sent successfully!');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const uniqueCountries = Array.from(new Set(permits.map(p => p.country))).sort();

  const filteredPermits = permits.filter(permit => {
    const matchesSearch = (
      permit.project_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permit.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permit.activity.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesCountry = selectedCountry === 'All' || permit.country === selectedCountry;
    return matchesSearch && matchesCountry;
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading Permits...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-red-500">Error: {error}</div>;

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
          Automated Factory Farm Objection Generator
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Empowering communities to protect their environment with AI-generated legal objections.
        </p>
        
        <div className="flex justify-center gap-4 mb-8">
          <Link href="/dashboard" className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 transition-all flex items-center gap-2">
            📊 View Analytics
          </Link>
          <Link href="/map" className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 transition-all flex items-center gap-2">
            🌍 Global Map
          </Link>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="max-w-4xl mx-auto mb-8 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search permits by title, location, or activity..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
        >
          <option value="All">All Countries</option>
          {uniqueCountries.map(country => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
      </div>

      {!selectedPermit ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {filteredPermits.map((permit, index) => (
            <div 
              key={index} 
              className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-green-500/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-green-500/20 group"
              onClick={() => setSelectedPermit(permit)}
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  permit.status === 'Approved' ? 'bg-green-500/20 text-green-400' :
                  permit.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  permit.status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {permit.status}
                </span>
                <span className="text-gray-400 text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {permit.country}
                </span>
              </div>
              <h2 className="text-xl font-bold mb-2 group-hover:text-green-400 transition-colors">{permit.project_title}</h2>
              <p className="text-gray-400 text-sm mb-4 line-clamp-2">{permit.activity}</p>
              <div className="flex items-center text-gray-500 text-xs gap-2">
                <Clock className="w-3 h-3" />
                <span>{permit.location}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
            <textarea
              id="customDetails"
              value={customDetails}
              onChange={(e) => setCustomDetails(e.target.value)}
              rows={5}
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
        </form >

    { letterError && (
      <p className="text-red-500 mt-4">Error generating letter: {letterError}</p>
    )
}

<div className="max-w-4xl mx-auto text-center mb-12">
  <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
    Automated Factory Farm Objection Generator
  </h1>
  <p className="text-xl text-gray-300 mb-8">
    Empowering communities to protect their environment with AI-generated legal objections.
  </p>

  <div className="flex justify-center gap-4 mb-8">
    <Link href="/dashboard" className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 transition-all flex items-center gap-2">
      📊 View Analytics
    </Link>
    <Link href="/map" className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 transition-all flex items-center gap-2">
      🌍 Global Map
    </Link>
  </div>
</div>

{/* Search and Filter Section */ }
<div className="max-w-4xl mx-auto mb-8 flex gap-4">
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
    <input
      type="text"
      placeholder="Search permits by title, location, or activity..."
      className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  </div>
  <select
    className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
    value={selectedCountry}
    onChange={(e) => setSelectedCountry(e.target.value)}
  >
    <option value="All">All Countries</option>
    {uniqueCountries.map(country => (
      <option key={country} value={country}>{country}</option>
    ))}
  </select>
</div>
{
  generatedLetter && (
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
  )
}
      </section >
    )
  }
    </main >
  );
}