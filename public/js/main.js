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

// Load testimonials from database
async function loadTestimonials() {
    try {
        const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api' 
        : 'https://bahce-zanaat.onrender.com/api';
    const response = await fetch(`${API_URL}/reviews`);
        const reviews = await response.json();
        
        // Sadece son 6 yorumu al
        const latestReviews = reviews.slice(0, 6);
        
        if (latestReviews.length > 0) {
            const container = document.querySelector('#testimonials .row');
            if (container) {
                // Mevcut statik yorumları temizle
                const testimonialCards = container.querySelectorAll('.col-md-4');
                testimonialCards.forEach(card => card.remove());
                
                // Gerçek yorumları ekle
                latestReviews.forEach((review, index) => {
                    // İsmin baş harflerini al avatar için
                    const initials = review.full_name.split(' ').map(n => n[0]).join('');
                    
                    // Yıldızları oluştur
                    let stars = '';
                    for (let i = 0; i < 5; i++) {
                        if (i < review.rating) {
                            stars += '<i class="bi bi-star-fill"></i>';
                        } else {
                            stars += '<i class="bi bi-star"></i>';
                        }
                    }
                    
                    const col = document.createElement('div');
                    col.className = 'col-md-4';
                    col.innerHTML = `
                        <div class="testimonial-card h-100">
                            <div class="stars mb-3">
                                ${stars}
                            </div>
                            <p class="testimonial-text">"${review.comment}"</p>
                            <div class="testimonial-author">
                                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(review.full_name)}&background=198754&color=fff&size=50" 
                                     alt="${review.full_name}" class="rounded-circle me-3">
                                <div>
                                    <h6 class="mb-0">${review.full_name}</h6>
                                    <small class="text-muted">${new Date(review.created_at).toLocaleDateString('tr-TR')}</small>
                                </div>
                            </div>
                        </div>
                    `;
                    container.appendChild(col);
                });
            }
        }
    } catch (error) {
        console.error('Yorumlar yüklenemedi:', error);
        // Hata durumunda statik yorumlar görünür kalır
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Yorumları yükle
    if (document.querySelector('#testimonials')) {
        loadTestimonials();
    }
    
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