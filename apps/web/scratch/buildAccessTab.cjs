const fs = require("fs");

const file = "apps/web/src/SettingsView.tsx";
const lines = fs.readFileSync(file, "utf8").split("\n");

const start = lines.findIndex((line) =>
	line.includes('settingsTab === "access" ? ('),
);
const nextTabStart = lines.findIndex((line) =>
	line.includes('settingsTab === "telegram" ? ('),
);

if (start === -1 || nextTabStart === -1) {
	console.error("Could not find boundaries for access tab.");
	process.exit(1);
}

// The raw JSX
let rawTab = lines.slice(start, nextTabStart).join("\n").trim();
if (rawTab.startsWith('{settingsTab === "access" ? (')) {
	rawTab = rawTab.replace('{settingsTab === "access" ? (', "").trim();
}
if (rawTab.endsWith(") : null}")) {
	rawTab = rawTab.substring(0, rawTab.length - 9).trim();
}

// Write the new component
const imports = `import React from "react";
import { UserCheck, ShieldCheck } from "lucide-react";
import { viewLabels as workspaceViewLabels } from "../../workspaceShell";
import { StaffRole } from "@dental/shared";
type WorkspaceProfile = any;
type RoleAccessPolicy = any;
`;

const componentStart = `
export function SettingsAccessTab({ props, settingsTab }: { props: Record<string, any>, settingsTab: string }) {
  const {
    dashboard,
    activeWorkspaceProfile,
    workspaceScopeLabels,
    staffRoleLabels,
    clinicModeLabels,
    policyAuditEventLabels
  } = props;
  const viewLabels = workspaceViewLabels as Record<string, string>;

  if (settingsTab !== "access") return null;

  const typedActiveWorkspaceProfile = activeWorkspaceProfile as WorkspaceProfile | null;
  const typedWorkspaceProfiles = dashboard.clinicSettings.workspaceProfiles as WorkspaceProfile[];
  const typedRoleAccessPolicies = dashboard.clinicSettings.roleAccessPolicies as RoleAccessPolicy[];

  return (
`;

const componentEnd = `
  );
}
`;

fs.writeFileSync(
	"apps/web/src/components/settings/SettingsAccessTab.tsx",
	imports + componentStart + rawTab + componentEnd,
	"utf8",
);

// Update SettingsView.tsx
const importStr = `import { SettingsAccessTab } from "./components/settings/SettingsAccessTab";`;
const importIndex = lines.findIndex((line) =>
	line.includes("import { SettingsClinicTab }"),
);
if (importIndex !== -1 && !lines.some((l) => l.includes("SettingsAccessTab"))) {
	lines.splice(importIndex + 1, 0, importStr);
}

const newStart = lines.findIndex((line) =>
	line.includes('settingsTab === "access" ? ('),
);
const newNextTabStart = lines.findIndex((line) =>
	line.includes('settingsTab === "telegram" ? ('),
);

if (newStart !== -1 && newNextTabStart !== -1) {
	const replacement = `          <SettingsAccessTab 
            settingsTab={settingsTab} 
            props={{
              ...props,
              dashboard,
              workspaceScopeLabels,
              staffRoleLabels,
              clinicModeLabels,
              policyAuditEventLabels
            }} 
          />`;

	lines.splice(newStart, newNextTabStart - newStart, replacement);
	fs.writeFileSync(file, lines.join("\n"), "utf8");
	console.log("SettingsAccessTab extracted and SettingsView.tsx updated.");
}
