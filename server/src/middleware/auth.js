// server/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const verifyToken = token => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return jwt.verify(token, process.env.JWT_SECRET);
};

exports.authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      const decoded = verifyToken(token);
      if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
      const admin=await prisma.admin.findUnique({where:{id:decoded.id},select:{passwordChangedAt:true,lockedUntil:true}});
      if(!admin)return res.status(401).json({error:'Admin account no longer exists'});
      if(admin.lockedUntil&&admin.lockedUntil>new Date())return res.status(423).json({error:'Admin account is temporarily locked'});
      if((admin.passwordChangedAt?.getTime()||0)>(decoded.passwordChangedAt||0))return res.status(401).json({error:'Session expired after password change'});
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
    
    try {
      const decoded = verifyToken(token);
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
