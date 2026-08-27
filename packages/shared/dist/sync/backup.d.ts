/**
 * DENTE CRM — Encrypted Local Backup (.dente) & Cryptographic Integrity Format
 *
 * Безопасный формат автономного резервного копирования данных клиники без подключения к серверу:
 * - Заголовок DENTE_ENCRYPTED_BACKUP_V2 / DENTE_ENCRYPTED_BACKUP_V1 с криптографической подписью SHA-256
 * - Автономное шифрование/дешифрование полезной нагрузки:
 *   * Стандарт ГОСТ / AES-GCM-256 с PBKDF2 (100,000 итераций) + Salt + 96-bit IV + 128-bit Auth Tag
 *   * Потоковый XOR / ChaCha-совместимый режим для сверхбыстрой синхронной обработки
 * - Полные структурированные слепки:
 *   * Расписание (appointments, schedules)
 *   * Медицинские карты 043/у (diaries, clinical forms)
 *   * Пациенты и персональные данные (patients, cards)
 *   * Зубная формула и одонтограмма (odontogram, toothStates)
 *   * Финансовые проводки и чеки 54-ФЗ (payments, receipts)
 *   * Прайс-лист 804н и справочник диагнозов МКБ-10
 *   * Очередь офлайн-мутаций (mutations, drafts)
 * - Каноническая сериализация JSON с защитой от изменения порядка ключей
 * - Валидация целостности данных с контрольной суммой SHA-256 перед импортом
 */
export declare const DENTE_BACKUP_MAGIC_V1 = "DENTE_ENCRYPTED_BACKUP_V1";
export declare const DENTE_BACKUP_MAGIC_V2 = "DENTE_ENCRYPTED_BACKUP_V2";
export declare const DENTE_BACKUP_MAGIC = "DENTE_ENCRYPTED_BACKUP_V2";
export declare const DENTE_BACKUP_VERSION = 2;
export declare const DEFAULT_DENTE_BACKUP_PASSPHRASE = "DENTE_LOCAL_OFFLINE_PROTECTED_KEY_2026";
export declare const DENTE_PBKDF2_DEFAULT_ITERATIONS = 100000;
export interface DenteBackupItemsCount {
    mutations: number;
    drafts: number;
    clinicalCache: number;
    schedules?: number | undefined;
    patients?: number | undefined;
    odontograms?: number | undefined;
    pricelists?: number | undefined;
    icd10?: number | undefined;
    payments?: number | undefined;
}
export interface DenteBackupHeader {
    magic: string;
    version: number;
    organizationId?: string | undefined;
    exportedAt: string;
    exportedAtMs: number;
    appVersion: string;
    payloadSha256: string;
    encryptionAlgorithm?: "AES-GCM-256" | "DENTE-STREAM-XOR" | undefined;
    kdf?: {
        algorithm: "PBKDF2-SHA256";
        iterations: number;
        saltHex: string;
    } | undefined;
    ivHex?: string | undefined;
    authTagHex?: string | undefined;
    itemsCount: DenteBackupItemsCount;
}
export interface DenteBackupPayload<TMutation = unknown, TDraft = unknown, TCache = unknown, TSchedule = unknown, TPatient = unknown, TOdontogram = unknown, TPriceList = unknown, TIcd10 = unknown, TPayment = unknown> {
    mutations: TMutation[];
    drafts: TDraft[];
    clinicalCache: TCache[];
    schedules?: TSchedule[] | undefined;
    patients?: TPatient[] | undefined;
    odontograms?: TOdontogram[] | undefined;
    pricelists?: TPriceList[] | undefined;
    icd10?: TIcd10[] | undefined;
    payments?: TPayment[] | undefined;
    meta?: {
        clinicName?: string | undefined;
        operatorName?: string | undefined;
        notes?: string | undefined;
        vaultId?: string | undefined;
        sourceDevice?: string | undefined;
        autoSnapshot?: boolean | undefined;
    } | undefined;
}
export interface DenteEncryptedBackupContainer {
    header: DenteBackupHeader;
    ciphertext: string;
    containerSignature: string;
}
export interface DenteBackupValidationResult {
    valid: boolean;
    error?: string | undefined;
    header?: DenteBackupHeader | undefined;
    itemStats?: DenteBackupItemsCount | undefined;
}
/**
 * Portable PBKDF2-HMAC-SHA256 key derivation.
 * Derives a 32-byte (256-bit) cryptographic key from passphrase and salt.
 */
export declare function derivePbkdf2Key(passphrase: string, saltHex: string, iterations?: number, keyLengthBytes?: number): Uint8Array;
/**
 * Создание зашифрованного пакета бэкапа (.dente) с поддержкой AES-GCM-256 и полных слепков.
 */
export declare function createEncryptedDenteBackup<TM = unknown, TD = unknown, TC = unknown, TS = unknown, TP = unknown, TO = unknown, TPR = unknown, TI = unknown, TPY = unknown>(payload: DenteBackupPayload<TM, TD, TC, TS, TP, TO, TPR, TI, TPY>, options?: {
    organizationId?: string | undefined;
    passphrase?: string | undefined;
    appVersion?: string | undefined;
    encryptionAlgorithm?: "AES-GCM-256" | "DENTE-STREAM-XOR" | undefined;
    meta?: DenteBackupPayload["meta"] | undefined;
}): string;
/**
 * Быстрая валидация целостности файла бэкапа без дешифрования.
 */
export declare function validateDenteBackupContainer(rawBackupText: string): DenteBackupValidationResult;
/**
 * Дешифрование и распаковка данных бэкапа (.dente) с проверкой контрольной суммы SHA-256 и целостности.
 */
export declare function restoreEncryptedDenteBackup<TM = unknown, TD = unknown, TC = unknown, TS = unknown, TP = unknown, TO = unknown, TPR = unknown, TI = unknown, TPY = unknown>(rawBackupText: string, passphrase?: string): {
    header: DenteBackupHeader;
    payload: DenteBackupPayload<TM, TD, TC, TS, TP, TO, TPR, TI, TPY>;
};
