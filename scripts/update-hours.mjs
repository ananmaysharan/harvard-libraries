import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

// The 23 Drupal path aliases we track (extracted from /libraries/<alias>)
const TRACKED_ALIASES = new Set([
  'arnold-arboretum',
  'baker-business',
  'botany',
  'cabot',
  'countway-medicine',
  'ernst-mayr',
  'fine-arts',
  'loeb-design',
  'fung',
  'gutman',
  'divinity',
  'law',
  'yenching',
  'kennedy-school',
  'houghton',
  'lamont',
  'loeb-music',
  'robbins-philosophy',
  'schlesinger',
  'science-engineering-complex-library',
  'tozzer',
  'widener',
  'poetryroom',
]);

// One-time migration: old CSV slugs → new Drupal aliases (for library-coords.json)
const SLUG_MIGRATION = {
  'arnold-arboretum-horticultural-library': 'arnold-arboretum',
  'baker-library-and-special-collections': 'baker-business',
  'botany-libraries': 'botany',
  'cabot-science-library': 'cabot',
  'countway-library': 'countway-medicine',
  'ernst-mayr-library': 'ernst-mayr',
  'fine-arts-library': 'fine-arts',
  'frances-loeb-library': 'loeb-design',
  'fung-library': 'fung',
  'gutman-library': 'gutman',
  'harvard-divinity-school-library': 'divinity',
  'harvard-law-school-library': 'law',
  'harvard-yenching-library': 'yenching',
  'hks-library-and-research-services': 'kennedy-school',
  'houghton-library': 'houghton',
  'lamont-library': 'lamont',
  'loeb-music-library': 'loeb-music',
  'robbins-library-of-philosophy': 'robbins-philosophy',
  'schlesinger-library': 'schlesinger',
  'science-engineering-complex-library': 'science-engineering-complex-library',
  'tozzer-library': 'tozzer',
  'widener-library': 'widener',
  'woodberry-poetry-room': 'poetryroom',
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Fetch all library nodes from Drupal JSON:API (handles pagination)
 */
async function fetchDrupalLibraries() {
  const fields = 'title,field_library_id,field_subtitle,field_address,path';
  let url = `https://library.harvard.edu/jsonapi/node/library?page[limit]=50&fields[node--library]=${fields}`;
  const libraries = [];

  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Drupal API error: ${res.status}`);
    const json = await res.json();
    libraries.push(...json.data);
    url = json.links?.next?.href || null;
  }

  return libraries;
}

/**
 * Fetch hours from LibCal API
 */
async function fetchLibCalHours() {
  const url = 'https://libcal.library.harvard.edu/api_hours_grid.php?iid=8218&format=json&weeks=1';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`LibCal API error: ${res.status}`);
  return res.json();
}

/**
 * Format a single day's hours from LibCal structured data
 */
function formatDayHours(dayData) {
  if (!dayData || !dayData.times) return '';

  const { status, hours } = dayData.times;

  switch (status) {
    case 'closed':
      return 'Closed';
    case '24hours':
      return '24 Hours';
    case 'open':
      if (!hours || hours.length === 0) return '';
      return hours.map(h => `${h.from} - ${h.to}`).join('. ');
    case 'ByApp':
    case 'text': {
      // Use rendered text, clean up newlines and extra whitespace
      const rendered = (dayData.rendered || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      return rendered || '';
    }
    case 'not-set':
    default:
      return '';
  }
}

/**
 * Format address from Drupal field_address components
 */
function formatAddress(fieldAddress) {
  if (!fieldAddress) return '';
  const parts = [
    fieldAddress.address_line1,
    fieldAddress.locality,
    fieldAddress.administrative_area,
    fieldAddress.postal_code,
  ].filter(Boolean);

  if (parts.length >= 3) {
    // "125 Arborway, Jamaica Plain, MA 02130"
    const street = parts[0];
    const city = parts[1];
    const state = parts[2];
    const zip = parts[3] || '';
    return `${street}, ${city}, ${state}${zip ? ' ' + zip : ''}`;
  }
  return parts.join(', ');
}

/**
 * Escape a CSV field value (wrap in quotes if needed)
 */
function csvField(value) {
  const str = (value || '').toString();
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Migrate library-coords.json keys from old slugs to Drupal aliases
 */
function migrateCoords() {
  const coordsPath = join(PUBLIC_DIR, 'library-coords.json');
  let coords;
  try {
    coords = JSON.parse(readFileSync(coordsPath, 'utf-8'));
  } catch {
    console.warn('Could not read library-coords.json, skipping migration');
    return;
  }

  let migrated = false;
  const newCoords = {};

  for (const [key, value] of Object.entries(coords)) {
    if (SLUG_MIGRATION[key]) {
      // Old slug found, migrate to new alias
      newCoords[SLUG_MIGRATION[key]] = value;
      migrated = true;
    } else {
      // Already a new alias or unknown key, keep as-is
      newCoords[key] = value;
    }
  }

  if (migrated) {
    writeFileSync(coordsPath, JSON.stringify(newCoords, null, 2) + '\n');
    console.log('Migrated library-coords.json keys to Drupal aliases');
  }
}

async function main() {
  console.log('Fetching library metadata from Drupal...');
  const drupalLibraries = await fetchDrupalLibraries();

  console.log('Fetching hours from LibCal...');
  const libcalData = await fetchLibCalHours();

  // Build a map of LibCal lid → hours data
  const hoursByLid = {};
  for (const loc of libcalData.locations) {
    hoursByLid[String(loc.lid)] = loc;
  }

  // Build CSV rows from Drupal libraries that match our tracked aliases
  const rows = [];

  for (const node of drupalLibraries) {
    const attrs = node.attributes;
    const alias = attrs.path?.alias?.replace('/libraries/', '') || '';

    if (!TRACKED_ALIASES.has(alias)) continue;

    const lid = String(attrs.field_library_id || '');
    const hoursData = hoursByLid[lid];
    const week = hoursData?.weeks?.[0];

    const row = {
      Id: alias,
      Name: (attrs.title || '').trim(),
      Description: (attrs.field_subtitle || '').trim(),
      Address: formatAddress(attrs.field_address),
    };

    for (const day of DAYS) {
      row[day] = week ? formatDayHours(week[day]) : '';
    }

    rows.push(row);
  }

  // Sort rows alphabetically by Name for consistent output
  rows.sort((a, b) => a.Name.localeCompare(b.Name));

  // Build CSV
  const headers = ['Id', 'Name', 'Description', 'Address', ...DAYS];
  const csvLines = [headers.map(h => csvField(h)).join(',')];

  for (const row of rows) {
    csvLines.push(headers.map(h => csvField(row[h])).join(','));
  }

  const csvContent = csvLines.join('\n') + '\n';
  const csvPath = join(PUBLIC_DIR, 'libraries.csv');
  writeFileSync(csvPath, csvContent);
  console.log(`Wrote ${rows.length} libraries to ${csvPath}`);

  // Migrate coords keys (one-time, idempotent)
  migrateCoords();

  // Summary
  const missing = [...TRACKED_ALIASES].filter(a => !rows.find(r => r.Id === a));
  if (missing.length > 0) {
    console.warn(`Warning: ${missing.length} tracked libraries not found in Drupal API:`, missing);
  }
}

main().catch(err => {
  console.error('Failed to update hours:', err);
  process.exit(1);
});
