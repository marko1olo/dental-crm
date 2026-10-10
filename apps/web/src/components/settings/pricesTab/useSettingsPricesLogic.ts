import type {
	DentalSpecialty,
	PricelistCollisionStrategy,
	ServiceCatalogItem,
} from "@dental/shared";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { normalizeRubAmountInput } from "../../../rubAmountInput";
import { useSettingsDerivations } from "../../../useSettingsDerivations";
import {
	detectCategoryFrom804nCode,
	exportPricelistToCsv,
	importPricelistFromCsv,
	rublesToKopecks,
} from "../../catalog/pricelist/servicePricelistEngine";
import {
	BASELINE_804N_PRICELIST_SERVICES,
	STATUTORY_ORDER_804N_PRESETS,
	STATUTORY_VAT_EXEMPTION_NOTE,
	type DoctorSpecialty,
	type Order804nCategory,
	type ServicePricelistItem,
} from "../../catalog/pricelist/servicePricelistPresets";
import { showToast } from "../../GlobalToast";
import {
	type ExistingCatalogReference,
	type IngestedMappingItem,
} from "../../pricing/PriceListMappingDiffView";
import { syncPricelistItemsToCatalog } from "../catalogSyncHelper";
import {
	NEW_SERVICE_TEMPLATE,
	rubToPriceInput,
} from "../pricelistEditorHelpers";
import {
	type SettingsAccessHeaders,
	staffMutationHeaders,
} from "../staffMutationRequest";
import type {
	PricelistStudioTab,
	ScannerFileState,
	ServiceEditFormData,
	UseSettingsPricesLogicProps,
} from "./types";

export function useSettingsPricesLogic(propsOverrides?: UseSettingsPricesLogicProps) {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const mergedProps = Object.assign({}, appLogic, derivations, propsOverrides) as any;
	const {
		dashboard,
		pricelistSourceKindLabels,
		pricelistSourceKind,
		setPricelistSourceKind,
		clearPricelistImage,
		setPricelistAnalysis,
		pricelistRecognitionServiceGroups,
		pricelistRecognitionBrandGroups,
		pricelistText,
		setPricelistText,
		pricelistImageName,
		attachPricelistImage,
		usePricelistAi,
		setUsePricelistAi,
		analyzePricelist,
		isPricelistAnalyzing,
		pricelistImageBase64,
		pricelistAnalysis,
		pricelistParserModeLabels,
		serviceCategoryLabels,
		specialtyLabels,
		createServiceCatalogItem,
		updateServiceCatalogItem,
		deleteServiceCatalogItem,
	} = mergedProps;

	const [activeTab, setActiveTab] = useState<PricelistStudioTab>("catalog");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategoryFilter, setSelectedCategoryFilter] =
		useState<string>("all");
	const [isServicePricelistModalOpen, setIsServicePricelistModalOpen] =
		useState(false);
	const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>(
		{},
	);
	const [is804nCodesMenuOpen, setIs804nCodesMenuOpen] = useState(false);
	const codes804nMenuRef = useRef<HTMLDivElement | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset pagination when searching
	useEffect(() => {
		setCategoryLimits({});
	}, [searchQuery, selectedCategoryFilter]);

	useEffect(() => {
		if (!is804nCodesMenuOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (
				codes804nMenuRef.current &&
				!codes804nMenuRef.current.contains(e.target as Node)
			) {
				setIs804nCodesMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, [is804nCodesMenuOpen]);

	const [editServiceId, setEditServiceId] = useState<string | null>(null);
	const [editServiceForm, setEditServiceForm] = useState<ServiceEditFormData>(
		NEW_SERVICE_TEMPLATE,
	);
	const [priceRubInput, setPriceRubInput] = useState("");
	const [priceProblem, setPriceProblem] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [deletingServiceId, setDeletingServiceId] = useState<string | null>(
		null,
	);
	const [isSeedingBaseline, setIsSeedingBaseline] = useState(false);

	// Native 804n Pricelist Scanner Dropzone & Diff Modal State
	const [isNativeScannerDropzoneOpen, setIsNativeScannerDropzoneOpen] =
		useState(false);
	const [scannerMode, setScannerMode] = useState<"file" | "text">("file");
	const [scannerDragOver, setScannerDragOver] = useState(false);
	const [scannerFile, setScannerFile] = useState<ScannerFileState | null>(null);
	const [scannerText, setScannerText] = useState("");
	const [scannerCollisionStrategy, setScannerCollisionStrategy] =
		useState<PricelistCollisionStrategy>("update_existing");
	const [isScanningPricelist, setIsScanningPricelist] = useState(false);
	const [scannerError, setScannerError] = useState<string | null>(null);
	const [isMappingDiffOpen, setIsMappingDiffOpen] = useState(false);
	const [mappingDiffItems, setMappingDiffItems] = useState<
		IngestedMappingItem[]
	>([]);
	const [isCommittingImport, setIsCommittingImport] = useState(false);
	const nativeFileInputRef = useRef<HTMLInputElement | null>(null);

	const typedServiceCatalog = dashboard?.serviceCatalog || [];

	const accessHeaders = (
		mergedProps as { auth?: { settingsAccessHeaders?: SettingsAccessHeaders } }
	).auth?.settingsAccessHeaders;

	const filteredCatalog = useMemo(() => {
		let items = [...typedServiceCatalog];
		if (selectedCategoryFilter !== "all") {
			items = items.filter(
				(s) => (s.category || "other") === selectedCategoryFilter,
			);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			const cleanQ = q.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, "");
			items = items.filter((s) => {
				const titleMatch = (s.title || s.name || "").toLowerCase().includes(q);
				const codeMatch = s.code?.toLowerCase().includes(q);
				const cleanCodeMatch =
					cleanQ.length >= 2 &&
					(s.code || "")
						.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, "")
						.toLowerCase()
						.includes(cleanQ);
				return titleMatch || codeMatch || cleanCodeMatch;
			});
		}
		return items.sort((a, b) => (a.title || a.name || "").localeCompare(b.title || b.name || ""));
	}, [typedServiceCatalog, searchQuery, selectedCategoryFilter]);

	const groupedCatalog = useMemo(() => {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const groups: Record<string, any[]> = {};
		filteredCatalog.forEach((item) => {
			const cat = item.category || "other";
			(groups[cat] ??= []).push(item);
		});
		return groups;
	}, [filteredCatalog]);

	const handleSaveService = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!createServiceCatalogItem || !updateServiceCatalogItem) {
			mergedProps.setError?.("API недоступно");
			return;
		}
		const basePriceRub = normalizeRubAmountInput(priceRubInput);
		if (basePriceRub === null) {
			setPriceProblem(
				priceRubInput.trim()
					? "Цена непонятна. Впишите сумму цифрами, копейки после запятой: 1500 или 1500,50."
					: "Укажите цену услуги: например 1500 или 1500,50.",
			);
			return;
		}
		setPriceProblem(null);
		setIsSaving(true);
		try {
			const servicePayload = { ...editServiceForm, basePriceRub };
			if (editServiceId === "new") await createServiceCatalogItem(servicePayload);
			else await updateServiceCatalogItem(editServiceId, servicePayload);
			setEditServiceId(null);
			// biome-ignore lint/suspicious/noExplicitAny: error handling
		} catch (error: any) {
			mergedProps.setError?.(error.message || "Ошибка сохранения");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteService = async (id: string) => {
		if (deletingServiceId === id) return;
		if (!deleteServiceCatalogItem) return;
		setDeletingServiceId(id);
		try {
			await deleteServiceCatalogItem(id);
			// biome-ignore lint/suspicious/noExplicitAny: error handling
		} catch (error: any) {
			mergedProps.setError?.(error.message || "Ошибка удаления");
		} finally {
			setDeletingServiceId(null);
		}
	};

	const modalInitialItems: readonly ServicePricelistItem[] = useMemo(() => {
		if (!typedServiceCatalog || typedServiceCatalog.length === 0) {
			return STATUTORY_ORDER_804N_PRESETS;
		}
		return typedServiceCatalog.map((s: ServiceCatalogItem) => {
			const rawPrice =
				s.basePriceRub ??
				(s as unknown as { priceRub?: number }).priceRub ??
				((s as unknown as { priceKopecks?: number }).priceKopecks
					? (s as unknown as { priceKopecks: number }).priceKopecks / 100
					: 0);
			const basePriceRub = Number.isFinite(rawPrice)
				? Math.round(rawPrice * 100) / 100
				: 0;
			const code804n = (s.code || "").trim() || "A16.07.002";
			const category =
				(s.category as Order804nCategory) ||
				detectCategoryFrom804nCode(code804n, s.title);
			const specialty = (s.specialty as DoctorSpecialty) || "therapist";
			return {
				id: s.id,
				code804n,
				commercialTitle: s.title,
				statutoryTitle804n: s.title,
				category,
				specialty,
				basePriceRub,
				basePriceKopecks: rublesToKopecks(basePriceRub),
				materialCostRub: 0,
				labCostRub: 0,
				estimatedDurationMin: s.durationMinutes || 30,
				vatRate: 0 as const,
				vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
				icd10Indications: [],
				isActive: s.active !== false,
				isArchived: s.active === false,
				tags: s.aliases || [],
			};
		});
	}, [typedServiceCatalog]);

	const handleSaveCatalog = async (items: readonly ServicePricelistItem[]) => {
		await syncPricelistItemsToCatalog({
			items,
			existingServices:
				(dashboard?.serviceCatalog ?? []) as ServiceCatalogItem[],
			createServiceCatalogItem,
			updateServiceCatalogItem,
		});
		if (typeof mergedProps.refreshDashboard === "function") {
			await mergedProps.refreshDashboard();
		} else if (typeof appLogic?.refreshDashboard === "function") {
			await appLogic.refreshDashboard();
		}
	};

	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const handleExportCsv = () => {
		const items: ServicePricelistItem[] = typedServiceCatalog.map(
			(s: ServiceCatalogItem) => ({
				id: s.id,
				code804n: s.code || "",
				commercialTitle: s.title,
				statutoryTitle804n: s.title,
				// biome-ignore lint/suspicious/noExplicitAny: category cast
				category: (s.category || "therapy") as any,
				// biome-ignore lint/suspicious/noExplicitAny: specialty cast
				specialty: (s.specialty || "therapist") as any,
				basePriceRub: (() => {
					// biome-ignore lint/suspicious/noExplicitAny: fallback field extraction
					const raw =
						s.basePriceRub ??
						(s as any).priceRub ??
						((s as any).priceKopecks ? (s as any).priceKopecks / 100 : 0);
					return Number.isFinite(raw) ? Math.round(raw * 100) / 100 : 0;
				})(),
				unitCostRub: 0,
				labCostRub: 0,
				durationMinutes: s.durationMinutes || 30,
				estimatedDurationMin: s.durationMinutes || 30,
				isActive: s.active !== false,
				vatRate: "exempt",
				icd10Codes: [],
				tags: [],
			}),
		);
		const blob = new Blob([exportPricelistToCsv(items)], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `dente_pricelist_${new Date().toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		showToast(
			`Прайс-лист (${items.length} услуг) экспортирован в CSV`,
			"success",
		);
	};

	const handleImportCsvFile = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const text = await file.text();
			const result = importPricelistFromCsv(text);
			if (result.invalidRows.length > 0 && result.validItems.length === 0) {
				showToast(
					`Ошибка импорта CSV: ${result.invalidRows[0]?.error || "Неверный формат"}`,
					"error",
				);
				return;
			}
			await handleSaveCatalog(result.validItems);
			showToast(
				`Импортировано ${result.validItems.length} услуг из CSV`,
				"success",
			);
			if (typeof mergedProps.refreshDashboard === "function") {
				await mergedProps.refreshDashboard();
			} else if (typeof appLogic?.refreshDashboard === "function") {
				await appLogic.refreshDashboard();
			}
		} catch (err) {
			showToast(
				`Ошибка чтения CSV: ${err instanceof Error ? err.message : String(err)}`,
				"error",
			);
		} finally {
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const handleSeedBaseline804n = async (replace = false) => {
		if (isSeedingBaseline) return;
		setIsSeedingBaseline(true);
		try {
			let seededCount = 0;
			let apiSucceeded = false;
			try {
				const headers = staffMutationHeaders(
					(mergedProps.accessHeaders as SettingsAccessHeaders | undefined) ??
						(appLogic?.accessHeaders as SettingsAccessHeaders | undefined),
				);
				const response = await fetch("/api/pricelist/seed-baseline-804n", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...headers,
					},
					body: JSON.stringify({ replace }),
				});
				if (response.ok) {
					const data = await response.json();
					seededCount = data.createdCount ?? 30;
					apiSucceeded = true;
				}
			} catch (fetchErr) {
				console.warn(
					"[pricelist] fetch /api/pricelist/seed-baseline-804n fallback to client loop:",
					fetchErr,
				);
			}

			if (!apiSucceeded) {
				await handleSaveCatalog(BASELINE_804N_PRICELIST_SERVICES);
				seededCount = BASELINE_804N_PRICELIST_SERVICES.length;
			}

			if (typeof mergedProps.refreshDashboard === "function") {
				await mergedProps.refreshDashboard();
			} else if (typeof appLogic?.refreshDashboard === "function") {
				await appLogic.refreshDashboard();
			} else if (typeof appLogic?.loadClinicSettings === "function") {
				await appLogic.loadClinicSettings();
			}

			showToast(
				seededCount > 0
					? `Базовый прейскурант услуг успешно заполнен (${seededCount} услуг)`
					: "Базовый прейскурант услуг актуален (услуги уже присутствуют в каталоге)",
				"success",
			);
			setIs804nCodesMenuOpen(false);
		} catch (error: any) {
			console.error(
				"[pricelist] Ошибка наполнения базового прейскуранта услуг:",
				error,
			);
			showToast(
				error?.message || "Не удалось наполнить базовый прейскурант услуг",
				"error",
			);
		} finally {
			setIsSeedingBaseline(false);
		}
	};

	const existingCatalogReferences: readonly ExistingCatalogReference[] =
		useMemo(() => {
			return typedServiceCatalog.map((s: ServiceCatalogItem) => {
				const rawPrice =
					s.basePriceRub ??
					(s as unknown as { priceRub?: number }).priceRub ??
					((s as unknown as { priceKopecks?: number }).priceKopecks
						? (s as unknown as { priceKopecks: number }).priceKopecks / 100
						: 0);
				const basePriceRub = Number.isFinite(rawPrice)
					? Math.round(rawPrice * 100) / 100
					: 0;
				return {
					id: s.id,
					code: s.code || "",
					title: s.title,
					basePriceRub,
				};
			});
		}, [typedServiceCatalog]);

	const runScannerRequest = async (opts: {
		fileBase64?: string;
		filename?: string;
		rawContent?: string;
	}) => {
		setIsScanningPricelist(true);
		setScannerError(null);
		try {
			const headers = staffMutationHeaders(
				(mergedProps.accessHeaders as SettingsAccessHeaders | undefined) ??
					(appLogic?.accessHeaders as SettingsAccessHeaders | undefined) ??
					accessHeaders,
			);

			const payload = {
				commit: false,
				collisionStrategy: scannerCollisionStrategy,
				filename: opts.filename || "pricelist.csv",
				...(opts.fileBase64 ? { fileBase64: opts.fileBase64 } : {}),
				...(opts.rawContent ? { rawContent: opts.rawContent } : {}),
			};

			const res = await fetch("/api/pricelist/scan-and-import", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...headers,
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(
					errData.message ||
						`Ошибка сканирования прейскуранта (HTTP ${res.status})`,
				);
			}

			const data = await res.json();
			const itemsList = data.scanResult?.items || data.items;
			if (itemsList && itemsList.length > 0) {
				const diffItems: IngestedMappingItem[] = itemsList.map(
					// biome-ignore lint/suspicious/noExplicitAny: scanner item conversion
					(it: any, idx: number) => ({
						id: it.id || `scan-${idx}-${Date.now()}`,
						sourceLineNumber: it.sourceLineNumber || idx + 1,
						rawLine: it.rawLine || it.cleanedTitle,
						cleanedTitle: it.cleanedTitle,
						code804n: it.code804n || "A16.07.002",
						statutoryTitle804n: it.statutoryTitle804n || it.cleanedTitle,
						category: it.category || "therapy",
						specialty: it.specialty || "therapist",
						priceRub: it.priceRub,
						priceKopecks: it.priceKopecks ?? Math.round(it.priceRub * 100),
						confidence: it.confidence ?? (it.code804n ? 0.95 : 0.75),
						confidenceKind:
							it.confidenceKind ??
							(it.code804n ? "exact_code" : "medium_keyword"),
						suggestedAction: it.suggestedAction || "create_new",
						matchedExistingServiceId: it.matchedExistingServiceId,
						matchedExistingTitle: it.matchedExistingTitle,
						matchedExistingPriceRub: it.matchedExistingPriceRub,
						isApproved: it.isApproved ?? it.validationStatus !== "error",
					}),
				);

				if (diffItems.length === 0) {
					showToast(
						"В файле не найдено строк с услугами или ценами",
						"warning",
					);
					return;
				}

				setMappingDiffItems(diffItems);
				setIsMappingDiffOpen(true);
			}
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Сбой сканирования прейскуранта";
			setScannerError(msg);
			showToast(msg, "error");
		} finally {
			setIsScanningPricelist(false);
		}
	};

	const handleProcessScannerFile = (file: File) => {
		const reader = new FileReader();
		reader.onload = async () => {
			const resultStr = reader.result as string;
			const base64 = resultStr.split(",")[1] || "";
			const fileObj = {
				name: file.name,
				base64,
				size: file.size,
			};
			setScannerFile(fileObj);
			await runScannerRequest({ fileBase64: base64, filename: file.name });
		};
		reader.readAsDataURL(file);
	};

	const handleCommitPricelistDiff = async (
		approvedItems: readonly IngestedMappingItem[],
	) => {
		setIsCommittingImport(true);
		setScannerError(null);
		try {
			const headers = staffMutationHeaders(
				(mergedProps.accessHeaders as SettingsAccessHeaders | undefined) ??
					(appLogic?.accessHeaders as SettingsAccessHeaders | undefined) ??
					accessHeaders,
			);

			const payload = {
				commit: true,
				collisionStrategy: scannerCollisionStrategy,
				approvedItems: approvedItems.map((it) => ({
					cleanedTitle: it.cleanedTitle,
					code: it.code804n ? undefined : it.cleanedTitle,
					code804n: it.code804n,
					category: it.category,
					specialty: it.specialty,
					priceRub: it.priceRub,
					durationMinutes: 30,
					suggestedAction: it.suggestedAction,
					matchedExistingServiceId: it.matchedExistingServiceId,
					isApproved: true,
				})),
				filename: scannerFile?.name || "pricelist.csv",
			};

			const res = await fetch("/api/pricelist/scan-and-import", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...headers,
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(
					errData.message ||
						`Ошибка сохранения прейскуранта (HTTP ${res.status})`,
				);
			}

			const data = await res.json();
			const count = data.committedCount ?? approvedItems.length;
			showToast(
				`Прейскурант успешно сохранён: ${count} услуг в каталоге клиники`,
				"success",
			);

			setIsMappingDiffOpen(false);
			setIsNativeScannerDropzoneOpen(false);
			setScannerFile(null);
			setScannerText("");

			if (typeof mergedProps.refreshDashboard === "function") {
				await mergedProps.refreshDashboard();
			} else if (typeof appLogic?.refreshDashboard === "function") {
				await appLogic.refreshDashboard();
			} else if (typeof appLogic?.loadClinicSettings === "function") {
				await appLogic.loadClinicSettings();
			}
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Не удалось сохранить прейскурант";
			setScannerError(msg);
			showToast(msg, "error");
		} finally {
			setIsCommittingImport(false);
		}
	};

	const openNewServiceModal = () => {
		setEditServiceForm(NEW_SERVICE_TEMPLATE);
		setPriceRubInput("");
		setPriceProblem(null);
		setEditServiceId("new");
	};

	const openEditServiceModal = (item: any) => {
		setEditServiceForm({
			title: item.title,
			code: item.code || "",
			category: item.category,
			specialty: item.specialty,
			basePriceRub: item.basePriceRub ?? item.priceRub ?? 0,
			durationMinutes: item.durationMinutes || 30,
			taxDeductible: item.taxDeductible,
			vatRate: item.vatRate || "vat_exempt",
			active: item.isActive,
		});
		setPriceRubInput(
			rubToPriceInput(item.basePriceRub ?? item.priceRub ?? 0),
		);
		setPriceProblem(null);
		setEditServiceId(item.id);
	};

	const resetFilters = () => {
		setSearchQuery("");
		setSelectedCategoryFilter("all");
	};

	const handleImportSuccess = async () => {
		if (typeof mergedProps.refreshDashboard === "function") {
			await mergedProps.refreshDashboard();
		} else if (typeof appLogic?.refreshDashboard === "function") {
			await appLogic.refreshDashboard();
		} else if (typeof appLogic?.loadClinicSettings === "function") {
			await appLogic.loadClinicSettings();
		}
	};

	return {
		mergedProps,
		appLogic,
		dashboard,
		accessHeaders,
		// Sub-module labels
		serviceCategoryLabels,
		specialtyLabels,
		pricelistSourceKindLabels,
		pricelistSourceKind,
		setPricelistSourceKind,
		clearPricelistImage,
		setPricelistAnalysis,
		pricelistRecognitionServiceGroups,
		pricelistRecognitionBrandGroups,
		pricelistText,
		setPricelistText,
		pricelistImageName,
		attachPricelistImage,
		usePricelistAi,
		setUsePricelistAi,
		analyzePricelist,
		isPricelistAnalyzing,
		pricelistImageBase64,
		pricelistAnalysis,
		pricelistParserModeLabels,
		// State
		activeTab,
		setActiveTab,
		searchQuery,
		setSearchQuery,
		selectedCategoryFilter,
		setSelectedCategoryFilter,
		isServicePricelistModalOpen,
		setIsServicePricelistModalOpen,
		categoryLimits,
		setCategoryLimits,
		is804nCodesMenuOpen,
		setIs804nCodesMenuOpen,
		codes804nMenuRef,
		editServiceId,
		setEditServiceId,
		editServiceForm,
		setEditServiceForm,
		priceRubInput,
		setPriceRubInput,
		priceProblem,
		setPriceProblem,
		isSaving,
		deletingServiceId,
		isSeedingBaseline,
		isNativeScannerDropzoneOpen,
		setIsNativeScannerDropzoneOpen,
		scannerMode,
		setScannerMode,
		scannerDragOver,
		setScannerDragOver,
		scannerFile,
		setScannerFile,
		scannerText,
		setScannerText,
		scannerCollisionStrategy,
		setScannerCollisionStrategy,
		isScanningPricelist,
		scannerError,
		isMappingDiffOpen,
		setIsMappingDiffOpen,
		mappingDiffItems,
		setMappingDiffItems,
		isCommittingImport,
		nativeFileInputRef,
		fileInputRef,
		// Computed
		typedServiceCatalog,
		filteredCatalog,
		groupedCatalog,
		modalInitialItems,
		existingCatalogReferences,
		// Handlers
		handleSaveService,
		handleDeleteService,
		handleSaveCatalog,
		handleExportCsv,
		handleImportCsvFile,
		handleSeedBaseline804n,
		runScannerRequest,
		handleProcessScannerFile,
		handleCommitPricelistDiff,
		openNewServiceModal,
		openEditServiceModal,
		resetFilters,
		handleImportSuccess,
	};
}
