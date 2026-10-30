import { Sparkles, Upload, X } from "lucide-react";
import React from "react";

export interface PricelistImportModalHeaderProps {
	readonly hasIngestedItems: boolean;
	readonly importMode: "smart_text" | "csv";
	readonly onSetImportMode: (mode: "smart_text" | "csv") => void;
	readonly onBack: () => void;
	readonly onClose: () => void;
}

export const PricelistImportModalHeader: React.FC<
	PricelistImportModalHeaderProps
> = ({ hasIngestedItems, importMode, onSetImportMode, onBack, onClose }) => {
	return (
		<header className="pricelist-modal-header">
			<div
				className="pricelist-header-left"
				style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
			>
				<div className="pricelist-header-title">
					{hasIngestedItems
						? "Сопоставление прейскуранта с каталогом"
						: "Импорт прейскуранта клиники"}
				</div>
				{!hasIngestedItems ? (
					<div
						className="pricelist-tier-segmented"
						style={{ display: "inline-flex", padding: "2px" }}
					>
						<button
							type="button"
							className={`tier-segment-btn ${importMode === "smart_text" ? "active" : ""}`}
							style={{
								minHeight: "32px",
								height: "32px",
								fontSize: "0.75rem",
								gap: "0.25rem",
							}}
							onClick={() => onSetImportMode("smart_text")}
						>
							<Sparkles size={12} />
							<span>Умный текст</span>
						</button>
						<button
							type="button"
							className={`tier-segment-btn ${importMode === "csv" ? "active" : ""}`}
							style={{
								minHeight: "32px",
								height: "32px",
								fontSize: "0.75rem",
								gap: "0.25rem",
							}}
							onClick={() => onSetImportMode("csv")}
						>
							<Upload size={12} />
							<span>Файл CSV / Excel</span>
						</button>
					</div>
				) : (
					<button
						type="button"
						className="pricelist-btn"
						style={{
							height: "32px",
							fontSize: "0.75rem",
							padding: "0 0.75rem",
						}}
						onClick={onBack}
					>
						Назад
					</button>
				)}
			</div>

			<button
				type="button"
				className="pricelist-btn pricelist-btn-icon"
				onClick={onClose}
				aria-label="Закрыть"
			>
				<X size={18} />
			</button>
		</header>
	);
};
