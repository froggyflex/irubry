const page = document.body.dataset.page;
const searchStoreKey = 'pianura-est-recent-searches-v2';
const savedStoreKey = 'pianura-est-saved-profiles-v1';
const pageSize = 10;
const needs = [
  { label: 'Cibo e beni di prima necessità', service: 'Assistenza alimentare e materiale', description: 'Pacchi viveri, mense, vestiario', icon: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M8 8a4 4 0 0 1 8 0"/>' },
  { label: 'Assistenza anziani', service: 'Assist. Anziani', description: 'Compagnia, assistenza a domicilio, centri diurni', icon: '<circle cx="12" cy="7" r="2.5"/><path d="M7 20c.5-4 2.2-6 5-6s4.5 2 5 6"/>' },
  { label: 'Disabilità e fragilità', service: 'Supporto disabilità', description: 'Sostegno a persone e famiglie', icon: '<circle cx="12" cy="5" r="2"/><path d="M12 8v7m0 0-4 5m4-5 4 5M8 11h8"/>' },
  { label: 'Trasporto e accompagn.', service: 'Trasporto sociale e sanitario', description: 'Visite mediche, spostamenti, trasporto protetto', icon: '<path d="M4 16h16M6 16V9h12v7M8 19h2m6 0h2M7 9l1-3h8l1 3"/>' },
  { label: 'Minori e doposcuola', service: 'Doposcuola', description: 'Aiuto compiti, centri estivi, oratori', icon: '<rect x="5" y="5" width="14" height="14" rx="1"/><path d="M8 9h8m-8 3h5"/>' },
  { label: 'Emergenza e soccorso', service: 'Soccorso ed emergenza', description: 'Protezione civile, pronto intervento', icon: '<path d="M12 21s7-4 7-10V5l-7-2-7 2v6c0 6 7 10 7 10Z"/><path d="M9 12h6m-3-3v6"/>' },
  { label: 'Animali', service: 'Tutela Animali', description: 'Tutela e cura degli animali', icon: '<circle cx="8" cy="8" r="2"/><circle cx="16" cy="8" r="2"/><path d="M7 14c1.2-2 2.8-3 5-3s3.8 1 5 3c0 3-2 5-5 5s-5-2-5-5Z"/>' },
  { label: 'Eventi e tradizioni', service: 'Organizzazione eventi e tradizioni', description: 'Attività, feste e iniziative locali', icon: '<rect x="5" y="6" width="14" height="14" rx="1"/><path d="M8 3v6m8-6v6M5 10h14"/>' },
];
const state = { data: null, boundaries: null, municipality: '', category: '', services: new Set(), savedIds: new Set(), query: '', mapQuery: '', mapFocusId: '', relatedMode: 'servizi', mapFilters: { services: '', category: '' }, mapFilterOrder: ['services', 'category'], sort: 'relevance', visible: pageSize, map: null, areas: null, markers: null };
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
function categoryPresentation(category) {
  const value = normalize(category);
  if (value.includes('assistenza') || value.includes('inclusione')) return { className: 'assistenza', icon: '<circle cx="9" cy="8.5" r="2.6"/><circle cx="15.8" cy="8.5" r="2.2"/><path d="M3.8 18.4c.6-3.2 2.8-5 5.8-5s5.2 1.8 5.8 5"/><path d="M12.8 18.4c.6-2.7 2.5-4.1 5-4.1 1.2 0 2.1.3 3.2.8"/>' };
  if (value.includes('sanita') || value.includes('soccorso') || value.includes('protezione')) return { className: 'sanit', icon: '<path d="M12 21s-7-4.35-7-10.2A4.3 4.3 0 0 1 9.3 6c1.18 0 2.21.47 2.7 1.27C12.49 6.47 13.52 6 14.7 6A4.3 4.3 0 0 1 19 10.8C19 16.65 12 21 12 21Z"/>' };
  if (value.includes('cultura') || value.includes('arte') || value.includes('spettacolo')) return { className: 'cultura', icon: '<path d="M12 4.5a8.5 8.5 0 1 0 0 17h1.2c1.1 0 1.8-1.3 1.2-2.2-.6-.9.1-2 1.2-2h2.1A4.3 4.3 0 0 0 22 13c0-4.7-4.5-8.5-10-8.5Z"/><circle cx="7.5" cy="12" r="1"/><circle cx="10.5" cy="8.5" r="1"/><circle cx="15" cy="8" r="1"/><circle cx="18" cy="11" r="1"/>' };
  if (value.includes('educazione') || value.includes('infanzia') || value.includes('giovani')) return { className: 'educazione', icon: '<path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z"/><path d="M7.5 10.5v4.2c1.8 1.7 6.7 1.7 8.5 0v-4.2"/><path d="M20 8.5v7.2"/>' };
  if (value.includes('ambiente') || value.includes('animali')) return { className: 'ambiente', icon: '<path d="M19 4C11 4 6 7.8 6 13.5 6 17.1 8.7 20 12 20c4.4 0 7-4.1 7-9.2V4Z"/><path d="M5 20c1.8-4.2 5-7.2 10-9"/>' };
  if (value.includes('sport') || value.includes('benessere')) return { className: 'sport', icon: '<circle cx="12" cy="5.5" r="2.2"/><path d="M9 17.5l1.8-5.2L7 10.5l2.2-4.3 2.8 1.8 2.8-1.8 2.2 4.3-3.8 1.8 1.8 5.2"/><path d="M5.2 13.3 3.5 16M18.8 13.3l1.7 2.7"/>' };
  return { className: 'aggregazione', icon: '<path d="M5 9.5h12v5.7A3.8 3.8 0 0 1 13.2 19H8.8A3.8 3.8 0 0 1 5 15.2V9.5Z"/><path d="M17 11.5h1.2a2.8 2.8 0 0 1 0 5.6H17"/><path d="M3.5 20h15"/>' };
}
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
function showInfo(text) {
  const dialog = el('infoDialog');
  const target = el('infoText');
  if (!dialog || !target || !text) return;
  target.textContent = text;
  dialog.showModal();
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
  if (page === 'directory') {
    renderSavedProfiles();
    renderRecent();
  }
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
    if (url) contacts.push('<a class="social-link social-' + type + '" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + titleCase(type) + ' ↗</a>');
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
  if (page === 'map') {
    state.markers = L.layerGroup().addTo(state.map);
    state.map.on('zoomend', updateMapMarkerVisibility);
  }
}
function updateMapMarkerVisibility() {
  if (!state.map || !state.markers) return;
  const visible = state.map.getZoom() >= 12;
  state.markers.eachLayer((marker) => marker.setOpacity(visible ? 1 : 0));
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
  if (!section || !list) return;
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
  const municipalitySelect = el('homeMunicipality');
  if (municipalitySelect) municipalitySelect.value = name;
  const directoryLink = el('homeDirectoryLink');
  if (directoryLink) {
    directoryLink.href = listUrl(name);
    directoryLink.textContent = name ? 'Vedi gli enti di ' + titleCase(name) : 'Apri la rubrica';
  }
  const mapLink = el('homeMapLink');
  if (mapLink) mapLink.href = mapUrl(name);
  const selection = el('homeSelection');
  if (selection) selection.innerHTML = name
    ? '<strong>' + escapeHtml(titleCase(name)) + '</strong><p>' + countLabel(municipalityCount(name)) + ' nella rubrica</p>'
    : "<p>Seleziona il tuo comune sulla mappa o nell'elenco.</p>";
  renderHomeNeeds(name);
  focusArea(name);
}
function initHome() {
  const municipalitySelect = el('homeMunicipality');
  if (municipalitySelect) {
    optionsFor(municipalitySelect, state.data.municipalities, 'Seleziona un comune');
    municipalitySelect.addEventListener('change', (event) => selectHomeMunicipality(event.target.value));
  }
  initMap('homeMap', selectHomeMunicipality);
  updateHomeIntroBlocks();
  const homeImage = document.querySelector('.home-map-image');
  if (homeImage) homeImage.addEventListener('load', updateHomeIntroBlocks, { once: true });
  window.addEventListener('resize', updateHomeIntroBlocks);
  setupAudienceCarousel();
  const requested = new URLSearchParams(location.search).get('comune');
  if (state.data.municipalities.some((item) => item.name === requested)) selectHomeMunicipality(requested);
}
function setupAudienceCarousel() {
  const viewport = document.querySelector('.audience-viewport');
  const previous = el('audiencePrevious');
  const next = el('audienceNext');
  if (!viewport || !previous || !next) return;
  const update = () => {
    const hasOverflow = viewport.scrollWidth > viewport.clientWidth + 1;
    previous.hidden = !hasOverflow;
    next.hidden = !hasOverflow;
    previous.disabled = !hasOverflow || viewport.scrollLeft <= 1;
    next.disabled = !hasOverflow || viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 1;
  };
  const scroll = (direction) => {
    viewport.scrollBy({ left: direction * viewport.clientWidth, behavior: 'smooth' });
    window.setTimeout(update, 350);
  };
  previous.addEventListener('click', () => scroll(-1));
  next.addEventListener('click', () => scroll(1));
  viewport.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  requestAnimationFrame(update);
}
function updateHomeIntroBlocks() {
  const image = document.querySelector('.home-map-image');
  const copy = document.querySelector('.home-welcome-copy');
  if (!image || !copy || window.innerWidth <= 700) return;
  const blocks = [...copy.querySelectorAll(':scope > .intro-block')];
  blocks.forEach((block) => block.classList.remove('is-side', 'is-full'));
  const imageBottom = image.getBoundingClientRect().bottom;
  blocks.forEach((block) => {
    block.classList.add(block.getBoundingClientRect().top < imageBottom ? 'is-side' : 'is-full');
  });
}
function selectMapMunicipality(name) {
  state.municipality = name;
  state.mapQuery = '';
  state.mapFocusId = '';
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
  state.map?.closePopup();
  state.markers?.clearLayers();
  const allRows = state.data.organisations.filter((org) => {
    if (state.municipality && org.municipality !== state.municipality) return false;
    if (state.mapFilters.category && org.category !== state.mapFilters.category) return false;
    if (state.mapFilters.services && !org.services.includes(state.mapFilters.services)) return false;
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name, 'it'));
  const words = searchWords(state.mapQuery);
  let rows = state.mapQuery.trim() && !words.length ? [] : allRows.filter((org) => !words.length || matchScore(org, words));
  const requestedId = state.mapFocusId || new URLSearchParams(location.search).get('ente');
  const selectedOrg = rows.find((org) => String(org.id) === String(requestedId));
  if (selectedOrg) rows = [selectedOrg, ...rows.filter((org) => org.id !== selectedOrg.id)];
  const displayRows = selectedOrg && state.relatedMode !== 'all'
    ? [selectedOrg, ...rows.filter((org) => org.id !== selectedOrg.id).sort((a, b) => relatedScore(selectedOrg, a, state.relatedMode) - relatedScore(selectedOrg, b, state.relatedMode))]
    : rows;
  const located = rows.filter((org) => coordinates(org)).length;
  const summary = state.mapQuery.trim()
    ? countLabel(rows.length) + (rows.length === 1 ? ' trovato su ' : ' trovati su ') + allRows.length + '. ' + located + ' con posizione sulla mappa.'
    : state.municipality
      ? countLabel(allRows.length) + ' in questo comune. ' + located + ' con posizione sulla mappa.'
      : countLabel(allRows.length) + ' nella Pianura Est. ' + located + ' con posizione sulla mappa.';
  el('mapSelection').innerHTML = '<div class="map-selection-title"><h2>' + escapeHtml(state.municipality ? titleCase(state.municipality) : 'Tutta la Pianura Est') + '</h2><button class="need-info map-selection-info" type="button" aria-label="Mostra informazioni sulla selezione">i</button></div>';
  el('mapSelection').querySelector('.map-selection-info').addEventListener('click', () => showInfo(summary + ' Gli enti con una posizione geografica sono indicati sulla mappa. Seleziona un ente per visualizzare i servizi correlati.'));
  if (!rows.length) {
    list.innerHTML = '<p class="map-more-note">Nessun ente trovato. Prova un altro nome o servizio.</p>';
    return;
  }
  const markerById = new Map();
  rows.forEach((org) => {
    const point = coordinates(org);
    if (!point || !state.markers) return;
    const presentation = categoryPresentation(org.category);
    const marker = L.marker(point, {
      icon: L.divIcon({
        className: 'map-marker-wrapper ' + presentation.className,
        html: '<span class="map-marker' + (selectedOrg && org.id === selectedOrg.id ? ' is-selected' : '') + '" title="' + escapeHtml(org.category || 'Categoria non indicata') + '"><span class="map-marker-icon"><svg viewBox="0 0 24 24" aria-hidden="true">' + presentation.icon + '</svg></span></span>',
        iconSize: [38, 46],
        iconAnchor: [19, 46],
        popupAnchor: [0, -42],
      }),
      title: org.name,
    }).addTo(state.markers);
    const popup = document.createElement('div');
    popup.className = 'marker-popup';
    const name = document.createElement('strong');
    name.textContent = org.name;
    const button = document.createElement('button');
    button.className = 'text-button';
    button.type = 'button';
    button.textContent = 'Apri la scheda';
    button.addEventListener('click', () => { selectMapOrganisation(org); openDetails(org); });
    popup.append(name, button);
    marker.bindPopup(popup);
    marker.on('click', () => selectMapOrganisation(org, false));
    markerById.set(org.id, marker);
  });
  updateMapMarkerVisibility();
  const appendResult = (org) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'map-result' + (selectedOrg && org.id === selectedOrg.id ? ' is-selected' : '') + (!coordinates(org) ? ' has-no-address' : '');
    button.innerHTML = '<strong>' + escapeHtml(org.name) + '</strong><span>' + escapeHtml(org.category || 'Categoria non indicata') + '</span>' +
      (!coordinates(org) ? '<span class="map-address-status" title="Indirizzo non disponibile" aria-label="Indirizzo non disponibile"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2"/><path d="m4 4 16 16"/></svg></span>' : '');
    button.addEventListener('click', () => {
      if (!coordinates(org)) showInfo('Indirizzo non disponibile per questo ente. La mappa verrà centrata sul comune di appartenenza.');
      selectMapOrganisation(org);
    });
    list.append(button);
  };
  if (selectedOrg) {
    const related = displayRows.filter((org) => org.id !== selectedOrg.id);
    appendResult(selectedOrg);
    if (related.length) {
      const heading = document.createElement('h3');
      heading.className = 'map-related-title';
      heading.textContent = 'Enti correlati per:';
      list.append(heading);
      const modes = document.createElement('div');
      modes.className = 'map-related-modes';
      ['servizi', 'categoria', 'vicinanza'].forEach((mode) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'map-related-mode' + (state.relatedMode === mode ? ' is-active' : '');
        button.textContent = mode[0].toLocaleUpperCase('it') + mode.slice(1);
        button.addEventListener('click', () => { state.relatedMode = mode; renderMapOrganisations(); });
        modes.append(button);
      });
      list.append(modes);
      related.forEach(appendResult);
    }
  } else rows.forEach(appendResult);
  const target = markerById.get(selectedOrg?.id);
  if (target) { state.map.flyTo(target.getLatLng(), selectedMapZoom(selectedOrg, allRows)); target.openPopup(); }
}
function selectedMapZoom(selected, rows) {
  if (!selected) return 14;
  const point = coordinates(selected);
  if (!point) return 14;
  const nearby = rows.filter((org) => {
    const other = coordinates(org);
    return other && org.id !== selected.id && Math.hypot(point[0] - other[0], point[1] - other[1]) < 0.02;
  }).length;
  return nearby >= 3 ? 16 : 14;
}
function relatedScore(selected, org, mode) {
  if (mode === 'categoria') return org.category === selected.category ? 0 : 1;
  if (mode === 'vicinanza') {
    const a = coordinates(selected);
    const b = coordinates(org);
    return a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : 999;
  }
  return org.services.some((service) => selected.services.includes(service)) ? 0 : 1;
}
function selectMapOrganisation(org, updateUrl = true) {
  state.mapFocusId = org.id;
  state.relatedMode = 'servizi';
  if (!coordinates(org)) {
    state.municipality = org.municipality;
    state.mapQuery = '';
    el('mapMunicipality').value = org.municipality;
    el('mapSearch').value = '';
    el('mapSearchWrap').hidden = false;
    el('mapDirectoryLink').href = listUrl(org.municipality);
    focusArea(org.municipality);
  }
  if (updateUrl) {
    const url = new URL(location.href);
    url.searchParams.set('ente', org.id);
    history.replaceState(null, '', url);
  }
  renderMapOrganisations();
  const marker = state.markers?.getLayers().find((item) => item.options.title === org.name);
  if (marker && state.map) {
    const zoom = selectedMapZoom(org, state.data.organisations);
    state.map.flyTo(marker.getLatLng(), zoom, { duration: .8 });
    marker.setOpacity(1);
    marker.openPopup();
  }
}
function initMapPage() {
  optionsFor(el('mapMunicipality'), state.data.municipalities, 'Tutti i comuni');
  el('mapMunicipality').addEventListener('change', (event) => selectMapMunicipality(event.target.value));
  el('mapSearch').addEventListener('input', (event) => { state.mapQuery = event.target.value; renderMapOrganisations(); });
  setupMapFilters();
  initMap('map', selectMapMunicipality);
  renderMapOrganisations();
  const requested = new URLSearchParams(location.search).get('comune');
  const requestedOrg = new URLSearchParams(location.search).get('ente');
  if (requestedOrg) state.mapFocusId = requestedOrg;
  if (state.data.municipalities.some((item) => item.name === requested)) selectMapMunicipality(requested);
  const initialOrg = state.data.organisations.find((org) => String(org.id) === String(requestedOrg));
  if (initialOrg && initialOrg.municipality === state.municipality) {
    state.mapFocusId = initialOrg.id;
    const url = new URL(location.href);
    url.searchParams.set('ente', initialOrg.id);
    history.replaceState(null, '', url);
    renderMapOrganisations();
  }
  function setupMapFilters() {
    const toggle = el('mapFilterToggle');
    const panel = el('mapFilterPanel');
    const options = el('mapFilterOptions');
    if (!toggle || !panel || !options) return;
    toggle.addEventListener('click', () => {
      const open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    });
    const renderFilterButtons = () => {
      panel.querySelectorAll('[data-map-filter]').forEach((button) => {
        const type = button.dataset.mapFilter;
        button.classList.toggle('is-active', Boolean(state.mapFilters[type]));
        button.textContent = type === 'services' ? 'Servizi' : 'Categoria';
      });
      [...panel.querySelectorAll('[data-map-filter]')].sort((a, b) => state.mapFilterOrder.indexOf(a.dataset.mapFilter) - state.mapFilterOrder.indexOf(b.dataset.mapFilter)).forEach((button) => panel.append(button));
    };
    panel.querySelectorAll('[data-map-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        const type = button.dataset.mapFilter;
        state.mapFilterOrder = [type, ...state.mapFilterOrder.filter((item) => item !== type)];
        renderFilterButtons();
        const items = type === 'category' ? state.data.categories.map((item) => item.name) : state.data.services.filter((item) => item.count > 0).map((item) => item.name);
        options.innerHTML = '<button type="button" class="map-filter-clear">Tutti</button>' + items.map((item) => '<button type="button" data-map-value="' + escapeHtml(item) + '"' + (state.mapFilters[type] === item ? ' class="is-selected"' : '') + '>' + escapeHtml(type === 'category' ? item : serviceLabel(item)) + '</button>').join('');
        options.hidden = false;
        options.querySelector('.map-filter-clear').addEventListener('click', () => {
          state.mapFilters[type] = '';
          options.hidden = true;
          renderFilterButtons();
          renderMapOrganisations();
        });
        options.querySelectorAll('[data-map-value]').forEach((option) => option.addEventListener('click', () => {
          state.mapFilters[type] = option.dataset.mapValue;
          options.hidden = true;
          renderFilterButtons();
          renderMapOrganisations();
        }));
      });
    });
    renderFilterButtons();
  }
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
    const card = document.createElement('article');
    card.className = 'result-item';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'result-main';
    const summary = org.activity
      ? org.activity.slice(0, 180) + (org.activity.length > 180 ? '…' : '')
      : org.services.length ? 'Servizi: ' + org.services.slice(0, 2).map(serviceLabel).join(', ') : 'Descrizione non disponibile.';
    const category = categoryPresentation(org.category);
    const servicePills = org.services.length
      ? org.services.map((service) => '<span class="service-pill">' + escapeHtml(serviceLabel(service)) + '</span>').join('')
      : '<span class="service-pill service-pill-muted">Nessun servizio indicato</span>';
    card.classList.add('category-' + category.className);
    button.innerHTML = '<span class="result-category"><span class="result-meta">' + escapeHtml(titleCase(org.municipality || 'Comune non indicato')) + ' · ' + escapeHtml(org.category || 'Categoria non indicata') + '</span></span><strong>' + escapeHtml(org.name) + '</strong><span class="result-summary">' + escapeHtml(summary) + '</span><span class="result-services"><span class="category-icon"><svg viewBox="0 0 24 24" aria-hidden="true">' + category.icon + '</svg></span>' + servicePills + '</span>';
    button.addEventListener('click', () => openDetails(org));
    card.append(button);
    if (coordinates(org)) {
      const mapLink = document.createElement('a');
      mapLink.className = 'result-map-button';
      mapLink.href = organisationUrl(org);
      mapLink.title = 'Mostra sulla mappa';
      mapLink.setAttribute('aria-label', 'Mostra ' + org.name + ' sulla mappa');
      mapLink.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.3"/></svg>';
      card.append(mapLink);
    }
    list.append(card);
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
      const info = document.createElement('button');
      info.type = 'button';
      info.className = 'need-info service-info';
      info.setAttribute('aria-label', 'Mostra descrizione di ' + serviceLabel(item.name));
      info.textContent = 'i';
      info.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        showInfo(item.definition);
      });
      label.append(info);
    }
    label.append(input, text);
    el('servicesList').append(label);
  });
  needs.forEach((need) => {
    if (!services.some((item) => item.name === need.service)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'need-button';
    const service = services.find((item) => item.name === need.service);
    button.title = need.description;
    button.innerHTML = '<span class="need-card-top"><span class="need-icon"><svg viewBox="0 0 24 24" aria-hidden="true">' + need.icon + '</svg></span><strong>' + escapeHtml(service ? service.count : 0) + ' enti</strong></span><span class="need-card-label">' + escapeHtml(need.label) + '</span><small>' + escapeHtml(need.description) + '</small><span class="need-info" aria-hidden="true">i</span>';
    button.querySelector('.need-info').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      showInfo(need.description);
    });
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
  const needsViewport = document.querySelector('.need-viewport');
  const previousNeeds = el('needsPrevious');
  const nextNeeds = el('needsNext');
  const updateNeedsArrows = () => {
    if (!needsViewport || !previousNeeds || !nextNeeds) return;
    previousNeeds.disabled = needsViewport.scrollLeft <= 1;
    nextNeeds.disabled = needsViewport.scrollLeft + needsViewport.clientWidth >= needsViewport.scrollWidth - 1;
  };
  const scrollNeeds = (direction) => {
    if (!needsViewport) return;
    needsViewport.scrollBy({ left: direction * needsViewport.clientWidth, behavior: 'smooth' });
    window.setTimeout(updateNeedsArrows, 350);
  };
  previousNeeds?.addEventListener('click', () => scrollNeeds(-1));
  nextNeeds?.addEventListener('click', () => scrollNeeds(1));
  needsViewport?.addEventListener('scroll', updateNeedsArrows, { passive: true });
  window.addEventListener('resize', updateNeedsArrows);
  requestAnimationFrame(updateNeedsArrows);
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
  setupDialog(el('infoDialog'));
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
