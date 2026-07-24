// Import mongoose to talk to MongoDB
const mongoose = require('mongoose');

// This Schema acts as a database blueprint for storing the user's CV/Resume text
const resumeVersionSchema = new mongoose.Schema({
  // The ID of the user who owns this resume
  userId: {
    type: String,
    required: true,
    index: true // Speeds up queries when searching for a specific user's resumes
  },
  // A friendly name for this version (e.g., "Frontend Developer CV 2024")
  fileName: {
    type: String,
    required: true
  },
  // (Optional) If we later want to store the actual PDF in Amazon S3
  s3Key: {
    type: String,
    default: null
  },
  // (Optional) Path if the PDF is stored locally
  localPath: {
    type: String,
    default: null
  },
  // The raw text extracted from the CV (used for AI fit checks)
  extractedText: {
    type: String,
    default: ''
  }
}, { timestamps: true }); // Automatically track when this resume was uploaded

module.exports = mongoose.model('ResumeVersion', resumeVersionSchema);
