/**
 * MarketingNewPromoModal.tsx — Single-Surface Modal for creating a new promotion.
 * Anti-Matryoshka (Strict Depth = 1), Clean Inputs, 1-Click Save.
 */

import React, { useState } from "react";
import { X, Sparkles, Plus, Tag } from "lucide-react";
import type { MarketingPromo } from "./marketingTypes";
import { showToast } from "../GlobalToast";

export interface MarketingNewPromoModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSave: (promo: MarketingPromo) => void;
}

export const MarketingNewPromoModal: React.FC<MarketingNewPromoModalProps> = ({
	isOpen,
	onClose,
	onSave,
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

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedTitle = title.trim();
		const trimmedCode = promoCode.trim().toUpperCase();

		if (!trimmedTitle || !trimmedCode) {
			showToast("Заполните название и промокод акции", "warning");
			return;
		}

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
			stats: {
				reach: 0,
				delivered: 0,
				deliveredPercent: 100,
				visits: 0,
				conversionPercent: 0,
				revenueRub: 0,
				budgetSpentRub: 0,
				romiPercent: 0,
			},
			templates: {
				sms: templateSms,
				whatsapp: `Здравствуйте, {Имя}!\n\nВ клинике *{Клиника}* действует акция «${trimmedTitle}»!\nПромокод: *{Промокод}*\nЗапись: {Ссылка}`,
				telegram: `{Имя}, для вас акция «${trimmedTitle}» в *{Клиника}*!\nПромокод: \`{Промокод}\`\nЗапись: {Ссылка}`,
			},
			recommendedSegment: "all_active",
			createdAt: new Date().toISOString(),
		};

		onSave(newPromo);
		showToast(`Акция «${trimmedTitle}» успешно создана!`, "info");
		onClose();
	};

	return (
		<div className="marketing-modal-backdrop" onClick={onClose} role="presentation">
			<div
				className="marketing-modal-content"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-labelledby="new-promo-modal-title"
				data-testid="new-promo-modal"
			>
				<div className="marketing-modal-header">
					<div className="flex items-center gap-2">
						<Sparkles size={18} className="text-teal" aria-hidden="true" />
						<h3 id="new-promo-modal-title" className="marketing-modal-title">
							Новая маркетинговая акция
						</h3>
					</div>
					<button
						type="button"
						className="marketing-modal-close-btn"
						onClick={onClose}
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="marketing-modal-form">
					<div className="marketing-form-grid">
						<div className="marketing-form-field">
							<label htmlFor="promo-title" className="marketing-form-label">
								Название акции *
							</label>
							<input
								id="promo-title"
								type="text"
								required
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Например: Профгигиена Air-Flow 3 500 ₽"
								className="marketing-form-input"
								data-testid="input-promo-title"
							/>
						</div>

						<div className="marketing-form-field">
							<label htmlFor="promo-code" className="marketing-form-label">
								Промокод (латиница/цифры) *
							</label>
							<div className="relative">
								<input
									id="promo-code"
									type="text"
									required
									value={promoCode}
									onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
									placeholder="HYGIENE3500"
									className="marketing-form-input uppercase"
									data-testid="input-promo-code"
								/>
							</div>
						</div>

						<div className="marketing-form-field">
							<label htmlFor="promo-category" className="marketing-form-label">
								Категория услуг
							</label>
							<select
								id="promo-category"
								value={category}
								onChange={(e) => setCategory(e.target.value)}
								className="marketing-form-select"
							>
								<option value="Профилактика и гигиена">Профилактика и гигиена</option>
								<option value="Терапия и эстетика">Терапия и эстетика</option>
								<option value="Ортодонтия и брекеты">Ортодонтия и брекеты</option>
								<option value="Имплантация и хирургия">Имплантация и хирургия</option>
								<option value="Семейная стоматология">Семейная стоматология</option>
								<option value="Диагностика и КТ">Диагностика и КТ</option>
							</select>
						</div>

						<div className="marketing-form-field">
							<label htmlFor="promo-discount" className="marketing-form-label">
								Размер скидки / выгоды
							</label>
							<input
								id="promo-discount"
								type="text"
								value={discountText}
								onChange={(e) => setDiscountText(e.target.value)}
								placeholder="Например: 3 500 ₽ вместо 5 000 ₽ или -15%"
								className="marketing-form-input"
							/>
						</div>

						<div className="marketing-form-field">
							<label htmlFor="promo-valid-until" className="marketing-form-label">
								Срок действия
							</label>
							<input
								id="promo-valid-until"
								type="text"
								value={validUntil}
								onChange={(e) => setValidUntil(e.target.value)}
								placeholder="31.12.2026 или Бессрочно"
								className="marketing-form-input"
							/>
						</div>

						<div className="marketing-form-field">
							<label htmlFor="promo-min-invoice" className="marketing-form-label">
								Мин. чек для применения (₽)
							</label>
							<input
								id="promo-min-invoice"
								type="number"
								min="0"
								step="100"
								value={minInvoiceRub}
								onChange={(e) => setMinInvoiceRub(Number(e.target.value))}
								className="marketing-form-input"
							/>
						</div>
					</div>

					<div className="marketing-form-field">
						<label htmlFor="promo-desc" className="marketing-form-label">
							Краткое описание для администратора
						</label>
						<textarea
							id="promo-desc"
							rows={2}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Что входит в услугу, кому предлагать…"
							className="marketing-form-textarea"
						/>
					</div>

					<div className="marketing-form-field">
						<label htmlFor="promo-template" className="marketing-form-label">
							Шаблон SMS рассылки
						</label>
						<textarea
							id="promo-template"
							rows={2}
							value={templateSms}
							onChange={(e) => setTemplateSms(e.target.value)}
							className="marketing-form-textarea text-xs font-mono"
						/>
					</div>

					<div className="marketing-modal-footer">
						<button
							type="button"
							className="secondary-button min-h-[36px]"
							onClick={onClose}
						>
							Отмена
						</button>
						<button
							type="submit"
							className="primary-button min-h-[36px]"
							data-testid="btn-save-new-promo"
						>
							<Plus size={14} />
							<span>Создать акцию</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
