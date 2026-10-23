import React from "react";

export interface ClinicalTasksNoticeProps {
	readonly error: string | null;
	readonly loading: boolean;
	readonly actionError: string | null;
	readonly actionNotice: string | null;
	readonly isTasksNull: boolean;
	readonly onRetry: () => void;
}

export const ClinicalTasksNotice: React.FC<ClinicalTasksNoticeProps> = ({
	error,
	loading,
	actionError,
	actionNotice,
	isTasksNull,
	onRetry,
}) => {
	return (
		<>
			{error ? (
				<div className="ops-notice ops-notice--error" role="alert">
					<p>{error}</p>
					<p>
						Список задач передачи сейчас не виден. Пока он не открылся,
						передавайте пациента следующему врачу устно и сверяйтесь с картой вручную.
					</p>
					<button
						className="secondary-button"
						type="button"
						onClick={onRetry}
						disabled={false}
					>
						{loading ? "Загружаю…" : "Попробовать снова"}
					</button>
				</div>
			) : null}

			{isTasksNull && !error ? (
				<div className="ops-skeleton" aria-hidden="true">
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
				</div>
			) : null}

			{actionError ? (
				<div className="ops-notice ops-notice--error" role="alert">
					<p>{actionError}</p>
				</div>
			) : null}

			{actionNotice ? (
				<div className="ops-notice" role="status">
					<p>{actionNotice}</p>
				</div>
			) : null}
		</>
	);
};
