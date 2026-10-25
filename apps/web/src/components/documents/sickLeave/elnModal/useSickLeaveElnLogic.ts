import { useMemo, useState } from "react";
import {
	generateSickLeaveRegistryEntry,
	generateElnXmlPayload,
	generateElnJsonPayload
} from "../sickLeaveElnEngine";
import { useSickLeaveFormState } from "./useSickLeaveFormState";
import { useSickLeavePresets } from "./useSickLeavePresets";
import { useSickLeaveActions } from "./useSickLeaveActions";
import type { SickLeaveElnModalProps } from "./types";

/**
 * useSickLeaveElnLogic Facade
 * Заседание врачебной комиссии (ВК) - автономия врача
 * В дневник приёма вставлен черновик ЭЛН
 */
export function useSickLeaveElnLogic(props: SickLeaveElnModalProps) {
	const { onClose, onApplyToDiary } = props;
	const formHook = useSickLeaveFormState(props);

	const presetsHook = useSickLeavePresets({
		todayStr: formHook.todayStr,
		formState: formHook.formState,
		setFormState: formHook.setFormState,
		initialDoctorSpecialty: formHook.initialDoctorSpecialty,
		initialDoctorFio: formHook.initialDoctorFio,
		initialDoctorSnils: formHook.initialDoctorSnils
	});

	const actionsHook = useSickLeaveActions({
		formState: formHook.formState,
		patientData: formHook.patientData,
		validation: formHook.validation,
		onClose,
		onApplyToDiary
	});

	const [isCopiedXml, setIsCopiedXml] = useState(false);

	const registryEntry = useMemo(() => {
		return generateSickLeaveRegistryEntry(formHook.formState, formHook.patientData);
	}, [formHook.formState, formHook.patientData]);

	const xmlPayload = useMemo(() => {
		return generateElnXmlPayload(formHook.formState, formHook.patientData);
	}, [formHook.formState, formHook.patientData]);

	const jsonPayload = useMemo(() => {
		return JSON.stringify(generateElnJsonPayload(formHook.formState, formHook.patientData), null, 2);
	}, [formHook.formState, formHook.patientData]);

	return {
		...formHook,
		...presetsHook,
		...actionsHook,
		registryEntry,
		form036u: registryEntry,
		xmlPayload,
		jsonPayload,
		isCopiedXml,
		setIsCopiedXml
	};
}
