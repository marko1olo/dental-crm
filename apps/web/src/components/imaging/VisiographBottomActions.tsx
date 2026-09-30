import { Loader2, Trash2, UploadCloud } from "lucide-react";
import React from "react";
import type { XrayScan } from "./VisiographScanHelpers";

export interface VisiographBottomActionsProps {
	readonly isHistoryView: boolean;
	readonly currentScan: XrayScan | null;
	readonly deletingScanId: string | null;
	readonly onClear: () => void;
	readonly onDeleteScan: (scan: XrayScan) => void;
}

export function VisiographBottomActions({
	isHistoryView,
	currentScan,
	deletingScanId,
	onClear,
	onDeleteScan,
}: VisiographBottomActionsProps) {
	return (
		<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
			<button
				type="button"
				onClick={onClear}
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					justifyContent: "center",
					padding: "9px 20px",
					borderRadius: "8px",
					cursor: "pointer",
					fontSize: "0.88rem",
					background: "transparent",
					border: "1px solid var(--line)",
					color: "var(--muted)",
				}}
			>
				<UploadCloud size={14} /> Загрузить другой снимок
			</button>
			{isHistoryView && currentScan && (
				<button
					type="button"
					data-testid="xray-scan-delete-current"
					aria-label="Удалить открытый снимок из архива"
					disabled={deletingScanId === currentScan.id}
					onClick={() => onDeleteScan(currentScan)}
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						justifyContent: "center",
						padding: "9px 20px",
						borderRadius: "8px",
						fontSize: "0.88rem",
						background: "transparent",
						border: "1px solid var(--rust, #c62828)",
						color: "var(--rust, #c62828)",
						cursor: deletingScanId === currentScan.id ? "wait" : "pointer",
						opacity: deletingScanId === currentScan.id ? 0.7 : 1,
					}}
				>
					{deletingScanId === currentScan.id ? (
						<Loader2 size={14} className="animate-spin" aria-hidden="true" />
					) : (
						<Trash2 size={14} aria-hidden="true" />
					)}
					Удалить из архива
				</button>
			)}
		</div>
	);
}
