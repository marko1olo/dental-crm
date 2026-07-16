const fs = require('fs');

const aiContent = fs.readFileSync('ai_blocks.txt', 'utf8');

const imports = `import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	Bot,
	Sparkles,
	UploadCloud,
} from "lucide-react";
import type { ChangeEvent } from "react";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = ChangeEvent<HTMLInputElement>;
`;

const tabTemplate = `${imports}

export function SettingsAiTab() {
	const props = useAppLogicContext();
	const {
		recognitionPresets,
		speechProviders,
		dictationHistory,
		recognitionJob,
		speechProviderRuntimeById,
		speechProviderHealthById,
		speechProviderStatusLabels,
		speechProviderModeLabels,
		speechProviderConnectorLabels,
		speechProviderHealthLabels,
		recognitionKind,
		recognitionTarget,
		chooseRecognitionPreset,
		recognitionText,
		setRecognitionText,
		setRecognitionJob,
		recognitionTargetLabels,
		runRecognitionJob,
		isRecognitionLoading,
		recognitionInputReady,
		aiRecognitionWarningText,
		sendRecognitionResultToImport
	} = props;

	const typedRecognitionPresets = (recognitionPresets ?? []) as any[];
	const typedSpeechProviders = (speechProviders ?? []) as any[];
	const typedDictationHistory = (dictationHistory ?? []) as any[];
	const typedRecognitionJob = recognitionJob as any;

	return (
		<>
${aiContent.replace(/\{settingsTab === "ai" \? \(/g, '').replace(/\n\t\t\t\t\) : null\}/g, '')}
		</>
	);
}
`;

fs.writeFileSync('apps/web/src/components/settings/SettingsAiTab.tsx', tabTemplate, 'utf8');

console.log('SettingsAiTab created.');

// Patch SettingsView.tsx
let viewContent = fs.readFileSync('apps/web/src/SettingsView.tsx', 'utf8');
viewContent = `import { SettingsAiTab } from "./components/settings/SettingsAiTab";\n` + viewContent;

const aiRegex = /\{settingsTab === "ai"\s*\?\s*\([\s\S]*?\n\t\t\t\t\)\s*:\s*null\}/g;
viewContent = viewContent.replace(aiRegex, '');

// Insert after Sources tab
viewContent = viewContent.replace(/\{settingsTab === "sources" \? <SettingsSourcesTab \/> : null\}/, '{settingsTab === "sources" ? <SettingsSourcesTab /> : null}\n\t\t\t\t{settingsTab === "ai" ? <SettingsAiTab /> : null}');

fs.writeFileSync('apps/web/src/SettingsView.tsx', viewContent, 'utf8');
console.log('SettingsView patched for AiTab.');

