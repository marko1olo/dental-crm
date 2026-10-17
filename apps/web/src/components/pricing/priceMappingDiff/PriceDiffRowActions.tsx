import React from 'react';
import { Check, Link2, Plus } from 'lucide-react';
import type { IngestedMappingItem } from './itemTypes';

export interface PriceDiffRowActionsProps {
	readonly item: IngestedMappingItem;
	readonly isLinking: boolean;
	readonly onSetCreateNew: () => void;
	readonly onStartLinking: () => void;
	readonly onCancelLinking: () => void;
	readonly onToggleApprove: () => void;
}

export const PriceDiffRowActions: React.FC<PriceDiffRowActionsProps> = ({
	item,
	isLinking,
	onSetCreateNew,
	onStartLinking,
	onCancelLinking,
	onToggleApprove,
}) => {
	return (
		<div className="pricelist-diff-row-actions">
			<button
				type="button"
				className={`pricelist-diff-action-btn ${item.suggestedAction === 'create_new' ? 'active' : ''}`}
				onClick={onSetCreateNew}
				title="Создать новую услугу в прейскуранте"
			>
				<Plus size={11} />
				<span>Новая</span>
			</button>

			<button
				type="button"
				className={`pricelist-diff-action-btn ${item.suggestedAction === 'link_existing' ? 'active' : ''}`}
				onClick={isLinking ? onCancelLinking : onStartLinking}
				title="Привязать к существующей позиции каталога"
			>
				<Link2 size={11} />
				<span>Привязать</span>
			</button>

			<button
				type="button"
				className={`pricelist-diff-icon-btn ${item.isApproved ? 'approved' : ''}`}
				onClick={onToggleApprove}
				title={
					item.isApproved
						? 'Услуга будет загружена (нажмите, чтобы исключить)'
						: 'Исключено из загрузки (нажмите, чтобы включить)'
				}
				aria-label={item.isApproved ? 'Исключить услугу' : 'Включить услугу'}
			>
				<Check size={13} />
			</button>
		</div>
	);
};
