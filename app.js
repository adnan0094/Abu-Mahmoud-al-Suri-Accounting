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
  // التحقق من تسجيل الدخول تم في auth.js
  // هنا نقوم بتهيئة البيانات فقط
  if (isLoggedIn) {
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
  }
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
  const phone = document.getElementById('newCustomerPhone').value.trim();
  const address = document.getElementById('newCustomerAddress').value.trim();

  if (!name) {
    alert('يرجى إدخال اسم الزبون');
    return;
  }

  const newCustomer = {
    id: Date.now(),
    name: name,
    phone: phone || '',
    address: address || '',
    createdAt: new Date().toISOString()
  };

  customers.push(newCustomer);
  saveDataToLocalStorage();
  
  if (authMode === 'firebase') {
    saveDataToFirebase();
  }

  setStatus(`تم إضافة الزبون: ${name}`);
  closeModal('addCustomerModal');
  renderCustomerList();
}

function renderCustomerList() {
  const list = document.getElementById('customerListModal');
  if (list) {
    renderCustomerListModal();
  }
}

function deleteCustomer(customerId) {
  const customer = customers.find(c => c.id === customerId);
  if (customer && confirm(`هل تريد حذف الزبون: ${customer.name}؟`)) {
    customers = customers.filter(c => c.id !== customerId);
    saveDataToLocalStorage();
    
    if (authMode === 'firebase') {
      saveDataToFirebase();
    }
    
    renderCustomersTable();
    setStatus(`تم حذف الزبون: ${customer.name}`);
  }
}

// ===== إدارة الفواتير =====
function newInvoice() {
  currentInvoiceId = null;
  selectedCustomerId = null;
  document.getElementById('customerName').value = '';
  document.getElementById('invoiceNotes').value = '';
  document.getElementById('amountPaid').value = '0';
  
  setTodayDate();
  updateInvoiceNumber();
  
  // مسح جدول الفاتورة
  const tbody = document.getElementById('invoiceBody');
  tbody.innerHTML = '';
  addRow();
  
  calculateTotal();
  setStatus('فاتورة جديدة');
}

function addRow() {
  const tbody = document.getElementById('invoiceBody');
  const rowCount = tbody.rows.length;
  const row = tbody.insertRow();
  row.className = 'invoice-row';
  row.onclick = () => selectRow(row);

  row.innerHTML = `
    <td class="col-num">${rowCount + 1}</td>
    <td class="col-type">
      <select class="table-select" onchange="calculateTotal()">
        <option value="">اختر صنف</option>
        ${commonItems.map(item => `<option value="${item}">${item}</option>`).join('')}
      </select>
    </td>
    <td class="col-qty">
      <input type="number" class="table-input" min="0" step="0.01" value="0" onchange="calculateTotal()" onkeypress="handleEnter(event)">
    </td>
    <td class="col-price">
      <input type="number" class="table-input" min="0" step="0.01" value="0" onchange="calculateTotal()" onkeypress="handleEnter(event)">
    </td>
    <td class="col-total">
      <span class="total-cell">0</span>
    </td>
    <td class="col-action">
      <button class="delete-row-btn" onclick="deleteRow(this)">حذف</button>
    </td>
  `;
}

function selectRow(row) {
  const tbody = document.getElementById('invoiceBody');
  const rows = tbody.querySelectorAll('tr');
  rows.forEach(r => r.classList.remove('selected-row'));
  row.classList.add('selected-row');
  selectedRowIndex = Array.from(rows).indexOf(row);
}

function deleteRow(btn) {
  btn.closest('tr').remove();
  calculateTotal();
}

function deleteSelectedRow() {
  if (selectedRowIndex >= 0) {
    const tbody = document.getElementById('invoiceBody');
    tbody.rows[selectedRowIndex].remove();
    selectedRowIndex = -1;
    calculateTotal();
  }
}

function clearTable() {
  if (confirm('هل تريد مسح جميع الأصناف؟')) {
    const tbody = document.getElementById('invoiceBody');
    tbody.innerHTML = '';
    addRow();
    calculateTotal();
  }
}

function calculateTotal() {
  const tbody = document.getElementById('invoiceBody');
  const rows = tbody.querySelectorAll('tr');
  let grandTotal = 0;

  rows.forEach(row => {
    const qtyInput = row.querySelector('.col-qty input');
    const priceInput = row.querySelector('.col-price input');
    const totalCell = row.querySelector('.total-cell');

    const qty = parseFloat(qtyInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;
    const rowTotal = qty * price;

    totalCell.textContent = rowTotal.toFixed(2);
    grandTotal += rowTotal;
  });

  document.getElementById('grandTotal').textContent = grandTotal.toFixed(2);
  calculateBalance();
}

function calculateBalance() {
  const grandTotal = parseFloat(document.getElementById('grandTotal').textContent) || 0;
  const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
  const balance = grandTotal - amountPaid;

  document.getElementById('balance').textContent = balance.toFixed(2);
}

function saveInvoice() {
  const customerName = document.getElementById('customerName').value;
  const invoiceNumber = document.getElementById('invoiceNumber').value;
  const invoiceDate = document.getElementById('invoiceDate').value;
  const invoiceType = document.getElementById('invoiceType').value;
  const notes = document.getElementById('invoiceNotes').value;
  const grandTotal = parseFloat(document.getElementById('grandTotal').textContent) || 0;
  const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
  const balance = parseFloat(document.getElementById('balance').textContent) || 0;

  if (!customerName) {
    alert('يرجى اختيار زبون');
    return;
  }

  if (grandTotal === 0) {
    alert('يرجى إضافة أصناف للفاتورة');
    return;
  }

  const tbody = document.getElementById('invoiceBody');
  const items = [];
  tbody.querySelectorAll('tr').forEach(row => {
    const type = row.querySelector('.col-type select').value;
    const qty = parseFloat(row.querySelector('.col-qty input').value) || 0;
    const price = parseFloat(row.querySelector('.col-price input').value) || 0;
    
    if (type && qty > 0 && price > 0) {
      items.push({ type, qty, price });
    }
  });

  const invoice = {
    id: currentInvoiceId || Date.now(),
    customerName: customerName,
    customerId: selectedCustomerId,
    invoiceNumber: invoiceNumber,
    invoiceDate: invoiceDate,
    invoiceType: invoiceType,
    items: items,
    notes: notes,
    grandTotal: grandTotal,
    amountPaid: amountPaid,
    balance: balance,
    savedAt: new Date().toISOString()
  };

  const existingIndex = savedInvoices.findIndex(inv => inv.id === currentInvoiceId);
  if (existingIndex >= 0) {
    savedInvoices[existingIndex] = invoice;
  } else {
    savedInvoices.push(invoice);
  }

  saveDataToLocalStorage();
  
  if (authMode === 'firebase') {
    saveDataToFirebase();
  }

  currentInvoiceId = invoice.id;
  setStatus(`تم حفظ الفاتورة رقم ${invoiceNumber}`);
  renderSavedInvoices();
}

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
    item.innerHTML = `
      <div class="saved-invoice-num">فاتورة #${invoice.invoiceNumber}</div>
      <div style="font-size:10px; color:#666;">${invoice.customerName}</div>
      <div style="font-size:10px; color:#999;">${invoice.invoiceDate}</div>
    `;
    item.onclick = () => loadInvoice(invoice.id);
    list.appendChild(item);
  });
}

function loadInvoice(invoiceId) {
  const invoice = savedInvoices.find(inv => inv.id === invoiceId);
  if (!invoice) return;

  currentInvoiceId = invoiceId;
  selectedCustomerId = invoice.customerId;
  
  document.getElementById('customerName').value = invoice.customerName;
  document.getElementById('invoiceNumber').value = invoice.invoiceNumber;
  document.getElementById('invoiceDate').value = invoice.invoiceDate;
  document.getElementById('invoiceType').value = invoice.invoiceType;
  document.getElementById('invoiceNotes').value = invoice.notes;
  document.getElementById('amountPaid').value = invoice.amountPaid;

  const tbody = document.getElementById('invoiceBody');
  tbody.innerHTML = '';

  invoice.items.forEach((item, index) => {
    addRow();
    const row = tbody.rows[index];
    row.querySelector('.col-type select').value = item.type;
    row.querySelector('.col-qty input').value = item.qty;
    row.querySelector('.col-price input').value = item.price;
  });

  calculateTotal();
  renderSavedInvoices();
  setStatus(`تم تحميل الفاتورة رقم ${invoice.invoiceNumber}`);
}

function deleteInvoice(invoiceId) {
  const invoice = savedInvoices.find(inv => inv.id === invoiceId);
  if (invoice && confirm(`هل تريد حذف الفاتورة رقم ${invoice.invoiceNumber}؟`)) {
    savedInvoices = savedInvoices.filter(inv => inv.id !== invoiceId);
    saveDataToLocalStorage();
    
    if (authMode === 'firebase') {
      saveDataToFirebase();
    }
    
    if (currentInvoiceId === invoiceId) {
      newInvoice();
    }
    renderSavedInvoices();
    setStatus(`تم حذف الفاتورة رقم ${invoice.invoiceNumber}`);
  }
}

// ===== الزبائن =====
function showCustomers() {
  renderCustomersTable();
  document.getElementById('customersListModal').style.display = 'flex';
}

function renderCustomersTable() {
  const tbody = document.getElementById('customersTableBody');
  tbody.innerHTML = '';

  if (customers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">لا توجد زبائن</td></tr>';
    return;
  }

  customers.forEach((customer, index) => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${customer.name}</td>
      <td>${customer.phone || '-'}</td>
      <td>
        <button class="btn-delete-invoice" onclick="deleteCustomer(${customer.id})">حذف</button>
      </td>
    `;
  });
}

// ===== التقارير =====
function showReports() {
  const content = document.getElementById('reportsContent');
  content.innerHTML = '';

  if (savedInvoices.length === 0) {
    content.innerHTML = '<p style="text-align:center; color:#999;">لا توجد فواتير لعرض التقارير</p>';
    document.getElementById('reportsModal').style.display = 'flex';
    return;
  }

  let totalSales = 0;
  let totalPaid = 0;
  let totalBalance = 0;
  const customerSales = {};

  savedInvoices.forEach(invoice => {
    if (invoice.invoiceType === 'بيع') {
      totalSales += invoice.grandTotal;
      totalPaid += invoice.amountPaid;
      totalBalance += invoice.balance;

      if (!customerSales[invoice.customerName]) {
        customerSales[invoice.customerName] = 0;
      }
      customerSales[invoice.customerName] += invoice.grandTotal;
    }
  });

  let html = `
    <div style="margin-bottom:20px;">
      <h3>ملخص المبيعات</h3>
      <table class="customers-table" style="width:100%;">
        <tr>
          <td><strong>إجمالي المبيعات:</strong></td>
          <td>${totalSales.toFixed(2)}</td>
        </tr>
        <tr>
          <td><strong>المدفوع:</strong></td>
          <td>${totalPaid.toFixed(2)}</td>
        </tr>
        <tr>
          <td><strong>المتبقي:</strong></td>
          <td>${totalBalance.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div>
      <h3>المبيعات حسب الزبون</h3>
      <table class="customers-table" style="width:100%;">
        <thead>
          <tr>
            <th>اسم الزبون</th>
            <th>المبيعات</th>
          </tr>
        </thead>
        <tbody>
  `;

  Object.entries(customerSales).forEach(([customer, sales]) => {
    html += `<tr><td>${customer}</td><td>${sales.toFixed(2)}</td></tr>`;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  content.innerHTML = html;
  document.getElementById('reportsModal').style.display = 'flex';
}

// ===== تصدير البيانات =====
function exportData() {
  const data = {
    customers: customers,
    invoices: savedInvoices,
    exportDate: new Date().toISOString()
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `accounting_data_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  setStatus('تم تصدير البيانات بنجاح');
}

// ===== طباعة الفاتورة =====
function printInvoice() {
  if (!currentInvoiceId) {
    alert('يرجى اختيار فاتورة للطباعة');
    return;
  }

  const invoice = savedInvoices.find(inv => inv.id === currentInvoiceId);
  if (!invoice) return;

  const printWindow = window.open('', '', 'width=800,height=600');
  let html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة #${invoice.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; }
        .invoice-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .invoice-info div { flex: 1; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        th { background: #0a246a; color: white; }
        .total-row { font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>برنامج أبو محمود السوري للمحاسبة</h1>
        <p>فاتورة رقم: ${invoice.invoiceNumber}</p>
      </div>

      <div class="invoice-info">
        <div>
          <strong>الزبون:</strong> ${invoice.customerName}<br>
          <strong>النوع:</strong> ${invoice.invoiceType}<br>
          <strong>التاريخ:</strong> ${invoice.invoiceDate}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>الصنف</th>
            <th>الكمية</th>
            <th>السعر</th>
            <th>المجموع</th>
          </tr>
        </thead>
        <tbody>
  `;

  invoice.items.forEach((item, index) => {
    const itemTotal = item.qty * item.price;
    html += `
      <tr>
        <td>${index + 1}</td>
        <td>${item.type}</td>
        <td>${item.qty}</td>
        <td>${item.price.toFixed(2)}</td>
        <td>${itemTotal.toFixed(2)}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>

      <div style="text-align: left; margin-bottom: 20px;">
        <div class="total-row">إجمالي المبيعات: ${invoice.grandTotal.toFixed(2)}</div>
        <div class="total-row">المدفوع: ${invoice.amountPaid.toFixed(2)}</div>
        <div class="total-row">المتبقي: ${invoice.balance.toFixed(2)}</div>
      </div>

      ${invoice.notes ? `<div><strong>ملاحظات:</strong> ${invoice.notes}</div>` : ''}

      <div class="footer">
        <p>شكراً لتعاملك معنا</p>
        <p>جميع الحقوق محفوظة © 2026</p>
      </div>

      <script>
        window.print();
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

// ===== حول البرنامج =====
function showAbout() {
  document.getElementById('aboutModal').style.display = 'flex';
}

// ===== إدارة النوافذ =====
function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// ===== شريط الحالة =====
function setStatus(message) {
  document.getElementById('statusMessage').textContent = message;
}

function updateStatusBar() {
  const invoiceCount = savedInvoices.length;
  const customerCount = customers.length;
  setStatus(`الفواتير: ${invoiceCount} | الزبائن: ${customerCount}`);
}

// ===== دوال مساعدة =====
function handleEnter(event) {
  if (event.key === 'Enter') {
    addRow();
  }
}
