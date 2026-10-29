import React, { useState, useMemo, useCallback } from "react";
import {
	CheckCircle2,
	Printer,
	Receipt,
	CreditCard,
	X,
	Copy,
	Camera,
	Compass,
	Calendar,
	MessageSquare,
	Check,
	RotateCcw,
	Layers,
	FileText,
} from "lucide-react";
import { BracesBracket } from "../icons/DentalIcons";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import { CashRegisterCheckoutModal } from "../billing/CashRegisterCheckoutModal";
import { CephalometricAnalysisModal } from "./CephalometricAnalysisModal";
import { OrthodonticPhotoProtocolModal } from "../diagnostics/OrthodonticPhotoProtocolModal";
import {
	ARCHWIRE_MATERIALS,
	BRACKET_SYSTEMS,
	CLINICAL_ACTIONS,
	ELASTIC_SCHEMES,
	ELASTIC_SIZES,
	ROUND_SECTIONS,
	RECT_SECTIONS,
	ANGLE_CLASS_OPTIONS,
	WORKHORSE_ARCHWIRES,
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
} from "./orthoProtocolTypes";
import {
	calculateOrthodonticServices804n,
	type OrthoCalculatedService804n,
} from "./orthoServicesCatalog";
import { copyTextToClipboard, printOrthodonticCardA4, printPatientMemoA4 } from "./orthoProtocolPrintUtils";
import { formatOrthodonticPatientMemo } from "./orthoPatientMemo";

export interface OrthodonticVisitScreenProps {
	readonly isOpen?: boolean;
	readonly onClose?: () => void;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly clinicName?: string;
	readonly clinicPhone?: string;
	readonly doctorName?: string;
	readonly selectedTooth?: number | null;
	readonly onAddToInvoice?: (services: OrthoCalculatedService804n[]) => void;
}

export const OrthodonticVisitScreen: React.FC<OrthodonticVisitScreenProps> = ({
	isOpen = true,
	onClose,
	patientId = "pat-101",
	patientName = "Пациент",
	clinicName = "Стоматологическая клиника DENTE",
	clinicPhone = "+7 (999) 000-00-00",
	doctorName = "Лечащий врач-ортодонт",
	selectedTooth = null,
	onAddToInvoice,
}) => {
	// Mode & Dialogs
	const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
	const [isCephModalOpen, setIsCephModalOpen] = useState(false);
	const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
	const [isPhotoCompleted, setIsPhotoCompleted] = useState(false);
	const [mobileTab, setMobileTab] = useState<"controls" | "preview">("controls");

	// Clinical State
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

	// Clinical Notes
	const [notes, setNotes] = useState<string>("");

	// 1-Click Master Norm (Mandate 8e)
	const handleSetMasterPhysiologicalNorm = useCallback(() => {
		setAngleClass("I");
		setAnbClass("I");
		setAnbAngle(3.0);
		setSagittalAnomaly("normal");
		setVerticalAnomaly("normal");
		setTransversalAnomaly("normal");
		setTmjStatus("normal");
		showToast("Зафиксирована физиологическая норма: Прикус I класс, ANB 3.0°, ВНЧС норма", "success", 3000);
	}, []);

	// Real-time Service Calculation (804n)
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
			`Аппаратура: Брекеты ${bracketSystem} (паз ${bracketSlot}), дуга ${wireLabel} (${archLabel}).`,
			selectedActions.includes("elastic_traction") ? `Тяги: ${elasticScheme}, размер ${elasticSize}, режим ${elasticWear}.` : "",
			notes ? `Заметки: ${notes}` : "",
			`Начислено услуг: ${calculatedServices.map((s) => `${s.code} ${s.name} (${s.priceRub} ₽)`).join("; ")}`,
			`Итого: ${totalRub} ₽`,
		].filter(Boolean).join("\n");
	}, [patientName, doctorName, stageFilter, angleClass, anbClass, anbAngle, bracketSystem, bracketSlot, archwireMaterial, archwireSection, targetArch, selectedActions, elasticScheme, elasticSize, elasticWear, notes, calculatedServices, totalRub]);

	// Actions: Add to Invoice, Cash Register, EMR, Memo
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

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto overflow-x-clip max-w-[100vw]"
			role="dialog"
			aria-modal="true"
			aria-labelledby="ortho-protocol-title"
			data-testid="orthodontic-visit-protocol-widget"
		>
			<div className="relative w-full max-w-5xl bg-[var(--paper)] border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col h-[94vh] sm:h-auto sm:max-h-[94vh] overflow-hidden overflow-x-clip">
				{/* Mobile Drag Handle (Apple HIG) */}
				<div data-testid="ortho-mobile-drag-handle-container" className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0 bg-[var(--paper)]">
					<div data-testid="ortho-mobile-drag-handle" className="w-9 h-1.5 rounded-full bg-[var(--line)]" />
				</div>

				{/* Header */}
				<header className="flex items-center justify-between px-4 py-2.5 bg-[var(--paper)] border-b border-[var(--line)] shrink-0">
					<div className="flex items-center gap-2.5 min-w-0 mr-2 shrink-0">
						<div className="w-8 h-8 rounded-xl bg-[var(--paper-soft)] text-[var(--primary)] flex items-center justify-center border border-[var(--line)] shrink-0">
							<BracesBracket size={18} />
						</div>
						<div className="min-w-0">
							<h2 id="ortho-protocol-title" className="text-sm font-bold text-[var(--ink)] m-0 whitespace-nowrap">
								Ортодонтический протокол приёма
							</h2>
							<p className="text-xs text-[var(--muted)] m-0 truncate">
								{patientName} · Брекеты, дуги, сечения и эластики
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							onClick={handleSetMasterPhysiologicalNorm}
							className="secondary-button shrink-0 flex items-center gap-1.5 border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--primary)] font-bold text-xs cursor-pointer shadow-xs min-h-[32px] h-8 px-2.5"
							data-testid="ortho-toolbar-norm-btn"
							title="1-клик фиксация нормы (Мандат 8e): Физиологический ортогнатический прикус"
						>
							<CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
							<span className="hidden md:inline">Физиологический прикус</span>
							<span className="md:hidden">Норма</span>
						</button>

						<button
							type="button"
							onClick={handleAddServicesToInvoice}
							className="secondary-button shrink-0 !hidden xl:!inline-flex h-8 px-2.5 text-xs font-semibold"
							data-testid="add-ortho-services-to-invoice-btn"
							title="Начислить услуги в чек/смету визита"
							aria-label="Начислить услуги в чек/смету"
						>
							<Receipt size={14} />
							<span>Услуги</span>
							<span
								className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] min-w-[18px] text-center"
								data-testid="ortho-services-count-badge"
							>
								{calculatedServices.length}
							</span>
						</button>

						<button
							type="button"
							onClick={handleApplyToVisitNote}
							className="secondary-button shrink-0 !hidden sm:!inline-flex h-8 px-3 text-xs font-bold"
							data-testid="apply-to-form-043-btn"
							title="Вставить протокол в медицинскую карту"
							aria-label="В медицинскую карту"
						>
							<CheckCircle2 size={14} className="text-teal-600 dark:text-teal-400" />
							<span>В карту</span>
						</button>

						{onClose && (
							<button
								type="button"
								onClick={onClose}
								className="secondary-button w-8 h-8 !p-0 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center shrink-0 cursor-pointer"
								title="Закрыть"
								aria-label="Закрыть протокол"
							>
								<X size={16} />
							</button>
						)}
					</div>
				</header>

				{/* Mobile Segmented Bar */}
				<div className="sm:hidden flex border-b border-[var(--line)] bg-[var(--paper-soft)] p-1 shrink-0">
					<button
						type="button"
						onClick={() => setMobileTab("controls")}
						className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all min-h-[36px] ${
							mobileTab === "controls" ? "bg-[var(--paper)] text-[var(--teal)] shadow-xs" : "text-[var(--muted)]"
						}`}
					>
						Манипуляции и дуги
					</button>
					<button
						type="button"
						onClick={() => setMobileTab("preview")}
						className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all min-h-[36px] flex items-center justify-center gap-1 ${
							mobileTab === "preview" ? "bg-[var(--paper)] text-[var(--teal)] shadow-xs" : "text-[var(--muted)]"
						}`}
					>
						<span>Чек и дневник</span>
						<span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--teal)]/10 text-[var(--teal)] font-bold">
							{calculatedServices.length}
						</span>
					</button>
				</div>

				{/* Body Content */}
				<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto overflow-x-clip">
					{/* Left Column: Controls (col-span-7) */}
					<div className={`lg:col-span-7 p-4 sm:p-5 flex flex-col gap-4 border-b lg:border-b-0 lg:border-r border-[var(--line)] overflow-y-auto ${mobileTab === "controls" ? "flex" : "hidden sm:flex"}`}>
						{/* 1. Stages Toolbar (Hick's law 6 stages) */}
						<div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar shrink-0 min-w-0">
							{(
								[
									["stage_1_diagnostics", "1. Диагностика"],
									["stage_2_leveling", "2. Нивелирование"],
									["stage_3_bite_correction", "3. Коррекция прикуса"],
									["stage_4_detailing", "4. Детализация"],
									["stage_5_retention", "5. Ретенция"],
									["stage_6_aligners", "6. Элайнеры"],
								] as const
							).map(([key, label]) => (
								<button
									key={key}
									type="button"
									onClick={() => setStageFilter(key)}
									className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap min-h-[36px] cursor-pointer transition-all border shrink-0 ${
										stageFilter === key
											? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
									}`}
								>
									{label}
								</button>
							))}
						</div>

						{/* 2. Photo & Ceph Launcher Bar */}
						<div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] shrink-0 flex-wrap">
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setIsPhotoModalOpen(true)}
									className="secondary-button min-h-[36px] h-9 px-2.5 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
									title="Клинический фотопротокол 12 позиций"
								>
									<Camera size={14} className="text-teal-600 dark:text-teal-400" />
									<span>Фотопротокол</span>
								</button>
								<button
									type="button"
									onClick={() => setIsCephModalOpen(true)}
									className="secondary-button min-h-[36px] h-9 px-2.5 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
									title="Разметка ТРГ и цефалометрический анализ"
								>
									<Compass size={14} className="text-teal-600 dark:text-teal-400" />
									<span>ТРГ Цефалометрия</span>
								</button>
							</div>

							<div className="flex items-center gap-1.5">
								<span className="text-[11px] font-bold text-[var(--muted)]">ANB:</span>
								{(["I", "II", "III"] as const).map((cls) => (
									<button
										key={cls}
										type="button"
										onClick={() => {
											setAnbClass(cls);
											setAnbAngle(cls === "I" ? 3.0 : cls === "II" ? 5.5 : -1.5);
										}}
										className={`px-2 py-1 rounded text-xs font-bold min-h-[30px] border ${
											anbClass === cls
												? "bg-[var(--teal)] text-white border-[var(--teal)]"
												: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
										}`}
									>
										{cls}
									</button>
								))}
							</div>
						</div>

						{/* 3. Arch Selection Strip */}
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-xs font-bold text-[var(--muted)]">Челюсть:</span>
							{(
								[
									["both", "Обе челюсти"],
									["upper", "Вся ВЧ"],
									["lower", "Вся НЧ"],
									["anterior", "Фронт"],
								] as const
							).map(([key, label]) => (
								<button
									key={key}
									type="button"
									onClick={() => setTargetArch(key as TargetArch)}
									className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border min-w-[40px] min-h-[40px] transition-all ${
										targetArch === key
											? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
									}`}
								>
									{label}
								</button>
							))}
						</div>

						{/* 4. Bracket System & Slot */}
						<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--ink)]">Брекет-система и пропись:</span>
								<div className="flex items-center gap-1">
									{(["0.018", "0.022"] as const).map((s) => (
										<button
											key={s}
											type="button"
											onClick={() => setBracketSlot(s)}
											className={`px-2 py-0.5 rounded text-[11px] font-bold border min-h-[28px] ${
												bracketSlot === s
													? "bg-[var(--teal)] text-white border-[var(--teal)]"
													: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
											}`}
										>
											{s}
										</button>
									))}
								</div>
							</div>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
								{BRACKET_SYSTEMS.slice(0, 4).map((b) => (
									<button
										key={b.id}
										type="button"
										onClick={() => setBracketSystem(b.id)}
										className={`p-2 rounded-lg text-left text-xs font-semibold border cursor-pointer min-h-[44px] transition-all flex flex-col justify-center overflow-hidden min-w-0 ${
											bracketSystem === b.id
												? "border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)] font-bold shadow-xs"
												: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
										}`}
									>
										<div className="w-full min-w-0 overflow-hidden text-left">
											<div className="font-bold text-[var(--ink)] truncate text-xs">{b.label}</div>
											<div className="text-[10px] text-[var(--muted)] truncate">{b.desc}</div>
										</div>
									</button>
								))}
							</div>
						</div>

						{/* 5. Workhorse Archwires */}
						<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--ink)]">Рабочая ортодонтическая дуга:</span>
								<div className="flex items-center gap-1">
									{ARCHWIRE_MATERIALS.map((m: any) => {
										const mId = typeof m === "string" ? m : m.id;
										const mLabel = typeof m === "string" ? m.toUpperCase() : m.badge || m.label || mId.toUpperCase();
										return (
											<button
												key={mId}
												type="button"
												onClick={() => setArchwireMaterial(mId)}
												className={`px-2 py-0.5 rounded text-[11px] font-bold border min-h-[28px] ${
													archwireMaterial === mId
														? "bg-[var(--teal)] text-white border-[var(--teal)]"
														: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
												}`}
											>
												{mLabel}
											</button>
										);
									})}
								</div>
							</div>
							<div className="flex items-center gap-1.5 flex-wrap">
								{WORKHORSE_ARCHWIRES.map((w) => (
									<button
										key={w.id}
										type="button"
										onClick={() => {
											setArchwireMaterial(w.material);
											setArchwireSection(w.section);
										}}
										className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border cursor-pointer min-h-[36px] transition-all ${
											archwireMaterial === w.material && archwireSection === w.section
												? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
												: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
										}`}
									>
										{w.label}
									</button>
								))}
							</div>
						</div>

						{/* 6. Intermaxillary Elastics */}
						<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--ink)]">Межчелюстные эластики:</span>
								<label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
									<input
										type="checkbox"
										checked={selectedActions.includes("elastic_traction")}
										onChange={(e) => {
											setSelectedActions((prev) =>
												e.target.checked ? [...prev, "elastic_traction"] : prev.filter((a) => a !== "elastic_traction"),
											);
										}}
										className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
									/>
									<span>Назначить тяги</span>
								</label>
							</div>
							{selectedActions.includes("elastic_traction") && (
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
									{ELASTIC_SCHEMES.slice(0, 3).map((es) => (
										<button
											key={es.id}
											type="button"
											onClick={() => setElasticScheme(es.id)}
											className={`p-2 rounded-lg text-left text-xs font-semibold border cursor-pointer min-h-[38px] ${
												elasticScheme === es.id
													? "border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)] font-bold"
													: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
											}`}
										>
											{es.name}
										</button>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Right Column: Preview, Billing & Direct Fiscal Checkout (col-span-5) */}
					<div className={`lg:col-span-5 p-4 sm:p-5 flex flex-col gap-4 bg-[var(--paper-soft)] overflow-y-auto ${mobileTab === "preview" ? "flex" : "hidden sm:flex"}`}>
						{/* Billing Summary Box */}
						<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-3 shadow-xs">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1.5">
									<Receipt size={16} className="text-teal-600 dark:text-teal-400" />
									<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
										Расчет услуг визита ({calculatedServices.length})
									</span>
								</div>
								<span className="text-base font-extrabold text-[var(--teal)]">
									{totalRub.toLocaleString("ru-RU")} ₽
								</span>
							</div>

							<div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
								{calculatedServices.map((srv, idx) => (
									<div
										key={`${srv.code}-${idx}`}
										className="flex items-center justify-between text-xs py-1 border-b border-[var(--line)]/50 last:border-b-0"
									>
										<div className="min-w-0 mr-2">
											<div className="font-semibold text-[var(--ink)] truncate">{srv.name}</div>
											<div className="text-[10px] text-[var(--muted)]">{srv.code} · {srv.quantity} шт.</div>
										</div>
										<span className="font-bold text-[var(--ink)] whitespace-nowrap">
											{srv.priceRub} ₽
										</span>
									</div>
								))}
							</div>

							{/* Financial Bridge: Instant Checkout Trigger */}
							<div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--line)]">
								<button
									type="button"
									onClick={handleAddServicesToInvoice}
									className="secondary-button min-h-[44px] h-10 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
									data-testid="bottom-add-services-to-invoice-btn"
									title="Начислить ортодонтические услуги в текущий счет визита"
								>
									<Receipt size={14} className="text-teal-600 dark:text-teal-400" />
									<span>В чек визита</span>
								</button>
								<button
									type="button"
									onClick={() => {
										handleAddServicesToInvoice();
										setIsCheckoutOpen(true);
									}}
									className="secondary-button min-h-[44px] h-10 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 shadow-2xs"
									data-testid="ortho-quick-checkout-btn"
									title="Открыть кассу и принять оплату за ортодонтию"
								>
									<CreditCard size={14} className="text-emerald-500" />
									<span>Оплатить визит</span>
								</button>
							</div>
						</div>

						{/* Diary Notes Preview */}
						<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2 shadow-xs flex-1">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
									Медицинская карта приёма
								</span>
								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={handlePrintCard}
										className="secondary-button h-7 px-2 text-[11px] font-semibold rounded-lg"
										data-testid="bottom-print-protocol-btn"
										title="Печать карты"
									>
										<Printer size={12} />
										<span>Печать</span>
									</button>
								</div>
							</div>
							<textarea
								value={generatedProtocol}
								readOnly
								rows={8}
								className="w-full p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-mono text-[var(--ink)] leading-relaxed resize-none focus:outline-hidden"
							/>
						</div>

						{/* Patient Memo & Actions */}
						<div className="grid grid-cols-2 gap-2 shrink-0">
							<button
								type="button"
								onClick={handleCopyPatientMemo}
								data-testid="ortho-copy-patient-memo-btn"
								className="secondary-button min-h-[44px] px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer"
								title="Скопировать памятку пациенту для WhatsApp/Telegram"
							>
								<Copy size={14} className="text-[var(--primary)] shrink-0" />
								<span className="truncate">Памятка пациенту</span>
							</button>

							<button
								type="button"
								onClick={handlePrintMemo}
								data-testid="ortho-print-patient-memo-btn"
								className="secondary-button min-h-[44px] px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer"
								title="Распечатать памятку пациенту A4"
							>
								<Printer size={14} className="text-[var(--primary)] shrink-0" />
								<span className="truncate">Печать памятки A4</span>
							</button>
						</div>

						{/* STRICTLY ONE PRIMARY CTA BUTTON (Mandate 8am: #0d9488) */}
						<div className="shrink-0 pt-1">
							<button
								type="button"
								onClick={() => {
									handleApplyToVisitNote();
									onClose?.();
								}}
								className="primary-button w-full min-h-[48px] h-12 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer bg-[#0d9488] hover:bg-[#0f766e] text-white"
								data-testid="bottom-apply-protocol-btn"
								title="Зафиксировать ортодонтический протокол в медицинскую карту и закрыть"
							>
								<Check size={18} />
								<span>Зафиксировать ортодонтический протокол</span>
							</button>
						</div>
					</div>
				</div>

				{/* Mobile Sticky Bottom Floating Bar (Apple HIG Natural Thumb Zone) */}
				<div className="sm:hidden sticky bottom-0 inset-x-0 p-3 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] flex items-center gap-2 shrink-0 z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
					{mobileTab === "controls" ? (
						<>
							<button
								type="button"
								onClick={() => setMobileTab("preview")}
								className="secondary-button min-h-[44px] h-11 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shrink-0"
							>
								<Receipt size={15} className="text-[var(--teal)]" />
								<span>Чек ({calculatedServices.length})</span>
							</button>
							<button
								type="button"
								onClick={() => {
									handleApplyToVisitNote();
									onClose?.();
								}}
								className="primary-button flex-1 min-h-[44px] h-11 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-md active:scale-[0.98]"
							>
								<Check size={16} />
								<span className="truncate">Зафиксировать протокол</span>
							</button>
						</>
					) : (
						<>
							<button
								type="button"
								onClick={() => setMobileTab("controls")}
								className="secondary-button min-h-[44px] h-11 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shrink-0"
							>
								<span>← Назад к дугам</span>
							</button>
							<button
								type="button"
								onClick={() => {
									handleApplyToVisitNote();
									onClose?.();
								}}
								className="primary-button flex-1 min-h-[44px] h-11 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-md active:scale-[0.98]"
							>
								<Check size={16} />
								<span className="truncate">Зафиксировать протокол</span>
							</button>
						</>
					)}
				</div>

				{/* Dialogs: CashRegisterCheckoutModal, CephalometricAnalysisModal, OrthodonticPhotoProtocolModal */}
				{isCheckoutOpen && (
					<CashRegisterCheckoutModal
						isOpen={isCheckoutOpen}
						onClose={() => setIsCheckoutOpen(false)}
						patientName={patientName}
						initialAmountKopecks={Math.round(totalRub * 100)}
						invoiceDraftItems={calculatedServices.map((s, idx) => ({
							id: `ortho-srv-${idx}`,
							code: s.code,
							name: s.name,
							category: "orthodontics",
							priceKopecks: Math.round(s.priceRub * 100),
							quantity: s.quantity,
							totalKopecks: Math.round(s.priceRub * s.quantity * 100),
						}))}
					/>
				)}

				<CephalometricAnalysisModal
					isOpen={isCephModalOpen}
					onClose={() => setIsCephModalOpen(false)}
					patientName={patientName}
				/>

				<OrthodonticPhotoProtocolModal
					isOpen={isPhotoModalOpen}
					onClose={() => setIsPhotoModalOpen(false)}
					patientName={patientName}
					doctorName={doctorName}
					clinicName={clinicName}
					onSaveSession={() => {
						setIsPhotoCompleted(true);
						setIsPhotoModalOpen(false);
						showToast("Сессия клинического фотопротокола сохранена", "success");
					}}
				/>
			</div>
		</div>
	);
};

export default OrthodonticVisitScreen;
