import type React from "react";
import { CheckCircle2, ReceiptText } from "lucide-react";
import type { DentalSpecialty, ServiceCategory } from "@dental/shared";

export interface ServiceFormState {
	title: string;
	code: string;
	catalogCode?: string;
	standardCode?: string;
	order804nCode?: string;
	category: ServiceCategory;
	specialty: DentalSpecialty;
	basePriceRub: number;
	materialsCostRub?: number;
	durationMinutes: number;
	taxDeductible: boolean;
	vatRate?: "vat_exempt" | "vat_0" | "vat_20" | undefined;
	active: boolean;
}

export interface ServiceFormMetaFieldsProps {
	readonly editServiceForm: ServiceFormState;
	readonly setEditServiceForm: React.Dispatch<
		React.SetStateAction<ServiceFormState>
	>;
	readonly serviceCategoryLabels: Record<string, string>;
	readonly specialtyLabels: Record<string, string>;
}

export const ServiceFormMetaFields: React.FC<ServiceFormMetaFieldsProps> = ({
	editServiceForm,
	setEditServiceForm,
	serviceCategoryLabels,
	specialtyLabels,
}) => {
	return (
		<>
			<div className="staff-form-grid">
				<div className="staff-form-group">
					<label htmlFor="service-category-select">Категория</label>
					<select
						id="service-category-select"
						value={editServiceForm.category}
						onChange={(e) =>
							setEditServiceForm((prev) => ({
								...prev,
								category: e.target.value as ServiceCategory,
							}))
						}
					>
						{Object.entries(serviceCategoryLabels).map(([key, label]) => (
							<option key={key} value={key}>
								{label}
							</option>
						))}
					</select>
				</div>
				<div className="staff-form-group">
					<label htmlFor="service-specialty-select">
						Специализация врача
					</label>
					<select
						id="service-specialty-select"
						value={editServiceForm.specialty}
						onChange={(e) =>
							setEditServiceForm((prev) => ({
								...prev,
								specialty: e.target.value as DentalSpecialty,
							}))
						}
					>
						{Object.entries(specialtyLabels).map(([key, label]) => (
							<option key={key} value={key}>
								{label}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="staff-form-grid">
				<div className="staff-form-group">
					<label htmlFor="service-duration-select">
						Длительность (мин)
					</label>
					<select
						id="service-duration-select"
						value={editServiceForm.durationMinutes}
						onChange={(e) =>
							setEditServiceForm((prev) => ({
								...prev,
								durationMinutes: Number.parseInt(e.target.value, 10),
							}))
						}
					>
						<option value={15}>15 минут</option>
						<option value={30}>30 минут</option>
						<option value={45}>45 минут</option>
						<option value={60}>1 час</option>
						<option value={90}>1.5 часа</option>
						<option value={120}>2 часа</option>
						<option value={180}>3 часа</option>
					</select>
				</div>
				<div className="staff-form-group">
					<label htmlFor="service-tax-status">Налогообложение (НДС)</label>
					<div
						id="service-tax-status"
						className="flex items-center h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--muted)] font-medium"
						title="Медицинские услуги освобождены от налогообложения НДС на основании пп. 2 п. 2 ст. 149 НК РФ"
					>
						Без НДС (пп. 2 п. 2 ст. 149 НК РФ)
					</div>
				</div>
			</div>

			<div className="permissions-box" style={{ marginTop: "8px" }}>
				<label className="permission-toggle">
					<input
						type="checkbox"
						checked={editServiceForm.taxDeductible}
						onChange={(e) =>
							setEditServiceForm((prev) => ({
								...prev,
								taxDeductible: e.target.checked,
							}))
						}
					/>
					<span className="flex items-center gap-1.5">
						<ReceiptText
							size={14}
							className="text-amber-600 dark:text-amber-400 shrink-0"
						/>{" "}
						Учитывать в справках на налоговый вычет
					</span>
				</label>
				<label className="permission-toggle">
					<input
						type="checkbox"
						checked={editServiceForm.active}
						onChange={(e) =>
							setEditServiceForm((prev) => ({
								...prev,
								active: e.target.checked,
							}))
						}
					/>
					<span className="flex items-center gap-1.5">
						<CheckCircle2
							size={14}
							className="text-emerald-600 dark:text-emerald-400 shrink-0"
						/>{" "}
						Услуга активна (доступна для записи)
					</span>
				</label>
			</div>
		</>
	);
};
