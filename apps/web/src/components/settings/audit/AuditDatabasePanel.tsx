import { History, ShieldCheck } from "lucide-react";
import { formatDateTime } from "./AuditBrowserContinuityPanel";

export function AuditDatabasePanel({
	persistenceHealth,
	downloadPersistenceExport,
	isPersistenceExporting,
}: {
	persistenceHealth: any;
	downloadPersistenceExport: () => void;
	isPersistenceExporting: boolean;
}) {
	const typedPersistenceIntegrity = persistenceHealth as any;

	return (
		<div className="panel database-panel">
			<div className="panel-heading">
				<h2>Резервное копирование и целостность</h2>
				<button
					type="button"
					className="primary-button"
					onClick={() => downloadPersistenceExport()}
					disabled={isPersistenceExporting}
				>
					{isPersistenceExporting ? "Экспорт..." : "Экспорт БД"}
				</button>
			</div>
			<div className="ops-list">
				{typedPersistenceIntegrity ? (
					<>
						<article className="ops-row">
							<History aria-hidden="true" />
							<div>
								<h3>
									{typedPersistenceIntegrity.ok
										? "База данных цела"
										: "База данных повреждена"}
								</h3>
								<p>{typedPersistenceIntegrity.nextAction}</p>
							</div>
							<span>
								{formatDateTime(typedPersistenceIntegrity.checkedAt)}
							</span>
						</article>
						<div className="backup-check-grid">
							{(typedPersistenceIntegrity.backups || [])
								.slice(0, 6)
								.map((backup: any) => (
									<span
										key={backup.fileName}
										style={{
											display: "block",
											margin: "4px 0",
											fontSize: "0.85rem",
											color: "var(--color-text-secondary)",
										}}
									>
										{backup.readable && backup.checksumVerified !== false
											? "✅"
											: "❌"}{" "}
										{Math.round(backup.sizeBytes / 1024)} КБ —{" "}
										{backup.fileName}
									</span>
								))}
						</div>
					</>
				) : (
					<article className="ops-empty">
						<ShieldCheck aria-hidden="true" />
						<p>Нет информации о резервных копиях.</p>
					</article>
				)}
			</div>
		</div>
	);
}
