const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://bahce-zanaat.onrender.com/api';
let selectedImages = [];

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Show alert
function showAlert(message, type = 'danger') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.getElementById('alertContainer').appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Logout
function logout() {
    localStorage.clear();
    window.location.href = '/';
}

// Show page
function showPage(page) {
    document.querySelectorAll('.page-content').forEach(p => {
        p.classList.add('d-none');
    });
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    if (page === 'appointments') {
        document.getElementById('appointmentsPage').classList.remove('d-none');
        document.querySelector('[data-page="appointments"]').classList.add('active');
        loadAppointments();
    } else if (page === 'new-appointment') {
        document.getElementById('newAppointmentPage').classList.remove('d-none');
        document.querySelector('[data-page="new-appointment"]').classList.add('active');
        loadServices();
    } else if (page === 'reviews') {
        document.getElementById('reviewsPage').classList.remove('d-none');
        document.querySelector('[data-page="reviews"]').classList.add('active');
        loadMyReviews();
    }
}

// Load services
async function loadServices() {
    try {
        const response = await fetch(`${API_URL}/appointments/services`);
        const services = await response.json();
        
        const container = document.getElementById('servicesCheckboxes');
        container.innerHTML = '';
        
        services.forEach(service => {
            const col = document.createElement('div');
            col.className = 'col-md-4';
            col.innerHTML = `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" value="${service}" id="service_${service.replace(/\s+/g, '_')}">
                    <label class="form-check-label" for="service_${service.replace(/\s+/g, '_')}">
                        ${service}
                    </label>
                </div>
            `;
            container.appendChild(col);
        });
    } catch (error) {
        console.error('Hizmetler yüklenemedi:', error);
    }
}

// Load appointments
async function loadAppointments() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_URL}/appointments/my`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Randevular yüklenemedi');
        
        const appointments = await response.json();
        const container = document.getElementById('appointmentsList');
        
        if (appointments.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-calendar-x fs-1 text-muted"></i>
                    <p class="mt-3">Henüz randevunuz bulunmamaktadır.</p>
                    <button class="btn btn-success" onclick="showPage('new-appointment')">
                        <i class="bi bi-plus"></i> İlk Randevunuzu Oluşturun
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        appointments.forEach(appointment => {
            const statusColors = {
                pending: 'warning',
                confirmed: 'info',
                completed: 'success',
                cancelled: 'danger'
            };
            
            const statusTexts = {
                pending: 'Beklemede',
                confirmed: 'Onaylandı',
                completed: 'Tamamlandı',
                cancelled: 'İptal Edildi'
            };
            
            const card = document.createElement('div');
            card.className = 'col-12';
            card.innerHTML = `
                <div class="card appointment-card ${appointment.status} mb-3">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-8">
                                <h5 class="card-title">
                                    <i class="bi bi-calendar-event"></i> 
                                    ${new Date(appointment.appointment_date).toLocaleDateString('tr-TR')} - ${appointment.appointment_time}
                                </h5>
                                <p class="mb-2">
                                    <span class="badge bg-${statusColors[appointment.status]} status-badge">
                                        ${statusTexts[appointment.status]}
                                    </span>
                                </p>
                                ${appointment.services.length > 0 ? `
                                    <div class="mb-2">
                                        ${appointment.services.map(s => `<span class="service-badge">${s}</span>`).join('')}
                                    </div>
                                ` : ''}
                                ${appointment.notes ? `<p class="card-text">${appointment.notes}</p>` : ''}
                            </div>
                            <div class="col-md-4 text-end">
                                ${appointment.images.length > 0 ? `
                                    <div class="mb-2">
                                        ${appointment.images.map(img => `
                                            <img src="/uploads/${img}" class="image-preview" onclick="showImage('/uploads/${img}')" alt="Bahçe">
                                        `).join('')}
                                    </div>
                                ` : ''}
                                <small class="text-muted">
                                    ${new Date(appointment.created_at).toLocaleDateString('tr-TR')}
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        showAlert('Randevular yüklenirken hata oluştu');
    }
}

// Show image in modal
function showImage(src) {
    document.getElementById('modalImage').src = src;
    new bootstrap.Modal(document.getElementById('imageModal')).show();
}

// Yeni resim yükleme sistemi
function setupImageUpload() {
    const imageBoxes = document.querySelectorAll('.image-upload-box');
    
    imageBoxes.forEach(box => {
        const input = box.querySelector('.image-input');
        const preview = box.querySelector('.image-preview');
        const label = box.querySelector('.image-label');
        const removeBtn = box.querySelector('.remove-image');
        const index = box.dataset.index;
        
        // Resim seçme
        input?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // selectedImages dizisini güncelle
                if (!selectedImages[index]) {
                    selectedImages[index] = file;
                } else {
                    selectedImages[index] = file;
                }
                
                // Önizlemeyi göster
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.src = e.target.result;
                    preview.classList.remove('d-none');
                    label.classList.add('d-none');
                    removeBtn.classList.remove('d-none');
                    box.classList.add('has-image');
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Resmi kaldırma
        removeBtn?.addEventListener('click', () => {
            selectedImages[index] = null;
            input.value = '';
            preview.src = '';
            preview.classList.add('d-none');
            label.classList.remove('d-none');
            removeBtn.classList.add('d-none');
            box.classList.remove('has-image');
        });
    });
}

// selectedImages dizisini obje olarak değiştir
selectedImages = {};

// Handle appointment form submission
document.getElementById('appointmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    const formData = new FormData();
    
    // Add form fields
    formData.append('appointment_date', document.getElementById('appointmentDate').value);
    formData.append('appointment_time', document.getElementById('appointmentTime').value);
    formData.append('notes', document.getElementById('appointmentNotes').value);
    
    // Get selected services
    const selectedServices = [];
    document.querySelectorAll('#servicesCheckboxes input:checked').forEach(checkbox => {
        selectedServices.push(checkbox.value);
    });
    formData.append('selectedServices', JSON.stringify(selectedServices));
    
    // Add images - sadece dolu olanları
    Object.values(selectedImages).forEach(image => {
        if (image) {
            formData.append('images', image);
        }
    });
    
    try {
        const response = await fetch(`${API_URL}/appointments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Randevunuz başarıyla oluşturuldu!', 'success');
            document.getElementById('appointmentForm').reset();
            // Resim kutularını temizle
            document.querySelectorAll('.image-upload-box').forEach(box => {
                const input = box.querySelector('.image-input');
                const preview = box.querySelector('.image-preview');
                const label = box.querySelector('.image-label');
                const removeBtn = box.querySelector('.remove-image');
                
                input.value = '';
                preview.src = '';
                preview.classList.add('d-none');
                label.classList.remove('d-none');
                removeBtn.classList.add('d-none');
                box.classList.remove('has-image');
            });
            selectedImages = {};
            setTimeout(() => {
                showPage('appointments');
            }, 1500);
        } else {
            showAlert(data.error || 'Randevu oluşturulamadı');
        }
    } catch (error) {
        showAlert('Bağlantı hatası. Lütfen tekrar deneyin.');
    }
});

// Star rating functionality
function setupStarRating() {
    const stars = document.querySelectorAll('.star-btn');
    const ratingInput = document.getElementById('reviewRating');
    const ratingText = document.getElementById('ratingText');
    
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.rating);
            ratingInput.value = rating;
            
            // Update stars display
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.classList.remove('bi-star');
                    s.classList.add('bi-star-fill');
                } else {
                    s.classList.add('bi-star');
                    s.classList.remove('bi-star-fill');
                }
            });
            
            // Update text
            const texts = ['', 'Kötü', 'İdare eder', 'İyi', 'Çok iyi', 'Mükemmel'];
            ratingText.textContent = texts[rating];
        });
    });
}

// Load my reviews
async function loadMyReviews() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_URL}/reviews/my`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const reviews = await response.json();
        const container = document.getElementById('myReviewsList');
        
        if (reviews.length === 0) {
            container.innerHTML = `
                <p class="text-muted text-center">Henüz yorum yapmadınız.</p>
            `;
            return;
        }
        
        container.innerHTML = '';
        reviews.forEach(review => {
            const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            const reviewElement = document.createElement('div');
            reviewElement.className = 'review-item';
            reviewElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <div class="review-stars">${stars}</div>
                        <p class="mb-1">${review.comment}</p>
                        <small class="review-date">${new Date(review.created_at).toLocaleDateString('tr-TR')}</small>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteReview(${review.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(reviewElement);
        });
    } catch (error) {
        console.error('Yorumlar yüklenemedi:', error);
    }
}

// Submit review
document.getElementById('reviewForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    const rating = document.getElementById('reviewRating').value;
    const comment = document.getElementById('reviewComment').value;
    
    if (!rating) {
        showAlert('Lütfen yıldız değerlendirmesi yapın');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ rating, comment })
        });
        
        if (response.ok) {
            showAlert('Yorumunuz başarıyla gönderildi!', 'success');
            document.getElementById('reviewForm').reset();
            document.querySelectorAll('.star-btn').forEach(star => {
                star.classList.remove('bi-star-fill');
                star.classList.add('bi-star');
            });
            document.getElementById('ratingText').textContent = 'Değerlendirmenizi yapın';
            loadMyReviews();
        } else {
            showAlert('Yorum gönderilemedi');
        }
    } catch (error) {
        showAlert('Bağlantı hatası');
    }
});

// Delete review
async function deleteReview(reviewId) {
    if (!confirm('Yorumu silmek istediğinize emin misiniz?')) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showAlert('Yorum silindi', 'success');
            loadMyReviews();
        }
    } catch (error) {
        showAlert('Yorum silinemedi');
    }
}

// Setup page navigation
document.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = e.currentTarget.dataset.page;
        showPage(page);
    });
});

// Set minimum date for appointment
const today = new Date().toISOString().split('T')[0];
document.getElementById('appointmentDate')?.setAttribute('min', today);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        showPage('appointments');
        setupImageUpload(); // Resim yükleme kutularını hazırla
        setupStarRating(); // Yıldız değerlendirme sistemini hazırla
    }
});