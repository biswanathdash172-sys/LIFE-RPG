/* =========================================================
   Life RPG – App Router & Shell
   ========================================================= */
'use strict';

window.App = {
  currentPage: 'home',

  pages: {
    home:     { label: 'Home',      icon: 'fa-house',           render: () => PageHome.render() },
    habits:   { label: 'My Habits', icon: 'fa-list-check',      render: () => PageHabits.render() },
    calendar: { label: 'Calendar',  icon: 'fa-calendar-days',   render: () => PageCalendar.render() },
    rewards:  { label: 'Rewards',   icon: 'fa-star',            render: () => PageRewards.render() },
    shop:     { label: 'Shop',      icon: 'fa-store',           render: () => PageShop.render() },
    insights: { label: 'Insights',  icon: 'fa-chart-line',      render: () => PageInsights.render() },
    settings: { label: 'Settings',  icon: 'fa-gear',            render: () => PageSettings.render() },
  },

  async init() {
    // Auth guard
    const user = await DB.auth.getUser();
    if (!user) { window.location.href = 'index.html'; return; }

    // Build sidebar
    this.buildSidebar(user);
    this.buildHeader(user);
    this.buildBubbles();
    this.buildRays();

    // Restore any equipped cosmetic item (theme/frame/badge)
    if (typeof PageShop !== 'undefined' && PageShop.initEquipped) {
      PageShop.initEquipped();
    }

    // Load saved avatar
    const avatar = localStorage.getItem('hf_avatar');
    if (avatar) {
      const av = document.querySelector('.profile-avatar');
      if (av) av.innerHTML = `<img src="${avatar}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    }

    // Load compact pref
    if (localStorage.getItem('hf_compact') === 'true') document.body.classList.add('compact');

    // Navigate to initial page
    const hash = location.hash.replace('#','') || 'home';
    await this.navigate(hash);
  },

  buildSidebar(user) {
    const nav = document.getElementById('sidebar-nav');
    const name = user?.fullName || user?.full_name || user?.email?.split('@')[0] || 'Explorer';

    nav.innerHTML = Object.entries(this.pages).map(([key, p]) => `
      <a class="nav-item" id="nav-${key}" onclick="App.navigate('${key}')" href="javascript:void(0)">
        <i class="fa-solid ${p.icon}"></i>
        <span>${p.label}</span>
      </a>`).join('');
  },

  buildHeader(user) {
    const name    = user?.fullName || user?.full_name || user?.email?.split('@')[0] || 'Explorer';
    const initial = name[0]?.toUpperCase() || 'U';

    const avatarText = document.getElementById('header-avatar-text');
    if (avatarText) avatarText.textContent = initial;

    const nameEl = document.getElementById('header-profile-name');
    if (nameEl) nameEl.textContent = name;

    const emailEl = document.getElementById('header-profile-email');
    if (emailEl) emailEl.textContent = user?.email || '';

    // Search
    const searchInput = document.getElementById('header-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.handleSearch(e.target.value);
      });
    }
  },

  buildBubbles() {
    const wrap = document.getElementById('ocean-bubbles');
    if (!wrap) return;
    for (let i = 0; i < 18; i++) {
      const b   = document.createElement('div');
      b.className = 'bubble';
      const size  = 4 + Math.random() * 16;
      b.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random()*100}%;
        --dur:${10 + Math.random()*20}s;
        --del:${-Math.random()*20}s;
        animation-delay:var(--del);
        animation-duration:var(--dur);
      `;
      wrap.appendChild(b);
    }
  },

  buildRays() {
    const wrap = document.getElementById('ocean-rays');
    if (!wrap) return;
    [15, 30, 50, 65, 80].forEach((left, i) => {
      const r = document.createElement('span');
      r.style.cssText = `left:${left}%; --r:${(i%2===0?1:-1)*5}; --d:${7+i*2}s; opacity:${.3+i*.1}`;
      wrap.appendChild(r);
    });
  },

  async navigate(page) {
    if (!this.pages[page]) page = 'home';
    this.currentPage = page;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navEl = document.getElementById(`nav-${page}`);
    if (navEl) navEl.classList.add('active');

    // Show correct section
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById(`content-${page}`);
    if (section) section.classList.add('active');

    // Update hash
    location.hash = page;

    // Render page
    await this.pages[page].render();
  },

  handleSearch(query) {
    if (!query.trim()) return;
    // Navigate to habits and search
    this.navigate('habits');
    setTimeout(() => {
      const rows = document.querySelectorAll('.habits-table tbody tr');
      rows.forEach(r => {
        const text = r.textContent.toLowerCase();
        r.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
      });
    }, 400);
  },

  toast(message, type = 'success', duration = 3200) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success: 'fa-check-circle', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fa-solid ${icons[type] || 'fa-info-circle'}"></i> ${message}`;
    container.appendChild(t);
    setTimeout(() => {
      t.classList.add('toast-out');
      setTimeout(() => t.remove(), 350);
    }, duration);
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
