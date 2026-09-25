const STORAGE_KEY = 'pianura-est-state-v1';

const state = {
  data: null,
  query: '',
  municipality: '',
  category: '',
  services: new Set(),
  sort: 'relevance',
  selectedId: null,
  priorityId: null,
};

const els = {
  totalRecords: document.querySelector('#totalRecords'),
  totalMunicipalities: document.querySelector('#totalMunicipalities'),
  searchInput: document.querySelector('#searchInput'),
  clearSearch: document.querySelector('#clearSearch'),
  municipalityFilter: document.querySelector('#municipalityFilter'),
  categoryFilter: document.querySelector('#categoryFilter'),
  municipalityTrigger: document.querySelector('#municipalityFilterTrigger'),
  categoryTrigger: document.querySelector('#categoryFilterTrigger'),
  municipalityMenu: document.querySelector('#municipalityFilterMenu'),
  categoryMenu: document.querySelector('#categoryFilterMenu'),
  quickNeeds: document.querySelector('#quickNeeds'),
  servicesList: document.querySelector('#servicesList'),
  clearServices: document.querySelector('#clearServices'),
  assistantReply: document.querySelector('#assistantReply'),
  assistantForm: document.querySelector('#assistantForm'),
  assistantInput: document.querySelector('#assistantInput'),
  resultCount: document.querySelector('#resultCount'),
  sortSelect: document.querySelector('#sortSelect'),
  activeFilters: document.querySelector('#activeFilters'),
  resultsList: document.querySelector('#resultsList'),
  detailsPanel: document.querySelector('.details-panel'),
  detailsEmpty: document.querySelector('#detailsEmpty'),
  detailsCard: document.querySelector('#detailsCard'),
  resultTemplate: document.querySelector('#resultTemplate'),
  contactForm: document.querySelector('#contactForm'),
  contactStatus: document.querySelector('#contactStatus'),
  contactName: document.querySelector('#contactName'),
  contactSurname: document.querySelector('#contactSurname'),
  contactOrganisation: document.querySelector('#contactOrganisation'),
  contactEmail: document.querySelector('#contactEmail'),
  contactMessage: document.querySelector('#contactMessage'),
  filtersPanel: document.querySelector('.filters-panel'),
  filtersToggle: document.querySelector('#toggleFilters'),
  appShell: document.querySelector('.app-shell'),
};

const quickNeeds = [
  { label: 'Anziani', service: 'Assist. Anziani', query: 'anziani' },
  { label: 'Disabilità', service: 'Supporto disabilità', query: 'disabilità' },
  { label: 'Pacchi alimentari', service: 'Assistenza alimentare e materiale', query: 'alimentare' },
  { label: 'Trasporto', service: 'Trasporto sociale e sanitario', query: 'trasporto' },
  { label: 'Doposcuola', service: 'Doposcuola', query: 'doposcuola' },
  { label: 'Emergenza', service: 'Soccorso ed emergenza', query: 'emergenza' },
  { label: 'Animali', service: 'Tutela Animali', query: 'animali' },
  { label: 'Eventi', service: 'Organizzazione eventi e tradizioni', query: 'eventi' },
];

const stopWords = new Set([
  'a',
  'ad',
  'al',
  'alla',
  'con',
  'cerca',
  'cerco',
  'che',
  'di',
  'ho',
  'il',
  'in',
  'la',
  'mi',
  'per',
  'serve',
  'servizio',
  'servizi',
  'su',
  'trovare',
  'un',
  'una',
  'vorrei',
]);

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function searchTerms(value) {
  return normalize(value)
    .split(/\s+/)
    .map((term) => term.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''))
    .filter((term) => term.length > 2 && !stopWords.has(term));
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function hasYes(value) {
  return normalize(value) === 'si' || normalize(value) === 'yes';
}

function serviceText(services) {
  if (!services.length) return 'Nessun servizio specifico indicato';
  if (services.length <= 3) return services.join(', ');
  return `${services.slice(0, 3).join(', ')} +${services.length - 3}`;
}

function countLabel(count) {
  return count === 1 ? '1 organizzazione' : `${count} organizzazioni`;
}

function getCategoryClassName(category) {
  const value = normalize(category || '');
  if (value.includes('assistenza') || value.includes('inclusione')) return 'category-assistenza';
  if (value.includes('sanita') || value.includes('soccorso') || value.includes('protezione')) return 'category-sanit';
  if (value.includes('cultura') || value.includes('arte') || value.includes('spettacolo')) return 'category-cultura';
  if (value.includes('educazione') || value.includes('infanzia') || value.includes('giovani')) return 'category-educazione';
  if (value.includes('aggregazione') || value.includes('sviluppo') || value.includes('ricreazione')) return 'category-aggregazione';
  if (value.includes('ambiente') || value.includes('animali')) return 'category-ambiente';
  if (value.includes('sport') || value.includes('benessere')) return 'category-sport';
  return 'category-aggregazione';
}

function getCategoryIcon(category) {
  const icons = {
    'category-assistenza': '<g><circle cx="9" cy="8.5" r="2.6"/><circle cx="15.8" cy="8.5" r="2.2"/><path d="M3.8 18.4c.6-3.2 2.8-5 5.8-5s5.2 1.8 5.8 5"/><path d="M12.8 18.4c.6-2.7 2.5-4.1 5-4.1 1.2 0 2.1.3 3.2.8"/></g>',
    'category-sanit': '<path d="M12 21s-7-4.35-7-10.2A4.3 4.3 0 0 1 9.3 6c1.18 0 2.21.47 2.7 1.27C12.49 6.47 13.52 6 14.7 6A4.3 4.3 0 0 1 19 10.8C19 16.65 12 21 12 21Z"/>',
    'category-cultura': '<g><path d="M12 4.5a8.5 8.5 0 1 0 0 17h1.2c1.1 0 1.8-1.3 1.2-2.2-.6-.9.1-2 1.2-2h2.1A4.3 4.3 0 0 0 22 13c0-4.7-4.5-8.5-10-8.5Z"/><circle cx="7.5" cy="12" r="1"/><circle cx="10.5" cy="8.5" r="1"/><circle cx="15" cy="8" r="1"/><circle cx="18" cy="11" r="1"/></g>',
    'category-educazione': '<g><path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z"/><path d="M7.5 10.5v4.2c1.8 1.7 6.7 1.7 8.5 0v-4.2"/><path d="M20 8.5v7.2"/></g>',
    'category-aggregazione': '<g><path d="M5 9.5h12v5.7A3.8 3.8 0 0 1 13.2 19H8.8A3.8 3.8 0 0 1 5 15.2V9.5Z"/><path d="M17 11.5h1.2a2.8 2.8 0 0 1 0 5.6H17"/><path d="M3.5 20h15"/></g>',
    'category-ambiente': '<path d="M19 4C11 4 6 7.8 6 13.5 6 17.1 8.7 20 12 20c4.4 0 7-4.1 7-9.2V4Z"/><path d="M5 20c1.8-4.2 5-7.2 10-9"/>',
    'category-sport': '<g><circle cx="12" cy="5.5" r="2.2"/><path d="M9 17.5l1.8-5.2L7 10.5l2.2-4.3 2.8 1.8 2.8-1.8 2.2 4.3-3.8 1.8 1.8 5.2"/><path d="M5.2 13.3 3.5 16M18.8 13.3l1.7 2.7"/></g>',
  };
  const categoryClass = getCategoryClassName(category);
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[categoryClass] || icons['category-aggregazione']}</svg>`;
}

function socialLinkFor(type, value) {
  const clean = String(value || '').trim();
  if (!clean) return '';

  if (type === 'website') return clean;
  if (type === 'email') return `mailto:${clean}`;
  if (type === 'facebook') {
    if (/^https?:\/\/[^/]*facebook\.com\//i.test(clean)) return clean;
    const handle = clean.replace(/^https?:\/\/[^/]*facebook\.com\//i, '').replace(/^@/, '').trim();
    return handle ? `https://www.facebook.com/${encodeURIComponent(handle)}` : '';
  }
  if (type === 'instagram') {
    if (/^https?:\/\/[^/]*instagram\.com\//i.test(clean)) return clean;
    const handle = clean.replace(/^https?:\/\/[^/]*instagram\.com\//i, '').replace(/^@/, '').trim();
    return handle ? `https://www.instagram.com/${encodeURIComponent(handle)}` : '';
  }
  return '';
}

function getSocialIcon(type) {
  const icons = {
    website: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm6.93 9h-3.07a14.87 14.87 0 0 0-1.26-5A8.03 8.03 0 0 1 18.93 11ZM14 11H10V6.13A13.36 13.36 0 0 1 14 11Zm0 2H10v4.87A13.36 13.36 0 0 1 14 13Zm2 0h3.07A8.03 8.03 0 0 1 18.93 13H16Zm1.26-8A14.87 14.87 0 0 0 16 11h3.07A8.03 8.03 0 0 1 17.26 5ZM12 4.07A13.38 13.38 0 0 1 13.9 11H10.1A13.38 13.38 0 0 1 12 4.07ZM10.1 13h3.8A13.38 13.38 0 0 1 12 19.93 13.38 13.38 0 0 1 10.1 13ZM5.07 13H8a14.87 14.87 0 0 0 1.26 5A8.03 8.03 0 0 1 5.07 13Zm1.67-8A8.03 8.03 0 0 1 8 11H4.93A14.87 14.87 0 0 0 6.74 5Zm-1.67 8h3.07A14.87 14.87 0 0 0 8 18a8.03 8.03 0 0 1-3.93-5Z"/></svg>',
    email: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3V5Zm1.5 1.5 7.5 6 7.5-6M4.5 17.5l5-4M19.5 17.5l-5-4"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3.1h-3.1V7.1c0-.9.3-1.5 1.6-1.5h1.7V2.8c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V11H7v3.1h2.8v8h3.7Z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5Zm5.25-3.25a1.25 1.25 0 1 1-1.25 1.25 1.25 1.25 0 0 1 1.25-1.25Z"/></svg>'
  };
  return icons[type] || icons.website;
}

function setContactStatus(message, type = '') {
  if (!els.contactStatus) return;
  els.contactStatus.textContent = message;
  els.contactStatus.className = `status-message${type ? ` ${type}` : ''}`;
}

function initContactForm() {
  return Boolean(els.contactForm);
}

async function loadData() {
  if (!els.resultsList || !els.resultCount) return;

  try {
    const response = await fetch('data/organisations.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
    state.data.organisations = state.data.organisations.map((org) => ({
      ...org,
      services: Array.isArray(org.services) ? org.services : org.services ? [org.services] : [],
    }));
    bootstrap();
  } catch (error) {
    els.resultsList.innerHTML = `<div class="no-results"><strong>Data file non disponibile.</strong><p>Apri l'app tramite un piccolo server locale o GitHub Pages, così il browser può leggere data/organisations.json.</p></div>`;
    console.error(error);
  }
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return;

    state.query = typeof saved.query === 'string' ? saved.query : '';
    state.municipality = typeof saved.municipality === 'string' ? saved.municipality : '';
    state.category = typeof saved.category === 'string' ? saved.category : '';
    state.sort = typeof saved.sort === 'string' ? saved.sort : 'relevance';
    state.selectedId = saved.selectedId || null;
    state.priorityId = saved.priorityId || null;
    state.services = new Set(Array.isArray(saved.services) ? saved.services.filter((service) => typeof service === 'string') : []);
  } catch (error) {
    console.warn('Unable to restore saved filters:', error);
  }
}

function persistState() {
  try {
    const payload = {
      query: state.query,
      municipality: state.municipality,
      category: state.category,
      services: Array.from(state.services),
      sort: state.sort,
      selectedId: state.selectedId,
      priorityId: state.priorityId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Unable to persist filters:', error);
  }
}

function bootstrap() {
  if (!els.totalRecords || !els.totalMunicipalities || !els.municipalityFilter || !els.categoryFilter) return;

  els.totalRecords.textContent = state.data.metadata.recordCount;
  els.totalMunicipalities.textContent = state.data.municipalities.length;
  populateSelect(els.municipalityFilter, state.data.municipalities, 'Tutti i comuni');
  populateSelect(els.categoryFilter, state.data.categories, 'Tutte le categorie');
  renderQuickNeeds();
  renderServices();
  bindEvents();
  loadPersistedState();
  syncControls();
  render();
}

function populateSelect(select, items, firstLabel) {
  select.innerHTML = `<option value="">${escapeHtml(firstLabel)}</option>`;
  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.name;
    option.textContent = `${item.name} (${item.count})`;
    select.append(option);
  });

  const menu = select.parentElement?.querySelector('.custom-select-menu');
  const trigger = select.parentElement?.querySelector('.custom-select-trigger');
  if (!menu || !trigger) return;

  menu.innerHTML = '';
  const blankOption = document.createElement('button');
  blankOption.type = 'button';
  blankOption.className = 'custom-select-option';
  blankOption.dataset.value = '';
  blankOption.textContent = firstLabel;
  blankOption.addEventListener('click', (event) => {
    event.stopPropagation();
    select.value = '';
    trigger.textContent = firstLabel;
    menu.parentElement?.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  menu.append(blankOption);

  items.forEach((item) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'custom-select-option';
    option.dataset.value = item.name;
    option.textContent = `${item.name} (${item.count})`;
    option.addEventListener('click', (event) => {
      event.stopPropagation();
      select.value = item.name;
      trigger.textContent = `${item.name} (${item.count})`;
      menu.parentElement?.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    menu.append(option);
  });
}

function renderQuickNeeds() {
  if (!els.quickNeeds) return;
  els.quickNeeds.innerHTML = '';
  quickNeeds.forEach((need) => {
    const button = document.createElement('button');
    button.className = 'chip';
    button.type = 'button';
    button.textContent = need.label;
    button.addEventListener('click', () => {
      state.services.clear();
      if (need.service) state.services.add(need.service);
      state.query = need.query;
      state.selectedId = null;
      syncControls();
      render();
    });
    els.quickNeeds.append(button);
  });
}

function renderServices() {
  if (!els.servicesList) return;
  els.servicesList.innerHTML = '';
  state.data.services
    .filter((service) => service.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'it'))
    .forEach((service) => {
      const label = document.createElement('label');
      label.className = 'service-option';
      label.title = service.definition || service.name;
      label.innerHTML = `
        <input type="checkbox" value="${escapeHtml(service.name)}">
        <span>${escapeHtml(service.name)} <span class="service-count">(${service.count})</span></span>
      `;
      label.querySelector('input').addEventListener('change', (event) => {
        if (event.target.checked) state.services.add(service.name);
        else state.services.delete(service.name);
        state.selectedId = null;
        render();
      });
      els.servicesList.append(label);
    });
}

function bindEvents() {
  if (els.filtersToggle && els.filtersPanel && els.appShell) {
    els.filtersToggle.addEventListener('click', () => {
      const collapsed = els.filtersPanel.classList.toggle('collapsed');
      els.appShell.classList.toggle('filters-collapsed', collapsed);
      els.filtersToggle.setAttribute('aria-expanded', String(!collapsed));
      els.filtersToggle.title = collapsed ? 'Espandi filtri' : 'Comprimi filtri';
    });
  }

  if (els.searchInput) {
    els.searchInput.addEventListener('input', (event) => {
      state.query = event.target.value;
      state.selectedId = null;
      render();
    });
  }
  if (els.clearSearch) {
    els.clearSearch.addEventListener('click', () => {
      state.query = '';
      state.selectedId = null;
      syncControls();
      render();
    });
  }
  if (els.municipalityFilter) {
    els.municipalityFilter.addEventListener('change', (event) => {
      state.municipality = event.target.value;
      state.selectedId = null;
      render();
    });
  }
  if (els.categoryFilter) {
    els.categoryFilter.addEventListener('change', (event) => {
      state.category = event.target.value;
      state.selectedId = null;
      render();
    });
  }
  if (els.municipalityTrigger && els.municipalityMenu) {
    els.municipalityTrigger.addEventListener('click', (event) => {
      event.stopPropagation();
      const parent = els.municipalityTrigger.closest('.custom-select');
      const isOpen = parent.classList.contains('is-open');
      document.querySelectorAll('.custom-select').forEach((item) => item.classList.remove('is-open'));
      document.querySelectorAll('.custom-select-trigger').forEach((item) => item.setAttribute('aria-expanded', 'false'));
      if (!isOpen) {
        parent.classList.add('is-open');
        els.municipalityTrigger.setAttribute('aria-expanded', 'true');
      }
    });
  }
  if (els.categoryTrigger && els.categoryMenu) {
    els.categoryTrigger.addEventListener('click', (event) => {
      event.stopPropagation();
      const parent = els.categoryTrigger.closest('.custom-select');
      const isOpen = parent.classList.contains('is-open');
      document.querySelectorAll('.custom-select').forEach((item) => item.classList.remove('is-open'));
      document.querySelectorAll('.custom-select-trigger').forEach((item) => item.setAttribute('aria-expanded', 'false'));
      if (!isOpen) {
        parent.classList.add('is-open');
        els.categoryTrigger.setAttribute('aria-expanded', 'true');
      }
    });
  }
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest('.custom-select')) {
      document.querySelectorAll('.custom-select').forEach((item) => item.classList.remove('is-open'));
      document.querySelectorAll('.custom-select-trigger').forEach((item) => item.setAttribute('aria-expanded', 'false'));
    }
  });
  if (els.clearServices) {
    els.clearServices.addEventListener('click', () => {
      state.services.clear();
      state.selectedId = null;
      syncControls();
      render();
    });
  }
  if (els.sortSelect) {
    els.sortSelect.addEventListener('change', (event) => {
      state.sort = event.target.value;
      render();
    });
  }
  if (els.assistantForm && els.assistantInput) {
    els.assistantForm.addEventListener('submit', (event) => {
      event.preventDefault();
      applyAssistantQuery(els.assistantInput.value);
    });
  }
}

function updateCustomSelectUI(select, trigger, menu, defaultLabel) {
  if (!select || !trigger || !menu) return;
  const selected = select.value;
  const option = [...menu.querySelectorAll('.custom-select-option')].find((item) => item.dataset.value === selected);
  if (option) trigger.textContent = option.textContent;
  else trigger.textContent = defaultLabel;
  trigger.setAttribute('aria-expanded', String(menu.parentElement?.classList.contains('is-open')));
}

function syncControls() {
  if (els.searchInput) els.searchInput.value = state.query;
  if (els.municipalityFilter) els.municipalityFilter.value = state.municipality;
  if (els.categoryFilter) els.categoryFilter.value = state.category;
  if (els.municipalityTrigger && els.municipalityMenu) updateCustomSelectUI(els.municipalityFilter, els.municipalityTrigger, els.municipalityMenu, 'Tutti i comuni');
  if (els.categoryTrigger && els.categoryMenu) updateCustomSelectUI(els.categoryFilter, els.categoryTrigger, els.categoryMenu, 'Tutte le categorie');
  if (els.sortSelect) els.sortSelect.value = state.sort;
  if (els.servicesList) {
    els.servicesList.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.checked = state.services.has(input.value);
    });
  }
}

function applyAssistantQuery(input) {
  const raw = String(input || '').trim();
  if (!raw || !state.data) return;
  const normalized = normalize(raw);
  const foundMunicipality = state.data.municipalities.find((item) =>
    normalized.includes(normalize(item.name))
  );
  const foundCategory = state.data.categories.find((item) => {
    const parts = normalize(item.name).split(/[\s,]+/).filter((part) => part.length > 4);
    return parts.some((part) => normalized.includes(part));
  });
  const foundServices = state.data.services.filter((service) => {
    const serviceNorm = normalize(service.name);
    const words = serviceNorm.split(/[\s/]+/).filter((word) => word.length > 4);
    return serviceNorm.includes(normalized) || words.some((word) => normalized.includes(word));
  });

  const synonymService = quickNeeds.find((need) => normalized.includes(normalize(need.query)));
  state.query = raw;
  state.municipality = foundMunicipality ? foundMunicipality.name : '';
  state.category = foundCategory ? foundCategory.name : '';
  state.services.clear();
  foundServices.forEach((service) => state.services.add(service.name));
  if (synonymService?.service) state.services.add(synonymService.service);
  state.selectedId = null;

  syncControls();
  render();

  const pieces = [];
  if (state.municipality) pieces.push(`comune ${state.municipality}`);
  if (state.category) pieces.push(`categoria ${state.category}`);
  if (state.services.size) pieces.push(`${state.services.size} servizio/i`);
  const suffix = pieces.length ? ` Ho applicato: ${pieces.join(', ')}.` : ' Ho cercato nel testo delle schede.';
  if (els.assistantReply) els.assistantReply.textContent = `Risultati per “${raw}”.${suffix}`;
}

function filterAndSort() {
  const terms = searchTerms(state.query);
  const selectedServices = Array.from(state.services);
  let rows = state.data.organisations
    .map((org) => ({ org, score: relevanceScore(org, terms) }))
    .filter(({ org, score }) => {
      if (terms.length && score === 0) return false;
      if (state.municipality && org.municipality !== state.municipality) return false;
      if (state.category && org.category !== state.category) return false;
      if (selectedServices.length && !selectedServices.some((service) => org.services.includes(service))) return false;
      return true;
    });

  if (state.sort === 'name-asc') rows.sort((a, b) => a.org.name.localeCompare(b.org.name, 'it'));
  else if (state.sort === 'name-desc') rows.sort((a, b) => b.org.name.localeCompare(a.org.name, 'it'));
  else if (state.sort === 'municipality-asc') rows.sort((a, b) => a.org.municipality.localeCompare(b.org.municipality, 'it') || a.org.name.localeCompare(b.org.name, 'it'));
  else if (state.sort === 'municipality-desc') rows.sort((a, b) => b.org.municipality.localeCompare(a.org.municipality, 'it') || b.org.name.localeCompare(a.org.name, 'it'));
  else rows.sort((a, b) => b.score - a.score || a.org.name.localeCompare(b.org.name, 'it'));
  return rows.map((item) => item.org);
}

function relevanceScore(org, terms) {
  if (!terms.length) return 1;
  const haystack = normalize([
    org.name,
    org.municipality,
    org.category,
    org.activity,
    org.benefitCategory,
    org.services.join(' '),
  ].join(' '));
  let score = 0;
  terms.forEach((term) => {
    if (normalize(org.name).includes(term)) score += 8;
    if (normalize(org.municipality).includes(term)) score += 5;
    if (normalize(org.category).includes(term)) score += 4;
    if (normalize(org.services.join(' ')).includes(term)) score += 4;
    if (haystack.includes(term)) score += 1;
  });
  return score;
}

function render() {
  if (!els.resultsList || !els.resultCount) return;
  syncControls();
  const results = filterAndSort();
  const selectedOrg = state.selectedId && results.some((org) => org.id === state.selectedId)
    ? results.find((org) => org.id === state.selectedId)
    : null;
  const prioritizedOrg = state.priorityId && results.some((org) => org.id === state.priorityId)
    ? results.find((org) => org.id === state.priorityId)
    : null;
  state.selectedId = selectedOrg ? selectedOrg.id : null;
  if (!state.priorityId && prioritizedOrg) state.priorityId = prioritizedOrg.id;
  const orderedResults = prioritizedOrg
    ? [prioritizedOrg, ...results.filter((org) => org.id !== prioritizedOrg.id)]
    : results;
  persistState();
  els.resultCount.textContent = countLabel(results.length);
  renderActiveFilters();
  renderResults(orderedResults);
  renderDetails(selectedOrg);
  if (document.getElementById('map')) {
    renderMapMarkers(results);
  }
}

function renderActiveFilters() {
  const filters = [];
  if (state.query) filters.push(`Testo: ${state.query}`);
  if (state.municipality) filters.push(`Comune: ${state.municipality}`);
  if (state.category) filters.push(`Categoria: ${state.category}`);
  Array.from(state.services).forEach((service) => filters.push(`Servizio: ${service}`));
  if (els.activeFilters) {
    els.activeFilters.innerHTML = filters.map((filter) => `<span class="active-filter">${escapeHtml(filter)}</span>`).join('');
  }
}

function getMapFocusTarget(org) {
  const coords = getOrgCoordinates(org);
  if (!coords) return null;
  return { lat: Number(coords[0]), lng: Number(coords[1]) };
}

function focusMapForOrg(org) {
  if (!org) return;
  const target = getMapFocusTarget(org);
  if (!target) return;

  const onMapPage = !!document.getElementById('map');
  const previousScrollY = window.scrollY;
  const resultsPanel = document.querySelector('.results-panel');
  const previousResultsScroll = resultsPanel ? resultsPanel.scrollTop : 0;

  state.selectedId = org.id;
  state.priorityId = org.id;
  render();

  if (!onMapPage) {
    const savedFocus = { orgId: org.id, lat: target.lat, lng: target.lng, scrollToMap: true };
    sessionStorage.setItem('pianura-focus-org', JSON.stringify(savedFocus));
    window.location.href = 'mappa.html';
    return;
  }

  if (resultsPanel) {
    resultsPanel.scrollTo({ top: 0, behavior: 'smooth' });
  }
  window.scrollTo({ top: previousScrollY, left: 0, behavior: 'auto' });

  const map = window.__pianuraMap;
  if (map) {
    map.flyTo([target.lat, target.lng], 14, { duration: 1.6 });
  }

  const marker = window.__pianuraMarkers?.getLayers().find((layer) => {
    const markerOrg = layer.options?.title;
    return typeof markerOrg === 'string' && markerOrg === org.name;
  });

  if (marker) {
    marker.openPopup();
  }
}

function getLocationButtonMarkup(org) {
  const coords = getOrgCoordinates(org);
  if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) {
    return '';
  }
  return `
    <button class="result-map-button" type="button" aria-label="Mostra sulla mappa" title="Mostra sulla mappa">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5a7.5 7.5 0 0 1 7.5 7.5c0 5.5-7.5 11.5-7.5 11.5S4.5 15.5 4.5 10A7.5 7.5 0 0 1 12 2.5Zm0 4a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7Z"/></svg>
    </button>
  `;
}

function renderResults(results) {
  if (!els.resultsList || !els.resultTemplate) return;
  els.resultsList.innerHTML = '';
  if (!results.length) {
    els.resultsList.innerHTML = '<div class="no-results"><strong>Nessun risultato.</strong><p>Prova a togliere un servizio o a cercare solo per comune.</p></div>';
    return;
  }
  const fragment = document.createDocumentFragment();
  results.forEach((org) => {
    const node = els.resultTemplate.content.firstElementChild.cloneNode(true);
    const categoryClass = getCategoryClassName(org.category);
    node.classList.add(categoryClass);
    if (org.id === state.selectedId) node.classList.add('selected');
    node.querySelector('.result-kicker').textContent = `${org.municipality || 'Comune non indicato'} · ${org.category || 'Categoria non indicata'}`;
    node.querySelector('.result-name').textContent = org.name;
    node.querySelector('.result-description').textContent = org.activity || 'Descrizione non disponibile.';
    const servicePreview = node.querySelector('.service-preview');
    const servicesMarkup = org.services.length
      ? org.services.slice(0, 3).map((service) => `<span class="service-pill">${escapeHtml(service)}</span>`).join('')
      : '<span class="service-pill service-pill-muted">Nessun servizio indicato</span>';
    const badgeMarkup = `<span class="category-badge" aria-hidden="true">${getCategoryIcon(org.category)}</span>`;
    servicePreview.innerHTML = `${badgeMarkup}${servicesMarkup}${getLocationButtonMarkup(org)}`;
    const mainCard = node.querySelector('.result-main');
    mainCard.addEventListener('click', () => {
      state.selectedId = org.id;
      render();
      if (window.matchMedia('(max-width: 1180px)').matches) {
        els.detailsCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    mainCard.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        state.selectedId = org.id;
        render();
      }
    });
    const mapButton = servicePreview.querySelector('.result-map-button');
    mapButton?.addEventListener('click', (event) => {
      event.stopPropagation();
      focusMapForOrg(org);
    });
    fragment.append(node);
  });
  els.resultsList.append(fragment);
}

function renderDetails(org) {
  if (!els.detailsEmpty || !els.detailsCard) return;
  if (!org) {
    els.detailsEmpty.classList.remove('hidden');
    els.detailsCard.classList.add('hidden');
    els.detailsCard.innerHTML = '';
    if (els.detailsPanel) els.detailsPanel.classList.add('hidden');
    return;
  }

  els.detailsEmpty.classList.add('hidden');
  els.detailsCard.classList.remove('hidden');
  if (els.detailsPanel) els.detailsPanel.classList.remove('hidden');

  const links = [];
  const orgLinks = org.links || {};
  const website = String(orgLinks.website || '').trim();
  const email = String(org.email || '').trim();
  const facebook = String(orgLinks.facebook || '').trim();
  const instagram = String(orgLinks.instagram || '').trim();
  const contactHours = org.contactHours || {};
  const hourLabels = {
    sportello_ascolto: 'Sportello ascolto',
    assistenza_alimentare: 'Assistenza alimentare',
    viveri: 'Distribuzione viveri',
    vestiario: 'Distribuzione vestiario',
  };
  const hoursMarkup = Object.entries(contactHours)
    .filter(([, value]) => value)
    .map(([key, value]) => `<div class="contact-hour"><span>${escapeHtml(hourLabels[key] || key)}</span><span>${escapeHtml(value)}</span></div>`)
    .join('');

  if (website) {
    links.push(`<a class="contact-button website-button" href="${escapeHtml(website)}" target="_blank" rel="noreferrer">${getSocialIcon('website')}<span>Sito web</span></a>`);
  }
  if (facebook) {
    const facebookLink = socialLinkFor('facebook', facebook);
    if (facebookLink) {
      links.push(`<a class="contact-button facebook-button" href="${escapeHtml(facebookLink)}" target="_blank" rel="noreferrer">${getSocialIcon('facebook')}<span>Facebook</span></a>`);
    }
  }
  if (instagram) {
    const instagramLink = socialLinkFor('instagram', instagram);
    if (instagramLink) {
      links.push(`<a class="contact-button instagram-button" href="${escapeHtml(instagramLink)}" target="_blank" rel="noreferrer">${getSocialIcon('instagram')}<span>Instagram</span></a>`);
    }
  }

  els.detailsCard.innerHTML = `
    <button class="detail-close" type="button" aria-label="Chiudi scheda dettagli">×</button>
    <div class="detail-header-block">
      <p class="meta">${escapeHtml(org.municipality || 'Comune non indicato')} · ${escapeHtml(org.category || 'Categoria non indicata')}</p>
      <h2>${escapeHtml(org.name)}</h2>
      <p>${escapeHtml(org.activity || 'Descrizione non disponibile.')}</p>
    </div>

    <div class="detail-block">
      <h3>Servizi</h3>
      <div class="service-tags">
        ${(org.services.length ? org.services : ['Nessun servizio specifico indicato']).map((service) => `<span class="service-pill detail-service-pill">${escapeHtml(service)}</span>`).join('')}
      </div>
    </div>

    ${hoursMarkup ? `<div class="detail-block"><h3>Orari</h3><div class="contact-hours">${hoursMarkup}</div></div>` : ''}

    ${email || links.length ? `<div class="detail-block"><h3>Contatti</h3>${email ? `<a class="contact-email" href="${escapeHtml(socialLinkFor('email', email))}">${escapeHtml(email)}</a>` : ''}${links.length ? `<div class="detail-links">${links.join('')}</div>` : ''}</div>` : ''}

    <div class="detail-block admin-block">
      <button class="detail-toggle" type="button" aria-expanded="false">
        <h3>Dati amministrativi</h3>
        <span class="detail-toggle-icon" aria-hidden="true">▸</span>
      </button>
      <div class="detail-content is-collapsed">
        <div class="detail-grid">
          ${detailRow('Ente gestore', org.managedBy)}
          ${detailRow('Rappresentante', org.legalRepresentative)}
          ${detailRow('Codice fiscale', org.taxCode)}
          ${detailRow('Repertorio', org.registryNumber)}
          ${detailRow('Iscrizione', org.registrationDate)}
          ${detailRow('5x1000', org.fivePerMille)}
          ${detailRow('Rete', org.network)}
          ${detailRow('Categoria beneficio', org.benefitCategory)}
        </div>
      </div>
    </div>
  `;

  const closeButton = els.detailsCard.querySelector('.detail-close');
  closeButton?.addEventListener('click', () => {
    state.selectedId = null;
    state.priorityId = null;
    render();
  });

  const adminToggle = els.detailsCard.querySelector('.detail-toggle');
  adminToggle?.addEventListener('click', () => {
    const block = adminToggle.closest('.admin-block');
    const content = block?.querySelector('.detail-content');
    const expanded = adminToggle.getAttribute('aria-expanded') === 'true';
    adminToggle.setAttribute('aria-expanded', String(!expanded));
    content?.classList.toggle('is-collapsed', expanded);
    block?.classList.toggle('is-open', !expanded);
  });
}

function detailRow(label, value) {
  if (!value) return '';
  return `<div class="detail-row"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`;
}

function getOrgCoordinates(org) {
  if (!org) return null;
  if (Array.isArray(org.coordinates) && org.coordinates.length >= 2) {
    const lat = Number(org.coordinates[0]);
    const lng = Number(org.coordinates[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  }
  if (Number.isFinite(Number(org.lat)) && Number.isFinite(Number(org.lng))) {
    return [Number(org.lat), Number(org.lng)];
  }
  if (Number.isFinite(Number(org.latitude)) && Number.isFinite(Number(org.longitude))) {
    return [Number(org.latitude), Number(org.longitude)];
  }
  if (org.location && Number.isFinite(Number(org.location.lat)) && Number.isFinite(Number(org.location.lng))) {
    return [Number(org.location.lat), Number(org.location.lng)];
  }
  if (org.location && Number.isFinite(Number(org.location.latitude)) && Number.isFinite(Number(org.location.longitude))) {
    return [Number(org.location.latitude), Number(org.location.longitude)];
  }
  return null;
}

function renderMapMarkers(results) {
  if (!document.getElementById('map') || typeof window.L === 'undefined') return;
  if (!state.data || !Array.isArray(results)) return;

  if (!window.__pianuraMap) {
    window.__pianuraMap = L.map('map', { zoomControl: true, scrollWheelZoom: true }).setView([44.495, 11.356], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(window.__pianuraMap);
    window.__pianuraMarkers = L.layerGroup().addTo(window.__pianuraMap);
  }

  const map = window.__pianuraMap;
  const markerLayer = window.__pianuraMarkers;
  markerLayer.clearLayers();

  const validResults = results.filter((org) => {
    const coords = getOrgCoordinates(org);
    return coords && Number.isFinite(coords[0]) && Number.isFinite(coords[1]);
  });

  const successFocus = (() => {
    const raw = sessionStorage.getItem('pianura-focus-org');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  })();

  const resultsPanel = document.querySelector('.results-panel');
  if (resultsPanel && successFocus && successFocus.scrollToMap) {
    resultsPanel.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const notice = document.getElementById('mapNotice');
  if (!validResults.length) {
    if (notice) notice.textContent = 'Nessuna geolocalizzazione disponibile per i filtri attuali.';
    return;
  }

  const bounds = [];
  let focusedMarker = null;
  validResults.forEach((org) => {
    const coords = getOrgCoordinates(org);
    if (!coords) return;
    const categoryClass = getCategoryClassName(org.category);
    const markerIcon = L.divIcon({
      className: `map-marker-wrapper ${categoryClass}`,
      html: `<span class="map-marker" title="${escapeHtml(org.category || 'Categoria non indicata')}"><span class="map-marker-icon">${getCategoryIcon(org.category)}</span></span>`,
      iconSize: [38, 46],
      iconAnchor: [19, 46],
      popupAnchor: [0, -42],
    });
    const marker = L.marker(coords, { icon: markerIcon, title: org.name }).addTo(markerLayer);
    marker.bindPopup(`<strong>${escapeHtml(org.name)}</strong><br>${escapeHtml(org.municipality || '')}`);
    marker.on('click', () => {
      state.selectedId = org.id;
      render();
      if (window.__pianuraMap) {
        window.__pianuraMap.flyTo(coords, 14, { duration: 1.2 });
      }
    });
    if (successFocus && String(org.id) === String(successFocus.orgId)) {
      focusedMarker = marker;
    }
    bounds.push(coords);
  });

  if (notice) notice.textContent = '';
  map.invalidateSize({ pan: false });

  if (successFocus && focusedMarker) {
    map.flyTo(focusedMarker.getLatLng(), 14, { duration: 1.6 });
    focusedMarker.openPopup();
    sessionStorage.removeItem('pianura-focus-org');
  } else if (bounds.length) {
    map.fitBounds(bounds, { padding: [24, 24] });
  }
}

function initMapPage() {
  if (!document.getElementById('map')) return;

  const existingCss = document.querySelector('link[data-leaflet]');
  if (!existingCss) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    css.dataset.leaflet = 'true';
    document.head.appendChild(css);
  }

  if (window.L) {
    renderMapMarkers(filterAndSort());
    return;
  }

  const existingScript = document.querySelector('script[data-leaflet]');
  if (!existingScript) {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.dataset.leaflet = 'true';
    script.onload = () => {
      if (state.data) renderMapMarkers(filterAndSort());
    };
    document.head.appendChild(script);
  }
}

function initApp() {
  initContactForm();
  initMapPage();
  loadData();
}

initApp();
