const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

/**
 * GET /api/stats (and alias GET /api/insights/stats)
 * Return aggregate statistics for the user's job search.
 */
const getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Run aggregation pipelines
    // Status distribution
    const statusGroups = await Application.aggregate([
      { $match: { userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Source distribution
    const sourceGroups = await Application.aggregate([
      { $match: { userId, source: { $nin: [null, ''] } } },
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);

    // Average Fit Score
    const fitScoreAgg = await Application.aggregate([
      { $match: { userId, 'fitScore.score': { $ne: null } } },
      { $group: { _id: null, avgScore: { $avg: '$fitScore.score' } } }
    ]);

    // 2. Format outcomes
    const totalApplications = await Application.countDocuments({ userId });
    
    const byStatus = {
      applied: 0,
      screening: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
      ghosted: 0
    };
    statusGroups.forEach(group => {
      if (byStatus.hasOwnProperty(group._id)) {
        byStatus[group._id] = group.count;
      }
    });

    const bySource = {};
    sourceGroups.forEach(group => {
      bySource[group._id] = group.count;
    });

    const averageFitScore = fitScoreAgg.length > 0 ? Math.round(fitScoreAgg[0].avgScore * 10) / 10 : null;

    // Ghosting rate calculation
    const ghostedCount = byStatus.ghosted || 0;
    const ghostingRate = totalApplications > 0 ? Math.round((ghostedCount / totalApplications) * 100) / 100 : 0;

    // Response rate calculation: response is defined as any app that moved past 'applied' or 'ghosted'
    const responsesCount = (byStatus.screening || 0) + (byStatus.interview || 0) + (byStatus.offer || 0) + (byStatus.rejected || 0);
    const responseRate = totalApplications > 0 ? Math.round((responsesCount / totalApplications) * 100) / 100 : 0;

    // 3. Average days to first response (Calculated via MongoDB Aggregation Pipeline)
    const avgDaysAgg = await Application.aggregate([
      { $match: { userId, 'statusHistory.1': { $exists: true } } },
      { $project: {
          appliedLog: {
            $arrayElemAt: [
              { $filter: { input: '$statusHistory', as: 'h', cond: { $eq: ['$$h.status', 'applied'] } } },
              0
            ]
          },
          responseLog: {
            $arrayElemAt: [
              { $filter: { input: '$statusHistory', as: 'h', cond: { $in: ['$$h.status', ['screening', 'interview', 'offer', 'rejected']] } } },
              0
            ]
          }
      }},
      { $match: { appliedLog: { $exists: true, $ne: null }, responseLog: { $exists: true, $ne: null } } },
      { $project: {
          diffMs: { $subtract: ['$responseLog.changedAt', '$appliedLog.changedAt'] }
      }},
      { $match: { diffMs: { $gte: 0 } } },
      { $group: {
          _id: null,
          avgDiffMs: { $avg: '$diffMs' }
      }}
    ]);

    const avgDaysToFirstResponse = avgDaysAgg.length > 0 && avgDaysAgg[0].avgDiffMs
      ? Math.round((avgDaysAgg[0].avgDiffMs / (1000 * 60 * 60 * 24)) * 10) / 10 
      : 0;

    res.json({
      totalApplications,
      byStatus,
      bySource,
      ghostingRate,
      responseRate,
      averageFitScore,
      avgDaysToFirstResponse
    });

  } catch (error) {
    console.error('Failed to compute stats:', error);
    res.status(500).json({ error: 'Server error computing dashboard stats' });
  }
};

router.get('/stats', getStats);

/**
 * GET /api/insights/skill-gap (and alias GET /api/insights/skill-gap)
 * Retrieve most frequently missing skills across the user's fit-checked listings.
 */
const getSkillGap = async (req, res) => {
  try {
    const userId = req.user.id;

    // Aggregate: matching user's non-null fit scores -> unwind list -> group and count -> sort descending
    const skillGap = await Application.aggregate([
      { $match: { userId, 'fitScore.missingSkills': { $exists: true, $ne: [] } } },
      { $unwind: '$fitScore.missingSkills' },
      { 
        $group: { 
          _id: { $toLower: '$fitScore.missingSkills' }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 15 } // Top 15 missing skills
    ]);

    res.json(skillGap);
  } catch (error) {
    console.error('Failed to compute skill gap insights:', error);
    res.status(500).json({ error: 'Server error computing skill gaps' });
  }
};

router.get('/skill-gap', getSkillGap);

module.exports = router;
