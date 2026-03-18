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

// ===== حفظ البيانات في Firebase (إذا كان متاحاً) =====
function saveDataToFirebase() {
  if (typeof db !== 'undefined' && db && typeof currentUser !== 'undefined' && currentUser) {
    try {
      db.collection('userData').doc(currentUser.id).set({
        customers: customers,
        savedInvoices: savedInvoices,
        invoiceCounter: invoiceCounter,
        updatedAt: new Date()
      }).catch(function(error) {
        console.warn('Firebase save error:', error);
      });
    } catch (e) {
      console.warn('Firebase not available:', e);
    }
  }
}

// ===== تاريخ اليوم =====
function setTodayDate() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  document.getElementById('invoiceDate').value = dateStr;
}

// ===== تنسيق الأرقام =====
function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  const numStr = parseFloat(num).toFixed(2);
  const parts = numStr.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

// ===== دالة تحويل النص المنسق إلى رقم =====
function parseFormattedNumber(text) {
  if (!text || text === '' || text === '0') return 0;
  // تحويل الأرقام العربية إلى إنجليزية
  text = text.replace(/[٠١٢٣٤٥٦٧٨٩]/g, function(d) {
    return d.charCodeAt(0) - 1632;
  });
  // إزالة الفواصل العربية والإنجليزية
  return parseFloat(text.replace(/,/g, '').replace(/٬/g, '')) || 0;
}

function saveInvoice() {
  const customerName = document.getElementById('customerName').value.trim();
  const invoiceDate = document.getElementById('invoiceDate').value;
  const invoiceTypeEl = document.getElementById('invoiceType');
  const invoiceType = invoiceTypeEl ? invoiceTypeEl.value.trim() : 'بيع';
  const notes = document.getElementById('invoiceNotes').value;
  const grandTotal = parseFormattedNumber(document.getElementById('grandTotal').textContent);
  const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
  const balance = parseFormattedNumber(document.getElementById('balance').textContent);
  
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
    const typeInput = row.querySelector('.col-type input');
    const type = typeInput ? typeInput.value.trim() : '';
    const qty = parseFloat(row.querySelector('.col-qty input').value) || 0;
    const price = parseFloat(row.querySelector('.col-price input').value) || 0;
    
    if (type && qty > 0 && price > 0) {
      items.push({ type, qty, price });
    }
  });

  if (items.length === 0) {
    alert('يرجى إضافة أصناف صحيحة للفاتورة (الصنف والكمية والسعر مطلوبة)');
    return;
  }

  const invoice = {
    id: currentInvoiceId || Date.now(),
    customerName: customerName,
    customerId: selectedCustomerId,
    invoiceNumber: invoiceNumber,
    invoiceDate: invoiceDate,
    invoiceType: invoiceType || 'بيع',
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
  updateStatusBar();
}

// ===== إضافة صف جديد =====
function addRow() {
  const tbody = document.getElementById('invoiceBody');
  const rowCount = tbody.rows.length + 1;
  
  const row = tbody.insertRow();
  row.innerHTML = `
    <td class="col-num">${rowCount}</td>
    <td class="col-type"><input type="text" placeholder="أدخل الصنف" class="row-input"></td>
    <td class="col-qty"><input type="number" placeholder="0" class="row-input" value="0" min="0" step="0.01" oninput="calculateTotal()"></td>
    <td class="col-price"><input type="number" placeholder="0" class="row-input" value="0" min="0" step="0.01" oninput="calculateTotal()"></td>
    <td class="col-total">0</td>
    <td class="col-action"><button class="btn-delete" onclick="deleteRow(this)">حذف</button></td>
  `;
}

// ===== حساب المجموع =====
function calculateTotal() {
  const tbody = document.getElementById('invoiceBody');
  let grandTotal = 0;

  tbody.querySelectorAll('tr').forEach(row => {
    const qtyInput = row.querySelector('.col-qty input');
    const priceInput = row.querySelector('.col-price input');
    const totalCell = row.querySelector('.col-total');

    const qty = parseFloat(qtyInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;
    const rowTotal = qty * price;

    totalCell.textContent = formatNumber(rowTotal);
    grandTotal += rowTotal;
  });

  document.getElementById('grandTotal').textContent = formatNumber(grandTotal);
  calculateBalance();
}

// ===== حساب الرصيد =====
function calculateBalance() {
  const grandTotal = parseFormattedNumber(document.getElementById('grandTotal').textContent);
  const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
  const balance = grandTotal - amountPaid;
  
  document.getElementById('balance').textContent = formatNumber(balance);
}

// ===== حذف صف =====
function deleteRow(btn) {
  btn.closest('tr').remove();
  updateRowNumbers();
  calculateTotal();
}

// ===== تحديث أرقام الصفوف =====
function updateRowNumbers() {
  const tbody = document.getElementById('invoiceBody');
  tbody.querySelectorAll('tr').forEach((row, index) => {
    row.querySelector('.col-num').textContent = index + 1;
  });
}

// ===== مسح الجدول =====
function clearTable() {
  if (confirm('هل أنت متأكد من حذف جميع الأصناف؟')) {
    const tbody = document.getElementById('invoiceBody');
    tbody.innerHTML = '';
    addRow();
    calculateTotal();
  }
}

// ===== حذف الصف المحدد =====
function deleteSelectedRow() {
  if (selectedRowIndex >= 0) {
    const tbody = document.getElementById('invoiceBody');
    if (tbody.rows[selectedRowIndex]) {
      tbody.deleteRow(selectedRowIndex);
      updateRowNumbers();
      calculateTotal();
      selectedRowIndex = -1;
    }
  }
}

// ===== فاتورة جديدة =====
function newInvoice() {
  currentInvoiceId = null;
  selectedCustomerId = null;
  document.getElementById('customerName').value = '';
  document.getElementById('invoiceNotes').value = '';
  document.getElementById('amountPaid').value = '0';
  
  const tbody = document.getElementById('invoiceBody');
  tbody.innerHTML = '';
  addRow();
  
  setTodayDate();
  calculateTotal();
  setStatus('فاتورة جديدة');
}

// ===== إظهار منتقي الزبون =====
function showCustomerSelector() {
  const modal = document.getElementById('customerSelectorModal');
  const customerList = document.getElementById('customerListModal');
  
  customerList.innerHTML = '';
  customers.forEach(customer => {
    const div = document.createElement('div');
    div.className = 'customer-item';
    div.innerHTML = `${customer.name} ${customer.phone}`;
    div.onclick = () => selectCustomer(customer);
    customerList.appendChild(div);
  });
  
  modal.style.display = 'flex';
}

// ===== اختيار الزبون =====
function selectCustomer(customer) {
  document.getElementById('customerName').value = customer.name;
  selectedCustomerId = customer.id;
  closeModal('customerSelectorModal');
  setStatus(`تم تحديد الزبون: ${customer.name}`);
}

// ===== البحث عن الزبائن =====
function searchCustomers() {
  const searchInput = document.getElementById('customerSearchInput').value.toLowerCase();
  const customerList = document.getElementById('customerListModal');
  
  customerList.innerHTML = '';
  const filtered = customers.filter(c => c.name.toLowerCase().includes(searchInput));
  
  filtered.forEach(customer => {
    const div = document.createElement('div');
    div.className = 'customer-item';
    div.innerHTML = `${customer.name} ${customer.phone}`;
    div.onclick = () => selectCustomer(customer);
    customerList.appendChild(div);
  });
}

// ===== إضافة زبون جديد من النافذة =====
function addNewCustomerModal() {
  document.getElementById('newCustomerName').value = '';
  document.getElementById('newCustomerPhone').value = '';
  document.getElementById('newCustomerAddress').value = '';
  closeModal('customerSelectorModal');
  document.getElementById('addCustomerModal').style.display = 'flex';
}

// ===== حفظ الزبون الجديد =====
function saveNewCustomer() {
  const name = document.getElementById('newCustomerName').value.trim();
  const phone = document.getElementById('newCustomerPhone').value.trim();
  const address = document.getElementById('newCustomerAddress').value.trim();

  if (!name) {
    alert('يرجى إدخال اسم الزبون');
    return;
  }

  const newCustomer = {
    id: 'cust_' + Date.now(),
    name: name,
    phone: phone,
    address: address,
    createdAt: new Date().toISOString()
  };

  customers.push(newCustomer);
  saveDataToLocalStorage();
  
  closeModal('addCustomerModal');
  selectCustomer(newCustomer);
  setStatus(`تم إضافة الزبون: ${name}`);
}

// ===== عرض قائمة الزبائن =====
function showCustomers() {
  const modal = document.getElementById('customersListModal');
  const tbody = document.getElementById('customersTableBody');
  
  tbody.innerHTML = '';
  customers.forEach((customer, index) => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${customer.name}</td>
      <td>${customer.phone}</td>
      <td>0</td>
      <td>
        <button class="btn-small" onclick="editCustomer('${customer.id}')">تعديل</button>
        <button class="btn-small" onclick="deleteCustomer('${customer.id}')">حذف</button>
      </td>
    `;
  });
  
  modal.style.display = 'flex';
}

// ===== حذف الزبون =====
function deleteCustomer(customerId) {
  if (confirm('هل أنت متأكد من حذف هذا الزبون؟')) {
    customers = customers.filter(c => c.id !== customerId);
    saveDataToLocalStorage();
    showCustomers();
    setStatus('تم حذف الزبون');
  }
}

// ===== تعديل الزبون =====
function editCustomer(customerId) {
  alert('ميزة التعديل قيد التطوير');
}

// ===== عرض التقارير =====
function showReports() {
  const modal = document.getElementById('reportsModal');
  const content = document.getElementById('reportsContent');
  
  let totalSales = 0;
  let totalPaid = 0;
  let totalBalance = 0;
  
  savedInvoices.forEach(invoice => {
    totalSales += invoice.grandTotal;
    totalPaid += invoice.amountPaid;
    totalBalance += invoice.balance;
  });
  
  content.innerHTML = `
    <div style="padding: 20px;">
      <h3>ملخص التقارير</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>إجمالي المبيعات:</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${formatNumber(totalSales)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>إجمالي المدفوع:</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${formatNumber(totalPaid)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>إجمالي المتبقي:</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${formatNumber(totalBalance)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>عدد الفواتير:</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${savedInvoices.length}</td>
        </tr>
      </table>
    </div>
  `;
  
  modal.style.display = 'flex';
}

// ===== تصدير البيانات =====
function exportData() {
  const data = {
    customers: customers,
    invoices: savedInvoices,
    exportDate: new Date().toISOString()
  };
  
  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `بيانات_المحاسبة_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  setStatus('تم تصدير البيانات');
}

// ===== طباعة الفاتورة كـ PDF =====
function printInvoice() {
  if (!currentInvoiceId) {
    alert('يرجى اختيار فاتورة للطباعة');
    return;
  }

  const invoice = savedInvoices.find(inv => inv.id === currentInvoiceId);
  if (!invoice) return;

  // إنشاء عنصر HTML مؤقت يحتوي على بيانات الفاتورة
  const invoiceElement = document.createElement('div');
  invoiceElement.style.display = 'none';
  
  let itemsHTML = '';
  invoice.items.forEach((item, index) => {
    const itemTotal = item.qty * item.price;
    itemsHTML += `
      <tr style="background: ${index % 2 === 0 ? '#f9f9f9' : 'white'};">
        <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${index + 1}</td>
        <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${item.type}</td>
        <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${item.qty}</td>
        <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${formatNumber(item.price)}</td>
        <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${formatNumber(itemTotal)}</td>
      </tr>
    `;
  });

  invoiceElement.innerHTML = `
    <div id="pdf-content" style="padding: 20px; background: white; font-family: Arial, sans-serif; direction: rtl; width: 800px;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0a246a; padding-bottom: 15px;">
        <h1 style="margin: 0; color: #0a246a;">🏪 برنامج أبو محمود السوري للمحاسبة</h1>
        <p>فاتورة رقم: <strong>${invoice.invoiceNumber}</strong></p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 20px; background: #f5f5f5; padding: 15px; border-radius: 5px;">
        <div>
          <strong>الزبون:</strong> ${invoice.customerName}<br>
          <strong>نوع الفاتورة:</strong> ${invoice.invoiceType || 'بيع'}<br>
          <strong>التاريخ:</strong> ${invoice.invoiceDate}
        </div>
        ${invoice.notes ? `<div><strong>ملاحظات:</strong> ${invoice.notes}</div>` : ''}
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #0a246a; color: white;">
            <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">#</th>
            <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">الصنف</th>
            <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">الكمية</th>
            <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">السعر</th>
            <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">المجموع</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div style="text-align: left; margin-bottom: 20px; background: #f5f5f5; padding: 15px; border-radius: 5px;">
        <div style="padding: 5px 0; font-size: 16px;">إجمالي المبيعات: <strong>${formatNumber(invoice.grandTotal)}</strong></div>
        <div style="padding: 5px 0; font-size: 16px;">المدفوع: <strong>${formatNumber(invoice.amountPaid)}</strong></div>
        <div style="padding: 5px 0; font-size: 18px; color: #d32f2f; font-weight: bold;">المتبقي: <strong>${formatNumber(invoice.balance)}</strong></div>
      </div>

      <div style="text-align: center; margin-top: 30px; color: #666; border-top: 1px solid #ddd; padding-top: 15px;">
        <p>شكراً لتعاملك معنا</p>
        <p>جميع الحقوق محفوظة © 2026</p>
      </div>
    </div>
  `;

  document.body.appendChild(invoiceElement);

  // استخدام html2pdf لتحويل HTML إلى PDF
  const element = document.getElementById('pdf-content');
  const opt = {
    margin: 10,
    filename: `فاتورة_${invoice.invoiceNumber}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  try {
    html2pdf().set(opt).from(element).save();
    setStatus(`تم تحميل الفاتورة رقم ${invoice.invoiceNumber} كملف PDF`);
  } catch (error) {
    console.error('خطأ في توليد PDF:', error);
    alert('حدث خطأ في توليد ملف PDF. يرجى المحاولة مجدداً.');
  }

  // حذف العنصر المؤقت
  document.body.removeChild(invoiceElement);
}

// ===== كشف حساب الزبون =====
function showCustomerStatement(customerId) {
  const customer = customers.find(c => c.id === customerId);
  if (!customer) return;

  const customerInvoices = savedInvoices.filter(inv => inv.customerId === customerId);
  let totalDebt = 0;
  
  customerInvoices.forEach(inv => {
    totalDebt += inv.balance;
  });

  alert(`كشف حساب الزبون: ${customer.name}\nإجمالي المديونية: ${formatNumber(totalDebt)}`);
}

// ===== عرض الفواتير المحفوظة =====
function renderSavedInvoices() {
  const container = document.getElementById('savedInvoicesList');
  container.innerHTML = '';

  if (savedInvoices.length === 0) {
    container.innerHTML = '<div style="padding: 10px; text-align: center; color: #999;">لا توجد فواتير</div>';
    return;
  }

  savedInvoices.forEach(invoice => {
    const div = document.createElement('div');
    div.className = 'saved-invoice-item';
    if (invoice.id === currentInvoiceId) {
      div.classList.add('active');
    }
    div.innerHTML = `<span class="saved-invoice-num">فاتورة #${invoice.invoiceNumber}</span> ${invoice.customerName} ${invoice.invoiceDate}`;
    div.onclick = () => loadInvoice(invoice.id);
    container.appendChild(div);
  });
}

// ===== تحميل فاتورة =====
function loadInvoice(invoiceId) {
  const invoice = savedInvoices.find(inv => inv.id === invoiceId);
  if (!invoice) return;

  currentInvoiceId = invoiceId;
  selectedCustomerId = invoice.customerId;
  
  document.getElementById('customerName').value = invoice.customerName;
  document.getElementById('invoiceDate').value = invoice.invoiceDate;
  document.getElementById('invoiceType').value = invoice.invoiceType || 'بيع';
  document.getElementById('invoiceNotes').value = invoice.notes;
  document.getElementById('amountPaid').value = invoice.amountPaid;

  const tbody = document.getElementById('invoiceBody');
  tbody.innerHTML = '';

  invoice.items.forEach((item, index) => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td class="col-num">${index + 1}</td>
      <td class="col-type"><input type="text" placeholder="أدخل الصنف" class="row-input" value="${item.type}"></td>
      <td class="col-qty"><input type="number" placeholder="0" class="row-input" value="${item.qty}" min="0" step="0.01" oninput="calculateTotal()"></td>
      <td class="col-price"><input type="number" placeholder="0" class="row-input" value="${item.price}" min="0" step="0.01" oninput="calculateTotal()"></td>
      <td class="col-total">${formatNumber(item.qty * item.price)}</td>
      <td class="col-action"><button class="btn-delete" onclick="deleteRow(this)">حذف</button></td>
    `;
  });

  calculateTotal();
  renderSavedInvoices();
  setStatus(`تم تحميل الفاتورة رقم ${invoice.invoiceNumber}`);
}

// ===== تحديث شريط الحالة =====
function updateStatusBar() {
  const statusMessage = document.getElementById('statusMessage');
  if (statusMessage) {
    statusMessage.textContent = `عدد الفواتير: ${savedInvoices.length} | عدد الزبائن: ${customers.length}`;
  }
}

// ===== تعيين الحالة =====
function setStatus(message) {
  const statusMessage = document.getElementById('statusMessage');
  if (statusMessage) {
    statusMessage.textContent = message;
  }
}

// ===== إغلاق النافذة المنبثقة =====
function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// ===== فتح القائمة =====
function toggleMenu(menuId) {
  const menu = document.getElementById(menuId);
  if (menu.classList.contains('active')) {
    menu.classList.remove('active');
  } else {
    menu.classList.add('active');
  }
}

// ===== إغلاق القائمة =====
function closeMenu(menuId) {
  document.getElementById(menuId).classList.remove('active');
}

// ===== عرض حول البرنامج =====
function showAbout() {
  document.getElementById('aboutModal').style.display = 'flex';
}
