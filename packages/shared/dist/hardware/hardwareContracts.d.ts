/**
 * @dental/shared/hardware — Hardware Contracts, Communication Protocols & IPC Definitions.
 *
 * Defines unified cross-platform interfaces for:
 * 1. Windows COM / USB Serial Ports & Hardware Devices (2D Scanners, Button Boxes, KKT).
 * 2. TWAIN Dental Radiography Sensors & Intraoral Cameras.
 * 3. 54-FZ Fiscal Registrars (АТОЛ Драйвер ККТ 10, Штрих-М) via TCP & COM.
 * 4. Thermal Label Printers (TSPL / ZPL / ESC-POS / HTML) for SanPiN 3.3686-21 sterilization.
 * 5. Local Offline Database Server Engine (SQLite / Embedded Postgres) for isolated clinics.
 * 6. IPC Protocol Schemas between Electron/Tauri host and Web/Mobile renderer.
 */
import { z } from "zod";
export declare const serialBaudRateSchema: z.ZodEnum<["4800", "9600", "19200", "38400", "57600", "115200"]>;
export type SerialBaudRate = z.infer<typeof serialBaudRateSchema>;
export interface HardwareSerialPortDescriptor {
    readonly path: string;
    readonly manufacturer?: string | undefined;
    readonly serialNumber?: string | undefined;
    readonly vendorId?: string | undefined;
    readonly productId?: string | undefined;
    readonly isOpen?: boolean | undefined;
}
export interface SerialPortConfig {
    readonly path: string;
    readonly baudRate: number;
    readonly dataBits?: 5 | 6 | 7 | 8 | undefined;
    readonly stopBits?: 1 | 1.5 | 2 | undefined;
    readonly parity?: "none" | "even" | "odd" | "mark" | "space" | undefined;
    readonly rtscts?: boolean | undefined;
    readonly xon?: boolean | undefined;
    readonly xoff?: boolean | undefined;
}
export interface TwainDeviceDescriptor {
    readonly id: string;
    readonly name: string;
    readonly manufacturer?: string | undefined;
    readonly productFamily?: string | undefined;
    readonly type: "sensor" | "scanner" | "camera";
    readonly connected: boolean;
    readonly resolutionDpi?: number | undefined;
}
export interface TwainCaptureRequest {
    readonly deviceId: string;
    readonly patientId?: string | undefined;
    readonly visitId?: string | undefined;
    readonly toothCode?: string | undefined;
    readonly resolutionDpi?: number | undefined;
    readonly timeoutMs?: number | undefined;
}
export interface TwainCaptureResponse {
    readonly success: boolean;
    readonly dataBase64?: string | undefined;
    readonly widthPx?: number | undefined;
    readonly heightPx?: number | undefined;
    readonly bitDepth?: number | undefined;
    readonly toothCode?: string | undefined;
    readonly patientId?: string | undefined;
    readonly modality: "IO" | "DX" | "PX" | "CR" | "CT";
    readonly error?: string | undefined;
    readonly errorCategory?: string | undefined;
}
/**
 * Local Clinic Server Run-Mode for clinics without persistent internet
 */
export declare const localDatabaseEngineTypeSchema: z.ZodEnum<["postgres_native", "postgres_embedded", "sqlite_standalone", "cloud_primary"]>;
export type LocalDatabaseEngineType = z.infer<typeof localDatabaseEngineTypeSchema>;
export declare const clinicSyncModeSchema: z.ZodEnum<["isolated_offline", "lan_primary_sync", "hybrid_cloud_mesh", "online_managed"]>;
export type ClinicSyncMode = z.infer<typeof clinicSyncModeSchema>;
export interface LocalClinicServerConfig {
    readonly engineType: LocalDatabaseEngineType;
    readonly syncMode: ClinicSyncMode;
    readonly host: string;
    readonly port: number;
    readonly databaseName: string;
    readonly isOfflineCapable: boolean;
    readonly lastSyncTimestamp?: string | null | undefined;
    readonly pendingMutationsCount: number;
    readonly maxOfflineStorageMb?: number | undefined;
}
export interface LocalClinicServerHealth {
    readonly isRunning: boolean;
    readonly engine: LocalDatabaseEngineType;
    readonly latencyMs: number;
    readonly activeConnections: number;
    readonly databaseSizeBytes: number;
    readonly canAcceptWrites: boolean;
    readonly lastBackupTimestamp?: string | undefined;
    readonly error?: string | undefined;
}
/**
 * Safe IPC Message Channels for Desktop/Mobile Native Communication
 */
export declare const DENTE_IPC_CHANNELS: {
    readonly SERIAL_LIST: "dente:list-serial-ports";
    readonly SERIAL_OPEN: "dente:open-serial-port";
    readonly SERIAL_CLOSE: "dente:close-serial-port";
    readonly SERIAL_WRITE: "dente:write-serial-port";
    readonly SERIAL_DATA_EVENT: "dente:serial-data-received";
    readonly TWAIN_LIST: "dente:list-twain-devices";
    readonly TWAIN_ACQUIRE: "dente:acquire-twain-image";
    readonly PRINTERS_LIST: "dente:list-printers";
    readonly PRINT_THERMAL_LABEL: "dente:print-thermal-label";
    readonly PRINT_ESCPOS_RECEIPT: "dente:print-escpos-receipt";
    readonly PRINT_FISCAL_RECEIPT_TCP: "dente:print-fiscal-receipt-tcp";
    readonly CHECK_KKT_STATUS_TCP: "dente:check-kkt-status-tcp";
    readonly WATCH_DICOM_FOLDER: "dente:watch-dicom-folder";
    readonly UNWATCH_DICOM_FOLDER: "dente:unwatch-dicom-folder";
    readonly DICOM_FILE_DETECTED: "dente:dicom-file-detected";
    readonly TOGGLE_FULLSCREEN: "dente:toggle-fullscreen";
    readonly TOGGLE_KIOSK: "dente:toggle-kiosk";
    readonly GET_WINDOW_STATE: "dente:get-window-state";
    readonly GET_LOCAL_SERVER_STATUS: "dente:get-local-server-status";
    readonly SWITCH_LOCAL_DATABASE_MODE: "dente:switch-local-database-mode";
    readonly CHECK_FOR_UPDATES: "dente:check-for-updates";
    readonly INSTALL_UPDATE: "dente:install-update";
    readonly UPDATE_AVAILABLE: "dente:update-available";
};
