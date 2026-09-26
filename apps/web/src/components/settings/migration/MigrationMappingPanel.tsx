/**
 * apps/web/src/components/settings/migration/MigrationMappingPanel.tsx
 *
 * Панель сопоставления колонок источника с полями карточки пациента.
 * Показывает проекцию переноса, качество данных, предупреждения и кнопку сухого прогона.
 *
 * Mandate 8b: Строго <= 800 строк.
 * Mandate 8d: Ноль мультяшных эмодзи.
 */

import {
	DECISION_TITLES,
	formatBytes,
	type MapResponse,
	type UploadResponse,
} from "./migrationTypes";

export function MigrationMappingPanel(props: {
	upload: UploadResponse;
	mapping: MapResponse | null;
	busy: boolean;
	allowLlm: boolean;
	onAllowLlmChange: (value: boolean) => void;
	onDryRun: () => void;
	onLiveRun: () => void;
	onRestart: () => void;
}) {
	const { upload, mapping } = props;
	const blockers =
		(mapping?.qualityFindings ?? []).filter(
			(item) => item?.severity === "blocker",
		) ?? [];

	return (
		<div className="mw-panel">
			<div className="mw-source-card">
				<div className="mw-source-main">
					<span className="mw-source-name">{upload?.fileName}</span>
					<span className="mw-source-meta">
						{formatBytes(upload?.byteSize ?? 0)} ·{" "}
						{(upload?.source?.kind ?? "").toUpperCase()} · кодировка{" "}
						{upload?.source?.detectedEncoding}
						{(upload?.source?.encodingConfidence ?? 0) < 0.8 && (
							<em className="mw-uncertain">
								{" "}
								(определена неуверенно — проверьте ФИО ниже)
							</em>
						)}
					</span>
				</div>
				<button
					type="button"
					className="mw-btn mw-btn-ghost"
					onClick={props.onRestart}
				>
					Другой файл
				</button>
			</div>

			{upload?.previousRunWithSameFile != null && (
				<div className="mw-alert mw-alert-info">
					Этот файл уже загружался{" "}
					{new Date(upload.previousRunWithSameFile.uploadedAt).toLocaleString(
						"ru-RU",
					)}
					. Повторный перенос не создаст дублей: уже перенесённые записи будут
					обновлены.
				</div>
			)}

			{props.busy && mapping === null && (
				<div className="mw-loading">Определяем колонки…</div>
			)}

			{mapping !== null && (
				<>
					<div className="mw-projection">
						<div className="mw-proj-item mw-proj-ok">
							<span className="mw-proj-value">
								{mapping?.projectedReady ?? 0}
							</span>
							<span className="mw-proj-label">перенесётся</span>
						</div>
						<div className="mw-proj-item mw-proj-warn">
							<span className="mw-proj-value">
								{mapping?.projectedQuarantine ?? 0}
							</span>
							<span className="mw-proj-label">в карантин</span>
						</div>
						<div className="mw-proj-item">
							<span className="mw-proj-value">
								{(mapping?.mapping?.columns ?? []).length}
							</span>
							<span className="mw-proj-label">колонок сопоставлено</span>
						</div>
						{(mapping?.llm?.calls ?? 0) > 0 && (
							<div className="mw-proj-item">
								<span className="mw-proj-value">
									{mapping?.llm?.rejectedSuggestions ?? 0}
								</span>
								<span className="mw-proj-label">ответов модели отклонено</span>
							</div>
						)}
					</div>

					<table className="mw-mapping-table" aria-label="Соответствие колонок">
						<thead>
							<tr className="mw-mapping-row mw-mapping-head">
								<th scope="col">Колонка источника</th>
								<th scope="col">Поле карточки</th>
								<th scope="col">Решение</th>
								<th scope="col">Форма значений</th>
							</tr>
						</thead>
						<tbody>
							{(mapping?.mapping?.columns ?? []).map((column) => (
								<tr className="mw-mapping-row" key={column.sourceColumn}>
									<td className="mw-col-source">{column.sourceColumn}</td>
									<td className="mw-col-target">{column.targetField}</td>
									<td>
										<span
											className={`mw-badge mw-badge-${column.decidedBy}`}
											title={column.rationale}
										>
											{DECISION_TITLES[column.decidedBy] ?? column.decidedBy}
										</span>
										<span className="mw-confidence">
											{Math.round((column.confidence ?? 0) * 100)}%
										</span>
									</td>
									{/* Маски, а не значения: настоящие ФИО и телефоны на экран не выводятся. */}
									<td className="mw-col-shapes">
										{(column.sampleValues ?? []).join("  ")}
									</td>
								</tr>
							))}
						</tbody>
					</table>

					{(mapping?.mapping?.unmappedColumns ?? []).length > 0 && (
						<div className="mw-alert mw-alert-warn">
							Не сопоставлены:{" "}
							{(mapping?.mapping?.unmappedColumns ?? []).join(", ")}. Их
							содержимое сохранится в исходном виде, но в поля карточки не
							запишется.
						</div>
					)}

					{(mapping?.qualityFindings ?? []).length > 0 && (
						<details className="mw-findings" open={blockers.length > 0}>
							<summary>
								Замечания к источнику: {(mapping?.qualityFindings ?? []).length}
								{blockers.length > 0 && (
									<span className="mw-findings-bad">
										{" "}
										· {blockers.length} блокирующих
									</span>
								)}
							</summary>
							<ul>
								{(mapping?.qualityFindings ?? [])
									.slice(0, 20)
									.map((finding) => (
										<li
											key={`finding-${finding.severity}-${finding.message}`}
											className={`mw-finding mw-finding-${finding.severity}`}
										>
											{finding.message}
											{(finding.affectedRows ?? 0) > 0 && (
												<span className="mw-finding-rows">
													{" "}
													— строк: {finding.affectedRows}
												</span>
											)}
										</li>
									))}
							</ul>
						</details>
					)}

					<div className="mw-actions">
						<button
							type="button"
							className="mw-btn mw-btn-primary"
							onClick={props.onDryRun}
							disabled={props.busy}
						>
							Сухой прогон
						</button>
						<span className="mw-actions-note">
							Сухой прогон проверяет всё до последней строки и ничего не
							записывает. Запись станет доступна после него.
						</span>
					</div>
				</>
			)}
		</div>
	);
}
