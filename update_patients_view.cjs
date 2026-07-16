const fs = require('fs');
let c = fs.readFileSync('apps/web/src/PatientsView.tsx', 'utf8');

if (!c.includes('import { PatientFamilyCard }')) {
	c = c.replace(
		'import { usePatientStore } from "./store/patientStore";',
		'import { PatientFamilyCard } from "./components/patients/PatientFamilyCard";\nimport { usePatientStore } from "./store/patientStore";'
	);
}

fs.writeFileSync('apps/web/src/PatientsView.tsx', c, 'utf8');
console.log('Fixed PatientsView.tsx import');
