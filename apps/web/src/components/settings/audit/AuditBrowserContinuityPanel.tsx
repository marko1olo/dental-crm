import { ShieldCheck } from "lucide-react";

export function formatTime(isoString: string | null | undefined): string {
	if (!isoString) return "Н/Д";
	return new Date(isoString).toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function formatDateTime(isoString: string | null | undefined): string {
	if (!isoString) return "Н/Д";
	return new Date(isoString).toLocaleString("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function AuditBrowserContinuityPanel({
	browserContinuityState,
	browserContinuityChecks,
	requestBrowserStoragePersistence,
	browserCanRequestPersistentStorage,
}: {
	browserContinuityState: string;
	browserContinuityChecks: any;
	requestBrowserStoragePersistence: () => void;
	browserCanRequestPersistentStorage: boolean;
}) {
	const typedBrowserContinuityChecks = browserContinuityChecks as any[];
	const browserContinuityValue =
		browserContinuityState === "safe"
			? "Защищено"
			: browserContinuityState === "warning"
				? "Внимание"
				: "Уязвимо";

	return (
		<div className="panel continuity-panel">
			<div className="panel-heading">
				<h2>Сохранность данных в браузере</h2>
				<span className={`status-pill status-${browserContinuityState}`}>
					{browserContinuityValue}
				</span>
			</div>
			<div className="ops-list">
				<article className="ops-row">
					<ShieldCheck aria-hidden="true" />
					<div>
						<h3>Гарантия сохранности хранилища</h3>
						<p>
							{browserCanRequestPersistentStorage
								? "Доступен запрос Persistent Storage API"
								: "Недоступно в этом браузере / протоколе"}
						</p>
					</div>
					<button
						className="text-button"
						type="button"
						onClick={requestBrowserStoragePersistence}
						disabled={!browserCanRequestPersistentStorage}
					>
						Запросить квоту
					</button>
				</article>
				<div className="browser-continuity-grid">
					{(typedBrowserContinuityChecks || []).map((check: any) => (
						<article key={check.label} className="ops-row">
							<ShieldCheck aria-hidden="true" />
							<div>
								<h3>{check.label}</h3>
								<p>{check.warnings?.join(", ") || "В норме"}</p>
							</div>
							<span>{formatTime(check.checkedAt)}</span>
						</article>
					))}
				</div>
			</div>
		</div>
	);
}
