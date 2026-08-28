import {
	type DentalRadiologyStudyType,
	dentalRadiologyStudyLabels,
	generateRadiologyReferralPayloadFromSoap,
	type RadiologyReferralGoal,
	radiologyReferralGoalLabels,
	renderRadiologyReferralHtml,
} from "@dental/shared";
import {
	Activity,
	Check,
	FileText,
	Info,
	Layers,
	Printer,
	RotateCw,
	Scan,
	Sparkles,
	Target,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { ADULT_FDI_TEETH, FDI_TOOTH_NAMES, formatRadiationDose } from "./radiologyMath";
import { RADIOLOGY_MODALITIES } from "./types";

export interface RadiologyReferralModalProps {
	isOpen: boolean;
	onClose: () => void;
	patient?: {
		fullName?: string | null | undefined;
		birthDate?: string | null | undefined;
		phone?: string | null | undefined;
		cardNumber?: string | null | undefined;
		medicalCardNumber?: string | null | undefined;
	} | null | undefined;
	diary?: {
		diagnosisIcd10?: string | null | undefined;
		diagnosisTooth?: string | null | undefined;
		statusLocalis?: string | null | undefined;
		[key: string]: any;
	} | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	clinicName?: string | null | undefined;
	initialDiagnosisIcd10?: string | undefined;
	initialTeeth?: string[] | undefined;
	onSuccessReferralCreated?: ((referralData: any) => void) | undefined;
}

const STUDY_TYPES_CATALOG: readonly {
	id: DentalRadiologyStudyType;
	label: string;
	desc: string;
	typicalDoseMicrosv: number;
	badge: string;
}[] = [
	{
		id: "cbct_jaw_8x8",
		label: "3D КЛКТ челюстей (8x8 см)",
		desc: "3D-томография зубных рядов верхней и нижней челюстей для имплантации и эндодонтии",
		typicalDoseMicrosv: 55.0,
		badge: "3D КЛКТ",
	},
	{
		id: "cbct_segment_5x5",
		label: "3D КЛКТ сегмента (5x5 см)",
		desc: "Прицельная 3D-томография 2–3 зубов с высоким разрешением (эндодонтия/периодонтит/киста)",
		typicalDoseMicrosv: 30.0,
		badge: "3D Сегмент",
	},
	{
		id: "cbct_full_maxillofacial_15x15",
		label: "3D КЛКТ ЧЛО и ВНЧС (15x15 см)",
		desc: "Челюстно-лицевая томография, дыхательные пути, суставы ВНЧС (хирургия/ортодонтия)",
		typicalDoseMicrosv: 95.0,
		badge: "3D Maxillo",
	},
	{
		id: "optg_digital_panoramic",
		label: "Ортопантомограмма (ОПТГ)",
		desc: "Панорамный обзорный 2D-снимок всех зубов и костных структур челюстей",
		typicalDoseMicrosv: 18.0,
		badge: "ОПТГ 2D",
	},
	{
		id: "trg_cephalometric_lateral",
		label: "ТРГ (боковая проекция)",
		desc: "Телерентгенограмма черепа для ортодонтического цефалометрического расчета",
		typicalDoseMicrosv: 10.0,
		badge: "ТРГ",
	},
	{
		id: "intraoral_radiovisiography",
		label: "Прицельная радиовизиография (RVG)",
		desc: "Прицельный снимок 1 зуба для контроля пломбирования каналов и апекса",
		typicalDoseMicrosv: 3.0,
		badge: "Визиограф",
	},
];

const CLINICAL_GOALS_CATALOG: readonly {
	id: RadiologyReferralGoal;
	label: string;
	desc: string;
}[] = [
	{
		id: "endodontics",
		label: "Эндодонтия",
		desc: "Анатомия каналов, периодонтит, деструкция верхушки",
	},
	{
		id: "implantology",
		label: "Имплантация",
		desc: "Объем, высота и плотность костной ткани",
	},
	{
		id: "surgery_extraction",
		label: "Хирургия",
		desc: "Удаление ретинированных и дистопированных зубов",
	},
	{
		id: "periapical_cyst",
		label: "Киста / Гранулема",
		desc: "Дифференциальная диагностика периапикальных очагов",
	},
	{
		id: "periodontology",
		label: "Пародонтология",
		desc: "Резорбция костной ткани, глубина карманов",
	},
	{
		id: "orthodontics",
		label: "Ортодонтия",
		desc: "Анализ прикуса, цефалометрия, положение корней",
	},
	{
		id: "tmj_dysfunction",
		label: "Суставы ВНЧС",
		desc: "Дисфункция, положение суставных головок",
	},
	{
		id: "general_screening",
		label: "Первичный скрининг",
		desc: "Комплексная рентген-оценка зубочелюстной системы",
	},
];

const EMPTY_TEETH_LIST: readonly string[] = [];

export const RadiologyReferralModal: React.FC<RadiologyReferralModalProps> = ({
	isOpen,
	onClose,
	patient,
	doctorName,
	doctorSpecialty,
	clinicName,
	initialDiagnosisIcd10 = "K04.0",
	initialTeeth = EMPTY_TEETH_LIST as string[],
	onSuccessReferralCreated,
}) => {
	const modalId = useId();

	// State
	const [studyType, setStudyType] =
		useState<DentalRadiologyStudyType>("cbct_jaw_8x8");
	const [studyGoal, setStudyGoal] =
		useState<RadiologyReferralGoal>("endodontics");
	const [selectedTeeth, setSelectedTeeth] = useState<string[]>(initialTeeth);
	const [customTeethInput, setCustomTeethInput] = useState<string>(
		initialTeeth.join(", "),
	);
	const [diagnosisIcd10, setDiagnosisIcd10] = useState<string>(initialDiagnosisIcd10);
	const [clinicalNotes, setClinicalNotes] = useState<string>("");
	const [customReferralNumber, setCustomReferralNumber] = useState<string>("");
	const [activeTab, setActiveTab] = useState<"form" | "preview">("form");

	const initialTeethKey = initialTeeth.join(",");

	// Synchronize on open
	useEffect(() => {
		if (!isOpen) return;

		const currentYear = new Date().getFullYear();
		const randomNum = Math.floor(1000 + Math.random() * 9000);
		setCustomReferralNumber(`НАПР-РЕНТГЕН-${currentYear}-${randomNum}`);

		if (initialTeeth.length > 0) {
			setSelectedTeeth(initialTeeth);
			setCustomTeethInput(initialTeeth.join(", "));
		}

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, initialTeethKey, onClose]);

	if (!isOpen || typeof document === "undefined") return null;

	const patientFullName = patient?.fullName || "Иванов Иван Иванович";
	const patientBirth = patient?.birthDate || "1990-05-14";
	const patientPhone = patient?.phone || "+7 (999) 000-00-00";
	const patientCard =
		patient?.medicalCardNumber || patient?.cardNumber || "043/у-0012";
	const docName = doctorName || "Др. Смирнов А.В.";
	const clinic = clinicName || 'ООО "Денте Клиник"';

	// Toggle tooth selection
	const handleToggleTooth = (tooth: string) => {
		let updated: string[];
		if (selectedTeeth.includes(tooth)) {
			updated = selectedTeeth.filter((t) => t !== tooth);
		} else {
			updated = [...selectedTeeth, tooth].sort();
		}
		setSelectedTeeth(updated);
		setCustomTeethInput(updated.join(", "));
	};

	// Selected Study Catalog Item
	const selectedStudyItem =
		STUDY_TYPES_CATALOG.find((s) => s.id === studyType) ?? STUDY_TYPES_CATALOG[0]!;

	// Radiation Dose Formatting (>= 13-14px bold per mandate)
	const estimatedDose = formatRadiationDose(selectedStudyItem.typicalDoseMicrosv);

	// Generate Referral Payload
	const referralPayload = generateRadiologyReferralPayloadFromSoap({
		clinic: {
			fullName: clinic,
		},
		patient: {
			fullName: patientFullName,
			birthDate: patientBirth,
			phone: patientPhone,
			medicalCardNumber: patientCard,
		},
		doctor: {
			fullName: docName,
			specialty: doctorSpecialty || "Врач-стоматолог",
		},
		diagnosisIcd10: diagnosisIcd10 || "K04.0",
		diagnosisTooth: customTeethInput || selectedTeeth.join(", "),
		statusLocalis: clinicalNotes || null,
		studyType,
		studyGoal,
		customReferralNumber,
	});

	const printHtml = renderRadiologyReferralHtml(referralPayload);

	// Handle Print
	const handlePrint = () => {
		const printFrame = document.createElement("iframe");
		printFrame.style.position = "fixed";
		printFrame.style.right = "0";
		printFrame.style.bottom = "0";
		printFrame.style.width = "0";
		printFrame.style.height = "0";
		printFrame.style.border = "0";
		document.body.appendChild(printFrame);

		const frameDoc =
			printFrame.contentWindow?.document || printFrame.contentDocument;
		if (frameDoc) {
			frameDoc.open();
			frameDoc.write(printHtml);
			frameDoc.close();
			setTimeout(() => {
				printFrame.contentWindow?.focus();
				printFrame.contentWindow?.print();
				setTimeout(() => {
					document.body.removeChild(printFrame);
					if (onSuccessReferralCreated) {
						onSuccessReferralCreated(referralPayload);
					}
				}, 1000);
			}, 250);
		}
	};

	return createPortal(
		<div
			id={modalId}
			className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-label="Направление на рентгенологическое исследование"
			data-testid="radiology-referral-generator-modal"
		>
			<div className="flex flex-col w-full max-w-5xl max-h-[92vh] rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden">
				{/* ═══════════════════════════════════════════════════════════════════
				    1. HEADER (Touch Target Close Button >= 44x44px)
				    ═══════════════════════════════════════════════════════════════════ */}
				<header className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3.5">
						<div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)]">
							<Scan className="w-6 h-6" />
						</div>
						<div>
							<h2 className="text-base md:text-lg font-bold text-[var(--ink)]">
								Направление на лучевую диагностику (КЛКТ / ОПТГ / ТРГ)
							</h2>
							<p className="text-xs text-[var(--muted)]">
								Пациент: <strong className="text-[var(--ink)]">{patientFullName}</strong> · Карта: {patientCard}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Mobile Tab Toggle */}
						<div className="flex md:hidden items-center p-1 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
							<button
								type="button"
								onClick={() => setActiveTab("form")}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
									activeTab === "form"
										? "bg-[var(--teal)] text-white"
										: "text-[var(--muted)]"
								}`}
							>
								Параметры
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("preview")}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
									activeTab === "preview"
										? "bg-[var(--teal)] text-white"
										: "text-[var(--muted)]"
								}`}
							>
								Печать
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
							title="Закрыть (Esc)"
							data-testid="referral-modal-close-btn"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</header>

				{/* ═══════════════════════════════════════════════════════════════════
				    2. BODY (Parameters Column + Live Print Preview)
				    ═══════════════════════════════════════════════════════════════════ */}
				<div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
					{/* Left: Interactive Form & FDI Grid */}
					<div
						className={`w-full md:w-1/2 p-5 md:p-6 overflow-y-auto border-b md:border-b-0 md:border-r border-[var(--line)] flex flex-col gap-5 ${
							activeTab === "preview" ? "hidden md:flex" : "flex"
						}`}
					>
						{/* 1. Study Type Selection */}
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
									1. Вид исследования (СанПиН / ALARA):
								</span>
								{/* Estimated Dose Badge >= 13-14px bold per mandate */}
								<div
									className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${estimatedDose.badgeClass}`}
								>
									<Activity className="w-3.5 h-3.5" />
									<span>Доза: {estimatedDose.microsvText}</span>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{STUDY_TYPES_CATALOG.map((item) => {
									const isSelected = studyType === item.id;
									return (
										<button
											key={item.id}
											type="button"
											onClick={() => setStudyType(item.id)}
											className={`flex flex-col p-3 rounded-2xl border text-left transition-all min-h-[44px] ${
												isSelected
													? "bg-[var(--teal-surface)] border-2 border-[var(--teal)] text-[var(--ink)] shadow-sm ring-1 ring-[var(--teal-soft)]"
													: "bg-[var(--paper-soft)] border-[var(--line)] hover:border-[var(--teal)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
											data-testid={`referral-study-${item.id}`}
										>
											<div className="flex items-center justify-between w-full mb-1">
												<span className="text-xs font-bold text-[var(--ink)]">
													{item.badge}
												</span>
												<div
													className={`flex items-center justify-center w-5 h-5 rounded-md border ${
														isSelected
															? "bg-[var(--teal)] border-[var(--teal)] text-white"
															: "border-[var(--line)]"
													}`}
												>
													{isSelected && <Check className="w-3.5 h-3.5" />}
												</div>
											</div>
											<span className="text-xs font-semibold text-[var(--ink)] mb-0.5">
												{item.label}
											</span>
											<span className="text-[11px] text-[var(--muted)] leading-tight line-clamp-2">
												{item.desc}
											</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* 2. Clinical Goal Selection */}
						<div>
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">
								2. Клиническая цель исследования:
							</span>
							<div className="grid grid-cols-2 gap-2">
								{CLINICAL_GOALS_CATALOG.map((goal) => {
									const isSelected = studyGoal === goal.id;
									return (
										<button
											key={goal.id}
											type="button"
											onClick={() => setStudyGoal(goal.id)}
											className={`min-h-[44px] p-2.5 rounded-xl border text-left transition-all ${
												isSelected
													? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal)] font-bold shadow-sm"
													: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
											data-testid={`referral-goal-${goal.id}`}
										>
											<div className="text-xs font-bold">{goal.label}</div>
											<div className="text-[10px] text-[var(--muted)] line-clamp-1">
												{goal.desc}
											</div>
										</button>
									);
								})}
							</div>
						</div>

						{/* 3. FDI Tooth Selector Matrix (>= 44x44px touch targets) */}
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
									3. Локализация по формуле FDI (Зубы):
								</span>
								{selectedTeeth.length > 0 && (
									<button
										type="button"
										onClick={() => {
											setSelectedTeeth([]);
											setCustomTeethInput("");
										}}
										className="text-xs text-rose-500 hover:underline font-semibold"
									>
										Сбросить выбор
									</button>
								)}
							</div>

							<div className="p-3 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2">
								{/* Upper jaw */}
								<div className="flex justify-between gap-1 overflow-x-auto pb-1 scrollbar-thin">
									{ADULT_FDI_TEETH.quadrant1.map((tooth) => {
										const isSelected = selectedTeeth.includes(tooth);
										return (
											<button
												key={tooth}
												type="button"
												onClick={() => handleToggleTooth(tooth)}
												className={`min-h-[44px] min-w-[44px] p-2 text-xs font-bold rounded-xl transition-all ${
													isSelected
														? "bg-[var(--teal)] text-white shadow-md font-extrabold scale-105"
														: "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
												}`}
											>
												{tooth}
											</button>
										);
									})}
									<div className="w-px bg-[var(--line)] mx-1" />
									{ADULT_FDI_TEETH.quadrant2.map((tooth) => {
										const isSelected = selectedTeeth.includes(tooth);
										return (
											<button
												key={tooth}
												type="button"
												onClick={() => handleToggleTooth(tooth)}
												className={`min-h-[44px] min-w-[44px] p-2 text-xs font-bold rounded-xl transition-all ${
													isSelected
														? "bg-[var(--teal)] text-white shadow-md font-extrabold scale-105"
														: "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
												}`}
											>
												{tooth}
											</button>
										);
									})}
								</div>

								{/* Lower jaw */}
								<div className="flex justify-between gap-1 overflow-x-auto pt-1 border-t border-[var(--line)] scrollbar-thin">
									{ADULT_FDI_TEETH.quadrant4.map((tooth) => {
										const isSelected = selectedTeeth.includes(tooth);
										return (
											<button
												key={tooth}
												type="button"
												onClick={() => handleToggleTooth(tooth)}
												className={`min-h-[44px] min-w-[44px] p-2 text-xs font-bold rounded-xl transition-all ${
													isSelected
														? "bg-[var(--teal)] text-white shadow-md font-extrabold scale-105"
														: "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
												}`}
											>
												{tooth}
											</button>
										);
									})}
									<div className="w-px bg-[var(--line)] mx-1" />
									{ADULT_FDI_TEETH.quadrant3.map((tooth) => {
										const isSelected = selectedTeeth.includes(tooth);
										return (
											<button
												key={tooth}
												type="button"
												onClick={() => handleToggleTooth(tooth)}
												className={`min-h-[44px] min-w-[44px] p-2 text-xs font-bold rounded-xl transition-all ${
													isSelected
														? "bg-[var(--teal)] text-white shadow-md font-extrabold scale-105"
														: "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
												}`}
											>
												{tooth}
											</button>
										);
									})}
								</div>
							</div>

							{/* Custom Teeth Input */}
							<div className="mt-2">
								<input
									type="text"
									value={customTeethInput}
									onChange={(e) => setCustomTeethInput(e.target.value)}
									placeholder="Или введите вручную: 16, 26, 36-38, Все..."
									className="w-full px-3.5 min-h-[44px] text-xs font-mono rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>
						</div>

						{/* 4. Clinical Diagnosis ICD-10 & Notes */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label
									htmlFor="diagnosis-icd10-input"
									className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1 block"
								>
									Диагноз (МКБ-10):
								</label>
								<input
									id="diagnosis-icd10-input"
									type="text"
									value={diagnosisIcd10}
									onChange={(e) => setDiagnosisIcd10(e.target.value)}
									placeholder="K04.0, K05.3, K08.1..."
									className="w-full px-3.5 min-h-[44px] text-xs font-mono font-bold rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>

							<div>
								<label
									htmlFor="referral-number-input"
									className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1 block"
								>
									Номер направления:
								</label>
								<input
									id="referral-number-input"
									type="text"
									value={customReferralNumber}
									onChange={(e) => setCustomReferralNumber(e.target.value)}
									className="w-full px-3.5 min-h-[44px] text-xs font-mono rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>
						</div>
					</div>

					{/* Right: Live Formatted Print Preview */}
					<div
						className={`w-full md:w-1/2 p-5 md:p-6 bg-[var(--paper-soft)] overflow-y-auto flex flex-col gap-4 ${
							activeTab === "form" ? "hidden md:flex" : "flex"
						}`}
					>
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
								Предпросмотр бланка направления:
							</span>
							<span className="text-xs font-mono font-bold text-[var(--teal)]">
								{customReferralNumber}
							</span>
						</div>

						{/* Document Sheet Container */}
						<div className="p-6 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white text-slate-900 shadow-lg font-sans leading-relaxed flex flex-col gap-4">
							{/* Header */}
							<div className="border-b-2 border-slate-800 pb-3 flex justify-between items-start">
								<div>
									<div className="font-extrabold text-sm uppercase text-slate-900">
										{clinic}
									</div>
									<div className="text-[11px] text-slate-600">
										Направляющая медицинская организация (Лицензия №ЛО-77-01)
									</div>
								</div>
								<div className="text-right">
									<div className="font-black text-sm text-[var(--teal-dark,teal)] uppercase tracking-tight">
										НАПРАВЛЕНИЕ
									</div>
									<div className="text-[11px] text-slate-600 font-semibold">
										на рентгенологическое исследование
									</div>
								</div>
							</div>

							{/* Patient Info */}
							<div className="border-b border-slate-200 pb-3 grid grid-cols-2 gap-2 text-xs">
								<div>
									<span className="text-slate-500">Пациент: </span>
									<strong className="text-slate-900">{patientFullName}</strong>
								</div>
								<div>
									<span className="text-slate-500">Дата рождения: </span>
									<strong>{patientBirth}</strong>
								</div>
								<div>
									<span className="text-slate-500">Мед. карта: </span>
									<strong>{patientCard}</strong>
								</div>
								<div>
									<span className="text-slate-500">Врач: </span>
									<strong>{docName}</strong>
								</div>
							</div>

							{/* Clinical Study Box */}
							<div className="p-4 rounded-xl border-2 border-[var(--teal)] bg-[var(--teal-surface)] flex flex-col gap-2 text-xs">
								<div className="flex justify-between items-center">
									<span className="font-black text-[var(--ink)] text-sm">
										Вид исследования: {dentalRadiologyStudyLabels[studyType]}
									</span>
									<span className="px-2 py-0.5 rounded bg-[var(--teal)] text-white font-bold text-[10px]">
										{estimatedDose.microsvText}
									</span>
								</div>
								<div className="text-slate-800">
									<span className="text-slate-600">Клиническая цель: </span>
									<strong>{radiologyReferralGoalLabels[studyGoal]}</strong>
								</div>
								<div>
									<span className="text-slate-600">Локализация / Зубы (FDI): </span>
									<strong className="text-[var(--teal)] text-sm font-black">
										{customTeethInput || selectedTeeth.join(", ") || "Все зубные ряды"}
									</strong>
								</div>
								<div>
									<span className="text-slate-600">Диагноз (МКБ-10): </span>
									<strong className="font-mono text-[var(--teal)]">
										{diagnosisIcd10 || "K04.0"}
									</strong>
								</div>
							</div>

							{/* Radiation Safety Notice */}
							<div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-700 leading-snug">
								<strong>Примечание по радиационной безопасности (СанПиН 2.6.1.1192-03):</strong>{" "}
								Исследование обосновано клинической необходимостью. Принцип нормирования и
								оптимизации (ALARA) соблюден. Результат и расчетная эффективная доза подлежат
								внесению в карту пациента.
							</div>

							{/* Signatures */}
							<div className="border-t border-slate-300 pt-3 flex justify-between items-end text-xs text-slate-600">
								<div>
									<div>Подпись направляющего врача: ___________________</div>
									<div className="text-[10px] text-slate-400 mt-1">
										Дата выдачи: {new Date().toLocaleDateString("ru-RU")}
									</div>
								</div>
								<div className="w-16 h-16 rounded-full border border-dashed border-slate-400 flex items-center justify-center font-bold text-[10px] text-slate-400">
									М.П.
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* ═══════════════════════════════════════════════════════════════════
				    3. FOOTER (Touch Targets >= 44x44px)
				    ═══════════════════════════════════════════════════════════════════ */}
				<footer className="flex items-center justify-between px-6 py-4 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-2 text-xs text-[var(--muted)]">
						<Info className="w-4 h-4 text-[var(--teal)]" />
						<span>Готово к прямой печати или передаче в рентген-кабинет.</span>
					</div>

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-5 py-2 text-xs md:text-sm font-semibold rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={handlePrint}
							className="inline-flex items-center gap-2 min-h-[44px] px-6 py-2.5 text-xs md:text-sm font-bold rounded-xl bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-lg hover:opacity-95 active:scale-95 transition-all font-extrabold"
							data-testid="print-referral-btn"
						>
							<Printer className="w-4 h-4" />
							<span>Печать направления (КЛКТ/ОПТГ)</span>
						</button>
					</div>
				</footer>
			</div>
		</div>,
		document.body,
	);
};
