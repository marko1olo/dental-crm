/**
 * apps/web/src/components/catalog/PricelistItemDrawer.tsx
 *
 * Нативный Bottom Sheet / Модальная форма создания и редактирования услуги.
 * Стандарты: Apple HIG (Touch >= 44px, Drag Handle), Мандат 8e (кнопка сохранения никогда не disabled).
 */

import React, { useId } from "react";
import { Check, X } from "lucide-react";
import {
	CANONICAL_CLINICAL_CATEGORIES,
	type PricelistCategoryKey,
	type PricelistStudioItem,
} from "./pricelistCatalogData";

export interface PricelistItemDrawerProps {
	readonly isOpen: boolean;
	readonly editingItem: PricelistStudioItem | null;
	readonly formCode: string;
	readonly formTitle: string;
	readonly formCategory: PricelistCategoryKey;
	readonly formPriceRub: string;
	readonly formCostRub: string;
	readonly formDuration: string;
	readonly onCodeChange: (val: string) => void;
	readonly onTitleChange: (val: string) => void;
	readonly onCategoryChange: (cat: PricelistCategoryKey) => void;
	readonly onPriceChange: (val: string) => void;
	readonly onCostChange: (val: string) => void;
	readonly onDurationChange: (val: string) => void;
	readonly onClose: () => void;
	readonly onSubmit: (e: React.FormEvent) => void;
}

export const PricelistItemDrawer: React.FC<PricelistItemDrawerProps> = ({
	isOpen,
	editingItem,
	formCode,
	formTitle,
	formCategory,
	formPriceRub,
	formCostRub,
	formDuration,
	onCodeChange,
	onTitleChange,
	onCategoryChange,
	onPriceChange,
	onCostChange,
	onDurationChange,
	onClose,
	onSubmit,
}) => {
	const codeId = useId();
	const titleId = useId();
	const categoryId = useId();
	const priceId = useId();
	const costId = useId();
	const durationId = useId();

	if (!isOpen) return null;

	return (
		<div className="pricelist-form-drawer-overlay" role="dialog" aria-modal="true">
			<div className="pricelist-form-drawer">
				<div className="pricelist-drag-handle sm:hidden" />
				<header className="pricelist-form-header">
					<h3 className="font-bold text-base text-[var(--ink)]">
						{editingItem ? "Редактирование услуги" : "Новая услуга клиники"}
					</h3>
					<button
						type="button"
						className="pricelist-btn pricelist-btn-icon"
						onClick={onClose}
						aria-label="Закрыть форму"
					>
						<X size={18} />
					</button>
				</header>

				<form onSubmit={onSubmit}>
					<div className="pricelist-form-body">
						<div className="pricelist-field-group">
							<label htmlFor={codeId} className="pricelist-field-label">Артикул / Код</label>
							<input
								id={codeId}
								type="text"
								className="pricelist-input"
								value={formCode}
								onChange={(e) => onCodeChange(e.target.value)}
								placeholder="ТЕР-01"
							/>
						</div>

						<div className="pricelist-field-group">
							<label htmlFor={titleId} className="pricelist-field-label">Наименование услуги *</label>
							<input
								id={titleId}
								type="text"
								required
								className="pricelist-input"
								value={formTitle}
								onChange={(e) => onTitleChange(e.target.value)}
								placeholder="Например, Лечение кариеса"
							/>
						</div>

						<div className="pricelist-field-group">
							<label htmlFor={categoryId} className="pricelist-field-label">Клиническая категория</label>
							<select
								id={categoryId}
								className="pricelist-input"
								value={formCategory}
								onChange={(e) => onCategoryChange(e.target.value as PricelistCategoryKey)}
							>
								{CANONICAL_CLINICAL_CATEGORIES.map((cat) => (
									<option key={cat.key} value={cat.key}>
										{cat.title}
									</option>
								))}
							</select>
						</div>

						<div className="grid grid-cols-3 gap-2">
							<div className="pricelist-field-group">
								<label htmlFor={priceId} className="pricelist-field-label">Цена (₽) *</label>
								<input
									id={priceId}
									type="text"
									className="pricelist-input font-bold"
									value={formPriceRub}
									onChange={(e) => onPriceChange(e.target.value)}
									placeholder="3500"
								/>
							</div>
							<div className="pricelist-field-group">
								<label htmlFor={costId} className="pricelist-field-label">Себест. (₽)</label>
								<input
									id={costId}
									type="text"
									className="pricelist-input"
									value={formCostRub}
									onChange={(e) => onCostChange(e.target.value)}
									placeholder="500"
								/>
							</div>
							<div className="pricelist-field-group">
								<label htmlFor={durationId} className="pricelist-field-label">Мин.</label>
								<input
									id={durationId}
									type="number"
									className="pricelist-input"
									value={formDuration}
									onChange={(e) => onDurationChange(e.target.value)}
									placeholder="30"
								/>
							</div>
						</div>
					</div>

					<footer className="pricelist-form-footer">
						<button type="button" className="pricelist-btn" onClick={onClose}>
							Отмена
						</button>
						<button type="submit" className="pricelist-btn pricelist-btn-primary">
							<Check size={16} />
							<span>{editingItem ? "✓ Сохранить услугу" : "✓ Добавить услугу"}</span>
						</button>
					</footer>
				</form>
			</div>
		</div>
	);
};
