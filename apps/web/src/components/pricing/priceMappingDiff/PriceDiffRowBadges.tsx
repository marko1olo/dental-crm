import React from 'react';
import type { MappingConfidenceKind, MappingSuggestedAction } from './itemTypes';

export interface PriceDiffRowBadgesProps {
	readonly confidence: number;
	readonly kind: MappingConfidenceKind;
	readonly action: MappingSuggestedAction;
}

export const PriceDiffRowBadges: React.FC<PriceDiffRowBadgesProps> = ({
	confidence,
	kind,
	action,
}) => {
	const percent = Math.round(confidence * 100);

	const renderConfidenceBadge = () => {
		if (kind === 'exact_code') {
			return (
				<span
					className="pricelist-diff-confidence-badge exact"
					title="Точный код классификатора Минздрава"
				>
					{`${percent}% Код услуги`}
				</span>
			);
		}
		if (confidence >= 0.85 || kind === 'high_keyword') {
			return (
				<span
					className="pricelist-diff-confidence-badge high"
					title="Высокая уверенность сопоставления по клиническим ключевым словам"
				>
					{`${percent}% Высокая`}
				</span>
			);
		}
		if (confidence >= 0.70 || kind === 'medium_keyword') {
			return (
				<span
					className="pricelist-diff-confidence-badge medium"
					title="Средняя уверенность"
				>
					{`${percent}% Средняя`}
				</span>
			);
		}
		return (
			<span
				className="pricelist-diff-confidence-badge low"
				title="Низкая уверенность: требуется ручной выбор соответствия стандарту"
			>
				{`${percent}% Требует выбора`}
			</span>
		);
	};

	const renderActionBadge = () => {
		switch (action) {
			case 'create_new':
				return <span className="pricelist-diff-action-tag create">+ Новая</span>;
			case 'update_existing':
				return <span className="pricelist-diff-action-tag update">Обновить цену</span>;
			case 'link_existing':
				return <span className="pricelist-diff-action-tag link">Привязана</span>;
			case 'identical':
				return <span className="pricelist-diff-action-tag">Без изменений</span>;
			default:
				return null;
		}
	};

	return (
		<>
			{renderConfidenceBadge()}
			{renderActionBadge()}
		</>
	);
};
