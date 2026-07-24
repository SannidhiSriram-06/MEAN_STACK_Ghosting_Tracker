// Import the express library to build our web server routes
const express = require('express');
// Create a new router object which will hold all the URLs for our applications
const router = express.Router();
// Import multer, a tool to handle file uploads (like PDFs)
const multer = require('multer');

// Import our database blueprints (Models)
const Application = require('../models/Application');
const ResumeVersion = require('../models/ResumeVersion');
// Import our security checkpoint (Middleware) to make sure users are logged in
const authMiddleware = require('../middleware/auth');
// Import our custom functions for ghosting and AI scoring
const { scanAndFlagGhosted } = require('../services/ghostingService');
const { analyzeFit } = require('../services/fitCheckService');

// Configure multer to store uploaded files in the server's temporary RAM memory
// We limit the size to 5MB so people don't crash our server with massive files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Security gate: This forces ALL URLs in this file to require a valid login token first
router.use(authMiddleware);

/**
 * GET /api/applications
 * This URL gets a list of all job applications for the person currently logged in.
 */
router.get('/', async (req, res) => {
  try {
    // Look at the URL to see if they want to filter by status or sort by date
    const { status, sort } = req.query;
    
    // Automatically run our ghosting checker to mark old jobs as "ghosted"
    try {
      await scanAndFlagGhosted(req.user.id, 10);
    } catch (ghostErr) {
      console.error('Auto-ghosting scan failed:', ghostErr);
    }

    // Prepare a search query: We only want applications belonging to THIS user
    const query = { userId: req.user.id };
    
    // If they clicked a filter button (like "Interviewing"), add it to our search
    if (status) {
      query.status = status;
    }
    
    // Start searching the database
    let dbQuery = Application.find(query);
    
    // Sort the results so the newest ones show up first
    if (sort === 'dateApplied') {
      dbQuery = dbQuery.sort({ dateApplied: -1 });
    } else {
      dbQuery = dbQuery.sort({ updatedAt: -1 });
    }
    
    // Wait for the database to finish searching, then send the list back to the frontend
    const applications = await dbQuery;
    res.json(applications);
  } catch (error) {
    console.error('Failed to get applications:', error);
    res.status(500).json({ error: 'Server error retrieving applications' });
  }
});

/**
 * GET /api/applications/:id
 * Retrieve a specific application by ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json(application);
  } catch (error) {
    console.error('Failed to get application:', error);
    res.status(500).json({ error: 'Server error retrieving application' });
  }
});

/**
 * POST /api/applications
 * This URL creates a brand new job application in the database.
 */
router.post('/', async (req, res) => {
  try {
    // Extract the form data the user typed in on the frontend
    const { company, role, jobDescription, dateApplied, location, source, notes, cvUsed } = req.body;
    
    // Make sure they filled out the required fields
    if (!company || !role || !dateApplied) {
      return res.status(400).json({ error: 'Company, role, and dateApplied are required fields' });
    }
    
    const now = new Date();
    // Create a new Application record in the database format
    const newApp = new Application({
      userId: req.user.id, // Attach it to the logged-in user
      company,
      role,
      jobDescription: jobDescription || '',
      dateApplied: new Date(dateApplied),
      status: 'applied', // Default status is "applied"
      lastStatusChange: now,
      location: location || '',
      source: source || '',
      notes: notes || '',
      cvUsed: cvUsed || '',
      // Start a history log so we can track status changes over time
      statusHistory: [{
        status: 'applied',
        changedAt: now,
        reason: 'Application logged'
      }]
    });
    
    // Save it permanently to MongoDB and send it back to the frontend
    const saved = await newApp.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Failed to create application:', error);
    res.status(500).json({ error: 'Server error creating application' });
  }
});

/**
 * PUT /api/applications/:id
 * Update an existing application.
 */
router.put('/:id', async (req, res) => {
  try {
    const app = await Application.findOne({ _id: req.params.id, userId: req.user.id });
    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    const { company, role, jobDescription, dateApplied, status, location, source, notes } = req.body;
    
    if (company) app.company = company;
    if (role) app.role = role;
    if (jobDescription !== undefined) app.jobDescription = jobDescription;
    if (dateApplied) app.dateApplied = new Date(dateApplied);
    if (location !== undefined) app.location = location;
    if (source !== undefined) app.source = source;
    if (notes !== undefined) app.notes = notes;
    
    // Check if status changed
    if (status && status !== app.status) {
      const oldStatus = app.status;
      app.status = status;
      app.lastStatusChange = new Date();
      app.statusHistory.push({
        status: status,
        changedAt: app.lastStatusChange,
        reason: `Status updated manually from '${oldStatus}'`
      });
    }
    
    const updated = await app.save();
    res.json(updated);
  } catch (error) {
    console.error('Failed to update application:', error);
    res.status(500).json({ error: 'Server error updating application' });
  }
});

/**
 * DELETE /api/applications/:id
 * Delete an application.
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Application.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!deleted) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete application:', error);
    res.status(500).json({ error: 'Server error deleting application' });
  }
});



/**
 * POST /api/applications/:id/fit-score AND POST /api/applications/:id/fit-check
 * Evaluates match score using Groq LLM and keyword overlap logic.
 */
const runFitScore = async (req, res) => {
  try {
    const app = await Application.findOne({ _id: req.params.id, userId: req.user.id });
    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }

    let cvText = req.body.cvText || '';
    let resumeId = req.body.resumeId || app.resumeId;

    // If no CV text is pasted, fetch the ResumeVersion text
    if (!cvText && resumeId) {
      const resume = await ResumeVersion.findOne({ _id: resumeId, userId: req.user.id });
      if (resume) {
        cvText = resume.extractedText;
      }
    }

    // Fallback: use latest user resume if none provided
    if (!cvText) {
      const latestResume = await ResumeVersion.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
      if (latestResume) {
        cvText = latestResume.extractedText;
        resumeId = latestResume._id;
      }
    }

    if (!cvText || cvText.trim().length < 10) {
      return res.status(400).json({ error: 'Valid CV text is required.' });
    }

    const fitScoreResult = await analyzeFit(cvText, app.jobDescription);
    
    // Save to application document
    app.fitScore = {
      score: fitScoreResult.score,
      verdict: fitScoreResult.verdict,
      rationale: fitScoreResult.rationale,
      strengthSummary: fitScoreResult.strengthSummary || '',
      matchedSkills: fitScoreResult.matchedSkills,
      missingSkills: fitScoreResult.missingSkills,
      redFlags: fitScoreResult.redFlags || [],
      improvements: fitScoreResult.improvements || [],
      examples: fitScoreResult.examples || [],
      actionableTips: fitScoreResult.actionableTips || [],
      interviewPrepTips: fitScoreResult.interviewPrepTips || [],
      lowConfidence: fitScoreResult.lowConfidence,
      scoredAt: fitScoreResult.scoredAt
    };
    
    if (resumeId) {
      app.resumeId = resumeId;
    }

    await app.save();
    res.json(app.fitScore);
  } catch (error) {
    console.error('Failed to run fit-scoring:', error);
    res.status(500).json({ error: 'Server error processing fit score' });
  }
};

// Helper function to wipe all application and resume data for a user
async function wipeUserAppData(userId) {
  const deletedApps = await Application.deleteMany({ userId });
  const deletedResumes = await ResumeVersion.deleteMany({ userId });
  return {
    deletedApplicationsCount: deletedApps.deletedCount,
    deletedResumesCount: deletedResumes.deletedCount
  };
}

router.post('/:id/fit-score', runFitScore);

/**
 * POST /api/applications/:id/cv-upload
 * Upload a PDF CV for a specific application. The file is stored as a
 * binary buffer inside the application document (no external file storage).
 */
router.post('/:id/cv-upload', upload.single('cvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are accepted.' });
    }

    const app = await Application.findOne({ _id: req.params.id, userId: req.user.id });
    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }

    app.cvPdf = {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer
    };

    await app.save();
    res.json({
      message: 'CV PDF uploaded successfully.',
      fileName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Failed to upload CV PDF:', error);
    res.status(500).json({ error: 'Server error uploading CV PDF' });
  }
});

/**
 * GET /api/applications/:id/cv-download
 * Download the CV PDF attached to a specific application.
 */
router.get('/:id/cv-download', async (req, res) => {
  try {
    const app = await Application.findOne(
      { _id: req.params.id, userId: req.user.id },
      'cvPdf'
    );
    if (!app || !app.cvPdf || !app.cvPdf.data) {
      return res.status(404).json({ error: 'No CV PDF found for this application.' });
    }

    res.set({
      'Content-Type': app.cvPdf.mimeType || 'application/pdf',
      'Content-Disposition': `attachment; filename="${app.cvPdf.originalName || 'cv.pdf'}"`
    });
    res.send(app.cvPdf.data);
  } catch (error) {
    console.error('Failed to download CV PDF:', error);
    res.status(500).json({ error: 'Server error downloading CV PDF' });
  }
});

/**
 * POST /api/applications/upload-resume
 * Save a plain-text CV version with a custom name to MongoDB.
 */
router.post('/upload-resume', async (req, res) => {
  try {
    const { versionName, cvText } = req.body;

    if (!cvText || cvText.trim().length < 20) {
      return res.status(400).json({ error: 'CV text is too short. Please paste your full CV content.' });
    }

    const name = (versionName || '').trim() || `CV Version – ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

    const newResumeVersion = new ResumeVersion({
      userId: req.user.id,
      fileName: name,
      s3Key: null,
      localPath: null,
      extractedText: cvText.trim()
    });

    const savedResume = await newResumeVersion.save();
    res.status(201).json({
      message: 'CV version saved successfully.',
      resumeId: savedResume._id,
      fileName: savedResume.fileName,
      textLength: cvText.trim().length
    });

  } catch (error) {
    console.error('Failed to save CV version:', error);
    res.status(500).json({ error: 'Server error saving CV version' });
  }
});

/**
 * GET /api/applications/resumes/list
 * Retrieve a list of CV text versions for this user.
 */
router.get('/resumes/list', async (req, res) => {
  try {
    const resumes = await ResumeVersion.find({ userId: req.user.id })
      .select('fileName createdAt')
      .sort({ createdAt: -1 });
    res.json(resumes);
  } catch (error) {
    console.error('Failed to retrieve resumes list:', error);
    res.status(500).json({ error: 'Server error retrieving resume versions' });
  }
});

/**
 * DELETE /api/applications/resumes/:id
 * Delete a specific CV version by ID.
 */
router.delete('/resumes/:id', async (req, res) => {
  try {
    const resume = await ResumeVersion.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!resume) {
      return res.status(404).json({ error: 'CV version not found or not owned by you.' });
    }
    res.json({ message: 'CV version deleted successfully.' });
  } catch (error) {
    console.error('Failed to delete resume version:', error);
    res.status(500).json({ error: 'Server error deleting CV version' });
  }
});

/**
 * DELETE /api/applications/users/me/data
 * Wipes all Application and ResumeVersion records for the authenticated user.
 */
router.delete('/users/me/data', async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await wipeUserAppData(userId);
    
    res.json({
      message: 'All application data wiped successfully',
      ...stats
    });
  } catch (error) {
    console.error('Failed to wipe user data:', error);
    res.status(500).json({ error: 'Server error wiping user data' });
  }
});

/**
 * DELETE /api/applications/users/me
 * Full account deletion: wipes all application/resume documents for the user.
 */
router.delete('/users/me', async (req, res) => {
  try {
    const userId = req.user.id;
    await wipeUserAppData(userId);
    
    res.json({
      message: 'User account and all data deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete user account:', error);
    res.status(500).json({ error: 'Server error deleting account' });
  }
});

module.exports = router;
