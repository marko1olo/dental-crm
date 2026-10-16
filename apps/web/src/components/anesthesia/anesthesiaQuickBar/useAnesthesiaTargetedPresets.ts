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

	const handleApplyScandonestCardio = () => {
		if (props.disabled) return;
		props.setSelectedDrugId('mepivacaine_plain');
		props.setTechniqueId('infiltration');
		dispatchAnesthesiaPreset({
			...props,
			effectiveWeight,
			drugId: 'mepivacaine_plain',
			techniqueId: 'infiltration',
			needleType: 'g30_short_21mm',
			asaStatus: 'asa_2',
			isCardioRisk: true,
			hasCardiovascularRisk: true,
			diaryText:
				'Анестезия инфильтрационная: Мепивакаин 3% (без адреналина), 1.7 мл. Осложнений нет.',
			toastText: 'Кардио: Скандонест 3% без адреналина (1.7 мл) внесено в карту',
		});
	};

	const handleApplySeptanestInfiltration = () => {
		if (props.disabled) return;
		props.setSelectedDrugId('septanest_1_100k');
		props.setTechniqueId('infiltration');
		dispatchAnesthesiaPreset({
			...props,
			effectiveWeight,
			drugId: 'septanest_1_100k',
			techniqueId: 'infiltration',
			needleType: 'g30_short_21mm',
			asaStatus: 'asa_1',
			isCardioRisk: false,
			diaryText:
				'Анестезия инфильтрационная: Артикаин 1:100 000, 1.7 мл. Осложнений нет.',
			toastText: 'Инфильтрационная анестезия Септанест (1.7 мл): протокол сформирован',
		});
	};

	const handleApplyUbistesinForte = () => {
		if (props.disabled) return;
		props.setSelectedDrugId('articaine_1_100k');
		props.setTechniqueId('infiltration');
		dispatchAnesthesiaPreset({
			...props,
			effectiveWeight,
			drugId: 'articaine_1_100k',
			techniqueId: 'infiltration',
			needleType: 'g30_short_21mm',
			asaStatus: 'asa_1',
			isCardioRisk: false,
			diaryText:
				'Анестезия инфильтрационная: Артикаин 1:100 000, 1.7 мл. Осложнений нет.',
			toastText: 'Убистезин форте 1:100 000 (1.7 мл): внесено в карту',
		});
	};

	const handleApplyUbistesin = () => {
		if (props.disabled) return;
		props.setSelectedDrugId('articaine_1_200k');
		props.setTechniqueId('infiltration');
		dispatchAnesthesiaPreset({
			...props,
			effectiveWeight,
			drugId: 'articaine_1_200k',
			techniqueId: 'infiltration',
			needleType: 'g30_short_21mm',
			asaStatus: 'asa_1',
			isCardioRisk: false,
			diaryText:
				'Анестезия инфильтрационная: Артикаин 1:200 000, 1.7 мл. Осложнений нет.',
			toastText: 'Убистезин 1:200 000 (1.7 мл): внесено в карту',
		});
	};

	const handleApplySeptanest200k = () => {
		if (props.disabled) return;
		props.setSelectedDrugId('articaine_1_200k');
		props.setTechniqueId('infiltration');
		dispatchAnesthesiaPreset({
			...props,
			effectiveWeight,
			drugId: 'articaine_1_200k',
			techniqueId: 'infiltration',
			needleType: 'g30_short_21mm',
			asaStatus: 'asa_1',
			isCardioRisk: false,
			diaryText:
				'Анестезия инфильтрационная: Артикаин 1:200 000, 1.7 мл. Осложнений нет.',
			toastText: 'Септанест 1:200 000 (1.7 мл): внесено в карту',
		});
	};

	return {
		handleApplyScandonestCardio,
		handleApplySeptanestInfiltration,
		handleApplyUbistesinForte,
		handleApplyUbistesin,
		handleApplySeptanest200k,
	};
}
