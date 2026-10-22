import {
	createCabinetReadinessRecord,
	getCabinetReadinessPreset,
	type CabinetReadinessRecord,
	type DentalAppointmentType,
} from "@dental/shared";
import type React from "react";
import { useMemo, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import type { BactericidalExposureLog } from "./types.js";
import { exportCabinetReadinessCsv, printCabinetReadinessHtml } from "./cabinetReadinessExportActions.js";
import { useCabinetReadinessFormFields } from "./cabinetReadinessFormState.js";
import {
	getInitialCabinetHistory,
	saveChecklistRecord,
	startAppointmentPaperLog,
} from "./cabinetReadinessHistoryActions.js";

export function useCabinetReadinessState() {
	const [selectedCabinet, setSelectedCabinet] = useState("Кабинет № 1");
	const [selectedProfile, setSelectedProfile] = useState<DentalAppointmentType>("therapy");
	const [nurseName, setNurseName] = useState("Медсестра / Ассистент");
	const [nursePosition, setNursePosition] = useState("Ассистент стоматолога");
	const [notes, setNotes] = useState("");
	const [bactericidalActive, setBactericidalActive] = useState(false);
	const [historyRecords, setHistoryRecords] = useState<CabinetReadinessRecord[]>(getInitialCabinetHistory);

	const currentPreset = useMemo(() => getCabinetReadinessPreset(selectedProfile), [selectedProfile]);
	const fields = useCabinetReadinessFormFields(selectedProfile, currentPreset.requiresCofferdam);

	const handleSaveChecklist = (e: React.FormEvent) => {
		e.preventDefault();
		saveChecklistRecord({
			selectedCabinet, selectedProfile, nurseName, nursePosition,
			disinfectionCompleted: fields.disinfectionCompleted, disinfectantBrand: fields.disinfectantBrand, exposureMinutes: fields.exposureMinutes,
			turbineSterile: fields.turbineSterile, contraAngleSterile: fields.contraAngleSterile, micromotorSterile: fields.micromotorSterile,
			class5Verified: fields.class5Verified, packageIntegrityVerified: fields.packageIntegrityVerified,
			mirrorReady: fields.mirrorReady, probeReady: fields.probeReady, tweezersReady: fields.tweezersReady,
			excavatorReady: fields.excavatorReady, spatulaReady: fields.spatulaReady,
			salivaConnected: fields.salivaConnected, hveConnected: fields.hveConnected, filterChecked: fields.filterChecked,
			rubberDamReady: fields.rubberDamReady, clampsReady: fields.clampsReady, forcepsReady: fields.forcepsReady,
			requiresCofferdam: currentPreset.requiresCofferdam, notes, shortLabelRu: currentPreset.shortLabelRu, setHistoryRecords,
		});
	};

	const handleOneClickConfirmCabinetReady = () => {
		fields.fillAllReady(currentPreset.minExposureMinutes);
		const record = createCabinetReadinessRecord({
			cabinetNumber: selectedCabinet, appointmentType: selectedProfile, operatorStaffFullName: nurseName, operatorStaffPosition: nursePosition,
			surfaceDisinfection: { isCompleted: true, disinfectantBrand: fields.disinfectantBrand, exposureMinutes: currentPreset.minExposureMinutes },
			handpiecesSterility: { isCompleted: true, turbineHandpieceSterile: true, contraAngleHandpieceSterile: true, micromotorHandpieceSterile: true, class5IndicatorsVerified: true, packageIntegrityVerified: true },
			sterileTray: { isCompleted: true, mirrorReady: true, probeReady: true, tweezersReady: true, excavatorReady: true, spatulaPluggerReady: true },
			aspirationSystem: { isCompleted: true, salivaEjectorConnected: true, hveVacuumConnected: true, bacterialFilterChecked: true },
			isolationCofferdam: { isCompleted: true, rubberDamSheetReady: true, clampsReady: true, forcepsReady: true, isNotRequiredForProfile: !currentPreset.requiresCofferdam },
			notes: notes || "Подтверждена готовность всех узлов кабинета к смене",
		});
		setHistoryRecords((prev) => [record, ...prev]);
		showToast(`${selectedCabinet}: готовность к смене подтверждена`, "success");
	};

	return {
		selectedCabinet, setSelectedCabinet, selectedProfile, setSelectedProfile, nurseName, setNurseName, nursePosition, setNursePosition,
		...fields,
		notes, setNotes, historyRecords, currentPreset, evaluation: fields.evaluation, bactericidalActive,
		handleSaveChecklist, handleQuickFillAllReady: () => fields.fillAllReady(currentPreset.minExposureMinutes),
		handleOneClickConfirmCabinetReady,
		handleStartAppointmentPaperLogNorm: () => startAppointmentPaperLog(selectedCabinet, selectedProfile, nurseName, setHistoryRecords),
		handleExportCsv: () => exportCabinetReadinessCsv(historyRecords),
		handlePrint: () => printCabinetReadinessHtml(historyRecords),
		handleExposureLogged: () => setBactericidalActive(true),
	};
}
