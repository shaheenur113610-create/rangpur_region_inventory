# Rangpur Region Office - Inventory Management System (v2)

NGO document / register inventory software for the Regional Office and its branches.
Frontend only (HTML + CSS + JS), data is stored in the browser (LocalStorage).

## Login
- First time: **admin / admin123**
- After login go to **সেটিংস → পাসওয়ার্ড পরিবর্তন** and set a new password.
- Note: this is a client-side login (it protects the screen, not the data in the browser).
  For real multi-user security a backend is required (see "Next step").

## Features
- **Dashboard** – 4 stat cards + 3 cards: স্টক (item-wise stock list with search), লো স্টক এলার্ট, সাম্প্রতিক ট্রানজেকশন
- **Notification bar** (bell icon) – stock in/out, low stock, cancel, item/branch changes, backup, password change; click a challan notification to open it
- **Item Master** – 35 default registers/forms, add / edit / delete, search + category filter, "ডিফল্ট তালিকা যোগ" button to bring back missing defaults
- **Branch Master** – 18 default branches (codes 0067 – 0316), add / edit / delete, "ডিফল্ট শাখা যোগ"
- **Bulk Stock In** – one challan, all items listed, type quantity only for received items; Enter moves to next row
- **Bulk Stock Out** – select branch + requisition/memo no, type quantity for all items in one go; over-stock rows turn red and save is blocked
- **Transaction History** – filters (type, branch, date range, search), pagination, **Print button on every row**, cancel with reason
- **Print receipt / challan** – A4 portrait, office details, branch details, item list with total, signature boxes, Office copy + Branch copy (2 pages)
- **Reports** – stock report (print + CSV for Excel), branch-wise distribution with date filter and item-wise details
- **Settings** – organisation / office name, challan prefix, password change, backup, restore, reset

## Challan numbering
- Stock Out: `POPI/RO/2026/0001` (prefix editable in Settings)
- Stock In:  `POPI/RO/IN/2026/0001`

## How to use
1. Open `index.html` in Chrome / Edge / Firefox.
2. Login, set opening stock from **স্টক ইন → প্রাপ্তির ধরন: ওপেনিং স্টক**.
3. Set "রিঅর্ডার লেভেল" in Item Master for items that need low-stock alerts (0 = alert off).
4. Take a **Backup** regularly (Settings or top bar).

## Folder structure
```
rangpur-inventory/
├── index.html
├── css/style.css
├── js/
│   ├── core.js    (data, defaults, login, notifications, navigation)
│   ├── master.js  (dashboard, item master, branch master)
│   ├── stock.js   (bulk stock in/out, transactions, receipt print)
│   └── extra.js   (reports, settings, backup/restore)
└── README.md
```

## Next step (backend)
Replace LocalStorage with API calls (PHP / Laravel / Node / FastAPI), add real user roles
(Region Admin / Branch User), SMS / email notification.
