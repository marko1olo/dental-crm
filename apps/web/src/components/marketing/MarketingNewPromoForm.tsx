/**
 * MarketingNewPromoForm.tsx — Form fields and submission for new marketing promo.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8e (Never Disabled).
 */

import React, { useState } from "react";
import { Plus } from "lucide-react";
import type { MarketingPromo } from "./marketingTypes";
import { showToast } from "../GlobalToast";

export interface MarketingNewPromoFormProps {
	readonly onSave: (promo: MarketingPromo) => void;
	readonly onClose: () => void;
}

export const MarketingNewPromoForm: React.FC<MarketingNewPromoFormProps> = ({
	onSave,
	onClose,
}) => {
	const [title, setTitle] = useState("");
	const [promoCode, setPromoCode] = useState("");
	const [category, setCategory] = useState("Профилактика и гигиена");
	const [discountText, setDiscountText] = useState("");
	const [validUntil, setValidUntil] = useState("31.12.2026");
	const [minInvoiceRub, setMinInvoiceRub] = useState(3000);
	const [description, setDescription] = useState("");
	const [templateSms, setTemplateSms] = useState(
		"{Имя}, здравствуйте! В клинике «{Клиника}» действует специальная акция по коду {Промокод}. Запись: {Ссылка}",
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedTitle = title.trim() || "Специальная акция клиники";
		const autoCode = `PROMO${Math.floor(1000 + Math.random() * 9000)}`;
		const trimmedCode = (promoCode.trim() || autoCode).toUpperCase();

		const newPromo: MarketingPromo = {
			id: `promo-custom-${Date.now()}`,
			title: trimmedTitle,
			badge: "Новая",
			status: "active",
			category,
			discountText: discountText.trim() || "Специальная цена",
			promoCode: trimmedCode,
			validUntil: validUntil || "31.12.2026",
			minInvoiceRub: Number(minInvoiceRub) || 0,
			description: description.trim() || "Индивидуальное специальное предложение клиники.",
			conditions: ["По предварительной записи", "Не суммируется с другими спецпредложениями"],
			stats: { reach: 0, delivered: 0, deliveredPercent: 100, visits: 0, conversionPercent: 0, revenueRub: 0, budgetSpentRub: 0, romiPercent: 0 },
			templates: {
				sms: templateSms || `{Имя}, здравствуйте! В клинике «{Клиника}» действует специальная акция по коду ${trimmedCode}. Запись: {Ссылка}`,
				whatsapp: `Здравствуйте, {Имя}!\n\nВ клинике *{Клиника}* действует акция «${trimmedTitle}»!\nПромокод: *${trimmedCode}*\nЗапись: {Ссылка}`,
				telegram: `{Имя}, для вас акция «${trimmedTitle}» в *{Клиника}*!\nПромокод: \`${trimmedCode}\`\nЗапись: {Ссылка}`,
			},
			recommendedSegment: "all_active",
			createdAt: new Date().toISOString(),
		};

		onSave(newPromo);
		showToast(`Акция «${trimmedTitle}» успешно создана!`, "info");
		onClose();
	};

	return (
		<form onSubmit={handleSubmit} className="marketing-modal-form">
			<div className="marketing-form-grid">
				<div className="marketing-form-field">
					<label htmlFor="promo-title" className="marketing-form-label">Название акции *</label>
					<input id="promo-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Профгигиена Air-Flow" className="marketing-form-input" data-testid="input-promo-title" />
				</div>
				<div className="marketing-form-field">
					<label htmlFor="promo-code" className="marketing-form-label">Промокод</label>
					<input id="promo-code" type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="HYGIENE3500" className="marketing-form-input uppercase" data-testid="input-promo-code" />
				</div>
				<div className="marketing-form-field">
					<label htmlFor="promo-category" className="marketing-form-label">Категория</label>
					<select id="promo-category" value={category} onChange={(e) => setCategory(e.target.value)} className="marketing-form-select">
						<option value="Профилактика и гигиена">Профилактика и гигиена</option>
						<option value="Терапия и эстетика">Терапия и эстетика</option>
						<option value="Ортодонтия и брекеты">Ортодонтия и брекеты</option>
						<option value="Имплантация и хирургия">Имплантация и хирургия</option>
						<option value="Семейная стоматология">Семейная стоматология</option>
					</select>
				</div>
				<div className="marketing-form-field">
					<label htmlFor="promo-discount" className="marketing-form-label">Выгода</label>
					<input id="promo-discount" type="text" value={discountText} onChange={(e) => setDiscountText(e.target.value)} placeholder="-15% или 3 500 ₽" className="marketing-form-input" />
				</div>
				<div className="marketing-form-field">
					<label htmlFor="promo-valid-until" className="marketing-form-label">Срок действия</label>
					<input id="promo-valid-until" type="text" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} placeholder="31.12.2026" className="marketing-form-input" />
				</div>
				<div className="marketing-form-field">
					<label htmlFor="promo-min-invoice" className="marketing-form-label">Мин. чек (₽)</label>
					<input id="promo-min-invoice" type="number" min="0" step="100" value={minInvoiceRub} onChange={(e) => setMinInvoiceRub(Number(e.target.value))} className="marketing-form-input" />
				</div>
			</div>
			<div className="marketing-form-field">
				<label htmlFor="promo-desc" className="marketing-form-label">Описание</label>
				<textarea id="promo-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание для регистратора…" className="marketing-form-textarea" />
			</div>
			<div className="marketing-modal-footer">
				<button type="button" className="secondary-button min-h-[36px]" onClick={onClose}>Отмена</button>
				<button type="submit" className="primary-button min-h-[36px]" data-testid="btn-save-new-promo">
					<Plus size={14} />
					<span>Создать акцию</span>
				</button>
			</div>
		</form>
	);
};
