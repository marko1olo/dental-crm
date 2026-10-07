import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
	Building,
	Calendar,
	CheckCircle,
	CreditCard,
	Receipt,
	Tag,
	X,
} from "lucide-react";
import {
	EXPENSE_CATEGORY_LABELS_RU,
	type ExpenseCategory,
	type ExpensePaymentMethod,
	rubToKopecks,
} from "@dental/shared";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { createExpense } from "../../lib/expensesApi";
import { showToast } from "../GlobalToast";
import "./QuickExpenseModal.css";

export interface QuickExpenseModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSuccess?: () => void;
	readonly initialCategory?: ExpenseCategory;
}

const COMMON_PRESETS = [
	{ label: "Расходники и перчатки", category: "supplies" as ExpenseCategory, vendor: "МедСнаб", description: "Перчатки, салфетки, маски" },
	{ label: "Аренда клиники", category: "rent" as ExpenseCategory, vendor: "Арендодатель", description: "Аренда помещения за текущий месяц" },
	{ label: "Оплата ЗТЛ (Коронки)", category: "lab_costs" as ExpenseCategory, vendor: "ЗТЛ Дент", description: "Оплата зуботехнических работ" },
	{ label: "Коммуналка и свет", category: "utilities" as ExpenseCategory, vendor: "Мосэнергосбыт", description: "Электроэнергия и водоснабжение" },
	{ label: "Интернет и телефония", category: "utilities" as ExpenseCategory, vendor: "Провайдер связи", description: "Связь и интернет в клинике" },
	{ label: "Реклама и таргет", category: "marketing" as ExpenseCategory, vendor: "Яндекс Директ", description: "Контекстная реклама и лидогенерация" },
];

const AMOUNT_PRESETS = [1000, 3000, 5000, 10000, 25000, 50000, 100000];

export const QuickExpenseModal: React.FC<QuickExpenseModalProps> = ({
	isOpen,
	onClose,
	onSuccess,
	initialCategory = "supplies",
}) => {
	const appLogic = useAppLogicContext();
	const auth = appLogic.auth;

	const todayIso = new Date().toISOString().slice(0, 10);

	const [category, setCategory] = useState<ExpenseCategory>(initialCategory);
	const [amountRubStr, setAmountRubStr] = useState<string>("");
	const [expenseDate, setExpenseDate] = useState<string>(todayIso);
	const [vendorName, setVendorName] = useState<string>("");
	const [description, setDescription] = useState<string>("");
	const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>("cashless_invoice");
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen) {
			setCategory(initialCategory);
			setExpenseDate(new Date().toISOString().slice(0, 10));
			setAmountRubStr("");
			setVendorName("");
			setDescription("");
			setPaymentMethod("cashless_invoice");
			setErrorMessage(null);
		}
	}, [isOpen, initialCategory]);

	// Desktop Keyboard Navigation: Esc closes modal
	useEffect(() => {
		const handleKeyDown = (e: globalThis.KeyboardEvent) => {
			if (e.key === "Escape" && isOpen && !isSubmitting) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, isSubmitting, onClose]);

	const applyPreset = useCallback((preset: typeof COMMON_PRESETS[0]) => {
		setCategory(preset.category);
		if (preset.vendor && !vendorName) setVendorName(preset.vendor);
		if (preset.description && !description) setDescription(preset.description);
	}, [vendorName, description]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMessage(null);

		const amountNum = parseFloat(amountRubStr.replace(/\s+/g, "").replace(",", "."));
		if (isNaN(amountNum) || amountNum <= 0) {
			setErrorMessage("Укажите корректную сумму расхода в рублях.");
			return;
		}

		if (!expenseDate || !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
			setErrorMessage("Укажите корректную дату расхода (ГГГГ-ММ-ДД).");
			return;
		}

		try {
			setIsSubmitting(true);
			const headers = auth.denteClinicalWriteHeaders();
			const amountKopecks = rubToKopecks(amountNum);

			await createExpense(headers, {
				category,
				amountKopecks,
				expenseDate,
				vendorName: vendorName.trim() || null,
				description: description.trim() || null,
				paymentMethod,
				periodicity: "one_time",
			});

			showToast("Расход успешно внесен в кассу и P&L", "success");
			onSuccess?.();
			onClose();
		} catch (err: any) {
			const msg = err.message || "Ошибка при сохранении расхода";
			setErrorMessage(msg);
			showToast(msg, "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="quick-expense-overlay" role="dialog" aria-modal="true">
			<div className="quick-expense-dialog">
				{/* Шапка */}
				<div className="quick-expense-header">
					<h2 className="quick-expense-title">
						<Receipt size={18} className="text-rose-600" />
						Внесение расхода клиники (1 клик)
					</h2>
					<button
						type="button"
						className="quick-expense-close-btn"
						onClick={onClose}
						disabled={isSubmitting}
						title="Закрыть (Esc)"
						aria-label="Закрыть"
					>
						<X size={16} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
					<div className="quick-expense-body">
						{errorMessage && (
							<div className="quick-expense-error" role="alert">
								{errorMessage}
							</div>
						)}

						{/* Быстрые шаблоны частых расходов для соло-врача (Мандат 8n) */}
						<div className="quick-expense-field">
							<span className="quick-expense-label">
								<Tag size={13} />
								Быстрые шаблоны:
							</span>
							<div className="quick-expense-presets-bar">
								{COMMON_PRESETS.map((p) => (
									<button
										key={p.label}
										type="button"
										className="quick-expense-preset-tag"
										onClick={() => applyPreset(p)}
									>
										{p.label}
									</button>
								))}
							</div>
						</div>

						{/* Сумма в рублях с чипами быстрого выбора */}
						<div className="quick-expense-field">
							<label htmlFor="quick-expense-amount" className="quick-expense-label">
								Сумма расхода (₽) *
							</label>
							<input
								id="quick-expense-amount"
								type="text"
								inputMode="decimal"
								required
								autoFocus
								placeholder="0.00"
								value={amountRubStr}
								onChange={(e) => setAmountRubStr(e.target.value)}
								className="quick-expense-input quick-expense-amount-input"
							/>
							<div className="quick-expense-amount-presets">
								{AMOUNT_PRESETS.map((val) => (
									<button
										key={val}
										type="button"
										className="quick-expense-amount-chip"
										onClick={() => setAmountRubStr(String(val))}
									>
										+{val.toLocaleString("ru-RU")} ₽
									</button>
								))}
							</div>
						</div>

						{/* Статья и способ оплаты */}
						<div className="quick-expense-field-row">
							<div className="quick-expense-field">
								<label htmlFor="quick-expense-category" className="quick-expense-label">
									Статья расхода *
								</label>
								<select
									id="quick-expense-category"
									value={category}
									onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
									className="quick-expense-select"
								>
									{Object.entries(EXPENSE_CATEGORY_LABELS_RU).map(([key, label]) => (
										<option key={key} value={key}>
											{label}
										</option>
									))}
								</select>
							</div>

							<div className="quick-expense-field">
								<label htmlFor="quick-expense-payment-method" className="quick-expense-label">
									<CreditCard size={13} />
									Источник списания *
								</label>
								<select
									id="quick-expense-payment-method"
									value={paymentMethod}
									onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
									className="quick-expense-select"
								>
									<option value="cashless_invoice">Безналичный расчет (по счету)</option>
									<option value="cash">Наличные из кассы клиники</option>
									<option value="corporate_card">Корпоративная карта</option>
									<option value="bank_transfer">Банковский перевод</option>
								</select>
							</div>
						</div>

						{/* Дата и Контрагент */}
						<div className="quick-expense-field-row">
							<div className="quick-expense-field">
								<label htmlFor="quick-expense-date" className="quick-expense-label">
									<Calendar size={13} />
									Дата расхода *
								</label>
								<input
									id="quick-expense-date"
									type="date"
									required
									value={expenseDate}
									onChange={(e) => setExpenseDate(e.target.value)}
									className="quick-expense-input"
								/>
							</div>

							<div className="quick-expense-field">
								<label htmlFor="quick-expense-vendor" className="quick-expense-label">
									<Building size={13} />
									Поставщик / Контрагент
								</label>
								<input
									id="quick-expense-vendor"
									type="text"
									placeholder="Например: ООО Дентал Маркет"
									value={vendorName}
									onChange={(e) => setVendorName(e.target.value)}
									className="quick-expense-input"
								/>
							</div>
						</div>

						{/* Назначение платежа / Комментарий */}
						<div className="quick-expense-field">
							<label htmlFor="quick-expense-desc" className="quick-expense-label">
								Назначение платежа / Примечание
							</label>
							<textarea
								id="quick-expense-desc"
								placeholder="Краткое описание закупки или счета..."
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								className="quick-expense-textarea"
								rows={2}
							/>
						</div>
					</div>

					{/* Подвал с кнопками */}
					<div className="quick-expense-footer">
						<button
							type="button"
							className="quick-expense-cancel-btn"
							onClick={onClose}
							disabled={isSubmitting}
						>
							Отмена
						</button>
						<button
							type="submit"
							className="quick-expense-submit-btn"
							disabled={isSubmitting}
						>
							<CheckCircle size={14} />
							{isSubmitting ? "Сохранение..." : "Провести расход"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
