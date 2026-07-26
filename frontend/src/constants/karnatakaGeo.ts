/**
 * Karnataka district geographic constants — single source of truth for all
 * map-related components. All 31 districts with approximate lat/lng centers,
 * KARNATAKA_BOUNDS for map restriction, and division membership.
 */

/** [lng, lat] center points for all 31 Karnataka districts */
export const DISTRICT_CENTERS: Record<string, [number, number]> = {
  'Bengaluru Urban':      [77.5946, 12.9716],
  'Bengaluru Rural':      [77.3516, 13.1625],
  'Mysuru':               [76.6394, 12.2958],
  'Belagavi':             [74.4977, 15.8497],
  'Kalaburagi':           [76.8243, 17.3297],
  'Dharwad':              [75.1240, 15.3647],
  'Mangaluru':            [74.8560, 12.9141],
  'Dakshina Kannada':     [75.0648, 12.8438],
  'Shivamogga':           [75.5681, 13.9299],
  'Tumakuru':             [77.1010, 13.3379],
  'Vijayapura':           [75.7180, 16.8302],
  'Ballari':              [76.9214, 15.1394],
  'Raichur':              [77.3566, 16.2120],
  'Bidar':                [77.5199, 17.9104],
  'Yadgir':               [77.1385, 16.7700],
  'Koppal':               [76.1547, 15.3508],
  'Gadag':                [75.6362, 15.4317],
  'Haveri':               [75.3996, 14.7956],
  'Uttara Kannada':       [74.6920, 14.7958],
  'Chikkamagaluru':       [75.7760, 13.3161],
  'Hassan':               [76.1000, 13.0072],
  'Kodagu':               [75.7376, 12.4244],
  'Chamarajanagar':       [76.9437, 11.9210],
  'Mandya':               [76.8950, 12.5218],
  'Ramanagara':           [77.2817, 12.7157],
  'Chikkaballapura':      [77.7327, 13.4355],
  'Kolar':                [78.1333, 13.1367],
  'Udupi':                [74.7421, 13.3409],
  'Bagalkote':            [75.6960, 16.1825],
  'Vijayanagara':         [76.3897, 15.1394],
  'Davangere':            [75.9238, 14.4644],
}

/** Karnataka bounding box for map restriction (west, south, east, north) */
export const KARNATAKA_BOUNDS: [[number, number], [number, number]] = [[73.5, 11.0], [78.5, 18.5]]

/** Default Karnataka center for map initialisation */
export const KARNATAKA_CENTER: [number, number] = [75.7139, 15.3173]

/** Division membership for each district */
export const DISTRICT_DIVISIONS: Record<string, string> = {
  'Bengaluru Urban':      'Bengaluru',
  'Bengaluru Rural':      'Bengaluru',
  'Mysuru':               'Mysuru',
  'Mandya':               'Mysuru',
  'Hassan':               'Mysuru',
  'Chamarajanagar':       'Mysuru',
  'Kodagu':               'Mysuru',
  'Tumakuru':             'Bengaluru',
  'Ramanagara':           'Bengaluru',
  'Chikkaballapura':      'Bengaluru',
  'Kolar':                'Bengaluru',
  'Shivamogga':           'Shivamogga',
  'Chikkamagaluru':       'Shivamogga',
  'Davangere':            'Shivamogga',
  'Udupi':                'Shivamogga',
  'Dakshina Kannada':     'Shivamogga',
  'Belagavi':             'Belagavi',
  'Dharwad':              'Belagavi',
  'Gadag':                'Belagavi',
  'Haveri':               'Belagavi',
  'Uttara Kannada':       'Belagavi',
  'Vijayapura':           'Kalaburagi',
  'Bagalkote':            'Belagavi',
  'Kalaburagi':           'Kalaburagi',
  'Bidar':                'Kalaburagi',
  'Yadgir':               'Kalaburagi',
  'Raichur':              'Kalaburagi',
  'Koppal':               'Kalaburagi',
  'Ballari':              'Kalaburagi',
  'Vijayanagara':         'Kalaburagi',
  'Chitradurga':          'Shivamogga',
}

/** Reverse lookup: districts by division */
export const DIVISION_DISTRICTS: Record<string, string[]> = {}
for (const [district, division] of Object.entries(DISTRICT_DIVISIONS)) {
  if (!DIVISION_DISTRICTS[division]) DIVISION_DISTRICTS[division] = []
  DIVISION_DISTRICTS[division].push(district)
}

/** All 4 division names in order */
export const DIVISIONS = ['Bengaluru', 'Mysuru', 'Shivamogga', 'Belagavi', 'Kalaburagi'] as const
