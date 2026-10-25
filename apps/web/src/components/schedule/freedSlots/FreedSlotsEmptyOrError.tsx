import React from "react";

interface EmptyStateProps {
	message?: string;
}

export const FreedSlotsEmptyState: React.FC<EmptyStateProps> = () => {
	return (
		<section className="panel ops-panel" data-testid="freed-slots-panel">
			<div className="panel-heading">
				<h2>Освободившиеся окна</h2>
				<span className="status-pill status-planned">0</span>
			</div>
			<p style={{ color: "var(--muted)", fontSize: "0.8125rem", padding: "1rem", margin: 0 }}>
				На ближайшие дни отменённых приёмов нет. При отмене слота система автоматически предложит кандидатов из листа ожидания.
			</p>
		</section>
	);
};

interface ErrorNoticeProps {
	error: string;
	loading: boolean;
	onRetry: () => void;
}

export const FreedSlotsErrorNotice: React.FC<ErrorNoticeProps> = ({ error, loading, onRetry }) => {
	return (
		<div className="ops-notice ops-notice--error" role="alert">
			<p>{error}</p>
			<p>
				Освободившиеся окна сейчас не видны, но они есть: это отменённые и пропущенные приёмы за ближайшие дни.
				Пока список не открылся, время таких приёмов считайте свободным и сверяйтесь с расписанием дня вручную,
				иначе час кресла простоит зря.
			</p>
			<button className="secondary-button" type="button" onClick={onRetry} disabled={loading}>
				{loading ? "Загружаю…" : "Попробовать снова"}
			</button>
		</div>
	);
};
