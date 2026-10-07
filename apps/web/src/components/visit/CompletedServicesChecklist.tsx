import React from "react";
import {
	Check,
	ChevronDown,
	ChevronUp,
	Plus,
	Receipt,
	Search,
	X,
	Zap,
} from "lucide-react";
import { money } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { countLabel } from "../../lib/russianPlural";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import {
	type ChairsideExpressService,
	type FilteredCatalogService,
	PRICE_UNKNOWN_TEXT,
	calculateCompletedServicesSummary,
	filterServiceCatalog,
	formatCompletedServiceLine,
	parseCompletedServiceLine,
	planLineQuantity,
	planLineTotalRub,
	visitOwnedPlanItems,
} from "./completedServicesPlan";
import { realVisitFieldId } from "./visitIdentity";
import {
	CLINICAL_SERVICE_BUNDLES,
	type ClinicalServiceBundle,
} from "./clinicalServiceBundles";
import { ChairsideToothSelector } from "./ChairsideToothSelector";
import { ChairsideExpressGrid } from "./ChairsideExpressGrid";
import { CompletedServicesList } from "./CompletedServicesList";
import { ChairsideDiagnosisPackageCard } from "./ChairsideDiagnosisPackageCard";

export { CLINICAL_SERVICE_BUNDLES, type ClinicalServiceBundle } from "./clinicalServiceBundles";

// ОТМЕТКА ВЫПОЛНЕННЫХ УСЛУГ У КРЕСЛА:
// 1. Запись отметки в поле treatmentPlan («Выполнено: ...») гарантирует сохранение на сервере.
// 2. Готовый чек-лист услуг по Номенклатуре услуг по клику на диагноз зуба с ценами в целых копейках.
// 3. Экспресс-передача в кассу и в смету пациента без 10-минутного поиска по 300 позициям.
// 4. Точные цены без float-округлений.


// biome-ignore lint/suspicious/noExplicitAny: automated suppression
function serviceTitleOf(item: any): string {
	const title =
		typeof item?.snapshotServiceName === "string"
			? item.snapshotServiceName.trim()
			: "";
	if (title) return title;
	const serviceId =
		typeof item?.serviceId === "string" ? item.serviceId.trim() : "";
	return serviceId || "Услуга без названия";
}

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
function toothSuffixOf(item: any): string {
	const tooth =
		typeof item?.toothCode === "string" ? item.toothCode.trim() : "";
	return tooth ? ` (зуб ${tooth})` : "";
}

/**
 * Строка, которой отметка записывается в поле «План» карты приёма.
 * Формат фиксированный: по нему же отметка потом находится и снимается.
 */
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
function completedLineOf(item: any): string {
	const quantity = planLineQuantity(item);
	const quantityPart =
		quantity !== null && quantity > 1 ? `, ${quantity} шт.` : "";
	const total = planLineTotalRub(item);
	const priceText = total === null ? PRICE_UNKNOWN_TEXT : money(total);
	return `Выполнено: ${serviceTitleOf(item)}${toothSuffixOf(item)}${quantityPart} — ${priceText}`;
}



export interface CompletedServicesChecklistProps {
	/** Прямая передача прейскуранта клиники (удобно для модульных тестов и изоляции) */
	serviceCatalog?: unknown[];
}

export const CompletedServicesChecklist: React.FC<
	CompletedServicesChecklistProps
> = ({ serviceCatalog: overrideCatalog }) => {
	// biome-ignore lint/suspicious/noExplicitAny: dynamic context shape
	const context = useAppLogicContext() as any;
	const {
		visitNoteForm = {},
		updateVisitNoteField,
		dashboard,
		activeVisitPatient,
		selectedTooth: contextTooth,
		activeToothNumber,
	} = context || {};

	const visitPatientId = realVisitFieldId(dashboard?.activeVisit?.patientId);
	const visitId = realVisitFieldId(dashboard?.activeVisit?.id);
	const visitIsOpen = Boolean(visitPatientId && visitId);
	const visitPatientName =
		typeof activeVisitPatient?.fullName === "string" &&
		activeVisitPatient.fullName.trim()
			? activeVisitPatient.fullName.trim()
			: null;

	// Привязка к зубу у кресла (FDI 11..48, «Без зуба»)
	const storeActiveTooth = useVisitStore((s) => s.activeToothNumber);
	const initialTooth = contextTooth || storeActiveTooth || activeToothNumber || null;
	const [selectedTooth, setSelectedTooth] = React.useState<string | null>(
		initialTooth ? String(initialTooth) : null,
	);
	const [isToothGridOpen, setIsToothGridOpen] = React.useState<boolean>(false);

	// Синхронизация с активным зубом в сторе при клике на одонтограмму или вкладку зуба
	React.useEffect(() => {
		if (storeActiveTooth !== undefined && storeActiveTooth !== null) {
			setSelectedTooth(String(storeActiveTooth));
		}
	}, [storeActiveTooth]);

	// Быстрый инлайн-поиск по прейскуранту с дебаунсом 280 мс (Мандаты 8s, 8e)
	const [catalogSearch, setCatalogSearch] = React.useState<string>("");
	const [debouncedCatalogSearch, setDebouncedCatalogSearch] = React.useState<string>("");

	React.useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedCatalogSearch(catalogSearch);
		}, 280);
		return () => clearTimeout(timer);
	}, [catalogSearch]);

	const [bundlesExpanded, setBundlesExpanded] = React.useState<boolean>(false);

	const effectiveCatalog = overrideCatalog ?? dashboard?.serviceCatalog ?? [];
	const filteredCatalog = React.useMemo(
		() => filterServiceCatalog(effectiveCatalog, debouncedCatalogSearch, 20),
		[effectiveCatalog, debouncedCatalogSearch],
	);

	// Позиции предварительного плана открытого приёма
	const planItems = React.useMemo(
		() => visitOwnedPlanItems(dashboard?.treatmentPlanItems, visitPatientId),
		[dashboard?.treatmentPlanItems, visitPatientId],
	);

	const planText: string =
		typeof visitNoteForm?.treatmentPlan === "string"
			? visitNoteForm.treatmentPlan
			: "";
	const planLines = React.useMemo(
		() => (planText ?? "").split("\n").map((line) => (line ?? "").trim()),
		[planText],
	);

	// biome-ignore lint/suspicious/noExplicitAny: generic service item from plan
	const isMarked = (item: any) => planLines.includes(completedLineOf(item));

	// Полная сводка по всем выполненным услугам приёма (план + экспресс + поиск + пакеты)
	const summary = React.useMemo(
		() => calculateCompletedServicesSummary(planText),
		[planText],
	);

	// Все строки «Выполнено: ...», которые сейчас находятся в карте
	const completedLinesList = React.useMemo(() => {
		return planLines
			.filter((l) => l.toLowerCase().startsWith("выполнено:"))
			.map((l) => parseCompletedServiceLine(l))
			.filter(Boolean);
	}, [planLines]);

	// Слушатель внешних начислений (одонтограмма, пакеты, протоколы) для немедленной фиксации в плане приёма
	React.useEffect(() => {
		const handleExternalInvoiceServices = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (!detail || !updateVisitNoteField) return;
			if (
				detail.source === "chairside_express" ||
				detail.source === "chairside_catalog" ||
				detail.source === "chairside_bundle" ||
				detail.source === "chairside_checklist_all" ||
				detail.source === "chairside_checklist_toggle" ||
				detail.source === "chairside_tooth_tabs"
			) {
				return;
			}
			const rawList = Array.isArray(detail.services)
				? detail.services
				: Array.isArray(detail.items)
					? detail.items
					: detail.service
						? [detail.service]
						: [];
			if (rawList.length === 0) return;

			const newLines: string[] = [];
			for (const s of rawList) {
				const tooth = s.toothCode ?? s.toothNumber ?? detail.toothCode ?? detail.toothNumber;
				const formattedLine = formatCompletedServiceLine({
					code804n: s.code804n || s.code || "A16.07.001",
					title: s.title || s.name || s.nameRu || "Стоматологическая услуга",
					priceRub: Number(s.priceRub ?? s.unitPriceRub ?? s.price ?? 0),
					toothCode: tooth ? String(tooth) : null,
				});
				if (!planLines.includes(formattedLine)) {
					newLines.push(formattedLine);
				}
			}
			if (newLines.length > 0) {
				const base = (planText ?? "").replace(/\s+$/, "");
				const updatedPlan = base ? `${base}\n${newLines.join("\n")}` : newLines.join("\n");
				updateVisitNoteField("treatmentPlan", updatedPlan);
			}
		};

		window.addEventListener("dente-add-services-to-invoice", handleExternalInvoiceServices);
		return () => {
			window.removeEventListener("dente-add-services-to-invoice", handleExternalInvoiceServices);
		};
	}, [planText, planLines, updateVisitNoteField]);

	// Переключение отметки позиции из предварительного плана
	// biome-ignore lint/suspicious/noExplicitAny: generic service item from plan
	const togglePlanItem = (item: any) => {
		if (!updateVisitNoteField) return;
		const line = completedLineOf(item);
		const tooth = item?.toothCode ?? item?.toothNumber ?? selectedTooth;

		if (isMarked(item)) {
			const kept = (planText ?? "")
				.split("\n")
				.filter((existing) => (existing ?? "").trim() !== line);
			updateVisitNoteField(
				"treatmentPlan",
				kept.join("\n").replace(/\n+$/, ""),
			);

			// Синхронное удаление из completedServices стора
			const currentList = useVisitStore.getState().completedServices;
			const targetTitle = serviceTitleOf(item);
			const removeIdx = currentList.findIndex((cs) => {
				const csTitle = cs.name || (cs as any).title || "";
				return csTitle === targetTitle;
			});
			if (removeIdx !== -1) {
				useVisitStore.getState().removeCompletedService(removeIdx);
			}

			// Если галочка снята, и по данному зубу нет других выполненных манипуляций — возвращаем в idle
			if (tooth) {
				const toothStr = String(tooth);
				const hasOther = kept.some((l) => l.includes(`(зуб ${toothStr})`) || l.includes(`(зубы ${toothStr})`));
				if (!hasOther) {
					useVisitStore.getState().setToothState(toothStr, "idle");
				}
			}
			return;
		}

		const base = (planText ?? "").replace(/\s+$/, "");
		updateVisitNoteField("treatmentPlan", base ? `${base}\n${line}` : line);

		// Сквозная реактивность одонтограммы: при отметке галочки статус зуба немедленно обновляется
		const serviceCode = item?.serviceCode || item?.code804n || item?.code || "A16.07.002";
		const serviceTitle = serviceTitleOf(item);
		const toothNum = tooth ? Number(tooth) || undefined : undefined;

		useVisitStore.getState().addCompletedService({
			serviceId: item?.serviceId || item?.id || `plan-${serviceCode}`,
			code804n: serviceCode,
			name: serviceTitle,
			priceRub: planLineTotalRub(item) ?? 0,
			toothNumber: toothNum ? Number(toothNum) : undefined,
			toothCode: tooth ? String(tooth) : undefined,
			quantity: planLineQuantity(item) ?? 1,
		});

		const srvPayload = {
			toothNumber: tooth ? Number(tooth) || tooth : undefined,
			toothCode: tooth ? String(tooth) : undefined,
			services: [
				{
					code: serviceCode,
					code804n: serviceCode,
					title: serviceTitle,
					price: planLineTotalRub(item) ?? 0,
					priceRub: planLineTotalRub(item) ?? 0,
					unitPriceRub: typeof item?.unitPriceRub === "number" ? item.unitPriceRub : (Number(item?.unitPriceRub) || planLineTotalRub(item) || 0),
					quantity: planLineQuantity(item) ?? 1,
					toothCode: tooth ? String(tooth) : undefined,
				},
			],
			source: "chairside_checklist_toggle",
		};

		useVisitStore.getState().applyServicesToToothState(srvPayload);

		try {
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: srvPayload,
					}),
				);
			}
		} catch (err) {
			console.warn("dente-add-services-to-invoice dispatch error:", err);
		}
	};

	// Быстрое добавление экспресс-услуги у кресла
	const handleAddExpressService = (service: ChairsideExpressService) => {
		if (!updateVisitNoteField) return;

		const line = formatCompletedServiceLine({
			code804n: service.code804n,
			title: service.title,
			priceRub: service.priceRub,
			toothCode: selectedTooth,
		});

		const base = (planText ?? "").replace(/\s+$/, "");
		const updatedPlan = base ? `${base}\n${line}` : line;
		updateVisitNoteField("treatmentPlan", updatedPlan);

		const toothNum = selectedTooth ? Number.parseInt(selectedTooth, 10) || undefined : undefined;
		useVisitStore.getState().addCompletedService({
			serviceId: service.id,
			code804n: service.code804n,
			name: service.title,
			priceRub: service.priceRub,
			toothNumber: toothNum ? Number(toothNum) : undefined,
			toothCode: selectedTooth ? String(selectedTooth) : undefined,
			quantity: 1,
		});

		const expressPayload = {
			toothNumber: selectedTooth
				? Number(selectedTooth) || selectedTooth
				: undefined,
			toothCode: selectedTooth || undefined,
			services: [
				{
					code: service.code804n,
					code804n: service.code804n,
					title: service.title,
					price: service.priceRub,
					priceRub: service.priceRub,
					unitPriceRub: service.priceRub,
					quantity: 1,
					toothCode: selectedTooth || undefined,
				},
			],
			source: "chairside_express",
		};

		useVisitStore.getState().applyServicesToToothState(expressPayload);

		try {
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: expressPayload,
					}),
				);
			}
		} catch (err) {
			console.warn("dente-add-services-to-invoice dispatch error:", err);
		}

		const toothMsg = selectedTooth
			? selectedTooth.includes(",")
				? ` (зубы ${selectedTooth})`
				: ` (зуб ${selectedTooth})`
			: "";
		showToast(
			`Услуга «[${service.code804n}] ${service.title}»${toothMsg} (${money(service.priceRub)}) внесена в карту и счёт`,
			"success",
			3500,
		);
	};

	// Быстрое добавление услуги из прейскуранта клиники
	const handleAddCatalogService = (item: FilteredCatalogService) => {
		if (!updateVisitNoteField) return;

		const line = formatCompletedServiceLine({
			code804n: item.code,
			title: item.title,
			priceRub: item.priceRub,
			toothCode: selectedTooth,
		});

		const base = (planText ?? "").replace(/\s+$/, "");
		const updatedPlan = base ? `${base}\n${line}` : line;
		updateVisitNoteField("treatmentPlan", updatedPlan);

		const toothNum = selectedTooth ? Number.parseInt(selectedTooth, 10) || undefined : undefined;
		useVisitStore.getState().addCompletedService({
			serviceId: item.id,
			code804n: item.code,
			name: item.title,
			priceRub: item.priceRub,
			toothNumber: toothNum ? Number(toothNum) : undefined,
			toothCode: selectedTooth ? String(selectedTooth) : undefined,
			quantity: 1,
		});

		const catalogPayload = {
			toothNumber: selectedTooth
				? Number(selectedTooth) || selectedTooth
				: undefined,
			toothCode: selectedTooth || undefined,
			services: [
				{
					code: item.code,
					code804n: item.code,
					title: item.title,
					price: item.priceRub,
					priceRub: item.priceRub,
					unitPriceRub: item.priceRub,
					quantity: 1,
					toothCode: selectedTooth || undefined,
				},
			],
			source: "chairside_catalog",
		};

		useVisitStore.getState().applyServicesToToothState(catalogPayload);

		try {
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: catalogPayload,
					}),
				);
			}
		} catch (err) {
			console.warn("dente-add-services-to-invoice dispatch error:", err);
		}

		const toothMsg = selectedTooth
			? selectedTooth.includes(",")
				? ` (зубы ${selectedTooth})`
				: ` (зуб ${selectedTooth})`
			: "";
		showToast(
			`Услуга «[${item.code}] ${item.title}»${toothMsg} (${money(item.priceRub)}) внесена в карту и счёт`,
			"success",
			3500,
		);
		setCatalogSearch("");
	};

	// Добавление клинического пакета
	const handleAddBundle = (bundle: ClinicalServiceBundle) => {
		if (!updateVisitNoteField) return;
		const bundleLines = bundle.services.map((s) =>
			formatCompletedServiceLine({
				code804n: s.code804n,
				title: s.title,
				priceRub: s.priceRub,
				toothCode: selectedTooth,
			}),
		);
		const base = (planText ?? "").replace(/\s+$/, "");
		const updatedPlan = base
			? `${base}\n${bundleLines.join("\n")}`
			: bundleLines.join("\n");
		updateVisitNoteField("treatmentPlan", updatedPlan);

		const toothNum = selectedTooth ? Number.parseInt(selectedTooth, 10) || undefined : undefined;
		for (const s of bundle.services) {
			useVisitStore.getState().addCompletedService({
				serviceId: `${bundle.id}-${s.code804n}`,
				code804n: s.code804n,
				name: s.title,
				priceRub: s.priceRub,
				toothNumber: toothNum ? Number(toothNum) : undefined,
				toothCode: selectedTooth ? String(selectedTooth) : undefined,
				quantity: 1,
			});
		}

		const bundlePayload = {
			bundleId: bundle.id,
			bundleTitle: bundle.title,
			toothNumber: selectedTooth
				? Number(selectedTooth) || selectedTooth
				: undefined,
			toothCode: selectedTooth || undefined,
			services: bundle.services.map((s) => ({
				code: s.code804n,
				code804n: s.code804n,
				title: s.title,
				price: s.priceRub,
				priceRub: s.priceRub,
				unitPriceRub: s.priceRub,
				quantity: 1,
				toothCode: selectedTooth || undefined,
			})),
			source: "chairside_bundle",
		};

		useVisitStore.getState().applyServicesToToothState(bundlePayload);

		try {
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: bundlePayload,
					}),
				);
			}
		} catch (err) {
			console.warn("dente-add-services-to-invoice dispatch error:", err);
		}

		const toothMsg = selectedTooth
			? selectedTooth.includes(",")
				? ` (зубы ${selectedTooth})`
				: ` (зуб ${selectedTooth})`
			: "";
		showToast(
			`Пакет «${bundle.title}»${toothMsg} (${countLabel(bundle.services.length, "услуга", "услуги", "услуг")} на ${money(bundle.totalPriceRub)}) внесен в карту и счет`,
			"success",
			3500,
		);
	};

	// Быстрое внесение готового клинического пакета по Номенклатуре 804н
	const handleApplyDiagnosisPackage = (newLines: string[], invoicePayload: any) => {
		if (!updateVisitNoteField) return;
		const base = (planText ?? "").replace(/\s+$/, "");
		const updatedPlan = base ? `${base}\n${newLines.join("\n")}` : newLines.join("\n");
		updateVisitNoteField("treatmentPlan", updatedPlan);

		try {
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: invoicePayload,
					}),
				);
			}
		} catch (err) {
			console.warn("dente-add-services-to-invoice dispatch error:", err);
		}
	};

	// Удаление ошибочно внесенной строки
	const handleRemoveCompletedLine = (rawLine: string) => {
		if (!updateVisitNoteField) return;
		const parsed = parseCompletedServiceLine(rawLine);
		const kept = (planText ?? "")
			.split("\n")
			.filter((existing) => (existing ?? "").trim() !== rawLine.trim());
		updateVisitNoteField(
			"treatmentPlan",
			kept.join("\n").replace(/\n+$/, ""),
		);

		// Синхронное удаление из completedServices стора
		if (parsed) {
			const currentList = useVisitStore.getState().completedServices;
			const removeIdx = currentList.findIndex((item) => {
				const itemTooth = String(item.toothCode || item.toothNumber || "");
				const parsedTooth = String(parsed.toothCode || "");
				const codeMatch = item.code804n === parsed.code804n;
				const titleMatch = item.name === parsed.title || (item as any).title === parsed.title;
				const toothMatch = (!itemTooth && !parsedTooth) || itemTooth === parsedTooth;
				return (codeMatch || titleMatch) && toothMatch;
			});
			if (removeIdx !== -1) {
				useVisitStore.getState().removeCompletedService(removeIdx);
			}

			// Если для зуба больше нет записей в оставшихся строках плана — сбрасываем статус зуба в idle
			if (parsed.toothCode) {
				const toothStr = parsed.toothCode;
				const hasOther = kept.some((l) => l.includes(`(зуб ${toothStr})`) || l.includes(`(зубы ${toothStr})`));
				if (!hasOther && !toothStr.includes(",")) {
					useVisitStore.getState().setToothState(toothStr, "idle");
				}
			}
		}

		showToast("Услуга удалена из карты приёма", "info", 2000);
	};

	// «Внести всё в кассовый счёт»
	const handlePushAllToInvoice = () => {
		if (summary.servicesForInvoice.length === 0) {
			showToast(
				"Нет отмеченных или выполненных услуг для передачи в кассу",
				"warning",
				3000,
			);
			return;
		}

		try {
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: {
							services: summary.servicesForInvoice,
							totalAmountRub: summary.totalRub,
							patientId: visitPatientId,
							visitId,
							source: "chairside_checklist_all",
						},
					}),
				);
			}
		} catch (err) {
			console.warn("dente-add-services-to-invoice dispatch error:", err);
		}

		showToast(
			`Все услуги (${countLabel(summary.count, "услуга", "услуги", "услуг")} на ${money(summary.totalRub)}) внесены в кассовый счёт`,
			"success",
			3500,
		);
	};

	// Если приём ещё не открыт
	if (!visitIsOpen) {
		return (
			<div
				data-testid="completed-services-checklist"
				className="completed-services-checklist bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3"
			>
				<h4 className="m-0 mb-1 text-sm font-semibold text-slate-900 dark:text-white">
					Отметка выполненного по плану лечения
				</h4>
				<p
					className="m-0 text-xs text-slate-500 dark:text-slate-400"
					role="status"
					aria-live="polite"
				>
					Приём ещё не открыт, поэтому отмечать выполненное не по чему: отметка
					записывается в карту конкретного приёма. Запишите пациента и начните
					приём в разделе «Записи» — план лечения и экспресс-услуги появятся
					здесь.
				</p>
			</div>
		);
	}

	return (
		<div
			data-testid="completed-services-checklist"
			className="completed-services-checklist bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3"
		>
			<div className="flex items-center justify-between gap-2 mb-1">
				<h4 className="m-0 text-sm font-semibold text-slate-900 dark:text-white">
					Отметка выполненного у кресла
				</h4>
				<span className="text-[11px] text-slate-500 dark:text-slate-400">
					Прейскурант услуг
				</span>
			</div>
			<p className="m-0 mb-3 text-xs text-slate-500 dark:text-slate-400">
				{visitPatientName ? `Пациент: ${visitPatientName}. ` : ""}
				Вносите экспресс-услуги или выбирайте из прейскуранта.
				Отмеченное дописывается в карту приёма и передается в счёт.
			</p>

			{/* 1. БЫСТРЫЙ ВЫБОР ЗУБА ДЛЯ ПРИВЯЗКИ (FDI 11..48, «Без зуба») */}
			<ChairsideToothSelector
				selectedTooth={selectedTooth}
				onSelectTooth={setSelectedTooth}
				isToothGridOpen={isToothGridOpen}
				onToggleToothGrid={() => setIsToothGridOpen(!isToothGridOpen)}
			/>

			{/* 2. 9 быстрых услуг у кресла */}
			<ChairsideExpressGrid
				selectedTooth={selectedTooth}
				onAddExpressService={handleAddExpressService}
			/>


			{/* 3. БЫСТРЫЙ ИНЛАЙН-ПОИСК ПО ПРЕЙСКУРАНТУ КЛИНИКИ */}
			<div className="mb-3 relative">
				<div className="relative">
					<input
						type="text"
						value={catalogSearch}
						onChange={(e) => setCatalogSearch(e.target.value)}
						placeholder="Поиск по прейскуранту клиники (код услуги или название: пломба, коронка, анестезия)..."
						data-testid="service-catalog-search-input"
						className="w-full text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-8 py-2.5 min-h-[44px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400"
					/>
					<Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
					{catalogSearch && (
						<button
							type="button"
							onClick={() => setCatalogSearch("")}
							className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
							title="Очистить поиск"
						>
							<X className="w-4 h-4" />
						</button>
					)}
				</div>

				{catalogSearch.trim().length > 0 && (
					<div
						data-testid="service-catalog-search-results"
						className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-30 divide-y divide-slate-100 dark:divide-slate-800"
					>
						{filteredCatalog.length === 0 ? (
							<div className="p-3 text-xs text-slate-500 dark:text-slate-400 text-center">
								Ничего не найдено в прейскуранте по запросу «{catalogSearch}»
							</div>
						) : (
							filteredCatalog.map((item) => (
								<button
									key={item.id}
									type="button"
									onClick={() => handleAddCatalogService(item)}
									className="w-full min-h-[44px] flex items-center justify-between p-2.5 text-left hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-colors group"
								>
									<div className="flex-1 min-w-0 pr-2">
										<div className="flex items-center gap-1.5">
											<span className="text-xs font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 truncate">
												{item.title}
											</span>
											<span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
												[{item.code}]
											</span>
										</div>
										{selectedTooth && (
											<div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
												будет привязано к зубу {selectedTooth}
											</div>
										)}
									</div>
									<div className="flex items-center gap-2 shrink-0">
										<span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-200">
											{money(item.priceRub)}
										</span>
										<span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5">
											<Plus className="w-3.5 h-3.5" /> Добавить
										</span>
									</div>
								</button>
							))
						)}
					</div>
				)}
			</div>

			{/* 3.5. ГОТОВЫЙ ЧЕК-ЛИСТ УСЛУГ ПО НОМЕНКЛАТУРЕ 804Н (МГНОВЕННО У КРЕСЛА) */}
			<ChairsideDiagnosisPackageCard
				selectedTooth={selectedTooth}
				patientId={visitPatientId}
				visitId={visitId}
				catalog={effectiveCatalog}
				onApplyPackageToPlan={handleApplyDiagnosisPackage}
			/>

			{/* 4. КОМПЛЕКСНЫЕ КЛИНИЧЕСКИЕ ПАКЕТЫ (КАРИЕС, ЭНДО, ГИГИЕНА, УДАЛЕНИЕ) */}
			<div className="mb-3 p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/50">
				<div className="flex items-center justify-between gap-2 mb-2">
					<span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
						<Zap className="w-3.5 h-3.5 text-indigo-500" />
						Комплексные клинические пакеты:
					</span>
					<button
						type="button"
						onClick={() => setBundlesExpanded(!bundlesExpanded)}
						className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
					>
						{bundlesExpanded ? "Свернуть" : "Показать все 4 пакета"}
						{bundlesExpanded ? (
							<ChevronUp className="w-3 h-3" />
						) : (
							<ChevronDown className="w-3 h-3" />
						)}
					</button>
				</div>
				<div
					className={`grid grid-cols-1 sm:grid-cols-2 gap-1.5 ${
						bundlesExpanded ? "" : "max-h-[120px] overflow-hidden"
					}`}
				>
					{CLINICAL_SERVICE_BUNDLES.map((b) => (
						<button
							key={b.id}
							type="button"
							onClick={() => handleAddBundle(b)}
							className="flex flex-col items-start p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/30 transition-all text-left group min-h-[48px]"
							title={b.services
								.map(
									(s) =>
										`• [${s.code804n}] ${s.title} (${money(s.priceRub)})`,
								)
								.join("\n")}
						>
							<div className="w-full flex items-center justify-between gap-1">
								<span className="text-xs font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
									{b.shortLabel}
									{selectedTooth ? ` (зуб ${selectedTooth})` : ""}
								</span>
								<span className="text-xs font-bold text-slate-900 dark:text-slate-200 font-mono">
									{money(b.totalPriceRub)}
								</span>
							</div>
							<span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-full mt-0.5">
								{b.badge}
							</span>
						</button>
					))}
				</div>
			</div>

			{/* 5. ПОЗИЦИИ ИЗ СОГЛАСОВАННОГО ПЛАНА ЛЕЧЕНИЯ ПАЦИЕНТА (ЕСЛИ ЕСТЬ) */}
			{(planItems ?? []).length > 0 && (
				<div className="mb-3">
					<div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
						<Check className="w-3.5 h-3.5 text-teal-600" />
						Позиции из плана лечения пациента:
					</div>
					<div className="flex flex-col gap-1.5">
						{/* biome-ignore lint/suspicious/noExplicitAny: generic service item from plan */}
						{(planItems ?? []).map((item: any, index: number) => {
							const marked = isMarked(item);
							const totalRub = planLineTotalRub(item);
							const quantity = planLineQuantity(item);
							return (
								<label
									key={
										item?.id ??
										`${item?.serviceId ?? "услуга"}-${item?.toothCode ?? "без-зуба"}-${index}`
									}
									className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-800 dark:text-slate-200 min-h-[44px] py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
								>
									<input
										type="checkbox"
										checked={marked}
										onChange={() => togglePlanItem(item)}
										className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-[var(--teal,var(--brand-primary))] focus:ring-[var(--teal,var(--brand-primary))]"
									/>
									<span className="flex-1">
										{serviceTitleOf(item)}
										{toothSuffixOf(item)}
										{quantity !== null && quantity > 1
											? `, ${quantity} шт.`
											: ""}
									</span>
									{totalRub === null ? (
										<em className="whitespace-nowrap text-amber-700 dark:text-amber-400 not-italic">
											{PRICE_UNKNOWN_TEXT}
										</em>
									) : (
										<strong className="tabular-nums whitespace-nowrap">
											{money(totalRub)}
										</strong>
									)}
								</label>
							);
						})}
					</div>
				</div>
			)}

			{/* 6. СПИСОК ВСЕХ ВЫПОЛНЕННЫХ УСЛУГ В ЭТОМ ПРИЁМЕ */}
			<CompletedServicesList
				completedLinesList={completedLinesList}
				totalRub={summary.totalRub}
				onRemoveCompletedLine={handleRemoveCompletedLine}
			/>


			{/* 7. ИТОГ И «ВНЕСТИ ВСЁ В КАССОВЫЙ СЧЁТ» */}
			<div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
				<div className="text-xs text-slate-700 dark:text-slate-300">
					{summary.count === 0 ? (
						<span>Пока ничего не отмечено и не выполнено.</span>
					) : (
						<span>
							Выполнено:{" "}
							<strong>
								{countLabel(summary.count, "услуга", "услуги", "услуг")}
							</strong>
							. К оплате:{" "}
							<strong className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
								{money(summary.totalRub)}
							</strong>
							.
						</span>
					)}
					{summary.unpricedCount > 0 && (
						<span className="text-amber-700 dark:text-amber-400 block mt-0.5">
							В сумму НЕ вошли{" "}
							{countLabel(
								summary.unpricedCount,
								"позиция",
								"позиции",
								"позиций",
							)}{" "}
							без цены — уточните в прейскуранте.
						</span>
					)}
				</div>
				<button
					type="button"
					onClick={handlePushAllToInvoice}
					data-testid="push-all-to-invoice-btn"
					className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors shrink-0"
					title="Передать все выполненные услуги визита в кассовый счёт для оплаты"
				>
					<Receipt className="w-4 h-4" />
					Внести всё в кассовый счёт{" "}
					{summary.totalRub > 0 ? `(${money(summary.totalRub)})` : ""}
				</button>
			</div>
		</div>
	);
};
