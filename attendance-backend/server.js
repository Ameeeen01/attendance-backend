require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const classRoutes = require('./routes/classes');
const sessionRoutes = require('./routes/sessions');
const attendanceRoutes = require('./routes/attendance');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/classes', classRoutes);
app.use('/sessions', sessionRoutes);
app.use('/attendance', attendanceRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Attendance backend running on http://localhost:${PORT}`));
