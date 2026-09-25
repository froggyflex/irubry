const fs = require('fs');

const source = JSON.parse(fs.readFileSync('residenze', 'utf8'));
const filePath = 'data/organisations.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const byName = new Map(data.organisations.map((organisation) => [organisation.name, organisation]));
const canonical = new Map([
  ['centri diurni/residenziali', 'Centri Diurni / residenziali'],
  ['assist. anziani', 'Assist. Anziani'],
  ['supp disabili', 'Supporto disabilità'],
  ['supp fragilita', 'Supp. Fragilità'],
  ['inserim lavora', 'Inserim. Lavorativo'],
  ['tutela minori', 'Tutela minori / affido familiare'],
]);
let changed = 0;

for (const item of source) {
  const organisation = byName.get(item.name);
  if (!organisation) continue;
  const descriptions = [];
  const services = [];
  for (const rawService of item.services || []) {
    const value = String(rawService).trim();
    const standard = canonical.get(value.toLowerCase());
    if (standard) services.push(standard);
    else descriptions.push(value);
  }
  organisation.services = [...new Set(services)];
  if (descriptions.length) {
    const description = `Tipologia: ${descriptions.join('; ')}`;
    organisation.activity = organisation.activity && organisation.activity !== 'Descrizione non disponibile.'
      ? `${organisation.activity} ${description}`
      : description;
  }
  changed += 1;
}

const definitions = new Map(data.services.map((service) => [service.name.toLowerCase(), service.definition || '']));
const serviceNames = new Set(data.organisations.flatMap((organisation) => organisation.services || []));
data.services = [...serviceNames].sort((a, b) => a.localeCompare(b, 'it')).map((name) => ({
  name,
  count: data.organisations.filter((organisation) => (organisation.services || []).includes(name)).length,
  definition: definitions.get(name.toLowerCase()) || '',
}));
for (const organisation of data.organisations) {
  organisation.searchText = [
    organisation.name,
    organisation.municipality,
    organisation.category,
    organisation.activity,
    ...(organisation.services || []),
    organisation.managedBy,
    organisation.email,
    organisation.links?.website,
    organisation.links?.facebook,
    organisation.links?.instagram,
  ].filter(Boolean).join(' ');
}
fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`residenze_corrette=${changed} servizi_finali=${data.services.length}`);