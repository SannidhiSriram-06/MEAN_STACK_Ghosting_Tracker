// Import the Groq library to talk to the AI model
const { Groq } = require('groq-sdk');

// Get the API key from our secret .env file
const GROQ_API_KEY = process.env.GROQ_API_KEY;
let groqClient = null;

// If we have an API key, set up the AI client
if (GROQ_API_KEY) {
  try {
    groqClient = new Groq({ apiKey: GROQ_API_KEY });
    console.log('Groq SDK initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Groq Client:', error);
  }
} else {
  // If no key is found, tell the user we'll use a basic word-matching system instead
  console.log('GROQ_API_KEY missing from environment variables. Running fit-check in DETERMINISTIC OVERLAP mode.');
}

/**
 * Normalizes text to extract matching keywords.
 * This is our "fallback" system if the AI fails. It just checks if the CV has the same tech words as the Job.
 */
function calculateKeywordOverlap(cvText = '', jdText = '') {
  // A list of common programming skills to look out for
  const commonTechSkills = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'golang', 'rust', 'php',
    'react', 'angular', 'vue', 'nextjs', 'express', 'django', 'spring', 'flask',
    'mongodb', 'postgresql', 'mysql', 'redis', 'sqlite', 'oracle',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'ci/cd', 'terraform', 'graphql',
    'html', 'css', 'sass', 'tailwind', 'bootstrap', 'jquery',
    'rest', 'api', 'microservices', 'scrum', 'agile', 'testing', 'jest', 'mocha', 'cypress'
  ];

  // Convert everything to lowercase so it's easier to match
  const cvLower = cvText.toLowerCase();
  const jdLower = jdText.toLowerCase();

  // Find which of those tech skills are actually mentioned in the Job Description
  const jdSkills = commonTechSkills.filter(skill => jdLower.includes(skill));
  if (jdSkills.length === 0) {
    // If the job doesn't mention any tech skills, just return an average score
    return {
      score: 50, 
      matched: [],
      missing: []
    };
  }

  // Find which job skills are ALSO in the candidate's CV
  const matched = jdSkills.filter(skill => cvLower.includes(skill));
  // Find which job skills the candidate is MISSING
  const missing = jdSkills.filter(skill => !cvLower.includes(skill));
  
  // Calculate the score as a percentage (matched / total * 100)
  const score = Math.round((matched.length / jdSkills.length) * 100);

  return {
    score,
    matched,
    missing
  };
}

/**
 * Maps a numeric score (0-100) to a funny and realistic verdict string.
 */
function getVerdictFromScore(score) {
  if (score >= 75) return 'you will get an interview callback-strong fit'; // High score
  if (score >= 45) return '50-50 chances needs cv improvement'; // Medium score
  return 'why did you even apply bruh 😭'; // Low score
}

/**
 * The main function that asks the AI to analyze the CV vs Job Description.
 */
async function analyzeFit(cvText = '', jdText = '', retryCount = 1) {
  // If the user forgot to provide the CV or Job Description, return a failing score instantly
  if (!cvText.trim() || !jdText.trim()) {
    return {
      score: 0,
      verdict: 'why did you even apply bruh 😭',
      rationale: 'Missing CV or Job Description text.',
      matchedSkills: [],
      missingSkills: [],
      improvements: ['Ensure CV and Job Description are provided before running checks.'],
      examples: [],
      lowConfidence: false,
      scoredAt: new Date()
    };
  }

  // Calculate the basic keyword score just in case the AI fails or is offline
  const overlapResult = calculateKeywordOverlap(cvText, jdText);

  // If we don't have an AI client set up, just return the basic keyword score immediately
  if (!groqClient) {
    // Suggest the user adds the missing skills to their CV
    const improvements = overlapResult.missing.map(skill => `Add details about your experience working with ${skill} in a production environment.`);
    const examples = overlapResult.missing.map(skill => `E.g. 'Developed and optimized backend modules using ${skill}, improving performance by 25%.'`);

    return {
      score: overlapResult.score,
      verdict: getVerdictFromScore(overlapResult.score),
      rationale: `Computed via keyword overlap cross-check (Groq API key not set). Found matches for: ${overlapResult.matched.join(', ') || 'none'}.`,
      matchedSkills: overlapResult.matched,
      missingSkills: overlapResult.missing,
      improvements: improvements.length > 0 ? improvements : ['Enhance tech keywords matches by updating CV with relevant libraries.'],
      examples: examples.length > 0 ? examples : ['E.g. "Integrated REST APIs and mapped JSON data formats natively in Angular."'],
      lowConfidence: false,
      scoredAt: new Date()
    };
  }

  try {
    // This is the instructions we give to the AI so it knows how to act
    const systemPrompt = `You are a senior technical recruiter and career coach. Analyze the candidate's CV vs the Job Description deeply.
Return ONLY a JSON object with this exact schema — no markdown, no prose outside JSON:
{
  "score": 72,
  "rationale": "One crisp sentence summarising the overall alignment.",
  "strengthSummary": "2-3 sentences highlighting the candidate's strongest points relevant to this role.",
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3", "skill4"],
  "redFlags": ["Specific concern 1 a recruiter would notice", "Specific concern 2"],
  "improvements": [
    "Concrete resume bullet improvement action (be specific — mention skill name and how to frame it)",
    "Another improvement"
  ],
  "examples": [
    "Exact rewritten bullet point or phrase for their CV, e.g. 'Led migration of monolith to Docker microservices on AWS ECS, reducing deploy time by 60%'"
  ],
  "actionableTips": [
    "Specific thing to do NOW to strengthen this application (e.g. add a GitHub project, get a cert, tailor the summary)",
    "Another tip"
  ],
  "interviewPrepTips": [
    "Likely interview question for this role and how to frame the answer using their background",
    "Another likely interview question with framing advice"
  ]
}
Be direct, specific, and genuinely helpful. Avoid generic advice. Reference the actual JD requirements and CV content.`;

    // Combine the user's CV and Job Description into one message
    const userPrompt = `### CANDIDATE CV TEXT:\n${cvText}\n\n### JOB DESCRIPTION:\n${jdText}`;

    // Send the message to the Groq AI model and wait for its response
    const completion = await groqClient.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1, // A low temperature means the AI will be more logical and less creative
      response_format: { type: 'json_object' } // Force the AI to reply in a computer-readable JSON format
    });

    // Get the text the AI replied with
    const responseContent = completion.choices[0].message.content;
    let parsedResult;
    try {
      // Convert the text into a real JavaScript object
      parsedResult = JSON.parse(responseContent);
    } catch (e) {
      throw new Error('Unable to parse JSON structure from LLM response.');
    }

    // Defensive parsing: Ensure all the required fields exist so the app doesn't crash
    const score = Math.max(0, Math.min(100, Number(parsedResult.score) || 0));
    const rationale = parsedResult.rationale || 'Alignment evaluated successfully.';
    const strengthSummary = parsedResult.strengthSummary || '';
    const matchedSkills = Array.isArray(parsedResult.matchedSkills) ? parsedResult.matchedSkills : [];
    const missingSkills = Array.isArray(parsedResult.missingSkills) ? parsedResult.missingSkills : [];
    const redFlags = Array.isArray(parsedResult.redFlags) ? parsedResult.redFlags : [];
    const improvements = Array.isArray(parsedResult.improvements) ? parsedResult.improvements : [];
    const examples = Array.isArray(parsedResult.examples) ? parsedResult.examples : [];
    const actionableTips = Array.isArray(parsedResult.actionableTips) ? parsedResult.actionableTips : [];
    const interviewPrepTips = Array.isArray(parsedResult.interviewPrepTips) ? parsedResult.interviewPrepTips : [];
    
    // Cross-check: If the AI score is vastly different from our basic keyword score, flag it as "low confidence"
    const scoreDifference = Math.abs(score - overlapResult.score);
    const lowConfidence = scoreDifference > 30;

    // Return the final packaged result back to the server route
    return {
      score,
      verdict: getVerdictFromScore(score),
      rationale,
      strengthSummary,
      matchedSkills: matchedSkills.length > 0 ? matchedSkills : overlapResult.matched,
      missingSkills: missingSkills.length > 0 ? missingSkills : overlapResult.missing,
      redFlags,
      improvements,
      examples,
      actionableTips,
      interviewPrepTips,
      lowConfidence,
      scoredAt: new Date()
    };

  } catch (error) {
    console.error(`LLM fitcheck error (Retries left: ${retryCount}):`, error.message);
    // If the AI fails (like a network error), try again if we have retries left
    if (retryCount > 0) {
      return analyzeFit(cvText, jdText, retryCount - 1);
    }
    
    // If all retries failed, fall back to our simple keyword matching system
    const improvements = overlapResult.missing.map(skill => `Add details about your experience working with ${skill} in a production environment.`);
    const examples = overlapResult.missing.map(skill => `E.g. 'Developed and optimized backend modules using ${skill}, improving performance by 25%.'`);

    return {
      score: overlapResult.score,
      verdict: getVerdictFromScore(overlapResult.score),
      rationale: `Fallback: LLM connection failed. Determined by keyword overlap scan.`,
      matchedSkills: overlapResult.matched,
      missingSkills: overlapResult.missing,
      improvements: improvements.length > 0 ? improvements : ['Enhance tech keywords matches by updating CV with relevant libraries.'],
      examples: examples.length > 0 ? examples : ['E.g. "Integrated REST APIs and mapped JSON data formats natively in Angular."'],
      lowConfidence: true,
      scoredAt: new Date()
    };
  }
}

// Export the functions so other files can use them
module.exports = {
  calculateKeywordOverlap,
  analyzeFit,
  getVerdictFromScore
};
