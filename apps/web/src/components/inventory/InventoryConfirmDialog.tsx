/**
 * Окно подтверждения удаления на складе.
 *
 * Обработчики handleDeleteItem и handleDeleteRule давно складывали в состояние
 * `confirmDialog` заголовок, текст и действие — а рисовать это состояние было
 * нечем: в разметке экрана оно только доставалось из хука и нигде не
 * использовалось, компонента подтверждения в проекте не существовало вовсе.
 *
 * Наружу это выглядело так: кладовщик жмёт корзину у материала или у правила
 * списания — и не происходит ничего. Ни окна, ни удаления, ни ошибки, ни даже
 * подсветки. Самый неприятный вид поломки: человек нажимает второй раз,
 * третий, потом решает, что программа зависла.
 *
 * Спрашивать здесь обязательно. Материал со склада и правило списания удаляются
 * насовсем, а правило ещё и молча перестаёт списывать расходники с приёмов.
 */
type InventoryConfirmDialogProps = {
	title: string;
	message: string;
	confirmLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
};

export function InventoryConfirmDialog({
	title,
	message,
	confirmLabel = "Удалить",
	onConfirm,
	onCancel,
}: InventoryConfirmDialogProps) {
	return (
		<div
			className="inventory-confirm-backdrop"
			role="presentation"
			onClick={(event) => event.target === event.currentTarget && onCancel()}
		>
			<div
				className="inventory-confirm-window"
				role="alertdialog"
				aria-modal="true"
				aria-label={title}
			>
				<h3>{title}</h3>
				<p>{message}</p>
				<div className="inventory-confirm-actions">
					{/*
					  Отмена стоит первой и получает автофокус: случайный Enter или
					  пробел сразу после нажатия на корзину не должен удалять материал.
					*/}
					<button
						type="button"
						className="inventory-confirm-cancel"
						onClick={onCancel}
						autoFocus
					>
						Отмена
					</button>
					<button
						type="button"
						className="inventory-confirm-danger"
						onClick={onConfirm}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
