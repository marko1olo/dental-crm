import type React from "react";
import { CheckCircle2, ReceiptText } from "lucide-react";
import type { DentalSpecialty, ServiceCategory } from "@dental/shared";

export interface ServiceFormMetaFieldsProps {
	readonly editServiceForm: {
		title: string;
		code: string;
		category: ServiceCategory;
		specialty: DentalSpecialty;
		basePriceRub: number;
		durationMinutes: number;
		taxDeductible: boolean;
		vatRate: "vat_exempt" | "vat_0" | "vat_20";
		active: boolean;
	};
	readonly setEditServiceForm: React.Dispatch<
		React.SetStateAction<{
			title: string;
			code: string;
			category: ServiceCategory;
			specialty: DentalSpecialty;
			basePriceRub: number;
			durationMinutes: number;
			taxDeductible: boolean;
			vatRate: "vat_exempt" | "vat_0" | "vat_20";
			active: boolean;
		}>
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
					<label htmlFor="service-vat-select">Ставка НДС</label>
					<select
						id="service-vat-select"
						value={editServiceForm.vatRate || "vat_exempt"}
						onChange={(e) =>
							setEditServiceForm((prev) => ({
								...prev,
								vatRate: e.target.value as "vat_exempt" | "vat_0" | "vat_20",
							}))
						}
					>
						<option value="vat_exempt">
							Без НДС (Медицинские услуги)
						</option>
						<option value="vat_0">НДС 0%</option>
						<option value="vat_20">
							НДС 20% (косметология, отбеливание, товары)
						</option>
					</select>
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
