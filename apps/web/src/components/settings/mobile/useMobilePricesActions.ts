import { useState } from "react";
import type { ServiceCatalogItem } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { BASELINE_PRICELIST_SERVICES } from "../../catalog/pricelist/servicePricelistPresets";
import { syncPricelistItemsToCatalog } from "../catalogSyncHelper";

interface UseMobilePricesActionsParams {
	appLogic: Record<string, any>;
	rawCatalog: ServiceCatalogItem[];
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

	const handleSaveService = async (payload: any, serviceId?: string) => {
		try {
			if (serviceId) {
				if (typeof updateServiceCatalogItem === "function") await updateServiceCatalogItem(serviceId, payload);
				showToast(`Услуга «${payload.title}» сохранена`, "success");
			} else {
				if (typeof createServiceCatalogItem === "function") await createServiceCatalogItem(payload);
				showToast(`Услуга «${payload.title}» добавлена в каталог`, "success");
			}
			await reload();
		} catch (err: any) {
			showToast(err?.message || "Не удалось сохранить услугу", "error");
			throw err;
		}
	};

	const handleDeleteService = async (serviceId: string) => {
		try {
			if (typeof deleteServiceCatalogItem === "function") await deleteServiceCatalogItem(serviceId);
			showToast("Услуга удалена из каталога", "info");
			await reload();
		} catch (err: any) {
			showToast(err?.message || "Не удалось удалить услугу", "error");
			throw err;
		}
	};

	const handleSeedBaseline = async () => {
		if (isSeeding) return;
		setIsSeeding(true);
		try {
			await syncPricelistItemsToCatalog({
				items: BASELINE_PRICELIST_SERVICES,
				existingServices: rawCatalog,
				createServiceCatalogItem,
				updateServiceCatalogItem,
			});
			await reload();
			showToast(`Каталог наполнен: добавлено ${BASELINE_PRICELIST_SERVICES.length} типовых услуг`, "success");
		} catch (err: any) {
			showToast(err?.message || "Ошибка наполнения каталога", "error");
		} finally {
			setIsSeeding(false);
		}
	};

	return { isSeeding, handleSaveService, handleDeleteService, handleSeedBaseline };
}
