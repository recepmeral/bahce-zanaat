require('dotenv').config();

// Override DATABASE_URL to force IPv4 in production - MUST be before any pg module import
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:AliUrfali3838@db.jtnherytpxnaitrodmfd.supabase.co:5432/postgres';
  console.log('DATABASE_URL overridden to use IPv4');
}

const express = require('express');
const cors = require('cors');
const path = require('path');

// Use PostgreSQL if DATABASE_URL exists, otherwise use SQLite
const db = process.env.DATABASE_URL 
  ? require('./database-pg') 
  : require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes - Use PostgreSQL versions if DATABASE_URL exists
if (process.env.DATABASE_URL) {
  app.use('/api/auth', require('./routes/auth-pg'));
  app.use('/api/appointments', require('./routes/appointments-pg'));
  app.use('/api/reviews', require('./routes/reviews-pg'));
  // Admin route will use the same DB connection
  app.use('/api/admin', require('./routes/admin'));
} else {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/appointments', require('./routes/appointments'));
  app.use('/api/reviews', require('./routes/reviews'));
  app.use('/api/admin', require('./routes/admin'));
}

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Hata yakalama middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Bir hata olu_tu!' });
});

app.listen(PORT, () => {
  console.log(`Server http://localhost:${PORT} adresinde �al1_1yor`);
});