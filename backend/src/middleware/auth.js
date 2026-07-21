const jwt = require('jsonwebtoken');

const clerkPemKey = process.env.CLERK_PEM_PUBLIC_KEY;
const isClerkEnabled = !!clerkPemKey;

if (isClerkEnabled) {
  console.log('Clerk Auth initialized successfully using PEM Public Key.');
} else {
  console.log('CLERK_PEM_PUBLIC_KEY missing from environment variables. Running in MOCK AUTH mode.');
}

const authMiddleware = async (req, res, next) => {
  if (!isClerkEnabled) {
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
    
    // Format the PEM key to ensure it has correct headers/newlines
    let formattedKey = clerkPemKey.trim();
    if (!formattedKey.includes('-----BEGIN PUBLIC KEY-----')) {
      // Replace space placeholders with actual newlines if the user pasted it in a single line
      const cleanKey = formattedKey.replace(/\\n/g, '\n');
      if (cleanKey.includes('-----BEGIN PUBLIC KEY-----')) {
        formattedKey = cleanKey;
      } else {
        formattedKey = `-----BEGIN PUBLIC KEY-----\n${formattedKey.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
      }
    }

    const payload = jwt.verify(token, formattedKey, { algorithms: ['RS256'] });
    
    req.user = {
      id: payload.sub,
      email: payload.email || '',
      claims: payload
    };
    
    next();
  } catch (error) {
    console.error('Clerk token validation failed:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

module.exports = authMiddleware;
