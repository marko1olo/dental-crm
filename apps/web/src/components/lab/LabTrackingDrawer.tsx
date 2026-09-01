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
import { rublesToKopecks } from "@dental/shared";
import { DentalLabFinancialGate } from "./DentalLabFinancialGate";
import { checkDentalLabFinancialGate } from "./dentalLabFinancialGateEngine";
import { BankInstallmentQrModal } from "../payments/BankInstallmentQrModal";
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
	patientDepositRub,
	stageTotalRub,
	stagePaidRub,
	chiefDoctorName,
	onStageUpdate,
	onFittingDateUpdate,
}: LabTrackingDrawerProps) {
	const [activeStage, setActiveStage] = useState<LabOrderStageKey>("sent_to_lab");
	const [stageNote, setStageNote] = useState<string>("");
	const [isUpdating, setIsUpdating] = useState<boolean>(false);

	// Financial Gate & Installment States
	const [isGateModalOpen, setIsGateModalOpen] = useState<boolean>(false);
	const [pendingTargetStage, setPendingTargetStage] = useState<LabOrderStageKey | null>(null);
	const [gateOverride, setGateOverride] = useState<{
		authorized: boolean;
		doctorName: string;
		timestampIso: string;
		reason: string;
	} | null>(null);
	const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState<boolean>(false);

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

	const financialGateResult = React.useMemo(() => {
		const orderPrice = order.priceRub || 0;
		const stageTotalKopecks = rublesToKopecks(stageTotalRub ?? orderPrice);
		const paidKopecks = rublesToKopecks(stagePaidRub ?? 0);
		const depositKopecks = rublesToKopecks(patientDepositRub ?? 0);
		const orderPriceKopecks = rublesToKopecks(orderPrice);

		return checkDentalLabFinancialGate({
			stageTotalKopecks,
			paidKopecks,
			availableDepositKopecks: depositKopecks,
			labOrderPriceKopecks: orderPriceKopecks,
			minAdvancePercent: 50,
			chiefDoctorOverride: gateOverride ?? undefined,
		});
	}, [order, stageTotalRub, stagePaidRub, patientDepositRub, gateOverride]);

	const currentStageIndex = LAB_ORDER_STAGES.findIndex((s) => s.id === activeStage);
	const nextStage = currentStageIndex < LAB_ORDER_STAGES.length - 1 ? LAB_ORDER_STAGES[currentStageIndex + 1] : null;

	const handleAdvanceStage = async (targetStage?: LabOrderStageKey, forceOverride = false) => {
		const stageToSet = targetStage || nextStage?.id;
		if (!stageToSet || !order.id) return;

		// Проверка финансового шлюза при отправке в лабораторию
		if (
			!forceOverride &&
			(stageToSet === "in_progress" || stageToSet === "sent_to_lab") &&
			!financialGateResult.isGatePassed
		) {
			setPendingTargetStage(stageToSet);
			setIsGateModalOpen(true);
			return;
		}

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
				const datesPayload: {
					frameworkTrialDate?: string;
					ceramicTrialDate?: string;
					deliveryDate?: string;
				} = {};
				if (frameworkTrialDate) datesPayload.frameworkTrialDate = frameworkTrialDate;
				if (ceramicTrialDate) datesPayload.ceramicTrialDate = ceramicTrialDate;
				if (deliveryDate) datesPayload.deliveryDate = deliveryDate;

				await onFittingDateUpdate(order.id, datesPayload);
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
		<div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end transition-opacity">
			<div
				className="w-full max-w-2xl bg-[var(--paper)] h-full shadow-2xl flex flex-col border-l border-[var(--line)] overflow-hidden"
				role="dialog"
				aria-modal="true"
				aria-labelledby="lab-drawer-title"
			>
				{/* ─── DRAWER HEADER ──────────────────────────────────────────────── */}
				<div className="flex items-center justify-between px-6 py-5 border-b border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center gap-3">
						<div className="w-11 h-11 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex items-center justify-center text-[var(--teal)] shadow-sm">
							<FlaskConical className="w-6 h-6" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 id="lab-drawer-title" className="text-base sm:text-lg font-bold text-[var(--ink)] m-0">
									{formatGostOrderNumber(order.secureToken)}
								</h2>
								<span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]">
									ЗТЛ Трекинг
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
								Пациент: <span className="font-bold text-[var(--ink)]">{order.patientName || "Пациент"}</span> · Врач: <span className="font-bold text-[var(--ink)]">{order.doctorName || "Лечащий врач"}</span>
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
						aria-label="Закрыть панель трекинга"
					>
						<X className="w-6 h-6" />
					</button>
				</div>

				{/* ─── DRAWER BODY ────────────────────────────────────────────────── */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					
					{/* Quick Restoration Summary Card */}
					<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
								Параметры реставрации
							</span>
							<span className="text-xs px-2.5 py-1 rounded-lg bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] font-bold">
								Зубы FDI: {order.selectedTeeth?.join(", ") || order.toothFdi || "—"}
							</span>
						</div>
						<div className="grid grid-cols-2 gap-3 text-xs">
							<div>
								<span className="text-[var(--muted)] block">Конструкция:</span>
								<strong className="text-sm text-[var(--ink)]">{order.constructionType || "Одиночная коронка"}</strong>
							</div>
							<div>
								<span className="text-[var(--muted)] block">Материал:</span>
								<strong className="text-sm text-[var(--ink)]">{order.material || "Диоксид циркония"}</strong>
							</div>
							<div>
								<span className="text-[var(--muted)] block">Цвет VITA:</span>
								<strong className="text-sm text-[var(--ink)]">{order.colorVita || "A2"} {order.shadeStump ? `(Культя ${order.shadeStump})` : ""}</strong>
							</div>
							<div>
								<span className="text-[var(--muted)] block">Стоимость ЗТЛ:</span>
								<strong className="text-sm font-bold text-[var(--teal)] font-mono">{money(financialSplit.totalKopecks / 100)}</strong>
							</div>
						</div>
					</div>

					{/* ─── 4 КЛИНИЧЕСКИХ СТАТУСА НАКАЗ-ЗАКАЗА ЗТЛ ─────────────────── */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<label className="text-sm font-bold text-[var(--ink)]">
								Клинические статусы наряда ЗТЛ
							</label>
							<span className="text-xs text-[var(--muted)]">
								{currentStageIndex >= 0 ? `Этап ${currentStageIndex + 1} из ${LAB_ORDER_STAGES.length}` : "Выберите статус"}
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
												? `${stage.color} ring-2 ring-[var(--teal-soft)] shadow-md font-bold`
												: isPassed
												? "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink-2)]"
												: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] opacity-60 hover:opacity-100"
										}`}
									>
										<div className="flex items-center gap-3">
											<div
												className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
													isPassed || isCurrent
														? "bg-[var(--teal)] text-white"
														: "bg-[var(--line)] text-[var(--muted)]"
												}`}
											>
												{isPassed ? <Check className="w-4 h-4" /> : stage.step}
											</div>
											<div>
												<div className="text-xs sm:text-sm font-bold text-[var(--ink)]">
													{stage.name}
												</div>
												<div className="text-[11px] text-[var(--muted)]">
													{stage.desc}
												</div>
											</div>
										</div>

										{isCurrent && (
											<span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[var(--teal)] text-white shadow-sm flex-shrink-0">
												Текущий
											</span>
										)}
									</button>
								);
							})}
						</div>
					</div>

					{/* ─── TRIAL FITTING DATES (КЛИНИЧЕСКИЕ ПРИМЕРКИ) ──────────────── */}
					<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Calendar className="w-4 h-4 text-[var(--teal)]" />
								<h3 className="text-sm font-bold text-[var(--ink)] m-0">
									График клинических примерок и сдачи работы
								</h3>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div className="space-y-1.5">
								<label className="block text-xs font-bold text-[var(--ink)]">
									1. Примерка каркаса
								</label>
								<input
									type="date"
									value={frameworkTrialDate}
									onChange={(e) => setFrameworkTrialDate(e.target.value)}
									className="w-full h-11 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm font-bold text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal)]"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="block text-xs font-bold text-[var(--ink)]">
									2. Примерка керамики
								</label>
								<input
									type="date"
									value={ceramicTrialDate}
									onChange={(e) => setCeramicTrialDate(e.target.value)}
									className="w-full h-11 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm font-bold text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal)]"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="block text-xs font-bold text-[var(--ink)]">
									3. Финальная сдача
								</label>
								<input
									type="date"
									value={deliveryDate}
									onChange={(e) => setDeliveryDate(e.target.value)}
									className="w-full h-11 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm font-bold text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal)]"
								/>
							</div>
						</div>

						<div className="flex justify-end">
							<button
								type="button"
								onClick={handleSaveFittingDates}
								disabled={isUpdating}
								className="min-h-[36px] h-9 px-4 py-1.5 text-xs font-bold rounded-xl bg-[var(--teal)] hover:opacity-90 text-white shadow-sm disabled:opacity-50 transition-all inline-flex items-center gap-2 cursor-pointer"
							>
								{isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
								Сохранить даты примерок
							</button>
						</div>
					</div>

					{/* ─── TECHNICIAN NOTES & LOG ─────────────────────────────────── */}
					<div className="space-y-2">
						<label className="block text-xs font-bold text-[var(--ink)]">
							Заметки зубного техника / Врача к текущему этапу
						</label>
						<div className="flex gap-2">
							<input
								type="text"
								placeholder="Напр. Каркас отфрезерован, требуется коррекция окклюзионного контакта на 16..."
								value={stageNote}
								onChange={(e) => setStageNote(e.target.value)}
								className="flex-1 h-10 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal)]"
							/>
							<button
								type="button"
								onClick={() => handleAdvanceStage()}
								disabled={isUpdating || !nextStage}
								className="min-h-[36px] h-10 px-4 rounded-xl bg-[var(--teal)] hover:opacity-90 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
							>
								{isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
								Следующий этап
							</button>
						</div>
					</div>

					{/* ─── FINANCIAL BREAKDOWN ─────────────────────────────────────── */}
					<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3">
						<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block">
							Финансовый расчет (Копеечная точность)
						</span>
						<div className="grid grid-cols-3 gap-3">
							<div className="p-3 bg-[var(--paper)] rounded-xl border border-[var(--line)]">
								<span className="text-[11px] text-[var(--muted)] block">Стоимость ЗТЛ:</span>
								<span className="text-base font-extrabold text-[var(--ink)] font-mono">
									{money(financialSplit.totalKopecks / 100)}
								</span>
							</div>
							<div className="p-3 bg-[var(--teal-surface)] rounded-xl border border-[var(--teal-soft)]">
								<span className="text-[11px] text-[var(--teal)] block">Клиника ({order.clinicSharePct ?? 50}%):</span>
								<span className="text-base font-extrabold text-[var(--ink)] font-mono">
									{money(financialSplit.clinicAmountRub)}
								</span>
							</div>
							<div className="p-3 bg-[var(--warn-bg,rgba(245,158,11,0.1))] rounded-xl border border-[var(--warn-fg,rgba(245,158,11,0.3))]">
								<span className="text-[11px] text-[var(--warn-fg,#d97706)] block">Врач ({order.doctorSharePct ?? 50}%):</span>
								<span className="text-base font-extrabold text-[var(--ink)] font-mono">
									{money(financialSplit.doctorAmountRub)}
								</span>
							</div>
						</div>
					</div>

					{/* Barcode & Technician Portal Link */}
					<div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
						<div className="w-48 text-[var(--ink)]" dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(secureToken) }} />
						<div className="flex items-center gap-2">
							<a
								href={portalUrl}
								target="_blank"
								rel="noreferrer"
								className="min-h-[36px] h-9 px-3.5 py-1.5 rounded-xl border border-[var(--line)] hover:bg-[var(--line)] text-xs font-bold text-[var(--ink)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
							>
								<ExternalLink className="w-4 h-4" />
								Портал техника
							</a>
						</div>
					</div>

				</div>

				{/* ─── DRAWER FOOTER ──────────────────────────────────────────────── */}
				<div className="px-6 py-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] flex justify-end">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[36px] h-9 px-5 py-1.5 text-xs font-bold rounded-xl border border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--line)] transition-colors cursor-pointer"
					>
						Закрыть
					</button>
				</div>
			</div>

			{/* ─── DENTAL LAB FINANCIAL GATE MODAL ───────────────────────── */}
			{isGateModalOpen && (
				<DentalLabFinancialGate
					isOpen={isGateModalOpen}
					onClose={() => {
						setIsGateModalOpen(false);
						setPendingTargetStage(null);
					}}
					gateResult={financialGateResult}
					patientName={order.patientName || "Пациент"}
					stageTitle={`Наряд ЗТЛ (${order.constructionType || "Протезирование"})`}
					defaultChiefDoctorName={chiefDoctorName || "Д-р Смирнов А. В. (Главный врач)"}
					variant="modal"
					onConfirmOverride={(override) => {
						setGateOverride(override);
						setIsGateModalOpen(false);
						showToast(`Оверрайд главврача авторизован: ${override.doctorName}`, "success");
						if (pendingTargetStage) {
							handleAdvanceStage(pendingTargetStage, true);
							setPendingTargetStage(null);
						}
					}}
					onBlock={() => {
						setIsGateModalOpen(false);
						setPendingTargetStage(null);
						showToast("Перевод этапа наряда заблокирован финансовым контролем", "warning");
					}}
					onOpenInstallmentModal={() => {
						setIsGateModalOpen(false);
						setIsInstallmentModalOpen(true);
					}}
				/>
			)}

			{/* ─── BANK INSTALLMENT QR MODAL ─────────────────────────────── */}
			{isInstallmentModalOpen && (
				<BankInstallmentQrModal
					isOpen={isInstallmentModalOpen}
					onClose={() => setIsInstallmentModalOpen(false)}
					stageTitle={`Наряд ЗТЛ (${order.constructionType || "Протезирование"})`}
					stageAmountKopecks={rublesToKopecks(order.priceRub || 0)}
					patientId={order.patientId}
					patientName={order.patientName || "Пациент"}
					onInstallmentApproved={(approval) => {
						showToast(
							`Рассрочка на сумму ${(order.priceRub || 0).toLocaleString("ru-RU")} ₽ одобрена банком!`,
							"success",
						);
						if (pendingTargetStage) {
							handleAdvanceStage(pendingTargetStage, true);
							setPendingTargetStage(null);
						}
					}}
				/>
			)}
		</div>
	);
}
