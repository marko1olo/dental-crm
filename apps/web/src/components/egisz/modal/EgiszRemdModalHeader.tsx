/**
 * EgiszRemdModalHeader.tsx — Statutory modal header & document type switcher.
 * Mandate 8b compliant (<= 120 lines). Apple HIG touch-friendly.
 */

import React from "react";
import { ShieldCheck, X } from "lucide-react";
import type { EgiszDentalSemdCode } from "../egiszRemdEngine";
import type { EgiszHubActiveDocType, EgiszHubModalTab } from "./modalTypes";

export interface EgiszRemdModalHeaderProps {
	activeDocType: EgiszHubActiveDocType;
	semdDocCode: EgiszDentalSemdCode;
	onSelectDocType: (type: EgiszHubActiveDocType, semdCode?: EgiszDentalSemdCode, tab?: EgiszHubModalTab) => void;
	onClose: () => void;
}

export const EgiszRemdModalHeader: React.FC<EgiszRemdModalHeaderProps> = ({
	activeDocType,
	semdDocCode,
	onSelectDocType,
	onClose,
}) => {
	return (
		<header className="egisz-modal-header">
			<div className="egisz-mobile-drag-handle" aria-hidden="true" />
			<div className="egisz-header-left">
				<div className="egisz-header-icon-badge teal">
					<ShieldCheck size={24} />
				</div>
				<div className="egisz-header-title-group">
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
						<h2 className="egisz-modal-title" style={{ fontSize: "1.05rem", margin: 0 }}>
							Государственная отчётность и справки
						</h2>
						<span className="egisz-moh-badge egisz-badge-teal" style={{ fontSize: "0.7rem", padding: "0.12rem 0.4rem", borderRadius: "4px", fontWeight: 700, whiteSpace: "nowrap" }}>
							Минздрав РФ
						</span>
					</div>
					<div className="egisz-modal-subtitle" style={{ fontSize: "0.75rem", margin: 0 }}>
						Электронные медицинские карты и справки на налоговый вычет
					</div>
				</div>
			</div>

			<div className="egisz-header-right">
				<div className="egisz-doc-filter-toolbar" role="toolbar" aria-label="Фильтр видов документов">
					<button
						type="button"
						data-testid="doc-type-btn-302"
						className={`egisz-doc-filter-btn ${activeDocType === "cda_semd" && semdDocCode === "302" ? "active" : ""}`}
						onClick={() => onSelectDocType("cda_semd", "302", "clinical")}
					>
						Консультация
					</button>
					<button
						type="button"
						data-testid="doc-type-btn-303"
						className={`egisz-doc-filter-btn ${activeDocType === "cda_semd" && semdDocCode === "303" ? "active" : ""}`}
						onClick={() => onSelectDocType("cda_semd", "303", "clinical")}
					>
						Вмешательство
					</button>
					<button
						type="button"
						className={`egisz-doc-filter-btn ${activeDocType === "cda_semd" && semdDocCode === "105" ? "active" : ""}`}
						onClick={() => onSelectDocType("cda_semd", "105", "clinical")}
					>
						Медкарта
					</button>
					<button
						type="button"
						className={`egisz-doc-filter-btn ${activeDocType === "fns_tax" ? "active" : ""}`}
						onClick={() => onSelectDocType("fns_tax", undefined, "tax_deduction")}
					>
						Справка для налогового вычета
					</button>
				</div>

				<button
					type="button"
					className="egisz-close-btn egisz-close-icon-btn"
					onClick={onClose}
					aria-label="Закрыть модальное окно"
				>
					<X size={20} />
				</button>
			</div>
		</header>
	);
};
