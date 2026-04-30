const STORAGE_KEY = 'hallTicketingApp_v2';

//для отримання всіх подій
function getEvents() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function findEvent(id) {
  return getEvents().find(e => e.id === id) || null;
}

//робить так щоб був унікальний ID
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

//Валідація часу

/**
 * Перевірка правила 24 годин.
 * Редагування/видалення можливе лише якщо до події >= 24 год.
 * @returns {boolean}
 */
function canEditEvent(dateStr) {
  const msUntil = new Date(dateStr).getTime() - Date.now();
  return msUntil >= 24 * 60 * 60 * 1000;
}

// ── SEATS HELPERS ────────────────────────────────────────────

/кількість вільних місць
function freeSeats(event) {
  return event.seats - (event.tickets?.length || 0);
}

/скільки відсотків заповнено
function occupancyPct(event) {
  return Math.min(100, Math.round((event.tickets?.length || 0) / event.seats * 100));
}

//унікальність квитків
function checkUniqueness(event, email, phone) {
  const tickets = event.tickets || [];
  const normEmail = email.trim().toLowerCase();
  const normPhone = phone.trim().replace(/[\s\-()]/g, '');

  if (tickets.some(t => t.email.toLowerCase() === normEmail)) {
    return { ok: false, message: 'Цей email вже зареєстровано на подію. Можна придбати лише один квиток.' };
  }
  if (tickets.some(t => t.phone.replace(/[\s\-()]/g, '') === normPhone)) {
    return { ok: false, message: 'Цей номер телефону вже зареєстровано на подію.' };
  }
  return { ok: true };
}

//дата час
function formatDate(str) {
  return new Date(str).toLocaleString('uk-UA', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

//рендер подій
function renderEvents() {
  const events = getEvents().sort((a, b) => new Date(a.date) - new Date(b.date));
  const list = document.getElementById('eventsList');
  const empty = document.getElementById('emptyState');
  list.innerHTML = '';

  updateStats(events);

  if (events.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  events.forEach(ev => list.appendChild(buildCard(ev)));
}

function buildCard(ev) {
  const free   = freeSeats(ev);
  const sold   = ev.tickets?.length || 0;
  const pct    = occupancyPct(ev);
  const isSold = free <= 0;
  const isFew  = !isSold && free <= 10;
  const canEdit = canEditEvent(ev.date);

  const thumbClass = isSold ? 'sold' : isFew ? 'few' : '';
  const countClass = isSold ? 'sold' : isFew ? 'few' : '';
  const barClass   = isSold ? 'sold' : isFew ? 'few' : '';

  const card = document.createElement('div');
  card.className = 'event-card';
  card.innerHTML = `
    <div class="event-card__thumb ${thumbClass}"></div>
    <div class="event-card__body">
      <div class="event-card__category">
        <span class="dot dot--orange"></span>
        Актовий зал
      </div>
      <div class="event-card__title">${esc(ev.name)}</div>
      <div class="event-card__meta">
        <div class="event-card__meta-row">
          <span>📅</span>
          <span>${formatDate(ev.date)}</span>
        </div>
        <div class="event-card__meta-row">
          <span>⏱</span>
          <span>${ev.duration} хв</span>
        </div>
        <div class="event-card__meta-row">
          <span>🪑</span>
          <span>${ev.seats} місць загалом</span>
        </div>
      </div>
      ${ev.description ? `<p class="event-card__desc">${esc(ev.description)}</p>` : ''}
      <div class="event-card__seats">
        <div>
          <div class="seats-count ${countClass}">${free}</div>
        </div>
        <div class="seats-info">
          <span class="seats-info-main">вільних місць</span>
          <div class="seats-progress">
            <div class="seats-progress-bar ${barClass}" style="width: ${pct}%"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="event-card__footer">
      ${!isSold
        ? `<button class="btn-pill btn-pill--orange btn-pill--sm" data-action="buy" data-id="${ev.id}">🎟 Квиток</button>`
        : `<button class="btn-pill btn-pill--sm" disabled>Місця закінчились</button>`
      }
      <button class="btn-pill btn-pill--ghost btn-pill--sm" data-action="view" data-id="${ev.id}">
        Квитки (${sold})
      </button>
      <button class="btn-pill btn-pill--ghost btn-pill--sm" data-action="edit" data-id="${ev.id}" data-blocked="${!canEdit}">
        ✎
      </button>
      <button class="btn-pill btn-pill--danger btn-pill--sm" data-action="delete" data-id="${ev.id}" data-blocked="${!canEdit}">
        ✕
      </button>
    </div>
  `;
  return card;
}

// ── STATS ────────────────────────────────────────────────────

function updateStats(events) {
  const totalTickets = events.reduce((s, e) => s + (e.tickets?.length || 0), 0);
  const totalFree    = events.reduce((s, e) => s + freeSeats(e), 0);
  animateCount('statEvents',  events.length);
  animateCount('statTickets', totalTickets);
  animateCount('statSeats',   totalFree);
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const current = parseInt(el.textContent) || 0;
  if (current === target) return;
  const step = Math.ceil(Math.abs(target - current) / 20);
  let val = current;
  const timer = setInterval(() => {
    val += (target > current ? step : -step);
    if ((target > current && val >= target) || (target <= current && val <= target)) {
      val = target;
      clearInterval(timer);
    }
    el.textContent = val;
  }, 30);
}

// ── EVENT FORM ───────────────────────────────────────────────

function openCreateModal() {
  document.getElementById('eventId').value = '';
  document.getElementById('eventForm').reset();
  document.getElementById('eventModalTitle').textContent = 'Нова подія';
  hideErr('eventFormError');
  openModal('eventModal');
}

function openEditModal(id) {
  const ev = findEvent(id);
  if (!ev) return;
  document.getElementById('eventId').value = ev.id;
  document.getElementById('eventName').value = ev.name;
  document.getElementById('eventDate').value = ev.date.slice(0, 16);
  document.getElementById('eventDuration').value = ev.duration;
  document.getElementById('eventSeats').value = ev.seats;
  document.getElementById('eventDesc').value = ev.description || '';
  document.getElementById('eventModalTitle').textContent = 'Редагувати подію';
  hideErr('eventFormError');
  openModal('eventModal');
}

document.getElementById('eventForm').addEventListener('submit', e => {
  e.preventDefault();
  const id   = document.getElementById('eventId').value;
  const name = document.getElementById('eventName').value.trim();
  const date = document.getElementById('eventDate').value;
  const dur  = parseInt(document.getElementById('eventDuration').value);
  const seats = parseInt(document.getElementById('eventSeats').value);
  const desc = document.getElementById('eventDesc').value.trim();

  if (!name || !date || !dur || !seats) {
    return showErr('eventFormError', 'Заповніть усі обов\'язкові поля.');
  }

  const events = getEvents();

  if (id) {
    // EDIT
    const idx = events.findIndex(e => e.id === id);
    if (idx < 0) return;
    // Validate that new seat count >= sold tickets
    const soldCount = events[idx].tickets?.length || 0;
    if (seats < soldCount) {
      return showErr('eventFormError', `Не можна зменшити кількість місць нижче проданих квитків (${soldCount}).`);
    }
    events[idx] = { ...events[idx], name, date, duration: dur, seats, description: desc };
    saveEvents(events);
    closeModal('eventModal');
    renderEvents();
    toast('Подію оновлено', 'success');
  } else {
    // CREATE
    const ev = { id: uid(), name, date, duration: dur, seats, description: desc, tickets: [] };
    events.push(ev);
    saveEvents(events);
    closeModal('eventModal');
    renderEvents();
    toast('Подію створено!', 'success');
  }
});

// ── DELETE ───────────────────────────────────────────────────

/**
 * Видалення події з перевіркою правила 24 годин.
 * Якщо до події < 24 год — блокуємо і показуємо помилку.
 */
function deleteEvent(id) {
  const ev = findEvent(id);
  if (!ev) return;

  if (!canEditEvent(ev.date)) {
    toast('Видалення заблоковано: до початку події менше 24 годин.', 'error');
    return;
  }

  if (!confirm(`Видалити "${ev.name}"? Усі квитки буде втрачено.`)) return;

  saveEvents(getEvents().filter(e => e.id !== id));
  renderEvents();
  toast('Подію видалено.', 'success');
}

// ── BUY TICKET ───────────────────────────────────────────────

function openBuyModal(id) {
  const ev = findEvent(id);
  if (!ev) return;
  document.getElementById('ticketEventId').value = id;
  document.getElementById('ticketForm').reset();
  document.getElementById('ticketEventInfo').innerHTML = `
    <strong>${esc(ev.name)}</strong>
    <span>${formatDate(ev.date)} · ${ev.duration} хв · Вільних місць: ${freeSeats(ev)}</span>
  `;
  hideErr('ticketFormError');
  openModal('ticketModal');
}

document.getElementById('ticketForm').addEventListener('submit', e => {
  e.preventDefault();
  const id    = document.getElementById('ticketEventId').value;
  const name  = document.getElementById('ticketName').value.trim();
  const email = document.getElementById('ticketEmail').value.trim();
  const phone = document.getElementById('ticketPhone').value.trim();

  if (!name || !email || !phone) return showErr('ticketFormError', 'Заповніть усі поля.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showErr('ticketFormError', 'Невірний формат email.');

  const events = getEvents();
  const idx = events.findIndex(e => e.id === id);
  if (idx < 0) return;

  if (freeSeats(events[idx]) <= 0) {
    return showErr('ticketFormError', 'На цю подію більше немає вільних місць.');
  }

  /**
   * ПЕРЕВІРКА УНІКАЛЬНОСТІ:
   * Email і телефон мають бути унікальними в межах події.
   */
  const { ok, message } = checkUniqueness(events[idx], email, phone);
  if (!ok) return showErr('ticketFormError', message);

  events[idx].tickets.push({
    id: uid(),
    name,
    email: email.toLowerCase(),
    phone: phone.replace(/[\s\-()]/g, ''),
    boughtAt: new Date().toISOString()
  });

  saveEvents(events);
  closeModal('ticketModal');
  renderEvents(); // миттєве оновлення місць
  toast(`✓ Квиток для ${name} успішно куплено!`, 'success');
});

// ── VIEW TICKETS ─────────────────────────────────────────────

function openViewModal(id) {
  const ev = findEvent(id);
  if (!ev) return;
  document.getElementById('viewTicketsTitle').textContent = ev.name;
  const tickets = ev.tickets || [];
  const list = document.getElementById('ticketsList');
  list.innerHTML = tickets.length
    ? tickets.map((t, i) => `
        <div class="ticket-row">
          <div class="ticket-row__num">${String(i + 1).padStart(2, '0')}</div>
          <div>
            <div class="ticket-row__name">${esc(t.name)}</div>
            <div class="ticket-row__email">${esc(t.email)}</div>
          </div>
          <div class="ticket-row__phone">${esc(t.phone)}</div>
        </div>
      `).join('')
    : '<div class="tickets-empty">Квитків ще немає</div>';
  openModal('viewTicketsModal');
}

// ── EVENT DELEGATION ─────────────────────────────────────────

document.getElementById('eventsList').addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id, blocked } = btn.dataset;

  if (action === 'buy')    { openBuyModal(id); return; }
  if (action === 'view')   { openViewModal(id); return; }
  if (action === 'delete') { deleteEvent(id); return; }

  if (action === 'edit') {
    /**
     * ПЕРЕВІРКА 24 ГОДИН:
     * Якщо data-blocked="true", показуємо помилку замість форми.
     */
    if (blocked === 'true') {
      toast('Редагування заблоковано: до початку події менше 24 годин.', 'error');
    } else {
      openEditModal(id);
    }
  }
});

// ── MODAL HELPERS ────────────────────────────────────────────

function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('active');
  m.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('active');
  m.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// Close buttons and backdrops
document.querySelectorAll('[data-close]').forEach(el => {
  el.addEventListener('click', () => closeModal(el.dataset.close));
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['eventModal', 'ticketModal', 'viewTicketsModal'].forEach(closeModal);
  }
});

// ── TOAST ────────────────────────────────────────────────────

let toastTimer;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} visible`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 4000);
}

// ── FORM ERR HELPERS ─────────────────────────────────────────

function showErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideErr(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');
  el.textContent = '';
}

// ── NAV SCROLL EFFECT ────────────────────────────────────────

window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ── BUTTON WIRING ────────────────────────────────────────────

document.getElementById('openCreateBtn').addEventListener('click', openCreateModal);
document.getElementById('heroAddBtn').addEventListener('click', openCreateModal);
document.getElementById('addEventBtn2').addEventListener('click', openCreateModal);
document.getElementById('emptyAddBtn').addEventListener('click', openCreateModal);
document.getElementById('heroExploreBtn').addEventListener('click', () => {
  document.getElementById('events').scrollIntoView({ behavior: 'smooth' });
});

// ── INIT ─────────────────────────────────────────────────────

renderEvents();
