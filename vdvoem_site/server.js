const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const databasePath = path.join(__dirname, 'data', 'database.json');
const db = JSON.parse(fs.readFileSync(databasePath, 'utf8'));

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const CATEGORY_ORDER = [
  'Романтика', 'Еда', 'Активное', 'Творчество', 'Игры',
  'Культура', 'Природа', 'Мини-путешествие', 'Необычное'
];

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function normalizeList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

function durationMatches(itemDuration, wanted) {
  if (!wanted || wanted === 'Любое') return true;
  if (wanted === 'До 1 часа') return itemDuration === 'до 1 часа';
  if (wanted === '1–2 часа') return ['до 1 часа', '1–2 часа'].includes(itemDuration);
  if (wanted === '2–4 часа') return ['1–2 часа', '1–3 часа', '2–3 часа', '2–4 часа'].includes(itemDuration);
  if (wanted === 'Полдня+') return ['1–3 часа', '2–4 часа', '3+ часа'].includes(itemDuration);
  return true;
}

function budgetMatches(itemBudget, wanted) {
  if (!wanted || wanted === 'Любой') return true;
  if (wanted === 'Бесплатно') return itemBudget === 'бесплатно';
  if (wanted === 'До 1500 ₽') return ['бесплатно', 'низкий'].includes(itemBudget);
  if (wanted === 'До 5000 ₽') return ['бесплатно', 'низкий', 'средний'].includes(itemBudget);
  if (wanted === 'Без ограничений') return true;
  return true;
}

function cityMatches(location, city) {
  if (!city || city === 'Москва и область') return true;
  if (city === 'Москва') return location.city === 'Москва';
  if (city === 'Московская область') return location.city !== 'Москва';
  return location.city === city || location.city.includes(city);
}

function locationMatchesUiFilters(location, trip = {}) {
  const ui = location.ui_filters || {};
  const selectedFormats = normalizeList(trip.format);
  const selectedSettings = normalizeList(trip.setting);
  const selectedFacilities = normalizeList(trip.facilities);
  const selectedDistance = normalizeList(trip.distance);
  const selectedDuration = normalizeList(trip.tripLength);

  const hasAny = (selected, actual) => !selected.length || selected.some(x => (actual || []).includes(x));
  if (!hasAny(selectedFormats, ui.stay_formats)) return false;
  if (!hasAny(selectedSettings, ui.setting_tags)) return false;
  if (!hasAny(selectedFacilities, ui.facility_tags)) return false;
  if (selectedDistance.length && !selectedDistance.includes(ui.distance_bucket)) return false;
  if (!hasAny(selectedDuration, ui.trip_length_tags)) return false;
  return true;
}

function suggestLocations(category, city, limit = 3) {
  const candidates = db.locations.filter(location => {
    if (!cityMatches(location, city)) return false;
    return (location.best_for || []).includes(category);
  });
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit).map(location => ({
    name: location.name,
    city: location.city,
    type: location.type,
    address: location.address,
    budget: location.budget,
    features: (location.features || []).slice(0, 4),
    overnight: !!location.overnight,
    distanceKm: location.distance_from_moscow_km,
    source: location.source || null
  }));
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, ideas: db.ideas.length, locations: db.locations.length });
});

app.get('/api/options', (req, res) => {
  const cities = [...new Set(db.locations.map(x => x.city))].sort((a,b) => a.localeCompare(b, 'ru'));
  res.json({
    categories: CATEGORY_ORDER,
    cities: ['Москва и область', 'Москва', 'Московская область', 'Пушкино', 'Мытищи', 'Ивантеевка', ...cities.filter(c => !['Москва','Пушкино','Мытищи','Ивантеевка'].includes(c))],
    taxonomy: db.taxonomy || {}
  });
});

app.post('/api/spin', (req, res) => {
  const body = req.body || {};
  const city = body.city || 'Москва и область';
  const budget = body.budget || 'Любой';
  const duration = body.duration || 'Любое';
  const requestedCategory = body.category || 'Случайно';
  const category = requestedCategory === 'Случайно' ? randomItem(CATEGORY_ORDER) : requestedCategory;

  if (category === 'Мини-путешествие') {
    let candidates = db.locations.filter(location => {
      const isMini = location.overnight || (location.best_for || []).includes('Мини-путешествие');
      return isMini && cityMatches(location, city) && locationMatchesUiFilters(location, body.trip || {});
    });

    if (!candidates.length) {
      candidates = db.locations.filter(location => {
        const isMini = location.overnight || (location.best_for || []).includes('Мини-путешествие');
        return isMini && cityMatches(location, city);
      });
    }

    if (!candidates.length) {
      return res.status(404).json({ error: 'Не нашлось подходящих мини-путешествий. Ослабьте фильтры.' });
    }

    const location = randomItem(candidates);
    return res.json({
      category,
      kind: 'location',
      result: {
        title: location.name,
        description: location.notes || `Небольшая поездка вдвоём: ${location.type}.`,
        city: location.city,
        type: location.type,
        subtype: location.subtype,
        address: location.address,
        budget: location.budget,
        features: location.features || [],
        overnight: !!location.overnight,
        distanceKm: location.distance_from_moscow_km,
        uiFilters: location.ui_filters || {},
        source: location.source || null
      }
    });
  }

  let ideas = db.ideas.filter(idea => {
    if (idea.category !== category) return false;
    if (!budgetMatches(idea.budget, budget)) return false;
    if (!durationMatches(idea.duration, duration)) return false;
    return true;
  });

  if (!ideas.length) ideas = db.ideas.filter(idea => idea.category === category);
  if (!ideas.length) return res.status(404).json({ error: 'В этой категории пока нет идей.' });

  const idea = randomItem(ideas);
  const locations = suggestLocations(category, city, 3);

  res.json({
    category,
    kind: 'idea',
    result: idea,
    locations
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`VDVOEM запущен: http://localhost:${PORT}`);
});
