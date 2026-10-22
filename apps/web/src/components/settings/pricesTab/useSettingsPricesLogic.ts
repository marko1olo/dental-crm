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
	BASELINE_804N_PRICELIST_SERVICES,
	type ServicePricelistItem,
} from "../../catalog/pricelist/servicePricelistPresets";
import {
	buildExistingCatalogReferences,
	buildModalInitialItems,
	exportCatalogToCsvDownload,
	mapScanItemsToDiffItems,
	parseAndImportCsvText,
	printPricelistA4,
} from "./pricesExportPrintHelpers";
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
		dashboard, pricelistSourceKindLabels, pricelistSourceKind, setPricelistSourceKind,
		clearPricelistImage, setPricelistAnalysis, pricelistRecognitionServiceGroups,
		pricelistRecognitionBrandGroups, pricelistText, setPricelistText,
		pricelistImageName, attachPricelistImage, usePricelistAi, setUsePricelistAi,
		analyzePricelist, isPricelistAnalyzing, pricelistImageBase64, pricelistAnalysis,
		pricelistParserModeLabels, serviceCategoryLabels, specialtyLabels,
		createServiceCatalogItem, updateServiceCatalogItem, deleteServiceCatalogItem,
	} = mergedProps;

	const [activeTab, setActiveTab] = useState<PricelistStudioTab>("catalog");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
	const [isServicePricelistModalOpen, setIsServicePricelistModalOpen] = useState(false);
	const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>({});
	const [isCodesMenuOpen, setIsCodesMenuOpen] = useState(false);
	const codesMenuRef = useRef<HTMLDivElement | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset pagination when searching
	useEffect(() => {
		setCategoryLimits({});
	}, [searchQuery, selectedCategoryFilter]);

	useEffect(() => {
		if (!isCodesMenuOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (codesMenuRef.current && !codesMenuRef.current.contains(e.target as Node)) {
				setIsCodesMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isCodesMenuOpen]);

	const [editServiceId, setEditServiceId] = useState<string | null>(null);
	const [editServiceForm, setEditServiceForm] = useState<ServiceEditFormData>({
		...NEW_SERVICE_TEMPLATE, catalogCode: "", standardCode: "",
	});
	const [priceRubInput, setPriceRubInput] = useState("");
	const [priceProblem, setPriceProblem] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
	const [isSeedingBaseline, setIsSeedingBaseline] = useState(false);

	// Native Pricelist Scanner Dropzone & Diff Modal State
	const [isNativeScannerDropzoneOpen, setIsNativeScannerDropzoneOpen] = useState(false);
	const [scannerMode, setScannerMode] = useState<"file" | "text">("file");
	const [scannerDragOver, setScannerDragOver] = useState(false);
	const [scannerFile, setScannerFile] = useState<ScannerFileState | null>(null);
	const [scannerText, setScannerText] = useState("");
	const [scannerCollisionStrategy, setScannerCollisionStrategy] = useState<PricelistCollisionStrategy>("update_existing");
	const [isScanningPricelist, setIsScanningPricelist] = useState(false);
	const [scannerError, setScannerError] = useState<string | null>(null);
	const [isMappingDiffOpen, setIsMappingDiffOpen] = useState(false);
	const [mappingDiffItems, setMappingDiffItems] = useState<IngestedMappingItem[]>([]);
	const [isCommittingImport, setIsCommittingImport] = useState(false);
	const nativeFileInputRef = useRef<HTMLInputElement | null>(null);

	const typedServiceCatalog = dashboard?.serviceCatalog || [];
	const accessHeaders = (mergedProps as { auth?: { settingsAccessHeaders?: SettingsAccessHeaders } }).auth?.settingsAccessHeaders;

	const filteredCatalog = useMemo(() => {
		let items = [...typedServiceCatalog];
		if (selectedCategoryFilter !== "all") {
			items = items.filter((s) => (s.category || "other") === selectedCategoryFilter);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			const cleanQ = q.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, "");
			items = items.filter((s) => {
				const titleMatch = (s.title || s.name || "").toLowerCase().includes(q);
				const codeMatch = s.code?.toLowerCase().includes(q);
				const cleanCodeMatch = cleanQ.length >= 2 && (s.code || "").replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, "").toLowerCase().includes(cleanQ);
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
		const basePriceRub = normalizeRubAmountInput(priceRubInput);
		if (basePriceRub === null) {
			setPriceProblem(priceRubInput.trim() ? "Цена непонятна. Впишите сумму цифрами, копейки после запятой: 1500 или 1500,50." : "Укажите цену услуги: например 1500 или 1500,50.");
			return;
		}
		setPriceProblem(null);
		setIsSaving(true);
		try {
			const effectiveHeaders = {
				"Content-Type": "application/json",
				...staffMutationHeaders((accessHeaders as SettingsAccessHeaders | undefined) ?? (mergedProps.accessHeaders as SettingsAccessHeaders | undefined) ?? (appLogic?.accessHeaders as SettingsAccessHeaders | undefined)),
			};
			const statutoryCode = editServiceForm.standardCode || editServiceForm.catalogCode || editServiceForm.order804nCode || editServiceForm.code || null;
			const servicePayload = {
				...editServiceForm, basePriceRub,
				materialsCostRub: Number(editServiceForm.materialsCostRub) || 0,
				order804nCode: statutoryCode, catalogCode: statutoryCode, standardCode: statutoryCode,
			};

			if (editServiceId === "new") {
				if (typeof createServiceCatalogItem === "function") {
					await createServiceCatalogItem(servicePayload);
				} else {
					const res = await fetch("/api/settings/catalog", { method: "POST", headers: effectiveHeaders, body: JSON.stringify(servicePayload) });
					if (!res.ok) {
						const errJson = await res.json().catch(() => ({}));
						throw new Error(errJson.message || `Ошибка сервера ${res.status}`);
					}
				}
			} else {
				if (typeof updateServiceCatalogItem === "function") {
					await updateServiceCatalogItem(editServiceId, servicePayload);
				} else {
					const res = await fetch(`/api/settings/catalog/${editServiceId}`, { method: "PUT", headers: effectiveHeaders, body: JSON.stringify(servicePayload) });
					if (!res.ok) {
						const errJson = await res.json().catch(() => ({}));
						throw new Error(errJson.message || `Ошибка сервера ${res.status}`);
					}
				}
			}

			if (typeof mergedProps.refreshDashboard === "function") await mergedProps.refreshDashboard();
			else if (typeof appLogic?.refreshDashboard === "function") await appLogic.refreshDashboard();
			else if (typeof appLogic?.loadDashboard === "function") await appLogic.loadDashboard();

			showToast(editServiceId === "new" ? "Услуга добавлена в прейскурант" : "Услуга обновлена", "success");
			setEditServiceId(null);
			// biome-ignore lint/suspicious/noExplicitAny: error handling
		} catch (error: any) {
			const msg = error.message || "Ошибка сохранения";
			mergedProps.setError?.(msg);
			showToast(msg, "error");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteService = async (id: string) => {
		if (deletingServiceId === id) return;
		setDeletingServiceId(id);
		try {
			if (typeof deleteServiceCatalogItem === "function") {
				await deleteServiceCatalogItem(id);
			} else {
				const effectiveHeaders = {
					"Content-Type": "application/json",
					...staffMutationHeaders((accessHeaders as SettingsAccessHeaders | undefined) ?? (mergedProps.accessHeaders as SettingsAccessHeaders | undefined) ?? (appLogic?.accessHeaders as SettingsAccessHeaders | undefined)),
				};
				const res = await fetch(`/api/settings/catalog/${id}`, { method: "DELETE", headers: effectiveHeaders });
				if (!res.ok) {
					const errJson = await res.json().catch(() => ({}));
					throw new Error(errJson.message || `Ошибка сервера ${res.status}`);
				}
			}

			if (typeof mergedProps.refreshDashboard === "function") await mergedProps.refreshDashboard();
			else if (typeof appLogic?.refreshDashboard === "function") await appLogic.refreshDashboard();
			else if (typeof appLogic?.loadDashboard === "function") await appLogic.loadDashboard();

			showToast("Услуга отключена в прейскуранте", "success");
			// biome-ignore lint/suspicious/noExplicitAny: error handling
		} catch (error: any) {
			const msg = error.message || "Ошибка удаления";
			mergedProps.setError?.(msg);
			showToast(msg, "error");
		} finally {
			setDeletingServiceId(null);
		}
	};

	const modalInitialItems: readonly ServicePricelistItem[] = useMemo(() => buildModalInitialItems(typedServiceCatalog), [typedServiceCatalog]);

	const handleSaveCatalog = async (items: readonly ServicePricelistItem[]) => {
		await syncPricelistItemsToCatalog({
			items, existingServices: (dashboard?.serviceCatalog ?? []) as ServiceCatalogItem[],
			createServiceCatalogItem, updateServiceCatalogItem,
		});
		if (typeof mergedProps.refreshDashboard === "function") await mergedProps.refreshDashboard();
		else if (typeof appLogic?.refreshDashboard === "function") await appLogic.refreshDashboard();
	};

	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const handleExportCsv = () => exportCatalogToCsvDownload(typedServiceCatalog);
	const handlePrintPricelist = () => printPricelistA4(dashboard?.clinicSettings, modalInitialItems);

	const handleImportCsvFile = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const text = await file.text();
			const count = await parseAndImportCsvText(text, handleSaveCatalog);
			showToast(`Импортировано ${count} услуг из CSV`, "success");
			if (typeof mergedProps.refreshDashboard === "function") await mergedProps.refreshDashboard();
			else if (typeof appLogic?.refreshDashboard === "function") await appLogic.refreshDashboard();
		} catch (err) {
			showToast(`Ошибка импорта CSV: ${err instanceof Error ? err.message : String(err)}`, "error");
		} finally {
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const handleSeedStandardCatalog = async (replace = false) => {
		if (isSeedingBaseline) return;
		setIsSeedingBaseline(true);
		try {
			let seededCount = 0;
			let apiSucceeded = false;
			try {
				const headers = staffMutationHeaders((mergedProps.accessHeaders as SettingsAccessHeaders | undefined) ?? (appLogic?.accessHeaders as SettingsAccessHeaders | undefined));
				let response = await fetch("/api/pricelist/seed-standard-catalog", {
					method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ replace }),
				});
				if (!response.ok && response.status === 404) {
					response = await fetch("/api/pricelist/seed-baseline-804n", {
						method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ replace }),
					});
				}
				if (response.ok) {
					const data = await response.json();
					seededCount = data.createdCount ?? 30;
					apiSucceeded = true;
				}
			} catch (fetchErr) {
				console.warn("[pricelist] fetch /api/pricelist/seed fallback to client loop:", fetchErr);
			}

			if (!apiSucceeded) {
				await handleSaveCatalog(BASELINE_804N_PRICELIST_SERVICES);
				seededCount = BASELINE_804N_PRICELIST_SERVICES.length;
			}

			if (typeof mergedProps.refreshDashboard === "function") await mergedProps.refreshDashboard();
			else if (typeof appLogic?.refreshDashboard === "function") await appLogic.refreshDashboard();
			else if (typeof appLogic?.loadClinicSettings === "function") await appLogic.loadClinicSettings();

			showToast(seededCount > 0 ? `Базовый прейскурант услуг успешно заполнен (${seededCount} услуг)` : "Базовый прейскурант услуг актуален (услуги уже присутствуют в каталоге)", "success");
			setIsCodesMenuOpen(false);
		} catch (error: any) {
			console.error("[pricelist] Ошибка наполнения базового прейскуранта услуг:", error);
			showToast(error?.message || "Не удалось наполнить базовый прейскурант услуг", "error");
		} finally {
			setIsSeedingBaseline(false);
		}
	};

	const existingCatalogReferences: readonly ExistingCatalogReference[] = useMemo(() => buildExistingCatalogReferences(typedServiceCatalog), [typedServiceCatalog]);

	const runScannerRequest = async (opts: { fileBase64?: string; filename?: string; rawContent?: string }) => {
		setIsScanningPricelist(true);
		setScannerError(null);
		try {
			const headers = staffMutationHeaders((mergedProps.accessHeaders as SettingsAccessHeaders | undefined) ?? (appLogic?.accessHeaders as SettingsAccessHeaders | undefined) ?? accessHeaders);
			const payload = {
				commit: false, collisionStrategy: scannerCollisionStrategy, filename: opts.filename || "pricelist.csv",
				...(opts.fileBase64 ? { fileBase64: opts.fileBase64 } : {}),
				...(opts.rawContent ? { rawContent: opts.rawContent } : {}),
			};
			const res = await fetch("/api/pricelist/scan-and-import", {
				method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.message || `Ошибка сканирования прейскуранта (HTTP ${res.status})`);
			}
			const data = await res.json();
			const itemsList = data.scanResult?.items || data.items;
			if (itemsList && itemsList.length > 0) {
				const diffItems = mapScanItemsToDiffItems(itemsList);
				if (diffItems.length === 0) {
					showToast("В файле не найдено строк с услугами или ценами", "warning");
					return;
				}
				setMappingDiffItems(diffItems);
				setIsMappingDiffOpen(true);
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Сбой сканирования прейскуранта";
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
			setScannerFile({ name: file.name, base64, size: file.size });
			await runScannerRequest({ fileBase64: base64, filename: file.name });
		};
		reader.readAsDataURL(file);
	};

	const handleCommitPricelistDiff = async (approvedItems: readonly IngestedMappingItem[]) => {
		setIsCommittingImport(true);
		setScannerError(null);
		try {
			const headers = staffMutationHeaders((mergedProps.accessHeaders as SettingsAccessHeaders | undefined) ?? (appLogic?.accessHeaders as SettingsAccessHeaders | undefined) ?? accessHeaders);
			const payload = {
				commit: true, collisionStrategy: scannerCollisionStrategy,
				approvedItems: approvedItems.map((it) => ({
					cleanedTitle: it.cleanedTitle, code: it.code804n ? undefined : it.cleanedTitle,
					code804n: it.code804n, standardCode: it.code804n, catalogCode: it.code804n,
					category: it.category, specialty: it.specialty, priceRub: it.priceRub,
					durationMinutes: 30, suggestedAction: it.suggestedAction,
					matchedExistingServiceId: it.matchedExistingServiceId, isApproved: true,
				})),
				filename: scannerFile?.name || "pricelist.csv",
			};
			const res = await fetch("/api/pricelist/scan-and-import", {
				method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.message || `Ошибка сохранения прейскуранта (HTTP ${res.status})`);
			}
			const data = await res.json();
			const count = data.committedCount ?? approvedItems.length;
			showToast(`Прейскурант успешно сохранён: ${count} услуг в каталоге клиники`, "success");
			setIsMappingDiffOpen(false);
			setIsNativeScannerDropzoneOpen(false);
			setScannerFile(null);
			setScannerText("");

			if (typeof mergedProps.refreshDashboard === "function") await mergedProps.refreshDashboard();
			else if (typeof appLogic?.refreshDashboard === "function") await appLogic.refreshDashboard();
			else if (typeof appLogic?.loadClinicSettings === "function") await appLogic.loadClinicSettings();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось сохранить прейскурант";
			setScannerError(msg);
			showToast(msg, "error");
		} finally {
			setIsCommittingImport(false);
		}
	};

	const handleDirectFlatImport = async (opts: { fileBase64?: string; filename?: string; rawContent?: string }) => {
		setIsCommittingImport(true);
		setScannerError(null);
		try {
			const headers = staffMutationHeaders((mergedProps.accessHeaders as SettingsAccessHeaders | undefined) ?? (appLogic?.accessHeaders as SettingsAccessHeaders | undefined) ?? accessHeaders);
			const payload = {
				commit: true, collisionStrategy: scannerCollisionStrategy, filename: opts.filename || "pricelist.csv",
				...(opts.fileBase64 ? { fileBase64: opts.fileBase64 } : {}),
				...(opts.rawContent ? { rawContent: opts.rawContent } : {}),
			};
			const res = await fetch("/api/pricelist/scan-and-import", {
				method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.message || `Ошибка импорта прейскуранта (HTTP ${res.status})`);
			}
			const data = await res.json();
			const count = data.committedCount ?? data.scanResult?.items?.length ?? 0;
			showToast(`Прейскурант успешно импортирован: ${count} услуг в каталоге клиники`, "success");
			setIsNativeScannerDropzoneOpen(false);
			setScannerFile(null);
			setScannerText("");

			if (typeof mergedProps.refreshDashboard === "function") await mergedProps.refreshDashboard();
			else if (typeof appLogic?.refreshDashboard === "function") await appLogic.refreshDashboard();
			else if (typeof appLogic?.loadClinicSettings === "function") await appLogic.loadClinicSettings();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось импортировать прейскурант";
			setScannerError(msg);
			showToast(msg, "error");
		} finally {
			setIsCommittingImport(false);
		}
	};

	const openNewServiceModal = () => {
		setEditServiceForm({
			...NEW_SERVICE_TEMPLATE, catalogCode: "", standardCode: "", order804nCode: "", materialsCostRub: 0,
		});
		setPriceRubInput("");
		setPriceProblem(null);
		setEditServiceId("new");
	};

	const openEditServiceModal = (item: any) => {
		const statutoryCode = item.standardCode || item.catalogCode || item.order804nCode || item.code || "";
		setEditServiceForm({
			title: item.title, code: item.code || "", catalogCode: statutoryCode,
			standardCode: statutoryCode, order804nCode: statutoryCode, category: item.category,
			specialty: item.specialty, basePriceRub: item.basePriceRub ?? item.priceRub ?? 0,
			materialsCostRub: item.materialsCostRub ?? 0, durationMinutes: item.durationMinutes || 30,
			taxDeductible: item.taxDeductible, vatRate: item.vatRate || "vat_exempt",
			active: item.isActive !== false && item.active !== false,
		});
		setPriceRubInput(rubToPriceInput(item.basePriceRub ?? item.priceRub ?? 0));
		setPriceProblem(null);
		setEditServiceId(item.id);
	};

	const resetFilters = () => {
		setSearchQuery("");
		setSelectedCategoryFilter("all");
	};

	const handleImportSuccess = async () => {
		if (typeof mergedProps.refreshDashboard === "function") await mergedProps.refreshDashboard();
		else if (typeof appLogic?.refreshDashboard === "function") await appLogic.refreshDashboard();
		else if (typeof appLogic?.loadClinicSettings === "function") await appLogic.loadClinicSettings();
	};

	return {
		mergedProps, appLogic, dashboard, accessHeaders,
		serviceCategoryLabels, specialtyLabels, pricelistSourceKindLabels, pricelistSourceKind,
		setPricelistSourceKind, clearPricelistImage, setPricelistAnalysis,
		pricelistRecognitionServiceGroups, pricelistRecognitionBrandGroups,
		pricelistText, setPricelistText, pricelistImageName, attachPricelistImage,
		usePricelistAi, setUsePricelistAi, analyzePricelist, isPricelistAnalyzing,
		pricelistImageBase64, pricelistAnalysis, pricelistParserModeLabels,
		// State
		activeTab, setActiveTab, searchQuery, setSearchQuery,
		selectedCategoryFilter, setSelectedCategoryFilter,
		isServicePricelistModalOpen, setIsServicePricelistModalOpen,
		categoryLimits, setCategoryLimits,
		isCodesMenuOpen, setIsCodesMenuOpen, codesMenuRef,
		is804nCodesMenuOpen: isCodesMenuOpen, setIs804nCodesMenuOpen: setIsCodesMenuOpen, codes804nMenuRef: codesMenuRef,
		editServiceId, setEditServiceId, editServiceForm, setEditServiceForm,
		priceRubInput, setPriceRubInput, priceProblem, setPriceProblem,
		isSaving, deletingServiceId, isSeedingBaseline,
		isNativeScannerDropzoneOpen, setIsNativeScannerDropzoneOpen,
		scannerMode, setScannerMode, scannerDragOver, setScannerDragOver,
		scannerFile, setScannerFile, scannerText, setScannerText,
		scannerCollisionStrategy, setScannerCollisionStrategy,
		isScanningPricelist, scannerError,
		isMappingDiffOpen, setIsMappingDiffOpen,
		mappingDiffItems, setMappingDiffItems,
		isCommittingImport, nativeFileInputRef, fileInputRef,
		// Computed
		typedServiceCatalog, filteredCatalog, groupedCatalog,
		modalInitialItems, existingCatalogReferences,
		// Handlers
		handleSaveService, handleDeleteService, handleSaveCatalog,
		handleExportCsv, handlePrintPricelist, handleImportCsvFile,
		handleSeedStandardCatalog, handleSeedBaseline804n: handleSeedStandardCatalog,
		runScannerRequest, handleProcessScannerFile, handleCommitPricelistDiff,
		handleDirectFlatImport, openNewServiceModal, openEditServiceModal,
		resetFilters, handleImportSuccess,
	};
}
