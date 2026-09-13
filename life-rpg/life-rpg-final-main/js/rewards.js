/* =========================================================
   Life RPG – Rewards Page
   ========================================================= */
'use strict';

window.PageRewards = {
  GALLERY: [
    { id: 'star_shell',    icon: '⭐', name: 'Star Shell',     desc: '1 task',      req: 1,   type: 'task',   unlockDesc: '+1 ⭐' },
    { id: 'pearl_oyster',  icon: '🦪', name: 'Pearl Oyster',   desc: 'All tasks',   req: 0,   type: 'pearl',  unlockDesc: '+1 🦪' },
    { id: 'ocean_badge',   icon: '🏅', name: 'Ocean Badge',    desc: '10 stars',    req: 10,  type: 'stars',  unlockDesc: 'Collect!' },
    { id: 'sea_turtle',    icon: '🐢', name: 'Sea Turtle',     desc: '25 stars',    req: 25,  type: 'stars',  unlockDesc: 'Keep it up!' },
    { id: 'ocean_explorer',icon: '🌊', name: 'Ocean Explorer', desc: '50 stars',    req: 50,  type: 'stars',  unlockDesc: 'Explorer!' },
    { id: 'coral_crown',   icon: '🪸', name: 'Coral Crown',    desc: '100 stars',   req: 100, type: 'stars',  unlockDesc: 'Royalty!' },
    { id: 'deep_diver',    icon: '🤿', name: 'Deep Diver',     desc: '7-day streak',req: 7,   type: 'streak', unlockDesc: 'Committed!' },
    { id: 'manta_ray',     icon: '🐡', name: 'Manta Ray',      desc: '14-day streak',req: 14, type: 'streak', unlockDesc: 'Unstoppable!' },
    { id: 'whale_song',    icon: '🐋', name: 'Whale Song',     desc: '30-day streak',req: 30, type: 'streak', unlockDesc: 'Legendary!' },
    { id: 'nautilus',      icon: '🐚', name: 'Nautilus',       desc: '5 pearl oysters', req: 5, type: 'pearls', unlockDesc: 'Collector!' },
  ],

  async render() {
    const section = document.getElementById('content-rewards');
    section.innerHTML = `<div class="page-loader"><div class="loader-ring"></div></div>`;

    let allLogs = [], habits = [], todayLogs = [];
    try {
      const today = (() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      })();

      [allLogs, habits, todayLogs] = await Promise.all([
        DB.logs.getAll(),
        DB.habits.getAll(),
        DB.logs.getForDate(today),
      ]);
    } catch (err) {
      section.innerHTML = `
        <div class="card" style="text-align:center;padding:40px;">
          <div style="font-size:36px;margin-bottom:12px;">⚠️</div>
          <h3>Couldn't load rewards</h3>
          <p style="color:var(--text-muted);font-size:13px;margin-top:6px;">${err.message || err}</p>
          <button class="btn btn-primary" onclick="PageRewards.render()" style="margin-top:16px;">Retry</button>
        </div>`;
      return;
    }

    const active      = habits.filter(h => h.isActive !== false);
    const starShellsToday = todayLogs.length;
    const pearlsToday     = todayLogs.length >= active.length && active.length > 0 ? 1 : 0;
    const totalStars  = allLogs.length;

    // Count pearls from history (days where all habits completed)
    const dateGroups = {};
    allLogs.forEach(l => {
      const dt = l.date || l.completed_at;
      if (!dateGroups[dt]) dateGroups[dt] = 0;
      dateGroups[dt]++;
    });
    const totalPearls = Object.values(dateGroups).filter(c => c >= active.length && active.length > 0).length;

    // Current streak (timezone-safe)
    const allDates = [...new Set(allLogs.map(l => l.date || l.completed_at))].sort().reverse();
    let streak = 0;
    const t = new Date();
    for (let i = 0; i < allDates.length; i++) {
      const exp = new Date(t);
      exp.setDate(t.getDate() - i);
      const y = exp.getFullYear();
      const mo = String(exp.getMonth() + 1).padStart(2, '0');
      const d = String(exp.getDate()).padStart(2, '0');
      const expStr = `${y}-${mo}-${d}`;
      if (allDates[i] === expStr) streak++;
      else if (i > 0) break;
    }

    section.innerHTML = `
      <!-- Hero Banner -->
      <div class="rewards-hero">
        <div class="rewards-hero-text">
          <span class="tag">✨ Rewards</span>
          <h2>Your Effort Deserves<br>Beautiful Rewards</h2>
          <p>Complete your habits and collect Star Shells and Pearl Oysters.<br>Small steps today, big treasures tomorrow.</p>
        </div>
        <div class="rewards-hero-oyster">🦪</div>
      </div>

      <!-- Counters -->
      <div class="reward-counters">
        <div class="reward-counter">
          <div class="reward-counter-icon">⭐</div>
          <div class="reward-counter-body">
            <h4>${totalStars}</h4>
            <p>Star Shells Earned</p>
            <span>Complete 1 task = 1 Star Shell</span>
            <div style="margin-top:10px;">
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Today: ${starShellsToday} / ${active.length}</div>
              <div class="progress-bar"><div class="progress-fill" style="width:${active.length?Math.round(starShellsToday/active.length*100):0}%"></div></div>
            </div>
          </div>
        </div>
        <div class="reward-counter">
          <div class="reward-counter-icon">🦪</div>
          <div class="reward-counter-body">
            <h4 style="color:var(--pearl)">${totalPearls}</h4>
            <p>Pearl Oysters Earned</p>
            <span>Complete all tasks = 1 Pearl Oyster</span>
            <div style="margin-top:10px;">
              ${pearlsToday ? '<span style="font-size:12px;color:var(--teal)">🎉 Earned today!</span>' : '<span style="font-size:12px;color:var(--text-muted)">Complete all habits to earn</span>'}
            </div>
          </div>
        </div>
      </div>

      <!-- Streak info -->
      <div class="card" style="margin-bottom:20px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
        <div style="flex:1;min-width:120px;text-align:center">
          <div style="font-size:32px;font-weight:700;font-family:'Playfair Display',serif;color:var(--teal)">🔥 ${streak}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Current Streak (days)</div>
        </div>
        <div style="flex:1;min-width:120px;text-align:center">
          <div style="font-size:32px;font-weight:700;font-family:'Playfair Display',serif;color:var(--gold)">${totalStars}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Total Stars</div>
        </div>
        <div style="flex:1;min-width:120px;text-align:center">
          <div style="font-size:32px;font-weight:700;font-family:'Playfair Display',serif;color:var(--pearl)">${totalPearls}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Total Pearls</div>
        </div>
        <div style="flex:3;min-width:200px">
          <div style="font-size:13px;font-weight:600;margin-bottom:8px">Progress to next badge</div>
          ${this.renderNextBadge(totalStars, streak)}
        </div>
      </div>

      <!-- Gallery -->
      <div class="reward-gallery">
        <h3 class="reward-gallery-title">🏆 Reward Gallery</h3>
        <div class="reward-gallery-grid">
          ${this.GALLERY.map(r => {
            let unlocked = false;
            if (r.type === 'task')   unlocked = totalStars >= 1;
            if (r.type === 'pearl')  unlocked = totalPearls >= 1;
            if (r.type === 'stars')  unlocked = totalStars >= r.req;
            if (r.type === 'streak') unlocked = streak >= r.req;
            if (r.type === 'pearls') unlocked = totalPearls >= r.req;

            return `
              <div class="reward-card ${unlocked ? 'unlocked' : 'locked'}">
                ${unlocked ? `<div class="unlock-badge">✓</div>` : ''}
                <span class="reward-card-icon">${r.icon}</span>
                <h5>${r.name}</h5>
                <span>${r.desc}</span>
                ${unlocked
                  ? `<div style="margin-top:8px;font-size:11px;color:var(--teal);font-weight:600">${r.unlockDesc}</div>`
                  : `<i class="fa-solid fa-lock lock-icon"></i>`
                }
              </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align:center;margin-top:36px;padding:16px;opacity:.45;">
        <p style="font-family:'Playfair Display',serif;font-style:italic;font-size:16px;color:var(--teal-light)">
          ~ Collect. Grow. Achieve. ~
        </p>
      </div>
    `;
  },

  renderNextBadge(totalStars, streak) {
    const next = this.GALLERY.find(r => {
      if (r.type === 'stars') return totalStars < r.req;
      if (r.type === 'streak') return streak < r.req;
      return false;
    });
    if (!next) return `<div style="color:var(--teal);font-size:13px">🏆 All badges unlocked! Amazing!</div>`;
    const curr = next.type === 'stars' ? totalStars : streak;
    const pct  = Math.round((curr / next.req) * 100);
    return `
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">
        Next: ${next.icon} ${next.name} — ${curr}/${next.req} ${next.type}
      </div>
      <div class="progress-bar" style="height:8px;">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${pct}% there</div>
    `;
  },
};
