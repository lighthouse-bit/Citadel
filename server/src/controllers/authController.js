const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/emailService');

// ==========================================
// 1. REGISTER USER
// ==========================================
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    console.log('📝 Registration attempt for:', email);

    // Check if user already exists
    const existingUser = await prisma.customer.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a unique verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    console.log('🔑 Generated token:', verificationToken.substring(0, 15) + '...');

    // Create the customer in the database
    const user = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        verificationToken: verificationToken, // Explicitly named
        isVerified: false
      },
    });

    // IMMEDIATELY verify it was saved correctly
    const savedUser = await prisma.customer.findUnique({ 
      where: { id: user.id },
      select: { verificationToken: true, isVerified: true }
    });
    console.log('💾 Saved to DB - Token:', savedUser.verificationToken ? savedUser.verificationToken.substring(0, 15) + '...' : 'NULL ❌');
    console.log('💾 Saved to DB - isVerified:', savedUser.isVerified);

    // Send the verification email
    console.log('📧 Sending verification email to:', email);
    try {
      await sendVerificationEmail(email, verificationToken, firstName);
      console.log('✅ Email sent successfully!');
    } catch (emailError) {
      console.error('❌ Email failed:', emailError.message);
    }

    // Create a JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'customer' },
      process.env.JWT_SECRET || 'citadel-secret-key',
      { expiresIn: '7d' }
    );

    console.log('🎉 Registration complete for:', email);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        isVerified: user.isVerified,
        role: 'customer'
      }
    });
  } catch (error) {
    console.error('❌ Registration Error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ==========================================
// 2. LOGIN USER
// ==========================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // --- ADMIN LOGIN LOGIC ---
    if (email === 'admin@citadel.com' && password === 'admin123') {
      const token = jwt.sign(
        { id: 'admin', email, role: 'admin' },
        process.env.JWT_SECRET || 'citadel-secret-key',
        { expiresIn: '1d' }
      );
      return res.json({
        token,
        user: { id: 'admin', name: 'Admin', email, role: 'admin' }
      });
    }

    // --- CUSTOMER LOGIN LOGIC ---
    const user = await prisma.customer.findUnique({ where: { email } });
    
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'customer' },
      process.env.JWT_SECRET || 'citadel-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        isVerified: user.isVerified,
        role: 'customer'
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// ==========================================
// 3. VERIFY EMAIL
// ==========================================
// server/src/controllers/authController.js
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    console.log('======= VERIFICATION DEBUG =======');
    console.log('Token received:', token ? token.substring(0, 15) + '...' : 'MISSING');
    console.log('Token length:', token?.length);

    if (!token) {
      return res.status(400).json({ error: 'Missing verification token' });
    }

    // STEP 1: Try to find user with this token
    const user = await prisma.customer.findUnique({
      where: { verificationToken: token }
    });

    console.log('Token lookup result:', user ? `Found: ${user.email}` : 'NOT FOUND');

    // STEP 2: If not found, check if this token belonged to an already-verified user
    // This handles React Strict Mode double-call where first call succeeds
    // and clears the token, then second call fails
    if (!user) {
      console.log('Checking if user was just verified...');

      // Check all unverified users for debugging
      const unverifiedUsers = await prisma.customer.findMany({
        where: { verificationToken: { not: null } },
        select: {
          email: true,
          verificationToken: true,
          isVerified: true
        }
      });

      console.log('Unverified users in DB:', unverifiedUsers.length);
      unverifiedUsers.forEach(u => {
        console.log('  -', u.email);
        console.log('    DB token:', u.verificationToken?.substring(0, 15) + '...');
        console.log('    Match:', u.verificationToken === token);
      });

      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }

    // STEP 3: If already verified, return success (idempotent)
    if (user.isVerified) {
      console.log('User already verified, returning success');
      return res.json({ message: 'Email verified successfully' });
    }

    // STEP 4: Mark as verified and clear token
    await prisma.customer.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null
      }
    });

    console.log('✅ Verification successful for:', user.email);
    console.log('==================================');

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('❌ Verification Error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
};

// ==========================================
// 4. GET CURRENT PROFILE
// ==========================================
exports.getProfile = async (req, res) => {
  try {
    const { id, role } = req.user; // Set by authenticateUser middleware

    // Handle Admin
    if (role === 'admin') {
      return res.json({ 
        user: { id: 'admin', name: 'Admin', email: 'admin@citadel.com', role: 'admin' } 
      });
    }

    // Handle Customer
    const user = await prisma.customer.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        isVerified: user.isVerified,
        role: 'customer'
      }
    });
  } catch (error) {
    console.error('Profile Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// ==========================================
// 5. RESEND VERIFICATION EMAIL
// ==========================================
exports.resendVerification = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.customer.findUnique({ where: { id: userId } });

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isVerified) return res.json({ message: 'Email already verified' });

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await prisma.customer.update({
      where: { id: userId },
      data: { verificationToken }
    });

    await sendVerificationEmail(user.email, verificationToken, user.firstName);

    res.json({ message: 'Verification email resent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
};