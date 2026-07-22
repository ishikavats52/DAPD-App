const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const {
  isS3Enabled,
  getKeyPrefix,
  uploadBuffer,
  keyFromImageUrl,
  deleteObjects
} = require('./s3.service');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif'
};

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function extFromFile(file) {
  const mt = (file.mimetype || '').toLowerCase();
  if (MIME_EXT[mt]) return MIME_EXT[mt];
  const name = (file.originalname || '').toLowerCase();
  const m = name.match(/\.([a-z0-9]+)$/);
  if (m) {
    const e = m[1];
    if (e === 'jpeg' || e === 'jpg') return 'jpg';
    if (['png', 'webp', 'heic', 'heif'].includes(e)) return e;
  }
  return 'jpg';
}

function contentTypeFromExt(ext) {
  const map = {
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif'
  };
  return map[ext] || 'image/jpeg';
}

function hashFilename(file) {
  const ext = extFromFile(file);
  const hash = createHash('sha256').update(file.buffer).digest('hex');
  return { ext, hash, filename: `${hash}.${ext}` };
}

async function saveToLocalDisk(file, req) {
  const { ext, hash, filename } = hashFilename(file);
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), file.buffer);
  return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
}

async function saveToS3(file) {
  const { ext, hash, filename } = hashFilename(file);
  const key = `${getKeyPrefix()}${filename}`;
  return uploadBuffer({
    buffer: file.buffer,
    contentType: file.mimetype || contentTypeFromExt(ext),
    key
  });
}

async function saveUploadedImage(file, req) {
  if (isS3Enabled()) {
    return saveToS3(file);
  }
  return saveToLocalDisk(file, req);
}

async function saveUploadedImages(files, req) {
  if (!files || !Array.isArray(files)) return [];
  const urls = [];
  for (const file of files) {
    urls.push(await saveUploadedImage(file, req));
  }
  return urls;
}

function localUploadBasenameFromImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const s = url.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    const m = (u.pathname || '').match(/\/uploads\/([^/]+)$/);
    return m ? m[1] : null;
  } catch {
    const m = s.match(/\/uploads\/([^/]+)$/);
    return m ? m[1] : null;
  }
}

function collectImageKeysFromMedicines(rows) {
  const keys = new Set();
  for (const m of rows) {
    if (m.imageUrl) {
      const s3Key = keyFromImageUrl(m.imageUrl);
      if (s3Key) keys.add(s3Key);
    }
    if (m.imageUrls && Array.isArray(m.imageUrls)) {
      for (const url of m.imageUrls) {
        const s3Key = keyFromImageUrl(url);
        if (s3Key) keys.add(s3Key);
      }
    }
  }
  return [...keys];
}

async function deleteImagesForMedicines(rows) {
  if (isS3Enabled()) {
    await deleteObjects(collectImageKeysFromMedicines(rows));
    return;
  }

  const dir = UPLOADS_DIR;
  if (!fs.existsSync(dir)) return;
  for (const m of rows) {
    const urls = [];
    if (m.imageUrl) urls.push(m.imageUrl);
    if (m.imageUrls && Array.isArray(m.imageUrls)) urls.push(...m.imageUrls);
    
    for (const url of urls) {
      const base = localUploadBasenameFromImageUrl(url);
      if (!base) continue;
      try {
        fs.unlinkSync(path.join(dir, base));
      } catch {
        /* ignore missing files */
      }
    }
  }
}

async function deleteAllStoredImages() {
  if (isS3Enabled()) {
    const { scanAllPages } = require('../db/scanAll');
    const Medicine = require('../models/Medicine');
    const rows = await Medicine.scanAllMedicines();
    await deleteObjects(collectImageKeysFromMedicines(rows));
    return;
  }

  if (!fs.existsSync(UPLOADS_DIR)) return;
  for (const name of fs.readdirSync(UPLOADS_DIR)) {
    if (name === '.gitkeep' || name.startsWith('.')) continue;
    try {
      fs.unlinkSync(path.join(UPLOADS_DIR, name));
    } catch {
      /* ignore */
    }
  }
}

module.exports = {
  saveUploadedImage,
  saveUploadedImages,
  isS3Enabled,
  localUploadBasenameFromImageUrl,
  deleteImagesForMedicines,
  deleteAllStoredImages
};
