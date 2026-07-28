import { formatKopecksRu, type Kopecks } from "@dental/shared";
import {
	Archive,
	Check,
	Download,
	FileText,
	Info,
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
import { TOOTH_STATE_LABELS, type ToothState } from "../odontogram/ToothChart";
import "./ComparativePlanner.css";
import {
	coveragePercentForCategory,
	insuranceCoverageKopecks,
	planLineTotalKopecks,
	planPriceIssueMessages,
	planTotalKopecks,
	resolvePlanSuggestions,
	validateDraftPlanRows,
} from "./planPricing";

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
	status?: "Proposed" | "In_Progress" | "Completed";
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
	/** Зуб, из-за которого строка появилась. Уходит в смету отдельным полем. */
	toothNumber?: number | null;
	/** Строка пришла из зубной формулы, но цены в прайсе для неё не нашлось. */
	needsPriceFromCatalog?: boolean;
}

const makeDraftRow = (): DraftServiceRow => ({
	key: Math.random().toString(36).slice(2),
	priceId: "",
	name: "",
	price: "",
	quantity: "1",
	toothNumber: null,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Итог плана в копейках. null — в плане есть строка с непонятной суммой, и
 * тогда на экране пишется об этом, а не подставляется ноль.
 *
 * Расчёт живёт в ./planPricing.ts: он повторяет серверную формулу
 * (max(0, цена × количество − скидка в рублях)) и складывает целые копейки,
 * поэтому показанный итог равен сохранённому.
 */
function calcPlanTotalKopecks(plan: TreatmentPlan): Kopecks | null {
	return planTotalKopecks(plan.items ?? [], plan.totalPrice ?? 0).kopecks;
}

/** Сумма для человека; неизвестная сумма не притворяется нулём. */
function moneyOrDash(kopecks: Kopecks | null): string {
	return kopecks === null ? "сумма не читается" : formatKopecksRu(kopecks);
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
	const pendingPlanSuggestions = usePatientStore(
		(s) => s.pendingPlanSuggestions,
	);
	const clearPendingPlanSuggestions = usePatientStore(
		(s) => s.clearPendingPlanSuggestions,
	);

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
	/** Почему часть строк осталась без цены — человеческими словами. */
	const [priceNotices, setPriceNotices] = useState<string[]>([]);
	/** Что мешает сохранить план прямо сейчас. */
	const [draftProblems, setDraftProblems] = useState<string[]>([]);
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
				const first = Array.isArray(contractsArray) ? contractsArray[0] : null;
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

	const updatePlanStatus = async (planId: string, newStatus: PlanStatus) => {
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

	const updatePlanItemStatus = async (
		planId: string,
		itemId: string,
		newStatus: "Proposed" | "In_Progress" | "Completed",
	) => {
		if (!selectedPatientId) return;
		const plan = plans.find((p) => p.id === planId);
		if (!plan) return;

		const newItems = plan.items.map((i) =>
			i.id === itemId ? { ...i, status: newStatus } : i,
		);
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
						status: plan.status,
						items: newItems,
					}),
				},
			);
			if (res.ok) {
				setPlans((prev) =>
					prev.map((p) => (p.id === planId ? { ...p, items: newItems } : p)),
				);
				showToast("Статус услуги обновлён", "success");
			} else {
				showToast("Не удалось обновить статус услуги", "error");
			}
		} catch {
			showToast("Ошибка сети при обновлении услуги", "error");
		} finally {
			setSavingPlanId(null);
		}
	};

	// ── Plan creation ─────────────────────────────────────────────────────────

	const openCreateForm = () => {
		setNewPlanName("Комплексный план лечения");
		setDraftRows([makeDraftRow()]);
		setPriceNotices([]);
		setDraftProblems([]);
		setShowCreateForm(true);
		setTimeout(
			() => formRef.current?.scrollIntoView({ behavior: "smooth" }),
			50,
		);
	};

	/**
	 * Перенос предложений из зубной формулы в форму сметы.
	 *
	 * БЫЛО: если услуги не находилось в прайсе, подставлялась своя цена — 4000,
	 * 8000, 35000, 15000 и снова 35000 рублей, — а найденной услуге цена всё
	 * равно не читалась, потому что код брал поле `priceRub`, которого у услуги
	 * прайса нет (там `basePriceRub`), и падал на `|| "0"`. В смету, которую
	 * подписывает пациент, уходили суммы, которых клиника не назначала.
	 *
	 * СТАЛО: цена только из прайса клиники. Не нашлось — цены нет, строка ждёт
	 * выбора услуги, а человеку сказано, чего именно не хватает в прайсе.
	 */
	const importSuggestions = () => {
		if (pendingPlanSuggestions.length === 0) return;

		const suggestions = pendingPlanSuggestions.map((suggestion) => ({
			toothNumber: Number(suggestion?.toothNumber),
			state: String(suggestion?.state ?? ""),
		}));

		const resolved = resolvePlanSuggestions(
			suggestions.filter((suggestion) =>
				Number.isFinite(suggestion.toothNumber),
			),
			dashboard?.serviceCatalog ?? [],
		);

		const newRows: DraftServiceRow[] = resolved.map((row) => {
			const diagnosis =
				TOOTH_STATE_LABELS[row.state as ToothState] ?? row.state;
			return {
				key: Math.random().toString(36).slice(2),
				priceId: row.serviceId ?? "",
				/*
				 * Пока услуга не выбрана, в названии стоит диагноз врача, а не
				 * выдуманная «Процедура»: диагноз — факт из зубной формулы.
				 */
				name: row.serviceTitle
					? `[Зуб ${row.toothNumber}] ${row.serviceTitle}`
					: `[Зуб ${row.toothNumber}] ${diagnosis}`,
				/* Неизвестная цена остаётся ПУСТОЙ. Ноль означал бы «бесплатно». */
				price: row.priceRub === null ? "" : String(row.priceRub),
				quantity: "1",
				toothNumber: row.toothNumber,
				needsPriceFromCatalog: row.priceRub === null,
			};
		});

		setNewPlanName("План лечения (из зубной формулы)");
		setDraftRows(newRows.length > 0 ? newRows : [makeDraftRow()]);
		setPriceNotices(planPriceIssueMessages(resolved));
		setDraftProblems([]);
		setShowCreateForm(true);
		clearPendingPlanSuggestions();

		setTimeout(
			() => formRef.current?.scrollIntoView({ behavior: "smooth" }),
			50,
		);
	};

	const cancelCreateForm = () => {
		setShowCreateForm(false);
		setDraftRows([makeDraftRow()]);
		setPriceNotices([]);
		setDraftProblems([]);
	};

	const addDraftRow = () => setDraftRows((prev) => [...prev, makeDraftRow()]);

	const removeDraftRow = (key: string) =>
		setDraftRows((prev) => prev.filter((r) => r.key !== key));

	const updateDraftRow = (
		key: string,
		/* Только текстовые поля строки: номер зуба и признак «цены нет» правятся
		 * не вводом, а подбором услуги. */
		field: "priceId" | "name" | "price" | "quantity",
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

		/*
		 * БЫЛО: строки без цены молча отбрасывались (`parseFloat(r.price) > 0`), а
		 * строка без позиции прайса уходила с `priceId: null`, который контракт
		 * сервера не принимает, — весь запрос падал с 400 и общей фразой. Теперь
		 * ни одна заполненная строка не исчезает: человеку названы конкретные
		 * строки и сказано, что с ними сделать.
		 */
		const validation = validateDraftPlanRows(draftRows);
		if (!validation.ok) {
			setDraftProblems(validation.problems);
			showToast(
				validation.problems[0] ?? "План не сохранён: проверьте строки сметы",
				"error",
				9000,
			);
			return;
		}
		setDraftProblems([]);
		const items = validation.items;

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
				showToast(
					`План создан на сумму ${formatKopecksRu(validation.totalKopecks)}`,
					"success",
				);
				setShowCreateForm(false);
				setPriceNotices([]);
				await fetchPlans();
			} else {
				const err = await res.json().catch(() => ({}));
				const serverMessage = (err as { message?: string }).message;
				setDraftProblems(
					serverMessage
						? [serverMessage]
						: [
								`Сервер не сохранил план (код ${res.status}). Позиции остались на экране — их не нужно набирать заново.`,
							],
				);
				showToast(
					serverMessage ||
						`Не удалось создать план (код ${res.status}). Позиции остались на экране.`,
					"error",
					9000,
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
		const total = calcPlanTotalKopecks(plan);
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
            <thead><tr><th>Услуга</th><th>Зуб</th><th>Кол-во</th><th>Цена</th><th>Скидка</th><th>Сумма</th></tr></thead>
            <tbody>
              ${(plan.items || [])
								/*
								 * Суммы печатаются точными копейками, и «Сумма» — это итог
								 * строки СО скидкой. Раньше в столбце стояло цена × количество
								 * без скидки, а «Итого» считалось со скидкой: печатный
								 * документ не сходился сам с собой. Скидка получила
								 * собственный столбец: пациент обязан видеть, из чего вышла
								 * разница, — в рублях, как её и хранит контракт.
								 */
								.map((item) => {
									const lineTotal = planLineTotalKopecks(item);
									const discount = moneyOrDash(
										planLineTotalKopecks({
											price: item.discount ?? 0,
											quantity: 1,
										}),
									);
									return `<tr><td>${item.name}</td><td>${item.toothNumber ?? "—"}</td><td>${item.quantity}</td><td>${moneyOrDash(planLineTotalKopecks({ price: item.price, quantity: 1 }))}</td><td>${item.discount ? discount : "—"}</td><td>${moneyOrDash(lineTotal)}</td></tr>`;
								})
								.join("")}
            </tbody>
          </table>
          <div class="total">Итого: ${moneyOrDash(total)}</div>
        </body>
      </html>
    `);
		win.document.close();
		win.print();
		setActiveDropdown(null);
	};

	const handleExportCsv = (plan: TreatmentPlan) => {
		/*
		 * Суммы в файл уходят с двумя знаками и русской запятой: `String(1500.5)`
		 * давало «1500.5», и в бухгалтерии полтинник читался как пять копеек.
		 * Значение берётся из целых копеек, поэтому округления здесь нет.
		 */
		const csvAmount = (value: number | null | undefined): string => {
			const kopecks = planLineTotalKopecks({ price: value ?? 0, quantity: 1 });
			if (kopecks === null) return "";
			return `${Math.trunc(kopecks / 100)},${String(Math.abs(kopecks) % 100).padStart(2, "0")}`;
		};
		const rows = [["Услуга", "Зуб", "Кол-во", "Цена (₽)", "Скидка (₽)", "Фаза"]];
		for (const item of plan.items || []) {
			rows.push([
				item.name,
				String(item.toothNumber ?? ""),
				String(item.quantity),
				csvAmount(item.price),
				csvAmount(item.discount ?? 0),
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

						{/* Suggestions button */}
						{pendingPlanSuggestions.length > 0 && (
							<button
								type="button"
								className="new-plan-btn"
								style={{
									background: "var(--teal-500)",
									borderColor: "var(--teal-600)",
								}}
								onClick={importSuggestions}
							>
								<Plus size={16} />
								Предложения из зубной формулы ({pendingPlanSuggestions.length})
							</button>
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

						{/*
						 * Почему часть строк без цены и что делать. Появляется только
						 * когда есть о чём сказать, поэтому обычную форму не утяжеляет.
						 */}
						{priceNotices.length > 0 && (
							<div className="cpf-notice" role="status">
								<Info size={16} className="cpf-notice-icon" />
								<div>
									{priceNotices.map((notice) => (
										<p key={notice}>{notice}</p>
									))}
								</div>
							</div>
						)}

						{draftProblems.length > 0 && (
							<div className="cpf-notice is-problem" role="alert">
								<ShieldAlert size={16} className="cpf-notice-icon" />
								<div>
									<p>План не сохранён. Поправьте, пожалуйста:</p>
									{draftProblems.map((problem) => (
										<p key={problem}>{problem}</p>
									))}
								</div>
							</div>
						)}

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
										style={{
											display: "flex",
											flexDirection: "column",
											gap: "4px",
										}}
									>
										<select
											className="cpf-input"
											aria-label="Услуга из прайса"
											value={row.priceId || ""}
											onChange={(e) => {
												const val = e.target.value;
												const catItem = dashboard?.serviceCatalog?.find(
													(s) => s.id === val,
												);
												if (catItem) {
													/*
													 * Цена берётся из basePriceRub — денежного поля прайса.
													 * Раньше здесь стояло `catItem.priceRub`, поля с таким
													 * именем у услуги прайса нет, и в поле цены попадала
													 * строка «undefined».
													 *
													 * Номер зуба сохраняется в названии: без него строка,
													 * пришедшая из зубной формулы, теряла привязку к зубу
													 * при выборе услуги из списка.
													 */
													setDraftRows((prev) =>
														prev.map((r) =>
															r.key === row.key
																? {
																		...r,
																		priceId: catItem.id,
																		name:
																			r.toothNumber != null
																				? `[Зуб ${r.toothNumber}] ${catItem.title}`
																				: catItem.title,
																		price: String(catItem.basePriceRub),
																		needsPriceFromCatalog: false,
																	}
																: r,
														),
													);
												} else {
													updateDraftRow(row.key, "priceId", "");
												}
											}}
										>
											<option value="">
												{(dashboard?.serviceCatalog?.length ?? 0) === 0
													? "В прайсе нет услуг — заполните прайс"
													: "Выберите услугу из прайса"}
											</option>
											{dashboard?.serviceCatalog?.map((sc) => (
												<option key={sc.id} value={sc.id}>
													{sc.title} (
													{moneyOrDash(
														planLineTotalKopecks({
															price: sc.basePriceRub,
															quantity: 1,
														}),
													)}
													)
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
										{row.needsPriceFromCatalog && (
											<span className="cpf-row-hint">
												Цены нет: выберите услугу из прайса
											</span>
										)}
									</div>
									{/*
									 * Поле текстовое, а не числовое: разбор идёт единственным
									 * разборщиком суммы (apps/web/src/rubAmountInput.ts), который
									 * принимает и «1500,50», и «1 500.50». Числовое поле в
									 * русской раскладке запятую просто съедало.
									 */}
									<input
										className="cpf-input cpf-col-price"
										type="text"
										inputMode="decimal"
										aria-label="Цена услуги в рублях"
										placeholder="Цена из прайса"
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
						<FileText
							size={40}
							strokeWidth={1}
							className="comp-no-plans-icon"
						/>
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

								const total = calcPlanTotalKopecks(plan);
								const isApproved =
									plan.status === "Approved" || plan.status === "Completed";
								const isArchived =
									plan.status === "Archived" || plan.status === "Rejected";
								const isDraft =
									plan.status === "Draft" || plan.status === "Active";
								const isSaving = savingPlanId === plan.id;

								/*
								 * Доля ДМС — построчно, по разделу прайса каждой услуги.
								 *
								 * БЫЛО: среднее арифметическое четырёх процентов договора,
								 * поделённое на четыре. Такой доли не назначал никто, и она
								 * прямо противоречила значку «Вне покрытия ДМС» на той же
								 * строке: значок говорил «не покрыто», а «К оплате» всё равно
								 * уменьшалось на усреднённую долю.
								 */
								const insuranceCoverage =
									insuranceActive && insuranceData && total !== null
										? insuranceCoverageKopecks(
												(plan.items ?? []).flatMap((item) => {
													const lineKopecks = planLineTotalKopecks(item);
													if (lineKopecks === null) return [];
													const service = (
														dashboard?.serviceCatalog ?? []
													).find(
														(candidate) =>
															candidate.id === item.priceId ||
															candidate.title === item.name,
													);
													return [
														{
															lineKopecks,
															category: service?.category ?? null,
														},
													];
												}),
												insuranceData,
											)
										: 0;
								const patientCopay =
									total === null ? null : total - insuranceCoverage;

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
																		const text = `${plan.name}\nСтатус: ${statusLabel(plan.status)}\nИтого: ${moneyOrDash(total)}`;
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
															<span>{moneyOrDash(total)}</span>
														</div>
														<div className="price-row insurance-share">
															<span>Покрывает ДМС:</span>
															<span>−{formatKopecksRu(insuranceCoverage)}</span>
														</div>
														<div className="price-row final-due">
															<span>К оплате:</span>
															<span className="price-val">
																{moneyOrDash(patientCopay)}
															</span>
														</div>
													</>
												) : (
													<div className="price-row final-due no-insurance">
														<span>Итого:</span>
														<span className="price-val">
															{moneyOrDash(total)}
														</span>
													</div>
												)}
												{total === null && (
													<p className="plan-total-unreadable">
														У одной из услуг плана испорчена цена, поэтому итог
														посчитать нельзя. Откройте план и укажите цену
														заново.
													</p>
												)}
											</div>
										</div>

										{/* Services list */}
										<div className="services-section">
											<h3>Услуги в смете</h3>
											{!plan.items || plan.items.length === 0 ? (
												<p className="plan-no-items">Услуги не добавлены</p>
											) : (
												plan.items.map((item) => {
													/*
													 * Раздел прайса определяет процент покрытия. Раскладка
													 * одна и та же для значка на строке и для итога карточки
													 * (./planPricing.ts), поэтому они больше не могут
													 * разойтись. Прежний `case "ortho"` не срабатывал
													 * никогда: раздел называется `orthodontics`.
													 */
													const service = (
														dashboard?.serviceCatalog ?? []
													).find(
														(candidate) =>
															candidate.id === item.priceId ||
															candidate.title === item.name,
													);
													const coveragePct =
														insuranceActive && insuranceData
															? coveragePercentForCategory(
																	service?.category,
																	insuranceData,
																)
															: 0;
													const isExcluded =
														insuranceActive &&
														insuranceData !== null &&
														coveragePct === 0;
													const lineKopecks = planLineTotalKopecks(item);

													return (
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
																<p
																	className="price-tag"
																	style={{
																		display: "flex",
																		alignItems: "center",
																		gap: "6px",
																	}}
																>
																	{isExcluded && (
																		<span
																			title="Услуга не входит в программу ДМС пациента"
																			style={{
																				color: "var(--amber-500)",
																				fontSize: "12px",
																				display: "flex",
																				alignItems: "center",
																				gap: "4px",
																			}}
																		>
																			<ShieldAlert size={14} /> Вне покрытия ДМС
																		</span>
																	)}
																	{/*
																	 * Скидка показывается рублями, а не процентами:
																	 * контракт и колонка базы хранят её суммой
																	 * (treatment_plan_items_new.discount), и прежняя
																	 * подпись «(−500%)» на скидке в 500 ₽ вводила
																	 * пациента в заблуждение.
																	 */}
																	<span>
																		{moneyOrDash(
																			planLineTotalKopecks({
																				price: item.price,
																				quantity: 1,
																			}),
																		)}
																		{item.quantity > 1
																			? ` × ${item.quantity}`
																			: ""}
																		{item.discount
																			? ` (скидка ${moneyOrDash(
																					planLineTotalKopecks({
																						price: item.discount,
																						quantity: 1,
																					}),
																				)})`
																			: ""}
																		{item.discount || item.quantity > 1
																			? ` = ${moneyOrDash(lineKopecks)}`
																			: ""}
																	</span>
																</p>
															</div>
															{plan.status !== "Draft" &&
																plan.status !== "Archived" &&
																plan.status !== "Rejected" && (
																	<div
																		className="tile-actions"
																		style={{
																			marginLeft: "auto",
																			display: "flex",
																			alignItems: "center",
																		}}
																	>
																		<select
																			value={item.status || "Proposed"}
																			onChange={(e) =>
																				updatePlanItemStatus(
																					plan.id,
																					item.id,
																					e.target.value as any,
																				)
																			}
																			onClick={(e) => e.stopPropagation()}
																			style={{
																				padding: "4px 8px",
																				fontSize: "12px",
																				borderRadius: "6px",
																				background: "var(--paper)",
																				border: "1px solid var(--line)",
																				color: "var(--ink)",
																				outline: "none",
																			}}
																		>
																			<option value="Proposed">
																				Предложено
																			</option>
																			<option value="In_Progress">
																				В процессе
																			</option>
																			<option value="Completed">
																				Завершено
																			</option>
																		</select>
																	</div>
																)}
														</div>
													);
												})
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
														onClick={() => updatePlanStatus(plan.id, "Draft")}
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
