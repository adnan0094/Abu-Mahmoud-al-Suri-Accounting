// ===== نظام المصادقة باسم المستخدم وكلمة المرور =====

// متغيرات عامة للمصادقة
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

// محاولة تهيئة Firebase
try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  firebaseInitialized = true;
  
  // إعداد FirebaseUI لتسجيل الدخول بـ Google
  const ui = new firebaseui.auth.AuthUI(firebase.auth());
  const uiConfig = {
    callbacks: {
      signInSuccessWithAuthResult: function(authResult, redirectUrl) {
        return false;
      }
    },
    signInFlow: 'popup',
    signInOptions: [
      firebase.auth.GoogleAuthProvider.PROVIDER_ID
    ]
  };

  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      authMode = 'firebase';
      currentUser = user;
      checkUserApproval(user);
    } else {
      // إذا لم يكن هناك مستخدم Firebase، تحقق من المستخدم المحلي
      checkLocalUser();
    }
  });
} catch (e) {
  console.error('Firebase initialization error:', e);
  // إذا فشل Firebase، استخدم المصادقة المحلية فقط
  checkLocalUser();
}

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

  // حفظ المستخدم الجديد
  saveUser(newUser);

  // إظهار رسالة النجاح
  showSuccessMessage('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');

  // مسح النموذج
  document.getElementById('registerUsername').value = '';
  document.getElementById('registerEmail').value = '';
  document.getElementById('registerPassword').value = '';
  document.getElementById('confirmPassword').value = '';

  // الانتقال إلى نموذج تسجيل الدخول
  setTimeout(() => {
    toggleRegisterForm(new Event('click'));
  }, 1500);
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

function toggleGoogleLogin() {
  const usernameForm = document.getElementById('usernamePasswordForm');
  const googleForm = document.getElementById('googleLoginForm');
  
  if (usernameForm.style.display === 'none') {
    usernameForm.style.display = 'block';
    googleForm.style.display = 'none';
  } else {
    usernameForm.style.display = 'none';
    googleForm.style.display = 'block';
    
    // تهيئة FirebaseUI عند الحاجة
    if (firebaseInitialized) {
      const ui = new firebaseui.auth.AuthUI(firebase.auth());
      const uiConfig = {
        callbacks: {
          signInSuccessWithAuthResult: function(authResult, redirectUrl) {
            return false;
          }
        },
        signInFlow: 'popup',
        signInOptions: [
          firebase.auth.GoogleAuthProvider.PROVIDER_ID
        ]
      };
      ui.start('#firebaseUILogin', uiConfig);
    }
  }
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

// ===== دالة التحقق من تفعيل المستخدم (Firebase) =====
function checkUserApproval(user) {
  if (!db) {
    showLoginScreen();
    return;
  }

  document.getElementById('loadingScreen').style.display = 'flex';
  
  db.collection('users').doc(user.uid).get().then(doc => {
    if (doc.exists && doc.data().approved === true) {
      // المستخدم مفعل
      currentUser = {
        id: user.uid,
        username: user.displayName || user.email.split('@')[0],
        email: user.email,
        displayName: user.displayName || user.email,
        authProvider: 'google',
        loginTime: new Date().toISOString()
      };
      authMode = 'firebase';
      isLoggedIn = true;
      
      showAppInterface();
      loadDataFromFirebase();
    } else {
      // المستخدم غير مفعل
      document.getElementById('loadingScreen').style.display = 'none';
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('appContainer').style.display = 'none';
      document.getElementById('unauthorizedScreen').style.display = 'flex';
      document.getElementById('userEmail').textContent = user.email;
      
      // إنشاء سجل المستخدم إذا لم يكن موجوداً
      db.collection('users').doc(user.uid).set({
        email: user.email,
        displayName: user.displayName,
        approved: false,
        createdAt: new Date(),
        lastLogin: new Date()
      }, { merge: true });
    }
  }).catch(error => {
    console.error('Error checking user approval:', error);
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('unauthorizedScreen').style.display = 'flex';
    document.getElementById('userEmail').textContent = user.email;
  });
}

// ===== دالة تسجيل الخروج =====
function logoutUser() {
  if (authMode === 'firebase' && firebaseInitialized) {
    firebase.auth().signOut().then(() => {
      currentUser = null;
      isLoggedIn = false;
      authMode = 'local';
      localStorage.removeItem('currentUser');
      showLoginScreen();
      setStatus('تم تسجيل الخروج بنجاح');
    }).catch(error => {
      console.error('Error signing out:', error);
    });
  } else {
    // تسجيل الخروج المحلي
    currentUser = null;
    isLoggedIn = false;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('rememberMe');
    showLoginScreen();
    setStatus('تم تسجيل الخروج بنجاح');
  }
}

// ===== دالة تحميل البيانات من Firebase =====
function loadDataFromFirebase() {
  if (!currentUser || !db || authMode !== 'firebase') return;

  const userId = currentUser.id;
  
  // تحميل الزبائن
  db.collection('users').doc(userId).collection('customers').get().then(snapshot => {
    customers = [];
    snapshot.forEach(doc => {
      customers.push(doc.data());
    });
    renderCustomerList();
  });

  // تحميل الفواتير
  db.collection('users').doc(userId).collection('invoices').get().then(snapshot => {
    savedInvoices = [];
    snapshot.forEach(doc => {
      savedInvoices.push(doc.data());
    });
    renderSavedInvoices();
  });
}

// ===== دالة حفظ البيانات في Firebase =====
function saveDataToFirebase() {
  if (!currentUser || !db || authMode !== 'firebase') return;

  const userId = currentUser.id;
  document.getElementById('syncStatus').textContent = '⏳ جاري المزامنة...';
  document.getElementById('syncStatus').className = 'sync-status syncing';

  // حفظ الزبائن
  customers.forEach(customer => {
    db.collection('users').doc(userId).collection('customers').doc(customer.id.toString()).set(customer);
  });

  // حفظ الفواتير
  savedInvoices.forEach(invoice => {
    db.collection('users').doc(userId).collection('invoices').doc(invoice.id.toString()).set(invoice);
  });

  setTimeout(() => {
    document.getElementById('syncStatus').textContent = '☁️ متزامن';
    document.getElementById('syncStatus').className = 'sync-status synced';
  }, 1000);
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
});
