// Countries grouped by Hague Apostille Convention membership.
// Convention membership changes periodically (e.g. Algeria joined July 2026,
// Vietnam takes effect Sept 2026) — this list is current as of mid-2026 but
// staff should confirm unusual or recently-changed destinations.

export const HAGUE_COUNTRIES = [
  'Albania', 'Andorra', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus',
  'Belgium', 'Belize', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil',
  'Brunei', 'Bulgaria', 'Burundi', 'Cabo Verde', 'Canada', 'Chile', 'China (Hong Kong SAR)',
  'China (Macao SAR)', 'Colombia', 'Cook Islands', 'Costa Rica', 'Croatia', 'Cyprus',
  'Czech Republic', 'Denmark', 'Dominica', 'Dominican Republic', 'Ecuador', 'El Salvador',
  'Estonia', 'Eswatini', 'Fiji', 'Finland', 'France', 'Georgia', 'Germany', 'Greece',
  'Grenada', 'Guatemala', 'Guyana', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia',
  'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Kazakhstan', 'Kosovo', 'Kyrgyzstan',
  'Latvia', 'Lesotho', 'Liberia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malawi',
  'Malta', 'Marshall Islands', 'Mauritius', 'Mexico', 'Moldova', 'Monaco', 'Mongolia',
  'Montenegro', 'Morocco', 'Namibia', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niue',
  'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama', 'Paraguay', 'Peru',
  'Philippines', 'Poland', 'Portugal', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis',
  'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
  'São Tomé and Príncipe', 'Saudi Arabia', 'Serbia', 'Seychelles', 'Singapore', 'Slovakia',
  'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Suriname', 'Sweden', 'Switzerland',
  'Tajikistan', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Ukraine',
  'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
  'Venezuela', 'Algeria',
].sort()

export const NON_HAGUE_COUNTRIES = [
  'Afghanistan', 'Angola', 'Bhutan', 'Cambodia', 'Cameroon', 'Chad', 'Congo (DRC)',
  'Congo (Republic)', 'Cuba', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Ethiopia',
  'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Haiti', 'Iran', 'Iraq',
  "Côte d'Ivoire", 'Jordan', 'Kenya', 'Kuwait', 'Laos', 'Lebanon', 'Libya',
  'Madagascar', 'Mali', 'Mauritania', 'Mozambique', 'Myanmar', 'Nepal', 'Niger',
  'Nigeria', 'North Korea', 'Palestine', 'Papua New Guinea', 'Qatar', 'Senegal',
  'Sierra Leone', 'Somalia', 'South Sudan', 'Sri Lanka', 'Sudan', 'Syria', 'Tanzania',
  'Thailand', 'Timor-Leste', 'Togo', 'Turkmenistan', 'Uganda',
  'United Arab Emirates', 'Vietnam (until Sept 2026)', 'Yemen', 'Zambia', 'Zimbabwe',
].sort()

// Every embassy this business might route an embassy-legalization order through —
// same country set as above, combined, for the "Embassy stage" queue.
export const EMBASSY_COUNTRIES = [...HAGUE_COUNTRIES, ...NON_HAGUE_COUNTRIES].sort()

// U.S. states + DC, for the "Secretary of State" queue — this is the state-level
// authentication office handling the document before it moves further down the chain.
export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
  'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana',
  'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah',
  'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
]
