/**
 * useDiagnosisPackage.ts
 * Clinical package auto-selection, customization and billing export logic.
 */

import { useState, useMemo, useEffect } from "react";
import { money } from "../../AppHelpers";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { countLabel } from "../../lib/russianPlural";
import { showToast } from "../GlobalToast";
import { loadStoredTeethData } from "../odontogram/odontogramStorage";
import {
	CARIES_DIAGNOSIS_BUNDLE,
	getDiagnosisBundleByToothState,
	createCustomizedBundle,
	exportCustomizedBundleToCashier54Fz,
	type CanonicalDiagnosisBundle,
	type Cashier54FzBundleExport,
} from "@dental/shared";

export interface DiagnosisPackageCatalogItem {
	id?: string | undefined;
	code?: string | undefined;
	code804n?: string | undefined;
	title?: string | undefined;
	name?: string | undefined;
	price?: number | undefined;
	priceRub?: number | undefined;
	basePriceRub?: number | undefined;
	priceKopecks?: number | undefined;
	[key: string]: unknown;
}

export interface DiagnosisPackageInvoiceService {
	id: string;
	code: string;
	code804n: string;
	title: string;
	price: number;
	priceRub: number;
	unitPriceRub: number;
	priceKopecks: number;
	quantity: number;
	toothCode?: string | undefined;
	toothNumber?: number | undefined;
}

export interface DiagnosisPackageInvoicePayload {
	bundleId: string;
	bundleTitle: string;
	diagnosisIcd10: string;
	toothNumber?: number | undefined;
	toothCode?: string | undefined;
	patientId?: string | undefined;
	visitId?: string | undefined;
	source: "chairside_diagnosis_package";
	services: DiagnosisPackageInvoiceService[];
}

interface AppLogicDashboardWithCatalog {
	dashboard?: {
		serviceCatalog?: readonly DiagnosisPackageCatalogItem[] | undefined;
		[key: string]: unknown;
	} | null | undefined;
	[key: string]: unknown;
}

export function useDiagnosisPackage(
	selectedTooth: string | null,
	patientId?: string | null | undefined,
	visitId?: string | null | undefined,
	catalog: readonly DiagnosisPackageCatalogItem[] = [],
	onApplyPackageToPlan?: ((formattedLines: string[], invoicePayload: DiagnosisPackageInvoicePayload) => void) | undefined,
	onExportDirectToCashier?: ((exportData: Cashier54FzBundleExport) => void) | undefined,
) {
	const appLogic = useOptionalAppLogicContext() as AppLogicDashboardWithCatalog | null;
	const effectiveCatalog = useMemo(() => {
		if (Array.isArray(catalog) && catalog.length > 0) return catalog;
		if (Array.isArray(appLogic?.dashboard?.serviceCatalog)) return appLogic.dashboard.serviceCatalog;
		return [];
	}, [catalog, appLogic?.dashboard?.serviceCatalog]);
	const toothNumber = selectedTooth ? Number(selectedTooth) : null;

	const detectedToothState = useMemo(() => {
		if (!patientId || !toothNumber) return null;
		const cached = loadStoredTeethData(patientId);
		return cached?.find((t) => t.toothNumber === toothNumber)?.state ?? null;
	}, [patientId, toothNumber]);

	const initialBundle = useMemo(() => {
		if (detectedToothState) {
			const found = getDiagnosisBundleByToothState(detectedToothState);
			if (found) return found;
		}
		return CARIES_DIAGNOSIS_BUNDLE;
	}, [detectedToothState]);

	const [activeBundle, setActiveBundle] = useState<CanonicalDiagnosisBundle>(initialBundle);
	const [checkedCodes, setCheckedCodes] = useState<Set<string>>(() => new Set(initialBundle.services.map((s) => s.code804n)));

	useEffect(() => {
		if (detectedToothState) {
			const found = getDiagnosisBundleByToothState(detectedToothState);
			if (found) {
				setActiveBundle(found);
				setCheckedCodes(new Set(found.services.map((s) => s.code804n)));
				return;
			}
		}
		setActiveBundle(CARIES_DIAGNOSIS_BUNDLE);
		setCheckedCodes(new Set(CARIES_DIAGNOSIS_BUNDLE.services.map((s) => s.code804n)));
	}, [detectedToothState, selectedTooth]);

	const handleToggleCode = (code: string) => {
		setCheckedCodes((prev) => {
			const next = new Set(prev);
			if (next.has(code)) next.delete(code); else next.add(code);
			return next;
		});
	};

	const customized = useMemo(() => createCustomizedBundle(activeBundle, { toothCode: selectedTooth, checkedServiceCodes: Array.from(checkedCodes), catalog: effectiveCatalog }), [activeBundle, selectedTooth, checkedCodes, effectiveCatalog]);

	const handleApplyToPlan = () => {
		const activeItems = customized.items.filter((it) => it.checked);
		if (activeItems.length === 0) { showToast("Выберите хотя бы одну услугу из пакета", "warning", 2500); return; }
		const toothSuffix = selectedTooth ? ` (зуб ${selectedTooth})` : "";
		const lines = activeItems.map((it) => `Выполнено: [${it.code804n}] ${it.title}${toothSuffix} — ${money(it.priceRub)}`);
		const invoicePayload: DiagnosisPackageInvoicePayload = {
			bundleId: activeBundle.id, bundleTitle: activeBundle.title, diagnosisIcd10: activeBundle.diagnosisIcd10,
			toothNumber: toothNumber ?? undefined, toothCode: selectedTooth ?? undefined, patientId: patientId ?? undefined, visitId: visitId ?? undefined,
			source: "chairside_diagnosis_package",
			services: activeItems.map((it, idx) => ({
				id: `srv_${patientId || "pat"}_tooth_${selectedTooth || "no"}_${activeBundle.id}_${it.code804n}_${idx}`,
				code: it.code804n, code804n: it.code804n, title: it.title, price: it.priceRub, priceRub: it.priceRub, unitPriceRub: it.priceRub, priceKopecks: it.priceKopecks, quantity: 1, toothCode: selectedTooth ?? undefined, toothNumber: toothNumber ?? undefined,
			})),
		};
		if (onApplyPackageToPlan) onApplyPackageToPlan(lines, invoicePayload);
		else if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", { detail: invoicePayload }));
		const toothMsg = selectedTooth ? ` для зуба ${selectedTooth}` : "";
		showToast(`Пакет «${activeBundle.title}»${toothMsg} (${countLabel(activeItems.length, "услуга", "услуги", "услуг")} на ${money(customized.totalRub)}) внесен в карту и счёт`, "success", 3500);
	};

	const handleExportToCashier = () => {
		const activeItems = customized.items.filter((it) => it.checked);
		if (activeItems.length === 0) { showToast("Нет выбранных услуг для передачи в кассу", "warning", 2500); return; }
		const exportPayload = exportCustomizedBundleToCashier54Fz(customized, { patientId: patientId ?? undefined, visitId: visitId ?? undefined, toothNumber: selectedTooth ?? undefined });
		if (onExportDirectToCashier) onExportDirectToCashier(exportPayload);
		showToast(`Счёт «${activeBundle.title}» (${money(customized.totalRub)}) передан в кассу`, "success", 3500);
	};

	return { activeBundle, setActiveBundle, setCheckedCodes, handleToggleCode, customized, handleApplyToPlan, handleExportToCashier };
}
