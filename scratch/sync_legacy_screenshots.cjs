const fs = require('fs');
const path = require('path');

const screenshotsDir = path.join(__dirname, '..', 'screenshots');
const artifactDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\1fecd2ac-51cd-4ae1-bf1e-713d41b83fd7";

const mapping = {
  // Shift / Dashboard
  '01_dashboard.png': 'screen_pc_light_shift.png',
  '01_shift_fixed.png': 'screen_pc_light_shift.png',
  'pc_shift.png': 'screen_pc_light_shift.png',
  'mobile_shift.png': 'screen_mobile_light_shift.png',

  // Schedule
  '02_schedule.png': 'screen_pc_light_schedule.png',
  '02_schedule_fixed.png': 'screen_pc_light_schedule.png',
  'schedule_desktop.png': 'screen_pc_light_schedule.png',
  'pc_schedule.png': 'screen_pc_light_schedule.png',
  'schedule_mobile.png': 'screen_mobile_light_schedule.png',
  'mobile_schedule.png': 'screen_mobile_light_schedule.png',

  // Patients
  '03_patients.png': 'screen_pc_light_patients.png',
  '03_patients_fixed.png': 'screen_pc_light_patients.png',
  'patients_desktop.png': 'screen_pc_light_patients.png',
  'pc_patients.png': 'screen_pc_light_patients.png',
  'patients_mobile.png': 'screen_mobile_light_patients.png',
  'mobile_patients.png': 'screen_mobile_light_patients.png',

  // Visit
  '04_visit_fixed.png': 'screen_pc_light_visit.png',
  '05_visit.png': 'screen_pc_light_visit.png',
  'visit_desktop.png': 'screen_pc_light_visit.png',
  'pc_visit.png': 'screen_pc_light_visit.png',
  'visit_mobile.png': 'screen_mobile_light_visit.png',
  'mobile_visit.png': 'screen_mobile_light_visit.png',

  // Imaging
  'imaging_desktop.png': 'screen_pc_light_imaging.png',
  'imaging_mobile.png': 'screen_mobile_light_imaging.png',

  // Finance
  'pc_finance.png': 'screen_pc_light_finance.png',
  'mobile_finance.png': 'screen_mobile_light_finance.png',

  // Documents
  '05_documents_fixed.png': 'screen_pc_light_finance.png',
  'pc_documents.png': 'screen_pc_light_finance.png',
  'mobile_documents.png': 'screen_mobile_light_finance.png',
};

// Check all files in directory and copy fresh images onto legacy filenames
const files = fs.readdirSync(screenshotsDir);
console.log(`Found ${files.length} files in screenshots/`);

for (const file of files) {
  let sourceName = mapping[file];
  if (!sourceName) {
    if (file.includes('смена') || file.includes('01')) sourceName = 'screen_pc_light_shift.png';
    else if (file.includes('записи') || file.includes('02') || file.includes('schedule')) sourceName = 'screen_pc_light_schedule.png';
    else if (file.includes('пациент') || file.includes('03') || file.includes('patient')) sourceName = 'screen_pc_light_patients.png';
    else if (file.includes('прием') || file.includes('04') || file.includes('visit')) sourceName = 'screen_pc_light_visit.png';
    else if (file.includes('снимок') || file.includes('imaging')) sourceName = 'screen_pc_light_imaging.png';
    else if (file.includes('оплаты') || file.includes('документ') || file.includes('finance')) sourceName = 'screen_pc_light_finance.png';
  }

  if (sourceName) {
    const srcPath = path.join(screenshotsDir, sourceName);
    const destPath = path.join(screenshotsDir, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Updated legacy file ${file} <- ${sourceName}`);
    }
  }
}

console.log("All legacy screenshot files overwritten with fresh captured images successfully.");
