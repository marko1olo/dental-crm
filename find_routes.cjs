const fs = require('fs');
const lines = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8').split('\n');
lines.forEach((l,i) => {
    if(l.includes('window.location.hash =') || l.includes('href="#')) {
        console.log(i+1, l.trim());
    }
});
