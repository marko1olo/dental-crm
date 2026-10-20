import React from 'react';

export interface PricelistServiceFormFooterProps {
	readonly isEditing: boolean;
	readonly onClose: () => void;
}

export const PricelistServiceFormFooter: React.FC<PricelistServiceFormFooterProps> = ({ isEditing, onClose }) => {
	return (
		<footer
			className="pricelist-footer-bar"
			style={{ justifyContent: 'flex-end', gap: '0.75rem', padding: '0.75rem 1.25rem' }}
		>
			<button
				type="button"
				className="pricelist-btn"
				style={{ minHeight: '36px', height: '36px', padding: '0 1rem' }}
				onClick={onClose}
			>
				Отмена
			</button>
			<button
				type="submit"
				className="pricelist-btn pricelist-btn-primary"
				style={{ minHeight: '36px', height: '36px', padding: '0 1.25rem', fontWeight: 600 }}
			>
				{isEditing ? 'Сохранить изменения' : 'Добавить в прейскурант'}
			</button>
		</footer>
	);
};
