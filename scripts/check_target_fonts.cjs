const fs = require("fs");

const files = [
  "apps/web/src/components/radiology/archive/RadiologyStudiesArchive.tsx",
  "apps/web/src/components/radiology/archive/RadiologyStudyRow.tsx",
  "apps/web/src/components/radiology/RadiologyReferralModal.tsx",
  "apps/web/src/components/imaging/DicomImportManagerModal.tsx",
  "apps/web/src/components/radiology/archive/StudyPatientBindControlModal.tsx",
  "apps/web/src/components/imaging/CtStudyViewer.tsx",
  "apps/web/src/components/imaging/VisiographCockpitPresets.tsx",
  "apps/web/src/components/imaging/DicomToolboxRibbon.tsx",
  "apps/web/src/components/imaging/DicomAutoDetectStatusBadge.tsx",
  "apps/web/src/components/radiology/RadiologyModule.tsx"
];

let totalIssues = 0;

for (const f of files) {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  let fileIssues = 0;
  lines.forEach((line, idx) => {
    if (/text-\[(10|11)px\]|fontSize:\s*["'](10|11)px["']/.test(line)) {
      console.log(`${f}:${idx + 1}: ${line.trim()}`);
      fileIssues++;
      totalIssues++;
    }
  });
  if (fileIssues === 0) {
    console.log(`✅ ${f}: CLEAN (0 micro-fonts)`);
  }
}

console.log(`\nTotal micro-font lines found: ${totalIssues}`);
