import React from "react";
import { PricelistServiceFormCategoryFields } from "./PricelistServiceFormCategoryFields";
import type {
	DoctorSpecialty,
	ServiceCategory,
} from "./servicePricelistPresets";

export interface PricelistServiceFormBasicFieldsProps {
	readonly code: string;
	readonly commercialTitle: string;
	readonly statutoryTitle: string;
	readonly category: ServiceCategory;
	readonly specialty: DoctorSpecialty;
	readonly onCodeChange: (code: string) => void;
	readonly onCommercialTitleChange: (title: string) => void;
	readonly onStatutoryTitleChange: (title: string) => void;
	readonly onCategoryChange: (cat: ServiceCategory) => void;
	readonly onSpecialtyChange: (spec: DoctorSpecialty) => void;
}

export const PricelistServiceFormBasicFields: React.FC<
	PricelistServiceFormBasicFieldsProps
> = (props) => {
	const {
		code,
		commercialTitle,
		statutoryTitle,
		category,
		specialty,
		onCodeChange,
		onCommercialTitleChange,
		onStatutoryTitleChange,
		onCategoryChange,
		onSpecialtyChange,
	} = props;

	return (
		<>
			<div
				className="pricelist-form-row"
				style={{
					display: "grid",
					gridTemplateColumns: "140px 1fr",
					gap: "0.75rem",
				}}
			>
				<div>
					<label htmlFor="service-form-code" className="pricelist-form-label">
						Код услуги
					</label>
					<input
						id="service-form-code"
						type="text"
						className="pricelist-search-input"
						style={{ height: "36px", fontWeight: 600 }}
						placeholder="A16.07.002"
						value={code}
						onChange={(e) => onCodeChange(e.target.value)}
					/>
				</div>
				<div>
					<label
						htmlFor="service-form-commercial-title"
						className="pricelist-form-label"
					>
						Наименование в прейскуранте клиники *
					</label>
					<input
						id="service-form-commercial-title"
						type="text"
						className="pricelist-search-input"
						style={{ height: "36px" }}
						placeholder="Лечение среднего кариеса световой пломбой"
						required
						value={commercialTitle}
						onChange={(e) => onCommercialTitleChange(e.target.value)}
					/>
				</div>
			</div>

			<div className="pricelist-form-row">
				<label
					htmlFor="service-form-statutory-title"
					className="pricelist-form-label"
				>
					Официальное наименование по стандарту
				</label>
				<input
					id="service-form-statutory-title"
					type="text"
					className="pricelist-search-input"
					style={{ height: "36px", fontSize: "0.8125rem" }}
					placeholder="Восстановление зуба пломбой..."
					value={statutoryTitle}
					onChange={(e) => onStatutoryTitleChange(e.target.value)}
				/>
			</div>

			<PricelistServiceFormCategoryFields
				category={category}
				specialty={specialty}
				onCategoryChange={onCategoryChange}
				onSpecialtyChange={onSpecialtyChange}
			/>
		</>
	);
};
