// ==========================================
// public/js/auth.js
// ==========================================

// ===== CAPTCHA =====
let num1 = 0,
    num2 = 1;

function generateCaptcha() {
    num1 = Math.floor(Math.random() * 9);
    num2 = Math.floor(Math.random() * 9);
    document.getElementById('captchaQuestion').textContent =
        'What is ' + num1 + ' + ' + num2 + ' = ?';
    document.getElementById('captchaInput').value = '';
}
generateCaptcha();

// ===== CHECK IF SUPER ADMIN EXISTS =====
async function checkSetupStatus() {
    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'SUPER_ADMIN')
            .get();

        const link = document.getElementById('setupLink');
        if (snapshot.empty) {
            link.style.display = 'block';
            link.href = 'register.html';
        } else {
            link.style.display = 'none';
        }
    } catch (err) {
        console.error('Setup check error:', err);
    }
}
checkSetupStatus();

// ===== LOGIN =====
document.getElementById('loginBtn').addEventListener('click', async function() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const captchaAnswer = parseInt(document.getElementById('captchaInput').value, 10);
    const errorEl = document.getElementById('loginError');

    // Validate captcha
    if (captchaAnswer !== num1 + num2) {
        errorEl.textContent = '❌ Invalid captcha! Please try again.';
        errorEl.style.display = 'block';
        generateCaptcha();
        return;
    }

    // Validate fields
    if (!email || !password) {
        errorEl.textContent = '❌ Please enter email and password.';
        errorEl.style.display = 'block';
        return;
    }

    const btn = document.getElementById('loginBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    btn.disabled = true;
    errorEl.style.display = 'none';

    try {
        const userCred = await auth.signInWithEmailAndPassword(email, password);
        const uid = userCred.user.uid;

        const doc = await db.collection('users').doc(uid).get();
        if (!doc.exists) {
            throw new Error('User data not found.');
        }

        const data = doc.data();

        // Save session
        localStorage.setItem('userUID', uid);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('userName', data.username);

        // Redirect
        window.location.href = 'dashboard.html';

    } catch (err) {
        console.error('Login error:', err);
        errorEl.textContent = '❌ ' + (err.message || 'Login failed. Please try again.');
        errorEl.style.display = 'block';
        generateCaptcha();

        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        btn.disabled = false;
    }
});

// ===== ENTER KEY SUPPORT =====
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('loginBtn').click();
    }
});

// ===== LOGOUT (for testing) =====
async function logout() {
    await auth.signOut();
    localStorage.clear();
    window.location.href = 'index.html';
}