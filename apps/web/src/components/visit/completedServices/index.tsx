import { Receipt } from "lucide-react";
import React from "react";
import { money } from "../../../AppHelpers";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { countLabel } from "../../../lib/russianPlural";
import { useVisitStore } from "../../../store/visitStore";
import { showRollbackToast, showToast } from "../../GlobalToast";
import { CompletedServicesList } from "../CompletedServicesList";
import {
	type ChairsideExpressService,
	calculateCompletedServicesSummary,
	type FilteredCatalogService,
	filterServiceCatalog,
	formatCompletedServiceLine,
	parseCompletedServiceLine,
	planLineQuantity,
	planLineTotalRub,
	visitOwnedPlanItems,
} from "../completedServicesPlan";
import { realVisitFieldId } from "../visitIdentity";
import {
	CompletedServiceRowItem,
	PreliminaryTreatmentPlanSection,
} from "./CompletedServiceRowItem";
import { QuickServiceSearchAndPresets } from "./QuickServiceSearchAndPresets";
import {
	completedLineOf,
	extractParsedCompletedLines,
	serviceTitleOf,
	toothSuffixOf,
} from "./serviceChecklistHelpers";
import {
	CLINICAL_SERVICE_BUNDLES,
	type ClinicalServiceBundle,
	type CompletedServicesChecklistProps,
} from "./types";

export {
	CLINICAL_SERVICE_BUNDLES,
	type ClinicalServiceBundle,
	CompletedServiceRowItem,
	type CompletedServicesChecklistProps,
	completedLineOf,
	PreliminaryTreatmentPlanSection,
	QuickServiceSearchAndPresets,
	serviceTitleOf,
	toothSuffixOf,
};

// ОТМЕТКА ВЫПОЛНЕННЫХ УСЛУГ У КРЕСЛА:
// 1. Запись отметки в поле treatmentPlan («Выполнено: ...») гарантирует сохранение на сервере.
// 2. Готовый чек-лист услуг по Номенклатуре услуг по клику на диагноз зуба с ценами в целых копейках.
// 3. Экспресс-передача в кассу и в смету пациента без 10-минутного поиска по 300 позициям.
// 4. Точные цены без float-округлений.

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
	const initialTooth =
		contextTooth || storeActiveTooth || activeToothNumber || null;
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
	const [debouncedCatalogSearch, setDebouncedCatalogSearch] =
		React.useState<string>("");

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
	const completedLinesList = React.useMemo(
		() => extractParsedCompletedLines(planLines),
		[planLines],
	);

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
				const tooth =
					s.toothCode ??
					s.toothNumber ??
					detail.toothCode ??
					detail.toothNumber;
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
				const updatedPlan = base
					? `${base}\n${newLines.join("\n")}`
					: newLines.join("\n");
				updateVisitNoteField("treatmentPlan", updatedPlan);
			}
		};

		window.addEventListener(
			"dente-add-services-to-invoice",
			handleExternalInvoiceServices,
		);
		return () => {
			window.removeEventListener(
				"dente-add-services-to-invoice",
				handleExternalInvoiceServices,
			);
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
				// biome-ignore lint/suspicious/noExplicitAny: dynamic completedService item
				const csTitle = cs.name || (cs as any).title || "";
				return csTitle === targetTitle;
			});
			if (removeIdx !== -1) {
				useVisitStore.getState().removeCompletedService(removeIdx);
			}

			// Если галочка снята, и по данному зубу нет других выполненных манипуляций — возвращаем в idle
			if (tooth) {
				const toothStr = String(tooth);
				const hasOther = kept.some(
					(l) =>
						l.includes(`(зуб ${toothStr})`) || l.includes(`(зубы ${toothStr})`),
				);
				if (!hasOther) {
					useVisitStore.getState().setToothState(toothStr, "idle");
				}
			}
			return;
		}

		const base = (planText ?? "").replace(/\s+$/, "");
		updateVisitNoteField("treatmentPlan", base ? `${base}\n${line}` : line);

		// Сквозная реактивность одонтограммы: при отметке галочки статус зуба немедленно обновляется
		const serviceCode =
			item?.serviceCode || item?.code804n || item?.code || "A16.07.002";
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
					unitPriceRub:
						typeof item?.unitPriceRub === "number"
							? item.unitPriceRub
							: Number(item?.unitPriceRub) || planLineTotalRub(item) || 0,
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

		const toothNum = selectedTooth
			? Number.parseInt(selectedTooth, 10) || undefined
			: undefined;
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

		const toothNum = selectedTooth
			? Number.parseInt(selectedTooth, 10) || undefined
			: undefined;
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

		const toothNum = selectedTooth
			? Number.parseInt(selectedTooth, 10) || undefined
			: undefined;
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
	const handleApplyDiagnosisPackage = (
		newLines: string[],
		// biome-ignore lint/suspicious/noExplicitAny: dynamic invoice payload
		invoicePayload: any,
	) => {
		if (!updateVisitNoteField) return;
		const base = (planText ?? "").replace(/\s+$/, "");
		const updatedPlan = base
			? `${base}\n${newLines.join("\n")}`
			: newLines.join("\n");
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

	// Удаление ошибочно внесенной строки с возможностью мгновенного отката (Undo)
	const handleRemoveCompletedLine = (rawLine: string) => {
		if (!updateVisitNoteField) return;
		const parsed = parseCompletedServiceLine(rawLine);
		const oldPlanText = planText ?? "";
		const kept = oldPlanText
			.split("\n")
			.filter((existing) => (existing ?? "").trim() !== rawLine.trim());
		updateVisitNoteField("treatmentPlan", kept.join("\n").replace(/\n+$/, ""));

		// Синхронное удаление из completedServices стора
		// biome-ignore lint/suspicious/noExplicitAny: dynamic completedService restoration
		let removedService: any = null;
		// biome-ignore lint/suspicious/noExplicitAny: tooth state restoration
		let previousToothState: any = null;

		if (parsed) {
			const currentList = useVisitStore.getState().completedServices;
			const removeIdx = currentList.findIndex((item) => {
				const itemTooth = String(item.toothCode || item.toothNumber || "");
				const parsedTooth = String(parsed.toothCode || "");
				const codeMatch = item.code804n === parsed.code804n;
				const titleMatch =
					// biome-ignore lint/suspicious/noExplicitAny: dynamic completedService item
					item.name === parsed.title || (item as any).title === parsed.title;
				const toothMatch =
					(!itemTooth && !parsedTooth) || itemTooth === parsedTooth;
				return (codeMatch || titleMatch) && toothMatch;
			});
			if (removeIdx !== -1) {
				removedService = currentList[removeIdx];
				useVisitStore.getState().removeCompletedService(removeIdx);
			}

			// Если для зуба больше нет записей в оставшихся строках плана — сбрасываем статус зуба в idle
			if (parsed.toothCode) {
				const toothStr = parsed.toothCode;
				const hasOther = kept.some(
					(l) =>
						l.includes(`(зуб ${toothStr})`) || l.includes(`(зубы ${toothStr})`),
				);
				if (!hasOther && !toothStr.includes(",")) {
					const visitState = useVisitStore.getState();
					previousToothState =
						visitState.visitToothStateByCode?.[toothStr] ||
						visitState.teeth?.[toothStr]?.state;
					visitState.setToothState(toothStr, "idle");
				}
			}
		}

		const title = parsed?.title ? `«${parsed.title}»` : "Услуга";
		showRollbackToast(
			`${title} удалена из приёма`,
			() => {
				// Мгновенный откат: возвращаем строку в treatmentPlan
				updateVisitNoteField("treatmentPlan", oldPlanText);

				// Возвращаем услугу в completedServices
				if (removedService) {
					useVisitStore.getState().addCompletedService(removedService);
				}

				// Восстанавливаем статус зуба
				if (parsed?.toothCode && previousToothState) {
					useVisitStore
						.getState()
						.setToothState(parsed.toothCode, previousToothState);
				}
			},
			5000,
		);
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
				Вносите экспресс-услуги или выбирайте из прейскуранта. Отмеченное
				дописывается в карту приёма и передается в счёт.
			</p>

			<QuickServiceSearchAndPresets
				selectedTooth={selectedTooth}
				onSelectTooth={setSelectedTooth}
				isToothGridOpen={isToothGridOpen}
				onToggleToothGrid={() => setIsToothGridOpen(!isToothGridOpen)}
				onAddExpressService={handleAddExpressService}
				catalogSearch={catalogSearch}
				onCatalogSearchChange={setCatalogSearch}
				filteredCatalog={filteredCatalog}
				onAddCatalogService={handleAddCatalogService}
				visitPatientId={visitPatientId}
				visitId={visitId}
				effectiveCatalog={effectiveCatalog}
				onApplyDiagnosisPackage={handleApplyDiagnosisPackage}
				bundlesExpanded={bundlesExpanded}
				onToggleBundlesExpanded={() => setBundlesExpanded(!bundlesExpanded)}
				onAddBundle={handleAddBundle}
			/>

			{/* 5. ПОЗИЦИИ ИЗ СОГЛАСОВАННОГО ПЛАНА ЛЕЧЕНИЯ ПАЦИЕНТА (ЕСЛИ ЕСТЬ) */}
			<PreliminaryTreatmentPlanSection
				planItems={planItems}
				isMarked={isMarked}
				onTogglePlanItem={togglePlanItem}
			/>

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
