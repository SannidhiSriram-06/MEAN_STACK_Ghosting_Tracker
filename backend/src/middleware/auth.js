const { CognitoJwtVerifier } = require('aws-jwt-verify');

let verifier = null;
const isCognitoEnabled = process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID;

if (isCognitoEnabled) {
  try {
    verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      tokenUse: 'access',
      clientId: process.env.COGNITO_CLIENT_ID,
    });
    console.log('Cognito JWT verifier initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Cognito JWT verifier:', error);
  }
} else {
  console.log('Cognito details missing from environment variables. Running in MOCK AUTH mode.');
}

const authMiddleware = async (req, res, next) => {
  // If Cognito is not enabled, use mock auth
  if (!isCognitoEnabled || verifier === null) {
    req.user = {
      id: 'mock-user-123',
      email: 'student@example.edu',
      name: 'Viva Candidate'
    };
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header is missing or malformed' });
    }

    const token = authHeader.split(' ')[1];
    // Verify token
    const payload = await verifier.verify(token);
    
    // Attach Cognito user sub (ID) and details to request object
    req.user = {
      id: payload.sub,
      email: payload.username || payload.email || '',
      claims: payload
    };
    
    next();
  } catch (error) {
    console.error('Cognito token validation failed:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

module.exports = authMiddleware;
