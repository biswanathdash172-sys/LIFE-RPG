/* =========================================================
   Life RPG – Supabase / localStorage DB Abstraction
   ========================================================= */

'use strict';

// ── Local-date helper — avoids UTC off-by-one for timezones ahead of UTC ──
function toLocalDateString(date) {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ── Supabase client (lazy-loaded) ─────────────────────
let _supabase = null;
function getClient() {
  if (_supabase) return _supabase;
  if (typeof window !== 'undefined' && typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
    if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON !== 'undefined') {
      _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    }
  }
  return _supabase;
}

// ── localStorage helpers ──────────────────────────────
const LS = {
  get: (k, def = null) => {
    try { return JSON.parse(localStorage.getItem('hf_' + k)) ?? def; }
    catch { return def; }
  },
  set: (k, v) => localStorage.setItem('hf_' + k, JSON.stringify(v)),
  del: (k)    => localStorage.removeItem('hf_' + k),
};

// Helper to determine if current active session is Demo Mode
function isDemo() {
  return (typeof DEMO_MODE !== 'undefined' && DEMO_MODE === true) || LS.get('is_demo') === true;
}

// ── Level & XP helpers ────────────────────────────────
function levelFromXp(xp) {
  return Math.floor(Math.sqrt((xp || 0) / 50)) + 1;
}

function xpForLevel(level) {
  return Math.pow((level || 1) - 1, 2) * 50;
}

if (typeof window !== 'undefined') {
  window.levelFromXp = levelFromXp;
  window.xpForLevel = xpForLevel;
}

// ── Default demo habits ───────────────────────────────
const DEFAULT_HABITS = [
  { id: 'h1', name: 'Drink Water',    icon: '💧', description: '8 glasses',  frequency: 'daily', reminderTime: '08:00', color: '#00b4d8', isActive: true, createdAt: '2025-01-01' },
  { id: 'h2', name: 'Meditate',       icon: '🧘', description: '10 minutes', frequency: 'daily', reminderTime: '07:30', color: '#7c3aed', isActive: true, createdAt: '2025-01-01' },
  { id: 'h3', name: 'Exercise',       icon: '🏋️', description: '30 minutes', frequency: 'daily', reminderTime: '06:30', color: '#dc2626', isActive: true, createdAt: '2025-01-01' },
  { id: 'h4', name: 'Read Book',      icon: '📖', description: '20 minutes', frequency: 'daily', reminderTime: '21:00', color: '#d97706', isActive: true, createdAt: '2025-01-01' },
  { id: 'h5', name: 'Healthy Food',   icon: '🥗', description: 'Eat clean',  frequency: 'daily', reminderTime: null,   color: '#16a34a', isActive: true, createdAt: '2025-01-01' },
  { id: 'h6', name: 'Sleep Early',    icon: '🌙', description: '8 hours',    frequency: 'daily', reminderTime: '22:00', color: '#1d4ed8', isActive: true, createdAt: '2025-01-01' },
  { id: 'h7', name: 'Learn Something',icon: '🧠', description: '30 minutes', frequency: 'daily', reminderTime: null,   color: '#be185d', isActive: true, createdAt: '2025-01-01' },
];

// ── Seed demo data ────────────────────────────────────
function seedDemoData() {
  if (LS.get('seeded')) return;
  LS.set('user', {
    id: 'demo',
    email: 'demo@habitflow.app',
    fullName: 'Life RPG Explorer',
    full_name: 'Life RPG Explorer',
    avatar: null,
    preferences: {
      'pref-reminders': true,
      'pref-streaks': true,
      'pref-weekly': true,
      'pref-compact': false,
    },
  });
  LS.set('habits', DEFAULT_HABITS);

  // Generate realistic log history for last 30 days
  const logs = [];
  const today = new Date();
  for (let d = 29; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const ds = toLocalDateString(date);
    DEFAULT_HABITS.forEach(h => {
      // Give each habit random but convincing streaks
      const chance = h.id === 'h1' ? .88 : h.id === 'h6' ? .82 : h.id === 'h2' ? .75 : .7;
      if (Math.random() < chance) {
        logs.push({ id: crypto.randomUUID(), habitId: h.id, date: ds });
      }
    });
  }
  LS.set('logs', logs);
  // Seed gold: 1 gold per 10 stars so demo user can immediately shop
  const demoGold = Math.floor(logs.length / 10);
  const demoUser = LS.get('user') || {};
  demoUser.gold = demoGold;
  demoUser.equipped_item = null;
  LS.set('user', demoUser);
  LS.set('seeded', true);
}

// ══════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════
window.DB = {
  isDemo,
  levelFromXp,
  xpForLevel,

  // ── Auth ────────────────────────────────────────────
  auth: {
    async login(email, password) {
      // Check for Demo Mode login
      if ((typeof DEMO_MODE !== 'undefined' && DEMO_MODE) || email === 'demo@habitflow.app' || email === 'demo@liferpg.app') {
        seedDemoData();
        LS.set('is_demo', true);
        LS.set('session', true);
        return { user: LS.get('user') };
      }

      // Real Supabase login
      LS.del('is_demo');
      LS.del('session');

      const client = getClient();
      if (!client) {
        throw new Error('Supabase client is not loaded. Please verify configuration and network.');
      }

      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    async signup(email, password, fullName) {
      // Check for Demo Mode signup
      if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) {
        seedDemoData();
        const u = { id: 'demo', email, fullName, avatar: null };
        LS.set('user', u);
        LS.set('is_demo', true);
        LS.set('session', true);
        return { user: u };
      }

      // Real Supabase signup
      LS.del('is_demo');
      LS.del('session');

      const client = getClient();
      if (!client) {
        throw new Error('Supabase client is not loaded. Please verify configuration and network.');
      }

      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });
      if (error) throw error;

      // Ensure profile row exists (fallback if database trigger is delayed or not configured)
      if (data?.user && data?.session) {
        try {
          await client.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
          }, { onConflict: 'id' });
        } catch (profileErr) {
          console.warn('Profile fallback insert note:', profileErr);
        }
      }

      return data;
    },

    async logout() {
      LS.del('is_demo');
      LS.del('session');
      const client = getClient();
      if (client) {
        try { await client.auth.signOut(); } catch (e) { console.warn('Sign out warning:', e); }
      }
    },

    async getUser() {
      if (isDemo()) {
        if (!LS.get('session')) return null;
        return LS.get('user');
      }
      const client = getClient();
      if (!client) return null;
      try {
        const { data, error } = await client.auth.getUser();
        if (error || !data?.user) return null;
        return data.user;
      } catch {
        return null;
      }
    },

    async updatePassword(newPassword) {
      if (isDemo()) return;
      const client = getClient();
      if (!client) throw new Error('Supabase client not initialized');
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
  },

  // ── Profile ─────────────────────────────────────────
  profile: {
    async get() {
      const defaultPrefs = {
        'pref-reminders': true,
        'pref-streaks': true,
        'pref-weekly': true,
        'pref-compact': false,
      };
      if (isDemo()) {
        const u = LS.get('user') || {};
        if (!u.preferences) {
          u.preferences = defaultPrefs;
          LS.set('user', u);
        }
        return u;
      }
      const client = getClient();
      if (!client) return null;
      const { data: uData } = await client.auth.getUser();
      const uid = uData?.user?.id;
      if (!uid) return null;
      const { data: p } = await client.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (p) {
        if (!p.preferences) {
          p.preferences = defaultPrefs;
        }
        return p;
      }
      return {
        id: uid,
        full_name: uData.user.user_metadata?.full_name || uData.user.email?.split('@')[0] || 'Explorer',
        email: uData.user.email,
        avatar_url: null,
        preferences: defaultPrefs,
      };
    },

    async update(updates) {
      if (isDemo()) {
        const u = { ...LS.get('user'), ...updates };
        LS.set('user', u); return u;
      }
      const client = getClient();
      const { data: uData } = await client.auth.getUser();
      if (!uData?.user?.id) throw new Error('Not authenticated');
      const { error } = await client.from('profiles').upsert({ id: uData.user.id, ...updates }, { onConflict: 'id' });
      if (error) throw error;
    },
  },

  // ── Habits ──────────────────────────────────────────
  habits: {
    async getAll() {
      if (isDemo()) return LS.get('habits', []);
      const client = getClient();
      if (!client) return [];
      const { data: uData } = await client.auth.getUser();
      if (!uData?.user?.id) return [];
      const { data: h, error } = await client.from('habits').select('*').eq('user_id', uData.user.id).order('created_at');
      if (error) throw error;
      return (h ?? []).map(item => ({
        ...item,
        isActive: item.is_active ?? true,
        reminderTime: item.reminder_time ?? null,
        createdAt: item.created_at,
      }));
    },

    async create(habit) {
      if (isDemo()) {
        const h = { id: crypto.randomUUID(), ...habit, createdAt: toLocalDateString(new Date()), isActive: true };
        const list = LS.get('habits', []);
        list.push(h); LS.set('habits', list);
        return h;
      }
      const client = getClient();
      const { data: uData } = await client.auth.getUser();
      const payload = {
        user_id: uData.user.id,
        name: habit.name,
        icon: habit.icon || '💧',
        description: habit.description || '',
        frequency: habit.frequency || 'daily',
        reminder_time: habit.reminderTime || habit.reminder_time || null,
        color: habit.color || '#00d4c8',
        is_active: habit.isActive !== false,
      };
      const { data: h, error } = await client.from('habits').insert(payload).select().single();
      if (error) throw error;
      return {
        ...h,
        isActive: h.is_active ?? true,
        reminderTime: h.reminder_time ?? null,
        createdAt: h.created_at,
      };
    },

    async update(id, updates) {
      if (isDemo()) {
        const list = LS.get('habits', []).map(h => h.id === id ? { ...h, ...updates } : h);
        LS.set('habits', list);
        return list.find(h => h.id === id);
      }
      const client = getClient();
      const payload = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.icon !== undefined) payload.icon = updates.icon;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.frequency !== undefined) payload.frequency = updates.frequency;
      if (updates.color !== undefined) payload.color = updates.color;
      if (updates.reminderTime !== undefined) payload.reminder_time = updates.reminderTime;
      if (updates.reminder_time !== undefined) payload.reminder_time = updates.reminder_time;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;
      if (updates.is_active !== undefined) payload.is_active = updates.is_active;

      const { data: h, error } = await client.from('habits').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return {
        ...h,
        isActive: h.is_active ?? true,
        reminderTime: h.reminder_time ?? null,
        createdAt: h.created_at,
      };
    },

    async delete(id) {
      if (isDemo()) {
        LS.set('habits', LS.get('habits', []).filter(h => h.id !== id));
        LS.set('logs', LS.get('logs', []).filter(l => (l.habitId || l.habit_id) !== id));
        return;
      }
      const client = getClient();
      const { error } = await client.from('habits').delete().eq('id', id);
      if (error) throw error;
    },
  },

  // ── Logs ────────────────────────────────────────────
  logs: {
    async getForDate(date) {
      if (isDemo()) return LS.get('logs', []).filter(l => (l.date || l.completed_at) === date);
      const client = getClient();
      if (!client) return [];
      const { data: uData } = await client.auth.getUser();
      if (!uData?.user?.id) return [];
      const { data: l, error } = await client.from('habit_logs').select('*').eq('user_id', uData.user.id).eq('completed_at', date);
      if (error) throw error;
      return (l ?? []).map(log => ({ ...log, habitId: log.habit_id, date: log.completed_at }));
    },

    async getForMonth(year, month) {
      if (isDemo()) {
        const prefix = `${year}-${String(month).padStart(2,'0')}`;
        return LS.get('logs', []).filter(l => (l.date || l.completed_at || '').startsWith(prefix));
      }
      const start = `${year}-${String(month).padStart(2,'0')}-01`;
      const end   = toLocalDateString(new Date(year, month, 0));
      const client = getClient();
      if (!client) return [];
      const { data: uData } = await client.auth.getUser();
      if (!uData?.user?.id) return [];
      const { data: l, error } = await client.from('habit_logs').select('*').eq('user_id', uData.user.id).gte('completed_at', start).lte('completed_at', end);
      if (error) throw error;
      return (l ?? []).map(log => ({ ...log, habitId: log.habit_id, date: log.completed_at }));
    },

    async getForRange(startDate, endDate) {
      if (isDemo()) return LS.get('logs', []).filter(l => (l.date || l.completed_at) >= startDate && (l.date || l.completed_at) <= endDate);
      const client = getClient();
      if (!client) return [];
      const { data: uData } = await client.auth.getUser();
      if (!uData?.user?.id) return [];
      const { data: l, error } = await client.from('habit_logs').select('*').eq('user_id', uData.user.id).gte('completed_at', startDate).lte('completed_at', endDate);
      if (error) throw error;
      return (l ?? []).map(log => ({ ...log, habitId: log.habit_id, date: log.completed_at }));
    },

    // Fetch all logs for the current user (last 365 days for Supabase, all for demo).
    // Canonical source for Insights, Rewards, and streak calculations.
    async getAll() {
      if (isDemo()) return LS.get('logs', []);
      const client = getClient();
      if (!client) return [];
      const { data: uData } = await client.auth.getUser();
      if (!uData?.user?.id) return [];
      const startDate = toLocalDateString(new Date(Date.now() - 365 * 86400000));
      const endDate   = toLocalDateString(new Date());
      const { data: l, error } = await client
        .from('habit_logs').select('*')
        .eq('user_id', uData.user.id)
        .gte('completed_at', startDate)
        .lte('completed_at', endDate)
        .order('completed_at', { ascending: false });
      if (error) throw error;
      return (l ?? []).map(log => ({ ...log, habitId: log.habit_id, date: log.completed_at }));
    },

    async toggle(habitId, date) {
      if (isDemo()) {
        const logs = LS.get('logs', []);
        const idx  = logs.findIndex(l => (l.habitId || l.habit_id) === habitId && (l.date || l.completed_at) === date);
        let completed;
        if (idx >= 0) { logs.splice(idx, 1); completed = false; }
        else          { logs.push({ id: crypto.randomUUID(), habitId, date }); completed = true; }
        LS.set('logs', logs);
        return completed;
      }
      const client = getClient();
      const { data: uData } = await client.auth.getUser();
      const uid = uData.user.id;
      const { data: existing, error: findErr } = await client.from('habit_logs').select('id').eq('habit_id', habitId).eq('completed_at', date).eq('user_id', uid);
      if (findErr) throw findErr;
      if (existing?.length) {
        const { error: delErr } = await client.from('habit_logs').delete().eq('id', existing[0].id);
        if (delErr) throw delErr;
        return false;
      } else {
        const { error: insErr } = await client.from('habit_logs').insert({ habit_id: habitId, completed_at: date, user_id: uid });
        if (insErr) throw insErr;
        return true;
      }
    },

    isCompleted(logs, habitId, date) {
      return logs.some(l => (l.habitId || l.habit_id) === habitId && (l.date || l.completed_at) === date);
    },
  },

  // ── Rewards ─────────────────────────────────────────
  rewards: {
    async calculate() {
      const habits = await window.DB.habits.getAll();
      const today  = toLocalDateString(new Date());
      const todayLogs = await window.DB.logs.getForDate(today);

      const starShells    = todayLogs.length;
      const activeCount   = habits.filter(h => h.isActive !== false && h.is_active !== false).length;
      const pearlOysters  = habits.length > 0 && todayLogs.length >= activeCount ? 1 : 0;

      let totalStars = 0;
      if (isDemo()) {
        const allLogs = LS.get('logs', []);
        totalStars = allLogs.length;
      } else {
        const client = getClient();
        const { data: uData } = await client.auth.getUser();
        if (uData?.user?.id) {
          const { count } = await client.from('habit_logs').select('*', { count: 'exact', head: true }).eq('user_id', uData.user.id);
          totalStars = count || 0;
        }
      }
      return { starShells, pearlOysters, totalStars };
    },
  },

  // ── Stats ────────────────────────────────────────────
  stats: {
    getStreak(logs, habitId) {
      const dates = [...new Set(
        logs.filter(l => (l.habitId || l.habit_id) === habitId)
            .map(l => l.date || l.completed_at)
      )].sort().reverse();

      if (!dates.length) return 0;
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < dates.length; i++) {
        const expected = new Date(today);
        expected.setDate(today.getDate() - i);
        const exp = toLocalDateString(expected);
        if (dates[i] === exp) streak++;
        else break;
      }
      return streak;
    },

    getLongestStreak(logs, habitId) {
      const dates = [...new Set(
        logs.filter(l => (l.habitId || l.habit_id) === habitId)
            .map(l => l.date || l.completed_at)
      )].sort();

      if (!dates.length) return 0;
      let max = 1, cur = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = (curr - prev) / 86400000;
        cur = diff === 1 ? cur + 1 : 1;
        if (cur > max) max = cur;
      }
      return max;
    },

    getCompletionRate(logs, habitId, days = 30) {
      const start = new Date();
      start.setDate(start.getDate() - days + 1);
      const startDate = toLocalDateString(start);
      const count = logs.filter(l =>
        (l.habitId || l.habit_id) === habitId &&
        (l.date || l.completed_at) >= startDate
      ).length;
      return Math.round((count / days) * 100);
    },

    async getOverallCurrentStreak() {
      const today = new Date();
      const habits = await window.DB.habits.getAll();
      if (!habits.length) return 0;

      let logs = [];
      if (isDemo()) {
        logs = LS.get('logs', []);
      } else {
        const start = new Date(today);
        start.setDate(today.getDate() - 365);
        const startStr = toLocalDateString(start);
        const todayStr = toLocalDateString(today);
        logs = await window.DB.logs.getForRange(startStr, todayStr);
      }

      let streak = 0;
      for (let d = 0; d < 365; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - d);
        const ds = toLocalDateString(date);
        const dayLogs = logs.filter(l => (l.date || l.completed_at) === ds);
        if (dayLogs.length > 0) streak++;
        else if (d > 0) break;
      }
      return streak;
    },

    async awardXp(amount, attribute) {
      if (isDemo()) {
        const user = LS.get('user') || { id: 'demo', email: 'demo@habitflow.app', fullName: 'Life RPG Explorer' };
        user.xp = Math.max(0, (user.xp || 0) + amount);
        if (attribute) {
          const attrKey = 'attr_' + attribute;
          user[attrKey] = Math.max(0, (user[attrKey] || 0) + amount);
        }
        LS.set('user', user);
        return {
          new_xp: user.xp,
          new_level: levelFromXp(user.xp),
        };
      }

      const client = getClient();
      if (!client) throw new Error('Supabase client is not loaded');
      const { data, error } = await client.rpc('award_xp', {
        p_amount: amount,
        p_attribute: attribute,
      });
      if (error) throw error;
      return (data && Array.isArray(data) && data[0] !== undefined) ? data[0] : data;
    },

    async syncGold(totalStars) {
      if (isDemo()) {
        const user = LS.get('user') || { id: 'demo', email: 'demo@habitflow.app', fullName: 'Life RPG Explorer' };
        user.gold = Math.floor((totalStars || 0) / 10);
        LS.set('user', user);
        return user.gold;
      }

      const client = getClient();
      if (!client) throw new Error('Supabase client is not loaded');
      const { data, error } = await client.rpc('sync_gold', {
        p_total_stars: totalStars,
      });
      if (error) throw error;
      const res = (data && Array.isArray(data) && data[0] !== undefined) ? data[0] : data;
      return (res && typeof res === 'object') ? (res.sync_gold ?? res.new_gold ?? res.gold ?? Object.values(res)[0]) : res;
    },
  },

  // ── Shop ─────────────────────────────────────────────
  shop: {
    async list() {
      if (isDemo()) {
        return [
          { id: 'item_golden_anchor', name: 'Golden Anchor Badge', cost: 50, type: 'badge', description: 'Golden Anchor Badge', icon: '⚓' },
          { id: 'item_deep_sea_theme', name: 'Deep Sea Theme', cost: 100, type: 'theme', description: 'Deep Sea Theme', icon: '🌊' },
          { id: 'item_wave_rider_title', name: 'Wave Rider Title', cost: 75, type: 'title', description: 'Wave Rider Title', icon: '🏄' },
          { id: 'item_pearl_diver_badge', name: 'Pearl Diver Badge', cost: 150, type: 'badge', description: 'Pearl Diver Badge', icon: '🦪' },
        ];
      }
      const client = getClient();
      if (!client) return [];
      const { data, error } = await client.from('shop_items').select('*');
      if (error) throw error;
      return data || [];
    },

    async owned() {
      if (isDemo()) {
        return LS.get('owned_items', []);
      }
      const client = getClient();
      if (!client) return [];
      const { data: uData } = await client.auth.getUser();
      if (!uData?.user?.id) return [];
      const { data, error } = await client.from('owned_items').select('*').eq('user_id', uData.user.id);
      if (error) throw error;
      return data || [];
    },

    async purchase(itemId) {
      if (isDemo()) {
        const items = await this.list();
        const item = items.find(i => i.id === itemId || String(i.id) === String(itemId) || i.name === itemId);
        if (!item) {
          throw new Error('Item not found');
        }
        const ownedList = LS.get('owned_items', []);
        const isOwned = ownedList.some(o => (typeof o === 'string' ? o === item.id : (o.item_id === item.id || o.id === item.id)));
        if (isOwned) {
          throw new Error('Already owned');
        }
        const user = LS.get('user') || { id: 'demo', email: 'demo@habitflow.app', fullName: 'Life RPG Explorer', xp: 0, gold: 0 };
        const currentGold = user.gold || 0;
        if (currentGold < item.cost) {
          throw new Error('Not enough gold');
        }
        user.gold = currentGold - item.cost;
        LS.set('user', user);
        ownedList.push(item.id);
        LS.set('owned_items', ownedList);
        return { success: true, item_id: item.id, remaining_gold: user.gold };
      }

      const client = getClient();
      if (!client) throw new Error('Supabase client is not loaded');
      const { data, error } = await client.rpc('purchase_item', { p_item_id: itemId });
      if (error) throw error;
      return data;
    },

    // Persist which item is currently equipped (cosmetic effect applied to UI)
    async equip(itemId) {
      if (isDemo()) {
        const user = LS.get('user') || {};
        user.equipped_item = itemId;
        LS.set('user', user);
        return;
      }
      const client = getClient();
      if (!client) return;
      const { data: uData } = await client.auth.getUser();
      if (!uData?.user?.id) return;
      await client.from('profiles').update({ equipped_item: itemId }).eq('id', uData.user.id);
    },

    // Get the currently equipped item id (null if nothing equipped)
    async equipped() {
      if (isDemo()) {
        const user = LS.get('user') || {};
        return user.equipped_item || null;
      }
      const client = getClient();
      if (!client) return null;
      const { data: uData } = await client.auth.getUser();
      if (!uData?.user?.id) return null;
      const { data: p } = await client.from('profiles').select('equipped_item').eq('id', uData.user.id).maybeSingle();
      return p?.equipped_item || null;
    },
  },
};
