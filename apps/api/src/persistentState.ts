import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  AiRecognitionJob,
  Appointment,
  AuditEvent,
  Chair,
  ClinicalRule,
  ClinicProfile,
  CommunicationEvent,
  CommunicationTask,
  DenteTelegramBotSettings,
  DenteTelegramChatLink,
  DenteTelegramOutboxDeliveryReceipt,
  DenteTelegramLinkCode,
  DenteTelegramWebhookEvent,
  DicomWorkbenchBundle,
  GeneratedDocument,
  ImagingStudy,
  ImagingViewerSession,
  ImportBatch,
  Patient,
  Payment,
  SpeechTranscriptionChunk,
  StaffMember,
  UiPreferences,
  Visit,
  VisitDraftAutosave,
  VisitSaveReceipt
} from "@dental/shared";

const stateVersion = 1;

export type DentalMutableState = {
  clinicProfile: ClinicProfile;
  staffMembers: StaffMember[];
  chairs: Chair[];
  appointments: Appointment[];
  patients: Patient[];
  documents: GeneratedDocument[];
  clinicalRules: ClinicalRule[];
  payments: Payment[];
  communicationTasks: CommunicationTask[];
  communicationEvents: CommunicationEvent[];
  imagingStudies: ImagingStudy[];
  imagingViewerSessions: ImagingViewerSession[];
  dicomWorkbenchBundles: DicomWorkbenchBundle[];
  importBatches: ImportBatch[];
  auditEvents: AuditEvent[];
  aiRecognitionJobs: AiRecognitionJob[];
  speechTranscriptionChunks: SpeechTranscriptionChunk[];
  visitDraftAutosaves: VisitDraftAutosave[];
  visitSaveReceipts: VisitSaveReceipt[];
  denteTelegramBotSettings: DenteTelegramBotSettings;
  denteTelegramLinkCodes: DenteTelegramLinkCode[];
  denteTelegramChatLinks: DenteTelegramChatLink[];
  denteTelegramWebhookEvents: DenteTelegramWebhookEvent[];
  denteTelegramOutboxDeliveryReceipts: DenteTelegramOutboxDeliveryReceipt[];
  uiPreferences: UiPreferences | null;
  activeVisit: Visit;
};

type PersistedDentalState = {
  version: typeof stateVersion;
  savedAt: string;
  checksum?: string;
  state: DentalMutableState;
};

type PersistedDentalStateCore = Omit<PersistedDentalState, "checksum">;
type PersistedPayloadReadError = "state_file_missing" | "state_file_unreadable";
type PersistenceIntegrityWarning =
  | "persistence_disabled"
  | "state_file_missing"
  | "state_file_unreadable"
  | "state_checksum_mismatch"
  | "backup_integrity_warning";

function persistenceEnabled(): boolean {
  return process.env.DENTAL_STATE_PERSISTENCE !== "off";
}

function getStateFilePath(): string {
  return process.env.DENTAL_STATE_FILE ?? path.resolve(process.cwd(), ".data", "dental-crm-state.json");
}

function getBackupDirectoryPath(): string {
  return process.env.DENTAL_STATE_BACKUP_DIR ?? path.join(path.dirname(getStateFilePath()), "backups");
}

function getMaxBackupCount(): number {
  return Number(process.env.DENTAL_STATE_BACKUPS ?? 30);
}

function checksumPersistentState(payload: PersistedDentalStateCore): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function timestampForFileName(value = new Date()): string {
  return value.toISOString().replace(/[-:]/g, "").replace(".", "-");
}

function listBackupFiles(): Array<{ filePath: string; savedAt: string; sizeBytes: number }> {
  const backupDirectoryPath = getBackupDirectoryPath();
  if (!fs.existsSync(backupDirectoryPath)) return [];

  return fs.readdirSync(backupDirectoryPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => {
      const filePath = path.join(backupDirectoryPath, entry.name);
      const stats = fs.statSync(filePath);
      return {
        filePath,
        savedAt: stats.mtime.toISOString(),
        sizeBytes: stats.size
      };
    })
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt));
}

function fileNameOf(filePath: string): string {
  return path.basename(filePath);
}

function rawFileHash(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  } catch {
    return null;
  }
}

function stateCollectionCounts(state: Partial<DentalMutableState> | null | undefined): Record<string, number> {
  if (!state) return {};
  return {
    staffMembers: state.staffMembers?.length ?? 0,
    chairs: state.chairs?.length ?? 0,
    appointments: state.appointments?.length ?? 0,
    patients: state.patients?.length ?? 0,
    documents: state.documents?.length ?? 0,
    clinicalRules: state.clinicalRules?.length ?? 0,
    payments: state.payments?.length ?? 0,
    communicationTasks: state.communicationTasks?.length ?? 0,
    communicationEvents: state.communicationEvents?.length ?? 0,
    imagingStudies: state.imagingStudies?.length ?? 0,
    imagingViewerSessions: state.imagingViewerSessions?.length ?? 0,
    dicomWorkbenchBundles: state.dicomWorkbenchBundles?.length ?? 0,
    importBatches: state.importBatches?.length ?? 0,
    auditEvents: state.auditEvents?.length ?? 0,
    aiRecognitionJobs: state.aiRecognitionJobs?.length ?? 0,
    speechTranscriptionChunks: state.speechTranscriptionChunks?.length ?? 0,
    visitDraftAutosaves: state.visitDraftAutosaves?.length ?? 0,
    visitSaveReceipts: state.visitSaveReceipts?.length ?? 0,
    denteTelegramLinkCodes: state.denteTelegramLinkCodes?.length ?? 0,
    denteTelegramChatLinks: state.denteTelegramChatLinks?.length ?? 0,
    denteTelegramWebhookEvents: state.denteTelegramWebhookEvents?.length ?? 0,
    denteTelegramOutboxDeliveryReceipts: state.denteTelegramOutboxDeliveryReceipts?.length ?? 0
  };
}

function checksumVerified(payload: Partial<PersistedDentalState> | null | undefined): boolean | null {
  if (!payload?.checksum || payload.version !== stateVersion || !payload.state) return null;
  return (
    payload.checksum ===
    checksumPersistentState({
      version: stateVersion,
      savedAt: payload.savedAt ?? "",
      state: payload.state as DentalMutableState
    })
  );
}

function persistenceWarningText(warning: PersistenceIntegrityWarning): string {
  if (warning === "persistence_disabled") return "Серверное сохранение состояния выключено; перед миграцией включите сохранение или скачайте ручной экспорт.";
  if (warning === "state_file_missing") return "Файл состояния еще не создан; выполните рабочее изменение и повторите проверку резервной копии.";
  if (warning === "state_file_unreadable") return "Файл состояния не читается; используйте последнюю читаемую резервную копию и проверьте права сервера.";
  if (warning === "state_checksum_mismatch") return "Контрольная сумма файла состояния не совпала; скачайте экспорт и проверьте последнюю резервную копию.";
  return "Одна из последних резервных копий не прошла проверку; не удаляйте архивы до читаемого экспорта.";
}

function compactPersistenceWarnings(warnings: Array<string | null | undefined>): string[] {
  return Array.from(new Set(warnings.filter((warning): warning is string => Boolean(warning))));
}

function readPersistedPayload(filePath: string): { payload: Partial<PersistedDentalState> | null; error: PersistedPayloadReadError | null } {
  if (!fs.existsSync(filePath)) return { payload: null, error: "state_file_missing" };
  try {
    return { payload: JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<PersistedDentalState>, error: null };
  } catch {
    return { payload: null, error: "state_file_unreadable" };
  }
}

function rotateStateBackup(): void {
  const stateFilePath = getStateFilePath();
  const backupDirectoryPath = getBackupDirectoryPath();
  if (!fs.existsSync(stateFilePath)) return;

  fs.mkdirSync(backupDirectoryPath, { recursive: true });
  const backupPath = path.join(backupDirectoryPath, `dental-crm-state-${timestampForFileName()}.json`);
  fs.copyFileSync(stateFilePath, backupPath);

  const maxBackupCount = getMaxBackupCount();
  const backupLimit = Number.isFinite(maxBackupCount) && maxBackupCount > 0 ? Math.floor(maxBackupCount) : 30;
  const staleBackups = listBackupFiles().slice(backupLimit);
  for (const backup of staleBackups) {
    fs.unlinkSync(backup.filePath);
  }
}

function readPersistedState(): PersistedDentalState | null {
  const stateFilePath = getStateFilePath();
  if (!persistenceEnabled() || !fs.existsSync(stateFilePath)) return null;

  try {
    const parsed = JSON.parse(fs.readFileSync(stateFilePath, "utf8")) as Partial<PersistedDentalState>;
    if (parsed.version !== stateVersion || !parsed.state) return null;
    if (parsed.checksum) {
      const expectedChecksum = checksumPersistentState({
        version: parsed.version,
        savedAt: parsed.savedAt ?? "",
        state: parsed.state as DentalMutableState
      });
      if (parsed.checksum !== expectedChecksum) {
        console.warn("Dental state file ignored: checksum mismatch");
        return null;
      }
    }
    return parsed as PersistedDentalState;
  } catch (error) {
    console.warn(`Dental state file ignored: ${error instanceof Error ? error.message : "unknown parse error"}`);
    return null;
  }
}

export function loadPersistentState(): Partial<DentalMutableState> | null {
  return readPersistedState()?.state ?? null;
}

export function savePersistentState(state: DentalMutableState): void {
  if (!persistenceEnabled()) return;
  const stateFilePath = getStateFilePath();

  const payloadCore: PersistedDentalStateCore = {
    version: stateVersion,
    savedAt: new Date().toISOString(),
    state
  };
  const payload: PersistedDentalState = {
    ...payloadCore,
    checksum: checksumPersistentState(payloadCore)
  };

  try {
    fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
    rotateStateBackup();
    const tempPath = `${stateFilePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), "utf8");
    fs.renameSync(tempPath, stateFilePath);
  } catch (error) {
    console.warn(`Dental state file save failed: ${error instanceof Error ? error.message : "unknown save error"}`);
  }
}

export function getPersistentStateMeta() {
  const stateFilePath = getStateFilePath();
  const backupDirectoryPath = getBackupDirectoryPath();
  const maxBackupCount = getMaxBackupCount();
  const persisted = readPersistedState();
  const backups = listBackupFiles();

  return {
    enabled: persistenceEnabled(),
    filePath: stateFilePath,
    exists: fs.existsSync(stateFilePath),
    version: persisted?.version ?? null,
    savedAt: persisted?.savedAt ?? null,
    checksum: persisted?.checksum ?? null,
    backupDirectoryPath,
    backupCount: backups.length,
    latestBackupAt: backups[0]?.savedAt ?? null,
    latestBackupSizeBytes: backups[0]?.sizeBytes ?? null,
    maxBackupCount: Number.isFinite(maxBackupCount) && maxBackupCount > 0 ? Math.floor(maxBackupCount) : 30
  };
}

export function getPersistentStateIntegrityReport(limit = 8) {
  const stateFilePath = getStateFilePath();
  const meta = getPersistentStateMeta();
  const { payload, error } = readPersistedPayload(stateFilePath);
  const checksumOk = checksumVerified(payload);
  const backups = listBackupFiles().slice(0, Math.max(0, limit)).map((backup) => {
    const backupPayload = readPersistedPayload(backup.filePath);
    return {
      fileName: fileNameOf(backup.filePath),
      savedAt: backup.savedAt,
      sizeBytes: backup.sizeBytes,
      fileHash: rawFileHash(backup.filePath),
      checksumVerified: checksumVerified(backupPayload.payload),
      readable: !backupPayload.error,
      warning: backupPayload.error ? persistenceWarningText(backupPayload.error) : null
    };
  });
  const warningCodes: Array<PersistenceIntegrityWarning | null> = [
    !meta.enabled ? "persistence_disabled" : null,
    !meta.exists ? "state_file_missing" : null,
    error,
    checksumOk === false ? "state_checksum_mismatch" : null,
    backups.some((backup) => backup.readable === false || backup.checksumVerified === false) ? "backup_integrity_warning" : null
  ];
  const warnings = compactPersistenceWarnings(warningCodes.map((warning) => (warning ? persistenceWarningText(warning) : null)));

  return {
    ok: meta.enabled && meta.exists && checksumOk !== false && warnings.length === 0,
    checkedAt: new Date().toISOString(),
    meta,
    stateFileHash: rawFileHash(stateFilePath),
    checksumVerified: checksumOk,
    stateCounts: stateCollectionCounts(payload?.state),
    backups,
    warnings,
    nextAction:
      warnings.length === 0
        ? "Файл состояния и последние резервные копии читаются. Перед миграцией скачайте контрольный экспорт."
        : "Проверьте предупреждения перед импортом, миграцией или обновлением. Не удаляйте резервные копии, пока нет читаемого экспорта."
  };
}

export function buildPersistentStateExport() {
  const stateFilePath = getStateFilePath();
  const { payload, error } = readPersistedPayload(stateFilePath);
  return {
    exportedAt: new Date().toISOString(),
    exportKind: "dental-crm-prototype-state",
    exportVersion: 1,
    integrity: getPersistentStateIntegrityReport(12),
    error: error ? persistenceWarningText(error) : null,
    payload
  };
}
