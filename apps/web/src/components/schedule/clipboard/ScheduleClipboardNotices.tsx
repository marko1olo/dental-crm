import type React from "react";

interface ScheduleClipboardNoticesProps {
	error: string | null;
	loading: boolean;
	itemCount: number;
	onRetry: () => void;
}

export const ScheduleClipboardNotices: React.FC<ScheduleClipboardNoticesProps> = ({
	error,
	loading,
	itemCount,
	onRetry,
}) => {
	if (error) {
		return (
			<div className="ops-notice ops-notice--error" role="alert">
				<p>{error}</p>
				<p>
					Буфер сейчас не виден, но скопированные приёмы могут быть в базе.
					Пока список не открылся, переносите записи кнопкой «Повторить» на
					карточке или создайте приём формой выше.
				</p>
				<button
					className="secondary-button pointer-coarse:min-h-[44px]"
					type="button"
					onClick={() => {
						if (!loading) onRetry();
					}}
					aria-busy={loading || undefined}
				>
					{loading ? "Загружаю…" : "Попробовать снова"}
				</button>
			</div>
		);
	}

	if (loading && itemCount === 0) {
		return (
			<div className="ops-skeleton" aria-hidden="true">
				<span className="ops-skeleton__line" />
				<span className="ops-skeleton__line" />
			</div>
		);
	}

	if (!loading && itemCount === 0) {
		return (
			<div className="ops-notice" data-testid="schedule-clipboard-empty">
				<p>
					<strong>Буфер пуст</strong>
				</p>
				<p className="ops-hint">
					На карточке приёма нажмите «В буфер» — снимок появится здесь. Затем
					укажите новое время и нажмите «Вставить». Исходная запись в сетке
					останется на месте.
				</p>
			</div>
		);
	}

	return null;
};
