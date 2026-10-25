/**
 * HistoryStatePlaceholders.tsx — Заглушки состояний загрузки, сбоя и отсутствия снимков (Мандат 8b <= 120 строк).
 */

import React from "react";
import { Loader2 } from "lucide-react";
import { panelStateText, type PanelPhaseOrReady } from "../../../lib/panelStateText";
import { PanelLoadFailure } from "../../PanelLoadFailure";
import { SCAN_ARCHIVE_SUBJECT } from "./types";

interface Props {
	historyPhase: PanelPhaseOrReady;
	historyFailure: { status: number | null } | null;
	onRetry: () => void;
}

export const HistoryStatePlaceholders: React.FC<Props> = ({
	historyPhase,
	historyFailure,
	onRetry,
}) => {
	if (historyPhase === "loading") {
		return (
			<div style={{ marginTop: "16px", fontSize: "0.85rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}>
				<Loader2 size={13} className="animate-spin" />
				{panelStateText(SCAN_ARCHIVE_SUBJECT, { phase: "loading" }).title}
			</div>
		);
	}

	if (historyPhase === "failed" && historyFailure) {
		return (
			<div style={{ marginTop: "16px" }}>
				<PanelLoadFailure subject={SCAN_ARCHIVE_SUBJECT} status={historyFailure.status} onRetry={onRetry} />
			</div>
		);
	}

	if (historyPhase === "empty") {
		return (
			<div style={{ marginTop: "16px", fontSize: "0.82rem", color: "var(--muted)" }}>
				{panelStateText(SCAN_ARCHIVE_SUBJECT, { phase: "empty" }).title}
			</div>
		);
	}

	return null;
};
