const fs = require("fs");

const path = "C:\\Clinic_MVP\\dental-crm\\apps\\web\\src\\ScheduleView.tsx";
let content = fs.readFileSync(path, "utf8");

// 1. Add import statement
const importStr =
	'import { AppointmentDraftEditor } from "./components/schedule/AppointmentDraftEditor";\n';
if (!content.includes("AppointmentDraftEditor")) {
	const lastImportIndex = content.lastIndexOf("import ");
	const nextNewline = content.indexOf("\n", lastImportIndex);
	content =
		content.slice(0, nextNewline + 1) +
		importStr +
		content.slice(nextNewline + 1);
}

// 2. Replace the block
const startStr = '<div className="appointment-create-wrapper"';
const endStr = '<div className="schedule-timeline timeline">';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
	console.log("Block not found!");
	process.exit(1);
}

// We need to keep the indentation
const replacement = `            <AppointmentDraftEditor
              dashboard={dashboard}
              newAppointmentDraft={newAppointmentDraft}
              newAppointmentSaveState={newAppointmentSaveState}
              newAppointmentReadyToCreate={newAppointmentReadyToCreate}
              newAppointmentMissingSteps={newAppointmentMissingSteps}
              newAppointmentError={newAppointmentError}
              smartInputText={smartInputText}
              showSmartPreview={showSmartPreview}
              smartParsedData={smartParsedData}
              showHints={showHints}
              showCreateForm={showCreateForm}
              appointmentLabels={appointmentLabels}
              setSmartInputText={setSmartInputText}
              setShowSmartPreview={setShowSmartPreview}
              setSmartParsedData={setSmartParsedData}
              setShowHints={setShowHints}
              setShowCreateForm={setShowCreateForm}
              updateNewAppointmentDraft={updateNewAppointmentDraft}
              createAppointmentFromDraft={createAppointmentFromDraft}
              resetNewAppointmentDraft={resetNewAppointmentDraft}
              toDateTimeLocalValue={toDateTimeLocalValue}
              fromDateTimeLocalValue={fromDateTimeLocalValue}
            />\n            `;

const newContent =
	content.slice(0, startIndex) + replacement + content.slice(endIndex);

fs.writeFileSync(path, newContent, "utf8");
console.log("Successfully replaced the block.");
