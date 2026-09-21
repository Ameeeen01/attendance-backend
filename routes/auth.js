const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { SECRET } = require('../middleware/auth');

const router = express.Router();

// Register a lecturer or student account.
router.post('/register', (req, res) => {
  const { name, email, password, role, matricNo } = req.body;
  if (!name || !email || !password || !['lecturer', 'student'].includes(role)) {
    return res.status(400).json({ error: 'name, email, password and role (lecturer/student) are required' });
  }
  if (role === 'student' && !matricNo) {
    return res.status(400).json({ error: 'matricNo is required for students' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

  if (role === 'student') {
    const dupe = db.prepare('SELECT id FROM users WHERE matric_no = ?').get(matricNo);
    if (dupe) return res.status(409).json({ error: 'An account with that matric number already exists' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, role, matric_no, created_at) VALUES (?,?,?,?,?,?)')
    .run(name, email, hash, role, role === 'student' ? matricNo : null, Date.now());

  const token = jwt.sign({ id: info.lastInsertRowid, name, role }, SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: info.lastInsertRowid, name, email, role, matricNo: role === 'student' ? matricNo : null } });
});

// Log in with email + password.
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }
  const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, matricNo: user.matric_no } });
});

module.exports = router;
