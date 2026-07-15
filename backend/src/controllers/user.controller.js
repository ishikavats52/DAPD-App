const User = require('../models/User');
const Medicine = require('../models/Medicine');
const { ROLES } = require('../constants/roles');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { logAudit } = require('../utils/auditLogger');
const { sendAdminApprovedEmail, sendProvisionedAccountCredentialsEmail } = require('../services/email.service');
const { generateProvisionedPassword } = require('../utils/generateProvisionedPassword');
const { normalizePhoneToE164 } = require('../utils/phone');

exports.createEmployee = asyncHandler(async (req, res) => {
  const { name, email, phone, password, designation, location } = req.body;

  const emailTaken = await User.emailTaken(email);
  if (emailTaken) {
    throw new AppError('Email is already registered', 400);
  }
  
  const phoneNorm = normalizePhoneToE164(phone);
  if (!phoneNorm) {
    throw new AppError('Invalid phone format', 400);
  }

  const phoneTaken = await User.phoneTaken(phoneNorm);
  if (phoneTaken) {
    throw new AppError('Phone is already registered', 400);
  }

  const isProvisioned = !password;
  const pw = isProvisioned ? generateProvisionedPassword() : password;

  const user = await User.create({
    name,
    email,
    phone: phoneNorm,
    password: pw,
    role: ROLES.EMPLOYEE,
    createdBy: req.user.role === ROLES.SUPERADMIN && req.body.assignedAdminId ? req.body.assignedAdminId : req.user.id,
    designation,
    location,
    isApproved: true,
    mustChangePassword: isProvisioned
  });

  if (isProvisioned) {
    sendProvisionedAccountCredentialsEmail(user.email, {
      email: user.email,
      phone: user.phone,
      password: pw,
      roleLabel: 'Employee'
    }).catch(console.error);
  }

  await logAudit({
    userId: req.user.id,
    action: 'CREATE_USER',
    resource: 'User',
    resourceId: user._id,
    details: `Created employee ${user.email}`,
    req
  });

  res.status(201).json({
    message: 'Employee created successfully',
    user: User.toPublicUser(user)
  });
});

exports.createAdmin = asyncHandler(async (req, res) => {
  const { name, email, phone, password, officeName, designation, location, address, state, pincode } = req.body;

  const emailTaken = await User.emailTaken(email);
  if (emailTaken) {
    throw new AppError('Email is already registered', 400);
  }
  
  const phoneNorm = normalizePhoneToE164(phone);
  if (!phoneNorm) {
    throw new AppError('Invalid phone format', 400);
  }

  const phoneTaken = await User.phoneTaken(phoneNorm);
  if (phoneTaken) {
    throw new AppError('Phone is already registered', 400);
  }

  const isProvisioned = !password;
  const pw = isProvisioned ? generateProvisionedPassword() : password;

  const user = await User.create({
    name,
    email,
    phone: phoneNorm,
    password: pw,
    role: ROLES.ADMIN,
    createdBy: req.user.id,
    officeName,
    designation,
    location,
    address,
    state,
    pincode,
    isApproved: true,
    mustChangePassword: isProvisioned
  });

  if (isProvisioned) {
    sendProvisionedAccountCredentialsEmail(user.email, {
      email: user.email,
      phone: user.phone,
      password: pw,
      roleLabel: 'Admin'
    }).catch(console.error);
  }

  await logAudit({
    userId: req.user.id,
    action: 'CREATE_USER',
    resource: 'User',
    resourceId: user._id,
    details: `Created admin ${user.email}`,
    req
  });

  res.status(201).json({
    message: 'Admin created successfully',
    user: User.toPublicUser(user)
  });
});

exports.listEmployees = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  let match;
  if (req.user.role === ROLES.SUPERADMIN) {
    match = (u) => u.role === ROLES.EMPLOYEE;
  } else {
    match = (u) => u.role === ROLES.EMPLOYEE && u.createdBy === req.user.id;
  }

  const { rows, total } = await User.listUsersFiltered({ match, skip, limit });
  const mapped = rows.map(User.toPublicUser);

  res.json({
    data: mapped,
    meta: paginationMeta(total, page, limit)
  });
});

exports.updateEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const target = await User.getById(id);

  if (!target) {
    throw new AppError('Employee not found', 404);
  }
  if (target.role !== ROLES.EMPLOYEE) {
    throw new AppError('Can only update employees', 403);
  }
  if (req.user.role !== ROLES.SUPERADMIN && target.createdBy !== req.user.id) {
    throw new AppError('Forbidden', 403);
  }

  if (req.body.email) {
    if (await User.emailTaken(req.body.email, id)) {
      throw new AppError('Email is already registered', 400);
    }
    target.email = req.body.email.toLowerCase().trim();
  }
  
  if (req.body.phone) {
    const p = normalizePhoneToE164(req.body.phone);
    if (!p) throw new AppError('Invalid phone format', 400);
    if (await User.phoneTaken(p, id)) {
      throw new AppError('Phone is already registered', 400);
    }
    target.phone = p;
  }

  if (req.body.name) target.name = req.body.name;
  if (req.body.designation !== undefined) target.designation = req.body.designation;
  if (req.body.location !== undefined) target.location = req.body.location;

  if (req.body.isActive !== undefined) {
    target.isActive = Boolean(req.body.isActive);
  }

  await User.putItem(target);

  if (req.body.password) {
    await User.updatePasswordPlain(id, req.body.password);
  }

  await logAudit({
    userId: req.user.id,
    action: 'UPDATE_USER',
    resource: 'User',
    resourceId: id,
    req
  });

  const updated = await User.getById(id);
  res.json({
    message: 'Employee updated',
    user: User.toPublicUser(updated)
  });
});

exports.deleteEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const target = await User.getById(id);
  
  if (!target) {
    throw new AppError('Employee not found', 404);
  }
  if (target.role !== ROLES.EMPLOYEE) {
    throw new AppError('Can only delete employees', 403);
  }
  if (req.user.role !== ROLES.SUPERADMIN && target.createdBy !== req.user.id) {
    throw new AppError('Forbidden', 403);
  }

  const { deleteImagesForMedicines } = require('../services/uploads.service');
  const userMeds = (await Medicine.listActive({ scope: { createdBy: id }, skip: 0, limit: 100000 })).rows;
  await deleteImagesForMedicines(userMeds);
  for (const m of userMeds) {
    await Medicine.softDelete(m._id, req.user.id);
  }
  
  await User.deleteById(id);

  await logAudit({
    userId: req.user.id,
    action: 'DELETE_USER',
    resource: 'User',
    resourceId: id,
    req
  });

  res.json({ message: 'Employee deleted' });
});

exports.listPendingAdmins = asyncHandler(async (req, res) => {
  const match = (u) => u.role === ROLES.ADMIN && !u.isApproved;
  const { rows } = await User.listUsersFiltered({ match, skip: 0, limit: 10000 });
  res.json({ data: rows.map(User.toPublicUser) });
});

exports.approveAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const admin = await User.getById(id);
  
  if (!admin || admin.role !== ROLES.ADMIN) {
    throw new AppError('Admin not found', 404);
  }
  
  admin.isApproved = true;
  await User.putItem(admin);

  if (admin.email) {
    sendAdminApprovedEmail(admin.email).catch(console.error);
  }

  await logAudit({
    userId: req.user.id,
    action: 'APPROVE_USER',
    resource: 'User',
    resourceId: id,
    req
  });

  res.json({ message: 'Admin approved', user: User.toPublicUser(admin) });
});

exports.rejectAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const admin = await User.getById(id);
  
  if (!admin || admin.role !== ROLES.ADMIN || admin.isApproved) {
    throw new AppError('Pending admin not found', 404);
  }

  await User.deleteById(id);

  await logAudit({
    userId: req.user.id,
    action: 'DELETE_USER',
    resource: 'User',
    resourceId: id,
    details: 'Rejected pending admin',
    req
  });

  res.json({ message: 'Admin rejected and deleted' });
});

exports.listApprovedAdmins = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const match = (u) => u.role === ROLES.ADMIN && u.isApproved;
  
  const { rows, total } = await User.listUsersFiltered({ match, skip, limit });
  res.json({
    data: rows.map(User.toPublicUser),
    meta: paginationMeta(total, page, limit)
  });
});
