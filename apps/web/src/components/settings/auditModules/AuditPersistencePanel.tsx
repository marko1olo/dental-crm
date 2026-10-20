/**
 * apps/web/src/components/settings/auditModules/AuditPersistencePanel.tsx
 *
 * Data persistence contour, browser continuity checks, local workstation bridges,
 * server backup state, and migration history panels for SettingsAuditTab.
 */

import type {
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
import React from "react";
import { OfflineBackupVaultPanel } from "../OfflineBackupVaultPanel";
import { humanizeMigrationText } from "../SettingsViewHelpers";

export type BrowserContinuityCheck = { label: string; value: string; detail: string };
export type PersistenceBackupCheck = {
	fileName: string;
	savedAt: string;
	sizeBytes: number;
	fileHash: string | null;
	checksumVerified: boolean | null;
	readable: boolean;
	warning: string | null;
};
export type PersistenceIntegrityReport = {
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

export interface AuditPersistencePanelProps {
	browserCanRequestPersistentStorage: boolean;
	browserContinuity: any;
	browserContinuityChecks: BrowserContinuityCheck[];
	browserContinuityState: string;
	browserContinuityValue: any;
	clinicSettings: any;
	downloadPersistenceExport: () => void;
	formatDateTime: (iso: string) => string;
	formatTime: (iso: string) => string;
	hideVaultPanel?: boolean;
	isPersistenceExporting: boolean;
	loadLocalBridgeUsePlans: (opts?: { silent?: boolean }) => Promise<void>;
	loadPersistenceHealth: (opts?: { silent?: boolean }) => Promise<void>;
	localBridgeReadiness: LocalBridgeReadinessResponse | null;
	localBridgeStatusLabels: Record<string, string>;
	localBridgeStatusState: string;
	localBridgeStatusValue: any;
	localBridgeUsePathLabels: Record<string, string>;
	localBridgeUsePlans: LocalBridgeUsePlansResponse | null;
	organizationId?: string;
	persistenceHealth: any;
	persistenceIntegrity: PersistenceIntegrityReport | null;
	refreshBrowserContinuity: (opts?: { silent?: boolean }) => Promise<void>;
	requestBrowserStoragePersistence: () => Promise<void>;
	importBatches: ImportBatch[];
}

export function AuditPersistencePanel({
	browserCanRequestPersistentStorage,
	browserContinuity,
	browserContinuityChecks,
	browserContinuityState,
	browserContinuityValue,
	clinicSettings,
	downloadPersistenceExport,
	formatDateTime,
	formatTime,
	hideVaultPanel,
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
	importBatches,
}: AuditPersistencePanelProps) {
	return (
		<>
			<div className="panel audit-panel persistence-panel" data-testid="persistence-panel">
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
						<span>
							{typeof browserContinuityValue === "object" && browserContinuityValue !== null
								? (browserContinuityValue as any).status ?? "—"
								: String(browserContinuityValue ?? "—")}
						</span>
					</article>
					<section
						className="browser-continuity-grid"
						aria-label="Проверки сохранения в браузере"
					>
						{browserContinuityChecks.map((check) => (
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
						<span>
							{typeof localBridgeStatusValue === "object" && localBridgeStatusValue !== null
								? (localBridgeStatusValue as any).status ?? "—"
								: String(localBridgeStatusValue ?? "—")}
						</span>
					</article>
					<section
						className="local-bridge-grid"
						aria-label="Готовность локальных модулей рабочей станции"
					>
						{(localBridgeReadiness?.bridges ?? []).map((bridge) => (
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
					{localBridgeUsePlans ? (
						<section
							className="local-bridge-plan-grid"
							aria-label="Планы использования локальных модулей"
						>
							{localBridgeUsePlans.plans.map((plan) => (
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
							{persistenceIntegrity ? (
								<>
									<article className="ops-row">
										<ShieldCheck aria-hidden="true" />
										<div>
											<h3>
												{persistenceIntegrity.ok
													? "Проверка резервной копии прошла"
													: "Нужна проверка резервной копии"}
											</h3>
											<p>
												{persistenceIntegrity.nextAction} ·{" "}
												{persistenceIntegrity.checksumVerified ===
												false
													? "контрольная сумма не совпала"
													: "контрольная сумма совпала"}
											</p>
										</div>
										<span>
											{formatDateTime(persistenceIntegrity.checkedAt)}
										</span>
									</article>
									<section
										className="backup-check-grid"
										aria-label="Последние резервные копии"
									>
										{persistenceIntegrity.backups
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
					{!hideVaultPanel ? (
						<OfflineBackupVaultPanel
							organizationId={organizationId}
							clinicName={clinicSettings?.name}
						/>
					) : null}
				</div>
			</div>

			<div className="panel import-history-panel" data-testid="import-history-panel">
				<div className="panel-heading">
					<h2>История миграций</h2>
					<span className="status-pill status-arrived">
						{importBatches.length}
					</span>
				</div>
				<div className="ops-list">
					{importBatches.length ? (
						importBatches.map((batch) => (
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
		</>
	);
}
