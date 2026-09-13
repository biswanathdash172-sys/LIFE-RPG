/* =========================================================
   Life RPG – My Habits Page
   ========================================================= */
'use strict';

// Local-date helper — avoids UTC off-by-one for timezones ahead of UTC
function toLocalDateString(date) {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

window.PageHabits = {
  filter: 'all',
  editingId: null,
  selectedIcon: '💧',

  ICONS: ['💧','🧘','🏋️','📖','🥗','🌙','🧠','🏃','🚴','🎯','💊','✍️','🎸','🌿','☕','🧹','💤','🎨','🏊','🧗','🥤','🧘‍♀️','🌅','📝','🎵','🧺','🛁','🌱','🍎','🧡'],

  async render() {
    const section = document.getElementById('content-habits');
    section.innerHTML = `<div class="page-loader"><div class="loader-ring"></div></div>`;

    const habits  = await DB.habits.getAll();
    const allLogs = JSON.parse(localStorage.getItem('hf_logs') || '[]');

    section.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:12px;">
        <div class="page-hero" style="margin-bottom:0">
          <p class="greeting">MY HABITS</p>
          <h2 style="font-family:'Playfair Display',serif;font-size:32px;font-weight:700;">
            Build Your Best Self <span style="color:var(--teal);font-weight:400">~</span>
          </h2>
          <p style="color:var(--text-secondary);font-size:13.5px;">Small habits. Big results.</p>
        </div>
        <button class="btn btn-primary" onclick="PageHabits.openAddModal()">
          <i class="fa-solid fa-plus"></i> Add New Habit
        </button>
      </div>

      <!-- Filter Tabs -->
      <div class="habit-filters" style="margin-bottom:16px;">
        <button class="filter-tab ${this.filter==='all'?'active':''}" onclick="PageHabits.setFilter('all')">
          All (${habits.length})
        </button>
        <button class="filter-tab ${this.filter==='daily'?'active':''}" onclick="PageHabits.setFilter('daily')">
          Daily (${habits.filter(h=>h.frequency==='daily').length})
        </button>
        <button class="filter-tab ${this.filter==='weekly'?'active':''}" onclick="PageHabits.setFilter('weekly')">
          Weekly (${habits.filter(h=>h.frequency==='weekly').length})
        </button>
        <button class="filter-tab ${this.filter==='monthly'?'active':''}" onclick="PageHabits.setFilter('monthly')">
          Monthly (${habits.filter(h=>h.frequency==='monthly').length})
        </button>
      </div>

      <!-- Habits Table -->
      <div class="habits-table-wrap scroll-x">
        <table class="habits-table" id="habits-table">
          <thead>
            <tr>
              <th>Habit</th>
              <th>Frequency</th>
              <th>Streak</th>
              <th>Progress (30d)</th>
              <th>Reward</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="habits-tbody">
            ${this.renderRows(habits, allLogs)}
          </tbody>
        </table>
      </div>

      <!-- Add/Edit Modal -->
      <div class="modal-overlay" id="habit-modal">
        <div class="modal">
          <div class="modal-header">
            <h3 id="modal-title">Add New Habit</h3>
            <button class="modal-close" onclick="PageHabits.closeModal()"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            <!-- Icon Picker -->
            <div class="form-group">
              <label>Choose Icon</label>
              <div class="icon-picker" id="icon-picker">
                ${this.ICONS.map(ic => `<div class="icon-option${ic===this.selectedIcon?' selected':''}" onclick="PageHabits.selectIcon('${ic}',this)">${ic}</div>`).join('')}
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Habit Name <span style="color:#ff8080">*</span></label>
                <input type="text" class="form-control" id="habit-name" placeholder="e.g. Drink Water" maxlength="40">
              </div>
              <div class="form-group">
                <label>Frequency</label>
                <select class="form-control" id="habit-frequency">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Description / Target</label>
                <input type="text" class="form-control" id="habit-desc" placeholder="e.g. 8 glasses" maxlength="50">
              </div>
              <div class="form-group">
                <label>Reminder Time</label>
                <input type="time" class="form-control" id="habit-time">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="PageHabits.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="PageHabits.saveHabit()">
              <i class="fa-solid fa-check"></i> <span id="save-btn-text">Add Habit</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Delete Confirm Modal -->
      <div class="modal-overlay" id="delete-modal">
        <div class="modal" style="max-width:380px">
          <div class="modal-header">
            <h3>Delete Habit</h3>
            <button class="modal-close" onclick="document.getElementById('delete-modal').classList.remove('open')"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            <p style="color:var(--text-secondary);font-size:14px;line-height:1.6;">
              Are you sure you want to delete <strong id="delete-habit-name" style="color:var(--text-primary)"></strong>?
              This will also remove all its history and cannot be undone.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="document.getElementById('delete-modal').classList.remove('open')">Cancel</button>
            <button class="btn btn-danger" id="confirm-delete-btn"><i class="fa-solid fa-trash"></i> Delete</button>
          </div>
        </div>
      </div>
    `;
  },

  renderRows(habits, allLogs) {
    const filtered = this.filter === 'all' ? habits : habits.filter(h => h.frequency === this.filter);
    if (!filtered.length) return `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="empty-icon">🌊</div>
          <h4>No habits yet</h4>
          <p>Start building your routine</p>
          <button class="btn btn-primary" onclick="PageHabits.openAddModal()"><i class="fa-solid fa-plus"></i> Add First Habit</button>
        </div>
      </td></tr>`;

    return filtered.map(h => {
      const streak  = DB.stats.getStreak(allLogs, h.id);
      const longest = DB.stats.getLongestStreak(allLogs, h.id);
      const rate    = DB.stats.getCompletionRate(allLogs, h.id, 30);
      const today   = toLocalDateString(new Date());
      const todayLogs = allLogs.filter(l => l.habitId === h.id && l.date === today);
      const done    = todayLogs.length > 0;
      return `
        <tr>
          <td>
            <div class="habit-row-icon-name">
              <div class="habit-row-icon">${h.icon}</div>
              <div class="habit-row-name">
                <strong>${h.name}</strong>
                <span>${h.description || ''}${h.reminderTime ? ' · ' + h.reminderTime : ''}</span>
              </div>
            </div>
          </td>
          <td style="color:var(--text-secondary);font-size:13px;text-transform:capitalize">${h.frequency}</td>
          <td>
            <div class="streak-badge">🔥 ${streak} days</div>
          </td>
          <td class="progress-cell">
            <div class="progress-meta">
              <span>${rate}%</span>
              <span style="font-size:11px">${allLogs.filter(l=>l.habitId===h.id).length}/30d</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${rate}%"></div></div>
          </td>
          <td>
            <div class="reward-star">⭐ +1</div>
          </td>
          <td>
            <label class="toggle" title="${h.isActive!==false?'Active':'Paused'}">
              <input type="checkbox" ${h.isActive!==false?'checked':''} onchange="PageHabits.toggleActive('${h.id}',this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </td>
          <td>
            <div class="row-actions">
              <button class="btn btn-ghost btn-icon btn-sm" title="Edit" onclick="PageHabits.openEditModal('${h.id}')">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn btn-danger btn-icon btn-sm" title="Delete" onclick="PageHabits.confirmDelete('${h.id}','${h.name.replace(/'/g,"\\'")}')">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  },

  async setFilter(f) {
    this.filter = f;
    const habits  = await DB.habits.getAll();
    const allLogs = JSON.parse(localStorage.getItem('hf_logs') || '[]');
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('habits-tbody').innerHTML = this.renderRows(habits, allLogs);
  },

  openAddModal() {
    this.editingId = null;
    this.selectedIcon = '💧';
    document.getElementById('modal-title').textContent = 'Add New Habit';
    document.getElementById('save-btn-text').textContent = 'Add Habit';
    document.getElementById('habit-name').value = '';
    document.getElementById('habit-desc').value = '';
    document.getElementById('habit-time').value = '';
    document.getElementById('habit-frequency').value = 'daily';
    document.querySelectorAll('.icon-option').forEach(el => {
      el.classList.toggle('selected', el.textContent === this.selectedIcon);
    });
    document.getElementById('habit-modal').classList.add('open');
  },

  async openEditModal(id) {
    const habits = await DB.habits.getAll();
    const h = habits.find(x => x.id === id);
    if (!h) return;
    this.editingId = id;
    this.selectedIcon = h.icon;
    document.getElementById('modal-title').textContent = 'Edit Habit';
    document.getElementById('save-btn-text').textContent = 'Save Changes';
    document.getElementById('habit-name').value = h.name;
    document.getElementById('habit-desc').value = h.description || '';
    document.getElementById('habit-time').value = h.reminderTime || '';
    document.getElementById('habit-frequency').value = h.frequency || 'daily';
    document.querySelectorAll('.icon-option').forEach(el => {
      el.classList.toggle('selected', el.textContent === this.selectedIcon);
    });
    document.getElementById('habit-modal').classList.add('open');
  },

  closeModal() { document.getElementById('habit-modal').classList.remove('open'); },

  selectIcon(icon, el) {
    this.selectedIcon = icon;
    document.querySelectorAll('.icon-option').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
  },

  async saveHabit() {
    const name = document.getElementById('habit-name').value.trim();
    if (!name) { App.toast('Please enter a habit name', 'error'); return; }

    const data = {
      name,
      icon: this.selectedIcon,
      description: document.getElementById('habit-desc').value.trim(),
      reminderTime: document.getElementById('habit-time').value || null,
      frequency: document.getElementById('habit-frequency').value,
    };

    try {
      if (this.editingId) {
        await DB.habits.update(this.editingId, data);
        App.toast('Habit updated! ✨', 'success');
      } else {
        await DB.habits.create(data);
        App.toast('New habit added! 🌊', 'success');
      }
      this.closeModal();
      await this.render();
    } catch (e) {
      App.toast('Error: ' + e.message, 'error');
    }
  },

  confirmDelete(id, name) {
    document.getElementById('delete-habit-name').textContent = name;
    document.getElementById('confirm-delete-btn').onclick = () => this.deleteHabit(id);
    document.getElementById('delete-modal').classList.add('open');
  },

  async deleteHabit(id) {
    try {
      await DB.habits.delete(id);
      document.getElementById('delete-modal').classList.remove('open');
      App.toast('Habit deleted', 'warning');
      await this.render();
    } catch (e) {
      App.toast('Error: ' + e.message, 'error');
    }
  },

  async toggleActive(id, isActive) {
    await DB.habits.update(id, { isActive });
    App.toast(isActive ? 'Habit activated ✅' : 'Habit paused ⏸️', 'success');
  },
};
