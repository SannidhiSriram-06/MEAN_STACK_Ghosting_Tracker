// Import the express library to build our web server
const express = require('express');
// Import mongoose to talk to our MongoDB database
const mongoose = require('mongoose');
// Import cors so our frontend can securely talk to our backend
const cors = require('cors');
// Import path to help us handle file and folder locations
const path = require('path');
// Load secret variables from the .env file (like API keys)
require('dotenv').config();

// Import our custom logic for finding "ghosted" applications (companies that never replied)
const { scanAndFlagGhosted } = require('./services/ghostingService');
// Import the URLs and logic that handle job applications
const applicationsRouter = require('./routes/applications');
// Import the URLs and logic that handle our dashboard stats
const insightsRouter = require('./routes/insights');

// Create the express app (our web server)
const app = express();
// Decide which port the server should listen on (like a channel number)
const PORT = process.env.PORT || 5000;
// Set the database connection link
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/jobtrack';

// --- Middleware (Functions that run before our main logic) ---
// Tell our server to allow requests from other websites (like our frontend)
app.use(cors());
// Tell our server to understand JSON data (the format web apps use to send data)
app.use(express.json());

// If we have any uploaded files, make the 'uploads' folder publicly accessible
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- Routes (The URLs our server responds to) ---

// A simple health check route so we can verify if the server is running
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'backend',
    timestamp: new Date().toISOString()
  });
});

// Tell the server to use our application logic when a user visits /api/applications
app.use('/api/applications', applicationsRouter);
// Tell the server to use our stats logic when a user visits /api/insights
app.use('/api/insights', insightsRouter);

// A special route to send Clerk authentication keys to the frontend
app.get('/api/auth-config', (req, res) => {
  res.json({
    clerkEnabled: !!process.env.CLERK_PEM_PUBLIC_KEY,
    publishableKey: process.env.CLERK_PEM_PUBLIC_KEY || ''
  });
});

// A route that Vercel calls on a schedule to check for ghosted applications
app.get('/api/cron/ghost-scan', async (req, res) => {
  // Secure the URL with a password (CRON_SECRET) so only Vercel can run it
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' }); // Stop unauthorized people
    }
  }

  console.log('Running automated ghosting check via Vercel Cron...');
  try {
    // Run the function that flags old applications as "ghosted"
    const updatedCount = await scanAndFlagGhosted();
    console.log(`Cron ghosting scan complete. Updated ${updatedCount} applications.`);
    // Reply back that it worked perfectly
    res.status(200).json({ success: true, updatedCount });
  } catch (error) {
    console.error('Failed to execute ghosting cron job:', error);
    // Reply back that something broke
    res.status(500).json({ success: false, error: error.message });
  }
});


// --- Database Connection & Server Boot ---

// Connect to MongoDB using the link we defined earlier
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully.');
    // If we are NOT running on Vercel (e.g. running on our own laptop), start listening!
    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`Backend server is running on port ${PORT}`);
      });
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    // Boot the server anyway so the /health URL works, even if the database is dead
    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`Backend server running on port ${PORT} (MongoDB offline)`);
      });
    }
  });

// Export the app so Vercel or testing tools can use it
module.exports = app;
