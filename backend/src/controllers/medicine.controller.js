const Medicine = require('../models/Medicine');
const User = require('../models/User');
const { ROLES } = require('../constants/roles');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { logAudit } = require('../utils/auditLogger');
const { extractFieldsFromImage } = require('../services/vision.service');
const { saveUploadedImage, deleteImagesForMedicines } = require('../services/uploads.service');
const { createHash } = require('crypto');

async function enrichWithCreator(medicines) {
  if (!medicines || medicines.length === 0) return medicines;
  const userIds = [...new Set(medicines.map((m) => m.createdBy).filter(Boolean))];
  const users = await User.batchGetByIds(userIds);
  const userMap = new Map(users.map((u) => [u._id, User.toPublicUser(u)]));
  
  return medicines.map((m) => {
    const out = { ...m };
    if (out.createdBy && userMap.has(out.createdBy)) {
      out.creator = userMap.get(out.createdBy);
    }
    return out;
  });
}

function resolveScope(user) {
  return { createdBy: user.id };
}

async function verifyOwnership(med, user) {
  if (med.createdBy === user.id) {
    return true;
  }
  throw new AppError('Forbidden', 403);
}

exports.scanImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Image file is required', 400);
  }

  const hash = createHash('sha256').update(req.file.buffer).digest('hex');
  const existing = await Medicine.findByImageContentHash(hash);
  if (existing) {
    const e = new AppError('This document image was already scanned and saved previously.', 409);
    e.existingTag = existing.tag;
    throw e;
  }

  try {
    const fields = await extractFieldsFromImage(req.file.buffer, req.file.mimetype);
    
    await logAudit({
      userId: req.user.id,
      action: 'SCAN_MEDICINE_IMAGE',
      resource: 'Medicine',
      req
    });

    res.json({
      message: 'Extraction successful',
      fields
    });
  } catch (error) {
    console.error('Scan error:', error);
    if (error.status === 429 || String(error.message).includes('429')) {
      throw new AppError('Google Gemini AI is currently overloaded (Too Many Requests). Please try again in a few moments.', 429);
    }
    throw new AppError(error.message || 'Failed to process document image', 500);
  }
});

exports.create = asyncHandler(async (req, res) => {
  let imageUrl = req.body.imageUrl || null;
  let imageContentHash = null;

  if (req.file) {
    imageUrl = await saveUploadedImage(req.file, req);
    imageContentHash = createHash('sha256').update(req.file.buffer).digest('hex');
    
    if (imageContentHash) {
      const existing = await Medicine.findByImageContentHash(imageContentHash);
      if (existing) {
        throw new AppError('This document image was already saved.', 409);
      }
    }
  }

  const payload = { ...req.body };
  if (imageUrl) {
    payload.imageUrl = imageUrl;
    payload.imageContentHash = imageContentHash;
  }
  payload.createdBy = req.user.id;
  
  if (!payload.tag) {
    const max = await Medicine.getMaxTagCounter();
    payload.tag = `2026${String(max + 1).padStart(5, '0')}`;
  }

  const created = await Medicine.create(payload);
  
  await logAudit({
    userId: req.user.id,
    action: 'ADD_MEDICINE',
    resource: 'Medicine',
    resourceId: created._id,
    req
  });

  const [enriched] = await enrichWithCreator([created]);
  res.status(201).json({
    message: 'Medicine record created',
    medicine: enriched
  });
});

exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const target = await Medicine.getById(id);
  
  if (!target || !target.isActive) {
    throw new AppError('Medicine not found', 404);
  }

  await verifyOwnership(target, req.user);

  let imageUrl = target.imageUrl;
  let imageContentHash = target.imageContentHash;

  if (req.file) {
    imageUrl = await saveUploadedImage(req.file, req);
    imageContentHash = createHash('sha256').update(req.file.buffer).digest('hex');
    if (target.imageUrl) {
      await deleteImagesForMedicines([target]);
    }
  } else if (req.body.imageUrl !== undefined) {
    imageUrl = req.body.imageUrl || null;
    if (!imageUrl && target.imageUrl) {
      await deleteImagesForMedicines([target]);
      imageContentHash = null;
    }
  }

  const next = {
    ...target,
    ...req.body,
    _id: target._id,
    imageUrl,
    imageContentHash,
    updatedBy: req.user.id
  };

  const updated = await Medicine.putItem(next);

  await logAudit({
    userId: req.user.id,
    action: 'UPDATE_MEDICINE',
    resource: 'Medicine',
    resourceId: id,
    req
  });

  const [enriched] = await enrichWithCreator([updated]);
  res.json({
    message: 'Medicine record updated',
    medicine: enriched
  });
});

exports.softDelete = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const target = await Medicine.getById(id);
  
  if (!target || !target.isActive) {
    throw new AppError('Medicine not found', 404);
  }

  await verifyOwnership(target, req.user);
  await deleteImagesForMedicines([target]);
  await Medicine.softDelete(id, req.user.id);

  await logAudit({
    userId: req.user.id,
    action: 'DELETE_MEDICINE',
    resource: 'Medicine',
    resourceId: id,
    req
  });

  res.json({ message: 'Medicine record deleted' });
});

exports.listActive = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const scope = resolveScope(req.user);
  
  const { rows, total } = await Medicine.listActive({ scope, skip, limit });
  const enriched = await enrichWithCreator(rows);

  res.json({
    data: enriched,
    meta: paginationMeta(total, page, limit)
  });
});

exports.searchActive = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const scope = resolveScope(req.user);
  const q = String(req.query.q || '').trim().toLowerCase();
  const filterBy = String(req.query.filterBy || '').trim();

  const predicate = (m) => {
    if (!q) return true;
    
    if (filterBy === 'Tag') return m.tag && m.tag.toLowerCase().includes(q);
    if (filterBy === 'Company name') return m.companyName && m.companyName.toLowerCase().includes(q);
    if (filterBy === 'Nomenclature') return m.nomenclature && m.nomenclature.toLowerCase().includes(q);

    // Fallback if no specific filter
    if (m.tag && m.tag.toLowerCase().includes(q)) return true;
    if (m.nomenclature && m.nomenclature.toLowerCase().includes(q)) return true;
    if (m.companyName && m.companyName.toLowerCase().includes(q)) return true;
    if (m.supplyOrder && m.supplyOrder.toLowerCase().includes(q)) return true;
    return false;
  };

  const { rows, total } = await Medicine.searchActive({ scope, predicate, skip, limit });
  const enriched = await enrichWithCreator(rows);

  res.json({
    data: enriched,
    meta: paginationMeta(total, page, limit)
  });
});

exports.getByTag = asyncHandler(async (req, res) => {
  const { tag } = req.params;
  const med = await Medicine.findByTag(tag);
  
  if (!med || !med.isActive) {
    throw new AppError('Medicine not found', 404);
  }

  await verifyOwnership(med, req.user);
  const [enriched] = await enrichWithCreator([med]);
  
  res.json({ data: enriched });
});

exports.getOne = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const med = await Medicine.getById(id);
  
  if (!med || !med.isActive) {
    throw new AppError('Medicine not found', 404);
  }

  await verifyOwnership(med, req.user);
  const [enriched] = await enrichWithCreator([med]);
  
  res.json({ data: enriched });
});
