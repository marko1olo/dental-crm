/**
 * @dental/shared/hardware — ESC/POS Binary Buffer Generator & Russian CP866 Engine
 *
 * Canonical Facade re-exporting modular ESC/POS sub-system from ./escpos/index.js.
 * Preserves 100% AST export parity for thermal receipt and ticket generation.
 *
 * Capabilities:
 * 1. Russian CP866 Cyrillic character table encoding (А-я, Ё, ё, №, ₽, formatting symbols).
 * 2. ESC/POS Command sequences: Align, Bold, Underline, Invert, Double Height/Width, Feed, Cut, Buzzer, Drawer Pulse.
 * 3. 2D QR Code Generation (Model 2, Error Correction L/M/Q/H) for 54-FZ FNS validation & patient check-in.
 * 4. 1D Barcode Generation: Code 128.
 * 5. Pre-built templates for 54-FZ Fiscal Receipts and Doctor Appointment / Queue Tickets.
 *
 * Compliance: THE HAMMER, Mandates 2 (Zero Mocks), 8b (Clean Modular Architecture).
 */

export * from "./escpos/index.js";
