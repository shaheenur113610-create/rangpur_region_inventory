/* =====================================================
   Rangpur Region Office - Inventory Management System
   core.js : data layer, defaults, login, notifications, navigation
   ===================================================== */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const APP = {
  K: {
    items: 'rri2_items',
    branches: 'rri2_branches',
    vouchers: 'rri2_vouchers',
    settings: 'rri2_settings',
    notifs: 'rri2_notifs',
    auth: 'rri2_auth'
  },
  SESSION_KEY: 'rri2_session',
  user: null,
  page: 'dashboard',
  _fails: 0,

  CAT: { Register: 'রেজিস্টার', Form: 'ফরম', Stationery: 'স্টেশনারি', Other: 'অন্যান্য' },
  CAT_PREFIX: { Register: 'REG', Form: 'FRM', Stationery: 'STN', Other: 'OTH' },
  UNITS: ['পিস', 'প্যাড', 'বই', 'বান্ডেল', 'বক্স', 'প্যাকেট', 'রিম', 'সেট'],

  TITLES: {
    dashboard: ['ড্যাশবোর্ড', 'Rangpur Region Office Inventory Overview'],
    items: ['আইটেম মাস্টার', 'সকল রেজিস্টার ও ফর্মের তালিকা'],
    branches: ['শাখা মাস্টার', 'শাখার তালিকা ও তথ্য'],
    'stock-in': ['স্টক ইন', 'চালান অনুযায়ী একসাথে মালামাল গ্রহণ'],
    'stock-out': ['স্টক আউট / ডিস্ট্রিবিউশন', 'একটি শাখায় একসাথে সব মালামাল বিতরণ'],
    transactions: ['ট্রানজেকশন হিস্টরি', 'সকল চালান / রসিদ ও প্রিন্ট'],
    reports: ['রিপোর্টস', 'স্টক ও ডিস্ট্রিবিউশন রিপোর্ট'],
    settings: ['সেটিংস', 'অফিস তথ্য, পাসওয়ার্ড ও ডাটা ম্যানেজমেন্ট']
  },

  // ========== DEFAULT DATA ==========
  DEFAULT_ITEMS: [
    ['সদস্য ভর্তি আবেদন ও (কেওয়াইসি) ফরম', 'Form'],
    ['ঋণ আবেদন পত্র ফরম', 'Form'],
    ['ঋণ চুক্তি পত্র ফরম', 'Form'],
    ['সদস্য ভিত্তিক সঞ্চয় ফেরৎ চাহিদা পত্র', 'Form'],
    ['সমিতি ভিত্তিক সঞ্চয় ফেরৎ টপশীট', 'Form'],
    ['এস.এফ.এফ আবেদন পত্র', 'Form'],
    ['জামিনদারের জামানত নামা (অগ্রসর)', 'Form'],
    ['সদস্য কল্যাণ তহবিল প্রাপ্তির আবেদন', 'Form'],
    ['যাতায়াত বিল ভাউচার', 'Form'],
    ['বিল সামারী (টপশীট)', 'Form'],
    ['কর্মী ছাড়পত্র', 'Form'],
    ['পাশ বহি', 'Stationery'],
    ['ছুটির আবেদন পত্র', 'Form'],
    ['লোন ফান্ড চাহিদা', 'Form'],
    ['ঋণীর অনুরোধ পত্র (অগ্রসর)', 'Form'],
    ['অফিস ফাইল', 'Stationery'],
    ['অগ্রসর প্রোফাইল', 'Form'],
    ['অফিস খাম (ছোট)', 'Stationery'],
    ['অফিস খাম (মাঝারী)', 'Stationery'],
    ['মুভমেন্ট রেজিস্টার', 'Register'],
    ['সাপ্তাহিক ও মাসিক কর্মী মিটিং রেজিস্টার', 'Register'],
    ['সমিতি রেজুলশন রেজিস্টার', 'Register'],
    ['ঋণ বিতরন রেজিস্টার', 'Register'],
    ['দৈনিক আদায় ও আদায়যোগ্য রেজিস্টার', 'Register'],
    ['সঞ্চয় ফেরত রেজিস্টার', 'Register'],
    ['শাখা পরিদর্শন রেজিস্টার', 'Register'],
    ['ডি-নোট রেজিস্টার', 'Register'],
    ['চেক ইস্যু রেজিস্টার', 'Register'],
    ['কর্মী/কর্মকর্তাদের হাজিরা রেজিস্টার', 'Register'],
    ['মোটর সাইকেল লগ বই', 'Register'],
    ['সদস্য কল্যাণ তহবিল ফেরত রেজিস্টার', 'Register'],
    ['চেক গ্রহণ ও ফেরত রেজিস্টার', 'Register'],
    ['এসএফএফ এককালীন (মেয়াদী আমানত) রেজিস্টার', 'Register'],
    ['কর্মী-কর্মকর্তাদের দায়িত্বপালন, গ্রহন হস্তান্তর রেজিস্টার', 'Register'],
    ['মানি রিসিপ্ট', 'Form']
  ],
  DEFAULT_UNIT: { Form: 'প্যাড', Register: 'পিস', Stationery: 'পিস', Other: 'পিস' },

  DEFAULT_BRANCHES: [
    ['0067', 'গঙ্গাচড়া'], ['0068', 'মাহিগঞ্জ'], ['0069', 'রংপুর সদর'], ['0070', 'বেতগাড়ী'],
    ['0071', 'বড়বাড়ী'], ['0072', 'তারাগঞ্জ'], ['0073', 'পার্বতীপুর'], ['0077', 'জলঢাকা'],
    ['0079', 'গাবরুল'], ['0080', 'কাইমারী'], ['0170', 'জলকর'], ['0214', 'বদরগঞ্জ'],
    ['0215', 'কাউনিয়া'], ['0240', 'বগুলাগাড়ী'], ['0269', 'আমবাড়ী'], ['0299', 'লালদীঘি'],
    ['0315', 'মিঠাপুকুর'], ['0316', 'পাগলাপীর']
  ],

  DEFAULT_SETTINGS: {
    orgName: 'POPI',
    officeName: 'আঞ্চলিক কার্যালয়, রংপুর',
    prefix: 'POPI/RO',
    counters: {}
  },

  // ========== SUPABASE DATA LAYER ==========
  _items: [], _branches: [], _vouchers: [], _settings: null, _notifs: [],
  _branchLocationById: {}, _regionalLocationId: null,
  load(key, def) {
    try {
      const raw = localStorage.getItem(this.K[key]);
      return raw === null ? def : JSON.parse(raw);
    } catch (e) { return def; }
  },
  has(key) { return localStorage.getItem(this.K[key]) !== null; },
  async save(key, data) {
    if (key === 'notifs') {
      const rows = data.map(n => ({
        id:Number(n.id), user_id:this.user.id, type:n.type, title:n.title, message:n.message,
        voucher_id:n._dbVoucherId || (n.vid ? this._vouchers.find(v => v.id === n.vid)?._dbId : null) || null,
        created_at:n.time || new Date().toISOString(), is_read:!!n.read
      }));
      if (rows.length) {
        const { error } = await sbClient.from('user_notifications').upsert(rows,{onConflict:'user_id,id'});
        if (error) throw error;
      }
      const keep = data.map(n=>Number(n.id));
      let del = sbClient.from('user_notifications').delete().eq('user_id',this.user.id);
      if (keep.length) del = del.not('id','in',`(${keep.join(',')})`);
      const { error:de } = await del;
      if (de) throw de;
      this._notifs = data;
      return;
    }
    if (key === 'auth') {
      localStorage.setItem(this.K[key], JSON.stringify(data));
      return;
    }
    if (key === 'items' || key === 'branches') {
      const table = key;
      const previous = key === 'items' ? this._items : this._branches;
      const toRow = x => key === 'items'
        ? { code:x.code, name:x.name, category:x.category || null,
            unit:x.unit, reorder_level:Number(x.reorderLevel || 0), description:x.description || '', is_active:true }
        : { code:x.code, name:x.name, address:x.address || '',
            phone:x.contact || '', is_active:true };

      // Keep UUID generation in PostgreSQL: INSERT new rows without an id.
      // Do not bulk-upsert mixed rows because omitted UUIDs can be sent as NULL.
      const existing = data.filter(x => x._dbId);
      const fresh = data.filter(x => !x._dbId);
      for (const x of existing) {
        const { error } = await sbClient.from(table).update(toRow(x)).eq('id', x._dbId);
        if (error) throw error;
      }
      if (fresh.length) {
        const { error } = await sbClient.from(table).insert(fresh.map(toRow));
        if (error) throw error;
      }
      const keep = new Set(data.map(x => x._dbId).filter(Boolean));
      const removed = previous.filter(x => x._dbId && !keep.has(x._dbId)).map(x => x._dbId);
      if (removed.length) {
        const { error:de } = await sbClient.from(table).update({is_active:false}).in('id', removed);
        if (de) throw de;
      }
      await this.loadCloudData();
      return;
    }
    if (key === 'settings') return this.saveSettings(data);
  },
  getItems() { return this._items; },
  getBranches() { return this._branches; },
  getVouchers() { return this._vouchers; },
  getSettings() { return { ...this.DEFAULT_SETTINGS, ...(this._settings || {}) }; },
  async saveSettings(s) {
    const { error } = await sbClient.from('app_settings').upsert({
      id:true, settings:s, updated_by:this.user?.id || null, updated_at:new Date().toISOString()
    }, { onConflict:'id' });
    if (error) throw error;
    this._settings = s;
  },
  async loadCloudData() {
    const [ir, br, lr, dr, sr, nr] = await Promise.all([
      sbClient.from('items').select('*').eq('is_active',true).order('code'),
      sbClient.from('branches').select('*').eq('is_active',true).order('code'),
      sbClient.from('inventory_locations').select('*').eq('is_active',true),
      sbClient.from('inventory_documents').select('*,inventory_document_lines(*)').order('document_date',{ascending:false}),
      sbClient.from('app_settings').select('settings').eq('id',true).maybeSingle(),
      sbClient.from('user_notifications').select('*').order('created_at',{ascending:false}).limit(200)
    ]);
    for (const x of [ir,br,lr,dr,sr,nr]) if (x.error) throw x.error;
    this._items = (ir.data || []).map((x,n) => ({
      id:n+1,_dbId:x.id,code:x.code,name:x.name,category:x.category,unit:x.unit,
      reorderLevel:Number(x.reorder_level || 0),description:x.description || ''
    }));
    this._branches = (br.data || []).map((x,n) => ({
      id:n+1,_dbId:x.id,code:x.code,name:x.name,address:x.address || '',contact:x.phone || ''
    }));
    const itemIds = Object.fromEntries(this._items.map(x => [x._dbId,x.id]));
    const branchIds = Object.fromEntries(this._branches.map(x => [x._dbId,x.id]));
    this._branchLocationById = {};
    this._regionalLocationId = null;
    (lr.data || []).forEach(x => {
      if (x.location_type === 'regional_store') this._regionalLocationId = x.id;
      if (x.location_type === 'branch') this._branchLocationById[x.branch_id] = x.id;
    });
    const locationsById = Object.fromEntries((lr.data || []).map(x => [x.id,x]));
    this._vouchers = (dr.data || []).map((d,n) => {
      const loc = locationsById[d.destination_location_id] || locationsById[d.source_location_id];
      const branchId = loc?.branch_id ? branchIds[loc.branch_id] : null;
      return {
        id:n+1,_dbId:d.id,no:d.document_no,type:d.document_type === 'receipt' ? 'in' : 'out',
        date:d.document_date,branchId,source:d.source_name || '',reference:d.reference_no || '',
        remarks:d.remarks || '',status:d.status === 'cancelled' ? 'cancelled' : 'active',
        createdAt:d.created_at,createdBy:d.created_by,
        cancelReason:d.cancellation_reason || '',cancelledAt:d.cancelled_at,
        lines:(d.inventory_document_lines || []).map(line => ({
          itemId:itemIds[line.item_id],qty:Number(line.quantity),_dbItemId:line.item_id
        })).filter(line => line.itemId)
      };
    });
    this._settings = sr.data?.settings || this.DEFAULT_SETTINGS;
    const oldLocalNotifs = this.load('notifs', []);
    this._notifs = (nr.data || []).map(n => ({
      id:Number(n.id),type:n.type,title:n.title,message:n.message,
      vid:this._vouchers.find(v=>v._dbId===n.voucher_id)?.id || null,
      _dbVoucherId:n.voucher_id,time:n.created_at,read:n.is_read
    }));
    if (this._notifs.length === 0 && oldLocalNotifs.length) {
      this._notifs = oldLocalNotifs.slice(0,200);
      await this.save('notifs', this._notifs);
    }
  },

  generateId(list) {
    if (!list || list.length === 0) return 1;
    return Math.max(...list.map((i) => i.id)) + 1;
  },

  nextCode(category, items) {
    const prefix = this.CAT_PREFIX[category] || 'OTH';
    const re = new RegExp('^' + prefix + '-(\\d+)$', 'i');
    let max = 0;
    (items || this.getItems()).forEach((i) => {
      const m = re.exec(i.code || '');
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return prefix + '-' + String(max + 1).padStart(3, '0');
  },

  buildDefaultItems(existing = []) {
    const list = [...existing];
    this.DEFAULT_ITEMS.forEach(([name, category]) => {
      if (list.some((i) => i.name === name)) return;
      list.push({
        id: this.generateId(list),
        code: this.nextCode(category, list),
        name, category,
        unit: this.DEFAULT_UNIT[category],
        reorderLevel: 0,
        description: ''
      });
    });
    return list;
  },

  buildDefaultBranches(existing = []) {
    const list = [...existing];
    this.DEFAULT_BRANCHES.forEach(([code, name]) => {
      if (list.some((b) => b.code === code)) return;
      list.push({ id: this.generateId(list), code, name, address: '', contact: '' });
    });
    return list;
  },

  // ========== STOCK CALCULATION ==========
  stockMap() {
    const m = {};
    this.getVouchers().forEach((v) => {
      if (v.status === 'cancelled') return;
      v.lines.forEach((l) => {
        m[l.itemId] = (m[l.itemId] || 0) + (v.type === 'in' ? l.qty : -l.qty);
      });
    });
    return m;
  },
  getStock(itemId) { return this.stockMap()[itemId] || 0; },
  getAllStock() {
    const m = this.stockMap();
    return this.getItems().map((i) => ({ ...i, currentStock: m[i.id] || 0 }));
  },
  isLow(i) { return (i.reorderLevel || 0) > 0 && i.currentStock <= i.reorderLevel; },

  // ========== FORMAT HELPERS ==========
  bn(n) { return Number(n).toLocaleString('bn-BD'); },
  today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  formatDate(str) {
    if (!str) return '-';
    const d = new Date(str.length === 10 ? str + 'T00:00:00' : str);
    return d.toLocaleDateString('bn-BD', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  formatDateTime(str) {
    if (!str) return '-';
    return new Date(str).toLocaleString('bn-BD', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  timeAgo(iso) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'এইমাত্র';
    if (s < 3600) return this.bn(Math.floor(s / 60)) + ' মিনিট আগে';
    if (s < 86400) return this.bn(Math.floor(s / 3600)) + ' ঘণ্টা আগে';
    return this.formatDateTime(iso);
  },

  showToast(message, type = 'success') {
    const t = document.getElementById('toast');
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
    t.className = `toast ${type} show`;
    t.innerHTML = `<i class="fas fa-${icon}"></i> ${esc(message)}`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
  },

  // ========== MODALS ==========
  closeModal() { document.getElementById('modalContainer').innerHTML = ''; },

  confirmModal({ title, html, okText = 'নিশ্চিত করুন', okClass = 'btn-primary', onOk, validate = null, wide = false }) {
    this._confirmCb = onOk;
    this._confirmValidate = validate;
    document.getElementById('modalContainer').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)APP.closeModal()">
        <div class="modal ${wide ? 'modal-lg' : ''}">
          <div class="modal-header"><h3>${esc(title)}</h3>
            <button class="modal-close" onclick="APP.closeModal()"><i class="fas fa-times"></i></button></div>
          <div class="modal-body">${html}</div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="APP.closeModal()">বাতিল</button>
            <button class="btn ${okClass}" onclick="APP.runConfirm()">${okText}</button>
          </div>
        </div>
      </div>`;
  },
  runConfirm() {
    if (this._confirmValidate && !this._confirmValidate()) return;
    const cb = this._confirmCb;
    this._confirmCb = null;
    this.closeModal();
    if (cb) cb();
  },

  // ========== SHA-256 (client side hashing) ==========
  sha256(str) {
    const bytes = new TextEncoder().encode(str);
    const K = new Uint32Array(64), H = new Uint32Array(8);
    for (let c = 2, n = 0; n < 64; c++) {
      let prime = true;
      for (let d = 2; d * d <= c; d++) if (c % d === 0) { prime = false; break; }
      if (!prime) continue;
      if (n < 8) H[n] = Math.floor((Math.sqrt(c) % 1) * 4294967296);
      K[n] = Math.floor((Math.cbrt(c) % 1) * 4294967296);
      n++;
    }
    const l = bytes.length;
    const total = ((l + 9 + 63) >> 6) << 6;
    const buf = new Uint8Array(total);
    buf.set(bytes);
    buf[l] = 0x80;
    const view = new DataView(buf.buffer);
    view.setUint32(total - 4, (l * 8) >>> 0);
    view.setUint32(total - 8, Math.floor((l * 8) / 4294967296));
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    const w = new Uint32Array(64);
    for (let off = 0; off < total; off += 64) {
      for (let t = 0; t < 16; t++) w[t] = view.getUint32(off + t * 4);
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[t] + w[t]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    return Array.from(H).map((x) => x.toString(16).padStart(8, '0')).join('');
  },
  hashPw(pw, salt) { return this.sha256(salt + '|' + pw); },

  // ========== SUPABASE AUTH ==========
  async loadProfile(user) {
    const { data, error } = await sbClient.from('user_profiles')
      .select('id,full_name,role,is_active').eq('id',user.id).maybeSingle();
    if (error) throw error;
    if (!data || !data.is_active || !['regional_admin','store_manager'].includes(data.role)) {
      await sbClient.auth.signOut();
      throw new Error('এই অ্যাকাউন্টের Inventory System ব্যবহারের অনুমতি নেই।');
    }
    this.user = { id:user.id, email:user.email, username:user.email, name:data.full_name || user.email, role:data.role };
    await this.loadCloudData();
  },
  async initCloud() {
    this.showLogin();
    try {
      const { data, error } = await sbClient.auth.getSession();
      if (error) throw error;
      if (data.session?.user) {
        await this.loadProfile(data.session.user);
        this.enterApp(false);
      }
    } catch (e) {
      console.error('Supabase session restore failed:', e);
      this.showLogin();
    }
  },
  showLogin() {
    document.getElementById('appRoot').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    const f = document.getElementById('loginForm');
    f.password.value = '';
    document.getElementById('loginError').textContent = '';
    setTimeout(() => f.email.focus(), 50);
  },
  async doLogin(e) {
    e.preventDefault();
    const f = e.target;
    const err = document.getElementById('loginError');
    const btn = f.querySelector('button[type="submit"]');
    btn.disabled = true;
    err.textContent = 'লগইন যাচাই করা হচ্ছে...';
    try {
      const { data, error } = await sbClient.auth.signInWithPassword({
        email:f.email.value.trim(), password:f.password.value
      });
      if (error) throw error;
      await this.loadProfile(data.user);
      this.enterApp(true);
    } catch (error) {
      err.textContent = error.message || 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।';
      await sbClient.auth.signOut();
    } finally { btn.disabled = false; }
  },

  togglePw(btn) {
    const inp = btn.parentElement.querySelector('input');
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    btn.innerHTML = `<i class="fas fa-eye${show ? '-slash' : ''}"></i>`;
  },

  async logout() {
    await sbClient.auth.signOut();
    this.user = null;
    this._items = []; this._branches = []; this._vouchers = []; this._settings = null;
    this.closeModal();
    this.closeNotifPanel();
    document.getElementById('content').innerHTML = '';
    this.showLogin();
  },

  enterApp(fresh) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appRoot').classList.remove('hidden');
    document.getElementById('userName').textContent = this.user.name || this.user.email || this.user.username;
    const roleLabel = this.user.role === 'regional_admin' ? 'Regional Admin' : 'Store Manager';
    const roleNode = document.querySelector('.user-info small');
    if (roleNode) roleNode.textContent = roleLabel + ' • POPI Rangpur';
    document.querySelectorAll('.nav-item').forEach((node) => {
      const restricted = ['items','branches','settings'].includes(node.dataset.page);
      node.classList.toggle('hidden', this.user.role === 'store_manager' && restricted);
    });
    if (fresh) {
      this.notify('info', 'লগইন সফল', `${this.user.name || this.user.username} সিস্টেমে লগইন করেছেন।`);
      const low = this.getAllStock().filter((i) => this.isLow(i));
      if (low.length) this.notify('warning', 'লো স্টক সতর্কতা', `${low.length} টি আইটেম রিঅর্ডার লেভেলের নিচে আছে।`);
      if (this.user.isDefault) this.notify('warning', 'পাসওয়ার্ড পরিবর্তন করুন', 'ডিফল্ট পাসওয়ার্ড ব্যবহার হচ্ছে। সেটিংস থেকে নতুন পাসওয়ার্ড দিন।');
    }
    this.updateNotifBadge();
    this.navigate('dashboard');
  },

  // ========== NOTIFICATIONS ==========
  notify(type, title, message, vid = null) {
    const list = this._notifs || [];
    this._nc = ((this._nc || 0) + 1) % 1000;
    list.unshift({ id: Date.now() * 1000 + this._nc, type, title, message, vid, time: new Date().toISOString(), read: false });
    this.save('notifs', list.slice(0, 200)).catch(error => console.error('Notification cloud save failed:',error));
    this.updateNotifBadge();
    if (!document.getElementById('notifPanel').classList.contains('hidden')) this.renderNotifPanel();
  },

  updateNotifBadge() {
    const n = (this._notifs || []).filter((x) => !x.read).length;
    const b = document.getElementById('notifBadge');
    if (!b) return;
    b.textContent = n > 99 ? '99+' : n;
    b.classList.toggle('hidden', n === 0);
  },

  toggleNotifPanel() {
    const p = document.getElementById('notifPanel');
    if (p.classList.contains('hidden')) { this.renderNotifPanel(); p.classList.remove('hidden'); }
    else p.classList.add('hidden');
  },
  closeNotifPanel() { document.getElementById('notifPanel')?.classList.add('hidden'); },

  renderNotifPanel() {
    const list = this._notifs || [];
    const icons = { success: 'check-circle', info: 'info-circle', warning: 'exclamation-triangle', danger: 'times-circle' };
    document.getElementById('notifPanel').innerHTML = `
      <div class="notif-head">
        <strong><i class="fas fa-bell"></i> নোটিফিকেশন</strong>
        <div>
          <button class="link-btn" onclick="APP.markAllRead()">সব পড়া হয়েছে</button>
          <button class="link-btn danger" onclick="APP.clearNotifs()">মুছুন</button>
        </div>
      </div>
      <div class="notif-list">
        ${list.length === 0 ? '<div class="notif-empty"><i class="far fa-bell-slash"></i><p>কোনো নোটিফিকেশন নেই</p></div>' :
          list.slice(0, 60).map((n) => `
          <div class="notif-item ${n.read ? '' : 'unread'}" onclick="APP.openNotif(${n.id})">
            <div class="notif-icon ${n.type}"><i class="fas fa-${icons[n.type] || 'info-circle'}"></i></div>
            <div class="notif-text">
              <strong>${esc(n.title)}</strong>
              <p>${esc(n.message)}</p>
              <small>${this.timeAgo(n.time)}</small>
            </div>
          </div>`).join('')}
      </div>`;
  },

  openNotif(id) {
    const list = this._notifs || [];
    const n = list.find((x) => x.id === id);
    if (n) { n.read = true; this.save('notifs', list).catch(error => this.showToast(error.message || 'নোটিফিকেশন আপডেট হয়নি','error')); }
    this.updateNotifBadge();
    this.renderNotifPanel();
    if (n && n.vid && this.getVouchers().some((v) => v.id === n.vid)) {
      this.closeNotifPanel();
      this.previewVoucher(n.vid);
    }
  },
  markAllRead() {
    const list = (this._notifs || []).map((n) => ({ ...n, read: true }));
    this.save('notifs', list).catch(error => this.showToast(error.message || 'নোটিফিকেশন আপডেট হয়নি','error'));
    this.updateNotifBadge();
    this.renderNotifPanel();
  },
  clearNotifs() {
    this.save('notifs', []).catch(error => this.showToast(error.message || 'নোটিফিকেশন মুছতে সমস্যা হয়েছে','error'));
    this.updateNotifBadge();
    this.renderNotifPanel();
  },

  // ========== INIT & NAVIGATION ==========
  init() {
    this.bindEvents();
    const el = document.getElementById('currentDate');
    if (el) el.textContent = new Date().toLocaleDateString('bn-BD', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    this.initCloud();
  },

  bindEvents() {
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(item.dataset.page);
      });
    });
    document.getElementById('menuToggle')?.addEventListener('click', () => document.getElementById('sidebar').classList.add('open'));
    document.getElementById('sidebarClose')?.addEventListener('click', () => document.getElementById('sidebar').classList.remove('open'));
    document.addEventListener('click', (e) => {
      const wrap = document.querySelector('.notif-wrap');
      if (wrap && !e.composedPath().includes(wrap)) this.closeNotifPanel();
    });
    window.addEventListener('afterprint', () => { document.getElementById('printArea').innerHTML = ''; });
  },

  navigate(page) {
    if (!this.user) return;
    if (this.user.role === 'store_manager' && ['items','branches','settings'].includes(page)) {
      this.showToast('এই মেনু ব্যবহারের অনুমতি নেই', 'error');
      return;
    }
    this.page = page;
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.page === page));
    const t = this.TITLES[page] || [page, ''];
    document.getElementById('pageTitle').textContent = t[0];
    document.getElementById('pageSubtitle').textContent = t[1];
    document.getElementById('sidebar').classList.remove('open');
    this.closeNotifPanel();

    const content = document.getElementById('content');
    content.innerHTML = '';
    const fn = {
      dashboard: 'renderDashboard', items: 'renderItems', branches: 'renderBranches',
      'stock-in': 'renderStockIn', 'stock-out': 'renderStockOut',
      transactions: 'renderTransactions', reports: 'renderReports', settings: 'renderSettings'
    }[page];
    if (fn) this[fn](content);
    window.scrollTo(0, 0);
  }
};

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => APP.init());
}
