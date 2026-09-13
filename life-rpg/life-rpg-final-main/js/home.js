/* =========================================================
   Life RPG – Home / Dashboard Page
   ========================================================= */
'use strict';

// Local-date helper — avoids UTC off-by-one for timezones ahead of UTC
function toLocalDateString(date) {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

window.PageHome = {
  _currentLevel: 1,
  quotes: [
    '"Discipline today builds the freedom tomorrow."',
    '"Small steps every day lead to big results."',
    '"A habit is the bridge between goals and accomplishment."',
    '"Success is the sum of small efforts repeated daily."',
    '"Build the life you want, one habit at a time."',
    '"Every expert was once a beginner who kept going."',
    '"Your habits will determine your future."',
  ],

  async render() {
    const content = document.getElementById('content-home');
    content.innerHTML = `<div class="page-loader"><div class="loader-ring"></div></div>`;

    const user   = await DB.auth.getUser();
    const habits = await DB.habits.getAll();
    const today  = toLocalDateString(new Date());
    const logs   = await DB.logs.getForDate(today);
    const allLogs = window.LS ? window.LS.get('logs', []) : [];

    const activeHabits = habits.filter(h => h.isActive !== false);
    const completedToday = logs.length;
    const totalToday = activeHabits.length;

    // Streaks
    const allLogsData = JSON.parse(localStorage.getItem('hf_logs') || '[]');
    const overallStreak = await DB.stats.getOverallCurrentStreak();
    const longestStreak = this._getLongestOverall(allLogsData);
    const totalStars = allLogsData.length;
    const totalPearls = Math.floor(totalStars / Math.max(totalToday, 1));

    // RPG Progression & Attributes
    const profile = await DB.profile.get();
    const currentXp = profile?.xp ?? user?.xp ?? 0;
    const currentLevel = (typeof levelFromXp === 'function' ? levelFromXp(currentXp) : (DB.levelFromXp ? DB.levelFromXp(currentXp) : Math.floor(Math.sqrt(currentXp / 50)) + 1));
    this._currentLevel = currentLevel;
    const xpForCurrent = (typeof xpForLevel === 'function' ? xpForLevel(currentLevel) : (DB.xpForLevel ? DB.xpForLevel(currentLevel) : Math.pow(currentLevel - 1, 2) * 50));
    const xpForNext = (typeof xpForLevel === 'function' ? xpForLevel(currentLevel + 1) : (DB.xpForLevel ? DB.xpForLevel(currentLevel + 1) : Math.pow(currentLevel, 2) * 50));
    const xpIntoLevel = Math.max(0, currentXp - xpForCurrent);
    const xpNeededForLevel = Math.max(1, xpForNext - xpForCurrent);
    const xpProgressPct = Math.min(100, Math.max(0, Math.round((xpIntoLevel / xpNeededForLevel) * 100)));

    const intellectVal = profile?.attr_intellect ?? profile?.intellect ?? user?.attr_intellect ?? user?.intellect ?? 0;
    const strengthVal = profile?.attr_strength ?? profile?.strength ?? user?.attr_strength ?? user?.strength ?? 0;
    const disciplineVal = profile?.attr_discipline ?? profile?.discipline ?? user?.attr_discipline ?? user?.discipline ?? 0;
    const creativityVal = profile?.attr_creativity ?? profile?.creativity ?? user?.attr_creativity ?? user?.creativity ?? 0;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const name = user?.fullName || user?.full_name || user?.email?.split('@')[0] || 'Explorer';
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const now = new Date();
    const dateStr = `${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    const quote = this.quotes[now.getDate() % this.quotes.length];

    content.innerHTML = `
      <!-- Hero -->
      <div class="page-hero" style="display:grid;grid-template-columns:1fr auto;gap:16px;align-items:start;margin-bottom:20px;">
        <div>
          <p class="greeting" style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">${greeting},</p>
          <h2 style="font-family:'Playfair Display',serif;font-size:34px;font-weight:700;line-height:1.1;">
            ${name} <span style="color:var(--teal);font-weight:400">~</span>
          </h2>
          <p style="font-size:13.5px;color:var(--text-secondary);margin-top:6px;">
            One habit at a time, you're building a better you.
          </p>
        </div>
        <div class="date-strip">
          <div class="date-today">${dateStr}</div>
          <div class="daily-quote">${quote}</div>
        </div>
      </div>

      <!-- XP Progression Card -->
      <div class="xp-progression-card card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="level-badge" style="background:linear-gradient(135deg,var(--teal-dark),var(--teal));color:#060e1a;font-weight:700;font-size:13px;padding:4px 12px;border-radius:20px;font-family:var(--font-heading);">
              Level ${currentLevel}
            </span>
            <strong style="font-size:15px;color:var(--text-primary);">Life RPG Progression</strong>
          </div>
          <div style="font-size:13px;color:var(--text-secondary);font-weight:600;">
            ${currentXp} / ${xpForNext} XP
          </div>
        </div>
        <div class="xp-bar-track">
          <div class="xp-bar-fill" style="width:${xpProgressPct}%;"></div>
        </div>
      </div>

      <!-- Attributes Row -->
      <div class="home-row home-row-attributes"></div>

      <!-- Reward Banners -->
      <div class="home-row home-row-top" style="margin-bottom:16px;">
        <div class="reward-banner">
          <div class="reward-banner-icon">⭐</div>
          <div class="reward-banner-body">
            <h4>Today's Reward</h4>
            <p>Complete 1 Task<br>= 1 Star Shell</p>
            <span>Small steps. Big treasures.</span>
          </div>
        </div>
        <div class="reward-banner" style="border-color:rgba(232,213,196,.15)">
          <div class="reward-banner-icon">🦪</div>
          <div class="reward-banner-body">
            <h4>All Tasks Completed</h4>
            <p>= 1 Pearl Oyster</p>
            <span>A symbol of your dedication and growth.</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;min-width:220px;">
          <div class="card card-sm" style="flex:1">
            <div class="card-title">⭐ Star Shells Today</div>
            <div id="home-stars-today" style="font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--gold);">
              ${completedToday}<span style="font-size:16px;color:var(--text-muted);font-family:'Inter',sans-serif;">/${totalToday}</span>
            </div>
          </div>
          <div class="card card-sm" style="flex:1">
            <div class="card-title">🦪 Pearl Oysters</div>
            <div id="home-pearl-oysters" style="font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--pearl);">
              ${completedToday >= totalToday && totalToday > 0 ? '1' : '0'}
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="home-row home-row-stats" style="margin-bottom:16px;">
        <div class="stat-card">
          <div class="stat-icon teal"><i class="fa-solid fa-fire"></i></div>
          <div class="stat-label">Current Streak</div>
          <div class="stat-value">${overallStreak} <span style="font-size:14px;color:var(--text-muted);font-family:'Inter'">days</span></div>
          <div class="stat-sub">🔥 Keep it going!</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon gold"><i class="fa-solid fa-trophy"></i></div>
          <div class="stat-label">Longest Streak</div>
          <div class="stat-value">${longestStreak} <span style="font-size:14px;color:var(--text-muted);font-family:'Inter'">days</span></div>
          <div class="stat-sub">Your personal best</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon teal"><i class="fa-solid fa-check-circle"></i></div>
          <div class="stat-label">Today's Progress</div>
          <div class="stat-value">${completedToday}/${totalToday}</div>
          <div class="stat-sub" style="margin-top:6px;">
            <div class="progress-bar"><div class="progress-fill" style="width:${totalToday ? Math.round(completedToday/totalToday*100) : 0}%"></div></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon gold"><i class="fa-solid fa-star"></i></div>
          <div class="stat-label">Total Stars Earned</div>
          <div class="stat-value" id="home-total-stars" style="color:var(--gold)">${totalStars}</div>
          <div class="stat-sub">All time ⭐</div>
        </div>
      </div>

      <!-- Today's Habits + Mini Calendar -->
      <div class="home-row home-row-bottom">
        <div class="card">
          <div class="section-head">
            <h3>Today's Habits
              <span style="font-size:13px;color:var(--text-muted);font-weight:400;margin-left:8px;">${completedToday}/${totalToday} Completed</span>
            </h3>
            <a class="section-link" onclick="App.navigate('habits')">
              View All <i class="fa-solid fa-arrow-right"></i>
            </a>
          </div>
          <div class="habit-cards-grid" id="today-habits-grid">
            ${activeHabits.length === 0
              ? `<div class="empty-state"><div class="empty-icon">🌊</div><p>No habits yet.<br>Add your first habit!</p></div>`
              : activeHabits.map(h => {
                  const done = logs.some(l => (l.habitId || l.habit_id) === h.id);
                  return `
                    <div class="habit-card-sm ${done ? 'completed' : ''}" onclick="PageHome.toggleHabit('${h.id}','${today}',this)" data-id="${h.id}">
                      <div class="habit-icon-wrap">${h.icon}</div>
                      <div class="habit-name">${h.name}</div>
                      <div class="habit-meta">${h.description || h.reminderTime || ''}</div>
                      <div class="habit-check"><i class="fa-solid fa-check"></i></div>
                    </div>`;
                }).join('')
            }
          </div>
        </div>
        <div class="card" id="mini-calendar-wrap">
          <!-- mini calendar rendered below -->
        </div>
      </div>

      <!-- Ocean tagline -->
      <div style="text-align:center;margin-top:28px;padding:20px;opacity:.45;">
        <p style="font-family:'Playfair Display',serif;font-style:italic;font-size:18px;color:var(--teal-light);">
          Small Steps Create Big Waves 🌊
        </p>
      </div>
    `;

    // Render mini calendar
    this.renderMiniCal(now.getFullYear(), now.getMonth());
  },

  async toggleHabit(habitId, date, el) {
    const card = el.closest ? (el.closest('.habit-card-sm') || el) : el;
    const wasCompleted = card.classList.contains('completed');
    const willBeCompleted = !wasCompleted;

    // Optimistic UI update immediately
    if (willBeCompleted) {
      card.classList.add('completed');
    } else {
      card.classList.remove('completed');
    }

    try {
      // Find habit to get attribute
      const habits = await DB.habits.getAll();
      const habit = habits.find(h => h.id === habitId);
      const attribute = habit ? (habit.attribute || null) : null;

      // Run DB log toggle
      const completed = await DB.logs.toggle(habitId, date);

      // Award or deduct XP alongside completion state
      const xpAmount = completed ? 10 : -10;
      const xpResult = await DB.stats.awardXp(xpAmount, attribute);

      if (completed) {
        card.classList.add('completed');
        App.toast('Habit completed! ⭐ +1 Star Shell', 'success');
      } else {
        card.classList.remove('completed');
        App.toast('Habit marked incomplete', 'warning');
      }

      // Check for Level Up
      if (xpResult && typeof xpResult.new_level === 'number') {
        const prevLevel = PageHome._currentLevel || 1;
        if (xpResult.new_level > prevLevel) {
          PageHome._currentLevel = xpResult.new_level;
          PageHome.triggerLevelUp(xpResult.new_level);
        } else {
          PageHome._currentLevel = xpResult.new_level;
        }
      }

      // Re-count stats
      const logs = await DB.logs.getForDate(date);
      const active = habits.filter(h => h.isActive !== false);
      const completed_count = logs.length;
      document.querySelectorAll('.stat-value').forEach(statEl => {
        if (statEl.textContent.includes('/')) {
          statEl.innerHTML = `${completed_count}/${active.length}`;
        }
      });

      // Recalculate total stars and sync gold
      const { totalStars } = await DB.rewards.calculate();
      const newGold = await DB.stats.syncGold(totalStars);

      // Update stat and gold displays
      const starCard = document.getElementById('home-total-stars');
      if (starCard) {
        starCard.textContent = totalStars;
      }
      const starsTodayEl = document.getElementById('home-stars-today');
      if (starsTodayEl) {
        starsTodayEl.innerHTML = `${completed_count}<span style="font-size:16px;color:var(--text-muted);font-family:'Inter',sans-serif;">/${active.length}</span>`;
      }
      const pearlsEl = document.getElementById('home-pearl-oysters');
      if (pearlsEl) {
        pearlsEl.textContent = (completed_count >= active.length && active.length > 0) ? '1' : '0';
      }
      const shopGold = document.getElementById('shop-gold-display');
      if (shopGold) {
        shopGold.textContent = `${newGold} Gold`;
      }
      const goldDisplay = document.getElementById('user-gold-display');
      if (goldDisplay) {
        goldDisplay.textContent = newGold;
      }
    } catch (err) {
      // Revert visual state on error
      if (wasCompleted) {
        card.classList.add('completed');
      } else {
        card.classList.remove('completed');
      }
      App.toast('Error updating habit: ' + (err.message || err), 'error');
    }
  },

  triggerLevelUp(newLevel) {
    App.toast(`Level Up! You reached Level ${newLevel}! 🎉`, 'success', 4500);

    // Create celebration particle burst
    const container = document.createElement('div');
    container.className = 'levelup-burst-container';

    // Spawn 35 colorful glowing celebration particles
    const colors = ['#00d4c8', '#4de8e0', '#f4c430', '#ffffff', '#e8d5c4', '#00b4d8'];
    const count = 35;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'levelup-particle';
      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.4 - 0.2);
      const distance = 120 + Math.random() * 260;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance - 40;
      const size = 6 + Math.random() * 10;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const rot = (Math.random() - 0.5) * 720;
      const isSquare = Math.random() > 0.5;

      p.style.setProperty('--tx', `${tx}px`);
      p.style.setProperty('--ty', `${ty}px`);
      p.style.setProperty('--size', `${size}px`);
      p.style.setProperty('--color', color);
      p.style.setProperty('--rot', `${rot}deg`);
      p.style.setProperty('--radius', isSquare ? '2px' : '50%');
      p.style.animationDelay = `${Math.random() * 0.15}s`;

      container.appendChild(p);
    }

    document.body.appendChild(container);

    // Clean up DOM after animation completes (non-accumulating)
    setTimeout(() => {
      container.remove();
    }, 2200);

    // Re-render home to update level badge and XP bar
    setTimeout(() => {
      this.render();
    }, 400);
  },

  async renderMiniCal(year, month) {
    const wrap = document.getElementById('mini-calendar-wrap');
    if (!wrap) return;
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const logs = await DB.logs.getForMonth(year, month + 1);
    const logDates = new Set(logs.map(l => l.date || l.completed_at));
    const habits   = (await DB.habits.getAll()).filter(h => h.isActive !== false);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = toLocalDateString(new Date());

    let cells = '';
    for (let i = 0; i < firstDay; i++) cells += `<div class="cal-day other-month"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayLogs = logs.filter(l => (l.date || l.completed_at) === ds);
      const pct = habits.length ? dayLogs.length / habits.length : 0;
      const isToday = ds === today;
      const hasDots = dayLogs.length > 0;
      const isFull  = pct >= 1;
      cells += `<div class="cal-day${isToday ? ' today' : ''}${hasDots && !isToday ? ' has-completions' : ''}${isFull && !isToday ? ' full-day' : ''}">${d}</div>`;
    }

    wrap.innerHTML = `
      <div class="mini-cal">
        <div class="mini-cal-header">
          <h4>${monthNames[month]} ${year}</h4>
          <div class="mini-cal-nav">
            <button onclick="PageHome.renderMiniCal(${month===0?year-1:year},${month===0?11:month-1})"><i class="fa-solid fa-chevron-left"></i></button>
            <button onclick="PageHome.renderMiniCal(${month===11?year+1:year},${month===11?0:month+1})"><i class="fa-solid fa-chevron-right"></i></button>
          </div>
        </div>
        <div class="cal-dow">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>
        <div class="cal-grid">${cells}</div>
        <div style="margin-top:12px;display:flex;gap:10px;font-size:11px;color:var(--text-muted);">
          <span style="display:flex;gap:4px;align-items:center;"><span style="width:8px;height:8px;border-radius:50%;background:var(--teal);display:inline-block"></span>Partial</span>
          <span style="display:flex;gap:4px;align-items:center;"><span style="width:8px;height:8px;border-radius:50%;background:var(--gold);display:inline-block"></span>Full Day</span>
        </div>
      </div>`;
  },

  _getLongestOverall(logs) {
    const dates = [...new Set(logs.map(l => l.date))].sort();
    if (!dates.length) return 0;
    let max = 1, cur = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i]) - new Date(dates[i-1])) / 86400000;
      cur = diff === 1 ? cur + 1 : 1;
      if (cur > max) max = cur;
    }
    return max;
  },
};
