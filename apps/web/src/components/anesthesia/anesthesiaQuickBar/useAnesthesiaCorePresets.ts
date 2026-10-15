import type { Dispatch, SetStateAction } from 'react';
import type { AnestheticDrugId, InjectionTechniqueId } from '../anesthesiaCatalog';
import {
	resolveClinicalDefaultWeightKg,
	type AnesthesiaCalculationResult,
	type AsaPhysicalStatus,
} from '../anesthesiaEngine';
import { STANDARD_ANESTHESIA_NORM_PRESET_RU } from '../../../lib/clinicalProtocols043';
import { dispatchAnesthesiaPreset } from './anesthesiaPresetDispatcher';

export interface UseAnesthesiaCorePresetsProps {
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

export function useAnesthesiaCorePresets(props: UseAnesthesiaCorePresetsProps) {
	const effectiveWeight = resolveClinicalDefaultWeightKg(
		props.patientWeightKg,
		props.patientAgeYears,
		props.patientAgeYears < 18,
	);

	const handleApplyStandardNormPreset = () => {
		if (props.disabled) return;
		dispatchAnesthesiaPreset({
			...props,
			effectiveWeight,
			drugId: 'articaine_1_100k',
			techniqueId: 'infiltration',
			needleType: 'g30_short_21mm',
			asaStatus: 'asa_1',
			isCardioRisk: false,
			diaryText: 'Анестезия инфильтрационная/проводниковая: Артикаин 1:100 000, 1.7 мл. Осложнений нет.',
			toastText: 'Анестезия: Артикаин 1:100 000 (1.7 мл) внесена в карту',
		});
	};

	const handleApplyUltracainForteCombined = () => {
		if (props.disabled) return;
		props.setSelectedDrugId('articaine_1_100k');
		props.setTechniqueId('mandibular_torus');
		dispatchAnesthesiaPreset({
			...props,
			effectiveWeight,
			drugId: 'articaine_1_100k',
			techniqueId: 'mandibular_torus',
			needleType: 'g27_long_35mm',
			diaryText:
				'Анестезия проводниковая/инфильтрационная: Артикаин 1:100 000, 1.7 мл. Осложнений нет.',
			toastText: 'Проводниковая Артикаин 1:100 000 (1.7 мл): внесено в карту',
		});
	};

	const handleApplyInfiltrationArticaine200k = () => {
		if (props.disabled) return;
		props.setSelectedDrugId('articaine_1_200k');
		props.setTechniqueId('infiltration');
		dispatchAnesthesiaPreset({
			...props,
			effectiveWeight,
			drugId: 'articaine_1_200k',
			techniqueId: 'infiltration',
			needleType: 'g30_short_21mm',
			diaryText:
				'Анестезия инфильтрационная: Артикаин 1:200 000, 1.7 мл. Осложнений нет.',
			toastText: 'Инфильтрационная Артикаин 1:200 000 (1.7 мл): внесено в карту',
		});
	};

	const handleApplyMandibularArticaine100k = () => {
		if (props.disabled) return;
		props.setSelectedDrugId('articaine_1_100k');
		props.setTechniqueId('mandibular_torus');
		dispatchAnesthesiaPreset({
			...props,
			effectiveWeight,
			drugId: 'articaine_1_100k',
			techniqueId: 'mandibular_torus',
			needleType: 'g27_long_35mm',
			diaryText:
				'Анестезия проводниковая: Артикаин 1:100 000, 1.7 мл. Осложнений нет.',
			toastText: 'Проводниковая Артикаин 1:100 000 (1.7 мл): внесено в карту',
		});
	};

	return {
		handleApplyStandardNormPreset,
		handleApplyUltracainForteCombined,
		handleApplyInfiltrationArticaine200k,
		handleApplyMandibularArticaine100k,
	};
}
