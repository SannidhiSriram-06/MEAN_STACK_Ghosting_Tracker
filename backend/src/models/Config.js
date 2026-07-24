// Import mongoose, the tool for MongoDB interaction
const mongoose = require('mongoose');

// This Schema defines global configuration variables for the application.
// We use this so we can change settings without needing to restart the server or redeploy code.
const configSchema = new mongoose.Schema({
  // How many days a job application must be inactive before we consider it "ghosted"
  ghostingThresholdDays: {
    type: Number,
    required: true,
    default: 21 // Defaults to 3 weeks
  }
}, { timestamps: true }); // Automatically track when this config was created/updated

module.exports = mongoose.model('Config', configSchema);
