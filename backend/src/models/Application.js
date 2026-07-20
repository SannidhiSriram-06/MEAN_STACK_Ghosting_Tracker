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
  fitScore: {
    score: { type: Number, default: null },
    verdict: { type: String, enum: ['STRONG_MATCH', 'COIN_FLIP', 'REACH', null], default: null },
    rationale: { type: String, default: '' },
    matchedSkills: [{ type: String }],
    missingSkills: [{ type: String }],
    lowConfidence: { type: Boolean, default: false },
    scoredAt: { type: Date }
  },
  statusHistory: [statusHistorySchema],
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResumeVersion',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for optimization
applicationSchema.index({ status: 1 });
applicationSchema.index({ lastStatusChange: 1 });

module.exports = mongoose.model('Application', applicationSchema);
