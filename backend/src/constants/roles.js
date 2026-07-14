const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  EMPLOYEE: 'employee'
};

function normalizeRole(role) {
  if (role == null || typeof role !== 'string') return '';
  return role.trim().toLowerCase();
}

const ROLES_LIST = [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.EMPLOYEE];
const ROLES_ADMIN_UP = [ROLES.ADMIN, ROLES.SUPERADMIN];
const ROLES_ALL = [ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.SUPERADMIN];
const ROLES_SUPERADMIN_ONLY = [ROLES.SUPERADMIN];

module.exports = {
  ROLES,
  ROLES_LIST,
  ROLES_ADMIN_UP,
  ROLES_ALL,
  ROLES_SUPERADMIN_ONLY,
  normalizeRole
};
