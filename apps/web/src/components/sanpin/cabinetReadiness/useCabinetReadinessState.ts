/**
 * @file useCabinetReadinessState.ts
 * @description Layer 3: Custom hook managing state, presets and mutations for Cabinet Readiness (SanPiN 3.3686-21).
 */

import {
	createCabinetReadinessRecord,
	createDefaultPaperJournalCabinetRecord,
	evaluateCabinetReadiness,
	exportCabinetReadinessToCsv,
	generateCabinetReadinessPrintHtml,
	getCabinetReadinessPreset,
	type CabinetReadinessRecord,
	type DentalAppointmentType,
} from "@dental/shared";
import type React from "react";
import { useMemo, useState } from "react";
import { showToast } from "../../GlobalToast";
import type { BactericidalExposureLog } from "./types";

export function useCabinetReadinessState() {
	const [selectedCabinet, setSelectedCabinet] = useState("Кабинет № 1");
	const [selectedProfile, setSelectedProfile] = useState<DentalAppointmentType>("therapy");
	const [nurseName, setNurseName] = useState("Медсестра / Ассистент");
	const [nursePosition, setNursePosition] = useState("Ассистент стоматолога");

	// Checklist State
	const [disinfectionCompleted, setDisinfectionCompleted] = useState(true);
	const [disinfectantBrand, setDisinfectantBrand] = useState("Бациллол АФ (спрей)");
	const [exposureMinutes, setExposureMinutes] = useState(3);

	const [turbineSterile, setTurbineSterile] = useState(true);
	const [contraAngleSterile, setContraAngleSterile] = useState(true);
	const [micromotorSterile, setMicromotorSterile] = useState(true);
	const [class5Verified, setClass5Verified] = useState(true);
	const [packageIntegrityVerified, setPackageIntegrityVerified] = useState(true);

	const [mirrorReady, setMirrorReady] = useState(true);
	const [probeReady, setProbeReady] = useState(true);
	const [tweezersReady, setTweezersReady] = useState(true);
	const [excavatorReady, setExcavatorReady] = useState(true);
	const [spatulaReady, setSpatulaReady] = useState(true);

	const [salivaConnected, setSalivaConnected] = useState(true);
	const [hveConnected, setHveConnected] = useState(true);
	const [filterChecked, setFilterChecked] = useState(true);

	const [rubberDamReady, setRubberDamReady] = useState(true);
	const [clampsReady, setClampsReady] = useState(true);
	const [forcepsReady, setForcepsReady] = useState(true);

	const [notes, setNotes] = useState("");
	const [bactericidalActive, setBactericidalActive] = useState(false);

	// History records
	const [historyRecords, setHistoryRecords] = useState<CabinetReadinessRecord[]>([
		createCabinetReadinessRecord({
			cabinetNumber: "Кабинет № 1",
			appointmentType: "therapy",
			operatorStaffFullName: "Медсестра / Ассистент",
			operatorStaffPosition: "Ассистент стоматолога",
			surfaceDisinfection: {
				isCompleted: true,
				disinfectantBrand: "Бациллол АФ",
				exposureMinutes: 3,
			},
			handpiecesSterility: {
				isCompleted: true,
				turbineHandpieceSterile: true,
				contraAngleHandpieceSterile: true,
				class5IndicatorsVerified: true,
				packageIntegrityVerified: true,
			},
			sterileTray: {
				isCompleted: true,
				mirrorReady: true,
				probeReady: true,
				tweezersReady: true,
				excavatorReady: true,
				spatulaPluggerReady: true,
			},
			aspirationSystem: {
				isCompleted: true,
				salivaEjectorConnected: true,
				hveVacuumConnected: true,
				bacterialFilterChecked: true,
			},
			isolationCofferdam: {
				isCompleted: true,
				rubberDamSheetReady: true,
				clampsReady: true,
				forcepsReady: true,
			},
			notes: "Подготовка к утреннему терапевтическому приёму",
		}),
	]);

	const currentPreset = useMemo(() => getCabinetReadinessPreset(selectedProfile), [selectedProfile]);

	const evaluation = useMemo(() => {
		return evaluateCabinetReadiness({
			appointmentType: selectedProfile,
			surfaceDisinfection: {
				isCompleted: disinfectionCompleted,
				disinfectantBrand,
				exposureMinutes,
			},
			handpiecesSterility: {
				isCompleted: turbineSterile && contraAngleSterile && class5Verified && packageIntegrityVerified,
				turbineHandpieceSterile: turbineSterile,
				contraAngleHandpieceSterile: contraAngleSterile,
				micromotorHandpieceSterile: micromotorSterile,
				class5IndicatorsVerified: class5Verified,
				packageIntegrityVerified,
			},
			sterileTray: {
				isCompleted: mirrorReady && probeReady && tweezersReady && excavatorReady && spatulaReady,
				mirrorReady,
				probeReady,
				tweezersReady,
				excavatorReady,
				spatulaPluggerReady: spatulaReady,
			},
			aspirationSystem: {
				isCompleted: salivaConnected && hveConnected && filterChecked,
				salivaEjectorConnected: salivaConnected,
				hveVacuumConnected: hveConnected,
				bacterialFilterChecked: filterChecked,
			},
			isolationCofferdam: {
				isCompleted: rubberDamReady && clampsReady && forcepsReady,
				rubberDamSheetReady: rubberDamReady,
				clampsReady,
				forcepsReady,
				isNotRequiredForProfile: !currentPreset.requiresCofferdam,
			},
		});
	}, [
		selectedProfile,
		disinfectionCompleted,
		disinfectantBrand,
		exposureMinutes,
		turbineSterile,
		contraAngleSterile,
		micromotorSterile,
		class5Verified,
		packageIntegrityVerified,
		mirrorReady,
		probeReady,
		tweezersReady,
		excavatorReady,
		spatulaReady,
		salivaConnected,
		hveConnected,
		filterChecked,
		rubberDamReady,
		clampsReady,
		forcepsReady,
		currentPreset.requiresCofferdam,
	]);

	const handleSaveChecklist = (e: React.FormEvent) => {
		e.preventDefault();
		const record = createCabinetReadinessRecord({
			cabinetNumber: selectedCabinet,
			appointmentType: selectedProfile,
			operatorStaffFullName: nurseName.trim() || "Персонал клиники",
			operatorStaffPosition: nursePosition,
			surfaceDisinfection: {
				isCompleted: disinfectionCompleted,
				disinfectantBrand,
				exposureMinutes,
			},
			handpiecesSterility: {
				isCompleted: turbineSterile && contraAngleSterile && class5Verified && packageIntegrityVerified,
				turbineHandpieceSterile: turbineSterile,
				contraAngleHandpieceSterile: contraAngleSterile,
				micromotorHandpieceSterile: micromotorSterile,
				class5IndicatorsVerified: class5Verified,
				packageIntegrityVerified,
			},
			sterileTray: {
				isCompleted: mirrorReady && probeReady && tweezersReady && excavatorReady && spatulaReady,
				mirrorReady,
				probeReady,
				tweezersReady,
				excavatorReady,
				spatulaPluggerReady: spatulaReady,
			},
			aspirationSystem: {
				isCompleted: salivaConnected && hveConnected && filterChecked,
				salivaEjectorConnected: salivaConnected,
				hveVacuumConnected: hveConnected,
				bacterialFilterChecked: filterChecked,
			},
			isolationCofferdam: {
				isCompleted: rubberDamReady && clampsReady && forcepsReady,
				rubberDamSheetReady: rubberDamReady,
				clampsReady,
				forcepsReady,
				isNotRequiredForProfile: !currentPreset.requiresCofferdam,
			},
			notes: notes || undefined,
		});

		setHistoryRecords((prev) => [record, ...prev]);
		if (record.isFullyReady) {
			showToast(
				`${selectedCabinet} успешно подготовлен: «${currentPreset.shortLabelRu}». Статус готовности зафиксирован в журнале.`,
				"success",
			);
		} else {
			showToast(`${selectedCabinet} принят в работу. Чек-лист сохранен в фоновом режиме.`, "info");
		}
	};

	const handleQuickFillAllReady = () => {
		setDisinfectionCompleted(true);
		setExposureMinutes(currentPreset.minExposureMinutes);
		setTurbineSterile(true);
		setContraAngleSterile(true);
		setMicromotorSterile(true);
		setClass5Verified(true);
		setPackageIntegrityVerified(true);
		setMirrorReady(true);
		setProbeReady(true);
		setTweezersReady(true);
		setExcavatorReady(true);
		setSpatulaReady(true);
		setSalivaConnected(true);
		setHveConnected(true);
		setFilterChecked(true);
		setRubberDamReady(true);
		setClampsReady(true);
		setForcepsReady(true);
		showToast("Все пункты чек-листа отмечены как проверенные и готовые", "info");
	};

	const handleOneClickConfirmCabinetReady = () => {
		handleQuickFillAllReady();
		const record = createCabinetReadinessRecord({
			cabinetNumber: selectedCabinet,
			appointmentType: selectedProfile,
			operatorStaffFullName: nurseName,
			operatorStaffPosition: nursePosition,
			surfaceDisinfection: {
				isCompleted: true,
				disinfectantBrand,
				exposureMinutes: currentPreset.minExposureMinutes,
			},
			handpiecesSterility: {
				isCompleted: true,
				turbineHandpieceSterile: true,
				contraAngleHandpieceSterile: true,
				micromotorHandpieceSterile: true,
				class5IndicatorsVerified: true,
				packageIntegrityVerified: true,
			},
			sterileTray: {
				isCompleted: true,
				mirrorReady: true,
				probeReady: true,
				tweezersReady: true,
				excavatorReady: true,
				spatulaPluggerReady: true,
			},
			aspirationSystem: {
				isCompleted: true,
				salivaEjectorConnected: true,
				hveVacuumConnected: true,
				bacterialFilterChecked: true,
			},
			isolationCofferdam: {
				isCompleted: true,
				rubberDamSheetReady: true,
				clampsReady: true,
				forcepsReady: true,
				isNotRequiredForProfile: !currentPreset.requiresCofferdam,
			},
			notes: notes || "Подтверждена готовность всех узлов кабинета к смене",
		});

		setHistoryRecords((prev) => [record, ...prev]);
		showToast(`${selectedCabinet}: готовность к смене подтверждена`, "success");
	};

	const handleStartAppointmentPaperLogNorm = () => {
		const record = createDefaultPaperJournalCabinetRecord({
			cabinetNumber: selectedCabinet,
			appointmentType: selectedProfile,
			operatorStaffFullName: nurseName || "Персонал клиники",
			notes: "Приём начат (отметка в журнале)",
		});
		setHistoryRecords((prev) => [record, ...prev]);
		showToast(`${selectedCabinet}: приём начат в штатном режиме.`, "success");
	};

	const handleExportCsv = () => {
		const csv = exportCabinetReadinessToCsv(historyRecords);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Cabinet_Readiness_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Реестр готовности кабинетов выгружен в CSV (с UTF-8 BOM)", "success");
	};

	const handlePrint = () => {
		const html = generateCabinetReadinessPrintHtml({ records: historyRecords });
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => printWin.print(), 250);
		}
	};

	const handleExposureLogged = (log: BactericidalExposureLog) => {
		setBactericidalActive(true);
	};

	return {
		selectedCabinet,
		setSelectedCabinet,
		selectedProfile,
		setSelectedProfile,
		nurseName,
		setNurseName,
		nursePosition,
		setNursePosition,
		disinfectionCompleted,
		setDisinfectionCompleted,
		disinfectantBrand,
		setDisinfectantBrand,
		exposureMinutes,
		setExposureMinutes,
		turbineSterile,
		setTurbineSterile,
		contraAngleSterile,
		setContraAngleSterile,
		micromotorSterile,
		setMicromotorSterile,
		class5Verified,
		setClass5Verified,
		packageIntegrityVerified,
		setPackageIntegrityVerified,
		mirrorReady,
		setMirrorReady,
		probeReady,
		setProbeReady,
		tweezersReady,
		setTweezersReady,
		excavatorReady,
		setExcavatorReady,
		spatulaReady,
		setSpatulaReady,
		salivaConnected,
		setSalivaConnected,
		hveConnected,
		setHveConnected,
		filterChecked,
		setFilterChecked,
		rubberDamReady,
		setRubberDamReady,
		clampsReady,
		setClampsReady,
		forcepsReady,
		setForcepsReady,
		notes,
		setNotes,
		historyRecords,
		currentPreset,
		evaluation,
		bactericidalActive,
		handleSaveChecklist,
		handleQuickFillAllReady,
		handleOneClickConfirmCabinetReady,
		handleStartAppointmentPaperLogNorm,
		handleExportCsv,
		handlePrint,
		handleExposureLogged,
	};
}
