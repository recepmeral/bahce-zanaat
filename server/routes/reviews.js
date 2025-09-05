const express = require('express');
const router = express.Router();
const db = require('../database');
const jwt = require('jsonwebtoken');

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
router.get('/', (req, res) => {
  db.all(`
    SELECT r.*, u.full_name 
    FROM reviews r 
    JOIN users u ON r.user_id = u.id 
    ORDER BY r.created_at DESC
  `, (err, reviews) => {
    if (err) {
      return res.status(500).json({ error: 'Yorumlar alınamadı' });
    }
    res.json(reviews);
  });
});

// Kullanıcının yorumlarını getir
router.get('/my', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id],
    (err, reviews) => {
      if (err) {
        return res.status(500).json({ error: 'Yorumlar alınamadı' });
      }
      res.json(reviews);
    }
  );
});

// Yeni yorum ekle
router.post('/', authenticateToken, (req, res) => {
  const { rating, comment } = req.body;

  if (!rating || !comment) {
    return res.status(400).json({ error: 'Değerlendirme ve yorum gerekli' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Değerlendirme 1-5 arası olmalı' });
  }

  // Kullanıcının daha önce yorum yapıp yapmadığını kontrol et
  db.get('SELECT id FROM reviews WHERE user_id = ?', [req.user.id], (err, existingReview) => {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı hatası' });
    }

    // Birden fazla yorum yapılabilir, bu kontrolü kaldırıyoruz
    // if (existingReview) {
    //   return res.status(400).json({ error: 'Zaten bir yorumunuz bulunmaktadır' });
    // }

    // Yeni yorumu ekle
    db.run(
      'INSERT INTO reviews (user_id, rating, comment) VALUES (?, ?, ?)',
      [req.user.id, rating, comment],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Yorum eklenemedi' });
        }
        res.json({ 
          id: this.lastID,
          message: 'Yorum başarıyla eklendi' 
        });
      }
    );
  });
});

// Yorum güncelle
router.put('/:id', authenticateToken, (req, res) => {
  const { rating, comment } = req.body;
  const reviewId = req.params.id;

  db.run(
    'UPDATE reviews SET rating = ?, comment = ? WHERE id = ? AND user_id = ?',
    [rating, comment, reviewId, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Yorum güncellenemedi' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Yorum bulunamadı veya yetkiniz yok' });
      }
      res.json({ message: 'Yorum güncellendi' });
    }
  );
});

// Yorum sil
router.delete('/:id', authenticateToken, (req, res) => {
  const reviewId = req.params.id;

  db.run(
    'DELETE FROM reviews WHERE id = ? AND user_id = ?',
    [reviewId, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Yorum silinemedi' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Yorum bulunamadı veya yetkiniz yok' });
      }
      res.json({ message: 'Yorum silindi' });
    }
  );
});

module.exports = router;