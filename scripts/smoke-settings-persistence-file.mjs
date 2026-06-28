import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const tempRoot = mkdtempSync(path.join(tmpdir(), "dental-settings-persist-"));
const stateFilePath = path.join(tempRoot, "state.json");
const backupDirectoryPath = path.join(tempRoot, "backups");

process.env.DENTAL_STATE_FILE = stateFilePath;
process.env.DENTAL_STATE_BACKUP_DIR = backupDirectoryPath;
process.env.DENTAL_STATE_BACKUPS = "2";
process.env.DENTE_SETTINGS_ADMIN_SECRET = "synthetic-settings-secret";
process.env.DENTE_SCHEDULE_ADMIN_SECRET = "synthetic-settings-secret";
delete process.env.DENTAL_STATE_PERSISTENCE;

const routePath = path.resolve("apps/api/dist/routes/settings.js");
const scheduleRoutePath = path.resolve("apps/api/dist/routes/schedule.js");
const patientRoutePath = path.resolve("apps/api/dist/routes/patients.js");
const persistentStatePath = path.resolve("apps/api/dist/persistentState.js");

if (!existsSync(routePath) || !existsSync(scheduleRoutePath) || !existsSync(patientRoutePath) || !existsSync(persistentStatePath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerSettingsRoutes } = await import(pathToFileURL(routePath).href);
const { registerScheduleRoutes } = await import(pathToFileURL(scheduleRoutePath).href);
const { registerPatientRoutes } = await import(pathToFileURL(patientRoutePath).href);
const { getPersistentStateIntegrityReport, buildPersistentStateExport } = await import(pathToFileURL(persistentStatePath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleepSync(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function execFileSyncWithRetry(file, args, options) {
  let lastError = null;
  for (const delayMs of [0, 80, 180, 360, 700]) {
    if (delayMs > 0) sleepSync(delayMs);
    try {
      return execFileSync(file, args, options);
    } catch (error) {
      if (error?.code !== "EPERM" && error?.code !== "EBUSY") throw error;
      lastError = error;
    }
  }
  throw lastError ?? new Error(`Failed to execute ${file}`);
}

async function reloadPersistedSettingsWithFreshImport() {
  const sampleDataUrl = `${pathToFileURL(path.resolve("apps/api/dist/sampleData.js")).href}?settings-persistence-smoke=${Date.now()}`;
  const reloadedModule = await import(sampleDataUrl);
  const settings = reloadedModule.buildClinicSettings();
  const preferences = reloadedModule.getUiPreferences();
  const appointment = reloadedModule.appointments.find((item) => item.id === "59d16574-5f6e-4cc7-9f49-2da2f126e11d");
  const patient = reloadedModule.patients.find((item) => item.id === "3ebb4567-7777-4f19-8c23-2a78c9962796");
  return {
    clinicName: settings.profile.clinicName,
    defaultVisitMinutes: settings.profile.defaultVisitMinutes,
    workdayStart: settings.profile.scheduleDefaults.workdayStart,
    appointmentBufferMinutes: settings.profile.scheduleDefaults.appointmentBufferMinutes,
    uiLanguage: preferences?.uiLanguage,
    selectedWorkspaceRole: preferences?.selectedWorkspaceRole,
    selectedSpecialty: preferences?.selectedSpecialty,
    selectedProtocolId: preferences?.selectedProtocolId,
    selectedPatientId: preferences?.selectedPatientId,
    scheduleDoctorFilterId: preferences?.scheduleDoctorFilterId,
    scheduleAssistantFilterId: preferences?.scheduleAssistantFilterId,
    scheduleChairFilterId: preferences?.scheduleChairFilterId,
    scheduleDefaultDoctorUserId: preferences?.scheduleDefaultDoctorUserId,
    scheduleDefaultAssistantUserId: preferences?.scheduleDefaultAssistantUserId,
    scheduleDefaultChairId: preferences?.scheduleDefaultChairId,
    scheduleStatusFilter: preferences?.scheduleStatusFilter,
    scheduleDateFilter: preferences?.scheduleDateFilter,
    telegramLinkSubjectType: preferences?.telegramLinkSubjectType,
    telegramLinkStaffId: preferences?.telegramLinkStaffId,
    telegramOutboxStatusFilter: preferences?.telegramOutboxStatusFilter,
    telegramOutboxTemplateFilter: preferences?.telegramOutboxTemplateFilter,
    documentIssueSignatureMode: preferences?.documentIssueSignatureMode,
    documentIssueStaffFullName: preferences?.documentIssueStaffFullName,
    documentIssueStaffRole: preferences?.documentIssueStaffRole,
    selectedDocumentKind: preferences?.selectedDocumentKind,
    onboardingDismissed: preferences?.onboardingDismissed,
    onboardingDismissedAt: preferences?.onboardingDismissedAt,
    onboardingStep: preferences?.onboardingStep,
    onboardingDraftMode: preferences?.onboardingDraftMode,
    doctorWorkingHours: settings.staff.find((member) => member.id === "8356141b-7cfa-4221-95f7-70f47e7344b1")?.workingHours,
    assistantWorkingHours: settings.staff.find((member) => member.id === "f365da0c-7094-4f80-b52d-59b7b1254791")?.workingHours,
    chairWorkingHours: settings.chairs.find((chair) => chair.id === "b5450677-b0fc-4228-9672-56b27062783f")?.workingHours,
    patientPreferredAppointmentWeekdays: patient?.administrativeProfile?.preferredAppointmentWeekdays,
    patientPreferredAppointmentStart: patient?.administrativeProfile?.preferredAppointmentStart,
    patientPreferredAppointmentEnd: patient?.administrativeProfile?.preferredAppointmentEnd,
    patientPreferredAppointmentNote: patient?.administrativeProfile?.preferredAppointmentNote,
    appointmentReason: appointment?.reason,
    appointmentStartsAt: appointment?.startsAt,
    reloadMode: "cache_busted_import"
  };
}

try {
  const app = Fastify({ logger: false });
  await registerSettingsRoutes(app);
  await registerScheduleRoutes(app);
  await registerPatientRoutes(app);
  const guardedHeaders = { "x-dente-admin-secret": process.env.DENTE_SETTINGS_ADMIN_SECRET };

  const doctorStaffId = "8356141b-7cfa-4221-95f7-70f47e7344b1";
  const assistantStaffId = "f365da0c-7094-4f80-b52d-59b7b1254791";
  const chairId = "b5450677-b0fc-4228-9672-56b27062783f";
  const patientId = "3ebb4567-7777-4f19-8c23-2a78c9962796";
  const doctorWorkingHours = [
    { weekday: 1, start: "08:30", end: "19:30", enabled: true },
    { weekday: 2, start: "08:30", end: "19:30", enabled: true },
    { weekday: 3, start: "08:30", end: "19:30", enabled: true },
    { weekday: 4, start: "08:30", end: "19:30", enabled: true },
    { weekday: 5, start: "08:30", end: "19:30", enabled: true },
    { weekday: 6, start: "09:00", end: "14:00", enabled: true },
    { weekday: 0, start: "10:00", end: "14:00", enabled: false }
  ];
  const assistantWorkingHours = [
    { weekday: 1, start: "08:15", end: "19:45", enabled: true },
    { weekday: 2, start: "08:15", end: "19:45", enabled: true },
    { weekday: 3, start: "08:15", end: "19:45", enabled: true },
    { weekday: 4, start: "08:15", end: "19:45", enabled: true },
    { weekday: 5, start: "08:15", end: "19:45", enabled: true },
    { weekday: 6, start: "09:00", end: "14:30", enabled: true },
    { weekday: 0, start: "10:00", end: "14:00", enabled: false }
  ];
  const chairWorkingHours = [
    { weekday: 1, start: "08:00", end: "20:00", enabled: true },
    { weekday: 2, start: "08:00", end: "20:00", enabled: true },
    { weekday: 3, start: "08:00", end: "20:00", enabled: true },
    { weekday: 4, start: "08:00", end: "20:00", enabled: true },
    { weekday: 5, start: "08:00", end: "20:00", enabled: true },
    { weekday: 6, start: "09:00", end: "15:00", enabled: true },
    { weekday: 0, start: "10:00", end: "14:00", enabled: false }
  ];
  const patientSchedulePreferencePayload = {
    preferredAppointmentWeekdays: [2, 4],
    preferredAppointmentStart: "09:30",
    preferredAppointmentEnd: "13:45",
    preferredAppointmentNote: "Persistent patient schedule window smoke"
  };

  const preferencesPayload = {
    uiLanguage: "ru",
    selectedWorkspaceRole: "owner",
    selectedSpecialty: "surgeon",
    selectedProtocolId: "protocol-surgery-extraction",
    selectedPatientId: patientId,
    scheduleDoctorFilterId: doctorStaffId,
    scheduleAssistantFilterId: assistantStaffId,
    scheduleChairFilterId: chairId,
    scheduleDefaultDoctorUserId: doctorStaffId,
    scheduleDefaultAssistantUserId: assistantStaffId,
    scheduleDefaultChairId: chairId,
    scheduleStatusFilter: "confirmed",
    scheduleDateFilter: "2026-05-12",
    paymentMethod: "cash",
    taxDocumentYear: 2026,
    selectedDocumentKind: "completed_works_act",
    taxApplicationForm: "knd_1151156",
    taxApplicationDeliveryChannel: "email",
    paymentReceiptTaxSupportRequested: true,
    procedureConsentProcedureType: "implantation_bone_graft",
    postVisitCareTopic: "implantation",
    pricelistSourceKind: "manual",
    usePricelistAi: false,
    recognitionKind: "voice_transcription",
    recognitionTarget: "visit_note",
    importSourceKind: "csv_text",
    documentIngestionTarget: "patients",
    imagingImportSourceKind: "dicom_file",
    smartImportMode: "patients",
    imagingKindFilter: "opg",
    dicomWebEndpointUrl: "http://127.0.0.1:8042/dicom-web",
    ohifBaseUrl: "http://127.0.0.1:3000",
    telegramLinkSubjectType: "staff",
    telegramLinkStaffId: doctorStaffId,
    telegramOutboxStatusFilter: "due",
    telegramOutboxTemplateFilter: "appointment_reminder",
    documentIssueSignatureMode: "qualified_electronic_signature",
    documentIssueStaffFullName: "Persistent Issuer",
    documentIssueStaffRole: "Главный врач",
    onboardingDismissed: true,
    onboardingDismissedAt: "2026-05-20T11:00:00.000Z",
    onboardingStep: "telegram",
    onboardingDraftMode: true,
    savedAt: "2026-05-20T11:00:00.000Z"
  };

  const profilePayload = {
    clinicName: "Persistent Smoke Dental",
    legalName: "OOO Persistent Smoke Dental",
    inn: "1234567890",
    kpp: "123456789",
    ogrn: "1234567890123",
    address: "Samara, Persistent street, 1",
    phone: "+7 900 000-00-02",
    email: "persistent@example.test",
    website: "https://persistent.example.test",
    medicalLicenseNumber: "L041-01184-63/00000001",
    medicalLicenseIssuedAt: "2026-02-01",
    medicalLicenseIssuer: "Regional health authority",
    signatoryName: "Persistent Doctor",
    signatoryTitle: "Chief doctor",
    bankDetails: "Settlement account 40702810000000000001",
    timezone: "Europe/Samara",
    defaultVisitMinutes: 55,
    scheduleDefaults: {
      workdayStart: "10:00",
      workdayEnd: "16:00",
      workingDays: [1, 2, 3, 4],
      appointmentBufferMinutes: 20
    },
    egiszEnabled: false
  };

  const preferencesResponse = await app.inject({
    method: "PUT",
    url: "/api/settings/preferences",
    headers: guardedHeaders,
    payload: preferencesPayload
  });
  assert(
    preferencesResponse.statusCode === 200,
    `preference save failed: ${preferencesResponse.statusCode} ${preferencesResponse.body}`
  );
  const stalePreferencesResponse = await app.inject({
    method: "PUT",
    url: "/api/settings/preferences",
    headers: guardedHeaders,
    payload: {
      ...preferencesPayload,
      selectedWorkspaceRole: "assistant",
      scheduleDoctorFilterId: null,
      scheduleAssistantFilterId: null,
      scheduleChairFilterId: null,
      scheduleDefaultDoctorUserId: null,
      scheduleDefaultAssistantUserId: null,
      scheduleDefaultChairId: null,
      scheduleStatusFilter: "all",
      scheduleDateFilter: "",
      telegramLinkSubjectType: "patient",
      telegramLinkStaffId: null,
      telegramOutboxStatusFilter: "all",
      telegramOutboxTemplateFilter: "all",
      documentIssueSignatureMode: "paper_signed",
      documentIssueStaffFullName: "Stale Issuer",
      documentIssueStaffRole: "Администратор",
      selectedDocumentKind: "patient_intake_questionnaire",
      taxApplicationDeliveryChannel: "paper",
      paymentReceiptTaxSupportRequested: false,
      procedureConsentProcedureType: "local_anesthesia",
      postVisitCareTopic: "hygiene",
      onboardingDraftMode: false,
      savedAt: "2026-05-20T10:59:00.000Z"
    }
  });
  assert(
    stalePreferencesResponse.statusCode === 200,
    `stale preference save failed unexpectedly: ${stalePreferencesResponse.statusCode} ${stalePreferencesResponse.body}`
  );
  const stalePreferences = stalePreferencesResponse.json();
  assert(stalePreferences.selectedWorkspaceRole === "owner", "stale UI preference save must not overwrite newer role");
  assert(stalePreferences.scheduleDoctorFilterId === preferencesPayload.scheduleDoctorFilterId, "stale UI preference save must not overwrite schedule doctor filter");
  assert(stalePreferences.scheduleAssistantFilterId === preferencesPayload.scheduleAssistantFilterId, "stale UI preference save must not overwrite schedule assistant filter");
  assert(stalePreferences.scheduleChairFilterId === preferencesPayload.scheduleChairFilterId, "stale UI preference save must not overwrite schedule chair filter");
  assert(stalePreferences.scheduleDefaultDoctorUserId === preferencesPayload.scheduleDefaultDoctorUserId, "stale UI preference save must not overwrite schedule default doctor");
  assert(stalePreferences.scheduleDefaultAssistantUserId === preferencesPayload.scheduleDefaultAssistantUserId, "stale UI preference save must not overwrite schedule default assistant");
  assert(stalePreferences.scheduleDefaultChairId === preferencesPayload.scheduleDefaultChairId, "stale UI preference save must not overwrite schedule default chair");
  assert(stalePreferences.scheduleStatusFilter === "confirmed", "stale UI preference save must not overwrite schedule status filter");
  assert(stalePreferences.scheduleDateFilter === "2026-05-12", "stale UI preference save must not overwrite schedule date filter");
  assert(stalePreferences.telegramLinkSubjectType === "staff", "stale UI preference save must not overwrite Telegram QR subject type");
  assert(stalePreferences.telegramLinkStaffId === preferencesPayload.telegramLinkStaffId, "stale UI preference save must not overwrite Telegram QR staff");
  assert(stalePreferences.telegramOutboxStatusFilter === preferencesPayload.telegramOutboxStatusFilter, "stale UI preference save must not overwrite Telegram outbox status filter");
  assert(stalePreferences.telegramOutboxTemplateFilter === preferencesPayload.telegramOutboxTemplateFilter, "stale UI preference save must not overwrite Telegram outbox template filter");
  assert(stalePreferences.documentIssueSignatureMode === preferencesPayload.documentIssueSignatureMode, "stale UI preference save must not overwrite issue signature mode");
  assert(stalePreferences.documentIssueStaffFullName === preferencesPayload.documentIssueStaffFullName, "stale UI preference save must not overwrite issue staff full name");
  assert(stalePreferences.documentIssueStaffRole === preferencesPayload.documentIssueStaffRole, "stale UI preference save must not overwrite issue staff role");
  assert(stalePreferences.selectedDocumentKind === "completed_works_act", "stale UI preference save must not overwrite newer document");
  assert(stalePreferences.taxApplicationDeliveryChannel === "email", "stale UI preference save must not overwrite tax delivery channel");
  assert(stalePreferences.paymentReceiptTaxSupportRequested === true, "stale UI preference save must not overwrite receipt tax support");
  assert(stalePreferences.procedureConsentProcedureType === "implantation_bone_graft", "stale UI preference save must not overwrite consent procedure type");
  assert(stalePreferences.postVisitCareTopic === "implantation", "stale UI preference save must not overwrite post-visit topic");
  assert(stalePreferences.onboardingDraftMode === true, "stale UI preference save must not overwrite draft mode");

  const profileResponse = await app.inject({
    method: "PUT",
    url: "/api/settings/clinic/profile",
    headers: guardedHeaders,
    payload: profilePayload
  });
  assert(profileResponse.statusCode === 200, `profile save failed: ${profileResponse.statusCode} ${profileResponse.body}`);
  const appointmentResponse = await app.inject({
    method: "PATCH",
    url: "/api/appointments/59d16574-5f6e-4cc7-9f49-2da2f126e11d",
    headers: guardedHeaders,
    payload: {
      startsAt: "2026-05-12T11:05:00+04:00",
      endsAt: "2026-05-12T11:35:00+04:00",
      status: "confirmed",
      reason: "Persistent appointment smoke"
    }
  });
  assert(appointmentResponse.statusCode === 200, `appointment save failed: ${appointmentResponse.statusCode} ${appointmentResponse.body}`);
  const doctorHoursResponse = await app.inject({
    method: "PUT",
    url: `/api/settings/staff/${doctorStaffId}/working-hours`,
    headers: guardedHeaders,
    payload: { workingHours: doctorWorkingHours }
  });
  assert(doctorHoursResponse.statusCode === 200, `doctor hours save failed: ${doctorHoursResponse.statusCode} ${doctorHoursResponse.body}`);
  const assistantHoursResponse = await app.inject({
    method: "PUT",
    url: `/api/settings/staff/${assistantStaffId}/working-hours`,
    headers: guardedHeaders,
    payload: { workingHours: assistantWorkingHours }
  });
  assert(
    assistantHoursResponse.statusCode === 200,
    `assistant hours save failed: ${assistantHoursResponse.statusCode} ${assistantHoursResponse.body}`
  );
  const chairHoursResponse = await app.inject({
    method: "PUT",
    url: `/api/settings/chairs/${chairId}/working-hours`,
    headers: guardedHeaders,
    payload: { workingHours: chairWorkingHours }
  });
  assert(chairHoursResponse.statusCode === 200, `chair hours save failed: ${chairHoursResponse.statusCode} ${chairHoursResponse.body}`);
  const patientSchedulePreferenceResponse = await app.inject({
    method: "PUT",
    url: `/api/patients/${patientId}/administrative-profile`,
    headers: guardedHeaders,
    payload: patientSchedulePreferencePayload
  });
  assert(
    patientSchedulePreferenceResponse.statusCode === 200,
    `patient schedule preference save failed: ${patientSchedulePreferenceResponse.statusCode} ${patientSchedulePreferenceResponse.body}`
  );
  await app.close();

  assert(existsSync(stateFilePath), "settings changes must create a persistent state file");
  const persisted = JSON.parse(readFileSync(stateFilePath, "utf8"));
  assert(persisted.checksum, "persistent state must carry checksum");
  assert(persisted.state.clinicProfile.clinicName === profilePayload.clinicName, "state file clinic profile mismatch");
  assert(persisted.state.clinicProfile.scheduleDefaults.workdayStart === "10:00", "state file schedule start mismatch");
  assert(persisted.state.uiPreferences.selectedWorkspaceRole === "owner", "state file UI preferences mismatch");
  assert(persisted.state.uiPreferences.selectedProtocolId === preferencesPayload.selectedProtocolId, "state file selected protocol mismatch");
  assert(persisted.state.uiPreferences.selectedPatientId === preferencesPayload.selectedPatientId, "state file selected patient mismatch");
  assert(persisted.state.uiPreferences.scheduleDoctorFilterId === preferencesPayload.scheduleDoctorFilterId, "state file schedule doctor filter mismatch");
  assert(persisted.state.uiPreferences.scheduleAssistantFilterId === preferencesPayload.scheduleAssistantFilterId, "state file schedule assistant filter mismatch");
  assert(persisted.state.uiPreferences.scheduleChairFilterId === preferencesPayload.scheduleChairFilterId, "state file schedule chair filter mismatch");
  assert(persisted.state.uiPreferences.scheduleDefaultDoctorUserId === preferencesPayload.scheduleDefaultDoctorUserId, "state file schedule default doctor mismatch");
  assert(persisted.state.uiPreferences.scheduleDefaultAssistantUserId === preferencesPayload.scheduleDefaultAssistantUserId, "state file schedule default assistant mismatch");
  assert(persisted.state.uiPreferences.scheduleDefaultChairId === preferencesPayload.scheduleDefaultChairId, "state file schedule default chair mismatch");
  assert(persisted.state.uiPreferences.scheduleStatusFilter === preferencesPayload.scheduleStatusFilter, "state file schedule status filter mismatch");
  assert(persisted.state.uiPreferences.scheduleDateFilter === preferencesPayload.scheduleDateFilter, "state file schedule date filter mismatch");
  assert(persisted.state.uiPreferences.telegramLinkSubjectType === preferencesPayload.telegramLinkSubjectType, "state file Telegram QR subject type mismatch");
  assert(persisted.state.uiPreferences.telegramLinkStaffId === preferencesPayload.telegramLinkStaffId, "state file Telegram QR staff mismatch");
  assert(persisted.state.uiPreferences.telegramOutboxStatusFilter === preferencesPayload.telegramOutboxStatusFilter, "state file Telegram outbox status filter mismatch");
  assert(persisted.state.uiPreferences.telegramOutboxTemplateFilter === preferencesPayload.telegramOutboxTemplateFilter, "state file Telegram outbox template filter mismatch");
  assert(persisted.state.uiPreferences.documentIssueSignatureMode === preferencesPayload.documentIssueSignatureMode, "state file issue signature mode mismatch");
  assert(persisted.state.uiPreferences.documentIssueStaffFullName === preferencesPayload.documentIssueStaffFullName, "state file issue staff full name mismatch");
  assert(persisted.state.uiPreferences.documentIssueStaffRole === preferencesPayload.documentIssueStaffRole, "state file issue staff role mismatch");
  assert(persisted.state.uiPreferences.selectedDocumentKind === "completed_works_act", "state file selected document kind mismatch");
  assert(persisted.state.uiPreferences.taxApplicationForm === preferencesPayload.taxApplicationForm, "state file tax application form mismatch");
  assert(persisted.state.uiPreferences.taxApplicationDeliveryChannel === preferencesPayload.taxApplicationDeliveryChannel, "state file tax delivery channel mismatch");
  assert(persisted.state.uiPreferences.paymentReceiptTaxSupportRequested === true, "state file receipt tax support mismatch");
  assert(persisted.state.uiPreferences.procedureConsentProcedureType === preferencesPayload.procedureConsentProcedureType, "state file consent procedure type mismatch");
  assert(persisted.state.uiPreferences.postVisitCareTopic === preferencesPayload.postVisitCareTopic, "state file post-visit topic mismatch");
  assert(persisted.state.uiPreferences.uiLanguage === "ru", "state file UI language mismatch");
  assert(persisted.state.uiPreferences.onboardingDismissed === true, "state file onboarding preference mismatch");
  assert(persisted.state.uiPreferences.onboardingDismissedAt === preferencesPayload.onboardingDismissedAt, "state file onboarding timestamp mismatch");
  assert(persisted.state.uiPreferences.onboardingStep === "telegram", "state file onboarding step mismatch");
  assert(persisted.state.uiPreferences.onboardingDraftMode === true, "state file onboarding draft mode mismatch");
  assert(persisted.state.uiPreferences.savedAt === preferencesPayload.savedAt, "state file UI savedAt mismatch");
  const persistedAppointment = persisted.state.appointments.find((appointment) => appointment.id === "59d16574-5f6e-4cc7-9f49-2da2f126e11d");
  assert(persistedAppointment?.reason === "Persistent appointment smoke", "state file appointment mutation mismatch");
  const persistedDoctor = persisted.state.staffMembers.find((member) => member.id === doctorStaffId);
  const persistedAssistant = persisted.state.staffMembers.find((member) => member.id === assistantStaffId);
  const persistedChair = persisted.state.chairs.find((chair) => chair.id === chairId);
  const persistedPatient = persisted.state.patients.find((patient) => patient.id === patientId);
  assert(persistedDoctor?.workingHours?.find((day) => day.weekday === 1)?.start === "08:30", "state file doctor working hours mismatch");
  assert(persistedAssistant?.workingHours?.find((day) => day.weekday === 1)?.start === "08:15", "state file assistant working hours mismatch");
  assert(persistedChair?.workingHours?.find((day) => day.weekday === 1)?.end === "20:00", "state file chair working hours mismatch");
  assert(
    persistedPatient?.administrativeProfile?.preferredAppointmentStart === patientSchedulePreferencePayload.preferredAppointmentStart,
    "state file patient schedule preference start mismatch"
  );
  assert(
    persistedPatient?.administrativeProfile?.preferredAppointmentWeekdays?.join(",") ===
      patientSchedulePreferencePayload.preferredAppointmentWeekdays.join(","),
    "state file patient schedule preference weekdays mismatch"
  );

  const childCode = `
    import { appointments, buildClinicSettings, getUiPreferences, patients } from ${JSON.stringify(pathToFileURL(path.resolve("apps/api/dist/sampleData.js")).href)};
    const settings = buildClinicSettings();
    const preferences = getUiPreferences();
    const appointment = appointments.find((item) => item.id === "59d16574-5f6e-4cc7-9f49-2da2f126e11d");
    const patient = patients.find((item) => item.id === ${JSON.stringify(patientId)});
    console.log(JSON.stringify({
      clinicName: settings.profile.clinicName,
      defaultVisitMinutes: settings.profile.defaultVisitMinutes,
      workdayStart: settings.profile.scheduleDefaults.workdayStart,
      appointmentBufferMinutes: settings.profile.scheduleDefaults.appointmentBufferMinutes,
      uiLanguage: preferences?.uiLanguage,
      selectedWorkspaceRole: preferences?.selectedWorkspaceRole,
      selectedSpecialty: preferences?.selectedSpecialty,
      selectedProtocolId: preferences?.selectedProtocolId,
      selectedPatientId: preferences?.selectedPatientId,
      scheduleDoctorFilterId: preferences?.scheduleDoctorFilterId,
      scheduleAssistantFilterId: preferences?.scheduleAssistantFilterId,
      scheduleChairFilterId: preferences?.scheduleChairFilterId,
      scheduleDefaultDoctorUserId: preferences?.scheduleDefaultDoctorUserId,
      scheduleDefaultAssistantUserId: preferences?.scheduleDefaultAssistantUserId,
      scheduleDefaultChairId: preferences?.scheduleDefaultChairId,
      scheduleStatusFilter: preferences?.scheduleStatusFilter,
      scheduleDateFilter: preferences?.scheduleDateFilter,
      telegramLinkSubjectType: preferences?.telegramLinkSubjectType,
      telegramLinkStaffId: preferences?.telegramLinkStaffId,
      telegramOutboxStatusFilter: preferences?.telegramOutboxStatusFilter,
      telegramOutboxTemplateFilter: preferences?.telegramOutboxTemplateFilter,
      documentIssueSignatureMode: preferences?.documentIssueSignatureMode,
      documentIssueStaffFullName: preferences?.documentIssueStaffFullName,
      documentIssueStaffRole: preferences?.documentIssueStaffRole,
      selectedDocumentKind: preferences?.selectedDocumentKind,
      taxApplicationForm: preferences?.taxApplicationForm,
      taxApplicationDeliveryChannel: preferences?.taxApplicationDeliveryChannel,
      paymentReceiptTaxSupportRequested: preferences?.paymentReceiptTaxSupportRequested,
      procedureConsentProcedureType: preferences?.procedureConsentProcedureType,
      postVisitCareTopic: preferences?.postVisitCareTopic,
      onboardingDismissed: preferences?.onboardingDismissed,
      onboardingDismissedAt: preferences?.onboardingDismissedAt,
      onboardingStep: preferences?.onboardingStep,
      onboardingDraftMode: preferences?.onboardingDraftMode,
      doctorWorkingHours: settings.staff.find((member) => member.id === ${JSON.stringify(doctorStaffId)})?.workingHours,
      assistantWorkingHours: settings.staff.find((member) => member.id === ${JSON.stringify(assistantStaffId)})?.workingHours,
      chairWorkingHours: settings.chairs.find((chair) => chair.id === ${JSON.stringify(chairId)})?.workingHours,
      patientPreferredAppointmentWeekdays: patient?.administrativeProfile?.preferredAppointmentWeekdays,
      patientPreferredAppointmentStart: patient?.administrativeProfile?.preferredAppointmentStart,
      patientPreferredAppointmentEnd: patient?.administrativeProfile?.preferredAppointmentEnd,
      patientPreferredAppointmentNote: patient?.administrativeProfile?.preferredAppointmentNote,
      appointmentReason: appointment?.reason,
      appointmentStartsAt: appointment?.startsAt
    }));
  `;
  let reloaded;
  try {
    const childOutput = execFileSyncWithRetry(process.execPath, ["--input-type=module", "-e", childCode], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DENTAL_STATE_FILE: stateFilePath,
        DENTAL_STATE_BACKUP_DIR: backupDirectoryPath,
        DENTAL_STATE_BACKUPS: "2",
        DENTAL_STATE_PERSISTENCE: ""
      },
      encoding: "utf8"
    });
    reloaded = { ...JSON.parse(childOutput), reloadMode: "child_process" };
  } catch (error) {
    if (error?.code !== "EPERM" && error?.code !== "EBUSY") throw error;
    reloaded = await reloadPersistedSettingsWithFreshImport();
  }
  assert(reloaded.clinicName === profilePayload.clinicName, "reloaded clinic profile mismatch");
  assert(reloaded.defaultVisitMinutes === 55, "reloaded default visit minutes mismatch");
  assert(reloaded.workdayStart === "10:00", "reloaded schedule start mismatch");
  assert(reloaded.appointmentBufferMinutes === 20, "reloaded schedule buffer mismatch");
  assert(reloaded.uiLanguage === "ru", "reloaded UI language mismatch");
  assert(reloaded.selectedWorkspaceRole === "owner", "reloaded UI role mismatch");
  assert(reloaded.selectedSpecialty === "surgeon", "reloaded specialty mismatch");
  assert(reloaded.selectedProtocolId === preferencesPayload.selectedProtocolId, "reloaded selected protocol mismatch");
  assert(reloaded.selectedPatientId === preferencesPayload.selectedPatientId, "reloaded selected patient mismatch");
  assert(reloaded.scheduleDoctorFilterId === preferencesPayload.scheduleDoctorFilterId, "reloaded schedule doctor filter mismatch");
  assert(reloaded.scheduleAssistantFilterId === preferencesPayload.scheduleAssistantFilterId, "reloaded schedule assistant filter mismatch");
  assert(reloaded.scheduleChairFilterId === preferencesPayload.scheduleChairFilterId, "reloaded schedule chair filter mismatch");
  assert(reloaded.scheduleDefaultDoctorUserId === preferencesPayload.scheduleDefaultDoctorUserId, "reloaded schedule default doctor mismatch");
  assert(reloaded.scheduleDefaultAssistantUserId === preferencesPayload.scheduleDefaultAssistantUserId, "reloaded schedule default assistant mismatch");
  assert(reloaded.scheduleDefaultChairId === preferencesPayload.scheduleDefaultChairId, "reloaded schedule default chair mismatch");
  assert(reloaded.scheduleStatusFilter === preferencesPayload.scheduleStatusFilter, "reloaded schedule status filter mismatch");
  assert(reloaded.scheduleDateFilter === preferencesPayload.scheduleDateFilter, "reloaded schedule date filter mismatch");
  assert(reloaded.telegramLinkSubjectType === preferencesPayload.telegramLinkSubjectType, "reloaded Telegram QR subject type mismatch");
  assert(reloaded.telegramLinkStaffId === preferencesPayload.telegramLinkStaffId, "reloaded Telegram QR staff mismatch");
  assert(reloaded.telegramOutboxStatusFilter === preferencesPayload.telegramOutboxStatusFilter, "reloaded Telegram outbox status filter mismatch");
  assert(reloaded.telegramOutboxTemplateFilter === preferencesPayload.telegramOutboxTemplateFilter, "reloaded Telegram outbox template filter mismatch");
  assert(reloaded.documentIssueSignatureMode === preferencesPayload.documentIssueSignatureMode, "reloaded issue signature mode mismatch");
  assert(reloaded.documentIssueStaffFullName === preferencesPayload.documentIssueStaffFullName, "reloaded issue staff full name mismatch");
  assert(reloaded.documentIssueStaffRole === preferencesPayload.documentIssueStaffRole, "reloaded issue staff role mismatch");
  assert(reloaded.selectedDocumentKind === "completed_works_act", "reloaded selected document kind mismatch");
  assert(reloaded.taxApplicationForm === preferencesPayload.taxApplicationForm, "reloaded tax application form mismatch");
  assert(reloaded.taxApplicationDeliveryChannel === preferencesPayload.taxApplicationDeliveryChannel, "reloaded tax delivery channel mismatch");
  assert(reloaded.paymentReceiptTaxSupportRequested === true, "reloaded receipt tax support mismatch");
  assert(reloaded.procedureConsentProcedureType === preferencesPayload.procedureConsentProcedureType, "reloaded consent procedure type mismatch");
  assert(reloaded.postVisitCareTopic === preferencesPayload.postVisitCareTopic, "reloaded post-visit topic mismatch");
  assert(reloaded.onboardingDismissed === true, "reloaded onboarding dismissal mismatch");
  assert(reloaded.onboardingDismissedAt === preferencesPayload.onboardingDismissedAt, "reloaded onboarding timestamp mismatch");
  assert(reloaded.onboardingStep === "telegram", "reloaded onboarding step mismatch");
  assert(reloaded.onboardingDraftMode === true, "reloaded onboarding draft mode mismatch");
  assert(reloaded.doctorWorkingHours?.find((day) => day.weekday === 1)?.start === "08:30", "reloaded doctor working hours mismatch");
  assert(reloaded.assistantWorkingHours?.find((day) => day.weekday === 1)?.start === "08:15", "reloaded assistant working hours mismatch");
  assert(reloaded.chairWorkingHours?.find((day) => day.weekday === 1)?.end === "20:00", "reloaded chair working hours mismatch");
  assert(
    reloaded.patientPreferredAppointmentStart === patientSchedulePreferencePayload.preferredAppointmentStart,
    "reloaded patient preferred start mismatch"
  );
  assert(
    reloaded.patientPreferredAppointmentEnd === patientSchedulePreferencePayload.preferredAppointmentEnd,
    "reloaded patient preferred end mismatch"
  );
  assert(
    reloaded.patientPreferredAppointmentWeekdays?.join(",") === patientSchedulePreferencePayload.preferredAppointmentWeekdays.join(","),
    "reloaded patient preferred weekdays mismatch"
  );
  assert(
    reloaded.patientPreferredAppointmentNote === patientSchedulePreferencePayload.preferredAppointmentNote,
    "reloaded patient preferred note mismatch"
  );
  assert(reloaded.appointmentReason === "Persistent appointment smoke", "reloaded appointment reason mismatch");
  assert(reloaded.appointmentStartsAt === "2026-05-12T11:05:00+04:00", "reloaded appointment start mismatch");

  const legacyStateFilePath = path.join(tempRoot, "legacy-partial-ui-preferences-state.json");
  const legacyPayload = JSON.parse(readFileSync(stateFilePath, "utf8"));
  delete legacyPayload.checksum;
  const legacyPreferences = legacyPayload.state.uiPreferences;
  for (const key of [
    "selectedWorkspaceRole",
    "selectedSpecialty",
    "paymentMethod",
    "taxDocumentYear",
    "pricelistSourceKind",
    "usePricelistAi",
    "recognitionKind",
    "recognitionTarget",
    "importSourceKind",
    "documentIngestionTarget",
    "imagingImportSourceKind",
    "smartImportMode",
    "imagingKindFilter",
    "dicomWebEndpointUrl",
    "ohifBaseUrl",
    "savedAt"
  ]) {
    delete legacyPreferences[key];
  }
  writeFileSync(legacyStateFilePath, JSON.stringify(legacyPayload), "utf8");

  const legacyChildCode = `
    import { getUiPreferences } from ${JSON.stringify(pathToFileURL(path.resolve("apps/api/dist/sampleData.js")).href)};
    const preferences = getUiPreferences();
    console.log(JSON.stringify({
      selectedWorkspaceRole: preferences?.selectedWorkspaceRole,
      selectedSpecialty: preferences?.selectedSpecialty,
      paymentMethod: preferences?.paymentMethod,
      taxDocumentYear: preferences?.taxDocumentYear,
      pricelistSourceKind: preferences?.pricelistSourceKind,
      usePricelistAi: preferences?.usePricelistAi,
      recognitionKind: preferences?.recognitionKind,
      recognitionTarget: preferences?.recognitionTarget,
      importSourceKind: preferences?.importSourceKind,
      documentIngestionTarget: preferences?.documentIngestionTarget,
      imagingImportSourceKind: preferences?.imagingImportSourceKind,
      smartImportMode: preferences?.smartImportMode,
      imagingKindFilter: preferences?.imagingKindFilter,
      dicomWebEndpointUrl: preferences?.dicomWebEndpointUrl,
      ohifBaseUrl: preferences?.ohifBaseUrl,
      savedAt: preferences?.savedAt
    }));
  `;
  const legacyReloaded = JSON.parse(
    execFileSyncWithRetry(process.execPath, ["--input-type=module", "-e", legacyChildCode], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DENTAL_STATE_FILE: legacyStateFilePath,
        DENTAL_STATE_BACKUP_DIR: path.join(tempRoot, "legacy-backups"),
        DENTAL_STATE_BACKUPS: "2",
        DENTAL_STATE_PERSISTENCE: ""
      },
      encoding: "utf8"
    })
  );
  assert(legacyReloaded.selectedWorkspaceRole === "doctor", "legacy UI role default mismatch");
  assert(legacyReloaded.selectedSpecialty === "therapist", "legacy specialty default mismatch");
  assert(legacyReloaded.paymentMethod === "card", "legacy payment method default mismatch");
  assert(Number.isInteger(legacyReloaded.taxDocumentYear), "legacy tax year default missing");
  assert(legacyReloaded.pricelistSourceKind === "spreadsheet_copy", "legacy pricelist source default mismatch");
  assert(legacyReloaded.usePricelistAi === false, "legacy pricelist AI default mismatch");
  assert(legacyReloaded.recognitionKind === "voice_transcription", "legacy recognition kind default mismatch");
  assert(legacyReloaded.recognitionTarget === "visit_note", "legacy recognition target default mismatch");
  assert(legacyReloaded.importSourceKind === "csv_text", "legacy import source default mismatch");
  assert(legacyReloaded.documentIngestionTarget === "smart_import", "legacy document ingestion target default mismatch");
  assert(legacyReloaded.imagingImportSourceKind === "folder_watch", "legacy imaging import source default mismatch");
  assert(legacyReloaded.smartImportMode === "auto", "legacy smart import mode default mismatch");
  assert(legacyReloaded.imagingKindFilter === "all", "legacy imaging kind default mismatch");
  assert(legacyReloaded.dicomWebEndpointUrl === "http://127.0.0.1:8042/dicom-web", "legacy DICOMweb URL default mismatch");
  assert(legacyReloaded.ohifBaseUrl === "http://127.0.0.1:3000", "legacy OHIF URL default mismatch");
  assert(Number.isFinite(Date.parse(legacyReloaded.savedAt)), "legacy savedAt default missing");


  rmSync(stateFilePath, { force: true });
  mkdirSync(stateFilePath, { recursive: true });
  const unreadableIntegrity = getPersistentStateIntegrityReport();
  const unreadableExport = buildPersistentStateExport();
  const unreadableIntegrityText = JSON.stringify({ unreadableIntegrity, unreadableExport });
  assert(
    unreadableIntegrity.warnings.some((warning) => warning.includes("Файл состояния не читается")),
    "unreadable persistence state must return an operator-readable warning"
  );
  assert(
    !/EISDIR|EACCES|illegal operation on a directory|permission denied/i.test(unreadableIntegrityText),
    "unreadable persistence state must not expose filesystem errors or internal diagnostics"
  );
  rmSync(stateFilePath, { recursive: true, force: true });
writeFileSync(stateFilePath, "{ invalid dental state json", "utf8");
  const brokenIntegrity = getPersistentStateIntegrityReport();
  const brokenExport = buildPersistentStateExport();
  const brokenIntegrityText = JSON.stringify({ brokenIntegrity, brokenExport });
  assert(
    brokenIntegrity.warnings.some((warning) => warning.includes("Файл состояния не читается")),
    "broken persistence state must return an operator-readable warning"
  );
  assert(
    brokenExport.error?.includes("Файл состояния не читается"),
    "broken persistence export must return an operator-readable error"
  );
  assert(
    !/Unexpected token|SyntaxError|state_file_parse_failed|state_file_unreadable|JSON\.parse/i.test(brokenIntegrityText),
    "broken persistence state must not expose parser errors or internal diagnostics"
  );

  console.log(JSON.stringify({ ok: true, stateFileExists: true, clinicName: reloaded.clinicName, reloadMode: reloaded.reloadMode }));
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
