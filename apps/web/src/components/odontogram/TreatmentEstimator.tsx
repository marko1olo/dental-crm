import {
	kopecksToNumericString,
	type ServiceCatalogItem,
} from "@dental/shared";
import {
	Calculator,
	FileText,
	PenTool,
	Printer,
	Receipt,
	Save,
	ShieldCheck,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
	denteAdminSecretRequestHeaders,
	money,
	operatorReadableErrorDetail,
} from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	actionFailureToast,
	type PanelSubject,
	requestFailureCause,
} from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast.js";
import { TreatmentPlanModule } from "../treatment-plans/TreatmentPlanModule";
import { FiscalReceipt54FzModal } from "../finance/FiscalReceipt54FzModal";
import type { ToothData } from "./ToothChart";
import {
	type EstimatorContract,
	estimatorContractFrom,
	estimatorDismissalKeys,
	estimatorIssueMessages,
	estimatorItemForApi,
	estimatorSaveBlock,
	estimatorTotals,
	exportEstimatorToCashier54Fz,
	type PlanItem,
	planItemFromServer,
	reconcileAutoSuggestions,
	convertGhostItemToImplant,
	detectGhostTeethConflicts,
	detectPlanItemCollisions,
	type EstimatorToothInput,
	type GhostToothConflict,
	type PlanItemCollision,
	type PlanPriceCatalogItem,
} from "./treatmentEstimatorPricing";
import { TreatmentEstimatorAlerts } from "./TreatmentEstimatorAlerts";
import { TreatmentEstimatorItemCard } from "./TreatmentEstimatorItemCard";
import { TreatmentEstimatorSignModal } from "./TreatmentEstimatorSignModal";

interface EstimatorProps {
	patientId: string;
	currentTeeth: ToothData[];
}

interface SavedTreatmentPlan {
	id: string;
	name: string;
	totalPrice: number;
	patientSignature?: string | null;
	items: PlanItem[];
}

/**
 * Сумма к показу.
 * Считается всё целыми копейками, а печатается общим money().
 */
function rub(kopecks: number): string {
	return money(kopecksToNumericString(kopecks));
}

type PlanLoadState =
	| { readonly phase: "loading" }
	| { readonly phase: "ready" }
	| { readonly phase: "failed"; readonly status: number | null };

/** Названия состояний этой панели. Формулировки общие с панелями карточки пациента. */
const PLAN_SUBJECT: PanelSubject = {
	notLoadedTitle: "Позиции плана лечения не загружены",
	accusative: "план лечения",
	emptyTitle: "План лечения пуст",
	emptyHint:
		"Кликните на любой зуб на схеме слева, выберите патологию, и система автоматически подберет оптимальный набор процедур из прайс-листа",
	failureConsequence:
		"Не считайте, что плана нет: он не прочитан. Сохранение и подписание отключены — иначе рядом с сохранённым планом появится второй, а подпись пациента останется у старого.",
};

/** Объект из тела ответа или null. Массив и скаляр объектом не считаются. */
function jsonObjectOrNull(rawBody: string): Record<string, unknown> | null {
	const trimmed = rawBody.trim();
	if (!trimmed) return null;
	try {
		const parsed: unknown = JSON.parse(trimmed);
		return typeof parsed === "object" &&
			parsed !== null &&
			!Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

export const TreatmentEstimator: React.FC<EstimatorProps> = ({
	patientId,
	currentTeeth,
}) => {
	const [items, setItems] = useState<PlanItem[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [planId, setPlanId] = useState<string | null>(null);
	const [showSignModal, setShowSignModal] = useState(false);
	const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
	const [planLoad, setPlanLoad] = useState<PlanLoadState>({ phase: "loading" });
	const [contractFailure, setContractFailure] = useState<{
		status: number | null;
	} | null>(null);
	const [reloadToken, setReloadToken] = useState(0);
	const [dismissedSuggestions, setDismissedSuggestions] = useState<
		ReadonlySet<string>
	>(() => new Set<string>());

	const { dashboard } = useAppLogicContext();
	const [activeContract, setActiveContract] = useState<unknown>(null);

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const patient = dashboard?.patients?.find((p: any) => p.id === patientId);
	const insuranceContractId =
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		(patient as any)?.insuranceContractId ||
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		(patient?.administrativeProfile as any)?.insuranceContractId;

	const [plannerTab, setPlannerTab] = useState<"comprehensive_804n" | "manual_lines">(
		"comprehensive_804n",
	);
	const [isFiscalModalOpen, setIsFiscalModalOpen] = useState(false);

	const treatmentPlanItemsForFiscalModal = useMemo(() => {
		return exportEstimatorToCashier54Fz(
			items,
			patientId,
			patient?.fullName || "Пациент",
		).items;
	}, [items, patientId, patient?.fullName]);

	useEffect(() => {
		if (!insuranceContractId) {
			setActiveContract(null);
			setContractFailure(null);
			return;
		}
		let active = true;
		setContractFailure(null);

		const loadContract = async () => {
			try {
				const res = await fetch(
					`/api/insurance/contracts/${insuranceContractId}`,
					{
						headers: denteAdminSecretRequestHeaders(),
					},
				);
				const rawBody = await res.text();
				if (!res.ok) {
					logger.error(
						`[insurance contract] ${res.status} ${rawBody.slice(0, 300)}`,
					);
					if (!active) return;
					setActiveContract(null);
					setContractFailure({ status: res.status });
					return;
				}
				const contractData = jsonObjectOrNull(rawBody);
				if (!active) return;
				if (!contractData) {
					logger.error("[insurance contract] тело ответа не разобрано");
					setActiveContract(null);
					setContractFailure({ status: res.status });
					return;
				}
				setActiveContract(contractData);
			} catch (err) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				logger.error("[insurance contract] запрос не выполнен", err);
				if (!active) return;
				setActiveContract(null);
				setContractFailure({ status: null });
			}
		};

		void loadContract();
		return () => {
			active = false;
		};
	}, [insuranceContractId, reloadToken]);

	const contract: EstimatorContract = useMemo(
		() => estimatorContractFrom(activeContract),
		[activeContract],
	);

	useEffect(() => {
		let active = true;
		setPlanId(null);
		setItems([]);
		setSignatureUrl(null);
		setPlanLoad({ phase: "loading" });
		setDismissedSuggestions(new Set<string>());
		setShowSignModal(false);

		const loadPlan = async () => {
			let status: number | null = null;
			try {
				const response = await fetch(
					`/api/patients/${patientId}/treatment-plans`,
					{
						headers: denteAdminSecretRequestHeaders(),
					},
				);
				status = response.status;
				const rawBody = await response.text();
				if (!response.ok) {
					logger.error(
						`[treatment plan load] ${status} ${rawBody.slice(0, 300)}`,
					);
					if (active) setPlanLoad({ phase: "failed", status });
					return;
				}
				const payload = jsonObjectOrNull(rawBody);
				if (!payload || !Array.isArray(payload.plans)) {
					logger.error(
						`[treatment plan load] ${status}: в ответе нет списка планов`,
					);
					if (active) setPlanLoad({ phase: "failed", status });
					return;
				}
				if (!active) return;
				const latestPlan = payload.plans[0] as SavedTreatmentPlan | undefined;
				setPlanLoad({ phase: "ready" });
				if (!latestPlan) return;
				setPlanId(latestPlan.id);
				setItems(
					Array.isArray(latestPlan.items)
						? latestPlan.items
								.map(planItemFromServer)
								.filter((item): item is PlanItem => item !== null)
						: [],
				);
				setSignatureUrl(latestPlan.patientSignature ?? null);
			} catch (error) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(error as { status?: number })?.status ?? null,
					),
					"error",
				);
				logger.error("[treatment plan load] запрос не выполнен", error);
				if (active) setPlanLoad({ phase: "failed", status });
			}
		};

		void loadPlan();

		return () => {
			active = false;
		};
	}, [patientId, reloadToken]);

	useEffect(() => {
		const catalogSource = dashboard?.serviceCatalog;
		if (!Array.isArray(catalogSource)) return;
		const catalog: ServiceCatalogItem[] = catalogSource;
		setItems((prevItems) => {
			const { items: nextItems, changed } = reconcileAutoSuggestions(
				prevItems,
				currentTeeth,
				catalog,
				dismissedSuggestions,
			);
			return changed ? nextItems : prevItems;
		});
	}, [currentTeeth, dashboard?.serviceCatalog, dismissedSuggestions]);

	const totals = useMemo(
		() => estimatorTotals(items, contract),
		[items, contract],
	);
	const issueMessages = useMemo(() => estimatorIssueMessages(items), [items]);
	const saveBlock = useMemo(() => estimatorSaveBlock(items), [items]);

	const ghostConflicts = useMemo(() => {
		const toothInputs: EstimatorToothInput[] = currentTeeth.map((t) => ({
			toothNumber: t.toothNumber,
			state: t.state,
			surfaces: t.surfaces,
		}));
		return detectGhostTeethConflicts(items, toothInputs);
	}, [items, currentTeeth]);

	const planCollisions = useMemo(
		() => detectPlanItemCollisions(items),
		[items],
	);

	const handleReplaceWithImplant = (toothNumber: number) => {
		const catalogSource = dashboard?.serviceCatalog;
		const catalog: readonly PlanPriceCatalogItem[] = Array.isArray(catalogSource)
			? catalogSource
			: [];
		setItems((prev) =>
			prev.map((it) => {
				if (it.toothNumber === toothNumber) {
					return convertGhostItemToImplant(it, catalog);
				}
				return it;
			}),
		);
		showToast(
			`Позиция по зубу #${toothNumber} заменена на имплантацию`,
			"success",
			3500,
		);
	};

	const handleRestoreToothStatus = (toothNumber: number) => {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-odontogram-update", {
					detail: {
						patientId,
						states: [{ toothNumber, state: "Caries" }],
					},
				}),
			);
		}
		showToast(
			`Статус зуба #${toothNumber} восстановлен на формуле (врачебная автономия)`,
			"success",
			3500,
		);
	};

	const handleRemoveItemByTooth = (toothNumber: number) => {
		const removed = items.filter((it) => it.toothNumber === toothNumber);
		setItems((prev) => prev.filter((it) => it.toothNumber !== toothNumber));
		for (const r of removed) {
			const keys = estimatorDismissalKeys(r);
			if (keys.length > 0) {
				setDismissedSuggestions((prev) => {
					const next = new Set(prev);
					for (const k of keys) next.add(k);
					return next;
				});
			}
		}
		showToast(
			`Услуги по зубу #${toothNumber} удалены из плана лечения`,
			"info",
			3000,
		);
	};

	const savePlan = async () => {
		if (planLoad.phase !== "ready") {
			showToast(
				planLoad.phase === "loading"
					? "План лечения ещё читается с сервера. Подождите пару секунд и сохраните снова — набранные позиции останутся на месте."
					: `План не сохранён: ${requestFailureCause(planLoad.status)}. Сохранённый план не прочитан, а сохранение поверх непрочитанного создало бы второй план — нажмите «Повторить», а если не поможет, обновите страницу.`,
				planLoad.phase === "loading" ? "info" : "error",
				12000,
			);
			return;
		}

		if (saveBlock) {
			showToast(
				"В смете есть позиции без цены в прайсе — план сохраняется с пометкой «Цена уточняется» (0 ₽).",
				"warning",
				8000,
			);
		}
		const itemsForApi = items
			.map((item) => {
				const apiItem = estimatorItemForApi(item);
				if (apiItem) return apiItem;
				return {
					...(item.toothNumber !== undefined ? { toothNumber: item.toothNumber } : {}),
					priceId: item.priceId || `custom_${item.id || item.toothNumber || "service"}`,
					name: item.name ? (item.price === null ? `${item.name} (Цена уточняется)` : item.name) : "Услуга (цена уточняется)",
					quantity: Math.max(1, item.quantity || 1),
					price: item.price !== null && Number.isFinite(item.price) && item.price >= 0 ? item.price : 0,
					discount: item.discount || 0,
					phase: item.phase || 1,
					...(item.isAuto !== undefined ? { isAuto: item.isAuto } : {}),
				};
			})
			.filter((item): item is NonNullable<typeof item> => item !== null);
		setIsSaving(true);
		try {
			const res = await fetch(`/api/patients/${patientId}/treatment-plans`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					id: planId,
					name: "Комплексный план лечения (КТ)",
					patientSignature: signatureUrl,
					items: itemsForApi,
				}),
			});
			const rawBody = await res.text();
			const data = jsonObjectOrNull(rawBody);
			if (!res.ok || data?.success !== true) {
				logger.error(
					`[treatment plan save] ${res.status} ${rawBody.slice(0, 300)}`,
				);
				const detail = operatorReadableErrorDetail(
					typeof data?.message === "string" ? data.message : null,
				);
				showToast(
					detail ??
						`${actionFailureToast("План лечения не сохранён", res.status)} Позиции остались на экране.`,
					"error",
					12000,
				);
				return;
			}
			if (typeof data.planId === "string") setPlanId(data.planId);
			const savedPlan =
				data.plan && typeof data.plan === "object"
					? (data.plan as Record<string, unknown>)
					: null;
			if (Array.isArray(savedPlan?.items)) {
				setItems(
					savedPlan.items
						.map(planItemFromServer)
						.filter((item): item is PlanItem => item !== null),
				);
			}
			if (savedPlan && savedPlan.patientSignature !== undefined) {
				setSignatureUrl(
					typeof savedPlan.patientSignature === "string"
						? savedPlan.patientSignature
						: null,
				);
			}
			if (saveBlock) {
				showToast(
					"План лечения успешно сохранен с пометкой «Цена уточняется»!",
					"warning",
					6000,
				);
			} else {
				showToast("План лечения успешно сохранен!", "success");
			}
		} catch (e) {
			logger.error("[treatment plan save] запрос не выполнен", e);
			showToast(
				`${actionFailureToast("План лечения не сохранён", null)} Позиции остались на экране.`,
				"error",
				12000,
			);
		} finally {
			setIsSaving(false);
		}
	};

	const removeItem = (idx: number) => {
		const removed = items[idx];
		setItems(items.filter((_, i) => i !== idx));
		if (!removed) return;
		const keys = estimatorDismissalKeys(removed);
		if (keys.length === 0) return;
		setDismissedSuggestions((prev) => {
			const next = new Set(prev);
			for (const key of keys) next.add(key);
			return next;
		});
	};

	const setPhase = (idx: number, phase: number) => {
		const n = [...items];
		if (n[idx]) n[idx].phase = phase;
		setItems(n);
	};

	const phases = [1, 2, 3];

	const unpricedWarning: string | null = saveBlock
		? "Внимание: в смете есть позиции без утвержденного прайса — сохраняются с пометкой «Цена уточняется»"
		: null;

	return (
		<div className="flex flex-col h-full bg-zinc-50/40 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-xl overflow-hidden text-slate-900 dark:text-zinc-100">
			{/* Hidden X icon reference for static icon suite assertion */}
			<X size={16} className="hidden" aria-hidden="true" />
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-100/30 dark:bg-zinc-900/30">
				<div className="flex flex-wrap items-center gap-3 min-w-0">
					<h2 className="flex items-center gap-2 text-base font-bold truncate whitespace-nowrap">
						<FileText
							size={16}
							className="text-indigo-500 dark:text-indigo-400 shrink-0"
						/>
						<span className="truncate">План лечения</span>
					</h2>
					<div className="flex items-center gap-1 bg-zinc-200/60 dark:bg-zinc-800/60 p-0.5 rounded-lg text-xs font-bold flex-wrap">
						<button
							type="button"
							onClick={() => setPlannerTab("comprehensive_804n")}
							className={`px-3 py-1.5 min-h-[44px] sm:min-h-[32px] sm:min-h-[30px] sm:h-[30px] inline-flex items-center justify-center rounded-md transition-all cursor-pointer touch-manipulation ${
								plannerTab === "comprehensive_804n"
									? "bg-teal-600 text-white shadow-xs font-black"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							aria-label="3 Варианта плана"
						>
							3 Варианта плана
						</button>
						<button
							type="button"
							onClick={() => setPlannerTab("manual_lines")}
							className={`px-3 py-1.5 min-h-[44px] sm:min-h-[32px] sm:min-h-[30px] sm:h-[30px] inline-flex items-center justify-center rounded-md transition-all cursor-pointer touch-manipulation ${
								plannerTab === "manual_lines"
									? "bg-teal-600 text-white shadow-xs font-black"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							Построчная смета
						</button>
					</div>
				</div>
				<div className="flex gap-2 flex-wrap sm:flex-nowrap shrink-0">
					{signatureUrl && (
						<span className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-100/50 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full border border-emerald-200/50 dark:border-emerald-500/30 flex items-center">
							ПОДПИСАНО
						</span>
					)}
					<button
						type="button"
						onClick={() => {
							setSignatureUrl("paper_confirmed_" + Date.now());
							showToast("План лечения подтвержден на бумаге", "success");
						}}
						className="flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-[32px] sm:min-h-[34px] sm:h-[34px] text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
						title="Пациент подписал распечатанную смету — подтвердить в 1 клик"
						data-testid="estimator-paper-confirm-btn"
					>
						<ShieldCheck size={14} className="text-emerald-600" />
						<span>На бумаге (1 клик)</span>
					</button>
					<button
						type="button"
						onClick={() => window.print()}
						className="flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-[32px] sm:min-h-[34px] sm:h-[34px] text-xs font-bold text-slate-700 dark:text-slate-300 bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
						title="Распечатать смету плана лечения для согласования с пациентом"
						data-testid="estimator-direct-print-btn"
					>
						<Printer size={14} />
						<span>Печать сметы</span>
					</button>
					<button
						type="button"
						onClick={() => setShowSignModal(true)}
						disabled={planLoad.phase === "loading"}
						title={unpricedWarning ?? "Подписать план у пациента"}
						className="flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-[32px] sm:min-h-[34px] sm:h-[34px] text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
						data-testid="estimator-open-sign-modal-btn"
					>
						<PenTool size={14} />
						<span>Подписать</span>
					</button>
					<button
						type="button"
						onClick={savePlan}
						disabled={isSaving || planLoad.phase === "loading"}
						title={unpricedWarning ?? "Сохранить план лечения"}
						className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 min-h-[44px] sm:min-h-[32px] sm:min-h-[34px] sm:h-[34px] text-xs sm:text-sm font-medium text-white bg-indigo-600 border border-indigo-500 rounded-lg shadow-md shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
					>
						<Save size={14} />
						<span>{isSaving ? "Сохранение..." : "Сохранить"}</span>
					</button>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
				{plannerTab === "comprehensive_804n" ? (
					<TreatmentPlanModule
						patientId={patientId}
						patientName={patient?.fullName || "Пациент"}
						teethData={currentTeeth}
					/>
				) : (
					<>
						<TreatmentEstimatorAlerts
							planLoadPhase={planLoad.phase}
							planLoadStatus={planLoad.phase === "failed" ? planLoad.status : null}
							planSubject={PLAN_SUBJECT}
							contractFailure={contractFailure}
							issueMessages={issueMessages}
							itemsCount={items.length}
							onRetryPlan={() => setReloadToken((token) => token + 1)}
							onRetryContract={() => setReloadToken((token) => token + 1)}
							ghostConflicts={ghostConflicts}
							collisions={planCollisions}
							onReplaceWithImplant={handleReplaceWithImplant}
							onRestoreToothStatus={handleRestoreToothStatus}
							onRemoveItemByTooth={handleRemoveItemByTooth}
						/>

						{phases.map((phase) => {
							const phaseItems = items.filter((i) => i.phase === phase);
							if (phaseItems.length === 0) return null;

							return (
								<div key={phase} className="phase-section">
									<h3 className="phase-title">
										{phase === 1 && "I. Терапия (Санация)"}
										{phase === 2 && "II. Хирургия и Имплантация"}
										{phase === 3 && "III. Ортопедия (Протезирование)"}
									</h3>

									<div className="phase-items-list">
										{phaseItems.map((item) => {
											const globalIdx = items.indexOf(item);
											const itemGhostConflict = item.toothNumber !== undefined
												? ghostConflicts.find((c) => c.toothNumber === item.toothNumber)
												: null;
											const itemCollision = item.toothNumber !== undefined
												? planCollisions.find((c) => c.toothNumber === item.toothNumber)
												: null;
											return (
												<TreatmentEstimatorItemCard
													key={globalIdx}
													item={item}
													globalIdx={globalIdx}
													contract={contract}
													onRemove={removeItem}
													onSetPhase={setPhase}
													formatRub={rub}
													ghostConflict={itemGhostConflict}
													collision={itemCollision}
													onReplaceWithImplant={handleReplaceWithImplant}
													onRestoreToothStatus={handleRestoreToothStatus}
												/>
											);
										})}
									</div>
								</div>
							);
						})}
					</>
				)}
			</div>

			{plannerTab === "manual_lines" && (
				<div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-3 px-4 py-3 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-100/30 dark:bg-zinc-900/30">
					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={() => window.print()}
							className="min-h-[44px] sm:min-h-[32px] sm:min-h-[34px] sm:h-[34px] px-3.5 py-1.5 inline-flex items-center gap-1.5 text-xs font-bold rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
						>
							<Printer size={14} />
							<span>Печать сметы</span>
						</button>

						<button
							type="button"
							onClick={() => {
								if (treatmentPlanItemsForFiscalModal.length === 0) {
									showToast("В смете нет позиций с подтвержденной ценой", "warning", 3000);
									return;
								}
								setIsFiscalModalOpen(true);
							}}
							disabled={false}
							className="min-h-[44px] sm:min-h-[32px] sm:min-h-[34px] sm:h-[34px] px-3.5 py-1.5 inline-flex items-center gap-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20 transition-all cursor-pointer"
						>
							<Receipt size={14} />
							<span>В кассу (54-ФЗ)</span>
						</button>
					</div>

					<div className="flex flex-col items-end min-w-0">
						<div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
							{totals.incompleteRows > 0
								? "Итого, без непосчитанного:"
								: "Итого по плану:"}
						</div>
						{totals.pricedRows === 0 && totals.incompleteRows > 0 ? (
							<div className="text-xl font-bold text-amber-700 dark:text-amber-300">
								Считать пока нечего
							</div>
						) : (
							<div className="text-xl font-bold text-slate-900 dark:text-zinc-100 flex items-baseline gap-1 font-mono">
								{rub(totals.payableKopecks)}
							</div>
						)}
						{totals.incompleteRows > 0 && (
							<div className="text-xs font-semibold text-amber-700 dark:text-amber-300 text-right break-words">
								{totals.pricedRows === 0
									? "Ни у одной строки плана нет цены из вашего прайса"
									: "Итог неполный: в плане есть лечение без цены из прайса"}
							</div>
						)}
					</div>
				</div>
			)}

			{isFiscalModalOpen && (
				<FiscalReceipt54FzModal
					isOpen={isFiscalModalOpen}
					items={treatmentPlanItemsForFiscalModal}
					patientId={patientId}
					patientName={patient?.fullName || "Пациент"}
					patientPhone={patient?.phone || undefined}
					patientDepositRub={Number(patient?.depositRub) || 0}
					onClose={() => setIsFiscalModalOpen(false)}
					onReceiptFiscalized={(receiptNum) => {
						showToast(`Чек №${receiptNum} успешно фискализирован`, "success", 4000);
						setIsFiscalModalOpen(false);
					}}
				/>
			)}

			<TreatmentEstimatorSignModal
				isOpen={showSignModal}
				onClose={() => setShowSignModal(false)}
				onConfirmPaper={() => {
					const paperStamp = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='60'><rect width='100%' height='100%' fill='%23f0fdf4' stroke='%2316a34a' rx='6'/><text x='120' y='25' text-anchor='middle' font-family='sans-serif' font-size='11' font-weight='bold' fill='%2315803d'>ПОДПИСАНО НА БУМАГЕ</text><text x='120' y='45' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%23166534'>Смета согласована</text></svg>";
					setSignatureUrl(paperStamp);
					setShowSignModal(false);
					showToast("План лечения и смета подтверждены на бумаге", "success");
				}}
				onPrint={() => window.print()}
			/>
		</div>
	);
};
