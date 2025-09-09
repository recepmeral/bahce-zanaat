const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../database-pg');

// Middleware - token doğrulama
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token gerekli' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Geçersiz token' });
    req.user = user;
    next();
  });
};

// Tüm yorumları getir (public)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, u.full_name 
      FROM reviews r 
      JOIN users u ON r.user_id = u.id 
      ORDER BY r.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Yorumlar alınamadı' });
  }
});

// Kullanıcının yorumlarını getir
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM reviews WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({ error: 'Yorumlar alınamadı' });
  }
});

// Yeni yorum ekle
router.post('/', authenticateToken, async (req, res) => {
  const { rating, comment } = req.body;

  if (!rating || !comment) {
    return res.status(400).json({ error: 'Değerlendirme ve yorum gerekli' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Değerlendirme 1-5 arası olmalı' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO reviews (user_id, rating, comment) VALUES ($1, $2, $3) RETURNING id',
      [req.user.id, rating, comment]
    );
    
    res.json({ 
      id: result.rows[0].id,
      message: 'Yorum başarıyla eklendi' 
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ error: 'Yorum eklenemedi' });
  }
});

// Yorum güncelle
router.put('/:id', authenticateToken, async (req, res) => {
  const { rating, comment } = req.body;
  const reviewId = req.params.id;

  try {
    const result = await pool.query(
      'UPDATE reviews SET rating = $1, comment = $2 WHERE id = $3 AND user_id = $4',
      [rating, comment, reviewId, req.user.id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Yorum bulunamadı veya yetkiniz yok' });
    }
    
    res.json({ message: 'Yorum güncellendi' });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Yorum güncellenemedi' });
  }
});

// Yorum sil
router.delete('/:id', authenticateToken, async (req, res) => {
  const reviewId = req.params.id;

  try {
    const result = await pool.query(
      'DELETE FROM reviews WHERE id = $1 AND user_id = $2',
      [reviewId, req.user.id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Yorum bulunamadı veya yetkiniz yok' });
    }
    
    res.json({ message: 'Yorum silindi' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Yorum silinemedi' });
  }
});

module.exports = router;