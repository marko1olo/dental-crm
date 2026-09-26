/**
 * apps/web/src/components/settings/migration/MigrationReportPanel.tsx
 *
 * Панель итогового акта сверки после завершения переноса данных.
 *
 * Mandate 8b: Строго <= 800 строк.
 * Mandate 8d: Ноль мультяшных эмодзи.
 */

import { AlertTriangle, Check, X } from "lucide-react";
import { useState } from "react";
import {
	AUTHED_API_FILE_FAILURE,
	downloadAuthedApiFile,
} from "../../../lib/authedApiFile";
import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";
import {
	REASON_TITLES,
	type ReconciliationResponse,
	type RunStatus,
} from "./migrationTypes";

export function Counter(props: {
	label: string;
	value: number;
	tone?: "ok" | "warn";
}) {
	return (
		<div className={`mw-counter ${props.tone ? `is-${props.tone}` : ""}`}>
			<span className="mw-counter-value">{props.value}</span>
			<span className="mw-counter-label">{props.label}</span>
		</div>
	);
}

/**
 * Кнопка скачивания акта сверки через защищённый fetch с токеном.
 */
export function ReconciliationActDownloadButton(props: { runId: string }) {
	const [failure, setFailure] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	return (
		<>
			<button
				type="button"
				className="mw-btn mw-btn-ghost"
				disabled={busy}
				onClick={async () => {
					setFailure(null);
					setBusy(true);
					let objectUrl: string | null = null;
					try {
						objectUrl = await downloadAuthedApiFile(
							`/api/migration/${props.runId}/reconciliation.csv`,
							`акт-сверки-${props.runId}.csv`,
						);
					} catch (error) {
						showToast(
							actionFailureToast(
								"Ошибка скачивания файла",
								(error as { status?: number })?.status ?? null,
							),
							"error",
						);
						setFailure(
							error instanceof Error ? error.message : AUTHED_API_FILE_FAILURE,
						);
					} finally {
						setBusy(false);
						if (objectUrl)
							window.setTimeout(
								() => URL.revokeObjectURL(objectUrl as string),
								60_000,
							);
					}
				}}
			>
				{busy ? "Готовим акт…" : "Скачать акт сверки"}
			</button>
			{failure !== null && <span className="mw-error">{failure}</span>}
		</>
	);
}

export function MigrationReportPanel(props: {
	report: ReconciliationResponse;
	status: RunStatus;
	dryRun: boolean;
	runId: string;
	busy: boolean;
	onLiveRun: () => void;
	onRollback: () => void;
	onRestart: () => void;
	downloadButton?: React.ReactNode;
}) {
	const { report, status } = props;

	return (
		<div className="mw-panel">
			<div className={`mw-verdict ${report.balanced ? "is-ok" : "is-bad"}`}>
				<span className="mw-verdict-mark" aria-hidden="true">
					{report.balanced ? <Check size={18} /> : <AlertTriangle size={18} />}
				</span>
				<div>
					<strong>
						{report.balanced ? "Сверка сошлась" : "Сверка НЕ сошлась"}
					</strong>
					<p>
						{report.balanced
							? props.dryRun
								? "Проверены все строки. Расхождений нет — можно переносить в базу."
								: "Каждая строка источника учтена. Перенос завершён."
							: "Часть строк не учтена. Перенос нельзя считать завершённым — разберите расхождения ниже."}
					</p>
				</div>
			</div>

			<div className="mw-counters">
				<Counter
					label="Строк в источнике"
					value={status.run.counters.sourceRows}
				/>
				{props.dryRun ? (
					<Counter
						label="Готовы к переносу"
						value={Math.max(
							0,
							status.run.counters.sourceRows -
								status.run.counters.quarantinedRows,
						)}
						tone="ok"
					/>
				) : (
					<>
						<Counter
							label="Создано"
							value={status.run.counters.loadedRows}
							tone="ok"
						/>
						<Counter
							label="Обновлено"
							value={status.run.counters.updatedRows}
						/>
						<Counter label="Дублей" value={status.run.counters.duplicateRows} />
					</>
				)}
				<Counter
					label="В карантине"
					value={status.run.counters.quarantinedRows}
					tone="warn"
				/>
				{!props.dryRun && (
					<Counter label="Пропущено" value={status.run.counters.skippedRows} />
				)}
			</div>

			<div className="mw-checks">
				{(report?.checks ?? []).map((check) => (
					<div
						className={`mw-check ${check.passed ? "is-ok" : "is-bad"}`}
						key={check.code}
					>
						<span className="mw-check-mark" aria-hidden="true">
							{check.passed ? <Check size={12} /> : <X size={12} />}
						</span>
						<div className="mw-check-body">
							<strong>{check.title}</strong>
							<span className="mw-check-numbers">
								ожидалось {check.expected}, получено {check.actual}
							</span>
							<p className="mw-check-detail">{check.detail}</p>
						</div>
					</div>
				))}
			</div>

			{(report?.quarantinePreview ?? []).length > 0 && (
				<details className="mw-quarantine" open>
					<summary>
						Карантин: {(report?.quarantinePreview ?? []).length} записей на
						разбор
					</summary>
					<ul>
						{(report?.quarantinePreview ?? []).slice(0, 25).map((item) => (
							<li key={item.id} className={item.blocking ? "is-blocking" : ""}>
								<span className="mw-q-reason">
									{REASON_TITLES[item.reason] ?? item.reason}
								</span>
								{item.sourceRowNumber !== null && (
									<span className="mw-q-row">
										строка {item.sourceRowNumber}
									</span>
								)}
								<span className="mw-q-message">{item.message}</span>
								{item.suggestedFix !== null && (
									<span className="mw-q-fix">{item.suggestedFix}</span>
								)}
							</li>
						))}
					</ul>
				</details>
			)}

			<div className="mw-actions">
				{props.dryRun && report.balanced && (
					<button
						type="button"
						className="mw-btn mw-btn-danger"
						onClick={props.onLiveRun}
						disabled={props.busy}
					>
						Перенести в базу
					</button>
				)}
				{!props.dryRun && (
					<button
						type="button"
						className="mw-btn mw-btn-ghost"
						onClick={props.onRollback}
						disabled={props.busy}
					>
						Откатить перенос
					</button>
				)}
				{props.downloadButton ?? (
					<ReconciliationActDownloadButton runId={props.runId} />
				)}
				<button
					type="button"
					className="mw-btn mw-btn-ghost"
					onClick={props.onRestart}
				>
					Перенести ещё файл
				</button>
			</div>
		</div>
	);
}
