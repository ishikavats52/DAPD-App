const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand
} = require('@aws-sdk/client-s3');

let s3Client;

function isS3Enabled() {
  return Boolean(process.env.S3_BUCKET?.trim());
}

function getBucket() {
  return process.env.S3_BUCKET?.trim() || '';
}

function getRegion() {
  return process.env.S3_REGION?.trim() || process.env.AWS_REGION?.trim() || '';
}

function getKeyPrefix() {
  const raw = process.env.S3_KEY_PREFIX?.trim();
  if (!raw) return 'uploads/';
  return raw.endsWith('/') ? raw : `${raw}/`;
}

function getS3Client() {
  if (!s3Client) {
    const config = { region: getRegion() };
    const endpoint = process.env.S3_ENDPOINT?.trim();
    if (endpoint) config.endpoint = endpoint;
    if (process.env.AWS_ACCESS_KEY_ID?.trim() && process.env.AWS_SECRET_ACCESS_KEY?.trim()) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim()
      };
    }
    s3Client = new S3Client(config);
  }
  return s3Client;
}

function buildPublicUrl(key) {
  const publicBase = process.env.S3_PUBLIC_URL?.trim();
  if (publicBase) {
    return `${publicBase.replace(/\/$/, '')}/${key}`;
  }
  const bucket = getBucket();
  const region = getRegion();
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function keyFromImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const s = url.trim();
  if (!s) return null;

  if (s.startsWith('/uploads/')) {
    return s.replace(/^\//, '');
  }

  try {
    const u = new URL(s);
    const pathKey = u.pathname.replace(/^\//, '');
    if (/^uploads\/[a-f0-9]{64}\.[a-z0-9]+$/i.test(pathKey)) {
      return pathKey;
    }
    const prefix = getKeyPrefix();
    if (pathKey.startsWith(prefix.replace(/\/$/, ''))) {
      return pathKey;
    }
  } catch {
    return null;
  }

  return null;
}

async function uploadBuffer({ buffer, contentType, key }) {
  if (!isS3Enabled()) {
    throw new Error('S3_BUCKET is not configured');
  }
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
      CacheControl: 'public, max-age=31536000, immutable'
    })
  );
  return buildPublicUrl(key);
}

async function deleteObject(key) {
  if (!isS3Enabled() || !key) return;
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key
    })
  );
}

async function deleteObjects(keys) {
  if (!isS3Enabled() || !keys?.length) return;
  const uniq = [...new Set(keys.filter(Boolean))];
  for (let i = 0; i < uniq.length; i += 1000) {
    const chunk = uniq.slice(i, i + 1000);
    await getS3Client().send(
      new DeleteObjectsCommand({
        Bucket: getBucket(),
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true
        }
      })
    );
  }
}

function resetS3ClientForTests() {
  s3Client = null;
}

module.exports = {
  isS3Enabled,
  getKeyPrefix,
  buildPublicUrl,
  keyFromImageUrl,
  uploadBuffer,
  deleteObject,
  deleteObjects,
  resetS3ClientForTests
};
