import { Database } from "lucide-react";
import { formatDateTime } from "./AuditBrowserContinuityPanel";

export function AuditImportHistoryPanel({ dashboard }: { dashboard: any }) {
	const typedImportBatches = (dashboard?.importBatches || []) as any[];

	return (
		<div className="panel import-history-panel">
			<div className="panel-heading">
				<h2>Пакеты импорта</h2>
				<span className="status-pill status-arrived">
					{(typedImportBatches || []).length}
				</span>
			</div>
			<div className="ops-list">
				{(typedImportBatches || []).length ? (
					(typedImportBatches || []).map((batch: any) => (
						<article className="ops-row" key={batch.id}>
							<Database aria-hidden="true" />
							<div>
								<h3>{batch.sourceName}</h3>
								<p>
									{batch.importedRows} строк | {batch.skippedRows} пропущено |{" "}
									{formatDateTime(batch.createdAt)}
								</p>
							</div>
							<span>
								{batch.status === "completed" ? "Завершено" : "В процессе"}
							</span>
						</article>
					))
				) : (
					<article className="ops-empty">
						<Database aria-hidden="true" />
						<p>Система импорта пока не обрабатывала пакеты данных.</p>
					</article>
				)}
			</div>
		</div>
	);
}
