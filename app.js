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
    // updateInvoiceNumber() لا تحتاج للعرض بعد الآن

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
  // توليد رقم الفاتورة بدون عرضه في الواجهة
  // الرقم يبقى محفوظاً في متغير invoiceCounter
  if (!document.getElementById('invoiceNumber')) {
    // إذا لم يكن الحقل موجوداً في الواجهة
    return invoiceCounter;
  }
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
    
    // توليد وتصدير PDF لكشف حساب الزبون
    setTimeout(() => {
      generateCustomerStatementPDF(customer);
    }, 500);
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
      <input type="text" class="table-input" placeholder="أدخل الصنف" onchange="calculateTotal()" onkeypress="handleEnter(event)">
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

    // عرض القيمة بدون أصفار إذا كانت صفراً
    totalCell.textContent = rowTotal === 0 ? '' : formatNumber(rowTotal);
    grandTotal += rowTotal;
  });

  document.getElementById('grandTotal').textContent = grandTotal === 0 ? '' : formatNumber(grandTotal);
  calculateBalance();
}

function calculateBalance() {
  // حساب الإجمالي من الصفوف مباشرة بدلاً من النص المنسق
  const tbody = document.getElementById('invoiceBody');
  const rows = tbody.querySelectorAll('tr');
  let grandTotal = 0;
  
  rows.forEach(row => {
    const qtyInput = row.querySelector('.col-qty input');
    const priceInput = row.querySelector('.col-price input');
    const qty = parseFloat(qtyInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;
    grandTotal += qty * price;
  });
  
  const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
  const balance = grandTotal - amountPaid;

  document.getElementById('balance').textContent = balance === 0 ? '' : formatNumber(balance);
}

// ===== دالة تنسيق الأرقام (إزالة الأصفار الثلاثة) =====
function formatNumber(num) {
  if (num === 0) return '';
  // عرض رقم بعلامات عشرية بدون الأصفار الزائدة
  return num.toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function saveInvoice() {
  const customerName = document.getElementById('customerName').value;
  const invoiceDate = document.getElementById('invoiceDate').value;
  const invoiceType = document.getElementById('invoiceType').value;
  const notes = document.getElementById('invoiceNotes').value;
  const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
  
  // حساب الإجمالي مباشرة من الصفوف
  const tbody = document.getElementById('invoiceBody');
  let grandTotal = 0;
  tbody.querySelectorAll('tr').forEach(row => {
    const qty = parseFloat(row.querySelector('.col-qty input').value) || 0;
    const price = parseFloat(row.querySelector('.col-price input').value) || 0;
    grandTotal += qty * price;
  });
  
  const balance = grandTotal - amountPaid;
  
  // توليد رقم الفاتورة تلقائياً
  const invoiceNumber = invoiceCounter;

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
    // جلب الصنف من input بدلاً من select
    const typeInput = row.querySelector('.col-type input');
    const type = typeInput ? typeInput.value : '';
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
    invoiceCounter++; // زيادة رقم الفاتورة للفاتورة القادمة
  }

  saveDataToLocalStorage();
  
  if (authMode === 'firebase') {
    saveDataToFirebase();
  }

  currentInvoiceId = invoice.id;
  setStatus(`تم حفظ الفاتورة رقم ${invoiceNumber}`);
  
  // مسح النموذج للبدء بفاتورة جديدة
  newInvoice();
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
  document.getElementById('invoiceDate').value = invoice.invoiceDate;
  document.getElementById('invoiceType').value = invoice.invoiceType;
  document.getElementById('invoiceNotes').value = invoice.notes;
  document.getElementById('amountPaid').value = invoice.amountPaid;

  const tbody = document.getElementById('invoiceBody');
  tbody.innerHTML = '';

  invoice.items.forEach((item, index) => {
    addRow();
    const row = tbody.rows[index];
    // تعيين الصنف في input بدلاً من select
    const typeInput = row.querySelector('.col-type input');
    if (typeInput) {
      typeInput.value = item.type;
    }
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
          <td>${formatNumber(totalSales)}</td>
        </tr>
        <tr>
          <td><strong>المدفوع:</strong></td>
          <td>${formatNumber(totalPaid)}</td>
        </tr>
        <tr>
          <td><strong>المتبقي:</strong></td>
          <td>${formatNumber(totalBalance)}</td>
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
    html += `<tr><td>${customer}</td><td>${formatNumber(sales)}</td></tr>`;
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

  // توليد PDF احترافي
  generateInvoicePDF(invoice);
}

// دالة توليد PDF للفاتورة
function generateInvoicePDF(invoice) {
  let htmlContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>فاتورة #${invoice.invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Arial', sans-serif;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 900px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #0066cc;
          padding-bottom: 15px;
        }
        .header h1 {
          color: #0066cc;
          font-size: 28px;
          margin-bottom: 5px;
        }
        .header p {
          color: #666;
          font-size: 14px;
        }
        .invoice-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
          border-right: 4px solid #0066cc;
        }
        .invoice-info div {
          font-size: 14px;
          line-height: 1.8;
        }
        .invoice-info strong {
          color: #333;
          display: block;
          margin-bottom: 3px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          background-color: #0066cc;
          color: white;
          padding: 12px;
          text-align: right;
          font-weight: bold;
          font-size: 14px;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #ddd;
          font-size: 13px;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        tr:hover {
          background-color: #f0f8ff;
        }
        .totals {
          background-color: #e8f4f8;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
          text-align: left;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .total-row strong {
          font-weight: bold;
          color: #0066cc;
        }
        .notes {
          background-color: #fff9e6;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
          border-right: 4px solid #ffc107;
        }
        .footer {
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #ddd;
          padding-top: 20px;
          margin-top: 30px;
        }
        .print-buttons {
          text-align: center;
          padding: 20px;
          gap: 10px;
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
        }
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          transition: all 0.3s ease;
        }
        .btn-print {
          background-color: #0066cc;
          color: white;
        }
        .btn-print:hover {
          background-color: #0052a3;
        }
        .btn-download {
          background-color: #28a745;
          color: white;
        }
        .btn-download:hover {
          background-color: #218838;
        }
        .btn-close {
          background-color: #666;
          color: white;
        }
        .btn-close:hover {
          background-color: #555;
        }
        @media print {
          body {
            background-color: white;
            padding: 0;
          }
          .container {
            box-shadow: none;
            padding: 0;
          }
          .print-buttons {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📄 برنامج أبو محمود السوري للمحاسبة</h1>
          <p>فاتورة رقم: <strong>#${invoice.invoiceNumber}</strong></p>
        </div>

        <div class="invoice-info">
          <div>
            <strong>اسم الزبون:</strong> ${invoice.customerName}
          </div>
          <div>
            <strong>نوع الفاتورة:</strong> ${invoice.invoiceType || 'بدون نوع'}
          </div>
          <div>
            <strong>التاريخ:</strong> ${invoice.invoiceDate}
          </div>
          <div>
            <strong>وقت الحفظ:</strong> ${new Date(invoice.savedAt).toLocaleDateString('ar-SA')}
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
    htmlContent += `
      <tr>
        <td>${index + 1}</td>
        <td>${item.type}</td>
        <td>${item.qty}</td>
        <td>${formatNumber(item.price)}</td>
        <td>${formatNumber(itemTotal)}</td>
      </tr>
    `;
  });

  htmlContent += `
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>إجمالي المبيعات:</span>
            <strong>${formatNumber(invoice.grandTotal)}</strong>
          </div>
          <div class="total-row">
            <span>المدفوع:</span>
            <strong>${formatNumber(invoice.amountPaid)}</strong>
          </div>
          <div class="total-row">
            <span>المتبقي:</span>
            <strong>${formatNumber(invoice.balance)}</strong>
          </div>
        </div>
  `;

  if (invoice.notes) {
    htmlContent += `
      <div class="notes">
        <strong>ملاحظات:</strong>
        <p>${invoice.notes}</p>
      </div>
    `;
  }

  htmlContent += `
        <div class="footer">
          <p>شكراً لتعاملك معنا</p>
          <p>جميع الحقوق محفوظة © 2026</p>
        </div>
      </div>

      <div class="print-buttons">
        <button class="btn btn-print" onclick="window.print()">🖨️ طباعة</button>
        <button class="btn btn-download" onclick="downloadPDF()">💾 تحميل PDF</button>
        <button class="btn btn-close" onclick="window.close()">✖️ إغلاق</button>
      </div>

      <script>
        function downloadPDF() {
          // استخدام html2pdf أو طباعة مباشرة
          const element = document.querySelector('.container');
          const opt = {
            margin: 10,
            filename: 'فاتورة_${invoice.invoiceNumber}.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
          };
          // إذا لم تكن html2pdf موجودة، استخدم طباعة مباشرة
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  // فتح المستند في نافذة جديدة
  const newWindow = window.open('', '', 'width=1000,height=800');
  newWindow.document.write(htmlContent);
  newWindow.document.close();
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


// ===== توليد PDF لكشف حساب الزبون =====
function generateCustomerStatementPDF(customer) {
  // جمع فواتير الزبون
  const customerInvoices = savedInvoices.filter(inv => inv.customerId === customer.id);
  
  if (customerInvoices.length === 0) {
    alert(`لا توجد فواتير للزبون ${customer.name}`);
    return;
  }
  
  // حساب الإجماليات
  let totalSales = 0;
  let totalPaid = 0;
  let totalBalance = 0;
  
  customerInvoices.forEach(invoice => {
    totalSales += invoice.grandTotal || 0;
    totalPaid += invoice.amountPaid || 0;
    totalBalance += invoice.balance || 0;
  });
  
  // إنشاء HTML للمستند
  let htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>كشف حساب - ${customer.name}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Arial', sans-serif;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 900px;
          margin: 0 auto;
        }
        h1 {
          text-align: center;
          color: #0066cc;
          margin-bottom: 10px;
          font-size: 28px;
          border-bottom: 3px solid #0066cc;
          padding-bottom: 15px;
        }
        .subtitle {
          text-align: center;
          color: #666;
          margin-bottom: 30px;
          font-size: 14px;
        }
        .customer-info {
          background-color: #f0f8ff;
          padding: 20px;
          border-radius: 5px;
          margin-bottom: 30px;
          border-right: 4px solid #0066cc;
        }
        .customer-info p {
          margin: 8px 0;
          font-size: 14px;
          line-height: 1.6;
        }
        .customer-info strong {
          color: #333;
          min-width: 120px;
          display: inline-block;
        }
        .summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        .summary-item {
          background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
          color: white;
          padding: 20px;
          border-radius: 5px;
          text-align: center;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .summary-item label {
          display: block;
          font-size: 12px;
          margin-bottom: 8px;
          opacity: 0.9;
        }
        .summary-item value {
          display: block;
          font-size: 24px;
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          background-color: #0066cc;
          color: white;
          padding: 12px;
          text-align: right;
          font-weight: bold;
          font-size: 14px;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #ddd;
          font-size: 13px;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        tr:hover {
          background-color: #f0f8ff;
        }
        .footer {
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #ddd;
          padding-top: 20px;
          margin-top: 30px;
        }
        .print-buttons {
          text-align: center;
          padding: 20px;
          gap: 10px;
          display: flex;
          justify-content: center;
        }
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          transition: all 0.3s ease;
        }
        .btn-print {
          background-color: #0066cc;
          color: white;
        }
        .btn-print:hover {
          background-color: #0052a3;
        }
        .btn-close {
          background-color: #666;
          color: white;
        }
        .btn-close:hover {
          background-color: #555;
        }
        @media print {
          body {
            background-color: white;
            padding: 0;
          }
          .container {
            box-shadow: none;
            padding: 0;
          }
          .print-buttons {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📋 كشف حساب الزبون</h1>
        <p class="subtitle">برنامج أبو محمود السوري للمحاسبة</p>
        
        <div class="customer-info">
          <p><strong>اسم الزبون:</strong> ${customer.name}</p>
          <p><strong>الهاتف:</strong> ${customer.phone || 'بدون هاتف'}</p>
          <p><strong>العنوان:</strong> ${customer.address || 'بدون عنوان'}</p>
        </div>
        
        <div class="summary">
          <div class="summary-item">
            <label>إجمالي المبيعات</label>
            <value>${formatNumber(totalSales)}</value>
          </div>
          <div class="summary-item">
            <label>المدفوع</label>
            <value>${formatNumber(totalPaid)}</value>
          </div>
          <div class="summary-item">
            <label>المتبقي</label>
            <value>${formatNumber(totalBalance)}</value>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>رقم الفاتورة</th>
              <th>التاريخ</th>
              <th>المبيعات</th>
              <th>المدفوع</th>
              <th>المتبقي</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  // إضافة بيانات الفواتير
  customerInvoices.forEach(invoice => {
    htmlContent += `
      <tr>
        <td>#${invoice.invoiceNumber}</td>
        <td>${invoice.invoiceDate}</td>
        <td>${formatNumber(invoice.grandTotal)}</td>
        <td>${formatNumber(invoice.amountPaid)}</td>
        <td>${formatNumber(invoice.balance)}</td>
      </tr>
    `;
  });
  
  htmlContent += `
          </tbody>
        </table>
        
        <div class="footer">
          <p>تم توليد هذا الكشف بواسطة برنامج أبو محمود السوري للمحاسبة</p>
          <p>التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
        </div>
      </div>
      
      <div class="print-buttons">
        <button class="btn btn-print" onclick="window.print()">🖨️ طباعة</button>
        <button class="btn btn-close" onclick="window.close()">✖️ إغلاق</button>
      </div>
    </body>
    </html>
  `;
  
  // فتح المستند في نافذة جديدة للمعاينة
  const newWindow = window.open('', '', 'width=1000,height=800');
  newWindow.document.write(htmlContent);
  newWindow.document.close();
}
