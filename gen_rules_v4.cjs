const fs = require('fs');
let block = fs.readFileSync('rules_block.txt', 'utf8');

block = block.replace(/\t\t\t\t\) : null}\n?$/, '');
block = block.replace(/\n\t\t\t\t/g, '\n\t\t');
if (block.startsWith('\t\t\t\t\t')) {
    block = block.substring(3);
}

// Replace TextInputChangeEvent
block = block.replace(/TextInputChangeEvent/g, 'React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>');

const componentFile = `import React from 'react';
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { ShieldCheck, Plus, Trash2 } from "lucide-react";
import type { 
    ClinicalRuleAction, 
    ClinicalRuleSeverity, 
    ServiceCategory, 
    StaffRole 
} from "@dental/shared";

const clinicalRuleOwnerRoles: StaffRole[] = [
    "doctor",
    "assistant",
    "admin",
    "manager",
];

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
        clinicalRuleActionLabels,
        clinicalRuleSeverityLabels,
        serviceCategoryLabels,
        staffRoleLabels,
        clinicalRuleSummary,
    } = useAppLogicContext();

    const typedClinicalRuleActionLabels = clinicalRuleActionLabels as Record<ClinicalRuleAction, string>;
    const typedClinicalRuleActions = Object.keys(typedClinicalRuleActionLabels) as ClinicalRuleAction[];
    
    const typedClinicalRuleSeverityLabels = clinicalRuleSeverityLabels as Record<ClinicalRuleSeverity, string>;
    const typedClinicalRuleSeverities = Object.keys(typedClinicalRuleSeverityLabels) as ClinicalRuleSeverity[];
    
    const typedServiceCategoryLabels = serviceCategoryLabels as Record<ServiceCategory, string>;
    const typedServiceCategories = Object.keys(typedServiceCategoryLabels) as ServiceCategory[];

    return (
        ${block}
    );
}
`;

fs.writeFileSync('apps/web/src/components/settings/SettingsRulesTab.tsx', componentFile, 'utf8');
console.log('Done generating SettingsRulesTab.tsx');
