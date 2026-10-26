import fs from "node:fs";
import path from "node:path";

const targetDir = "apps/web/src/components/messaging/styles";
const targetFiles = fs.readdirSync(targetDir);
const combinedTarget = targetFiles.map((f) => fs.readFileSync(path.join(targetDir, f), "utf-8")).join("\n");
const targetClasses = new Set(combinedTarget.match(/\.[\w-]+/g) || []);

const jsxFiles = [
	"apps/web/src/components/messaging/PatientOmnichannelHubModal.tsx",
	"apps/web/src/components/messaging/SbpPaymentQrModal.tsx",
	"apps/web/src/components/messaging/omnichannelHub/OmnichannelChatTab.tsx",
	"apps/web/src/components/messaging/omnichannelHub/OmnichannelFooter.tsx",
	"apps/web/src/components/messaging/omnichannelHub/OmnichannelHeader.tsx",
	"apps/web/src/components/messaging/omnichannelHub/OmnichannelNpsTab.tsx",
	"apps/web/src/components/messaging/omnichannelHub/OmnichannelTemplatesTab.tsx",
];

const usedClasses = new Set();
for (const f of jsxFiles) {
	if (fs.existsSync(f)) {
		const content = fs.readFileSync(f, "utf-8");
		const matches = content.match(/className=["'][^"']+["']/g) || [];
		for (const m of matches) {
			const raw = m.slice(11, -1);
			for (const c of raw.split(/\s+/)) {
				if (c.startsWith("hub-") || c.startsWith("omnichannel-") || c.startsWith("sbp-") || c.startsWith("nps-")) {
					usedClasses.add("." + c);
				}
			}
		}
	}
}

console.log("Total used component classes:", usedClasses.size);
let missing = 0;
for (const c of usedClasses) {
	if (!targetClasses.has(c)) {
		console.log("Missing component class:", c);
		missing++;
	}
}
console.log("Total missing component classes:", missing);
