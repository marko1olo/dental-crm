const fs = require('fs');
let block = fs.readFileSync('prices_block.txt', 'utf8');

block = block.replace(/\t\t\t\t\) : null}\n?$/, '');
block = block.replace(/\n\t\t\t\t/g, '\n\t\t');
if (block.startsWith('\t\t\t\t\t')) {
    block = block.substring(3);
}

const componentFile = `import React from 'react';
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { ReceiptText, FileText, ArrowRight } from "lucide-react";

export function SettingsPricesTab() {
    const {
        dashboard,
        pricelistFilterString,
        setPricelistFilterString,
        setSettingsTab,
        clinicalRuleSummary,
    } = useAppLogicContext();

    return (
        ${block}
    );
}
`;

fs.writeFileSync('apps/web/src/components/settings/SettingsPricesTab.tsx', componentFile, 'utf8');

let content = fs.readFileSync('apps/web/src/SettingsView.tsx', 'utf8');
const startIdx = content.indexOf('{settingsTab === "prices" ? (\n\t\t\t\t\t<section\n\t\t\t\t\t\tclassName="pricelist-studio"');
const endIdx = content.indexOf('\t\t\t\t) : null}\n\n\t\t\t\t{settingsTab === "sources" ? (');

const replacement = `{settingsTab === "prices" ? <SettingsPricesTab /> : null}\n\n`;
content = content.substring(0, startIdx) + replacement + content.substring(endIdx + '\t\t\t\t) : null}\n\n'.length);

const importStr = `import { SettingsPricesTab } from "./components/settings/SettingsPricesTab";\n`;
content = content.replace('import { SettingsRulesTab } from "./components/settings/SettingsRulesTab";', 'import { SettingsRulesTab } from "./components/settings/SettingsRulesTab";\n' + importStr);

fs.writeFileSync('apps/web/src/SettingsView.tsx', content, 'utf8');
console.log('Prices tab generated and injected!');
