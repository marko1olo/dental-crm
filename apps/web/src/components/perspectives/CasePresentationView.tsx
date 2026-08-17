import { formatKopecksRu } from "@dental/shared";
import { AnimatePresence, motion } from "framer-motion";
import {
	AlertCircle,
	ArrowLeft,
	Award,
	Calculator,
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Clock,
	Copy,
	Crown,
	FileText,
	Heart,
	Info,
	MessageSquare,
	Percent,
	Phone,
	Printer,
	QrCode,
	RefreshCw,
	Send,
	Share2,
	Shield,
	ShieldCheck,
	Sparkles,
	Star,
	Stethoscope,
	User,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { usePatientStore } from "../../store/patientStore";
import { usePerspectiveStore } from "../../store/perspectiveStore";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import type { ToothState } from "../odontogram/ToothChart";
import {
	type CasePlanTier,
	type CasePresentationTooth,
	calculateInstallmentMonthly,
	calculateNdflRefund,
	formatPresentationMessengerText,
	generate3TierPlans,
	pluralizeRu,
	type SavedTreatmentPlan,
} from "./casePresentationPricing";

export function CasePresentationView() {
	const { dashboard, auth } = useAppLogicContext();
	const setPerspective = usePerspectiveStore((s) => s.setPerspective);
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);

	// 1. Patient selection & active patient resolution
	const activePatient = useMemo(() => {
		if (!dashboard?.patients || dashboard.patients.length === 0) return null;
		if (selectedPatientId) {
			const found = dashboard.patients.find((p) => p.id === selectedPatientId);
			if (found) return found;
		}
		if (dashboard?.activeVisit?.patientId) {
			const found = dashboard.patients.find(
				(p) => p.id === dashboard.activeVisit?.patientId,
			);
			if (found) return found;
		}
		return dashboard.patients[0] ?? null;
	}, [dashboard?.patients, dashboard?.activeVisit?.patientId, selectedPatientId]);

	// 2. State for live odontogram findings and saved plans
	const [toothStates, setToothStates] = useState<CasePresentationTooth[]>([]);
	const [savedPlans, setSavedPlans] = useState<SavedTreatmentPlan[]>([]);
	const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
	const [isPatientDropdownOpen, setIsPatientDropdownOpen] =
		useState<boolean>(false);

	// 3. Selection & Fintech UI state
	const [selectedTierId, setSelectedTierId] = useState<string>("optimum");
	const [installmentMonths, setInstallmentMonths] = useState<number>(12);
	const [isHighCostEligible, setIsHighCostEligible] = useState<boolean>(true);

	// 4. Modal state for sending via Messenger / WhatsApp
	const [isMessengerModalOpen, setIsMessengerModalOpen] =
		useState<boolean>(false);
	const [messengerChannel, setMessengerChannel] = useState<
		"whatsapp" | "telegram" | "sms" | "copy"
	>("whatsapp");
	const [customMessage, setCustomMessage] = useState<string>("");
	const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);

	// Load patient's live tooth states and saved treatment plans
	const loadPatientClinicalData = useCallback(async () => {
		if (!activePatient?.id) return;
		setIsLoadingData(true);
		try {
			// Fetch tooth states (odontogram findings)
			const statesRes = await fetch(
				`/api/patients/${activePatient.id}/tooth-states`,
				{
					headers: denteAdminSecretRequestHeaders(),
				},
			);
			if (statesRes.ok) {
				const data = await statesRes.json();
				const list = Array.isArray(data)
					? data
					: Array.isArray(data?.states)
						? data.states
						: [];
				const mapped: CasePresentationTooth[] = list.map((item: any) => ({
					toothNumber: Number(item.toothNumber),
					state: (item.state || "Healthy") as ToothState,
					surfaces: Array.isArray(item.surfaces) ? item.surfaces : [],
				}));
				setToothStates(mapped);
			}

			// Fetch existing treatment plans
			const plansRes = await fetch(
				`/api/patients/${activePatient.id}/treatment-plans`,
				{
					headers: denteAdminSecretRequestHeaders(),
				},
			);
			if (plansRes.ok) {
				const pData = await plansRes.json();
				const pList = Array.isArray(pData?.plans) ? pData.plans : [];
				setSavedPlans(pList);
			}
		} catch (err) {
			logger.error("[CasePresentationView] Error loading clinical data", err);
		} finally {
			setIsLoadingData(false);
		}
	}, [activePatient?.id]);

	useEffect(() => {
		void loadPatientClinicalData();
	}, [loadPatientClinicalData]);

	// Dynamically generate 3-Tier proposals from patient's teeth & clinic catalog
	const planTiers: CasePlanTier[] = useMemo(() => {
		const catalog = dashboard?.serviceCatalog;
		return generate3TierPlans(toothStates, catalog, savedPlans);
	}, [toothStates, dashboard?.serviceCatalog, savedPlans]);

	// Keep selection valid when tiers change
	useEffect(() => {
		if (planTiers.length > 0) {
			const exists = planTiers.some((t) => t.id === selectedTierId);
			if (!exists) {
				const recommended = planTiers.find((t) => t.isRecommended);
				setSelectedTierId(recommended?.id ?? planTiers[0]!.id);
			}
		}
	}, [planTiers, selectedTierId]);

	const currentPlan: CasePlanTier = useMemo(() => {
		const found = planTiers.find((t) => t.id === selectedTierId);
		return found ?? planTiers[0]!;
	}, [planTiers, selectedTierId]);

	// Exact Kopeck Fintech Calculations
	const planKopecks = useMemo(
		() => currentPlan.totalKopecks,
		[currentPlan.totalKopecks],
	);

	const { taxRefundKopecks, finalPriceWithRefundKopecks } = useMemo(
		() => calculateNdflRefund(planKopecks, isHighCostEligible),
		[planKopecks, isHighCostEligible],
	);

	const monthlyInstallmentKopecks = useMemo(
		() => calculateInstallmentMonthly(planKopecks, installmentMonths),
		[planKopecks, installmentMonths],
	);

	// Clinical summary breakdown
	const clinicalSummary = useMemo(() => {
		const caries = toothStates.filter((t) => t.state === "Caries").length;
		const pulpitis = toothStates.filter((t) => t.state === "Pulpitis").length;
		const periodontitis = toothStates.filter(
			(t) => t.state === "Periodontitis",
		).length;
		const missing = toothStates.filter(
			(t) => t.state === "Missing" || t.state === "Planned_Implant",
		).length;
		const crowns = toothStates.filter((t) => t.state === "Crown").length;

		const parts: string[] = [];
		if (caries > 0)
			parts.push(`${caries} ${pluralizeRu(caries, "кариес", "кариеса", "кариесов")}`);
		if (pulpitis > 0)
			parts.push(
				`${pulpitis} ${pluralizeRu(pulpitis, "пульпит", "пульпита", "пульпитов")}`,
			);
		if (periodontitis > 0)
			parts.push(
				`${periodontitis} ${pluralizeRu(periodontitis, "периодонтит", "периодонтита", "периодонтитов")}`,
			);
		if (missing > 0)
			parts.push(
				`${missing} ${pluralizeRu(missing, "имплантат", "имплантата", "имплантатов")}`,
			);
		if (crowns > 0)
			parts.push(
				`${crowns} ${pluralizeRu(crowns, "коронка", "коронки", "коронок")}`,
			);

		return parts.length > 0 ? parts.join(" · ") : "Зубная формула санирована";
	}, [toothStates]);

	// Print Action
	const handlePrintPresentation = () => {
		window.print();
	};

	// Open Messenger Modal with Pre-filled formatted proposal
	const handleOpenMessengerModal = () => {
		const text = formatPresentationMessengerText(
			activePatient?.fullName || "Уважаемый Пациент",
			currentPlan,
			installmentMonths,
			isHighCostEligible,
			dashboard?.clinicSettings?.profile?.brandName || "Клиника ДЕНТЕ",
		);
		setCustomMessage(text);
		setIsMessengerModalOpen(true);
	};

	// Execute Send Message to Patient
	const handleSendMessage = async () => {
		if (!activePatient?.id) {
			showToast("Пациент не выбран", "error");
			return;
		}

		if (messengerChannel === "copy") {
			try {
				await navigator.clipboard.writeText(customMessage);
				showToast(
					"Текст предложения скопирован в буфер обмена",
					"success",
					6000,
				);
				setIsMessengerModalOpen(false);
			} catch {
				showToast("Не удалось скопировать текст", "error");
			}
			return;
		}

		if (messengerChannel === "whatsapp") {
			setIsSendingMessage(true);
			try {
				const res = await fetch("/api/whatsapp/send", {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						patientId: activePatient.id,
						message: customMessage,
					}),
				});

				const raw = await res.text();
				if (!res.ok) {
					logger.error(`[case-presentation-send] ${res.status}: ${raw}`);
					if (res.status === 422) {
						showToast(
							"У пациента не указан корректный номер телефона для WhatsApp",
							"error",
							8000,
						);
					} else if (res.status === 400) {
						showToast(
							"Шлюз WhatsApp не настроен. Скопируйте текст предложения вручную.",
							"error",
							10000,
						);
					} else {
						showToast(
							`Ошибка отправки сообщения: статус ${res.status}`,
							"error",
						);
					}
					return;
				}

				showToast(
					`План «${currentPlan.title}» успешно отправлен пациенту в WhatsApp!`,
					"success",
					8000,
				);
				setIsMessengerModalOpen(false);
			} catch (e) {
				logger.error("[case-presentation-send] Failed to send", e);
				showToast(
					"Сбой отправки: проверьте подключение к сети или скопируйте текст",
					"error",
				);
			} finally {
				setIsSendingMessage(false);
			}
			return;
		}

		// Fallback for Telegram / SMS
		try {
			await navigator.clipboard.writeText(customMessage);
			showToast(
				`Текст для ${messengerChannel.toUpperCase()} скопирован. Откройте чат с пациентом.`,
				"success",
				8000,
			);
			setIsMessengerModalOpen(false);
		} catch {
			showToast("Текст скопирован", "info");
			setIsMessengerModalOpen(false);
		}
	};

	const getTierIcon = (tier: CasePlanTier) => {
		if (tier.isSavedPlan)
			return (
				<Award size={22} className="text-amber-600 dark:text-amber-400" />
			);
		if (tier.id === "premium")
			return (
				<Crown size={22} className="text-purple-600 dark:text-purple-400" />
			);
		if (tier.id === "optimum")
			return (
				<Sparkles size={22} className="text-teal-600 dark:text-teal-400" />
			);
		return <Shield size={22} className="text-slate-500 dark:text-slate-400" />;
	};

	return (
		<div
			data-testid="case-presentation-view"
			className="case-presentation min-h-screen bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950 text-[var(--ink,#0f172a)] dark:text-slate-100 flex flex-col p-4 md:p-8 select-none"
		>
			{/* Top Bar for Patient Presentation */}
			<header className="flex flex-wrap items-center justify-between gap-4 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-3xl p-5 shadow-sm">
				<div className="flex items-center gap-4 flex-wrap">
					<button
						type="button"
						onClick={() => setPerspective("standard")}
						className="min-h-[48px] px-4 rounded-2xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-100 font-bold flex items-center gap-2 border border-[var(--line,#cbd5e1)] dark:border-slate-700 active:scale-95 transition-all text-sm cursor-pointer shadow-sm"
						title="Вернуться к рабочему столу клиники"
					>
						<ArrowLeft size={18} />
						<span>Закрыть экран презентации</span>
					</button>

					<div className="relative">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-xs uppercase tracking-widest font-extrabold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-3 py-0.5 rounded-full border border-teal-500/40">
								Второй экран · Презентация планов лечения
							</span>
							<span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
								<Stethoscope size={14} className="text-teal-600" />
								<span>{clinicalSummary}</span>
							</span>
						</div>

						<div className="flex items-center gap-2 mt-1">
							<h1 className="text-xl md:text-2xl font-black text-[var(--ink,#0f172a)] dark:text-white m-0 flex items-center gap-2 flex-wrap">
								<span>План лечения для:</span>
								<button
									type="button"
									onClick={() =>
										setIsPatientDropdownOpen(!isPatientDropdownOpen)
									}
									className="text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 cursor-pointer font-black"
								>
									<span>
										{activePatient?.fullName || "Уважаемого Пациента"}
									</span>
									<ChevronDown size={18} />
								</button>
							</h1>

							{isLoadingData ? (
								<RefreshCw
									size={16}
									className="animate-spin text-teal-600 ml-2"
								/>
							) : null}
						</div>

						{/* Patient Selector Dropdown */}
						{isPatientDropdownOpen && dashboard?.patients ? (
							<div className="absolute top-full left-0 mt-2 w-80 max-h-64 overflow-y-auto bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 space-y-1">
								<div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
									Выберите пациента клиники:
								</div>
								{dashboard.patients.map((p) => (
									<button
										key={p.id}
										type="button"
										onClick={() => {
											setSelectedPatientId(p.id);
											setIsPatientDropdownOpen(false);
										}}
										className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
											p.id === activePatient?.id
												? "bg-teal-50 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200 font-bold border border-teal-500/30"
												: "hover:bg-[var(--surface,#f1f5f9)] dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200"
										}`}
									>
										<span>{p.fullName}</span>
										<span className="text-[10px] text-slate-400 font-mono">
											{p.phone || ""}
										</span>
									</button>
								))}
							</div>
						) : null}
					</div>
				</div>

				<div className="flex items-center gap-3 flex-wrap">
					<button
						type="button"
						onClick={handlePrintPresentation}
						className="min-h-[48px] px-4 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-100 font-bold text-xs rounded-xl flex items-center gap-2 border border-[var(--line,#cbd5e1)] dark:border-slate-700 cursor-pointer transition-colors shadow-sm active:scale-95"
					>
						<Printer size={16} />
						<span>Распечатать смету</span>
					</button>
					<button
						type="button"
						onClick={handleOpenMessengerModal}
						className="min-h-[48px] px-5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-teal-600/20 border border-teal-500/30 cursor-pointer active:scale-95 transition-all"
					>
						<Send size={16} />
						<span>Отправить в мессенджер</span>
					</button>
				</div>
			</header>

			{/* Main Content Area */}
			<main className="mt-6 flex flex-col gap-6 flex-1">
				{/* 3 Tier Comparison Cards (or 4 if saved plan exists) */}
				<section
					className={`grid grid-cols-1 ${planTiers.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-5`}
				>
					{planTiers.map((tier) => {
						const isSelected = selectedTierId === tier.id;
						return (
							<motion.div
								key={tier.id}
								onClick={() => setSelectedTierId(tier.id)}
								whileHover={{ scale: 1.01 }}
								whileTap={{ scale: 0.99 }}
								className={`rounded-3xl p-6 border-2 transition-all cursor-pointer flex flex-col justify-between bg-[var(--paper,#ffffff)] dark:bg-slate-900 shadow-sm relative ${
									isSelected
										? tier.borderClass
										: "border-[var(--line,#e2e8f0)] dark:border-slate-800 hover:border-[var(--line-strong,#cbd5e1)] dark:hover:border-slate-700"
								}`}
							>
								<div>
									<div className="flex items-center justify-between mb-3">
										<span
											className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${tier.badgeClass}`}
										>
											{tier.badge}
										</span>
										<div className="p-2 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] dark:border-slate-700">
											{getTierIcon(tier)}
										</div>
									</div>

									<h3 className="text-xl font-black text-[var(--ink,#0f172a)] dark:text-white m-0 mb-1">
										{tier.title}
									</h3>
									<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 m-0 mb-5 leading-relaxed min-h-[36px]">
										{tier.subtitle}
									</p>

									{/* Price Banner */}
									<div className="p-4 rounded-2xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 border border-[var(--line,#cbd5e1)] dark:border-slate-700 mb-5 text-center">
										<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 uppercase font-bold tracking-wider">
											Полная стоимость
										</div>
										<div className="text-3xl font-black text-[var(--ink,#0f172a)] dark:text-white mt-1">
											{formatKopecksRu(tier.totalKopecks)}
										</div>
										<div className="text-xs text-teal-700 dark:text-teal-300 font-semibold mt-1 flex items-center justify-center gap-2">
											<span>Срок: ~{tier.durationWeeks} нед.</span>
											<span>·</span>
											<span>
												Гарантия: {tier.warrantyYears}{" "}
												{typeof tier.warrantyYears === "number"
													? pluralizeRu(tier.warrantyYears, "год", "года", "лет")
													: ""}
											</span>
										</div>
									</div>

									{/* Included Features List */}
									<div className="space-y-2.5 mb-6">
										<div className="text-xs uppercase font-bold text-[var(--muted,#64748b)] dark:text-slate-400 tracking-wider">
											Что включено в план:
										</div>
										{tier.features.map((feat, idx) => (
											<div
												key={idx}
												className="flex items-start gap-2.5 text-xs text-[var(--ink,#0f172a)] dark:text-slate-200"
											>
												<CheckCircle2
													size={16}
													className="text-teal-600 dark:text-teal-400 shrink-0 mt-0.5"
												/>
												<span>{feat}</span>
											</div>
										))}
									</div>

									{/* Clinical Stages Preview */}
									{tier.stages && tier.stages.length > 0 ? (
										<div className="space-y-2 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 mb-6">
											<div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
												Этапы реализации:
											</div>
											{tier.stages.map((stg, sIdx) => (
												<div
													key={sIdx}
													className="text-xs flex items-center justify-between text-slate-600 dark:text-slate-300"
												>
													<span className="font-semibold">{stg.title}</span>
													<span className="text-[11px] font-mono text-teal-600 dark:text-teal-400">
														{stg.count}
													</span>
												</div>
											))}
										</div>
									) : null}
								</div>

								{/* Select Button */}
								<button
									type="button"
									className={`w-full min-h-[48px] py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
										isSelected
											? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
											: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 border border-[var(--line,#cbd5e1)] dark:border-slate-700"
									}`}
								>
									<span>
										{isSelected
											? "Выбран данный план"
											: "Выбрать этот вариант"}
									</span>
									<ChevronRight size={16} />
								</button>
							</motion.div>
						);
					})}
				</section>

				{/* Financial Calculators: 13% Tax Deduction & 0% Installment */}
				<section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
					{/* 13% Tax Deduction (NDFL) Card */}
					<div className="bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
								<div className="flex items-center gap-2.5">
									<div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
										<Percent size={20} />
									</div>
									<div>
										<h3 className="text-base font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 m-0">
											Налоговый вычет 13% (Справка НДФЛ)
										</h3>
										<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 m-0">
											Возврат денег государством от стоимости лечения
										</p>
									</div>
								</div>
								<span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/70 px-3 py-1 rounded-full border border-emerald-500/40">
									КНД 1151156
								</span>
							</div>

							<div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 border border-[var(--line,#cbd5e1)] dark:border-slate-700 mb-4">
								<div>
									<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400">
										Вы вернете обратно (13%):
									</div>
									<div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
										+ {formatKopecksRu(taxRefundKopecks)}
									</div>
								</div>
								<div>
									<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400">
										Фактическая цена лечения:
									</div>
									<div className="text-2xl font-black text-[var(--ink,#0f172a)] dark:text-white mt-0.5">
										{formatKopecksRu(finalPriceWithRefundKopecks)}
									</div>
								</div>
							</div>

							<label className="flex items-center gap-2.5 text-xs text-[var(--ink,#0f172a)] dark:text-slate-200 font-semibold cursor-pointer min-h-[44px]">
								<input
									type="checkbox"
									checked={isHighCostEligible}
									onChange={(e) => setIsHighCostEligible(e.target.checked)}
									className="w-4 h-4 rounded border-[var(--line,#cbd5e1)] text-teal-600 focus:ring-teal-500 cursor-pointer"
								/>
								<span>
									Дорогостоящее лечение (Код услуги 2 — возврат 13% без лимита в
									150 000 ₽)
								</span>
							</label>
						</div>

						<div className="mt-4 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 text-xs text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center justify-between">
							<span>Справка формируется администратором в 1 клик</span>
							<span className="font-bold text-teal-700 dark:text-teal-300">
								Форма 2026 года
							</span>
						</div>
					</div>

					{/* 0% Installment Calculator Card */}
					<div className="bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
								<div className="flex items-center gap-2.5">
									<div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-500/30">
										<Calculator size={20} />
									</div>
									<div>
										<h3 className="text-base font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 m-0">
											Рассрочка без переплат (0%)
										</h3>
										<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 m-0">
											Фиксация стоимости и комфортный график платежей
										</p>
									</div>
								</div>
								<span className="text-xs font-bold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/70 px-3 py-1 rounded-full border border-teal-500/40">
									Без % банку
								</span>
							</div>

							<div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 border border-[var(--line,#cbd5e1)] dark:border-slate-700 mb-4">
								<div>
									<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400">
										Ежемесячный платёж:
									</div>
									<div className="text-2xl font-black text-teal-700 dark:text-teal-300 mt-0.5">
										{formatKopecksRu(monthlyInstallmentKopecks)} / мес
									</div>
								</div>
								<div className="text-right">
									<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400">
										Срок рассрочки:
									</div>
									<div className="text-lg font-bold text-[var(--ink,#0f172a)] dark:text-white">
										{installmentMonths} месяцев
									</div>
								</div>
							</div>

							{/* Month Buttons */}
							<div className="flex items-center gap-2">
								{[3, 6, 12, 24].map((m) => (
									<button
										key={m}
										type="button"
										onClick={() => setInstallmentMonths(m)}
										className={`flex-1 min-h-[44px] py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
											installmentMonths === m
												? "bg-teal-600 text-white border-teal-600 shadow-sm"
												: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700"
										}`}
									>
										{m} мес
									</button>
								))}
							</div>
						</div>

						<div className="mt-4 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 text-xs text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center justify-between">
							<span>Первый взнос: 0 ₽ при оформлении</span>
							<span className="font-bold text-teal-700 dark:text-teal-300">
								Одобрение за 2 минуты
							</span>
						</div>
					</div>
				</section>
			</main>

			{/* Messenger Send Modal */}
			<AnimatePresence>
				{isMessengerModalOpen ? (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							className="bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-xl w-full flex flex-col gap-4 text-[var(--ink,#0f172a)] dark:text-slate-100"
						>
							<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
								<div className="flex items-center gap-2.5">
									<div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-300 border border-teal-500/30">
										<Send size={18} />
									</div>
									<div>
										<h3 className="text-base font-bold m-0">
											Отправить план лечения пациенту
										</h3>
										<p className="text-xs text-slate-400 m-0">
											{activePatient?.fullName} · {activePatient?.phone || "номер не указан"}
										</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setIsMessengerModalOpen(false)}
									className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
								>
									<X size={18} />
								</button>
							</div>

							{/* Channel Tabs */}
							<div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
								<button
									type="button"
									onClick={() => setMessengerChannel("whatsapp")}
									className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
										messengerChannel === "whatsapp"
											? "bg-white dark:bg-slate-900 text-emerald-600 shadow-xs"
											: "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
									}`}
								>
									WhatsApp Cloud
								</button>
								<button
									type="button"
									onClick={() => setMessengerChannel("telegram")}
									className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
										messengerChannel === "telegram"
											? "bg-white dark:bg-slate-900 text-sky-600 shadow-xs"
											: "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
									}`}
								>
									Telegram
								</button>
								<button
									type="button"
									onClick={() => setMessengerChannel("sms")}
									className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
										messengerChannel === "sms"
											? "bg-white dark:bg-slate-900 text-purple-600 shadow-xs"
											: "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
									}`}
								>
									SMS
								</button>
								<button
									type="button"
									onClick={() => setMessengerChannel("copy")}
									className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
										messengerChannel === "copy"
											? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs"
											: "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
									}`}
								>
									Скопировать
								</button>
							</div>

							{/* Message Textarea */}
							<div>
								<label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
									Текст сообщения для пациента:
								</label>
								<textarea
									rows={8}
									value={customMessage}
									onChange={(e) => setCustomMessage(e.target.value)}
									className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/40 focus:outline-hidden font-mono leading-relaxed"
								/>
							</div>

							{/* Modal Footer */}
							<div className="flex items-center justify-between pt-2">
								<span className="text-[11px] text-slate-400">
									{customMessage.length} символов
								</span>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => setIsMessengerModalOpen(false)}
										className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
									>
										Отмена
									</button>
									<button
										type="button"
										disabled={isSendingMessage || !customMessage.trim()}
										onClick={() => void handleSendMessage()}
										className="min-h-[44px] px-5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-600/20 disabled:opacity-50 cursor-pointer"
									>
										{isSendingMessage ? (
											<>
												<RefreshCw size={14} className="animate-spin" />
												<span>Отправка...</span>
											</>
										) : (
											<>
												{messengerChannel === "copy" ? (
													<Copy size={14} />
												) : (
													<Send size={14} />
												)}
												<span>
													{messengerChannel === "copy"
														? "Скопировать текст"
														: `Отправить в ${messengerChannel.toUpperCase()}`}
												</span>
											</>
										)}
									</button>
								</div>
							</div>
						</motion.div>
					</div>
				) : null}
			</AnimatePresence>
		</div>
	);
}
