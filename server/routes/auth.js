const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');

// Kayıt ol
router.post('/register', async (req, res) => {
  const { username, password, email, phone, fullName, address } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      `INSERT INTO users (username, password, email, phone, full_name, address) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, email, phone, fullName, address],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Bu kullanıcı adı veya email zaten kayıtlı' });
          }
          return res.status(500).json({ error: 'Kayıt başarısız' });
        }
        
        const token = jwt.sign(
          { id: this.lastID, isAdmin: false },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );
        
        res.status(201).json({ 
          message: 'Kayıt başarılı',
          token,
          userId: this.lastID
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Giriş yap
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get(
    `SELECT * FROM users WHERE username = ? OR email = ?`,
    [username, username],
    async (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Hatalı şifre' });
      }
      
      const token = jwt.sign(
        { id: user.id, isAdmin: user.is_admin === 1 },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      res.json({
        message: 'Giriş başarılı',
        token,
        userId: user.id,
        isAdmin: user.is_admin === 1
      });
    }
  );
});

module.exports = router;