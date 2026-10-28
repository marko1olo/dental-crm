import React from "react";
import { Layers, Check, ShieldCheck, Palette, Sparkles } from "lucide-react";
import type { JawScope } from "../labMath";

export interface DentalLabOrderItem {
	readonly id: string;
	readonly toothFdi?: number | undefined;
	readonly teeth?: readonly number[] | undefined;
	readonly jawScope?: JawScope | null | undefined;
	readonly constructionTitle: string;
	readonly constructionType: string;
	readonly materialTitle: string;
	readonly materialId: string;
	readonly colorVita: string;
	readonly priceRub: number;
	readonly labCostRub: number;
	readonly notes?: string | undefined;
}

export interface DentalLabOrderItemsTableProps {
	readonly selectedTeeth: readonly number[];
	readonly jawScope?: JawScope | null | undefined;
	readonly constructionType: string;
	readonly material: string;
	readonly shadeVita: string;
	readonly priceRub?: number | undefined;
	readonly labCostRub?: number | undefined;
	readonly onSelectConstruction?: ((type: string) => void) | undefined;
	readonly onSelectMaterial?: ((mat: string) => void) | undefined;
	readonly onOpenOdontogram?: (() => void) | undefined;
	readonly onOpenShadePicker?: (() => void) | undefined;
}

const COMMON_CONSTRUCTIONS = [
	{ id: "single_crown", title: "Одиночная коронка", desc: "Анатомическая коронка под ключ" },
	{ id: "bridge", title: "Мостовидный протез", desc: "Мост от 3 единиц с промежутками" },
	{ id: "inlay_onlay", title: "Вкладка (Inlay/Onlay)", desc: "Микропротезирование дефекта зуба" },
	{ id: "veneer", title: "Керамический винир", desc: "Эстетическая реставрация зоны улыбки" },
	{ id: "clasp_denture", title: "Бюгельный протез", desc: "С кламмерами или замковой фиксацией" },
	{ id: "implant_crown", title: "Коронка на импланте", desc: "Винтовая или цементная фиксация" },
] as const;

const COMMON_MATERIALS = [
	{ id: "zirconia_multilayer", name: "Цирконий ZrO2 Multi-Layer", tag: "Премиум эстетика" },
	{ id: "emax_lithium_disilicate", name: "Дисиликат лития IPS E.max", tag: "Максимальная адгезия" },
	{ id: "pfm_duceram", name: "Металлокерамика Duceram Plus", tag: "Проверенная классика" },
	{ id: "pmma_temporary", name: "Временная пластмасса PMMA CAD", tag: "Временный этап (2 дня)" },
	{ id: "cobalt_chrome", name: "Кобальт-хромовый сплав КХС", tag: "Каркасы и бюгели" },
] as const;

/**
 * DentalLabOrderItemsTable — таблица и спецификация конструкций заказ-наряда ЗТЛ (Мандат 8b: <= 250 строк).
 * Объединяет перечень конструкций (E.max, циркон, бюгели), цвета по VITA, металл и формулу зубов.
 */
export function DentalLabOrderItemsTable({
	selectedTeeth,
	jawScope,
	constructionType,
	material,
	shadeVita,
	priceRub,
	labCostRub,
	onSelectConstruction,
	onSelectMaterial,
	onOpenOdontogram,
	onOpenShadePicker,
}: DentalLabOrderItemsTableProps): React.JSX.Element {
	const currentConstruction = COMMON_CONSTRUCTIONS.find((c) => c.id === constructionType) || {
		id: constructionType,
		title: "Индивидуальная конструкция",
		desc: "Конструкция по индивидуальному протоколу врача",
	};

	const currentMaterial = COMMON_MATERIALS.find((m) => m.id === material) || {
		id: material,
		name: material || "Диоксид циркония",
		tag: "Стандарт лаборатории",
	};

	const toothScopeLabel = jawScope
		? `Челюсть: ${jawScope === "upper" ? "Верхняя" : jawScope === "lower" ? "Нижняя" : "Обе челюсти"}`
		: selectedTeeth.length > 0
		? `Зубы FDI (${selectedTeeth.length}): ${selectedTeeth.join(", ")}`
		: "Зуб 16 (по умолчанию)";

	return (
		<div className="space-y-4" data-testid="lab-order-items-table-container">
			{/* Сводная карточка спецификации заказа */}
			<div className="rounded-2xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] p-4 shadow-2xs space-y-3">
				<div className="flex items-center justify-between border-b border-[var(--line,#cbd5e1)] pb-2.5">
					<div className="flex items-center gap-2">
						<Layers className="w-4 h-4 text-[#0d9488]" />
						<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
							Спецификация конструкции заказ-наряда
						</span>
					</div>
					<span className="text-[11px] font-semibold text-[var(--muted,#64748b)]">
						{toothScopeLabel}
					</span>
				</div>

				{/* Таблица текущей позиции */}
				<div className="overflow-x-auto">
					<table className="w-full text-left text-xs border-collapse">
						<thead>
							<tr className="border-b border-[var(--line,#cbd5e1)] text-[var(--muted,#64748b)] text-[11px]">
								<th className="py-2 pr-3 font-semibold">Локализация</th>
								<th className="py-2 pr-3 font-semibold">Тип конструкции</th>
								<th className="py-2 pr-3 font-semibold">Материал / Сплав</th>
								<th className="py-2 pr-3 font-semibold">Цвет VITA</th>
								<th className="py-2 text-right font-semibold">Стоимость</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line,#cbd5e1)]">
							<tr>
								<td className="py-2.5 pr-3 font-bold text-[var(--ink,#0f172a)] whitespace-nowrap">
									{toothScopeLabel}
								</td>
								<td className="py-2.5 pr-3">
									<div className="font-semibold text-[var(--ink,#0f172a)]">{currentConstruction.title}</div>
									<div className="text-[10px] text-[var(--muted,#64748b)]">{currentConstruction.desc}</div>
								</td>
								<td className="py-2.5 pr-3">
									<div className="font-medium text-[var(--ink,#0f172a)]">{currentMaterial.name}</div>
									<span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-[var(--muted,#64748b)]">
										{currentMaterial.tag}
									</span>
								</td>
								<td className="py-2.5 pr-3">
									<button
										type="button"
										onClick={onOpenShadePicker}
										className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-xs font-bold text-[#0d9488] hover:border-[#0d9488] cursor-pointer"
										title="Изменить оттенок по шкале VITA"
									>
										<Palette className="w-3 h-3" />
										<span>{shadeVita || "A2"}</span>
									</button>
								</td>
								<td className="py-2.5 text-right whitespace-nowrap">
									<div className="font-extrabold text-[#0d9488]">
										{priceRub ? `${priceRub.toLocaleString("ru-RU")} ₽` : "24 000 ₽"}
									</div>
									{labCostRub != null && labCostRub > 0 && (
										<div className="text-[10px] text-[var(--muted,#64748b)]">
											себест: {labCostRub.toLocaleString("ru-RU")} ₽
										</div>
									)}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			{/* Быстрый выбор типа конструкции в 1 клик */}
			<div className="space-y-2">
				<label className="block text-xs font-bold text-[var(--ink,#0f172a)]">
					Тип ортопедической конструкции:
				</label>
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
					{COMMON_CONSTRUCTIONS.map((item) => {
						const isSelected = item.id === constructionType;
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => onSelectConstruction?.(item.id)}
								className={`p-2.5 rounded-xl border text-left transition cursor-pointer min-h-[44px] flex flex-col justify-between ${
									isSelected
										? "border-[#0d9488] bg-teal-500/10 text-teal-900 dark:text-teal-100 ring-1 ring-[#0d9488] shadow-2xs"
										: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)]"
								}`}
							>
								<div className="flex items-center justify-between gap-1">
									<span className="text-xs font-bold truncate">{item.title}</span>
									{isSelected && <Check className="w-3.5 h-3.5 text-[#0d9488] shrink-0" />}
								</div>
								<span className="text-[10px] text-[var(--muted,#64748b)] truncate mt-0.5">
									{item.desc}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Выбор материала и сплава */}
			<div className="space-y-2">
				<label className="block text-xs font-bold text-[var(--ink,#0f172a)]">
					Материал и технология изготовления:
				</label>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{COMMON_MATERIALS.map((mat) => {
						const isSelected = mat.id === material;
						return (
							<button
								key={mat.id}
								type="button"
								onClick={() => onSelectMaterial?.(mat.id)}
								className={`p-2.5 rounded-xl border text-left transition cursor-pointer min-h-[44px] flex items-center justify-between gap-2 ${
									isSelected
										? "border-[#0d9488] bg-teal-500/10 text-teal-900 dark:text-teal-100 ring-1 ring-[#0d9488] shadow-2xs"
										: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)]"
								}`}
							>
								<div className="min-w-0">
									<div className="text-xs font-bold truncate">{mat.name}</div>
									<div className="text-[10px] text-[var(--muted,#64748b)]">{mat.tag}</div>
								</div>
								{isSelected && <ShieldCheck className="w-4 h-4 text-[#0d9488] shrink-0" />}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}
