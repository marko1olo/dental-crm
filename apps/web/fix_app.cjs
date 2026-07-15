const fs = require("fs");
let code = fs.readFileSync(
	"C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx",
	"utf8",
);
code = code.replace(
	"export function App() {",
	'import { AppLogicProvider } from "./logic/AppLogicContext";\n\nexport function App() {',
);
fs.writeFileSync("C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx", code);
