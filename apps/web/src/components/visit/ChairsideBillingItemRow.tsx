/**
 * apps/web/src/components/visit/ChairsideBillingItemRow.tsx
 *
 * Single item row in Chairside Service Billing list with inline price editing.
 */

import React from "react";
import { AlertCircle, Boxes, Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { getDefaultBomLinksForService804n } from "@dental/shared";
import type { VisitBillingServiceItem } from "./visitBillingTypes.js";

export interface ServiceBomMaterial {
	name: string;
	quantity: number;
	unit: string;
	isOverdraft?: boolean;
}

export function getServiceBomMaterials(
	code804n?: string,
	title?: string,
	quantity = 1,
): ServiceBomMaterial[] {
	const qty = Math.max(1, quantity);
	const lowTitle = (title || "").toLowerCase();

	// 1. Поиск по номенклатурным техкартам 804н
	if (code804n) {
		try {
			const links = getDefaultBomLinksForService804n(code804n);
			if (links && links.length > 0) {
				return links.map((l) => ({
					name: l.itemName,
					quantity: Number((l.quantityPerService * qty).toFixed(2)),
					unit: l.unit === "шприц_гр" ? "г" : l.unit === "dose" ? "доза" : l.unit || "ед.",
				}));
			}
		} catch {
			// fallback to clinical heuristic below
		}
	}

	// 2. Клинические правила на основе названия услуги
	if (
		lowTitle.includes("кариес") ||
		lowTitle.includes("пломб") ||
		lowTitle.includes("композит") ||
		lowTitle.includes("реставрац") ||
		code804n?.startsWith("A16.07.002")
	) {
		return [
			{
				name: "Светоотверждаемый нанокомпозит (Filtek / Estelite)",
				quantity: Number((0.4 * qty).toFixed(1)),
				unit: "г",
			},
			{
				name: "Адгезивная система самопротравливающая (7 пок.)",
				quantity: 1 * qty,
				unit: "доза",
			},
			{
				name: "Полировочные головки и диски (Sof-Lex / Enhance)",
				quantity: 1 * qty,
				unit: "шт.",
			},
		];
	}

	if (
		lowTitle.includes("анестези") ||
		lowTitle.includes("ультракаин") ||
		lowTitle.includes("артикаин") ||
		lowTitle.includes("септонест") ||
		code804n?.startsWith("A11.07.012") ||
		code804n?.startsWith("B01.003.004")
	) {
		return [
			{
				name: "Анестетик артикаиновый 4% с эпинефрином 1:100000",
				quantity: 1 * qty,
				unit: "карп.",
			},
			{
				name: "Игла карпульная стоматологическая 30G",
				quantity: 1 * qty,
				unit: "шт.",
			},
		];
	}

	if (
		lowTitle.includes("гигиен") ||
		lowTitle.includes("airflow") ||
		lowTitle.includes("air-flow") ||
		lowTitle.includes("чистк") ||
		code804n?.startsWith("A16.07.051")
	) {
		return [
			{
				name: "Порошок Air-Flow профилактический",
				quantity: 25 * qty,
				unit: "г",
			},
			{
				name: "Паста полировочная абразивная",
				quantity: 2 * qty,
				unit: "г",
			},
		];
	}

	if (
		lowTitle.includes("эндо") ||
		lowTitle.includes("канал") ||
		lowTitle.includes("пульпит") ||
		lowTitle.includes("периодонтит") ||
		code804n?.startsWith("A16.07.030")
	) {
		return [
			{
				name: "Гипохлорит натрия 3% для ирригации",
				quantity: 10 * qty,
				unit: "мл",
			},
			{
				name: "Гуттаперчевые штифты конусные",
				quantity: 3 * qty,
				unit: "шт.",
			},
			{
				name: "Силер эндодонтический (AH Plus)",
				quantity: Number((0.2 * qty).toFixed(1)),
				unit: "г",
			},
		];
	}

	if (
		lowTitle.includes("удалени") ||
		lowTitle.includes("экстракци") ||
		lowTitle.includes("хирург") ||
		code804n?.startsWith("A16.07.001")
	) {
		return [
			{
				name: "Гемостатическая губка стерильная",
				quantity: 1 * qty,
				unit: "шт.",
			},
			{
				name: "Шовный материал с атравматической иглой",
				quantity: 1 * qty,
				unit: "шт.",
			},
		];
	}

	return [
		{
			name: "Смотровой набор одноразовый стоматологический",
			quantity: 1 * qty,
			unit: "компл.",
		},
	];
}

export interface ChairsideBillingItemRowProps {
	item: VisitBillingServiceItem;
	index: number;
	isWarranty100: boolean;
	readOnly?: boolean;
	onToggleWarranty: (id: string) => void;
	onQuantityChange: (id: string, delta: number) => void;
	onStepPrice: (id: string, delta: number) => void;
	onPriceChange: (id: string, newPrice: number) => void;
	onRemoveService: (id: string) => void;
	onStornoService?: (item: VisitBillingServiceItem, materials: ServiceBomMaterial[]) => void;
	hasOverdraftWarning?: boolean;
}

export const ChairsideBillingItemRow: React.FC<ChairsideBillingItemRowProps> = ({
	item,
	index,
	isWarranty100,
	readOnly = false,
	onToggleWarranty,
	onQuantityChange,
	onStepPrice,
	onPriceChange,
	onRemoveService,
	onStornoService,
	hasOverdraftWarning = false,
}) => {
	const rowGrossRub = item.unitPriceRub * item.quantity;
	const isItemWarranty = item.isWarranty || isWarranty100;
	const rowDueRub = isItemWarranty ? 0 : rowGrossRub;

	const bomMaterials = getServiceBomMaterials(item.code804n, item.title, item.quantity);
	const hasMaterialOverdraft = bomMaterials.some((m) => m.isOverdraft);
	const showOverdraft = Boolean(
		hasOverdraftWarning ||
			(item as { isOverdraft?: boolean }).isOverdraft ||
			(item as { hasOverdraft?: boolean }).hasOverdraft ||
			hasMaterialOverdraft,
	);

	const handleRemove = () => {
		if (onStornoService) {
			onStornoService(item, bomMaterials);
		}
		if (typeof window !== "undefined") {
			const stornoDetail = {
				serviceId: item.id,
				serviceTitle: item.title,
				code804n: item.code804n,
				toothCode: item.toothCode,
				quantity: item.quantity,
				materials: bomMaterials,
				timestamp: new Date().toISOString(),
			};
			window.dispatchEvent(
				new CustomEvent("dente-service-storno", { detail: stornoDetail }),
			);
		}
		onRemoveService(item.id);
	};

	return (
		<div
			className={`p-3 rounded-xl border transition-all ${
				isItemWarranty
					? "border-emerald-500/30 bg-emerald-500/5"
					: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]"
			}`}
			data-testid={`chairside-service-row-${item.id}`}
		>
			<div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
				{/* Service info */}
				<div className="min-w-0 flex-1 space-y-1">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-xs font-mono font-bold text-[var(--muted,#64748b)]">
							#{index + 1}
						</span>
						{item.toothCode ? (
							<span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
								{item.toothCode.includes(",") ? `зубы ${item.toothCode}` : `зуб ${item.toothCode}`}
							</span>
						) : (
							<span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-500">
								Общая
							</span>
						)}
						{item.code804n && (
							<span className="text-xs font-mono font-semibold text-[var(--muted,#64748b)]">
								[{item.code804n}]
							</span>
						)}
						<span className="text-xs font-bold text-[var(--ink,#0f172a)] break-words">
							{item.title}
						</span>
					</div>

					{/* Per-Service 100% Warranty Autonomy Toggle */}
					<div className="flex items-center gap-2 pt-0.5">
						<button
							type="button"
							onClick={() => onToggleWarranty(item.id)}
							title="Оформить данную услугу по 100% гарантии (0 ₽)"
							className={`min-h-[28px] sm:h-7 px-2.5 rounded-md text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
								item.isWarranty
									? "bg-emerald-600 text-white shadow-2xs"
									: "bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] hover:border-emerald-400 text-emerald-700 dark:text-emerald-300"
							}`}
							data-testid={`btn-warranty-toggle-${item.id}`}
						>
							<ShieldCheck size={12} />
							<span>{item.isWarranty ? "Гарантия 100% (0 ₽)" : "По гарантии"}</span>
						</button>
					</div>

					{/* BOM Materials deduction (Mandate 8z - human language, eliminate "Акт расхода материалов по СанПиН") */}
					<div
						className="pt-1.5 flex flex-col gap-1 text-[11px]"
						data-testid={`bom-deduction-info-${item.id}`}
					>
						<div className="flex items-center gap-1.5 text-[var(--muted,#64748b)] font-semibold">
							<Boxes size={12} className="text-indigo-500 shrink-0" />
							<span>Списание материалов по услуге:</span>
						</div>
						<div className="flex flex-wrap gap-1">
							{bomMaterials.map((mat, mIdx) => (
								<span
									key={mIdx}
									className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40"
									data-testid={`bom-chip-${item.id}-${mIdx}`}
								>
									<span>{mat.name}</span>
									<span className="font-bold opacity-80">
										({mat.quantity} {mat.unit})
									</span>
								</span>
							))}
						</div>
						{showOverdraft && (
							<div
								className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 font-medium"
								data-testid={`overdraft-warning-${item.id}`}
							>
								<AlertCircle size={10} className="shrink-0" />
								<span>Материал отсутствует по учету (будет списан в овердрафт)</span>
							</div>
						)}
					</div>
				</div>

				{/* Controls: Quantity + Inline Price Editing (+500 ₽ / -500 ₽) */}
				<div className="flex items-center gap-3 flex-wrap shrink-0">
					{/* Quantity */}
					<div className="flex items-center border border-[var(--line,#e2e8f0)] rounded-lg bg-[var(--paper,#ffffff)] overflow-hidden">
						<button
							type="button"
							onClick={() => onQuantityChange(item.id, -1)}
							title="Уменьшить количество"
							className="w-7 h-7 flex items-center justify-center hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] cursor-pointer"
							data-testid={`btn-qty-minus-${item.id}`}
						>
							<Minus size={12} />
						</button>
						<span className="w-8 text-center text-xs font-bold font-mono">
							{item.quantity}
						</span>
						<button
							type="button"
							onClick={() => onQuantityChange(item.id, 1)}
							title="Увеличить количество"
							className="w-7 h-7 flex items-center justify-center hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] cursor-pointer"
							data-testid={`btn-qty-plus-${item.id}`}
						>
							<Plus size={12} />
						</button>
					</div>

					{/* Inline Price Editing with +500 ₽ / -500 ₽ Step Buttons */}
					<div className="flex items-center gap-1 bg-[var(--paper,#ffffff)] p-1 rounded-xl border border-[var(--line,#e2e8f0)]">
						<button
							type="button"
							onClick={() => onStepPrice(item.id, -500)}
							title={item.unitPriceRub <= 0 ? "Минимальная цена 0 ₽" : "Снизить цену на 500 ₽"}
							className="h-7 px-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold font-mono cursor-pointer transition-all active:scale-95 shrink-0 flex items-center justify-center"
							data-testid={`btn-step-minus-500-${item.id}`}
						>
							-500 ₽
						</button>

						<div className="relative flex items-center">
							<input
								type="number"
								min={0}
								step={100}
								value={item.unitPriceRub}
								onChange={(e) => onPriceChange(item.id, Number(e.target.value) || 0)}
								className="h-7 w-20 px-2 text-xs font-bold font-mono text-right bg-transparent border-0 outline-none text-[var(--ink,#0f172a)]"
								data-testid={`input-unit-price-${item.id}`}
								title="Прямое редактирование цены услуги"
							/>
							<span className="text-xs font-mono font-bold text-[var(--muted,#64748b)] pr-1.5">
								₽
							</span>
						</div>

						<button
							type="button"
							onClick={() => onStepPrice(item.id, 500)}
							title="Увеличить цену на 500 ₽"
							className="h-7 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold font-mono cursor-pointer transition-all active:scale-95 shrink-0 flex items-center justify-center"
							data-testid={`btn-step-plus-500-${item.id}`}
						>
							+500 ₽
						</button>
					</div>

					{/* Total for row */}
					<div className="w-24 text-right">
						{item.isWarranty || isWarranty100 ? (
							<div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
								0 ₽
								<div className="text-xs font-normal text-emerald-700 dark:text-emerald-500">
									Гарантия
								</div>
							</div>
						) : (
							<div className="text-xs font-bold font-mono text-[var(--ink,#0f172a)]">
								{rowDueRub.toLocaleString("ru-RU")} ₽
							</div>
						)}
					</div>

					{/* Delete */}
					{!readOnly && (
						<button
							type="button"
							onClick={handleRemove}
							title="Удалить услугу из визита (с автоматическим сторно материалов)"
							className="w-7 h-7 rounded-lg text-[var(--muted,#64748b)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center cursor-pointer transition-colors"
							data-testid={`btn-remove-service-${item.id}`}
						>
							<Trash2 size={14} />
						</button>
					)}
				</div>
			</div>
		</div>
	);
};
