/**
 * types.ts — Типы для истории рентгеновских снимков пациента (Мандат 8b <= 120 строк).
 */

import type { PanelPhaseOrReady, PanelSubject } from "../../../lib/panelStateText";

export interface XrayHistoryItem {
	id: string;
	patientId: string;
	status: "pending" | "analyzing" | "done" | "error";
	kind: string;
	toothCode?: string | null;
	originalFilename?: string | null;
	aiReport?: string | null;
	aiSummary?: string | null;
	aiToothStates?: Record<string, string> | null;
	aiError?: string | null;
	hasImage: boolean;
	imageDataUri?: string | null;
	capturedAt: string;
	createdAt: string;
}

export const SCAN_ARCHIVE_SUBJECT: PanelSubject = {
	notLoadedTitle: "Снимки пациента не загружены",
	accusative: "архив снимков пациента",
	emptyTitle: "Снимков у этого пациента пока нет.",
	emptyHint: "Перетащите первый прицельный снимок в поле выше — он попадёт в карту вместе с разбором ИИ.",
	failureConsequence: "Не считайте, что снимков нет: архив не прочитан. Прошлые снимки могли быть загружены на другом рабочем месте.",
};

export interface VisiographHistoryDrawerProps {
	scanHistory: XrayHistoryItem[];
	isLoadingHistory: boolean;
	historyFailure: { status: number | null } | null;
	historyPhase: PanelPhaseOrReady;
	effectivePatientId?: string | null | undefined;
	onLoadHistoryScan: (scan: XrayHistoryItem) => void;
	onDeleteScan: (scan: XrayHistoryItem) => void;
	deletingScanId: string | null;
	deleteFailure: string | null;
	onRetry: () => void;
}
