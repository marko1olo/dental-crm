import type {
	AuditEvent,
	ImportBatch,
	LocalBridgeReadinessResponse,
	LocalBridgeUsePlansResponse,
} from "@dental/shared";
import {
	Database,
	History,
	ShieldCheck,
	SlidersHorizontal,
} from "lucide-react";
import { OfflineBackupVaultPanel } from "./OfflineBackupVaultPanel";
import { humanizeMigrationText } from "./migrationHelpers";

type BrowserContinuityCheck = { label: string; value: string; detail: string };
type PersistenceBackupCheck = {
	fileName: string;
	savedAt: string;
	sizeBytes: number;
	fileHash: string | null;
	checksumVerified: boolean | null;
	readable: boolean;
	warning: string | null;
};
type PersistenceIntegrityReport = {
	ok: boolean;
	checkedAt: string;
	stateFileHash: string | null;
	checksumVerified: boolean | null;
	stateCounts: Record<string, number>;
	backups: PersistenceBackupCheck[];
	warnings: string[];
	nextAction: string;
};

function localBridgeEndpointSummary(
	bridge: LocalBridgeReadinessResponse["bridges"][number],
): string {
	if (bridge.urlRedacted) return bridge.urlRedacted;
	if (bridge.setupSettingsCount)
		return `серверных настроек: ${bridge.setupSettingsCount}`;
	return "адрес локального модуля не задан";
}

export function SettingsAuditTab(props: Record<string, any>) {
	const {
		browserCanRequestPersistentStorage,
		browserContinuity,
		browserContinuityChecks,
		browserContinuityState,
		browserContinuityValue,
		clinicSettings,
		dashboard,
		downloadPersistenceExport,
		formatDateTime,
		formatTime,
		isPersistenceExporting,
		loadLocalBridgeUsePlans,
		loadPersistenceHealth,
		localBridgeReadiness,
		localBridgeStatusLabels,
		localBridgeStatusState,
		localBridgeStatusValue,
		localBridgeUsePathLabels,
		localBridgeUsePlans,
		organizationId,
		persistenceHealth,
		persistenceIntegrity,
		refreshBrowserContinuity,
		requestBrowserStoragePersistence,
		settingsTab,
	} = props;

	if (settingsTab !== "audit") {
		return null;
	}

	const typedBrowserContinuityChecks: BrowserContinuityCheck[] = Array.isArray(
		browserContinuityChecks,
	)
		? (browserContinuityChecks as BrowserContinuityCheck[])
		: [];
	const typedPersistenceIntegrity =
		(persistenceIntegrity as PersistenceIntegrityReport | null) ?? null;
	const typedLocalBridgeReadiness =
		(localBridgeReadiness as LocalBridgeReadinessResponse | null) ?? null;
	const typedLocalBridgeUsePlans =
		(localBridgeUsePlans as LocalBridgeUsePlansResponse | null) ?? null;
	const typedImportBatches: ImportBatch[] = Array.isArray(
		dashboard?.importBatches,
	)
		? (dashboard.importBatches as ImportBatch[])
		: [];
	const typedAuditEvents: AuditEvent[] = Array.isArray(dashboard?.auditEvents)
		? (dashboard.auditEvents as AuditEvent[])
		: [];

	return (
		<section className="ops-grid" aria-label="Журнал операций">
			<div className="panel audit-panel persistence-panel">
				<div className="panel-heading">
					<h2>Сохранность данных</h2>
					<div className="persistence-actions">
						<button
							className="secondary-button"
							type="button"
							onClick={() => {
								void loadPersistenceHealth({ silent: false });
							}}
						>
							Проверить
						</button>
						<button
							className="secondary-button"
							type="button"
							onClick={downloadPersistenceExport}
							disabled={isPersistenceExporting}
							aria-busy={isPersistenceExporting || undefined}
						>
							{isPersistenceExporting
								? "Готовлю"
								: "Скачать резервную копию"}
						</button>
					</div>
				</div>
				<div className="ops-list">
					<article
						className={`ops-row browser-continuity-row safety-${browserContinuityState}`}
					>
						<ShieldCheck aria-hidden="true" />
						<div>
							<h3>Контур офлайн/онлайн</h3>
							<p>
								{browserContinuity
									? `Проверено ${formatTime(browserContinuity.checkedAt)} · ${browserContinuity.warnings.length ? browserContinuity.warnings.join(", ") : "локальный черновик и очередь доступны"}`
									: "Проверяю черновики, работу без сети и локальные очереди"}
							</p>
						</div>
						<span>{browserContinuityValue}</span>
					</article>
					<section
						className="browser-continuity-grid"
						aria-label="Проверки сохранения в браузере"
					>
						{typedBrowserContinuityChecks.map((check) => (
							<article key={check.label}>
								<span>{check.label}</span>
								<strong>{check.value}</strong>
								<p>{check.detail}</p>
							</article>
						))}
					</section>
					<div className="persistence-actions persistence-inline-actions">
						<button
							className="secondary-button"
							type="button"
							onClick={() =>
								void refreshBrowserContinuity({ silent: false })
							}
						>
							Проверить устройство
						</button>
						<button
							className="secondary-button"
							type="button"
							onClick={() => void requestBrowserStoragePersistence()}
							disabled={
								!browserCanRequestPersistentStorage ||
								browserContinuity?.storagePersisted === true
							}
						>
							Постоянное хранилище
						</button>
					</div>
					<article
						className={`ops-row local-bridge-summary safety-${localBridgeStatusState}`}
					>
						<SlidersHorizontal aria-hidden="true" />
						<div>
							<h3>Локальные модули ПК</h3>
							<p>
								{localBridgeReadiness
									? `${humanizeMigrationText(localBridgeReadiness.nextAction)} · Проверено ${formatTime(localBridgeReadiness.generatedAt)}`
									: "Проверяю диктовку, просмотр КЛКТ/КТ, распознавание файлов и внешний просмотр"}
							</p>
						</div>
						<span>{localBridgeStatusValue}</span>
					</article>
					<section
						className="local-bridge-grid"
						aria-label="Готовность локальных модулей рабочей станции"
					>
						{(typedLocalBridgeReadiness?.bridges ?? []).map((bridge) => (
							<article
								className={`bridge-${bridge.status}`}
								key={bridge.kind}
							>
								<div>
									<strong>{humanizeMigrationText(bridge.title)}</strong>
									<span>{localBridgeStatusLabels[bridge.status]}</span>
								</div>
								<p>
									{humanizeMigrationText(bridge.role)} ·{" "}
									{humanizeMigrationText(bridge.workload)}
								</p>
								<small>{localBridgeEndpointSummary(bridge)}</small>
								<small>
									{humanizeMigrationText(bridge.privacyBoundary)}
								</small>
								<small>
									{bridge.latencyMs !== null
										? `${bridge.latencyMs} мс`
										: humanizeMigrationText(bridge.nextAction)}
								</small>
								{bridge.warnings.map((warning) => (
									<em key={warning}>{humanizeMigrationText(warning)}</em>
								))}
							</article>
						))}
						{!localBridgeReadiness ? (
							<article className="bridge-planned">
								<div>
									<strong>Предпроверка модулей</strong>
									<span>проверка</span>
								</div>
								<p>
									Проверка модулей загрузится по кнопке или при открытии
									аудита.
								</p>
							</article>
						) : null}
					</section>
					<div className="persistence-actions persistence-inline-actions">
						<button
							className="secondary-button"
							type="button"
							onClick={() =>
								void loadLocalBridgeUsePlans({ silent: false })
							}
						>
							Проверить модули
						</button>
					</div>
					{typedLocalBridgeUsePlans ? (
						<section
							className="local-bridge-plan-grid"
							aria-label="Планы использования локальных модулей"
						>
							{typedLocalBridgeUsePlans.plans.map((plan) => (
								<article
									className={`plan-${plan.primaryPath}`}
									key={plan.scenario}
								>
									<div>
										<strong>{plan.title}</strong>
										<span>
											{localBridgeUsePathLabels[plan.primaryPath]}
										</span>
									</div>
									<p>{humanizeMigrationText(plan.nextAction)}</p>
									<small>
										{plan.doctorBlocking
											? "блокирует врача"
											: "только предупреждение"}{" "}
										· {Math.round(plan.confidence * 100)}%
									</small>
									<small>
										{plan.steps
											.slice(0, 2)
											.map((step) => humanizeMigrationText(step.title))
											.join(" → ")}
									</small>
									{plan.warnings.slice(0, 1).map((warning) => (
										<em key={warning}>{humanizeMigrationText(warning)}</em>
									))}
								</article>
							))}
						</section>
					) : null}
					{persistenceHealth ? (
						<>
							<article className="ops-row">
								<ShieldCheck aria-hidden="true" />
								<div>
									<h3>
										{persistenceHealth.enabled && persistenceHealth.exists
											? "Серверное состояние найдено"
											: "Серверное состояние не найдено"}
									</h3>
									<p>
										{persistenceHealth.savedAt
											? `Последняя запись ${formatDateTime(persistenceHealth.savedAt)}`
											: "Файл состояния еще не создан"}{" "}
										·{" "}
										{persistenceHealth.checksum
											? "контрольная сумма есть"
											: "контрольная сумма появится после следующей записи"}
									</p>
								</div>
								<span>
									{persistenceHealth.version
										? `v${persistenceHealth.version}`
										: "нет"}
								</span>
							</article>
							<article className="ops-row">
								<Database aria-hidden="true" />
								<div>
									<h3>Резервные копии</h3>
									<p>
										{persistenceHealth.backupCount} из{" "}
										{persistenceHealth.maxBackupCount} ·{" "}
										{persistenceHealth.latestBackupAt
											? `последняя ${formatDateTime(persistenceHealth.latestBackupAt)}`
											: "после следующей записи"}
									</p>
								</div>
								<span>
									{persistenceHealth.backupCount ? "есть" : "пусто"}
								</span>
							</article>
							{typedPersistenceIntegrity ? (
								<>
									<article className="ops-row">
										<ShieldCheck aria-hidden="true" />
										<div>
											<h3>
												{typedPersistenceIntegrity.ok
													? "Проверка резервной копии прошла"
													: "Нужна проверка резервной копии"}
											</h3>
											<p>
												{typedPersistenceIntegrity.nextAction} ·{" "}
												{typedPersistenceIntegrity.checksumVerified ===
												false
													? "контрольная сумма не совпала"
													: "контрольная сумма совпала"}
											</p>
										</div>
										<span>
											{formatDateTime(typedPersistenceIntegrity.checkedAt)}
										</span>
									</article>
									<section
										className="backup-check-grid"
										aria-label="Последние резервные копии"
									>
										{typedPersistenceIntegrity.backups
											.slice(0, 6)
											.map((backup) => (
												<span key={backup.fileName}>
													{backup.readable &&
													backup.checksumVerified !== false
														? "проверено"
														: "проверить"}{" "}
													· {Math.round(backup.sizeBytes / 1024)} КБ ·{" "}
													{backup.fileName}
												</span>
											))}
									</section>
								</>
							) : null}
							<article className="ops-row">
								<History aria-hidden="true" />
								<div>
									<h3>Локальный файл прототипа</h3>
									<p>{persistenceHealth.filePath || "путь недоступен"}</p>
								</div>
								<span>без фоновой подготовки</span>
							</article>
							<OfflineBackupVaultPanel
								organizationId={organizationId}
								clinicName={clinicSettings?.name}
							/>
						</>
					) : (
						<article className="ops-empty">
							<ShieldCheck aria-hidden="true" />
							<p>
								Статус сохранности загрузится при открытии аудита или по
								кнопке проверки.
							</p>
						</article>
					)}
				</div>
			</div>

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

			<div className="panel audit-panel">
				<div className="panel-heading">
					<h2>Аудит действий</h2>
					<ShieldCheck aria-hidden="true" />
				</div>
				<div className="ops-list">
					{typedAuditEvents.map((event) => (
						<article className="ops-row" key={event.id}>
							<ShieldCheck aria-hidden="true" />
							<div>
								<h3>
									{event.reason ? "Системное событие" : "Запись аудита"}
								</h3>
								<p>
									{event.reason ??
										"Служебная запись без публичного описания"}
								</p>
							</div>
							<span>{formatDateTime(event.createdAt)}</span>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
