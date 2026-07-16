			{settingsTab === "imports" ? (
				<section
					className="import-studio smart-import-studio"
					aria-label="Умный разбор смешанной выгрузки"
				>
					<div className="import-copy">
						<Sparkles aria-hidden="true" />
						<div>
							<p className="eyebrow">Умный разбор</p>
							<h2>Один вход для пациентов, снимков и мусорных строк</h2>
							<p>
								Вставь смешанную выгрузку из старой МИС, RVG-папки, Excel, OCR
								или диктовки. CRM сама разделит строки, покажет уверенность
								разбора и отправит каждую часть в единый предпросмотр.
							</p>
						</div>
					</div>

					<div
						className="import-source-grid smart-mode-grid"
						aria-label="Режим умного разбора"
					>
						{(Object.keys(smartImportModeLabels) as SmartImportMode[]).map(
							(mode) => (
								<button
									className={`source-card ${smartImportMode === mode ? "active" : ""}`}
									type="button"
									key={mode}
									aria-pressed={smartImportMode === mode}
									onClick={() => {
										setSmartImportMode(mode);
										setSmartImportPreview(null);
										setSmartImportCommit(null);
									}}
								>
									<strong>{smartImportModeLabels[mode].title}</strong>
									<span>{smartImportModeLabels[mode].detail}</span>
								</button>
							),
						)}
					</div>

					<div
						className="migration-kickstart-panel"
						data-testid="migration-kickstart-panel"
						aria-label="Быстрый перенос старой базы"
					>
						<div>
							<strong>Быстрый перенос без ручного поиска</strong>
							<span>
								{migrationAutopilot
									? `План готов: источников ${migrationAutopilot.sources.length}, следующий шаг уже показан ниже.`
									: "Выберите самый простой вход: поиск на ПК, папка старой программы, вставленная выгрузка или реквизиты клиники."}
							</span>
						</div>
						<div
							className="migration-progress-strip"
							data-testid="migration-progress-strip"
							aria-label="Готовность переноса"
						>
							{migrationProgressItems.map((item) => (
								<article
									className={`migration-progress-step status-${item.status}`}
									key={item.id}
								>
									<strong>{item.title}</strong>
									<span>{item.detail}</span>
								</article>
							))}
						</div>
						<div className="migration-kickstart-grid">
							<article>
								<strong>Старая программа на этом ПК</strong>
								<span>
									{migrationSourceDiscovery
										? `Найдено ${migrationSourceDiscovery.candidates.length}, папок проверено ${migrationSourceDiscovery.scannedFolders}.`
										: "CRM сам ищет старые базы, выгрузки, снимки и следы стоматологических программ."}
								</span>
								<button
									className="primary-button"
									type="button"
									onClick={() => void discoverMigrationSources()}
									disabled={
										isMigrationSourceDiscovering || isMigrationAutopilotLoading
									}
									data-testid="discover-migration-sources"
								>
									<ScanSearch aria-hidden="true" />{" "}
									{isMigrationSourceDiscovering
										? "Ищу источники"
										: isMigrationAutopilotLoading
											? "Строю план"
											: "Найти на ПК + план"}
								</button>
							</article>
							<article>
								<strong>Папка, диск или архив</strong>
								<span>
									{typedBrowserMigrationDiscovery
										? `Выбрано ${typedBrowserMigrationDiscovery.candidates.length} источников, файлов ${typedBrowserMigrationDiscovery.candidates.reduce((sum, candidate) => sum + candidate.matchedFiles, 0)}.`
										: browserDirectoryPickerAvailable
											? "Админ выбирает папку старой МИС, диск выгрузки, КТ/снимки или архив снимков."
											: "Если браузер не дает выбрать папку, можно выбрать файлы старой МИС и снимков."}
								</span>
								<button
									className="primary-button"
									type="button"
									onClick={() => void pickBrowserMigrationSource()}
									disabled={
										isBrowserMigrationScanning || isMigrationAutopilotLoading
									}
									data-testid="pick-browser-migration-source"
								>
									<Database aria-hidden="true" />{" "}
									{isBrowserMigrationScanning
										? "Сканирую папку"
										: isMigrationAutopilotLoading
											? "Строю план"
											: "Папка/диск + план"}
								</button>
								{isBrowserMigrationScanning && browserMigrationScanProgress ? (
									<button
										className="secondary-button browser-scan-stop-button"
										type="button"
										data-testid="browser-cancel-migration-source-scan"
										onClick={cancelBrowserMigrationScan}
									>
										<CircleStop aria-hidden="true" /> Остановить
									</button>
								) : null}
							</article>
							<article>
								<strong>Текст, Excel, OCR, диктовка</strong>
								<span>
									{smartImportInputReady
										? "Можно построить план по вставленной выгрузке или сразу открыть предпросмотр строк."
										: "Сначала вставьте экспорт, таблицу, OCR или текст из старой программы в поле ниже."}
								</span>
								<div className="migration-source-card-actions">
									<button
										className="primary-button"
										type="button"
										onClick={() =>
											void runMigrationAutopilot(
												activeMigrationDiscoveryForSettingsAutopilot,
												{ includeSmartImportText: smartImportInputReady },
											)
										}
										disabled={isMigrationAutopilotLoading}
										data-testid="run-migration-autopilot"
									>
										<Sparkles aria-hidden="true" />{" "}
										{isMigrationAutopilotLoading
											? "Строю автоплан"
											: "Автоплан"}
									</button>
									<button
										className="secondary-button"
										type="button"
										onClick={previewSmartImport}
										disabled={isSmartImportLoading || !smartImportInputReady}
										aria-busy={isSmartImportLoading || undefined}
									>
										<UploadCloud aria-hidden="true" />{" "}
										{isSmartImportLoading ? "Разбираю" : "Разобрать"}
									</button>
								</div>
							</article>
							<article>
								<strong>Реквизиты клиники</strong>
								<span>
									Поиск по ИНН, названию, адресу и лицензии помогает заполнить
									профиль клиники без ручного копания.
								</span>
								<button
									className="secondary-button"
									type="button"
									onClick={() => void lookupClinicPublicProfile()}
									disabled={isClinicPublicLookupLoading}
									data-testid="lookup-clinic-public-profile"
								>
									<Search aria-hidden="true" />{" "}
									{isClinicPublicLookupLoading
										? "Ищу реквизиты"
										: "Найти реквизиты"}
								</button>
							</article>
						</div>
					</div>

					<div className="import-workbench">
						<textarea
							aria-label="Смешанная выгрузка для умного разбора"
							value={smartImportText}
							onChange={(event: TextInputChangeEvent) => {
								setSmartImportText(event.target.value);
								setSmartImportPreview(null);
								setSmartImportCommit(null);
							}}
						/>
						<div className="import-tool-row">
							<input
								ref={browserMigrationInputRef}
								data-testid="browser-migration-folder-input"
								type="file"
								multiple
								hidden
								tabIndex={-1}
								onChange={(event: InputChangeEvent) =>
									void handleBrowserMigrationInputChange(
										event.currentTarget.files,
									)
								}
							/>
							<button
								className="secondary-button"
								type="button"
								onClick={() => {
									setSmartImportMode("auto");
									setSmartImportText(
										"Старая МИС: резервная копия старой серверной базы C:\\Legacy\\clinic_2024.fdb\nАрхив выгрузки D:\\Migration\\patients_payments.xlsx\nDental clinic Smile Center INN 1234567890 Address: Samara, Lenina 1\nНовый Пациент Снимков +7 927 444-55-66 12.02.1991 перенос из старой МИС\nНовый Пациент Снимков +7 927 444-55-66 RVG 36 12.05.2026 C:\\Images\\new_patient_36.dcm\nИванова Марина Сергеевна +7 927 111-22-33 ОПТГ 10.05.2026 C:\\Images\\ivanova_opg.png\nслужебная строка без полезных данных",
									);
									setSmartImportPreview(null);
									setSmartImportCommit(null);
								}}
							>
								<Sparkles aria-hidden="true" /> Смешанный пример
							</button>
							<button
								className="secondary-button"
								type="button"
								onClick={downloadSmartImportReport}
								disabled={isSmartReportLoading || !smartImportInputReady}
								aria-busy={isSmartReportLoading || undefined}
							>
								<FileText aria-hidden="true" />{" "}
								{isSmartReportLoading ? "Готовлю отчет" : "Отчет проверки"}
							</button>
							<button
								className="secondary-button"
								type="button"
								onClick={downloadSmartImportSafeHandoffReport}
								disabled={isSmartSafeReportLoading || !smartImportInputReady}
								aria-busy={isSmartSafeReportLoading || undefined}
								data-testid="download-smart-safe-handoff-report"
								title="Табличный отчет для администратора, врача и специалиста переноса без ФИО, телефонов, дат рождения, локальных путей и имен файлов"
							>
								<ShieldCheck aria-hidden="true" />{" "}
								{isSmartSafeReportLoading ? "Готовлю отчет" : "Отчет переноса"}
							</button>
							<button
								className="secondary-button"
								type="button"
								onClick={() => void downloadMigrationHandoffReport()}
								disabled={
									isMigrationHandoffReportLoading ||
									isMigrationAutopilotLoading ||
									!migrationHandoffReportReady
								}
								data-testid="download-migration-handoff-report"
								aria-busy={
									isMigrationHandoffReportLoading ||
									isMigrationAutopilotLoading ||
									undefined
								}
								aria-describedby={
									!migrationHandoffReportReady
										? migrationHandoffReportGuidanceId
										: undefined
								}
							>
								<FileText aria-hidden="true" />{" "}
								{isMigrationHandoffReportLoading
									? "Готовлю план"
									: isMigrationAutopilotLoading
										? "Жду автоплан"
										: migrationHandoffReportReady
											? "План переноса"
											: "Сначала автоплан"}
							</button>
							<button
								className="primary-button"
								type="button"
								onClick={previewSmartImport}
								disabled={isSmartImportLoading || !smartImportInputReady}
								aria-busy={isSmartImportLoading || undefined}
							>
								<UploadCloud aria-hidden="true" />{" "}
								{isSmartImportLoading ? "Разбираю" : "Разобрать"}
							</button>
						</div>
						{!smartImportInputReady ? (
							<p
								className="import-empty-guidance"
								role="status"
								aria-live="polite"
							>
								Вставьте выгрузку из старой МИС, таблицу, OCR или диктовку перед
								разбором.
							</p>
						) : null}
						{!migrationHandoffReportReady ? (
							<p
								className="import-empty-guidance"
								id={migrationHandoffReportGuidanceId}
								role="status"
								aria-live="polite"
							>
								Чтобы скачать план переноса, сначала запустите автоплан, найдите
								источники на ПК, выберите папку/диск или вставьте выгрузку.
							</p>
						) : null}
					</div>

					{browserMigrationScanProgress ? (
						<div
							className={`browser-imaging-scan-progress browser-migration-scan-progress ${browserMigrationScanProgress.phase}`}
							data-testid="browser-migration-scan-progress"
							role="status"
							aria-live="polite"
						>
							<div className="browser-picked-folder-head">
								<div>
									<strong>
										{browserMigrationScanProgress.phase === "cancelled"
											? "Поиск старой системы остановлен"
											: browserMigrationScanProgress.phase === "done"
												? "Источник проверен"
												: "Браузер проверяет старую МИС"}
									</strong>
									<span>
										{browserMigrationScanProgress.currentItem ??
											"Интерфейс остается доступным: проверка идет короткими порциями и без загрузки содержимого файлов."}
									</span>
								</div>
								{browserMigrationScanProgress.phase === "scanning" ? (
									<button
										className="text-button"
										type="button"
										data-testid="browser-cancel-migration-source-scan-inline"
										onClick={cancelBrowserMigrationScan}
									>
										Остановить
									</button>
								) : null}
							</div>
							<div className="browser-picked-folder-stats">
								<span>
									файлов: {browserMigrationScanProgress.scannedFiles}/
									{browserMigrationScanProgress.fileLimit}
								</span>
								<span>
									папок: {browserMigrationScanProgress.scannedFolders}/
									{browserMigrationScanProgress.folderLimit}
								</span>
								<span>
									старых баз: {browserMigrationScanProgress.databaseFiles}
								</span>
								<span>копий: {browserMigrationScanProgress.dumpFiles}</span>
								<span>таблиц: {browserMigrationScanProgress.tableFiles}</span>
								<span>
									КТ/снимков: {browserMigrationScanProgress.dicomLikeFiles}
								</span>
								<span>
									архивов: {browserMigrationScanProgress.archiveFiles}
								</span>
								<span>
									{formatByteSize(browserMigrationScanProgress.totalBytes)}
								</span>
								<span>
									сигнатур: до {browserMigrationScanProgress.magicReadLimit}
								</span>
								<span>
									шагов: {browserMigrationScanProgress.processedUnits}
								</span>
								<span>
									время:{" "}
									{formatBrowserImagingScanElapsed(
										browserMigrationScanProgress.elapsedMs,
									)}
								</span>
							</div>
							<small>
								Начато {formatTime(browserMigrationScanProgress.startedAt)} ·
								обновлено {formatTime(browserMigrationScanProgress.updatedAt)}
							</small>
						</div>
					) : null}

					{typedBrowserMigrationDiscovery ? (
						<div
							className="dicom-discovery-result browser-migration-manifest-result"
							data-testid="browser-migration-manifest-result"
							aria-label="Выбранная папка старых баз, выгрузок и снимков"
						>
							<div className="dicom-discovery-head">
								<strong>
									Выбранная папка: источников{" "}
									{typedBrowserMigrationDiscovery.candidates.length} · файлов{" "}
									{typedBrowserMigrationDiscovery.candidates.reduce(
										(sum, candidate) => sum + candidate.matchedFiles,
										0,
									)}{" "}
									· папок {typedBrowserMigrationDiscovery.scannedFolders}
								</strong>
								<span>
									{migrationAutopilot
										? "Автоплан по выбранной папке уже построен ниже."
										: humanizeMigrationText(
												typedBrowserMigrationDiscovery.nextAction,
											)}
								</span>
								<span>
									Сканирование выполнено после явного выбора папки/файлов.
									Полный путь и содержимое файлов не сохраняются в CRM.
								</span>
							</div>
							<div className="migration-source-artifact-list">
								{typedBrowserMigrationDiscovery.candidates
									.slice(0, 6)
									.map((candidate, index) => (
										<span key={candidate.sourceFingerprint}>
											{migrationSourceDisplayName(candidate, index)} ·{" "}
											{migrationSourceKindLabel(candidate.sourceKind)} ·{" "}
											{Math.round(candidate.confidence * 100)}%
										</span>
									))}
							</div>
							{!typedBrowserMigrationDiscovery.candidates.length ? (
								<div
									className="migration-empty-recovery"
									data-testid="browser-migration-empty-recovery"
									role="status"
									aria-live="polite"
								>
									<strong>
										В выбранной папке не видно старой базы или снимков
									</strong>
									<span>
										Обычно помогает выбрать корень выше: весь диск, папку старой
										программы, папку снимков, архив выгрузки или сетевой
										экспорт.
									</span>
									<div className="migration-source-card-actions">
										<button
											className="secondary-button"
											type="button"
											onClick={() => void pickBrowserMigrationSource()}
											disabled={
												isBrowserMigrationScanning ||
												isMigrationAutopilotLoading
											}
										>
											<Database aria-hidden="true" /> Выбрать другую папку
										</button>
										<button
											className="secondary-button"
											type="button"
											onClick={() => void discoverMigrationSources()}
											disabled={
												isMigrationSourceDiscovering ||
												isMigrationAutopilotLoading
											}
										>
											<ScanSearch aria-hidden="true" /> Найти на ПК
										</button>
										<button
											className="secondary-button"
											type="button"
											onClick={focusSmartImportWorkbench}
										>
											<FileText aria-hidden="true" /> Вставить выгрузку
										</button>
									</div>
								</div>
							) : null}
							{typedBrowserMigrationDiscovery.warnings
								.slice(0, 4)
								.map((warning) => (
									<small key={warning}>{humanizeMigrationText(warning)}</small>
								))}
						</div>
					) : null}

					{migrationAutopilot ? (
						<div
							className="dicom-discovery-result migration-autopilot-result"
							data-testid="migration-autopilot-result"
							aria-label="Автоплан миграции старых баз, снимков и реквизитов клиники"
						>
							<div className="dicom-discovery-head">
								<strong>
									Автоплан миграции: источников{" "}
									{migrationAutopilot.discovery.candidateCount} · проб{" "}
									{migrationAutopilot.discovery.probedCount} · папок{" "}
									{migrationAutopilot.discovery.scannedFolders}
								</strong>
								<span>
									{humanizeMigrationText(migrationAutopilot.nextAction)}
								</span>
								<span>
									Дальше работайте сверху вниз: блок «Сейчас», карточки
									источников, затем предпросмотр.
								</span>
							</div>
							{migrationAutopilot.operatorPacket ? (
								<div
									className="migration-autopilot-operator-packet"
									data-testid="migration-autopilot-operator-packet"
								>
									<div className="migration-operator-score">
										<strong>
											Пакет миграции:{" "}
											{migrationOperatorPacketStatusLabels[
												migrationAutopilot.operatorPacket.overallStatus
											] ?? migrationAutopilot.operatorPacket.overallStatus}{" "}
											·{" "}
											{Math.round(
												migrationAutopilot.operatorPacket.score * 100,
											)}
											%
										</strong>
										<span>
											базы{" "}
											{migrationAutopilot.operatorPacket.totals.databaseSources}{" "}
											· снимки{" "}
											{migrationAutopilot.operatorPacket.totals.mediaSources} ·
											таблицы{" "}
											{migrationAutopilot.operatorPacket.totals.tableSources} ·
											из текста{" "}
											{
												migrationAutopilot.operatorPacket.totals
													.smartPreviewSources
											}{" "}
											· системные следы{" "}
											{
												migrationAutopilot.operatorPacket.totals
													.workstationHints
											}{" "}
											· публичные ссылки{" "}
											{
												migrationAutopilot.operatorPacket.totals
													.publicLookupTargets
											}
										</span>
									</div>
									{migrationDryRunSummary ? (
										<div
											className="migration-dry-run-summary"
											data-testid="migration-dry-run-summary"
											aria-label="Быстрый прогон миграции"
										>
											<div>
												<strong>Быстрый прогон</strong>
												<span>
													предпросмотр{" "}
													{migrationDryRunSummary.previewableSources} ·
													администратор{" "}
													{migrationDryRunSummary.adminBlockedSources} · врач{" "}
													{migrationDryRunSummary.doctorReviewRequiredSources}
												</span>
											</div>
											<small>
												Оператор ~
												{migrationDryRunSummary.estimatedOperatorMinutes} мин ·
												простой клиники ~
												{migrationDryRunSummary.estimatedClinicDowntimeMinutes}{" "}
												мин
											</small>
											<p>
												{humanizeMigrationText(
													migrationDryRunSummary.fastestRoute,
												)}
											</p>
											<p>
												{humanizeMigrationText(
													migrationDryRunSummary.nextBestAction,
												)}
											</p>
										</div>
									) : null}
									{migrationPrimaryOperatorStep ? (
										<div
											className="migration-primary-action"
											data-testid="migration-autopilot-primary-action"
											aria-label="Главное действие миграции сейчас"
										>
											<div>
												<strong>
													Сейчас: {migrationPrimaryOperatorStep.title}
												</strong>
												<span>
													{migrationOwnerLabels[
														migrationPrimaryOperatorStep.owner
													] ??
														humanizeMigrationText(
															migrationPrimaryOperatorStep.owner,
														)}{" "}
													· {migrationPrimaryOperatorStep.estimatedMinutes} мин
													·{" "}
													{migrationPrimaryOperatorStep.blocking
														? "сначала это"
														: "можно параллельно"}
												</span>
												<small>
													{humanizeMigrationText(
														migrationPrimaryOperatorStep.detail,
													)}
												</small>
											</div>
											{renderMigrationOperatorStepActions(
												migrationPrimaryOperatorStep,
												migrationPrimaryOperatorCandidate,
												"primary",
											)}
										</div>
									) : null}
									{migrationTriageItems.length ? (
										<div
											className="migration-triage-queue"
											data-testid="migration-triage-queue"
											aria-label="Короткая очередь миграции для администратора"
										>
											<div className="migration-triage-head">
												<strong>Очередь действий</strong>
												<span>
													Сначала стопоры, затем задачи, которые можно
													подготовить параллельно.
												</span>
											</div>
											<div className="migration-triage-grid">
												{migrationTriageItems.map((item) => (
													<div
														className={`migration-triage-item status-${item.status}`}
														key={item.id}
													>
														<strong>{item.title}</strong>
														<span>
															{migrationOwnerLabels[item.owner] ??
																humanizeMigrationText(item.owner)}{" "}
															·{" "}
															{migrationHandoffPhaseLabels[item.phase] ??
																humanizeMigrationText(item.phase)}{" "}
															·{" "}
															{migrationOperatorPacketStatusLabels[
																item.status
															] ?? humanizeMigrationText(item.status)}{" "}
															· {item.blocking ? "сначала это" : "параллельно"}
														</span>
														<small>{humanizeMigrationText(item.detail)}</small>
														<small>
															Что нужно:{" "}
															{humanizeMigrationText(item.requiredArtifact)}
														</small>
														<small>
															Готово, когда:{" "}
															{humanizeMigrationText(item.doneWhen)}
														</small>
													</div>
												))}
											</div>
										</div>
									) : null}
									{migrationAutopilot.operatorPacket.operatorScript ? (
										<div
											className="migration-autopilot-script"
											data-testid="migration-autopilot-operator-script"
											aria-label="Что делать сейчас для миграции"
										>
											<div className="dicom-discovery-head">
												<strong>
													{
														migrationAutopilot.operatorPacket.operatorScript
															.title
													}{" "}
													· ~
													{
														migrationAutopilot.operatorPacket.operatorScript
															.totalEstimatedMinutes
													}{" "}
													мин
												</strong>
												<span>
													{
														migrationAutopilot.operatorPacket.operatorScript
															.headline
													}
												</span>
											</div>
											<div className="migration-autopilot-summary">
												{migrationOperatorScriptSteps
													.slice(0, 7)
													.map((step) => {
														const scriptCandidate = step.sourceFingerprint
															? typedMigrationAutopilotSources.find(
																	(source) =>
																		source.candidate.sourceFingerprint ===
																		step.sourceFingerprint,
																)?.candidate
															: null;
														return (
															<article key={step.id}>
																<strong>{step.title}</strong>
																<span>
																	{migrationOwnerLabels[step.owner] ??
																		humanizeMigrationText(step.owner)}{" "}
																	· {step.estimatedMinutes} мин ·{" "}
																	{step.blocking
																		? "обязательно"
																		: "параллельно"}
																</span>
																<small>
																	{humanizeMigrationText(step.detail)}
																</small>
																{renderMigrationOperatorStepActions(
																	step,
																	scriptCandidate,
																	"script",
																)}
															</article>
														);
													})}
											</div>
										</div>
									) : null}
									<div className="migration-autopilot-summary">
										{typedMigrationOperatorLanes.slice(0, 5).map((lane) => (
											<article key={lane.id}>
												<strong>{lane.title}</strong>
												<span>
													{migrationOwnerLabels[lane.owner] ??
														humanizeMigrationText(lane.owner)}{" "}
													·{" "}
													{migrationOperatorPacketStatusLabels[lane.status] ??
														humanizeMigrationText(lane.status)}{" "}
													· {Math.round(lane.score * 100)}%
												</span>
												<small>{humanizeMigrationText(lane.detail)}</small>
												<small>{humanizeMigrationText(lane.nextAction)}</small>
											</article>
										))}
									</div>
									<div
										className="migration-source-artifact-list"
										aria-label="Первые действия миграции"
									>
										{migrationAutopilot.operatorPacket.firstActions
											.slice(0, 6)
											.map((action: string) => (
												<span key={action}>
													{humanizeMigrationText(action)}
												</span>
											))}
									</div>
									<div
										className="migration-autopilot-summary"
										data-testid="migration-autopilot-handoff-checklist"
										aria-label="Чеклист передачи миграции"
									>
										{typedMigrationHandoffChecklist.slice(0, 6).map((item) => (
											<article key={item.id}>
												<strong>{item.title}</strong>
												<span>
													{migrationOwnerLabels[item.owner] ??
														humanizeMigrationText(item.owner)}{" "}
													·{" "}
													{migrationHandoffPhaseLabels[item.phase] ??
														humanizeMigrationText(item.phase)}{" "}
													·{" "}
													{migrationOperatorPacketStatusLabels[item.status] ??
														humanizeMigrationText(item.status)}
												</span>
												<small>{humanizeMigrationText(item.detail)}</small>
												<small>
													Нужно: {humanizeMigrationText(item.requiredArtifact)}
												</small>
												<small>{humanizeMigrationText(item.doneWhen)}</small>
											</article>
										))}
									</div>
									{renderMigrationTechnicalNotes(
										"Границы онлайн-поиска",
										[
											`Онлайн-поиск: ${humanizeMigrationColumns(migrationAutopilot.operatorPacket.onlineLookupPolicy.allowed) || "нет доступных публичных полей"}`,
											`Не отправлять в онлайн-поиск: ${humanizeMigrationColumns(migrationAutopilot.operatorPacket.onlineLookupPolicy.forbidden, 6)}`,
										],
										"migration-autopilot-technical-boundary",
									)}
								</div>
							) : null}
							<div className="migration-autopilot-summary">
								{typedMigrationAutopilotSteps.slice(0, 6).map((step) => (
									<article key={`${step.order}:${step.title}`}>
										<strong>
											{step.order}. {step.title}
										</strong>
										<span>
											{migrationOwnerLabels[step.owner] ??
												humanizeMigrationText(step.owner)}{" "}
											· {step.blocking ? "обязательно" : "можно параллельно"}
										</span>
										<small>{humanizeMigrationText(step.detail)}</small>
									</article>
								))}
							</div>
							{typedMigrationAutopilotSources.length ? (
								<div className="dicom-discovery-grid">
									{typedMigrationAutopilotSources
										.slice(0, 6)
										.map((source, index) => {
											const sourceDisplayName = migrationSourceDisplayName(
												source.candidate,
												index,
											);
											return (
												<article key={source.candidate.sourceFingerprint}>
													<strong>{sourceDisplayName}</strong>
													<span>
														{migrationPriorityLabels[source.priority] ??
															humanizeMigrationText(source.priority)}{" "}
														·{" "}
														{migrationOwnerLabels[source.owner] ??
															humanizeMigrationText(source.owner)}{" "}
														· {Math.round(source.score * 100)}%
													</span>
													{source.readiness ? (
														<small>
															Готовность:{" "}
															{migrationReadinessLevelLabels[
																source.readiness.level
															] ??
																humanizeMigrationText(
																	source.readiness.level,
																)}{" "}
															· {Math.round(source.readiness.score * 100)}% ·
															блокеров {source.readiness.blockers.length}
														</small>
													) : null}
													{source.bridgeKit ? (
														<small>
															Маршрут:{" "}
															{migrationBridgeKitKindLabels[
																source.bridgeKit.kind
															] ??
																humanizeMigrationText(
																	source.bridgeKit.kind,
																)}{" "}
															·{" "}
															{migrationBridgeKitStatusLabels[
																source.bridgeKit.status
															] ??
																humanizeMigrationText(
																	source.bridgeKit.status,
																)}{" "}
															·{" "}
															{humanizeMigrationList(
																source.bridgeKit.requiredTools,
																2,
															)}
														</small>
													) : null}
													<small>
														{migrationSourceKindLabel(
															source.candidate.sourceKind,
														)}{" "}
														· источник {index + 1} · файлов{" "}
														{source.candidate.matchedFiles}
													</small>
													{source.probe ? (
														<small>
															Проверено: базы {source.probe.counts.databases} ·
															КТ/серий {source.probe.counts.dicom} · снимков{" "}
															{source.probe.counts.images} · таблиц{" "}
															{source.probe.counts.tables}
														</small>
													) : (
														<small>Источник еще не проверяли детально.</small>
													)}
													<span>
														{humanizeMigrationText(source.recommendedAction)}
													</span>
													{source.riskFlags.slice(0, 4).map((flag: string) => (
														<small key={flag}>
															{humanizeMigrationText(flag)}
														</small>
													))}
													{source.readiness?.blockers
														.slice(0, 2)
														.map((item) => (
															<small key={item.id}>
																{migrationOwnerLabels[item.owner] ??
																	humanizeMigrationText(item.owner)}
																: {humanizeMigrationText(item.title)} ·{" "}
																{humanizeMigrationText(item.nextAction)}
															</small>
														))}
													{source.probe?.adapters.slice(0, 2).map((adapter) => (
														<small key={adapter.id}>
															{humanizeMigrationText(adapter.title)}:{" "}
															{migrationAdapterStatusLabels[adapter.status] ??
																humanizeMigrationText(adapter.status)}{" "}
															· {Math.round(adapter.confidence * 100)}%
														</small>
													))}
													<div className="migration-source-card-actions">
														<button
															className="text-button"
															type="button"
															onClick={() =>
																planMigrationDiscoveryCandidate(
																	source.candidate,
																)
															}
															disabled={isMigrationSourceWorkupLoading}
															aria-label={`Открыть план переноса: ${sourceDisplayName}`}
														>
															<ClipboardCheck aria-hidden="true" /> План
															переноса
														</button>
														<button
															className="text-button"
															type="button"
															onClick={() =>
																probeMigrationDiscoveryCandidate(
																	source.candidate,
																)
															}
															disabled={isMigrationSourceProbeLoading}
															aria-label={`Проверить источник: ${sourceDisplayName}`}
														>
															<ScanSearch aria-hidden="true" /> Проверить
															источник
														</button>
														<button
															className="text-button"
															type="button"
															onClick={() =>
																addMigrationDiscoveryCandidateToSmartImport(
																	source.candidate,
																)
															}
															aria-label={`Отправить источник в разбор: ${sourceDisplayName}`}
														>
															<UploadCloud aria-hidden="true" /> Отправить в
															разбор
														</button>
														<button
															className="text-button"
															type="button"
															onClick={() =>
																void previewMigrationDiscoveryCandidate(
																	source.candidate,
																)
															}
															disabled={
																isSmartImportLoading ||
																!migrationCandidatePreviewReady(
																	source.candidate,
																)
															}
															title={migrationCandidatePreviewHint(
																source.candidate,
															)}
															aria-label={`Построить предпросмотр: ${sourceDisplayName}`}
														>
															<FileCheck2 aria-hidden="true" /> Предпросмотр
														</button>
														{!migrationCandidatePreviewReady(
															source.candidate,
														) ? (
															<small className="migration-action-hint">
																{migrationCandidatePreviewHint(
																	source.candidate,
																)}
															</small>
														) : null}
													</div>
												</article>
											);
										})}
								</div>
							) : null}
							{typedMigrationAutopilotClinicLookup ? (
								<div className="migration-autopilot-clinic">
									<strong>
										Реквизиты клиники:{" "}
										{clinicPublicLookupProviderStatusLabels[
											typedMigrationAutopilotClinicLookup.providerStatus
										] ??
											humanizeMigrationText(
												typedMigrationAutopilotClinicLookup.providerStatus,
											)}{" "}
										·{" "}
										{typedMigrationAutopilotClinicLookup.safeQuery ||
											"без запроса"}
									</strong>
									<span>
										{humanizeMigrationText(
											typedMigrationAutopilotClinicLookup.nextAction,
										)}
									</span>
									<small className="clinic-public-boundary">
										{clinicPublicLookupBoundaryText}
									</small>
									<div className="clinic-public-targets">
										{typedMigrationAutopilotClinicLookup.publicLookupTargets
											.slice(0, 4)
											.map((target) => (
												<a
													className="secondary-button"
													href={target.url}
													key={`${target.kind}:${target.title}`}
													target="_blank"
													rel="noreferrer noopener"
													aria-label={`Открыть публичный источник реквизитов в новой вкладке: ${target.title}`}
													title={`Открыть публичный источник реквизитов в новой вкладке: ${target.title}`}
												>
													<ExternalLink aria-hidden="true" /> {target.title}
												</a>
											))}
									</div>
									{typedMigrationAutopilotClinicLookup.suggestions.length ? (
										<div
											className="clinic-public-suggestions"
											data-testid="migration-autopilot-clinic-suggestions"
										>
											{typedMigrationAutopilotClinicLookup.suggestions
												.slice(0, 3)
												.map((suggestion) => (
													<article
														key={`${suggestion.source}:${suggestion.confidence}:${suggestion.fields.inn ?? suggestion.fields.clinicName ?? "clinic"}`}
													>
														<strong>
															{suggestion.fields.legalName ??
																suggestion.fields.clinicName ??
																"Подсказка реквизитов"}
														</strong>
														<span>
															{clinicPublicLookupSuggestionSourceLabels[
																suggestion.source
															] ??
																humanizeMigrationText(suggestion.source)}{" "}
															· {Math.round(suggestion.confidence * 100)}%
														</span>
														<small>
															{clinicLookupSuggestionFieldEntries(
																suggestion.fields,
															)
																.map(
																	([key, value]) =>
																		`${clinicPublicLookupFieldLabels[key] ?? key}: ${String(value).trim()}`,
																)
																.slice(0, 5)
																.join(" · ") || "Нет применимых полей"}
														</small>
														<small className="clinic-public-apply-summary">
															{clinicLookupSuggestionApplySummary(
																suggestion.fields,
															)}
														</small>
														<button
															className="text-button"
															type="button"
															disabled={
																!clinicLookupSuggestionFieldEntries(
																	suggestion.fields,
																).length
															}
															onClick={() =>
																applyClinicLookupSuggestion(suggestion.fields)
															}
															data-testid="apply-migration-autopilot-clinic-profile"
														>
															Подставить в профиль
														</button>
													</article>
												))}
										</div>
									) : null}
									{typedMigrationAutopilotClinicLookup.warnings
										.slice(0, 3)
										.map((warning: string) => (
											<small key={warning}>
												{clinicPublicLookupWarningText(warning)}
											</small>
										))}
									<div className="clinic-public-save-row">
										<span>
											Подстановка меняет черновик. Для документов и оплат
											сохраните профиль клиники.
										</span>
										<button
											className="secondary-button"
											type="button"
											onClick={() => void saveClinicProfileFromDraft()}
											disabled={clinicProfileSaveState === "saving"}
											data-testid="save-migration-autopilot-clinic-profile"
										>
											<ShieldCheck aria-hidden="true" />{" "}
											{clinicProfileSaveButtonText}
										</button>
									</div>
								</div>
							) : null}
							{migrationAutopilot.warnings
								.slice(0, 4)
								.map((warning: string) => (
									<small key={warning}>{humanizeMigrationText(warning)}</small>
								))}
							{renderMigrationTechnicalNotes(
								"Технические границы автоплана",
								migrationAutopilot.privacyWarnings,
								"migration-autopilot-privacy-notes",
							)}
						</div>
					) : null}

					{typedMigrationSourceDiscovery ? (
						<div
							className="dicom-discovery-result migration-source-discovery-result"
							data-testid="migration-source-discovery-result"
							aria-label="Автопоиск старых баз, выгрузок и снимков"
						>
							<div className="dicom-discovery-head">
								<strong>
									Найдено источников: {typedMigrationDiscoveryCandidates.length}{" "}
									· просканировано папок:{" "}
									{typedMigrationSourceDiscovery.scannedFolders}
								</strong>
								<span>
									{migrationAutopilot
										? "Автоплан уже построен выше. Начните с блока «Сейчас» или откройте карточку источника."
										: humanizeMigrationText(
												typedMigrationSourceDiscovery.nextAction,
											)}
								</span>
								<span>
									Карточки ниже уже готовы к плану переноса, проверке источника,
									предпросмотру или разбору.
								</span>
							</div>
							<div className="dicom-discovery-grid">
								{typedMigrationDiscoveryCandidates
									.slice(0, 9)
									.map((candidate, index) => {
										const candidateDisplayName = migrationSourceDisplayName(
											candidate,
											index,
										);
										return (
											<article key={candidate.sourceFingerprint}>
												<strong>{candidateDisplayName}</strong>
												<span>
													{humanizeMigrationText(candidate.sourceLabel)} ·{" "}
													{migrationSourceKindLabel(candidate.sourceKind)} ·
													источник {index + 1}
												</span>
												<small>
													{Math.round(candidate.confidence * 100)}% · файлов{" "}
													{candidate.matchedFiles} · базы{" "}
													{candidate.databaseFiles} · КТ/серии{" "}
													{candidate.dicomLikeFiles} · изображений{" "}
													{candidate.imageFiles}
												</small>
												{candidate.latestModifiedAt ? (
													<small>
														Последнее изменение:{" "}
														{formatDateTime(candidate.latestModifiedAt)}
													</small>
												) : null}
												{candidate.reasons.slice(0, 3).map((reason: string) => (
													<span key={reason}>
														{humanizeMigrationText(reason)}
													</span>
												))}
												{candidate.warnings
													.slice(0, 2)
													.map((warning: string) => (
														<small key={warning}>
															{humanizeMigrationText(warning)}
														</small>
													))}
												<div className="migration-source-card-actions">
													<button
														className="text-button"
														type="button"
														onClick={() =>
															planMigrationDiscoveryCandidate(candidate)
														}
														disabled={isMigrationSourceWorkupLoading}
														aria-label={`Открыть план переноса: ${candidateDisplayName}`}
													>
														<ClipboardCheck aria-hidden="true" /> План переноса
													</button>
													<button
														className="text-button"
														type="button"
														onClick={() =>
															probeMigrationDiscoveryCandidate(candidate)
														}
														disabled={isMigrationSourceProbeLoading}
														aria-label={`Проверить источник: ${candidateDisplayName}`}
													>
														<ScanSearch aria-hidden="true" /> Проверить источник
													</button>
													<button
														className="text-button"
														type="button"
														onClick={() =>
															addMigrationDiscoveryCandidateToSmartImport(
																candidate,
															)
														}
														aria-label={`Отправить источник в разбор: ${candidateDisplayName}`}
													>
														<UploadCloud aria-hidden="true" /> Отправить в
														разбор
													</button>
													<button
														className="text-button"
														type="button"
														onClick={() =>
															void previewMigrationDiscoveryCandidate(candidate)
														}
														disabled={
															isSmartImportLoading ||
															!migrationCandidatePreviewReady(candidate)
														}
														title={migrationCandidatePreviewHint(candidate)}
														aria-label={`Построить предпросмотр: ${candidateDisplayName}`}
													>
														<FileCheck2 aria-hidden="true" /> Предпросмотр
													</button>
													{!migrationCandidatePreviewReady(candidate) ? (
														<small className="migration-action-hint">
															{migrationCandidatePreviewHint(candidate)}
														</small>
													) : null}
												</div>
											</article>
										);
									})}
							</div>
							{!typedMigrationDiscoveryCandidates.length ? (
								<div
									className="migration-empty-recovery"
									data-testid="pc-migration-empty-recovery"
									role="status"
									aria-live="polite"
								>
									<strong>
										Автопоиск не нашел старую МИС в пределах лимитов
									</strong>
									<span>
										Дальше не нужен айтишник: выберите папку/диск вручную,
										вставьте пару строк выгрузки или заполните реквизиты клиники
										для документов.
									</span>
									<div className="migration-source-card-actions">
										<button
											className="secondary-button"
											type="button"
											onClick={() => void pickBrowserMigrationSource()}
											disabled={
												isBrowserMigrationScanning ||
												isMigrationAutopilotLoading
											}
										>
											<Database aria-hidden="true" /> Папка/диск
										</button>
										<button
											className="secondary-button"
											type="button"
											onClick={focusSmartImportWorkbench}
										>
											<FileText aria-hidden="true" /> Вставить текст
										</button>
										<button
											className="secondary-button"
											type="button"
											onClick={() => void lookupClinicPublicProfile()}
											disabled={isClinicPublicLookupLoading}
										>
											<Search aria-hidden="true" /> Реквизиты
										</button>
									</div>
								</div>
							) : null}
							{typedMigrationSourceDiscovery.warnings
								.slice(0, 4)
								.map((warning) => (
									<small key={warning}>{humanizeMigrationText(warning)}</small>
								))}
						</div>
					) : null}

					{typedMigrationSourceWorkup ? (
						<div
							className="dicom-discovery-result migration-source-workup-result"
							data-testid="migration-source-workup-result"
							aria-label="План миграции найденного источника"
						>
							<div className="dicom-discovery-head">
								<strong>
									План переноса:{" "}
									{migrationSourceDisplayName(typedMigrationSourceWorkup)} ·{" "}
									{migrationSourceKindLabel(
										typedMigrationSourceWorkup.sourceKind,
									)}
								</strong>
								<span>
									{humanizeMigrationText(
										typedMigrationSourceWorkup.sourceLabel,
									)}{" "}
									·{" "}
									{typedMigrationSourceWorkup.sourceExists
										? "источник доступен"
										: "источник сейчас не доступен"}{" "}
									·{" "}
									{migrationAutomationLevelLabels[
										typedMigrationSourceWorkup.automationLevel
									] ??
										humanizeMigrationText(
											typedMigrationSourceWorkup.automationLevel,
										)}
								</span>
								<span>
									{humanizeMigrationText(typedMigrationSourceWorkup.nextAction)}
								</span>
								<span>
									{humanizeMigrationText(
										typedMigrationSourceWorkup.recommendedRoute,
									)}
								</span>
							</div>
							<div
								className="migration-source-workup-lanes"
								aria-label="Готовность источника к миграции"
							>
								<article>
									<strong>
										Готовность:{" "}
										{migrationReadinessLevelLabels[
											typedMigrationSourceWorkup.readiness.level
										] ??
											humanizeMigrationText(
												typedMigrationSourceWorkup.readiness.level,
											)}{" "}
										·{" "}
										{Math.round(
											typedMigrationSourceWorkup.readiness.score * 100,
										)}
										%
									</strong>
									<p>
										{humanizeMigrationText(
											typedMigrationSourceWorkup.readiness.nextAction,
										)}
									</p>
									<small>
										Блокеры{" "}
										{typedMigrationSourceWorkup.readiness.blockers.length} ·
										предупреждения{" "}
										{typedMigrationSourceWorkup.readiness.warnings.length} ·
										готово {typedMigrationSourceWorkup.readiness.ready.length}
									</small>
								</article>
								<article>
									<strong>Что мешает</strong>
									{typedMigrationWorkupReadinessIssues
										.slice(0, 3)
										.map((item) => (
											<span key={item.id}>
												{migrationOwnerLabels[item.owner] ??
													humanizeMigrationText(item.owner)}
												: {humanizeMigrationText(item.title)}
											</span>
										))}
								</article>
							</div>
							<div
								className="migration-source-workup-lanes"
								aria-label="План подключения источника миграции"
							>
								<article>
									<strong>
										Маршрут:{" "}
										{migrationBridgeKitKindLabels[
											typedMigrationSourceWorkup.bridgeKit.kind
										] ??
											humanizeMigrationText(
												typedMigrationSourceWorkup.bridgeKit.kind,
											)}{" "}
										·{" "}
										{migrationBridgeKitStatusLabels[
											typedMigrationSourceWorkup.bridgeKit.status
										] ??
											humanizeMigrationText(
												typedMigrationSourceWorkup.bridgeKit.status,
											)}
									</strong>
									<p>
										{humanizeMigrationText(
											typedMigrationSourceWorkup.bridgeKit.nextAction,
										)}
									</p>
									<small>
										{humanizeMigrationList(
											typedMigrationSourceWorkup.bridgeKit.requiredTools,
											4,
										)}
									</small>
								</article>
								<article>
									<strong>Файл для проверки</strong>
									<span>
										{humanizeMigrationText(
											typedMigrationSourceWorkup.bridgeKit.outputManifest
												.format,
										)}
									</span>
									<small>
										{humanizeMigrationColumns(
											typedMigrationSourceWorkup.bridgeKit.outputManifest
												.requiredColumns,
											5,
										)}
									</small>
								</article>
							</div>
							<div className="migration-source-workup-lanes">
								<article>
									<strong>Что можно вытянуть</strong>
									<p>
										{typedMigrationSourceWorkup.extractableEntities
											.map(
												(entity) =>
													migrationEntityLabels[entity] ??
													humanizeMigrationText(entity),
											)
											.join(" · ")}
									</p>
									<small>
										{humanizeMigrationList(
											typedMigrationSourceWorkup.requiredArtifacts,
										)}
									</small>
								</article>
								<article>
									<strong>Передача в CRM</strong>
									{typedMigrationSourceWorkup.handoffs
										.slice(0, 3)
										.map((handoff) => (
											<span key={`${handoff.method}:${handoff.endpoint}`}>
												{humanizeMigrationText(handoff.title)} ·{" "}
												{migrationHandoffRouteLabel(handoff)}
											</span>
										))}
								</article>
							</div>
							<div className="dicom-discovery-grid">
								{typedMigrationSourceWorkup.steps.map((step) => (
									<article key={step.id}>
										<strong>{step.title}</strong>
										<span>
											{migrationWorkupStepStatusLabels[step.status] ??
												humanizeMigrationText(step.status)}{" "}
											· {humanizeMigrationText(step.actionLabel)}
										</span>
										<small>{humanizeMigrationText(step.detail)}</small>
									</article>
								))}
							</div>
							{typedMigrationSourceWorkup.warnings
								.slice(0, 4)
								.map((warning) => (
									<small key={warning}>{humanizeMigrationText(warning)}</small>
								))}
							{renderMigrationTechnicalNotes(
								"Технические границы плана",
								typedMigrationSourceWorkup.privacyWarnings,
								"migration-source-workup-privacy-notes",
							)}
						</div>
					) : null}

					{typedMigrationSourceProbe ? (
						<div
							className="dicom-discovery-result migration-source-probe-result"
							data-testid="migration-source-probe-result"
							aria-label="Проверка найденного источника миграции без записи"
						>
							<div className="dicom-discovery-head">
								<strong>
									Проверка источника:{" "}
									{migrationSourceDisplayName(typedMigrationSourceProbe)} ·{" "}
									{migrationSourceKindLabel(
										typedMigrationSourceProbe.sourceKind,
									)}
								</strong>
								<span>
									{humanizeMigrationText(typedMigrationSourceProbe.sourceLabel)}{" "}
									· папок {typedMigrationSourceProbe.scannedFolders} · файлов{" "}
									{typedMigrationSourceProbe.scannedFiles}
								</span>
								<span>
									{humanizeMigrationText(typedMigrationSourceProbe.nextAction)}
								</span>
								<span>
									{humanizeMigrationText(
										typedMigrationSourceProbe.recommendedRoute,
									)}
								</span>
							</div>
							<div
								className="migration-source-workup-lanes"
								aria-label="Готовность пробы источника к миграции"
							>
								<article>
									<strong>
										Готовность:{" "}
										{migrationReadinessLevelLabels[
											typedMigrationSourceProbe.readiness.level
										] ??
											humanizeMigrationText(
												typedMigrationSourceProbe.readiness.level,
											)}{" "}
										·{" "}
										{Math.round(
											typedMigrationSourceProbe.readiness.score * 100,
										)}
										%
									</strong>
									<p>
										{humanizeMigrationText(
											typedMigrationSourceProbe.readiness.nextAction,
										)}
									</p>
									<small>
										Блокеры{" "}
										{typedMigrationSourceProbe.readiness.blockers.length} ·
										предупреждения{" "}
										{typedMigrationSourceProbe.readiness.warnings.length} ·
										готово {typedMigrationSourceProbe.readiness.ready.length}
									</small>
								</article>
								<article>
									<strong>Что мешает</strong>
									{typedMigrationProbeReadinessIssues
										.slice(0, 3)
										.map((item) => (
											<span key={item.id}>
												{migrationOwnerLabels[item.owner] ??
													humanizeMigrationText(item.owner)}
												: {humanizeMigrationText(item.title)}
											</span>
										))}
								</article>
							</div>
							<div
								className="migration-source-workup-lanes"
								aria-label="План проверки источника миграции"
							>
								<article>
									<strong>
										Маршрут:{" "}
										{migrationBridgeKitKindLabels[
											typedMigrationSourceProbe.bridgeKit.kind
										] ??
											humanizeMigrationText(
												typedMigrationSourceProbe.bridgeKit.kind,
											)}{" "}
										·{" "}
										{migrationBridgeKitStatusLabels[
											typedMigrationSourceProbe.bridgeKit.status
										] ??
											humanizeMigrationText(
												typedMigrationSourceProbe.bridgeKit.status,
											)}
									</strong>
									<p>
										{humanizeMigrationText(
											typedMigrationSourceProbe.bridgeKit.nextAction,
										)}
									</p>
									<small>
										{humanizeMigrationList(
											typedMigrationSourceProbe.bridgeKit.requiredTools,
											4,
										)}
									</small>
								</article>
								<article>
									<strong>Запрещено наружу</strong>
									<span>
										{humanizeMigrationColumns(
											typedMigrationSourceProbe.bridgeKit.outputManifest
												.forbiddenFields,
											4,
										)}
									</span>
									<small>
										{humanizeMigrationText(
											typedMigrationSourceProbe.bridgeKit.privacyBoundary,
										)}
									</small>
								</article>
							</div>
							<div className="migration-source-workup-lanes">
								<article>
									<strong>Инвентарь</strong>
									<p>
										базы {typedMigrationSourceProbe.counts.databases} ·
										резервные копии {typedMigrationSourceProbe.counts.dumps} ·
										таблицы {typedMigrationSourceProbe.counts.tables} · архивы{" "}
										{typedMigrationSourceProbe.counts.archives} · КТ/серии{" "}
										{typedMigrationSourceProbe.counts.dicom} · снимки{" "}
										{typedMigrationSourceProbe.counts.images} · 3D{" "}
										{typedMigrationSourceProbe.counts.models}
									</p>
									<small>
										{typedMigrationSourceProbe.detectedVendors.length
											? humanizeMigrationList(
													typedMigrationSourceProbe.detectedVendors,
												)
											: "Программа не распознана"}
									</small>
								</article>
								<article>
									<strong>Сигнатуры</strong>
									<p>
										{humanizeMigrationList(
											typedMigrationSourceProbe.formatSignals,
											8,
										) || "Только имя/расширение, без читаемой сигнатуры"}
									</p>
									<small>
										Пути и похожие на ФИО имена файлов скрыты во внутренние
										номера.
									</small>
								</article>
							</div>
							<div className="dicom-discovery-grid">
								{typedMigrationSourceProbe.adapters
									.slice(0, 4)
									.map((adapter) => (
										<article key={adapter.id}>
											<strong>{humanizeMigrationText(adapter.title)}</strong>
											<span>
												{migrationAdapterStatusLabels[adapter.status] ??
													humanizeMigrationText(adapter.status)}{" "}
												· {Math.round(adapter.confidence * 100)}%
											</span>
											<small>{humanizeMigrationText(adapter.input)}</small>
											<small>{humanizeMigrationText(adapter.output)}</small>
											<span>{humanizeMigrationText(adapter.nextAction)}</span>
										</article>
									))}
							</div>
							{typedMigrationSourceProbe.artifactSamples.length ? (
								<div
									className="migration-source-artifact-list"
									aria-label="Безопасные примеры найденных артефактов"
								>
									{typedMigrationSourceProbe.artifactSamples
										.slice(0, 8)
										.map((artifact) => (
											<span key={artifact.id}>
												{artifact.safeName} ·{" "}
												{humanizeMigrationText(artifact.kind)}
												{artifact.byteSize !== null
													? ` · ${formatByteSize(artifact.byteSize)}`
													: ""}
											</span>
										))}
								</div>
							) : null}
							{typedMigrationSourceProbe.warnings.slice(0, 4).map((warning) => (
								<small key={warning}>{humanizeMigrationText(warning)}</small>
							))}
							{renderMigrationTechnicalNotes(
								"Технические границы пробы",
								typedMigrationSourceProbe.privacyWarnings,
								"migration-source-probe-privacy-notes",
							)}
						</div>
					) : null}

					{clinicPublicLookup && settingsTab === "imports" ? (
						<div
							className="clinic-public-lookup-result smart-clinic-public-lookup"
							aria-label="Публичные источники для профиля клиники"
						>
							<div className="dicom-discovery-head">
								<strong>
									Реквизиты клиники:{" "}
									{clinicPublicLookupProviderStatusLabels[
										clinicPublicLookup.providerStatus
									] ??
										humanizeMigrationText(
											clinicPublicLookup.providerStatus,
										)}{" "}
									· {clinicPublicLookup.safeQuery || "без запроса"}
								</strong>
								<span>
									{humanizeMigrationText(clinicPublicLookup.nextAction)}
								</span>
							</div>
							<small className="clinic-public-boundary">
								{clinicPublicLookupBoundaryText}
							</small>
							{clinicPublicLookup.suggestions.length ? (
								<div className="clinic-public-suggestions">
									{typedClinicPublicLookupSuggestions
										.slice(0, 3)
										.map((suggestion, index) => (
											<article key={`${suggestion.source}-${index}`}>
												<strong>
													{clinicPublicLookupSuggestionSourceLabels[
														suggestion.source
													] ?? humanizeMigrationText(suggestion.source)}{" "}
													· {Math.round(suggestion.confidence * 100)}%
												</strong>
												<p>
													{clinicLookupSuggestionFieldEntries(suggestion.fields)
														.map(
															([key, value]) =>
																`${clinicPublicLookupFieldLabels[key] ?? key}: ${String(value).trim()}`,
														)
														.join(" · ")}
												</p>
												<small className="clinic-public-apply-summary">
													{clinicLookupSuggestionApplySummary(
														suggestion.fields,
													)}
												</small>
												<button
													className="text-button"
													type="button"
													disabled={
														!clinicLookupSuggestionFieldEntries(
															suggestion.fields,
														).length
													}
													onClick={() =>
														applyClinicLookupSuggestion(suggestion.fields)
													}
												>
													Подставить в профиль
												</button>
											</article>
										))}
								</div>
							) : null}
							<div className="clinic-public-targets">
								{typedClinicPublicLookupTargets.map((target) => (
									<a
										className="secondary-button"
										href={target.url}
										key={`${target.kind}:${target.title}`}
										target="_blank"
										rel="noreferrer noopener"
										aria-label={`Открыть публичный источник реквизитов в новой вкладке: ${target.title}`}
										title={`Открыть публичный источник реквизитов в новой вкладке: ${target.title}`}
									>
										<ExternalLink aria-hidden="true" /> {target.title}
									</a>
								))}
							</div>
							{clinicPublicLookup.warnings
								.slice(0, 3)
								.map((warning: string) => (
									<small key={warning}>
										{clinicPublicLookupWarningText(warning)}
									</small>
								))}
							<div className="clinic-public-save-row">
								<button
									className="secondary-button"
									type="button"
									data-testid="save-imports-clinic-profile"
									disabled={clinicProfileSaveState === "saving"}
									aria-busy={clinicProfileSaveState === "saving" || undefined}
									onClick={() => void saveClinicProfileFromDraft()}
								>
									<ShieldCheck aria-hidden="true" />{" "}
									{clinicProfileSaveButtonText}
								</button>
								<small>
									После подстановки сохраните профиль, иначе реквизиты не
									попадут в документы и платежные формы.
								</small>
							</div>
						</div>
					) : null}

					{typedSmartImportPreview ? (
						<div className="import-preview">
							<div className="import-stats">
								<span>{typedSmartImportPreview.totalLines} строк</span>
								<span>
									{typedSmartImportPreview.patientPreview.totalRows} пациентов
								</span>
								<span>
									{typedSmartImportPreview.imagingPreview.totalRows} снимков
								</span>
								<span>
									{typedSmartImportPreview.clinicSuggestion
										? Object.keys(
												typedSmartImportPreview.clinicSuggestion.fields,
											).length
										: 0}{" "}
									реквизитов
								</span>
								<span>
									{typedSmartImportPreview.legacySources.length} источников
								</span>
								<span>
									{
										typedSmartImportPreview.lineClassifications.filter(
											(row) => row.kind === "ignored",
										).length
									}{" "}
									пропущено
								</span>
							</div>
							<div className="import-actions">
								<button
									className="secondary-button"
									type="button"
									onClick={commitSmartImport}
									disabled={
										isSmartImportCommitting ||
										!smartImportInputReady ||
										(typedSmartImportPreview.patientPreview.readyRows === 0 &&
											typedSmartImportPreview.imagingPreview.readyRows === 0)
									}
									aria-busy={isSmartImportCommitting || undefined}
								>
									<CheckCircle2 aria-hidden="true" />{" "}
									{isSmartImportCommitting ? "Записываю" : "Записать готовые"}
								</button>
								{smartImportCommit ? (
									<span>
										Пациенты:{" "}
										{smartImportCommit.patientCommit?.importedCount ?? 0}.
										Снимки:{" "}
										{smartImportCommit.imagingCommit?.importedCount ?? 0}.
									</span>
								) : (
									<span>
										Применение сначала создаст новых пациентов, затем заново
										привяжет готовые снимки. Реквизиты клиники только
										подсказываются.
									</span>
								)}
							</div>
							{typedSmartImportPreview.migrationPlan ? (
								<div className="import-rows">
									{typedSmartImportPreview.migrationPlan.steps.map((step) => (
										<article
											className={`import-row import-${step.status === "blocked" ? "blocked" : step.status === "ready" ? "ready" : "warning"}`}
											key={step.id}
										>
											<strong>{step.title}</strong>
											<span>
												{smartImportMigrationPlanStatusLabels[step.status] ??
													humanizeMigrationText(step.status)}
											</span>
											<span>{step.detail}</span>
											<p>{humanizeMigrationText(step.nextAction)}</p>
										</article>
									))}
								</div>
							) : null}
							{typedSmartImportPreview.legacySources.length ? (
								<div className="import-rows">
									{typedSmartImportPreview.legacySources.map(
										(source, index) => (
											<article
												className={`import-row import-${source.automationLevel === "ready_for_preview" ? "ready" : source.automationLevel === "manual_review" ? "blocked" : "warning"}`}
												key={`${source.kind}:${source.sourceRef ?? index}`}
											>
												<strong>
													{source.title} · {Math.round(source.confidence * 100)}
													%
												</strong>
												<span>
													{migrationSourceKindLabel(source.kind)} ·{" "}
													{migrationAutomationLevelLabels[
														source.automationLevel
													] ?? humanizeMigrationText(source.automationLevel)}
												</span>
												{source.safeSourceAlias ? (
													<span>{source.safeSourceAlias}</span>
												) : null}
												<p>{humanizeMigrationText(source.recommendedRoute)}</p>
												<p>
													Нужно:{" "}
													{humanizeMigrationList(source.requiredArtifacts)}
												</p>
												{renderMigrationTechnicalNotes(
													"Технические границы источника",
													[source.privacy],
													"smart-import-legacy-source-privacy-notes",
												)}
											</article>
										),
									)}
								</div>
							) : null}
							{typedSmartImportPreview.clinicSuggestion ? (
								<div className="import-rows">
									<article className="import-row import-warning">
										<strong>
											Профиль клиники ·{" "}
											{Math.round(
												typedSmartImportPreview.clinicSuggestion.confidence *
													100,
											)}
											%
										</strong>
										<span>
											Строки:{" "}
											{typedSmartImportPreview.clinicSuggestion.sourceLineNumbers.join(
												", ",
											)}
										</span>
										<p>
											{clinicLookupSuggestionFieldEntries(
												typedSmartImportPreview.clinicSuggestion.fields,
											)
												.map(
													([key, value]) =>
														`${clinicPublicLookupFieldLabels[key] ?? key}: ${String(value).trim()}`,
												)
												.join(" · ")}
										</p>
										<small className="clinic-public-apply-summary">
											{clinicLookupSuggestionApplySummary(
												typedSmartImportPreview.clinicSuggestion.fields,
											)}
										</small>
										{typedSmartImportPreview.clinicSuggestion.warnings
											.slice(0, 2)
											.map((warning: string) => (
												<small key={warning}>
													{clinicPublicLookupWarningText(warning)}
												</small>
											))}
										<button
											className="text-button"
											type="button"
											data-testid="apply-smart-import-clinic-profile"
											disabled={
												!clinicLookupSuggestionFieldEntries(
													typedSmartImportPreview.clinicSuggestion.fields,
												).length
											}
											onClick={() =>
												applyClinicLookupSuggestion(
													typedSmartImportPreview.clinicSuggestion?.fields ??
														{},
												)
											}
										>
											Подставить в профиль
										</button>
										<div className="clinic-public-save-row">
											<button
												className="secondary-button"
												type="button"
												data-testid="save-smart-import-clinic-profile"
												disabled={clinicProfileSaveState === "saving"}
												aria-busy={
													clinicProfileSaveState === "saving" || undefined
												}
												onClick={() => void saveClinicProfileFromDraft()}
											>
												<ShieldCheck aria-hidden="true" />{" "}
												{clinicProfileSaveButtonText}
											</button>
											<small>
												Подстановка меняет черновик. Для документов и оплат
												сохраните профиль клиники.
											</small>
										</div>
									</article>
									{typedSmartImportPreview.publicLookupTargets.map((target) => (
										<article
											className="import-row import-warning"
											key={`${target.kind}:${target.url}`}
										>
											<strong>{target.title}</strong>
											<span>{target.privacy}</span>
											<p>{humanizeMigrationText(target.nextAction)}</p>
											<a
												className="text-button"
												href={target.url}
												target="_blank"
												rel="noreferrer noopener"
												aria-label={`Открыть публичный источник в новой вкладке: ${target.title}`}
												title={`Открыть публичный источник в новой вкладке: ${target.title}`}
											>
												<ExternalLink aria-hidden="true" /> Открыть
											</a>
										</article>
									))}
								</div>
							) : null}
							<div className="import-rows">
								{typedSmartImportPreview.lineClassifications.map((row) => (
									<article
										className={`import-row import-${row.kind === "ignored" ? "warning" : "ready"}`}
										key={row.lineNumber}
									>
										<strong>
											{smartImportLineKindLabels[row.kind] ?? row.kind} ·{" "}
											{Math.round(row.confidence * 100)}%
										</strong>
										<span>Строка {row.lineNumber}</span>
										<span>{row.reason}</span>
										<p>{row.text}</p>
									</article>
								))}
							</div>
						</div>
					) : null}
				</section>
			) : null}

