import React from "react";
import { Printer, X } from "lucide-react";
import type { TableTentFormat } from "./botConfigTypes";
import { BotTableTentPreview } from "./BotTableTentPreview";

interface BotTableTentModalProps {
	isOpen: boolean;
	format: TableTentFormat;
	patientBotLink: string;
	botUsername: string;
	onClose: () => void;
	onFormatChange: (fmt: TableTentFormat) => void;
}

export function BotTableTentModal({
	isOpen,
	format,
	patientBotLink,
	botUsername,
	onClose,
	onFormatChange,
}: BotTableTentModalProps) {
	if (!isOpen) return null;

	return (
		<div className="bot-modal-overlay" role="dialog" aria-modal="true" aria-label="Печать тейбл-тента">
			<div className="bot-modal-backdrop" onClick={onClose} aria-hidden="true" />
			<div
				className="bot-modal-container tg-table-tent-sheet"
				style={{ maxWidth: "560px", padding: "24px", position: "relative" }}
			>
				{/* Mobile Drag Handle for Apple HIG Bottom Sheet */}
				<div className="tg-sheet-drag-handle" aria-hidden="true" />

				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<Printer size={20} color="var(--teal)" />
						<h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Печать тейбл-тента на ресепшен</h3>
					</div>
					<button
						type="button"
						className="bot-modal-close-btn"
						onClick={onClose}
						aria-label="Закрыть"
						style={{ minWidth: "44px", minHeight: "44px" }}
					>
						<X size={18} />
					</button>
				</div>

				<div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
					<button
						type="button"
						className={`tg-hub-tab-btn ${format === "a5" ? "active" : ""}`}
						style={{ minHeight: "44px", padding: "8px 16px", fontSize: "13px" }}
						onClick={() => onFormatChange("a5")}
					>
						Формат А5 (148 × 210 мм)
					</button>
					<button
						type="button"
						className={`tg-hub-tab-btn ${format === "a6" ? "active" : ""}`}
						style={{ minHeight: "44px", padding: "8px 16px", fontSize: "13px" }}
						onClick={() => onFormatChange("a6")}
					>
						Формат А6 (105 × 148 мм)
					</button>
				</div>

				<BotTableTentPreview format={format} patientBotLink={patientBotLink} botUsername={botUsername} />

				<div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
					<button
						type="button"
						className="secondary-button"
						style={{ minHeight: "44px", padding: "8px 16px" }}
						onClick={onClose}
					>
						Отмена
					</button>
					<button
						type="button"
						className="primary-button"
						style={{ minHeight: "44px", padding: "8px 18px" }}
						onClick={() => window.print()}
					>
						<Printer size={15} />
						<span>Отправить на печать</span>
					</button>
				</div>
			</div>
		</div>
	);
}
