import {
	type DentalRadiologyStudyType,
	dentalRadiologyStudyLabels,
	generateRadiologyReferralPayloadFromSoap,
	type RadiologyReferralGoal,
	radiologyReferralGoalLabels,
	renderRadiologyReferralHtml,
} from "@dental/shared";
import {
	Check,
	FileText,
	Printer,
	Scan,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { DiaryState } from "../useVisitDiaryLogic";
import {
	CLINICAL_REFERRAL_PRESETS,
	type ReferralPreset,
} from "./referralPresets";

export interface RadiologyReferralModalProps {
	isOpen: boolean;
	onClose: () => void;
	patient: {
		fullName?: string | null;
		birthDate?: string | null;
		phone?: string | null;
		cardNumber?: string | null;
		medicalCardNumber?: string | null;
	} | null;
	diary: DiaryState;
	doctorName?: string | null;
	doctorSpecialty?: string | null;
	clinicName?: string | null;
}

const STUDY_TYPES: readonly {
	id: DentalRadiologyStudyType;
	label: string;
	desc: string;
}[] = [
	{
		id: "cbct_jaw_8x8",
		label: "КЛКТ челюстей (8x8 см)",
		desc: "3D-томография зубных рядов верхней и нижней челюстей для имплантации и эндодонтии",
	},
	{
		id: "cbct_segment_5x5",
		label: "КЛКТ сегмента (5x5 см)",
		desc: "Прицельная 3D-томография 2–3 зубов с высоким разрешением (эндодонтия/киста)",
	},
	{
		id: "cbct_full_maxillofacial_15x15",
		label: "КЛКТ ЧЛО и ВНЧС (15x15 см)",
		desc: "Полная челюстно-лицевая томография, дыхательные пути, суставы ВНЧС (ортодонтия/хирургия)",
	},
	{
		id: "optg_digital_panoramic",
		label: "Ортопантомограмма (ОПТГ)",
		desc: "Панорамный обзорный 2D-снимок всех зубов и костных структур",
	},
	{
		id: "trg_cephalometric_lateral",
		label: "ТРГ (боковая проекция)",
		desc: "Телерентгенограмма черепа для ортодонтического цефалометрического расчета",
	},
	{
		id: "intraoral_radiovisiography",
		label: "Прицельная радиовизиография",
		desc: "Прицельный снимок 1 зуба (контроль пломбирования каналов)",
	},
];

const STUDY_GOALS: readonly { id: RadiologyReferralGoal; label: string }[] = [
	{
		id: "endodontics",
		label: "Эндодонтия (анатомия каналов, периодонтит)",
	},
	{
		id: "implantology",
		label: "Имплантация (объем и плотность кости)",
	},
	{
		id: "surgery_extraction",
		label: "Удаление ретинированных зубов мудрости",
	},
	{
		id: "periapical_cyst",
		label: "Подозрение на кисту / деструкцию кости",
	},
	{
		id: "periodontology",
		label: "Пародонтология (резорбция костных карманов)",
	},
	{
		id: "orthodontics",
		label: "Ортодонтия (смена прикуса, ТРГ)",
	},
	{
		id: "tmj_dysfunction",
		label: "Диагностика суставов ВНЧС",
	},
	{
		id: "general_screening",
		label: "Первичный скрининг полости рта",
	},
];

export const RadiologyReferralModal: React.FC<RadiologyReferralModalProps> = ({
	isOpen,
	onClose,
	patient,
	diary,
	doctorName,
	doctorSpecialty,
	clinicName,
}) => {
	const [activePresetId, setActivePresetId] = useState<string | null>(null);
	const [studyType, setStudyType] =
		useState<DentalRadiologyStudyType>("cbct_jaw_8x8");
	const [studyGoal, setStudyGoal] =
		useState<RadiologyReferralGoal>("implantology");
	const [targetTeeth, setTargetTeeth] = useState<string>("");
	const [diagnosisIcd10, setDiagnosisIcd10] = useState<string>("K08.1");
	const [clinicalJustification, setClinicalJustification] = useState<string>("");
	const [customReferralNumber, setCustomReferralNumber] = useState<string>("");
	const [mobileTab, setMobileTab] = useState<"form" | "preview">("form");

	useEffect(() => {
		if (!isOpen) return;

		const icd = (diary.diagnosisIcd10 || "K08.1").toUpperCase();
		const teeth = diary.diagnosisTooth || "";
		setTargetTeeth(teeth);
		setDiagnosisIcd10(icd);

		// Автоопределение стартового пресета по МКБ-10
		if (icd.startsWith("K08")) {
			setActivePresetId("cbct_both_jaws_preset");
			setStudyType("cbct_jaw_8x8");
			setStudyGoal("implantology");
			setClinicalJustification(
				"3D КЛКТ обеих челюстей для планирования дентальной имплантации и синус-лифтинга. Оценка объема и плотности альвеолярного гребня.",
			);
		} else if (icd.startsWith("K07")) {
			setActivePresetId("trg_lateral_preset");
			setStudyType("trg_cephalometric_lateral");
			setStudyGoal("orthodontics");
			setClinicalJustification(
				"Телерентгенография черепа в боковой проекции для цефалометрического анализа сагиттальных и вертикальных аномалий прикуса.",
			);
		} else if (icd.startsWith("K05") || icd.startsWith("Z01.2")) {
			setActivePresetId("optg_panoramic_preset");
			setStudyType("optg_digital_panoramic");
			setStudyGoal("general_screening");
			setClinicalJustification(
				"Цифровая обзорная ортопантомограмма для первичного скрининга зубочелюстной системы и оценки периодонта.",
			);
		} else if (icd.startsWith("K04.5")) {
			setActivePresetId("cbct_segment_endo_preset");
			setStudyType("cbct_segment_5x5");
			setStudyGoal("periapical_cyst");
			setClinicalJustification(
				"Прицельная КЛКТ сегмента 5х5 см для визуализации анатомии корневых каналов и оценки периапикального очага.",
			);
		} else {
			setActivePresetId("cbct_both_jaws_preset");
			setStudyType("cbct_jaw_8x8");
			setStudyGoal("implantology");
			setClinicalJustification(
				"3D компьютерная томография обеих челюстей для планирования лечения и оценки анатомических ориентиров.",
			);
		}

		const currentYear = new Date().getFullYear();
		const randomNum = Math.floor(1000 + Math.random() * 9000);
		setCustomReferralNumber(`НАПР-КТ-${currentYear}-${randomNum}`);

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, diary.diagnosisIcd10, diary.diagnosisTooth, onClose]);

	const patientName = patient?.fullName || "Пациент";
	const patientBirth = patient?.birthDate || "1990-01-01";
	const patientPhone = patient?.phone || "+7 (___) ___-__-__";
	const patientCard =
		patient?.medicalCardNumber || patient?.cardNumber || "043/у";
	const docName = doctorName || "Врач-стоматолог";
	const clinic = clinicName || 'ООО "Денте Клиник"';

	const handleApplyPreset = (preset: ReferralPreset) => {
		setActivePresetId(preset.id);
		setDiagnosisIcd10(preset.diagnosisIcd10);
		setClinicalJustification(preset.clinicalJustification);
		setStudyType(preset.studyType);
		setStudyGoal(preset.studyGoal);
		if (preset.targetTeeth) setTargetTeeth(preset.targetTeeth);
	};

	const printHtml = useMemo(() => {
		const referralPayload = generateRadiologyReferralPayloadFromSoap({
			clinic: {
				fullName: clinic,
			},
			patient: {
				fullName: patientName,
				birthDate: patientBirth,
				phone: patientPhone,
				medicalCardNumber: patientCard,
			},
			doctor: {
				fullName: docName,
				specialty: doctorSpecialty || "Врач-стоматолог",
			},
			diagnosisIcd10: diagnosisIcd10 || diary.diagnosisIcd10 || "K08.1",
			diagnosisTooth: targetTeeth,
			statusLocalis: clinicalJustification || diary.statusLocalis,
			studyType,
			studyGoal,
			customReferralNumber,
		});

		return renderRadiologyReferralHtml(referralPayload);
	}, [
		clinic,
		customReferralNumber,
		patientName,
		patientBirth,
		patientPhone,
		patientCard,
		docName,
		doctorSpecialty,
		diagnosisIcd10,
		diary.diagnosisIcd10,
		diary.statusLocalis,
		clinicalJustification,
		targetTeeth,
		studyType,
		studyGoal,
	]);

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
			printFrame.contentWindow?.document ||
			printFrame.contentDocument;
		if (frameDoc) {
			frameDoc.open();
			frameDoc.write(printHtml);
			frameDoc.close();
			setTimeout(() => {
				printFrame.contentWindow?.focus();
				printFrame.contentWindow?.print();
				setTimeout(() => {
					document.body.removeChild(printFrame);
				}, 1000);
			}, 250);
		}
	};

	if (!isOpen || typeof document === "undefined") return null;

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			data-testid="radiology-referral-modal"
		>
			<div className="flex flex-col w-full max-w-5xl max-h-[94vh] rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal,var(--brand-primary))] shrink-0">
							<Scan className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-sm sm:text-base font-bold text-[var(--ink)] flex items-center gap-2">
								Направление на рентген-диагностику (КЛКТ / ОПТГ / ТРГ / RVG)
								<span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
									⚡ 1 клик
								</span>
							</h2>
							<p className="text-xs text-[var(--muted)]">
								{clinic} · Пациент: {patientName} (д.р. {patientBirth}) · Карта: {patientCard}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Mobile tab toggle */}
						<div className="flex lg:hidden items-center p-0.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<button
								type="button"
								onClick={() => setMobileTab("form")}
								className={`min-h-[44px] px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
									mobileTab === "form"
										? "bg-[var(--teal)] text-[var(--on-teal,white)]"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Параметры
							</button>
							<button
								type="button"
								onClick={() => setMobileTab("preview")}
								className={`min-h-[44px] px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
									mobileTab === "preview"
										? "bg-[var(--teal)] text-[var(--on-teal,white)]"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Бланк
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="min-h-[48px] min-w-[48px] flex items-center justify-center p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer"
							aria-label="Закрыть окно направления"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* 1-Click Clinical Presets Bar (Dominant Hot Path per Mandate 8e) */}
				<div className="px-4 sm:px-6 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)]/50 shrink-0">
					<div className="flex items-center justify-between mb-2">
						<span className="text-xs font-black uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
							<Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
							Готовые рентгенологические пресеты (выдача за 5 секунд):
						</span>
						<span className="text-[11px] text-[var(--muted)] hidden sm:inline">
							Нажмите пресет для мгновенного заполнения бланка
						</span>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
						{CLINICAL_REFERRAL_PRESETS.map((preset) => {
							const isSelected = activePresetId === preset.id;
							return (
								<button
									key={preset.id}
									type="button"
									onClick={() => handleApplyPreset(preset)}
									className={`flex flex-col text-left p-2.5 min-h-[48px] rounded-xl border transition-all cursor-pointer touch-manipulation relative ${
										isSelected
											? "bg-[var(--teal-surface)] border-[var(--teal)] shadow-sm ring-1 ring-[var(--teal)] text-[var(--ink)]"
											: "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--teal,var(--brand-primary))]/40 text-[var(--muted)] hover:text-[var(--ink)]"
									}`}
									data-testid={`preset-btn-${preset.id}`}
								>
									<div className="flex items-center justify-between gap-1 mb-1">
										<span className="text-[10px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]">
											{preset.badge}
										</span>
										{isSelected && (
											<span className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--teal)] text-white text-[10px]">
												<Check className="w-3 h-3" />
											</span>
										)}
									</div>
									<span className="text-xs font-bold text-[var(--ink)] leading-snug line-clamp-2">
										{preset.shortLabel}
									</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* Body */}
				<div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
					{/* Left Column: Form & Parameters */}
					<div
						className={`w-full lg:w-1/2 p-4 sm:p-5 overflow-y-auto border-b lg:border-b-0 lg:border-r border-[var(--line)] flex flex-col gap-4 ${
							mobileTab === "preview" ? "hidden lg:flex" : "flex"
						}`}
					>
						{/* Study Type Selection */}
						<div>
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">
								1. Вид рентгенологического исследования:
							</span>
							<div className="flex flex-col gap-2">
								{STUDY_TYPES.map((type) => {
									const isSelected = studyType === type.id;
									return (
										<button
											key={type.id}
											type="button"
											onClick={() => setStudyType(type.id)}
											className={`flex items-start justify-between p-3 min-h-[48px] rounded-xl border text-left transition-all cursor-pointer touch-manipulation ${
												isSelected
													? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--ink)] shadow-sm ring-1 ring-[var(--teal)]"
													: "bg-[var(--paper-soft)] border-[var(--line)] hover:border-[var(--teal,var(--brand-primary))]/30 text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
											data-testid={`study-type-${type.id}`}
										>
											<div className="flex flex-col gap-0.5">
												<span className="text-xs sm:text-sm font-extrabold text-[var(--ink)]">
													{type.label}
												</span>
												<span className="text-xs text-[var(--muted)] line-clamp-1">
													{type.desc}
												</span>
											</div>
											<div
												className={`flex items-center justify-center w-5 h-5 rounded-md shrink-0 mt-0.5 border ${
													isSelected
														? "bg-[var(--teal-fill,var(--teal))] border-[var(--teal)] text-[var(--on-teal,white)]"
														: "border-[var(--line)]"
												}`}
											>
												{isSelected && <Check className="w-3.5 h-3.5" />}
											</div>
										</button>
									);
								})}
							</div>
						</div>

						{/* Clinical Goal Selection */}
						<div>
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">
								2. Клиническая цель:
							</span>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{STUDY_GOALS.map((goal) => {
									const isSelected = studyGoal === goal.id;
									return (
										<button
											key={goal.id}
											type="button"
											onClick={() => setStudyGoal(goal.id)}
											className={`p-3 min-h-[48px] rounded-xl border text-left text-xs sm:text-sm font-bold transition-all cursor-pointer touch-manipulation flex items-center ${
												isSelected
													? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal,var(--brand-primary))] ring-1 ring-[var(--teal)]"
													: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
											data-testid={`study-goal-${goal.id}`}
										>
											{goal.label}
										</button>
									);
								})}
							</div>
						</div>

						{/* Teeth Input */}
						<div>
							<label
								htmlFor="ref-teeth-input"
								className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1 block"
							>
								3. Область исследования / Номера зубов (FDI):
							</label>
							<input
								id="ref-teeth-input"
								type="text"
								value={targetTeeth}
								onChange={(e) => setTargetTeeth(e.target.value)}
								placeholder="18–48 (Обе челюсти) или конкретные зубы: 16, 26, 36..."
								className="w-full min-h-[48px] px-3.5 py-2.5 text-sm font-bold rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--teal,var(--brand-primary))]"
							/>
						</div>

						{/* Diagnosis & Justification */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label
									htmlFor="ref-icd-input"
									className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1 block"
								>
									Диагноз (МКБ-10):
								</label>
								<input
									id="ref-icd-input"
									type="text"
									value={diagnosisIcd10}
									onChange={(e) => setDiagnosisIcd10(e.target.value)}
									placeholder="K08.1"
									className="w-full min-h-[48px] px-3.5 py-2.5 text-sm font-bold rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--teal,var(--brand-primary))]"
								/>
							</div>
							<div>
								<label
									htmlFor="ref-num-input"
									className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1 block"
								>
									Номер направления:
								</label>
								<input
									id="ref-num-input"
									type="text"
									value={customReferralNumber}
									onChange={(e) => setCustomReferralNumber(e.target.value)}
									placeholder="НАПР-КТ-2026-001"
									className="w-full min-h-[48px] px-3.5 py-2.5 text-sm font-bold rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--teal,var(--brand-primary))]"
								/>
							</div>
						</div>

						<div>
							<label
								htmlFor="ref-justification-input"
								className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1 block"
							>
								Клиническое обоснование:
							</label>
							<textarea
								id="ref-justification-input"
								rows={2}
								value={clinicalJustification}
								onChange={(e) => setClinicalJustification(e.target.value)}
								placeholder="3D КЛКТ для оценки объема альвеолярного отростка..."
								className="w-full min-h-[56px] p-3 text-xs sm:text-sm rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal,var(--brand-primary))]"
							/>
						</div>
					</div>

					{/* Right Column: Live Printable Document Preview */}
					<div
						className={`w-full lg:w-1/2 p-4 sm:p-5 bg-[var(--paper-soft)]/40 overflow-y-auto flex flex-col gap-3 ${
							mobileTab === "form" ? "hidden lg:flex" : "flex"
						}`}
					>
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
								<FileText className="w-3.5 h-3.5" />
								Предпросмотр бланка направления на печать:
							</span>
							<span className="text-[11px] text-[var(--muted)] font-mono">
								{customReferralNumber}
							</span>
						</div>

						{/* Paper Sheet Preview Container */}
						<div className="p-5 sm:p-7 rounded-xl bg-white text-slate-900 border border-[var(--line)] shadow-sm font-serif text-xs leading-relaxed flex flex-col gap-4">
							{/* Official Header */}
							<div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 text-xs">
								<div>
									<div className="font-extrabold uppercase text-sm">
										{clinic}
									</div>
									<div className="text-[11px] text-slate-600">Направляющая стоматологическая организация</div>
								</div>
								<div className="text-right">
									<div className="text-sm font-extrabold uppercase text-teal-800">НАПРАВЛЕНИЕ</div>
									<div className="text-[11px] text-slate-600">на рентгенологическое исследование</div>
									<div className="text-[10px] text-slate-500 mt-0.5 font-mono">{customReferralNumber}</div>
								</div>
							</div>

							{/* Patient Data */}
							<div className="border-b border-slate-200 pb-2.5 flex flex-col gap-1 text-xs">
								<div>
									Пациент: <strong className="text-slate-900">{patientName}</strong> (д.р. {patientBirth})
								</div>
								<div>
									Врач: <strong className="text-slate-900">{docName}</strong> ({doctorSpecialty || "Врач-стоматолог"})
								</div>
								<div>
									Диагноз (МКБ-10):{" "}
									<strong className="text-teal-700 font-mono">
										{diagnosisIcd10}
									</strong>
								</div>
							</div>

							{/* Study Details */}
							<div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col gap-1.5 text-xs">
								<div className="font-bold text-slate-900">
									Вид исследования:{" "}
									<span className="text-teal-800">{dentalRadiologyStudyLabels[studyType]}</span>
								</div>
								<div className="text-slate-600">
									Цель: {radiologyReferralGoalLabels[studyGoal]}
								</div>
								<div className="font-bold text-slate-900">
									Область исследования (FDI): {targetTeeth || "Все зубы / Обе челюсти"}
								</div>
								{clinicalJustification && (
									<div className="text-[11px] text-slate-600 border-t border-slate-200 pt-1.5 mt-1">
										Обоснование: {clinicalJustification}
									</div>
								)}
							</div>

							{/* Radiation Safety Notice */}
							<div className="text-[10px] text-slate-500 bg-amber-50 border border-amber-200 rounded p-2">
								Принцип ALARA соблюден: исследование обосновано диагностической необходимостью, дозовая нагрузка минимальна (СанПиН 2.6.1.1192-03).
							</div>

							{/* Footer Signatures */}
							<div className="border-t border-slate-900 pt-3 text-xs flex justify-between items-end text-slate-600">
								<div>
									<div>Направивший врач: <strong>{docName}</strong></div>
									<div className="mt-3">Подпись врача: ______________</div>
								</div>
								<div className="w-12 h-12 rounded-full border border-dashed border-slate-400 flex items-center justify-center font-bold text-xs text-slate-400">
									М.П.
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Footer Bar (Never disabled, instant print) */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<span className="text-xs text-[var(--muted)] hidden sm:inline">
						Направление на КЛКТ/ОПТГ/ТРГ готово к печати для пациента или рентген-кабинета.
					</span>
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[48px] px-4 py-2 text-xs sm:text-sm font-bold rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={handlePrint}
							className="min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-black rounded-xl bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-md hover:opacity-90 transition-all cursor-pointer active:scale-95 flex-1 sm:flex-none"
							data-testid="print-radiology-referral-btn"
						>
							<Printer className="w-4 h-4" />
							Печать направления на рентген (КЛКТ / ОПТГ)
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
};
