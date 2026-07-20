const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Application = require('../models/Application');
const ResumeVersion = require('../models/ResumeVersion');
const authMiddleware = require('../middleware/auth');
const { scanAndFlagGhosted } = require('../services/ghostingService');
const { analyzeFit } = require('../services/fitCheckService');
const { uploadResume } = require('../services/s3Service');

// Multer in-memory configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Protect all routes with Cognito auth / mock auth
router.use(authMiddleware);

/**
 * GET /api/applications
 * List applications for the authenticated user.
 * Optional query filters: status, sort.
 */
router.get('/', async (req, res) => {
  try {
    const { status, sort } = req.query;
    const query = { userId: req.user.id };
    
    if (status) {
      query.status = status;
    }
    
    let dbQuery = Application.find(query);
    
    if (sort === 'dateApplied') {
      dbQuery = dbQuery.sort({ dateApplied: -1 });
    } else {
      dbQuery = dbQuery.sort({ updatedAt: -1 });
    }
    
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
 * Create a new application.
 */
router.post('/', async (req, res) => {
  try {
    const { company, role, jobDescription, dateApplied, location, source, notes } = req.body;
    
    if (!company || !role || !dateApplied) {
      return res.status(400).json({ error: 'Company, role, and dateApplied are required fields' });
    }
    
    const now = new Date();
    const newApp = new Application({
      userId: req.user.id,
      company,
      role,
      jobDescription: jobDescription || '',
      dateApplied: new Date(dateApplied),
      status: 'applied',
      lastStatusChange: now,
      location: location || '',
      source: source || '',
      notes: notes || '',
      statusHistory: [{
        status: 'applied',
        changedAt: now,
        reason: 'Application logged'
      }]
    });
    
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
 * POST /api/applications/check-ghosting
 * Manual trigger for ghosting scan.
 */
router.post('/check-ghosting', async (req, res) => {
  try {
    const updatedCount = await scanAndFlagGhosted();
    res.json({ updatedCount });
  } catch (error) {
    console.error('Failed to scan for ghosted applications:', error);
    res.status(500).json({ error: 'Server error scanning for ghosted applications' });
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

    if (!cvText) {
      return res.status(400).json({ error: 'No CV text or uploaded resume version found. Please upload a CV first or paste CV text.' });
    }

    const fitScoreResult = await analyzeFit(cvText, app.jobDescription);
    
    // Save to application document
    app.fitScore = {
      score: fitScoreResult.score,
      verdict: fitScoreResult.verdict,
      rationale: fitScoreResult.rationale,
      matchedSkills: fitScoreResult.matchedSkills,
      missingSkills: fitScoreResult.missingSkills,
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

router.post('/:id/fit-score', runFitScore);
router.post('/:id/fit-check', runFitScore); // Support alias

/**
 * POST /api/applications/upload-resume
 * Upload a resume, parse PDF contents, store locally or on S3, and create a ResumeVersion.
 */
router.post('/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file uploaded' });
    }

    // 1. Parse PDF contents in-memory
    let extractedText = '';
    try {
      const pdfData = await pdfParse(req.file.buffer);
      extractedText = pdfData.text || '';
    } catch (parseError) {
      console.error('Error parsing PDF text, saving anyway:', parseError.message);
      // Fallback: keep text blank
    }

    // 2. Upload file to S3 or local fallback
    const uploadResult = await uploadResume(req.file, req.user.id);

    // 3. Save to database
    const newResumeVersion = new ResumeVersion({
      userId: req.user.id,
      fileName: uploadResult.fileName,
      s3Key: uploadResult.s3Key,
      localPath: uploadResult.localPath,
      extractedText: extractedText
    });

    const savedResume = await newResumeVersion.save();
    res.status(201).json({
      message: 'Resume uploaded and processed successfully.',
      resumeId: savedResume._id,
      fileName: savedResume.fileName,
      storageType: uploadResult.storageType,
      textLength: extractedText.length
    });

  } catch (error) {
    console.error('Failed to upload/process resume:', error);
    res.status(500).json({ error: 'Server error uploading resume' });
  }
});

/**
 * GET /api/applications/resumes
 * Retrieve a list of uploaded resumes for this user.
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

module.exports = router;
