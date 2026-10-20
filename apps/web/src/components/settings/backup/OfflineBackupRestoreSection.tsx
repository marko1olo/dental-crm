import type { DryRunRestoreResult } from "@dental/shared";
import { AlertTriangle, UploadCloud } from "lucide-react";
import type React from "react";
import type { RestoreBackupResult } from "../../../services/offline/offlineBackupService";
import { DropzoneRestoreArea } from "./DropzoneRestoreArea";
import { RollbackSafetyNotice } from "./RollbackSafetyNotice";
import { VerificationProgressCard } from "./VerificationProgressCard";

export interface OfflineBackupRestoreSectionProps {
	readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
	readonly handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
	readonly importFileName: string | null;
	readonly inspectError: string | null;
	readonly dryRunResult: DryRunRestoreResult | null;
	readonly importRawText: string | null;
	readonly importPassphrase: string;
	readonly showImportPassphrase: boolean;
	readonly setShowImportPassphrase: (v: boolean) => void;
	readonly handlePassphraseChangeForDryRun: (pass: string) => void;
	readonly executeDryRun: (rawText: string, pass: string) => void;
	readonly isExecutingDryRun: boolean;
	readonly handleRestore: () => void;
	readonly isImporting: boolean;
	readonly restoreError: string | null;
	readonly lastRestoreResult: RestoreBackupResult | null;
}

export const OfflineBackupRestoreSection: React.FC<
	OfflineBackupRestoreSectionProps
> = ({
	fileInputRef,
	handleFileSelect,
	importFileName,
	inspectError,
	dryRunResult,
	importRawText,
	importPassphrase,
	showImportPassphrase,
	setShowImportPassphrase,
	handlePassphraseChangeForDryRun,
	executeDryRun,
	isExecutingDryRun,
	handleRestore,
	isImporting,
	restoreError,
	lastRestoreResult,
}) => {
	const canRestore = Boolean(dryRunResult?.dryRunSuccess);

	return (
		<div
			style={{
				background: "transparent",
				border: "none",
				padding: "16px 0",
				boxShadow: "none",
			}}
		>
			{/* SECTION TITLE & BANNER */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "12px",
					marginBottom: "16px",
				}}
			>
				<div
					style={{
						width: "44px",
						height: "44px",
						borderRadius: "10px",
						background: "rgba(13, 148, 136, 0.12)",
						color: "var(--teal)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<UploadCloud size={24} />
				</div>
				<div>
					<h3
						style={{
							margin: 0,
							fontSize: "18px",
							fontWeight: "600",
							color: "var(--ink, #1e293b)",
						}}
					>
						Восстановление и предварительная проверка архива (.dente)
					</h3>
					<p
						style={{
							margin: "4px 0 0",
							fontSize: "13px",
							color: "var(--muted, #64748b)",
						}}
					>
						Предварительная проверка целостности и сохранности записей перед
						восстановлением базы клиники
					</p>
				</div>
			</div>

			{/* 1. DROPZONE RESTORE AREA */}
			<DropzoneRestoreArea
				fileInputRef={fileInputRef}
				handleFileSelect={handleFileSelect}
				importFileName={importFileName}
			/>

			{/* INSPECT FILE SYNTAX ERROR */}
			{inspectError && (
				<div
					style={{
						marginBottom: "16px",
						padding: "12px",
						borderRadius: "8px",
						background: "rgba(239, 68, 68, 0.1)",
						color: "var(--bad-fg)",
						fontSize: "13px",
						display: "flex",
						alignItems: "center",
						gap: "8px",
					}}
				>
					<AlertTriangle size={18} />
					{inspectError}
				</div>
			)}

			{/* 2. VERIFICATION PROGRESS & DETERMINISTIC STAGES CARD */}
			{dryRunResult && (
				<VerificationProgressCard dryRunResult={dryRunResult} />
			)}

			{/* 3. ROLLBACK SAFETY NOTICE, PASSPHRASE & ACTIONS */}
			{importRawText && (
				<RollbackSafetyNotice
					importPassphrase={importPassphrase}
					showImportPassphrase={showImportPassphrase}
					setShowImportPassphrase={setShowImportPassphrase}
					handlePassphraseChangeForDryRun={handlePassphraseChangeForDryRun}
					executeDryRun={executeDryRun}
					importRawText={importRawText}
					isExecutingDryRun={isExecutingDryRun}
					handleRestore={handleRestore}
					isImporting={isImporting}
					canRestore={canRestore}
					restoreError={restoreError}
					lastRestoreResult={lastRestoreResult}
				/>
			)}
		</div>
	);
};
