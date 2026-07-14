function parsePagination(query, options = {}) {
  const { defaultLimit = 50, maxLimit = 100 } = options;
  let page = parseInt(query.page, 10);
  if (Number.isNaN(page) || page < 1) page = 1;
  let limit = parseInt(query.limit, 10);
  if (Number.isNaN(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function paginationMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

module.exports = { parsePagination, paginationMeta };
