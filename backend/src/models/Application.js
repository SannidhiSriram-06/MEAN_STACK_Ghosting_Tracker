const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: ['applied', 'screening', 'interview', 'offer', 'rejected', 'ghosted']
  },
  changedAt: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    default: 'Manual update'
  }
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    trim: true
  },
  jobDescription: {
    type: String,
    default: ''
  },
  dateApplied: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['applied', 'screening', 'interview', 'offer', 'rejected', 'ghosted'],
    default: 'applied'
  },
  lastStatusChange: {
    type: Date,
    default: Date.now
  },
  location: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    default: ''
  },
  cvPdf: {
    originalName: { type: String, default: null },
    mimeType:     { type: String, default: null },
    size:         { type: Number, default: null },
    data:         { type: Buffer, default: null }
  },
  fitScore: {
    score: { type: Number, default: null },
    verdict: { type: String, default: null },
    rationale: { type: String, default: '' },
    strengthSummary: { type: String, default: '' },
    matchedSkills: [{ type: String }],
    missingSkills: [{ type: String }],
    redFlags: [{ type: String }],
    improvements: [{ type: String }],
    examples: [{ type: String }],
    actionableTips: [{ type: String }],
    interviewPrepTips: [{ type: String }],
    lowConfidence: { type: Boolean, default: false },
    scoredAt: { type: Date }
  },
  statusHistory: [statusHistorySchema],
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResumeVersion',
    default: null
  },
  cvUsed: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for optimization
applicationSchema.index({ status: 1 });
applicationSchema.index({ lastStatusChange: 1 });

module.exports = mongoose.model('Application', applicationSchema);
