// ===== إعدادات Firebase =====
// يجب استبدال هذه البيانات ببيانات مشروعك على Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let firebaseInitialized = false;
let currentUser = null;
let db = null;

// محاولة تهيئة Firebase
try {
  if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firebaseInitialized = true;
    
    firebase.auth().onAuthStateChanged(user => {
      currentUser = user;
      if (user) {
        document.getElementById('syncStatus').textContent = '☁️ متزامن';
        document.getElementById('syncStatus').className = 'sync-status synced';
        loadDataFromFirebase();
      } else {
        document.getElementById('syncStatus').textContent = '';
      }
    });
  }
} catch (e) {
  console.log('Firebase not configured');
}

// ===== بيانات البرنامج =====
let customers = [];
let savedInvoices = [];
let currentInvoiceId = null;
let selectedCustomerId = null;
let selectedRowIndex = -1;
let invoiceCounter = 1001;

// أنواع الأصناف الشائعة
const commonItems = [
  'أرز', 'سكر', 'طحين', 'زيت', 'ملح', 'شاي', 'قهوة', 'حليب',
  'خبز', 'بيض', 'دجاج', 'لحم', 'سمك', 'خضروات', 'فواكه',
  'مشروبات', 'عصير', 'ماء', 'صابون', 'شامبو', 'معجون أسنان',
  'مناديل', 'أكياس', 'علب', 'أخرى'
];

// وحدات القياس
const units = ['كغ', 'غ', 'لتر', 'مل', 'قطعة', 'علبة', 'كرتون', 'كيس', 'متر', 'دزينة'];

// ===== تهيئة البرنامج =====
document.addEventListener('DOMContentLoaded', function() {
  loadDataFromLocalStorage();
  setTodayDate();
  renderSavedInvoices();
  updateStatusBar();
  addRow();
  updateInvoiceNumber();

  // إغلاق القوائم عند النقر خارجها
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.title-bar-controls') && !e.target.closest('.menu-dropdown')) {
      closeMenu('mainMenu');
    }
  });
});

// ===== تحميل البيانات من localStorage =====
function loadDataFromLocalStorage() {
  const savedCustomers = localStorage.getItem('customers');
  const savedInvoicesList = localStorage.getItem('savedInvoices');
  const savedCounter = localStorage.getItem('invoiceCounter');

  customers = savedCustomers ? JSON.parse(savedCustomers) : [];
  savedInvoices = savedInvoicesList ? JSON.parse(savedInvoicesList) : [];
  invoiceCounter = savedCounter ? parseInt(savedCounter) : 1001;
}

// ===== حفظ البيانات في localStorage =====
function saveDataToLocalStorage() {
  localStorage.setItem('customers', JSON.stringify(customers));
  localStorage.setItem('savedInvoices', JSON.stringify(savedInvoices));
  localStorage.setItem('invoiceCounter', invoiceCounter.toString());
}

// ===== تحميل البيانات من Firebase =====
function loadDataFromFirebase() {
  if (!currentUser || !db) return;

  const userId = currentUser.uid;
  
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

// ===== حفظ البيانات في Firebase =====
function saveDataToFirebase() {
  if (!currentUser || !db) return;

  const userId = currentUser.uid;
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

// ===== تاريخ اليوم =====
function setTodayDate() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  document.getElementById('invoiceDate').value = dateStr;
}

// ===== رقم الفاتورة =====
function updateInvoiceNumber() {
  document.getElementById('invoiceNumber').value = invoiceCounter;
}

// ===== إدارة القوائم =====
function toggleMenu(menuId) {
  const menu = document.getElementById(menuId);
  menu.classList.toggle('active');
}

function closeMenu(menuId) {
  const menu = document.getElementById(menuId);
  menu.classList.remove('active');
}

// ===== نافذة اختيار الزبون =====
function showCustomerSelector() {
  renderCustomerListModal();
  document.getElementById('customerSelectorModal').style.display = 'flex';
}

function renderCustomerListModal() {
  const list = document.getElementById('customerListModal');
  list.innerHTML = '';

  if (customers.length === 0) {
    list.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">لا توجد زبائن. أضف زبون جديد أولاً.</div>';
    return;
  }

  customers.forEach(customer => {
    const item = document.createElement('div');
    item.className = 'customer-item' + (customer.id === selectedCustomerId ? ' selected' : '');
    item.innerHTML = `
      <div><strong>${customer.name}</strong></div>
      <div style="font-size:11px; color:#666;">${customer.phone || 'بدون هاتف'}</div>
    `;
    item.onclick = () => {
      selectCustomer(customer.id);
      closeModal('customerSelectorModal');
    };
    list.appendChild(item);
  });
}

function searchCustomers() {
  const query = document.getElementById('customerSearchInput').value.toLowerCase();
  const list = document.getElementById('customerListModal');
  list.innerHTML = '';

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(query) || (c.phone && c.phone.includes(query))
  );

  if (filtered.length === 0) {
    list.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">لا توجد نتائج.</div>';
    return;
  }

  filtered.forEach(customer => {
    const item = document.createElement('div');
    item.className = 'customer-item' + (customer.id === selectedCustomerId ? ' selected' : '');
    item.innerHTML = `
      <div><strong>${customer.name}</strong></div>
      <div style="font-size:11px; color:#666;">${customer.phone || 'بدون هاتف'}</div>
    `;
    item.onclick = () => {
      selectCustomer(customer.id);
      closeModal('customerSelectorModal');
    };
    list.appendChild(item);
  });
}

function selectCustomer(customerId) {
  selectedCustomerId = customerId;
  const customer = customers.find(c => c.id === customerId);
  if (customer) {
    document.getElementById('customerName').value = customer.name;
    setStatus(`تم تحديد الزبون: ${customer.name}`);
  }
}

// ===== إضافة زبون جديد =====
function addNewCustomerModal() {
  document.getElementById('newCustomerName').value = '';
  document.getElementById('newCustomerPhone').value = '';
  document.getElementById('newCustomerAddress').value = '';
  closeModal('customerSelectorModal');
  document.getElementById('addCustomerModal').style.display = 'flex';
}

function saveNewCustomer() {
  const name = document.getElementById('newCustomerName').value.trim();
  if (!name) {
    alert('يرجى إدخال اسم الزبون');
    return;
  }

  const newCustomer = {
    id: Date.now(),
    name: name,
    phone: document.getElementById('newCustomerPhone').value.trim(),
    address: document.getElementById('newCustomerAddress').value.trim()
  };

  customers.push(newCustomer);
  saveDataToLocalStorage();
  if (currentUser) saveDataToFirebase();
  
  closeModal('addCustomerModal');
  selectCustomer(newCustomer.id);
  setStatus(`تم إضافة الزبون: ${name}`);
}

// ===== إدارة صفوف الجدول =====
let rowIdCounter = 0;

function addRow() {
  const tbody = document.getElementById('invoiceBody');
  const rowIndex = tbody.rows.length + 1;
  rowIdCounter++;
  const rid = rowIdCounter;

  const tr = document.createElement('tr');
  tr.id = `row-${rid}`;
  tr.onclick = () => selectRow(rid);

  tr.innerHTML = `
    <td class="col-num">${rowIndex}</td>
    <td class="col-type">
      <input type="text" class="table-input" id="type-${rid}" list="itemsList"
        placeholder="النوع" onchange="calculateRowTotal(${rid})" oninput="calculateRowTotal(${rid})">
    </td>
    <td class="col-qty">
      <input type="number" class="table-input" id="qty-${rid}" value="0" min="0" step="0.001"
        onchange="calculateRowTotal(${rid})" oninput="calculateRowTotal(${rid})">
    </td>
    <td class="col-price">
      <input type="number" class="table-input" id="price-${rid}" value="0" min="0" step="0.01"
        onchange="calculateRowTotal(${rid})" oninput="calculateRowTotal(${rid})">
    </td>
    <td class="col-total total-cell" id="total-${rid}">0</td>
    <td class="col-action">
      <button class="delete-row-btn" onclick="deleteRow(${rid}, event)">✕</button>
    </td>
  `;

  tbody.appendChild(tr);
  updateRowNumbers();
  updateStatusBar();
}

function selectRow(rid) {
  document.querySelectorAll('.invoice-table tbody tr').forEach(tr => {
    tr.classList.remove('selected-row');
  });
  const row = document.getElementById(`row-${rid}`);
  if (row) {
    row.classList.add('selected-row');
    selectedRowIndex = rid;
  }
}

function deleteRow(rid, event) {
  if (event) event.stopPropagation();
  const row = document.getElementById(`row-${rid}`);
  if (row) {
    row.remove();
    updateRowNumbers();
    calculateTotals();
    updateStatusBar();
    setStatus('تم حذف السطر');
  }
}

function deleteSelectedRow() {
  if (selectedRowIndex >= 0) {
    deleteRow(selectedRowIndex, null);
    selectedRowIndex = -1;
  } else {
    setStatus('يرجى تحديد سطر أولاً');
  }
}

function updateRowNumbers() {
  const rows = document.querySelectorAll('#invoiceBody tr');
  rows.forEach((tr, index) => {
    tr.querySelector('td:first-child').textContent = index + 1;
  });
}

function clearTable() {
  if (confirm('هل تريد مسح جميع الأصناف؟')) {
    document.getElementById('invoiceBody').innerHTML = '';
    rowIdCounter = 0;
    calculateTotals();
    updateStatusBar();
    addRow();
    setStatus('تم مسح الجدول');
  }
}

// ===== حساب المجاميع =====
function calculateRowTotal(rid) {
  const qty = parseFloat(document.getElementById(`qty-${rid}`)?.value) || 0;
  const price = parseFloat(document.getElementById(`price-${rid}`)?.value) || 0;

  const total = qty * price;

  const totalCell = document.getElementById(`total-${rid}`);
  if (totalCell) {
    totalCell.textContent = formatNumber(total);
  }

  calculateTotals();
}

// دالة لتنسيق الأرقام: إزالة أول 3 أصفار (الآلاف)
function formatNumber(num) {
  if (num === 0) return '0';
  
  // تحويل الرقم إلى نص
  let numStr = num.toFixed(2);
  
  // إزالة الأصفار الزائدة من اليمين
  numStr = numStr.replace(/\.?0+$/, '');
  
  // إزالة أول 3 أصفار من اليسار (الآلاف) إن وجدت
  // مثلاً: 1000 يصبح 1، 5000 يصبح 5، 10000 يصبح 10
  if (numStr.includes('.')) {
    // إذا كان الرقم يحتوي على فاصلة عشرية، لا نزيل الأصفار
    return numStr;
  } else {
    // إزالة آخر 3 أصفار من الرقم الصحيح
    if (numStr.endsWith('000')) {
      numStr = numStr.slice(0, -3);
    }
  }
  
  return numStr;
}

function calculateTotals() {
  const rows = document.querySelectorAll('#invoiceBody tr');
  let grandTotal = 0;

  rows.forEach(tr => {
    const rid = tr.id.replace('row-', '');
    const qty = parseFloat(document.getElementById(`qty-${rid}`)?.value) || 0;
    const price = parseFloat(document.getElementById(`price-${rid}`)?.value) || 0;

    grandTotal += qty * price;
  });

  const grandTotalEl = document.getElementById('grandTotal');
  grandTotalEl.textContent = formatNumber(grandTotal);

  calculateBalance();
}

function calculateBalance() {
  // الحصول على القيم الفعلية من الحسابات (قبل التنسيق)
  const rows = document.querySelectorAll('#invoiceBody tr');
  let actualGrandTotal = 0;
  
  rows.forEach(tr => {
    const rid = tr.id.replace('row-', '');
    const qty = parseFloat(document.getElementById(`qty-${rid}`)?.value) || 0;
    const price = parseFloat(document.getElementById(`price-${rid}`)?.value) || 0;
    actualGrandTotal += qty * price;
  });
  
  const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
  const balance = actualGrandTotal - amountPaid;

  const balanceEl = document.getElementById('balance');
  balanceEl.textContent = formatNumber(balance);
  balanceEl.style.color = balance > 0 ? '#cc0000' : (balance < 0 ? '#006600' : '#000');
}

// ===== حفظ الفاتورة =====
function saveInvoice() {
  const customerName = document.getElementById('customerName').value.trim();
  if (!customerName) {
    alert('يرجى تحديد اسم الزبون أولاً');
    return;
  }

  const rows = document.querySelectorAll('#invoiceBody tr');
  const items = [];

  rows.forEach(tr => {
    const rid = tr.id.replace('row-', '');
    const type = document.getElementById(`type-${rid}`)?.value || '';
    const qty = parseFloat(document.getElementById(`qty-${rid}`)?.value) || 0;
    const price = parseFloat(document.getElementById(`price-${rid}`)?.value) || 0;

    if (type || qty > 0 || price > 0) {
      items.push({
        type: type,
        qty: qty,
        price: price,
        total: qty * price
      });
    }
  });

  const invoice = {
    id: currentInvoiceId || Date.now(),
    number: document.getElementById('invoiceNumber').value,
    date: document.getElementById('invoiceDate').value,
    type: document.getElementById('invoiceType').value,
    customerId: selectedCustomerId,
    customerName: customerName,
    items: items,
    notes: document.getElementById('invoiceNotes').value,
    grandTotal: parseFloat(document.getElementById('grandTotal').textContent) || 0,
    amountPaid: parseFloat(document.getElementById('amountPaid').value) || 0,
    balance: parseFloat(document.getElementById('balance').textContent) || 0,
    savedAt: new Date().toISOString()
  };

  if (currentInvoiceId) {
    const idx = savedInvoices.findIndex(inv => inv.id === currentInvoiceId);
    if (idx >= 0) {
      savedInvoices[idx] = invoice;
    }
  } else {
    savedInvoices.unshift(invoice);
    currentInvoiceId = invoice.id;
    invoiceCounter++;
  }

  saveDataToLocalStorage();
  if (currentUser) saveDataToFirebase();
  
  renderSavedInvoices();
  setStatus(`تم حفظ الفاتورة رقم ${invoice.number}`);
  alert(`تم حفظ الفاتورة!\nرقم: ${invoice.number}\nالزبون: ${customerName}\nالإجمالي: ${invoice.grandTotal}`);
}

// ===== فاتورة جديدة =====
function newInvoice() {
  if (confirm('هل تريد إنشاء فاتورة جديدة؟')) {
    currentInvoiceId = null;
    selectedCustomerId = null;
    document.getElementById('customerName').value = '';
    document.getElementById('invoiceNotes').value = '';
    document.getElementById('amountPaid').value = '0';
    document.getElementById('invoiceBody').innerHTML = '';
    rowIdCounter = 0;
    updateInvoiceNumber();
    setTodayDate();
    calculateTotals();
    addRow();
    setStatus('فاتورة جديدة');

    document.querySelectorAll('.saved-invoice-item').forEach(el => el.classList.remove('active'));
  }
}

// ===== عرض الفواتير المحفوظة =====
function renderSavedInvoices() {
  const list = document.getElementById('savedInvoicesList');
  list.innerHTML = '';

  if (savedInvoices.length === 0) {
    list.innerHTML = '<div style="padding:10px; text-align:center; color:#999; font-size:11px;">لا توجد فواتير</div>';
    return;
  }

  savedInvoices.forEach(invoice => {
    const item = document.createElement('div');
    item.className = 'saved-invoice-item' + (invoice.id === currentInvoiceId ? ' active' : '');
    item.onclick = () => loadInvoice(invoice.id);
    item.innerHTML = `
      <div class="saved-invoice-num">فاتورة #${invoice.number}</div>
      <div style="font-size:10px; color:#666;">${invoice.customerName}</div>
      <div style="font-size:10px; font-weight:bold; color:#0a246a;">${invoice.grandTotal}</div>
    `;
    list.appendChild(item);
  });
}

// ===== تحميل فاتورة محفوظة =====
function loadInvoice(invoiceId) {
  const invoice = savedInvoices.find(inv => inv.id === invoiceId);
  if (!invoice) return;

  currentInvoiceId = invoiceId;
  selectedCustomerId = invoice.customerId;

  document.getElementById('invoiceNumber').value = invoice.number;
  document.getElementById('invoiceDate').value = invoice.date;
  document.getElementById('invoiceType').value = invoice.type;
  document.getElementById('customerName').value = invoice.customerName;
  document.getElementById('invoiceNotes').value = invoice.notes || '';
  document.getElementById('amountPaid').value = invoice.amountPaid || 0;

  document.getElementById('invoiceBody').innerHTML = '';
  rowIdCounter = 0;

  invoice.items.forEach(item => {
    const rid = addRow();
    setTimeout(() => {
      const typeEl = document.getElementById(`type-${rid}`);
      const qtyEl = document.getElementById(`qty-${rid}`);
      const priceEl = document.getElementById(`price-${rid}`);

      if (typeEl) typeEl.value = item.type;
      if (qtyEl) qtyEl.value = item.qty;
      if (priceEl) priceEl.value = item.price;
      calculateRowTotal(rid);
    }, 10);
  });

  renderSavedInvoices();
  setStatus(`تم تحميل الفاتورة رقم ${invoice.number}`);
}

// ===== طباعة الفاتورة =====
function printInvoice() {
  const customerName = document.getElementById('customerName').value.trim();
  if (!customerName) {
    alert('يرجى تحديد اسم الزبون أولاً');
    return;
  }

  const printWindow = window.open('', '_blank');
  const invoiceNum = document.getElementById('invoiceNumber').value;
  const invoiceDate = document.getElementById('invoiceDate').value;
  const invoiceType = document.getElementById('invoiceType').value;
  const notes = document.getElementById('invoiceNotes').value;
  const grandTotal = document.getElementById('grandTotal').textContent;
  const amountPaid = document.getElementById('amountPaid').value;
  const balance = document.getElementById('balance').textContent;

  const rows = document.querySelectorAll('#invoiceBody tr');
  let itemsHTML = '';
  let rowNum = 1;

  rows.forEach(tr => {
    const rid = tr.id.replace('row-', '');
    const type = document.getElementById(`type-${rid}`)?.value || '';
    const qty = document.getElementById(`qty-${rid}`)?.value || '0';
    const price = document.getElementById(`price-${rid}`)?.value || '0';
    const total = document.getElementById(`total-${rid}`)?.textContent || '0';

    if (type || parseFloat(qty) > 0) {
      itemsHTML += `
        <tr>
          <td>${rowNum++}</td>
          <td>${type}</td>
          <td>${qty}</td>
          <td>${price}</td>
          <td><strong>${total}</strong></td>
        </tr>
      `;
    }
  });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة رقم ${invoiceNum}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 13px; direction: rtl; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .header h1 { font-size: 18px; margin: 0; }
        .info { margin-bottom: 15px; }
        .info div { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th { background: #333; color: white; padding: 8px; text-align: center; border: 1px solid #000; }
        td { padding: 6px; border: 1px solid #ccc; text-align: center; }
        tr:nth-child(even) { background: #f5f5f5; }
        .totals { margin-top: 15px; }
        .total-row { font-weight: bold; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏪 برنامج أبو محمود السوري للمحاسبة</h1>
        <h2>${invoiceType === 'بيع' ? 'فاتورة مبيعات' : invoiceType === 'شراء' ? 'فاتورة مشتريات' : 'فاتورة مرتجع'}</h2>
      </div>

      <div class="info">
        <div><strong>رقم الفاتورة:</strong> ${invoiceNum}</div>
        <div><strong>التاريخ:</strong> ${invoiceDate}</div>
        <div><strong>اسم الزبون:</strong> ${customerName}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>النوع</th>
            <th>الكمية</th>
            <th>السعر</th>
            <th>المجموع</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row">الإجمالي: ${grandTotal}</div>
        <div>المبلغ المدفوع: ${amountPaid}</div>
        <div style="color:red;">المتبقي: ${balance}</div>
      </div>

      ${notes ? `<div style="margin-top:15px;"><strong>ملاحظات:</strong> ${notes}</div>` : ''}

      <div style="margin-top:30px; text-align:center; font-size:11px; color:#666; border-top:1px solid #ccc; padding-top:10px;">
        <p>شكراً لتعاملكم معنا</p>
        <p>تم الطباعة بتاريخ: ${new Date().toLocaleDateString('ar-SY')}</p>
      </div>

      <script>window.onload = function() { window.print(); }<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// ===== تصدير البيانات =====
function exportData() {
  if (savedInvoices.length === 0) {
    alert('لا توجد فواتير محفوظة للتصدير');
    return;
  }

  let csv = 'رقم الفاتورة,التاريخ,اسم الزبون,النوع,الإجمالي,المدفوع,المتبقي\n';
  savedInvoices.forEach(inv => {
    csv += `${inv.number},${inv.date},${inv.customerName},${inv.type},${inv.grandTotal},${inv.amountPaid},${inv.balance}\n`;
  });

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `فواتير_${new Date().toLocaleDateString('ar-SY').replace(/\//g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus('تم تصدير البيانات');
}

// ===== عرض التقارير =====
function showReports() {
  if (savedInvoices.length === 0) {
    alert('لا توجد فواتير محفوظة');
    return;
  }

  const totalSales = savedInvoices.filter(i => i.type === 'بيع').reduce((sum, i) => sum + i.grandTotal, 0);
  const totalPurchases = savedInvoices.filter(i => i.type === 'شراء').reduce((sum, i) => sum + i.grandTotal, 0);
  const totalBalance = savedInvoices.reduce((sum, i) => sum + i.balance, 0);

  const customerStats = {};
  savedInvoices.forEach(inv => {
    if (!customerStats[inv.customerName]) {
      customerStats[inv.customerName] = { total: 0, count: 0 };
    }
    customerStats[inv.customerName].total += inv.grandTotal;
    customerStats[inv.customerName].count++;
  });

  const topCustomers = Object.entries(customerStats)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10);

  let html = `
    <div style="display:flex; gap:10px; margin-bottom:15px; flex-wrap:wrap;">
      <div style="background:#e8f4fd; border:1px solid #4a7ab5; padding:10px; text-align:center; flex:1;">
        <div style="font-size:11px; color:#555;">إجمالي المبيعات</div>
        <div style="font-size:16px; font-weight:bold; color:#0a246a;">${totalSales}</div>
      </div>
      <div style="background:#e8fde8; border:1px solid #4ab54a; padding:10px; text-align:center; flex:1;">
        <div style="font-size:11px; color:#555;">إجمالي المشتريات</div>
        <div style="font-size:16px; font-weight:bold; color:#006600;">${totalPurchases}</div>
      </div>
      <div style="background:#fde8e8; border:1px solid #b54a4a; padding:10px; text-align:center; flex:1;">
        <div style="font-size:11px; color:#555;">إجمالي الديون</div>
        <div style="font-size:16px; font-weight:bold; color:#cc0000;">${totalBalance}</div>
      </div>
    </div>

    <h3 style="margin-bottom:8px;">أفضل الزبائن</h3>
    <table style="width:100%; border-collapse:collapse; font-size:12px;">
      <thead>
        <tr style="background:#333; color:white;">
          <th style="padding:6px; border:1px solid #000;">#</th>
          <th style="padding:6px; border:1px solid #000;">اسم الزبون</th>
          <th style="padding:6px; border:1px solid #000;">عدد الفواتير</th>
          <th style="padding:6px; border:1px solid #000;">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${topCustomers.map(([name, stats], idx) => `
          <tr style="background:${idx % 2 === 0 ? '#f5f9ff' : 'white'};">
            <td style="padding:6px; border:1px solid #ccc;">${idx + 1}</td>
            <td style="padding:6px; border:1px solid #ccc;">${name}</td>
            <td style="padding:6px; border:1px solid #ccc; text-align:center;">${stats.count}</td>
            <td style="padding:6px; border:1px solid #ccc; text-align:center; font-weight:bold;">${stats.total}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  document.getElementById('reportsContent').innerHTML = html;
  document.getElementById('reportsModal').style.display = 'flex';
}

// ===== عرض قائمة الزبائن =====
function showCustomers() {
  const tbody = document.getElementById('customersTableBody');
  tbody.innerHTML = '';

  if (customers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:20px; text-align:center; color:#999;">لا توجد زبائن. أضف زبون جديد.</td></tr>';
  } else {
    customers.forEach((customer, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${customer.name}</td>
        <td>${customer.phone || '-'}</td>
        <td>
          <button onclick="deleteCustomer(${customer.id})" style="padding:4px 8px; cursor:pointer; font-size:11px; color:red;">حذف</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById('customersListModal').style.display = 'flex';
}

function deleteCustomer(customerId) {
  if (confirm('هل تريد حذف هذا الزبون؟')) {
    customers = customers.filter(c => c.id !== customerId);
    saveDataToLocalStorage();
    if (currentUser) saveDataToFirebase();
    showCustomers();
    setStatus('تم حذف الزبون');
  }
}

// ===== تسجيل الدخول بـ Google =====
function showLoginModal() {
  if (!firebaseInitialized) {
    alert('Firebase لم يتم تكوينه. يرجى قراءة التعليمات في README.md');
    return;
  }
  document.getElementById('loginModal').style.display = 'flex';
}

function showAbout() {
  document.getElementById('aboutModal').style.display = 'flex';
}

// ===== إغلاق النوافذ المنبثقة =====
function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// ===== شريط الحالة =====
function setStatus(message) {
  document.getElementById('statusMessage').textContent = message;
}

function updateStatusBar() {
  const rowCount = document.querySelectorAll('#invoiceBody tr').length;
  // يتم تحديثه في شريط الحالة
}

// ===== قائمة الأصناف الشائعة =====
const datalist = document.createElement('datalist');
datalist.id = 'itemsList';
commonItems.forEach(item => {
  const option = document.createElement('option');
  option.value = item;
  datalist.appendChild(option);
});
document.body.appendChild(datalist);

// ===== اختصارات لوحة المفاتيح =====
document.addEventListener('keydown', function(e) {
  if (e.key === 'F2') {
    addRow();
    e.preventDefault();
  } else if (e.key === 'F5') {
    newInvoice();
    e.preventDefault();
  } else if (e.key === 'F9') {
    saveInvoice();
    e.preventDefault();
  } else if (e.key === 'F8') {
    printInvoice();
    e.preventDefault();
  }
});
