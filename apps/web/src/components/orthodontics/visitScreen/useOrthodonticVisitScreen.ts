import { useState, useMemo, useCallback } from "react";
import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";
import {
	type OrthodonticStageKind,
	type ArchwireMaterial,
	type ArchwireSection,
	type ElasticScheme,
	type ElasticSize,
	type ElasticWearMode,
	type AngleClass,
	type AnbClass,
	type SagittalAnomaly,
	type VerticalAnomaly,
	type TransversalAnomaly,
	type TmjStatus,
	type TargetArch,
} from "../orthoProtocolTypes";
import {
	calculateOrthodonticServices804n,
	type OrthoCalculatedService804n,
} from "../orthoServicesCatalog";
import { copyTextToClipboard, printOrthodonticCardA4, printPatientMemoA4 } from "../orthoProtocolPrintUtils";
import { formatOrthodonticPatientMemo } from "../orthoPatientMemo";

export interface UseOrthodonticVisitScreenProps {
	readonly patientName?: string;
	readonly clinicName?: string;
	readonly clinicPhone?: string;
	readonly doctorName?: string;
	readonly selectedTooth?: number | null;
	readonly onAddToInvoice?: (services: OrthoCalculatedService804n[]) => void;
	readonly onClose?: () => void;
}

export function useOrthodonticVisitScreen({
	patientName = "Пациент",
	clinicName = "Стоматологическая клиника DENTE",
	clinicPhone = "+7 (999) 000-00-00",
	doctorName = "Лечащий врач-ортодонт",
	selectedTooth = null,
	onAddToInvoice,
	onClose,
}: UseOrthodonticVisitScreenProps) {
	// Dialogs & Navigation State
	const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
	const [isCephModalOpen, setIsCephModalOpen] = useState(false);
	const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
	const [isPhotoCompleted, setIsPhotoCompleted] = useState(false);
	const [mobileTab, setMobileTab] = useState<"controls" | "preview">("controls");

	// Clinical Protocol State
	const [stageFilter, setStageFilter] = useState<OrthodonticStageKind>("stage_2_leveling");
	const [targetArch, setTargetArch] = useState<TargetArch>("both");
	const [bracketSystem, setBracketSystem] = useState("damon_q2");
	const [bracketSlot, setBracketSlot] = useState<"0.018" | "0.022">("0.022");
	const [archwireMaterial, setArchwireMaterial] = useState<ArchwireMaterial>("niti");
	const [archwireSection, setArchwireSection] = useState<ArchwireSection>(".014");
	const [elasticScheme, setElasticScheme] = useState<ElasticScheme>("class_2");
	const [elasticSize, setElasticSize] = useState<ElasticSize>("3_16_4_5oz");
	const [elasticWear, setElasticWear] = useState<ElasticWearMode>("full_time");
	const [selectedActions, setSelectedActions] = useState<string[]>(["wire_change", "ligature_change"]);
	const [angleClass, setAngleClass] = useState<AngleClass>("I");
	const [anbClass, setAnbClass] = useState<AnbClass>("I");
	const [anbAngle, setAnbAngle] = useState(2.8);
	const [sagittalAnomaly, setSagittalAnomaly] = useState<SagittalAnomaly>("normal");
	const [verticalAnomaly, setVerticalAnomaly] = useState<VerticalAnomaly>("normal");
	const [transversalAnomaly, setTransversalAnomaly] = useState<TransversalAnomaly>("normal");
	const [tmjStatus, setTmjStatus] = useState<TmjStatus>("normal");

	// Aligners
	const [alignerStep, setAlignerStep] = useState(4);
	const [alignerTotal, setAlignerTotal] = useState(24);
	const [alignerDaysPerStep, setAlignerDaysPerStep] = useState(14);
	const [notes, setNotes] = useState<string>("");

	// 1-Click Master Norm & Express Activation (Mandates 8e, 8n)
	const handleApplyExpressNorm = useCallback(() => {
		setAngleClass("I");
		setAnbClass("I");
		setAnbAngle(3.0);
		setSagittalAnomaly("normal");
		setVerticalAnomaly("normal");
		setTransversalAnomaly("normal");
		setTmjStatus("normal");

		if (stageFilter === "stage_6_aligners") {
			setSelectedActions(["aligner_tracking"]);
			setAlignerStep((s) => Math.min(alignerTotal, s + 1));
			setNotes("Плановый осмотр элайнеротерапии. Трэкинг капп полный, аттачменты сохранны. Выдан следующий комплект капп. Режим ношения соблюдается.");
			showToast("✓ Норма: Смена элайнера без осложнений зафиксирована в 1 клик", "success", 3000);
		} else {
			setSelectedActions(["wire_change", "ligature_change"]);
			setNotes("Плановая активация дуги. Динамика торка и ангуляции удовлетворительная. Брекеты интактны, фиксация надежная. Смена лигатур проведена.");
			showToast("✓ Норма: Активация дуги без осложнений зафиксирована в 1 клик", "success", 3000);
		}
	}, [stageFilter, alignerTotal]);

	// Service Calculation in Realtime
	const calculatedServices = useMemo(() => {
		return calculateOrthodonticServices804n({
			selectedActions,
			targetArch,
			stageKind: stageFilter,
			bracketSystem,
			archwireMaterial,
			archwireSection,
			selectedTooth: selectedTooth ?? undefined,
		});
	}, [selectedActions, targetArch, stageFilter, bracketSystem, archwireMaterial, archwireSection, selectedTooth]);

	const totalRub = useMemo(() => calculatedServices.reduce((sum, s) => sum + s.priceRub, 0), [calculatedServices]);

	// Generated Clinical Protocol Note (SOAP format)
	const generatedProtocol = useMemo(() => {
		const stageTitles: Record<OrthodonticStageKind, string> = {
			stage_1_diagnostics: "1. Диагностика и планирование",
			stage_2_leveling: "2. Нивелирование и выравнивание",
			stage_3_bite_correction: "3. Коррекция прикуса и закрытие промежутков",
			stage_4_detailing: "4. Юстировка и финишная детализация",
			stage_5_retention: "5. Снятие аппаратуры и ретенция",
			stage_6_aligners: "6. Элайнеротерапия",
		};
		const wireMatStr = typeof archwireMaterial === "string" ? archwireMaterial : (archwireMaterial as any)?.id || "niti";
		const wireLabel = `${wireMatStr.toUpperCase()} ${archwireSection}`;
		const archLabel = targetArch === "upper" ? "ВЧ" : targetArch === "lower" ? "НЧ" : "Обе челюсти";
		return [
			`ДНЕВНИК ОРТОДОНТИЧЕСКОГО ПРИЁМА (${new Date().toLocaleDateString("ru-RU")})`,
			`Пациент: ${patientName} | Врач: ${doctorName}`,
			`Этап лечения: ${stageTitles[stageFilter]}`,
			`Окклюзия: Класс по Энглю ${angleClass}, Скелетный класс ${anbClass} (ANB ${anbAngle.toFixed(1)}°).`,
			stageFilter === "stage_6_aligners"
				? `Элайнеры: Сет ${alignerStep} из ${alignerTotal} (интервал смены ${alignerDaysPerStep} дн.).`
				: `Аппаратура: Брекеты ${bracketSystem} (паз ${bracketSlot}), дуга ${wireLabel} (${archLabel}).`,
			selectedActions.includes("elastic_traction") ? `Тяги: ${elasticScheme}, размер ${elasticSize}, режим ${elasticWear}.` : "",
			notes ? `Заметки врача: ${notes}` : "",
			`Начислено услуг: ${calculatedServices.map((s) => `${s.code} ${s.name} (${s.priceRub} ₽)`).join("; ")}`,
			`Итого: ${totalRub} ₽`,
		].filter(Boolean).join("\n");
	}, [patientName, doctorName, stageFilter, angleClass, anbClass, anbAngle, alignerStep, alignerTotal, alignerDaysPerStep, bracketSystem, bracketSlot, archwireMaterial, archwireSection, targetArch, selectedActions, elasticScheme, elasticSize, elasticWear, notes, calculatedServices, totalRub]);

	// Actions: Add to Invoice, Cash Register, Medical Chart, Memo
	const handleAddServicesToInvoice = useCallback(() => {
		if (calculatedServices.length === 0) {
			showToast("Нет выбранных ортодонтических манипуляций для начисления", "info");
			return;
		}
		onAddToInvoice?.(calculatedServices);
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: { services: calculatedServices, toothNumber: selectedTooth ?? undefined, stageKind: stageFilter },
				}),
			);
		}
		showToast(`Начислено ${calculatedServices.length} услуг на сумму ${totalRub} ₽ в чек визита`, "success", 3500);
	}, [calculatedServices, selectedTooth, stageFilter, totalRub, onAddToInvoice]);

	const handleApplyToVisitNote = useCallback(() => {
		try {
			const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
			if (setVisitNoteForm) {
				setVisitNoteForm((prev: any) => ({
					...prev,
					objective: prev?.objective ? `${prev.objective}\n\n${generatedProtocol}` : generatedProtocol,
				}));
			}
		} catch {
			// ignore fallback
		}
		handleAddServicesToInvoice();
		showToast("Протокол занесен в дневник приема, услуги добавлены в смету", "success", 3500);
	}, [generatedProtocol, handleAddServicesToInvoice]);

	const handleCopyPatientMemo = useCallback(() => {
		const memo = formatOrthodonticPatientMemo({
			patientName,
			clinicName,
			clinicPhone,
			doctorName,
			archwireMaterial,
			archwireSection,
			elasticScheme,
			elasticSize,
			elasticWear,
			nextAppointmentDays: 28,
		});
		copyTextToClipboard(memo, "Памятка пациенту по эластикам и уходу скопирована для WhatsApp/Telegram");
	}, [patientName, clinicName, clinicPhone, doctorName, archwireMaterial, archwireSection, elasticScheme, elasticSize, elasticWear]);

	const handlePrintMemo = useCallback(() => {
		const memo = formatOrthodonticPatientMemo({
			patientName,
			clinicName,
			clinicPhone,
			doctorName,
			archwireMaterial,
			archwireSection,
			elasticScheme,
			elasticSize,
			elasticWear,
			nextAppointmentDays: 28,
		});
		printPatientMemoA4({ patientName, clinicName, doctorName, clinicPhone, memoText: memo });
	}, [patientName, clinicName, clinicPhone, doctorName, archwireMaterial, archwireSection, elasticScheme, elasticSize, elasticWear]);

	const handlePrintCard = useCallback(() => {
		printOrthodonticCardA4({ patientName, clinicName, doctorName, protocolText: generatedProtocol });
	}, [patientName, clinicName, doctorName, generatedProtocol]);

	const handleCommitAndClose = useCallback(() => {
		handleApplyToVisitNote();
		onClose?.();
	}, [handleApplyToVisitNote, onClose]);

	return {
		// Dialogs
		isCheckoutOpen,
		setIsCheckoutOpen,
		isCephModalOpen,
		setIsCephModalOpen,
		isPhotoModalOpen,
		setIsPhotoModalOpen,
		isPhotoCompleted,
		setIsPhotoCompleted,
		mobileTab,
		setMobileTab,

		// Clinical State
		stageFilter,
		setStageFilter,
		targetArch,
		setTargetArch,
		bracketSystem,
		setBracketSystem,
		bracketSlot,
		setBracketSlot,
		archwireMaterial,
		setArchwireMaterial,
		archwireSection,
		setArchwireSection,
		elasticScheme,
		setElasticScheme,
		elasticSize,
		setElasticSize,
		elasticWear,
		setElasticWear,
		selectedActions,
		setSelectedActions,
		angleClass,
		setAngleClass,
		anbClass,
		setAnbClass,
		anbAngle,
		setAnbAngle,
		sagittalAnomaly,
		setSagittalAnomaly,
		verticalAnomaly,
		setVerticalAnomaly,
		transversalAnomaly,
		setTransversalAnomaly,
		tmjStatus,
		setTmjStatus,
		alignerStep,
		setAlignerStep,
		alignerTotal,
		setAlignerTotal,
		alignerDaysPerStep,
		setAlignerDaysPerStep,
		notes,
		setNotes,

		// Calculated & Generated
		calculatedServices,
		totalRub,
		generatedProtocol,

		// Handlers
		handleApplyExpressNorm,
		handleAddServicesToInvoice,
		handleApplyToVisitNote,
		handleCopyPatientMemo,
		handlePrintMemo,
		handlePrintCard,
		handleCommitAndClose,
	};
}
