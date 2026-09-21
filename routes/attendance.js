const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { distanceMeters } = require('../utils/geo');

const router = express.Router();

// Student checks in: sends their live GPS coords + the code they read off
// the room screen. The SERVER computes the distance and decides — the
// phone's own opinion of "am I in range" is never trusted.
router.post('/:sessionId/checkin', requireAuth, requireRole('student'), (req, res) => {
  const sessionId = Number(req.params.sessionId);
  const { lat, lng, code } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !code) {
    return res.status(400).json({ error: 'lat, lng and code are required' });
  }

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session || !session.active) {
    return res.status(400).json({ error: 'This session is not active' });
  }
  if (code.trim().toUpperCase() !== session.code) {
    return res.status(401).json({ error: 'Incorrect or expired room code' });
  }

  const distance = distanceMeters(lat, lng, session.lat, session.lng);
  if (distance > session.radius_m) {
    return res.status(403).json({ error: `You're ${Math.round(distance)}m away — outside the ${session.radius_m}m geofence`, distance });
  }

  try {
    db.prepare(
      'INSERT INTO attendance (session_id, student_id, distance_m, checked_in_at) VALUES (?,?,?,?)'
    ).run(sessionId, req.user.id, distance, Date.now());
  } catch (e) {
    return res.status(409).json({ error: 'You are already checked in for this session' });
  }

  res.json({ checkedIn: true, distance: Math.round(distance), at: Date.now() });
});

// Lecturer: live roster for a session (who's in, distance, timestamp).
router.get('/:sessionId/roster', requireAuth, requireRole('lecturer'), (req, res) => {
  const sessionId = Number(req.params.sessionId);
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.matric_no, a.distance_m, a.checked_in_at
       FROM attendance a JOIN users u ON u.id = a.student_id
       WHERE a.session_id = ? ORDER BY a.checked_in_at ASC`
    )
    .all(sessionId);
  res.json(rows);
});

// Lecturer: attendance trend across a class's past sessions.
router.get('/class/:classId/trend', requireAuth, requireRole('lecturer'), (req, res) => {
  const classId = Number(req.params.classId);
  const sessions = db
    .prepare('SELECT id, started_at FROM sessions WHERE class_id = ? AND active = 0 ORDER BY started_at DESC LIMIT 8')
    .all(classId);
  const enrolledCount = db.prepare('SELECT COUNT(*) c FROM enrollments WHERE class_id = ?').get(classId).c;

  const trend = sessions
    .map((s) => {
      const present = db.prepare('SELECT COUNT(*) c FROM attendance WHERE session_id = ?').get(s.id).c;
      return { sessionId: s.id, startedAt: s.started_at, present, total: enrolledCount };
    })
    .reverse();

  res.json(trend);
});

module.exports = router;
