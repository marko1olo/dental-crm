import {
	Archive,
	Check,
	Download,
	FileText,
	MoreVertical,
	Plus,
	Printer,
	RefreshCw,
	ShieldAlert,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientStore } from "../../store/patientStore";
import { showToast } from "../GlobalToast";
import "./ComparativePlanner.css";

interface ServiceItem {
	id: string;
	name: string;
	priceRub: number;
	isOptional: boolean;
	category: "therapy" | "ortho" | "hygiene" | "surgery";
}

interface TreatmentPlan {
	id: string;
	title: string;
	description: string;
	items: ServiceItem[];
	visitsCount: number;
	warrantyYears: number;
	durabilityScore: string;
	labWaitDays: number;
	status: "draft" | "approved" | "archived";
}

interface InsuranceContract {
	id: string;
	companyName: string;
	coverageTherapyPct: number;
	coverageOrthoPct: number;
	coverageHygienePct: number;
	coverageSurgeryPct: number;
}

const CATEGORY_LABELS: Record<ServiceItem["category"], string> = {
	therapy: "Терапия",
	ortho: "Ортодонтия",
	hygiene: "Гигиена",
	surgery: "Хирургия",
};

export const ComparativePlannerDashboard: React.FC = () => {
	const { auth } = useAppLogicContext();
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);

	const [plans, setPlans] = useState<TreatmentPlan[]>([]);
	const [insuranceActive, setInsuranceActive] = useState(false);
	const [insuranceData, setInsuranceData] = useState<InsuranceContract | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
	const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
	const [activeMobileTab, setActiveMobileTab] = useState<string>("");
	const [optionalToggles, setOptionalToggles] = useState<
		Record<string, Record<string, boolean>>
	>({});
	const [savingPlanId, setSavingPlanId] = useState<string | null>(null);

	// Responsive detection — proper event listener, not inline check
	useEffect(() => {
		const handler = () => setIsMobile(window.innerWidth <= 768);
		window.addEventListener("resize", handler);
		return () => window.removeEventListener("resize", handler);
	}, []);

	const fetchPlans = useCallback(async () => {
		if (!selectedPatientId) return;
		setIsLoading(true);
		try {
			const headers = auth.denteClinicalReadHeaders();
			const [plansRes, insRes] = await Promise.all([
				fetch(`/api/patients/${selectedPatientId}/treatment-plans`, {
					headers,
				}),
				// Org-level insurance contracts (DMS) — pick the first active one
				fetch(`/api/insurance/contracts`, { headers }),
			]);

			if (plansRes.ok) {
				const data = await plansRes.json();
				const loadedPlans: TreatmentPlan[] = Array.isArray(data?.plans)
					? data.plans
					: Array.isArray(data)
						? data
						: [];
				setPlans(loadedPlans);

				// Initialize optional toggles for any new plans
				setOptionalToggles((prev) => {
					const next = { ...prev };
					for (const plan of loadedPlans) {
						if (!next[plan.id]) {
							next[plan.id] = {};
							for (const item of plan.items) {
								// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
								if (item.isOptional) next[plan.id]![item.id] = true;
							}
						}
					}
					return next;
				});

				// Set first plan as active mobile tab if none selected
				if (loadedPlans.length > 0) {
					setActiveMobileTab((prev) =>
						prev && loadedPlans.find((p) => p.id === prev)
							? prev
							: loadedPlans[0]!.id,
					);
				}
			} else {
				showToast("Ошибка загрузки планов лечения", "error");
			}

			if (insRes.ok) {
				const contractsArray = await insRes.json();
				const first = Array.isArray(contractsArray) ? contractsArray[0] : null;
				setInsuranceData(first ?? null);
			}
			// Empty contracts array or error means no DMS — UI handles gracefully
		} catch {
			showToast("Ошибка загрузки данных планировщика", "error");
		} finally {
			setIsLoading(false);
		}
	}, [selectedPatientId, auth]);

	useEffect(() => {
		fetchPlans();
	}, [fetchPlans]);

	const handleToggleOptional = (planId: string, itemId: string) => {
		setOptionalToggles((prev) => ({
			...prev,
			[planId]: {
				...prev[planId],
				[itemId]: !prev[planId]?.[itemId],
			},
		}));
	};

	/** Persist plan status change to API */
	const updatePlanStatus = async (
		planId: string,
		newStatus: TreatmentPlan["status"],
	) => {
		if (!selectedPatientId) return;
		setSavingPlanId(planId);
		try {
			const res = await fetch(
				`/api/patients/${selectedPatientId}/treatment-plans`,
				{
					method: "POST",
					headers: auth.denteClinicalReadHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						id: planId,
						status: newStatus,
						// Pass minimal update — backend handles upsert
						items: plans.find((p) => p.id === planId)?.items ?? [],
					}),
				},
			);
			if (res.ok) {
				// If approving one plan, archive all others (mutual exclusion)
				setPlans((prev) =>
					prev.map((p) => ({
						...p,
						status:
							newStatus === "approved"
								? p.id === planId
									? "approved"
									: "archived"
								: p.id === planId
									? newStatus
									: p.status,
					})),
				);
				showToast(
					newStatus === "approved"
						? "План утверждён"
						: newStatus === "archived"
							? "План отправлен в архив"
							: "Статус плана обновлён",
					"success",
				);
			} else {
				showToast("Не удалось обновить статус плана", "error");
			}
		} catch {
			showToast("Ошибка сети при обновлении плана", "error");
		} finally {
			setSavingPlanId(null);
		}
	};

	const handlePrintPlan = (plan: TreatmentPlan) => {
		const { total } = calculateTotals(plan);
		const win = window.open("", "_blank");
		if (!win) return;
		win.document.write(`
      <html>
        <head><title>План лечения: ${plan.title}</title>
        <style>body{font-family:sans-serif;padding:32px;max-width:800px;margin:0 auto}
          h1{font-size:20px;margin-bottom:4px}
          p{color:#555;font-size:14px;margin-bottom:20px}
          table{width:100%;border-collapse:collapse;font-size:14px}
          th{background:#f0f0f0;text-align:left;padding:10px;border-bottom:2px solid #ccc}
          td{padding:8px 10px;border-bottom:1px solid #eee}
          .total{font-weight:700;font-size:16px;text-align:right;margin-top:20px}
        </style></head>
        <body>
          <h1>План лечения: ${plan.title}</h1>
          <p>${plan.description}</p>
          <table>
            <thead><tr><th>Услуга</th><th>Категория</th><th>Стоимость</th></tr></thead>
            <tbody>
              ${plan.items
								.filter(
									(item) =>
										!item.isOptional || optionalToggles[plan.id]?.[item.id],
								)
								.map(
									(item) =>
										`<tr><td>${item.name}${item.isOptional ? " (опция)" : ""}</td><td>${CATEGORY_LABELS[item.category]}</td><td>${item.priceRub.toLocaleString("ru-RU")} ₽</td></tr>`,
								)
								.join("")}
            </tbody>
          </table>
          <div class="total">Итого: ${total.toLocaleString("ru-RU")} ₽</div>
        </body>
      </html>
    `);
		win.document.close();
		win.print();
		setActiveDropdown(null);
	};

	const handleExportCsv = (plan: TreatmentPlan) => {
		const rows = [["Услуга", "Категория", "Цена (₽)", "Опция"]];
		for (const item of plan.items) {
			rows.push([
				item.name,
				CATEGORY_LABELS[item.category],
				String(item.priceRub),
				item.isOptional ? "Да" : "Нет",
			]);
		}
		const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
		const blob = new Blob(["\uFEFF" + csv], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `plan_${plan.title.replace(/\s+/g, "_")}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		setActiveDropdown(null);
	};

	const calculateTotals = (plan: TreatmentPlan) => {
		let total = 0;
		let patientCopay = 0;
		let insuranceCoverage = 0;

		for (const item of plan.items) {
			const isSelected =
				!item.isOptional || optionalToggles[plan.id]?.[item.id];
			if (!isSelected) continue;

			total += item.priceRub;

			let coveragePct = 0;
			if (insuranceActive && insuranceData) {
				if (item.category === "therapy")
					coveragePct = insuranceData.coverageTherapyPct;
				if (item.category === "ortho")
					coveragePct = insuranceData.coverageOrthoPct;
				if (item.category === "hygiene")
					coveragePct = insuranceData.coverageHygienePct;
				if (item.category === "surgery")
					coveragePct = insuranceData.coverageSurgeryPct;
			}

			const coveredAmt = Math.round((item.priceRub * coveragePct) / 100);
			insuranceCoverage += coveredAmt;
			patientCopay += item.priceRub - coveredAmt;
		}

		return { total, patientCopay, insuranceCoverage };
	};

	// No patient selected
	if (!selectedPatientId) {
		return (
			<div className="comp-planner">
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						height: "50vh",
						gap: 12,
						color: "var(--muted)",
					}}
				>
					<FileText size={48} strokeWidth={1} />
					<p style={{ margin: 0, fontSize: 16 }}>
						Выберите пациента, чтобы открыть сравнительный конструктор смет
					</p>
				</div>
			</div>
		);
	}

	// Loading
	if (isLoading && plans.length === 0) {
		return (
			<div className="comp-planner">
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						height: "50vh",
						gap: 12,
						color: "var(--muted)",
					}}
				>
					<RefreshCw size={20} className="animate-spin" />
					Загрузка планов лечения...
				</div>
			</div>
		);
	}

	return (
		<div className="comp-planner">
			<div className="comp-container">
				<header className="comp-header">
					<div className="comp-title-group">
						<h1>Сравнительный конструктор смет</h1>
						<p>Анализ альтернативных планов лечения для пациента</p>
					</div>
					<div style={{ display: "flex", gap: 12, alignItems: "center" }}>
						{isLoading && (
							<RefreshCw
								size={16}
								style={{
									color: "var(--muted)",
									animation: "spin 1s linear infinite",
								}}
							/>
						)}
						{insuranceData ? (
							<div className="insurance-status-card">
								<ShieldAlert
									className={
										insuranceActive ? "text-emerald-400" : "text-zinc-500"
									}
								/>
								<div className="insurance-info">
									<p>Полис ДМС</p>
									<p>{insuranceData.companyName}</p>
								</div>
								<button
									onClick={() => setInsuranceActive(!insuranceActive)}
									className={`insurance-toggle-btn ${insuranceActive ? "active" : "inactive"}`}
								>
									{insuranceActive ? "Применён" : "Применить полис"}
								</button>
							</div>
						) : (
							<div className="insurance-status-card">
								<ShieldAlert className="text-zinc-500" />
								<div className="insurance-info">
									<p>Нет полиса ДМС</p>
								</div>
							</div>
						)}
					</div>
				</header>

				{plans.length === 0 ? (
					<div
						style={{
							textAlign: "center",
							padding: "64px 32px",
							color: "var(--muted)",
						}}
					>
						<Plus
							size={40}
							strokeWidth={1}
							style={{ marginBottom: 12, opacity: 0.4 }}
						/>
						<p style={{ margin: 0, fontSize: 16 }}>
							У пациента пока нет планов лечения.
						</p>
						<p style={{ margin: "8px 0 0 0", fontSize: 13 }}>
							Создайте план в карте лечения или одонтограмме.
						</p>
					</div>
				) : (
					<>
						{isMobile && plans.length > 1 && (
							<div className="mobile-plan-tabs">
								{plans.map((plan) => (
									<button
										key={plan.id}
										type="button"
										className={`mobile-tab-btn ${activeMobileTab === plan.id ? "active-tab-A" : ""}`}
										onClick={() => setActiveMobileTab(plan.id)}
									>
										{plan.title}
									</button>
								))}
							</div>
						)}

						<div className="plans-grid">
							{plans.map((plan) => {
								if (isMobile && plan.id !== activeMobileTab) return null;

								const { total, patientCopay, insuranceCoverage } =
									calculateTotals(plan);
								const isApproved = plan.status === "approved";
								const isArchived = plan.status === "archived";
								const isSaving = savingPlanId === plan.id;

								return (
									<div
										key={plan.id}
										className={`plan-item-card ${isApproved ? "is-approved" : ""} ${isArchived ? "is-archived" : ""}`}
									>
										{/* Header */}
										<div className="plan-card-header">
											<div className="plan-title-wrapper">
												<div>
													<h2>{plan.title}</h2>
													<p>{plan.description}</p>
												</div>
												<div className="relative">
													<button
														onClick={() =>
															setActiveDropdown(
																activeDropdown === plan.id ? null : plan.id,
															)
														}
														className="plan-actions-trigger"
														aria-label="Действия с планом"
													>
														<MoreVertical className="w-5 h-5" />
													</button>

													{activeDropdown === plan.id && (
														<>
															<div
																className="fixed inset-0 z-10"
																onClick={() => setActiveDropdown(null)}
															/>
															<div className="plan-dropdown-menu">
																<button onClick={() => handlePrintPlan(plan)}>
																	<Printer className="w-4 h-4" /> Печать сметы
																</button>
																<button onClick={() => handleExportCsv(plan)}>
																	<FileText className="w-4 h-4" /> Экспорт CSV
																</button>
																<button
																	onClick={() => {
																		// Copy plan summary to clipboard
																		const { total } = calculateTotals(plan);
																		const text = `${plan.title}\n${plan.description}\nИтого: ${total.toLocaleString("ru-RU")} ₽`;
																		navigator.clipboard
																			.writeText(text)
																			.then(() =>
																				showToast(
																					"Скопировано в буфер",
																					"success",
																				),
																			);
																		setActiveDropdown(null);
																	}}
																>
																	<Download className="w-4 h-4" /> Копировать
																	итог
																</button>
																<div className="border-t border-zinc-800 my-1" />
																{!isArchived && (
																	<button
																		className="danger"
																		onClick={() =>
																			updatePlanStatus(plan.id, "archived")
																		}
																	>
																		<Archive className="w-4 h-4" /> Архивировать
																	</button>
																)}
															</div>
														</>
													)}
												</div>
											</div>

											<div className="plan-pricing-summary">
												{insuranceActive && insuranceCoverage > 0 ? (
													<>
														<div className="price-row total-original">
															<span>Итого:</span>
															<span>{total.toLocaleString("ru-RU")} ₽</span>
														</div>
														<div className="price-row insurance-share">
															<span>Покрывает ДМС:</span>
															<span>
																−{insuranceCoverage.toLocaleString("ru-RU")} ₽
															</span>
														</div>
														<div className="price-row final-due">
															<span>К оплате:</span>
															<span className="price-val">
																{patientCopay.toLocaleString("ru-RU")} ₽
															</span>
														</div>
													</>
												) : (
													<div className="price-row final-due no-insurance">
														<span>Итого:</span>
														<span className="price-val">
															{total.toLocaleString("ru-RU")} ₽
														</span>
													</div>
												)}
											</div>
										</div>

										{/* Parameters */}
										<div className="specs-grid">
											<div className="spec-item">
												<span>Визиты</span>
												<span>{plan.visitsCount} посещ.</span>
											</div>
											<div className="spec-item">
												<span>Гарантия</span>
												<span>{plan.warrantyYears} лет</span>
											</div>
											<div className="spec-item">
												<span>Надёжность</span>
												<span>{plan.durabilityScore}</span>
											</div>
											<div className="spec-item">
												<span>Лаборатория</span>
												<span>
													{plan.labWaitDays > 0
														? `${plan.labWaitDays} дней`
														: "Не требуется"}
												</span>
											</div>
										</div>

										{/* Services */}
										<div className="services-section">
											<h3>Услуги в смете</h3>
											{plan.items.length === 0 ? (
												<p
													style={{
														color: "var(--muted)",
														fontSize: 13,
														padding: "8px 0",
													}}
												>
													Услуги не добавлены
												</p>
											) : (
												plan.items.map((item) => {
													const isSelected =
														!item.isOptional ||
														optionalToggles[plan.id]?.[item.id];
													return (
														<div
															key={item.id}
															className={`service-tile ${isSelected ? "is-active" : "is-inactive"}`}
														>
															{item.isOptional ? (
																<button
																	onClick={() =>
																		handleToggleOptional(plan.id, item.id)
																	}
																	disabled={plan.status !== "draft"}
																	className={`tile-check-indicator ${isSelected ? "checked" : ""}`}
																	title={
																		isSelected
																			? "Убрать опцию"
																			: "Включить опцию"
																	}
																>
																	{isSelected && <Check className="w-3 h-3" />}
																</button>
															) : (
																<div className="tile-check-indicator checked">
																	<Check className="w-3 h-3 text-white" />
																</div>
															)}
															<div className="tile-info">
																<p className={isSelected ? "" : "is-crossed"}>
																	{item.name}
																	{item.isOptional && (
																		<span className="optional-tag">Опция</span>
																	)}
																	<span
																		style={{
																			fontSize: 11,
																			color: "var(--muted)",
																			marginLeft: 6,
																		}}
																	>
																		{CATEGORY_LABELS[item.category]}
																	</span>
																</p>
																<p className="price-tag">
																	{item.priceRub.toLocaleString("ru-RU")} ₽
																</p>
															</div>
														</div>
													);
												})
											)}
										</div>

										{/* Actions */}
										<div className="card-bottom-actions">
											{plan.status === "draft" && (
												<>
													<button
														onClick={() =>
															updatePlanStatus(plan.id, "approved")
														}
														className="approve-plan-btn"
														disabled={isSaving}
													>
														{isSaving ? (
															<RefreshCw
																className="w-5 h-5"
																style={{ animation: "spin 1s linear infinite" }}
															/>
														) : (
															<Check className="w-5 h-5" />
														)}
														<span>Утвердить план</span>
													</button>

													<button
														onClick={() =>
															updatePlanStatus(plan.id, "archived")
														}
														className="reject-plan-btn"
														disabled={isSaving}
													>
														<X className="w-5 h-5" />
														<span>Отклонить</span>
													</button>
												</>
											)}
											{isApproved && (
												<div className="status-badge-approved">
													<Check className="w-5 h-5" />
													<span>План утверждён</span>
												</div>
											)}
											{isArchived && (
												<div
													style={{
														display: "flex",
														gap: 8,
														alignItems: "center",
													}}
												>
													<div className="status-badge-archived">
														<Archive className="w-5 h-5" />
														<span>В архиве</span>
													</div>
													<button
														onClick={() => updatePlanStatus(plan.id, "draft")}
														style={{
															background: "none",
															border: "1px solid var(--line)",
															color: "var(--muted)",
															padding: "6px 12px",
															borderRadius: 8,
															cursor: "pointer",
															fontSize: 13,
														}}
													>
														Восстановить
													</button>
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</>
				)}
			</div>
		</div>
	);
};
