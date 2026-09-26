/**
 * apps/web/src/components/settings/migration/MigrationRunningPanel.tsx
 *
 * Панель отображения хода выполнения переноса (сухого или боевого).
 * Включает прогресс-бар, фазы, счётчики и защиту от зависаний (Zero Dead-Ends).
 *
 * Mandate 8b: Строго <= 800 строк.
 * Mandate 8d: Ноль мультяшных эмодзи.
 */

import { AlertCircle, RotateCcw } from "lucide-react";
import type { RunStatus } from "./migrationTypes";

export function MigrationRunningPanel(props: {
	status: RunStatus | null;
	dryRun: boolean;
	onCancel?: () => void;
}) {
	const percent = props.status?.run.progress.percent ?? 0;
	const phase =
		props.status?.run.phase ?? "Задача принята, ожидает исполнителя…";

	return (
		<div className="mw-panel mw-running">
			<div
				className="mw-progress"
				role="progressbar"
				aria-valuenow={percent}
				aria-valuemin={0}
				aria-valuemax={100}
			>
				<div className="mw-progress-bar" style={{ width: `${percent}%` }} />
			</div>
			<p className="mw-running-phase">{phase}</p>
			<p className="mw-running-percent">{percent}%</p>

			{props.status !== null && (
				<div className="mw-running-counters">
					<span>уложено {props.status.run.counters.stagedRows}</span>
					<span>создано {props.status.run.counters.loadedRows}</span>
					<span>обновлено {props.status.run.counters.updatedRows}</span>
					<span>дублей {props.status.run.counters.duplicateRows}</span>
					<span>карантин {props.status.run.counters.quarantinedRows}</span>
				</div>
			)}

			{props.status !== null && props.status.run.worker.resumeCount > 0 && (
				<div className="mw-alert mw-alert-info">
					Прогон был прерван и возобновлён (
					{props.status.run.worker.resumeCount}). Продолжение идёт с тех строк,
					которые ещё не загружены — дубликатов не будет.
				</div>
			)}

			{props.status?.run.errorMessage && (
				<div className="mw-alert mw-alert-bad" role="alert">
					<AlertCircle size={16} className="shrink-0" />
					<span>{props.status.run.errorMessage}</span>
				</div>
			)}

			<p className="mw-running-note">
				{props.dryRun
					? "Идёт сухой прогон: валидация строк и связей без записи в базу данных."
					: "Идёт запись в базу. Окно можно закрыть — перенос продолжится на сервере в фоновом режиме."}
			</p>

			{/* Кнопка безопасного выхода при затяжном ожидании (Zero Dead-Ends) */}
			{props.onCancel && (
				<div className="mt-4 flex justify-center">
					<button
						type="button"
						className="mw-btn mw-btn-ghost text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
						onClick={props.onCancel}
					>
						<RotateCcw size={14} className="inline mr-1" />
						Остановить ожидание и вернуться к сопоставлению
					</button>
				</div>
			)}
		</div>
	);
}
