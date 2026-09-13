/* =========================================================
   Life RPG – Auth Page Logic
   ========================================================= */
'use strict';

// ── Ocean background bubbles ──────────────────────────
(function buildBubbles() {
  const wrap = document.getElementById('auth-bubbles');
  if (!wrap) return;
  for (let i = 0; i < 22; i++) {
    const b = document.createElement('div');
    b.className = 'bubble';
    const size = 3 + Math.random() * 18;
    b.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random()*100}%;
      animation-duration:${9+Math.random()*18}s;
      animation-delay:${-Math.random()*18}s;
    `;
    wrap.appendChild(b);
  }
  // Rays
  const rays = document.getElementById('auth-rays');
  if (!rays) return;
  [20,38,58,72].forEach((l, i) => {
    const r = document.createElement('span');
    r.style.cssText = `position:absolute;top:-10%;left:${l}%;width:${1+i*.5}px;height:130%;
      background:linear-gradient(180deg,rgba(0,212,200,.5) 0%,transparent 75%);
      transform-origin:top center;opacity:${.3+i*.08};
      animation:rayWave ${8+i*2}s ease-in-out infinite alternate;
      --r:${i%2===0?5:-5};`;
    rays.appendChild(r);
  });
})();

// ── Tab switching ─────────────────────────────────────
let mode = 'login';
function setMode(m) {
  mode = m;
  document.querySelectorAll('.auth-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.mode === m);
  });
  const nameGroup = document.getElementById('signup-name-group');
  if (nameGroup) nameGroup.style.display = m === 'signup' ? 'flex' : 'none';
  
  const headingEl = document.getElementById('auth-heading');
  if (headingEl) headingEl.textContent = m === 'login' ? 'Welcome Back 🌊' : 'Join Life RPG 🌊';
  
  const subEl = document.getElementById('auth-sub');
  if (subEl) {
    subEl.textContent = m === 'login'
      ? 'Sign in to continue your journey.'
      : 'Create your account and start building better habits.';
  }
  
  const btnText = document.getElementById('auth-btn-text');
  if (btnText) btnText.textContent = m === 'login' ? 'Sign In' : 'Create Account';
  
  clearAlert();
}

document.querySelectorAll('.auth-tab').forEach(t => {
  t.addEventListener('click', () => setMode(t.dataset.mode));
});

// ── Toggle password visibility ────────────────────────
document.querySelectorAll('.toggle-pw').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const inp = btn.previousElementSibling || btn.closest('.input-wrap')?.querySelector('input');
    if (!inp) return;
    const isPass = inp.type === 'password';
    inp.type = isPass ? 'text' : 'password';
    const icon = btn.querySelector('i');
    if (icon) {
      icon.className = isPass ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    }
  });
});

// ── Alert helpers ─────────────────────────────────────
function showAlert(msg, type = 'error') {
  const el = document.getElementById('auth-alert');
  if (!el) return;
  el.className = `auth-alert ${type}`;
  el.innerHTML = `<i class="fa-solid ${type==='error'?'fa-circle-xmark':'fa-circle-check'}"></i> ${msg}`;
}
function clearAlert() {
  const el = document.getElementById('auth-alert');
  if (!el) return;
  el.className = 'auth-alert';
  el.innerHTML = '';
}

// ── Format friendly error message ─────────────────────
function formatAuthError(err) {
  if (!err) return 'An unexpected error occurred. Please try again.';
  const raw = (err.message || String(err)).trim();
  const lower = raw.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Incorrect email or password. Please check your credentials and try again.';
  }
  if (lower.includes('user already registered') || lower.includes('user already exists') || lower.includes('already registered')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  if (lower.includes('invalid email') || lower.includes('valid email') || lower.includes('unable to validate email')) {
    return 'Please enter a valid email address (e.g. you@example.com).';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network error') || lower.includes('fetch')) {
    return 'Network connection failed. Please check your internet connection or Supabase settings.';
  }
  if (lower.includes('password should be at least') || lower.includes('password must be at least')) {
    return 'Password must be at least 6 characters in length.';
  }
  return raw;
}

// ── Submit ────────────────────────────────────────────
document.getElementById('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const btn   = document.getElementById('auth-btn');
  const email = (document.getElementById('auth-email')?.value || '').trim();
  const pass  = document.getElementById('auth-pass')?.value || '';
  const name  = (document.getElementById('auth-name')?.value || '').trim();

  // Validate inputs
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) { showAlert('Please enter your email address.'); return; }
  if (!emailRegex.test(email)) { showAlert('Please enter a valid email address format (e.g. you@example.com).'); return; }
  if (!pass) { showAlert('Please enter your password.'); return; }
  if (pass.length < 6) { showAlert('Password must be at least 6 characters.'); return; }

  if (mode === 'signup' && !name) {
    showAlert('Please enter your full name.');
    return;
  }

  btn.classList.add('loading');
  try {
    if (mode === 'login') {
      await DB.auth.login(email, pass);
      showAlert('Signed in successfully! Redirecting...', 'success');
      setTimeout(() => { window.location.href = 'app.html'; }, 700);
    } else {
      const res = await DB.auth.signup(email, pass, name);
      if (res?.user && !res?.session && !DB.isDemo()) {
        showAlert('Account created! Please check your email to confirm your account before signing in.', 'success');
        btn.classList.remove('loading');
        return;
      }
      showAlert('Account created successfully! Redirecting...', 'success');
      setTimeout(() => { window.location.href = 'app.html'; }, 700);
    }
  } catch (err) {
    btn.classList.remove('loading');
    showAlert(formatAuthError(err), 'error');
  }
});

// ── Clear form inputs on page load/refresh ───────────
function clearFormInputs() {
  const emailInput = document.getElementById('auth-email');
  const passInput  = document.getElementById('auth-pass');
  const nameInput  = document.getElementById('auth-name');
  if (emailInput) emailInput.value = '';
  if (passInput) passInput.value = '';
  if (nameInput) nameInput.value = '';
  const form = document.getElementById('auth-form');
  if (form) form.reset();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', clearFormInputs);
} else {
  clearFormInputs();
}

// ── Keydown Enter ─────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const form = document.getElementById('auth-form');
    if (form) form.dispatchEvent(new Event('submit'));
  }
});
