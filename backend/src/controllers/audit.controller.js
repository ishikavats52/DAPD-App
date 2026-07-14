const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, paginationMeta } = require('../utils/pagination');

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const match = () => true; // all
  const { rows, total } = await AuditLog.listFiltered({ match, skip, limit });
  res.json({
    data: rows,
    meta: paginationMeta(total, page, limit)
  });
});
