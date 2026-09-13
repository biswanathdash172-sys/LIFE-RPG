/* =========================================================
   Life RPG – Calendar Page
   ========================================================= */
'use strict';

// Local-date helper — avoids UTC off-by-one for timezones ahead of UTC
function toLocalDateString(date) {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

window.PageCalendar = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  selectedDate: null,

  async render() {
    const section = document.getElementById('content-calendar');
    section.innerHTML = `
      <div class="page-hero" style="margin-bottom:20px;">
        <p class="greeting">CALENDAR</p>
        <h2 style="font-family:'Playfair Display',serif;font-size:32px;font-weight:700;">
          Your Journey <span style="color:var(--teal);font-weight:400">~</span>
        </h2>
        <p style="color:var(--text-secondary);font-size:13.5px;">Track your daily achievements across time.</p>
      </div>
      <div id="full-calendar-wrap"></div>
      <div id="cal-detail-wrap"></div>
    `;
    await this.renderCalendar();
  },

  async renderCalendar() {
    const wrap   = document.getElementById('full-calendar-wrap');
    if (!wrap) return;
    const habits = await DB.habits.getAll();
    const logs   = await DB.logs.getForMonth(this.year, this.month + 1);
    const today  = toLocalDateString(new Date());

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const firstDay   = new Date(this.year, this.month, 1).getDay();
    const daysIn     = new Date(this.year, this.month + 1, 0).getDate();
    const prevDays   = new Date(this.year, this.month, 0).getDate();
    const activeH    = habits.filter(h => h.isActive !== false);

    let cells = '';
    // Prev month overflow
    for (let i = firstDay - 1; i >= 0; i--) {
      cells += `<div class="full-cal-day other-month"><div class="day-num">${prevDays - i}</div></div>`;
    }
    // Current month
    for (let d = 1; d <= daysIn; d++) {
      const ds = `${this.year}-${String(this.month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayLogs = logs.filter(l => (l.date || l.completed_at) === ds);
      const pct = activeH.length ? dayLogs.length / activeH.length : 0;
      const pctW = Math.round(pct * 100);
      const isToday   = ds === today;
      const isFuture  = ds > today;
      const isSel     = ds === this.selectedDate;
      cells += `
        <div class="full-cal-day${isToday ? ' today' : ''}${isSel ? ' today' : ''}"
             style="${isFuture ? 'opacity:.4;pointer-events:none' : ''}"
             onclick="PageCalendar.selectDay('${ds}')">
          <div class="day-num">${d}</div>
          <div class="day-dots">
            ${dayLogs.slice(0,4).map(l => {
              const h = habits.find(x => x.id === (l.habitId || l.habit_id));
              return `<div class="day-dot done" title="${h?.name||''}" style="background:${h?.color||'var(--teal)'}"></div>`;
            }).join('')}
            ${dayLogs.length > 4 ? `<div class="day-dot" style="background:rgba(255,255,255,.3);font-size:8px;display:flex;align-items:center;justify-content:center;color:#fff">+${dayLogs.length-4}</div>` : ''}
          </div>
          <div class="day-completion-bar">
            <div class="day-completion-fill ${pct>=1?'full-day-fill':''}" style="width:${pctW}%"></div>
          </div>
        </div>`;
    }
    // Next month overflow
    const remaining = (7 - ((firstDay + daysIn) % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      cells += `<div class="full-cal-day other-month"><div class="day-num">${d}</div></div>`;
    }

    wrap.innerHTML = `
      <div class="card" style="margin-bottom:16px;">
        <div class="full-cal-header">
          <h3>${monthNames[this.month]} ${this.year}</h3>
          <div class="cal-nav-btns">
            <button onclick="PageCalendar.prevMonth()"><i class="fa-solid fa-chevron-left"></i></button>
            <button class="today-btn" onclick="PageCalendar.goToday()">Today</button>
            <button onclick="PageCalendar.nextMonth()"><i class="fa-solid fa-chevron-right"></i></button>
          </div>
        </div>

        <!-- Completion summary bar -->
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
          ${activeH.map(h => {
            const count = logs.filter(l => (l.habitId||l.habit_id) === h.id).length;
            return `<div style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-secondary);">
              <span style="width:8px;height:8px;border-radius:50%;background:${h.color||'var(--teal)'};display:inline-block;flex-shrink:0"></span>
              ${h.icon} ${h.name} <span style="color:var(--teal);font-weight:600">${count}d</span>
            </div>`;
          }).join('')}
        </div>

        <div class="full-cal-dow">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>
        <div class="full-cal-grid">${cells}</div>

        <div style="margin-top:14px;display:flex;gap:16px;font-size:12px;color:var(--text-muted);flex-wrap:wrap;">
          <span style="display:flex;gap:5px;align-items:center">
            <span style="width:12px;height:4px;border-radius:2px;background:linear-gradient(90deg,var(--teal-dark),var(--teal));display:inline-block"></span>
            Partial completion
          </span>
          <span style="display:flex;gap:5px;align-items:center">
            <span style="width:12px;height:4px;border-radius:2px;background:linear-gradient(90deg,#d4a017,var(--gold));display:inline-block"></span>
            Full day! ⭐
          </span>
          <span style="display:flex;gap:5px;align-items:center">
            <span style="width:10px;height:10px;border-radius:2px;background:linear-gradient(135deg,var(--teal-dark),var(--teal));display:inline-block"></span>
            Today
          </span>
        </div>
      </div>
    `;

    if (this.selectedDate) await this.renderDayDetail(this.selectedDate, habits, logs);
  },

  async selectDay(date) {
    this.selectedDate = date;
    const habits = await DB.habits.getAll();
    const logs   = await DB.logs.getForMonth(this.year, this.month + 1);
    await this.renderDayDetail(date, habits, logs);

    // Highlight selected
    document.querySelectorAll('.full-cal-day').forEach(d => d.style.outline = '');
    event.currentTarget.style.outline = '2px solid var(--teal)';
  },

  async renderDayDetail(date, habits, logs) {
    const wrap = document.getElementById('cal-detail-wrap');
    if (!wrap) return;
    const dayLogs = logs.filter(l => (l.date || l.completed_at) === date);
    const completedIds = new Set(dayLogs.map(l => l.habitId || l.habit_id));
    const d = new Date(date + 'T00:00:00');
    const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
    const label = d.toLocaleDateString('en-US', opts);
    const total  = habits.filter(h => h.isActive !== false).length;
    const done   = dayLogs.length;

    wrap.innerHTML = `
      <div class="cal-day-detail">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
          <h4>${label}</h4>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:13px;color:var(--text-muted)">${done}/${total} completed</span>
            <div style="width:80px">
              <div class="progress-bar"><div class="progress-fill" style="width:${total?Math.round(done/total*100):0}%"></div></div>
            </div>
            ${done >= total && total > 0 ? '<span style="font-size:20px">🌟</span>' : ''}
          </div>
        </div>
        ${habits.filter(h => h.isActive !== false).map(h => {
          const isDone = completedIds.has(h.id);
          return `
            <div class="cal-detail-habit">
              <div class="habit-row-icon" style="font-size:16px;width:32px;height:32px">${h.icon}</div>
              <div style="flex:1">
                <strong style="font-size:13.5px">${h.name}</strong>
                <div style="font-size:11.5px;color:var(--text-muted)">${h.description||h.frequency}</div>
              </div>
              <div class="cal-detail-check ${isDone?'done':'miss'}">
                <i class="fa-solid ${isDone?'fa-check':'fa-xmark'}"></i>
              </div>
              <span style="font-size:12px;color:${isDone?'var(--teal)':'var(--text-muted)'};margin-left:6px">
                ${isDone?'Done':'Missed'}
              </span>
            </div>`;
        }).join('')}
        ${habits.filter(h=>h.isActive!==false).length===0 ? '<p style="color:var(--text-muted);font-size:13px">No habits set up yet.</p>' : ''}
      </div>
    `;
  },

  prevMonth() {
    if (this.month === 0) { this.month = 11; this.year--; }
    else this.month--;
    this.selectedDate = null;
    this.renderCalendar();
  },
  nextMonth() {
    if (this.month === 11) { this.month = 0; this.year++; }
    else this.month++;
    this.selectedDate = null;
    this.renderCalendar();
  },
  goToday() {
    const now = new Date();
    this.year  = now.getFullYear();
    this.month = now.getMonth();
    this.selectedDate = toLocalDateString(now);
    this.renderCalendar();
  },
};
