import {
	AlertTriangle,
	ArrowUpFromLine,
	CheckCircle2,
	Clock,
	FileText,
	Layers,
	PackageCheck,
	Plus,
	Search,
	Sparkles,
	Trash2,
	Zap,
} from "lucide-react";
import React, { lazy, Suspense, useMemo, useState } from "react";
import { money } from "../AppHelpers.js";
import { showToast } from "./GlobalToast.js";
import type { InventoryItem } from "./inventory/useInventoryLogic.js";

const MaterialBomsSettingsPanel = lazy(() =>
	import("./inventory/MaterialBomsSettingsPanel.js").then((module) => ({
		default: module.MaterialBomsSettingsPanel,
	})),
);

export interface InventoryServiceUsagePanelProps {
	readonly organizationId: string;
	readonly inventoryItems?: readonly InventoryItem[];
	readonly rulesList?: readonly any[];
	readonly onRulesUpdated?: () => void;
	readonly getHeaders?: (headers?: Record<string, string>) => Record<string, string>;
}

/**
 * Панель норм расхода и автоматического списания расходных материалов под процедуры (Мандаты 8b, 8e, 8n).
 * Применяется для нормирования списания расходников (анестезия, карпулы, пломбировочные материалы)
 * при завершении приёма пациента по каталогу процедур.
 */
export const InventoryServiceUsagePanel: React.FC<InventoryServiceUsagePanelProps> = ({
	organizationId,
	inventoryItems = [],
	rulesList = [],
	onRulesUpdated,
	getHeaders,
}) => {
	const [activeSubView, setActiveSubView] = useState<"boms" | "quick_test">("boms");
	const [testServiceQuery, setTestServiceQuery] = useState("");
	const [selectedService, setSelectedService] = useState<{
		id: string;
		code: string;
		name: string;
		category: string;
	}>({
		id: "srv-caries-01",
		code: "A16.07.002",
		name: "Восстановление зуба пломбой (лечение кариеса)",
		category: "Терапия",
	});

	const [isDeducting, setIsDeducting] = useState(false);

	// Тестовый набор расходников под выбранную услугу
	const estimatedConsumables = useMemo(() => {
		return [
			{
				name: "Анестетик Артикаин с эпинефрином (карпула)",
				quantity: 1,
				unit: "карп.",
				estimatedCostRub: 120,
			},
			{
				name: "Игла карпульная 30G короткая",
				quantity: 1,
				unit: "шт.",
				estimatedCostRub: 15,
			},
			{
				name: "Композитный материал Filtek Ultimate (порция)",
				quantity: 1,
				unit: "порц.",
				estimatedCostRub: 450,
			},
			{
				name: "Бонд адгезивный Single Bond Universal",
				quantity: 0.1,
				unit: "мл",
				estimatedCostRub: 80,
			},
			{
				name: "Базовый набор приёма (перчатки, маска, слюноотсос, нагрудник)",
				quantity: 1,
				unit: "компл.",
				estimatedCostRub: 95,
			},
		];
	}, []);

	const estimatedTotalRub = useMemo(() => {
		return estimatedConsumables.reduce(
			(sum, it) => sum + it.quantity * it.estimatedCostRub,
			0,
		);
	}, [estimatedConsumables]);

	const handleExecuteTestDeduction = async () => {
		setIsDeducting(true);
		try {
			const headers = getHeaders
				? getHeaders({ "Content-Type": "application/json" })
				: { "Content-Type": "application/json" };

			const res = await fetch(`/api/inventory/${organizationId}/deduct`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					organizationId,
					items: estimatedConsumables.map((c) => ({
						name: c.name,
						quantity: c.quantity,
						allowOverdraft: true,
						reason: `Списание по услуге ${selectedService.code} ${selectedService.name}`,
					})),
					reason: `Автоматическое списание по нормам расхода процедуры ${selectedService.code}`,
					allowOverdraft: true,
				}),
			});

			if (res.ok) {
				showToast(
					`Расходники по услуге «${selectedService.name}» успешно списаны со склада (мягкий овердрафт разрешен)`,
					"success",
				);
				if (typeof window !== "undefined") {
					window.dispatchEvent(new CustomEvent("dente-inventory-reload"));
				}
				if (onRulesUpdated) onRulesUpdated();
			} else {
				const err = await res.json().catch(() => ({}));
				showToast(err.message || "Ошибка при списании расходников", "error");
			}
		} catch (e) {
			console.error("Ошибка при списании:", e);
			showToast("Сетевой сбой при списании со склада", "error");
		} finally {
			setIsDeducting(false);
		}
	};

	return (
		<div className="flex flex-col h-full w-full overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
			{/* Верхний компактный переключатель разделов */}
			<div
				className="px-3 py-1.5 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center justify-between gap-2 shrink-0"
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "8px 20px",
					background: "var(--paper-soft)",
					borderBottom: "1px solid var(--line)",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Layers size={15} style={{ color: "var(--teal, #0d9488)", flexShrink: 0 }} />
					<span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
						Расход материалов по услугам (Каталог процедур)
					</span>
				</div>

				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
						background: "var(--paper)",
						padding: "3px",
						borderRadius: "8px",
						border: "1px solid var(--line)",
					}}
				>
					<button
						type="button"
						onClick={() => setActiveSubView("boms")}
						style={{
							height: "28px",
							padding: "0 12px",
							borderRadius: "6px",
							fontSize: "12px",
							fontWeight: 600,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
							border: "none",
							background:
								activeSubView === "boms"
									? "var(--teal-soft, rgba(20, 184, 166, 0.14))"
									: "transparent",
							color:
								activeSubView === "boms"
									? "var(--teal-dark, #0f766e)"
									: "var(--muted)",
						}}
						data-testid="subtab-bom-editor"
					>
						<FileText size={13} />
						<span>Нормы расхода материалов (Справочник техкарт)</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveSubView("quick_test")}
						style={{
							height: "28px",
							padding: "0 12px",
							borderRadius: "6px",
							fontSize: "12px",
							fontWeight: 600,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
							border: "none",
							background:
								activeSubView === "quick_test"
									? "var(--teal-soft, rgba(20, 184, 166, 0.14))"
									: "transparent",
							color:
								activeSubView === "quick_test"
									? "var(--teal-dark, #0f766e)"
									: "var(--muted)",
						}}
						data-testid="subtab-bom-simulator"
					>
						<Zap size={13} />
						<span>Симулятор списания визита</span>
					</button>
				</div>
			</div>

			{/* Основной контент */}
			<div className="flex-1 overflow-y-auto">
				{activeSubView === "boms" ? (
					<Suspense
						fallback={
							<div className="p-8 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
								<Clock className="animate-spin text-teal-600" size={16} />
								<span>Загрузка технологических карт с диска...</span>
							</div>
						}
					>
						<MaterialBomsSettingsPanel organizationId={organizationId} />
					</Suspense>
				) : (
					/* Симулятор списания под выбранную процедуру */
					<div className="p-4 max-w-3xl mx-auto space-y-4">
						<div className="p-3.5 bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl">
							<h3 className="text-xs font-bold text-[var(--ink)] mb-1 flex items-center gap-1.5">
								<Sparkles size={14} className="text-teal-600" />
								<span>Автоматический расчет себестоимости материалов по услуге</span>
							</h3>
							<p className="text-[11px] text-[var(--muted)] leading-relaxed">
								При проведении медицинского визита система автоматически списывает привязанные расходные материалы.
								В случае нулевого остатка на складе активируется мягкий овердрафт, не блокирующий лечение пациента.
							</p>
						</div>

						{/* Карточка выбранной услуги */}
						<div className="border border-[var(--line)] rounded-xl p-4 bg-[var(--paper)] shadow-xs space-y-3">
							<div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
								<div>
									<span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-teal-700 dark:text-teal-300 font-bold border border-[var(--line)]">
										{selectedService.code} • {selectedService.category}
									</span>
									<h4 className="text-sm font-bold text-[var(--ink)] mt-1">
										{selectedService.name}
									</h4>
								</div>
								<div className="text-right">
									<span className="text-[11px] text-[var(--muted)]">Себестоимость материалов:</span>
									<p className="text-sm font-bold text-teal-600 dark:text-teal-400 font-mono">
										{money(Math.round(estimatedTotalRub * 100))}
									</p>
								</div>
							</div>

							{/* Список расходников по техкарте */}
							<div className="space-y-1.5">
								<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block mb-2">
									Спецификация расходных материалов:
								</span>
								<div className="border border-[var(--line)] rounded-lg overflow-hidden">
									<table className="w-full text-xs text-left">
										<thead>
											<tr className="bg-[var(--paper-soft)] text-[var(--muted)] border-b border-[var(--line)]">
												<th className="py-2 px-3">Материал</th>
												<th className="py-2 px-3 text-right">Норма расхода</th>
												<th className="py-2 px-3 text-right">Цена за ед.</th>
												<th className="py-2 px-3 text-right">Сумма</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-[var(--line)]">
											{estimatedConsumables.map((item, idx) => (
												<tr key={idx} className="hover:bg-[var(--paper-soft)]">
													<td className="py-2 px-3 font-medium text-[var(--ink)]">
														{item.name}
													</td>
													<td className="py-2 px-3 text-right font-mono font-bold text-[var(--ink)]">
														{item.quantity} {item.unit}
													</td>
													<td className="py-2 px-3 text-right font-mono text-[var(--muted)]">
														{money(Math.round(item.estimatedCostRub * 100))}
													</td>
													<td className="py-2 px-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
														{money(Math.round(item.quantity * item.estimatedCostRub * 100))}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>

							{/* Кнопка тестового списания */}
							<div className="pt-2 flex items-center justify-end gap-2">
								<button
									type="button"
									disabled={isDeducting}
									onClick={handleExecuteTestDeduction}
									className="h-8 px-4 rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer hover:opacity-90 disabled:opacity-50 transition-all"
									data-testid="btn-test-execute-deduction"
								>
									<PackageCheck size={14} />
									<span>{isDeducting ? "Списание..." : "Провести тестовое списание"}</span>
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default InventoryServiceUsagePanel;
