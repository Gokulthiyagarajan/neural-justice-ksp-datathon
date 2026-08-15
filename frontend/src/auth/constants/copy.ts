export const COPY = {
  platformName: 'Neural Justice',
  platformNameKn: 'ನ್ಯೂರಲ್ ಜಸ್ಟಿಸ್',
  tagline: 'Secure. Intelligent. Accountable.',
  taglineKn: 'ಸುರಕ್ಷಿತ. ಬುದ್ಧಿವಂತ. ಜವಾಬ್ದಾರಿ.',
  footer: 'Authorised Personnel Only  ·  Karnataka State Police',

  supportEmail: 'neuraljustice@neuraljustice.jo3.org',

  landing: {
    cta: 'Access System →',
  },

  roleSelect: {
    header: 'Select Your Access Role',
    subtext: 'Your role determines your access scope and data visibility',
    continueBtn: 'Continue →',
    selectRoleHint: 'Select a role to continue',
  },

  credentials: {
    usernameLabel: 'Username',
    usernamePlaceholder: 'Enter your username',
    usernameError: 'Username is required',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    forgotCredentials: 'Forgot credentials? Contact your District IT Supervisor',
    helpdeskText: 'Contact Support: neuraljustice@neuraljustice.jo3.org · Available 24/7',
    submitBtn: 'Verify Identity →',
    changeRole: 'Change role',
    invalidCredentials: 'Invalid credentials.',
    attemptsRemaining: (n: number) => `${n} attempt${n === 1 ? '' : 's'} remaining before account lock.`,
    lockoutTitle: 'Account Temporarily Locked',
    lockoutText: `3 failed attempts detected. Your supervisor has been notified. Account will unlock in ${30} minutes or contact IT Helpdesk.`,
  },

  totp: {
    header: 'Two-Factor Verification',
    subtext: 'Enter the 6-digit code from your authenticator app',
    codeExpiresIn: (n: number) => `Code refreshes in ${n}`,
    codeExpired: 'Code expired. Enter the new code from your app.',
    incorrectCode: 'Incorrect code.',
    cantAccess: "Can't access your authenticator app?",
    escalationText: "Can't access your authenticator app? Contact support at neuraljustice@neuraljustice.jo3.org or call KSP IT Helpdesk: 080-2294-3000",
  },

  auditGate: {
    banner: 'CLASSIFIED SYSTEM ACCESS',
    sessionIdLabel: 'SESSION ID',
    accessRoleLabel: 'ACCESS ROLE',
    timestampLabel: 'TIMESTAMP',
    ipAddressLabel: 'IP ADDRESS',
    legalText: `You are accessing the Karnataka State Police Crime Intelligence System. All actions performed during this session are recorded and linked to your Service ID under the Information Technology Act, 2000 and Karnataka Police Act, 1963.

Unauthorised access, data extraction, or misuse of this system constitutes a criminal offence. By proceeding, you confirm that you are an authorised user acting within your designated role and jurisdictional scope.`,
    checkboxLabel: 'I acknowledge I am authorised to access this system and accept full accountability for all actions performed in this session.',
    enterBtn: 'Enter System →',
  },

  dashboardLoad: {
    officerName: 'ASI Rajan Kumar',
    steps: [
      { loading: 'Verifying clearance level...', complete: 'Clearance verified' },
      { loading: 'Loading case assignments...', complete: '14 cases loaded' },
      { loading: 'Initialising AI Copilot...', complete: 'Copilot ready' },
    ],
  },

  forgotMail: {
    title: 'Request to Recover Login Credentials',
    intro:
      'Forgot your credentials? Fill in your official details below — the drafted email is pre-filled for you. Copy it or open your mail client to send it to the Admin and your District IT Supervisor.',
    subject: 'Request to Recover Login Credentials — [Police ID]',
    recipientLabel: 'To: Admin & District IT Supervisor',
    fields: [
      { key: 'officerName', label: 'Full Name', placeholder: 'Officer Name' },
      { key: 'policeId', label: 'Police ID / Employee ID', placeholder: 'Police ID' },
      { key: 'rank', label: 'Rank / Position', placeholder: 'e.g., Inspector, SI, HC' },
      { key: 'department', label: 'Department / Unit', placeholder: 'Department Name' },
      { key: 'station', label: 'Police Station', placeholder: 'Police Station Name' },
      { key: 'district', label: 'District', placeholder: 'District Name' },
      { key: 'email', label: 'Official Email (if applicable)', placeholder: 'Email Address' },
      { key: 'mobile', label: 'Registered Mobile Number', placeholder: 'Mobile Number' },
    ] as const,
    bodyTemplate: `Dear Admin and IT Supervisor,

I hope this email finds you well.

I am writing to request your assistance in recovering the login credentials for my official police system account. Unfortunately, I am unable to access my account as I have forgotten my login credentials.

My account details are as follows:

* **Full Name:** {{officerName}}
* **Police ID / Employee ID:** {{policeId}}
* **Rank / Position:** {{rank}}
* **Department / Unit:** {{department}}
* **Police Station:** {{station}}
* **District:** {{district}}
* **Official Email (if applicable):** {{email}}
* **Registered Mobile Number:** {{mobile}}

I kindly request your assistance in resetting my account credentials or providing the necessary steps to regain access. I understand the importance of maintaining the security of official systems and am willing to complete any required identity verification process.

I apologize for the inconvenience and sincerely appreciate your time and support in resolving this matter at your earliest convenience.

Thank you for your assistance. I look forward to your response.

Kind regards,

{{officerName}}
{{rank}}
{{station}}
{{department}}
Police ID: {{policeId}}
Mobile: {{mobile}}
Official Email: {{email}}`,
    copyBtn: 'Copy email',
    openBtn: 'Open in email app',
    closeBtn: 'Close',
    copiedToast: 'Email copied to clipboard',
    sendToast: 'Opening your email app with the drafted request',
  },

  // District -> access-admin / IT-supervisor mailbox.
  // The "Forgot credentials" flow auto-detects the recipient from the
  // district the officer types, so Gmail opens with To: already filled.
  // Unknown districts fall back to the central IT-support inbox.
  districtRecipients: {
    fallback: 'neuraljustice@gmail.com',
    map: {
      'bagalkot': 'it@neuraljustice.in',
      'ballari': 'it@neuraljustice.in',
      'bellary': 'it@neuraljustice.in',
      'belagavi': 'it@neuraljustice.in',
      'belgaum': 'it@neuraljustice.in',
      'bengaluru rural': 'it@neuraljustice.in',
      'bengaluru urban': 'it@neuraljustice.in',
      'bangalore rural': 'it@neuraljustice.in',
      'bangalore urban': 'it@neuraljustice.in',
      'bidar': 'it@neuraljustice.in',
      'chamarajanagar': 'it@neuraljustice.in',
      'chikballapur': 'it@neuraljustice.in',
      'chikkamagaluru': 'it@neuraljustice.in',
      'chikmagalur': 'it@neuraljustice.in',
      'chitradurga': 'it@neuraljustice.in',
      'dakshina kannada': 'it@neuraljustice.in',
      'davanagere': 'it@neuraljustice.in',
      'dharwad': 'it@neuraljustice.in',
      'gadag': 'it@neuraljustice.in',
      'kalaburagi': 'it@neuraljustice.in',
      'gulbarga': 'it@neuraljustice.in',
      'hassan': 'it@neuraljustice.in',
      'haveri': 'it@neuraljustice.in',
      'vijayapura': 'it@neuraljustice.in',
      'bijapur': 'it@neuraljustice.in',
      'kolar': 'it@neuraljustice.in',
      'koppal': 'it@neuraljustice.in',
      'mandya': 'it@neuraljustice.in',
      'mysuru': 'it@neuraljustice.in',
      'mysore': 'it@neuraljustice.in',
      'raichur': 'it@neuraljustice.in',
      'ramanagara': 'it@neuraljustice.in',
      'shivamogga': 'it@neuraljustice.in',
      'shimoga': 'it@neuraljustice.in',
      'tumakuru': 'it@neuraljustice.in',
      'tumkur': 'it@neuraljustice.in',
      'udupi': 'it@neuraljustice.in',
      'uttara kannada': 'it@neuraljustice.in',
      'karwar': 'it@neuraljustice.in',
      'vijayanagara': 'it@neuraljustice.in',
      'yadgir': 'it@neuraljustice.in',
    } as Record<string, string>,
  } as const,
};

/** Resolve the access-admin recipient for a district (case/space/paren insensitive). */
export function resolveDistrictRecipient(district: string): string {
  const fb = COPY.districtRecipients.fallback;
  const raw = (district || '').trim().toLowerCase();
  if (!raw) return fb;
  const map = COPY.districtRecipients.map as Record<string, string>;
  // direct match
  if (map[raw]) return map[raw];
  // strip parentheticals and extra spaces, then match
  const normalized = raw.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
  if (map[normalized]) return map[normalized];
  // starts-with match (e.g. "Bengaluru" -> bengaluru urban/rural)
  const partial = Object.keys(map).find((k) => normalized.startsWith(k) || k.startsWith(normalized));
  return partial ? map[partial] : fb;
}