// ===== متغيرات عامة للمصادقة =====
let authMode = 'local'; // 'local' أو 'firebase'
let currentUser = null;
let isLoggedIn = false;

// ===== إعدادات Firebase =====
const firebaseConfig = {
  apiKey: "AIzaSyCWE40C6PlM8QKnrc9m-Ggt6uSNPr9Bzdo",
  authDomain: "abu-mahmoud.firebaseapp.com",
  projectId: "abu-mahmoud",
  storageBucket: "abu-mahmoud.firebasestorage.app",
  messagingSenderId: "651960002872",
  appId: "1:651960002872:web:5b64f5563d591a9df339cd",
  measurementId: "G-1NZY6P305W"
};

let firebaseInitialized = false;
let db = null;

// ===== تهيئة Firebase =====
function initializeFirebase() {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    firebaseInitialized = true;
    console.log('Firebase initialized successfully');
    
    // مراقبة حالة المصادقة
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        authMode = 'firebase';
        currentUser = {
          uid: user.uid,
          id: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL
        };
        isLoggedIn = true;
        showAppInterface();
        loadDataFromFirebase();
      } else {
        checkLocalUser();
      }
    });
  } catch (e) {
    console.error('Firebase initialization error:', e);
    firebaseInitialized = false;
    checkLocalUser();
  }
}

// ===== التحقق من المستخدم المحلي =====
function checkLocalUser() {
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      authMode = 'local';
      isLoggedIn = true;
      showAppInterface();
    } catch (e) {
      console.error('Error parsing saved user:', e);
      localStorage.removeItem('currentUser');
      showLoginScreen();
    }
  } else {
    showLoginScreen();
  }
}

// ===== تسجيل الدخول باسم المستخدم وكلمة المرور =====
function loginWithUsernamePassword() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const rememberMe = document.getElementById('rememberMe').checked;

  if (!username || !password) {
    showErrorMessage('يرجى إدخال اسم المستخدم وكلمة المرور');
    return;
  }

  const users = getAllUsers();
  const user = users.find(u => u.username === username);

  if (!user) {
    showErrorMessage('اسم المستخدم غير صحيح');
    return;
  }

  if (!verifyPassword(password, user.password)) {
    showErrorMessage('كلمة المرور غير صحيحة');
    return;
  }

  currentUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName || user.username,
    loginTime: new Date().toISOString()
  };

  authMode = 'local';
  isLoggedIn = true;

  if (rememberMe) {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('rememberMe', 'true');
  } else {
    localStorage.removeItem('rememberMe');
  }

  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';

  showAppInterface();
  
  if (typeof loadDataFromLocalStorage === 'function') {
    loadDataFromLocalStorage();
    if (typeof setTodayDate === 'function') setTodayDate();
    if (typeof renderSavedInvoices === 'function') renderSavedInvoices();
    if (typeof updateStatusBar === 'function') updateStatusBar();
    if (typeof addRow === 'function') addRow();
  }
  
  setStatus(`مرحباً ${currentUser.displayName}`);
}

// ===== التسجيل (إنشاء حساب جديد) =====
function registerNewUser() {
  const username = document.getElementById('registerUsername').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // التحقق من المدخلات
  if (!username || !email || !password || !confirmPassword) {
    showErrorMessage('يرجى ملء جميع الحقول');
    return;
  }

  if (username.length < 3) {
    showErrorMessage('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
    return;
  }

  if (!isValidEmail(email)) {
    showErrorMessage('البريد الإلكتروني غير صحيح');
    return;
  }

  if (password.length < 6) {
    showErrorMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    return;
  }

  if (password !== confirmPassword) {
    showErrorMessage('كلمات المرور غير متطابقة');
    return;
  }

  const users = getAllUsers();
  if (users.find(u => u.username === username)) {
    showErrorMessage('اسم المستخدم موجود بالفعل');
    return;
  }

  if (users.find(u => u.email === email)) {
    showErrorMessage('البريد الإلكتروني موجود بالفعل');
    return;
  }

  const newUser = {
    id: 'user_' + Date.now(),
    username: username,
    email: email,
    password: hashPassword(password),
    displayName: username,
    createdAt: new Date().toISOString(),
    approved: true
  };

  users.push(newUser);
  localStorage.setItem('appUsers', JSON.stringify(users));

  document.getElementById('registerUsername').value = '';
  document.getElementById('registerEmail').value = '';
  document.getElementById('registerPassword').value = '';
  document.getElementById('confirmPassword').value = '';

  showSuccessMessage('تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول.');
  
  setTimeout(() => {
    toggleRegisterForm(null);
  }, 2000);
}

// ===== تسجيل الخروج =====
function logoutUser() {
  if (authMode === 'firebase') {
    firebase.auth().signOut().then(() => {
      currentUser = null;
      isLoggedIn = false;
      authMode = 'local';
      localStorage.removeItem('currentUser');
      localStorage.removeItem('rememberMe');
      showLoginScreen();
    }).catch(error => {
      console.error('Logout error:', error);
    });
  } else {
    currentUser = null;
    isLoggedIn = false;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('rememberMe');
    showLoginScreen();
  }
}

// ===== تحميل البيانات من Firebase =====
function loadDataFromFirebase() {
  if (!currentUser || !db || authMode !== 'firebase') return;

  const userId = currentUser.uid || currentUser.id;
  
  // تحميل الزبائن
  db.collection('users').doc(userId).collection('customers').get().then(snapshot => {
    customers = [];
    snapshot.forEach(doc => {
      customers.push(doc.data());
    });
    renderCustomerList();
  }).catch(error => console.warn('Error loading customers:', error));

  // تحميل الفواتير
  db.collection('users').doc(userId).collection('invoices').get().then(snapshot => {
    savedInvoices = [];
    snapshot.forEach(doc => {
      savedInvoices.push(doc.data());
    });
    renderSavedInvoices();
  }).catch(error => console.warn('Error loading invoices:', error));
}

// ===== حفظ البيانات في Firebase =====
function saveDataToFirebase() {
  if (!currentUser || !db || authMode !== 'firebase') return;

  const userId = currentUser.uid || currentUser.id;
  
  // حفظ الزبائن
  customers.forEach(customer => {
    db.collection('users').doc(userId).collection('customers').doc(customer.id.toString()).set(customer)
      .catch(error => console.warn('Firebase customer save error:', error));
  });

  // حفظ الفواتير
  savedInvoices.forEach(invoice => {
    db.collection('users').doc(userId).collection('invoices').doc(invoice.id.toString()).set(invoice)
      .catch(error => console.warn('Firebase invoice save error:', error));
  });

  updateSyncStatus('synced');
}

// ===== تحديث حالة المزامنة =====
function updateSyncStatus(status) {
  const syncIndicator = document.getElementById('syncStatus');
  if (!syncIndicator) return;

  if (status === 'syncing') {
    syncIndicator.textContent = '⏳ جاري المزامنة...';
    syncIndicator.className = 'sync-status syncing';
  } else if (status === 'synced') {
    syncIndicator.textContent = '☁️ متزامن';
    syncIndicator.className = 'sync-status synced';
  } else if (status === 'error') {
    syncIndicator.textContent = '⚠️ خطأ في المزامنة';
    syncIndicator.className = 'sync-status error';
  }
}

// ===== تغيير كلمة المرور =====
function changePasswordFromModal() {
  const currentPassword = document.getElementById('modalCurrentPassword').value;
  const newPassword = document.getElementById('modalNewPassword').value;
  const confirmNewPassword = document.getElementById('modalConfirmNewPassword').value;

  clearModalPasswordErrors();

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    showFieldError('modalCurrentPasswordError', 'يرجى ملء جميع الحقول');
    return;
  }

  if (newPassword.length < 6) {
    showFieldError('modalNewPasswordError', 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
    return;
  }

  if (newPassword !== confirmNewPassword) {
    showFieldError('modalConfirmNewPasswordError', 'كلمات المرور الجديدة غير متطابقة');
    return;
  }

  if (authMode === 'local') {
    changeLocalPasswordFromModal(currentPassword, newPassword);
  } else if (authMode === 'firebase') {
    changeFirebasePasswordFromModal(currentPassword, newPassword);
  }
}

// ===== تغيير كلمة المرور المحلية =====
function changeLocalPasswordFromModal(currentPassword, newPassword) {
  const users = getAllUsers();
  const userIndex = users.findIndex(u => u.id === currentUser.id);

  if (userIndex === -1) {
    showFieldError('modalCurrentPasswordError', 'لم يتم العثور على المستخدم');
    return;
  }

  if (!verifyPassword(currentPassword, users[userIndex].password)) {
    showFieldError('modalCurrentPasswordError', 'كلمة المرور الحالية غير صحيحة');
    return;
  }

  users[userIndex].password = hashPassword(newPassword);
  localStorage.setItem('appUsers', JSON.stringify(users));

  document.getElementById('modalCurrentPassword').value = '';
  document.getElementById('modalNewPassword').value = '';
  document.getElementById('modalConfirmNewPassword').value = '';

  closeModal('changePasswordModal');
  setStatus('تم تحديث كلمة المرور بنجاح!');
}

// ===== تغيير كلمة المرور في Firebase =====
function changeFirebasePasswordFromModal(currentPassword, newPassword) {
  const user = firebase.auth().currentUser;
  const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);

  user.reauthenticateWithCredential(credential)
    .then(() => {
      user.updatePassword(newPassword)
        .then(() => {
          document.getElementById('modalCurrentPassword').value = '';
          document.getElementById('modalNewPassword').value = '';
          document.getElementById('modalConfirmNewPassword').value = '';

          closeModal('changePasswordModal');
          setStatus('تم تحديث كلمة المرور بنجاح!');
        })
        .catch((error) => {
          console.error('Password update error:', error);
          showFieldError('modalNewPasswordError', 'حدث خطأ في تحديث كلمة المرور');
        });
    })
    .catch((error) => {
      console.error('Re-authentication error:', error);
      showFieldError('modalCurrentPasswordError', 'كلمة المرور الحالية غير صحيحة');
    });
}

// ===== دوال مساعدة للمصادقة =====

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function hashPassword(password) {
  return btoa(password);
}

function verifyPassword(password, hashedPassword) {
  return btoa(password) === hashedPassword;
}

function getAllUsers() {
  const users = localStorage.getItem('appUsers');
  return users ? JSON.parse(users) : [];
}

// ===== دوال عرض الشاشات =====

function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('loadingScreen').style.display = 'none';
  document.getElementById('unauthorizedScreen').style.display = 'none';
}

function showAppInterface() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = 'flex';
  document.getElementById('loadingScreen').style.display = 'none';
  document.getElementById('unauthorizedScreen').style.display = 'none';
}

function showLoadingScreen() {
  document.getElementById('loadingScreen').style.display = 'flex';
}

function hideLoadingScreen() {
  document.getElementById('loadingScreen').style.display = 'none';
}

// ===== دوال عرض الرسائل =====

function showErrorMessage(message) {
  alert(message);
}

function showSuccessMessage(message) {
  alert(message);
}

function showFieldError(fieldId, message) {
  const errorElement = document.getElementById(fieldId);
  if (errorElement) {
    errorElement.textContent = message;
  }
}

function clearModalPasswordErrors() {
  document.getElementById('modalCurrentPasswordError').textContent = '';
  document.getElementById('modalNewPasswordError').textContent = '';
  document.getElementById('modalConfirmNewPasswordError').textContent = '';
}

// ===== دوال التنقل بين النماذج =====

function toggleRegisterForm(event) {
  if (event) event.preventDefault();
  
  const usernamePasswordForm = document.getElementById('usernamePasswordForm');
  const registerForm = document.getElementById('registerForm');
  
  if (registerForm.style.display === 'none') {
    usernamePasswordForm.style.display = 'none';
    registerForm.style.display = 'flex';
  } else {
    usernamePasswordForm.style.display = 'flex';
    registerForm.style.display = 'none';
  }
}

function toggleForgotPasswordForm(event) {
  if (event) event.preventDefault();
  
  const usernamePasswordForm = document.getElementById('usernamePasswordForm');
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  
  if (forgotPasswordForm.style.display === 'none') {
    usernamePasswordForm.style.display = 'none';
    forgotPasswordForm.style.display = 'flex';
  } else {
    usernamePasswordForm.style.display = 'flex';
    forgotPasswordForm.style.display = 'none';
  }
}

function sendPasswordResetEmail() {
  const email = document.getElementById('forgotEmail').value.trim();
  
  if (!email) {
    showFieldError('forgotEmailError', 'يرجى إدخال البريد الإلكتروني');
    return;
  }

  if (!isValidEmail(email)) {
    showFieldError('forgotEmailError', 'البريد الإلكتروني غير صحيح');
    return;
  }

  const users = getAllUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    showFieldError('forgotEmailError', 'البريد الإلكتروني غير مسجل في النظام');
    return;
  }

  showSuccessMessage('تم التحقق من حسابك. يرجى التواصل مع المبرمج لإعادة تعيين كلمة المرور.');
  document.getElementById('forgotEmail').value = '';
  toggleForgotPasswordForm(null);
}

function openChangePasswordModal() {
  document.getElementById('changePasswordModal').style.display = 'flex';
  document.getElementById('modalCurrentPassword').value = '';
  document.getElementById('modalNewPassword').value = '';
  document.getElementById('modalConfirmNewPassword').value = '';
  clearModalPasswordErrors();
}

function closeChangePasswordModal() {
  closeModal('changePasswordModal');
}

// ===== دوال مساعدة عامة =====

function setStatus(message) {
  const statusMessage = document.getElementById('statusMessage');
  if (statusMessage) {
    statusMessage.textContent = message;
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// ===== تهيئة البرنامج عند تحميل الصفحة =====
document.addEventListener('DOMContentLoaded', function() {
  // تهيئة Firebase
  initializeFirebase();
  
  // إضافة مستمعات الأحداث للنماذج
  const loginPasswordInput = document.getElementById('loginPassword');
  if (loginPasswordInput) {
    loginPasswordInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        loginWithUsernamePassword();
      }
    });
  }

  const confirmPasswordInput = document.getElementById('confirmPassword');
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        registerNewUser();
      }
    });
  }

  const forgotEmailInput = document.getElementById('forgotEmail');
  if (forgotEmailInput) {
    forgotEmailInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        sendPasswordResetEmail();
      }
    });
  }

  // التحقق من وجود مستخدم محفوظ
  checkLocalUser();
});
