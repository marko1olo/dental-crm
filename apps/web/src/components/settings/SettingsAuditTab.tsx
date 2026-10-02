import type {
	AuditEvent,
	ImportBatch,
	LocalBridgeReadinessResponse,
	LocalBridgeUsePlansResponse,
} from "@dental/shared";
import {
	AlertTriangle,
	Database,
	Eye,
	FileText,
	History,
	Lock,
	LogOut,
	ShieldAlert,
	ShieldCheck,
	SlidersHorizontal,
	Upload,
	UserCheck,
} from "lucide-react";
import { Suspense, lazy, useState } from "react";
import { OfflineBackupVaultPanel } from "./OfflineBackupVaultPanel";

// Lazy-loaded security audit modal for low-spec hardware (4GB RAM, 5400 RPM HDD)
const AuditTrailHubModal = lazy(() =>
	import("../security/AuditTrailHubModal").then((m) => ({ default: m.AuditTrailHubModal }))
);
import { StaffActionJournalSection } from "./audit/StaffActionJournalSection";
import { humanizeMigrationText } from "./SettingsViewHelpers";

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
	const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);

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

			{/* Панель аудита действий и 152-ФЗ журнала безопасности */}
			<div className="panel audit-panel" data-testid="152fz-audit-panel">
				<div className="panel-heading">
					<div>
						<h2>Аудит действий и 152-ФЗ защита</h2>
						<p className="text-xs text-slate-500 m-0 mt-0.5">
							Криптографический реестр обращений: входы сотрудников, открытие карт 043/у, выгрузка ПДн и отзыв сессий.
						</p>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<button
							className="secondary-button"
							type="button"
							onClick={() => setIsAuditTrailOpen(true)}
							style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
							data-testid="open-152fz-audit-modal-btn"
						>
							<FileText size={16} aria-hidden="true" />
							<span>Журнал 152-ФЗ / ФСТЭК</span>
						</button>
						<ShieldCheck aria-hidden="true" />
					</div>
				</div>

				{/* 4 ключевых контура безопасности 152-ФЗ */}
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 my-2 text-xs">
					<div className="flex flex-col gap-1 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
						<div className="flex items-center gap-1.5 font-bold text-teal-700 dark:text-teal-300">
							<UserCheck size={14} className="shrink-0" />
							<span>Авторизации</span>
						</div>
						<p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 leading-normal">
							Фиксация входов, IP-адресов и попыток подбора паролей.
						</p>
					</div>

					<div className="flex flex-col gap-1 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
						<div className="flex items-center gap-1.5 font-bold text-sky-700 dark:text-sky-300">
							<Eye size={14} className="shrink-0" />
							<span>Медкарты (ЭМК)</span>
						</div>
						<p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 leading-normal">
							Учёт каждого открытия медкарты (соблюдение врачебной тайны).
						</p>
					</div>

					<div className="flex flex-col gap-1 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
						<div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
							<Upload size={14} className="shrink-0" />
							<span>Выгрузка ПДн</span>
						</div>
						<p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 leading-normal">
							Контроль экспорта базы пациентов и просмотра неэкранированных ПДн.
						</p>
					</div>

					<div className="flex flex-col gap-1 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
						<div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
							<LogOut size={14} className="shrink-0" />
							<span>Отзыв сессий</span>
						</div>
						<p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 leading-normal">
							Сброс параллельных сессий и блокировка уволенных сотрудников.
						</p>
					</div>
				</div>

				<div className="ops-list">
					{typedAuditEvents.length > 0 ? (
						typedAuditEvents.map((event) => (
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
						))
					) : (
						<article className="ops-empty">
							<ShieldCheck aria-hidden="true" />
							<p>
								Журнал криптографического аудита 152-ФЗ активен. Все обращения к картам 043/у,
								авторизации и выгрузки фиксируются цепочкой SHA-256. Нажмите «Журнал 152-ФЗ / ФСТЭК» для полного отчёта.
							</p>
						</article>
					)}
				</div>
			</div>

			<StaffActionJournalSection />

			{isAuditTrailOpen && (
				<Suspense fallback={null}>
					<AuditTrailHubModal
						isOpen={isAuditTrailOpen}
						onClose={() => setIsAuditTrailOpen(false)}
					/>
				</Suspense>
			)}
		</section>
	);
}
