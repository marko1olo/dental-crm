const fs = require('fs');
let block = fs.readFileSync('rules_block.txt', 'utf8');

// The block ends with '\t\t\t\t) : null}\n'
block = block.replace(/\t\t\t\t\) : null}\n?$/, '');

// Replace tabs
block = block.replace(/\n\t\t\t\t/g, '\n\t\t');
if (block.startsWith('\t\t\t\t\t')) {
    block = block.substring(3);
}

const componentFile = `import React from 'react';
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { ShieldCheck, Plus } from "lucide-react";
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
import { TextInputChangeEvent } from "../../types";

export function SettingsRulesTab() {
    const {
        dashboard,
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
        typedClinicalRules,
        toggleClinicalRule,
        isClinicalRuleSaving,
        createClinicalRuleFromSettings,
        serviceTitle,
    } = useAppLogicContext();

    return (
        ${block}
    );
}
`;

fs.writeFileSync('apps/web/src/components/settings/SettingsRulesTab.tsx', componentFile, 'utf8');

let content = fs.readFileSync('apps/web/src/SettingsView.tsx', 'utf8');
const startIdx = content.indexOf('{settingsTab === "rules" ? (\n\t\t\t\t\t<section\n\t\t\t\t\t\tclassName="rule-studio"');
const endIdx = content.indexOf('\t\t\t\t) : null}\n\n\t\t\t\t{settingsTab === "prices" ? (');

const replacement = `{settingsTab === "rules" ? <SettingsRulesTab /> : null}\n\n`;
content = content.substring(0, startIdx) + replacement + content.substring(endIdx + '\t\t\t\t) : null}\n\n'.length);

const importStr = `import { SettingsRulesTab } from "./components/settings/SettingsRulesTab";\n`;
const lastImportIdx = content.lastIndexOf('import ');
const nextNewline = content.indexOf('\n', lastImportIdx);
content = content.substring(0, nextNewline + 1) + importStr + content.substring(nextNewline + 1);

fs.writeFileSync('apps/web/src/SettingsView.tsx', content, 'utf8');
console.log('Done!');
