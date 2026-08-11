export const INCIDENT_TYPES = [
  'Aggressive / Challenging Behaviour',
  'Self-Harm',
  'Suicide Attempt / Ideation',
  'Substance Misuse',
  'Missing Person / AWOL',
  'Accident / Injury',
  'Safeguarding Concern',
  'Criminal Activity',
  'Domestic Abuse',
  'Sexual Exploitation / CSE',
  'County Lines / Criminal Exploitation',
  'Mental Health Crisis',
  'Medical Emergency',
  'Property Damage',
  'Fire / Evacuation',
  'Allegation Against Staff',
  'Restraint / Physical Intervention',
  'Theft',
  'Other',
] as const

export const INCIDENT_SEVERITIES = [
  { value: 'low', label: 'Low', colour: 'green' },
  { value: 'medium', label: 'Medium', colour: 'amber' },
  { value: 'high', label: 'High', colour: 'orange' },
  { value: 'critical', label: 'Critical', colour: 'red' },
] as const

export const OFSTED_REPORTABLE_TYPES = [
  'Safeguarding Concern',
  'Sexual Exploitation / CSE',
  'County Lines / Criminal Exploitation',
  'Restraint / Physical Intervention',
  'Allegation Against Staff',
  'Suicide Attempt / Ideation',
  'Missing Person / AWOL',
]
