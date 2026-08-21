/**
 * ============================================================================
 * SevaSetuHub – Authentication & Session Guard (auth.js)
 * ============================================================================
 */

const AuthGuard = (function() {
  /**
   * Redirect user based on their authenticated role
   */
  function redirectByRole(role) {
    const basePath = window.location.pathname.includes('/frontend/') ? '' : 'frontend/';
    switch (role) {
      case 'Customer':
        window.location.href = `${basePath}customer/index.html`;
        break;
      case 'Technician':
        window.location.href = `${basePath}technician/index.html`;
        break;
      case 'Dispatcher':
      case 'BusinessAdmin':
      case 'SuperAdmin':
      case 'Accountant':
        window.location.href = `${basePath}admin/index.html`;
        break;
      default:
        window.location.href = `${basePath}login.html`;
    }
  }

  /**
   * Protect a portal page by checking required roles
   */
  function protectRoute(allowedRoles) {
    const user = api.getStoredUser();
    const token = api.getToken();

    if (!token || !user) {
      const loginUrl = window.location.pathname.includes('/frontend/') ? '../login.html' : 'frontend/login.html';
      window.location.href = loginUrl;
      return false;
    }

    if (allowedRoles && Array.isArray(allowedRoles)) {
      if (!allowedRoles.includes(user.role) && user.role !== 'SuperAdmin') {
        alert(`Access Denied: Your account role (${user.role}) is not authorized for this section.`);
        redirectByRole(user.role);
        return false;
      }
    }

    return true;
  }

  /**
   * Update UI header with current user info
   */
  function renderUserHeader() {
    const user = api.getStoredUser();
    if (!user) return;

    const nameElements = document.querySelectorAll('.user-name-display');
    nameElements.forEach(el => el.textContent = user.fullName || user.firstName);

    const roleElements = document.querySelectorAll('.user-role-display');
    roleElements.forEach(el => el.textContent = user.role);

    const avatarElements = document.querySelectorAll('.user-avatar-initials');
    avatarElements.forEach(el => {
      const initial = (user.firstName || 'U').charAt(0).toUpperCase();
      el.textContent = initial;
    });
  }

  /**
   * Logout current user
   */
  async function logout() {
    try {
      await api.logout();
    } catch (e) {}
    const loginUrl = window.location.pathname.includes('/frontend/') ? '../login.html' : 'frontend/login.html';
    window.location.href = loginUrl;
  }

  return {
    redirectByRole,
    protectRoute,
    renderUserHeader,
    logout
  };
})();
