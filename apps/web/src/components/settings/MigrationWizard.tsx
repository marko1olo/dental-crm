/**
 * apps/web/src/components/settings/MigrationWizard.tsx
 *
 * Главный мастер переноса базы данных пациентов из старых систем (IDENT, DentalPRO, Инфодент, StomX, Excel).
 *
 * Декомпозирован в модули apps/web/src/components/settings/migrationModules/
 * Mandate 8b: Строго <= 500 строк на любой файл (фасад <= 250 строк).
 * Mandate 8d: Ноль мультяшных эмодзи.
 * Mandate 8e / 8n: Zero Dead-Ends (свобода отмены, надежная валидация, защита от зависаний).
 */

import { Check, X } from "lucide-react";
import { useState } from "react";
import {
	AUTHED_API_FILE_FAILURE,
	downloadAuthedApiFile,
} from "../../lib/authedApiFile";
import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
import "./MigrationWizard.css";
import { MigrationDiscoveryPanel } from "./migration/MigrationDiscoveryPanel";
import { MigrationSourcePanel } from "./migration/MigrationSourcePanel";
import { MigrationColumnMapperStep } from "./migrationModules/MigrationColumnMapperStep";
import { MigrationPreviewAndValidationStep } from "./migrationModules/MigrationPreviewAndValidationStep";
import type { WizardStep } from "./migrationModules/migrationWizardTypes";
import { useMigrationWizardController } from "./migrationModules/useMigrationWizardController";

/**
 * Кнопка скачивания акта сверки через защищённый fetch с токеном.
 * Должна находиться в MigrationWizard.tsx для гарантии проверяемости
 * в protectedApiFilesReachTheBrowser.test.ts.
 */
export function ReconciliationActDownloadButton(props: { runId: string }) {
	const [failure, setFailure] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	return (
		<>
			<button
				type="button"
				className="mw-btn mw-btn-ghost"
				disabled={busy}
				onClick={async () => {
					setFailure(null);
					setBusy(true);
					let objectUrl: string | null = null;
					try {
						objectUrl = await downloadAuthedApiFile(
							`/api/migration/${props.runId}/reconciliation.csv`,
							`акт-сверки-${props.runId}.csv`,
						);
					} catch (error) {
						showToast(
							actionFailureToast(
								"Ошибка скачивания файла",
								(error as { status?: number })?.status ?? null,
							),
							"error",
						);
						setFailure(
							error instanceof Error ? error.message : AUTHED_API_FILE_FAILURE,
						);
					} finally {
						setBusy(false);
						if (objectUrl)
							window.setTimeout(
								() => URL.revokeObjectURL(objectUrl as string),
								60_000,
							);
					}
				}}
			>
				{busy ? "Готовим акт…" : "Скачать акт сверки"}
			</button>
			{failure !== null && <span className="mw-error">{failure}</span>}
		</>
	);
}

const WIZARD_STEPS: ReadonlyArray<{ id: WizardStep; label: string }> = [
	{ id: "source", label: "Источник" },
	{ id: "mapping", label: "Соответствие" },
	{ id: "running", label: "Перенос" },
	{ id: "report", label: "Акт сверки" },
];

export function MigrationWizard() {
	const {
		step,
		setStep,
		busy,
		setBusy,
		error,
		resetError,
		upload,
		mapping,
		status,
		report,
		discovery,
		setDiscovery,
		allowLlm,
		setAllowLlm,
		lastRunWasDry,
		fileInputRef,
		csvHeaders,
		columnMap,
		handleColumnTargetChange,
		previewResult,
		runMapping,
		handleFile,
		startRun,
		stopPolling,
		rollback,
		runDiscovery,
		resetToSource,
	} = useMigrationWizardController();

	const currentIndex = WIZARD_STEPS.findIndex((item) => item.id === step);

	return (
		<section className="migration-wizard">
			<header className="mw-head" style={{ alignItems: "center" }}>
				<div>
					<h2 className="mw-title">Перенос базы из старой системы</h2>
					<p className="mw-subtitle">
						Каждая строка проверяется до записи в базу клиники.
					</p>
				</div>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "10px",
						flexWrap: "wrap",
					}}
				>
					<ol className="mw-steps" aria-label="Этапы переноса">
						{WIZARD_STEPS.map((item, index) => (
							<li
								key={item.id}
								className={`mw-step ${index === currentIndex ? "is-current" : ""} ${index < currentIndex ? "is-done" : ""}`}
							>
								<span className="mw-step-dot">
									{index < currentIndex ? <Check size={12} /> : index + 1}
								</span>
								<span className="mw-step-label">{item.label}</span>
							</li>
						))}
					</ol>
					<button
						type="button"
						className="mw-btn mw-btn-ghost"
						style={{ minHeight: "34px", padding: "5px 12px", fontSize: "12.5px" }}
						onClick={() => void runDiscovery()}
						disabled={busy}
					>
						Найти базы на сервере
					</button>
				</div>
			</header>

			{error !== null && (
				<div className="mw-alert mw-alert-bad" role="alert">
					<strong>{error.message}</strong>
					<span className="mw-alert-code">{error.code}</span>
					<button
						type="button"
						className="mw-alert-close"
						onClick={resetError}
						aria-label="Закрыть"
					>
						<X size={16} />
					</button>
				</div>
			)}

			{discovery !== null && (
				<MigrationDiscoveryPanel
					discovery={discovery}
					onClose={() => setDiscovery(null)}
				/>
			)}

			{step === "source" && (
				<MigrationSourcePanel
					busy={busy}
					allowLlm={allowLlm}
					onAllowLlmChange={setAllowLlm}
					fileInputRef={fileInputRef}
					onFile={(file) => void handleFile(file)}
				/>
			)}

			{step === "mapping" && upload !== null && (
				<MigrationColumnMapperStep
					upload={upload}
					mapping={mapping}
					busy={busy}
					allowLlm={allowLlm}
					onAllowLlmChange={(value) => {
						setAllowLlm(value);
						void runMapping(upload.runId, value);
					}}
					onDryRun={() => void startRun(true)}
					onLiveRun={() => void startRun(false)}
					onRestart={resetToSource}
					csvHeaders={csvHeaders}
					columnMap={columnMap}
					onColumnTargetChange={handleColumnTargetChange}
				/>
			)}

			{(step === "mapping" || step === "running" || step === "report") && (
				<MigrationPreviewAndValidationStep
					step={step}
					previewRows={previewResult.records}
					dedupReport={previewResult.report}
					status={status}
					report={report}
					dryRun={lastRunWasDry}
					runId={upload?.runId ?? ""}
					busy={busy}
					downloadButton={
						<ReconciliationActDownloadButton runId={upload?.runId ?? ""} />
					}
					onCancelRun={() => {
						stopPolling();
						setBusy(false);
						setStep("mapping");
					}}
					onLiveRun={() => void startRun(false)}
					onRollback={() => void rollback()}
					onRestart={resetToSource}
				/>
			)}
		</section>
	);
}
