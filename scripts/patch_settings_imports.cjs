const fs = require("fs");

const path = "apps/web/src/SettingsView.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
	'{settingsTab === "sources" ? <SettingsSourcesTab props={props} /> : null}',
	'{settingsTab === "sources" ? <SettingsSourcesTab settingsTab={settingsTab} props={props} /> : null}',
);

if (!content.includes("SettingsSourcesTab")) {
	content =
		'import { SettingsSourcesTab } from "./components/settings/SettingsSourcesTab";\n' +
		content;
}

fs.writeFileSync(path, content);
console.log("Patched imports and props in SettingsView.tsx");
