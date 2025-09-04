const API_URL = 'http://localhost:3000/api';

// Alert gösterme fonksiyonu
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

// Login Form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('isAdmin', data.isAdmin);
            
            showAlert('Giriş başarılı! Yönlendiriliyorsunuz...', 'success');
            
            setTimeout(() => {
                if (data.isAdmin) {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/dashboard.html';
                }
            }, 1000);
        } else {
            showAlert(data.error || 'Giriş başarısız');
        }
    } catch (error) {
        showAlert('Bağlantı hatası. Lütfen tekrar deneyin.');
    }
});

// Register Form
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const registerData = {
        username: document.getElementById('regUsername').value,
        password: document.getElementById('regPassword').value,
        fullName: document.getElementById('regFullName').value,
        email: document.getElementById('regEmail').value,
        phone: document.getElementById('regPhone').value,
        address: document.getElementById('regAddress').value
    };
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registerData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('isAdmin', 'false');
            
            showAlert('Kayıt başarılı! Yönlendiriliyorsunuz...', 'success');
            
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        } else {
            showAlert(data.error || 'Kayıt başarısız');
        }
    } catch (error) {
        showAlert('Bağlantı hatası. Lütfen tekrar deneyin.');
    }
});