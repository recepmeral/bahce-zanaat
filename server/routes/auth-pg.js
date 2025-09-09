const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../database-pg');

// Register
router.post('/register', async (req, res) => {
  const { username, password, fullName, email, phone, address } = req.body;
  
  try {
    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Kullanıcı adı veya email zaten kayıtlı' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert new user
    const result = await pool.query(
      `INSERT INTO users (username, password, email, phone, full_name, address) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [username, hashedPassword, email, phone, fullName, address]
    );
    
    const userId = result.rows[0].id;
    
    // Generate token
    const token = jwt.sign(
      { id: userId, username, isAdmin: false },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({ 
      message: 'Kayıt başarılı', 
      token,
      userId,
      isAdmin: false
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Kayıt oluşturulamadı' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Find user
    const result = await pool.query(
      'SELECT id, username, password, is_admin FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    }
    
    const user = result.rows[0];
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: user.is_admin },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Giriş başarılı',
      token,
      userId: user.id,
      isAdmin: user.is_admin
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Giriş başarısız' });
  }
});

module.exports = router;