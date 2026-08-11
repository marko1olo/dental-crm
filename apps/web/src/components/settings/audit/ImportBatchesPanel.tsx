import { formatDateTime } from "../../../AppHelpers";
import { Database } from "lucide-react";

export function ImportBatchesPanel({ typedImportBatches }: any) {
    return (
        <div className="panel import-history-panel">
						<div className="panel-heading">
							<h2>История миграций</h2>
							<span className="status-pill status-arrived">
								{typedImportBatches.length}
							</span>
						</div>
						<div className="ops-list">
							{typedImportBatches.length ? (
								typedImportBatches.map((batch) => (
									<article className="ops-row" key={batch.id}>
										<Database aria-hidden="true" />
										<div>
											<h3>{batch.sourceName}</h3>
											<p>
												{batch.importedRows} записано · {batch.skippedRows}{" "}
												пропущено · {formatDateTime(batch.createdAt)}
											</p>
										</div>
										<span>
											{batch.status === "completed"
												? "готово"
												: "есть пропуски"}
										</span>
									</article>
								))
							) : (
								<article className="ops-empty">
									<Database aria-hidden="true" />
									<p>
										После первого импорта здесь будет журнал batch, дублей и
										пропусков.
									</p>
								</article>
							)}
						</div>
					</div>
    );
}
