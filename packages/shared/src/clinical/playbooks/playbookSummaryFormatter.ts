/**
 * packages/shared/src/clinical/playbooks/playbookSummaryFormatter.ts
 * Clinical Protocol Summary & A4 Formatter (Wave 132 / Mandates 8b, 8d item 7, 8x, 8ap).
 * Strictly 0 emojis in regulatory documents; clean clinical terminology.
 */

import {
	formatPlaybookForm043A4Protocol,
	type PlaybookA4ProtocolInput,
} from "../smartClinicalPlaybookProtocols.js";

export { formatPlaybookForm043A4Protocol, type PlaybookA4ProtocolInput };

/**
 * Clean domain alias for Form 043/u clinical playbook protocol per Mandate 8x / 8ap.
 * Purges raw bureaucratic decree numbers from calling code.
 */
export const formatPlaybookVisitProtocol = formatPlaybookForm043A4Protocol;

/**
 * Formats a single-line clinical chairside reminder without bureaucratic jargon.
 */
export function formatChairsideReminderNote(doctorFullName: string, patientFullName: string, tip: string): string {
	return `[Врач: ${doctorFullName}] Пациент: ${patientFullName}. Подсказка: ${tip}`;
}
