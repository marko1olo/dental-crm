import React, { useState } from 'react';
import { Syringe, ShieldAlert, CheckCircle2, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { AnestheticDrugId, DENTAL_ANESTHETICS, InjectionTechniqueId } from './anesthesiaCatalog';
import { calculateAnesthesiaSafety, AnesthesiaCalculationResult, AsaPhysicalStatus } from './anesthesiaEngine';
import { AnesthesiaProtocolModal } from './AnesthesiaProtocolModal';

export interface AnesthesiaQuickPreset {
	id: string;
	labelRu: string;
	subLabelRu: string;
	drugId: AnestheticDrugId;
	carpulesCount: number;
	techniqueId: InjectionTechniqueId;
	badgeType: 'default' | 'strong' | 'safe_cardio';
}

export const STANDARD_QUICK_PRESETS: AnesthesiaQuickPreset[] = [
	{
		id: 'preset_ultracain_std',
		labelRu: 'Ультракаин Д-С',
		subLabelRu: '1 карп (1.7 мл) • 1:200к',
		drugId: 'articaine_1_200k',
		carpulesCount: 1.0,
		techniqueId: 'infiltration',
		badgeType: 'default'
	},
	{
		id: 'preset_ultracain_forte',
		labelRu: 'Ультракаин Форте',
		subLabelRu: '1 карп (1.7 мл) • 1:100к',
		drugId: 'articaine_1_100k',
		carpulesCount: 1.0,
		techniqueId: 'mandibular_torus',
		badgeType: 'strong'
	},
	{
		id: 'preset_scandonest_cardio',
		labelRu: 'Скандонест 3%',
		subLabelRu: '1 карп (1.7 мл) • Без адреналина',
		drugId: 'mepivacaine_plain',
		carpulesCount: 1.0,
		techniqueId: 'infiltration',
		badgeType: 'safe_cardio'
	},
	{
		id: 'preset_ultracain_2carp',
		labelRu: 'Ультракаин 2 карп',
		subLabelRu: '3.4 мл • Проводниковая',
		drugId: 'articaine_1_200k',
		carpulesCount: 2.0,
		techniqueId: 'mandibular_torus',
		badgeType: 'default'
	}
];

export interface AnesthesiaQuickBarProps {
	patientWeightKg?: number | undefined;
	patientAgeYears?: number | undefined;
	hasCardiovascularRisk?: boolean | undefined;
	hasSulfiteAllergy?: boolean | undefined;
	hasBronchialAsthma?: boolean | undefined;
	isPregnantOrLactating?: boolean | undefined;
	targetToothNumberFdi?: number | string | undefined;
	onApplyAnesthesia: (diaryText: string, result: AnesthesiaCalculationResult) => void;
	disabled?: boolean | undefined;
}

export function AnesthesiaQuickBar({
	patientWeightKg = 70,
	patientAgeYears = 35,
	hasCardiovascularRisk = false,
	hasSulfiteAllergy = false,
	hasBronchialAsthma = false,
	isPregnantOrLactating = false,
	targetToothNumberFdi,
	onApplyAnesthesia,
	disabled = false
}: AnesthesiaQuickBarProps) {
	const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
	const [activeToastMessage, setActiveToastMessage] = useState<string | null>(null);
	const [safetyWarning, setSafetyWarning] = useState<{ title: string; text: string } | null>(null);

	const handleFastClick = (preset: AnesthesiaQuickPreset) => {
		if (disabled) return;

		const asaStatus: AsaPhysicalStatus = hasCardiovascularRisk ? 'asa_3' : 'asa_1';

		const result = calculateAnesthesiaSafety({
			drugId: preset.drugId,
			carpulesCount: preset.carpulesCount,
			patientWeightKg,
			patientAgeYears,
			asaStatus,
			hasCardiovascularRisk,
			hasSulfiteAllergy,
			hasBronchialAsthma,
			isPregnantOrLactating,
			techniqueId: preset.techniqueId,
			needleType: 'g30_short_21mm',
			targetToothNumberFdi,
			aspirationNegativeConfirmed: true
		});

		// If dangerous contraindications triggered, block instant apply and show alert
		if (result.contraindicationsTriggered.length > 0 || result.isOverdose || result.isEpinephrineOverdose) {
			setSafetyWarning({
				title: 'Соматический риск / Превышение дозы',
				text: result.contraindicationsTriggered[0] || result.warnings[0] || 'Обнаружен риск при введении препарата'
			});
			return;
		}

		// 1-Click instant success
		onApplyAnesthesia(result.diaryEntryRu, result);
		setActiveToastMessage(`Зафиксировано: ${preset.labelRu} (${preset.carpulesCount * 1.7} мл)`);
		setTimeout(() => setActiveToastMessage(null), 3000);
	};

	return (
		<div className="anesthesia-quick-bar">
			<div className="anesthesia-quick-bar-header">
				<div className="anesthesia-quick-bar-title">
					<Syringe size={16} className="anesthesia-icon-accent" />
					<span>Быстрая анестезия (1 клик):</span>
					{hasCardiovascularRisk && (
						<span className="anesthesia-cardio-tag">
							<ShieldAlert size={12} /> ССЗ: Скандонест
						</span>
					)}
					{hasSulfiteAllergy && (
						<span className="anesthesia-allergy-tag">
							<AlertTriangle size={12} /> Аллергия на сульфиты
						</span>
					)}
				</div>

				<button
					type="button"
					className="anesthesia-btn-customize"
					onClick={() => setIsCustomModalOpen(true)}
					title="Открыть детальный расчет МДД и выбор иглы"
					aria-label="Настроить анестезию"
				>
					<SlidersHorizontal size={14} />
					<span>Настроить...</span>
				</button>
			</div>

			{/* 1-Click Quick Preset Buttons */}
			<div className="anesthesia-quick-presets-grid">
				{STANDARD_QUICK_PRESETS.map((preset) => {
					const isCardioRecommended = hasCardiovascularRisk && preset.drugId === 'mepivacaine_plain';
					const isCardioRisky = hasCardiovascularRisk && preset.drugId === 'articaine_1_100k';

					return (
						<button
							key={preset.id}
							type="button"
							disabled={disabled}
							onClick={() => handleFastClick(preset)}
							className={`anesthesia-quick-btn ${preset.badgeType} ${isCardioRecommended ? 'recommended' : ''} ${isCardioRisky ? 'risky' : ''}`}
						>
							<span className="quick-btn-main">{preset.labelRu}</span>
							<span className="quick-btn-sub">{preset.subLabelRu}</span>
						</button>
					);
				})}
			</div>

			{/* Feedback Toast */}
			{activeToastMessage && (
				<div className="anesthesia-quick-toast" role="status">
					<CheckCircle2 size={16} />
					<span>{activeToastMessage}</span>
				</div>
			)}

			{/* Safety Alert Stopper */}
			{safetyWarning && (
				<div className="anesthesia-safety-stopper-alert">
					<div className="stopper-alert-content">
						<ShieldAlert size={20} className="stopper-icon" />
						<div>
							<div className="stopper-title">{safetyWarning.title}</div>
							<div className="stopper-text">{safetyWarning.text}</div>
						</div>
					</div>
					<div className="stopper-actions">
						<button
							type="button"
							className="stopper-btn-switch"
							onClick={() => {
								setSafetyWarning(null);
								const scandonestPreset = STANDARD_QUICK_PRESETS.find((p) => p.drugId === 'mepivacaine_plain');
								if (scandonestPreset) {
									handleFastClick(scandonestPreset);
								}
							}}
						>
							Ввести Скандонест (безопасно)
						</button>
						<button
							type="button"
							className="stopper-btn-dismiss"
							onClick={() => setSafetyWarning(null)}
						>
							Закрыть
						</button>
					</div>
				</div>
			)}

			{/* Full Modal fallback for rare custom cases */}
			{isCustomModalOpen && (
				<AnesthesiaProtocolModal
					isOpen={isCustomModalOpen}
					onClose={() => setIsCustomModalOpen(false)}
					initialPatientWeightKg={patientWeightKg}
					initialPatientAgeYears={patientAgeYears}
					initialHasCardioRisk={hasCardiovascularRisk}
					initialToothNumber={targetToothNumberFdi}
					onApplyToDiary={(diaryText, result) => {
						onApplyAnesthesia(diaryText, result);
						setIsCustomModalOpen(false);
					}}
				/>
			)}
		</div>
	);
}
