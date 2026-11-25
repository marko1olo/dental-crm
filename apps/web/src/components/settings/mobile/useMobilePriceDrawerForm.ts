import { useState, useEffect } from "react";
import type { DentalSpecialty, ServiceCatalogItem, ServiceCategory } from "@dental/shared";
import { normalizeRubAmountInput } from "../../../rubAmountInput";
import { rubToPriceInput } from "../pricelistEditorHelpers";
import { normalizeCategoryToBackend } from "../../catalog/pricelistCatalogData";
import { clientLogger } from "../../../services/logging/clientLogger";
import { showToast } from "../../GlobalToast";
import type { CreateServicePayload } from "../pricesTab/types";

interface UseMobilePriceDrawerFormParams {
	isOpen: boolean;
	service: ServiceCatalogItem | null;
	onSave: (servicePayload: CreateServicePayload, serviceId?: string) => Promise<void>;
	onDelete?: ((serviceId: string) => Promise<void>) | undefined;
	onClose: () => void;
}

export function useMobilePriceDrawerForm({
	isOpen,
	service,
	onSave,
	onDelete,
	onClose,
}: UseMobilePriceDrawerFormParams) {
	const isNew = !service?.id;
	const [title, setTitle] = useState("");
	const [code, setCode] = useState("");
	const [priceInput, setPriceInput] = useState("");
	const [category, setCategory] = useState("therapy");
	const [specialty, setSpecialty] = useState("therapist");
	const [durationMinutes, setDurationMinutes] = useState(30);
	const [taxDeductible, setTaxDeductible] = useState(true);
	const [vatRate, setVatRate] = useState<"vat_exempt" | "vat_20">("vat_exempt");
	const [priceProblem, setPriceProblem] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		if (isOpen && service) {
			setTitle(service.title || "");
			setCode(service.code || "");
			const basePrice = service.basePriceRub ?? service.priceRub ?? 0;
			setPriceInput(rubToPriceInput(basePrice));
			setCategory(service.category || "therapy");
			setSpecialty(service.specialty || "therapist");
			setDurationMinutes(service.durationMinutes || 30);
			setTaxDeductible(service.taxDeductible !== false);
			setVatRate(service.vatRate === "vat_20" ? "vat_20" : "vat_exempt");
		} else {
			setTitle("");
			setCode("");
			setPriceInput("");
			setCategory("therapy");
			setSpecialty("therapist");
			setDurationMinutes(30);
			setTaxDeductible(true);
			setVatRate("vat_exempt");
		}
		setPriceProblem(null);
	}, [service, isOpen]);

	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => { document.body.style.overflow = ""; };
	}, [isOpen]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim()) return;
		const basePriceRub = normalizeRubAmountInput(priceInput);
		if (basePriceRub === null) {
			setPriceProblem("Укажите корректную цену (например: 4500 или 4500,50)");
			return;
		}
		setIsSaving(true);
		try {
			await onSave({
				title: title.trim(),
				code: code.trim(),
				basePriceRub,
				category: normalizeCategoryToBackend(category) as ServiceCategory,
				specialty: specialty as DentalSpecialty,
				durationMinutes,
				taxDeductible,
				vatRate,
				active: true,
			}, service?.id);
			onClose();
		} catch (err) {
			clientLogger.error("[MobilePriceDrawer] Save error", err, { module: "useMobilePriceDrawerForm" });
			showToast("Не удалось сохранить услугу", "error");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!service?.id || !onDelete) return;
		setIsDeleting(true);
		try {
			await onDelete(service.id);
			onClose();
		} catch (err) {
			clientLogger.error("[MobilePriceDrawer] Delete error", err, { module: "useMobilePriceDrawerForm" });
			showToast("Не удалось удалить услугу", "error");
		} finally {
			setIsDeleting(false);
		}
	};

	return {
		isNew, title, setTitle, code, setCode, priceInput, setPriceInput,
		category, setCategory, specialty, setSpecialty, durationMinutes, setDurationMinutes,
		taxDeductible, setTaxDeductible, vatRate, setVatRate, priceProblem, setPriceProblem,
		isSaving, isDeleting, handleSubmit, handleDelete,
	};
}
