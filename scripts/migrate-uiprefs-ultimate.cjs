const fs = require('fs');

const appLogic = fs.readFileSync('apps/web/src/useAppLogic.tsx', 'utf-8');
const lines = appLogic.split('\n');

const startIdx = lines.findIndex(l => l.includes('function currentUiPreferencesInput(): UiPreferencesInput {'));
let endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
    if (lines[i] === '\t}, []);' && lines[i+1].includes('useEffect(() => {') && lines[i+2].includes('if (typeof window === "undefined") return undefined;')) {
        endIdx = i;
        break;
    }
}

const blockToMove = lines.slice(startIdx, endIdx + 1).join('\n');
lines.splice(startIdx, endIdx - startIdx + 1);

const refStart = lines.findIndex(l => l.includes('const recordedPatientViewRef'));
const refEnd = lines.findIndex(l => l.includes('const [recentPatientViewsVersion'));
const refsBlockToMove = lines.slice(refStart, refEnd + 1).join('\n');
lines.splice(refStart, refEnd - refStart + 1);

const uiPrefsVarsMatch = blockToMove.match(/return \{\n([\s\S]*?)\t\};/);
const uiPrefsVarsStr = uiPrefsVarsMatch[1].trim().split('\n').map(l => l.trim().replace(/,.*/, '').replace(/:.*/, '')).filter(x => x);

let propsInterface = 'export interface UiPreferencesLogicProps {\n';
let propsDestructuring = '\tconst {\n';
let propsPassing = '    const uiPreferencesLogic = useUiPreferencesLogic({\n';

const addedProps = new Set();
const addProp = (name) => {
    if (addedProps.has(name)) return;
    addedProps.add(name);
    propsInterface += `\t${name}: any;\n`;
    propsDestructuring += `\t\t${name},\n`;
    propsPassing += `\t\t${name},\n`;
};

// Add standard ones
addProp('dashboard');
addProp('auth');
addProp('showToast');
addProp('actionFailureToast');
addProp('saveServerUiPreferences');
addProp('uiPreferencesSyncErrorMessage');
addProp('operatorWorkflowFailureMessage');
addProp('loadServerUiPreferences');
addProp('loadUiPreferences');
addProp('safeLocalStorageSetItem');
addProp('uiPreferencesStorageKey');
addProp('saveUiPreferences');
addProp('browserCapabilityFailureMessage');
addProp('inspectBrowserContinuity');
addProp('loadPersistenceHealthRef');
addProp('refreshSpeechRuntimeRef');
addProp('settingsAdminSecretSession');
addProp('setError');
addProp('responseErrorMessage');
addProp('loadWorkspaceProfile');
addProp('pricelistLogic');
addProp('uiPreferencesSyncError');
addProp('setUiPreferencesSyncError');
addProp('uiPreferencesHydrated');
addProp('setUiPreferencesHydrated');
addProp('persistenceHealth');
addProp('setPersistenceHealth');
addProp('persistenceIntegrity');
addProp('setPersistenceIntegrity');
addProp('isPersistenceExporting');
addProp('setIsPersistenceExporting');
addProp('browserContinuity');
addProp('setBrowserContinuity');
addProp('localBridgeReadiness');
addProp('setLocalBridgeReadiness');
addProp('localBridgeUsePlans');
addProp('setLocalBridgeUsePlans');

// Add all from currentUiPreferencesInput
uiPrefsVarsStr.forEach(v => {
    addProp(v);
    if (v !== 'uiLanguageOptions') {
        const capitalized = v.charAt(0).toUpperCase() + v.slice(1);
        addProp(`set${capitalized}`);
    }
});

propsInterface += '}\n';
propsDestructuring += '\t} = props;\n';
propsPassing += '    });\n';

const exportedFunctions = [
    'currentUiPreferencesInput',
    'clearUiPreferencesRetryTimer',
    'queueUiPreferencesServerSync',
    'flushPendingUiPreferencesServerSync',
    'loadPersistenceHealth',
    'loadPersistenceIntegrity',
    'downloadPersistenceExport',
    'refreshBrowserContinuity',
    '_loadLocalBridgeReadiness',
    'loadLocalBridgeUsePlans',
    'requestBrowserStoragePersistence',
    'applyUiPreferences',
    'recentPatientViewsVersion'
];

const newHookCode = `import { useRef, useEffect, useCallback, useState } from "react";
import type { MutableRefObject } from "react";
import type { UiPreferences, UiPreferencesInput, PersistenceHealth, PersistenceIntegrityReport } from "../../AppHelpers";
import { normalizePersistenceHealth } from "../../AppHelpers";
import type { LocalBridgeReadinessResponse, LocalBridgeUsePlansResponse } from "@dental/shared";

${propsInterface}

export function useUiPreferencesLogic(props: UiPreferencesLogicProps) {
${propsDestructuring}
	
	const uiPreferencesServerReadyRef = useRef(false);
	const uiPreferencesSyncInFlightRef = useRef(false);
	const uiPreferencesRetryTimerRef = useRef<number | null>(null);
	const pendingUiPreferencesSyncRef = useRef<UiPreferences | null>(null);
	const uiPreferencesHydratedRef = useRef(false);

${refsBlockToMove}

${blockToMove}

	return {
		${exportedFunctions.join(',\n\t\t')}
	};
}
`;

fs.writeFileSync('apps/web/src/hooks/domains/useUiPreferencesLogic.ts', newHookCode);
console.log('Created useUiPreferencesLogic.ts');

const insertPos = lines.findIndex(l => l.includes('const onboardingLogic = useOnboardingLogic('));
lines.splice(insertPos, 0, `
${propsPassing}
    const {
${exportedFunctions.map(f => `        ${f},`).join('\n')}
    } = uiPreferencesLogic;
`);

const importPos = lines.findIndex(l => l.includes('import { useOnboardingLogic }'));
lines.splice(importPos, 0, 'import { useUiPreferencesLogic } from "./hooks/domains/useUiPreferencesLogic";');

fs.writeFileSync('apps/web/src/useAppLogic.tsx', lines.join('\n'));
console.log('Updated useAppLogic.tsx');
