import React, { useState, useEffect } from "react";
import {
	Activity,
	AlertCircle,
	ArrowRight,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	DollarSign,
	ExternalLink,
	FileText,
	FlaskConical,
	Layers,
	Loader2,
	MessageSquare,
	Printer,
	QrCode,
	Send,
	Sparkles,
	Truck,
	User,
	Wrench,
	X,
} from "lucide-react";
import { money } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import {
	type DentalLabOrderData,
	type LabOrderStageKey,
	type LabTrackingDrawerProps,
	LAB_ORDER_STAGES,
	calculateLabFinancialSplit,
	generateBarcodeSvg,
	generateQrCodeSvg,
	formatGostOrderNumber,
} from "./labMath";

export function LabTrackingDrawer({
	isOpen,
	onClose,
	order,
	onStageUpdate,
	onFittingDateUpdate,
}: LabTrackingDrawerProps) {
	const [activeStage, setActiveStage] = useState<LabOrderStageKey>("sent_to_lab");
	const [stageNote, setStageNote] = useState<string>("");
	const [isUpdating, setIsUpdating] = useState<boolean>(false);

	// Trial fitting dates state
	const [frameworkTrialDate, setFrameworkTrialDate] = useState<string>("");
	const [ceramicTrialDate, setCeramicTrialDate] = useState<string>("");
	const [deliveryDate, setDeliveryDate] = useState<string>("");

	useEffect(() => {
		if (!order) return;
		setActiveStage(order.currentStage || "sent_to_lab");
		setFrameworkTrialDate(order.frameworkTrialDate ? order.frameworkTrialDate.slice(0, 10) : "");
		setCeramicTrialDate(order.ceramicTrialDate ? order.ceramicTrialDate.slice(0, 10) : "");
		setDeliveryDate(order.deliveryDate ? order.deliveryDate.slice(0, 10) : order.dueDate ? order.dueDate.slice(0, 10) : "");
	}, [order]);

	if (!isOpen || !order) return null;

	const financialSplit = calculateLabFinancialSplit(
		order.priceRub || 0,
		order.doctorSharePct ?? 50,
	);

	const currentStageIndex = LAB_ORDER_STAGES.findIndex((s) => s.id === activeStage);
	const nextStage = currentStageIndex < LAB_ORDER_STAGES.length - 1 ? LAB_ORDER_STAGES[currentStageIndex + 1] : null;

	const handleAdvanceStage = async (targetStage?: LabOrderStageKey) => {
		const stageToSet = targetStage || nextStage?.id;
		if (!stageToSet || !order.id) return;

		setIsUpdating(true);
		try {
			if (onStageUpdate) {
				await onStageUpdate(order.id, stageToSet, stageNote.trim() || undefined);
			}
			setActiveStage(stageToSet);
			setStageNote("");
			showToast(`Этап наряда ЗТЛ обновлен: ${LAB_ORDER_STAGES.find((s) => s.id === stageToSet)?.name}`, "success");
		} catch (err: any) {
			showToast(err.message || "Ошибка обновления этапа ЗТЛ", "error");
		} finally {
			setIsUpdating(false);
		}
	};

	const handleSaveFittingDates = async () => {
		if (!order.id) return;
		setIsUpdating(true);
		try {
			if (onFittingDateUpdate) {
				await onFittingDateUpdate(order.id, {
					frameworkTrialDate: frameworkTrialDate || undefined,
					ceramicTrialDate: ceramicTrialDate || undefined,
					deliveryDate: deliveryDate || undefined,
				});
			}
			showToast("Даты клинических примерок успешно сохранены", "success");
		} catch (err: any) {
			showToast(err.message || "Ошибка сохранения дат примерок", "error");
		} finally {
			setIsUpdating(false);
		}
	};

	const secureToken = order.secureToken || "ZTL-TOKEN-0000";
	const portalUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/#/portal/lab-order/${secureToken}`;

	return (
		<div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end transition-opacity">
			<div
				className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 overflow-hidden"
				role="dialog"
				aria-modal="true"
				aria-labelledby="lab-drawer-title"
			>
				{/* ─── DRAWER HEADER ──────────────────────────────────────────────── */}
				<div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
					<div className="flex items-center gap-3">
						<div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-sm">
							<FlaskConical className="w-6 h-6" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 id="lab-drawer-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white m-0">
									{formatGostOrderNumber(order.secureToken)}
								</h2>
								<span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
									ЗТЛ Трекинг
								</span>
							</div>
							<p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
								Пациент: <span className="font-bold text-slate-800 dark:text-slate-200">{order.patientName || "Пациент"}</span> · Врач: <span className="font-bold text-slate-800 dark:text-slate-200">{order.doctorName || "Лечащий врач"}</span>
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
						aria-label="Закрыть панель трекинга"
					>
						<X className="w-6 h-6" />
					</button>
				</div>

				{/* ─── DRAWER BODY ────────────────────────────────────────────────── */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					
					{/* Quick Restoration Summary Card */}
					<div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
								Параметры реставрации
							</span>
							<span className="text-xs px-2.5 py-1 rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 font-bold">
								Зубы FDI: {order.selectedTeeth?.join(", ") || order.toothFdi || "—"}
							</span>
						</div>
						<div className="grid grid-cols-2 gap-3 text-xs">
							<div>
								<span className="text-slate-500 block">Конструкция:</span>
								<strong className="text-sm text-slate-900 dark:text-slate-100">{order.constructionType || "Одиночная коронка"}</strong>
							</div>
							<div>
								<span className="text-slate-500 block">Материал:</span>
								<strong className="text-sm text-slate-900 dark:text-slate-100">{order.material || "Диоксид циркония"}</strong>
							</div>
							<div>
								<span className="text-slate-500 block">Цвет VITA:</span>
								<strong className="text-sm text-slate-900 dark:text-slate-100">{order.colorVita || "A2"} {order.shadeStump ? `(Культя ${order.shadeStump})` : ""}</strong>
							</div>
							<div>
								<span className="text-slate-500 block">Стоимость ЗТЛ:</span>
								<strong className="text-sm font-bold text-teal-600 dark:text-teal-400 font-mono">{money(financialSplit.totalKopecks / 100)}</strong>
							</div>
						</div>
					</div>

					{/* ─── 7-STAGE MANUFACTURING PROGRESS STEPPER ─────────────────── */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<label className="text-sm font-bold text-slate-900 dark:text-slate-100">
								Технологические этапы изготовления в лаборатории
							</label>
							<span className="text-xs text-slate-500">
								Этап {currentStageIndex + 1} из {LAB_ORDER_STAGES.length}
							</span>
						</div>

						<div className="space-y-2">
							{LAB_ORDER_STAGES.map((stage, idx) => {
								const isCurrent = activeStage === stage.id;
								const isPassed = currentStageIndex > idx;

								return (
									<button
										key={stage.id}
										type="button"
										onClick={() => handleAdvanceStage(stage.id)}
										className={`w-full min-h-[48px] p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
											isCurrent
												? `${stage.color} ring-2 ring-teal-500/30 shadow-md font-bold`
												: isPassed
												? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
												: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60 hover:opacity-100"
										}`}
									>
										<div className="flex items-center gap-3">
											<div
												className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
													isPassed || isCurrent
														? "bg-teal-600 text-white"
														: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
												}`}
											>
												{isPassed ? <Check className="w-4 h-4" /> : stage.step}
											</div>
											<div>
												<div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
													{stage.name}
												</div>
												<div className="text-[11px] text-slate-500 dark:text-slate-400">
													{stage.desc}
												</div>
											</div>
										</div>

										{isCurrent && (
											<span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-600 text-white shadow-sm flex-shrink-0">
												Текущий
											</span>
										)}
									</button>
								);
							})}
						</div>
					</div>

					{/* ─── TRIAL FITTING DATES (КЛИНИЧЕСКИЕ ПРИМЕРКИ) ──────────────── */}
					<div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
								<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
									График клинических примерок и сдачи работы
								</h3>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div className="space-y-1.5">
								<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
									1. Примерка каркаса
								</label>
								<input
									type="date"
									value={frameworkTrialDate}
									onChange={(e) => setFrameworkTrialDate(e.target.value)}
									className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
									2. Примерка керамики
								</label>
								<input
									type="date"
									value={ceramicTrialDate}
									onChange={(e) => setCeramicTrialDate(e.target.value)}
									className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
									3. Финальная сдача
								</label>
								<input
									type="date"
									value={deliveryDate}
									onChange={(e) => setDeliveryDate(e.target.value)}
									className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
								/>
							</div>
						</div>

						<div className="flex justify-end">
							<button
								type="button"
								onClick={handleSaveFittingDates}
								disabled={isUpdating}
								className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm disabled:opacity-50 transition-colors inline-flex items-center gap-2"
							>
								{isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
								Сохранить даты примерок
							</button>
						</div>
					</div>

					{/* ─── TECHNICIAN NOTES & LOG ─────────────────────────────────── */}
					<div className="space-y-2">
						<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
							Заметки зубного техника / Врача к текущему этапу
						</label>
						<div className="flex gap-2">
							<input
								type="text"
								placeholder="Напр. Каркас отфрезерован, требуется коррекция окклюзионного контакта на 16..."
								value={stageNote}
								onChange={(e) => setStageNote(e.target.value)}
								className="flex-1 h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
							/>
							<button
								type="button"
								onClick={() => handleAdvanceStage()}
								disabled={isUpdating || !nextStage}
								className="min-h-[44px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm disabled:opacity-50"
							>
								{isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
								Следующий этап
							</button>
						</div>
					</div>

					{/* ─── FINANCIAL BREAKDOWN ─────────────────────────────────────── */}
					<div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
						<span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
							Финансовый расчет (Копеечная точность)
						</span>
						<div className="grid grid-cols-3 gap-3">
							<div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
								<span className="text-[11px] text-slate-500 block">Стоимость ЗТЛ:</span>
								<span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
									{money(financialSplit.totalKopecks / 100)}
								</span>
							</div>
							<div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
								<span className="text-[11px] text-blue-700 dark:text-blue-300 block">Клиника ({order.clinicSharePct ?? 50}%):</span>
								<span className="text-base font-extrabold text-blue-900 dark:text-blue-100 font-mono">
									{money(financialSplit.clinicAmountRub)}
								</span>
							</div>
							<div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
								<span className="text-[11px] text-amber-700 dark:text-amber-300 block">Врач ({order.doctorSharePct ?? 50}%):</span>
								<span className="text-base font-extrabold text-amber-900 dark:text-amber-100 font-mono">
									{money(financialSplit.doctorAmountRub)}
								</span>
							</div>
						</div>
					</div>

					{/* Barcode & Technician Portal Link */}
					<div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
						<div className="w-48 text-slate-900 dark:text-slate-100" dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(secureToken) }} />
						<div className="flex items-center gap-2">
							<a
								href={portalUrl}
								target="_blank"
								rel="noreferrer"
								className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors"
							>
								<ExternalLink className="w-4 h-4" />
								Портал техника
							</a>
						</div>
					</div>

				</div>

				{/* ─── DRAWER FOOTER ──────────────────────────────────────────────── */}
				<div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex justify-end">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
}
