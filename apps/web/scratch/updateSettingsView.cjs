const fs = require("fs");

const file = "apps/web/src/SettingsView.tsx";
const lines = fs.readFileSync(file, "utf8").split("\n");

// 1. Insert import
const importStr = `import { SettingsClinicTab } from "./components/settings/SettingsClinicTab";`;
const importIndex = lines.findIndex((line) =>
	line.includes("import { PriceDictationBar }"),
);
if (importIndex !== -1 && !lines.some((l) => l.includes("SettingsClinicTab"))) {
	lines.splice(importIndex + 1, 0, importStr);
}

// 2. Replace the tab JSX
const start = lines.findIndex((line) =>
	line.includes('settingsTab === "clinic" ? ('),
);
const nextTabStart = lines.findIndex((line) =>
	line.includes('settingsTab === "access" ? ('),
);

if (start !== -1 && nextTabStart !== -1) {
	const replacement = `          <SettingsClinicTab 
            settingsTab={settingsTab} 
            props={{
              ...props,
              dashboard,
              weekdayOptions,
              uiLanguageOptions,
              clinicModeLabels,
              staffRoleLabels,
              specialtyLabels,
              legalReadinessPercent,
              legalMissingFields,
              uiLanguage,
              setUiLanguage
            }} 
          />`;

	// We replace from `start` to `nextTabStart - 1`
	lines.splice(start, nextTabStart - start, replacement);
	fs.writeFileSync(file, lines.join("\n"), "utf8");
	console.log("SettingsView.tsx successfully updated.");
} else {
	console.log("Could not find boundaries.");
}
