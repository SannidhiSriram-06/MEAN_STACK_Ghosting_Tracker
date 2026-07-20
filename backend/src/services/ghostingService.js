const Application = require('../models/Application');
const Config = require('../models/Config');

/**
 * Pure function to check if the status change threshold has been exceeded.
 * Mocks the referenceDate to allow robust unit testing.
 */
function isThresholdExceeded(lastStatusChangeDate, thresholdDays, referenceDate = new Date()) {
  const diffTime = referenceDate.getTime() - new Date(lastStatusChangeDate).getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays >= thresholdDays;
}

/**
 * Retrieves the ghosting threshold in days from the DB (Config collection),
 * falling back to GHOST_THRESHOLD_DAYS env var, then default 21 days.
 */
async function getGhostingThreshold() {
  try {
    let config = await Config.findOne();
    if (!config) {
      const defaultThreshold = parseInt(process.env.GHOST_THRESHOLD_DAYS) || 21;
      config = await Config.create({ ghostingThresholdDays: defaultThreshold });
    }
    return config.ghostingThresholdDays;
  } catch (error) {
    console.error('Error fetching ghosting config, using environment fallback:', error);
    return parseInt(process.env.GHOST_THRESHOLD_DAYS) || 21;
  }
}

/**
 * Checks all active job applications and automatically flags them as 'ghosted'
 * if they exceed the threshold time since the last status change.
 */
async function scanAndFlagGhosted() {
  const thresholdDays = await getGhostingThreshold();
  const referenceDate = new Date();
  
  // Terminal states are 'offer', 'rejected', and already 'ghosted'
  const activeStatuses = ['applied', 'screening', 'interview'];
  
  // Find all candidate applications
  const candidates = await Application.find({
    status: { $in: activeStatuses }
  });

  let updatedCount = 0;

  for (const app of candidates) {
    if (isThresholdExceeded(app.lastStatusChange, thresholdDays, referenceDate)) {
      const oldStatus = app.status;
      app.status = 'ghosted';
      app.lastStatusChange = referenceDate;
      app.statusHistory.push({
        status: 'ghosted',
        changedAt: referenceDate,
        reason: `Auto-ghosted: No update for ${thresholdDays} days (previously '${oldStatus}')`
      });
      await app.save();
      updatedCount++;
    }
  }

  return updatedCount;
}

module.exports = {
  isThresholdExceeded,
  getGhostingThreshold,
  scanAndFlagGhosted
};
