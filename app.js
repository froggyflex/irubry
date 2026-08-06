const state = {
  data: null,
  query: '',
  municipality: '',
  category: '',
  services: new Set(),
  fivePerMille: false,
  network: false,
  sort: 'relevance',
  selectedId: null,
};

const els = {
  totalRecords: document.querySelector('#totalRecords'),
  totalMunicipalities: document.querySelector('#totalMunicipalities'),
  searchInput: document.querySelector('#searchInput'),
  clearSearch: document.querySelector('#clearSearch'),
  municipalityFilter: document.querySelector('#municipalityFilter'),
  categoryFilter: document.querySelector('#categoryFilter'),
  quickNeeds: document.querySelector('#quickNeeds'),
  servicesList: document.querySelector('#servicesList'),
  clearServices: document.querySelector('#clearServices'),
  fivePerMilleFilter: document.querySelector('#fivePerMilleFilter'),
  networkFilter: document.querySelector('#networkFilter'),
  assistantReply: document.querySelector('#assistantReply'),
  assistantForm: document.querySelector('#assistantForm'),
  assistantInput: document.querySelector('#assistantInput'),
  resultCount: document.querySelector('#resultCount'),
  sortSelect: document.querySelector('#sortSelect'),
  activeFilters: document.querySelector('#activeFilters'),
  resultsList: document.querySelector('#resultsList'),
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

function setContactStatus(message, type = '') {
  if (!els.contactStatus) return;
  els.contactStatus.textContent = message;
  els.contactStatus.className = `status-message${type ? ` ${type}` : ''}`;
}

function initContactForm() {
  if (!els.contactForm) return;
  els.contactForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = {
      name: els.contactName?.value?.trim() || '',
      surname: els.contactSurname?.value?.trim() || '',
      organisation: els.contactOrganisation?.value?.trim() || '',
      email: els.contactEmail?.value?.trim() || '',
      message: els.contactMessage?.value?.trim() || '',
    };

    if (!data.name || !data.surname || !data.email || !data.message) {
      setContactStatus('Compila nome, cognome, email e messaggio.', 'error');
      return;
    }

    const recipient = 'contatti@pianuraest.it';
    const body = [
      `Nome: ${data.name} ${data.surname}`,
      data.organisation ? `Ente: ${data.organisation}` : '',
      `Email: ${data.email}`,
      '',
      data.message,
    ]
      .filter(Boolean)
      .join('\n');

    const subject = encodeURIComponent(`Messaggio dal sito Pianura Est - ${data.name} ${data.surname}`);
    const encodedBody = encodeURIComponent(body);
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${encodedBody}`;
    setContactStatus('Il messaggio è pronto per essere inviato via email.', 'success');
    els.contactForm.reset();
  });
}

async function loadData() {
  if (!els.resultsList || !els.resultCount) return;

  try {
    const response = await fetch('data/organisations.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
    bootstrap();
  } catch (error) {
    els.resultsList.innerHTML = `<div class="no-results"><strong>Data file non disponibile.</strong><p>Apri l'app tramite un piccolo server locale o GitHub Pages, così il browser può leggere data/organisations.json.</p></div>`;
    console.error(error);
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
  if (els.clearServices) {
    els.clearServices.addEventListener('click', () => {
      state.services.clear();
      state.selectedId = null;
      syncControls();
      render();
    });
  }
  if (els.fivePerMilleFilter) {
    els.fivePerMilleFilter.addEventListener('change', (event) => {
      state.fivePerMille = event.target.checked;
      state.selectedId = null;
      render();
    });
  }
  if (els.networkFilter) {
    els.networkFilter.addEventListener('change', (event) => {
      state.network = event.target.checked;
      state.selectedId = null;
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

function syncControls() {
  if (els.searchInput) els.searchInput.value = state.query;
  if (els.municipalityFilter) els.municipalityFilter.value = state.municipality;
  if (els.categoryFilter) els.categoryFilter.value = state.category;
  if (els.fivePerMilleFilter) els.fivePerMilleFilter.checked = state.fivePerMille;
  if (els.networkFilter) els.networkFilter.checked = state.network;
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
      if (state.fivePerMille && !hasYes(org.fivePerMille)) return false;
      if (state.network && !hasYes(org.network)) return false;
      return true;
    });

  if (state.sort === 'name') rows.sort((a, b) => a.org.name.localeCompare(b.org.name, 'it'));
  else if (state.sort === 'municipality') rows.sort((a, b) => a.org.municipality.localeCompare(b.org.municipality, 'it') || a.org.name.localeCompare(b.org.name, 'it'));
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
  if (!state.selectedId || !results.some((org) => org.id === state.selectedId)) {
    state.selectedId = results[0]?.id || null;
  }
  els.resultCount.textContent = countLabel(results.length);
  renderActiveFilters();
  renderResults(results);
  renderDetails(results.find((org) => org.id === state.selectedId));
}

function renderActiveFilters() {
  const filters = [];
  if (state.query) filters.push(`Testo: ${state.query}`);
  if (state.municipality) filters.push(`Comune: ${state.municipality}`);
  if (state.category) filters.push(`Categoria: ${state.category}`);
  Array.from(state.services).forEach((service) => filters.push(`Servizio: ${service}`));
  if (state.fivePerMille) filters.push('5x1000');
  if (state.network) filters.push('Rete territoriale');
  if (els.activeFilters) {
    els.activeFilters.innerHTML = filters.map((filter) => `<span class="active-filter">${escapeHtml(filter)}</span>`).join('');
  }
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
    if (org.id === state.selectedId) node.classList.add('selected');
    node.querySelector('.result-kicker').textContent = `${org.municipality || 'Comune non indicato'} · ${org.category || 'Categoria non indicata'}`;
    node.querySelector('.result-name').textContent = org.name;
    node.querySelector('.result-description').textContent = org.activity || 'Descrizione non disponibile.';
    node.querySelector('.service-preview').textContent = serviceText(org.services);
    node.querySelector('.result-main').addEventListener('click', () => {
      state.selectedId = org.id;
      render();
      if (window.matchMedia('(max-width: 1180px)').matches) {
        els.detailsCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
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
    return;
  }
  els.detailsEmpty.classList.add('hidden');
  els.detailsCard.classList.remove('hidden');
  const links = [];
  if (org.links.website) links.push(`<a class="link-button" href="${escapeHtml(org.links.website)}" target="_blank" rel="noreferrer">Sito web</a>`);
  if (org.links.facebook) links.push(`<span class="tag">Facebook: ${escapeHtml(org.links.facebook)}</span>`);
  if (org.links.instagram) links.push(`<span class="tag">Instagram: ${escapeHtml(org.links.instagram)}</span>`);

  els.detailsCard.innerHTML = `
    <div>
      <p class="meta">${escapeHtml(org.municipality || 'Comune non indicato')} · ${escapeHtml(org.category || 'Categoria non indicata')}</p>
      <h2>${escapeHtml(org.name)}</h2>
      <p>${escapeHtml(org.activity || 'Descrizione non disponibile.')}</p>
    </div>

    <div class="detail-block">
      <h3>Servizi</h3>
      <div class="service-tags">
        ${(org.services.length ? org.services : ['Nessun servizio specifico indicato']).map((service) => `<span class="tag">${escapeHtml(service)}</span>`).join('')}
      </div>
    </div>

    ${links.length ? `<div class="detail-block"><h3>Contatti digitali</h3><div class="detail-links">${links.join('')}</div></div>` : ''}

    <div class="detail-block admin-block">
      <button class="detail-toggle" type="button" aria-expanded="false">
        <h3>Dati amministrativi</h3>
        <span class="detail-toggle-icon" aria-hidden="true">▸</span>
      </button>
      <div class="detail-content is-collapsed">
        <div class="detail-grid">
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

function initApp() {
  initContactForm();
  loadData();
}

initApp();
