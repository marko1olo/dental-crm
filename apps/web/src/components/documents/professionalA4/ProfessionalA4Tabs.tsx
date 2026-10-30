import React from "react";
import type { ProfessionalA4DocumentTab } from "./types";

export interface ProfessionalA4TabsProps {
	activeTab: ProfessionalA4DocumentTab;
	onTabChange?: ((tab: ProfessionalA4DocumentTab) => void) | undefined;
	isInformedConsentTab: boolean;
}

export function ProfessionalA4Tabs({
	activeTab,
	onTabChange,
	isInformedConsentTab,
}: ProfessionalA4TabsProps): React.JSX.Element {
	return (
		<div className="pro-a4-tab-selector dente-segmented-bar" role="tablist">
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === "contract"}
				className={`pro-a4-tab-btn ${activeTab === "contract" ? "active" : ""}`}
				onClick={() => onTabChange?.("contract")}
				data-testid="a4-tab-contract"
				title="1. Договор на оказание платных медицинских услуг [3 листа]"
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
				title="2. Акт сдачи-приемки оказанных медицинских услуг [1 лист]"
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
				onClick={() => onTabChange?.("informed_consent")}
				data-testid="a4-tab-consent-1051n"
				title="4. Информированное добровольное согласие на лечение [2 листа]"
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
				title="5. Согласие на обработку персональных данных [1 лист]"
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
	);
}
