// Check authentication status
function checkAuth() {
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const loginBtn = document.getElementById('loginBtn');
    const dashboardBtn = document.getElementById('dashboardBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (token) {
        // Kullanıcı giriş yapmış
        if (loginBtn) loginBtn.parentElement.style.display = 'none';
        if (dashboardBtn) {
            dashboardBtn.classList.remove('d-none');
            if (isAdmin) {
                dashboardBtn.querySelector('a').href = '/admin.html';
                dashboardBtn.querySelector('a').innerHTML = '<i class="bi bi-shield-lock"></i> Admin Panel';
            } else {
                dashboardBtn.querySelector('a').href = '/dashboard.html';
                dashboardBtn.querySelector('a').innerHTML = '<i class="bi bi-speedometer2"></i> Panel';
            }
        }
        if (logoutBtn) logoutBtn.classList.remove('d-none');
    } else {
        // Kullanıcı giriş yapmamış
        if (loginBtn) loginBtn.parentElement.style.display = 'block';
        if (dashboardBtn) dashboardBtn.classList.add('d-none');
        if (logoutBtn) logoutBtn.classList.add('d-none');
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('isAdmin');
    window.location.href = '/';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Smooth scroll SADECE hash linkler için (#services gibi)
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        const href = link.getAttribute('href');
        // Sadece #services gibi linkler için, # tek başına değilse
        if (href && href.length > 1) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        }
    });
});