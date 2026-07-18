import { useState } from "react";
import { showToast } from "../../GlobalToast";

export function usePricesSettingsLogic({
	pricelistAnalysis,
	createServiceCatalogItem,
	updateServiceCatalogItem,
	deleteServiceCatalogItem,
	setError,
}: {
	pricelistAnalysis: any;
	createServiceCatalogItem: any;
	updateServiceCatalogItem: any;
	deleteServiceCatalogItem: any;
	setError: any;
}) {
	const [isSaving, setIsSaving] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [importResult, setImportResult] = useState<{
		count?: number;
		error?: string;
	} | null>(null);

	const handleImportCatalog = async () => {
		if (!pricelistAnalysis?.items) return;
		setIsImporting(true);
		setImportResult(null);

		const validItems = pricelistAnalysis.items.filter(
			(item: any) => item.priceRub !== null,
		);
		if (validItems.length === 0) {
			setImportResult({ error: "Нет позиций с ценой для импорта" });
			setIsImporting(false);
			return;
		}

		try {
			const token =
				localStorage.getItem("dente_admin_secret") ||
				localStorage.getItem("dente_clinic_token") ||
				"";
			const res = await fetch("/api/settings/catalog-import", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-admin-secret": token,
				},
				body: JSON.stringify(validItems),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || "Ошибка импорта");
			setImportResult({ count: data.count });
			setTimeout(() => {
				window.location.reload();
			}, 2000);
		} catch (err: any) {
			setImportResult({ error: err.message });
		} finally {
			setIsImporting(false);
		}
	};

	const handleSaveService = async (
		e: React.FormEvent,
		editServiceId: string | null,
		editServiceForm: any,
		onSuccess: () => void,
	) => {
		e.preventDefault();
		if (!createServiceCatalogItem || !updateServiceCatalogItem) {
			setError?.("API недоступно");
			return;
		}
		setIsSaving(true);
		try {
			if (editServiceId === "new") {
				await createServiceCatalogItem(editServiceForm);
			} else if (editServiceId) {
				await updateServiceCatalogItem(editServiceId, editServiceForm);
			}
			onSuccess();
		} catch (error: any) {
			setError?.(error.message || "Ошибка сохранения");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteService = async (id: string) => {
		if (
			!window.confirm(
				"Удалить услугу из каталога? (Связанные счета сохранятся, но услуга уйдет в архив)",
			)
		)
			return;
		if (!deleteServiceCatalogItem) return;
		try {
			await deleteServiceCatalogItem(id);
		} catch (error: any) {
			setError?.(error.message || "Ошибка удаления");
		}
	};

	return {
		isSaving,
		isImporting,
		importResult,
		handleImportCatalog,
		handleSaveService,
		handleDeleteService,
	};
}
