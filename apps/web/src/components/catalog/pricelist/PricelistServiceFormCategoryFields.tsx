import React from 'react';
import { CATEGORY_LABELS, type DoctorSpecialty, type Order804nCategory, SPECIALTY_LABELS } from './servicePricelistPresets';

export interface PricelistServiceFormCategoryFieldsProps {
	readonly category: Order804nCategory;
	readonly specialty: DoctorSpecialty;
	readonly onCategoryChange: (cat: Order804nCategory) => void;
	readonly onSpecialtyChange: (spec: DoctorSpecialty) => void;
}

export const PricelistServiceFormCategoryFields: React.FC<PricelistServiceFormCategoryFieldsProps> = ({
	category,
	specialty,
	onCategoryChange,
	onSpecialtyChange,
}) => {
	return (
		<div className="pricelist-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
			<div>
				<label htmlFor="service-form-category" className="pricelist-form-label">Раздел прейскуранта</label>
				<select
					id="service-form-category"
					className="pricelist-search-input"
					style={{ height: '36px' }}
					value={category}
					onChange={(e) => onCategoryChange(e.target.value as Order804nCategory)}
				>
					{Object.entries(CATEGORY_LABELS).map(([k, label]) => (
						<option key={k} value={k}>{label}</option>
					))}
				</select>
			</div>
			<div>
				<label htmlFor="service-form-specialty" className="pricelist-form-label">Специальность врача</label>
				<select
					id="service-form-specialty"
					className="pricelist-search-input"
					style={{ height: '36px' }}
					value={specialty}
					onChange={(e) => onSpecialtyChange(e.target.value as DoctorSpecialty)}
				>
					{Object.entries(SPECIALTY_LABELS).map(([k, label]) => (
						<option key={k} value={k}>{label}</option>
					))}
				</select>
			</div>
		</div>
	);
};
