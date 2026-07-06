const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const project = new Project();
const sourceFile = project.addSourceFileAtPath("apps/web/src/useAppLogic.tsx");

// Create target file
const targetFile = project.createSourceFile("apps/web/src/hooks/logic/usePatientsLogic.ts", "", { overwrite: true });

targetFile.addImportDeclaration({
  namedImports: ["useMemo", "useCallback"],
  moduleSpecifier: "react"
});

const appLogicFunc = sourceFile.getFunction("useAppLogic");
if (!appLogicFunc) {
  console.error("useAppLogic function not found");
  process.exit(1);
}

// Variables to extract
const patientVars = [
  "activePatientIds",
  "firstActivePatientId",
  "activePatient",
  "selectedPatient",
  "documentPatient",
  "documentPatientMatchesActiveVisit",
  "patientAdministrativeProfileValidationMessage",
  "patientInsightById",
  "activePatientInsight",
  "activePatientCallablePhone",
  "activePatientHasCallablePhone",
  "filteredPatients",
  "patientClinicalRuleEvaluations",
  "patientClinicalRuleSummary",
  "patientBillingSummary",
  "savePatientCore",
  "savePatientAdministrativeProfile"
];

let extractedCode = [];

// Iterate through the statements in useAppLogic
const statements = appLogicFunc.getStatements();
const toRemove = [];

for (const stmt of statements) {
  if (stmt.getKind() === SyntaxKind.VariableStatement) {
    const decList = stmt.getDeclarationList();
    const decs = decList.getDeclarations();
    if (decs.length > 0) {
      const name = decs[0].getName();
      if (patientVars.includes(name)) {
        extractedCode.push(stmt.getText());
        toRemove.push(stmt);
      }
    }
  }
}

targetFile.addFunction({
  name: "usePatientsLogic",
  isExported: true,
  parameters: [
    { name: "props", type: "any" }
  ],
  statements: [
    `const { dashboard, selectedPatientId, patientsFilterQuery, setPatientCoreSaveState, setPatientCoreDirty, patientCoreDraft, setDashboard, setError, showToast, isPatientCreating, setIsPatientCreating, emptyPatientCoreDraft, setPatientCoreDraft, emptyPatientAdministrativeProfileDraft, setPatientAdministrativeProfileDraft, setPatientAdministrativeProfileDirty, setPatientAdministrativeProfileSaveState, patientAdministrativeProfileDraft } = props;`,
    ...extractedCode,
    `return {
      ${patientVars.join(",\n      ")}
    };`
  ]
});

// Remove extracted statements from original file
for (const stmt of toRemove) {
  stmt.remove();
}

// Add hook call to useAppLogic
appLogicFunc.insertStatements(0, `
  const patientLogic = usePatientsLogic({
    dashboard, selectedPatientId, patientsFilterQuery, setPatientCoreSaveState, setPatientCoreDirty, patientCoreDraft, setDashboard, setError, showToast, isPatientCreating, setIsPatientCreating, emptyPatientCoreDraft, setPatientCoreDraft, emptyPatientAdministrativeProfileDraft, setPatientAdministrativeProfileDraft, setPatientAdministrativeProfileDirty, setPatientAdministrativeProfileSaveState, patientAdministrativeProfileDraft
  });
`);

project.saveSync();
console.log("Extraction complete.");
