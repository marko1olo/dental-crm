/**
 * DENTE CRM — App Logic Catalog Compatibility Adapter
 *
 * Dedicated sub-module for service catalog CRUD operations within legacy appLogic bag.
 */

import { responseErrorMessage } from "../../../../AppHelpers";

export interface ServiceCatalogCompatibilityHelpers {
	readonly createServiceCatalogItem: (data: unknown) => Promise<unknown>;
	readonly updateServiceCatalogItem: (serviceId: string, updates: unknown) => Promise<unknown>;
	readonly deleteServiceCatalogItem: (serviceId: string) => Promise<boolean>;
}

export function buildServiceCatalogCompatibility(
	auth: Record<string, unknown>,
	appStore: Record<string, unknown>,
	loadDashboard?: ((options?: { adminSecret?: string }) => Promise<void>) | (() => Promise<void>) | undefined,
): ServiceCatalogCompatibilityHelpers {
	const createServiceCatalogItem = async (data: unknown) => {
		try {
			const settingsAccess = auth.settingsAccessHeaders;
			const headers = typeof settingsAccess === "function"
				? (settingsAccess as (h: Record<string, string>) => Record<string, string>)({ "Content-Type": "application/json" })
				: { "Content-Type": "application/json" };
			const response = await fetch("/api/settings/catalog", {
				method: "POST",
				headers,
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const errMsg = await responseErrorMessage(response, "Ошибка создания услуги");
				if (typeof appStore.setError === "function") {
					(appStore.setError as (err: string | null) => void)(errMsg);
				}
				return null;
			}
			const result = await response.json();
			if (typeof loadDashboard === "function") {
				await loadDashboard();
			}
			return result;
		} catch {
			if (typeof appStore.setError === "function") {
				(appStore.setError as (err: string | null) => void)("Сбой сети при создании услуги");
			}
			return null;
		}
	};

	const updateServiceCatalogItem = async (serviceId: string, updates: unknown) => {
		try {
			const settingsAccess = auth.settingsAccessHeaders;
			const headers = typeof settingsAccess === "function"
				? (settingsAccess as (h: Record<string, string>) => Record<string, string>)({ "Content-Type": "application/json" })
				: { "Content-Type": "application/json" };
			const response = await fetch(`/api/settings/catalog/${serviceId}`, {
				method: "PUT",
				headers,
				body: JSON.stringify(updates),
			});
			if (!response.ok) {
				const errMsg = await responseErrorMessage(response, "Ошибка обновления услуги");
				if (typeof appStore.setError === "function") {
					(appStore.setError as (err: string | null) => void)(errMsg);
				}
				return null;
			}
			const result = await response.json();
			if (typeof loadDashboard === "function") {
				await loadDashboard();
			}
			return result;
		} catch {
			if (typeof appStore.setError === "function") {
				(appStore.setError as (err: string | null) => void)("Сбой сети при обновлении услуги");
			}
			return null;
		}
	};

	const deleteServiceCatalogItem = async (serviceId: string) => {
		try {
			const settingsAccess = auth.settingsAccessHeaders;
			const headers = typeof settingsAccess === "function"
				? (settingsAccess as () => Record<string, string>)()
				: {};
			const response = await fetch(`/api/settings/catalog/${serviceId}`, {
				method: "DELETE",
				headers,
			});
			if (!response.ok) {
				const errMsg = await responseErrorMessage(response, "Ошибка удаления услуги");
				if (typeof appStore.setError === "function") {
					(appStore.setError as (err: string | null) => void)(errMsg);
				}
				return false;
			}
			if (typeof loadDashboard === "function") {
				await loadDashboard();
			}
			return true;
		} catch {
			if (typeof appStore.setError === "function") {
				(appStore.setError as (err: string | null) => void)("Сбой сети при удалении услуги");
			}
			return false;
		}
	};

	return {
		createServiceCatalogItem,
		updateServiceCatalogItem,
		deleteServiceCatalogItem,
	};
}
