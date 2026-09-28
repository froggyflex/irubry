const page = document.body.dataset.page;
const searchStoreKey = 'pianura-est-recent-searches-v2';
const savedStoreKey = 'pianura-est-saved-profiles-v1';
const pageSize = 10;
const needs = [
  { label: 'Anziani', service: 'Assist. Anziani' },
  { label: 'Disabilità', service: 'Supporto disabilità' },
  { label: 'Aiuto alimentare', service: 'Assistenza alimentare e materiale' },
  { label: 'Trasporto', service: 'Trasporto sociale e sanitario' },
  { label: 'Doposcuola', service: 'Doposcuola' },
  { label: 'Emergenza', service: 'Soccorso ed emergenza' },
  { label: 'Animali', service: 'Tutela Animali' },
  { label: 'Eventi', service: 'Organizzazione eventi e tradizioni' },
];
const state = { data: null, boundaries: null, municipality: '', category: '', services: new Set(), savedIds: new Set(), query: '', mapQuery: '', sort: 'relevance', visible: pageSize, map: null, areas: null, markers: null };
const serviceNames = {
  'Assist. Anziani': 'Assistenza agli anziani',
  'Inserim. Lavorativo': 'Inserimento lavorativo',
  'Supp. Fragilità': 'Supporto alle persone fragili',
  'Ristoraz/Catering': 'Ristorazione e catering',
};

function el(id) { return document.getElementById(id); }
function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
function safeUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}
function countLabel(count) { return count === 1 ? '1 ente' : count + ' enti'; }
function serviceLabel(name) { return serviceNames[name] || name; }
function municipalityCount(name) { return state.data.organisations.filter((org) => org.municipality === name).length; }
function organisationUrl(org) {
  const params = new URLSearchParams({ comune: org.municipality, ente: org.id });
  return 'mappa.html?' + params.toString();
}
function listUrl(name) {
  return name ? 'rubrica.html?comune=' + encodeURIComponent(name) : 'rubrica.html';
}
function mapUrl(name) {
  return name ? 'mappa.html?comune=' + encodeURIComponent(name) : 'mappa.html';
}
function serviceUrl(name, service) {
  return 'rubrica.html?' + new URLSearchParams({ comune: name, servizio: service }).toString();
}
function profileUrl(org) {
  return new URL('rubrica.html?ente=' + encodeURIComponent(org.id), location.href).href;
}
function optionsFor(select, items, initial) {
  select.innerHTML = '<option value="">' + escapeHtml(initial) + '</option>';
  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.name;
    const isCategory = select.id === 'categoryFilter';
    const count = isCategory
      ? state.data.organisations.filter((org) => org.category === item.name).length
      : municipalityCount(item.name);
    option.textContent = (isCategory ? item.name : titleCase(item.name)) + ' (' + count + ')';
    select.append(option);
  });
}
function titleCase(name) {
  return String(name || '').toLocaleLowerCase('it').replace(/(^|[\s'])\p{L}/gu, (match) => match.toLocaleUpperCase('it'));
}
function setupDialog(dialog) {
  if (!dialog) return;
  dialog.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
}
function detailRow(label, value) {
  return value ? '<div class="detail-row"><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + '</dd></div>' : '';
}
function socialUrl(type, value) {
  const clean = String(value || '').trim();
  if (!clean) return '';
  const direct = safeUrl(clean);
  if (direct) return direct;
  if (type === 'facebook') return 'https://www.facebook.com/' + encodeURIComponent(clean.replace(/^@/, ''));
  if (type === 'instagram') return 'https://www.instagram.com/' + encodeURIComponent(clean.replace(/^@/, ''));
  return '';
}
function loadSavedProfiles() {
  try {
    const ids = JSON.parse(localStorage.getItem(savedStoreKey) || '[]');
    if (Array.isArray(ids)) state.savedIds = new Set(ids.filter((id) => state.data.organisations.some((org) => org.id === id)));
  } catch { state.savedIds = new Set(); }
}
function toggleSavedProfile(org) {
  if (state.savedIds.has(org.id)) state.savedIds.delete(org.id);
  else state.savedIds.add(org.id);
  try { localStorage.setItem(savedStoreKey, JSON.stringify([...state.savedIds])); } catch { /* Storage can be disabled. */ }
  if (page === 'directory') renderSavedProfiles();
}
function openDetails(org) {
  const dialog = el('detailDialog');
  const target = el('detailContent');
  if (!dialog || !target) return;
  const contacts = [];
  const email = String(org.email || '').trim();
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) contacts.push('<a href="mailto:' + encodeURIComponent(email) + '">Email: ' + escapeHtml(email) + '</a>');
  const website = safeUrl(org.links?.website);
  if (website) contacts.push('<a href="' + escapeHtml(website) + '" target="_blank" rel="noopener noreferrer">Visita il sito web ↗</a>');
  for (const type of ['facebook', 'instagram']) {
    const url = socialUrl(type, org.links?.[type]);
    if (url) contacts.push('<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + titleCase(type) + ' ↗</a>');
  }
  const hours = Object.entries(org.contactHours || {}).filter(([, value]) => value);
  target.innerHTML =
    '<div class="detail-lead"><p class="detail-location">' + escapeHtml(titleCase(org.municipality || 'Comune non indicato')) + ' · ' + escapeHtml(org.category || 'Categoria non indicata') + '</p>' +
    '<h2 id="detailTitle">' + escapeHtml(org.name) + '</h2>' +
    '<p>' + escapeHtml(org.activity || 'Descrizione non disponibile.') + '</p></div>' +
    '<div class="profile-actions"><button id="saveProfile" class="button-secondary" type="button" aria-pressed="' + state.savedIds.has(org.id) + '">' + (state.savedIds.has(org.id) ? 'Rimuovi dai salvati' : 'Salva scheda') + '</button>' +
    '<button id="copyProfile" class="button-secondary" type="button">Copia link</button><span id="profileActionStatus" role="status" aria-live="polite"></span></div>' +
    '<div class="detail-columns"><section><h3>Servizi</h3>' +
    (org.services.length ? '<ul class="detail-services">' + org.services.map((service) => '<li>' + escapeHtml(serviceLabel(service)) + '</li>').join('') + '</ul>' : '<p>Nessun servizio specifico indicato.</p>') +
    '</section><section><h3>Contatti</h3>' +
    (contacts.length ? '<div class="detail-links">' + contacts.join('') + '</div>' : '<p>Nessun contatto disponibile.</p>') +
    (hours.length ? '<h3>Orari</h3><dl class="detail-facts">' + hours.map(([label, value]) => detailRow(label.replaceAll('_', ' '), value)).join('') + '</dl>' : '') +
    '<a class="button-secondary detail-map-link" href="' + escapeHtml(coordinates(org) ? organisationUrl(org) : mapUrl(org.municipality)) + '">' + (coordinates(org) ? 'Mostra sulla mappa' : 'Esplora il comune sulla mappa') + '</a></section></div>' +
    '<details class="admin-details"><summary>Dati amministrativi</summary><dl class="detail-facts">' +
    detailRow('Ente gestore', org.managedBy) + detailRow('Rappresentante', org.legalRepresentative) +
    detailRow('Codice fiscale', org.taxCode) + detailRow('Repertorio', org.registryNumber) +
    detailRow('Iscrizione', org.registrationDate) + detailRow('5x1000', org.fivePerMille) +
    detailRow('Rete', org.network) + detailRow('Categoria beneficio', org.benefitCategory) + '</dl></details>';
  el('saveProfile').addEventListener('click', (event) => {
    toggleSavedProfile(org);
    const saved = state.savedIds.has(org.id);
    event.currentTarget.setAttribute('aria-pressed', String(saved));
    event.currentTarget.textContent = saved ? 'Rimuovi dai salvati' : 'Salva scheda';
    el('profileActionStatus').textContent = saved ? 'Scheda salvata.' : 'Scheda rimossa dai salvati.';
  });
  el('copyProfile').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(profileUrl(org));
      el('profileActionStatus').textContent = 'Link copiato.';
    } catch {
      el('profileActionStatus').textContent = 'Impossibile copiare il link in questo browser.';
    }
  });
  if (!dialog.open) dialog.showModal();
}
function coordinates(org) {
  const lat = Number(org.lat ?? org.coordinates?.[0]);
  const lng = Number(org.lng ?? org.coordinates?.[1]);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
}
function areaStyle(feature) {
  const chosen = feature.properties.name === state.municipality;
  return { color: chosen ? '#125c4e' : '#2f6d62', weight: chosen ? 3 : 1.5, fillColor: chosen ? '#48b494' : '#a7d8c6', fillOpacity: chosen ? 0.62 : 0.32 };
}
function initMap(containerId, onSelect) {
  const container = el(containerId);
  if (!container || !state.boundaries || !window.L) {
    const fallback = el(containerId === 'homeMap' ? 'homeMapFallback' : 'mapFallback');
    if (fallback) fallback.hidden = false;
    return;
  }
  state.map = L.map(container, { scrollWheelZoom: true, tap: true, zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(state.map);
  state.areas = L.geoJSON(state.boundaries, {
    style: areaStyle,
    onEachFeature(feature, layer) {
      const name = feature.properties.name;
      layer.bindTooltip(titleCase(name) + ' · ' + countLabel(municipalityCount(name)), { sticky: true });
      layer.on('click', () => onSelect(name));
      layer.on('mouseover', () => { if (name !== state.municipality) layer.setStyle({ fillOpacity: 0.56, weight: 2.5 }); });
      layer.on('mouseout', () => state.areas?.resetStyle(layer));
    },
  }).addTo(state.map);
  state.map.fitBounds(state.areas.getBounds(), { padding: [20, 20] });
  if (page === 'map') state.markers = L.layerGroup().addTo(state.map);
}
function focusArea(name) {
  if (!state.map || !state.areas) return;
  state.areas.setStyle(areaStyle);
  const layer = state.areas.getLayers().find((item) => item.feature.properties.name === name);
  state.map.fitBounds(layer ? layer.getBounds() : state.areas.getBounds(), { padding: [28, 28], maxZoom: 12 });
}
function renderHomeNeeds(name) {
  const section = el('homeNeeds');
  const list = el('homeNeedsList');
  list.innerHTML = '';
  if (!name) { section.hidden = true; return; }
  const organisations = state.data.organisations.filter((org) => org.municipality === name);
  const available = needs.map((need) => ({
    ...need,
    count: organisations.filter((org) => org.services.includes(need.service)).length,
  })).filter((need) => need.count).sort((a, b) => b.count - a.count).slice(0, 4);
  section.hidden = !available.length;
  available.forEach((need) => {
    const link = document.createElement('a');
    link.href = serviceUrl(name, need.service);
    link.className = 'home-need-link';
    link.textContent = need.label + ' (' + need.count + ')';
    list.append(link);
  });
}
function selectHomeMunicipality(name) {
  state.municipality = name;
  el('homeMunicipality').value = name;
  el('homeDirectoryLink').href = listUrl(name);
  el('homeMapLink').href = mapUrl(name);
  el('homeDirectoryLink').textContent = name ? 'Vedi gli enti di ' + titleCase(name) : 'Apri la rubrica';
  el('homeSelection').innerHTML = name
    ? '<strong>' + escapeHtml(titleCase(name)) + '</strong><p>' + countLabel(municipalityCount(name)) + ' nella rubrica</p>'
    : "<p>Seleziona il tuo comune sulla mappa o nell'elenco.</p>";
  renderHomeNeeds(name);
  focusArea(name);
}
function initHome() {
  optionsFor(el('homeMunicipality'), state.data.municipalities, 'Seleziona un comune');
  el('homeMunicipality').addEventListener('change', (event) => selectHomeMunicipality(event.target.value));
  initMap('homeMap', selectHomeMunicipality);
  const requested = new URLSearchParams(location.search).get('comune');
  if (state.data.municipalities.some((item) => item.name === requested)) selectHomeMunicipality(requested);
}
function selectMapMunicipality(name) {
  state.municipality = name;
  state.mapQuery = '';
  el('mapMunicipality').value = name;
  el('mapSearch').value = '';
  el('mapSearchWrap').hidden = !name;
  el('mapDirectoryLink').href = listUrl(name);
  el('mapSelection').innerHTML = name
    ? '<h2>' + escapeHtml(titleCase(name)) + '</h2>'
    : '<h2>Tutta la Pianura Est</h2><p>Seleziona un comune per vedere gli enti sulla mappa.</p>';
  focusArea(name);
  renderMapOrganisations();
  const url = new URL(location.href);
  if (name) url.searchParams.set('comune', name);
  else url.searchParams.delete('comune');
  url.searchParams.delete('ente');
  history.replaceState(null, '', url);
}
function renderMapOrganisations() {
  const list = el('mapResults');
  list.innerHTML = '';
  state.markers?.clearLayers();
  if (!state.municipality) return;
  const allRows = state.data.organisations.filter((org) => org.municipality === state.municipality).sort((a, b) => a.name.localeCompare(b.name, 'it'));
  const words = searchWords(state.mapQuery);
  const rows = state.mapQuery.trim() && !words.length ? [] : allRows.filter((org) => !words.length || matchScore(org, words));
  const located = rows.filter((org) => coordinates(org)).length;
  const summary = state.mapQuery.trim()
    ? countLabel(rows.length) + (rows.length === 1 ? ' trovato su ' : ' trovati su ') + allRows.length + '. ' + located + ' con posizione sulla mappa.'
    : countLabel(allRows.length) + ' in questo comune. ' + located + ' con posizione sulla mappa.';
  el('mapSelection').innerHTML = '<h2>' + escapeHtml(titleCase(state.municipality)) + '</h2><p>' + summary + '</p>';
  if (!rows.length) {
    list.innerHTML = '<p class="map-more-note">Nessun ente trovato. Prova un altro nome o servizio.</p>';
    return;
  }
  const markerById = new Map();
  rows.forEach((org) => {
    const point = coordinates(org);
    if (!point || !state.markers) return;
    const marker = L.circleMarker(point, { radius: 9, weight: 2, color: '#fff', fillColor: '#bd552f', fillOpacity: 1 }).addTo(state.markers);
    const popup = document.createElement('div');
    popup.className = 'marker-popup';
    const name = document.createElement('strong');
    name.textContent = org.name;
    const button = document.createElement('button');
    button.className = 'text-button';
    button.type = 'button';
    button.textContent = 'Apri la scheda';
    button.addEventListener('click', () => openDetails(org));
    popup.append(name, button);
    marker.bindPopup(popup);
    marker.on('click', () => marker.openPopup());
    markerById.set(org.id, marker);
  });
  rows.forEach((org) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'map-result';
    button.innerHTML = '<strong>' + escapeHtml(org.name) + '</strong><span>' + escapeHtml(org.category || 'Categoria non indicata') + '</span>';
    button.addEventListener('click', () => {
      const marker = markerById.get(org.id);
      if (marker) { state.map.flyTo(marker.getLatLng(), 14); marker.openPopup(); }
      else openDetails(org);
    });
    list.append(button);
  });
  const requested = new URLSearchParams(location.search).get('ente');
  const target = markerById.get(requested);
  if (target) { state.map.flyTo(target.getLatLng(), 14); target.openPopup(); }
}
function initMapPage() {
  optionsFor(el('mapMunicipality'), state.data.municipalities, 'Tutti i comuni');
  el('mapMunicipality').addEventListener('change', (event) => selectMapMunicipality(event.target.value));
  el('mapSearch').addEventListener('input', (event) => { state.mapQuery = event.target.value; renderMapOrganisations(); });
  initMap('map', selectMapMunicipality);
  const requested = new URLSearchParams(location.search).get('comune');
  if (state.data.municipalities.some((item) => item.name === requested)) selectMapMunicipality(requested);
}
function searchWords(value) {
  const ignored = new Set(['per', 'con', 'che', 'del', 'della', 'delle', 'dei', 'sono', 'cerco', 'cerca', 'servizio', 'servizi', 'un', 'una', 'nel', 'nella', 'alle', 'alla', 'agli', 'dello', 'vorrei', 'bisogno', 'vicino', 'aiuto', 'serve']);
  return normalize(value).split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !ignored.has(word));
}
function interpretedQuery() {
  const raw = normalize(state.query);
  if (state.municipality) return { municipality: state.municipality, inferred: '', words: searchWords(raw) };
  const match = [...state.data.municipalities].sort((a, b) => b.name.length - a.name.length).find((item) => {
    const name = normalize(item.name);
    const index = raw.indexOf(name);
    return index !== -1 && (index === 0 || !/[a-z0-9]/.test(raw[index - 1])) &&
      (index + name.length === raw.length || !/[a-z0-9]/.test(raw[index + name.length]));
  });
  if (!match) return { municipality: '', inferred: '', words: searchWords(raw) };
  const name = normalize(match.name);
  const index = raw.indexOf(name);
  return { municipality: match.name, inferred: match.name, words: searchWords(raw.slice(0, index) + ' ' + raw.slice(index + name.length)) };
}
function matchScore(org, words) {
  if (!words.length) return 1;
  const name = normalize(org.name);
  const municipality = normalize(org.municipality);
  const category = normalize(org.category);
  const services = normalize(org.services.map(serviceLabel).join(' ') + ' ' + org.services.join(' '));
  const activity = normalize(org.activity);
  let found = 0;
  let score = 0;
  words.forEach((word) => {
    if (name.includes(word)) { score += 8; found++; }
    else if (services.includes(word)) { score += 6; found++; }
    else if (municipality.includes(word)) { score += 4; found++; }
    else if (category.includes(word)) { score += 3; found++; }
    else if (activity.includes(word)) { score += 1; found++; }
  });
  return found ? score + (found === words.length ? 10 : 0) : 0;
}
function profileQuality(org) {
  return (org.municipality ? 2 : 0) + (org.activity ? 1 : 0) +
    (org.email ? 1 : 0) + (safeUrl(org.links?.website) ? 1 : 0);
}
function getDirectoryResults() {
  const { words, municipality } = interpretedQuery();
  if (state.query.trim() && !words.length && !municipality && !state.category && !state.services.size) return [];
  return state.data.organisations.map((org) => ({ org, score: matchScore(org, words) })).filter(({ org, score }) => {
    if (words.length && !score) return false;
    if (municipality && org.municipality !== municipality) return false;
    if (state.category && org.category !== state.category) return false;
    if (state.services.size && ![...state.services].some((service) => org.services.includes(service))) return false;
    return true;
  }).sort((a, b) => {
    if (state.sort === 'name') return a.org.name.localeCompare(b.org.name, 'it');
    if (state.sort === 'municipality') return a.org.municipality.localeCompare(b.org.municipality, 'it') || a.org.name.localeCompare(b.org.name, 'it');
    return b.score - a.score || profileQuality(b.org) - profileQuality(a.org) || a.org.name.localeCompare(b.org.name, 'it');
  }).map(({ org }) => org);
}
function hasSearch() { return Boolean(state.query.trim() || state.municipality || state.category || state.services.size); }
function renderActiveFilters() {
  const holder = el('activeFilters');
  holder.innerHTML = '';
  const inferred = interpretedQuery().inferred;
  const filters = [
    ...(state.municipality ? [{ label: 'Comune: ' + titleCase(state.municipality), clear: () => { state.municipality = ''; el('municipalityFilter').value = ''; } }] : []),
    ...(inferred ? [{ label: 'Comune: ' + titleCase(inferred), clear: () => {
      const remaining = state.query.replace(new RegExp(inferred.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ').replace(/\s+/g, ' ').trim().replace(/\s+\b(a|ad|di|in|nel)\b$/i, '');
      state.query = searchWords(remaining).length ? remaining : '';
      syncDirectoryInputs();
    } }] : []),
    ...(state.category ? [{ label: 'Categoria: ' + state.category, clear: () => { state.category = ''; el('categoryFilter').value = ''; } }] : []),
    ...[...state.services].map((service) => ({ label: 'Servizio: ' + serviceLabel(service), clear: () => { state.services.delete(service); syncServiceInputs(); } })),
  ];
  filters.forEach((filter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'active-chip';
    button.textContent = filter.label + ' ×';
    button.setAttribute('aria-label', 'Rimuovi filtro ' + filter.label);
    button.addEventListener('click', () => { filter.clear(); state.visible = pageSize; renderDirectory(); });
    holder.append(button);
  });
  el('filterCount').hidden = !filters.length;
  el('filterCount').textContent = filters.length;
  el('resetSearch').hidden = !hasSearch();
}
function renderDirectory() {
  const active = hasSearch();
  el('discovery').hidden = active;
  el('resultsSection').hidden = !active;
  renderActiveFilters();
  if (!active) {
    el('filterApply').textContent = 'Mostra risultati';
    renderRecent();
    renderSavedProfiles();
    return;
  }
  const rows = getDirectoryResults();
  el('resultCount').textContent = countLabel(rows.length);
  el('filterApply').textContent = 'Mostra ' + countLabel(rows.length);
  const list = el('resultsList');
  list.innerHTML = '';
  if (!rows.length) {
    const tooShort = state.query.trim() && !interpretedQuery().words.length && !interpretedQuery().municipality && !state.category && !state.services.size;
    list.innerHTML = tooShort
      ? '<div class="empty-results"><h3>Scrivi una parola più precisa</h3><p>Inserisci almeno tre lettere del nome o del servizio.</p></div>'
      : '<div class="empty-results"><h3>Nessun ente trovato</h3><p>Prova con una parola più breve o togli un filtro.</p><button id="emptyReset" class="button-secondary" type="button">Cancella ricerca e filtri</button></div>';
    el('emptyReset')?.addEventListener('click', () => el('resetSearch').click());
  }
  rows.slice(0, state.visible).forEach((org) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'result-item';
    const summary = org.activity
      ? org.activity.slice(0, 180) + (org.activity.length > 180 ? '…' : '')
      : org.services.length ? 'Servizi: ' + org.services.slice(0, 2).map(serviceLabel).join(', ') : 'Descrizione non disponibile.';
    button.innerHTML = '<span class="result-meta">' + escapeHtml(titleCase(org.municipality || 'Comune non indicato')) + ' · ' + escapeHtml(org.category || 'Categoria non indicata') + '</span><strong>' + escapeHtml(org.name) + '</strong><span class="result-summary">' + escapeHtml(summary) + '</span><span class="result-action">Apri la scheda →</span>';
    button.addEventListener('click', () => openDetails(org));
    list.append(button);
  });
  el('loadMore').hidden = rows.length <= state.visible;
}
function syncServiceInputs() {
  el('servicesList').querySelectorAll('input').forEach((input) => { input.checked = state.services.has(input.value); });
}
function recentSearches() {
  try {
    const value = JSON.parse(localStorage.getItem(searchStoreKey) || '[]');
    return Array.isArray(value) ? value.slice(0, 5) : [];
  } catch { return []; }
}
function rememberSearch() {
  if (!hasSearch()) return;
  const entry = { query: state.query.trim(), municipality: state.municipality, category: state.category, services: [...state.services] };
  const all = [entry, ...recentSearches().filter((item) => JSON.stringify(item) !== JSON.stringify(entry))].slice(0, 5);
  try { localStorage.setItem(searchStoreKey, JSON.stringify(all)); } catch { /* Storage can be disabled. */ }
}
function renderRecent() {
  const rows = recentSearches();
  el('recentSearches').hidden = !rows.length;
  const list = el('recentList');
  list.innerHTML = '';
  rows.forEach((item) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'recent-entry';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'recent-button';
    button.textContent = [item.query, item.municipality && titleCase(item.municipality), item.category, ...(item.services || []).map(serviceLabel)].filter(Boolean).join(' · ');
    button.addEventListener('click', () => {
      state.query = item.query || '';
      state.municipality = item.municipality || '';
      state.category = item.category || '';
      state.services = new Set(item.services || []);
      state.visible = pageSize;
      syncDirectoryInputs();
      renderDirectory();
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'recent-remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Rimuovi ricerca ' + button.textContent);
    remove.addEventListener('click', () => {
      try { localStorage.setItem(searchStoreKey, JSON.stringify(recentSearches().filter((entry) => JSON.stringify(entry) !== JSON.stringify(item)))); } catch { /* Storage can be disabled. */ }
      renderRecent();
    });
    wrapper.append(button, remove);
    list.append(wrapper);
  });
}
function syncDirectoryInputs() {
  el('searchInput').value = state.query;
  el('municipalityFilter').value = state.municipality;
  el('categoryFilter').value = state.category;
  syncServiceInputs();
}
function renderSavedProfiles() {
  const section = el('savedProfiles');
  if (!section) return;
  const rows = state.data.organisations.filter((org) => state.savedIds.has(org.id)).sort((a, b) => a.name.localeCompare(b.name, 'it'));
  section.hidden = !rows.length;
  const list = el('savedList');
  list.innerHTML = '';
  rows.forEach((org) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'saved-profile';
    button.innerHTML = '<strong>' + escapeHtml(org.name) + '</strong><span>' + escapeHtml(titleCase(org.municipality || 'Comune non indicato')) + '</span>';
    button.addEventListener('click', () => openDetails(org));
    list.append(button);
  });
}
function filterServiceOptions() {
  const needle = normalize(el('serviceSearch').value);
  let visible = 0;
  el('servicesList').querySelectorAll('.service-choice').forEach((label) => {
    label.hidden = Boolean(needle) && !normalize(label.textContent + ' ' + label.title).includes(needle);
    if (!label.hidden) visible++;
  });
  el('serviceSearchStatus').hidden = Boolean(visible);
}
function initDirectory() {
  optionsFor(el('municipalityFilter'), state.data.municipalities, 'Tutti i comuni');
  optionsFor(el('categoryFilter'), state.data.categories, 'Tutte le categorie');
  const services = state.data.services.filter((item) => item.count > 0).sort((a, b) => a.name.localeCompare(b.name, 'it'));
  services.forEach((item) => {
    const label = document.createElement('label');
    label.className = 'service-choice';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = item.name;
    input.addEventListener('change', () => {
      if (input.checked) state.services.add(item.name);
      else state.services.delete(item.name);
      state.visible = pageSize;
      renderDirectory();
    });
    const text = document.createElement('span');
    text.className = 'service-choice-copy';
    const name = document.createElement('span');
    name.textContent = serviceLabel(item.name);
    text.append(name);
    if (item.definition) {
      const description = document.createElement('small');
      description.textContent = item.definition;
      text.append(description);
    }
    label.append(input, text);
    el('servicesList').append(label);
  });
  needs.forEach((need) => {
    if (!services.some((item) => item.name === need.service)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'need-button';
    button.textContent = need.label;
    button.addEventListener('click', () => {
      state.query = '';
      state.services = new Set([need.service]);
      state.visible = pageSize;
      syncDirectoryInputs();
      rememberSearch();
      renderDirectory();
    });
    el('quickNeeds').append(button);
  });
  const params = new URLSearchParams(location.search);
  const municipality = params.get('comune');
  state.municipality = state.data.municipalities.some((item) => item.name === municipality) ? municipality : '';
  state.query = params.get('q') || '';
  const requestedService = params.get('servizio');
  if (services.some((item) => item.name === requestedService)) state.services.add(requestedService);
  syncDirectoryInputs();
  let searchTimer;
  el('searchInput').addEventListener('input', (event) => {
    state.query = event.target.value;
    state.visible = pageSize;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderDirectory, 180);
  });
  el('searchForm').addEventListener('submit', (event) => {
    event.preventDefault();
    clearTimeout(searchTimer);
    state.query = el('searchInput').value;
    rememberSearch();
    renderDirectory();
  });
  el('openFilters').addEventListener('click', () => el('filterDialog').showModal());
  el('serviceSearch').addEventListener('input', filterServiceOptions);
  el('municipalityFilter').addEventListener('change', (event) => { state.municipality = event.target.value; state.visible = pageSize; renderDirectory(); });
  el('categoryFilter').addEventListener('change', (event) => { state.category = event.target.value; state.visible = pageSize; renderDirectory(); });
  el('clearFilters').addEventListener('click', () => {
    state.municipality = '';
    state.category = '';
    state.services.clear();
    state.visible = pageSize;
    syncDirectoryInputs();
    renderDirectory();
  });
  el('resetSearch').addEventListener('click', () => {
    state.query = '';
    state.municipality = '';
    state.category = '';
    state.services.clear();
    state.visible = pageSize;
    syncDirectoryInputs();
    renderDirectory();
    el('searchInput').focus();
  });
  el('sortSelect').addEventListener('change', (event) => { state.sort = event.target.value; state.visible = pageSize; renderDirectory(); });
  el('loadMore').addEventListener('click', () => { state.visible += pageSize; renderDirectory(); });
  el('clearRecent').addEventListener('click', () => { localStorage.removeItem(searchStoreKey); renderRecent(); });
  renderDirectory();
  const requestedProfile = state.data.organisations.find((org) => org.id === params.get('ente'));
  if (requestedProfile) openDetails(requestedProfile);
}
function initContact() {
  el('contactForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const status = el('contactStatus');
    button.disabled = true;
    status.textContent = 'Invio in corso…';
    try {
      const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Request failed');
      form.reset();
      status.textContent = 'Segnalazione inviata. Grazie, ti ricontatteremo se servono altre informazioni.';
    } catch {
      status.textContent = 'Invio non riuscito. Riprova tra qualche minuto.';
    } finally { button.disabled = false; }
  });
}
async function init() {
  setupDialog(el('filterDialog'));
  setupDialog(el('detailDialog'));
  if (page === 'contact') { initContact(); return; }
  try {
    const requests = [fetch('data/organisations.json')];
    if (page === 'home' || page === 'map') requests.push(fetch('data/municipalities.geojson'));
    const responses = await Promise.all(requests);
    if (responses.some((response) => !response.ok)) throw new Error('Data unavailable');
    state.data = await responses[0].json();
    state.data.organisations.forEach((org) => { if (!Array.isArray(org.services)) org.services = []; });
    loadSavedProfiles();
    if (responses[1]) state.boundaries = await responses[1].json();
    if (page === 'home') initHome();
    if (page === 'directory') initDirectory();
    if (page === 'map') initMapPage();
  } catch (error) {
    console.error(error);
    const target = el('resultsList') || el('homeSelection') || el('mapSelection');
    if (target) target.innerHTML = '<p>Impossibile caricare i dati. Ricarica la pagina tra poco.</p>';
  }
}
init();
