const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Admin middleware - tüm admin route'larına uygulanır
router.use(authMiddleware);
router.use(adminMiddleware);

// Tüm randevuları getir
router.get('/appointments', (req, res) => {
  db.all(
    `SELECT a.*, u.full_name, u.email, u.phone,
            GROUP_CONCAT(DISTINCT s.service_name) as services,
            GROUP_CONCAT(DISTINCT i.image_path) as images
     FROM appointments a
     JOIN users u ON a.user_id = u.id
     LEFT JOIN appointment_services s ON a.id = s.appointment_id
     LEFT JOIN appointment_images i ON a.id = i.appointment_id
     GROUP BY a.id
     ORDER BY a.created_at DESC`,
    (err, appointments) => {
      if (err) {
        return res.status(500).json({ error: 'Randevular getirilemedi' });
      }
      
      const formattedAppointments = appointments.map(apt => ({
        ...apt,
        services: apt.services ? apt.services.split(',') : [],
        images: apt.images ? apt.images.split(',') : []
      }));
      
      res.json(formattedAppointments);
    }
  );
});

// Randevu durumunu güncelle
router.put('/appointments/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const allowedStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Geçersiz durum' });
  }
  
  db.run(
    `UPDATE appointments SET status = ? WHERE id = ?`,
    [status, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Durum güncellenemedi' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Randevu bulunamadı' });
      }
      
      res.json({ message: 'Durum güncellendi' });
    }
  );
});

// Dashboard istatistikleri
router.get('/dashboard', (req, res) => {
  const stats = {};
  
  // Toplam randevu sayısı
  db.get(`SELECT COUNT(*) as total FROM appointments`, (err, result) => {
    stats.totalAppointments = result.total;
    
    // Bekleyen randevu sayısı
    db.get(`SELECT COUNT(*) as pending FROM appointments WHERE status = 'pending'`, (err, result) => {
      stats.pendingAppointments = result.pending;
      
      // Toplam kullanıcı sayısı
      db.get(`SELECT COUNT(*) as total FROM users WHERE is_admin = 0`, (err, result) => {
        stats.totalUsers = result.total;
        
        // Bu haftaki randevular
        db.get(
          `SELECT COUNT(*) as thisWeek FROM appointments 
           WHERE date(appointment_date) >= date('now', 'weekday 0', '-7 days')`,
          (err, result) => {
            stats.thisWeekAppointments = result.thisWeek;
            res.json(stats);
          }
        );
      });
    });
  });
});

// Kullanıcıları listele
router.get('/users', (req, res) => {
  db.all(
    `SELECT id, username, email, phone, full_name, address, created_at
     FROM users WHERE is_admin = 0
     ORDER BY created_at DESC`,
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Kullanıcılar getirilemedi' });
      }
      res.json(users);
    }
  );
});

module.exports = router;