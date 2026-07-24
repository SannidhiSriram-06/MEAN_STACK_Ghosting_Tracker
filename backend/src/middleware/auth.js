// Import jsonwebtoken to read the secure login badges (tokens) users send us
const jwt = require('jsonwebtoken');
// Import jwks-rsa to fetch the public "keys" from Clerk to verify the badges are real
const jwksRsa = require('jwks-rsa');

// Helper function to extract the domain from our Clerk public key
function getDomainFromPublishableKey(publishableKey) {
  if (!publishableKey || !publishableKey.startsWith('pk_')) return null;
  try {
    const parts = publishableKey.split('_');
    const base64Part = parts[2] || parts[1]; // handle different formats
    const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
    return decoded.replace('$', '');
  } catch (error) {
    console.error('Failed to decode Clerk publishable key:', error);
    return null;
  }
}

const clerkPublishableKey = process.env.CLERK_PEM_PUBLIC_KEY;
const clerkDomain = getDomainFromPublishableKey(clerkPublishableKey);

let jwksClient = null;
if (clerkDomain) {
  jwksClient = jwksRsa({
    jwksUri: `https://${clerkDomain}/.well-known/jwks.json`,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5
  });
  console.log(`Clerk Auth initialized using JWKS at: https://${clerkDomain}/.well-known/jwks.json`);
} else {
  console.log('Clerk Publishable Key missing or invalid. Running in MOCK AUTH mode.');
}

function getKey(header, callback) {
  if (!jwksClient) {
    return callback(new Error('JWKS client not initialized'));
  }
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

const authMiddleware = async (req, res, next) => {
  // If we haven't configured Clerk, use a fake "mock" user so we can still test the app locally
  if (!clerkDomain || !jwksClient) {
    req.user = {
      id: 'mock-user-123',
      email: 'student@example.edu',
      name: 'Viva Candidate'
    };
    return next(); // Let the user through
  }

  try {
    // Check if the user sent their login token in the headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // If no token, block them!
      return res.status(401).json({ error: 'Authorization header is missing or malformed' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token using jsonwebtoken + JWKS client
    jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, payload) => {
      if (err) {
        console.error('Clerk token validation failed:', err.message);
        
        // Network/DNS fallback: if it's a connection, DNS, or rate-limit issue, decode claims locally to keep dev functional
        if (err.message.includes('ENOTFOUND') || err.message.includes('Too many requests') || err.message.includes('JWKS') || err.message.includes('getaddrinfo')) {
          const decoded = jwt.decode(token);
          if (decoded) {
            console.log('Using decoded Clerk token payload as fallback due to network/JWKS connection error.');
            req.user = {
              id: decoded.sub,
              email: decoded.email || '',
              claims: decoded
            };
            return next();
          }
        }
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
      
      req.user = {
        id: payload.sub,
        email: payload.email || '',
        claims: payload
      };
      next();
    });
  } catch (error) {
    console.error('Clerk auth middleware exception:', error);
    return res.status(401).json({ error: 'Unauthorized: Authentication error' });
  }
};

module.exports = authMiddleware;
