const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/emailService');
const { OAuth2Client } = require('google-auth-library');

const DEFAULT_GOOGLE_CLIENT_ID = '1050404875372-dir2v8sobkf4757c129pjl0hgum3dlak.apps.googleusercontent.com';
const googleClient = new OAuth2Client();
const jwtSecret = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return process.env.JWT_SECRET;
};

const createSession = (user) => ({
  token: jwt.sign(
    { id: user.id, email: user.email, role: 'customer', passwordChangedAt: user.passwordChangedAt?.getTime?.() || 0 },
    jwtSecret(),
    { expiresIn: '7d' }
  ),
  user: {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone || null,
    isVerified: user.isVerified,
    role: 'customer'
  }
});

// ==========================================
// 1. REGISTER USER 1fwfff
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

    console.log('🎉 Registration complete for:', email);

    res.status(201).json(createSession(user));
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

    // --- CUSTOMER LOGIN LOGIC ---
    const user = await prisma.customer.findUnique({ where: { email } });
    
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.isSuspended) return res.status(403).json({ error: 'Account suspended' });

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json(createSession(user));
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (admin?.lockedUntil && admin.lockedUntil > new Date()) return res.status(429).json({ error: 'Account temporarily locked. Try again later or reset your password.' });
    const valid = admin && await bcrypt.compare(req.body.password || '', admin.password);
    if (!valid) {
      if (admin) {
        const attempts=admin.failedLoginAttempts+1;
        await prisma.admin.update({where:{id:admin.id},data:{failedLoginAttempts:attempts,lockedUntil:attempts>=5?new Date(Date.now()+15*60000):null}});
      }
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    await prisma.admin.update({where:{id:admin.id},data:{failedLoginAttempts:0,lockedUntil:null}});
    const token = jwt.sign({ id: admin.id, email: admin.email, role: 'admin', passwordChangedAt: admin.passwordChangedAt?.getTime() || 0 }, jwtSecret(), { expiresIn: '8h' });
    return res.json({ token, user: { id: admin.id, name: admin.name, email: admin.email, role: 'admin' } });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Admin login failed' });
  }
};

exports.changeAdminPassword=async(req,res)=>{try{const admin=await prisma.admin.findUnique({where:{id:req.user.id}});if(!admin||!await bcrypt.compare(req.body.currentPassword||'',admin.password))return res.status(401).json({error:'Current password is incorrect'});if(typeof req.body.newPassword!=='string'||req.body.newPassword.length<12)return res.status(400).json({error:'New password must be at least 12 characters'});if(await bcrypt.compare(req.body.newPassword,admin.password))return res.status(400).json({error:'Choose a different password'});await prisma.admin.update({where:{id:admin.id},data:{password:await bcrypt.hash(req.body.newPassword,12),passwordChangedAt:new Date(),failedLoginAttempts:0,lockedUntil:null}});res.json({success:true});}catch(error){console.error(error);res.status(500).json({error:'Password change failed'});}};

exports.requestAdminPasswordReset=async(req,res)=>{try{const email=req.body.email?.trim().toLowerCase();const admin=await prisma.admin.findUnique({where:{email}});if(admin){const raw=crypto.randomBytes(32).toString('hex'),hashed=crypto.createHash('sha256').update(raw).digest('hex');await prisma.admin.update({where:{id:admin.id},data:{passwordResetToken:hashed,passwordResetExpires:new Date(Date.now()+30*60000)}});const nodemailer=require('nodemailer');const mailer=nodemailer.createTransport({host:process.env.EMAIL_HOST,port:Number(process.env.EMAIL_PORT),secure:Number(process.env.EMAIL_PORT)===465,auth:{user:process.env.EMAIL_USER,pass:process.env.EMAIL_PASS}});await mailer.sendMail({from:`"Highmarc" <${process.env.EMAIL_USER}>`,to:admin.email,subject:'Highmarc admin password reset',html:`<p>A password reset was requested for your Highmarc admin account.</p><p><a href="${process.env.CLIENT_URL}/admin/reset-password?token=${raw}">Reset password</a></p><p>This link expires in 30 minutes. If you did not request it, ignore this email.</p>`});}res.json({message:'If the admin account exists, a reset email has been sent.'});}catch(error){console.error(error);res.status(500).json({error:'Password reset request failed'});}};

exports.resetAdminPassword=async(req,res)=>{try{const hashed=crypto.createHash('sha256').update(req.body.token||'').digest('hex');const admin=await prisma.admin.findFirst({where:{passwordResetToken:hashed,passwordResetExpires:{gt:new Date()}}});if(!admin)return res.status(400).json({error:'Reset link is invalid or expired'});if(typeof req.body.password!=='string'||req.body.password.length<12)return res.status(400).json({error:'Password must be at least 12 characters'});await prisma.admin.update({where:{id:admin.id},data:{password:await bcrypt.hash(req.body.password,12),passwordChangedAt:new Date(),passwordResetToken:null,passwordResetExpires:null,failedLoginAttempts:0,lockedUntil:null}});res.json({success:true});}catch(error){res.status(500).json({error:'Password reset failed'});}};

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
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const { id, role } = req.user; // Set by authenticateUser middleware

    // Handle Admin
    if (role === 'admin') {
      const admin = await prisma.admin.findUnique({ where: { id } });
      if (!admin) return res.status(404).json({ error: 'Admin not found' });
      return res.json({ user: { id: admin.id, name: admin.name, email: admin.email, role: 'admin' } });
    }

    // Handle Customer
    const user = await prisma.customer.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.isSuspended) return res.status(403).json({ error: 'Account suspended' });

    res.json({
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || null,
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

// ==========================================
// GOOGLE SIGN-UP / SIGN-IN
// ==========================================
exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    const configuredClientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const allowedAudiences = [...new Set([
      DEFAULT_GOOGLE_CLIENT_ID,
      configuredClientId,
    ].filter(Boolean))];

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: allowedAudiences,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || !payload.email_verified) {
      return res.status(401).json({ error: 'Google account could not be verified' });
    }

    const email = payload.email.toLowerCase();
    const users = await prisma.$queryRaw`
      SELECT id, email, "firstName", "lastName", phone, password,
             "isVerified", "googleId", "passwordChangedAt"
      FROM "Customer"
      WHERE "googleId" = ${payload.sub} OR email = ${email}
      LIMIT 1
    `;
    let user = users[0];
    let isNewUser = false;

    if (user) {
      if (user.googleId && user.googleId !== payload.sub) {
        return res.status(409).json({ error: 'This email is linked to another Google account' });
      }

      const googleIsAuthoritative = email.endsWith('@gmail.com') || Boolean(payload.hd);
      if (!user.googleId && !googleIsAuthoritative) {
        return res.status(409).json({
          error: 'Sign in with your password before linking this Google account'
        });
      }

      await prisma.$executeRaw`
        UPDATE "Customer"
        SET "googleId" = ${payload.sub}, "updatedAt" = NOW()
        WHERE id = ${user.id}
      `;
      user = { ...user, googleId: payload.sub };
    } else {
      isNewUser = true;
      const firstName = payload.given_name || payload.name?.split(' ')[0] || 'Google';
      const lastName = payload.family_name || payload.name?.split(' ').slice(1).join(' ') || 'User';
      const verificationToken = crypto.randomBytes(32).toString('hex');

      user = await prisma.customer.create({
        data: {
          email,
          firstName,
          lastName,
          isVerified: false,
          verificationToken,
        }
      });

      await prisma.$executeRaw`
        UPDATE "Customer"
        SET "googleId" = ${payload.sub}
        WHERE id = ${user.id}
      `;
      user = { ...user, googleId: payload.sub };

      try {
        await sendVerificationEmail(email, verificationToken, firstName);
      } catch (emailError) {
        console.error('Google signup verification email failed:', emailError.message);
      }
    }

    return res.json({ ...createSession(user), isNewUser });
  } catch (error) {
    console.error('Google authentication error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

    if (typeof error.code === 'string' && error.code.startsWith('P')) {
      return res.status(503).json({
        error: 'Google account verified, but account creation failed'
      });
    }

    return res.status(401).json({ error: 'Google authentication failed' });
  }
};
