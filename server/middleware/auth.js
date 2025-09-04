const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token bulunamadı' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.isAdmin = decoded.isAdmin;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Geçersiz token' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware };