const fs = require('fs');
const path = require('path');

const zones = {
  zone1_visit_emr: [
    'apps/web/src/components/visit',
    'apps/web/src/components/emr',
    'apps/web/src/components/clinical',
    'apps/web/src/VisitView.tsx'
  ],
  zone2_finance_billing: [
    'apps/web/src/components/billing',
    'apps/web/src/components/finance',
    'apps/web/src/components/treatment-plans',
    'apps/web/src/components/pricing',
    'apps/web/src/components/catalog',
    'apps/web/src/FinanceView.tsx'
  ],
  zone3_documents_legal: [
    'apps/web/src/components/documents',
    'apps/web/src/components/consents',
    'apps/web/src/components/egisz',
    'apps/web/src/components/warranty',
    'apps/web/src/components/insurance',
    'packages/shared/src/documents'
  ],
  zone4_schedule_booking_chat: [
    'apps/web/src/components/schedule',
    'apps/web/src/components/booking',
    'apps/web/src/components/chat',
    'apps/web/src/components/leads',
    'apps/web/src/components/recalls',
    'apps/web/src/components/telephony'
  ],
  zone5_settings_inventory_lab: [
    'apps/web/src/components/settings',
    'apps/web/src/components/inventory',
    'apps/web/src/components/sanpin',
    'apps/web/src/components/lab',
    'apps/web/src/components/mdlp'
  ],
  zone6_radiology_ortho_pediatric_portal: [
    'apps/web/src/components/radiology',
    'apps/web/src/components/imaging',
    'apps/web/src/components/orthodontics',
    'apps/web/src/components/orthopedics',
    'apps/web/src/components/pediatric',
    'apps/web/src/components/doctor-portal',
    'apps/web/src/components/help',
    'apps/web/src/components/onboarding',
    'apps/web/src/components/portal',
    'apps/web/src/components/perio',
    'apps/web/src/components/endo',
    'apps/web/src/components/surgery',
    'apps/web/src/components/shift',
    'apps/web/src/components/anesthesia'
  ]
};

function walk(dir) {
  let res = [];
  if (!fs.existsSync(dir)) return res;
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) {
    if (dir.endsWith('.tsx') || dir.endsWith('.ts')) return [dir];
    return [];
  }
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      if (item !== 'node_modules' && item !== 'dist') res = res.concat(walk(full));
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      res.push(full);
    }
  }
  return res;
}

const patterns = [
  /Мандат\s*8[a-z]?/i,
  /Mandate\s*8[a-z]?/i,
  /0\s*блокировок/i,
  /ВНУТРЕННИЙ ЖАРГОН/i,
  /детское говно/i,
  /взрослый стандарт/i,
  /каргокульт/i,
  /Wave\s*\d+/i,
  /804н/
];

for (const [zoneName, roots] of Object.entries(zones)) {
  const allFiles = roots.flatMap(r => walk(r));
  let zoneMatches = [];
  for (const f of allFiles) {
    if (f.includes('__tests__') || f.includes('.test.')) continue;
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((l, idx) => {
      const trim = l.trim();
      if (trim.startsWith('//') || trim.startsWith('/*') || trim.startsWith('*')) return;
      // Check if matches any pattern
      for (const p of patterns) {
        if (p.test(trim)) {
          // Check if it looks like UI: JSX text, attribute (title, aria-label, placeholder, etc.) or string literal
          if (trim.includes('title=') || trim.includes('placeholder=') || trim.includes('aria-label=') || trim.includes('>') || trim.includes('"') || trim.includes("'")) {
            zoneMatches.push({ file: f, line: idx + 1, text: trim });
            break;
          }
        }
      }
    });
  }
  console.log(`=== ${zoneName}: ${zoneMatches.length} matches in ${new Set(zoneMatches.map(m=>m.file)).size} files ===`);
  const uniqueFiles = Array.from(new Set(zoneMatches.map(m=>m.file)));
  console.log('Files:', uniqueFiles.slice(0, 10));
}
