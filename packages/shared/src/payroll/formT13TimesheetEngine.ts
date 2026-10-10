/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Statutory Form T-13 Timesheet Engine (Госкомстат РФ № 1)
 * Canonical Thin Facade (Wave 25 Monolith Decomposition)
 *
 * Implements:
 * 1. Unified Form No. T-13 ("Табель учета рабочего времени", Постановление Госкомстата РФ от 05.01.2004 № 1, ОКУД 0301008).
 * 2. Statutory Russian attendance/absence codes (Я, Н, РВ, С, В, ОТ, ОД, У, Б, Т, ДО, ПР, К, ПК).
 * 3. Russian Production Calendar 2026 norms (33h/36h/39h/40h weekly hours per Art. 350 Labor Code RF).
 * 4. Daily shift accounting (1..31 days), night hours (22:00-06:00), overtime, and half-month/month aggregations.
 * 5. Official Form T-13 A4 Landscape HTML & UTF-8 BOM CSV generators.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export * from "./formT13/index.js";
