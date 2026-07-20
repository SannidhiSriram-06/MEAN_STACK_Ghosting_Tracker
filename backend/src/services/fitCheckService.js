const { Groq } = require('groq-sdk');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
let groqClient = null;

if (GROQ_API_KEY) {
  try {
    groqClient = new Groq({ apiKey: GROQ_API_KEY });
    console.log('Groq SDK initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Groq Client:', error);
  }
} else {
  console.log('GROQ_API_KEY missing from environment variables. Running fit-check in DETERMINISTIC OVERLAP mode.');
}

/**
 * Normalizes text to extract matching keywords.
 */
function calculateKeywordOverlap(cvText = '', jdText = '') {
  const commonTechSkills = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'golang', 'rust', 'php',
    'react', 'angular', 'vue', 'nextjs', 'express', 'django', 'spring', 'flask',
    'mongodb', 'postgresql', 'mysql', 'redis', 'sqlite', 'oracle',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'ci/cd', 'terraform', 'graphql',
    'html', 'css', 'sass', 'tailwind', 'bootstrap', 'jquery',
    'rest', 'api', 'microservices', 'scrum', 'agile', 'testing', 'jest', 'mocha', 'cypress'
  ];

  const cvLower = cvText.toLowerCase();
  const jdLower = jdText.toLowerCase();

  // Find tech skills mentioned in JD
  const jdSkills = commonTechSkills.filter(skill => jdLower.includes(skill));
  if (jdSkills.length === 0) {
    return {
      score: 50, // Default midpoint if no common keywords are found in JD
      matched: [],
      missing: []
    };
  }

  const matched = jdSkills.filter(skill => cvLower.includes(skill));
  const missing = jdSkills.filter(skill => !cvLower.includes(skill));
  const score = Math.round((matched.length / jdSkills.length) * 100);

  return {
    score,
    matched,
    missing
  };
}

/**
 * Maps a numeric score (0-100) to the verdict enum:
 * STRONG_MATCH: 75-100
 * COIN_FLIP: 45-74
 * REACH: 0-44
 */
function getVerdictFromScore(score) {
  if (score >= 75) return 'STRONG_MATCH';
  if (score >= 45) return 'COIN_FLIP';
  return 'REACH';
}

/**
 * Invokes the Groq API to analyze CV vs. JD alignment.
 * Fallback to keyword overlap if Groq fails or is not configured.
 */
async function analyzeFit(cvText = '', jdText = '', retryCount = 1) {
  // If CV or JD are empty, return minimum match
  if (!cvText.trim() || !jdText.trim()) {
    return {
      score: 0,
      verdict: 'REACH',
      rationale: 'Missing CV or Job Description text.',
      matchedSkills: [],
      missingSkills: [],
      lowConfidence: false,
      scoredAt: new Date()
    };
  }

  // Calculate deterministic keyword overlap
  const overlapResult = calculateKeywordOverlap(cvText, jdText);

  // If Groq is not configured, return fallback immediately
  if (!groqClient) {
    return {
      score: overlapResult.score,
      verdict: getVerdictFromScore(overlapResult.score),
      rationale: `Computed via keyword overlap cross-check (Groq API key not set). Found matches for: ${overlapResult.matched.join(', ') || 'none'}.`,
      matchedSkills: overlapResult.matched,
      missingSkills: overlapResult.missing,
      lowConfidence: false,
      scoredAt: new Date()
    };
  }

  try {
    const systemPrompt = `You are a technical recruiting assistant. Compare the candidate's CV text and the Job Description (JD).
Evaluate the match alignment on a scale of 0 to 100.
Identify matched and missing skills. Write a short, single-sentence rationale.
You MUST return ONLY a JSON response in the following schema:
{
  "score": 75,
  "rationale": "The candidate has strong front-end experience but lacks required AWS configuration knowledge.",
  "matchedSkills": ["javascript", "angular", "css"],
  "missingSkills": ["aws", "docker"]
}`;

    const userPrompt = `### CANDIDATE CV TEXT:\n${cvText}\n\n### JOB DESCRIPTION:\n${jdText}`;

    const completion = await groqClient.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const responseContent = completion.choices[0].message.content;
    let parsedResult;
    try {
      parsedResult = JSON.parse(responseContent);
    } catch (e) {
      throw new Error('Unable to parse JSON structure from LLM response.');
    }

    // Defensive parsing & validation of required fields
    const score = Math.max(0, Math.min(100, Number(parsedResult.score) || 0));
    const rationale = parsedResult.rationale || 'Alignment evaluated successfully.';
    const matchedSkills = Array.isArray(parsedResult.matchedSkills) ? parsedResult.matchedSkills : [];
    const missingSkills = Array.isArray(parsedResult.missingSkills) ? parsedResult.missingSkills : [];
    
    // Cross-check: Low confidence if LLM score and keyword score diverge by > 30 points
    const scoreDifference = Math.abs(score - overlapResult.score);
    const lowConfidence = scoreDifference > 30;

    return {
      score,
      verdict: getVerdictFromScore(score),
      rationale,
      matchedSkills: matchedSkills.length > 0 ? matchedSkills : overlapResult.matched,
      missingSkills: missingSkills.length > 0 ? missingSkills : overlapResult.missing,
      lowConfidence,
      scoredAt: new Date()
    };

  } catch (error) {
    console.error(`LLM fitcheck error (Retries left: ${retryCount}):`, error.message);
    if (retryCount > 0) {
      return analyzeFit(cvText, jdText, retryCount - 1);
    }
    
    // Hard fallback: return deterministic result
    return {
      score: overlapResult.score,
      verdict: getVerdictFromScore(overlapResult.score),
      rationale: `Fallback: LLM connection failed. Determined by keyword overlap scan.`,
      matchedSkills: overlapResult.matched,
      missingSkills: overlapResult.missing,
      lowConfidence: true,
      scoredAt: new Date()
    };
  }
}

module.exports = {
  calculateKeywordOverlap,
  analyzeFit,
  getVerdictFromScore
};
