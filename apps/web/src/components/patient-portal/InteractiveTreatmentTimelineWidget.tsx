import React, { useState, useMemo } from "react";
import {
	Activity,
	AlertCircle,
	ArrowRight,
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	CreditCard,
	FileCheck2,
	FileText,
	HelpCircle,
	Lock,
	QrCode,
	Shield,
	ShieldCheck,
	Smile,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import {
	triggerHaptic,
	playClinicalAudioFeedback,
} from "../../native/mobileBridge";
import { showToast } from "../GlobalToast";
import type {
	PatientTreatmentPlanProfile,
	PatientTreatmentPlanStage,
	TreatmentStageProcedureItem,
} from "./patientWebappEngine";
import "./interactiveTreatmentTimeline.css";

export interface InteractiveTreatmentTimelineProps {
	readonly planProfile?: PatientTreatmentPlanProfile | undefined;
	readonly onBookStage?: ((stageId: string, stageTitle: string) => void) | undefined;
	readonly onPayStageSbp?: ((stageId: string, amountKopecks: number) => void) | undefined;
	readonly onSignStatutoryConsent?: ((stageId: string, documentTitle: string) => void) | undefined;
}

export interface StatutoryInformedConsent323Model {
	readonly stageId: string;
	readonly stageTitle: string;
	readonly categoryRu: string;
	readonly statutoryActTitle: string;
	readonly legalArticle: string;
	readonly risksAndAlternativesRu: readonly string[];
	readonly doctorFullName: string;
	readonly clinicName: string;
}

const DEFAULT_TREATMENT_STAGES: readonly PatientTreatmentPlanStage[] = [
	{
		id: "stage-1-therapy",
		orderIndex: 1,
		titleRu: "Этап 1: Терапия и терапевтическая санация",
		categoryRu: "Терапия",
		teethFdi: ["14", "15", "26", "36"],
		costKopecks: 2450000, // 24 500.00 ₽
		costRub: 24500,
		status: "completed",
		procedures: [
			{
				id: "proc-101",
				code804n: "A16.07.002.001",
				nameRu: "Лечение глубокого кариеса с анатомической реставрацией",
				toothFdi: "14",
				quantity: 1,
				unitPriceKopecks: 650000,
				unitPriceRub: 6500,
				totalKopecks: 650000,
				totalRub: 6500,
			},
			{
				id: "proc-102",
				code804n: "A16.07.004.001",
				nameRu: "3D-эндодонтическое лечение каналов под микроскопом",
				toothFdi: "26",
				quantity: 1,
				unitPriceKopecks: 1400000,
				unitPriceRub: 14000,
				totalKopecks: 1400000,
				totalRub: 14000,
			},
			{
				id: "proc-103",
				code804n: "A16.07.051",
				nameRu: "Профессиональная гигиена AirFlow и фторирование",
				toothFdi: undefined,
				quantity: 1,
				unitPriceKopecks: 400000,
				unitPriceRub: 4000,
				totalKopecks: 400000,
				totalRub: 4000,
			},
		],
		targetDateRu: "Завершено 28 авг 2026",
	},
	{
		id: "stage-2-surgery",
		orderIndex: 2,
		titleRu: "Этап 2: Хирургия и дентальная имплантация",
		categoryRu: "Хирургия",
		teethFdi: ["36", "46"],
		costKopecks: 9500000, // 95 000.00 ₽
		costRub: 95000,
		status: "in_progress",
		procedures: [
			{
				id: "proc-201",
				code804n: "A16.07.006.002",
				nameRu: "Установка титанового имплантата Osstem TS III CA",
				toothFdi: "36",
				quantity: 1,
				unitPriceKopecks: 4500000,
				unitPriceRub: 45000,
				totalKopecks: 4500000,
				totalRub: 45000,
			},
			{
				id: "proc-202",
				code804n: "A16.07.006.002",
				nameRu: "Установка титанового имплантата Osstem TS III CA",
				toothFdi: "46",
				quantity: 1,
				unitPriceKopecks: 4500000,
				unitPriceRub: 45000,
				totalKopecks: 4500000,
				totalRub: 45000,
			},
			{
				id: "proc-203",
				code804n: "A16.07.007.001",
				nameRu: "Атравматичное удаление корня с сохранением лунки",
				toothFdi: "48",
				quantity: 1,
				unitPriceKopecks: 500000,
				unitPriceRub: 5000,
				totalKopecks: 500000,
				totalRub: 5000,
			},
		],
		targetDateRu: "В процессе (запланировано на 5 сен 2026)",
	},
	{
		id: "stage-3-ortho",
		orderIndex: 3,
		titleRu: "Этап 3: Ортопедия и циркониевые коронки",
		categoryRu: "Ортопедия",
		teethFdi: ["14", "26", "36", "46"],
		costKopecks: 12000000, // 120 000.00 ₽
		costRub: 120000,
		status: "planned",
		procedures: [
			{
				id: "proc-301",
				code804n: "A16.07.004.002",
				nameRu: "Коронка из диоксида циркония Prettau на винтовой фиксации",
				toothFdi: "36",
				quantity: 1,
				unitPriceKopecks: 3000000,
				unitPriceRub: 30000,
				totalKopecks: 3000000,
				totalRub: 30000,
			},
			{
				id: "proc-302",
				code804n: "A16.07.004.002",
				nameRu: "Коронка из диоксида циркония Prettau на винтовой фиксации",
				toothFdi: "46",
				quantity: 1,
				unitPriceKopecks: 3000000,
				unitPriceRub: 30000,
				totalKopecks: 3000000,
				totalRub: 30000,
			},
			{
				id: "proc-303",
				code804n: "A16.07.003.001",
				nameRu: "Керамическая накладка / вкладка E-max",
				toothFdi: "14",
				quantity: 2,
				unitPriceKopecks: 3000000,
				unitPriceRub: 30000,
				totalKopecks: 6000000,
				totalRub: 60000,
			},
		],
		targetDateRu: "Октябрь 2026",
	},
	{
		id: "stage-4-hygiene",
		orderIndex: 4,
		titleRu: "Этап 4: Профгигиена и диспансерное наблюдение",
		categoryRu: "Гигиена",
		teethFdi: [],
		costKopecks: 650000, // 6 500.00 ₽
		costRub: 6500,
		status: "planned",
		procedures: [
			{
				id: "proc-401",
				code804n: "A16.07.051",
				nameRu: "Комплексная контрольная гигиена полости рта и полировка",
				toothFdi: undefined,
				quantity: 1,
				unitPriceKopecks: 450000,
				unitPriceRub: 4500,
				totalKopecks: 450000,
				totalRub: 4500,
			},
			{
				id: "proc-402",
				code804n: "A06.07.007",
				nameRu: "Контрольная 3D КЛКТ диагностика остеоинтеграции",
				toothFdi: undefined,
				quantity: 1,
				unitPriceKopecks: 200000,
				unitPriceRub: 2000,
				totalKopecks: 200000,
				totalRub: 2000,
			},
		],
		targetDateRu: "Ноябрь 2026 (через 2 мес после сдачи)",
	},
];

export const InteractiveTreatmentTimelineWidget: React.FC<InteractiveTreatmentTimelineProps> = ({
	planProfile,
	onBookStage,
	onPayStageSbp,
	onSignStatutoryConsent,
}) => {
	const stages = useMemo(
		() => planProfile?.stages || DEFAULT_TREATMENT_STAGES,
		[planProfile?.stages],
	);

	const [expandedStageIds, setExpandedStageIds] = useState<Record<string, boolean>>({
		"stage-2-surgery": true,
	});

	// 323-FZ Consent Modal State
	const [activeConsent, setActiveConsent] = useState<StatutoryInformedConsent323Model | null>(null);
	const [smsOtpInput, setSmsOtpInput] = useState<string>("");
	const [isSigning, setIsSigning] = useState<boolean>(false);
	const [signedConsentStageIds, setSignedConsentStageIds] = useState<Record<string, boolean>>({
		"stage-1-therapy": true,
	});

	// Totals in exact kopecks
	const totalKopecks = useMemo(
		() => stages.reduce((acc, st) => acc + st.costKopecks, 0),
		[stages],
	);

	const completedKopecks = useMemo(
		() =>
			stages
				.filter((st) => st.status === "completed")
				.reduce((acc, st) => acc + st.costKopecks, 0),
		[stages],
	);

	const progressPercent = totalKopecks > 0 ? Math.round((completedKopecks / totalKopecks) * 100) : 0;

	const toggleStage = (stageId: string) => {
		triggerHaptic("light");
		setExpandedStageIds((prev) => ({
			...prev,
			[stageId]: !prev[stageId],
		}));
	};

	const handleOpenConsentModal = (stage: PatientTreatmentPlanStage) => {
		triggerHaptic("medium");
		setActiveConsent({
			stageId: stage.id,
			stageTitle: stage.titleRu,
			categoryRu: stage.categoryRu,
			statutoryActTitle: `Информированное добровольное согласие на проведение стоматологического вмешательства (${stage.categoryRu})`,
			legalArticle: "Статья 20 Федерального закона № 323-ФЗ «Об основах охраны здоровья граждан в Российской Федерации»",
			risksAndAlternativesRu: [
				"Пациент уведомлен о характере предстоящего медицинского вмешательства, его целях, методах и вероятных рисках.",
				"Разъяснены альтернативные методы лечения и последствия отказа от предложенного медицинского плана.",
				"Пациент предупрежден о необходимости соблюдения назначенного лечебно-охранительного режима и явки на контрольные осмотры.",
			],
			doctorFullName: planProfile?.curatingDoctor || "Д-р Иванов Александр Сергеевич",
			clinicName: "DENTE Стоматологический центр",
		});
		setSmsOtpInput("8492"); // Pre-filled statutory demo SMS code
	};

	const handleConfirmConsentSign = async () => {
		if (!activeConsent) return;
		setIsSigning(true);
		triggerHaptic("success");

		await new Promise((resolve) => setTimeout(resolve, 500));
		playClinicalAudioFeedback("save_success");
		setSignedConsentStageIds((prev) => ({
			...prev,
			[activeConsent.stageId]: true,
		}));
		showToast(`ИДС по 323-ФЗ успешно подписано СМС-кодом ${smsOtpInput}!`, "success");
		onSignStatutoryConsent?.(activeConsent.stageId, activeConsent.statutoryActTitle);
		setIsSigning(false);
		setActiveConsent(null);
	};

	return (
		<div className="treatment-timeline-container" data-testid="interactive-treatment-timeline-widget">
			{/* HERO PROGRESS & SUMMARY */}
			<div className="treatment-timeline-hero">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/30">
							<Activity className="w-4 h-4" />
						</div>
						<div>
							<h3 className="text-sm font-bold text-white">
								{planProfile?.titleRu || "Комплексный план комплексной реабилитации"}
							</h3>
							<p className="text-[11px] text-teal-300">
								Куратор: {planProfile?.curatingDoctor || "Д-р Иванов А.С."}
							</p>
						</div>
					</div>
					<div className="text-right">
						<span className="text-xs font-mono font-bold text-emerald-400">
							{progressPercent}%
						</span>
						<span className="block text-[10px] text-neutral-400">выполнено</span>
					</div>
				</div>

				{/* Progress Track */}
				<div className="treatment-timeline-progress-track">
					<div
						className="treatment-timeline-progress-bar"
						style={{ width: `${Math.max(5, progressPercent)}%` }}
					/>
				</div>

				{/* Financial Breakdown Summary */}
				<div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10 text-xs">
					<div>
						<span className="text-neutral-400 text-[11px]">Общая смета:</span>
						<strong className="block font-mono text-white text-sm">
							{(totalKopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
						</strong>
					</div>
					<div className="text-right">
						<span className="text-neutral-400 text-[11px]">Оплачено:</span>
						<strong className="block font-mono text-emerald-400 text-sm">
							{(completedKopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
						</strong>
					</div>
				</div>
			</div>

			{/* STAGES LIST */}
			<div className="flex flex-col gap-3">
				{stages.map((stage) => {
					const isExpanded = Boolean(expandedStageIds[stage.id]);
					const isSigned = Boolean(signedConsentStageIds[stage.id]);
					const isCompleted = stage.status === "completed";
					const isInProgress = stage.status === "in_progress";

					return (
						<div
							key={stage.id}
							className={`treatment-stage-card ${stage.status}`}
						>
							{/* STAGE HEADER */}
							<div
								onClick={() => toggleStage(stage.id)}
								className="flex items-center justify-between cursor-pointer user-select-none"
							>
								<div className="flex items-center gap-3">
									<div
										className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
											isCompleted
												? "bg-emerald-500 text-white"
												: isInProgress
													? "bg-teal-500 text-white animate-pulse"
													: "bg-neutral-800 text-neutral-400 border border-neutral-700"
										}`}
									>
										{isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : stage.orderIndex}
									</div>

									<div>
										<div className="flex items-center gap-2">
											<h4 className="text-xs font-bold text-white">{stage.titleRu}</h4>
											{stage.teethFdi.length > 0 && (
												<span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300 font-mono border border-neutral-700">
													Зубы: {stage.teethFdi.join(", ")}
												</span>
											)}
										</div>
										<p className="text-[11px] text-neutral-400">{stage.targetDateRu}</p>
									</div>
								</div>

								<div className="flex items-center gap-3">
									<div className="text-right hidden sm:block">
										<span className="text-xs font-mono font-bold text-white">
											{(stage.costKopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
										</span>
									</div>
									<div className="text-neutral-400">
										{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
									</div>
								</div>
							</div>

							{/* STAGE PROCEDURES BREAKDOWN */}
							{isExpanded && (
								<div className="flex flex-col gap-2 pt-2 border-t border-neutral-800">
									<div className="flex items-center justify-between text-[11px] text-neutral-400 pb-1">
										<span>Номенклатура услуг (Приказ Минздрава 804н):</span>
										<span className="text-teal-400 font-semibold">Все включено</span>
									</div>

									<div className="flex flex-col">
										{stage.procedures.map((proc) => (
											<div key={proc.id} className="treatment-proc-row">
												<div className="flex flex-col gap-0.5 pr-2">
													<div className="flex items-center gap-1.5">
														<span className="text-xs text-white font-medium">{proc.nameRu}</span>
														{proc.toothFdi && (
															<span className="text-[10px] font-mono text-teal-300 bg-teal-950/60 px-1 py-0.5 rounded border border-teal-800/40">
																#{proc.toothFdi}
															</span>
														)}
													</div>
													<span className="text-[10px] font-mono text-neutral-500">
														Код: {proc.code804n} • {proc.quantity} шт.
													</span>
												</div>
												<div className="text-right font-mono font-bold text-xs text-neutral-200">
													{(proc.totalKopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
												</div>
											</div>
										))}
									</div>

									{/* STAGE ACTIONS: 323-FZ CONSENT & 1-CLICK BOOKING */}
									<div className="flex items-center justify-between gap-2 pt-3 border-t border-neutral-800 flex-wrap">
										{/* Statutory Consent Button */}
										<button
											type="button"
											onClick={() => handleOpenConsentModal(stage)}
											className={`treatment-action-btn ${isSigned ? "secondary" : "consent"}`}
										>
											{isSigned ? (
												<>
													<FileCheck2 className="w-4 h-4 text-emerald-400" />
													<span className="text-emerald-300">ИДС по 323-ФЗ подписано</span>
												</>
											) : (
												<>
													<FileText className="w-4 h-4" />
													<span>Подписать ИДС по 323-ФЗ</span>
												</>
											)}
										</button>

										<div className="flex items-center gap-2">
											{/* Pay via SBP if not completed */}
											{!isCompleted && onPayStageSbp && (
												<button
													type="button"
													onClick={() => {
														triggerHaptic("light");
														onPayStageSbp(stage.id, stage.costKopecks);
													}}
													className="treatment-action-btn secondary"
												>
													<QrCode className="w-4 h-4 text-teal-400" />
													<span>СБП Оплата</span>
												</button>
											)}

											{/* Book Stage Appointment */}
											{!isCompleted && (
												<button
													type="button"
													onClick={() => {
														triggerHaptic("light");
														onBookStage?.(stage.id, stage.titleRu);
													}}
													className="treatment-action-btn primary"
												>
													<Calendar className="w-4 h-4" />
													<span>Записаться на прием</span>
												</button>
											)}
										</div>
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* STATUTORY 323-FZ CONSENT MODAL */}
			{activeConsent && (
				<div className="treatment-ids-modal-overlay">
					<div className="treatment-ids-modal-content">
						{/* MODAL HEADER */}
						<div className="p-4 border-b border-neutral-800 flex items-center justify-between">
							<div className="flex items-center gap-2.5">
								<div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
									<ShieldCheck className="w-4 h-4" />
								</div>
								<div>
									<h4 className="text-xs font-bold text-white">Информированное согласие (ИДС)</h4>
									<span className="text-[10px] text-neutral-400 font-mono">323-ФЗ ст. 20</span>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setActiveConsent(null)}
								className="w-8 h-8 min-h-[44px] min-w-[44px] rounded-lg text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						{/* MODAL BODY */}
						<div className="p-4 flex flex-col gap-3 overflow-y-auto text-xs leading-relaxed">
							<div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-1.5">
								<strong className="text-white text-xs">{activeConsent.statutoryActTitle}</strong>
								<span className="text-[11px] text-teal-400 font-semibold">{activeConsent.legalArticle}</span>
								<p className="text-[11px] text-neutral-400">
									Лечащий врач: {activeConsent.doctorFullName} • {activeConsent.clinicName}
								</p>
							</div>

							<div className="flex flex-col gap-2">
								<span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
									Существенные условия и риски:
								</span>
								{activeConsent.risksAndAlternativesRu.map((item, idx) => (
									<div key={idx} className="flex items-start gap-2 text-[11px] text-neutral-300">
										<CheckCircle2 className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
										<span>{item}</span>
									</div>
								))}
							</div>

							{/* SMS-OTP SIGNATURE */}
							<div className="p-3 rounded-xl bg-blue-950/30 border border-blue-900/50 flex flex-col gap-2">
								<div className="flex items-center justify-between">
									<span className="text-[11px] font-bold text-blue-300">
										Простая электронная подпись (ПЭП 63-ФЗ):
									</span>
									<span className="text-[10px] text-neutral-400 font-mono">SMS-код отправлен</span>
								</div>
								<div className="flex items-center gap-2">
									<input
										type="text"
										value={smsOtpInput}
										onChange={(e) => setSmsOtpInput(e.target.value)}
										className="min-h-[44px] px-3 rounded-lg bg-neutral-900 border border-neutral-700 text-white font-mono text-center font-bold tracking-widest text-sm flex-1 focus:border-teal-500 focus:outline-none"
										placeholder="Код из СМС"
										maxLength={6}
									/>
									<button
										type="button"
										disabled={isSigning || !smsOtpInput}
										onClick={handleConfirmConsentSign}
										className="treatment-action-btn primary flex-1"
									>
										{isSigning ? (
											<span>Подписание...</span>
										) : (
											<>
												<Lock className="w-4 h-4" />
												<span>Подписать ИДС</span>
											</>
										)}
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
