const fs = require("fs");
const appLines = fs
	.readFileSync("C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx", "utf8")
	.split("\n");

// 1. Remove the bad import
const badImportIdx = appLines.findIndex((l) =>
	l.includes("import { OnboardingWizard }"),
);
if (badImportIdx > -1) {
	appLines.splice(badImportIdx, 1);
}
// Add it at the top properly
appLines.splice(
	2,
	0,
	'import { OnboardingWizard } from "./components/onboarding/OnboardingWizard";',
);

// 2. Fix the Onboarding return
const obIdx = appLines.findIndex((l) => l.includes("<OnboardingWizard />"));
if (obIdx > -1) {
	// Replace the next lines if they are </main> and </AppLogicContext.Provider>
	appLines[obIdx] =
		"      <AppLogicContext.Provider value={appLogic}><OnboardingWizard /></AppLogicContext.Provider>";
	if (appLines[obIdx + 1].includes("</main>")) appLines.splice(obIdx + 1, 1);
	if (appLines[obIdx + 1].includes("</AppLogicContext.Provider>"))
		appLines.splice(obIdx + 1, 1);
}

fs.writeFileSync(
	"C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx",
	appLines.join("\n"),
);

// 3. Fix OnboardingWizard.tsx
let obLines = fs
	.readFileSync(
		"C:/Clinic_MVP/dental-crm/apps/web/src/components/onboarding/OnboardingWizard.tsx",
		"utf8",
	)
	.split("\n");
// Remove the <AppLogicContext.Provider value={appLogic}> from it
obLines = obLines.filter((l) => !l.includes("<AppLogicContext.Provider"));
// Add missing </main> at the end before );
const retIdx = obLines.findIndex((l) => l.trim() === ");");
if (retIdx > -1) {
	obLines.splice(retIdx, 0, "      </main>");
}

fs.writeFileSync(
	"C:/Clinic_MVP/dental-crm/apps/web/src/components/onboarding/OnboardingWizard.tsx",
	obLines.join("\n"),
);
console.log("Fixed syntax errors!");
