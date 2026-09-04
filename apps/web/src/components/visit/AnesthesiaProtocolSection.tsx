import React, { useState } from "react";
import { Syringe, ChevronDown } from "lucide-react";
import {
	AnesthesiaQuickBar,
	type AnesthesiaQuickBarProps,
} from "../anesthesia/AnesthesiaQuickBar";
import {
	resolveClinicalDefaultWeightKg,
	type AnestheticDrugId,
	type AnesthesiaCalculationResult,
} from "../anesthesia";

export interface AnesthesiaProtocolSectionProps extends AnesthesiaQuickBarProps {
	/** Заголовок аккордеона/секции протокола анестезии */
	title?: string | undefined;
	/** Развернут ли блок по умолчанию (true = развернут, false = аккордеон свернут) */
	initiallyExpanded?: boolean | undefined;
}

/**
 * AnesthesiaProtocolSection — модульная секция протокола местной анестезии для рабочего места врача.
 * 
 * В соответствии с Мандатом 8e (Автономия врача):
 * - Если масса тела пациента не заполнена в карте, автоматически применяется клинический дефолт (70 кг для взрослых)
 *   без блокировок, модальных препятствий и раздражающих алертов.
 * - Прямой доступ к 1-клик введению карпулы Артикаина 1:100 000 (1.7 мл) с автоматическим расчетом % от МРД.
 * - Отображение зеленого бейджа безопасности (% от МРД).
 */
export const AnesthesiaProtocolSection: React.FC<AnesthesiaProtocolSectionProps> = ({
	patientWeightKg: rawWeight,
	patientAgeYears = 35,
	hasCardiovascularRisk = false,
	hasSulfiteAllergy = false,
	hasBronchialAsthma = false,
	isPregnantOrLactating = false,
	targetToothNumberFdi,
	onApplyAnesthesia,
	onDisposalCarpules,
	onOpenEmergencyProtocol,
	onOpenAspirationJournal,
	disabled = false,
	title = "Местная анестезия (быстрый выбор препарата и расчет МРД)",
	initiallyExpanded = true,
}) => {
	const [isOpen, setIsOpen] = useState(initiallyExpanded);

	// Автоматический безопасный дефолт веса (Мандат 8e)
	const effectiveWeight = resolveClinicalDefaultWeightKg(
		rawWeight,
		patientAgeYears,
		patientAgeYears < 18,
	);

	return (
		<div
			className="anesthesia-protocol-section rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden shadow-xs transition-all"
			data-testid="anesthesia-protocol-section"
		>
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="w-full px-3.5 py-2.5 flex items-center justify-between text-left select-none bg-[var(--paper)] hover:bg-[var(--paper-soft)] border-b border-[var(--line)] cursor-pointer transition-colors"
				aria-expanded={isOpen}
			>
				<div className="flex items-center gap-2 min-w-0">
					<Syringe className="w-4 h-4 text-[var(--teal)] shrink-0" />
					<span className="font-bold text-xs sm:text-sm text-[var(--ink)] truncate">
						{title}
					</span>
					<span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--teal-surface)] text-[var(--teal)] font-medium border border-[var(--teal)]/20 shrink-0">
						Вес: {effectiveWeight} кг
					</span>
				</div>
				<ChevronDown
					className={`w-4 h-4 text-[var(--muted)] transition-transform duration-200 shrink-0 ${
						isOpen ? "rotate-180" : ""
					}`}
				/>
			</button>

			{isOpen && (
				<div className="p-3">
					<AnesthesiaQuickBar
						patientWeightKg={effectiveWeight}
						patientAgeYears={patientAgeYears}
						hasCardiovascularRisk={hasCardiovascularRisk}
						hasSulfiteAllergy={hasSulfiteAllergy}
						hasBronchialAsthma={hasBronchialAsthma}
						isPregnantOrLactating={isPregnantOrLactating}
						targetToothNumberFdi={targetToothNumberFdi}
						onApplyAnesthesia={onApplyAnesthesia}
						onDisposalCarpules={onDisposalCarpules}
						onOpenEmergencyProtocol={onOpenEmergencyProtocol}
						onOpenAspirationJournal={onOpenAspirationJournal}
						disabled={disabled}
					/>
				</div>
			)}
		</div>
	);
};

export type { AnestheticDrugId, AnesthesiaCalculationResult };
