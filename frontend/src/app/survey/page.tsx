"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { Send, CheckCircle, AlertCircle } from "lucide-react";

export default function SurveyPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    feedbackType: "suggestion",
    suggestion: "",
    issueDescription: "",
    rating: 0,
    additionalComments: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRatingChange = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    // Simple validation
    if (!formData.name || !formData.email) {
      setError("Name and email are required");
      setSubmitting(false);
      return;
    }

    if ((formData.feedbackType === "suggestion" && !formData.suggestion) || 
        (formData.feedbackType === "issue" && !formData.issueDescription)) {
      setError("Please provide details about your feedback");
      setSubmitting(false);
      return;
    }

    try {
      // In a real application, you would send this to your backend
      console.log("Survey submitted:", formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitted(true);
      setFormData({
        name: "",
        email: "",
        role: "",
        feedbackType: "suggestion",
        suggestion: "",
        issueDescription: "",
        rating: 0,
        additionalComments: ""
      });
    } catch (err) {
      setError("Failed to submit survey. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="glass-card max-w-2xl w-full p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Thank You!</h1>
          <p className="text-gray-400 mb-6">
            Your feedback has been received. We appreciate you taking the time to help improve AFOG.
          </p>
          <button 
            onClick={() => setSubmitted(false)}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-lg transition-all"
          >
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Help Us Improve AFOG</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Your feedback is invaluable in helping us create the most effective tool for opposing factory farming permits. 
            Share your suggestions, report issues, or tell us how we're doing.
          </p>
        </div>

        <div className="glass-card p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500/30 transition-colors"
                  placeholder="Your name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500/30 transition-colors"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500/30 transition-colors"
              >
                <option value="">Select your role</option>
                <option value="activist">Animal Rights Activist</option>
                <option value="ngo">NGO Representative</option>
                <option value="lawyer">Legal Professional</option>
                <option value="researcher">Researcher/Analyst</option>
                <option value="concerned">Concerned Citizen</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Feedback Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { value: "suggestion", label: "Feature Suggestion" },
                  { value: "issue", label: "Report Issue" },
                  { value: "feedback", label: "General Feedback" }
                ].map((option) => (
                  <label 
                    key={option.value}
                    className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                      formData.feedbackType === option.value
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-white/[0.06] hover:border-white/[0.1]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="feedbackType"
                      value={option.value}
                      checked={formData.feedbackType === option.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="ml-3">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {formData.feedbackType === "suggestion" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Feature Suggestion *
                </label>
                <textarea
                  name="suggestion"
                  value={formData.suggestion}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500/30 transition-colors"
                  placeholder="Describe the feature or improvement you'd like to see..."
                ></textarea>
              </div>
            )}

            {formData.feedbackType === "issue" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Issue Description *
                </label>
                <textarea
                  name="issueDescription"
                  value={formData.issueDescription}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500/30 transition-colors"
                  placeholder="Describe the problem or issue you encountered..."
                ></textarea>
              </div>
            )}

            {formData.feedbackType === "feedback" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  How would you rate AFOG? (1-5 stars)
                </label>
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRatingChange(star)}
                      className={`text-2xl transition-colors ${
                        star <= formData.rating ? "text-yellow-400" : "text-gray-600"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Additional Comments
              </label>
              <textarea
                name="additionalComments"
                value={formData.additionalComments}
                onChange={handleChange}
                rows={3}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500/30 transition-colors"
                placeholder="Any other thoughts or suggestions..."
              ></textarea>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Feedback
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Your feedback helps us create a more effective tool for opposing factory farming permits.</p>
          <p className="mt-2">All responses are confidential and used solely for improvement purposes.</p>
        </div>
      </div>
    </div>
  );
}