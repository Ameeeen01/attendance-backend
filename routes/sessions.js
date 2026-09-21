const express = require('express');
const { customAlphabet } = require('nanoid');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const genCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

// Lecturer starts a live session for one of their classes.
router.post('/', requireAuth, requireRole('lecturer'), (req, res) => {
  const { classId, lat, lng, radiusM, codeLifeS } = req.body;
  const cls = db.prepare('SELECT * FROM classes WHERE id = ? AND lecturer_id = ?').get(classId, req.user.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const now = Date.now();
  const life = codeLifeS || 45;
  const info = db
    .prepare(
      `INSERT INTO sessions (class_id, lat, lng, radius_m, code, code_expires_at, code_life_s, active, started_at)
       VALUES (?,?,?,?,?,?,?,1,?)`
    )
    .run(classId, lat, lng, radiusM || 40, genCode(), now + life * 1000, life, now);

  res.json(getSessionView(info.lastInsertRowid));
});

// Lecturer polls the full session state, code included (this is what the
// projector screen reads from).
router.get('/:id', requireAuth, requireRole('lecturer'), (req, res) => {
  maybeRotateCode(Number(req.params.id));
  const view = getSessionView(Number(req.params.id));
  if (!view) return res.status(404).json({ error: 'Session not found' });
  res.json(view);
});

// Student polls session status WITHOUT the code — they only learn it by
// reading it off the room's screen, not from the API.
router.get('/:id/status', requireAuth, requireRole('student'), (req, res) => {
  maybeRotateCode(Number(req.params.id));
  const s = getSessionView(Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const { code, ...safe } = s;
  res.json(safe);
});

// Lecturer ends the session.
router.post('/:id/end', requireAuth, requireRole('lecturer'), (req, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE sessions SET active = 0, ended_at = ? WHERE id = ?').run(Date.now(), id);
  res.json({ ended: true });
});

function getSessionView(id) {
  const s = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  if (!s) return null;
  // Students never receive the code directly via this endpoint's public fields;
  // the code is only meant to be read by the lecturer's own screen (see below).
  return s;
}

function maybeRotateCode(id) {
  const s = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  if (!s || !s.active) return;
  if (Date.now() >= s.code_expires_at) {
    db.prepare('UPDATE sessions SET code = ?, code_expires_at = ? WHERE id = ?').run(
      genCode(),
      Date.now() + s.code_life_s * 1000,
      id
    );
  }
}

// Look up the currently active session for a class, if any — students use
// this instead of needing to know a session id in advance.
router.get('/active/:classId', requireAuth, (req, res) => {
  const classId = Number(req.params.classId);
  const s = db
    .prepare('SELECT id FROM sessions WHERE class_id = ? AND active = 1 ORDER BY started_at DESC LIMIT 1')
    .get(classId);
  res.json(s || null);
});

module.exports = router;
