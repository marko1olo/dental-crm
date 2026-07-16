const fs = require('fs');
const block = fs.readFileSync('rules_block.txt', 'utf8');

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
    } = useAppLogicContext();

    return (
        ${block}
    );
}
`;

fs.writeFileSync('apps/web/src/components/settings/SettingsRulesTab.tsx', componentFile, 'utf8');
