/**
 * apps/web/src/components/settings/pricesTab/PriceItemEditModal.tsx
 *
 * Единый канонический SSOT модального окна создания и редактирования услуг клиники (Мандаты 8aq, 8ap, 8e).
 * Объединяет студию каталога и настройки прейскуранта, исключая параллельные клоны и рассинхрон стилей.
 * Стандарты: Apple HIG (тактильный Drag Handle, тач >= 44x44px), WCAG AAA контраст, 0 disabled кнопок.
 */

import { Check, ReceiptText, X } from "lucide-react";
import type React from "react";
import { useId } from "react";
import { ServiceFormMetaFields } from "../ServiceFormMetaFields";
import {
	CANONICAL_CLINICAL_CATEGORIES,
	type PricelistCategoryKey,
	type PricelistStudioItem,
} from "../../catalog/pricelistCatalogData";
import type { PriceItemEditModalProps, ServiceEditFormData } from "./types";
import "./styles/catalogStyles/pricesModalEditor.css";

export interface DrawerModeProps {
	readonly isOpen: boolean;
	readonly editingItem?: PricelistStudioItem | null | undefined;
	readonly formCode?: string | undefined;
	readonly formTitle?: string | undefined;
	readonly formCategory?: PricelistCategoryKey | undefined;
	readonly formPriceRub?: string | undefined;
	readonly formCostRub?: string | undefined;
	readonly formDuration?: string | undefined;
	readonly onCodeChange?: ((val: string) => void) | undefined;
	readonly onTitleChange?: ((val: string) => void) | undefined;
	readonly onCategoryChange?: ((cat: PricelistCategoryKey) => void) | undefined;
	readonly onPriceChange?: ((val: string) => void) | undefined;
	readonly onCostChange?: ((val: string) => void) | undefined;
	readonly onDurationChange?: ((val: string) => void) | undefined;
	readonly onClose: () => void;
	readonly onSubmit?: ((e: React.FormEvent) => void) | undefined;
}

export type UnifiedPriceItemModalProps = PriceItemEditModalProps & DrawerModeProps;

export function PriceItemEditModal(props: Partial<UnifiedPriceItemModalProps> & { isOpen: boolean; onClose: () => void }) {
	const {
		isOpen,
		isNew: propIsNew,
		editServiceForm,
		setEditServiceForm,
		priceRubInput,
		setPriceRubInput,
		priceProblem,
		setPriceProblem,
		isSaving,
		serviceCategoryLabels,
		specialtyLabels,
		onClose,
		onSave,
		// Drawer mode props
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
		onSubmit,
	} = props;

	const codeId = useId();
	const titleId = useId();
	const priceId = useId();
	const costId = useId();
	const durationId = useId();
	const categoryId = useId();

	if (!isOpen) return null;

	const isDrawerMode = !editServiceForm && formTitle !== undefined;
	const isCreation = isDrawerMode ? !editingItem : Boolean(propIsNew);

	const currentTitle = isDrawerMode ? (formTitle ?? "") : (editServiceForm?.title ?? "");
	const currentCode = isDrawerMode ? (formCode ?? "") : (editServiceForm?.code ?? "");
	const currentPrice = isDrawerMode ? (formPriceRub ?? "0") : (priceRubInput ?? "");
	const currentCost = isDrawerMode
		? (formCostRub ?? "0")
		: String(editServiceForm?.materialsCostRub ?? 0);
	const currentDuration = isDrawerMode
		? (formDuration ?? "30")
		: String(editServiceForm?.durationMinutes ?? 30);
	const currentStandardCode =
		editServiceForm?.standardCode ??
		editServiceForm?.catalogCode ??
		editServiceForm?.order804nCode ??
		editServiceForm?.code ??
		"";

	const handleFormSubmit = (e: React.FormEvent) => {
		if (isDrawerMode && onSubmit) {
			onSubmit(e);
		} else if (onSave) {
			onSave(e);
		}
	};

	const modalTitle = isCreation
		? "Новая услуга клиники"
		: "Редактировать услугу";

	return (
		<div
			role="dialog"
			aria-modal="true"
			tabIndex={-1}
			className="premium-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			onKeyDown={(e) => {
				if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
					onClose();
				}
			}}
		>
			<div className="premium-modal-content w-full max-w-lg rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
				{/* Тактильный Drag Handle для Apple HIG сенсорного режима */}
				<div className="pricelist-drag-handle sm:hidden" />

				<header className="premium-modal-header px-5 py-4 border-b border-[var(--line)] flex items-center justify-between bg-[var(--paper-soft)]">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] flex items-center justify-center border border-[var(--teal)]/20 shrink-0">
							<ReceiptText size={18} />
						</div>
						<div>
							<h3 className="text-base font-bold text-[var(--ink)] m-0 leading-tight">
								{modalTitle}
							</h3>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
								Каталог и прейскурант медицинских услуг
							</p>
						</div>
					</div>
					<button
						type="button"
						className="premium-modal-close p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center"
						onClick={onClose}
						title="Закрыть окно"
						aria-label="Закрыть окно"
					>
						<X size={18} />
					</button>
				</header>

				<form onSubmit={handleFormSubmit} className="premium-modal-body p-5 space-y-4 overflow-y-auto flex flex-col">
					{/* Название услуги */}
					<div className="staff-form-group full-width">
						<label htmlFor="service-title-input">Название услуги *</label>
						<input
							id="service-title-input"
							type="text"
							value={currentTitle}
							onChange={(e) => {
								const val = e.target.value;
								if (isDrawerMode && onTitleChange) {
									onTitleChange(val);
								} else if (setEditServiceForm && editServiceForm) {
									setEditServiceForm({
										...editServiceForm,
										title: val,
									});
								}
							}}
							required
							placeholder="Например: Первичная консультация врача-терапевта"
							autoFocus
						/>
					</div>

					{/* Код и Цена в рублях с копейками */}
					<div className="staff-form-grid">
						<div className="staff-form-group">
							<label htmlFor="service-code-input">Код услуги / Артикул</label>
							<input
								id="service-code-input"
								type="text"
								value={currentCode}
								onChange={(e) => {
									const val = e.target.value;
									if (isDrawerMode && onCodeChange) {
										onCodeChange(val);
									} else if (setEditServiceForm && editServiceForm) {
										setEditServiceForm({
											...editServiceForm,
											code: val,
											catalogCode: editServiceForm.catalogCode || val,
											standardCode: editServiceForm.standardCode || val,
											order804nCode: editServiceForm.order804nCode || val,
										});
									}
								}}
								placeholder="Например: ТЕР-01 или ДИАГ-02"
							/>
						</div>
						<div className="staff-form-group">
							<label htmlFor="service-price-input">Цена (₽)</label>
							<input
								id="service-price-input"
								type="text"
								inputMode="decimal"
								value={currentPrice}
								onChange={(e) => {
									const val = e.target.value;
									if (isDrawerMode && onPriceChange) {
										onPriceChange(val);
									} else if (setPriceRubInput) {
										setPriceRubInput(val);
										if (setPriceProblem) setPriceProblem(null);
									}
								}}
								placeholder="например 1500 или 1500,50"
								required
							/>
							{priceProblem && (
								<small style={{ color: "var(--danger)", marginTop: "4px" }}>
									{priceProblem}
								</small>
							)}
						</div>
					</div>

					{/* Себестоимость расходников и Длительность */}
					<div className="staff-form-grid">
						<div className="staff-form-group">
							<label htmlFor="service-materials-cost-input">
								Себестоимость расходных материалов (₽)
							</label>
							<input
								id="service-materials-cost-input"
								type="text"
								inputMode="decimal"
								value={currentCost}
								onChange={(e) => {
									const val = e.target.value;
									if (isDrawerMode && onCostChange) {
										onCostChange(val);
									} else if (setEditServiceForm && editServiceForm) {
										setEditServiceForm({
											...editServiceForm,
											materialsCostRub: Number.parseFloat(val.replace(",", ".")) || 0,
										});
									}
								}}
								placeholder="0"
							/>
						</div>
						<div className="staff-form-group">
							<label htmlFor={durationId}>Длительность приёма (мин)</label>
							<select
								id={durationId}
								value={Number(currentDuration) || 30}
								onChange={(e) => {
									const val = e.target.value;
									if (isDrawerMode && onDurationChange) {
										onDurationChange(val);
									} else if (setEditServiceForm && editServiceForm) {
										setEditServiceForm({
											...editServiceForm,
											durationMinutes: Number.parseInt(val, 10) || 30,
										});
									}
								}}
							>
								<option value={15}>15 минут (осмотр, снимок)</option>
								<option value={30}>30 минут (стандартный приём)</option>
								<option value={45}>45 минут (терапия, реставрация)</option>
								<option value={60}>60 минут (1 час — эндодонтия, коронка)</option>
								<option value={90}>90 минут (1.5 часа — имплантация, брекеты)</option>
								<option value={120}>120 минут (2 часа — тотальная реабилитация)</option>
							</select>
						</div>
					</div>

					{/* 8 канонических клинических категорий стоматологии */}
					{isDrawerMode ? (
						<div className="staff-form-group full-width">
							<label htmlFor={categoryId}>Клиническая категория</label>
							<select
								id={categoryId}
								value={formCategory || "therapy"}
								onChange={(e) => onCategoryChange?.(e.target.value as PricelistCategoryKey)}
							>
								{CANONICAL_CLINICAL_CATEGORIES.map((cat) => (
									<option key={cat.key} value={cat.key}>
										{cat.title}
									</option>
								))}
							</select>
						</div>
					) : editServiceForm && setEditServiceForm ? (
						<>
							<div className="staff-form-group full-width">
								<label htmlFor="service-standard-code-input">
									Стандартный код услуги (для справок и налоговой)
								</label>
								<input
									id="service-standard-code-input"
									type="text"
									value={currentStandardCode}
									onChange={(e) => {
										const val = e.target.value;
										setEditServiceForm({
											...editServiceForm,
											catalogCode: val,
											standardCode: val,
											order804nCode: val,
										});
									}}
									placeholder="Опционально (например: A16.07.002)"
								/>
							</div>

							<ServiceFormMetaFields
								editServiceForm={editServiceForm}
								setEditServiceForm={setEditServiceForm}
								serviceCategoryLabels={serviceCategoryLabels || {}}
								specialtyLabels={specialtyLabels || {}}
							/>
						</>
					) : null}

					{/* Единый подвал: ровно 1 Primary CTA кнопка (Мандат 8e — кнопка НИКОГДА не disabled) */}
					<div className="premium-modal-footer px-5 py-3.5 border-t border-[var(--line)] flex flex-col sm:flex-row items-center justify-end gap-2.5 bg-[var(--paper-soft)]">
						<button
							type="button"
							className="secondary-button w-full sm:w-auto min-h-[44px] sm:min-h-[36px] h-11 sm:h-9"
							onClick={onClose}
						>
							Отмена
						</button>
						<button
							type="submit"
							className="primary-button w-full sm:w-auto min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 inline-flex items-center justify-center gap-1.5 font-semibold text-white bg-[var(--teal)] hover:bg-[var(--teal-dark)] transition-colors rounded-xl border-none cursor-pointer"
							aria-busy={Boolean(isSaving)}
						>
							<Check size={16} />
							<span>
								{isSaving
									? "Сохранение..."
									: isCreation
										? "✓ Добавить услугу"
										: "Сохранить"}
							</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

/** Алиасы для обратной совместимости со всеми существующими импортами */
export const PriceItemModal = PriceItemEditModal;
export default PriceItemEditModal;
