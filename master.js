/* =====================================================
   master.js : Dashboard, Item Master, Branch Master
   ===================================================== */
Object.assign(APP, {

  // ========== DASHBOARD ==========
  renderDashboard(c) {
    const items = this.getAllStock();
    const vouchers = this.getVouchers();
    const active = vouchers.filter((v) => v.status !== 'cancelled');
    const branches = this.getBranches();
    const low = items.filter((i) => this.isLow(i));
    const inStock = items.filter((i) => i.currentStock > 0).length;
    const outCount = active.filter((v) => v.type === 'out').length;
    const inCount = active.filter((v) => v.type === 'in').length;
    const hasReorder = items.some((i) => (i.reorderLevel || 0) > 0);
    const recent = [...vouchers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);

    c.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-box"></i></div>
          <div class="stat-info"><h3>${items.length}</h3><p>মোট আইটেম</p></div></div>
        <div class="stat-card"><div class="stat-icon green"><i class="fas fa-warehouse"></i></div>
          <div class="stat-info"><h3>${inStock}</h3><p>স্টকে আছে এমন আইটেম</p></div></div>
        <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-exclamation-triangle"></i></div>
          <div class="stat-info"><h3>${low.length}</h3><p>লো স্টক আইটেম</p></div></div>
        <div class="stat-card"><div class="stat-icon teal"><i class="fas fa-truck"></i></div>
          <div class="stat-info"><h3>${outCount}</h3><p>ডিস্ট্রিবিউশন চালান <small>(স্টক ইন: ${inCount})</small></p></div></div>
      </div>

      <div class="three-col">
        <!-- Card 1 : Stock -->
        <div class="card dash-card">
          <div class="card-header">
            <h3><i class="fas fa-boxes-stacked"></i> স্টক</h3>
            <small class="muted">${items.length} টি আইটেম</small>
          </div>
          <div class="card-body dash-body">
            <input type="text" class="form-control form-control-sm" placeholder="আইটেম খুঁজুন..." oninput="APP.filterStockList(this.value)">
            <div class="dash-scroll" id="stockList">
              ${items.length === 0 ? '<div class="empty-state" style="padding:30px"><i class="fas fa-box-open"></i><h4>কোনো আইটেম নেই</h4></div>' :
                items.map((i) => `
                <div class="stock-row ${this.isLow(i) ? 'is-low' : ''}" data-q="${esc((i.name + ' ' + i.code).toLowerCase())}">
                  <div class="sr-name"><strong>${esc(i.name)}</strong><small>${esc(i.code)} • ${esc(this.CAT[i.category] || i.category)}</small></div>
                  <div class="sr-qty ${i.currentStock === 0 ? 'zero' : ''}">${i.currentStock}<small>${esc(i.unit)}</small></div>
                </div>`).join('')}
            </div>
          </div>
        </div>

        <!-- Card 2 : Low stock -->
        <div class="card dash-card">
          <div class="card-header">
            <h3><i class="fas fa-exclamation-circle"></i> লো স্টক এলার্ট</h3>
            <small class="muted">${low.length} টি</small>
          </div>
          <div class="card-body dash-body">
            <div class="dash-scroll">
              ${low.length === 0 ? `
                <div class="empty-state" style="padding:30px">
                  <i class="fas fa-check-circle" style="color:var(--success);opacity:1"></i>
                  <h4>${hasReorder ? 'সব আইটেম পর্যাপ্ত স্টকে আছে' : 'কোনো এলার্ট নেই'}</h4>
                  ${hasReorder ? '' : '<p style="font-size:13px">আইটেম মাস্টারে "রিঅর্ডার লেভেল" দিলে লো স্টক এলার্ট আসবে।</p>'}
                </div>` : low.map((i) => `
                <div class="stock-row is-low">
                  <div class="sr-name"><strong>${esc(i.name)}</strong><small>${esc(i.code)} • রিঅর্ডার: ${i.reorderLevel}</small></div>
                  <div class="sr-qty">${i.currentStock}<small>${esc(i.unit)}</small>
                    <span class="badge badge-low">${i.currentStock === 0 ? 'স্টক শেষ' : 'Low'}</span></div>
                </div>`).join('')}
            </div>
          </div>
        </div>

        <!-- Card 3 : Recent transactions -->
        <div class="card dash-card">
          <div class="card-header">
            <h3><i class="fas fa-history"></i> সাম্প্রতিক ট্রানজেকশন</h3>
            <button class="btn btn-outline btn-sm" onclick="APP.navigate('transactions')">সব দেখুন</button>
          </div>
          <div class="card-body dash-body">
            <div class="dash-scroll">
              ${recent.length === 0 ? '<div class="empty-state" style="padding:30px"><i class="fas fa-inbox"></i><h4>কোনো ট্রানজেকশন নেই</h4></div>' :
                `<ul class="recent-list">${recent.map((v) => {
                  const br = branches.find((b) => b.id === v.branchId);
                  const total = v.lines.reduce((s, l) => s + l.qty, 0);
                  const isIn = v.type === 'in';
                  return `
                  <li class="${v.status === 'cancelled' ? 'tx-cancelled' : ''}" style="cursor:pointer" onclick="APP.previewVoucher(${v.id})">
                    <div class="recent-item-info">
                      <div class="icon" style="background:${isIn ? '#d1fae5' : '#fee2e2'};color:${isIn ? '#047857' : '#b91c1c'}">
                        <i class="fas fa-arrow-${isIn ? 'down' : 'up'}"></i></div>
                      <div><strong>${isIn ? 'স্টক ইন' : esc(br?.name || 'শাখা')}</strong>
                        <br><small>${esc(v.no)} • ${v.lines.length} আইটেম • ${this.formatDate(v.date)}</small></div>
                    </div>
                    <strong style="color:${isIn ? 'var(--success)' : 'var(--danger)'}">${isIn ? '+' : '-'}${total}</strong>
                  </li>`;
                }).join('')}</ul>`}
            </div>
          </div>
        </div>
      </div>`;
  },

  filterStockList(q) {
    q = q.trim().toLowerCase();
    document.querySelectorAll('#stockList .stock-row').forEach((r) => {
      r.style.display = !q || r.dataset.q.includes(q) ? '' : 'none';
    });
  },

  // ========== ITEMS ==========
  renderItems(c) {
    const items = this.getAllStock();
    c.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-box"></i> আইটেম তালিকা (<span id="itemCount">${items.length}</span>)</h3>
          <div class="header-actions">
            <button class="btn btn-outline btn-sm" onclick="APP.restoreDefaultItems()"><i class="fas fa-rotate-left"></i> ডিফল্ট তালিকা যোগ</button>
            <button class="btn btn-primary" onclick="APP.openItemModal()"><i class="fas fa-plus"></i> নতুন আইটেম</button>
          </div>
        </div>
        <div class="card-body">
          <div class="filters">
            <input type="text" class="form-control" id="itemSearch" placeholder="সার্চ করুন (নাম/কোড)..." oninput="APP.filterItems()">
            <select class="form-control" id="itemCategoryFilter" onchange="APP.filterItems()">
              <option value="">সব ক্যাটাগরি</option>
              ${Object.entries(this.CAT).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
            </select>
          </div>
          <div class="table-wrapper">
            <table id="itemsTable">
              <thead><tr>
                <th>#</th><th>কোড</th><th>আইটেম নাম</th><th>ক্যাটাগরি</th><th>ইউনিট</th>
                <th>বর্তমান স্টক</th><th>রিঅর্ডার</th><th>অ্যাকশন</th>
              </tr></thead>
              <tbody>${items.map((i, n) => this.itemRow(i, n + 1)).join('')}</tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  itemRow(i, n) {
    return `
      <tr data-name="${esc(i.name.toLowerCase())}" data-code="${esc(i.code.toLowerCase())}" data-category="${esc(i.category)}">
        <td>${n}</td>
        <td><code>${esc(i.code)}</code></td>
        <td><strong>${esc(i.name)}</strong>${i.description ? `<br><small class="muted">${esc(i.description)}</small>` : ''}</td>
        <td>${esc(this.CAT[i.category] || i.category)}</td>
        <td>${esc(i.unit)}</td>
        <td><strong>${i.currentStock}</strong></td>
        <td>${i.reorderLevel || '-'}</td>
        <td class="nowrap">
          <button class="btn btn-outline btn-icon" title="এডিট" onclick="APP.openItemModal(${i.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-outline btn-icon" title="ডিলিট" onclick="APP.deleteItem(${i.id})" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
  },

  filterItems() {
    const s = (document.getElementById('itemSearch')?.value || '').trim().toLowerCase();
    const cat = document.getElementById('itemCategoryFilter')?.value || '';
    let shown = 0;
    document.querySelectorAll('#itemsTable tbody tr').forEach((tr) => {
      const ok = (!s || tr.dataset.name.includes(s) || tr.dataset.code.includes(s)) && (!cat || tr.dataset.category === cat);
      tr.style.display = ok ? '' : 'none';
      if (ok) shown++;
    });
    document.getElementById('itemCount').textContent = shown;
  },

  openItemModal(id = null) {
    const item = id ? this.getItems().find((i) => i.id === id) : null;
    const cat = item?.category || 'Form';
    const code = item?.code || this.nextCode(cat);
    document.getElementById('modalContainer').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)APP.closeModal()">
        <div class="modal">
          <div class="modal-header"><h3>${item ? 'আইটেম এডিট' : 'নতুন আইটেম যোগ'}</h3>
            <button class="modal-close" onclick="APP.closeModal()"><i class="fas fa-times"></i></button></div>
          <div class="modal-body">
            <form id="itemForm" onsubmit="APP.saveItem(event, ${id || 'null'})">
              <div class="form-grid">
                <div class="form-group"><label>আইটেম কোড <span class="required">*</span></label>
                  <input type="text" class="form-control" name="code" value="${esc(code)}" data-auto="${item ? 0 : 1}" oninput="this.dataset.auto=0" required></div>
                <div class="form-group"><label>ক্যাটাগরি <span class="required">*</span></label>
                  <select class="form-control" name="category" onchange="APP.autoCode(this.form)" required>
                    ${Object.entries(this.CAT).map(([k, v]) => `<option value="${k}" ${cat === k ? 'selected' : ''}>${v}</option>`).join('')}
                  </select></div>
                <div class="form-group" style="grid-column:1/-1"><label>আইটেম নাম <span class="required">*</span></label>
                  <input type="text" class="form-control" name="name" value="${esc(item?.name || '')}" required></div>
                <div class="form-group"><label>ইউনিট <span class="required">*</span></label>
                  <select class="form-control" name="unit" required>
                    ${this.UNITS.map((u) => `<option value="${u}" ${(item?.unit || this.DEFAULT_UNIT[cat]) === u ? 'selected' : ''}>${u}</option>`).join('')}
                  </select></div>
                <div class="form-group"><label>রিঅর্ডার লেভেল <small class="muted">(০ = এলার্ট বন্ধ)</small></label>
                  <input type="number" class="form-control" name="reorderLevel" value="${item?.reorderLevel ?? 0}" min="0"></div>
                <div class="form-group" style="grid-column:1/-1"><label>বিবরণ</label>
                  <textarea class="form-control" name="description" rows="2">${esc(item?.description || '')}</textarea></div>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-outline" onclick="APP.closeModal()">বাতিল</button>
                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> ${item ? 'আপডেট' : 'সেভ'} করুন</button>
              </div>
            </form>
          </div>
        </div>
      </div>`;
  },

  autoCode(form) {
    if (form.code.dataset.auto === '1') form.code.value = this.nextCode(form.category.value);
  },

  async saveItem(e, id) {
    e.preventDefault();
    const f = e.target;
    const data = {
      code: f.code.value.trim(), name: f.name.value.trim(), category: f.category.value,
      unit: f.unit.value, reorderLevel: Math.max(0, parseInt(f.reorderLevel.value, 10) || 0),
      description: f.description.value.trim()
    };
    if (!data.code || !data.name) { this.showToast('কোড ও নাম আবশ্যক', 'error'); return; }
    let items = this.getItems();
    if (items.some((i) => i.code.toLowerCase() === data.code.toLowerCase() && i.id !== id)) {
      this.showToast('এই কোড ইতিমধ্যে ব্যবহার করা হয়েছে!', 'error'); return;
    }
    if (id) {
      items = items.map((i) => (i.id === id ? { ...i, ...data } : i));
      this.notify('info', 'আইটেম আপডেট', `${data.name} (${data.code}) আপডেট করা হয়েছে।`);
      this.showToast('আইটেম আপডেট হয়েছে');
    } else {
      items.push({ id: this.generateId(items), ...data });
      this.notify('success', 'নতুন আইটেম', `${data.name} (${data.code}) যোগ করা হয়েছে।`);
      this.showToast('নতুন আইটেম যোগ হয়েছে');
    }
    try { await this.save('items', items); } catch (error) { this.showToast(error.message || 'Supabase-এ আইটেম সেভ হয়নি', 'error'); return; }
    this.closeModal();
    this.navigate('items');
  },

  deleteItem(id) {
    const item = this.getItems().find((i) => i.id === id);
    if (!item) return;
    if (this.getVouchers().some((v) => v.lines.some((l) => l.itemId === id))) {
      this.showToast('এই আইটেমের ট্রানজেকশন আছে, তাই ডিলিট করা যাবে না।', 'error'); return;
    }
    this.confirmModal({
      title: 'আইটেম ডিলিট', okText: 'ডিলিট করুন', okClass: 'btn-danger',
      html: `<p><strong>${esc(item.name)}</strong> (${esc(item.code)}) ডিলিট করতে চান?</p>`,
      onOk: async () => {
        try { await this.save('items', this.getItems().filter((i) => i.id !== id)); } catch (error) { this.showToast(error.message || 'আইটেম ডিলিট হয়নি', 'error'); return; }
        this.notify('danger', 'আইটেম ডিলিট', `${item.name} (${item.code}) মুছে ফেলা হয়েছে।`);
        this.showToast('আইটেম ডিলিট হয়েছে');
        this.navigate('items');
      }
    });
  },

  async restoreDefaultItems() {
    const before = this.getItems();
    const after = this.buildDefaultItems(before);
    const added = after.length - before.length;
    if (!added) { this.showToast('ডিফল্ট তালিকার সব আইটেম আগে থেকেই আছে', 'info'); return; }
    try { await this.save('items', after); } catch (error) { this.showToast(error.message || 'ডিফল্ট আইটেম সেভ হয়নি', 'error'); return; }
    this.notify('info', 'ডিফল্ট আইটেম', `${added} টি ডিফল্ট আইটেম যোগ করা হয়েছে।`);
    this.showToast(`${added} টি ডিফল্ট আইটেম যোগ হয়েছে`);
    this.navigate('items');
  },

  // ========== BRANCHES ==========
  renderBranches(c) {
    const branches = [...this.getBranches()].sort((a, b) => a.code.localeCompare(b.code));
    const used = new Set();
    this.getVouchers().forEach((v) => { if (v.branchId) used.add(v.branchId); });
    c.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-code-branch"></i> শাখা তালিকা (${branches.length})</h3>
          <div class="header-actions">
            <button class="btn btn-outline btn-sm" onclick="APP.restoreDefaultBranches()"><i class="fas fa-rotate-left"></i> ডিফল্ট শাখা যোগ</button>
            <button class="btn btn-primary" onclick="APP.openBranchModal()"><i class="fas fa-plus"></i> নতুন শাখা</button>
          </div>
        </div>
        <div class="card-body">
          <div class="table-wrapper">
            <table>
              <thead><tr><th>#</th><th>শাখা কোড</th><th>শাখার নাম</th><th>ঠিকানা</th><th>যোগাযোগ</th><th>অ্যাকশন</th></tr></thead>
              <tbody>
                ${branches.length === 0 ? '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-code-branch"></i><h4>কোনো শাখা নেই</h4></div></td></tr>' :
                  branches.map((b, n) => `
                  <tr>
                    <td>${n + 1}</td>
                    <td><code>${esc(b.code)}</code></td>
                    <td><strong>${esc(b.name)}</strong></td>
                    <td>${esc(b.address || '-')}</td>
                    <td>${esc(b.contact || '-')}</td>
                    <td class="nowrap">
                      <button class="btn btn-outline btn-icon" title="এডিট" onclick="APP.openBranchModal(${b.id})"><i class="fas fa-edit"></i></button>
                      <button class="btn btn-outline btn-icon" title="${used.has(b.id) ? 'ট্রানজেকশন আছে' : 'ডিলিট'}" onclick="APP.deleteBranch(${b.id})" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  openBranchModal(id = null) {
    const b = id ? this.getBranches().find((x) => x.id === id) : null;
    document.getElementById('modalContainer').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)APP.closeModal()">
        <div class="modal">
          <div class="modal-header"><h3>${b ? 'শাখা এডিট' : 'নতুন শাখা যোগ'}</h3>
            <button class="modal-close" onclick="APP.closeModal()"><i class="fas fa-times"></i></button></div>
          <div class="modal-body">
            <form onsubmit="APP.saveBranch(event, ${id || 'null'})">
              <div class="form-grid">
                <div class="form-group"><label>শাখা কোড <span class="required">*</span></label>
                  <input type="text" class="form-control" name="code" value="${esc(b?.code || '')}" required placeholder="0067"></div>
                <div class="form-group"><label>শাখার নাম <span class="required">*</span></label>
                  <input type="text" class="form-control" name="name" value="${esc(b?.name || '')}" required></div>
                <div class="form-group" style="grid-column:1/-1"><label>ঠিকানা / উপজেলা</label>
                  <input type="text" class="form-control" name="address" value="${esc(b?.address || '')}"></div>
                <div class="form-group" style="grid-column:1/-1"><label>যোগাযোগ (মোবাইল/ইমেইল)</label>
                  <input type="text" class="form-control" name="contact" value="${esc(b?.contact || '')}"></div>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-outline" onclick="APP.closeModal()">বাতিল</button>
                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> ${b ? 'আপডেট' : 'সেভ'} করুন</button>
              </div>
            </form>
          </div>
        </div>
      </div>`;
  },

  async saveBranch(e, id) {
    e.preventDefault();
    const f = e.target;
    const data = { code: f.code.value.trim(), name: f.name.value.trim(), address: f.address.value.trim(), contact: f.contact.value.trim() };
    let branches = this.getBranches();
    if (branches.some((b) => b.code === data.code && b.id !== id)) {
      this.showToast('এই শাখা কোড ইতিমধ্যে আছে!', 'error'); return;
    }
    if (id) {
      branches = branches.map((b) => (b.id === id ? { ...b, ...data } : b));
      this.notify('info', 'শাখা আপডেট', `${data.name} (${data.code}) আপডেট করা হয়েছে।`);
      this.showToast('শাখা আপডেট হয়েছে');
    } else {
      branches.push({ id: this.generateId(branches), ...data });
      this.notify('success', 'নতুন শাখা', `${data.name} (${data.code}) যোগ করা হয়েছে।`);
      this.showToast('নতুন শাখা যোগ হয়েছে');
    }
    try { await this.save('branches', branches); } catch (error) { this.showToast(error.message || 'Supabase-এ শাখা সেভ হয়নি', 'error'); return; }
    this.closeModal();
    this.navigate('branches');
  },

  deleteBranch(id) {
    const b = this.getBranches().find((x) => x.id === id);
    if (!b) return;
    if (this.getVouchers().some((v) => v.branchId === id)) {
      this.showToast('এই শাখায় চালান ইস্যু করা আছে, তাই ডিলিট করা যাবে না।', 'error'); return;
    }
    this.confirmModal({
      title: 'শাখা ডিলিট', okText: 'ডিলিট করুন', okClass: 'btn-danger',
      html: `<p><strong>${esc(b.name)}</strong> (${esc(b.code)}) ডিলিট করতে চান?</p>`,
      onOk: async () => {
        try { await this.save('branches', this.getBranches().filter((x) => x.id !== id)); } catch (error) { this.showToast(error.message || 'শাখা ডিলিট হয়নি', 'error'); return; }
        this.notify('danger', 'শাখা ডিলিট', `${b.name} (${b.code}) মুছে ফেলা হয়েছে।`);
        this.showToast('শাখা ডিলিট হয়েছে');
        this.navigate('branches');
      }
    });
  },

  async restoreDefaultBranches() {
    const before = this.getBranches();
    const after = this.buildDefaultBranches(before);
    const added = after.length - before.length;
    if (!added) { this.showToast('ডিফল্ট শাখাগুলো আগে থেকেই আছে', 'info'); return; }
    try { await this.save('branches', after); } catch (error) { this.showToast(error.message || 'ডিফল্ট শাখা সেভ হয়নি', 'error'); return; }
    this.notify('info', 'ডিফল্ট শাখা', `${added} টি ডিফল্ট শাখা যোগ করা হয়েছে।`);
    this.showToast(`${added} টি ডিফল্ট শাখা যোগ হয়েছে`);
    this.navigate('branches');
  }
});
