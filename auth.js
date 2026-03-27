// ===== نظام المصادقة باسم المستخدم وكلمة المرور =====

// متغيرات عامة للمصادقة
let authMode = 'local'; // 'local' أو 'firebase'
let currentUser = null;
let isLoggedIn = false;

// ===== المصادقة المحلية فقط =====
// البرنامج يستخدم المصادقة المحلية باستخدام localStorage
let firebaseInitialized = false;
let db = null;

// بدء المصادقة المحلية
checkLocalUser();

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

  // محاكاة التحقق من بيانات المستخدم
  // في التطبيق الحقيقي، يجب التحقق من بيانات قاعدة البيانات
  const users = getAllUsers();
  const user = users.find(u => u.username === username);

  if (!user) {
    showErrorMessage('اسم المستخدم غير صحيح');
    return;
  }

  // التحقق من كلمة المرور (في التطبيق الحقيقي، يجب استخدام hashing)
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
    password: hashPassword(password), // يجب استخدام hashing حقيقي
    displayName: username,
    createdAt: new Date().toISOString(),
    approved: true // المستخدمون المحليون معتمدون افتراضياً
  };

  // حفظ المستخدم المحلي
  saveUser(newUser);

  // محاولة إضافة المستخدم إلى Firebase
  if (firebaseInitialized) {
    createFirebaseUser(email, password, newUser);
  } else {
    showSuccessMessage('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
    setTimeout(() => {
      toggleRegisterForm(new Event('click'));
    }, 1500);
  }
}

// ===== دالة إنشاء مستخدم في Firebase =====
function createFirebaseUser(email, password, localUser) {
  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const firebaseUser = userCredential.user;
      
      // إضافة بيانات المستخدم إلى Firestore
      db.collection('users').doc(firebaseUser.uid).set({
        username: localUser.username,
        email: email,
        displayName: localUser.displayName,
        approved: true,
        createdAt: new Date(),
        authMethod: 'email'
      });

      showSuccessMessage('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
      
      setTimeout(() => {
        toggleRegisterForm(new Event('click'));
      }, 1500);
    })
    .catch((error) => {
      console.error('Firebase registration error:', error);
      // حتى لو فشل Firebase، تم حفظ المستخدم محلياً
      showSuccessMessage('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
      
      setTimeout(() => {
        toggleRegisterForm(new Event('click'));
      }, 1500);
    });
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

  // عرض رسالة الانتظار
  showFieldError('forgotEmailError', 'جاري إرسال رابط الاستعادة...');
  if (forgotEmailError) {
    forgotEmailError.style.color = '#0066cc';
  }

  if (firebaseInitialized) {
    // إعدادات متقدمة لرابط استعادة كلمة المرور
    const actionCodeSettings = {
      url: window.location.origin + window.location.pathname,
      handleCodeInApp: false
    };
    
    firebase.auth().sendPasswordResetEmail(email, actionCodeSettings)
      .then(() => {
        // رسالة النجاح مع تفاصيل واضحة
        const successMsg = 'تم إرسال رابط استعادة كلمة المرور بنجاح!\n\nيرجى التحقق من بريدك الإلكتروني (بما في ذلك مجلد الرسائل المزعجة) للعثور على رابط الاستعادة.\n\nإذا لم تستقبل البريد خلال دقائق قليلة، يرجى التحقق من صحة البريد الإلكتروني.';
        alert(successMsg);
        showSuccessMessageInForm('تم إرسال رابط الاستعادة بنجاح!', 'forgotPasswordForm');
        
        setTimeout(() => {
          document.getElementById('forgotEmail').value = '';
          toggleForgotPasswordForm(new Event('click'));
        }, 2000);
      })
      .catch((error) => {
        console.error('Password reset error:', error);
        let errorMessage = 'حدث خطأ في إرسال البريد';
        
        // معالجة أنواع الأخطاء المختلفة
        if (error.code === 'auth/user-not-found') {
          errorMessage = 'لم يتم العثور على حساب بهذا البريد الإلكتروني';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'البريد الإلكتروني غير صحيح';
        } else if (error.code === 'auth/too-many-requests') {
          errorMessage = 'محاولات كثيرة جداً. يرجى الانتظار قليلاً والمحاولة لاحقاً';
        } else if (error.code === 'auth/operation-not-allowed') {
          errorMessage = 'خدمة استعادة كلمة المرور غير مفعلة. يرجى التواصل مع المسؤول';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        showFieldError('forgotEmailError', 'خطأ: ' + errorMessage);
        if (forgotEmailError) {
          forgotEmailError.style.color = '#d32f2f';
        }
      });
  } else {
    // إذا لم يكن Firebase متاحاً
    const errorMsg = 'خدمة البريد غير متاحة حالياً. يرجى التأكد من اتصال الإنترنت والمحاولة لاحقاً.';
    showFieldError('forgotEmailError', errorMsg);
    if (forgotEmailError) {
      forgotEmailError.style.color = '#d32f2f';
    }
    alert(errorMsg);
  }
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

  if (authMode === 'local') {
    changeLocalPassword(currentPassword, newPassword);
  } else if (authMode === 'firebase') {
    changeFirebasePassword(currentPassword, newPassword);
  }
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

  if (authMode === 'local') {
    changeLocalPasswordFromModal(currentPassword, newPassword);
  } else if (authMode === 'firebase') {
    changeFirebasePasswordFromModal(currentPassword, newPassword);
  }
}

// ===== دالة تغيير كلمة المرور المحلية =====
function changeLocalPassword(currentPassword, newPassword) {
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
    closeModal('changePasswordForm');
  }, 2000);
}

// ===== دالة تغيير كلمة المرور المحلية من النافذة =====
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

// ===== دالة تغيير كلمة المرور في Firebase =====
function changeFirebasePassword(currentPassword, newPassword) {
  const user = firebase.auth().currentUser;
  const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);

  user.reauthenticateWithCredential(credential)
    .then(() => {
      user.updatePassword(newPassword)
        .then(() => {
          // مسح النموذج
          document.getElementById('currentPassword').value = '';
          document.getElementById('newPassword').value = '';
          document.getElementById('confirmNewPassword').value = '';

          showSuccessMessageInForm('تم تحديث كلمة المرور بنجاح!', 'changePasswordForm');
          
          setTimeout(() => {
            closeModal('changePasswordForm');
          }, 2000);
        })
        .catch((error) => {
          console.error('Password update error:', error);
          showFieldError('newPasswordError', 'حدث خطأ في تحديث كلمة المرور');
        });
    })
    .catch((error) => {
      console.error('Re-authentication error:', error);
      showFieldError('currentPasswordError', 'كلمة المرور الحالية غير صحيحة');
    });
}

// ===== دالة تغيير كلمة المرور في Firebase من النافذة =====
function changeFirebasePasswordFromModal(currentPassword, newPassword) {
  const user = firebase.auth().currentUser;
  const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);

  user.reauthenticateWithCredential(credential)
    .then(() => {
      user.updatePassword(newPassword)
        .then(() => {
          // مسح النموذج
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

// ===== دوال المساعدة للمصادقة =====

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function hashPassword(password) {
  // تحذير: هذا ليس hashing حقيقي، يجب استخدام bcrypt أو مكتبة متخصصة
  // هذا مجرد مثال توضيحي
  return btoa(password); // Base64 encoding (غير آمن للإنتاج)
}

function verifyPassword(password, hashedPassword) {
  return btoa(password) === hashedPassword;
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
  const existingError = loginForm.querySelector('.error-message');
  if (existingError) {
    existingError.remove();
  }
  
  loginForm.insertBefore(errorDiv, loginForm.firstChild);
  
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

function showSuccessMessage(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  
  const registerForm = document.getElementById('registerForm');
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
    document.getElementById('syncStatus').textContent = '👤 ' + currentUser.displayName;
    document.getElementById('syncStatus').className = 'sync-status synced';
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
  // تسجيل الخروج المحلي
  currentUser = null;
  isLoggedIn = false;
  localStorage.removeItem('currentUser');
  localStorage.removeItem('rememberMe');
  showLoginScreen();
  setStatus('تم تسجيل الخروج بنجاح');
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
