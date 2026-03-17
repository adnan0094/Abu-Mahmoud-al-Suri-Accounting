// ===== بيانات البرنامج =====
let customers = JSON.parse(localStorage.getItem('customers')) || [
  { id: 1, name: 'أحمد محمد', phone: '0912345678', address: 'دمشق - المزة', notes: '', totalPurchases: 0 },
  { id: 2, name: 'خالد العلي', phone: '0923456789', address: 'حلب - الشهباء', notes: '', totalPurchases: 0 },
  { id: 3, name: 'محمد السيد', phone: '0934567890', address: 'حمص - الوعر', notes: '', totalPurchases: 0 },
  { id: 4, name: 'فاطمة حسن', phone: '0945678901', address: 'دمشق - باب توما', notes: '', totalPurchases: 0 },
  { id: 5, name: 'عمر إبراهيم', phone: '0956789012', address: 'اللاذقية', notes: '', totalPurchases: 0 },
];

let savedInvoices = JSON.parse(localStorage.getItem('savedInvoices')) || [];
let currentInvoiceId = null;
let selectedCustomerId = null;
let selectedRowIndex = -1;
let invoiceCounter = parseInt(localStorage.getItem('invoiceCounter')) || 1001;

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
  setTodayDate();
  renderCustomerList();
  renderSavedInvoices();
  updateStatusBar();
  addRow(); // إضافة صف أول فارغ تلقائياً
  updateInvoiceNumber();

  // إغلاق القوائم عند النقر خارجها
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.menu-item')) {
      closeAllMenus();
    }
  });
});

// ===== تاريخ اليوم =====
function setTodayDate() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  document.getElementById('invoiceDate').value = dateStr;

  // تحديث التاريخ في شريط الحالة
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('currentDate').textContent = today.toLocaleDateString('ar-SY', options);
}

// ===== رقم الفاتورة =====
function updateInvoiceNumber() {
  document.getElementById('invoiceNumber').value = invoiceCounter;
}

// ===== قائمة القوائم =====
function toggleMenu(menuId) {
  const menu = document.getElementById(menuId);
  const isActive = menu.classList.contains('active');
  closeAllMenus();
  if (!isActive) {
    menu.classList.add('active');
  }
}

function closeAllMenus() {
  document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
}

// ===== قائمة الزبائن =====
function renderCustomerList(filter = '') {
  const list = document.getElementById('customerList');
  list.innerHTML = '';

  const filtered = customers.filter(c =>
    c.name.includes(filter) || c.phone.includes(filter)
  );

  filtered.forEach(customer => {
    const item = document.createElement('div');
    item.className = 'customer-item' + (customer.id === selectedCustomerId ? ' selected' : '');
    item.textContent = customer.name;
    item.onclick = () => selectCustomer(customer.id);
    list.appendChild(item);
  });
}

function searchCustomers() {
  const query = document.getElementById('customerSearch').value;
  renderCustomerList(query);
}

function selectCustomer(customerId) {
  selectedCustomerId = customerId;
  const customer = customers.find(c => c.id === customerId);
  if (customer) {
    document.getElementById('customerName').value = customer.name;
    document.getElementById('customerPhone').value = customer.phone || '';
    document.getElementById('customerAddress').value = customer.address || '';
    renderCustomerList(document.getElementById('customerSearch').value);
    setStatus(`تم تحديد الزبون: ${customer.name}`);
  }
}

// ===== إضافة زبون جديد =====
function addNewCustomer() {
  document.getElementById('newCustomerName').value = '';
  document.getElementById('newCustomerPhone').value = '';
  document.getElementById('newCustomerAddress').value = '';
  document.getElementById('newCustomerNotes').value = '';
  document.getElementById('customerModal').style.display = 'flex';
}

function saveCustomer() {
  const name = document.getElementById('newCustomerName').value.trim();
  if (!name) {
    alert('يرجى إدخال اسم الزبون');
    return;
  }

  const newCustomer = {
    id: Date.now(),
    name: name,
    phone: document.getElementById('newCustomerPhone').value.trim(),
    address: document.getElementById('newCustomerAddress').value.trim(),
    notes: document.getElementById('newCustomerNotes').value.trim(),
    totalPurchases: 0
  };

  customers.push(newCustomer);
  saveCustomersToStorage();
  renderCustomerList();
  closeModal('customerModal');
  selectCustomer(newCustomer.id);
  setStatus(`تم إضافة الزبون: ${name}`);
}

function saveCustomersToStorage() {
  localStorage.setItem('customers', JSON.stringify(customers));
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
        placeholder="النوع / الصنف" onchange="calculateRowTotal(${rid})" oninput="calculateRowTotal(${rid})">
    </td>
    <td class="col-desc">
      <input type="text" class="table-input" id="desc-${rid}" placeholder="الوصف">
    </td>
    <td class="col-unit">
      <select class="table-select" id="unit-${rid}">
        ${units.map(u => `<option value="${u}">${u}</option>`).join('')}
      </select>
    </td>
    <td class="col-qty">
      <input type="number" class="table-input" id="qty-${rid}" value="1" min="0" step="0.001"
        onchange="calculateRowTotal(${rid})" oninput="calculateRowTotal(${rid})">
    </td>
    <td class="col-price">
      <input type="number" class="table-input" id="price-${rid}" value="0" min="0" step="0.01"
        onchange="calculateRowTotal(${rid})" oninput="calculateRowTotal(${rid})">
    </td>
    <td class="col-discount">
      <input type="number" class="table-input" id="discount-${rid}" value="0" min="0" max="100" step="0.1"
        onchange="calculateRowTotal(${rid})" oninput="calculateRowTotal(${rid})">
    </td>
    <td class="col-total total-cell" id="total-${rid}">0.00</td>
    <td class="col-action">
      <button class="delete-row-btn" onclick="deleteRow(${rid}, event)">✕</button>
    </td>
  `;

  tbody.appendChild(tr);
  updateRowNumbers();
  updateStatusBar();

  // التركيز على حقل النوع في الصف الجديد
  setTimeout(() => {
    const typeInput = document.getElementById(`type-${rid}`);
    if (typeInput) typeInput.focus();
  }, 50);

  return rid;
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
  const discount = parseFloat(document.getElementById(`discount-${rid}`)?.value) || 0;

  const subtotal = qty * price;
  const discountAmount = subtotal * (discount / 100);
  const total = subtotal - discountAmount;

  const totalCell = document.getElementById(`total-${rid}`);
  if (totalCell) {
    totalCell.textContent = total.toFixed(2);
  }

  calculateTotals();
}

function calculateTotals() {
  const rows = document.querySelectorAll('#invoiceBody tr');
  let subtotal = 0;
  let totalDiscountAmount = 0;

  rows.forEach(tr => {
    const rid = tr.id.replace('row-', '');
    const qty = parseFloat(document.getElementById(`qty-${rid}`)?.value) || 0;
    const price = parseFloat(document.getElementById(`price-${rid}`)?.value) || 0;
    const discount = parseFloat(document.getElementById(`discount-${rid}`)?.value) || 0;

    const rowSubtotal = qty * price;
    const rowDiscount = rowSubtotal * (discount / 100);
    subtotal += rowSubtotal;
    totalDiscountAmount += rowDiscount;
  });

  const afterDiscount = subtotal - totalDiscountAmount;
  const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
  const taxAmount = afterDiscount * (taxRate / 100);
  const grandTotal = afterDiscount + taxAmount;

  document.getElementById('subtotal').textContent = subtotal.toFixed(2);
  document.getElementById('totalDiscount').textContent = totalDiscountAmount.toFixed(2);
  document.getElementById('taxAmount').textContent = taxAmount.toFixed(2);
  document.getElementById('grandTotal').textContent = grandTotal.toFixed(2);

  calculateBalance();
}

function calculateBalance() {
  const grandTotal = parseFloat(document.getElementById('grandTotal').textContent) || 0;
  const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
  const balance = grandTotal - amountPaid;

  const balanceEl = document.getElementById('balance');
  balanceEl.textContent = balance.toFixed(2);
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
        desc: document.getElementById(`desc-${rid}`)?.value || '',
        unit: document.getElementById(`unit-${rid}`)?.value || 'قطعة',
        qty: qty,
        price: price,
        discount: parseFloat(document.getElementById(`discount-${rid}`)?.value) || 0,
        total: parseFloat(document.getElementById(`total-${rid}`)?.textContent) || 0
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
    customerPhone: document.getElementById('customerPhone').value,
    customerAddress: document.getElementById('customerAddress').value,
    items: items,
    notes: document.getElementById('invoiceNotes').value,
    subtotal: parseFloat(document.getElementById('subtotal').textContent) || 0,
    totalDiscount: parseFloat(document.getElementById('totalDiscount').textContent) || 0,
    taxRate: parseFloat(document.getElementById('taxRate').value) || 0,
    taxAmount: parseFloat(document.getElementById('taxAmount').textContent) || 0,
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
    localStorage.setItem('invoiceCounter', invoiceCounter);
  }

  localStorage.setItem('savedInvoices', JSON.stringify(savedInvoices));
  renderSavedInvoices();
  setStatus(`تم حفظ الفاتورة رقم ${invoice.number} للزبون: ${customerName}`);
  alert(`تم حفظ الفاتورة بنجاح!\nرقم الفاتورة: ${invoice.number}\nالزبون: ${customerName}\nالإجمالي: ${invoice.grandTotal.toFixed(2)} ل.س`);
}

// ===== فاتورة جديدة =====
function newInvoice() {
  if (confirm('هل تريد إنشاء فاتورة جديدة؟ سيتم مسح البيانات الحالية.')) {
    currentInvoiceId = null;
    selectedCustomerId = null;
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerAddress').value = '';
    document.getElementById('invoiceNotes').value = '';
    document.getElementById('amountPaid').value = '0';
    document.getElementById('taxRate').value = '0';
    document.getElementById('invoiceBody').innerHTML = '';
    rowIdCounter = 0;
    updateInvoiceNumber();
    setTodayDate();
    calculateTotals();
    addRow();
    renderCustomerList();
    setStatus('فاتورة جديدة');

    // إزالة التحديد من الفواتير المحفوظة
    document.querySelectorAll('.saved-invoice-item').forEach(el => el.classList.remove('active'));
  }
}

// ===== حذف الفاتورة =====
function deleteInvoice() {
  if (!currentInvoiceId) {
    alert('لا توجد فاتورة محفوظة للحذف');
    return;
  }
  if (confirm('هل تريد حذف هذه الفاتورة نهائياً؟')) {
    savedInvoices = savedInvoices.filter(inv => inv.id !== currentInvoiceId);
    localStorage.setItem('savedInvoices', JSON.stringify(savedInvoices));
    renderSavedInvoices();
    newInvoice();
    setStatus('تم حذف الفاتورة');
  }
}

// ===== عرض الفواتير المحفوظة =====
function renderSavedInvoices() {
  const list = document.getElementById('savedInvoicesList');
  list.innerHTML = '';

  savedInvoices.forEach(invoice => {
    const item = document.createElement('div');
    item.className = 'saved-invoice-item' + (invoice.id === currentInvoiceId ? ' active' : '');
    item.onclick = () => loadInvoice(invoice.id);
    item.innerHTML = `
      <div class="saved-invoice-num">فاتورة #${invoice.number}</div>
      <div class="saved-invoice-customer">${invoice.customerName}</div>
      <div style="font-size:10px; color:#888;">${invoice.date}</div>
      <div style="font-size:10px; font-weight:bold; color:#0a246a;">${invoice.grandTotal.toFixed(2)} ل.س</div>
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
  document.getElementById('customerPhone').value = invoice.customerPhone || '';
  document.getElementById('customerAddress').value = invoice.customerAddress || '';
  document.getElementById('invoiceNotes').value = invoice.notes || '';
  document.getElementById('taxRate').value = invoice.taxRate || 0;
  document.getElementById('amountPaid').value = invoice.amountPaid || 0;

  // مسح الجدول وإعادة ملئه
  document.getElementById('invoiceBody').innerHTML = '';
  rowIdCounter = 0;

  invoice.items.forEach(item => {
    const rid = addRow();
    setTimeout(() => {
      const typeEl = document.getElementById(`type-${rid}`);
      const descEl = document.getElementById(`desc-${rid}`);
      const unitEl = document.getElementById(`unit-${rid}`);
      const qtyEl = document.getElementById(`qty-${rid}`);
      const priceEl = document.getElementById(`price-${rid}`);
      const discountEl = document.getElementById(`discount-${rid}`);

      if (typeEl) typeEl.value = item.type;
      if (descEl) descEl.value = item.desc;
      if (unitEl) unitEl.value = item.unit;
      if (qtyEl) qtyEl.value = item.qty;
      if (priceEl) priceEl.value = item.price;
      if (discountEl) discountEl.value = item.discount;
      calculateRowTotal(rid);
    }, 10);
  });

  renderCustomerList();
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
  const customerPhone = document.getElementById('customerPhone').value;
  const customerAddress = document.getElementById('customerAddress').value;
  const notes = document.getElementById('invoiceNotes').value;
  const subtotal = document.getElementById('subtotal').textContent;
  const totalDiscount = document.getElementById('totalDiscount').textContent;
  const taxAmount = document.getElementById('taxAmount').textContent;
  const grandTotal = document.getElementById('grandTotal').textContent;
  const amountPaid = document.getElementById('amountPaid').value;
  const balance = document.getElementById('balance').textContent;

  // جمع بيانات الصفوف
  const rows = document.querySelectorAll('#invoiceBody tr');
  let itemsHTML = '';
  let rowNum = 1;

  rows.forEach(tr => {
    const rid = tr.id.replace('row-', '');
    const type = document.getElementById(`type-${rid}`)?.value || '';
    const desc = document.getElementById(`desc-${rid}`)?.value || '';
    const unit = document.getElementById(`unit-${rid}`)?.value || '';
    const qty = document.getElementById(`qty-${rid}`)?.value || '0';
    const price = document.getElementById(`price-${rid}`)?.value || '0';
    const discount = document.getElementById(`discount-${rid}`)?.value || '0';
    const total = document.getElementById(`total-${rid}`)?.textContent || '0.00';

    if (type || parseFloat(qty) > 0) {
      itemsHTML += `
        <tr>
          <td>${rowNum++}</td>
          <td>${type}</td>
          <td>${desc}</td>
          <td>${unit}</td>
          <td>${qty}</td>
          <td>${parseFloat(price).toFixed(2)}</td>
          <td>${discount}%</td>
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
        .header h1 { font-size: 20px; margin: 0; }
        .header h2 { font-size: 16px; margin: 5px 0; color: #333; }
        .info-table { width: 100%; margin-bottom: 15px; }
        .info-table td { padding: 4px 8px; font-size: 12px; }
        .info-label { font-weight: bold; width: 100px; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        table.items th { background: #333; color: white; padding: 6px; text-align: center; border: 1px solid #000; }
        table.items td { padding: 5px 8px; border: 1px solid #ccc; text-align: center; }
        table.items tr:nth-child(even) { background: #f5f5f5; }
        .totals { float: left; width: 300px; border: 1px solid #ccc; padding: 10px; }
        .totals table { width: 100%; }
        .totals td { padding: 4px 8px; font-size: 12px; }
        .totals .label { font-weight: bold; text-align: right; }
        .totals .value { text-align: left; font-family: monospace; }
        .grand-total { font-size: 16px; font-weight: bold; color: #000; border-top: 2px solid #000; }
        .notes { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
        .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
        .clearfix::after { content: ''; display: table; clear: both; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏪 برنامج أبو محمود السوري للمحاسبة</h1>
        <h2>${invoiceType === 'بيع' ? 'فاتورة مبيعات' : invoiceType === 'شراء' ? 'فاتورة مشتريات' : 'فاتورة مرتجع'}</h2>
      </div>

      <table class="info-table">
        <tr>
          <td class="info-label">رقم الفاتورة:</td>
          <td><strong>${invoiceNum}</strong></td>
          <td class="info-label">التاريخ:</td>
          <td>${invoiceDate}</td>
        </tr>
        <tr>
          <td class="info-label">اسم الزبون:</td>
          <td><strong>${customerName}</strong></td>
          <td class="info-label">الهاتف:</td>
          <td>${customerPhone}</td>
        </tr>
        <tr>
          <td class="info-label">العنوان:</td>
          <td colspan="3">${customerAddress}</td>
        </tr>
      </table>

      <table class="items">
        <thead>
          <tr>
            <th>#</th>
            <th>النوع / الصنف</th>
            <th>الوصف</th>
            <th>الوحدة</th>
            <th>الكمية</th>
            <th>السعر</th>
            <th>الخصم</th>
            <th>المجموع</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="clearfix">
        <div class="totals">
          <table>
            <tr><td class="label">المجموع الفرعي:</td><td class="value">${subtotal} ل.س</td></tr>
            <tr><td class="label">الخصم الإجمالي:</td><td class="value">${totalDiscount} ل.س</td></tr>
            <tr><td class="label">الضريبة:</td><td class="value">${taxAmount} ل.س</td></tr>
            <tr class="grand-total"><td class="label">الإجمالي الكلي:</td><td class="value">${grandTotal} ل.س</td></tr>
            <tr><td class="label">المبلغ المدفوع:</td><td class="value">${parseFloat(amountPaid).toFixed(2)} ل.س</td></tr>
            <tr><td class="label" style="color:red;">المتبقي:</td><td class="value" style="color:red;">${balance} ل.س</td></tr>
          </table>
        </div>
      </div>

      ${notes ? `<div class="notes"><strong>ملاحظات:</strong> ${notes}</div>` : ''}

      <div class="footer">
        <p>شكراً لتعاملكم معنا - برنامج أبو محمود السوري للمحاسبة</p>
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
  closeAllMenus();
  if (savedInvoices.length === 0) {
    alert('لا توجد فواتير محفوظة');
    return;
  }

  const totalSales = savedInvoices.filter(i => i.type === 'بيع').reduce((sum, i) => sum + i.grandTotal, 0);
  const totalPurchases = savedInvoices.filter(i => i.type === 'شراء').reduce((sum, i) => sum + i.grandTotal, 0);
  const totalBalance = savedInvoices.reduce((sum, i) => sum + i.balance, 0);

  // إحصائيات الزبائن
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
    <div style="display:flex; gap:20px; margin-bottom:15px; flex-wrap:wrap;">
      <div style="background:#e8f4fd; border:1px solid #4a7ab5; padding:10px 20px; text-align:center; flex:1;">
        <div style="font-size:11px; color:#555;">إجمالي المبيعات</div>
        <div style="font-size:18px; font-weight:bold; color:#0a246a;">${totalSales.toFixed(2)} ل.س</div>
      </div>
      <div style="background:#e8fde8; border:1px solid #4ab54a; padding:10px 20px; text-align:center; flex:1;">
        <div style="font-size:11px; color:#555;">إجمالي المشتريات</div>
        <div style="font-size:18px; font-weight:bold; color:#006600;">${totalPurchases.toFixed(2)} ل.س</div>
      </div>
      <div style="background:#fde8e8; border:1px solid #b54a4a; padding:10px 20px; text-align:center; flex:1;">
        <div style="font-size:11px; color:#555;">إجمالي الديون</div>
        <div style="font-size:18px; font-weight:bold; color:#cc0000;">${totalBalance.toFixed(2)} ل.س</div>
      </div>
      <div style="background:#fdf5e8; border:1px solid #b5954a; padding:10px 20px; text-align:center; flex:1;">
        <div style="font-size:11px; color:#555;">عدد الفواتير</div>
        <div style="font-size:18px; font-weight:bold; color:#885500;">${savedInvoices.length}</div>
      </div>
    </div>

    <h3 style="margin-bottom:8px;">أفضل الزبائن</h3>
    <table style="width:100%; border-collapse:collapse; font-size:12px;">
      <thead>
        <tr style="background:#333; color:white;">
          <th style="padding:5px 8px; border:1px solid #000;">#</th>
          <th style="padding:5px 8px; border:1px solid #000;">اسم الزبون</th>
          <th style="padding:5px 8px; border:1px solid #000;">عدد الفواتير</th>
          <th style="padding:5px 8px; border:1px solid #000;">إجمالي المشتريات</th>
        </tr>
      </thead>
      <tbody>
        ${topCustomers.map(([name, stats], idx) => `
          <tr style="background:${idx % 2 === 0 ? '#f5f9ff' : 'white'};">
            <td style="padding:4px 8px; border:1px solid #ccc; text-align:center;">${idx + 1}</td>
            <td style="padding:4px 8px; border:1px solid #ccc;">${name}</td>
            <td style="padding:4px 8px; border:1px solid #ccc; text-align:center;">${stats.count}</td>
            <td style="padding:4px 8px; border:1px solid #ccc; text-align:center; font-weight:bold;">${stats.total.toFixed(2)} ل.س</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  document.getElementById('reportsContent').innerHTML = html;
  document.getElementById('reportsModal').style.display = 'flex';
}

// ===== عرض قائمة الزبائن الكاملة =====
function showCustomers() {
  closeAllMenus();
  const tbody = document.getElementById('customersTableBody');
  tbody.innerHTML = '';

  customers.forEach((customer, idx) => {
    const totalPurchases = savedInvoices
      .filter(inv => inv.customerId === customer.id)
      .reduce((sum, inv) => sum + inv.grandTotal, 0);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${customer.name}</td>
      <td>${customer.phone || '-'}</td>
      <td>${customer.address || '-'}</td>
      <td>${totalPurchases.toFixed(2)} ل.س</td>
      <td>
        <button onclick="selectCustomerFromList(${customer.id})" style="padding:2px 8px; cursor:pointer; font-size:11px;">تحديد</button>
        <button onclick="deleteCustomer(${customer.id})" style="padding:2px 8px; cursor:pointer; font-size:11px; color:red;">حذف</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('customersListModal').style.display = 'flex';
}

function selectCustomerFromList(customerId) {
  selectCustomer(customerId);
  closeModal('customersListModal');
}

function deleteCustomer(customerId) {
  if (confirm('هل تريد حذف هذا الزبون؟')) {
    customers = customers.filter(c => c.id !== customerId);
    saveCustomersToStorage();
    renderCustomerList();
    showCustomers();
    setStatus('تم حذف الزبون');
  }
}

// ===== نافذة حول البرنامج =====
function showAbout() {
  closeAllMenus();
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
  document.getElementById('rowCount').textContent = `عدد الأصناف: ${rowCount}`;
}

// ===== قائمة الأصناف الشائعة (datalist) =====
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
  } else if (e.key === 'Delete' && e.ctrlKey) {
    deleteSelectedRow();
    e.preventDefault();
  }
});
