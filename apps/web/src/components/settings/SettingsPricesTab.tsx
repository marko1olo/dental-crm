import type {
	DentalSpecialty,
	PricelistCollisionStrategy,
	ServiceCatalogItem,
	ServiceCategory,
} from "@dental/shared";
import {
	AlertTriangle,
	Bot,
	CheckCircle2,
	ChevronDown,
	Database,
	Download,
	Edit3,
	FileSpreadsheet,
	FolderTree,
	Plus,
	ReceiptText,
	RefreshCw,
	Search,
	ShieldCheck,
	Sparkles,
	Tag,
	Trash2,
	Upload,
	UploadCloud,
	X,
} from "lucide-react";
import "./SettingsPricesTab.css";
import {
	detectCategoryFrom804nCode,
	exportPricelistToCsv,
	importPricelistFromCsv,
	rublesToKopecks,
} from "../catalog/pricelist/servicePricelistEngine";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { money } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { normalizeRubAmountInput } from "../../rubAmountInput";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { type SettingsAccessHeaders, staffMutationHeaders } from "./staffMutationRequest";
import { ServicePricelistManagerModal } from "../catalog/pricelist/ServicePricelistManagerModal";
import {
	type ExistingCatalogReference,
	type IngestedMappingItem,
	PriceListMappingDiffView,
} from "../pricing/PriceListMappingDiffView";
import {
	BASELINE_804N_PRICELIST_SERVICES,
	STATUTORY_ORDER_804N_PRESETS,
	STATUTORY_VAT_EXEMPTION_NOTE,
	type DoctorSpecialty,
	type Order804nCategory,
	type ServicePricelistItem,
} from "../catalog/pricelist/servicePricelistPresets";
import { showToast } from "../GlobalToast";
import { sliceDomList } from "../../utils/domVirtualizationHelper";
import { SettingsPricesAiImportSection } from "./SettingsPricesAiImportSection";
import { SettingsPricesCategoryGroup } from "./SettingsPricesCategoryGroup";
import { ServiceFormMetaFields } from "./ServiceFormMetaFields";
import { syncPricelistItemsToCatalog } from "./catalogSyncHelper";
import {
	CATEGORY_TABS,
	NEW_SERVICE_TEMPLATE,
	QUICK_804N_CHIPS,
	rubToPriceInput,
} from "./pricelistEditorHelpers";

export function SettingsPricesTab() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
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

	const [activeTab, setActiveTab] = useState<"catalog" | "ai_import">(
		"catalog",
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
	const [isServicePricelistModalOpen, setIsServicePricelistModalOpen] =
		useState(false);
	const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>({});
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
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [is804nCodesMenuOpen]);

	const [editServiceId, setEditServiceId] = useState<string | null>(null);
	const [editServiceForm, setEditServiceForm] = useState(NEW_SERVICE_TEMPLATE);
	const [priceRubInput, setPriceRubInput] = useState("");
	const [priceProblem, setPriceProblem] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [deletingServiceId, setDeletingServiceId] = useState<string | null>(
		null,
	);
	const [isSeedingBaseline, setIsSeedingBaseline] = useState(false);

	// Native 804n Pricelist Scanner Dropzone & Diff Modal State
	const [isNativeScannerDropzoneOpen, setIsNativeScannerDropzoneOpen] = useState(false);
	const [scannerMode, setScannerMode] = useState<"file" | "text">("file");
	const [scannerDragOver, setScannerDragOver] = useState(false);
	const [scannerFile, setScannerFile] = useState<{
		name: string;
		base64: string;
		size: number;
	} | null>(null);
	const [scannerText, setScannerText] = useState("");
	const [scannerCollisionStrategy, setScannerCollisionStrategy] =
		useState<PricelistCollisionStrategy>("update_existing");
	const [isScanningPricelist, setIsScanningPricelist] = useState(false);
	const [scannerError, setScannerError] = useState<string | null>(null);
	const [isMappingDiffOpen, setIsMappingDiffOpen] = useState(false);
	const [mappingDiffItems, setMappingDiffItems] = useState<IngestedMappingItem[]>([]);
	const [isCommittingImport, setIsCommittingImport] = useState(false);
	const nativeFileInputRef = useRef<HTMLInputElement | null>(null);

	const typedServiceCatalog = dashboard?.serviceCatalog || [];

	const accessHeaders = (
		mergedProps as { auth?: { settingsAccessHeaders?: SettingsAccessHeaders } }
	).auth?.settingsAccessHeaders;

	const filteredCatalog = useMemo(() => {
		let items = [...typedServiceCatalog];
		if (selectedCategoryFilter !== "all") {
			items = items.filter((s) => (s.category || "other") === selectedCategoryFilter);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			const cleanQ = q.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, "");
			items = items.filter((s) => {
				const titleMatch = s.title.toLowerCase().includes(q);
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
		return items.sort((a, b) => a.title.localeCompare(b.title));
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
			const basePriceRub = Number.isFinite(rawPrice) ? Math.round(rawPrice * 100) / 100 : 0;
			const code804n = (s.code || "").trim() || "A16.07.002";
			const category = (s.category as Order804nCategory) || detectCategoryFrom804nCode(code804n, s.title);
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
			existingServices: (dashboard?.serviceCatalog ?? []) as ServiceCatalogItem[],
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
				id: s.id, code804n: s.code || "", commercialTitle: s.title, statutoryTitle804n: s.title,
				// biome-ignore lint/suspicious/noExplicitAny: category cast
				category: (s.category || "therapy") as any,
				// biome-ignore lint/suspicious/noExplicitAny: specialty cast
				basePriceRub: (() => {
					// biome-ignore lint/suspicious/noExplicitAny: fallback field extraction
					const raw = s.basePriceRub ?? (s as any).priceRub ?? ((s as any).priceKopecks ? (s as any).priceKopecks / 100 : 0);
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
		const blob = new Blob([exportPricelistToCsv(items)], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `dente_pricelist_${new Date().toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		showToast(`Прайс-лист (${items.length} услуг) экспортирован в CSV`, "success");
	};

	const handleImportCsvFile = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const text = await file.text();
			const result = importPricelistFromCsv(text);
			if (result.invalidRows.length > 0 && result.validItems.length === 0) {
				showToast(`Ошибка импорта CSV: ${result.invalidRows[0]?.error || "Неверный формат"}`, "error");
				return;
			}
			await handleSaveCatalog(result.validItems);
			showToast(`Импортировано ${result.validItems.length} услуг из CSV`, "success");
			if (typeof mergedProps.refreshDashboard === "function") {
				await mergedProps.refreshDashboard();
			} else if (typeof appLogic?.refreshDashboard === "function") {
				await appLogic.refreshDashboard();
			}
		} catch (err) {
			showToast(`Ошибка чтения CSV: ${err instanceof Error ? err.message : String(err)}`, "error");
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
				console.warn("[pricelist] fetch /api/pricelist/seed-baseline-804n fallback to client loop:", fetchErr);
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
			console.error("[pricelist] Ошибка наполнения базового прейскуранта услуг:", error);
			showToast(error?.message || "Не удалось наполнить базовый прейскурант услуг", "error");
		} finally {
			setIsSeedingBaseline(false);
		}
	};

	const existingCatalogReferences: readonly ExistingCatalogReference[] = useMemo(() => {
		return typedServiceCatalog.map((s: ServiceCatalogItem) => {
			const rawPrice =
				s.basePriceRub ??
				(s as unknown as { priceRub?: number }).priceRub ??
				((s as unknown as { priceKopecks?: number }).priceKopecks
					? (s as unknown as { priceKopecks: number }).priceKopecks / 100
					: 0);
			const basePriceRub = Number.isFinite(rawPrice) ? Math.round(rawPrice * 100) / 100 : 0;
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
					errData.message || `Ошибка сканирования прейскуранта (HTTP ${res.status})`,
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
							it.confidenceKind ?? (it.code804n ? "exact_code" : "medium_keyword"),
						suggestedAction: it.suggestedAction || "create_new",
						matchedExistingServiceId: it.matchedExistingServiceId,
						matchedExistingTitle: it.matchedExistingTitle,
						matchedExistingPriceRub: it.matchedExistingPriceRub,
						isApproved: it.isApproved ?? (it.validationStatus !== "error"),
					}),
				);

				if (diffItems.length === 0) {
					showToast("В файле не найдено строк с услугами или ценами", "warning");
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

	return (
		<div className="pricelist-studio-container animate-fade-in">
			<div className="pricelist-tabs-header">
				<button
					type="button"
					className={`pricelist-tab-btn ${activeTab === "catalog" ? "active" : ""}`}
					onClick={() => setActiveTab("catalog")}
				>
					<FolderTree size={18} />
					<span>Каталог клиники</span>
				</button>
				<button
					type="button"
					className={`pricelist-tab-btn ${activeTab === "ai_import" ? "active" : ""}`}
					onClick={() => setActiveTab("ai_import")}
				>
					<FileSpreadsheet size={18} />
					<span>Импорт прайса (Excel / CSV / ИИ)</span>
				</button>
			</div>

			{activeTab === "catalog" && (
				<section className="pricelist-section-card">
					{/* Category Quick Filter Strip */}
					<div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none border-b border-[var(--line)]">
						{CATEGORY_TABS.map((cat) => (
							<button
								key={cat.id}
								type="button"
								onClick={() => setSelectedCategoryFilter(cat.id)}
								className="min-h-[32px] sm:h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap shrink-0"
								style={
									selectedCategoryFilter === cat.id
										? { background: "var(--teal)", color: "#ffffff", fontWeight: 700 }
										: { background: "var(--paper-soft)", color: "var(--ink)", border: "1px solid var(--line)" }
								}
							>
								{cat.label}
							</button>
						))}
					</div>

					{/* STRICTLY 1 COMPACT MONOLITHIC 36px TOOLBAR ROW (Mandates 8c, 8d, 8p) */}
					<div className="pricelist-monolithic-toolbar min-h-[44px] sm:min-h-[36px] sm:h-9 sm:max-h-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-1 border border-[var(--line)] bg-[var(--paper)] rounded-xl shadow-xs mb-3 overflow-visible sm:overflow-hidden shrink-0 select-none">
						{/* Left: Search input */}
						<div className="pricelist-search-wrapper flex items-center min-w-0 w-full sm:w-auto flex-1 max-w-full sm:max-w-xs relative">
							<Search size={14} className="absolute left-2.5 text-[var(--muted)] shrink-0 pointer-events-none" />
							<input
								type="text"
								placeholder="Поиск по услугам или коду..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full min-h-[32px] h-7 sm:h-8 pl-8 pr-9 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--teal)] transition-all"
								style={{ paddingRight: "36px" }}
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="absolute right-2 p-0.5 rounded text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
									title="Очистить поиск"
									aria-label="Очистить поиск"
								>
									<X size={12} />
								</button>
							)}
						</div>

						{/* Right Actions & 804n Menu Group (Horizontally scrollable on mobile) */}
						<div className="flex items-center gap-1.5 shrink-0 overflow-x-auto sm:overflow-visible pb-0.5 sm:pb-0 scrollbar-none w-full sm:w-auto ml-auto sm:ml-0">
							{/* Statutory 804n Quick Codes Dropdown Menu */}
							<div className="relative inline-flex items-center shrink-0" ref={codes804nMenuRef}>
								<button
									type="button"
									onClick={() => setIs804nCodesMenuOpen((prev) => !prev)}
									className={`min-h-[32px] h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
										is804nCodesMenuOpen || (searchQuery && searchQuery.startsWith("A"))
											? "bg-[var(--teal-soft)] text-[var(--teal-dark)] border-[var(--teal)] font-bold"
											: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)]"
									}`}
									title="Выбрать типовую услугу из официального справочника"
									aria-expanded={is804nCodesMenuOpen}
								>
									<Tag size={13} className="text-[var(--teal)] shrink-0" />
									<span className="hidden sm:inline">Справочник услуг</span>
									<span className="sm:hidden">Услуги</span>
									<ChevronDown size={11} className={`shrink-0 transition-transform ${is804nCodesMenuOpen ? "rotate-180" : ""}`} />
								</button>

								{is804nCodesMenuOpen && (
									<div
										className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 z-50 flex flex-col gap-1 p-2 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl min-w-[240px] max-w-[340px] animate-in fade-in zoom-in-95 duration-100 text-xs"
										role="menu"
									>
										<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] mb-1">
											Официальный справочник услуг
										</div>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
											{QUICK_804N_CHIPS.map((chip) => (
												<button
													key={chip.code}
													type="button"
													onClick={() => {
														setSearchQuery(chip.code);
														setIs804nCodesMenuOpen(false);
													}}
													className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer flex items-center justify-between ${
														searchQuery === chip.code
															? "bg-[var(--teal)] text-white font-bold"
															: "hover:bg-[var(--teal-soft)] text-[var(--ink)]"
													}`}
													role="menuitem"
												>
													<span>{chip.label}</span>
												</button>
											))}
										</div>
										<div className="mt-1.5 pt-1.5 border-t border-[var(--line)]">
											<button
												type="button"
												data-testid="pricelist-seed-baseline-804n-btn"
												disabled={isSeedingBaseline}
												onClick={() => handleSeedBaseline804n(false)}
												className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--teal-soft)] hover:bg-[var(--teal)] hover:text-white text-[var(--teal-dark)] transition-all cursor-pointer flex items-center gap-2 group disabled:opacity-50"
											>
												<Sparkles size={14} className="shrink-0 text-[var(--teal)] group-hover:text-white" />
												<div className="flex flex-col min-w-0">
													<span className="font-bold truncate">
														{isSeedingBaseline ? "Наполнение каталога..." : "Заполнить базовый каталог (30 услуг)"}
													</span>
													<span className="text-[10px] opacity-80 truncate">Добавить недостающие типовые услуги с ценами</span>
												</div>
											</button>
										</div>
										{searchQuery && (
											<button
												type="button"
												onClick={() => {
													setSearchQuery("");
													setIs804nCodesMenuOpen(false);
												}}
												className="w-full text-center px-2 py-1.5 mt-1 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors border-t border-[var(--line)]"
											>
												Сбросить фильтр поиска
											</button>
										)}
									</div>
								)}
							</div>
						</div>

						{/* Right: Actions */}
						<div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
							<button
								type="button"
								className="secondary-button min-h-[32px] h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-all inline-flex items-center gap-1 cursor-pointer shrink-0"
								onClick={handleExportCsv}
								data-testid="export-pricelist-csv-btn"
								title="Экспортировать прайс-лист в Excel CSV (RFC 4180)"
							>
								<Download size={13} className="text-[var(--teal)] shrink-0" />
								<span className="hidden lg:inline">Экспорт CSV</span>
								<span className="lg:hidden">CSV</span>
							</button>
							<button
								type="button"
								className={`secondary-button min-h-[32px] h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-semibold border transition-all inline-flex items-center gap-1.5 cursor-pointer shrink-0 ${
									isNativeScannerDropzoneOpen
										? "bg-[var(--teal-soft)] text-[var(--teal-dark)] border-[var(--teal)] font-bold shadow-xs"
										: "border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)]"
								}`}
								onClick={() => setIsNativeScannerDropzoneOpen((prev) => !prev)}
								data-testid="btn-native-pricelist-import"
								title="Импорт прейскуранта клиники (Excel / CSV / Текст) со сканером кодов 804н"
							>
								<UploadCloud size={13} className="text-[var(--teal)] shrink-0" />
								<span className="hidden lg:inline">Импорт прейскуранта (Excel/CSV/Текст)</span>
								<span className="hidden sm:inline lg:hidden">Импорт прайса</span>
								<span className="sm:hidden">Импорт</span>
							</button>
							<button
								type="button"
								className="secondary-button min-h-[32px] h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-all inline-flex items-center gap-1 cursor-pointer shrink-0"
								onClick={() => setIsServicePricelistModalOpen(true)}
								data-testid="open-service-pricelist-modal-btn"
								title="Справочник услуг и прайс-лист клиники"
							>
								<ShieldCheck size={14} className="text-[var(--teal)] shrink-0" />
								<span className="hidden sm:inline">Прейскурант</span>
								<span className="sm:hidden">Прайс</span>
							</button>
							<button
								type="button"
								className="primary-button min-h-[32px] h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-xs font-bold bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white shadow-xs inline-flex items-center gap-1 cursor-pointer shrink-0"
								onClick={() => {
									setEditServiceForm(NEW_SERVICE_TEMPLATE);
									setPriceRubInput("");
									setPriceProblem(null);
									setEditServiceId("new");
								}}
							>
								<Plus size={15} className="shrink-0" />
								<span className="hidden sm:inline">Добавить услугу</span>
								<span className="sm:hidden">Услуга</span>
							</button>
						</div>
					</div>

					{/* Native 804n Pricelist Scanner Dropzone Banner */}
					{isNativeScannerDropzoneOpen && (
						<div
							className="p-3 sm:p-4 mb-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xs flex flex-col gap-3 animate-in fade-in duration-200 max-w-full overflow-hidden"
							data-testid="native-pricelist-dropzone-banner"
						>
							<div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
								<div className="flex items-center gap-2">
									<div className="w-7 h-7 rounded-lg bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center shrink-0">
										<Sparkles size={16} />
									</div>
									<div>
										<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] leading-snug">
											Импорт прейскуранта и сопоставление с кодами 804н
										</h4>
										<p className="text-[11px] text-[var(--muted)] leading-tight">
											Загрузите файл Excel (.xlsx, .xls), CSV или вставьте текст прейскуранта из буфера обмена.
										</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setIsNativeScannerDropzoneOpen(false)}
									className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer"
									title="Скрыть зону импорта"
								>
									<X size={15} />
								</button>
							</div>

							{/* Mode selector (File vs Text) & Collision Strategy */}
							<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between w-full">
								<div className="inline-flex p-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs shrink-0">
									<button
										type="button"
										onClick={() => setScannerMode("file")}
										className="px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer"
										style={
											scannerMode === "file"
												? { background: "var(--teal)", color: "#ffffff", fontWeight: 700 }
												: { background: "transparent", color: "var(--ink)" }
										}
									>
										Файл Excel / CSV
									</button>
									<button
										type="button"
										onClick={() => setScannerMode("text")}
										className="px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer"
										style={
											scannerMode === "text"
												? { background: "var(--teal)", color: "#ffffff", fontWeight: 700 }
												: { background: "transparent", color: "var(--ink)" }
										}
									>
										Вставка текста
									</button>
								</div>

								<div className="flex items-center gap-1.5 w-full sm:w-auto min-w-0">
									<span className="text-[11px] text-[var(--muted)] hidden sm:inline shrink-0">Стратегия:</span>
									<select
										value={scannerCollisionStrategy}
										onChange={(e) =>
											setScannerCollisionStrategy(
												e.target.value as PricelistCollisionStrategy,
											)
										}
										className="h-8 px-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] font-medium focus:outline-none focus:border-[var(--teal)] w-full sm:w-auto max-w-full sm:max-w-xs truncate cursor-pointer"
										title="Стратегия сопоставления с существующим прейскурантом"
									>
										<option value="update_existing">Обновить существующие и добавить новые</option>
										<option value="skip_duplicates">Пропускать дубликаты</option>
										<option value="create_new">Создавать как новые позиции</option>
									</select>
								</div>
							</div>

							{/* Dropzone area or Textarea */}
							{scannerMode === "file" ? (
								<div
									className={`pricelist-dropzone ${scannerDragOver ? "pricelist-dropzone-active" : ""}`}
									onDragOver={(e) => {
										e.preventDefault();
										setScannerDragOver(true);
									}}
									onDragLeave={(e) => {
										e.preventDefault();
										setScannerDragOver(false);
									}}
									onDrop={(e) => {
										e.preventDefault();
										setScannerDragOver(false);
										const file = e.dataTransfer.files[0];
										if (file) handleProcessScannerFile(file);
									}}
									onClick={() => nativeFileInputRef.current?.click()}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ")
											nativeFileInputRef.current?.click();
									}}
									style={{ minHeight: "120px", padding: "16px" }}
								>
									<input
										type="file"
										ref={nativeFileInputRef}
										accept=".xlsx,.xls,.ods,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
										className="hidden"
										onChange={(e) => {
											const file = e.target.files?.[0];
											if (file) handleProcessScannerFile(file);
										}}
									/>
									<div className="dropzone-placeholder">
										<UploadCloud size={30} className="text-[var(--teal)] mb-1" />
										<p style={{ fontWeight: 600, fontSize: "13px", margin: "2px 0" }}>
											Перетащите сюда файл прейскуранта или нажмите для выбора
										</p>
										<span style={{ fontSize: "11px", color: "var(--muted)" }}>
											Поддерживаются книги Excel (.xlsx, .xls) и файлы CSV (.csv)
										</span>
										{scannerFile && (
											<div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)]">
												<FileSpreadsheet size={14} className="text-[var(--teal)] shrink-0" />
												<span className="truncate max-w-xs">{scannerFile.name}</span>
												<span className="text-[10px] text-[var(--muted)]">
													({Math.round(scannerFile.size / 1024)} КБ)
												</span>
											</div>
										)}
									</div>
								</div>
							) : (
								<div className="flex flex-col gap-2">
									<textarea
										data-testid="native-pricelist-text-input"
										rows={4}
										value={scannerText}
										onChange={(e) => setScannerText(e.target.value)}
										placeholder="Вставьте сюда скопированный текст прейскуранта клиники (наименование, цена, код)..."
										className="w-full p-2.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] font-mono placeholder:font-sans focus:outline-none focus:border-[var(--teal)]"
									/>
									<div className="flex justify-end">
										<button
											type="button"
											disabled={isScanningPricelist || !scannerText.trim()}
											onClick={() => runScannerRequest({ rawContent: scannerText })}
											className="primary-button h-8 px-4 text-xs font-bold bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white rounded-lg shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
										>
											<Sparkles size={14} />
											<span>{isScanningPricelist ? "Сканирование..." : "Распознать и сопоставить с 804н"}</span>
										</button>
									</div>
								</div>
							)}

							{isScanningPricelist && (
								<div className="text-center py-2 flex items-center justify-center gap-2 text-xs text-[var(--teal)] font-semibold">
									<RefreshCw size={14} className="animate-spin" />
									<span>Идёт семантический анализ строк и подбор кодов 804н...</span>
								</div>
							)}

							{scannerError && (
								<div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 font-medium">
									<AlertTriangle size={14} className="shrink-0" />
									<span>{scannerError}</span>
								</div>
							)}
						</div>
					)}

					<div className="catalog-groups">
						{Object.entries(groupedCatalog).map(([category, items]) => (
							<SettingsPricesCategoryGroup
								key={category}
								category={category}
								items={items}
								categoryLimits={categoryLimits}
								setCategoryLimits={setCategoryLimits}
								serviceCategoryLabels={serviceCategoryLabels}
								specialtyLabels={specialtyLabels}
								deletingServiceId={deletingServiceId}
								onEditService={(item) => {
									setEditServiceForm({
										title: item.title,
										code: item.code || "",
										category: item.category,
										specialty: item.specialty,
										basePriceRub:
											item.basePriceRub ?? item.priceRub ?? 0,
										durationMinutes: item.durationMinutes || 30,
										taxDeductible: item.taxDeductible,
										vatRate: item.vatRate || "vat_exempt",
										active: item.isActive,
									});
									setPriceRubInput(
										rubToPriceInput(
											item.basePriceRub ?? item.priceRub ?? 0,
										),
									);
									setPriceProblem(null);
									setEditServiceId(item.id);
								}}
								onDeleteService={handleDeleteService}
							/>
						))}
						{Object.keys(groupedCatalog).length === 0 && (
							searchQuery.trim() || selectedCategoryFilter !== "all" ? (
								<div className="empty-catalog-state">
									<FolderTree size={48} color="var(--line-strong)" />
									<p>По фильтрам ничего не найдено</p>
									<small style={{ color: "var(--muted)", marginTop: "4px" }}>
										Проверьте критерии поиска или очистите фильтры.
									</small>
									<button
										type="button"
										onClick={() => {
											setSearchQuery("");
											setSelectedCategoryFilter("all");
										}}
										className="secondary-button min-h-[32px] px-3 py-1.5 text-xs font-medium rounded-lg mt-2 cursor-pointer"
									>
										Сбросить фильтры
									</button>
								</div>
							) : (
								<div className="empty-catalog-state p-6 max-w-lg mx-auto my-6 bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-sm text-center flex flex-col items-center gap-3">
									<div className="w-12 h-12 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center shrink-0">
										<Sparkles size={24} />
									</div>
									<div className="flex flex-col gap-1">
										<h4 className="text-base font-bold text-[var(--ink)]">
											Каталог услуг пуст
										</h4>
										<p className="text-xs text-[var(--muted)] leading-relaxed max-w-sm">
											Быстро наполните прейскурант клиники 30 основными стоматологическими услугами с рекомендованными ценами.
										</p>
									</div>
									<div className="flex flex-col sm:flex-row items-center gap-2 mt-2 w-full justify-center">
										<button
											type="button"
											data-testid="pricelist-seed-baseline-804n-btn"
											disabled={isSeedingBaseline}
											onClick={() => handleSeedBaseline804n(false)}
											className="primary-button min-h-[36px] w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
										>
											<Sparkles size={15} className="shrink-0" />
											<span>
												{isSeedingBaseline
													? "Наполнение каталога..."
													: "Заполнить базовый прейскурант (30 услуг)"}
											</span>
										</button>
									</div>
									<div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--muted)]">
										<span>или</span>
										<button
											type="button"
											onClick={() => {
												setEditServiceForm(NEW_SERVICE_TEMPLATE);
												setPriceRubInput("");
												setPriceProblem(null);
												setEditServiceId("new");
											}}
											className="text-[var(--teal)] hover:underline font-semibold cursor-pointer"
										>
											добавить услугу вручную
										</button>
										<span>•</span>
										<button
											type="button"
											onClick={() => setIsNativeScannerDropzoneOpen(true)}
											className="text-[var(--teal)] hover:underline font-semibold cursor-pointer"
										>
											Импорт прейскуранта (Excel / CSV / Текст)
										</button>
									</div>
								</div>
							)
						)}
					</div>
				</section>
			)}

			{activeTab === "ai_import" && (
				<SettingsPricesAiImportSection
					pricelistSourceKindLabels={pricelistSourceKindLabels}
					pricelistSourceKind={pricelistSourceKind}
					setPricelistSourceKind={setPricelistSourceKind}
					clearPricelistImage={clearPricelistImage}
					setPricelistAnalysis={setPricelistAnalysis}
					pricelistRecognitionServiceGroups={pricelistRecognitionServiceGroups}
					pricelistRecognitionBrandGroups={pricelistRecognitionBrandGroups}
					pricelistText={pricelistText}
					setPricelistText={setPricelistText}
					pricelistImageName={pricelistImageName}
					attachPricelistImage={attachPricelistImage}
					usePricelistAi={usePricelistAi}
					setUsePricelistAi={setUsePricelistAi}
					analyzePricelist={analyzePricelist}
					isPricelistAnalyzing={isPricelistAnalyzing}
					pricelistImageBase64={pricelistImageBase64}
					pricelistAnalysis={pricelistAnalysis}
					pricelistParserModeLabels={pricelistParserModeLabels}
					serviceCategoryLabels={serviceCategoryLabels}
					specialtyLabels={specialtyLabels}
					accessHeaders={accessHeaders}
					onImportSuccess={async () => {
						if (typeof mergedProps.refreshDashboard === "function") {
							await mergedProps.refreshDashboard();
						} else if (typeof appLogic?.refreshDashboard === "function") {
							await appLogic.refreshDashboard();
						} else if (typeof appLogic?.loadClinicSettings === "function") {
							await appLogic.loadClinicSettings();
						}
					}}
				/>
			)}

			{/* Modal for Edit/Create */}
			{editServiceId && (
				<div
					role="dialog"
					aria-modal="true"
					tabIndex={-1}
					className="premium-modal-overlay"
					onClick={(e) => {
						if (e.target === e.currentTarget) setEditServiceId(null);
					}}
					onKeyDown={(e) => {
						if (
							e.target === e.currentTarget &&
							(e.key === "Enter" || e.key === " ")
						) {
							setEditServiceId(null);
						}
					}}
				>
					<div className="premium-modal-content" style={{ maxWidth: "520px" }}>
						<div className="premium-modal-header">
							<div
								style={{ display: "flex", alignItems: "center", gap: "12px" }}
							>
								<ReceiptText size={24} color="var(--teal)" />
								<h3>
									{editServiceId === "new"
										? "Новая услуга"
										: "Редактировать услугу"}
								</h3>
							</div>
							<button
								type="button"
								className="premium-modal-close"
								onClick={() => setEditServiceId(null)}
							>
								<X size={20} />
							</button>
						</div>

						<form onSubmit={handleSaveService} className="premium-modal-body">
							<div className="staff-form-group full-width">
								<label htmlFor="service-title-input">Название услуги</label>
								<input
									id="service-title-input"
									type="text"
									value={editServiceForm.title}
									onChange={(e) =>
										setEditServiceForm({
											...editServiceForm,
											title: e.target.value,
										})
									}
									required
									placeholder="Например: Первичная консультация врача-терапевта"
								/>
							</div>

							<div className="staff-form-grid">
								<div className="staff-form-group">
									<label htmlFor="service-code-input">Код услуги (внутренний или официальный)</label>
									<input
										id="service-code-input"
										type="text"
										value={editServiceForm.code}
										onChange={(e) =>
											setEditServiceForm({
												...editServiceForm,
												code: e.target.value,
											})
										}
										placeholder="A16.07.002"
									/>
								</div>
								<div className="staff-form-group">
									<label htmlFor="service-price-input">Цена (₽)</label>
									<input
										id="service-price-input"
										type="text"
										inputMode="decimal"
										value={priceRubInput}
										onChange={(e) => {
											setPriceRubInput(e.target.value);
											setPriceProblem(null);
										}}
										placeholder="например 1500 или 1500,50"
										required
									/>
									{priceProblem && (
										<small
											style={{ color: "var(--danger-color)", marginTop: "4px" }}
										>
											{priceProblem}
										</small>
									)}
								</div>
							</div>

							<ServiceFormMetaFields
								editServiceForm={editServiceForm}
								setEditServiceForm={setEditServiceForm}
								serviceCategoryLabels={serviceCategoryLabels}
								specialtyLabels={specialtyLabels}
							/>

							<div className="premium-modal-footer">
								<button
									type="button"
									className="secondary-button"
									onClick={() => setEditServiceId(null)}
								>
									Отмена
								</button>
								<button
									type="submit"
									className="primary-button"
									disabled={isSaving}
									aria-busy={isSaving}
								>
									{isSaving ? "Сохранение..." : "Сохранить"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			<ServicePricelistManagerModal
				isOpen={isServicePricelistModalOpen}
				onClose={() => setIsServicePricelistModalOpen(false)}
				initialItems={modalInitialItems}
				onSaveCatalog={handleSaveCatalog}
				clinicName={dashboard?.clinicSettings?.name}
				clinicAddress={dashboard?.clinicSettings?.address}
				clinicPhone={dashboard?.clinicSettings?.phone}
				clinicLicense={dashboard?.clinicSettings?.license}
				chiefDoctorName={dashboard?.clinicSettings?.chiefDoctor}
			/>

			{/* Dual-Pane Mapping Diff Modal (Mandates 8c, 8d, 8e & 8p) */}
			{isMappingDiffOpen && (
				<div
					role="dialog"
					aria-modal="true"
					className="premium-modal-overlay"
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0, 0, 0, 0.65)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 9999,
						padding: "16px",
					}}
				>
					<div
						style={{
							background: "var(--paper)",
							borderRadius: "12px",
							width: "96vw",
							maxWidth: "1440px",
							height: "92vh",
							maxHeight: "920px",
							display: "flex",
							flexDirection: "column",
							overflow: "hidden",
							boxShadow: "0 24px 48px rgba(0,0,0,0.35)",
							border: "1px solid var(--line)",
						}}
					>
						<div
							style={{
								padding: "12px 20px",
								borderBottom: "1px solid var(--line)",
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								background: "var(--paper-strong)",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
								<Sparkles size={18} className="text-[var(--teal)]" />
								<h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--ink)" }}>
									Сопоставление строк прейскуранта с номенклатурой 804н
								</h3>
							</div>
							<button
								type="button"
								className="icon-button"
								onClick={() => setIsMappingDiffOpen(false)}
								title="Закрыть окно сопоставления"
							>
								<X size={18} />
							</button>
						</div>

						<div style={{ flex: 1, overflow: "hidden" }}>
							<PriceListMappingDiffView
								items={mappingDiffItems}
								onItemsChange={(updated) => setMappingDiffItems([...updated])}
								onApply={handleCommitPricelistDiff}
								onCancel={() => setIsMappingDiffOpen(false)}
								existingCatalog={existingCatalogReferences}
								isLoading={isCommittingImport}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
