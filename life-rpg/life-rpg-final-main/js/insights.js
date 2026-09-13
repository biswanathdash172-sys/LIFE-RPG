/* =========================================================
   Life RPG â€“ Insights Page (Chart.js)
   ========================================================= */
'use strict';

// Local-date helper (UTC-safe for UTC+5:30 and other positive offset zones)
function _insLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

window.PageInsights = {
  charts: {},

  async render() {
    const section = document.getElementById('content-insights');
    if (!section) return;

    // Destroy any existing Chart.js instances before replacing DOM
    this._destroyCharts();

    // Show skeleton while data loads
    section.innerHTML = `
      <div class="page-hero" style="margin-bottom:24px;">
        <p class="greeting">INSIGHTS</p>
        <h2 style="font-family:'Playfair Display',serif;font-size:32px;font-weight:700;">
          Your Progress Story <span style="color:var(--teal);font-weight:400">~</span>
        </h2>
        <p style="color:var(--text-secondary);font-size:13.5px;">Data-driven insights to help you grow faster.</p>
      </div>

      <!-- Summary Stats -->
      <div class="insight-stat-row" style="margin-bottom:20px;" role="region" aria-label="Summary statistics">
        <div class="insight-stat"><div class="val" id="ins-total-days">â‹¯</div><div class="lbl">Active Days</div></div>
        <div class="insight-stat"><div class="val" id="ins-avg-rate">â‹¯</div><div class="lbl">Avg Completion</div></div>
        <div class="insight-stat"><div class="val" id="ins-best-streak">â‹¯</div><div class="lbl">Best Streak</div></div>
        <div class="insight-stat"><div class="val" id="ins-total-stars">â‹¯</div><div class="lbl">Total Stars</div></div>
        <div class="insight-stat"><div class="val" id="ins-habits">â‹¯</div><div class="lbl">Total Habits</div></div>
      </div>

      <!-- Charts grid -->
      <div class="insights-grid" id="insights-chart-grid">
        <!-- Weekly completion chart -->
        <div class="insight-card wide">
          <h4>Weekly Completion Rate</h4>
          <div class="insight-sub">Last 12 weeks â€” percentage of habits completed each week</div>
          <div class="chart-wrap" style="height:220px">
            <canvas id="chart-weekly" role="img" aria-label="Line chart: weekly habit completion rate, last 12 weeks"></canvas>
          </div>
          <p class="sr-only" id="chart-weekly-summary"></p>
        </div>

        <!-- Daily completion (last 30d) -->
        <div class="insight-card">
          <h4>Daily Completions (Last 30 Days)</h4>
          <div class="insight-sub">How many habits you completed each day</div>
          <div class="chart-wrap" style="height:190px">
            <canvas id="chart-daily" role="img" aria-label="Bar chart: daily habit completions, last 30 days"></canvas>
          </div>
          <p class="sr-only" id="chart-daily-summary"></p>
        </div>

        <!-- Habit breakdown donut -->
        <div class="insight-card">
          <h4>Habit Completion Breakdown</h4>
          <div class="insight-sub">Overall completion share per habit</div>
          <div class="chart-wrap" style="height:190px">
            <canvas id="chart-donut" role="img" aria-label="Doughnut chart: each habit's share of total completions"></canvas>
          </div>
          <p class="sr-only" id="chart-donut-summary"></p>
        </div>

        <!-- Best habits leaderboard -->
        <div class="insight-card">
          <h4>ðŸ† Top Habits by Streak</h4>
          <div class="insight-sub">Your most consistent habits</div>
          <div id="habit-leaderboard" role="list" aria-label="Habit streak leaderboard"></div>
        </div>

        <!-- Streak history chart -->
        <div class="insight-card">
          <h4>Streak History</h4>
          <div class="insight-sub">Rolling 30-day habit activity</div>
          <div class="chart-wrap" style="height:190px">
            <canvas id="chart-streak" role="img" aria-label="Line chart: daily habit activity, last 30 days"></canvas>
          </div>
          <p class="sr-only" id="chart-streak-summary"></p>
        </div>
      </div>
    `;

    await this.loadData();
  },

  _destroyCharts() {
    Object.values(this.charts).forEach(c => { try { c?.destroy?.(); } catch (e) {} });
    this.charts = {};
  },

  async loadData() {
    let habits, allLogs;

    try {
      [habits, allLogs] = await Promise.all([
        DB.habits.getAll(),
        DB.logs.getAll(),
      ]);
    } catch (err) {
      // Error state with retry
      const grid = document.getElementById('insights-chart-grid');
      if (grid) {
        grid.innerHTML = `
          <div class="insight-card wide" style="text-align:center;padding:48px 20px;">
            <div style="font-size:40px;margin-bottom:12px;">âš ï¸</div>
            <h3 style="margin-bottom:8px;">Couldn't load your insights</h3>
            <p style="color:var(--text-muted);font-size:13px;margin-bottom:20px;">${err.message || 'Network error â€” please check your connection.'}</p>
            <button class="btn btn-primary" onclick="PageInsights.render()">
              <i class="fa-solid fa-rotate-right"></i> Retry
            </button>
          </div>`;
      }
      ['ins-total-days','ins-avg-rate','ins-best-streak','ins-total-stars','ins-habits'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = 'â€”';
      });
      return;
    }

    const today = new Date();

    // â”€â”€ Empty state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (!allLogs.length) {
      const grid = document.getElementById('insights-chart-grid');
      if (grid) {
        grid.innerHTML = `
          <div class="insight-card wide" style="text-align:center;padding:56px 20px;">
            <div style="font-size:52px;margin-bottom:16px;opacity:.5;">ðŸŒŠ</div>
            <h3 style="margin-bottom:10px;font-family:'Playfair Display',serif;">No data yet</h3>
            <p style="color:var(--text-muted);font-size:14px;max-width:320px;margin:0 auto 24px;">
              Complete your first habit task to start seeing insights here.
            </p>
            <button class="btn btn-primary" onclick="App.navigate('habits')">
              <i class="fa-solid fa-list-check"></i> Go to Habits
            </button>
          </div>`;
      }
      document.getElementById('ins-total-days').textContent    = '0';
      document.getElementById('ins-avg-rate').textContent      = '0%';
      document.getElementById('ins-best-streak').textContent   = '0d';
      document.getElementById('ins-total-stars').textContent   = '0';
      document.getElementById('ins-habits').textContent        = habits.length;
      return;
    }

    // â”€â”€ Summary stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const uniqueDays = [...new Set(allLogs.map(l => l.date || l.completed_at))].length;
    const totalStars = allLogs.length;
    const avgRate = habits.length && uniqueDays
      ? Math.min(100, Math.round(allLogs.length / (habits.length * Math.max(uniqueDays, 1)) * 100))
      : 0;

    let bestStreak = 0;
    habits.forEach(h => {
      const s = DB.stats.getLongestStreak(allLogs, h.id);
      if (s > bestStreak) bestStreak = s;
    });

    document.getElementById('ins-total-days').textContent  = uniqueDays;
    document.getElementById('ins-avg-rate').textContent    = avgRate + '%';
    document.getElementById('ins-best-streak').textContent = bestStreak + 'd';
    document.getElementById('ins-total-stars').textContent = totalStars;
    document.getElementById('ins-habits').textContent      = habits.length;

    // â”€â”€ Daily data (last 30 days) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const days = [], dailyCounts = [], labels = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = _insLocalDate(d);
      days.push(ds);
      dailyCounts.push(allLogs.filter(l => (l.date || l.completed_at) === ds).length);
      labels.push(i === 0 ? 'Today' : i === 1 ? 'Yday' : d.getDate() + '/' + (d.getMonth() + 1));
    }

    // â”€â”€ Weekly data (last 12 weeks, 7-day windows ending today) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const weekLabels = [], weekRates = [];
    for (let w = 11; w >= 0; w--) {
      // 7 contiguous days: oldest is today - w*7 - 6, newest is today - w*7
      const wDays = [];
      for (let d2 = 6; d2 >= 0; d2--) {
        const day = new Date(today);
        day.setDate(today.getDate() - w * 7 - d2);
        wDays.push(_insLocalDate(day));
      }
      const possible = wDays.length * Math.max(habits.length, 1);
      const done = allLogs.filter(l => wDays.includes(l.date || l.completed_at)).length;
      weekRates.push(possible ? Math.round((done / possible) * 100) : 0);
      weekLabels.push('W' + (12 - w));
    }

    // Accessible text summaries
    const avgWeekly = weekRates.length ? Math.round(weekRates.reduce((a,b) => a+b,0) / weekRates.length) : 0;
    const wPeak = Math.max(...weekRates);
    const wSummaryEl = document.getElementById('chart-weekly-summary');
    if (wSummaryEl) wSummaryEl.textContent = `Average weekly completion: ${avgWeekly}%. Peak: ${wPeak}% in ${weekLabels[weekRates.indexOf(wPeak)]}.`;

    const dailyTotal = dailyCounts.reduce((a,b) => a+b, 0);
    const dSummaryEl = document.getElementById('chart-daily-summary');
    if (dSummaryEl) dSummaryEl.textContent = `${dailyTotal} habit completions over the last 30 days. Best day: ${Math.max(...dailyCounts)}.`;

    // â”€â”€ Leaderboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const ranked = habits.map(h => ({
      ...h,
      streak:  DB.stats.getStreak(allLogs, h.id),
      longest: DB.stats.getLongestStreak(allLogs, h.id),
      rate:    DB.stats.getCompletionRate(allLogs, h.id, 30),
    })).sort((a, b) => b.streak - a.streak);

    const lb = document.getElementById('habit-leaderboard');
    if (lb) {
      lb.innerHTML = ranked.slice(0, 6).map((h, i) => `
        <div class="habit-rank" role="listitem">
          <div class="rank-num ${i === 0 ? 'gold-rank' : ''}" aria-label="Rank ${i+1}">${i + 1}</div>
          <div style="font-size:20px" aria-hidden="true">${h.icon}</div>
          <div class="rank-info">
            <strong>${h.name}</strong>
            <span>${h.rate}% in 30d Â· Best: ${h.longest}d</span>
          </div>
          <div class="rank-streak" aria-label="${h.streak} day streak">ðŸ”¥ ${h.streak}d</div>
        </div>`).join('') || '<p style="color:var(--text-muted);font-size:13px">No habits yet</p>';
    }

    // â”€â”€ Donut data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const habitCounts = habits.map(h =>
      allLogs.filter(l => (l.habitId || l.habit_id) === h.id).length
    );
    const maxCount = Math.max(...habitCounts, 0);
    const topHabit = maxCount > 0 ? habits[habitCounts.indexOf(maxCount)] : null;
    const dSummEl = document.getElementById('chart-donut-summary');
    if (dSummEl && topHabit) dSummEl.textContent = `Most completed habit: ${topHabit.name} with ${maxCount} completions.`;

    // â”€â”€ Streak activity last 30d â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const maxH = Math.max(habits.length, 1);
    const streakData = dailyCounts.map(c => Math.min(c, maxH));
    const activeDays = streakData.filter(v => v > 0).length;
    const sSummEl = document.getElementById('chart-streak-summary');
    if (sSummEl) sSummEl.textContent = `Active on ${activeDays} of the last 30 days.`;

    this.drawCharts({ labels, dailyCounts, weekLabels, weekRates, habits, habitCounts, streakData });
  },

  drawCharts({ labels, dailyCounts, weekLabels, weekRates, habits, habitCounts, streakData }) {
    if (typeof Chart === 'undefined') return;

    this._destroyCharts();

    const defaults = {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: 'rgba(255,255,255,.6)', font: { size: 11 } } } },
    };

    const gridColor = 'rgba(255,255,255,.06)';
    const tickColor = 'rgba(255,255,255,.45)';

    const axes = {
      x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } }, border: { color: 'transparent' } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } }, border: { color: 'transparent' } },
    };

    // Weekly line chart
    const cw = document.getElementById('chart-weekly');
    if (cw) {
      this.charts.weekly = new Chart(cw.getContext('2d'), {
        type: 'line',
        data: {
          labels: weekLabels,
          datasets: [{
            label: 'Completion %', data: weekRates,
            borderColor: '#00d4c8', backgroundColor: 'rgba(0,212,200,.1)',
            tension: .4, fill: true, pointBackgroundColor: '#00d4c8',
            pointRadius: 4, pointHoverRadius: 7,
          }],
        },
        options: { ...defaults, scales: { ...axes, y: { ...axes.y, min: 0, max: 100 } } },
      });
    }

    // Daily bar chart
    const cd = document.getElementById('chart-daily');
    if (cd) {
      this.charts.daily = new Chart(cd.getContext('2d'), {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Habits done',
            data: dailyCounts,
            backgroundColor: (ctx) => {
              const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
              g.addColorStop(0, 'rgba(0,212,200,.8)');
              g.addColorStop(1, 'rgba(0,143,135,.2)');
              return g;
            },
            borderRadius: 5, borderSkipped: false,
          }],
        },
        options: {
          ...defaults,
          scales: {
            ...axes,
            x: { ...axes.x, ticks: { ...axes.x.ticks, maxTicksLimit: 10 } },
          },
          plugins: { ...defaults.plugins, legend: { display: false } },
        },
      });
    }

    // Donut
    const donut = document.getElementById('chart-donut');
    if (donut && habits.length && habitCounts.some(c => c > 0)) {
      const colors = ['#00d4c8','#f4c430','#7c3aed','#dc2626','#16a34a','#1d4ed8','#be185d','#d97706'];
      this.charts.donut = new Chart(donut.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: habits.map(h => h.icon + ' ' + h.name),
          datasets: [{
            data: habitCounts,
            backgroundColor: habits.map((_, i) => colors[i % colors.length] + 'cc'),
            borderColor: habits.map((_, i) => colors[i % colors.length]),
            borderWidth: 2,
            hoverOffset: 8,
          }],
        },
        options: {
          ...defaults, cutout: '60%',
          plugins: {
            legend: { position: 'right', labels: { color: 'rgba(255,255,255,.6)', font: { size: 10 }, boxWidth: 10, padding: 8 } },
          },
        },
      });
    }

    // Streak activity
    const cs = document.getElementById('chart-streak');
    if (cs) {
      this.charts.streak = new Chart(cs.getContext('2d'), {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Activity', data: streakData,
            borderColor: '#f4c430', backgroundColor: 'rgba(244,196,48,.08)',
            tension: .3, fill: true, pointRadius: 0, pointHoverRadius: 5,
            pointHoverBackgroundColor: '#f4c430',
          }],
        },
        options: {
          ...defaults, scales: { ...axes, y: { ...axes.y, min: 0 } },
          plugins: { ...defaults.plugins, legend: { display: false } },
        },
      });
    }
  },
};
