const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
require('dotenv').config();

const { scanAndFlagGhosted } = require('./services/ghostingService');
const applicationsRouter = require('./routes/applications');
const insightsRouter = require('./routes/insights');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/jobtrack';

// Middleware
app.use(cors());
app.use(express.json());

// Serving uploaded files locally if local storage mode is active
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'backend',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/applications', applicationsRouter);
app.use('/api/insights', insightsRouter);

app.get('/api/auth-config', (req, res) => {
  res.json({
    clerkEnabled: !!process.env.CLERK_PEM_PUBLIC_KEY,
    publishableKey: process.env.CLERK_PEM_PUBLIC_KEY || ''
  });
});

// Vercel Cron Endpoint for Ghosting Scan
app.get('/api/cron/ghost-scan', async (req, res) => {
  // Secure the endpoint with a CRON_SECRET if it is provided
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  console.log('Running automated ghosting check via Vercel Cron...');
  try {
    const updatedCount = await scanAndFlagGhosted();
    console.log(`Cron ghosting scan complete. Updated ${updatedCount} applications.`);
    res.status(200).json({ success: true, updatedCount });
  } catch (error) {
    console.error('Failed to execute ghosting cron job:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Daily scheduled cron job (runs every day at midnight '0 0 * * *')
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily automated ghosting check...');
  try {
    const updatedCount = await scanAndFlagGhosted();
    console.log(`Daily ghosting scan complete. Updated ${updatedCount} applications.`);
  } catch (error) {
    console.error('Failed to execute daily ghosting cron job:', error);
  }
});

// Database connection & Server Boot
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully.');
    app.listen(PORT, () => {
      console.log(`Backend server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    // Boot server anyway for health checks even if DB is offline
    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT} (MongoDB offline)`);
    });
  });

module.exports = app; // For testing
