const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../database-pg');
const { upload } = require('../cloudinary-config');

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

// Hizmetler listesi
const services = [
  'Bahçe Aydınlatma',
  'Çim Biçme',
  'Ağaç Budama',
  'Çim Havalandırma',
  'İlaçlama & Gübreleme',
  'Peyzaj Düzenleme',
  'Akıllı Bahçe',
  'Otomatik Sulama',
  'Tamir & Tadilat'
];

// Hizmetleri getir
router.get('/services', (req, res) => {
  res.json(services);
});

// Yeni randevu oluştur - Cloudinary ile
router.post('/', authenticateToken, upload.array('images', 5), async (req, res) => {
  const { appointment_date, appointment_time, notes, selectedServices } = req.body;
  const userId = req.user.id;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Randevu oluştur
    const appointmentResult = await client.query(
      `INSERT INTO appointments (user_id, appointment_date, appointment_time, notes) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, appointment_date, appointment_time, notes]
    );
    
    const appointmentId = appointmentResult.rows[0].id;
    
    // Hizmetleri ekle
    if (selectedServices) {
      const servicesArray = JSON.parse(selectedServices);
      for (const service of servicesArray) {
        await client.query(
          'INSERT INTO appointment_services (appointment_id, service_name) VALUES ($1, $2)',
          [appointmentId, service]
        );
      }
    }
    
    // Cloudinary'ye yüklenen resimleri kaydet
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await client.query(
          'INSERT INTO appointment_images (appointment_id, image_path) VALUES ($1, $2)',
          [appointmentId, file.path] // Cloudinary URL'si
        );
      }
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      message: 'Randevu başarıyla oluşturuldu', 
      appointmentId 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Appointment creation error:', error);
    res.status(500).json({ error: 'Randevu oluşturulamadı' });
  } finally {
    client.release();
  }
});

// Kullanıcının randevularını getir
router.get('/my', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  
  try {
    // Randevuları getir
    const appointmentsResult = await pool.query(
      `SELECT * FROM appointments 
       WHERE user_id = $1 
       ORDER BY appointment_date DESC, appointment_time DESC`,
      [userId]
    );
    
    const appointments = [];
    
    for (const appointment of appointmentsResult.rows) {
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
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Randevular alınamadı' });
  }
});

// Tüm randevuları getir (Admin)
router.get('/all', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkiniz yok' });
  }
  
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
router.put('/:id/status', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkiniz yok' });
  }
  
  const { id } = req.params;
  const { status } = req.body;
  
  try {
    await pool.query(
      'UPDATE appointments SET status = $1 WHERE id = $2',
      [status, id]
    );
    
    res.json({ message: 'Durum güncellendi' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Durum güncellenemedi' });
  }
});

module.exports = router;