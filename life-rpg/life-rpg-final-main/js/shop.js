/* =========================================================
   Life RPG â€“ Shop Page
   ========================================================= */
'use strict';

window.PageShop = {
  // Set of item IDs currently mid-purchase (prevents double-click)
  _buying: new Set(),

  async render() {
    const section = document.getElementById('content-shop');
    if (!section) return;
    section.innerHTML = `<div class="page-loader"><div class="loader-ring"></div></div>`;

    try {
      // Sync gold from total stars before showing wallet
      let totalStarsForSync = 0;
      try {
        const allLogs = await DB.logs.getAll();
        totalStarsForSync = allLogs.length;
        await DB.stats.syncGold(totalStarsForSync);
      } catch (e) { /* non-fatal â€” continue with cached balance */ }

      const [items, owned, profile, user, equippedId] = await Promise.all([
        DB.shop.list(),
        DB.shop.owned(),
        DB.profile.get().catch(() => null),
        DB.auth.getUser().catch(() => null),
        DB.shop.equipped().catch(() => null),
      ]);

      const currentGold = profile?.gold ?? user?.gold ?? 0;
      const ownedList   = owned || [];
      const ownedSet    = new Set(ownedList.map(o => (typeof o === 'string' ? o : (o.item_id || o.id))));

      section.innerHTML = `
        <!-- Page Hero -->
        <div class="page-hero" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;margin-bottom:24px;">
          <div>
            <p class="greeting">MARKETPLACE</p>
            <h2 style="font-family:'Playfair Display',serif;font-size:32px;font-weight:700;">
              Deep Sea Shop <span style="color:var(--teal);font-weight:400">~</span>
            </h2>
            <p style="color:var(--text-secondary);font-size:13.5px;">Spend your hard-earned gold on exclusive items, badges, and themes.</p>
          </div>
          <div class="card card-sm shop-gold-wallet" style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-color:rgba(244,196,48,.25);">
            <div style="font-size:24px;" aria-hidden="true">ðŸª™</div>
            <div>
              <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;letter-spacing:.5px;">Available Gold</div>
              <div id="shop-gold-display" style="font-size:22px;font-weight:700;color:var(--gold);font-family:var(--font-heading);" aria-live="polite" aria-label="${currentGold} Gold">${currentGold} Gold</div>
            </div>
          </div>
        </div>

        <!-- Shop Items Grid -->
        ${(!items || items.length === 0)
          ? `<div class="shop-empty-state card" style="text-align:center;padding:56px 20px;">
               <div style="font-size:52px;margin-bottom:16px;opacity:.5;">ðŸª</div>
               <h3 style="margin-bottom:8px;font-family:'Playfair Display',serif;">Shop is coming soon</h3>
               <p style="color:var(--text-muted);font-size:14px;">No items available yet â€” check back after your next voyage!</p>
             </div>`
          : `<div class="shop-grid" role="list" aria-label="Shop items" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:20px;">
               ${items.map(item => this._renderCard(item, ownedSet, equippedId)).join('')}
             </div>`
        }
      `;
    } catch (err) {
      section.innerHTML = `
        <div class="card" style="text-align:center;padding:40px;">
          <div style="font-size:36px;margin-bottom:12px;">âš ï¸</div>
          <h3>Could not load shop</h3>
          <p style="color:var(--text-muted);font-size:13px;margin-top:6px;">${err.message || err}</p>
          <button class="btn btn-primary" onclick="PageShop.render()" style="margin-top:16px;">
            <i class="fa-solid fa-rotate-right"></i> Retry
          </button>
        </div>`;
    }
  },

  _renderCard(item, ownedSet, equippedId) {
    const isOwned    = ownedSet.has(item.id) || ownedSet.has(String(item.id));
    const isEquipped = equippedId === item.id;
    const canEquip   = item.type === 'theme' || item.type === 'frame' || item.type === 'badge';
    const typeLabel  = item.type
      ? `<span class="shop-type-tag">${item.type}</span>`
      : '';

    let actionBtn;
    if (isOwned && canEquip) {
      actionBtn = isEquipped
        ? `<button class="btn btn-sm shop-equipped-btn" disabled aria-label="Currently equipped: ${item.name}">
             <i class="fa-solid fa-check-circle"></i> Equipped
           </button>`
        : `<button class="btn btn-ghost btn-sm" onclick="PageShop.equip('${item.id}', this)" aria-label="Equip ${item.name}">
             <i class="fa-solid fa-wand-magic-sparkles"></i> Equip
           </button>`;
    } else if (isOwned) {
      actionBtn = `<button class="btn btn-ghost btn-sm" disabled style="opacity:.6;cursor:default;" aria-label="${item.name} already owned">
                     <i class="fa-solid fa-check"></i> Owned
                   </button>`;
    } else {
      actionBtn = `<button class="btn btn-primary btn-sm" onclick="PageShop.buy('${item.id}', this)" aria-label="Buy ${item.name} for ${item.cost} Gold">
                     <i class="fa-solid fa-bag-shopping"></i> Buy
                   </button>`;
    }

    return `
      <div class="card shop-card ${isEquipped ? 'shop-card-equipped' : ''}" role="listitem" data-item-id="${item.id}">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div style="font-size:34px;" aria-hidden="true">${item.icon || 'ðŸŽ'}</div>
            ${typeLabel}
          </div>
          <h3 style="font-size:18px;font-weight:700;margin-bottom:6px;color:var(--text-primary);font-family:var(--font-heading);">${item.name}</h3>
          <p style="font-size:13px;color:var(--text-secondary);line-height:1.4;">${item.description || item.name}</p>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:14px;border-top:1px solid var(--card-border);margin-top:16px;">
          <div style="font-weight:700;color:var(--gold);font-size:16px;display:flex;align-items:center;gap:6px;" aria-label="${item.cost} Gold">
            <span aria-hidden="true">ðŸª™</span> ${item.cost} <span style="font-size:12px;color:var(--text-muted);font-weight:400;">Gold</span>
          </div>
          <div id="shop-btn-wrap-${item.id}" style="position:relative;">
            ${actionBtn}
          </div>
        </div>
      </div>`;
  },

  async buy(itemId, btn) {
    // Prevent double-purchases
    if (this._buying.has(itemId)) return;
    this._buying.add(itemId);

    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Buyingâ€¦`;
    }

    try {
      await DB.shop.purchase(itemId);

      // Confetti burst at button location
      if (btn) this._confettiBurst(btn);

      App.toast('ðŸŽ‰ Item purchased successfully!', 'success');

      // Re-render the full page to refresh gold counter + button states
      await this.render();
    } catch (err) {
      // Rollback: restore button
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }

      const msg = err.message || String(err);
      if (msg.includes('Not enough gold')) {
        App.toast('ðŸª™ Not enough gold â€” complete more habits to earn gold!', 'warning');
      } else if (msg.includes('Already owned')) {
        App.toast('You already own this item.', 'warning');
      } else {
        App.toast(`Purchase failed: ${msg}`, 'error');
      }
    } finally {
      this._buying.delete(itemId);
    }
  },

  async equip(itemId, btn) {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    }
    try {
      await DB.shop.equip(itemId);
      this.applyEquipped(itemId);
      App.toast('âœ¨ Item equipped!', 'success');
      await this.render();
    } catch (err) {
      if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Equip`; }
      App.toast('Could not equip item: ' + (err.message || err), 'error');
    }
  },

  // Apply cosmetic effect of the equipped item to the page.
  // Called on boot (App.init) and after equipping.
  applyEquipped(itemId) {
    // Remove all equipped data-attributes
    document.body.removeAttribute('data-equipped');
    document.documentElement.style.removeProperty('--accent-override');

    if (!itemId) return;

    document.body.setAttribute('data-equipped', itemId);

    // Theme accent colors
    const ACCENT_MAP = {
      'item_deep_sea_theme':  '#3b5bdb',
      'item_sunset_theme':    '#e67e22',
    };
    if (ACCENT_MAP[itemId]) {
      document.documentElement.style.setProperty('--accent-override', ACCENT_MAP[itemId]);
    }

    // Coral frame: add glow ring to profile avatar
    const avatar = document.querySelector('.profile-avatar');
    if (avatar) {
      avatar.style.boxShadow = itemId === 'item_coral_frame'
        ? '0 0 0 3px #ff7c5c, 0 0 20px rgba(255,124,92,.4)'
        : '';
    }
  },

  // Load and apply saved equipped item on app boot
  async initEquipped() {
    try {
      const itemId = await DB.shop.equipped();
      if (itemId) this.applyEquipped(itemId);
    } catch (e) { /* non-fatal */ }
  },

  // Gold-particle confetti burst at the location of the buy button
  _confettiBurst(btn) {
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const colors = ['#f4c430', '#00d4c8', '#fff', '#ffd700', '#4de8e0'];
    const count = 18;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'shop-confetti-particle';
      const angle  = (i / count) * Math.PI * 2;
      const dist   = 40 + Math.random() * 60;
      const dx     = Math.cos(angle) * dist;
      const dy     = Math.sin(angle) * dist;
      const size   = 4 + Math.random() * 7;
      const color  = colors[i % colors.length];
      p.style.cssText = `
        position:fixed;
        left:${cx}px; top:${cy}px;
        width:${size}px; height:${size}px;
        border-radius:${Math.random() > .5 ? '50%' : '2px'};
        background:${color};
        pointer-events:none;
        z-index:99999;
        transform:translate(-50%,-50%);
        animation: shopParticle .7s ease-out forwards;
        --dx:${dx}px; --dy:${dy}px;
        box-shadow:0 0 6px ${color};
      `;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 750);
    }
  },
};
