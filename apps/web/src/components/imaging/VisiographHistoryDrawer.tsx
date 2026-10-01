/**
 * VisiographHistoryDrawer.tsx
 *
 * Patient scan history list drawer with preview thumbnails, date, summary,
 * deletion action with loading state, and 4-phase state rendering (Loading / Error / Empty / Ready).
 */

import {
	AlertTriangle,
	ChevronDown,
	History,
	Loader2,
	ScanLine,
	Trash2,
	ZoomIn,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
	panelStateText,
	type PanelPhaseOrReady,
	type PanelSubject,
} from "../../lib/panelStateText";
import { PanelLoadFailure } from "../PanelLoadFailure";

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
	emptyHint:
		"Перетащите первый прицельный снимок в поле выше — он попадёт в карту вместе с разбором ИИ.",
	failureConsequence:
		"Не считайте, что снимков нет: архив не прочитан. Прошлые снимки могли быть загружены на другом рабочем месте.",
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

export function VisiographHistoryDrawer({
	scanHistory,
	isLoadingHistory,
	historyFailure,
	historyPhase,
	effectivePatientId,
	onLoadHistoryScan,
	onDeleteScan,
	deletingScanId,
	deleteFailure,
	onRetry,
}: VisiographHistoryDrawerProps) {
	const [historyExpanded, setHistoryExpanded] = useState(false);

	if (!effectivePatientId) return null;

	if (historyPhase === "loading") {
		return (
			<div
				style={{
					marginTop: "16px",
					fontSize: "0.85rem",
					color: "var(--muted)",
					display: "flex",
					alignItems: "center",
					gap: "6px",
				}}
			>
				<Loader2 size={13} className="animate-spin" />
				{panelStateText(SCAN_ARCHIVE_SUBJECT, { phase: "loading" }).title}
			</div>
		);
	}

	if (historyPhase === "failed" && historyFailure) {
		return (
			<div style={{ marginTop: "16px" }}>
				<PanelLoadFailure
					subject={SCAN_ARCHIVE_SUBJECT}
					status={historyFailure.status}
					onRetry={onRetry}
				/>
			</div>
		);
	}

	if (historyPhase === "empty") {
		return (
			<div
				style={{
					marginTop: "16px",
					fontSize: "0.82rem",
					color: "var(--muted)",
				}}
			>
				{panelStateText(SCAN_ARCHIVE_SUBJECT, { phase: "empty" }).title}
			</div>
		);
	}

	if (historyPhase === "ready") {
		return (
			<div style={{ marginTop: "16px" }}>
				<button
					type="button"
					onClick={() => setHistoryExpanded(!historyExpanded)}
					style={{
						display: "flex",
						alignItems: "center",
						gap: "6px",
						background: "none",
						border: "none",
						cursor: "pointer",
						fontSize: "0.85rem",
						color: "var(--muted)",
						padding: "4px 0",
						fontWeight: 500,
					}}
				>
					<History size={14} />
					История снимков ({scanHistory.length})
					<ChevronDown
						size={13}
						style={{
							transform: historyExpanded ? "rotate(180deg)" : "none",
							transition: "transform 0.2s",
						}}
					/>
				</button>
				{historyExpanded && (
					<div
						style={{
							marginTop: "8px",
							display: "flex",
							flexDirection: "column",
							gap: "6px",
							maxHeight: "240px",
							overflowY: "auto",
							paddingRight: "4px",
						}}
					>
						{deleteFailure && (
							<div
								role="alert"
								data-testid="xray-scan-delete-failure"
								style={{
									padding: "8px 12px",
									background: "var(--warn-bg)",
									color: "var(--warn-fg)",
									borderRadius: "8px",
									fontSize: "0.82rem",
									display: "flex",
									gap: "8px",
									alignItems: "flex-start",
								}}
							>
								<AlertTriangle
									size={14}
									style={{ flexShrink: 0, marginTop: "2px" }}
									aria-hidden="true"
								/>
								<span>{deleteFailure}</span>
							</div>
						)}
						{(scanHistory ?? []).map((scan) => (
							<div
								key={scan.id}
								data-testid={`xray-scan-history-row-${scan.id}`}
								style={{
									display: "flex",
									alignItems: "stretch",
									gap: "6px",
								}}
							>
								<button
									type="button"
									onClick={() => onLoadHistoryScan(scan)}
									data-testid={`xray-scan-open-${scan.id}`}
									style={{
										flex: 1,
										display: "flex",
										alignItems: "center",
										gap: "10px",
										padding: "10px 12px",
										borderRadius: "8px",
										border: "1px solid var(--line)",
										background: "var(--paper-soft)",
										cursor: "pointer",
										textAlign: "left",
										transition: "all 0.15s",
										minWidth: 0,
									}}
								>
									<div
										style={{
											width: "36px",
											height: "36px",
											borderRadius: "6px",
											background: "var(--paper)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											border: "1px solid var(--line)",
											flexShrink: 0,
										}}
									>
										<ScanLine size={16} style={{ color: "var(--teal)" }} />
									</div>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											className="truncate min-w-0"
											style={{
												fontWeight: 600,
												fontSize: "0.85rem",
												color: "var(--ink)",
											}}
											title={scan.originalFilename ?? "Снимок"}
										>
											{scan.originalFilename ?? "Снимок"}
										</div>
										<div
											className="truncate min-w-0"
											style={{
												fontSize: "0.78rem",
												color: "var(--muted)",
												marginTop: "2px",
											}}
										>
											{new Date(scan.capturedAt).toLocaleDateString("ru-RU")} ·{" "}
											{scan?.aiToothStates ? Object.keys(scan.aiToothStates).length : 0} зубов
											{scan.aiSummary && (
												<span title={scan.aiSummary}> · {scan.aiSummary.substring(0, 60)}…</span>
											)}
										</div>
									</div>
									<ZoomIn size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
								</button>
								<button
									type="button"
									data-testid={`xray-scan-delete-${scan.id}`}
									aria-label={`Удалить снимок ${scan.originalFilename ?? scan.id}`}
									title="Удалить из архива"
									disabled={deletingScanId === scan.id}
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										onDeleteScan(scan);
									}}
									style={{
										width: "32px",
										height: "32px",
										minHeight: "32px",
										flexShrink: 0,
										borderRadius: "6px",
										border: "1px solid var(--line)",
										background: "var(--paper)",
										color:
											deletingScanId === scan.id
												? "var(--muted)"
												: "var(--rust, #c62828)",
										cursor: deletingScanId === scan.id ? "wait" : "pointer",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									{deletingScanId === scan.id ? (
										<Loader2 size={14} className="animate-spin" aria-hidden="true" />
									) : (
										<Trash2 size={14} aria-hidden="true" />
									)}
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		);
	}

	return null;
}
