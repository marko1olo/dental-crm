const fs = require("fs");
const appPath = "C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx";
const lines = fs.readFileSync(appPath, "utf8").split("\n");

const startIdx = 1998;
const endIdx = 2296;

const extractedLines = lines.slice(startIdx, endIdx + 1);

const newComponent = `import React from 'react';
import { useAppLogicContext } from '../../logic/AppLogicContext';

export function OnboardingWizard() {
  const {
    onboardingStep,
    onboardingSteps,
    clinicName,
    handleFinishOnboarding,
  } = useAppLogicContext();

  return (
${extractedLines.join("\n")}
  );
}
`;

fs.mkdirSync("C:/Clinic_MVP/dental-crm/apps/web/src/components/onboarding", {
	recursive: true,
});
fs.writeFileSync(
	"C:/Clinic_MVP/dental-crm/apps/web/src/components/onboarding/OnboardingWizard.tsx",
	newComponent,
);

lines.splice(startIdx, endIdx - startIdx + 1, "      <OnboardingWizard />");
lines.splice(
	55,
	0,
	'import { OnboardingWizard } from "./components/onboarding/OnboardingWizard";',
);

fs.writeFileSync(appPath, lines.join("\n"));
console.log("Successfully extracted OnboardingWizard!");
