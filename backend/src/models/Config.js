const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  ghostingThresholdDays: {
    type: Number,
    required: true,
    default: 21
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Config', configSchema);
