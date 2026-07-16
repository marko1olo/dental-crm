const fs = require('fs');
let content = fs.readFileSync('apps/web/src/SettingsView.tsx', 'utf8');

const startStr = '{settingsTab === "rules" ? (';
const startIdx = content.indexOf(startStr);

if (startIdx === -1) {
    console.log("NOT FOUND");
    process.exit(1);
}

let balance = 0;
let endIdx = -1;
for (let i = startIdx; i < content.length; i++) {
    if (content[i] === '{') balance++;
    if (content[i] === '}') {
        balance--;
        if (balance === 0) {
            endIdx = i;
            break;
        }
    }
}

let componentJSX = content.substring(startIdx + startStr.length, endIdx);
// Strip the trailing ' : null' or similar if present inside the block, but wait, the `{` `}` encompasses the ternary!
// So endIdx is the closing brace of the ternary.
// Let's just find `<section className="rule-studio"` and find its matching closing tag instead!
const sectionStartStr = '<section\n\t\t\t\t\t\tclassName="rule-studio"';
const sectionStartIdx = content.indexOf(sectionStartStr);
if (sectionStartIdx === -1) {
    const backupStartStr = '<section\n\t\t\t\t\t\tclassName="rule-studio"'.replace(/\n\t\t\t\t\t\t/g, ' '); // just in case
    // let's do a regex search
    const match = content.match(/<section[^>]*className="rule-studio"/);
    if (!match) {
        console.log("Section not found");
        process.exit(1);
    }
}
const match = content.match(/<section[^>]*className="rule-studio"/);
const actualStartIdx = match.index;

let tagBalance = 0;
let actualEndIdx = -1;
for (let i = actualStartIdx; i < content.length; i++) {
    if (content.substr(i, 8) === '<section') { tagBalance++; i += 7; }
    else if (content.substr(i, 9) === '</section') { 
        tagBalance--; 
        i += 8; 
        if (tagBalance === 0) {
            actualEndIdx = i + 1; // includes '>'
            break;
        }
    }
}

const finalJSX = content.substring(actualStartIdx, actualEndIdx);
console.log("JSX length:", finalJSX.length);
fs.writeFileSync('rules_block.txt', finalJSX, 'utf8');

const componentName = "SettingsRulesTab";
const componentFile = `import React from 'react';
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { ShieldCheck, Plus, Trash2 } from "lucide-react";
import {
    clinicalRuleOwnerRoles,
    staffRoleLabels,
    typedClinicalRuleActionLabels,
    typedClinicalRuleActions,
    typedClinicalRuleSeverityLabels,
    typedClinicalRuleSeverities,
    typedServiceCategoryLabels,
    typedServiceCategories,
} from "@dental/shared";

export function SettingsRulesTab() {
    const {
        dashboard,
        clinicalRuleSummary,
        typedServiceCatalog,
        newRuleAction,
        newRuleBlockedServiceId,
        newRuleCategory,
        newRuleCompletedServiceId,
        newRuleOwnerRole,
        newRulePatientText,
        newRuleRequiredServiceId,
        newRuleSeverity,
        newRuleSpecialty,
        newRuleTitle,
        newRuleTriggerServiceId,
        newRuleWarningText,
        setNewRuleAction,
        setNewRuleBlockedServiceId,
        setNewRuleCategory,
        setNewRuleCompletedServiceId,
        setNewRuleOwnerRole,
        setNewRulePatientText,
        setNewRuleRequiredServiceId,
        setNewRuleSeverity,
        setNewRuleSpecialty,
        setNewRuleTitle,
        setNewRuleTriggerServiceId,
        setNewRuleWarningText,
        submitClinicalRule,
        removeClinicalRule,
        specialtyLabels,
    } = useAppLogicContext();

    return (
        ${finalJSX.replace(/\n\t\t\t\t\t/g, '\n\t\t')}
    );
}
`;

fs.writeFileSync(`apps/web/src/components/settings/${componentName}.tsx`, componentFile, 'utf8');

// Replace in SettingsView
const importStr = `import { ${componentName} } from "./components/settings/${componentName}";\n`;
const replacement = `<${componentName} />`;
content = content.substring(0, actualStartIdx) + replacement + content.substring(actualEndIdx);

const lastImportIdx = content.lastIndexOf('import ');
const nextNewline = content.indexOf('\n', lastImportIdx);
content = content.substring(0, nextNewline + 1) + importStr + content.substring(nextNewline + 1);

fs.writeFileSync('apps/web/src/SettingsView.tsx', content, 'utf8');
console.log("Done");
