/**
 * Authentication utility for Chef Stefan Admin
 * Handles login checks, session management, and redirects
 */

// Check if user is authenticated
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const user = await response.json();
            return user;
        } else if (response.status === 401) {
            redirectToLogin();
            return null;
        } else {
            console.error('Auth check failed:', response.statusText);
            return null;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        redirectToLogin();
        return null;
    }
}

// Redirect to login page
function redirectToLogin(message = 'Please login to access the admin area') {
    const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login.html?redirect=${currentPath}&message=${encodeURIComponent(message)}`;
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            window.location.href = '/login.html?message=Logged out successfully';
        } else {
            console.error('Logout failed');
            // Force redirect anyway
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Force redirect anyway
        window.location.href = '/login.html';
    }
}

// Update navigation with user info and logout option
function updateNavigation(user) {
    // Find logout links and update them
    const logoutLinks = document.querySelectorAll('[href="index.html"], .logout-btn');
    logoutLinks.forEach(link => {
        if (link.textContent.includes('Back to Website')) {
            return; // Keep the "Back to Website" links as they are
        }
        
        link.textContent = '🔓 Logout';
        link.href = '#';
        link.onclick = (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                logout();
            }
        };
    });
    
    // Update user display areas
    const userDisplays = document.querySelectorAll('.user-display, .admin-user-info');
    userDisplays.forEach(element => {
        element.innerHTML = `
            <div class="user-info">
                <i class="bi bi-person-circle me-2"></i>
                <span class="user-name">${user.name}</span>
                <small class="text-muted d-block">${user.email}</small>
            </div>
        `;
    });
}

// Add authentication protection to fetch requests
function authenticatedFetch(url, options = {}) {
    return fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            ...options.headers,
        }
    }).then(async response => {
        if (response.status === 401) {
            redirectToLogin('Your session has expired. Please login again.');
            throw new Error('Unauthorized');
        }
        return response;
    });
}

// Initialize authentication check on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Only check auth on admin pages
    const adminPages = [
        '/Admin.html',
        '/admin-gallery.html',
        '/admin-menu.html',
        '/Menu_Admin.html'
    ];
    
    if (adminPages.some(page => window.location.pathname.includes(page))) {
        const user = await checkAuth();
        if (user) {
            updateNavigation(user);
            console.log('Authenticated as:', user.name);
        }
    }
});

// Show authentication loading state
function showAuthLoading(show = true) {
    const existingOverlay = document.querySelector('.auth-loading-overlay');
    
    if (show) {
        if (!existingOverlay) {
            const overlay = document.createElement('div');
            overlay.className = 'auth-loading-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(44, 62, 80, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
            `;
            overlay.innerHTML = `
                <div class="text-center text-white">
                    <div class="spinner-border text-warning mb-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <h5>Verifying Authentication...</h5>
                    <p class="text-muted">Please wait while we check your login status</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
    } else {
        if (existingOverlay) {
            existingOverlay.remove();
        }
    }
}

// Export functions for use in other scripts
window.authUtils = {
    checkAuth,
    redirectToLogin,
    logout,
    updateNavigation,
    authenticatedFetch,
    showAuthLoading
};