const fs = require('fs');

const srcPath = 'apps/web/src/DocumentsView.tsx';
let content = fs.readFileSync(srcPath, 'utf8');

const keys = JSON.parse(fs.readFileSync('documentStoreKeys.json', 'utf8'));

const kind = "outpatient_medical_card_025u";
const componentName = "OutpatientMedicalCard025uForm";

const searchStr = `{selectedDocumentKind === "${kind}" ? (`;
const startIdx = content.indexOf(searchStr);

if (startIdx === -1) {
    console.error('Could not find start block for', kind);
    process.exit(1);
}

const kindStartIdx = startIdx + searchStr.length;
const kindEndIdx = content.indexOf('"', kindStartIdx);

let bracketDepth = 0;
let currentIdx = startIdx;
let endIdx = -1;
let started = false;

// We count braces starting from startIdx to find the exact matching closing block
// But wait, the simplest way is to find the exact text of the end of the block.
// The end of the block is always `</article>\n					) : null}`
// Let's search for `</article>\n					) : null}` starting from startIdx
const endPattern = '</article>\n					) : null}';
const tempEndIdx = content.indexOf(endPattern, startIdx);

if (tempEndIdx === -1) {
    console.error('Could not find end block');
    process.exit(1);
}

endIdx = tempEndIdx + endPattern.length;

const blockContent = content.substring(startIdx, endIdx);
const jsxStart = blockContent.indexOf('? (') + 3;
const jsxEnd = blockContent.lastIndexOf(') : null}');
const jsxContent = blockContent.substring(jsxStart, jsxEnd);

// Identify used keys
const usedKeys = keys.filter(k => {
    const regex = new RegExp(`\\b${k}\\b`);
    return regex.test(jsxContent);
});

const usedKeysStr = usedKeys.length > 0 ? `\n\tconst {\n\t\t${usedKeys.join(',\\n\t\t')}\n\t} = useDocumentStore();\n` : '';

const newComponentCode = `import React from 'react';
import { useDocumentStore } from "../../../store/documentStore";

export interface ${componentName}Props {
    dashboard: any;
    documentPatient: any;
    activeDoctor: any;
}

export function ${componentName}({
    dashboard,
    documentPatient,
    activeDoctor,
}: ${componentName}Props) {${usedKeysStr}
	return (
${jsxContent.split('\\n').map(line => '		' + line.trimStart()).join('\\n')}
	);
}
`;

const destPath = `apps/web/src/components/documents/forms/${componentName}.tsx`;
fs.writeFileSync(destPath, newComponentCode, 'utf8');

const replacement = `{selectedDocumentKind === "${kind}" ? (
						<${componentName} 
							dashboard={dashboard} 
							documentPatient={documentPatient} 
							activeDoctor={activeDoctor} 
						/>
					) : null}`;

content = content.substring(0, startIdx) + replacement + content.substring(endIdx);

if (!content.includes(componentName)) {
    const importStr = `import { ${componentName} } from "./components/documents/forms/${componentName}";\n`;
    const lastImportIdx = content.lastIndexOf('import ');
    const nextNewline = content.indexOf('\n', lastImportIdx);
    content = content.substring(0, nextNewline + 1) + importStr + content.substring(nextNewline + 1);
}

fs.writeFileSync(srcPath, content, 'utf8');
console.log('Successfully extracted', componentName);
