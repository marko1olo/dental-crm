const fs = require('fs');
const { execSync } = require('child_process');

const path = 'C:/Clinic_MVP/dental-crm/apps/web/src/useAppLogic.tsx';

function compileAndFix() {
    console.log('Running tsc...');
    try {
        // Run tsc -b apps/web
        execSync('npx tsc -b apps/web --noEmit', { cwd: 'C:/Clinic_MVP/dental-crm', stdio: 'pipe' });
        console.log('TypeScript compilation successful!');
    } catch (err) {
        const output = err.stdout.toString() + '\\n' + err.stderr.toString();
        const missingNames = new Set();
        
        const lines = output.split('\\n');
        for (const line of lines) {
            // e.g. apps/web/src/useAppLogic.tsx(11234,3): error TS2304: Cannot find name 'documentCreateSavingKind'.
            if (line.includes('useAppLogic.tsx') && (line.includes('TS2304') || line.includes('TS2552') || line.includes('TS2322'))) {
                const match = line.match(/Cannot find name '([^']+)'/);
                if (match) {
                    missingNames.add(match[1]);
                }
            }
        }
        
        if (missingNames.size === 0) {
            console.error('Compilation failed but no missing names found to auto-fix. Output:');
            console.error(output);
            process.exit(1);
        }
        
        console.log('Found missing names in TS output: ' + Array.from(missingNames).join(', '));
        
        let codeLines = fs.readFileSync(path, 'utf8').split('\\n');
        const retIdx = codeLines.findLastIndex(l => l.trim() === 'return {');
        let removedCount = 0;
        
        for (let i = retIdx + 1; i < codeLines.length; i++) {
            const trimmed = codeLines[i].trim();
            // check if the line matches missingName,
            for (const name of missingNames) {
                if (trimmed === name + ',' || trimmed === name) {
                    codeLines.splice(i, 1);
                    removedCount++;
                    i--;
                    break;
                }
            }
        }
        
        if (removedCount > 0) {
            console.log('Removed ' + removedCount + ' missing variables from return statement.');
            fs.writeFileSync(path, codeLines.join('\\n'));
            compileAndFix();
        } else {
            console.error('Missing names could not be found in the return statement for auto-removal. Here are names: ' + Array.from(missingNames).join(', '));
            process.exit(1);
        }
    }
}

compileAndFix();
