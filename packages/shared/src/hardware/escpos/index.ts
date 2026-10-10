/**
 * @dental/shared/hardware/escpos — ESC/POS Thermal Receipt Engine & Russian CP866 Pipeline.
 *
 * Re-exports all data types, low-level byte command sequences, QR/barcode encoders,
 * and high-level 54-FZ fiscal receipt / appointment ticket formatters.
 */

export * from "./types.js";
export * from "./barcodeQrEncoder.js";
export * from "./byteCommands.js";
export * from "./receiptFormatter.js";
