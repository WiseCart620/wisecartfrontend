export const isAdmin = () => {
  const userRole = localStorage.getItem('userRole') || 'USER';
  return userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
};

export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user') ||
      localStorage.getItem('currentUser') ||
      localStorage.getItem('authUser');

    if (userStr) {
      const user = JSON.parse(userStr);
      return user.fullName || user.full_name || user.name || user.username || '';
    }
  } catch (e) {
    console.error('Error parsing user from localStorage:', e);
  }

  return localStorage.getItem('fullName') ||
    localStorage.getItem('userName') ||
    localStorage.getItem('username') ||
    'System';
};