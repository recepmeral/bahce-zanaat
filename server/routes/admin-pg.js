const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../database-pg');

// Admin middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token gerekli' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Geçersiz token' });
    
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin yetkisi gerekli' });
    }
    
    req.user = user;
    next();
  });
};

// Tüm randevuları getir (Admin)
router.get('/appointments', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, u.full_name, u.phone, u.email 
      FROM appointments a 
      JOIN users u ON a.user_id = u.id 
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `);
    
    const appointments = [];
    
    for (const appointment of result.rows) {
      // Hizmetleri getir
      const servicesResult = await pool.query(
        'SELECT service_name FROM appointment_services WHERE appointment_id = $1',
        [appointment.id]
      );
      
      // Resimleri getir
      const imagesResult = await pool.query(
        'SELECT image_path FROM appointment_images WHERE appointment_id = $1',
        [appointment.id]
      );
      
      appointments.push({
        ...appointment,
        services: servicesResult.rows.map(s => s.service_name),
        images: imagesResult.rows.map(i => i.image_path)
      });
    }
    
    res.json(appointments);
  } catch (error) {
    console.error('Get all appointments error:', error);
    res.status(500).json({ error: 'Randevular alınamadı' });
  }
});

// Randevu durumunu güncelle (Admin)
router.put('/appointments/:id/status', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const allowedStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Geçersiz durum' });
  }
  
  try {
    const result = await pool.query(
      'UPDATE appointments SET status = $1 WHERE id = $2',
      [status, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Randevu bulunamadı' });
    }
    
    res.json({ message: 'Durum güncellendi' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Durum güncellenemedi' });
  }
});

// Dashboard istatistikleri
router.get('/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const stats = {};
    
    // Toplam randevu sayısı
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM appointments');
    stats.totalAppointments = parseInt(totalResult.rows[0].total);
    
    // Bekleyen randevu sayısı
    const pendingResult = await pool.query("SELECT COUNT(*) as pending FROM appointments WHERE status = 'pending'");
    stats.pendingAppointments = parseInt(pendingResult.rows[0].pending);
    
    // Toplam kullanıcı sayısı
    const usersResult = await pool.query('SELECT COUNT(*) as total FROM users WHERE is_admin = false');
    stats.totalUsers = parseInt(usersResult.rows[0].total);
    
    // Bu haftaki randevular
    const weekResult = await pool.query(`
      SELECT COUNT(*) as this_week 
      FROM appointments 
      WHERE appointment_date >= CURRENT_DATE - INTERVAL '7 days'
    `);
    stats.thisWeekAppointments = parseInt(weekResult.rows[0].this_week);
    
    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'İstatistikler yüklenemedi' });
  }
});

// Kullanıcıları listele
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, email, phone, full_name, address, created_at
      FROM users 
      WHERE is_admin = false
      ORDER BY created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Kullanıcılar alınamadı' });
  }
});

module.exports = router;