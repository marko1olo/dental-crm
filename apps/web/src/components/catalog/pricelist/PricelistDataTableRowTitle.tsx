import React from "react";
import type { ServicePricelistItem } from "./servicePricelistPresets";

export interface PricelistDataTableRowTitleProps {
	readonly item: ServicePricelistItem;
	readonly onEditItem: (item: ServicePricelistItem) => void;
}

export const PricelistDataTableRowTitle: React.FC<
	PricelistDataTableRowTitleProps
> = ({ item, onEditItem }) => {
	const statutory = item.statutoryTitle || item.statutoryTitle804n;
	const hasDistinctStatutory =
		statutory && statutory.trim() !== item.commercialTitle.trim();

	return (
		<td>
			<div className="service-title-cell">
				<button
					type="button"
					className="service-commercial-name"
					onClick={() => onEditItem(item)}
					title="Редактировать услугу"
				>
					{item.commercialTitle}
				</button>
				{hasDistinctStatutory && (
					<div className="service-statutory-name" title="Наименование по Номенклатуре">
						{statutory}
					</div>
				)}
				{item.icd10Indications.length > 0 && (
					<div className="service-meta-tags">
						<span className="service-icd-label">МКБ:</span>
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
