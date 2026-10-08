/**
 * DENTE CRM — Desktop Windows (.EXE) Native Hardware Bridge (Layer 5 Canonical Facade)
 *
 * Provides typed IPC communication with Electron / Tauri host process:
 * - Direct COM/USB serial port access for TWAIN dental sensors & visiographs.
 * - Direct TCP/IP socket printing for АТОЛ / Штрих-М fiscal registers.
 * - Local filesystem folder watching for incoming X-ray DICOM / Visiograph files.
 *
 * Canonical facade re-exporting 100% of symbols from modular subsystem `./desktop/`.
 * All underlying modules strictly conform to Mandate 8b (<800 lines per file).
 */

export * from "./desktop";
