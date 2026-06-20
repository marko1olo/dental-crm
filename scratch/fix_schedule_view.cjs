const fs = require('fs');
let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/ScheduleView.tsx', 'utf8');

code = code.replace(/\s*setScheduleAdminSecretDraft,/g, '');
code = code.replace(/\s*scheduleAdminSecretDraft,/g, '');
code = code.replace(/\s*scheduleAdminSecretSession,/g, '');

const importAdd = 'import { useSettingsStore } from "./store/settingsStore";\n';
if (!code.includes('useSettingsStore')) {
  code = code.replace('import { useDocumentStore } from "./store/documentStore";', 'import { useDocumentStore } from "./store/documentStore";\n' + importAdd);
}

const destructureAdd = '\n  const { setScheduleAdminSecretDraft, scheduleAdminSecretDraft, scheduleAdminSecretSession } = useSettingsStore();\n';
const propsEndIndex = code.indexOf('} = props;');
code = code.substring(0, propsEndIndex + '} = props;'.length) + destructureAdd + code.substring(propsEndIndex + '} = props;'.length);

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/ScheduleView.tsx', code);
console.log('Fixed ScheduleView.tsx');
