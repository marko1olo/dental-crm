/**
 * DENTE Dental CRM — Statutory Minzdrav Order 804n Service Catalog & Pricelist Manager Modal
 *
 * Provides complete statutory Russian dental catalog management:
 * - Order 804n nomenclature tree with A16.07/B01.065/A06.07 codes.
 * - Price Tier Matrix (Standard, VIP, DMS, Promo).
 * - Inline price editing and 1-click batch markups (+5%, +10%, rounding).
 * - Unit margin & lab/material cost profitability indicators.
 * - RFC 4180 CSV Import/Export with UTF-8 BOM.
 * - 1-Click Official Printable A4 Clinic Pricelist (ст. 149 НК РФ, НДС 0%).
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
	AlertCircle,
	ArrowUpDown,
	Check,
	CheckCircle2,
	Copy,
	Download,
	Edit3,
	FileSpreadsheet,
	Filter,
	Layers,
	MoreHorizontal,
	Plus,
	Printer,
	RefreshCw,
	Search,
	ShieldCheck,
	Sparkles,
	Trash2,
	Upload,
	X,
} from 'lucide-react';
import { sliceDomList } from '../../../utils/domVirtualizationHelper';
import {
	PriceListMappingDiffView,
	type IngestedMappingItem,
} from '../../pricing/PriceListMappingDiffView';
import {
	applyBatchPriceMarkup,
	calculateServiceProfitability,
	calculateTierPrice,
	detectCategoryFrom804nCode,
	exportPricelistToCsv,
	formatRubles,
	generatePrintablePricelistHtml,
	importPricelistFromCsv,
	isValidOrder804nCode,
	parseUnstructuredPriceText,
	proposalToPricelistItem,
	rublesToKopecks,
	searchPricelistItems,
	sortPricelistItems,
	type ParsedPriceProposal,
	type PriceRoundingMode,
	type PricelistSortDirection,
	type PricelistSortField,
} from './servicePricelistEngine';
import {
	CATEGORY_LABELS,
	PRICE_TIER_LABELS,
	SPECIALTY_LABELS,
	STATUTORY_ORDER_804N_PRESETS,
	STATUTORY_VAT_EXEMPTION_NOTE,
	type DoctorSpecialty,
	type Order804nCategory,
	type PriceTierKind,
	type ServicePricelistItem,
} from './servicePricelistPresets';

export interface ServicePricelistManagerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialItems?: readonly ServicePricelistItem[];
	readonly onSaveCatalog?: (items: readonly ServicePricelistItem[]) => void;
	readonly clinicName?: string;
	readonly clinicAddress?: string;
	readonly clinicPhone?: string;
	readonly clinicLicense?: string;
	readonly chiefDoctorName?: string;
}

export const ServicePricelistManagerModal: React.FC<ServicePricelistManagerModalProps> = ({
	isOpen,
	onClose,
	initialItems = STATUTORY_ORDER_804N_PRESETS,
	onSaveCatalog,
	clinicName = 'Стоматологическая клиника «DENTE»',
	clinicAddress = 'г. Москва, ул. Медицинская, д. 12',
	clinicPhone = '',
	clinicLicense = 'ЛО-77-01-012345 от 12.04.2021',
	chiefDoctorName = 'Петров А. В.',
}) => {
	const [items, setItems] = useState<readonly ServicePricelistItem[]>(initialItems);
	const [selectedCategory, setSelectedCategory] = useState<Order804nCategory | 'all'>('all');
	const [selectedSpecialty, setSelectedSpecialty] = useState<DoctorSpecialty | 'all'>('all');
	const [searchTerm, setSearchTerm] = useState('');
	const [activeTier, setActiveTier] = useState<PriceTierKind>('standard');
	const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

	// Синхронизация с внешним источником истины каталога клиники (Мандат 8s)
	useEffect(() => {
		if (isOpen && initialItems && initialItems.length > 0) {
			setItems(initialItems);
		}
	}, [isOpen, initialItems]);

	// Add/Edit Service Modal State
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<ServicePricelistItem | null>(null);
	const [formCode804n, setFormCode804n] = useState('');
	const [formCommercialTitle, setFormCommercialTitle] = useState('');
	const [formStatutoryTitle, setFormStatutoryTitle] = useState('');
	const [formCategory, setFormCategory] = useState<Order804nCategory>('therapy');
	const [formSpecialty, setFormSpecialty] = useState<DoctorSpecialty>('therapist');
	const [formPriceRub, setFormPriceRub] = useState<string>('0');
	const [formMaterialCostRub, setFormMaterialCostRub] = useState<string>('0');
	const [formLabCostRub, setFormLabCostRub] = useState<string>('0');
	const [formDurationMin, setFormDurationMin] = useState<number>(30);
	const [formIcd10, setFormIcd10] = useState<string>('');

	// Secondary Action Menu Row ID
	const [openMenuRowId, setOpenMenuRowId] = useState<string | null>(null);
	const [isBatchBarOpen, setIsBatchBarOpen] = useState(false);

	// Sorting State (Mandate 8c)
	const [sortField, setSortField] = useState<PricelistSortField>('code');
	const [sortDirection, setSortDirection] = useState<PricelistSortDirection>('asc');

	// Inline Price Quick Edit State
	const [editingPriceCellId, setEditingPriceCellId] = useState<string | null>(null);
	const [editingPriceBuffer, setEditingPriceBuffer] = useState<string>('');

	// Import Modal Mode: 'smart_text' | 'csv'
	const [importMode, setImportMode] = useState<'smart_text' | 'csv'>('smart_text');
	const [smartTextInput, setSmartTextInput] = useState('');
	const [parsedProposals, setParsedProposals] = useState<readonly ParsedPriceProposal[]>([]);
	const [ingestedMappingItems, setIngestedMappingItems] = useState<readonly IngestedMappingItem[]>([]);
	const [isIngestingApi, setIsIngestingApi] = useState(false);

	// CSV Import Modal State
	const [isImportModalOpen, setIsImportModalOpen] = useState(false);
	const [csvInputText, setCsvInputText] = useState('');
	const [importErrors, setImportErrors] = useState<string[]>([]);
	const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

	// Batch Markup State
	const [batchPercent, setBatchPercent] = useState<number>(5);
	const [batchRounding, setBatchRounding] = useState<PriceRoundingMode>('round_100');

	// Notification Toast
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const importTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const searchInputId = useId();

	useEffect(() => {
		return () => {
			if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
			if (importTimerRef.current) clearTimeout(importTimerRef.current);
		};
	}, []);

	const showToast = (msg: string) => {
		if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
		setToastMessage(msg);
		toastTimerRef.current = setTimeout(() => {
			toastTimerRef.current = null;
			setToastMessage(null);
		}, 3000);
	};

	const openAddModal = () => {
		setEditingItem(null);
		setFormCode804n('');
		setFormCommercialTitle('');
		setFormStatutoryTitle('');
		setFormCategory('therapy');
		setFormSpecialty('therapist');
		setFormPriceRub('');
		setFormMaterialCostRub('0');
		setFormLabCostRub('0');
		setFormDurationMin(30);
		setFormIcd10('');
		setIsEditModalOpen(true);
	};

	const openEditModal = (item: ServicePricelistItem) => {
		setEditingItem(item);
		setFormCode804n(item.code804n || '');
		setFormCommercialTitle(item.commercialTitle);
		setFormStatutoryTitle(item.statutoryTitle804n);
		setFormCategory(item.category);
		setFormSpecialty(item.specialty);
		setFormPriceRub(String(item.basePriceRub));
		setFormMaterialCostRub(String(item.materialCostRub ?? 0));
		setFormLabCostRub(String(item.labCostRub ?? 0));
		setFormDurationMin(item.estimatedDurationMin);
		setFormIcd10(item.icd10Indications.join(', '));
		setIsEditModalOpen(true);
	};

	const handleSaveItemForm = (e: React.FormEvent) => {
		e.preventDefault();
		const parsedPrice = parseFloat(formPriceRub.replace(',', '.')) || 0;
		const matCost = parseFloat(formMaterialCostRub.replace(',', '.')) || 0;
		const labCost = parseFloat(formLabCostRub.replace(',', '.')) || 0;
		const icdArray = formIcd10
			.split(',')
			.map((s) => s.trim().toUpperCase())
			.filter(Boolean);

		if (editingItem) {
			setItems((prev) =>
				prev.map((it) => {
					if (it.id !== editingItem.id) return it;
					return {
						...it,
						code804n: formCode804n.trim().toUpperCase(),
						commercialTitle: formCommercialTitle.trim() || formStatutoryTitle.trim(),
						statutoryTitle804n: formStatutoryTitle.trim() || formCommercialTitle.trim(),
						category: formCategory,
						specialty: formSpecialty,
						basePriceRub: parsedPrice,
						basePriceKopecks: rublesToKopecks(parsedPrice),
						materialCostRub: matCost,
						labCostRub: labCost,
						estimatedDurationMin: formDurationMin,
						icd10Indications: icdArray,
					};
				}),
			);
			showToast(`Услуга «${formCommercialTitle}» обновлена`);
		} else {
			const newItemId = `srv-custom-${Date.now()}`;
			const newItem: ServicePricelistItem = {
				id: newItemId,
				code804n: formCode804n.trim().toUpperCase() || 'A16.07.000',
				commercialTitle: formCommercialTitle.trim(),
				statutoryTitle804n: formStatutoryTitle.trim() || formCommercialTitle.trim(),
				category: formCategory,
				specialty: formSpecialty,
				basePriceRub: parsedPrice,
				basePriceKopecks: rublesToKopecks(parsedPrice),
				materialCostRub: matCost,
				labCostRub: labCost,
				estimatedDurationMin: formDurationMin,
				icd10Indications: icdArray,
				vatRate: 0,
				vatExemptionArticle: 'пп. 2 п. 2 ст. 149 НК РФ',
				isActive: true,
				isArchived: false,
				tags: [],
			};
			setItems((prev) => [newItem, ...prev]);
			showToast(`Услуга «${formCommercialTitle}» добавлена в прейскурант`);
		}
		setIsEditModalOpen(false);
	};

	const handleDuplicateItem = (item: ServicePricelistItem) => {
		const dup: ServicePricelistItem = {
			...item,
			id: `srv-dup-${Date.now()}`,
			commercialTitle: `${item.commercialTitle} (копия)`,
		};
		setItems((prev) => [dup, ...prev]);
		setOpenMenuRowId(null);
		showToast(`Создан дубликат: ${dup.commercialTitle}`);
	};

	const handleToggleArchiveItem = (itemId: string) => {
		setItems((prev) =>
			prev.map((it) =>
				it.id === itemId ? { ...it, isArchived: !it.isArchived, isActive: it.isArchived } : it,
			),
		);
		setOpenMenuRowId(null);
		showToast('Статус услуги изменен');
	};

	const handleSetZeroWarrantyPrice = (itemId: string) => {
		setItems((prev) =>
			prev.map((it) => {
				if (it.id !== itemId) return it;
				return {
					...it,
					basePriceRub: 0,
					basePriceKopecks: 0,
					tierPrices: { ...(it.tierPrices || {}), [activeTier]: 0 },
				};
			}),
		);
		setOpenMenuRowId(null);
		showToast('Установлена гарантийная цена (0 ₽)');
	};

	const handleDeleteItem = (itemId: string) => {
		setItems((prev) => prev.filter((it) => it.id !== itemId));
		setOpenMenuRowId(null);
		showToast('Услуга удалена из прейскуранта');
	};

	// Filtered & Sorted Catalog (Mandate 8c)
	const filteredItems = useMemo(() => {
		const searchResults = searchPricelistItems(items, {
			searchTerm,
			category: selectedCategory,
			specialty: selectedSpecialty,
			includeArchived: false,
		});
		return sortPricelistItems(searchResults, sortField, sortDirection, activeTier);
	}, [items, searchTerm, selectedCategory, selectedSpecialty, sortField, sortDirection, activeTier]);

	const handleToggleSort = (field: PricelistSortField) => {
		if (sortField === field) {
			setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortField(field);
			setSortDirection('asc');
		}
	};

	// Quick 1-click delta price modifier (+100 ₽, +500 ₽, -500 ₽)
	const handleModifyPriceDelta = (itemId: string, deltaRub: number) => {
		setItems((prev) =>
			prev.map((item) => {
				if (item.id !== itemId) return item;
				const current = calculateTierPrice(item.basePriceRub, activeTier, item.tierPrices?.[activeTier]);
				const nextPrice = Math.max(0, current + deltaRub);
				if (activeTier === 'standard') {
					return {
						...item,
						basePriceRub: nextPrice,
						basePriceKopecks: rublesToKopecks(nextPrice),
					};
				}
				return {
					...item,
					tierPrices: {
						...(item.tierPrices || {}),
						[activeTier]: nextPrice,
					},
				};
			}),
		);
		showToast(`Цена обновлена (${deltaRub > 0 ? `+${deltaRub}` : deltaRub} ₽)`);
	};

	// Commit inline text input on blur or Enter
	const handleCommitInlinePrice = (itemId: string, rawInput: string) => {
		const cleanDigits = rawInput.replace(/\s+/g, '').replace(/[^\d]/g, '');
		const parsed = parseInt(cleanDigits, 10);
		if (!Number.isNaN(parsed) && parsed >= 0) {
			handleInlinePriceChange(itemId, parsed);
			showToast(`Цена обновлена: ${formatRubles(parsed)}`);
		}
		setEditingPriceCellId(null);
	};

	// Ingestion Handler for 804n Mapping Diff
	const handleIngestPriceList = async (contentToParse: string, sourceType: 'text' | 'csv' = 'text') => {
		const text = contentToParse.trim();
		if (!text) {
			setIngestedMappingItems([]);
			setParsedProposals([]);
			return;
		}

		setIsIngestingApi(true);
		try {
			const res = await fetch('/api/pricelist/ingest', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					rawContent: text,
					sourceType,
				}),
			});

			if (res.ok) {
				const data = await res.json();
				if (data.success && Array.isArray(data.proposals) && data.proposals.length > 0) {
					setIngestedMappingItems(data.proposals);
					setIsIngestingApi(false);
					return;
				}
			}
		} catch {
			// Fallback to local heuristic engine below
		}

		// Fallback to local heuristic engine
		const localProposals = parseUnstructuredPriceText(text);
		setParsedProposals(localProposals);
		const mapped = localProposals.map((p, idx): IngestedMappingItem => {
			const existingMatch = items.find(
				(it) =>
					it.code804n === p.detectedCode804n ||
					it.commercialTitle.toLowerCase() === p.commercialTitle.toLowerCase(),
			);
			return {
				id: `local-ingest-${idx}-${Date.now()}`,
				sourceLineNumber: idx + 1,
				rawLine: p.commercialTitle + (p.priceRub ? ` ${p.priceRub} руб` : ''),
				cleanedTitle: p.commercialTitle,
				code804n: p.detectedCode804n,
				statutoryTitle804n: p.statutoryTitle804n,
				category: p.suggestedCategory,
				specialty: p.suggestedSpecialty,
				priceRub: p.priceRub,
				priceKopecks: rublesToKopecks(p.priceRub),
				confidence:
					p.confidence === 'exact_code'
						? 0.98
						: p.confidence === 'keyword_match'
							? 0.85
							: 0.65,
				confidenceKind:
					p.confidence === 'exact_code'
						? 'exact_code'
						: p.confidence === 'keyword_match'
							? 'high_keyword'
							: 'low_keyword',
				matchedExistingServiceId: existingMatch?.id ?? null,
				matchedExistingTitle: existingMatch?.commercialTitle ?? null,
				matchedExistingPriceRub: existingMatch?.basePriceRub ?? null,
				suggestedAction: existingMatch
					? existingMatch.basePriceRub === p.priceRub
						? 'identical'
						: 'update_existing'
					: 'create_new',
				isApproved: true,
			};
		});
		setIngestedMappingItems(mapped);
		setIsIngestingApi(false);
	};

	const handleApplyIngestedMapping = (approved: readonly IngestedMappingItem[]) => {
		if (approved.length === 0) return;

		setItems((prev) => {
			const existingMap = new Map(prev.map((i) => [i.id, i]));
			const addedList: ServicePricelistItem[] = [];

			for (const item of approved) {
				if (item.matchedExistingServiceId && existingMap.has(item.matchedExistingServiceId)) {
					const cur = existingMap.get(item.matchedExistingServiceId)!;
					existingMap.set(item.matchedExistingServiceId, {
						...cur,
						code804n: item.code804n || cur.code804n,
						commercialTitle: item.cleanedTitle || cur.commercialTitle,
						basePriceRub: item.priceRub,
						basePriceKopecks: item.priceKopecks || rublesToKopecks(item.priceRub),
					});
				} else {
					const newItem: ServicePricelistItem = {
						id: `srv-ingested-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
						code804n: item.code804n || 'A16.07.000',
						commercialTitle: item.cleanedTitle,
						statutoryTitle804n: item.statutoryTitle804n || item.cleanedTitle,
						category: (item.category as Order804nCategory) || 'therapy',
						specialty: (item.specialty as DoctorSpecialty) || 'therapist',
						basePriceRub: item.priceRub,
						basePriceKopecks: item.priceKopecks || rublesToKopecks(item.priceRub),
						estimatedDurationMin: 30,
						icd10Indications: [],
						vatRate: 0,
						vatExemptionArticle: 'пп. 2 п. 2 ст. 149 НК РФ',
						isActive: true,
						isArchived: false,
						tags: ['импорт_804н'],
					};
					addedList.push(newItem);
				}
			}

			return [...addedList, ...Array.from(existingMap.values())];
		});

		showToast(`Успешно добавлено / обновлено ${approved.length} позиций по стандарту 804н`);
		setIsImportModalOpen(false);
		setIngestedMappingItems([]);
		setSmartTextInput('');
	};

	// Smart Unstructured Text Parser Handlers
	const handleParseSmartText = (text: string) => {
		setSmartTextInput(text);
		if (!text.trim()) {
			setParsedProposals([]);
			setIngestedMappingItems([]);
			return;
		}
		const proposals = parseUnstructuredPriceText(text);
		setParsedProposals(proposals);
	};

	const handleApplySmartProposals = () => {
		if (parsedProposals.length === 0) return;
		const newItems = parsedProposals.map(proposalToPricelistItem);
		setItems((prev) => [...newItems, ...prev]);
		showToast(`Успешно добавлено ${newItems.length} позиций из умного парсера`);
		setIsImportModalOpen(false);
		setSmartTextInput('');
		setParsedProposals([]);
		setIngestedMappingItems([]);
	};

	// DOM Virtualization & Chunking (Mandate 8c, 8n - Wave 252 Low-Spec Protection)
	const [displayLimit, setDisplayLimit] = useState(40);

	// Сброс лимита видимости при смене фильтров, сортировки и поиска
	useEffect(() => {
		setDisplayLimit(40);
	}, [searchTerm, selectedCategory, selectedSpecialty, activeTier, sortField, sortDirection]);

	// Виртуализация списка услуг порциями по 40 элементов (снижение DOM узлов с 7500+ до ~300)
	const pricelistSlice = useMemo(() => {
		return sliceDomList(filteredItems, displayLimit, 0);
	}, [filteredItems, displayLimit]);

	// Category Item Counts
	const categoryCounts = useMemo(() => {
		const counts: Record<string, number> = { all: items.length };
		for (const item of items) {
			counts[item.category] = (counts[item.category] || 0) + 1;
		}
		return counts;
	}, [items]);

	if (!isOpen) return null;

	// Inline Price Change Handler
	const handleInlinePriceChange = (itemId: string, newPriceRub: number) => {
		if (Number.isNaN(newPriceRub) || newPriceRub < 0) return;
		setItems((prev) =>
			prev.map((item) => {
				if (item.id !== itemId) return item;
				if (activeTier === 'standard') {
					return {
						...item,
						basePriceRub: newPriceRub,
						basePriceKopecks: rublesToKopecks(newPriceRub),
					};
				}
				return {
					...item,
					tierPrices: {
						...(item.tierPrices || {}),
						[activeTier]: newPriceRub,
					},
				};
			}),
		);
	};

	// 1-Click Batch Markup
	const handleApplyBatchMarkup = (percent: number, rounding: PriceRoundingMode) => {
		const targetIds = selectedItemIds.size > 0 ? Array.from(selectedItemIds) : undefined;
		const updated = applyBatchPriceMarkup(items, {
			percentChange: percent,
			roundMode: rounding,
			categoryFilter: selectedCategory === 'all' ? undefined : selectedCategory,
			specialtyFilter: selectedSpecialty === 'all' ? undefined : selectedSpecialty,
			targetItemIds: targetIds,
			applyToTiers: [activeTier],
		});
		setItems(updated);
		showToast(`Успешно применена наценка ${percent > 0 ? `+${percent}%` : `${percent}%`} (${PRICE_TIER_LABELS[activeTier]})`);
	};

	// 1-Click Batch Rounding
	const handleApplyBatchRounding = (rounding: PriceRoundingMode) => {
		const targetIds = selectedItemIds.size > 0 ? Array.from(selectedItemIds) : undefined;
		const updated = applyBatchPriceMarkup(items, {
			percentChange: 0,
			roundMode: rounding,
			categoryFilter: selectedCategory === 'all' ? undefined : selectedCategory,
			targetItemIds: targetIds,
			applyToTiers: [activeTier],
		});
		setItems(updated);
		showToast(`Цены успешно округлены (${rounding})`);
	};

	// Export to CSV Download
	const handleExportCsv = () => {
		const csvContent = exportPricelistToCsv(items, { delimiter: ';' });
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', `DENTE_Pricelist_804n_${new Date().toISOString().slice(0, 10)}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		showToast('Прейскурант успешно экспортирован в CSV (Excel UTF-8 BOM)');
	};

	// Import from CSV
	const handleImportCsv = () => {
		setImportErrors([]);
		setImportSuccessCount(null);
		if (!csvInputText.trim()) {
			setImportErrors(['Вставьте текст CSV или выберите файл']);
			return;
		}

		const result = importPricelistFromCsv(csvInputText);
		if (result.invalidRows.length > 0 && result.validItems.length === 0) {
			setImportErrors(result.invalidRows.map((e) => `Строка ${e.rowIndex}: ${e.error}`));
			return;
		}

		if (result.validItems.length > 0) {
			// Merge with existing items (by 804n code or append)
			const existingMap = new Map(items.map((i) => [i.code804n, i]));
			for (const imported of result.validItems) {
				existingMap.set(imported.code804n, imported);
			}
			const merged = Array.from(existingMap.values());
			setItems(merged);
			setImportSuccessCount(result.validItems.length);
			showToast(`Импортировано ${result.validItems.length} позиций прейскуранта`);
			if (importTimerRef.current) clearTimeout(importTimerRef.current);
			importTimerRef.current = setTimeout(() => {
				importTimerRef.current = null;
				setIsImportModalOpen(false);
				setCsvInputText('');
			}, 1200);
		}
	};

	// CSV File Drop/Select
	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (evt) => {
			const text = evt.target?.result as string;
			if (text) {
				setCsvInputText(text);
				setSmartTextInput(text);
				handleIngestPriceList(text, file.name.endsWith('.csv') ? 'csv' : 'text');
			}
		};
		reader.readAsText(file, 'utf-8');
	};

	// 1-Click Print A4 Pricelist
	const handlePrintPricelist = () => {
		const printHtml = generatePrintablePricelistHtml(
			{
				clinicName,
				clinicAddress,
				clinicPhone,
				clinicLicense,
				chiefDoctorName,
				effectiveDateRu: new Date().toLocaleDateString('ru-RU'),
			},
			items,
			activeTier,
		);

		const printWindow = window.open('', '_blank', 'width=900,height=1000');
		if (printWindow) {
			printWindow.document.open();
			printWindow.document.write(printHtml);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
			}, 300);
		}
	};

	// Save & Apply
	const handleSaveAndClose = () => {
		if (onSaveCatalog) {
			onSaveCatalog(items);
		}
		showToast('Каталог услуг и прейскурант успешно сохранены');
		onClose();
	};

	return (
		<div className="pricelist-modal-overlay" role="dialog" aria-modal="true">
			<div className="pricelist-modal-container">
				{/* Header */}
				<header className="pricelist-modal-header">
					<div className="pricelist-header-left">
						<div className="pricelist-header-icon">
							<Layers size={24} />
						</div>
						<div>
							<div className="pricelist-header-title" title="Прейскурант и Номенклатура медицинских услуг по Приказу Минздрава России № 804н">
								Прейскурант услуг
							</div>
							<div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
								{items.length} позиций · Классификатор Минздрава РФ · НДС 0%
							</div>
						</div>
						<div className="pricelist-statutory-badge" title="Соответствует Приказу Минздрава России № 804н">
							<ShieldCheck size={14} />
							<span>Номенклатура</span>
						</div>
					</div>

					<div className="pricelist-header-actions">
						<button
							type="button"
							className="pricelist-btn pricelist-btn-primary"
							onClick={openAddModal}
							title="Добавить новую услугу по Номенклатуре 804н"
							style={{ minHeight: '36px', height: '36px', gap: '6px' }}
						>
							<Plus size={16} />
							<span>Добавить услугу</span>
						</button>

						<button
							type="button"
							className="pricelist-btn"
							onClick={handlePrintPricelist}
							title="Печать официального прейскуранта клиники (A4)"
						>
							<Printer size={16} />
							<span>Печать A4</span>
						</button>

						<button
							type="button"
							className="pricelist-btn"
							onClick={handleExportCsv}
							title="Экспорт в CSV (Excel UTF-8 BOM)"
						>
							<Download size={16} />
							<span>Экспорт CSV</span>
						</button>

						<button
							type="button"
							className="pricelist-btn"
							onClick={() => setIsImportModalOpen(true)}
							title="Импорт прейскуранта из CSV / Excel / Текста"
						>
							<Upload size={16} />
							<span>Импорт</span>
						</button>

						<button
							type="button"
							className="pricelist-btn pricelist-btn-ok"
							onClick={handleSaveAndClose}
						>
							<Check size={16} />
							<span>Сохранить</span>
						</button>

						<button
							type="button"
							className="pricelist-btn pricelist-btn-icon"
							onClick={onClose}
							aria-label="Закрыть"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* 1-Row Professional Clinical Toolbar (32-36px height) — Mandates 8d & 8p */}
				<div
					className="pricelist-toolbar"
					style={{
						padding: '0.25rem 1rem',
						gap: '0.5rem',
						display: 'flex',
						alignItems: 'center',
						minHeight: '36px',
						height: '36px',
						flexWrap: 'nowrap',
						overflowX: 'auto',
					}}
				>
					{/* Search */}
					<div className="pricelist-search-box" style={{ maxWidth: '320px', minWidth: '220px' }}>
						<Search size={15} className="pricelist-search-icon" />
						<input
							id={searchInputId}
							type="text"
							className="pricelist-search-input"
							style={{ height: '34px', fontSize: '0.8125rem', padding: '0 2rem 0 2rem' }}
							placeholder="Поиск по коду 804н, названию..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
						{searchTerm && (
							<button
								type="button"
								className="pricelist-search-clear"
								onClick={() => setSearchTerm('')}
							>
								<X size={13} />
							</button>
						)}
					</div>

					{/* 1-Click Fast 804n Selector Dropdown (Zero-Row Bloat) */}
					<select
						className="pricelist-search-input"
						style={{ height: '34px', padding: '0 0.5rem', width: 'auto', fontSize: '0.8125rem' }}
						value={searchTerm}
						onChange={(e) => {
							setSearchTerm(e.target.value);
							setSelectedCategory('all');
						}}
						title="Мгновенный поиск популярного кода Номенклатуры 804н"
					>
						<option value="">Быстрый код 804н...</option>
						<option value="A16.07.002">A16.07.002 Кариес</option>
						<option value="A16.07.008">A16.07.008 Пульпит</option>
						<option value="A11.07.012">A11.07.012 Анестезия</option>
						<option value="A06.07.003">A06.07.003 Снимок</option>
						<option value="A16.07.054">A16.07.054 Имплантация</option>
						<option value="A16.07.004">A16.07.004 Коронка</option>
						<option value="A16.07.001">A16.07.001 Удаление</option>
						<option value="A16.07.051">A16.07.051 Гигиена</option>
					</select>

					{/* Price Tier Segmented Control (34px) */}
					<div className="pricelist-tier-segmented" style={{ padding: '2px' }}>
						<button
							type="button"
							style={{ minHeight: '30px', padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
							className={`tier-segment-btn ${activeTier === 'standard' ? 'active' : ''}`}
							onClick={() => setActiveTier('standard')}
						>
							Основной
						</button>
						<button
							type="button"
							style={{ minHeight: '30px', padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
							className={`tier-segment-btn ${activeTier === 'vip' ? 'active' : ''}`}
							onClick={() => setActiveTier('vip')}
						>
							VIP (+20%)
						</button>
						<button
							type="button"
							style={{ minHeight: '30px', padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
							className={`tier-segment-btn ${activeTier === 'dms' ? 'active' : ''}`}
							onClick={() => setActiveTier('dms')}
						>
							ДМС
						</button>
						<button
							type="button"
							style={{ minHeight: '30px', padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
							className={`tier-segment-btn ${activeTier === 'promo' ? 'active' : ''}`}
							onClick={() => setActiveTier('promo')}
						>
							Промо
						</button>
					</div>

					{/* Specialty Filter */}
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
						<Filter size={14} style={{ color: 'var(--muted)' }} />
						<select
							className="pricelist-search-input"
							style={{ height: '34px', padding: '0 0.5rem', width: 'auto', fontSize: '0.8125rem' }}
							value={selectedSpecialty}
							onChange={(e) => setSelectedSpecialty(e.target.value as DoctorSpecialty | 'all')}
						>
							<option value="all">Все специальности</option>
							{Object.entries(SPECIALTY_LABELS).map(([specKey, specLabel]) => (
								<option key={specKey} value={specKey}>
									{specLabel}
								</option>
							))}
						</select>
					</div>

					{/* Batch Markup Toggle button */}
					<button
						type="button"
						className={`pricelist-btn ${isBatchBarOpen ? 'pricelist-btn-primary' : ''}`}
						style={{ minHeight: '34px', height: '34px', padding: '0 0.625rem', fontSize: '0.75rem', gap: '0.375rem', marginLeft: 'auto' }}
						onClick={() => setIsBatchBarOpen((prev) => !prev)}
						title="Пакетная индексация цен (+5%, +10%, гарантия, округление)"
					>
						<Sparkles size={14} />
						<span>Индексация</span>
					</button>
				</div>

				{/* Collapsible Batch Markup Strip (Only when toggled) */}
				{isBatchBarOpen && (
					<div className="pricelist-batch-bar" style={{ padding: '0.375rem 1.25rem' }}>
						<div className="batch-bar-left">
							<Sparkles size={14} style={{ color: 'var(--brand-500)' }} />
							<span style={{ fontSize: '0.75rem' }}>Пакетная индексация ({PRICE_TIER_LABELS[activeTier]}):</span>
						</div>

						<div className="batch-bar-actions">
							<button type="button" className="batch-quick-btn" onClick={() => handleApplyBatchMarkup(5, batchRounding)}>+5%</button>
							<button type="button" className="batch-quick-btn" onClick={() => handleApplyBatchMarkup(10, batchRounding)}>+10%</button>
							<button type="button" className="batch-quick-btn" onClick={() => handleApplyBatchMarkup(15, batchRounding)}>+15%</button>
							<button type="button" className="batch-quick-btn" onClick={() => handleApplyBatchMarkup(-10, batchRounding)}>-10% (Скидка)</button>
							<button type="button" className="batch-quick-btn" onClick={() => handleApplyBatchMarkup(-50, batchRounding)} title="Скидка 50%">-50%</button>
							<button type="button" className="batch-quick-btn" onClick={() => handleApplyBatchMarkup(-100, batchRounding)} title="100% скидка на гарантийные переделки">-100% (Гарантия)</button>
							<span style={{ color: 'var(--line)', margin: '0 0.25rem' }}>|</span>
							<button type="button" className="batch-quick-btn" onClick={() => handleApplyBatchRounding('round_100')}>До 100 ₽</button>
							<button type="button" className="batch-quick-btn" onClick={() => handleApplyBatchRounding('round_500')}>До 500 ₽</button>
						</div>
					</div>
				)}

				{/* Toast Message */}
				{toastMessage && (
					<div
						style={{
							position: 'absolute',
							top: '5rem',
							right: '2rem',
							zIndex: 10001,
							background: 'var(--ink, #0f172a)',
							color: 'var(--paper, #ffffff)',
							padding: '0.625rem 1.25rem',
							borderRadius: '8px',
							boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
							display: 'flex',
							alignItems: 'center',
							gap: '0.5rem',
							fontSize: '0.875rem',
						}}
					>
						<CheckCircle2 size={16} style={{ color: 'var(--ok-fg, #10b981)' }} />
						<span>{toastMessage}</span>
					</div>
				)}

				{/* Main Split Layout */}
				<div className="pricelist-main-layout">
					{/* Category Sidebar */}
					<nav className="pricelist-category-sidebar">
						<button
							type="button"
							className={`category-nav-btn ${selectedCategory === 'all' ? 'active' : ''}`}
							onClick={() => setSelectedCategory('all')}
						>
							<span>Все разделы</span>
							<span className="category-nav-count">{categoryCounts.all || 0}</span>
						</button>

						{(Object.keys(CATEGORY_LABELS) as Order804nCategory[]).map((catKey) => {
							const count = categoryCounts[catKey] || 0;
							if (count === 0 && selectedCategory !== catKey) return null;
							return (
								<button
									key={catKey}
									type="button"
									className={`category-nav-btn ${selectedCategory === catKey ? 'active' : ''}`}
									onClick={() => setSelectedCategory(catKey)}
								>
									<span>{CATEGORY_LABELS[catKey]}</span>
									<span className="category-nav-count">{count}</span>
								</button>
							);
						})}
					</nav>

					{/* Data Table */}
					<div className="pricelist-table-container">
						<table className="pricelist-data-table">
							<thead>
								<tr>
									<th style={{ width: '40px' }}>
										<input
											type="checkbox"
											checked={
												filteredItems.length > 0 &&
												filteredItems.every((i) => selectedItemIds.has(i.id))
											}
											onChange={(e) => {
												if (e.target.checked) {
													setSelectedItemIds(new Set(filteredItems.map((i) => i.id)));
												} else {
													setSelectedItemIds(new Set());
												}
											}}
										/>
									</th>
									<th style={{ width: '120px', cursor: 'pointer' }} onClick={() => handleToggleSort('code')}>
										<div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
											<span>Код 804н</span>
											<ArrowUpDown size={12} style={{ opacity: sortField === 'code' ? 1 : 0.35 }} />
										</div>
									</th>
									<th style={{ cursor: 'pointer' }} onClick={() => handleToggleSort('title')}>
										<div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
											<span>Наименование медицинской услуги</span>
											<ArrowUpDown size={12} style={{ opacity: sortField === 'title' ? 1 : 0.35 }} />
										</div>
									</th>
									<th style={{ width: '130px' }}>Специальность</th>
									<th style={{ width: '310px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleToggleSort('price')}>
										<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
											<span>Цена ({activeTier === 'standard' ? 'Руб.' : activeTier.toUpperCase()})</span>
											<ArrowUpDown size={12} style={{ opacity: sortField === 'price' ? 1 : 0.35 }} />
										</div>
									</th>
									<th style={{ width: '90px', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleToggleSort('margin')}>
										<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
											<span>Маржа %</span>
											<ArrowUpDown size={12} style={{ opacity: sortField === 'margin' ? 1 : 0.35 }} />
										</div>
									</th>
									<th style={{ width: '90px', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleToggleSort('duration')}>
										<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
											<span>Время</span>
											<ArrowUpDown size={12} style={{ opacity: sortField === 'duration' ? 1 : 0.35 }} />
										</div>
									</th>
									<th style={{ width: '90px', textAlign: 'center' }}>Действия</th>
								</tr>
							</thead>
							<tbody>
								{pricelistSlice.visibleItems.map((item) => {
									const prof = calculateServiceProfitability(item, activeTier);
									const currentPrice = calculateTierPrice(
										item.basePriceRub,
										activeTier,
										item.tierPrices?.[activeTier],
									);
									const isSelected = selectedItemIds.has(item.id);

									return (
										<tr
											key={item.id}
											style={{
												background: isSelected ? 'rgba(59, 130, 246, 0.05)' : undefined,
												contain: 'content',
												contentVisibility: 'auto',
												containIntrinsicSize: '1px 52px',
											}}
										>
											<td>
												<input
													type="checkbox"
													checked={isSelected}
													onChange={(e) => {
														const next = new Set(selectedItemIds);
														if (e.target.checked) next.add(item.id);
														else next.delete(item.id);
														setSelectedItemIds(next);
													}}
												/>
											</td>
											<td>
												<span className="pricelist-code-pill">{item.code804n}</span>
											</td>
											<td>
												<div className="service-title-cell">
													<div
														className="service-commercial-name"
														style={{ cursor: 'pointer' }}
														onClick={() => openEditModal(item)}
														title="Кликните для редактирования карточки услуги"
													>
														{item.commercialTitle}
													</div>
													<div className="service-statutory-name">{item.statutoryTitle804n}</div>
													{item.icd10Indications.length > 0 && (
														<div className="service-meta-tags">
															{item.icd10Indications.map((icd) => (
																<span key={icd} className="service-icd-pill">
																	{icd}
																</span>
															))}
														</div>
													)}
												</div>
											</td>
											<td>
												<span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
													{SPECIALTY_LABELS[item.specialty] ?? item.specialty}
												</span>
											</td>
											<td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
												<div className="price-edit-container" style={{ justifyContent: 'flex-end', gap: '3px' }}>
													{editingPriceCellId === item.id ? (
														<div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
															<input
																type="text"
																inputMode="numeric"
																className="price-input-quick"
																style={{ width: '85px', fontWeight: 600, textAlign: 'right', height: '28px', padding: '0 4px' }}
																autoFocus
																value={editingPriceBuffer}
																onChange={(e) => setEditingPriceBuffer(e.target.value.replace(/[^\d]/g, ''))}
																onKeyDown={(e) => {
																	if (e.key === 'Enter') {
																		handleCommitInlinePrice(item.id, editingPriceBuffer);
																	} else if (e.key === 'Escape') {
																		setEditingPriceCellId(null);
																	}
																}}
																onBlur={() => handleCommitInlinePrice(item.id, editingPriceBuffer)}
															/>
															<span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>₽</span>
														</div>
													) : (
														<button
															type="button"
															onClick={() => {
																setEditingPriceCellId(item.id);
																setEditingPriceBuffer(String(currentPrice));
															}}
															title="Кликните для ввода цены с клавиатуры"
															style={{
																background: 'transparent',
																border: '1px solid transparent',
																borderRadius: '4px',
																padding: '2px 4px',
																cursor: 'pointer',
																fontWeight: 600,
																fontSize: '0.8125rem',
																color: 'var(--ink)',
																display: 'inline-flex',
																alignItems: 'center',
																gap: '3px',
															}}
														>
															<span>{formatRubles(currentPrice)}</span>
															<Edit3 size={11} style={{ opacity: 0.4 }} />
														</button>
													)}

													{/* Inline Modifiers: -500, -100, +100, +500, 0 ₽ (Гарантия) */}
													<button
														type="button"
														className="batch-quick-btn"
														style={{ padding: '0 3px', fontSize: '0.6875rem', height: '22px', minWidth: '28px' }}
														onClick={() => handleModifyPriceDelta(item.id, -500)}
														title="Вычесть 500 ₽"
													>
														-500
													</button>
													<button
														type="button"
														className="batch-quick-btn"
														style={{ padding: '0 3px', fontSize: '0.6875rem', height: '22px', minWidth: '28px' }}
														onClick={() => handleModifyPriceDelta(item.id, -100)}
														title="Вычесть 100 ₽"
													>
														-100
													</button>
													<button
														type="button"
														className="batch-quick-btn"
														style={{ padding: '0 3px', fontSize: '0.6875rem', height: '22px', minWidth: '28px' }}
														onClick={() => handleModifyPriceDelta(item.id, 100)}
														title="Прибавить 100 ₽"
													>
														+100
													</button>
													<button
														type="button"
														className="batch-quick-btn"
														style={{ padding: '0 3px', fontSize: '0.6875rem', height: '22px', minWidth: '28px' }}
														onClick={() => handleModifyPriceDelta(item.id, 500)}
														title="Прибавить 500 ₽"
													>
														+500
													</button>
													<button
														type="button"
														className={`batch-quick-btn ${currentPrice === 0 ? 'active' : ''}`}
														style={{
															padding: '0 4px',
															fontSize: '0.6875rem',
															height: '22px',
															minWidth: '26px',
															color: currentPrice === 0 ? 'var(--ok-fg, #10b981)' : undefined,
															borderColor: currentPrice === 0 ? 'rgba(16, 185, 129, 0.4)' : undefined,
															background: currentPrice === 0 ? 'rgba(16, 185, 129, 0.12)' : undefined,
														}}
														onClick={() => handleSetZeroWarrantyPrice(item.id)}
														title="Установить 0 ₽ (Гарантийная переделка / бесплатная услуга по Мандату 8e)"
													>
														0 ₽
													</button>
												</div>
											</td>
											<td style={{ textAlign: 'center' }}>
												<span className={`margin-badge ${prof.level}`}>
													{prof.marginPercent}%
												</span>
											</td>
											<td style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)' }}>
												{item.estimatedDurationMin} мин
											</td>
											<td style={{ textAlign: 'center', width: '90px', whiteSpace: 'nowrap' }}>
												<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
													<button
														type="button"
														className="pricelist-btn pricelist-btn-icon"
														style={{ width: '26px', height: '26px', padding: 0 }}
														onClick={() => openEditModal(item)}
														title="Редактировать карточку услуги"
													>
														<Edit3 size={13} />
													</button>
													<button
														type="button"
														className="pricelist-btn pricelist-btn-icon"
														style={{ width: '26px', height: '26px', padding: 0 }}
														onClick={() => handleDuplicateItem(item)}
														title="Создать копию услуги"
													>
														<Copy size={13} />
													</button>
													<button
														type="button"
														className="pricelist-btn pricelist-btn-icon"
														style={{ width: '26px', height: '26px', padding: 0, color: 'var(--alert-fg, #ef4444)' }}
														onClick={() => handleDeleteItem(item.id)}
														title="Удалить услугу"
													>
														<Trash2 size={13} />
													</button>
												</div>
											</td>
										</tr>
									);
								})}

								{pricelistSlice.hasMore && (
									<tr>
										<td colSpan={8} style={{ textAlign: 'center', padding: '0.75rem' }}>
											<button
												type="button"
												className="pricelist-btn btn-pricelist-show-more"
												onClick={() => setDisplayLimit((prev) => prev + 40)}
												style={{ margin: '0 auto', fontSize: '0.8125rem', height: '32px' }}
												title="Подгрузить следующие позиции прейскуранта"
											>
												<span>Показать ещё 40 услуг (осталось {pricelistSlice.remainingCount})</span>
											</button>
										</td>
									</tr>
								)}

								{filteredItems.length === 0 && (
									<tr>
										<td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
											<AlertCircle size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
											<div>Позиции по запросу не найдены</div>
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>

				{/* Footer Bar */}
				<footer className="pricelist-footer-bar">
					<div className="pricelist-footer-legal">
						<ShieldCheck size={16} className="pricelist-legal-icon" />
						<span>{STATUTORY_VAT_EXEMPTION_NOTE} · Соответствует стандарту Минздрава России № 804н</span>
					</div>

					<div>
						Отображено {pricelistSlice.visibleItems.length} из {filteredItems.length} позиций
						{filteredItems.length !== items.length && ` (всего в каталоге: ${items.length})`}
						{selectedItemIds.size > 0 && ` · Выбрано ${selectedItemIds.size}`}
					</div>
				</footer>
			</div>

			{/* Multi-Format Import Modal (Smart Text & CSV with 804n Mapping Diff View) */}
			{isImportModalOpen && (
				<div className="csv-import-modal" role="dialog" aria-modal="true">
					<div
						className="csv-import-container"
						style={{
							maxWidth: ingestedMappingItems.length > 0 ? '1180px' : '780px',
							width: '95%',
							height: ingestedMappingItems.length > 0 ? '88vh' : 'auto',
							display: 'flex',
							flexDirection: 'column',
							transition: 'max-width 0.2s ease',
						}}
					>
						<header className="pricelist-modal-header">
							<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
								<div className="pricelist-header-title">Импорт прейскуранта</div>
								{/* Segmented Mode Selector */}
								{ingestedMappingItems.length === 0 && (
									<div className="pricelist-tier-segmented" style={{ padding: '2px' }}>
										<button
											type="button"
											className={`tier-segment-btn ${importMode === 'smart_text' ? 'active' : ''}`}
											style={{ minHeight: '28px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', gap: '0.375rem' }}
											onClick={() => setImportMode('smart_text')}
										>
											<Sparkles size={13} />
											<span>Умный текст (Word / PDF / Скан)</span>
										</button>
										<button
											type="button"
											className={`tier-segment-btn ${importMode === 'csv' ? 'active' : ''}`}
											style={{ minHeight: '28px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', gap: '0.375rem' }}
											onClick={() => setImportMode('csv')}
										>
											<FileSpreadsheet size={13} />
											<span>CSV / Excel</span>
										</button>
									</div>
								)}
								{ingestedMappingItems.length > 0 && (
									<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
										<span className="pricelist-statutory-badge">
											<ShieldCheck size={13} />
											<span>Сопоставление с Номенклатурой 804н</span>
										</span>
										<button
											type="button"
											className="pricelist-btn"
											style={{ height: '28px', fontSize: '0.75rem', padding: '0 0.5rem' }}
											onClick={() => setIngestedMappingItems([])}
											title="Вернуться к редактированию исходного текста"
										>
											<span>Назад к тексту</span>
										</button>
									</div>
								)}
							</div>
							<button
								type="button"
								className="pricelist-btn pricelist-btn-icon"
								onClick={() => {
									setIsImportModalOpen(false);
									setIngestedMappingItems([]);
								}}
								aria-label="Закрыть"
							>
								<X size={18} />
							</button>
						</header>

						{ingestedMappingItems.length > 0 ? (
							<div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
								<PriceListMappingDiffView
									items={ingestedMappingItems}
									onItemsChange={setIngestedMappingItems}
									onAcceptAll={() => {
										setIngestedMappingItems((prev) => prev.map((i) => ({ ...i, isApproved: true })));
									}}
									onApply={handleApplyIngestedMapping}
									onCancel={() => setIngestedMappingItems([])}
									existingCatalog={items.map((it) => ({
										id: it.id,
										code: it.code804n,
										title: it.commercialTitle,
										basePriceRub: it.basePriceRub,
									}))}
									isLoading={isIngestingApi}
								/>
							</div>
						) : (
							<>
								<div className="csv-import-body">
									{importMode === 'smart_text' ? (
										<div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
											<div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
												Вставьте скопированный текст из старого прейскуранта клиники, выгрузки Word или распознанного PDF.
												Алгоритм автоматически выделит цены, очистит наименования и сопоставит услуги с Номенклатурой Минздрава РФ 804н.
											</div>

											<textarea
												className="pricelist-search-input"
												style={{ height: '140px', fontFamily: 'monospace', fontSize: '0.75rem', padding: '0.5rem', lineHeight: '1.4' }}
												placeholder={`Пример строк для вставки:\nA16.07.002.001 Наложение световой пломбы 4 500 руб\nЛечение глубокого кариеса - 3500\nУдаление зуба мудрости сложное 5 200 ₽\nУстановка имплантата Straumann SLA 38000\nКоронка из диоксида циркония 18000 руб\nАнестезия Убистезин 700 р`}
												value={smartTextInput}
												onChange={(e) => {
													setSmartTextInput(e.target.value);
													handleParseSmartText(e.target.value);
												}}
											/>

											<label className="csv-dropzone" style={{ padding: '0.75rem', marginTop: '0.25rem' }}>
												<FileSpreadsheet size={24} style={{ color: 'var(--brand-500)' }} />
												<div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Загрузить файл прейскуранта (TXT, CSV, PDF выгрузка)</div>
												<input
													type="file"
													accept=".txt,.csv,.doc,.docx"
													style={{ display: 'none' }}
													onChange={handleFileUpload}
												/>
											</label>
										</div>
									) : (
										<div>
											<label className="csv-dropzone">
												<FileSpreadsheet size={36} style={{ color: 'var(--brand-500)' }} />
												<div style={{ fontWeight: 600 }}>Выберите или перетащите CSV-файл прейскуранта</div>
												<div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
													Поддерживается разделитель точка с запятой (;) или запятая (,), кодировка UTF-8
												</div>
												<input
													type="file"
													accept=".csv,.txt"
													style={{ display: 'none' }}
													onChange={handleFileUpload}
												/>
											</label>

											<div style={{ marginTop: '0.75rem' }}>
												<div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
													Или вставьте текст таблицы CSV:
												</div>
												<textarea
													className="pricelist-search-input"
													style={{ height: '120px', fontFamily: 'monospace', fontSize: '0.75rem', padding: '0.5rem' }}
													placeholder="Код 804н;Коммерческое наименование;Категория;Цена standard..."
													value={csvInputText}
													onChange={(e) => setCsvInputText(e.target.value)}
												/>
											</div>

											{importErrors.length > 0 && (
												<div
													style={{
														marginTop: '0.5rem',
														padding: '0.75rem',
														borderRadius: '6px',
														background: 'rgba(239, 68, 68, 0.1)',
														color: 'var(--bad)',
														fontSize: '0.75rem',
													}}
												>
													<div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Ошибки при разборе CSV:</div>
													{importErrors.slice(0, 5).map((err, idx) => (
														<div key={idx}>• {err}</div>
													))}
												</div>
											)}
										</div>
									)}
								</div>

								<footer
									style={{
										padding: '0.75rem 1.25rem',
										borderTop: '1px solid var(--line)',
										display: 'flex',
										justifyContent: 'flex-end',
										gap: '0.5rem',
									}}
								>
									<button
										type="button"
										className="pricelist-btn"
										onClick={() => setIsImportModalOpen(false)}
									>
										Отмена
									</button>
									{importMode === 'smart_text' ? (
										<button
											type="button"
											className="pricelist-btn pricelist-btn-primary"
											onClick={() => {
												if (!smartTextInput.trim()) {
													showToast('Вставьте текст со старыми ценами или выберите файл');
													return;
												}
												if (isIngestingApi) return;
												handleIngestPriceList(smartTextInput, 'text');
											}}
											title="Запустить распознавание и сопоставление с классификатором 804н"
										>
											<Sparkles size={14} />
											<span>{isIngestingApi ? 'Распознавание...' : 'Распознать и сопоставить (804н)'}</span>
										</button>
									) : (
										<div style={{ display: 'flex', gap: '0.5rem' }}>
											<button
												type="button"
												className="pricelist-btn"
												onClick={() => {
													if (!csvInputText.trim()) {
														showToast('Вставьте текст таблицы CSV или выберите файл');
														return;
													}
													if (isIngestingApi) return;
													handleIngestPriceList(csvInputText, 'csv');
												}}
												title="Сопоставить строки CSV с Номенклатурой 804н в двухоконном виде"
											>
												<ShieldCheck size={14} />
												<span>Сопоставить с 804н</span>
											</button>
											<button
												type="button"
												className="pricelist-btn pricelist-btn-primary"
												onClick={handleImportCsv}
											>
												Загрузить CSV напрямую
											</button>
										</div>
									)}
								</footer>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
