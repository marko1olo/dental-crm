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
	Trash2,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientStore } from "../../store/patientStore";
import { showToast } from "../GlobalToast";
import "./ComparativePlanner.css";

// ─── Backend-aligned types ──────────────────────────────────────────────────

interface PlanItem {
	id: string;
	toothNumber?: number | null;
	priceId?: string | null;
	name: string;
	quantity: number;
	price: number;
	discount?: number | null;
	phase?: string | null;
}

type PlanStatus =
	| "Draft"
	| "Active"
	| "Approved"
	| "Completed"
	| "Rejected"
	| "Archived";

interface TreatmentPlan {
	id: string;
	patientId?: string;
	name: string;
	status: PlanStatus;
	totalPrice?: number;
	patientSignature?: string | null;
	createdAt?: string;
	updatedAt?: string;
	items: PlanItem[];
}

interface InsuranceContract {
	id: string;
	companyName: string;
	coverageTherapyPct: number;
	coverageOrthoPct: number;
	coverageHygienePct: number;
	coverageSurgeryPct: number;
}

// ─── Draft item row for the creation form ───────────────────────────────────

interface DraftServiceRow {
	key: string;
	priceId?: string;
	name: string;
	price: string;
	quantity: string;
}

const makeDraftRow = (): DraftServiceRow => ({
	key: Math.random().toString(36).slice(2),
	priceId: "",
	name: "",
	price: "",
	quantity: "1",
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcPlanTotal(plan: TreatmentPlan): number {
	if (!plan.items || plan.items.length === 0) return plan.totalPrice ?? 0;
	return plan.items.reduce(
		(acc, item) =>
			acc + item.price * item.quantity * (1 - (item.discount ?? 0) / 100),
		0,
	);
}

function statusLabel(status: PlanStatus): string {
	switch (status) {
		case "Draft":
			return "Черновик";
		case "Active":
			return "Активный";
		case "Approved":
			return "Утверждён";
		case "Completed":
			return "Завершён";
		case "Rejected":
			return "Отклонён";
		case "Archived":
			return "В архиве";
	}
}

function statusCssClass(status: PlanStatus): string {
	switch (status) {
		case "Approved":
		case "Completed":
			return "is-approved";
		case "Archived":
		case "Rejected":
			return "is-archived";
		default:
			return "";
	}
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ComparativePlannerDashboard: React.FC = () => {
	const { auth, dashboard } = useAppLogicContext();
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
	const [savingPlanId, setSavingPlanId] = useState<string | null>(null);

	// ── New-plan form state ──────────────────────────────────────────────────
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [newPlanName, setNewPlanName] = useState("Комплексный план лечения");
	const [draftRows, setDraftRows] = useState<DraftServiceRow[]>([
		makeDraftRow(),
	]);
	const [isCreating, setIsCreating] = useState(false);
	const formRef = useRef<HTMLDivElement>(null);

	// Responsive detection
	useEffect(() => {
		const handler = () => setIsMobile(window.innerWidth <= 768);
		window.addEventListener("resize", handler);
		return () => window.removeEventListener("resize", handler);
	}, []);

	// ── Data loading ─────────────────────────────────────────────────────────

	const fetchPlans = useCallback(async () => {
		if (!selectedPatientId) return;
		setIsLoading(true);
		try {
			const headers = auth.denteClinicalReadHeaders();
			const [plansRes, insRes] = await Promise.all([
				fetch(`/api/patients/${selectedPatientId}/treatment-plans`, {
					headers,
				}),
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
				const first = Array.isArray(contractsArray)
					? contractsArray[0]
					: null;
				setInsuranceData(first ?? null);
			}
		} catch {
			showToast("Ошибка загрузки данных планировщика", "error");
		} finally {
			setIsLoading(false);
		}
	}, [selectedPatientId, auth]);

	useEffect(() => {
		fetchPlans();
	}, [fetchPlans]);

	// ── Status update ─────────────────────────────────────────────────────────

	const updatePlanStatus = async (
		planId: string,
		newStatus: PlanStatus,
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
						items: plans.find((p) => p.id === planId)?.items || [],
					}),
				},
			);
			if (res.ok) {
				setPlans((prev) =>
					prev.map((p) => ({
						...p,
						status:
							newStatus === "Approved"
								? p.id === planId
									? "Approved"
									: "Archived"
								: p.id === planId
									? newStatus
									: p.status,
					})),
				);
				showToast(
					newStatus === "Approved"
						? "План утверждён"
						: newStatus === "Archived"
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

	// ── Plan creation ─────────────────────────────────────────────────────────

	const openCreateForm = () => {
		setNewPlanName("Комплексный план лечения");
		setDraftRows([makeDraftRow()]);
		setShowCreateForm(true);
		setTimeout(
			() => formRef.current?.scrollIntoView({ behavior: "smooth" }),
			50,
		);
	};

	const cancelCreateForm = () => {
		setShowCreateForm(false);
		setDraftRows([makeDraftRow()]);
	};

	const addDraftRow = () => setDraftRows((prev) => [...prev, makeDraftRow()]);

	const removeDraftRow = (key: string) =>
		setDraftRows((prev) => prev.filter((r) => r.key !== key));

	const updateDraftRow = (
		key: string,
		field: keyof Omit<DraftServiceRow, "key">,
		value: string,
	) =>
		setDraftRows((prev) =>
			prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
		);

	const handleCreatePlan = async () => {
		if (!selectedPatientId) return;
		const trimmedName = newPlanName.trim();
		if (!trimmedName) {
			showToast("Введите название плана", "error");
			return;
		}

		const validRows = draftRows.filter(
			(r) => r.name.trim() && parseFloat(r.price) > 0,
		);

		const items = validRows.map((r) => ({
			priceId: r.priceId || null,
			name: r.name.trim(),
			price: parseFloat(r.price) || 0,
			quantity: parseInt(r.quantity, 10) || 1,
		}));

		setIsCreating(true);
		try {
			const res = await fetch(
				`/api/patients/${selectedPatientId}/treatment-plans`,
				{
					method: "POST",
					headers: auth.denteClinicalReadHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({ name: trimmedName, items }),
				},
			);
			if (res.ok) {
				showToast("План создан", "success");
				setShowCreateForm(false);
				await fetchPlans();
			} else {
				const err = await res.json().catch(() => ({}));
				showToast(
					(err as { message?: string }).message ||
						"Не удалось создать план",
					"error",
				);
			}
		} catch {
			showToast("Ошибка сети при создании плана", "error");
		} finally {
			setIsCreating(false);
		}
	};

	// ── Print & Export ────────────────────────────────────────────────────────

	const handlePrintPlan = (plan: TreatmentPlan) => {
		const total = calcPlanTotal(plan);
		const win = window.open("", "_blank");
		if (!win) return;
		win.document.write(`
      <html>
        <head><title>План лечения: ${plan.name}</title>
        <style>body{font-family:sans-serif;padding:32px;max-width:800px;margin:0 auto}
          h1{font-size:20px;margin-bottom:4px}
          p{color:#555;font-size:14px;margin-bottom:20px}
          table{width:100%;border-collapse:collapse;font-size:14px}
          th{background:#f0f0f0;text-align:left;padding:10px;border-bottom:2px solid #ccc}
          td{padding:8px 10px;border-bottom:1px solid #eee}
          .total{font-weight:700;font-size:16px;text-align:right;margin-top:20px}
        </style></head>
        <body>
          <h1>План лечения: ${plan.name}</h1>
          <p>Статус: ${statusLabel(plan.status)}</p>
          <table>
            <thead><tr><th>Услуга</th><th>Зуб</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead>
            <tbody>
              ${(plan.items || [])
								.map(
									(item) =>
										`<tr><td>${item.name}</td><td>${item.toothNumber ?? "—"}</td><td>${item.quantity}</td><td>${item.price.toLocaleString("ru-RU")} ₽</td><td>${(item.price * item.quantity).toLocaleString("ru-RU")} ₽</td></tr>`,
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
		const rows = [["Услуга", "Зуб", "Кол-во", "Цена (₽)", "Фаза"]];
		for (const item of plan.items || []) {
			rows.push([
				item.name,
				String(item.toothNumber ?? ""),
				String(item.quantity),
				String(item.price),
				item.phase ?? "",
			]);
		}
		const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
		const blob = new Blob(["\uFEFF" + csv], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `plan_${plan.name.replace(/\s+/g, "_")}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		setActiveDropdown(null);
	};

	// ─── No patient guard ─────────────────────────────────────────────────────

	if (!selectedPatientId) {
		return (
			<div className="comp-planner">
				<div className="comp-empty-state">
					<FileText size={48} strokeWidth={1} />
					<p>Выберите пациента, чтобы открыть сравнительный конструктор смет</p>
				</div>
			</div>
		);
	}

	if (isLoading && plans.length === 0) {
		return (
			<div className="comp-planner">
				<div className="comp-empty-state">
					<RefreshCw size={20} className="animate-spin" />
					Загрузка планов лечения...
				</div>
			</div>
		);
	}

	// ─── Main render ──────────────────────────────────────────────────────────

	return (
		<div className="comp-planner">
			<div className="comp-container">
				{/* ── Header ───────────────────────────────────────────────── */}
				<header className="comp-header">
					<div className="comp-title-group">
						<h1>Сравнительный конструктор смет</h1>
						<p>Анализ альтернативных планов лечения для пациента</p>
					</div>
					<div className="comp-header-controls">
						{isLoading && (
							<RefreshCw
								size={16}
								style={{
									color: "var(--muted)",
									animation: "spin 1s linear infinite",
								}}
							/>
						)}

						{/* New plan button */}
						<button
							type="button"
							className="new-plan-btn"
							onClick={openCreateForm}
							disabled={showCreateForm}
						>
							<Plus size={16} />
							Новый план
						</button>

						{/* Insurance DMS card */}
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

				{/* ── Inline creation form ──────────────────────────────────── */}
				{showCreateForm && (
					<div className="create-plan-form" ref={formRef}>
						<div className="cpf-header">
							<h2>Новый план лечения</h2>
							<button
								type="button"
								className="cpf-close-btn"
								onClick={cancelCreateForm}
								aria-label="Закрыть форму"
							>
								<X size={18} />
							</button>
						</div>

						<div className="cpf-field">
							<label htmlFor="cpf-plan-name">Название плана</label>
							<input
								id="cpf-plan-name"
								type="text"
								className="cpf-input"
								value={newPlanName}
								onChange={(e) => setNewPlanName(e.target.value)}
								placeholder="Комплексный план лечения"
								maxLength={120}
							/>
						</div>

						<div className="cpf-services-header">
							<span className="cpf-section-label">Услуги</span>
							<button
								type="button"
								className="cpf-add-row-btn"
								onClick={addDraftRow}
							>
								<Plus size={14} />
								Добавить услугу
							</button>
						</div>

						<div className="cpf-rows">
							{/* Column headers */}
							<div className="cpf-row cpf-row-header">
								<span className="cpf-col-name">Название услуги</span>
								<span className="cpf-col-price">Цена (₽)</span>
								<span className="cpf-col-qty">Кол-во</span>
								<span className="cpf-col-remove" />
							</div>

							{draftRows.map((row) => (
								<div key={row.key} className="cpf-row cpf-row-data">
									<div
										className="cpf-col-name"
										style={{ display: "flex", flexDirection: "column", gap: "4px" }}
									>
										<select
											className="cpf-input"
											value={row.priceId || ""}
											onChange={(e) => {
												const val = e.target.value;
												const catItem = dashboard?.serviceCatalog?.find(
													(s) => s.id === val,
												);
												if (catItem) {
													setDraftRows((prev) =>
														prev.map((r) =>
															r.key === row.key
																? {
																		...r,
																		priceId: catItem.id,
																		name: catItem.title,
																		price: String(catItem.priceRub),
																	}
																: r,
														),
													);
												} else {
													updateDraftRow(row.key, "priceId", "");
												}
											}}
										>
											<option value="">-- Выбрать из каталога --</option>
											{dashboard?.serviceCatalog?.map((sc) => (
												<option key={sc.id} value={sc.id}>
													{sc.title} ({sc.priceRub} ₽)
												</option>
											))}
										</select>
										<input
											className="cpf-input"
											type="text"
											placeholder="Или введите название услуги вручную"
											value={row.name}
											onChange={(e) =>
												updateDraftRow(row.key, "name", e.target.value)
											}
										/>
									</div>
									<input
										className="cpf-input cpf-col-price"
										type="number"
										min={0}
										step={1}
										placeholder="0"
										value={row.price}
										onChange={(e) =>
											updateDraftRow(row.key, "price", e.target.value)
										}
									/>
									<input
										className="cpf-input cpf-col-qty"
										type="number"
										min={1}
										step={1}
										placeholder="1"
										value={row.quantity}
										onChange={(e) =>
											updateDraftRow(row.key, "quantity", e.target.value)
										}
									/>
									<button
										type="button"
										className="cpf-remove-row-btn"
										onClick={() => removeDraftRow(row.key)}
										disabled={draftRows.length === 1}
										aria-label="Удалить строку"
									>
										<Trash2 size={14} />
									</button>
								</div>
							))}
						</div>

						<div className="cpf-actions">
							<button
								type="button"
								className="cpf-cancel-btn"
								onClick={cancelCreateForm}
								disabled={isCreating}
							>
								Отмена
							</button>
							<button
								type="button"
								className="cpf-submit-btn"
								onClick={handleCreatePlan}
								disabled={isCreating}
							>
								{isCreating ? (
									<RefreshCw
										size={15}
										style={{ animation: "spin 1s linear infinite" }}
									/>
								) : (
									<Check size={15} />
								)}
								{isCreating ? "Создание..." : "Создать план"}
							</button>
						</div>
					</div>
				)}

				{/* ── Empty state ───────────────────────────────────────────── */}
				{plans.length === 0 && !showCreateForm ? (
					<div className="comp-no-plans">
						<FileText size={40} strokeWidth={1} className="comp-no-plans-icon" />
						<p className="comp-no-plans-title">
							У пациента пока нет планов лечения.
						</p>
						<p className="comp-no-plans-sub">
							Создайте первый план, нажав кнопку выше.
						</p>
						<button
							type="button"
							className="new-plan-btn"
							onClick={openCreateForm}
						>
							<Plus size={16} />
							Создать план лечения
						</button>
					</div>
				) : (
					<>
						{/* ── Mobile tabs ──────────────────────────────────────── */}
						{isMobile && plans.length > 1 && (
							<div className="mobile-plan-tabs">
								{plans.map((plan) => (
									<button
										key={plan.id}
										type="button"
										className={`mobile-tab-btn ${activeMobileTab === plan.id ? "active-tab-A" : ""}`}
										onClick={() => setActiveMobileTab(plan.id)}
									>
										{plan.name}
									</button>
								))}
							</div>
						)}

						{/* ── Plans grid ───────────────────────────────────────── */}
						<div className="plans-grid">
							{plans.map((plan) => {
								if (isMobile && plan.id !== activeMobileTab) return null;

								const total = calcPlanTotal(plan);
								const isApproved =
									plan.status === "Approved" || plan.status === "Completed";
								const isArchived =
									plan.status === "Archived" || plan.status === "Rejected";
								const isDraft =
									plan.status === "Draft" || plan.status === "Active";
								const isSaving = savingPlanId === plan.id;

								// insurance calculation
								let insuranceCoverage = 0;
								let patientCopay = total;
								if (insuranceActive && insuranceData) {
									// Simple flat coverage on total (no per-category data in API)
									const avgPct =
										(insuranceData.coverageTherapyPct +
											insuranceData.coverageOrthoPct +
											insuranceData.coverageHygienePct +
											insuranceData.coverageSurgeryPct) /
										4;
									insuranceCoverage = Math.round((total * avgPct) / 100);
									patientCopay = total - insuranceCoverage;
								}

								return (
									<div
										key={plan.id}
										className={`plan-item-card ${statusCssClass(plan.status)}`}
									>
										{/* Card header */}
										<div className="plan-card-header">
											<div className="plan-title-wrapper">
												<div>
													<h2>{plan.name}</h2>
													<p className="plan-status-label">
														{statusLabel(plan.status)}
													</p>
												</div>
												<div className="relative">
													<button
														onClick={() =>
															setActiveDropdown(
																activeDropdown === plan.id
																	? null
																	: plan.id,
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
																<button
																	onClick={() => handlePrintPlan(plan)}
																>
																	<Printer className="w-4 h-4" /> Печать
																	сметы
																</button>
																<button
																	onClick={() => handleExportCsv(plan)}
																>
																	<FileText className="w-4 h-4" /> Экспорт CSV
																</button>
																<button
																	onClick={() => {
																		const text = `${plan.name}\nСтатус: ${statusLabel(plan.status)}\nИтого: ${total.toLocaleString("ru-RU")} ₽`;
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
																			updatePlanStatus(plan.id, "Archived")
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

											{/* Pricing summary */}
											<div className="plan-pricing-summary">
												{insuranceActive && insuranceCoverage > 0 ? (
													<>
														<div className="price-row total-original">
															<span>Итого:</span>
															<span>
																{total.toLocaleString("ru-RU")} ₽
															</span>
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

										{/* Services list */}
										<div className="services-section">
											<h3>Услуги в смете</h3>
											{!plan.items || plan.items.length === 0 ? (
												<p className="plan-no-items">Услуги не добавлены</p>
											) : (
												plan.items.map((item) => (
													<div
														key={item.id}
														className="service-tile is-active"
													>
														<div className="tile-check-indicator checked">
															<Check className="w-3 h-3 text-white" />
														</div>
														<div className="tile-info">
															<p>
																{item.name}
																{item.toothNumber ? (
																	<span className="optional-tag">
																		зуб {item.toothNumber}
																	</span>
																) : null}
																{item.phase ? (
																	<span
																		className="optional-tag"
																		style={{ marginLeft: 4 }}
																	>
																		{item.phase}
																	</span>
																) : null}
															</p>
															<p className="price-tag">
																{item.price.toLocaleString("ru-RU")} ₽
																{item.quantity > 1
																	? ` × ${item.quantity}`
																	: ""}
																{item.discount
																	? ` (−${item.discount}%)`
																	: ""}
															</p>
														</div>
													</div>
												))
											)}
										</div>

										{/* Card bottom actions */}
										<div className="card-bottom-actions">
											{isDraft && (
												<>
													<button
														onClick={() =>
															updatePlanStatus(plan.id, "Approved")
														}
														className="approve-plan-btn"
														disabled={isSaving}
													>
														{isSaving ? (
															<RefreshCw
																className="w-5 h-5"
																style={{
																	animation: "spin 1s linear infinite",
																}}
															/>
														) : (
															<Check className="w-5 h-5" />
														)}
														<span>Утвердить план</span>
													</button>

													<button
														onClick={() =>
															updatePlanStatus(plan.id, "Archived")
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
														onClick={() =>
															updatePlanStatus(plan.id, "Draft")
														}
														className="restore-plan-btn"
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
