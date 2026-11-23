import { useState } from "react";
import type { ServiceCatalogItem } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { BASELINE_PRICELIST_SERVICES } from "../../catalog/pricelist/servicePricelistPresets";
import { syncPricelistItemsToCatalog } from "../catalogSyncHelper";
import type { ClinicDashboardResponse, CreateServicePayload } from "../pricesTab/types";

export interface MobilePricesAppLogicBag {
	dashboard?: ClinicDashboardResponse | undefined;
	serviceCategoryLabels?: Record<string, string> | undefined;
	specialtyLabels?: Record<string, string> | undefined;
	createServiceCatalogItem?: ((payload: CreateServicePayload) => Promise<unknown>) | undefined;
	updateServiceCatalogItem?: ((id: string, payload: Partial<CreateServicePayload>) => Promise<unknown>) | undefined;
	deleteServiceCatalogItem?: ((id: string) => Promise<unknown>) | undefined;
	refreshDashboard?: (() => Promise<unknown>) | undefined;
	loadClinicSettings?: (() => Promise<unknown>) | undefined;
	[key: string]: unknown;
}

interface UseMobilePricesActionsParams {
	appLogic: MobilePricesAppLogicBag;
	rawCatalog: readonly ServiceCatalogItem[];
}

export function useMobilePricesActions({ appLogic, rawCatalog }: UseMobilePricesActionsParams) {
	const [isSeeding, setIsSeeding] = useState(false);
	const {
		createServiceCatalogItem,
		updateServiceCatalogItem,
		deleteServiceCatalogItem,
		refreshDashboard,
		loadClinicSettings,
	} = appLogic;

	const reload = async () => {
		if (typeof refreshDashboard === "function") await refreshDashboard();
		else if (typeof loadClinicSettings === "function") await loadClinicSettings();
	};

	const handleSaveService = async (payload: CreateServicePayload, serviceId?: string) => {
		try {
			if (serviceId) {
				if (typeof updateServiceCatalogItem === "function") await updateServiceCatalogItem(serviceId, payload);
				showToast(`Услуга «${payload.title}» сохранена`, "success");
			} else {
				if (typeof createServiceCatalogItem === "function") await createServiceCatalogItem(payload);
				showToast(`Услуга «${payload.title}» добавлена в каталог`, "success");
			}
			await reload();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось сохранить услугу";
			showToast(msg, "error");
			throw err;
		}
	};

	const handleDeleteService = async (serviceId: string) => {
		try {
			if (typeof deleteServiceCatalogItem === "function") await deleteServiceCatalogItem(serviceId);
			showToast("Услуга удалена из каталога", "info");
			await reload();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось удалить услугу";
			showToast(msg, "error");
			throw err;
		}
	};

	const handleSeedBaseline = async () => {
		if (isSeeding) return;
		setIsSeeding(true);
		try {
			await syncPricelistItemsToCatalog({
				items: BASELINE_PRICELIST_SERVICES,
				existingServices: rawCatalog as ServiceCatalogItem[],
				createServiceCatalogItem,
				updateServiceCatalogItem,
			});
			await reload();
			showToast(`Каталог наполнен: добавлено ${BASELINE_PRICELIST_SERVICES.length} типовых услуг`, "success");
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка наполнения каталога";
			showToast(msg, "error");
		} finally {
			setIsSeeding(false);
		}
	};

	return { isSeeding, handleSaveService, handleDeleteService, handleSeedBaseline };
}
