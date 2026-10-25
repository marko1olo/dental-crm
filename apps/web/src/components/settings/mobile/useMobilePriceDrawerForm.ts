import { useState, useEffect } from "react";
import { normalizeRubAmountInput } from "../../../rubAmountInput";
import { rubToPriceInput } from "../pricelistEditorHelpers";

interface UseMobilePriceDrawerFormParams {
	isOpen: boolean;
	service: any | null;
	onSave: (servicePayload: any, serviceId?: string) => Promise<void>;
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
		if (service) {
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
	}, [service]);

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
				category,
				specialty,
				durationMinutes,
				taxDeductible,
				vatRate,
				active: true,
			}, service?.id);
			onClose();
		} catch (err) {
			console.error("[MobilePriceDrawer] Save error:", err);
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
			console.error("[MobilePriceDrawer] Delete error:", err);
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
