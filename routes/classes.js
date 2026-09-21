const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Lecturer creates a class.
router.post('/', requireAuth, requireRole('lecturer'), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const info = db
    .prepare('INSERT INTO classes (name, lecturer_id, created_at) VALUES (?,?,?)')
    .run(name, req.user.id, Date.now());
  res.json({ id: info.lastInsertRowid, name });
});

// Lecturer lists their own classes.
router.get('/', requireAuth, requireRole('lecturer'), (req, res) => {
  const classes = db.prepare('SELECT * FROM classes WHERE lecturer_id = ?').all(req.user.id);
  res.json(classes);
});

// Student joins a class by its numeric id (in a real app: an invite code/link).
router.post('/:id/join', requireAuth, requireRole('student'), (req, res) => {
  const classId = Number(req.params.id);
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  db.prepare('INSERT OR IGNORE INTO enrollments (class_id, student_id) VALUES (?,?)').run(classId, req.user.id);
  res.json({ joined: true, class: cls });
});

// Lecturer views the roster for one of their classes.
router.get('/:id/roster', requireAuth, requireRole('lecturer'), (req, res) => {
  const classId = Number(req.params.id);
  const cls = db.prepare('SELECT * FROM classes WHERE id = ? AND lecturer_id = ?').get(classId, req.user.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  const roster = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.matric_no FROM enrollments e
       JOIN users u ON u.id = e.student_id
       WHERE e.class_id = ?`
    )
    .all(classId);
  res.json(roster);
});

// Student lists the classes they've joined.
router.get('/mine', requireAuth, requireRole('student'), (req, res) => {
  const classes = db
    .prepare(
      `SELECT c.id, c.name FROM enrollments e
       JOIN classes c ON c.id = e.class_id
       WHERE e.student_id = ?`
    )
    .all(req.user.id);
  res.json(classes);
});

module.exports = router;
