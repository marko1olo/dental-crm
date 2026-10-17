/**
 * DENTE Dental CRM — Bottom Summary & Action Bar for Price List Diff
 * Layer 4: Presentation Subcomponent (Summary Counters, Primary CTA, Mandate 8e)
 */

import React from 'react';
import { Check } from 'lucide-react';
import type { PriceDiffSummaryBarProps } from './types';

export const PriceDiffSummaryBar: React.FC<PriceDiffSummaryBarProps> = ({
	approvedCount,
	totalCount,
	isLoading = false,
	onApply,
	onCancel,
}) => {
	const countToLoad = approvedCount || totalCount;

	return (
		<footer className="pricelist-diff-footer">
			<div className="pricelist-diff-footer-summary">
				{`Будет добавлено / обновлено ${approvedCount} услуг по стандарту Минздрава России`}
			</div>

			<div className="pricelist-diff-footer-actions">
				{onCancel && (
					<button
						type="button"
						className="pricelist-diff-btn shrink-0 min-w-fit px-3 text-xs sm:text-sm"
						onClick={onCancel}
					>
						Отмена
					</button>
				)}

				<button
					type="button"
					className="pricelist-diff-btn pricelist-diff-btn-primary shrink-0 min-w-fit px-3 text-xs sm:text-sm"
					onClick={onApply}
					title="Загрузить все утверждённые услуги в каталог клиники"
				>
					<Check size={13} className="shrink-0" />
					{isLoading ? (
						<span>Загрузка...</span>
					) : (
						<span>
							<span className="sm:hidden">
								{`Загрузить (${countToLoad})`}
							</span>
							<span className="hidden sm:inline">
								{`Загрузить в прейскурант (${countToLoad})`}
							</span>
						</span>
					)}
				</button>
			</div>
		</footer>
	);
};
