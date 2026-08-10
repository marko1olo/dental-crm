const fs = require('fs');

// 1. Remove from useAppLogic.tsx
let appLogic = fs.readFileSync('apps/web/src/useAppLogic.tsx', 'utf8');
appLogic = appLogic.replace(/const staffScheduleDraftsRef = useRef<Record<string, StaffScheduleDraft>>\(\{\}\);\s*/, '');
appLogic = appLogic.replace(/const chairScheduleDraftsRef = useRef<Record<string, StaffScheduleDraft>>\(\{\}\);\s*/, '');
appLogic = appLogic.replace(/const appointmentScheduleDraftsRef = useRef<\s*Record<string, AppointmentScheduleDraft>\s*>\(\{\}\);\s*/, '');
appLogic = appLogic.replace(/\bstaffScheduleDraftsRef,\s*/g, '');
appLogic = appLogic.replace(/\bchairScheduleDraftsRef,\s*/g, '');
appLogic = appLogic.replace(/\bappointmentScheduleDraftsRef,\s*/g, '');
fs.writeFileSync('apps/web/src/useAppLogic.tsx', appLogic);

// 2. Add to useScheduleLogic.ts
let scheduleLogic = fs.readFileSync('apps/web/src/hooks/domains/useScheduleLogic.ts', 'utf8');

// Remove from interface
scheduleLogic = scheduleLogic.replace(/staffScheduleDraftsRef:\s*React\.MutableRefObject<Record<string, StaffScheduleDraft>>;\s*/, '');
scheduleLogic = scheduleLogic.replace(/chairScheduleDraftsRef:\s*React\.MutableRefObject<Record<string, StaffScheduleDraft>>;\s*/, '');
scheduleLogic = scheduleLogic.replace(/appointmentScheduleDraftsRef:\s*React\.MutableRefObject<Record<string, AppointmentScheduleDraft>>;\s*/, '');

// Remove from destructure
scheduleLogic = scheduleLogic.replace(/\bstaffScheduleDraftsRef,\s*/g, '');
scheduleLogic = scheduleLogic.replace(/\bchairScheduleDraftsRef,\s*/g, '');
scheduleLogic = scheduleLogic.replace(/\bappointmentScheduleDraftsRef,\s*/g, '');

// Insert internally
const insertionPoint = scheduleLogic.indexOf('const {'); // first destructuring inside function
const insertion = `\tconst staffScheduleDraftsRef = useRef<Record<string, StaffScheduleDraft>>({});
\tconst chairScheduleDraftsRef = useRef<Record<string, StaffScheduleDraft>>({});
\tconst appointmentScheduleDraftsRef = useRef<Record<string, AppointmentScheduleDraft>>({});
`;
scheduleLogic = scheduleLogic.slice(0, insertionPoint) + insertion + scheduleLogic.slice(insertionPoint);

// Ensure useRef is imported (if not already)
if (!scheduleLogic.includes('useRef')) {
    scheduleLogic = scheduleLogic.replace(/import \{/, 'import { useRef,');
}

fs.writeFileSync('apps/web/src/hooks/domains/useScheduleLogic.ts', scheduleLogic);

console.log('Fixed Schedule Refs!');
