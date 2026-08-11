import { Sparkles, ScanSearch } from "lucide-react";
import type { SmartImportMode } from "@dental/shared";

import { MigrationKickstartPanel } from "./imports/MigrationKickstartPanel";
import { MigrationSourceDiscoveryResult } from "./imports/MigrationSourceDiscoveryResult";
import { MigrationSourceProbeResult } from "./imports/MigrationSourceProbeResult";
import { MigrationSourceWorkupResult } from "./imports/MigrationSourceWorkupResult";
import { ClinicPublicLookupResult } from "./imports/ClinicPublicLookupResult";
import { SmartImportPreviewResult } from "./imports/SmartImportPreviewResult";
import { BrowserMigrationManifestResult } from "./imports/BrowserMigrationManifestResult";

export function SettingsSmartImportTab(props: Record<string, any>) {
    const {
        smartImportMode,
        smartImportModeLabels,
        setSmartImportMode,
        setSmartImportPreview,
        setSmartImportCommit,
        smartImportInput,
        setSmartImportInput,
        runSmartImport,
        isSmartImportPreviewing,
        smartImportInputReady,
        typedMigrationAutopilotDiscovery,
        typedMigrationAutopilotProbe,
        typedMigrationAutopilotWorkup,
        typedBrowserMigrationManifest,
        clinicPublicLookupResult
    } = props;

    return (
        <section
            className="import-studio smart-import-studio"
            aria-label="Импорт данных"
        >
            <div className="import-copy">
                <Sparkles aria-hidden="true" />
                <div>
                    <p className="eyebrow">Smart Import</p>
                    <h2>Импорт базы из Инфоклиники, Идента и локальных папок</h2>
                    <p>
                        DENTE автоматически найдет и распознает базу, RVG-снимки, Excel, OCR из
                        любых папок. CRM сама создаст пациентов, их истории болезней, снимки и
                        прикрепит всё к нужным карточкам.
                    </p>
                </div>
            </div>

            <div
                role="toolbar"
                className="import-source-grid smart-mode-grid"
                aria-label="Режим импорта"
            >
                {(Object.keys(smartImportModeLabels ?? {}) as SmartImportMode[]).map(
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
                            <strong>{smartImportModeLabels?.[mode]?.title ?? mode}</strong>
                            <span>{smartImportModeLabels?.[mode]?.detail ?? ""}</span>
                        </button>
                    ),
                )}
            </div>

            <MigrationKickstartPanel {...props} />

            <div className="import-workbench">
                <textarea
                    aria-label="Ввод сырых данных для импорта"
                    placeholder={
                        "Вставьте сырой текст из Экселя, Word'a, Идента, 1С, или выписки.\nПример: Иванова Анна +7 927 111-22-33 21.04.1988\nИли: Петров Иван 10.05.2026 C:\\Снимки\\ivanova.png"
                    }
                    className="migration-textarea"
                    value={smartImportInput}
                    onChange={(e) => setSmartImportInput(e.target.value)}
                />

                <div className="import-tool-row">
                    <button
                        className="primary-button"
                        type="button"
                        onClick={() => void runSmartImport()}
                        disabled={isSmartImportPreviewing || !smartImportInputReady}
                        aria-busy={isSmartImportPreviewing || undefined}
                    >
                        <ScanSearch aria-hidden="true" /> Распознать и импортировать
                    </button>
                </div>
            </div>

            {typedMigrationAutopilotDiscovery ? (
                <MigrationSourceDiscoveryResult {...props} />
            ) : null}

            {typedMigrationAutopilotProbe ? (
                <MigrationSourceProbeResult {...props} />
            ) : null}

            {typedMigrationAutopilotWorkup ? (
                <MigrationSourceWorkupResult {...props} />
            ) : null}

            {clinicPublicLookupResult ? (
                <ClinicPublicLookupResult {...props} />
            ) : null}
            
            <SmartImportPreviewResult {...props} />

            {typedBrowserMigrationManifest ? (
                <BrowserMigrationManifestResult {...props} />
            ) : null}
        </section>
    );
}
