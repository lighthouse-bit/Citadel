const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Check if user exists
    const existingUser = await prisma.customer.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword, // Make sure 'password' field exists in schema!
      },
    });

    // Create token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'customer' },
      process.env.JWT_SECRET || 'citadel-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: 'customer'
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Admin Login (Hardcoded for simplicity, or use DB if you seeded admin)
    if (email === 'admin@citadel.com' && password === 'admin123') {
      const token = jwt.sign(
        { id: '1', email, role: 'admin' },
        process.env.JWT_SECRET || 'citadel-secret-key',
        { expiresIn: '1d' }
      );
      return res.json({
        token,
        user: { id: '1', name: 'Admin', email, role: 'admin' }
      });
    }

    // Customer Login
    const user = await prisma.customer.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // If user was created without password (e.g. from checkout), they can't login yet
    if (!user.password) {
      return res.status(400).json({ error: 'Please set a password for your account' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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
        role: 'customer'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get Profile
exports.getProfile = async (req, res) => {
  try {
    const { id, role } = req.user;

    if (role === 'admin') {
      return res.json({ user: { id, name: 'Admin', email: 'admin@citadel.com', role: 'admin' } });
    }

    const user = await prisma.customer.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: 'customer'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};