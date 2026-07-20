const mongoose = require('mongoose');

const resumeVersionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  s3Key: {
    type: String,
    default: null
  },
  localPath: {
    type: String,
    default: null
  },
  extractedText: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ResumeVersion', resumeVersionSchema);
