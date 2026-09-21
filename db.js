// db.js — one SQLite file (attendance.db) holds everything.
// No separate database server to install; the file lives next to the code.
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'attendance.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('lecturer','student')),
  matric_no TEXT,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_matric ON users(matric_no) WHERE matric_no IS NOT NULL;

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  lecturer_id INTEGER NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
  class_id INTEGER NOT NULL REFERENCES classes(id),
  student_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id),
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  radius_m INTEGER NOT NULL,
  code TEXT NOT NULL,
  code_expires_at INTEGER NOT NULL,
  code_life_s INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  started_at INTEGER NOT NULL,
  ended_at INTEGER
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  student_id INTEGER NOT NULL REFERENCES users(id),
  distance_m REAL NOT NULL,
  checked_in_at INTEGER NOT NULL,
  UNIQUE(session_id, student_id)
);
`);

module.exports = db;
