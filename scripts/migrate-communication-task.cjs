const fs = require('fs');

let appLogic = fs.readFileSync('apps/web/src/useAppLogic.tsx', 'utf-8');
const lines = appLogic.split('\n');

const startIdx = lines.findIndex(l => l.includes('async function completeCommunicationTask('));
let endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
    if (lines[i].includes('setCommunicationSavingTaskId(null);')) {
        endIdx = i + 2; // } finally { ... } }
        break;
    }
}

lines.splice(startIdx, endIdx - startIdx + 1);

const insertPos = lines.findIndex(l => l.includes('const uiPreferencesLogic = useUiPreferencesLogic('));
lines.splice(insertPos, 0, `
	const { completeCommunicationTask } = useCommunicationTaskLogic({
		auth,
		setError,
		loadDashboard,
		showToast,
		actionFailureToast,
		responseErrorMessage,
		operatorWorkflowFailureMessage,
	});
`);

const importPos = lines.findIndex(l => l.includes('import { useUiPreferencesLogic }'));
lines.splice(importPos, 0, 'import { useCommunicationTaskLogic } from "./hooks/domains/useCommunicationTaskLogic";');

fs.writeFileSync('apps/web/src/useAppLogic.tsx', lines.join('\n'));
console.log('Removed completeCommunicationTask from useAppLogic.tsx');
