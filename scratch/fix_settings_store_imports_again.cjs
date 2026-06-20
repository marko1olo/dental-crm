const fs = require('fs');

let storeCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/settingsStore.ts', 'utf8');

// Remove from AppHelpers imports
storeCode = storeCode.replace('type TelegramPostVisitCheckupDelayDrafts,\n', '');
storeCode = storeCode.replace('defaultTelegramPostVisitCheckupDelayDrafts\n', '');
storeCode = storeCode.replace(', defaultTelegramPostVisitCheckupDelayDrafts\n', '\n');
storeCode = storeCode.replace(', defaultTelegramPostVisitCheckupDelayDrafts', '');

// Add to new import
const newImport = `import { type TelegramPostVisitCheckupDelayDrafts, defaultTelegramPostVisitCheckupDelayDrafts } from "../workspaceStaticOptions";\n`;
storeCode = newImport + storeCode;

// Wait, the error is: Object literal may only specify known properties, and 'default' does not exist in type '{ staff: string | null; documents: string | null; billing: string | null; mainMenu: string | null; appointment: string | null; tax: string | null; care: string | null; review: string | null; }'
// Let's find where 'default' is specified. It's emptyTelegramVisualCardUrlDrafts(), wait, in my dynamic generation, did I put 'default' somewhere else?
// Ah! TelegramVisualCardUrlDrafts has keys like 'staff', 'documents', 'billing', 'mainMenu', etc.
// But emptyTelegramVisualCardUrlDrafts returns { "default": "" } ? No, emptyTelegramVisualCardUrlDrafts() returns { ... }. 
// Let's see what line 38 is! It's telegramVisualCardUrlDrafts: emptyTelegramVisualCardUrlDrafts()!
// Wait, no, emptyTelegramVisualCardUrlDrafts() was an object literal from my generator script?
// Ah, my script `fix_settings_store_final.cjs` replaced `emptyTelegramVisualCardUrlDrafts,` with `emptyTelegramVisualCardUrlDrafts(),`
// BUT what if `emptyTelegramVisualCardUrlDrafts` didn't exist in my `settingsStore.ts`?
// Let's replace `{ "default": "" }` with `emptyTelegramVisualCardUrlDrafts()`. Wait, I generated `{ "default": "" }` manually earlier? Yes, I did!

// Let me just replace the whole initial object properties for telegramVisualCardUrlDrafts and telegramPostVisitCheckupDelayDrafts
storeCode = storeCode.replace(/telegramVisualCardUrlDrafts: {.*?},/s, 'telegramVisualCardUrlDrafts: emptyTelegramVisualCardUrlDrafts(),');
storeCode = storeCode.replace(/telegramPostVisitCheckupDelayDrafts: {.*?},/s, 'telegramPostVisitCheckupDelayDrafts: defaultTelegramPostVisitCheckupDelayDrafts,');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/settingsStore.ts', storeCode);
