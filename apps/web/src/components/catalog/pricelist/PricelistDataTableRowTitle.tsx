import React from 'react';
import type { ServicePricelistItem } from './servicePricelistPresets';

export interface PricelistDataTableRowTitleProps {
	readonly item: ServicePricelistItem;
	readonly onEditItem: (item: ServicePricelistItem) => void;
}

export const PricelistDataTableRowTitle: React.FC<PricelistDataTableRowTitleProps> = ({
	item,
	onEditItem,
}) => {
	return (
		<td>
			<div className="service-title-cell">
				<div
					className="service-commercial-name"
					style={{ cursor: 'pointer' }}
					onClick={() => onEditItem(item)}
					title="Редактировать услугу"
				>
					{item.commercialTitle}
				</div>
				<div className="service-statutory-name">{item.statutoryTitle804n}</div>
				{item.icd10Indications.length > 0 && (
					<div className="service-meta-tags">
						{item.icd10Indications.map((icd) => (
							<span key={icd} className="service-icd-pill">
								{icd}
							</span>
						))}
					</div>
				)}
			</div>
		</td>
	);
};
