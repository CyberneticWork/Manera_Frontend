export const MENU = [
  { key: 'calls', title: 'Call Log', hint: 'Log customer calls', group: 'Call Center', roles: ['CallCenter'] },
  { key: 'clients', title: 'Client Details', hint: 'Open a gold buying job', group: 'Call Center', roles: ['CallCenter'] },
  { key: 'assign', title: 'Assign Numbers', hint: 'Outbound lines for agents', group: 'Call Center', roles: ['CallCenter'] },
  { key: 'cashier', title: 'Cashier', hint: 'Pay and finalize a job', group: 'Cashier', roles: ['Cashier', 'Account'] },
  { key: 'history', title: 'Past Records', hint: 'Search finalized jobs', group: 'Records', roles: ['CallCenter', 'Cashier', 'History', 'Account', 'Admin'] },
  { key: 'masters', title: 'Create Menu', hint: 'Agents, items, job types', group: 'Records', roles: ['CallCenter', 'Cashier', 'Account'] },
  { key: 'reports', title: 'Reports', hint: 'Needs the daily access code', group: 'Records', roles: ['CallCenter', 'Cashier', 'Account', 'Admin'] },
  { key: 'accounts', title: 'Accounts', hint: 'Chart, journal, notes', group: 'Accounts', roles: ['Account'] },
  { key: 'transfer', title: 'Cash Transfer', hint: 'Manager, main, and petty cash', group: 'Accounts', roles: ['Account'] },
  { key: 'expenses', title: 'Expenses', hint: 'Today petty cash lines', group: 'Accounts', roles: ['Account'] },
  { key: 'users', title: 'Users', hint: 'Create a login', group: 'Utilities', roles: ['SAdmin'] },
  { key: 'acl', title: 'Access Control', hint: 'Screens each role may open', group: 'Utilities', roles: ['SAdmin'] },
  { key: 'firebase', title: 'Firebase', hint: 'Photo and document storage', group: 'Utilities', roles: ['SAdmin'] },
  { key: 'approvals', title: 'Job Approvals', hint: 'Approve finalized jobs', group: 'Manager', roles: ['Admin'] },
  { key: 'commission', title: 'Commission', hint: 'Business and rider rates', group: 'Manager', roles: ['Admin'] },
  { key: 'access', title: 'Access Code', hint: 'Unlock reports for a date', group: 'Manager', roles: ['Admin'] },
];

export function canDo(role, permissions, screen, action) {
  if (role === 'SAdmin') return true;
  if (!Array.isArray(permissions)) return action !== 'delete';
  if (permissions.includes(`${screen}:${action}`)) return true;
  return action === 'view' && permissions.includes(screen);
}

export function menuFor(role, permissions) {
  if (role === 'SAdmin') return MENU;
  if (Array.isArray(permissions)) {
    return MENU.filter((item) => permissions.includes(item.key) || permissions.includes(`${item.key}:view`));
  }
  return MENU.filter((item) => item.roles.includes(role));
}
