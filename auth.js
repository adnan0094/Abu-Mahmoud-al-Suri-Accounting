// ===== نظام المصادقة باسم المستخدم وكلمة المرور =====

// متغيرات عامة للمصادقة
let authMode = 'local'; // 'local' أو 'firebase'
let currentUser = null;
let isLoggedIn = false;

// ===== المصادقة المحلية فقط =====
// البرنامج يستخدم المصادقة المحلية باستخدام localStorage
let firebaseInitialized = false;
let db = null;

// ===== دالة التحقق من المستخدم المحلي =====
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

// ===== دالة تسجيل الدخول باسم المستخدم وكلمة المرور =====
function loginWithUsernamePassword() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const rememberMe = document.getElementById('rememberMe').checked;

  // التحقق من المدخلات
  if (!username || !password) {
    showErrorMessage('يرجى إدخال اسم المستخدم وكلمة المرور');
    return;
  }

  // التحقق من بيانات المستخدم
  const users = getAllUsers();
  const user = users.find(u => u.username === username);

  if (!user) {
    showErrorMessage('اسم المستخدم غير صحيح');
    return;
  }

  // التحقق من كلمة المرور
  if (!verifyPassword(password, user.password)) {
    showErrorMessage('كلمة المرور غير صحيحة');
    return;
  }

  // تسجيل الدخول بنجاح
  currentUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName || user.username,
    loginTime: new Date().toISOString()
  };

  authMode = 'local';
  isLoggedIn = true;

  // حفظ بيانات المستخدم إذا اختار "تذكرني"
  if (rememberMe) {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('rememberMe', 'true');
  } else {
    localStorage.removeItem('rememberMe');
  }

  // مسح حقول النموذج
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';

  // إظهار واجهة التطبيق
  showAppInterface();
  
  // تهيئة بيانات التطبيق بعد تسجيل الدخول
  if (typeof loadDataFromLocalStorage === 'function') {
    loadDataFromLocalStorage();
    if (typeof setTodayDate === 'function') setTodayDate();
    if (typeof renderSavedInvoices === 'function') renderSavedInvoices();
    if (typeof updateStatusBar === 'function') updateStatusBar();
    if (typeof addRow === 'function') addRow();
  }
  
  setStatus(`مرحباً ${currentUser.displayName}`);
}

// ===== دالة التسجيل (إنشاء حساب جديد) =====
function registerNewUser() {
  const username = document.getElementById('registerUsername').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // مسح الأخطاء السابقة
  clearErrorMessages();

  // التحقق من المدخلات
  let hasError = false;

  if (!username || username.length < 3) {
    showFieldError('usernameError', 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
    hasError = true;
  }

  if (!isValidEmail(email)) {
    showFieldError('emailError', 'البريد الإلكتروني غير صحيح');
    hasError = true;
  }

  if (!password || password.length < 6) {
    showFieldError('passwordError', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    hasError = true;
  }

  if (password !== confirmPassword) {
    showFieldError('confirmError', 'كلمات المرور غير متطابقة');
    hasError = true;
  }

  if (hasError) {
    return;
  }

  // التحقق من عدم وجود مستخدم بنفس الاسم
  const users = getAllUsers();
  if (users.find(u => u.username === username)) {
    showFieldError('usernameError', 'اسم المستخدم موجود بالفعل');
    return;
  }

  if (users.find(u => u.email === email)) {
    showFieldError('emailError', 'البريد الإلكتروني مسجل بالفعل');
    return;
  }

  // إنشاء المستخدم الجديد
  const newUser = {
    id: generateUserId(),
    username: username,
    email: email,
    password: hashPassword(password),
    displayName: username,
    createdAt: new Date().toISOString(),
    approved: true
  };

  // حفظ المستخدم المحلي
  saveUser(newUser);

  showSuccessMessage('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
  setTimeout(() => {
    toggleRegisterForm(new Event('click'));
  }, 1500);
}

// ===== دالة إرسال رابط استعادة كلمة المرور =====
function sendPasswordResetEmail() {
  const email = document.getElementById('forgotEmail').value.trim();
  const forgotEmailError = document.getElementById('forgotEmailError');

  // مسح الأخطاء السابقة
  if (forgotEmailError) {
    forgotEmailError.textContent = '';
    forgotEmailError.style.display = 'none';
  }

  if (!email) {
    showFieldError('forgotEmailError', 'يرجى إدخال البريد الإلكتروني');
    return;
  }

  if (!isValidEmail(email)) {
    showFieldError('forgotEmailError', 'البريد الإلكتروني غير صحيح');
    return;
  }

  // التحقق من وجود المستخدم محلياً
  const users = getAllUsers();
  const user = users.find(u => u.email === email);
  
  if (!user) {
    showFieldError('forgotEmailError', 'لم يتم العثور على حساب بهذا البريد الإلكتروني');
    return;
  }

  // في النظام المحلي، نعرض كلمة المرور المشفرة (للتطوير فقط)
  // في الإنتاج يجب استخدام Firebase أو نظام بريد إلكتروني حقيقي
  if (forgotEmailError) {
    forgotEmailError.textContent = 'تم العثور على حسابك. يرجى التواصل مع المسؤول لاسترداد كلمة المرور.';
    forgotEmailError.style.display = 'block';
    forgotEmailError.style.color = '#0066cc';
  }
  
  setTimeout(() => {
    document.getElementById('forgotEmail').value = '';
    toggleForgotPasswordForm(new Event('click'));
  }, 3000);
}

// ===== دالة تغيير كلمة المرور من النموذج الموجود في شاشة تسجيل الدخول =====
function changePassword() {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;

  clearPasswordErrors();

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    showFieldError('currentPasswordError', 'يرجى ملء جميع الحقول');
    return;
  }

  if (newPassword.length < 6) {
    showFieldError('newPasswordError', 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
    return;
  }

  if (newPassword !== confirmNewPassword) {
    showFieldError('confirmNewPasswordError', 'كلمات المرور الجديدة غير متطابقة');
    return;
  }

  changeLocalPassword(currentPassword, newPassword);
}

// ===== دالة تغيير كلمة المرور من النافذة المنبثقة =====
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

  changeLocalPasswordFromModal(currentPassword, newPassword);
}

// ===== دالة تغيير كلمة المرور المحلية =====
function changeLocalPassword(currentPassword, newPassword) {
  if (!currentUser) {
    showFieldError('currentPasswordError', 'يرجى تسجيل الدخول أولاً');
    return;
  }
  
  const users = getAllUsers();
  const userIndex = users.findIndex(u => u.id === currentUser.id);

  if (userIndex === -1) {
    showFieldError('currentPasswordError', 'لم يتم العثور على المستخدم');
    return;
  }

  if (!verifyPassword(currentPassword, users[userIndex].password)) {
    showFieldError('currentPasswordError', 'كلمة المرور الحالية غير صحيحة');
    return;
  }

  // تحديث كلمة المرور
  users[userIndex].password = hashPassword(newPassword);
  localStorage.setItem('appUsers', JSON.stringify(users));

  // مسح النموذج
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmNewPassword').value = '';

  showSuccessMessageInForm('تم تحديث كلمة المرور بنجاح!', 'changePasswordForm');
  
  setTimeout(() => {
    closeModal('changePasswordModal');
  }, 2000);
}

// ===== دالة تغيير كلمة المرور المحلية من النافذة =====
function changeLocalPasswordFromModal(currentPassword, newPassword) {
  if (!currentUser) {
    showFieldError('modalCurrentPasswordError', 'يرجى تسجيل الدخول أولاً');
    return;
  }
  
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

  // تحديث كلمة المرور
  users[userIndex].password = hashPassword(newPassword);
  localStorage.setItem('appUsers', JSON.stringify(users));

  // مسح النموذج
  document.getElementById('modalCurrentPassword').value = '';
  document.getElementById('modalNewPassword').value = '';
  document.getElementById('modalConfirmNewPassword').value = '';

  closeModal('changePasswordModal');
  setStatus('تم تحديث كلمة المرور بنجاح!');
}

// ===== دوال المساعدة للمصادقة =====

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function hashPassword(password) {
  // تحذير: Base64 ليس hashing حقيقي، للاستخدام المحلي فقط
  return btoa(unescape(encodeURIComponent(password)));
}

function verifyPassword(password, hashedPassword) {
  try {
    return btoa(unescape(encodeURIComponent(password))) === hashedPassword;
  } catch (e) {
    // دعم كلمات المرور القديمة المشفرة بـ btoa مباشرة
    try {
      return btoa(password) === hashedPassword;
    } catch (e2) {
      return false;
    }
  }
}

function generateUserId() {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getAllUsers() {
  const usersJson = localStorage.getItem('appUsers');
  return usersJson ? JSON.parse(usersJson) : [];
}

function saveUser(user) {
  const users = getAllUsers();
  users.push(user);
  localStorage.setItem('appUsers', JSON.stringify(users));
}

// ===== دوال عرض الأخطاء والرسائل =====

function showErrorMessage(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  
  const loginForm = document.getElementById('usernamePasswordForm');
  if (!loginForm) return;
  
  const existingError = loginForm.querySelector('.error-message');
  if (existingError) {
    existingError.remove();
  }
  
  loginForm.insertBefore(errorDiv, loginForm.firstChild);
  
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 5000);
}

function showSuccessMessage(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  
  const registerForm = document.getElementById('registerForm');
  if (!registerForm) return;
  
  const existingSuccess = registerForm.querySelector('.success-message');
  if (existingSuccess) {
    existingSuccess.remove();
  }
  
  registerForm.insertBefore(successDiv, registerForm.firstChild);
}

function showSuccessMessageInForm(message, formId) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  
  const form = document.getElementById(formId);
  if (!form) return;
  
  const existingSuccess = form.querySelector('.success-message');
  if (existingSuccess) {
    existingSuccess.remove();
  }
  
  form.insertBefore(successDiv, form.firstChild);
}

function showFieldError(fieldId, message) {
  const errorElement = document.getElementById(fieldId);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
}

function clearErrorMessages() {
  const errorElements = document.querySelectorAll('.error-text');
  errorElements.forEach(el => {
    el.textContent = '';
    el.style.display = 'none';
  });
  
  // مسح رسائل الخطأ العامة أيضاً
  const errorMessages = document.querySelectorAll('.error-message');
  errorMessages.forEach(el => el.remove());
}

function clearPasswordErrors() {
  const errorIds = ['currentPasswordError', 'newPasswordError', 'confirmNewPasswordError'];
  errorIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = '';
      el.style.display = 'none';
    }
  });
}

function clearModalPasswordErrors() {
  const errorIds = ['modalCurrentPasswordError', 'modalNewPasswordError', 'modalConfirmNewPasswordError'];
  errorIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = '';
      el.style.display = 'none';
    }
  });
}

// ===== دوال التبديل بين نماذج تسجيل الدخول =====

function toggleRegisterForm(event) {
  event.preventDefault();
  const loginForm = document.getElementById('usernamePasswordForm');
  const registerForm = document.getElementById('registerForm');
  const forgotForm = document.getElementById('forgotPasswordForm');
  
  // إخفاء جميع النماذج أولاً
  forgotForm.style.display = 'none';
  
  if (loginForm.style.display === 'none') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  }
  
  clearErrorMessages();
}

function toggleForgotPasswordForm(event) {
  event.preventDefault();
  const loginForm = document.getElementById('usernamePasswordForm');
  const forgotForm = document.getElementById('forgotPasswordForm');
  const registerForm = document.getElementById('registerForm');
  
  // إخفاء نموذج التسجيل
  registerForm.style.display = 'none';
  
  if (loginForm.style.display === 'none') {
    loginForm.style.display = 'block';
    forgotForm.style.display = 'none';
  } else {
    loginForm.style.display = 'none';
    forgotForm.style.display = 'block';
  }
  
  clearErrorMessages();
  document.getElementById('forgotEmail').value = '';
}

// ===== دالة فتح نافذة تغيير كلمة المرور =====
function openChangePasswordModal() {
  clearModalPasswordErrors();
  document.getElementById('modalCurrentPassword').value = '';
  document.getElementById('modalNewPassword').value = '';
  document.getElementById('modalConfirmNewPassword').value = '';
  document.getElementById('changePasswordModal').style.display = 'flex';
}

// ===== دالة إغلاق نافذة تغيير كلمة المرور =====
function closeChangePasswordModal() {
  document.getElementById('changePasswordModal').style.display = 'none';
  clearModalPasswordErrors();
}

// ===== دالة إظهار واجهة التطبيق =====
function showAppInterface() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('loadingScreen').style.display = 'none';
  document.getElementById('unauthorizedScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = 'flex';
  
  if (currentUser) {
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) {
      syncStatus.textContent = '👤 ' + currentUser.displayName;
      syncStatus.className = 'sync-status synced';
    }
  }
}

// ===== دالة إظهار شاشة تسجيل الدخول =====
function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loadingScreen').style.display = 'none';
  document.getElementById('unauthorizedScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = 'none';
}

// ===== دالة تسجيل الخروج =====
function logoutUser() {
  currentUser = null;
  isLoggedIn = false;
  localStorage.removeItem('currentUser');
  localStorage.removeItem('rememberMe');
  showLoginScreen();
}

// ===== تهيئة المصادقة عند تحميل الصفحة =====
document.addEventListener('DOMContentLoaded', function() {
  // التحقق من وجود مستخدم محفوظ
  checkLocalUser();
  
  // إضافة مستمعات الأحداث للنماذج
  const loginPasswordInput = document.getElementById('loginPassword');
  if (loginPasswordInput) {
    loginPasswordInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        loginWithUsernamePassword();
      }
    });
  }

  const loginUsernameInput = document.getElementById('loginUsername');
  if (loginUsernameInput) {
    loginUsernameInput.addEventListener('keypress', function(e) {
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
});
