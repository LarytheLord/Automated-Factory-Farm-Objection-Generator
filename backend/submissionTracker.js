// Simple in-memory submission tracker
// In a real application, this would use a database

class SubmissionTracker {
  constructor() {
    this.submissions = new Map(); // Using Map for better performance
    this.nextId = 1;
  }

  // Create a new submission record
  createSubmission(submissionData) {
    const id = this.nextId++;
    const submission = {
      id,
      ...submissionData,
      status: 'pending', // Default status
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.submissions.set(id, submission);
    return submission;
  }

  // Get a specific submission by ID
  getSubmission(id) {
    return this.submissions.get(parseInt(id));
  }

  // Get all submissions (with optional filtering)
  getAllSubmissions(filter = {}) {
    let results = Array.from(this.submissions.values());
    
    // Apply filters if provided
    if (filter.status) {
      results = results.filter(sub => sub.status === filter.status);
    }
    if (filter.email) {
      results = results.filter(sub => sub.email === filter.email);
    }
    
    // Sort by creation date (newest first)
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return results;
  }

  // Update submission status
  updateSubmission(id, updateData) {
    const submission = this.submissions.get(parseInt(id));
    if (!submission) {
      return null;
    }
    
    // Update the submission
    Object.assign(submission, updateData, {
      updatedAt: new Date().toISOString(),
    });
    
    this.submissions.set(parseInt(id), submission);
    return submission;
 }

  // Delete a submission
  deleteSubmission(id) {
    return this.submissions.delete(parseInt(id));
  }
}

// Create a singleton instance
const submissionTracker = new SubmissionTracker();

module.exports = submissionTracker;