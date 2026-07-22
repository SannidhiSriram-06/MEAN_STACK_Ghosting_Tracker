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
async function scanAndFlagGhosted(userId = null, overrideThresholdDays = null) {
  const thresholdDays = overrideThresholdDays !== null ? overrideThresholdDays : await getGhostingThreshold();
  const referenceDate = new Date();
  
  // Terminal states are 'offer', 'rejected', and already 'ghosted'
  const activeStatuses = ['applied', 'screening', 'interview'];
  const query = { status: { $in: activeStatuses } };
  
  if (userId) {
    query.userId = userId;
  }
  
  // Find all candidate applications
  const candidates = await Application.find(query);

  // Filter to only those that have exceeded the threshold
  const toGhost = candidates.filter(app =>
    isThresholdExceeded(app.lastStatusChange, thresholdDays, referenceDate)
  );

  if (toGhost.length === 0) return 0;

  // Single bulk write instead of N sequential saves
  await Application.bulkWrite(toGhost.map(app => ({
    updateOne: {
      filter: { _id: app._id },
      update: {
        $set: { status: 'ghosted', lastStatusChange: referenceDate },
        $push: {
          statusHistory: {
            status: 'ghosted',
            changedAt: referenceDate,
            reason: `Auto-ghosted: No update for ${thresholdDays} days (previously '${app.status}')`
          }
        }
      }
    }
  })));

  return toGhost.length;
}

module.exports = {
  isThresholdExceeded,
  getGhostingThreshold,
  scanAndFlagGhosted
};
