import type { Dispatch, SetStateAction } from 'react';
import type { AnestheticDrugId, InjectionTechniqueId } from '../anesthesiaCatalog';
import {
	resolveClinicalDefaultWeightKg,
	type AnesthesiaCalculationResult,
	type AsaPhysicalStatus,
} from '../anesthesiaEngine';
import { dispatchAnesthesiaPreset } from './anesthesiaPresetDispatcher';

export interface UseAnesthesiaTargetedPresetsProps {
	disabled: boolean;
	patientId?: string | undefined;
	visitId?: string | undefined;
	patientWeightKg: number;
	patientAgeYears: number;
	asaStatus: AsaPhysicalStatus;
	isCardioRisk: boolean;
	hasCardiovascularRisk?: boolean;
	hasSulfiteAllergy?: boolean;
	hasBronchialAsthma?: boolean;
	isPregnantOrLactating?: boolean;
	targetToothNumberFdi?: number | string | undefined;
	setSelectedDrugId: Dispatch<SetStateAction<AnestheticDrugId>>;
	setTechniqueId: Dispatch<SetStateAction<InjectionTechniqueId>>;
	showQuickToast: (msg: string, durationMs?: number) => void;
	onApplyAnesthesia?: ((diaryEntry: string, result: AnesthesiaCalculationResult) => void) | undefined;
}

export function useAnesthesiaTargetedPresets(props: UseAnesthesiaTargetedPresetsProps) {
	const effectiveWeight = resolveClinicalDefaultWeightKg(
		props.patientWeightKg,
		props.patientAgeYears,
		props.patientAgeYears < 18,
	);

	const applyPreset = (drugId: AnestheticDrugId, asaStatus: AsaPhysicalStatus, isCardio: boolean, diary: string, toast: string) => {
		if (props.disabled) return;
		props.setSelectedDrugId(drugId);
		props.setTechniqueId('infiltration');
		dispatchAnesthesiaPreset({
			...props,
			effectiveWeight,
			drugId,
			techniqueId: 'infiltration',
			needleType: 'g30_short_21mm',
			asaStatus,
			isCardioRisk: isCardio,
			hasCardiovascularRisk: isCardio,
			diaryText: diary,
			toastText: toast,
		});
	};

	return {
		handleApplyScandonestCardio: () => applyPreset(
			'mepivacaine_plain', 'asa_2', true,
			'Анестезия инфильтрационная: Мепивакаин 3% (без адреналина), 1.7 мл. Осложнений нет.',
			'Кардио: Скандонест 3% без адреналина (1.7 мл) внесено в карту'
		),
		handleApplySeptanestInfiltration: () => applyPreset(
			'septanest_1_100k', 'asa_1', false,
			'Анестезия инфильтрационная: Артикаин 1:100 000, 1.7 мл. Осложнений нет.',
			'Инфильтрационная анестезия Септанест (1.7 мл): внесено в карту'
		),
		handleApplyUbistesinForte: () => applyPreset(
			'articaine_1_100k', 'asa_1', false,
			'Анестезия инфильтрационная: Артикаин 1:100 000, 1.7 мл. Осложнений нет.',
			'Ультракаин Д-С Форте 1:100 000 (1.7 мл): внесено в карту'
		),
		handleApplyUbistesin: () => applyPreset(
			'articaine_1_200k', 'asa_1', false,
			'Анестезия инфильтрационная: Артикаин 1:200 000, 1.7 мл. Осложнений нет.',
			'Ультракаин Д-С 1:200 000 (1.7 мл): внесено в карту'
		),
		handleApplySeptanest200k: () => applyPreset(
			'articaine_1_200k', 'asa_1', false,
			'Анестезия инфильтрационная: Артикаин 1:200 000, 1.7 мл. Осложнений нет.',
			'Септанест 1:200 000 (1.7 мл): внесено в карту'
		),
	};
}
