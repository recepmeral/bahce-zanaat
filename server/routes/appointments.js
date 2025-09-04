const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

// Multer ayarları
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'server/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir'));
    }
  }
});

// Hizmetler listesi
const services = [
  'Bahçe Aydınlatma',
  'Çim Biçme',
  'Çit-Ağaç Budama',
  'Çim Havalandırma',
  'İlaçlama Gübreleme',
  'Peyzaj Düzenleme',
  'Akıllı Bahçe',
  'Otomatik Sulama',
  'Tamir ve Tadilat'
];

// Yeni randevu oluştur
router.post('/', authMiddleware, upload.array('images', 5), (req, res) => {
  const { appointment_date, appointment_time, notes, selectedServices } = req.body;
  const userId = req.userId;
  
  db.run(
    `INSERT INTO appointments (user_id, appointment_date, appointment_time, notes)
     VALUES (?, ?, ?, ?)`,
    [userId, appointment_date, appointment_time, notes],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Randevu oluşturulamadı' });
      }
      
      const appointmentId = this.lastID;
      
      // Seçilen hizmetleri kaydet
      if (selectedServices) {
        const servicesList = JSON.parse(selectedServices);
        servicesList.forEach(service => {
          db.run(
            `INSERT INTO appointment_services (appointment_id, service_name) VALUES (?, ?)`,
            [appointmentId, service]
          );
        });
      }
      
      // Yüklenen resimleri kaydet
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          db.run(
            `INSERT INTO appointment_images (appointment_id, image_path) VALUES (?, ?)`,
            [appointmentId, file.filename]
          );
        });
      }
      
      res.status(201).json({
        message: 'Randevu başarıyla oluşturuldu',
        appointmentId: appointmentId
      });
    }
  );
});

// Kullanıcının randevularını getir
router.get('/my', authMiddleware, (req, res) => {
  const userId = req.userId;
  
  db.all(
    `SELECT a.*, GROUP_CONCAT(DISTINCT s.service_name) as services,
            GROUP_CONCAT(DISTINCT i.image_path) as images
     FROM appointments a
     LEFT JOIN appointment_services s ON a.id = s.appointment_id
     LEFT JOIN appointment_images i ON a.id = i.appointment_id
     WHERE a.user_id = ?
     GROUP BY a.id
     ORDER BY a.created_at DESC`,
    [userId],
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

// Hizmetler listesini getir
router.get('/services', (req, res) => {
  res.json(services);
});

module.exports = router;