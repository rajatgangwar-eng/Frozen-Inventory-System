const LOCAL_KEY = 'frozen-inv-v1';
const UI_KEY = 'frozen-inv-ui';
const AUTH_KEY = 'frozen-inv-auth';

const state = {
    items: [],
    batches: [],
    production: [],
    dispatches: [],
    returns: [],
    damages: []
};

let ui = {
    darkMode: false
};

const refs = {
    dashboardCards: document.getElementById('dashboardCards'),
    summaryProducts: document.getElementById('summaryProducts'),
    summaryBatches: document.getElementById('summaryBatches'),
    summaryStock: document.getElementById('summaryStock'),
    summaryDispatch: document.getElementById('summaryDispatch'),
    summaryReturns: document.getElementById('summaryReturns'),
    summaryDamage: document.getElementById('summaryDamage'),
    itemForm: document.getElementById('itemForm'),
    itemTable: document.querySelector('#itemTable tbody'),
    itemSelects: {
        production: document.getElementById('productionItem'),
        dispatch: document.getElementById('dispatchItem'),
        returns: document.getElementById('returnsItem'),
        damage: document.getElementById('damageItem')
    },
    batchSelects: {
        dispatch: document.getElementById('dispatchBatch'),
        returns: document.getElementById('returnsBatch'),
        damage: document.getElementById('damageBatch')
    },
    productionForm: document.getElementById('productionForm'),
    productionTable: document.querySelector('#productionTable tbody'),
    batchTable: document.querySelector('#batchTable tbody'),
    dispatchForm: document.getElementById('dispatchForm'),
    dispatchTable: document.querySelector('#dispatchTable tbody'),
    returnsForm: document.getElementById('returnsForm'),
    returnsTable: document.querySelector('#returnsTable tbody'),
    damageForm: document.getElementById('damageForm'),
    damageTable: document.querySelector('#damageTable tbody'),
    ledgerTable: document.querySelector('#ledgerTable tbody'),
    reportPreview: document.getElementById('reportPreview'),
    searchInput: document.getElementById('searchInput')
};

function formatKg(value) {
    return `${value.toFixed(1)} Kg`;
}

function daysBetween(a, b) {
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

function saveState() {
    try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
        localStorage.setItem(UI_KEY, JSON.stringify(ui));
    } catch (e) {
        console.warn('Could not save state', e);
    }
}

function loadState() {
    try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            Object.assign(state, parsed);
        }
        const uiraw = localStorage.getItem(UI_KEY);
        if (uiraw) Object.assign(ui, JSON.parse(uiraw));
    } catch (e) {
        console.warn('Could not load state', e);
    }
}

function isLoggedIn() {
    return localStorage.getItem(AUTH_KEY) === 'true';
}

function setLoggedIn(value) {
    localStorage.setItem(AUTH_KEY, value ? 'true' : 'false');
}

function showAppArea(authenticated) {
    const loginPage = document.getElementById('loginPage');
    const appContainer = document.querySelector('.container');
    if (loginPage) loginPage.classList.toggle('hidden', authenticated);
    if (appContainer) appContainer.classList.toggle('hidden', !authenticated);
}

function setupLogin() {
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    if (loginForm) {
        loginForm.addEventListener('submit', event => {
            event.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            if (!username || !password) {
                showToast('Enter both username and password', 'danger');
                return;
            }
            setLoggedIn(true);
            showAppArea(true);
            refreshAll();
            showToast(`Welcome ${username}`, 'success');
            loginForm.reset();
        });
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            setLoggedIn(false);
            showAppArea(false);
            showToast('Logged out successfully', 'info');
        });
    }
}

function showToast(message, type = 'info', timeout = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('visible');
    }, 50);
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => container.removeChild(toast), 400);
    }, timeout);
}

function buildItemOptions() {
    const items = state.items;
    const optionList = items.map(item => `<option value="${item.id}">${item.name}</option>`).join('');
    Object.values(refs.itemSelects).forEach(select => {
        if (select) select.innerHTML = `<option value="">Select Item</option>${optionList}`;
    });
    // populate filter select
    const filterItem = document.getElementById('filterItem');
    if (filterItem) filterItem.innerHTML = `<option value="">All Items</option>${optionList}`;
}

function syncItemDropdowns() {
    buildItemOptions();
}

function buildBatchOptions() {
    const options = state.batches.map(batch => `<option value="${batch.id}">${batch.batchNumber} (${batch.itemName})</option>`).join('');
    Object.values(refs.batchSelects).forEach(select => {
        select.innerHTML = `<option value="">Select Batch</option>${options}`;
    });
}

function calculateStock() {
    const map = new Map();
    state.batches.forEach(batch => {
        map.set(batch.id, {
            produced: batch.quantity,
            dispatch: 0,
            returns: 0,
            damage: 0,
            itemName: batch.itemName,
            batchNumber: batch.batchNumber,
            itemId: batch.itemId,
            expiryDate: batch.expiryDate || null
        });
    });
    state.dispatches.forEach(item => {
        const entry = map.get(item.batchId);
        if (entry) entry.dispatch += item.quantity;
    });
    state.returns.forEach(item => {
        const entry = map.get(item.batchId);
        if (entry) entry.returns += item.quantity;
    });
    state.damages.forEach(item => {
        const entry = map.get(item.batchId);
        if (entry) entry.damage += item.quantity;
    });
    return map;
}

function updateSummary() {
    const stockData = calculateStock();
    const totalProducts = state.items.length;
    const totalBatches = state.batches.length;
    const totalDispatch = state.dispatches.reduce((sum, item) => sum + item.quantity, 0);
    const totalReturns = state.returns.reduce((sum, item) => sum + item.quantity, 0);
    const totalDamage = state.damages.reduce((sum, item) => sum + item.quantity, 0);
    const totalStock = Array.from(stockData.values()).reduce((sum, row) => sum + Math.max(row.produced - row.dispatch - row.damage + row.returns, 0), 0);
    refs.summaryProducts.textContent = totalProducts;
    refs.summaryBatches.textContent = totalBatches;
    refs.summaryStock.textContent = formatKg(totalStock);
    refs.summaryDispatch.textContent = formatKg(totalDispatch);
    refs.summaryReturns.textContent = formatKg(totalReturns);
    refs.summaryDamage.textContent = formatKg(totalDamage);

    updateDashboardInsights(stockData, totalDispatch);
}

function updateDashboardInsights(stockData, totalDispatch) {
    const today = new Date();
    let nearExpiryCount = 0;
    let lowStockCount = 0;
    stockData.forEach(entry => {
        const available = Math.max(entry.produced - entry.dispatch - entry.damage + entry.returns, 0);
        if (entry.expiryDate) {
            const days = daysBetween(today, new Date(entry.expiryDate));
            if (days >= 0 && days <= 7) nearExpiryCount += 1;
        }
        if (available > 0 && available <= 20) lowStockCount += 1;
    });

    const expiryLabel = document.getElementById('insightExpiry');
    const lowStockLabel = document.getElementById('insightLowStock');
    const dispatchLabel = document.getElementById('insightDispatch');
    const nowLabel = document.getElementById('currentDateTimeHeader');
    if (expiryLabel) expiryLabel.textContent = `${nearExpiryCount}`;
    if (lowStockLabel) lowStockLabel.textContent = `${lowStockCount}`;
    if (dispatchLabel) dispatchLabel.textContent = `${totalDispatch.toFixed(1)} Kg`;
    if (nowLabel) nowLabel.textContent = new Date().toLocaleString();
}

function renderDashboardCards() {
    const cards = [
        { title: "Total Items", value: state.items.length, icon: 'fas fa-boxes', color: 'blue' },
        { title: "Total Batches", value: state.batches.length, icon: 'fas fa-cubes', color: 'green' },
        { title: "Dispatches", value: `${state.dispatches.reduce((sum, i) => sum + i.quantity, 0).toFixed(1)} Kg`, icon: 'fas fa-truck', color: 'orange' },
        { title: "Returns", value: `${state.returns.reduce((sum, i) => sum + i.quantity, 0).toFixed(1)} Kg`, icon: 'fas fa-undo', color: 'purple' },
        { title: "Near Expiry", value: (() => {
            const today = new Date();
            let near = 0;
            calculateStock().forEach(entry => {
                if (entry.expiryDate) {
                    const d = new Date(entry.expiryDate);
                    const days = daysBetween(today, d);
                    if (days >= 0 && days <= 7) near += Math.max(entry.produced - entry.dispatch - entry.damage + entry.returns, 0);
                }
            });
            return `${near.toFixed(1)} Kg`;
        })(), icon: 'fas fa-clock', color: 'cyan' }
    ];
    refs.dashboardCards.innerHTML = cards.map(card => `<div class="card ${card.color}"><i class="${card.icon}"></i><div><h5>${card.title}</h5><h2>${card.value}</h2></div></div>`).join('');
}

function renderItemTable() {
    refs.itemTable.innerHTML = state.items.map(item => `<tr><td>${item.name}</td><td>${item.category}</td><td>${item.unit}</td><td>${item.description}</td><td>${item.stock.toFixed(1)} ${item.unit}</td></tr>`).join('');
}

function renderProductionTable() {
    refs.productionTable.innerHTML = state.production.map(entry => `<tr><td>${entry.itemName}</td><td>${entry.batchNumber}</td><td>${formatKg(entry.quantity)}</td><td>${entry.date}</td></tr>`).join('');
}

function renderBatchTable() {
    const today = new Date();
    const rows = Array.from(calculateStock().values()).map(entry => {
        const available = Math.max(entry.produced - entry.dispatch - entry.damage + entry.returns, 0);
        let expiryText = '-';
        let expiryClass = '';
        if (entry.expiryDate) {
            const d = new Date(entry.expiryDate);
            const days = daysBetween(today, d);
            expiryText = `${days} day(s)`;
            if (days <= 7 && days >= 0) expiryClass = 'near-expiry';
            if (days < 0) expiryClass = 'expired';
        }
        const badge = expiryClass === 'near-expiry'
            ? '<span class="badge badge-warning">Near expiry</span>'
            : expiryClass === 'expired'
                ? '<span class="badge badge-danger">Expired</span>'
                : '<span class="badge badge-neutral">OK</span>';
        return `<tr class="${expiryClass}"><td>${entry.batchNumber}</td><td>${entry.itemName}</td><td>${formatKg(entry.produced)}</td><td>${formatKg(entry.dispatch)}</td><td>${formatKg(entry.returns)}</td><td>${formatKg(entry.damage)}</td><td>${formatKg(available)}</td><td>${expiryText}</td><td>${badge}</td></tr>`;
    });
    refs.batchTable.innerHTML = rows.join('');
}

function renderDispatchTable() {
    refs.dispatchTable.innerHTML = state.dispatches.map(entry => `<tr><td>${entry.itemName}</td><td>${entry.batchNumber}</td><td>${formatKg(entry.quantity)}</td><td>${entry.destination}</td><td>${entry.date}</td></tr>`).join('');
}

function renderReturnsTable() {
    refs.returnsTable.innerHTML = state.returns.map(entry => `<tr><td>${entry.itemName}</td><td>${entry.batchNumber}</td><td>${formatKg(entry.quantity)}</td><td>${entry.reason}</td><td>${entry.date}</td></tr>`).join('');
}

function renderDamageTable() {
    refs.damageTable.innerHTML = state.damages.map(entry => `<tr><td>${entry.itemName}</td><td>${entry.batchNumber}</td><td>${formatKg(entry.quantity)}</td><td>${entry.reason}</td><td>${entry.date}</td></tr>`).join('');
}

function renderLedgerTable() {
    const rows = Array.from(calculateStock().values()).map(entry => `<tr><td>${entry.itemName}</td><td>${formatKg(entry.produced)}</td><td>${formatKg(entry.dispatch)}</td><td>${formatKg(entry.returns)}</td><td>${formatKg(entry.damage)}</td><td>${formatKg(Math.max(entry.produced - entry.dispatch - entry.damage + entry.returns, 0))}</td></tr>`);
    refs.ledgerTable.innerHTML = rows.join('');
}

function refreshAll() {
    syncItemDropdowns();
    buildBatchOptions();
    renderDashboardCards();
    renderItemTable();
    renderProductionTable();
    renderBatchTable();
    renderDispatchTable();
    renderReturnsTable();
    renderDamageTable();
    renderLedgerTable();
    updateSummary();
}

function addItem(item) {
    item.id = `item-${Date.now()}`;
    if (typeof item.stock !== 'number') item.stock = 0;
    state.items.push(item);
    saveState();
    refreshAll();
}

function setupImport() {
    const importFile = document.getElementById('importFile');
    const importBtn = document.getElementById('importBtn');
    if (!importFile || !importBtn || typeof XLSX === 'undefined') return;
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = evt.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheet = workbook.SheetNames[0];
                const sheet = workbook.Sheets[firstSheet];
                const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                // prepare preview buffer with duplicate detection
                const buffer = [];
                rows.forEach(row => {
                    const name = row['Name'] || row['Item'] || row['Item Name'] || row['name'] || row['item'];
                    if (!name) return;
                    const unit = row['Unit'] || row['unit'] || 'Kg';
                    const category = row['Category'] || row['category'] || '';
                    const description = row['Description'] || row['Desc'] || row['description'] || '';
                    const stock = parseFloat(row['Stock']) || 0;
                    const isDuplicate = state.items.some(it => (it.name||'').trim().toLowerCase() === (name||'').trim().toLowerCase());
                    buffer.push({ name: String(name).trim(), unit, category, description, stock, isDuplicate, use: !isDuplicate });
                });
                // render preview
                const preview = document.getElementById('importPreview');
                const tbody = document.querySelector('#importPreviewTable tbody');
                if (!preview || !tbody) return;
                tbody.innerHTML = '';
                buffer.forEach((r, idx) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="padding:8px;text-align:center"><input type="checkbox" data-idx="${idx}" ${r.use? 'checked':''}></td>
                        <td style="padding:8px">${r.name}</td>
                        <td style="padding:8px">${r.unit}</td>
                        <td style="padding:8px">${r.category}</td>
                        <td style="padding:8px">${r.description}</td>
                        <td style="padding:8px">${r.stock}</td>
                        <td style="padding:8px">${r.isDuplicate? '<em>duplicate</em>':'new'}</td>
                    `;
                    tbody.appendChild(tr);
                });
                preview.classList.remove('hidden');

                // wire preview controls
                const selectAll = document.getElementById('selectAllImport');
                const invert = document.getElementById('invertSelectImport');
                const confirmBtn = document.getElementById('confirmImport');
                const cancelBtn = document.getElementById('cancelImport');

                function updateBufferFromUI() {
                    const checks = Array.from(document.querySelectorAll('#importPreviewTable tbody input[type=checkbox]'));
                    checks.forEach(ch => {
                        const idx = parseInt(ch.dataset.idx, 10);
                        buffer[idx].use = ch.checked;
                    });
                }

                if (selectAll) selectAll.onclick = () => {
                    document.querySelectorAll('#importPreviewTable tbody input[type=checkbox]').forEach(i => i.checked = true);
                    updateBufferFromUI();
                };
                if (invert) invert.onclick = () => {
                    document.querySelectorAll('#importPreviewTable tbody input[type=checkbox]').forEach(i => i.checked = !i.checked);
                    updateBufferFromUI();
                };
                if (cancelBtn) cancelBtn.onclick = () => { preview.classList.add('hidden'); tbody.innerHTML = ''; };
                if (confirmBtn) confirmBtn.onclick = () => {
                    updateBufferFromUI();
                    const toAdd = buffer.filter(r => r.use);
                    let added = 0;
                    toAdd.forEach(r => {
                        addItem({ name: r.name, unit: r.unit, category: r.category, description: r.description, stock: r.stock });
                        added++;
                    });
                    showToast(`${added} items imported`, 'success');
                    preview.classList.add('hidden');
                    tbody.innerHTML = '';
                };
            } catch (err) {
                console.error(err);
                showToast('Import failed: invalid file format', 'danger');
            }
            importFile.value = '';
        };
        // read as binary string for XLSX
        reader.readAsBinaryString(file);
    });
}

function addProduction(data) {
    const item = state.items.find(i => i.id === data.itemId);
    if (!item) return;
    // auto-generate batch number when empty
    const seq = state.batches.filter(b => b.itemId === item.id).length + 1;
    const autoBatch = `${item.name.replace(/\s+/g, '').substr(0,6).toUpperCase()}-${new Date().toISOString().slice(0,10)}-${String(seq).padStart(3,'0')}`;
    const batchNumber = data.batchNumber && data.batchNumber.length ? data.batchNumber : autoBatch;
    const batch = {
        id: `batch-${Date.now()}`,
        itemId: item.id,
        itemName: item.name,
        batchNumber,
        quantity: data.quantity,
        date: data.date,
        expiryDate: data.expiry || null
    };
    state.batches.push(batch);
    state.production.push({ ...batch });
    item.stock += data.quantity;
    saveState();
    showToast('Production recorded', 'success');
    refreshAll();
}

function addDispatch(data) {
    const item = state.items.find(i => i.id === data.itemId);
    const batch = state.batches.find(b => b.id === data.batchId);
    if (!item || !batch) return;
    const available = batch.quantity - state.dispatches.filter(d => d.batchId === batch.id).reduce((s, row) => s + row.quantity, 0) - state.damages.filter(d => d.batchId === batch.id).reduce((s, row) => s + row.quantity, 0) + state.returns.filter(r => r.batchId === batch.id).reduce((s, row) => s + row.quantity, 0);
    if (data.quantity > available) {
        alert('Not enough available stock in this batch');
        return;
    }
    state.dispatches.push({
        id: `dispatch-${Date.now()}`,
        itemId: item.id,
        itemName: item.name,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantity: data.quantity,
        destination: data.destination,
        date: new Date().toLocaleDateString()
    });
    item.stock -= data.quantity;
    saveState();
    showToast('Dispatch recorded', 'warning');
    refreshAll();
}

function addReturn(data) {
    const item = state.items.find(i => i.id === data.itemId);
    const batch = state.batches.find(b => b.id === data.batchId);
    if (!item || !batch) return;
    state.returns.push({
        id: `return-${Date.now()}`,
        itemId: item.id,
        itemName: item.name,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantity: data.quantity,
        reason: data.reason,
        date: new Date().toLocaleDateString()
    });
    item.stock += data.quantity;
    saveState();
    showToast('Return recorded', 'success');
    refreshAll();
}

function addDamage(data) {
    const item = state.items.find(i => i.id === data.itemId);
    const batch = state.batches.find(b => b.id === data.batchId);
    if (!item || !batch) return;
    const available = batch.quantity - state.dispatches.filter(d => d.batchId === batch.id).reduce((s, row) => s + row.quantity, 0) - state.damages.filter(d => d.batchId === batch.id).reduce((s, row) => s + row.quantity, 0) + state.returns.filter(r => r.batchId === batch.id).reduce((s, row) => s + row.quantity, 0);
    if (data.quantity > available) {
        alert('Not enough available stock in this batch');
        return;
    }
    state.damages.push({
        id: `damage-${Date.now()}`,
        itemId: item.id,
        itemName: item.name,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantity: data.quantity,
        reason: data.reason,
        date: new Date().toLocaleDateString()
    });
    item.stock -= data.quantity;
    saveState();
    showToast('Damage recorded', 'danger');
    refreshAll();
}

function exportCsv(filename, rows) {
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportInventoryReport() {
    const rows = [['Item', 'Batch', 'Produced', 'Dispatched', 'Returned', 'Damaged', 'Available']];
    calculateStock().forEach(entry => {
        const available = Math.max(entry.produced - entry.dispatch - entry.damage + entry.returns, 0);
        rows.push([entry.itemName, entry.batchNumber, entry.produced.toFixed(1), entry.dispatch.toFixed(1), entry.returns.toFixed(1), entry.damage.toFixed(1), available.toFixed(1)]);
    });
    exportCsv('inventory-report.csv', rows);
    showToast('Inventory exported', 'info');
}

function exportBatchReport() {
    const rows = [['Batch', 'Item', 'Produced', 'Dispatched', 'Returned', 'Damaged', 'Available']];
    calculateStock().forEach(entry => {
        const available = Math.max(entry.produced - entry.dispatch - entry.damage + entry.returns, 0);
        rows.push([entry.batchNumber, entry.itemName, entry.produced.toFixed(1), entry.dispatch.toFixed(1), entry.returns.toFixed(1), entry.damage.toFixed(1), available.toFixed(1)]);
    });
    exportCsv('batch-inventory.csv', rows);
    showToast('Batch report exported', 'info');
}

function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-item');
    const panels = document.querySelectorAll('.tab-content');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            panels.forEach(panel => panel.classList.remove('active'));
            const target = document.getElementById(button.dataset.panel);
            if (target) target.classList.add('active');
            // close sidebar on small screens after navigation
            const sb = document.querySelector('.sidebar');
            if (sb && window.innerWidth <= 900) sb.classList.remove('open');
        });
    });
}

// menu toggle for small screens
const menuBtn = document.getElementById('menuBtn');
if (menuBtn) {
    menuBtn.addEventListener('click', () => {
        const sb = document.querySelector('.sidebar');
        if (sb) sb.classList.toggle('open');
    });
}

function setupFilters() {
    const filterItem = document.getElementById('filterItem');
    const filterStatus = document.getElementById('filterStatus');
    const filterFrom = document.getElementById('filterFrom');
    const filterTo = document.getElementById('filterTo');
    const clear = document.getElementById('clearFilters');
    function apply() {
        // simplest: re-render batch table and then hide rows that don't match
        renderBatchTable();
        const rows = document.querySelectorAll('#batchTable tbody tr');
        rows.forEach(row => {
            let show = true;
            if (filterItem && filterItem.value) {
                show = show && row.cells[1].textContent === (filterItem.options[filterItem.selectedIndex].text || '');
            }
            if (filterStatus && filterStatus.value === 'near-expiry') {
                show = show && row.classList.contains('near-expiry');
            }
            if (filterStatus && filterStatus.value === 'low-stock') {
                const availableText = row.cells[6].textContent || '0';
                const num = parseFloat(availableText);
                show = show && num > 0 && num <= 10; // low threshold
            }
            if (filterFrom && filterFrom.value) {
                const from = new Date(filterFrom.value);
                const batchDateCell = row.cells[0];
                // no direct produced date cell; skip strict filtering here
            }
            row.style.display = show ? '' : 'none';
        });
    }
    [filterItem, filterStatus, filterFrom, filterTo].forEach(el => { if (el) el.addEventListener('change', apply); });
    if (clear) clear.addEventListener('click', () => {
        if (filterItem) filterItem.value = '';
        if (filterStatus) filterStatus.value = 'all';
        if (filterFrom) filterFrom.value = '';
        if (filterTo) filterTo.value = '';
        apply();
    });
}

function applyUISettings() {
    if (ui.darkMode) document.body.classList.add('dark');
    const dm = document.getElementById('darkModeToggle');
    if (dm) dm.addEventListener('click', () => {
        ui.darkMode = !ui.darkMode;
        document.body.classList.toggle('dark');
        saveState();
        showToast(ui.darkMode ? 'Dark mode on' : 'Dark mode off', 'info');
    });
    const bell = document.getElementById('notificationBell');
    if (bell) bell.addEventListener('click', () => showToast('No new notifications', 'info'));
}

function setupForms() {
    refs.itemForm.addEventListener('submit', event => {
        event.preventDefault();
        addItem({
            name: document.getElementById('itemName').value.trim(),
            unit: document.getElementById('itemUnit').value.trim(),
            category: document.getElementById('itemCategory').value.trim(),
            description: document.getElementById('itemDescription').value.trim()
        });
        refs.itemForm.reset();
    });

    refs.productionForm.addEventListener('submit', event => {
        event.preventDefault();
        const itemId = refs.itemSelects.production.value;
        if (!itemId) {
            showToast('Select an item before saving production', 'danger');
            return;
        }
        addProduction({
            itemId,
            batchNumber: document.getElementById('productionBatch').value.trim(),
            quantity: parseFloat(document.getElementById('productionQty').value),
            date: document.getElementById('productionDate').value,
            expiry: document.getElementById('productionExpiry').value || null
        });
        refs.productionForm.reset();
    });

    refs.dispatchForm.addEventListener('submit', event => {
        event.preventDefault();
        const itemId = refs.itemSelects.dispatch.value;
        const batchId = refs.batchSelects.dispatch.value;
        if (!itemId || !batchId) {
            showToast('Select both item and batch before saving dispatch', 'danger');
            return;
        }
        addDispatch({
            itemId,
            batchId,
            quantity: parseFloat(document.getElementById('dispatchQty').value),
            destination: document.getElementById('dispatchDestination').value.trim()
        });
        refs.dispatchForm.reset();
    });

    refs.returnsForm.addEventListener('submit', event => {
        event.preventDefault();
        const itemId = refs.itemSelects.returns.value;
        const batchId = refs.batchSelects.returns.value;
        if (!itemId || !batchId) {
            showToast('Select both item and batch before saving return', 'danger');
            return;
        }
        addReturn({
            itemId,
            batchId,
            quantity: parseFloat(document.getElementById('returnsQty').value),
            reason: document.getElementById('returnsReason').value.trim()
        });
        refs.returnsForm.reset();
    });

    refs.damageForm.addEventListener('submit', event => {
        event.preventDefault();
        const itemId = refs.itemSelects.damage.value;
        const batchId = refs.batchSelects.damage.value;
        if (!itemId || !batchId) {
            showToast('Select both item and batch before saving damage', 'danger');
            return;
        }
        addDamage({
            itemId,
            batchId,
            quantity: parseFloat(document.getElementById('damageQty').value),
            reason: document.getElementById('damageReason').value.trim()
        });
        refs.damageForm.reset();
    });

    document.getElementById('exportAll').addEventListener('click', exportInventoryReport);
    document.getElementById('exportBatch').addEventListener('click', exportBatchReport);
}

function setupSearch() {
    refs.searchInput.addEventListener('input', event => {
        const query = event.target.value.toLowerCase();
        const filterRows = (tableBody, extractor) => {
            Array.from(tableBody.children).forEach(row => {
                const text = extractor(row).toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        };
        filterRows(refs.itemTable, row => row.textContent);
        filterRows(refs.productionTable, row => row.textContent);
        filterRows(refs.batchTable, row => row.textContent);
        filterRows(refs.dispatchTable, row => row.textContent);
        filterRows(refs.returnsTable, row => row.textContent);
        filterRows(refs.damageTable, row => row.textContent);
        filterRows(refs.ledgerTable, row => row.textContent);
    });
}

function setupDateTime() {
    const currentDateTime = document.getElementById('currentDateTime');
    const updateTime = () => {
        if (currentDateTime) currentDateTime.textContent = new Date().toLocaleString();
    };
    updateTime();
    setInterval(updateTime, 60000);
}

function setupDashboardRefresh() {
    const refreshBtn = document.getElementById('refreshDashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshAll();
            showToast('Dashboard refreshed', 'info');
        });
    }
}

function init() {
    loadState();
    setupLogin();
    setupNavigation();
    setupForms();
    setupSearch();
    setupFilters();
    applyUISettings();
    setupDateTime();
    setupDashboardRefresh();
    setupImport();
    if (isLoggedIn()) {
        showAppArea(true);
        refreshAll();
    } else {
        showAppArea(false);
    }
}

window.addEventListener('DOMContentLoaded', init);
