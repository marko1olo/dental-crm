const fs = require("fs");
const path =
	"C:\\Clinic_MVP\\dental-crm\\apps\\api\\src\\db\\domainStateHydration.ts";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
	'${slices.map((entry) => entry.slice).join(", ")}.`',
	'${slices.map((entry) => entry.slice + " - " + (entry as any).error).join(", ")}.`',
);

fs.writeFileSync(path, content, "utf8");
console.log("Patched");
