/* =====================================================
   extra.js : Reports, Settings, Backup / Restore / Reset
   ===================================================== */
Object.assign(APP, {

  // ========== REPORTS ==========
  stockReportTable() {
    const items = this.getAllStock();
    const ins = {}, outs = {};
    this.getVouchers().filter((v) => v.status !== 'cancelled').forEach((v) => {
      const target = v.type === 'in' ? ins : outs;
      v.lines.forEach((l) => { target[l.itemId] = (target[l.itemId] || 0) + l.qty; });
    });
    return {
      items, ins, outs,
      html: `<table class="rpt-table">
        <thead><tr><th>#</th><th>কোড</th><th>আইটেম</th><th>ক্যাটাগরি</th><th>ইউনিট</th><th class="r">মোট ইন</th><th class="r">মোট আউট</th><th class="r">বর্তমান স্টক</th><th class="r">রিঅর্ডার</th></tr></thead>
        <tbody>${items.map((i, n) => `
          <tr class="${this.isLow(i) ? 'low-stock' : ''}">
            <td>${n + 1}</td><td>${esc(i.code)}</td><td><strong>${esc(i.name)}</strong></td>
            <td>${esc(this.CAT[i.category] || i.category)}</td><td>${esc(i.unit)}</td>
            <td class="r" style="color:var(--success)">+${ins[i.id] || 0}</td>
            <td class="r" style="color:var(--danger)">-${outs[i.id] || 0}</td>
            <td class="r"><strong>${i.currentStock}</strong></td><td class="r">${i.reorderLevel || '-'}</td>
          </tr>`).join('')}</tbody></table>`
    };
  },

  renderReports(c) {
    this.rp = { from: '', to: '' };
    c.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-chart-bar"></i> স্টক রিপোর্ট</h3>
          <div class="header-actions">
            <button class="btn btn-outline btn-sm" onclick="APP.exportStockCSV()"><i class="fas fa-file-csv"></i> CSV (Excel)</button>
            <button class="btn btn-outline btn-sm" onclick="APP.printStockReport()"><i class="fas fa-print"></i> প্রিন্ট</button>
          </div>
        </div>
        <div class="card-body"><div class="table-wrapper">${this.stockReportTable().html}</div></div>
      </div>

      <div class="card" id="itemLedgerCard">
        <div class="card-header">
          <h3><i class="fas fa-book"></i> আইটেমভিত্তিক স্টক লেজার</h3>
          <div class="header-actions">
            <button class="btn btn-outline btn-sm" onclick="APP.exportItemLedger()" id="ledgerCsvBtn" disabled><i class="fas fa-file-csv"></i> CSV (Excel)</button>
            <button class="btn btn-outline btn-sm" onclick="APP.printItemLedger()" id="ledgerPrintBtn" disabled><i class="fas fa-print"></i> প্রিন্ট</button>
          </div>
        </div>
        <div class="card-body">
          <div class="filters">
            <select class="form-control" id="ledgerItem" onchange="APP.renderItemLedger()">
              <option value="">-- আইটেম নির্বাচন করুন --</option>
              ${this.getItems().slice().sort((a,b)=>a.code.localeCompare(b.code)).map(i=>`<option value="${i.id}">${esc(i.code)} - ${esc(i.name)}</option>`).join('')}
            </select>
          </div>
          <div id="itemLedgerBody"><div class="empty-state"><i class="fas fa-box-open"></i><h4>পূর্ণ হিসাব দেখতে একটি আইটেম নির্বাচন করুন</h4></div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-code-branch"></i> শাখাভিত্তিক ডিস্ট্রিবিউশন সামারি</h3>
          <div class="header-actions">
            <button class="btn btn-outline btn-sm" onclick="APP.printBranchReport()"><i class="fas fa-print"></i> প্রিন্ট</button>
          </div>
        </div>
        <div class="card-body">
          <div class="filters">
            <label class="muted">তারিখ:</label>
            <input type="date" class="form-control" id="rpFrom" onchange="APP.setRp()">
            <span>থেকে</span>
            <input type="date" class="form-control" id="rpTo" onchange="APP.setRp()">
          </div>
          <div class="table-wrapper" id="branchRpt"></div>
        </div>
      </div>`;
    this.renderBranchReport();
  },

  itemLedgerData(itemId) {
    const item = this.getItems().find(i => i.id === Number(itemId));
    if (!item) return null;
    const vouchers = this.getVouchers()
      .filter(v => v.status !== 'cancelled' && v.lines.some(l => l.itemId === item.id))
      .sort((a,b) => a.date.localeCompare(b.date) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    let balance = 0, opening = 0, stockIn = 0, stockOut = 0;
    const branchTotals = Object.fromEntries(this.getBranches().map(b => [b.id, { branch:b, qty:0, vouchers:0 }]));
    const otherDestinations = {};
    const rows = vouchers.map(v => {
      const line = v.lines.find(l => l.itemId === item.id);
      const qty = Number(line?.qty || 0);
      let type, inQty = 0, outQty = 0, party = 'Regional Store';
      if (v.type === 'in') {
        inQty = qty;
        if ((v.source || '').trim() === 'ওপেনিং স্টক') {
          type = 'Opening Stock';
          opening += qty;
        } else {
          type = 'Stock In';
          stockIn += qty;
        }
        balance += qty;
        party = v.source || 'প্রাপ্তি';
      } else {
        type = 'Branch Distribution';
        outQty = qty;
        stockOut += qty;
        balance -= qty;
        const br = this.getBranches().find(b => b.id === v.branchId);
        party = br ? br.code + ' - ' + br.name : 'শাখা তথ্য পাওয়া যায়নি';
        if (branchTotals[v.branchId]) {
          branchTotals[v.branchId].qty += qty;
          branchTotals[v.branchId].vouchers++;
        } else if (v.destinationLocationName) {
          const key = v.destinationLocationName;
          if (!otherDestinations[key]) otherDestinations[key] = { name:key, qty:0, vouchers:0 };
          otherDestinations[key].qty += qty;
          otherDestinations[key].vouchers++;
        }
        if (!branchTotals[v.branchId] && !v.destinationLocationName) {
          const key = 'অজ্ঞাত গন্তব্য';
          if (!otherDestinations[key]) otherDestinations[key] = { name:key, qty:0, vouchers:0 };
          otherDestinations[key].qty += qty;
          otherDestinations[key].vouchers++;
        }
        party = v.destinationLocationName || party;
      }
      return { date:v.date, type, no:v.no, party, reference:v.reference || '', inQty, outQty, balance, remarks:v.remarks || '' };
    });
    return { item, rows, opening, stockIn, stockOut, closing:balance,
      branchTotals:Object.values(branchTotals).sort((a,b)=>a.branch.code.localeCompare(b.branch.code)),
      otherDestinations:Object.values(otherDestinations).sort((a,b)=>a.name.localeCompare(b.name)) };
  },

  itemLedgerHTML(data) {
    const i = data.item;
    const branches = data.branchTotals;
    return `
      <div class="stats-grid" style="margin-bottom:16px">
        <div class="stat-card"><div class="stat-icon purple"><i class="fas fa-flag"></i></div><div class="stat-info"><p>Opening Stock</p><h3>${data.opening} ${esc(i.unit)}</h3></div></div>
        <div class="stat-card"><div class="stat-icon green"><i class="fas fa-arrow-down"></i></div><div class="stat-info"><p>পরবর্তী Stock In</p><h3>${data.stockIn} ${esc(i.unit)}</h3></div></div>
        <div class="stat-card"><div class="stat-icon red"><i class="fas fa-truck"></i></div><div class="stat-info"><p>মোট শাখায় বিতরণ</p><h3>${data.stockOut} ${esc(i.unit)}</h3></div></div>
        <div class="stat-card"><div class="stat-icon teal"><i class="fas fa-cubes"></i></div><div class="stat-info"><p>Regional Store Closing</p><h3>${data.closing} ${esc(i.unit)}</h3></div></div>
      </div>
      <div class="card" style="box-shadow:none;border:1px solid var(--border);margin-bottom:16px">
        <div class="card-header"><h3>শাখাভিত্তিক প্রাপ্তির হিসাব</h3><span class="chip">সব শাখা</span></div>
        <div class="card-body"><div class="table-wrapper">
          <table class="rpt-table"><thead><tr><th>শাখা কোড</th><th>শাখার নাম</th><th class="r">চালান সংখ্যা</th><th class="r">মোট প্রাপ্তি</th></tr></thead>
          <tbody>${branches.map(x=>`<tr><td><code>${esc(x.branch.code)}</code></td><td>${esc(x.branch.name)}</td><td class="r">${x.vouchers}</td><td class="r"><strong>${x.qty}</strong> ${esc(i.unit)}</td></tr>`).join('')}
          ${(data.otherDestinations||[]).map(x=>`<tr><td>—</td><td>${esc(x.name)} <span class="muted">(অতিরিক্ত লোকেশন)</span></td><td class="r">${x.vouchers}</td><td class="r"><strong>${x.qty}</strong> ${esc(i.unit)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="2"><strong>সর্বমোট বিতরণ</strong></td><td class="r"><strong>${branches.reduce((s,x)=>s+x.vouchers,0)+(data.otherDestinations||[]).reduce((s,x)=>s+x.vouchers,0)}</strong></td><td class="r"><strong>${branches.reduce((s,x)=>s+x.qty,0)+(data.otherDestinations||[]).reduce((s,x)=>s+x.qty,0)} ${esc(i.unit)}</strong></td></tr></tfoot></table>
        </div></div>
      </div>
      <div class="card" style="box-shadow:none;border:1px solid var(--border)">
        <div class="card-header"><h3>পূর্ণ লেনদেনের ইতিহাস</h3><span class="muted small-note">${data.rows.length} টি সক্রিয় লেনদেন</span></div>
        <div class="card-body"><div class="table-wrapper">
          <table class="rpt-table"><thead><tr><th>#</th><th>তারিখ</th><th>লেনদেনের ধরন</th><th>উৎস / শাখা</th><th>চালান নং</th><th class="r">Stock In</th><th class="r">Stock Out</th><th class="r">Regional Store Balance</th></tr></thead>
          <tbody>${data.rows.map((r,n)=>`<tr><td>${n+1}</td><td>${this.formatDate(r.date)}</td><td><span class="badge ${r.inQty?'badge-in':'badge-out'}">${esc(r.type)}</span></td><td>${esc(r.party)}</td><td><code>${esc(r.no)}</code></td><td class="r" style="color:var(--success)">${r.inQty||'—'}</td><td class="r" style="color:var(--danger)">${r.outQty||'—'}</td><td class="r"><strong>${r.balance}</strong></td></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="5"><strong>সর্বমোট</strong></td><td class="r"><strong>${data.opening+data.stockIn}</strong></td><td class="r"><strong>${data.stockOut}</strong></td><td class="r"><strong>${data.closing}</strong></td></tr></tfoot></table>
        </div></div>
      </div>`;
  },

  renderItemLedger() {
    const itemId = document.getElementById('ledgerItem')?.value;
    const body = document.getElementById('itemLedgerBody');
    const csv = document.getElementById('ledgerCsvBtn');
    const print = document.getElementById('ledgerPrintBtn');
    this._activeItemLedger = itemId ? this.itemLedgerData(itemId) : null;
    if (!this._activeItemLedger) {
      body.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><h4>পূর্ণ হিসাব দেখতে একটি আইটেম নির্বাচন করুন</h4></div>';
      if (csv) csv.disabled = true;
      if (print) print.disabled = true;
      return;
    }
    body.innerHTML = this.itemLedgerHTML(this._activeItemLedger);
    if (csv) csv.disabled = false;
    if (print) print.disabled = false;
  },

  exportItemLedger() {
    const d = this._activeItemLedger;
    if (!d) return;
    const q = x => '"' + String(x ?? '').replace(/"/g,'""') + '"';
    const rows = [
      ['আইটেম কোড','আইটেম নাম','তারিখ','লেনদেনের ধরন','উৎস / শাখা','চালান নং','Stock In','Stock Out','Regional Store Balance'],
      ...d.rows.map(r=>[d.item.code,d.item.name,r.date,r.type,r.party,r.no,r.inQty,r.outQty,r.balance])
    ];
    rows.push([],['শাখাভিত্তিক বিতরণ'],['শাখা কোড','শাখার নাম','চালান সংখ্যা','মোট প্রাপ্তি'],
      ...d.branchTotals.map(x=>[x.branch.code,x.branch.name,x.vouchers,x.qty]),
      ...(d.otherDestinations||[]).map(x=>['',x.name+' (অতিরিক্ত লোকেশন)',x.vouchers,x.qty]));
    this.downloadFile('item-ledger-'+d.item.code+'-'+this.today()+'.csv','\ufeff'+rows.map(r=>r.map(q).join(',')).join('\r\n'),'text/csv;charset=utf-8');
    this.showToast('আইটেম লেজার CSV ডাউনলোড হয়েছে');
  },

  printItemLedger() {
    const d = this._activeItemLedger;
    if (!d) return;
    const sub = 'আইটেম: '+d.item.code+' - '+d.item.name+' | Opening: '+d.opening+' | Stock In: '+d.stockIn+' | Distributed: '+d.stockOut+' | Closing: '+d.closing;
    this.printHTML(this.reportDoc('আইটেমভিত্তিক স্টক লেজার',this.itemLedgerHTML(d),sub));
  },

  setRp() {
    this.rp = { from: document.getElementById('rpFrom').value, to: document.getElementById('rpTo').value };
    this.renderBranchReport();
  },

  branchReportData() {
    const { from, to } = this.rp || {};
    const rows = {};
    this.getBranches().forEach((b) => { rows[b.id] = { b, challans: 0, total: 0, items: {} }; });
    this.getVouchers().filter((v) => v.type === 'out' && v.status !== 'cancelled'
      && (!from || v.date >= from) && (!to || v.date <= to)).forEach((v) => {
      const r = rows[v.branchId];
      if (!r) return;
      r.challans++;
      v.lines.forEach((l) => { r.total += l.qty; r.items[l.itemId] = (r.items[l.itemId] || 0) + l.qty; });
    });
    return Object.values(rows).sort((a, b) => a.b.code.localeCompare(b.b.code));
  },

  branchReportTable(withActions) {
    const data = this.branchReportData();
    return `<table class="rpt-table">
      <thead><tr><th>শাখা কোড</th><th>শাখার নাম</th><th class="r">চালান সংখ্যা</th><th class="r">মোট প্রাপ্ত পরিমাণ</th>${withActions ? '<th></th>' : ''}</tr></thead>
      <tbody>${data.map((r) => `
        <tr><td><code>${esc(r.b.code)}</code></td><td>${esc(r.b.name)}</td><td class="r">${r.challans}</td><td class="r"><strong>${r.total}</strong></td>
        ${withActions ? `<td class="r">${r.total ? `<button class="btn btn-outline btn-sm" onclick="APP.branchDetail(${r.b.id})">বিস্তারিত</button>` : ''}</td>` : ''}</tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="2"><strong>সর্বমোট</strong></td><td class="r"><strong>${data.reduce((s, r) => s + r.challans, 0)}</strong></td>
        <td class="r"><strong>${data.reduce((s, r) => s + r.total, 0)}</strong></td>${withActions ? '<td></td>' : ''}</tr></tfoot></table>`;
  },

  renderBranchReport() { document.getElementById('branchRpt').innerHTML = this.branchReportTable(true); },

  branchDetail(branchId) {
    const r = this.branchReportData().find((x) => x.b.id === branchId);
    const items = this.getItems();
    const rows = Object.entries(r.items).map(([id, q]) => ({ it: items.find((i) => i.id === Number(id)), q }))
      .sort((a, b) => (a.it?.code || '').localeCompare(b.it?.code || ''));
    document.getElementById('modalContainer').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)APP.closeModal()">
        <div class="modal modal-lg"><div class="modal-header"><h3>${esc(r.b.name)} (${esc(r.b.code)}) — আইটেমভিত্তিক</h3>
          <button class="modal-close" onclick="APP.closeModal()"><i class="fas fa-times"></i></button></div>
          <div class="modal-body"><div class="table-wrapper" style="max-height:60vh;overflow:auto"><table class="mini-table">
            <thead><tr><th>#</th><th>কোড</th><th>আইটেম</th><th class="r">মোট পরিমাণ</th></tr></thead>
            <tbody>${rows.map((x, n) => `<tr><td>${n + 1}</td><td>${esc(x.it?.code || '-')}</td><td>${esc(x.it?.name || '-')}</td><td class="r"><strong>${x.q}</strong> ${esc(x.it?.unit || '')}</td></tr>`).join('')}</tbody>
          </table></div></div></div></div>`;
  },

  reportDoc(title, tableHtml, sub = '') {
    const s = this.getSettings();
    return `<section class="receipt-page report-doc">
      <div class="rc-head"><div class="rc-org">${esc(s.orgName)}</div><div class="rc-office">${esc(s.officeName)}</div>
        <div class="rc-title">${esc(title)}</div></div>
      ${sub ? `<p class="rc-remarks">${esc(sub)}</p>` : ''}
      ${tableHtml}
      <div class="rc-foot">প্রিন্টের সময়: ${this.formatDateTime(new Date().toISOString())} • ${esc(this.user?.name || '')}</div></section>`;
  },

  printStockReport() { this.printHTML(this.reportDoc('স্টক রিপোর্ট', this.stockReportTable().html, 'তারিখ: ' + this.formatDate(this.today()))); },
  printBranchReport() {
    const { from, to } = this.rp || {};
    const sub = from || to ? `সময়কাল: ${from ? this.formatDate(from) : 'শুরু'} থেকে ${to ? this.formatDate(to) : 'আজ'}` : 'সময়কাল: সব';
    this.printHTML(this.reportDoc('শাখাভিত্তিক ডিস্ট্রিবিউশন সামারি', this.branchReportTable(false), sub));
  },

  downloadFile(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  exportStockCSV() {
    const { items, ins, outs } = this.stockReportTable();
    const q = (x) => '"' + String(x ?? '').replace(/"/g, '""') + '"';
    const rows = [['কোড', 'আইটেম', 'ক্যাটাগরি', 'ইউনিট', 'মোট ইন', 'মোট আউট', 'বর্তমান স্টক', 'রিঅর্ডার'],
      ...items.map((i) => [i.code, i.name, this.CAT[i.category] || i.category, i.unit, ins[i.id] || 0, outs[i.id] || 0, i.currentStock, i.reorderLevel || 0])];
    this.downloadFile(`stock-report-${this.today()}.csv`, '\ufeff' + rows.map((r) => r.map(q).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
    this.showToast('CSV ডাউনলোড হয়েছে');
  },

  // ========== SETTINGS ==========
  renderSettings(c) {
    const s = this.getSettings();
    c.innerHTML = `
      <div class="two-col">
        <div class="card">
          <div class="card-header"><h3><i class="fas fa-building"></i> অফিস তথ্য (চালানে ছাপা হবে)</h3></div>
          <div class="card-body">
            <form onsubmit="APP.saveOffice(event)">
              <div class="form-grid one">
                <div class="form-group"><label>সংস্থার নাম</label><input class="form-control" name="orgName" value="${esc(s.orgName)}" required></div>
                <div class="form-group"><label>অফিসের নাম / ঠিকানা</label><input class="form-control" name="officeName" value="${esc(s.officeName)}" required></div>
                <div class="form-group"><label>চালান নং প্রিফিক্স</label><input class="form-control" name="prefix" value="${esc(s.prefix)}" required>
                  <small class="muted">উদাহরণ: স্টক আউট → ${esc(s.prefix)}/${new Date().getFullYear()}/0001</small></div>
              </div>
              <div class="form-actions"><button class="btn btn-primary"><i class="fas fa-save"></i> সেভ করুন</button></div>
            </form>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3><i class="fas fa-key"></i> পাসওয়ার্ড পরিবর্তন</h3></div>
          <div class="card-body">
            <form onsubmit="APP.changePassword(event)">
              <div class="form-grid one">
                <div class="form-group"><label>বর্তমান পাসওয়ার্ড</label><input type="password" class="form-control" name="old" required autocomplete="current-password"></div>
                <div class="form-group"><label>নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)</label><input type="password" class="form-control" name="pw1" minlength="8" required autocomplete="new-password"></div>
                <div class="form-group"><label>নতুন পাসওয়ার্ড আবার দিন</label><input type="password" class="form-control" name="pw2" minlength="8" required autocomplete="new-password"></div>
              </div>
              <div class="form-actions"><button class="btn btn-primary"><i class="fas fa-lock"></i> পাসওয়ার্ড বদলান</button></div>
            </form>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3><i class="fas fa-database"></i> ডাটা ম্যানেজমেন্ট</h3></div>
        <div class="card-body">
          <p class="muted mb">সকল মূল তথ্য এখন Supabase Cloud Database-এ সংরক্ষিত। প্রয়োজন হলে JSON Backup ডাউনলোড করে নিরাপদে রাখুন।</p>
          <div class="form-actions" style="margin-top:0">
            <button class="btn btn-accent" onclick="APP.exportData()"><i class="fas fa-download"></i> ব্যাকআপ ডাউনলোড (JSON)</button>

          </div>
        </div>
      </div>`;
  },

  async saveOffice(e) {
    e.preventDefault();
    const f = e.target;
    const s = this.getSettings();
    s.orgName = f.orgName.value.trim(); s.officeName = f.officeName.value.trim(); s.prefix = f.prefix.value.trim();
    try { await this.saveSettings(s); } catch (error) { this.showToast(error.message || 'সেটিংস Supabase-এ সেভ হয়নি', 'error'); return; }
    this.notify('info', 'সেটিংস আপডেট', 'অফিস তথ্য ও চালান প্রিফিক্স আপডেট হয়েছে।');
    this.showToast('সেটিংস সেভ হয়েছে');
    this.navigate('settings');
  },

  async changePassword(e) {
    e.preventDefault();
    const f = e.target;
    if (f.pw1.value !== f.pw2.value) { this.showToast('নতুন পাসওয়ার্ড দুটি মেলেনি', 'error'); return; }
    if (f.pw1.value.length < 8) { this.showToast('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে', 'error'); return; }
    try {
      const { error:verifyError } = await sbClient.auth.signInWithPassword({
        email:this.user.email, password:f.old.value
      });
      if (verifyError) throw new Error('বর্তমান পাসওয়ার্ড সঠিক নয়');
      const { error } = await sbClient.auth.updateUser({ password:f.pw1.value });
      if (error) throw error;
      this.notify('success', 'পাসওয়ার্ড পরিবর্তন', 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে।');
      this.showToast('পাসওয়ার্ড পরিবর্তন হয়েছে');
      f.reset();
    } catch (error) { this.showToast(error.message || 'পাসওয়ার্ড পরিবর্তন করা যায়নি', 'error'); }
  },

  // ========== BACKUP / RESTORE / RESET ==========
  exportData() {
    const data = {
      app: 'rangpur-inventory', version: 2, exportedAt: new Date().toISOString(),
      items: this.getItems(), branches: this.getBranches(), vouchers: this.getVouchers(), settings: this.getSettings()
    };
    this.downloadFile(`rangpur-inventory-backup-${this.today()}.json`, JSON.stringify(data, null, 2), 'application/json');
    this.notify('info', 'ব্যাকআপ', 'ব্যাকআপ ফাইল ডাউনলোড করা হয়েছে।');
    this.showToast('Backup ডাউনলোড হয়েছে');
  },

  importData(input) {
    const file = input.files[0];
    input.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let d;
      try { d = JSON.parse(reader.result); } catch (e) { this.showToast('ফাইলটি সঠিক JSON নয়', 'error'); return; }
      if (!d || !Array.isArray(d.items) || !Array.isArray(d.branches) || !Array.isArray(d.vouchers)) {
        this.showToast('এটি এই সিস্টেমের (v2) ব্যাকআপ ফাইল নয়', 'error'); return;
      }
      this.confirmModal({
        title: 'ব্যাকআপ রিস্টোর', okText: 'রিস্টোর করুন', okClass: 'btn-danger',
        html: `<p>বর্তমান সব ডাটা মুছে ব্যাকআপের ডাটা বসানো হবে:</p>
          <ul class="plain-list"><li>আইটেম: <b>${d.items.length}</b></li><li>শাখা: <b>${d.branches.length}</b></li><li>চালান: <b>${d.vouchers.length}</b></li></ul>`,
        onOk: () => {
          this.save('items', d.items); this.save('branches', d.branches); this.save('vouchers', d.vouchers);
          if (d.settings) this.saveSettings({ ...this.DEFAULT_SETTINGS, ...d.settings });
          this.notify('success', 'রিস্টোর সম্পন্ন', 'ব্যাকআপ থেকে ডাটা রিস্টোর করা হয়েছে।');
          this.showToast('রিস্টোর সম্পন্ন হয়েছে');
          this.navigate('dashboard');
        }
      });
    };
    reader.readAsText(file);
  },

  resetData() {
    this.confirmModal({
      title: 'সব ডাটা রিসেট', okText: 'রিসেট করুন', okClass: 'btn-danger',
      html: `<p>সব চালান মুছে যাবে এবং আইটেম ও শাখা ডিফল্ট অবস্থায় ফিরবে। আগে ব্যাকআপ নিয়েছেন তো?</p>
        <div class="form-group" style="margin-top:12px"><label>নিশ্চিত করতে <b>RESET</b> লিখুন</label><input class="form-control" id="resetConfirm"></div>`,
      validate: () => {
        const ok = document.getElementById('resetConfirm').value.trim() === 'RESET';
        if (!ok) this.showToast('RESET লিখুন', 'error');
        return ok;
      },
      onOk: () => {
        this.save('items', this.buildDefaultItems());
        this.save('branches', this.buildDefaultBranches());
        this.save('vouchers', []);
        const s = this.getSettings(); s.counters = {}; this.saveSettings(s);
        this.notify('danger', 'ডাটা রিসেট', 'সব ডাটা রিসেট করা হয়েছে।');
        this.showToast('ডাটা রিসেট হয়েছে');
        this.navigate('dashboard');
      }
    });
  }
});
