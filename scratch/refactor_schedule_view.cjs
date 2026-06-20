const fs = require('fs');

// 1. Get the keys from scheduleStore
const storeKeys = [
    'scheduleDoctorFilterId',
    'scheduleAssistantFilterId',
    'scheduleChairFilterId',
    'scheduleDefaultDoctorUserId',
    'scheduleDefaultAssistantUserId',
    'scheduleDefaultChairId',
    'scheduleStatusFilter',
    'scheduleDateFilter',
    'staffScheduleDrafts',
    'staffScheduleSavingId',
    'staffScheduleDirtyIds',
    'staffScheduleSaveStates',
    'chairScheduleDrafts',
    'chairScheduleSavingId',
    'chairScheduleDirtyIds',
    'chairScheduleSaveStates',
    'appointmentScheduleDrafts',
    'appointmentScheduleDirtyIds',
    'appointmentScheduleSaveStates',
    'appointmentScheduleErrors',
    'newAppointmentDraft',
    'newAppointmentSaveState'
];

// Include the setters
const allKeys = [...storeKeys];
storeKeys.forEach(k => {
    const cap = k.charAt(0).toUpperCase() + k.slice(1);
    allKeys.push(`set${cap}`);
});

// 2. Update ScheduleView.tsx
let scheduleViewCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/ScheduleView.tsx', 'utf8');

// Remove from type ScheduleViewProps
allKeys.forEach(key => {
    const propRegex = new RegExp(`^\\s+${key}:\\s+.*?;\\r?\\n`, 'gm');
    scheduleViewCode = scheduleViewCode.replace(propRegex, '');
});

// Remove from destructuring in ScheduleView
allKeys.forEach(key => {
    const destructureRegex = new RegExp(`^\\s+${key},\\r?\\n`, 'gm');
    scheduleViewCode = scheduleViewCode.replace(destructureRegex, '');
});

// Add import
if (!scheduleViewCode.includes('import { useScheduleStore }')) {
    scheduleViewCode = scheduleViewCode.replace('import { useSettingsStore } from "./store/settingsStore";', 'import { useSettingsStore } from "./store/settingsStore";\nimport { useScheduleStore } from "./store/scheduleStore";');
}

// Add inside function ScheduleView(props: ScheduleViewProps) {
const storeDestructure = `  const {
    ${allKeys.join(',\n    ')}
  } = useScheduleStore();\n`;

scheduleViewCode = scheduleViewCode.replace('export function ScheduleView(props: ScheduleViewProps) {\n  const {\n', 'export function ScheduleView(props: ScheduleViewProps) {\n' + storeDestructure + '  const {\n');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/ScheduleView.tsx', scheduleViewCode);

// 3. Update App.tsx
let appCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

// Remove from <ScheduleView ... />
allKeys.forEach(key => {
    const propPassRegex = new RegExp(`\\s+${key}={${key}}`, 'g');
    appCode = appCode.replace(propPassRegex, '');
});

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', appCode);

console.log('Fixed ScheduleView.tsx and App.tsx');
