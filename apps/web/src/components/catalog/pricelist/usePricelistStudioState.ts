/**
 * apps/web/src/components/catalog/pricelist/usePricelistStudioState.ts
 *
 * Канонический стейт и обработчики Студии Прейскуранта DENTE CRM.
 * Мандаты: 8b/8zi (<350 строк), 8e (автономия врача), 8be (Zero Any).
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	type PricelistCategoryKey,
	type PricelistClinicalBundle,
	type PricelistStudioItem,
	calculatePricelistStats,
	filterPricelist,
	getSpecialtyForCategory,
	kopecksToRublesExact,
	loadCanonicalPricelist,
	normalizeCategoryFromBackend,
	parseRublesToKopecks,
	saveCanonicalPricelist,
	fetchPricelistFromBackend,
	syncServiceItemToBackend,
	batchSyncPricelistToBackend,
} from "../pricelistCatalogData";
import { printPricelistA4 } from "../../settings/pricesTab/pricesExportPrintHelpers";
import { clientLogger } from "../../../services/logging/clientLogger";
import { showToast as showGlobalToast } from "../../GlobalToast";
import { kopecksToRubles, rublesToKopecks, type DentalSpecialty } from "@dental/shared";
import {
	STATUTORY_VAT_EXEMPTION_NOTE,
	type DoctorSpecialty,
	type ServiceCategory,
	type ServicePricelistItem,
} from "./servicePricelistPresets";

function mapStudioCategoryToServiceCategory(cat: PricelistCategoryKey): ServiceCategory {
	switch (cat) {
		case "implantology":
			return "surgery";
		case "diagnostics":
			return "radiology";
		default:
			return cat;
	}
}

function mapSpecialtyToDoctorSpecialty(spec: DentalSpecialty): DoctorSpecialty {
	switch (spec) {
		case "therapist":
		case "surgeon":
		case "orthopedist":
		case "orthodontist":
		case "pediatric":
		case "hygienist":
		case "radiologist":
			return spec;
		case "implantologist":
			return "surgeon";
		case "periodontist":
			return "therapist";
		case "universal":
		default:
			return "general";
	}
}

export type PricelistInputItem =
	| PricelistStudioItem
	| ServicePricelistItem
	| (Partial<PricelistStudioItem> & Partial<ServicePricelistItem> & {
			readonly id?: string | undefined;
			readonly title?: string | undefined;
			readonly code?: string | undefined;
			readonly category?: string | undefined;
			readonly priceRub?: number | undefined;
			readonly basePriceRub?: number | undefined;
			readonly durationMin?: number | undefined;
			readonly materialsCostRub?: number | undefined;
			readonly costRub?: number | undefined;
			readonly active?: boolean | undefined;
	  });

export interface UsePricelistStudioStateOptions {
	readonly isOpen: boolean;
	readonly initialItems?: readonly PricelistInputItem[] | undefined;
	readonly onSaveCatalog?: ((items: readonly PricelistStudioItem[]) => void) | undefined;
	readonly onApplyBundleToVisit?: ((bundle: PricelistClinicalBundle) => void) | undefined;
	readonly onAddServiceToInvoice?: ((item: PricelistStudioItem) => void) | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly clinicLicense?: string | undefined;
	readonly chiefDoctorName?: string | undefined;
}

export function usePricelistStudioState({
	isOpen,
	initialItems,
	onSaveCatalog,
	onApplyBundleToVisit,
	onAddServiceToInvoice,
	clinicName = "Стоматологическая клиника «DENTE»",
	clinicAddress,
	clinicPhone,
	clinicLicense,
	chiefDoctorName,
}: UsePricelistStudioStateOptions) {
	const [items, setItems] = useState<readonly PricelistStudioItem[]>(() => {
		if (initialItems && initialItems.length > 0) {
			return initialItems.map((rawItem, idx) => {
				const item = rawItem as Record<string, unknown>;
				return {
					id: typeof item.id === "string" ? item.id : `srv-${idx}`,
					code: (typeof item.code === "string" && item.code) || (typeof item.serviceCode === "string" && item.serviceCode) || (typeof item.regulatoryCode === "string" && item.regulatoryCode) || `ПОЗ-${idx + 1}`,
					serviceCode: (typeof item.serviceCode === "string" && item.serviceCode) || (typeof item.code === "string" && item.code) || `ПОЗ-${idx + 1}`,
					regulatoryCode: (typeof item.regulatoryCode === "string" && item.regulatoryCode) || (typeof item.code === "string" ? item.code : undefined),
					title: (typeof item.title === "string" && item.title) || (typeof item.commercialTitle === "string" && item.commercialTitle) || "Стоматологическая услуга",
					category: normalizeCategoryFromBackend(typeof item.category === "string" ? item.category : undefined),
					priceKopecks:
						typeof item.priceKopecks === "number" && Number.isFinite(item.priceKopecks)
							? Math.round(item.priceKopecks)
							: typeof item.priceRub === "number" && Number.isFinite(item.priceRub)
								? rublesToKopecks(item.priceRub)
								: typeof item.basePriceRub === "number" && Number.isFinite(item.basePriceRub)
									? rublesToKopecks(item.basePriceRub)
									: 350000,
					costKopecks:
						typeof item.costKopecks === "number" && Number.isFinite(item.costKopecks)
							? Math.round(item.costKopecks)
							: typeof item.materialCostRub === "number" && Number.isFinite(item.materialCostRub)
								? rublesToKopecks(item.materialCostRub)
								: typeof item.materialsCostRub === "number" && Number.isFinite(item.materialsCostRub)
									? rublesToKopecks(item.materialsCostRub)
									: typeof item.costRub === "number" && Number.isFinite(item.costRub)
										? rublesToKopecks(item.costRub)
										: 50000,
					durationMin: typeof item.durationMin === "number" ? item.durationMin : typeof item.estimatedDurationMin === "number" ? item.estimatedDurationMin : 30,
					isActive: (item.active !== undefined ? item.active !== false : true) && item.isActive !== false,
					tags: Array.isArray(item.tags) ? item.tags : [],
					isBundle: Boolean(item.isBundle),
				};
			});
		}
		return loadCanonicalPricelist();
	});

	useEffect(() => {
		if (isOpen && (!initialItems || initialItems.length === 0)) {
			fetchPricelistFromBackend().then((backendItems) => {
				if (backendItems && backendItems.length > 0) {
					setItems(backendItems);
				}
			}).catch((err) => {
				clientLogger.warn("[PricelistStudioModal] Failed to fetch pricelist from backend", err, {
					module: "usePricelistStudioState",
				});
				showGlobalToast("Не удалось загрузить прейскурант с сервера", "warning");
			});
		}
	}, [isOpen, initialItems]);

	const [selectedCategory, setSelectedCategory] = useState<PricelistCategoryKey | "all">("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [toastText, setToastText] = useState<string | null>(null);
	const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
	const [inlinePriceInput, setInlinePriceInput] = useState("");
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<PricelistStudioItem | null>(null);
	const [formCode, setFormCode] = useState("");
	const [formTitle, setFormTitle] = useState("");
	const [formCategory, setFormCategory] = useState<PricelistCategoryKey>("therapy");
	const [formPriceRub, setFormPriceRub] = useState("3500");
	const [formCostRub, setFormCostRub] = useState("500");
	const [formDuration, setFormDuration] = useState("30");

	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const showToast = (text: string) => {
		if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
		setToastText(text);
		toastTimeoutRef.current = setTimeout(() => setToastText(null), 2500);
	};

	const filteredItems = useMemo(
		() => filterPricelist(items, selectedCategory, searchQuery),
		[items, selectedCategory, searchQuery],
	);
	const stats = useMemo(() => calculatePricelistStats(items), [items]);

	const commitItemsUpdate = (newItems: readonly PricelistStudioItem[], itemToSync?: PricelistStudioItem) => {
		setItems(newItems);
		saveCanonicalPricelist(newItems);
		if (itemToSync) {
			syncServiceItemToBackend(itemToSync)
				.then((result) => {
					if (!result.success) {
						clientLogger.warn("[PricelistStudioModal] Sync item returned unsuccessful result", { id: itemToSync.id }, {
							module: "usePricelistStudioState",
						});
						showGlobalToast("Изменения сохранены локально, не удалось синхронизировать с сервером", "warning");
					}
				})
				.catch((err) => {
					clientLogger.warn("[PricelistStudioModal] Failed to sync item to backend", err, {
						module: "usePricelistStudioState",
					});
					showGlobalToast("Не удалось синхронизировать позицию с сервером", "warning");
				});
		}
		if (onSaveCatalog) onSaveCatalog(newItems);
	};

	const handleOpenCreate = () => {
		setEditingItem(null);
		setFormCode(`ПОЗ-${items.length + 1}`);
		setFormTitle("");
		setFormCategory(selectedCategory === "all" ? "therapy" : selectedCategory);
		setFormPriceRub("3500");
		setFormCostRub("500");
		setFormDuration("30");
		setIsDrawerOpen(true);
	};

	const handleOpenEdit = (item: PricelistStudioItem) => {
		setEditingItem(item);
		setFormCode(item.code);
		setFormTitle(item.title);
		setFormCategory(item.category);
		setFormPriceRub(kopecksToRublesExact(item.priceKopecks));
		setFormCostRub(kopecksToRublesExact(item.costKopecks));
		setFormDuration(String(item.durationMin));
		setIsDrawerOpen(true);
	};

	const handleSaveForm = (e: React.FormEvent) => {
		e.preventDefault();
		const finalTitle = formTitle.trim() || "Стоматологическая услуга";
		const priceKop = parseRublesToKopecks(formPriceRub);
		const costKop = parseRublesToKopecks(formCostRub);
		const durMin = parseInt(formDuration, 10) || 30;

		if (editingItem) {
			const updatedItem: PricelistStudioItem = {
				...editingItem,
				code: formCode.trim() || editingItem.code,
				serviceCode: formCode.trim() || editingItem.serviceCode,
				title: finalTitle,
				category: formCategory,
				priceKopecks: priceKop,
				costKopecks: costKop,
				durationMin: durMin,
			};
			const updated = items.map((i) => (i.id === editingItem.id ? updatedItem : i));
			commitItemsUpdate(updated, updatedItem);
			showToast(`Услуга «${finalTitle}» сохранена`);
		} else {
			const newItem: PricelistStudioItem = {
				id: `srv-${Date.now()}`,
				code: formCode.trim() || `УСЛ-${items.length + 1}`,
				serviceCode: formCode.trim() || `УСЛ-${items.length + 1}`,
				title: finalTitle,
				category: formCategory,
				priceKopecks: priceKop,
				costKopecks: costKop,
				durationMin: durMin,
				isActive: true,
			};
			commitItemsUpdate([newItem, ...items], newItem);
			showToast(`Услуга «${finalTitle}» добавлена`);
		}
		setIsDrawerOpen(false);
	};

	const handleInlinePriceSave = (itemId: string) => {
		const parsedKopecks = parseRublesToKopecks(inlinePriceInput);
		let updatedItem: PricelistStudioItem | undefined;
		const updated = items.map((i) => {
			if (i.id === itemId) {
				updatedItem = { ...i, priceKopecks: parsedKopecks };
				return updatedItem;
			}
			return i;
		});
		commitItemsUpdate(updated, updatedItem);
		setEditingPriceId(null);
		showToast("Цена обновлена");
	};

	const handleToggleActive = (itemId: string) => {
		let updatedItem: PricelistStudioItem | undefined;
		const updated = items.map((i) => {
			if (i.id === itemId) {
				updatedItem = { ...i, isActive: !i.isActive };
				return updatedItem;
			}
			return i;
		});
		commitItemsUpdate(updated, updatedItem);
		showToast("Статус услуги изменен");
	};

	const handleApplyQuickBundle = (bundle: PricelistClinicalBundle) => {
		const existing = items.find((i) => i.title === bundle.title);
		if (existing) {
			showToast(`Пакет «${bundle.shortTitle}» уже в прейскуранте`);
			if (onApplyBundleToVisit) onApplyBundleToVisit(bundle);
			if (onAddServiceToInvoice) onAddServiceToInvoice(existing);
			return;
		}

		const newBundleItem: PricelistStudioItem = {
			id: `bundle-${Date.now()}`,
			code: `ПАКЕТ-${items.length + 1}`,
			serviceCode: `ПАКЕТ-${items.length + 1}`,
			title: bundle.title,
			category: bundle.category,
			priceKopecks: bundle.priceKopecks,
			costKopecks: Math.trunc(bundle.priceKopecks / 4),
			durationMin: 60,
			isActive: true,
			isBundle: true,
			tags: ["пакет", "комплекс", "под ключ", ...bundle.items],
		};

		commitItemsUpdate([newBundleItem, ...items], newBundleItem);
		showToast(`Клинический комплекс «${bundle.shortTitle}» добавлен в прейскурант`);
		if (onApplyBundleToVisit) onApplyBundleToVisit(bundle);
		if (onAddServiceToInvoice) onAddServiceToInvoice(newBundleItem);
	};

	const handleExportCsv = () => {
		const csvRows = [
			"Код;Категория;Наименование процедуры;Цена (руб);Себестоимость (руб);Длительность (мин);Активна",
			...items.map((i) =>
				[
					i.code,
					i.category,
					`"${i.title.replace(/"/g, '""')}"`,
					kopecksToRublesExact(i.priceKopecks),
					kopecksToRublesExact(i.costKopecks),
					i.durationMin,
					i.isActive ? "Да" : "Нет",
				].join(";"),
			),
		];
		const blob = new Blob(["\uFEFF" + csvRows.join("\r\n")], {
			type: "text/csv;charset=utf-8;",
		});
		const link = document.createElement("a");
		const objectUrl = URL.createObjectURL(blob);
		link.href = objectUrl;
		link.download = `Прейскурант_${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		URL.revokeObjectURL(objectUrl);
		showToast("Экспортировано в CSV");
	};

	const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			const text = String(event.target?.result ?? "");
			if (!text.trim()) return;

			const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
			if (lines.length <= 1) return;

			const importedItems: PricelistStudioItem[] = [];
			for (let i = 1; i < lines.length; i++) {
				const line = lines[i];
				if (!line) continue;
				const parts = line.split(/[;,]/).map((p) => p.trim().replace(/^"|"$/g, ""));
				if (parts.length >= 3) {
					const code = parts[0] || `ИМП-${i}`;
					const title = parts[2] && isNaN(Number(parts[2])) ? parts[2] : parts[1] || `Услуга ${i}`;
					const rawPrice = parts.find((p) => /^\d+([.,]\d+)?$/.test(p)) ?? "3000";
					const priceKopecks = parseRublesToKopecks(rawPrice);
					importedItems.push({
						id: `imp-${Date.now()}-${i}`,
						code,
						serviceCode: code,
						title,
						category: "therapy",
						priceKopecks: priceKopecks >= 0 ? priceKopecks : 350000,
						costKopecks: Math.trunc((priceKopecks >= 0 ? priceKopecks : 350000) / 5),
						durationMin: 30,
						isActive: true,
					});
				}
			}

			if (importedItems.length > 0) {
				const merged = [...importedItems, ...items];
				commitItemsUpdate(merged);
				batchSyncPricelistToBackend(importedItems)
					.then((ok) => {
						if (!ok) {
							clientLogger.warn("[PricelistStudioModal] Batch sync returned unsuccessful status", undefined, {
								module: "usePricelistStudioState",
							});
							showGlobalToast("Импорт сохранён локально, сервер недоступен", "warning");
						}
					})
					.catch((err) => {
						clientLogger.warn("[PricelistStudioModal] Failed to batch sync imported items", err, {
							module: "usePricelistStudioState",
						});
						showGlobalToast("Не удалось синхронизировать импорт с сервером", "warning");
					});
				showToast(`Импортировано ${importedItems.length} позиций из CSV`);
			}
		};
		reader.readAsText(file);
		e.target.value = "";
	};

	const handlePrintA4 = () => {
		const printableItems: ServicePricelistItem[] = items.map((it) => {
			const priceRub = kopecksToRubles(it.priceKopecks);
			return {
				id: it.id,
				code804n: it.regulatoryCode || it.serviceCode || it.code || "A16.07.002",
				commercialTitle: it.title,
				statutoryTitle804n: it.title,
				category: mapStudioCategoryToServiceCategory(it.category),
				specialty: mapSpecialtyToDoctorSpecialty(getSpecialtyForCategory(it.category)),
				basePriceRub: priceRub,
				basePriceKopecks: it.priceKopecks,
				materialCostRub: kopecksToRubles(it.costKopecks),
				labCostRub: 0,
				estimatedDurationMin: it.durationMin,
				vatRate: 0 as const,
				vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
				icd10Indications: [],
				isActive: it.isActive,
				isArchived: !it.isActive,
				tags: it.tags ? [...it.tags] : [],
			};
		});

		printPricelistA4(
			{
				name: clinicName || "Стоматологическая клиника",
				address: clinicAddress || "",
				phone: clinicPhone || "",
				license: clinicLicense || "",
				chiefDoctor: chiefDoctorName || "Главный врач",
			},
			printableItems,
		);
	};

	return {
		items,
		selectedCategory,
		setSelectedCategory,
		searchQuery,
		setSearchQuery,
		toastText,
		editingPriceId,
		setEditingPriceId,
		inlinePriceInput,
		setInlinePriceInput,
		isDrawerOpen,
		setIsDrawerOpen,
		editingItem,
		formCode,
		setFormCode,
		formTitle,
		setFormTitle,
		formCategory,
		setFormCategory,
		formPriceRub,
		setFormPriceRub,
		formCostRub,
		setFormCostRub,
		formDuration,
		setFormDuration,
		fileInputRef,
		filteredItems,
		stats,
		handleOpenCreate,
		handleOpenEdit,
		handleSaveForm,
		handleInlinePriceSave,
		handleToggleActive,
		handleApplyQuickBundle,
		handleExportCsv,
		handleImportFileChange,
		handlePrintA4,
	};
}
