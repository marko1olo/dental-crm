import {
	type DentalRadiologyStudyType,
	dentalRadiologyStudyLabels,
	generateRadiologyReferralPayloadFromSoap,
	type RadiologyReferralGoal,
	radiologyReferralGoalLabels,
	renderRadiologyReferralHtml,
} from "@dental/shared";
import { Check, FileText, Printer, Scan, Sparkles, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { DiaryState } from "../useVisitDiaryLogic";

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
	const [studyType, setStudyType] =
		useState<DentalRadiologyStudyType>("cbct_jaw_8x8");
	const [studyGoal, setStudyGoal] =
		useState<RadiologyReferralGoal>("endodontics");
	const [targetTeeth, setTargetTeeth] = useState<string>("");
	const [customReferralNumber, setCustomReferralNumber] = useState<string>("");

	useEffect(() => {
		if (!isOpen) return;
		const icd = (diary.diagnosisIcd10 || "K04.0").toUpperCase();
		const teeth = diary.diagnosisTooth || "";
		setTargetTeeth(teeth);

		if (icd.startsWith("K04.5") || icd.startsWith("K04.8")) {
			setStudyType("cbct_segment_5x5");
			setStudyGoal("periapical_cyst");
		} else if (icd.startsWith("K04")) {
			setStudyType("cbct_segment_5x5");
			setStudyGoal("endodontics");
		} else if (icd.startsWith("K08.1") || icd.startsWith("Z51.8")) {
			setStudyType("cbct_jaw_8x8");
			setStudyGoal("implantology");
		} else if (icd.startsWith("K05.3")) {
			setStudyType("optg_digital_panoramic");
			setStudyGoal("periodontology");
		} else {
			setStudyType("cbct_jaw_8x8");
			setStudyGoal("endodontics");
		}

		setCustomReferralNumber(
			`НАПР-ЛД-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
		);

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, diary.diagnosisIcd10, diary.diagnosisTooth, onClose]);

	if (!isOpen || typeof document === "undefined") return null;

	const patientName = patient?.fullName || "Пациент";
	const patientBirth = patient?.birthDate || "1990-01-01";
	const patientPhone = patient?.phone || "+7 (___) ___-__-__";
	const patientCard =
		patient?.medicalCardNumber || patient?.cardNumber || "043/у";
	const docName = doctorName || "Врач-стоматолог";
	const clinic = clinicName || 'ООО "Денте Клиник"';

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
		diagnosisIcd10: diary.diagnosisIcd10 || "K04.0",
		diagnosisTooth: targetTeeth,
		statusLocalis: diary.statusLocalis,
		studyType,
		studyGoal,
		customReferralNumber,
	});

	const printHtml = renderRadiologyReferralHtml(referralPayload);

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

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			data-testid="radiology-referral-modal"
		>
			<div className="flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal,var(--brand-primary))]">
							<Scan className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base font-bold text-[var(--ink)]">
								Направление на КЛКТ / ОПТГ / Рентген
							</h2>
							<p className="text-xs text-[var(--muted)]">
								Лучевая диагностика · {patientName} (Зубы: {targetTeeth || "все"})
							</p>
						</div>
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

				{/* Body */}
				<div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
					{/* Left: Study parameters */}
					<div className="w-full lg:w-1/2 p-5 overflow-y-auto border-b lg:border-b-0 lg:border-r border-[var(--line)] flex flex-col gap-4">
						{/* Study Type */}
						<div>
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">
								1. Вид исследования:
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

						{/* Clinical Goal */}
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

						{/* Teeth input */}
						<div>
							<label
								htmlFor="ref-teeth-input"
								className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1 block"
							>
								3. Номера зубов (FDI):
							</label>
							<input
								id="ref-teeth-input"
								type="text"
								value={targetTeeth}
								onChange={(e) => setTargetTeeth(e.target.value)}
								placeholder="16, 26, 36..."
								className="w-full min-h-[48px] px-3.5 py-2.5 text-sm font-bold rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--teal,var(--brand-primary))]"
							/>
						</div>
					</div>

					{/* Right: Live Preview */}
					<div className="w-full lg:w-1/2 p-5 bg-[var(--paper-soft)] overflow-y-auto flex flex-col gap-4">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
								Предпросмотр направления:
							</span>
							<span className="text-xs text-[var(--muted)] font-mono">
								{customReferralNumber}
							</span>
						</div>

						<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs shadow-inner font-sans leading-relaxed flex flex-col gap-3">
							<div className="border-b border-[var(--line)] pb-2 text-xs text-[var(--muted)] flex justify-between">
								<div>
									<div className="font-bold text-[var(--ink)] uppercase">
										{clinic}
									</div>
									<div>Направляющая медицинская организация</div>
								</div>
								<div className="text-right font-bold text-[var(--teal,var(--brand-primary))]">
									<div>НАПРАВЛЕНИЕ</div>
									<div>на рентген-диагностику</div>
								</div>
							</div>

							<div className="border-b border-[var(--line)] pb-2 flex flex-col gap-0.5 text-xs text-[var(--ink)]">
								<div>
									Пациент: <strong className="text-[var(--ink)]">{patientName}</strong> (д.р. {patientBirth})
								</div>
								<div>
									Врач: <strong className="text-[var(--ink)]">{docName}</strong>
								</div>
								<div>
									Диагноз (МКБ-10):{" "}
									<strong className="text-[var(--teal,var(--brand-primary))]">
										{diary.diagnosisIcd10 || "K04.0"}
									</strong>
								</div>
							</div>

							<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-1 text-xs">
								<div className="font-bold text-[var(--ink)]">
									Вид исследования:{" "}
									{dentalRadiologyStudyLabels[studyType]}
								</div>
								<div className="text-[var(--muted)]">
									Цель: {radiologyReferralGoalLabels[studyGoal]}
								</div>
								{targetTeeth && (
									<div className="font-bold text-[var(--ink)]">
										Зубы (FDI): {targetTeeth}
									</div>
								)}
							</div>

							<div className="border-t border-[var(--line)] pt-2 text-xs flex justify-between items-end text-[var(--muted)]">
								<div>
									<div>Принцип ALARA / СанПиН соблюдён</div>
									<div className="mt-4">Подпись врача: ______________</div>
								</div>
								<div className="w-12 h-12 rounded-full border border-dashed border-[var(--line-strong,var(--line))] flex items-center justify-center font-bold text-xs text-[var(--muted)]">
									М.П.
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-4 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<span className="text-xs text-[var(--muted)]">
						Направление готово к отправке в рентген-кабинет или печати для пациента.
					</span>
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[48px] px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={handlePrint}
							className="min-h-[48px] inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-black rounded-xl bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-md hover:opacity-90 transition-all cursor-pointer active:scale-95"
							data-testid="print-radiology-referral-btn"
						>
							<Printer className="w-4 h-4" />
							Печать направления (КЛКТ/ОПТГ)
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
};
