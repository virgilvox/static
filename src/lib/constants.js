// Static configuration and option lists. No state lives here.

export const DEFAULT_RELAY_URL = 'wss://relay.clasp.to'

export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

// Descriptor option lists. The leading empty string is the "skip" choice.
export const OPTS = {
  politics: ['', 'Far left', 'Left', 'Center-left', 'Center', 'Center-right', 'Right', 'Far right', 'Apolitical', 'Other'],
  religion: ['', 'Agnostic', 'Atheist', 'Buddhist', 'Christian', 'Hindu', 'Jewish', 'Muslim', 'Pagan', 'Spiritual', 'Other', 'Prefer not to say'],
  gender: ['', 'Woman', 'Man', 'Non-binary', 'Trans woman', 'Trans man', 'Genderfluid', 'Agender', 'Other', 'Prefer not to say'],
  orientation: ['', 'Straight', 'Gay', 'Lesbian', 'Bisexual', 'Pansexual', 'Asexual', 'Queer', 'Questioning', 'Other', 'Prefer not to say'],
}

export const LANGS = ['', 'Arabic', 'Bengali', 'Bulgarian', 'Burmese', 'Cantonese', 'Catalan', 'Croatian', 'Czech', 'Danish', 'Dutch', 'English', 'Estonian', 'Filipino', 'Finnish', 'French', 'German', 'Greek', 'Gujarati', 'Hausa', 'Hebrew', 'Hindi', 'Hungarian', 'Icelandic', 'Igbo', 'Indonesian', 'Italian', 'Japanese', 'Javanese', 'Kannada', 'Kazakh', 'Khmer', 'Korean', 'Kurdish', 'Lao', 'Latvian', 'Lithuanian', 'Malay', 'Malayalam', 'Mandarin', 'Marathi', 'Mongolian', 'Nepali', 'Norwegian', 'Pashto', 'Persian', 'Polish', 'Portuguese', 'Punjabi', 'Romanian', 'Russian', 'Serbian', 'Sinhala', 'Slovak', 'Slovenian', 'Somali', 'Spanish', 'Swahili', 'Swedish', 'Tagalog', 'Tamil', 'Telugu', 'Thai', 'Turkish', 'Ukrainian', 'Urdu', 'Uzbek', 'Vietnamese', 'Welsh', 'Yoruba', 'Zulu', 'Other']

// Political lean treated as an ordinal scale so "opposite" pairing is meaningful.
export const POL_SCALE = {
  'Far left': 0,
  Left: 1,
  'Center-left': 2,
  Center: 3,
  'Center-right': 4,
  Right: 5,
  'Far right': 6,
}

export const PAIRING_MODES = [
  { id: 'roulette', label: 'Roulette', hint: 'Connect to anyone waiting, completely at random.' },
  { id: 'similar', label: 'Same wavelength', hint: 'Ranks waiting people by how much you have in common, picks the closest.' },
  { id: 'opposite', label: 'Opposite', hint: 'Deliberately pairs you with the most different person on-air. Good faith, not a debate cage.' },
  { id: 'complementary', label: 'Complementary', hint: 'Shared culture, clashing politics. Same fandoms, opposite lean.' },
  { id: 'filter', label: 'Filter', hint: 'Only pair with people who agree on the axes you pick below.' },
  { id: 'browse', label: 'Browse lobby', hint: 'See everyone waiting, read their cards, and pick who to ring yourself.' },
]

// Axes a filter can require agreement on.
export const FILTER_AXES = ['politics', 'religion', 'gender', 'orientation', 'language', 'country', 'state']

// Quick reactions available in a call.
export const REACTIONS = [
  { id: 'wave', label: 'wave' },
  { id: 'laugh', label: 'ha' },
  { id: 'heart', label: 'heart' },
  { id: 'mind', label: 'whoa' },
  { id: 'skull', label: 'rip' },
  { id: 'fire', label: 'fire' },
]

export const THEMES = [
  { id: 'dead-channel', label: 'Dead channel' },
  { id: 'amber', label: 'Amber CRT' },
  { id: 'clean', label: 'High contrast' },
]

// CLASP address builder. Everything is namespaced under the active frequency
// so separate frequencies never collide on the shared public relay.
export function ns(freq, ...parts) {
  return '/static/' + freq + '/' + parts.join('/')
}

export const PASSPORT_PREFIX = 'STATIC1.'
