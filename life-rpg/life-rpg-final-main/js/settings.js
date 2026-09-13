/* =========================================================
   Life RPG – Settings Page
   ========================================================= */
'use strict';

window.PageSettings = {
  activePanel: 'profile',

  async render() {
    const section = document.getElementById('content-settings');
    const user    = await DB.auth.getUser();
    const profile = await DB.profile.get();
    const name    = profile?.full_name || profile?.fullName || user?.fullName || user?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Explorer';
    const initial = name[0]?.toUpperCase() || 'U';



    section.innerHTML = `
      <div class="page-hero" style="margin-bottom:24px;">
        <p class="greeting">SETTINGS</p>
        <h2 style="font-family:'Playfair Display',serif;font-size:32px;font-weight:700;">
          Your Account <span style="color:var(--teal);font-weight:400">~</span>
        </h2>
        <p style="color:var(--text-secondary);font-size:13.5px;">Manage your profile and account settings.</p>
      </div>

      <div class="settings-grid">
        <!-- Sidebar nav -->
        <div>
          <div class="settings-nav">
            <div class="settings-nav-item ${this.activePanel==='profile'?'active':''}" onclick="PageSettings.showPanel('profile')">
              <i class="fa-solid fa-user"></i> <span>Profile</span>
            </div>
            <div class="settings-nav-item ${this.activePanel==='security'?'active':''}" onclick="PageSettings.showPanel('security')">
              <i class="fa-solid fa-shield"></i> <span>Security</span>
            </div>
            <div class="settings-nav-item ${this.activePanel==='data'?'active':''}" onclick="PageSettings.showPanel('data')">
              <i class="fa-solid fa-database"></i> <span>Data & Privacy</span>
            </div>
            <div class="settings-nav-item" onclick="PageSettings.logout()" style="margin-top:20px;color:#ff8080">
              <i class="fa-solid fa-right-from-bracket" style="color:#ff8080"></i> <span>Logout</span>
            </div>
          </div>
        </div>

        <!-- Panels -->
        <div>
          <!-- Profile Panel -->
          <div class="settings-panel ${this.activePanel==='profile'?'active':''}" id="panel-profile">
            <div class="settings-section">
              <div class="settings-section-title"><i class="fa-solid fa-user"></i> Profile Information</div>
              <div class="avatar-section">
                <div class="avatar-big" id="settings-avatar">${initial}</div>
                <div class="avatar-actions">
                  <button class="btn btn-ghost btn-sm" onclick="document.getElementById('avatar-upload').click()">
                    <i class="fa-solid fa-camera"></i> Change Photo
                  </button>
                  <input type="file" id="avatar-upload" accept="image/*" style="display:none" onchange="PageSettings.handleAvatar(this)">
                  <button class="btn btn-ghost btn-sm btn-danger" onclick="PageSettings.removeAvatar()">
                    <i class="fa-solid fa-trash"></i> Remove
                  </button>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Full Name</label>
                  <input type="text" class="form-control" id="setting-name" value="${name}" placeholder="Your full name">
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" class="form-control" id="setting-email" value="${user?.email || ''}" placeholder="email@example.com" ${DEMO_MODE?'disabled':''}>
                </div>
              </div>
              <div style="margin-top:4px">
                <button class="btn btn-primary btn-sm" onclick="PageSettings.saveProfile()">
                  <i class="fa-solid fa-check"></i> Save Changes
                </button>
              </div>
            </div>

            <div class="settings-section">
              <div class="settings-section-title"><i class="fa-solid fa-circle-info"></i> Account Info</div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <strong>Account Type</strong>
                  <span>${DEMO_MODE ? 'Demo Mode (localStorage)' : 'Supabase Connected'}</span>
                </div>
                <span style="font-size:20px">${DEMO_MODE ? '🎮' : '☁️'}</span>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <strong>Member Since</strong>
                  <span>September 2025</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Security Panel -->
          <div class="settings-panel ${this.activePanel==='security'?'active':''}" id="panel-security">
            <div class="settings-section">
              <div class="settings-section-title"><i class="fa-solid fa-lock"></i> Change Password</div>
              ${DEMO_MODE ? `<div style="padding:16px;background:rgba(0,212,200,.07);border:1px solid rgba(0,212,200,.2);border-radius:10px;font-size:13.5px;color:var(--text-secondary)">
                Password management is available when connected to Supabase.<br>
                <span style="color:var(--teal)">Set DEMO_MODE = false in js/config.js to enable.</span>
              </div>` : `
              <div class="form-group">
                <label>Current Password</label>
                <input type="password" class="form-control" id="pw-current" placeholder="Enter current password">
              </div>
              <div class="form-group">
                <label>New Password</label>
                <input type="password" class="form-control" id="pw-new" placeholder="At least 8 characters">
              </div>
              <div class="form-group">
                <label>Confirm New Password</label>
                <input type="password" class="form-control" id="pw-confirm" placeholder="Repeat new password">
              </div>
              <button class="btn btn-primary btn-sm" onclick="PageSettings.changePassword()">
                <i class="fa-solid fa-key"></i> Update Password
              </button>`}
            </div>
          </div>



          <!-- Data Panel -->
          <div class="settings-panel ${this.activePanel==='data'?'active':''}" id="panel-data">
            <div class="settings-section">
              <div class="settings-section-title"><i class="fa-solid fa-database"></i> Your Data</div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <strong>Export Data</strong>
                  <span>Download all your habits and logs as JSON</span>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="PageSettings.exportData()">
                  <i class="fa-solid fa-download"></i> Export
                </button>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <strong>Reset Demo Data</strong>
                  <span>Regenerate sample data for demo mode</span>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="PageSettings.resetDemo()">
                  <i class="fa-solid fa-rotate"></i> Reset
                </button>
              </div>
            </div>
            <div class="settings-section">
              <div class="settings-section-title" style="color:#ff8080"><i class="fa-solid fa-triangle-exclamation"></i> Danger Zone</div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <strong>Clear All History</strong>
                  <span>Remove all habit log data permanently</span>
                </div>
                <button class="btn btn-danger btn-sm" onclick="PageSettings.clearHistory()">
                  <i class="fa-solid fa-trash"></i> Clear
                </button>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <strong>Delete Account</strong>
                  <span>Permanently delete your account and all data</span>
                </div>
                <button class="btn btn-danger btn-sm" onclick="PageSettings.deleteAccount()">
                  <i class="fa-solid fa-skull"></i> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  showPanel(panel) {
    this.activePanel = panel;
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.settings-nav-item').forEach(n => n.classList.remove('active'));
    const el = document.getElementById(`panel-${panel}`);
    if (el) el.classList.add('active');
    event.currentTarget.classList.add('active');
  },

  async saveProfile() {
    const name = document.getElementById('setting-name')?.value.trim();
    if (!name) { App.toast('Name cannot be empty', 'error'); return; }
    try {
      const updates = { full_name: name };
      if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) {
        updates.fullName = name;
      }
      await DB.profile.update(updates);
      App.toast('Profile saved! ✨', 'success');

      // Update UI immediately
      const initial = name[0].toUpperCase();
      const headerAvatarText = document.getElementById('header-avatar-text');
      if (headerAvatarText) headerAvatarText.textContent = initial;

      const settingsAvatar = document.getElementById('settings-avatar');
      if (settingsAvatar && !settingsAvatar.querySelector('img')) {
        settingsAvatar.textContent = initial;
      }

      const el = document.querySelector('.profile-info strong');
      if (el) el.textContent = name;
      const headerName = document.getElementById('header-profile-name');
      if (headerName) headerName.textContent = name;
    } catch (e) {
      App.toast('Error: ' + e.message, 'error');
    }
  },

  handleAvatar(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target.result;
      const av  = document.getElementById('settings-avatar');
      if (av) av.innerHTML = `<img src="${src}" alt="avatar">`;
      localStorage.setItem('hf_avatar', src);
      const headerAv = document.querySelector('.profile-avatar');
      if (headerAv) headerAv.innerHTML = `<img src="${src}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
      App.toast('Avatar updated! 📸', 'success');
    };
    reader.readAsDataURL(file);
  },

  async removeAvatar() {
    localStorage.removeItem('hf_avatar');
    const profile = await DB.profile.get();
    const user = await DB.auth.getUser();
    const name = profile?.full_name || profile?.fullName || user?.fullName || user?.full_name || 'Explorer';
    const initial = name[0]?.toUpperCase() || 'U';
    const av = document.getElementById('settings-avatar');
    if (av) av.innerHTML = initial;
    const headerAv = document.querySelector('.profile-avatar');
    if (headerAv) headerAv.innerHTML = `<span id="header-avatar-text">${initial}</span>`;
    App.toast('Avatar removed', 'warning');
  },

  async changePassword() {
    const np = document.getElementById('pw-new')?.value;
    const cp = document.getElementById('pw-confirm')?.value;
    if (!np || np !== cp) { App.toast('Passwords do not match', 'error'); return; }
    try {
      await DB.auth.updatePassword(np);
      App.toast('Password updated!', 'success');
    } catch(e) {
      App.toast('Error: ' + e.message, 'error');
    }
  },

  async savePref(id, val) {
    try {
      localStorage.setItem('hf_pref_' + id, val);
      const profile = (await DB.profile.get()) || {};
      const currentPrefs = profile.preferences || {};
      const updatedPrefs = { ...currentPrefs, [id]: val };
      await DB.profile.update({ preferences: updatedPrefs });
      App.toast('Preference saved', 'success');
    } catch (e) {
      App.toast('Error saving preference: ' + e.message, 'error');
    }
  },



  exportData() {
    const data = {
      habits: JSON.parse(localStorage.getItem('hf_habits') || '[]'),
      logs:   JSON.parse(localStorage.getItem('hf_logs')   || '[]'),
      user:   JSON.parse(localStorage.getItem('hf_user')   || '{}'),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'liferpg-export.json';
    a.click();
    App.toast('Data exported! 📦', 'success');
  },

  resetDemo() {
    if (!confirm('Reset all demo data? This cannot be undone.')) return;
    localStorage.removeItem('hf_seeded');
    localStorage.removeItem('hf_habits');
    localStorage.removeItem('hf_logs');
    location.reload();
  },

  clearHistory() {
    if (!confirm('Clear ALL habit history? This cannot be undone.')) return;
    localStorage.removeItem('hf_logs');
    App.toast('History cleared', 'warning');
  },

  deleteAccount() {
    if (!confirm('Are you absolutely sure? All data will be deleted permanently.')) return;
    ['hf_user','hf_habits','hf_logs','hf_session','hf_seeded','hf_avatar'].forEach(k => localStorage.removeItem(k));
    window.location.href = 'landing.html';
  },

  async logout() {
    await DB.auth.logout();
    window.location.href = 'landing.html';
  },
};
