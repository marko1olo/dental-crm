const fs = require('fs');
const { execSync } = require('child_process');

const path = 'C:/Clinic_MVP/dental-crm/apps/web/src/useAppLogic.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Remove useDocumentStore and its destructuring
code = code.replace(/const documentState = useDocumentStore\(\);[\s\S]*?\} = documentState;/g, '');

// 2. Remove the 7 refs
const refsToRemove = [
    'releaseSourceRequestAutofillRef',
    'taxPaymentSelectionHydratedKeyRef',
    'paymentReceiptSelectionHydratedKeyRef',
    'outpatient025uDraftHydratedKeyRef',
    'medicalRecordExtractDraftHydratedKeyRef',
    'initialDocumentIssueSignatureDraftRef',
    'documentIssueSignatureHydratedOrganizationIdRef'
];
refsToRemove.forEach(ref => {
    // Regex up to `);`
    const regex = new RegExp(`\\s*const ${ref}\\s*=[\\s\\S]*?useRef[\\s\\S]*?\\);`, 'g');
    code = code.replace(regex, '');
});

// 3. Remove block from activeDocuments to openCommunicationTaskDocumentWorkflow
const startStr = 'const activeDocuments = useMemo(() => {';
const endStr = 'function openCommunicationTaskDocumentWorkflow(';

const startIdx = code.indexOf(startStr);
const funcIdx = code.indexOf(endStr, startIdx);

if (startIdx !== -1 && funcIdx !== -1) {
    // find end of openCommunicationTaskDocumentWorkflow
    let braceCount = 0;
    let foundBrace = false;
    let endIdx = funcIdx;
    for (let i = funcIdx; i < code.length; i++) {
        if (code[i] === '{') { braceCount++; foundBrace = true; }
        if (code[i] === '}') { braceCount--; }
        if (foundBrace && braceCount === 0) {
            endIdx = i + 1; // include the brace
            break;
        }
    }
    
    if (endIdx > funcIdx) {
        const hookCall = `
	const documentWorkflow = useDocumentWorkflowModule({
		dashboard,
		auth,
		activeDoctor,
		activePayments,
		activeTreatmentPlanItems,
		documentPatient,
		clinicProfileDraft,
		activeAppointment,
		visitNoteForm,
		clinicalAdminSecretSession,
		setError,
		loadDashboard,
		changePostVisitCareTopic,
		setCurrentView
	});\n`;
        code = code.substring(0, startIdx) + hookCall + code.substring(endIdx);
    }
}

// 4. Add import at the very top
const importLine = `import { useDocumentWorkflowModule } from "./hooks/domains/useDocumentWorkflowModule";\n`;
code = importLine + code;

// 5. Add ...documentWorkflow to the main return
const retIdx = code.lastIndexOf('return {');
if (retIdx !== -1) {
    code = code.substring(0, retIdx + 8) + '\n\t\t...documentWorkflow,' + code.substring(retIdx + 8);
}

fs.writeFileSync(path, code);
console.log('File modified, running tsc loop...');

function compileAndFix() {
    console.log('Running tsc...');
    try {
        execSync('npx tsc -b apps/web --noEmit', { cwd: 'C:/Clinic_MVP/dental-crm', stdio: 'pipe' });
        console.log('TypeScript compilation successful!');
    } catch (err) {
        const output = err.stdout.toString() + '\\n' + err.stderr.toString();
        const missingNames = new Set();
        const lines = output.split('\\n');
        for (const line of lines) {
            if (line.includes('useAppLogic.tsx') && (line.includes('TS2304') || line.includes('TS2552') || line.includes('TS2322'))) {
                const match = line.match(/Cannot find name '([^']+)'/);
                if (match) {
                    missingNames.add(match[1]);
                }
            }
        }
        
        if (missingNames.size === 0) {
            console.error('Compilation failed but no missing names found.');
            console.error(output);
            process.exit(1);
        }
        
        console.log('Found missing names: ' + Array.from(missingNames).join(', '));
        
        let fileCode = fs.readFileSync(path, 'utf8');
        let linesArr = fileCode.split('\\n');
        const retLineIdx = linesArr.findLastIndex(l => l.trim().startsWith('return {'));
        let removed = 0;
        for (let i = retLineIdx + 1; i < linesArr.length; i++) {
            const t = linesArr[i].trim();
            for (const name of missingNames) {
                if (t === name + ',' || t === name) {
                    linesArr.splice(i, 1);
                    removed++;
                    i--;
                    break;
                }
            }
        }
        
        if (removed > 0) {
            fs.writeFileSync(path, linesArr.join('\\n'));
            compileAndFix();
        } else {
            console.error('Could not auto-remove');
            process.exit(1);
        }
    }
}
compileAndFix();
