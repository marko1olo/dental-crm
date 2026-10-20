import React from 'react';
import { Filter } from 'lucide-react';
import { type DoctorSpecialty, SPECIALTY_LABELS } from './servicePricelistPresets';

export interface PricelistToolbarSpecialtySelectProps {
	readonly selectedSpecialty: DoctorSpecialty | 'all';
	readonly onSpecialtyChange: (specialty: DoctorSpecialty | 'all') => void;
}

export const PricelistToolbarSpecialtySelect: React.FC<PricelistToolbarSpecialtySelectProps> = ({
	selectedSpecialty,
	onSpecialtyChange,
}) => {
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
			<Filter size={14} style={{ color: 'var(--muted)' }} />
			<select
				className="pricelist-search-input"
				style={{ height: '36px', padding: '0 0.5rem', width: 'auto', fontSize: '0.8125rem' }}
				value={selectedSpecialty}
				onChange={(e) => onSpecialtyChange(e.target.value as DoctorSpecialty | 'all')}
			>
				<option value="all">Все специальности</option>
				{Object.entries(SPECIALTY_LABELS).map(([specKey, specLabel]) => (
					<option key={specKey} value={specKey}>
						{specLabel}
					</option>
				))}
			</select>
		</div>
	);
};
