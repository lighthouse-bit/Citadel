// server/src/middleware/auth.js
const jwt = require('jsonwebtoken');

exports.authenticateAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // For development/demo - allow demo token
    if (token === 'demo_token') {
      req.user = { id: '1', role: 'admin', email: 'admin@citadel.com' };
      return next();
    }

    // Verify JWT token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'citadel-secret-key');
      req.user = decoded;
      next();
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

exports.authenticateUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      req.user = null;
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (token === 'demo_token') {
      req.user = { id: '1', role: 'admin', email: 'admin@citadel.com' };
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'citadel-secret-key');
      req.user = decoded;
    } catch {
      req.user = null;
    }
    
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};