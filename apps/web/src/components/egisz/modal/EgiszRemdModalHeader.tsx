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
			<div className="egisz-header-top-row">
				<div className="egisz-header-left">
					<div className="egisz-header-icon-badge teal">
						<ShieldCheck size={24} />
					</div>
					<div className="egisz-header-title-group">
						<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
							<h2 className="egisz-modal-title" style={{ fontSize: "1.05rem", margin: 0 }}>
								<span className="hidden sm:inline">Государственная отчётность и справки</span>
								<span className="sm:hidden">Отчётность РЭМД</span>
							</h2>
							<span className="egisz-moh-badge egisz-badge-teal" style={{ fontSize: "0.7rem", padding: "0.12rem 0.4rem", borderRadius: "4px", fontWeight: 700, whiteSpace: "nowrap" }}>
								Минздрав РФ
							</span>
						</div>
						<div className="egisz-modal-subtitle" style={{ fontSize: "0.75rem", margin: 0 }}>
							<span className="hidden sm:inline">Электронные медицинские карты и справки на налоговый вычет</span>
							<span className="sm:hidden">ЭМК, РЭМД и справки на вычет</span>
						</div>
					</div>
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

			<div className="egisz-header-toolbar-row">
				<div className="egisz-doc-filter-toolbar" role="toolbar" aria-label="Фильтр видов документов">
					<button
						type="button"
						data-testid="doc-type-btn-302"
						className={`egisz-doc-filter-btn ${activeDocType === "cda_semd" && semdDocCode === "302" ? "active" : ""}`}
						onClick={() => onSelectDocType("cda_semd", "302", "clinical")}
					>
						<span className="hidden sm:inline">Консультация</span>
						<span className="sm:hidden">Осмотр</span>
					</button>
					<button
						type="button"
						data-testid="doc-type-btn-303"
						className={`egisz-doc-filter-btn ${activeDocType === "cda_semd" && semdDocCode === "303" ? "active" : ""}`}
						onClick={() => onSelectDocType("cda_semd", "303", "clinical")}
					>
						<span className="hidden sm:inline">Вмешательство</span>
						<span className="sm:hidden">Лечение</span>
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
						<span className="hidden sm:inline">Справка для налогового вычета</span>
						<span className="sm:hidden">Вычет</span>
					</button>
				</div>
			</div>
		</header>
	);
};
