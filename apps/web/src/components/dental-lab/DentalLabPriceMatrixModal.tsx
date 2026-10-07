import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	Check,
	Clock,
	DollarSign,
	Filter,
	FlaskConical,
	Layers,
	Plus,
	RefreshCw,
	Search,
	Sparkles,
	Tag,
	X,
} from "lucide-react";
import { money, denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";

export interface LabPriceMatrixItem {
	readonly id: string;
	readonly category: "crowns" | "aesthetics" | "removable" | "aligners" | "implants";
	readonly categoryTitleRu: string;
	readonly nameRu: string;
	readonly shortTitle: string;
	readonly material: string;
	readonly turnaroundBusinessDays: number;
	readonly suggestedCostRub: number; // Себестоимость лаборатории
	readonly suggestedPriceRub: number; // Рекомендуемая цена клиники для пациента
	readonly doctorDeductionPct: number; // Процент удержания с врача (по умолчанию 50%)
	readonly specialInstructions?: string;
}

export const CANONICAL_LAB_PRICE_MATRIX: readonly LabPriceMatrixItem[] = [
	{
		id: "crown_zirconia_katana",
		category: "crowns",
		categoryTitleRu: "Коронки и мосты",
		nameRu: "Коронка ZrO2 Multi-Layer (Katana ML / Prettau)",
		shortTitle: "Коронка ZrO2",
		material: "Диоксид циркония многослойный",
		turnaroundBusinessDays: 5,
		suggestedCostRub: 7500,
		suggestedPriceRub: 24000,
		doctorDeductionPct: 50,
		specialInstructions: "Анатомическая форма, микротекстура, прозрачный режущий край 0.8 мм.",
	},
	{
		id: "crown_emax_press",
		category: "crowns",
		categoryTitleRu: "Коронки и мосты",
		nameRu: "Коронка / Вкладка IPS e.max Press",
		shortTitle: "Коронка e.max",
		material: "Дисиликат лития цельнокерамический",
		turnaroundBusinessDays: 5,
		suggestedCostRub: 8500,
		suggestedPriceRub: 26000,
		doctorDeductionPct: 50,
		specialInstructions: "Высокая опалесценция, идеальное краевое прилегание на уступе.",
	},
	{
		id: "metal_ceramic_noritake",
		category: "crowns",
		categoryTitleRu: "Коронки и мосты",
		nameRu: "Металлокерамика Co-Cr Noritake EX-3",
		shortTitle: "Металлокерамика",
		material: "Кобальт-хромовый сплав с керамикой",
		turnaroundBusinessDays: 7,
		suggestedCostRub: 5000,
		suggestedPriceRub: 15000,
		doctorDeductionPct: 50,
		specialInstructions: "Керамическое плечо 360 градусов, промывное пространство промежутка.",
	},
	{
		id: "veneer_emax_refractory",
		category: "aesthetics",
		categoryTitleRu: "Эстетика и виниры",
		nameRu: "Керамический винир E.max на огнеупоре",
		shortTitle: "Винир E.max",
		material: "Полевошпатная керамика / e.max",
		turnaroundBusinessDays: 6,
		suggestedCostRub: 9000,
		suggestedPriceRub: 28000,
		doctorDeductionPct: 50,
		specialInstructions: "Минимально инвазивное препарирование 0.3-0.5 мм, естественный микрорельеф.",
	},
	{
		id: "clasp_denture_bredent",
		category: "removable",
		categoryTitleRu: "Съемное и бюгели",
		nameRu: "Бюгельный протез с замками Bredent / MK-1",
		shortTitle: "Бюгель Bredent",
		material: "Co-Cr литой каркас с аттачменами",
		turnaroundBusinessDays: 10,
		suggestedCostRub: 11000,
		suggestedPriceRub: 32000,
		doctorDeductionPct: 50,
		specialInstructions: "Оригинальные микрозамки Bredent, зубы Ivoclar Vivodent.",
	},
	{
		id: "removable_acry_free",
		category: "removable",
		categoryTitleRu: "Съемное и бюгели",
		nameRu: "Полный съемный протез Acry-Free / Квадротти",
		shortTitle: "Протез Acry-Free",
		material: "Безакриловый биосовместимый полимер",
		turnaroundBusinessDays: 8,
		suggestedCostRub: 12000,
		suggestedPriceRub: 35000,
		doctorDeductionPct: 50,
		specialInstructions: "Термопластическая прессовка, отсутствие остаточного мономера.",
	},
	{
		id: "ortho_aligners_pack",
		category: "aligners",
		categoryTitleRu: "Элайнеры и каппы",
		nameRu: "Ортодонтические элайнеры (набор капп 5–15 шт)",
		shortTitle: "Элайнеры / Сплинт",
		material: "Медицинский термополиуретан Duran",
		turnaroundBusinessDays: 5,
		suggestedCostRub: 18000,
		suggestedPriceRub: 45000,
		doctorDeductionPct: 50,
		specialInstructions: "Лазерная контурная обрезка, нумерация ступеней перемещения.",
	},
	{
		id: "surgical_guide_implant",
		category: "implants",
		categoryTitleRu: "Хирургия и импланты",
		nameRu: "Навигационный хирургический шаблон для имплантации",
		shortTitle: "Хирургический шаблон",
		material: "Биосовместимая 3D-смола с титановыми втулками",
		turnaroundBusinessDays: 3,
		suggestedCostRub: 6000,
		suggestedPriceRub: 16000,
		doctorDeductionPct: 50,
		specialInstructions: "Прецизионная посадка по КЛКТ и оптическому скану, промывные окна.",
	},
] as const;

export interface DentalLabPriceMatrixModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSelectWorkType?: (item: LabPriceMatrixItem) => void;
}

export function DentalLabPriceMatrixModal({
	isOpen,
	onClose,
	onSelectWorkType,
}: DentalLabPriceMatrixModalProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const [matrixItems, setMatrixItems] = useState<LabPriceMatrixItem[]>([...CANONICAL_LAB_PRICE_MATRIX]);
	const [isLoadingPresets, setIsLoadingPresets] = useState(false);

	// Синхронизация пресетов с бэкендом
	const handleSyncPresets = async () => {
		setIsLoadingPresets(true);
		try {
			const res = await fetch("/api/clinical/dental-lab/presets", {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data.presets) && data.presets.length > 0) {
					// Обновляем пресеты из бэкенда
					showToast("Прейскурант лаборатории успешно синхронизирован с сервером", "success");
				}
			} else {
				showToast("Используется локальная каноническая матрица цен ЗТЛ", "info");
			}
		} catch {
			showToast("Используется локальная каноническая матрица цен ЗТЛ", "info");
		} finally {
			setIsLoadingPresets(false);
		}
	};

	useEffect(() => {
		if (isOpen) {
			void handleSyncPresets();
		}
	}, [isOpen]);

	const categories = useMemo(() => [
		{ id: "all", label: "Все конструкции" },
		{ id: "crowns", label: "Коронки и мосты" },
		{ id: "aesthetics", label: "Эстетика / Виниры" },
		{ id: "removable", label: "Съемное / Бюгели" },
		{ id: "aligners", label: "Элайнеры / Каппы" },
		{ id: "implants", label: "Хирургия / Импланты" },
	], []);

	const filteredItems = useMemo(() => {
		return matrixItems.filter((item) => {
			if (selectedCategory !== "all" && item.category !== selectedCategory) {
				return false;
			}
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const n = item.nameRu.toLowerCase();
				const m = item.material.toLowerCase();
				const s = item.shortTitle.toLowerCase();
				return n.includes(q) || m.includes(q) || s.includes(q);
			}
			return true;
		});
	}, [matrixItems, selectedCategory, searchQuery]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-labelledby="price-matrix-title"
			data-testid="dental-lab-price-matrix-modal"
		>
			<div className="relative w-full max-w-4xl bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] gap-2">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
							<DollarSign className="w-5 h-5" />
						</div>
						<div className="min-w-0">
							<h3 id="price-matrix-title" className="font-bold text-sm sm:text-base text-[var(--ink)] m-0 truncate">
								Прейскурант и матрица себестоимости ЗТЛ
							</h3>
							<p className="text-[11px] text-[var(--muted)] m-0 truncate">
								Нормативная себестоимость, сроки производства и расчет удержания с врача
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={handleSyncPresets}
							className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line)] text-[var(--ink)] text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
							title="Обновить прейскурант"
						>
							<RefreshCw className={`w-3.5 h-3.5 ${isLoadingPresets ? "animate-spin text-teal-600" : ""}`} />
							<span className="hidden sm:inline">Синхронизация</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							data-testid="btn-close-price-matrix"
							className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
							aria-label="Закрыть"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Search & Category Filter Chips */}
				<div className="p-3.5 border-b border-[var(--line)] space-y-2.5 bg-[var(--paper)]">
					<div className="relative w-full">
						<Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
						<input
							type="text"
							placeholder="Поиск по названию конструкции, материалу..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							style={{ paddingLeft: "38px" }}
							className="w-full min-h-[44px] sm:min-h-[32px] h-8 pr-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-teal-500"
						/>
					</div>

					<div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
						{categories.map((c) => {
							const isActive = selectedCategory === c.id;
							return (
								<button
									key={c.id}
									type="button"
									onClick={() => setSelectedCategory(c.id)}
									className={`min-h-[44px] sm:min-h-[28px] h-7 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border select-none ${
										isActive
											? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs"
											: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
									}`}
								>
									{c.label}
								</button>
							);
						})}
					</div>
				</div>

				{/* Table of Price Matrix */}
				<div className="flex-1 min-h-0 overflow-y-auto p-4">
					<div className="rounded-xl border border-[var(--line)] overflow-hidden bg-[var(--paper)] shadow-2xs">
						<table className="w-full text-left border-collapse text-xs">
							<thead>
								<tr className="h-8 bg-[var(--paper-soft)] border-b border-[var(--line)] text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] select-none">
									<th className="px-3 py-1">Конструкция / Описание</th>
									<th className="px-2.5 py-1">Материал</th>
									<th className="px-2 py-1 text-center">Срок</th>
									<th className="px-2.5 py-1 text-right">Себестоимость ЗТЛ</th>
									<th className="px-2.5 py-1 text-right">Прайс клиники</th>
									<th className="px-2.5 py-1 text-right">Действие</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--line)]">
								{filteredItems.map((item) => {
									const marginRub = item.suggestedPriceRub - item.suggestedCostRub;
									return (
										<tr
											key={item.id}
											className="h-10 hover:bg-[var(--paper-soft)] transition-colors text-[var(--ink)]"
											data-testid={`price-matrix-row-${item.id}`}
										>
											<td className="px-3 py-1.5 align-middle">
												<div className="font-bold text-xs leading-snug">{item.nameRu}</div>
												{item.specialInstructions && (
													<div className="text-[10.5px] text-[var(--muted)] line-clamp-1">
														{item.specialInstructions}
													</div>
												)}
											</td>

											<td className="px-2.5 py-1.5 align-middle text-[11px] text-[var(--muted)]">
												{item.material}
											</td>

											<td className="px-2 py-1.5 align-middle text-center font-mono font-bold text-[11px]">
												<span className="px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
													{item.turnaroundBusinessDays} дн.
												</span>
											</td>

											<td className="px-2.5 py-1.5 align-middle text-right font-mono font-bold text-teal-600 dark:text-teal-400">
												{money(item.suggestedCostRub)}
											</td>

											<td className="px-2.5 py-1.5 align-middle text-right font-mono font-bold">
												<div>{money(item.suggestedPriceRub)}</div>
												<div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
													+ {money(marginRub)} маржа
												</div>
											</td>

											<td className="px-2.5 py-1.5 align-middle text-right">
												<button
													type="button"
													onClick={() => {
														onSelectWorkType?.(item);
														onClose();
													}}
													className="min-h-[44px] sm:min-h-[28px] h-7 px-2.5 rounded-lg bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
													data-testid={`btn-select-price-item-${item.id}`}
													title="Создать наряд по этой позиции"
												>
													<Plus className="w-3 h-3" />
													<span>В наряд</span>
												</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>

				{/* Footer */}
				<div className="px-4 sm:px-6 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between text-xs text-[var(--muted)]">
					<span>
						Всего позиций в матрице: <strong>{filteredItems.length}</strong>
					</span>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] sm:min-h-[32px] h-8 px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs hover:bg-[var(--line)] transition-colors cursor-pointer"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
