const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://bahce-zanaat.onrender.com/api';

// Check admin authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (!token || !isAdmin) {
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
    
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    document.getElementById(`${page}Page`).classList.remove('d-none');
    
    // Load page data
    if (page === 'dashboard') {
        loadDashboard();
    } else if (page === 'appointments') {
        loadAppointments();
    } else if (page === 'users') {
        loadUsers();
    }
}

// Load dashboard stats
async function loadDashboard() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_URL}/admin/dashboard`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('İstatistikler yüklenemedi');
        
        const stats = await response.json();
        
        document.getElementById('totalAppointments').textContent = stats.totalAppointments || 0;
        document.getElementById('pendingAppointments').textContent = stats.pendingAppointments || 0;
        document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
        document.getElementById('thisWeekAppointments').textContent = stats.thisWeekAppointments || 0;
    } catch (error) {
        console.error('Dashboard yüklenemedi:', error);
    }
}

// Load appointments
async function loadAppointments() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_URL}/admin/appointments`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Randevular yüklenemedi');
        
        const appointments = await response.json();
        const tbody = document.getElementById('appointmentsTable');
        
        if (appointments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Randevu bulunmamaktadır.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
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
                cancelled: 'İptal'
            };
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${appointment.id}</td>
                <td>
                    <strong>${appointment.full_name}</strong><br>
                    <small>${appointment.phone}</small>
                </td>
                <td>
                    ${new Date(appointment.appointment_date).toLocaleDateString('tr-TR')}<br>
                    ${appointment.appointment_time}
                </td>
                <td>
                    ${appointment.services.map(s => `<span class="badge bg-secondary">${s}</span>`).join(' ')}
                </td>
                <td>
                    <span class="badge bg-${statusColors[appointment.status]}">
                        ${statusTexts[appointment.status]}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewAppointment(${appointment.id})">
                        <i class="bi bi-eye"></i>
                    </button>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                            Durum
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="updateStatus(${appointment.id}, 'pending')">Beklemede</a></li>
                            <li><a class="dropdown-item" href="#" onclick="updateStatus(${appointment.id}, 'confirmed')">Onayla</a></li>
                            <li><a class="dropdown-item" href="#" onclick="updateStatus(${appointment.id}, 'completed')">Tamamla</a></li>
                            <li><a class="dropdown-item" href="#" onclick="updateStatus(${appointment.id}, 'cancelled')">İptal</a></li>
                        </ul>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        showAlert('Randevular yüklenirken hata oluştu');
    }
}

// View appointment detail
async function viewAppointment(id) {
    const appointments = await getAppointments();
    const appointment = appointments.find(a => a.id === id);
    
    if (!appointment) return;
    
    const modal = document.getElementById('appointmentDetail');
    modal.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>Müşteri Bilgileri</h6>
                <p><strong>Ad Soyad:</strong> ${appointment.full_name}</p>
                <p><strong>E-posta:</strong> ${appointment.email}</p>
                <p><strong>Telefon:</strong> ${appointment.phone}</p>
            </div>
            <div class="col-md-6">
                <h6>Randevu Bilgileri</h6>
                <p><strong>Tarih:</strong> ${new Date(appointment.appointment_date).toLocaleDateString('tr-TR')}</p>
                <p><strong>Saat:</strong> ${appointment.appointment_time}</p>
                <p><strong>Durum:</strong> ${appointment.status}</p>
            </div>
        </div>
        ${appointment.notes ? `
            <div class="mt-3">
                <h6>Notlar</h6>
                <p>${appointment.notes}</p>
            </div>
        ` : ''}
        ${appointment.services.length > 0 ? `
            <div class="mt-3">
                <h6>İstenen Hizmetler</h6>
                ${appointment.services.map(s => `<span class="badge bg-success me-1">${s}</span>`).join('')}
            </div>
        ` : ''}
        ${appointment.images.length > 0 ? `
            <div class="mt-3">
                <h6>Fotoğraflar</h6>
                <div class="row g-2">
                    ${appointment.images.map(img => `
                        <div class="col-3">
                            <img src="/uploads/${img}" class="img-fluid rounded" alt="Bahçe">
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
    
    new bootstrap.Modal(document.getElementById('appointmentModal')).show();
}

// Get appointments (helper)
async function getAppointments() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/admin/appointments`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
}

// Update appointment status
async function updateStatus(id, status) {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_URL}/admin/appointments/${id}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            showAlert('Durum güncellendi', 'success');
            loadAppointments();
        } else {
            showAlert('Durum güncellenemedi');
        }
    } catch (error) {
        showAlert('Bağlantı hatası');
    }
}

// Load users
async function loadUsers() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Kullanıcılar yüklenemedi');
        
        const users = await response.json();
        const tbody = document.getElementById('usersTable');
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Kullanıcı bulunmamaktadır.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${user.id}</td>
                <td>${user.username}</td>
                <td>${user.full_name}</td>
                <td>${user.email}</td>
                <td>${user.phone}</td>
                <td>${new Date(user.created_at).toLocaleDateString('tr-TR')}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        showAlert('Kullanıcılar yüklenirken hata oluştu');
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        showPage('dashboard');
    }
});