const fs = require("fs");
const errors = fs.readFileSync("scratch_ts_errors.log", "utf8");

const regex = /error TS\d+: Cannot find name '(\w+)'/g;
const missingVars = new Set();
let match;
while ((match = regex.exec(errors)) !== null) {
	missingVars.add(match[1]);
}

missingVars.delete("typedTelegramFeaturePlan");

console.log("Found missing variables:", missingVars.size);

if (missingVars.size === 0) process.exit(0);

const tabFile = "apps/web/src/components/settings/SettingsTelegramTab.tsx";
let tabCode = fs.readFileSync(tabFile, "utf8");

// The destructuring block in SettingsTelegramTab ends with:
//   } = props;
// Let's replace the FIRST occurrence of '} = props;' after we find SettingsTelegramTab
const newVars = Array.from(missingVars)
	.map((v) => "    " + v)
	.join(",\n");

tabCode = tabCode.replace(/\s*\} = props;/, ",\n" + newVars + "\n  } = props;");
fs.writeFileSync(tabFile, tabCode, "utf8");

const viewFile = "apps/web/src/SettingsView.tsx";
let viewCode = fs.readFileSync(viewFile, "utf8");

// In SettingsView, the props injection for SettingsTelegramTab looks like:
//              telegramPreviewStaffGuidanceId
//            }}
//          />
const newViewVars = Array.from(missingVars)
	.map((v) => "              " + v)
	.join(",\n");
viewCode = viewCode.replace(
	/(\s*)\}\} \n\s*\/>/,
	",\n" + newViewVars + "$1}} \n          />",
);
fs.writeFileSync(viewFile, viewCode, "utf8");

console.log("Fixed missing variables!");
