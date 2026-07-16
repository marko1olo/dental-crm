import * as fs from "fs";
import { Project, SyntaxKind, VariableDeclarationList } from "ts-morph";

const project = new Project();
project.addSourceFilesAtPaths("apps/web/src/**/*.tsx");

const settingsViewFile = project.getSourceFileOrThrow(
	"apps/web/src/SettingsView.tsx",
);

// Find the SettingsView function
const settingsViewFn = settingsViewFile.getFunctionOrThrow("SettingsView");

console.log("Found SettingsView");
