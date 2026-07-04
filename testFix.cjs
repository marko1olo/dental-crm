const fs = require('fs');

function fixTests() {
  const t1 = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/tests/imaging.test.ts';
  if (fs.existsSync(t1)) {
    let text = fs.readFileSync(t1, 'utf8');
    text = text.replace(/parseDicomSeriesManifest\(input\)/g, 'parseDicomSeriesManifest("mock-org", input)');
    fs.writeFileSync(t1, text);
  }

  const t2 = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.test.ts';
  if (fs.existsSync(t2)) {
    let text = fs.readFileSync(t2, 'utf8');
    text = text.replace(/parseDicomSeriesManifest\(input\)/g, 'parseDicomSeriesManifest("mock-org", input)');
    fs.writeFileSync(t2, text);
  }
}
fixTests();
