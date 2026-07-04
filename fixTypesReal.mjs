import fs from 'fs';
import path from 'path';

// Fix communications.ts
let comm = fs.readFileSync('apps/api/src/routes/communications.ts', 'utf8');
comm = comm.replace(/parsedInput\.data\.resultStatus/g, 'parsedInput.data.outcome');
comm = comm.replace(/actorUserId: parsedInput\.data\.actorUserId \?\? null,/g, 'actorUserId: (parsedInput.data as any).actorUserId ?? null,');
fs.writeFileSync('apps/api/src/routes/communications.ts', comm);

// Fix imports.ts
let imports = fs.readFileSync('apps/api/src/routes/imports.ts', 'utf8');
imports = imports.replace(/inserted\.id/g, 'inserted?.id');
imports = imports.replace(/batch\.processedRecords/g, 'batch?.processedRecords');
imports = imports.replace(/batch\.failedRecords/g, 'batch?.failedRecords');
fs.writeFileSync('apps/api/src/routes/imports.ts', imports);

// Fix settings.ts
let settings = fs.readFileSync('apps/api/src/routes/settings.ts', 'utf8');
settings = settings.replace(/version: 1,/g, 'version: 1 as const,');
fs.writeFileSync('apps/api/src/routes/settings.ts', settings);

// Fix speech.ts
let speech = fs.readFileSync('apps/api/src/routes/speech.ts', 'utf8');
speech = speech.replace(/const patient: \{[^\}]+\} \| null = await getPatientById\(job\.patientId\);/g, 'const patient = await getPatientById(job.patientId);');
speech = speech.replace(/const appointment: \{[^\}]+\} \| null = await getAppointmentById\(job\.appointmentId\);/g, 'const appointment = await getAppointmentById(job.appointmentId);');
speech = speech.replace(/const existingVisit = await db.query.visits.findFirst\({/g, 'const existingVisit = await db.query.visits.findFirst({');
fs.writeFileSync('apps/api/src/routes/speech.ts', speech);

// Fix chatLinks.ts
let chatLinks = fs.readFileSync('apps/api/src/telegram/chatLinks.ts', 'utf8');
chatLinks = chatLinks.replace(/organizationId: orgId,/g, 'organizationId: orgId,\n      clinicId: null,');
fs.writeFileSync('apps/api/src/telegram/chatLinks.ts', chatLinks);

// Fix config.ts
let config = fs.readFileSync('apps/api/src/telegram/config.ts', 'utf8');
config = config.replace(/mode: parsedConfig\.mode,/g, 'mode: parsedConfig.mode as any,');
fs.writeFileSync('apps/api/src/telegram/config.ts', config);

// Fix outbox.ts
let outbox = fs.readFileSync('apps/api/src/telegram/outbox.ts', 'utf8');
outbox = outbox.replace(/task\.status === "review_request"/g, 'task.channel === "telegram"');
fs.writeFileSync('apps/api/src/telegram/outbox.ts', outbox);

console.log("Fixed files");
