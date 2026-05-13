// ISO 3166-1 numeric → country name. Matches the IDs in world-atlas/countries-110m.json
export const ISO_TO_COUNTRY = {
  '704': 'Vietnam',
  '840': 'United States',
  '410': 'South Korea',
  '528': 'Netherlands',
  '276': 'Germany',
  '392': 'Japan',
  '156': 'China',
  '826': 'United Kingdom',
};

// Country centroids — [lng, lat] for react-simple-maps
export const COUNTRY_COORDS = {
  'Vietnam':        [108.2772, 14.0583],
  'United States':  [-95.7129, 37.0902],
  'South Korea':    [127.7669, 35.9078],
  'Netherlands':    [5.2913, 52.1326],
  'Germany':        [10.4515, 51.1657],
  'Japan':          [139.6917, 35.6895],
  'China':          [104.1954, 35.8617],
  'United Kingdom': [-3.4360, 55.3781],
};

// Approximate radius (degrees) for spreading actor markers inside each country.
export const COUNTRY_SPREAD = {
  'Vietnam':        3.5,
  'United States':  12.0,
  'South Korea':    2.0,
  'Netherlands':    1.5,
  'Germany':        3.2,
  'Japan':          2.5,
  'China':          12.0,
  'United Kingdom': 3.0,
};

// Parse country from org.role strings like "Manufacturer - Vietnam" or "Customs Authority - United States"
export function countryFromRole(role) {
  if (!role) return null;
  // Support both " · " (old format) and " - " (new format) separators
  const sep = role.includes(' · ') ? ' · ' : ' - ';
  const parts = role.split(sep).map(s => s.trim());
  if (parts.length < 2) return null;
  const candidate = parts[parts.length - 1];
  // Handle special cases
  if (candidate === 'Ho Chi Minh City') return 'Vietnam';
  if (candidate === 'International') return null;
  if (candidate === 'EU') return 'Netherlands';
  return COUNTRY_COORDS[candidate] ? candidate : null;
}
