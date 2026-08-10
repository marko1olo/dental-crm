const fs = require('fs');

const file = 'apps/web/src/useAppLogic.tsx';
let content = fs.readFileSync(file, 'utf8');

const regexesToRemove = [
    // 1. reconcileDashboardScopedUiSelections (lines 1644-1715)
    /const reconcileDashboardScopedUiSelections = useCallback\(\s*function reconcileDashboardScopedUiSelections\(\) \{[\s\S]*?\}\s*,\s*\[[\s\S]*?\]\s*,\s*\);\s*/,
    
    // 2. imagingPreviewWorkset (1722-1799)
    /useEffect\(\(\) => \{\s*if \(typeof window === "undefined"\) return undefined;\s*if \(!imagingPreviewWorkset\.length\) \{[\s\S]*?auth\.revokeObjectUrlMap\(\s*current\s*\);[\s\S]*?\}\s*,\s*\[\s*imagingPreviewWorkset,[\s\S]*?\]\s*\);\s*/,
    
    // 3. setStaffScheduleDrafts (1800-1812)
    /useEffect\(\(\) => \{\s*if \(!dashboard\) return;\s*\/\/\s*biome-ignore[\s\S]*?setStaffScheduleDrafts\(\(current.*\) => \{[\s\S]*?return next;\s*\}\);\s*\}, \[dashboard, setStaffScheduleDrafts\]\);\s*/,

    // 4. setChairScheduleDrafts (1814-1827)
    /useEffect\(\(\) => \{\s*if \(!dashboard\) return;\s*\/\/\s*biome-ignore[\s\S]*?setChairScheduleDrafts\(\(current.*\) => \{[\s\S]*?return next;\s*\}\);\s*\}, \[dashboard, setChairScheduleDrafts\]\);\s*/,

    // 5. setNewStaffSpecialty (1828-1831)
    /\/\/ biome-ignore lint\/correctness\/useExhaustiveDependencies: global action without stale state\s*useEffect\(\(\) => \{\s*setNewStaffSpecialty\(selectedSpecialty\);\s*\}, \[selectedSpecialty, setNewStaffSpecialty\]\);\s*/,

    // 6. loadLocalDicomWorkbenchDraft (1852-1877)
    /useEffect\(\(\) => \{\s*let cancelled = false;\s*const restore = async \(\) => \{\s*const recovered =[\s\S]*?loadLocalDicomWorkbenchDraft\([\s\S]*?\}\s*,\s*\[\s*activeOrganizationId,\s*setDicomWorkbenchLocalSavedAt,[\s\S]*?\]\s*\);\s*/,

    // 7. loadLocalImagingFolderDraft (1879-1896)
    /useEffect\(\(\) => \{\s*const organizationId = activeOrganizationId\?\.trim\(\) \?\? "";\s*if \([\s\S]*?loadLocalImagingFolderDraft\([\s\S]*?\}\s*,\s*\[\s*activeOrganizationId,\s*setImagingFolderPath,[\s\S]*?\]\s*\);\s*/,

    // 8. loadPersistenceHealth / refreshBrowserContinuity (1899-1905)
    /\/\/ biome-ignore lint\/correctness\/useExhaustiveDependencies: global action without stale state\s*useEffect\(\(\) => \{\s*if \(currentView === "settings" && settingsTab === "audit"\) \{\s*void loadPersistenceHealth\(\{ silent: true \}\);[\s\S]*?\}\s*\}, \[currentView, settingsTab\]\);\s*/,

    // 9. setOnboardingGuideExpanded (1907-1917)
    /useEffect\(\(\) => \{\s*if \(currentView === "settings"\) \{\s*setOnboardingGuideExpanded\(settingsTab === "clinic"\);[\s\S]*?setOnboardingGuideExpanded\(false\);\s*\}\s*\}, \[currentView, settingsTab, setOnboardingGuideExpanded\]\);\s*/,

    // 10. saveVisitLocalDraft (1978-2009)
    /useEffect\(\(\) => \{\s*\/\/\s*Приёма нет — сохранять черновик некуда. Раньше он уходил под ключ[\s\S]*?saveVisitLocalDraft\([\s\S]*?return \(\) => window\.clearTimeout\(timeout\);\s*\}, \[[^\]]*?setLastLocalSavedAt[^\]]*?\]\);\s*/,

    // 11. setTelegramLinkStaffId (2010-2023)
    /useEffect\(\(\) => \{\s*if \(!dashboard\) return;\s*if \(\s*telegramLinkStaffId &&[\s\S]*?setTelegramLinkStaffId\(telegramLinkStaffOptions\[0\]\?\.id \?\? ""\);\s*\}, \[\s*dashboard,\s*telegramLinkStaffId,\s*telegramLinkStaffOptions,\s*setTelegramLinkStaffId,\s*\]\);\s*/
];

let modifiedContent = content;

regexesToRemove.forEach((regex, index) => {
    if (!regex.test(modifiedContent)) {
        console.log(`WARN: Regex ${index + 1} did NOT match anything!`);
    } else {
        const matches = modifiedContent.match(regex);
        console.log(`Regex ${index + 1} matched ${matches[0].length} chars. Removing...`);
        modifiedContent = modifiedContent.replace(regex, '');
    }
});

fs.writeFileSync(file, modifiedContent, 'utf8');
console.log('Finished removing duplicate effects');
