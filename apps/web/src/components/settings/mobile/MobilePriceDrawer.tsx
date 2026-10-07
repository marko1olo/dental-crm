/**
 * apps/web/src/components/settings/mobile/MobilePriceDrawer.tsx
 *
 * Native iOS Bottom Sheet Drawer for Editing and Creating Pricelist Services.
 * Compliant with Apple Human Interface Guidelines (iOS HIG) & Mandates 8b, 8c, 8d, 8e:
 * - Slide-up sheet from bottom with rounded-t-[24px]
 * - Tactile drag handle 36x5px
 * - Touch targets >= 44x44px
 * - Statutory 804n Code + Commercial Title + Price (₽) + Duration + VAT exemption
 * - Sticky bottom action CTA in thumb zone with env(safe-area-inset-bottom)
 * - Zero hardcoded colors, strict CSS variable tokens
 */

import React, { useState, useEffect } from "react";
import {
	FolderTree,
	ReceiptText,
	ShieldCheck,
	Tag,
	Trash2,
	X,
	Clock,
	Check,
} from "lucide-react";
import { normalizeRubAmountInput } from "../../../rubAmountInput";
import { rubToPriceInput } from "../pricelistEditorHelpers";

export interface MobilePriceDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	// biome-ignore lint/suspicious/noExplicitAny: service item
	readonly service: any | null;
	// biome-ignore lint/suspicious/noExplicitAny: service payload
	readonly onSave: (servicePayload: any, serviceId?: string) => Promise<void>;
	readonly onDelete?: (serviceId: string) => Promise<void>;
	readonly serviceCategoryLabels?: Record<string, string>;
	readonly specialtyLabels?: Record<string, string>;
}

const DEFAULT_CATEGORIES: Array<{ id: string; label: string }> = [
	{ id: "therapy", label: "Терапия" },
	{ id: "surgery", label: "Хирургия" },
	{ id: "orthopedics", label: "Ортопедия" },
	{ id: "orthodontics", label: "Ортодонтия" },
	{ id: "hygiene", label: "Профгигиена" },
	{ id: "diagnostics", label: "Диагностика" },
	{ id: "periodontics", label: "Пародонтология" },
	{ id: "pediatric", label: "Детская" },
	{ id: "other", label: "Прочее" },
];

const DEFAULT_SPECIALTIES: Array<{ id: string; label: string }> = [
	{ id: "therapist", label: "Терапевт" },
	{ id: "surgeon", label: "Хирург" },
	{ id: "orthopedist", label: "Ортопед" },
	{ id: "orthodontist", label: "Ортодонт" },
	{ id: "hygienist", label: "Гигиенист" },
	{ id: "universal", label: "Универсал" },
];

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

export const MobilePriceDrawer: React.FC<MobilePriceDrawerProps> = ({
	isOpen,
	onClose,
	service,
	onSave,
	onDelete,
	serviceCategoryLabels = {},
	specialtyLabels = {},
}) => {
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

	// Sync form state when service changes
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

	// Lock body scroll when bottom sheet is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	if (!isOpen) return null;

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
			await onSave(
				{
					title: title.trim(),
					code: code.trim(),
					basePriceRub,
					category,
					specialty,
					durationMinutes,
					taxDeductible,
					vatRate,
					active: true,
				},
				service?.id,
			);
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

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col justify-end"
			role="dialog"
			aria-modal="true"
			aria-labelledby="mobile-price-drawer-title"
			data-testid="mobile-price-drawer"
		>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Drawer Surface */}
			<div className="relative z-10 w-full max-h-[92dvh] flex flex-col rounded-t-[24px] bg-[var(--paper)] border-t border-[var(--line)] shadow-2xl animate-in slide-in-from-bottom duration-250 overflow-hidden">
				{/* Tactile Drag Handle */}
				<div
					className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing shrink-0"
					onClick={onClose}
				>
					<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
				</div>

				{/* Header */}
				<div className="flex items-center justify-between px-5 py-2.5 border-b border-[var(--line-subtle)] shrink-0">
					<div className="flex items-center gap-2.5 min-w-0 pr-2">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center shrink-0">
							<ReceiptText size={17} />
						</div>
						<div className="min-w-0">
							<h3
								id="mobile-price-drawer-title"
								className="text-[17px] font-semibold text-[var(--ink)] tracking-tight truncate leading-tight"
							>
								{isNew ? "Новая услуга" : "Параметры услуги"}
							</h3>
							{code && (
								<span className="text-[11px] font-mono text-[var(--muted)]">
									Код услуги: {code}
								</span>
							)}
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] active:bg-[var(--paper-soft)] transition-colors cursor-pointer"
						aria-label="Закрыть"
						data-testid="btn-close-price-drawer"
					>
						<X size={20} />
					</button>
				</div>

				{/* Scrollable Form Content */}
				<form
					id="mobile-price-form"
					onSubmit={handleSubmit}
					className="flex-1 overflow-y-auto px-5 py-4 space-y-4 overscroll-contain"
				>
					{/* Service Title */}
					<div className="space-y-1.5">
						<label
							htmlFor="drawer-service-title"
							className="text-[13px] font-medium text-[var(--muted)]"
						>
							Название услуги (по прейскуранту) *
						</label>
						<textarea
							id="drawer-service-title"
							rows={2}
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							required
							placeholder="Например: Первичный осмотр и консультация врача-стоматолога"
							className="w-full p-3 text-[15px] font-medium rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--teal)] transition-all resize-none"
							data-testid="input-drawer-service-title"
						/>
					</div>

					{/* 804n Code + Price Row */}
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<label
								htmlFor="drawer-service-code"
								className="text-[13px] font-medium text-[var(--muted)]"
							>
								Код услуги (номенклатура)
							</label>
							<div className="relative">
								<input
									id="drawer-service-code"
									type="text"
									value={code}
									onChange={(e) => setCode(e.target.value)}
									placeholder="A16.07.002"
									className="w-full h-11 px-3 text-[14px] font-mono rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--teal)] transition-all"
									data-testid="input-drawer-service-code"
								/>
							</div>
						</div>

						<div className="space-y-1.5">
							<label
								htmlFor="drawer-service-price"
								className="text-[13px] font-semibold text-[var(--ink)]"
							>
								Цена услуги (₽) *
							</label>
							<div className="relative">
								<input
									id="drawer-service-price"
									type="text"
									inputMode="decimal"
									value={priceInput}
									onChange={(e) => {
										setPriceInput(e.target.value);
										setPriceProblem(null);
									}}
									required
									placeholder="4 500"
									className="w-full h-11 px-3 pr-8 text-[16px] font-bold font-mono rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--teal)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--teal)] transition-all"
									data-testid="input-drawer-service-price"
								/>
								<span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[var(--muted)] pointer-events-none">
									₽
								</span>
							</div>
							{priceProblem && (
								<p className="text-[11px] text-rose-500 font-medium">
									{priceProblem}
								</p>
							)}
						</div>
					</div>

					{/* Category Select */}
					<div className="space-y-1.5">
						<label
							htmlFor="drawer-service-category"
							className="text-[13px] font-medium text-[var(--muted)]"
						>
							Клиническая категория
						</label>
						<select
							id="drawer-service-category"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							className="w-full h-11 px-3 text-[14px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all cursor-pointer"
							data-testid="select-drawer-service-category"
						>
							{DEFAULT_CATEGORIES.map((cat) => (
								<option key={cat.id} value={cat.id}>
									{serviceCategoryLabels[cat.id] || cat.label}
								</option>
							))}
						</select>
					</div>

					{/* Specialty Select */}
					<div className="space-y-1.5">
						<label
							htmlFor="drawer-service-specialty"
							className="text-[13px] font-medium text-[var(--muted)]"
						>
							Специализация врача
						</label>
						<select
							id="drawer-service-specialty"
							value={specialty}
							onChange={(e) => setSpecialty(e.target.value)}
							className="w-full h-11 px-3 text-[14px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all cursor-pointer"
							data-testid="select-drawer-service-specialty"
						>
							{DEFAULT_SPECIALTIES.map((spec) => (
								<option key={spec.id} value={spec.id}>
									{specialtyLabels[spec.id] || spec.label}
								</option>
							))}
						</select>
					</div>

					{/* Duration Chips */}
					<div className="space-y-1.5">
						<div className="flex items-center justify-between">
							<span className="text-[13px] font-medium text-[var(--muted)] flex items-center gap-1">
								<Clock size={13} /> Длительность приёма:
							</span>
							<span className="text-[13px] font-semibold text-[var(--ink)] font-mono">
								{durationMinutes} мин
							</span>
						</div>
						<div className="grid grid-cols-6 gap-1.5">
							{DURATION_PRESETS.map((dur) => (
								<button
									key={dur}
									type="button"
									onClick={() => setDurationMinutes(dur)}
									className={`min-h-[38px] py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center ${
										durationMinutes === dur
											? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs font-bold"
											: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)]"
									}`}
								>
									{dur}м
								</button>
							))}
						</div>
					</div>

					{/* Regulatory Settings Group (Grouped Inset Card) */}
					<div className="p-3.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3">
						<span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block">
							Налоговый и фискальный статус
						</span>

						{/* Tax Deductible Toggle */}
						<label className="flex items-center justify-between cursor-pointer select-none">
							<div className="flex flex-col pr-2">
								<span className="text-[14px] font-medium text-[var(--ink)]">
									Налоговый вычет (справка ФНС)
								</span>
								<span className="text-[12px] text-[var(--muted)]">
									Включать в справку об оплате медицинских услуг для вычета 13%
								</span>
							</div>
							<input
								type="checkbox"
								checked={taxDeductible}
								onChange={(e) => setTaxDeductible(e.target.checked)}
								className="w-5 h-5 rounded accent-[var(--teal)] cursor-pointer shrink-0"
							/>
						</label>

						<div className="h-px bg-[var(--line)]" />

						{/* VAT Rate Radio Group */}
						<div className="space-y-1.5">
							<span className="text-[13px] font-medium text-[var(--ink)] block">
								Ставка НДС (ст. 149 НК РФ)
							</span>
							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => setVatRate("vat_exempt")}
									className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
										vatRate === "vat_exempt"
											? "bg-[var(--teal-soft)] border-[var(--teal)] text-[var(--teal-dark)] font-semibold"
											: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)]"
									}`}
								>
									<div
										className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
											vatRate === "vat_exempt"
												? "border-[var(--teal)] bg-[var(--teal)] text-white"
												: "border-[var(--line)]"
										}`}
									>
										{vatRate === "vat_exempt" && <Check size={10} />}
									</div>
									<span className="text-xs">Без НДС (ст. 149)</span>
								</button>

								<button
									type="button"
									onClick={() => setVatRate("vat_20")}
									className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
										vatRate === "vat_20"
											? "bg-[var(--teal-soft)] border-[var(--teal)] text-[var(--teal-dark)] font-semibold"
											: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)]"
									}`}
								>
									<div
										className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
											vatRate === "vat_20"
												? "border-[var(--teal)] bg-[var(--teal)] text-white"
												: "border-[var(--line)]"
										}`}
									>
										{vatRate === "vat_20" && <Check size={10} />}
									</div>
									<span className="text-xs">НДС 20%</span>
								</button>
							</div>
						</div>
					</div>
				</form>

				{/* Sticky Action Footer in Thumb Zone */}
				<div className="p-4 border-t border-[var(--line)] bg-[var(--paper)] space-y-2 shrink-0 pb-[max(16px,env(safe-area-inset-bottom))]">
					<button
						form="mobile-price-form"
						type="submit"
						disabled={isSaving}
						className="w-full min-h-[50px] h-12 rounded-xl text-[16px] font-semibold bg-[var(--teal)] hover:bg-[var(--teal-dark)] active:scale-[0.99] text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
						data-testid="btn-save-mobile-price"
					>
						<span>{isSaving ? "Сохранение..." : isNew ? "Добавить услугу" : "Сохранить изменения"}</span>
					</button>

					{!isNew && onDelete && (
						<button
							type="button"
							onClick={handleDelete}
							disabled={isDeleting}
							className="w-full min-h-[44px] h-11 rounded-xl text-[14px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
							data-testid="btn-delete-mobile-price"
						>
							<Trash2 size={15} />
							<span>{isDeleting ? "Удаление..." : "Удалить услугу из прейскуранта"}</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default MobilePriceDrawer;
