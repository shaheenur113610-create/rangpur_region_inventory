/* =====================================================
   stock.js : Bulk Stock In / Out, Transaction History,
              Receipt (challan) preview & print
   ===================================================== */
Object.assign(APP, {

  // ========== VOUCHER NUMBERING ==========
  formatNo(type, year, seq) {
    const p = this.getSettings().prefix;
    const n = String(seq).padStart(4, '0');
    return type === 'out' ? `${p}/${year}/${n}` : `${p}/IN/${year}/${n}`;
  },
  nextVoucherNo(type, date) {
    const year = (date || this.today()).slice(0, 4);
    const seq = (this.getSettings().counters[type + year] || 0) + 1;
    return this.formatNo(type, year, seq);
  },
  refreshNo() {
    const f = document.getElementById('bulkForm');
    const el = document.getElementById('nextNo');
    if (f && el) el.textContent = this.nextVoucherNo(f.dataset.type, f.date.value);
  },

  // ========== BULK TABLE (shared by stock in / out) ==========
  bulkTable(items, type) {
    const isOut = type === 'out';
    return `
      <div class="table-wrapper bulk-wrap">
        <table id="bulkTable">
          <thead><tr>
            <th style="width:48px">#</th><th>কোড</th><th>আইটেম নাম</th><th>ইউনিট</th>
            <th class="r">বর্তমান স্টক</th><th style="width:170px">${isOut ? 'ডিস্ট্রিবিউট পরিমাণ' : 'গ্রহণ পরিমাণ'}</th>
          </tr></thead>
          <tbody>
            ${items.map((i, n) => {
              const hide = isOut && i.currentStock === 0;
              return `
              <tr class="bulk-row" data-id="${i.id}" data-stock="${i.currentStock}" data-q="${esc((i.name + ' ' + i.code).toLowerCase())}" ${hide ? 'style="display:none"' : ''}>
                <td>${n + 1}</td>
                <td><code>${esc(i.code)}</code></td>
                <td><strong>${esc(i.name)}</strong></td>
                <td>${esc(i.unit)}</td>
                <td class="r"><strong>${i.currentStock}</strong></td>
                <td>
                  <input type="number" class="form-control qty-input" min="0" step="1" placeholder="0"
                    ${hide ? 'disabled' : ''} oninput="APP.updateBulkSummary()" onkeydown="APP.qtyKey(event)">
                  <small class="err-msg"></small>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  qtyKey(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const inputs = [...document.querySelectorAll('#bulkTable tr.bulk-row')]
      .filter((r) => r.style.display !== 'none')
      .map((r) => r.querySelector('.qty-input'))
      .filter((i) => i && !i.disabled);
    const next = inputs[inputs.indexOf(e.target) + 1];
    if (next) next.focus();
  },

  filterBulk() {
    const q = (document.getElementById('bulkSearch')?.value || '').trim().toLowerCase();
    const onlyStock = document.getElementById('onlyInStock')?.checked;
    document.querySelectorAll('#bulkTable tr.bulk-row').forEach((r) => {
      const inp = r.querySelector('.qty-input');
      const hasVal = inp.value.trim() !== '';
      const okQ = !q || r.dataset.q.includes(q);
      const okStock = !onlyStock || Number(r.dataset.stock) > 0 || hasVal;
      r.style.display = okQ && okStock ? '' : 'none';
    });
  },

  clearBulk() {
    document.querySelectorAll('#bulkTable .qty-input').forEach((i) => { i.value = ''; });
    this.updateBulkSummary();
  },

  updateBulkSummary() {
    const form = document.getElementById('bulkForm');
    if (!form) return;
    const isOut = form.dataset.type === 'out';
    let count = 0, total = 0, errors = 0;
    document.querySelectorAll('#bulkTable tr.bulk-row').forEach((row) => {
      const raw = row.querySelector('.qty-input').value.trim();
      const stock = Number(row.dataset.stock);
      let err = '';
      if (raw !== '') {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0) err = 'সঠিক সংখ্যা দিন';
        else if (n > 0) {
          count++; total += n;
          if (isOut && n > stock) err = `স্টক মাত্র ${stock}`;
        }
      }
      row.classList.toggle('row-error', !!err);
      row.classList.toggle('row-filled', raw !== '' && !err && Number(raw) > 0);
      row.querySelector('.err-msg').textContent = err;
      if (err) errors++;
    });
    document.getElementById('bulkSummary').innerHTML = `
      <span><i class="fas fa-list-check"></i> নির্বাচিত আইটেম: <strong>${count}</strong></span>
      <span><i class="fas fa-cubes"></i> মোট পরিমাণ: <strong>${total}</strong></span>
      ${errors ? `<span class="text-danger"><i class="fas fa-triangle-exclamation"></i> ${errors} টি ভুল</span>` : ''}`;
    document.getElementById('bulkSubmit').disabled = count === 0 || errors > 0;
  },

  collectLines() {
    const lines = [];
    document.querySelectorAll('#bulkTable tr.bulk-row').forEach((row) => {
      const raw = row.querySelector('.qty-input').value.trim();
      if (raw === '') return;
      const n = Number(raw);
      if (Number.isInteger(n) && n > 0) lines.push({ itemId: Number(row.dataset.id), qty: n });
    });
    return lines;
  },

  linesPreviewHTML(lines) {
    const items = this.getItems();
    const total = lines.reduce((s, l) => s + l.qty, 0);
    return `
      <div class="table-wrapper" style="max-height:320px;overflow:auto">
        <table class="mini-table">
          <thead><tr><th>#</th><th>আইটেম</th><th class="r">পরিমাণ</th></tr></thead>
          <tbody>${lines.map((l, n) => {
            const it = items.find((x) => x.id === l.itemId);
            return `<tr><td>${n + 1}</td><td>${esc(it?.name || '-')}</td><td class="r"><strong>${l.qty}</strong> ${esc(it?.unit || '')}</td></tr>`;
          }).join('')}</tbody>
          <tfoot><tr><td colspan="2"><strong>মোট (${lines.length} আইটেম)</strong></td><td class="r"><strong>${total}</strong></td></tr></tfoot>
        </table>
      </div>`;
  },

  // ========== STOCK IN ==========
  renderStockIn(c) {
    const items = this.getAllStock();
    if (items.length === 0) {
      c.innerHTML = '<div class="card"><div class="card-body"><div class="empty-state"><i class="fas fa-box-open"></i><h4>আগে আইটেম মাস্টারে আইটেম যোগ করুন</h4></div></div></div>';
      return;
    }
    c.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-arrow-down"></i> বাল্ক স্টক ইন</h3>
          <span class="chip">পরবর্তী নং: <strong id="nextNo">${esc(this.nextVoucherNo('in', this.today()))}</strong></span>
        </div>
        <div class="card-body">
          <form id="bulkForm" data-type="in" onsubmit="APP.saveStockIn(event)">
            <div class="form-grid">
              <div class="form-group"><label>তারিখ <span class="required">*</span></label>
                <input type="date" class="form-control" name="date" value="${this.today()}" onchange="APP.refreshNo()" required></div>
              <div class="form-group"><label>রেফারেন্স / সরবরাহ চালান নং</label>
                <input type="text" class="form-control" name="reference" placeholder="HO-INV-003"></div>
              <div class="form-group"><label>প্রাপ্তির ধরন <span class="required">*</span></label>
                <select class="form-control" name="source" required>
                  <option>Head Office থেকে প্রাপ্তি</option>
                  <option>ওপেনিং স্টক</option>
                  <option>সরবরাহকারী থেকে ক্রয়</option>
                  <option>অন্যান্য</option>
                </select></div>
              <div class="form-group"><label>মন্তব্য</label>
                <input type="text" class="form-control" name="remarks"></div>
            </div>

            <div class="bulk-toolbar">
              <input type="text" class="form-control" id="bulkSearch" placeholder="আইটেম খুঁজুন (নাম/কোড)..." oninput="APP.filterBulk()">
              <button type="button" class="btn btn-outline btn-sm" onclick="APP.clearBulk()"><i class="fas fa-eraser"></i> সব পরিমাণ মুছুন</button>
            </div>
            <p class="muted small-note">যে আইটেমগুলো এই চালানে এসেছে শুধু সেগুলোর পরিমাণ বসান, বাকি ঘর খালি রাখুন। <kbd>Enter</kbd> চাপলে পরের ঘরে যাবে।</p>
            ${this.bulkTable(items, 'in')}

            <div class="bulk-footer">
              <div class="bulk-summary" id="bulkSummary"></div>
              <button type="submit" class="btn btn-success" id="bulkSubmit" disabled><i class="fas fa-save"></i> স্টক ইন সেভ করুন</button>
            </div>
          </form>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>সাম্প্রতিক স্টক ইন</h3></div>
        <div class="card-body">${this.recentVouchersTable('in')}</div>
      </div>`;
    this.updateBulkSummary();
  },

  saveStockIn(e) {
    e.preventDefault();
    const f = e.target;
    const lines = this.collectLines();
    if (!lines.length) { this.showToast('কমপক্ষে একটি আইটেমের পরিমাণ দিন', 'error'); return; }
    const d = {
      type: 'in', date: f.date.value, reference: f.reference.value.trim(),
      source: f.source.value, remarks: f.remarks.value.trim(), lines
    };
    this.confirmModal({
      title: 'স্টক ইন নিশ্চিত করুন', okText: '<i class="fas fa-check"></i> নিশ্চিত ও সেভ', okClass: 'btn-success', wide: true,
      html: `<p class="mb">${esc(d.source)} • তারিখ: ${this.formatDate(d.date)}${d.reference ? ' • রেফ: ' + esc(d.reference) : ''}</p>${this.linesPreviewHTML(lines)}`,
      onOk: () => this.commitVoucher(d)
    });
  },

  // ========== STOCK OUT ==========
  renderStockOut(c) {
    const items = this.getAllStock();
    const branches = [...this.getBranches()].sort((a, b) => a.code.localeCompare(b.code));
    if (items.length === 0 || branches.length === 0) {
      c.innerHTML = '<div class="card"><div class="card-body"><div class="empty-state"><i class="fas fa-box-open"></i><h4>আইটেম ও শাখা যোগ করার পর ডিস্ট্রিবিউশন করুন</h4></div></div></div>';
      return;
    }
    c.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-arrow-up"></i> বাল্ক স্টক আউট / শাখায় ডিস্ট্রিবিউশন</h3>
          <span class="chip">চালান নং: <strong id="nextNo">${esc(this.nextVoucherNo('out', this.today()))}</strong></span>
        </div>
        <div class="card-body">
          <form id="bulkForm" data-type="out" onsubmit="APP.saveStockOut(event)">
            <div class="form-grid">
              <div class="form-group"><label>তারিখ <span class="required">*</span></label>
                <input type="date" class="form-control" name="date" value="${this.today()}" onchange="APP.refreshNo()" required></div>
              <div class="form-group"><label>শাখা <span class="required">*</span></label>
                <select class="form-control" name="branchId" onchange="APP.showBranchInfo(this)" required>
                  <option value="">-- শাখা সিলেক্ট করুন --</option>
                  ${branches.map((b) => `<option value="${b.id}">${esc(b.code)} - ${esc(b.name)}</option>`).join('')}
                </select>
                <small class="muted" id="branchInfo"></small></div>
              <div class="form-group"><label>রিকুইজিশন / মেমো নং <span class="required">*</span></label>
                <input type="text" class="form-control" name="reference" required placeholder="REQ-001"></div>
              <div class="form-group"><label>মন্তব্য</label>
                <input type="text" class="form-control" name="remarks"></div>
            </div>

            <div class="bulk-toolbar">
              <input type="text" class="form-control" id="bulkSearch" placeholder="আইটেম খুঁজুন (নাম/কোড)..." oninput="APP.filterBulk()">
              <label class="check-inline"><input type="checkbox" id="onlyInStock" checked onchange="APP.filterBulk()"> শুধু স্টক আছে এমন আইটেম</label>
              <button type="button" class="btn btn-outline btn-sm" onclick="APP.clearBulk()"><i class="fas fa-eraser"></i> সব পরিমাণ মুছুন</button>
            </div>
            <p class="muted small-note">এই শাখার জন্য যা যা পাঠাবেন শুধু সেগুলোর পরিমাণ বসান। স্টকের বেশি দিলে ঘর লাল হবে এবং সেভ বন্ধ থাকবে।</p>
            ${this.bulkTable(items, 'out')}

            <div class="bulk-footer">
              <div class="bulk-summary" id="bulkSummary"></div>
              <button type="submit" class="btn btn-primary" id="bulkSubmit" disabled><i class="fas fa-truck"></i> ডিস্ট্রিবিউশন সেভ করুন</button>
            </div>
          </form>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>সাম্প্রতিক ডিস্ট্রিবিউশন</h3></div>
        <div class="card-body">${this.recentVouchersTable('out')}</div>
      </div>`;
    this.updateBulkSummary();
  },

  showBranchInfo(sel) {
    const b = this.getBranches().find((x) => x.id === Number(sel.value));
    document.getElementById('branchInfo').textContent = b
      ? `কোড: ${b.code}${b.address ? ' • ' + b.address : ''}${b.contact ? ' • ' + b.contact : ''}` : '';
  },

  saveStockOut(e) {
    e.preventDefault();
    const f = e.target;
    const lines = this.collectLines();
    if (!lines.length) { this.showToast('কমপক্ষে একটি আইটেমের পরিমাণ দিন', 'error'); return; }
    const sm = this.stockMap();
    const items = this.getItems();
    const bad = lines.find((l) => l.qty > (sm[l.itemId] || 0));
    if (bad) {
      const it = items.find((x) => x.id === bad.itemId);
      this.showToast(`পর্যাপ্ত স্টক নেই: ${it?.name} (স্টক: ${sm[bad.itemId] || 0})`, 'error'); return;
    }
    const branch = this.getBranches().find((b) => b.id === Number(f.branchId.value));
    if (!branch) { this.showToast('শাখা সিলেক্ট করুন', 'error'); return; }
    const d = {
      type: 'out', date: f.date.value, branchId: branch.id, reference: f.reference.value.trim(),
      remarks: f.remarks.value.trim(), lines
    };
    this.confirmModal({
      title: 'ডিস্ট্রিবিউশন নিশ্চিত করুন', okText: '<i class="fas fa-check"></i> নিশ্চিত ও সেভ', wide: true,
      html: `<p class="mb"><strong>${esc(branch.name)}</strong> (কোড: ${esc(branch.code)}) • তারিখ: ${this.formatDate(d.date)} • মেমো: ${esc(d.reference)}</p>${this.linesPreviewHTML(lines)}`,
      onOk: () => this.commitVoucher(d)
    });
  },

  // ========== SAVE VOUCHER ==========
  async commitVoucher(d) {
    const items = this.getItems();
    if (d.type === 'out') {
      const sm = this.stockMap();
      const bad = d.lines.find((l) => l.qty > (sm[l.itemId] || 0));
      if (bad) { this.showToast('পর্যাপ্ত স্টক নেই, আবার চেক করুন', 'error'); return; }
    }
    const st = this.getSettings();
    const year = d.date.slice(0, 4);
    const ck = d.type + year;
    const seq = (st.counters[ck] || 0) + 1;
    const no = this.formatNo(d.type, year, seq);
    const branch = d.branchId ? this.getBranches().find(b => b.id === d.branchId) : null;
    const payload = {
      p_document_no:no,
      p_document_type:d.type === 'in' ? 'receipt' : 'issue',
      p_document_date:d.date,
      p_branch_id:branch?._dbId || null,
      p_source_name:d.source || '',
      p_reference_no:d.reference || '',
      p_remarks:d.remarks || '',
      p_lines:d.lines.map(line => {
        const item = items.find(x => x.id === line.itemId);
        if (!item?._dbId) throw new Error('আইটেমের Database ID পাওয়া যায়নি');
        return { item_id:item._dbId, quantity:line.qty };
      })
    };
    try {
      const { data, error } = await sbClient.rpc('create_inventory_voucher', payload);
      if (error) throw error;
      st.counters[ck] = seq;
      await this.saveSettings(st);
      await this.loadCloudData();
      const v = this.getVouchers().find(x => x._dbId === data);
      if (!v) throw new Error('চালান সেভ হয়েছে, কিন্তু রিফ্রেশ করে পাওয়া যায়নি');
      const total = v.lines.reduce((s, l) => s + l.qty, 0);
      if (v.type === 'in') {
        this.notify('success', 'স্টক ইন সম্পন্ন', `${v.no} — ${v.lines.length} টি আইটেম, মোট ${total}।`, v.id);
      } else {
        this.notify('success', 'ডিস্ট্রিবিউশন সম্পন্ন', `${branch?.name || 'শাখা'} — ${v.no}, ${v.lines.length} টি আইটেম, মোট ${total}।`, v.id);
        const sm = this.stockMap();
        const low = v.lines.map((l) => items.find((i) => i.id === l.itemId))
          .filter((i) => i && (i.reorderLevel || 0) > 0 && (sm[i.id] || 0) <= i.reorderLevel);
        if (low.length) this.notify('warning', 'লো স্টক সতর্কতা',
          low.slice(0, 5).map((i) => `${i.name} (বাকি ${sm[i.id] || 0})`).join(', ') + (low.length > 5 ? ` ... আরও ${low.length - 5} টি` : ''));
      }
      this.showToast(`${v.type === 'in' ? 'স্টক ইন' : 'ডিস্ট্রিবিউশন'} সফল! নং: ${v.no}`);
      this.navigate(v.type === 'in' ? 'stock-in' : 'stock-out');
      this.previewVoucher(v.id);
    } catch (error) {
      console.error('Inventory voucher save failed:', error);
      this.showToast(error.message || 'Supabase-এ চালান সেভ করা যায়নি', 'error');
    }
  },

  recentVouchersTable(type) {
    const list = this.getVouchers().filter((v) => v.type === type)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
    if (!list.length) return '<div class="empty-state" style="padding:30px"><i class="fas fa-inbox"></i><h4>কোনো রেকর্ড নেই</h4></div>';
    const branches = this.getBranches();
    return `<div class="table-wrapper"><table>
      <thead><tr><th>তারিখ</th><th>চালান নং</th>${type === 'out' ? '<th>শাখা</th>' : '<th>উৎস</th>'}<th>আইটেম</th><th>মোট</th><th></th></tr></thead>
      <tbody>${list.map((v) => `
        <tr class="${v.status === 'cancelled' ? 'tx-cancelled' : ''}">
          <td>${this.formatDate(v.date)}</td><td><code>${esc(v.no)}</code></td>
          <td>${type === 'out' ? esc(branches.find((b) => b.id === v.branchId)?.name || '-') : esc(v.source || '-')}</td>
          <td>${v.lines.length}</td><td><strong>${v.lines.reduce((s, l) => s + l.qty, 0)}</strong></td>
          <td><button class="btn btn-outline btn-sm" onclick="APP.previewVoucher(${v.id})"><i class="fas fa-print"></i> প্রিন্ট</button></td>
        </tr>`).join('')}</tbody></table></div>`;
  },

  // ========== TRANSACTION HISTORY ==========
  renderTransactions(c) {
    this.tx = { type: '', branch: '', from: '', to: '', q: '', page: 1 };
    const branches = [...this.getBranches()].sort((a, b) => a.code.localeCompare(b.code));
    c.innerHTML = `
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-exchange-alt"></i> সকল ট্রানজেকশন (<span id="txCount">0</span>)</h3></div>
        <div class="card-body">
          <div class="filters">
            <select class="form-control" id="txType" onchange="APP.setTx()">
              <option value="">সব ধরন</option><option value="in">স্টক ইন</option><option value="out">স্টক আউট</option>
            </select>
            <select class="form-control" id="txBranch" onchange="APP.setTx()">
              <option value="">সব শাখা</option>
              ${branches.map((b) => `<option value="${b.id}">${esc(b.code)} - ${esc(b.name)}</option>`).join('')}
            </select>
            <input type="date" class="form-control" id="txFrom" onchange="APP.setTx()" title="শুরুর তারিখ">
            <input type="date" class="form-control" id="txTo" onchange="APP.setTx()" title="শেষ তারিখ">
            <input type="text" class="form-control" id="txSearch" placeholder="সার্চ (চালান নং, আইটেম, শাখা)..." oninput="APP.setTx()">
          </div>
          <div id="txBody"></div>
        </div>
      </div>`;
    this.renderTxBody();
  },

  setTx() {
    this.tx = {
      type: document.getElementById('txType').value, branch: document.getElementById('txBranch').value,
      from: document.getElementById('txFrom').value, to: document.getElementById('txTo').value,
      q: document.getElementById('txSearch').value.trim().toLowerCase(), page: 1
    };
    this.renderTxBody();
  },
  txPage(p) { this.tx.page = p; this.renderTxBody(); },

  renderTxBody() {
    const t = this.tx, PER = 25;
    const items = this.getItems(), branches = this.getBranches();
    let list = this.getVouchers().filter((v) => {
      if (t.type && v.type !== t.type) return false;
      if (t.branch && v.branchId !== Number(t.branch)) return false;
      if (t.from && v.date < t.from) return false;
      if (t.to && v.date > t.to) return false;
      if (t.q) {
        const br = branches.find((b) => b.id === v.branchId);
        const hay = [v.no, v.reference, v.remarks, v.source, br?.name, br?.code,
          ...v.lines.map((l) => items.find((i) => i.id === l.itemId)?.name)].join(' ').toLowerCase();
        if (!hay.includes(t.q)) return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

    document.getElementById('txCount').textContent = list.length;
    const pages = Math.max(1, Math.ceil(list.length / PER));
    t.page = Math.min(t.page, pages);
    const slice = list.slice((t.page - 1) * PER, t.page * PER);

    if (!list.length) {
      document.getElementById('txBody').innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><h4>কোনো ট্রানজেকশন পাওয়া যায়নি</h4></div>';
      return;
    }
    document.getElementById('txBody').innerHTML = `
      <div class="table-wrapper"><table>
        <thead><tr><th>তারিখ</th><th>ধরন</th><th>চালান নং</th><th>শাখা / উৎস</th><th>আইটেম</th><th>মোট পরিমাণ</th><th>রেফারেন্স</th><th>অ্যাকশন</th></tr></thead>
        <tbody>${slice.map((v) => {
          const br = branches.find((b) => b.id === v.branchId);
          const isIn = v.type === 'in';
          const total = v.lines.reduce((s, l) => s + l.qty, 0);
          const cancelled = v.status === 'cancelled';
          return `
          <tr class="${cancelled ? 'tx-cancelled' : ''}">
            <td>${this.formatDate(v.date)}</td>
            <td><span class="badge badge-${v.type}">${isIn ? 'IN' : 'OUT'}</span>${cancelled ? ' <span class="badge badge-cancel">বাতিল</span>' : ''}</td>
            <td><code>${esc(v.no)}</code></td>
            <td>${isIn ? esc(v.source || '—') : esc((br ? br.code + ' - ' + br.name : '-'))}</td>
            <td>${v.lines.length}</td>
            <td><strong style="color:${isIn ? 'var(--success)' : 'var(--danger)'}">${isIn ? '+' : '-'}${total}</strong></td>
            <td>${esc(v.reference || '-')}</td>
            <td class="nowrap">
              <button class="btn btn-accent btn-sm" onclick="APP.previewVoucher(${v.id})"><i class="fas fa-print"></i> প্রিন্ট</button>
              ${cancelled ? '' : `<button class="btn btn-outline btn-icon" title="বাতিল করুন" style="color:var(--danger)" onclick="APP.openCancelModal(${v.id})"><i class="fas fa-ban"></i></button>`}
            </td>
          </tr>`;
        }).join('')}</tbody></table></div>
      ${pages > 1 ? `<div class="pager">
        <button class="btn btn-outline btn-sm" ${t.page === 1 ? 'disabled' : ''} onclick="APP.txPage(${t.page - 1})">&laquo; আগের</button>
        <span>পৃষ্ঠা ${t.page} / ${pages}</span>
        <button class="btn btn-outline btn-sm" ${t.page === pages ? 'disabled' : ''} onclick="APP.txPage(${t.page + 1})">পরের &raquo;</button></div>` : ''}`;
  },

  // ========== CANCEL VOUCHER ==========
  openCancelModal(id) {
    const v = this.getVouchers().find((x) => x.id === id);
    if (!v) return;
    document.getElementById('modalContainer').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)APP.closeModal()">
        <div class="modal"><div class="modal-header"><h3>চালান বাতিল: ${esc(v.no)}</h3>
          <button class="modal-close" onclick="APP.closeModal()"><i class="fas fa-times"></i></button></div>
          <div class="modal-body">
            <p class="mb">বাতিল করলে এই চালানের মালামাল স্টক হিসাব থেকে ${v.type === 'in' ? 'বাদ যাবে' : 'ফেরত আসবে (স্টকে যোগ হবে)'}। রেকর্ডটি হিস্টরিতে "বাতিল" হিসেবে থাকবে।</p>
            <form onsubmit="APP.cancelVoucher(event, ${id})">
              <div class="form-group"><label>বাতিলের কারণ <span class="required">*</span></label>
                <textarea class="form-control" name="reason" rows="3" required></textarea></div>
              <div class="form-actions">
                <button type="button" class="btn btn-outline" onclick="APP.closeModal()">না</button>
                <button type="submit" class="btn btn-danger"><i class="fas fa-ban"></i> বাতিল করুন</button>
              </div>
            </form>
          </div></div></div>`;
  },

  async cancelVoucher(e, id) {
    e.preventDefault();
    const reason = e.target.reason.value.trim();
    const v = this.getVouchers().find((x) => x.id === id);
    if (!v || v.status === 'cancelled' || !reason) return;
    try {
      const { error } = await sbClient.rpc('cancel_inventory_voucher', {
        p_document_id:v._dbId, p_reason:reason
      });
      if (error) throw error;
      await this.loadCloudData();
      this.notify('danger', 'চালান বাতিল', `${v.no} বাতিল করা হয়েছে। কারণ: ${reason}`, v.id);
      this.showToast('চালান বাতিল হয়েছে');
      this.closeModal();
      this.navigate('transactions');
    } catch (error) {
      console.error('Voucher cancellation failed:', error);
      this.showToast(error.message || 'চালান বাতিল করা যায়নি', 'error');
    }
  },

  // ========== RECEIPT ==========
  receiptHTML(v, copyLabel) {
    const s = this.getSettings();
    const items = this.getItems();
    const br = this.getBranches().find((b) => b.id === v.branchId);
    const isOut = v.type === 'out';
    const total = v.lines.reduce((a, l) => a + l.qty, 0);
    const rows = v.lines.map((l, n) => {
      const it = items.find((x) => x.id === l.itemId) || {};
      return `<tr><td class="c">${n + 1}</td><td>${esc(it.code || '-')}</td><td>${esc(it.name || '(মুছে ফেলা আইটেম)')}</td><td class="c">${esc(it.unit || '')}</td><td class="r"><strong>${l.qty}</strong></td></tr>`;
    }).join('');
    const signs = isOut
      ? ['প্রস্তুতকারী', 'যাচাইকারী (স্টোর)', 'অনুমোদনকারী', 'গ্রহণকারী (শাখা প্রতিনিধি)']
      : ['গ্রহণকারী', 'যাচাইকারী', 'অনুমোদনকারী'];

    return `
    <section class="receipt-page">
      ${v.status === 'cancelled' ? '<div class="rc-stamp">বাতিলকৃত</div>' : ''}
      <div class="rc-head">
        <div class="rc-org">${esc(s.orgName)}</div>
        <div class="rc-office">${esc(s.officeName)}</div>
        <div class="rc-title">${isOut ? 'ডেলিভারি চালান' : 'মালামাল গ্রহণ রসিদ'}
          <small>${isOut ? 'Delivery Challan' : 'Goods Received Note'}</small></div>
        <div class="rc-copy">${esc(copyLabel)}</div>
      </div>
      <table class="rc-meta">
        <tr><td><span>চালান নং:</span> <b>${esc(v.no)}</b></td><td class="r"><span>তারিখ:</span> <b>${this.formatDate(v.date)}</b></td></tr>
        <tr><td><span>${isOut ? 'রিকুইজিশন / মেমো নং' : 'রেফারেন্স / সরবরাহ চালান নং'}:</span> <b>${esc(v.reference || '-')}</b></td>
            <td class="r">${isOut ? '' : `<span>প্রাপ্তির ধরন:</span> <b>${esc(v.source || '-')}</b>`}</td></tr>
      </table>
      ${isOut ? `
      <div class="rc-party">
        <div class="rc-party-title">প্রাপক শাখা</div>
        <div><b>${esc(br?.name || '-')}</b> ${br ? `(শাখা কোড: ${esc(br.code)})` : ''}</div>
        ${br?.address ? `<div>ঠিকানা: ${esc(br.address)}</div>` : ''}
        ${br?.contact ? `<div>যোগাযোগ: ${esc(br.contact)}</div>` : ''}
      </div>` : ''}
      <table class="rc-items">
        <thead><tr><th style="width:44px">ক্রমিক</th><th style="width:90px">আইটেম কোড</th><th>আইটেমের নাম</th><th style="width:70px">ইউনিট</th><th style="width:90px">পরিমাণ</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="4" class="r"><b>মোট (${v.lines.length} আইটেম)</b></td><td class="r"><b>${total}</b></td></tr></tfoot>
      </table>
      ${v.remarks ? `<div class="rc-remarks"><b>মন্তব্য:</b> ${esc(v.remarks)}</div>` : ''}
      ${v.status === 'cancelled' ? `<div class="rc-remarks"><b>বাতিলের কারণ:</b> ${esc(v.cancelReason || '')}</div>` : ''}
      <div class="rc-signs" style="grid-template-columns:repeat(${signs.length},1fr)">
        ${signs.map((t) => `<div class="rc-sign"><div class="rc-line"></div><span>${t}</span></div>`).join('')}
      </div>
      <div class="rc-foot">প্রস্তুতকারী ইউজার: ${esc(v.createdBy || '-')} • প্রিন্টের সময়: ${this.formatDateTime(new Date().toISOString())}</div>
    </section>`;
  },

  previewVoucher(id) {
    const v = this.getVouchers().find((x) => x.id === id);
    if (!v) { this.showToast('চালান পাওয়া যায়নি', 'error'); return; }
    document.getElementById('modalContainer').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)APP.closeModal()">
        <div class="modal modal-xl">
          <div class="modal-header"><h3><i class="fas fa-print"></i> ${v.type === 'out' ? 'ডেলিভারি চালান' : 'স্টক ইন রসিদ'} — ${esc(v.no)}</h3>
            <button class="modal-close" onclick="APP.closeModal()"><i class="fas fa-times"></i></button></div>
          <div class="modal-body receipt-preview">${this.receiptHTML(v, 'অফিস কপি')}</div>
          <div class="modal-footer between">
            <label class="check-inline"><input type="checkbox" id="twoCopies" ${v.type === 'out' ? 'checked' : ''}>
              ${v.type === 'out' ? 'অফিস কপি + শাখা কপি (২ পৃষ্ঠা)' : 'অফিস কপি + স্টোর কপি (২ পৃষ্ঠা)'}</label>
            <div>
              <button class="btn btn-outline" onclick="APP.closeModal()">বন্ধ</button>
              <button class="btn btn-primary" onclick="APP.printVoucher(${v.id})"><i class="fas fa-print"></i> প্রিন্ট</button>
            </div>
          </div>
        </div>
      </div>`;
  },

  printVoucher(id) {
    const v = this.getVouchers().find((x) => x.id === id);
    if (!v) return;
    const two = document.getElementById('twoCopies')?.checked;
    const labels = v.type === 'out' ? ['অফিস কপি', 'শাখা কপি'] : ['অফিস কপি', 'স্টোর কপি'];
    this.printHTML(labels.slice(0, two ? 2 : 1).map((l) => this.receiptHTML(v, l)).join(''));
  },

  printHTML(html) {
    document.getElementById('printArea').innerHTML = html;
    setTimeout(() => window.print(), 80);
  }
});
