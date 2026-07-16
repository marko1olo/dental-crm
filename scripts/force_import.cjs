const fs = require("fs");

const path = "apps/web/src/SettingsView.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("import { SettingsSourcesTab }")) {
	content =
		'import { SettingsSourcesTab } from "./components/settings/SettingsSourcesTab";\n' +
		content;
}

fs.writeFileSync(path, content);
console.log("Forced import");
