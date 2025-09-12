require('dotenv').config();
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
  app.use('/api/admin', require('./routes/admin-pg'));
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