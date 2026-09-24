(() => {
  const categories = ['Романтика','Еда','Активное','Творчество','Игры','Культура','Природа','Мини-путешествие','Необычное'];
  const shortLabels = ['РОМАНТИКА','ЕДА','АКТИВНО','ТВОРЧЕСТВО','ИГРЫ','КУЛЬТУРА','ПРИРОДА','МИНИ-ТРИП','НЕОБЫЧНО'];

  const wheel = document.getElementById('wheel');
  const labels = document.getElementById('wheelLabels');
  const spinBtn = document.getElementById('spinBtn');
  const resultCard = document.getElementById('resultCard');
  const resultClose = document.getElementById('resultClose');
  const againBtn = document.getElementById('againBtn');
  const saveBtn = document.getElementById('saveBtn');
  const categoryRow = document.getElementById('categoryRow');
  const tripPanel = document.getElementById('tripPanel');
  const toast = document.getElementById('toast');
  const favoritesBtn = document.getElementById('favoritesBtn');
  const savedDrawer = document.getElementById('savedDrawer');
  const savedClose = document.getElementById('savedClose');
  const savedList = document.getElementById('savedList');

  let selectedCategory = 'Случайно';
  let currentRotation = 0;
  let currentPayload = null;
  const trip = { format: [], setting: [], facilities: [], distance: [], tripLength: [] };

  shortLabels.forEach((label, i) => {
    const el = document.createElement('div');
    el.className = 'wheel-label';
    const angle = i * 40 + 20;
    const radius = 118;
    el.style.transform = `rotate(${angle}deg) translateY(-${radius}px) rotate(${-angle}deg)`;
    el.textContent = label;
    labels.appendChild(el);
  });

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.hidden = true; }, 1700);
  }

  function getFilters() {
    return {
      city: document.getElementById('citySelect').value,
      budget: document.getElementById('budgetSelect').value,
      duration: document.getElementById('durationSelect').value,
      category: selectedCategory,
      trip
    };
  }

  function targetRotationFor(category) {
    const index = categories.indexOf(category);
    const segmentCenter = index * 40 + 20;
    const randomOffset = (Math.random() * 18) - 9;
    const desired = 360 - segmentCenter + randomOffset;
    const base = Math.ceil(currentRotation / 360) * 360 + 1080;
    return base + desired;
  }

  function metaPill(text) {
    if (!text) return '';
    return `<span class="meta-pill">${escapeHtml(String(text))}</span>`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function renderResult(payload) {
    currentPayload = payload;
    const category = payload.category;
    const result = payload.result;
    document.getElementById('resultCategory').textContent = category.toUpperCase();
    document.getElementById('resultTitle').textContent = result.title;
    document.getElementById('resultDescription').textContent = result.description || 'Кажется, план на сегодня найден.';

    const meta = [];
    if (payload.kind === 'idea') {
      meta.push(result.budget, result.duration, result.mood);
    } else {
      if (result.city) meta.push(result.city);
      if (result.distanceKm != null) meta.push(`${result.distanceKm} км от Москвы`);
      if (result.overnight) meta.push('с ночёвкой');
      if (result.type) meta.push(result.type);
    }
    document.getElementById('resultMeta').innerHTML = meta.filter(Boolean).map(metaPill).join('');

    const locationList = document.getElementById('locationList');
    if (payload.kind === 'location') {
      const features = (result.features || []).slice(0, 6);
      locationList.innerHTML = features.length ? `<div class="location-item"><strong>Почему сюда</strong><span>${features.map(escapeHtml).join(' · ')}</span></div>` : '';
      if (result.address) locationList.innerHTML += `<div class="location-item"><strong>Где</strong><span>${escapeHtml(result.address)}</span></div>`;
    } else {
      const locations = payload.locations || [];
      locationList.innerHTML = locations.length
        ? `<div class="location-item"><strong>Где это можно сделать</strong><span>Несколько подходящих вариантов:</span></div>` + locations.map(x => `<div class="location-item"><strong>${escapeHtml(x.name)}</strong><span>${escapeHtml(x.city)}${x.type ? ' · ' + escapeHtml(x.type) : ''}${x.features?.length ? ' · ' + x.features.slice(0,2).map(escapeHtml).join(' · ') : ''}</span></div>`).join('')
        : '';
    }

    const saved = getSaved();
    saveBtn.textContent = saved.some(x => x.key === payloadKey(payload)) ? '♥ сохранено' : '♡ сохранить';
    resultCard.hidden = false;
  }

  function payloadKey(payload) {
    return `${payload.category}::${payload.result.title}`;
  }

  async function spin() {
    if (spinBtn.disabled) return;
    spinBtn.disabled = true;
    resultCard.hidden = true;
    try {
      const response = await fetch('/api/spin', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(getFilters())
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Не получилось подобрать вариант');

      const rotation = targetRotationFor(payload.category);
      currentRotation = rotation;
      wheel.style.transform = `rotate(${rotation}deg)`;

      const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 80 : 3180;
      setTimeout(() => {
        renderResult(payload);
        spinBtn.disabled = false;
      }, delay);
    } catch (error) {
      spinBtn.disabled = false;
      showToast(error.message || 'Что-то пошло не так');
    }
  }

  categoryRow.addEventListener('click', e => {
    const btn = e.target.closest('[data-category]');
    if (!btn) return;
    categoryRow.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    selectedCategory = btn.dataset.category;
    tripPanel.hidden = selectedCategory !== 'Мини-путешествие';
  });

  tripPanel.addEventListener('click', e => {
    const btn = e.target.closest('.mini-chip');
    if (!btn) return;
    const kind = btn.dataset.tripKind;
    const value = btn.dataset.tripValue;
    const arr = trip[kind];
    const i = arr.indexOf(value);
    if (i >= 0) arr.splice(i,1); else arr.push(value);
    btn.classList.toggle('active', i < 0);
  });

  function getSaved() {
    try { return JSON.parse(localStorage.getItem('vdvoem:saved') || '[]'); }
    catch { return []; }
  }

  function setSaved(items) {
    localStorage.setItem('vdvoem:saved', JSON.stringify(items.slice(0,50)));
  }

  function toggleSave() {
    if (!currentPayload) return;
    const key = payloadKey(currentPayload);
    const saved = getSaved();
    const index = saved.findIndex(x => x.key === key);
    if (index >= 0) {
      saved.splice(index,1);
      saveBtn.textContent = '♡ сохранить';
      showToast('Убрано из сохранённых');
    } else {
      saved.unshift({
        key,
        category: currentPayload.category,
        title: currentPayload.result.title,
        description: currentPayload.result.description || '',
        kind: currentPayload.kind
      });
      saveBtn.textContent = '♥ сохранено';
      showToast('Сохранено');
    }
    setSaved(saved);
  }

  function renderSaved() {
    const saved = getSaved();
    savedList.innerHTML = saved.length ? saved.map(item => `
      <div class="saved-item" data-key="${escapeHtml(item.key)}">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.category)} · ${escapeHtml(item.description)}</p>
        <button class="remove-saved" type="button" aria-label="Удалить из сохранённых">×</button>
      </div>`).join('') : '<div class="empty-state">Здесь появятся идеи, которые вы захотите оставить на потом.</div>';
    savedDrawer.hidden = false;
  }

  savedList.addEventListener('click', e => {
    const btn = e.target.closest('.remove-saved');
    if (!btn) return;
    const item = btn.closest('.saved-item');
    const key = item.dataset.key;
    setSaved(getSaved().filter(x => x.key !== key));
    renderSaved();
  });

  spinBtn.addEventListener('click', spin);
  againBtn.addEventListener('click', spin);
  saveBtn.addEventListener('click', toggleSave);
  resultClose.addEventListener('click', () => { resultCard.hidden = true; });
  favoritesBtn.addEventListener('click', renderSaved);
  savedClose.addEventListener('click', () => { savedDrawer.hidden = true; });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      resultCard.hidden = true;
      savedDrawer.hidden = true;
    }
  });
})();
