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
export const serialBaudRateSchema = z.enum([
    "4800",
    "9600",
    "19200",
    "38400",
    "57600",
    "115200",
]);
/**
 * Local Clinic Server Run-Mode for clinics without persistent internet
 */
export const localDatabaseEngineTypeSchema = z.enum([
    "postgres_native",
    "postgres_embedded",
    "sqlite_standalone",
    "cloud_primary",
]);
export const clinicSyncModeSchema = z.enum([
    "isolated_offline",
    "lan_primary_sync",
    "hybrid_cloud_mesh",
    "online_managed",
]);
/**
 * Safe IPC Message Channels for Desktop/Mobile Native Communication
 */
export const DENTE_IPC_CHANNELS = {
    SERIAL_LIST: "dente:list-serial-ports",
    SERIAL_OPEN: "dente:open-serial-port",
    SERIAL_CLOSE: "dente:close-serial-port",
    SERIAL_WRITE: "dente:write-serial-port",
    SERIAL_DATA_EVENT: "dente:serial-data-received",
    TWAIN_LIST: "dente:list-twain-devices",
    TWAIN_ACQUIRE: "dente:acquire-twain-image",
    PRINTERS_LIST: "dente:list-printers",
    PRINT_THERMAL_LABEL: "dente:print-thermal-label",
    PRINT_ESCPOS_RECEIPT: "dente:print-escpos-receipt",
    PRINT_FISCAL_RECEIPT_TCP: "dente:print-fiscal-receipt-tcp",
    CHECK_KKT_STATUS_TCP: "dente:check-kkt-status-tcp",
    WATCH_DICOM_FOLDER: "dente:watch-dicom-folder",
    UNWATCH_DICOM_FOLDER: "dente:unwatch-dicom-folder",
    DICOM_FILE_DETECTED: "dente:dicom-file-detected",
    TOGGLE_FULLSCREEN: "dente:toggle-fullscreen",
    TOGGLE_KIOSK: "dente:toggle-kiosk",
    GET_WINDOW_STATE: "dente:get-window-state",
    GET_LOCAL_SERVER_STATUS: "dente:get-local-server-status",
    SWITCH_LOCAL_DATABASE_MODE: "dente:switch-local-database-mode",
    CHECK_FOR_UPDATES: "dente:check-for-updates",
    INSTALL_UPDATE: "dente:install-update",
    UPDATE_AVAILABLE: "dente:update-available",
};
