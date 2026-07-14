const multer = require('multer');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
]);

const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const mt = (file.mimetype || '').toLowerCase();
    if (ALLOWED_MIME.has(mt)) {
      cb(null, true);
      return;
    }
    const name = (file.originalname || '').toLowerCase();
    const m = name.match(/\.([a-z0-9]+)$/);
    if (m && ALLOWED_EXT.has(m[1])) {
      cb(null, true);
      return;
    }
    cb(new Error('UNSUPPORTED_IMAGE_TYPE'));
  }
});

function uploadSingleImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'Image too large (max 5MB)' });
      }
      if (err.message === 'UNSUPPORTED_IMAGE_TYPE') {
        return res.status(415).json({
          message: 'Unsupported image type. Use JPEG, PNG, WebP, or HEIC.'
        });
      }
      return next(err);
    }
    console.log('[uploadImage] req.body:', req.body);
    console.log('[uploadImage] req.file:', req.file ? req.file.originalname : 'MISSING');
    if (!req.file && req.method !== 'PUT') {
      return res.status(400).json({ message: 'Image file is required (field name: image)' });
    }
    return next();
  });
}

module.exports = { uploadSingleImage };
