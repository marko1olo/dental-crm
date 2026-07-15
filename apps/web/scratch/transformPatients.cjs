const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "../src/PatientsView.tsx");
let content = fs.readFileSync(file, "utf8");

// Wrap admin grid in details
const oldAdminGrid =
	'<div className="clinic-profile-form-grid patient-admin-form-grid">';
const newAdminGrid = `
                <details className="patient-admin-details" style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--slate-700)' }}>Дополнительные документы и адреса (развернуть)</summary>
                  <div style={{ marginTop: '12px' }}>
                <div className="clinic-profile-form-grid patient-admin-form-grid">`;
content = content.replace(oldAdminGrid, newAdminGrid);

// Close the admin details just before the save button for it
const oldSaveAdmin = `<button
                  className="primary-button"
                  type="button"
                  onClick={savePatientAdministrativeProfile}`;
const newSaveAdmin = `</div>
                </details>
                <button
                  className="primary-button"
                  type="button"
                  onClick={savePatientAdministrativeProfile}`;
content = content.replace(oldSaveAdmin, newSaveAdmin);

// Compact the core form grid
const oldCoreGrid =
	'<div className="clinic-profile-form-grid patient-core-form-grid">';
const newCoreGrid =
	'<div className="clinic-profile-form-grid patient-core-form-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>';
content = content.replace(oldCoreGrid, newCoreGrid);

fs.writeFileSync(file, content, "utf8");
console.log("PatientsView.tsx updated safely.");
