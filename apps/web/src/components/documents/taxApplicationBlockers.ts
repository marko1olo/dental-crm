/**
 * taxApplicationBlockers.ts
 *
 * Soft Guiding & Safe Defaults Engine for Tax Deduction Application (Mandates 8e, 8n).
 * Re-exports canonical implementation from taxApplicationGuiding.ts.
 *
 * Печать заявления и выдача справки НИКОГДА не блокируются:
 * незаполненные поля заявитель может дописать от руки на распечатанном бланке.
 */

export * from "./taxApplicationGuiding.js";
