const fs = require('fs');

let content = fs.readFileSync('apps/api/src/sampleData.ts', 'utf8');

// Replace in ServiceCatalogItem
content = content.replace(/export const serviceCatalog: ServiceCatalogItem\[\] = \[([\s\S]*?)\];/g, (match, body) => {
    return 'export const serviceCatalog: ServiceCatalogItem[] = [' + body.replace(/title: "([^"]+)",/g, 'title: "$1",\n    aliases: [],') + '];';
});

// Replace in patients
content = content.replace(/export const patients: Patient\[\] = \[([\s\S]*?)\];/g, (match, body) => {
    return 'export const patients: Patient[] = [' + body.replace(/administrativeProfile:\s*null,/g, 'administrativeProfile: null,\n    balanceRub: 0,') + '];';
});
content = content.replace(/function createNewPatientForDocument\(([\s\S]*?)return patient;/g, (match) => {
    return match.replace(/administrativeProfile:\s*normalizePatientAdministrativeProfile\(input\.administrativeProfile\),/g, 'administrativeProfile: normalizePatientAdministrativeProfile(input.administrativeProfile),\n    balanceRub: 0,');
});

// Replace in treatmentPlanItems
content = content.replace(/export const treatmentPlanItems: TreatmentPlanItem\[\] = \[([\s\S]*?)\];/g, (match, body) => {
    return 'export const treatmentPlanItems: TreatmentPlanItem[] = [' + body.replace(/serviceId: "([^"]+)",\n/g, 'serviceId: "$1",\n    snapshotServiceName: "Legacy Snapshot",\n    snapshotServiceCategory: null,\n') + '];';
});

fs.writeFileSync('apps/api/src/sampleData.ts', content);
console.log('Patched properly');
