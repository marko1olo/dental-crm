import type React from "react";
// generateTherapySoapProtocol обеспечивает сборку протокола терапии для кнопки "Внести в дневник"
export { generateTherapySoapProtocol } from "@dental/shared";
import { useVisitTherapyState } from "./modules/useVisitTherapyState";
import { TherapyWidgetHeader } from "./modules/TherapyWidgetHeader";
import { TherapyPresetSelector } from "./modules/TherapyPresetSelector";
import { TherapySurfaceSelector } from "./modules/TherapySurfaceSelector";
import { TherapyDetailsAccordion } from "./modules/TherapyDetailsAccordion";
import { TherapyFooterActions } from "./modules/TherapyFooterActions";

export interface VisitTherapyProtocolWidgetProps {
	/** Активный номер зуба по FDI (по умолчанию 16) */
	readonly activeTooth?: number | null;
	/** Выбранные поверхности зуба */
	readonly activeSurfaces?: readonly string[] | undefined;
	/** Обработчик смены поверхностей */
	readonly onSelectSurfaces?: (surfaces: readonly string[]) => void;
	/** Обработчик прямой вставки текста протокола в дневник визита */
	readonly onApplyProtocolText?: (text: string) => void;
	/** Обработчик добавления услуг в смету/наряд */
	readonly onAddToInvoice?: (services: readonly { code: string; nameRu: string }[]) => void;
	/** Дополнительный CSS-класс контейнера */
	readonly className?: string;
}

export const VisitTherapyProtocolWidget: React.FC<VisitTherapyProtocolWidgetProps> = ({
	activeTooth = 16, activeSurfaces, onSelectSurfaces, onApplyProtocolText, onAddToInvoice, className = "",
}) => {
	const s = useVisitTherapyState({
		activeTooth, activeSurfaces, onSelectSurfaces, onApplyProtocolText, onAddToInvoice,
	});

	return (
		<section
			aria-label="Терапевтический протокол лечения зуба"
			className={`rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] text-[var(--ink)] p-4 shadow-sm ${className}`}
		>
			<TherapyWidgetHeader
				effectiveTooth={s.effectiveTooth}
				selectedSurfaces={s.selectedSurfaces}
				blackClass={s.blackClass}
				warranty={s.warranty}
				showDetailsAccordion={s.showDetailsAccordion}
				onToggleDetails={() => s.setShowDetailsAccordion((prev) => !prev)}
			/>
			<TherapyPresetSelector
				activePresetId={s.activePresetId}
				onSelectPreset={s.handleSelectPreset}
			/>
			<TherapySurfaceSelector
				selectedSurfaces={s.selectedSurfaces}
				onApplySurfacePreset={s.handleApplySurfacePreset}
				onToggleSurface={s.toggleSurface}
			/>
			<TherapyDetailsAccordion
				showDetailsAccordion={s.showDetailsAccordion}
				isAnterior={s.isAnterior}
				selectedComposite={s.selectedComposite}
				onSelectComposite={s.setSelectedComposite}
				selectedAdhesive={s.selectedAdhesive}
				onSelectAdhesive={s.setSelectedAdhesive}
				shadeDentin={s.shadeDentin}
				onChangeShadeDentin={s.setShadeDentin}
				shadeEnamel={s.shadeEnamel}
				onChangeShadeEnamel={s.setShadeEnamel}
			/>
			<TherapyFooterActions
				onInsertToClinicalDiary={s.handleInsertToClinicalDiary}
				onAddServicesToInvoice={s.handleAddServicesToInvoice}
				servicesCount={s.services804n.length}
				diagnosisIcd10={s.soapResult.diagnosisIcd10}
				blackClass={s.blackClass}
			/>
		</section>
	);
};

export default VisitTherapyProtocolWidget;
