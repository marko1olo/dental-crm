import React from "react";
import { Printer } from "lucide-react";
import type { ProfessionalA4DocumentTab, A4ZoomMode } from "./types";

export interface ProfessionalA4ToolbarProps {
    activeTab: ProfessionalA4DocumentTab;
    onTabChange?: ((tab: ProfessionalA4DocumentTab) => void) | undefined;
    zoom: A4ZoomMode;
    setZoom: (zoom: A4ZoomMode) => void;
    handlePrint: () => void;
    isInformedConsentTab: boolean;
}

export const ProfessionalA4Toolbar: React.FC<ProfessionalA4ToolbarProps> = ({
    activeTab,
    onTabChange,
    zoom,
    setZoom,
    handlePrint,
    isInformedConsentTab
}) => {
    return (
        <div className="pro-a4-toolbar no-print">
				<div className="pro-a4-tab-selector dente-segmented-bar" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "contract"}
						className={`pro-a4-tab-btn ${activeTab === "contract" ? "active" : ""}`}
						onClick={() => onTabChange?.("contract")}
						data-testid="a4-tab-contract"
						title="1. Договор на оказание платных медицинских услуг (ПП РФ № 736) [3 листа]"
					>
						1. Договор (3 л.)
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "act"}
						className={`pro-a4-tab-btn ${activeTab === "act" ? "active" : ""}`}
						onClick={() => onTabChange?.("act")}
						data-testid="a4-tab-act"
						title="2. Акт сдачи-приемки оказанных медицинских услуг (804н) [1 лист]"
					>
						2. Акт (1 л.)
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "treatment_plan"}
						className={`pro-a4-tab-btn ${activeTab === "treatment_plan" ? "active" : ""}`}
						onClick={() => onTabChange?.("treatment_plan")}
						data-testid="a4-tab-treatment-plan"
						title="3. План комплексного лечения и финансовая смета [2 листа]"
					>
						3. План (2 л.)
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={isInformedConsentTab}
						className={`pro-a4-tab-btn ${isInformedConsentTab ? "active" : ""}`}
						onClick={() => onTabChange?.("consent_1051n")}
						data-testid="a4-tab-consent-1051n"
						title="4. Информированное добровольное согласие (Приказ МЗ РФ № 1051н) [2 листа]"
					>
						4. ИДС (2 л.)
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "personal_data"}
						className={`pro-a4-tab-btn ${activeTab === "personal_data" ? "active" : ""}`}
						onClick={() => onTabChange?.("personal_data")}
						data-testid="a4-tab-personal-data"
						title="5. Согласие на обработку персональных данных (152-ФЗ) [1 лист]"
					>
						5. ПДн (1 л.)
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "medical_card"}
						className={`pro-a4-tab-btn ${activeTab === "medical_card" ? "active" : ""}`}
						onClick={() => onTabChange?.("medical_card")}
						data-testid="a4-tab-medical-card"
						title="6. Медицинская карта стоматологического пациента / Дневник [2 листа]"
					>
						6. Медкарта (2 л.)
					</button>
				</div>

				<div className="pro-a4-toolbar-actions">
					{/* Масштабирование: 80%, 100%, По ширине */}
					<div className="pro-a4-zoom-group" role="group" aria-label="Масштаб отображения">
						<button
							type="button"
							className={`pro-a4-zoom-btn ${zoom === "80%" ? "active" : ""}`}
							onClick={() => setZoom("80%")}
							data-testid="zoom-80"
							title="Уменьшить масштаб до 80%"
						>
							80%
						</button>
						<button
							type="button"
							className={`pro-a4-zoom-btn ${zoom === "100%" ? "active" : ""}`}
							onClick={() => setZoom("100%")}
							data-testid="zoom-100"
							title="Масштаб 100%"
						>
							100%
						</button>
						<button
							type="button"
							className={`pro-a4-zoom-btn ${zoom === "fit" ? "active" : ""}`}
							onClick={() => setZoom("fit")}
							data-testid="zoom-fit"
							title="Вписать по ширине окна"
						>
							По ширине
						</button>
					</div>

					<span className="pro-a4-format-badge">Формат A4 · 210 × 297 мм · ГОСТ</span>

					<button
						type="button"
						className="primary-button pro-a4-print-btn"
						onClick={handlePrint}
						data-testid="btn-print-a4-document"
						title="Печать на принтере (Ctrl+P)"
					>
						<Printer size={15} aria-hidden="true" />
						<span>Печать на принтер (A4)</span>
					</button>
				</div>
			</div>
    );
};
