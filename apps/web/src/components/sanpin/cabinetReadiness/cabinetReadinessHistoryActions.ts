import {
	createCabinetReadinessRecord,
	createDefaultPaperJournalCabinetRecord,
	type CabinetReadinessRecord,
	type DentalAppointmentType,
} from "@dental/shared";
import { showToast } from "../../GlobalToast.js";

export function getInitialCabinetHistory(): CabinetReadinessRecord[] {
	return [
		createCabinetReadinessRecord({
			cabinetNumber: "Кабинет № 1",
			appointmentType: "therapy",
			operatorStaffFullName: "Медсестра / Ассистент",
			operatorStaffPosition: "Ассистент стоматолога",
			surfaceDisinfection: { isCompleted: true, disinfectantBrand: "Бациллол АФ", exposureMinutes: 3 },
			handpiecesSterility: { isCompleted: true, turbineHandpieceSterile: true, contraAngleHandpieceSterile: true, class5IndicatorsVerified: true, packageIntegrityVerified: true },
			sterileTray: { isCompleted: true, mirrorReady: true, probeReady: true, tweezersReady: true, excavatorReady: true, spatulaPluggerReady: true },
			aspirationSystem: { isCompleted: true, salivaEjectorConnected: true, hveVacuumConnected: true, bacterialFilterChecked: true },
			isolationCofferdam: { isCompleted: true, rubberDamSheetReady: true, clampsReady: true, forcepsReady: true },
			notes: "Подготовка к утреннему терапевтическому приёму",
		}),
	];
}

export function saveChecklistRecord(params: {
	selectedCabinet: string;
	selectedProfile: DentalAppointmentType;
	nurseName: string;
	nursePosition: string;
	disinfectionCompleted: boolean;
	disinfectantBrand: string;
	exposureMinutes: number;
	turbineSterile: boolean;
	contraAngleSterile: boolean;
	micromotorSterile: boolean;
	class5Verified: boolean;
	packageIntegrityVerified: boolean;
	mirrorReady: boolean;
	probeReady: boolean;
	tweezersReady: boolean;
	excavatorReady: boolean;
	spatulaReady: boolean;
	salivaConnected: boolean;
	hveConnected: boolean;
	filterChecked: boolean;
	rubberDamReady: boolean;
	clampsReady: boolean;
	forcepsReady: boolean;
	requiresCofferdam: boolean;
	notes: string;
	shortLabelRu: string;
	setHistoryRecords: React.Dispatch<React.SetStateAction<CabinetReadinessRecord[]>>;
}): void {
	const record = createCabinetReadinessRecord({
		cabinetNumber: params.selectedCabinet,
		appointmentType: params.selectedProfile,
		operatorStaffFullName: params.nurseName.trim() || "Персонал клиники",
		operatorStaffPosition: params.nursePosition,
		surfaceDisinfection: { isCompleted: params.disinfectionCompleted, disinfectantBrand: params.disinfectantBrand, exposureMinutes: params.exposureMinutes },
		handpiecesSterility: {
			isCompleted: params.turbineSterile && params.contraAngleSterile && params.class5Verified && params.packageIntegrityVerified,
			turbineHandpieceSterile: params.turbineSterile, contraAngleHandpieceSterile: params.contraAngleSterile, micromotorHandpieceSterile: params.micromotorSterile,
			class5IndicatorsVerified: params.class5Verified, packageIntegrityVerified: params.packageIntegrityVerified,
		},
		sterileTray: {
			isCompleted: params.mirrorReady && params.probeReady && params.tweezersReady && params.excavatorReady && params.spatulaReady,
			mirrorReady: params.mirrorReady, probeReady: params.probeReady, tweezersReady: params.tweezersReady, excavatorReady: params.excavatorReady, spatulaPluggerReady: params.spatulaReady,
		},
		aspirationSystem: {
			isCompleted: params.salivaConnected && params.hveConnected && params.filterChecked,
			salivaEjectorConnected: params.salivaConnected, hveVacuumConnected: params.hveConnected, bacterialFilterChecked: params.filterChecked,
		},
		isolationCofferdam: {
			isCompleted: params.rubberDamReady && params.clampsReady && params.forcepsReady,
			rubberDamSheetReady: params.rubberDamReady, clampsReady: params.clampsReady, forcepsReady: params.forcepsReady, isNotRequiredForProfile: !params.requiresCofferdam,
		},
		notes: params.notes || undefined,
	});

	params.setHistoryRecords((prev) => [record, ...prev]);
	if (record.isFullyReady) {
		showToast(`${params.selectedCabinet} успешно подготовлен: «${params.shortLabelRu}». Статус готовности зафиксирован в журнале.`, "success");
	} else {
		showToast(`${params.selectedCabinet} принят в работу. Чек-лист сохранен в фоновом режиме.`, "info");
	}
}

export function startAppointmentPaperLog(
	cabinet: string,
	profile: DentalAppointmentType,
	nurse: string,
	setHistoryRecords: React.Dispatch<React.SetStateAction<CabinetReadinessRecord[]>>,
): void {
	const record = createDefaultPaperJournalCabinetRecord({
		cabinetNumber: cabinet,
		appointmentType: profile,
		operatorStaffFullName: nurse || "Персонал клиники",
		notes: "Приём начат (отметка в журнале)",
	});
	setHistoryRecords((prev) => [record, ...prev]);
	showToast(`${cabinet}: приём начат в штатном режиме.`, "success");
}
