const fs = require('fs');

let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/scratch/extract_schedule_store.cjs', 'utf8');

const newVars = [
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

code = code.replace(/const varsToExtract = \[[\s\S]*?\];/, `const varsToExtract = ${JSON.stringify(newVars, null, 2)};`);
code = code.replace(/imaging/g, 'schedule');
code = code.replace(/Imaging/g, 'Schedule');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/scratch/extract_schedule_store.cjs', code);
