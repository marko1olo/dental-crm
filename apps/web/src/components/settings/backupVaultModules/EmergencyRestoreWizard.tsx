import type { DryRunRestoreResult } from "@dental/shared";
import { AlertTriangle } from "lucide-react";
import React, { useState } from "react";
import type {
	LocalVaultSnapshotMeta,
	RestoreBackupResult,
} from "../../../services/offline/offlineBackupService";
import { WizardCompleteStage } from "./WizardCompleteStage";
import { WizardSourceSelector } from "./WizardSourceSelector";
import { WizardVerifyStage } from "./WizardVerifyStage";

export interface EmergencyRestoreWizardProps {
	readonly vaultSnapshots: LocalVaultSnapshotMeta[];
	readonly onExecuteRestore: (rawText: string, passphrase?: string) => Promise<RestoreBackupResult>;
	readonly onDryRunVerify: (rawText: string, passphrase?: string) => DryRunRestoreResult;
	readonly pendingMutationsCount: number;
	readonly onComplete: () => void;
}

export const EmergencyRestoreWizard: React.FC<EmergencyRestoreWizardProps> = ({
	vaultSnapshots,
	onExecuteRestore,
	onDryRunVerify,
	pendingMutationsCount,
	onComplete,
}) => {
	const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
	const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
		vaultSnapshots[0]?.id || null,
	);
	const [uploadedRawText, setUploadedRawText] = useState<string | null>(null);
	const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
	const [passphrase, setPassphrase] = useState<string>("");
	const [dryRunResult, setDryRunResult] = useState<DryRunRestoreResult | null>(null);
	const [isExecuting, setIsExecuting] = useState<boolean>(false);
	const [restoreResult, setRestoreResult] = useState<RestoreBackupResult | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [autoPreBackupConfirmed, setAutoPreBackupConfirmed] = useState<boolean>(true);

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploadedFileName(file.name);
		const reader = new FileReader();
		reader.onload = (event) => {
			const text = event.target?.result as string;
			setUploadedRawText(text);
			setSelectedSnapshotId(null);
		};
		reader.readAsText(file, "UTF-8");
	};

	const handleProceedToVerify = () => {
		setErrorMessage(null);
		let payloadText: string | null = uploadedRawText;
		if (!payloadText && selectedSnapshotId) {
			const snap = vaultSnapshots.find((s) => s.id === selectedSnapshotId);
			if (snap) {
				payloadText = JSON.stringify({
					header: {
						version: "2.0.0",
						organizationId: snap.organizationId,
						createdAt: snap.timestamp,
						checksum: snap.payloadSha256,
					},
					payload: {},
				});
			}
		}

		if (!payloadText) {
			setErrorMessage("Пожалуйста, выберите снимок из сейфа или загрузите файл .dentalbackup");
			return;
		}

		try {
			const result = onDryRunVerify(payloadText, passphrase || undefined);
			setDryRunResult(result);
			setCurrentStep(2);
		} catch (err: any) {
			setErrorMessage(err?.message || "Ошибка предварительной проверки архива");
		}
	};

	const handleExecuteFinalRestore = async () => {
		setIsExecuting(true);
		setErrorMessage(null);
		try {
			const payload = uploadedRawText || "{}";
			const res = await onExecuteRestore(payload, passphrase || undefined);
			setRestoreResult(res);
			setCurrentStep(4);
		} catch (err: any) {
			setErrorMessage(err?.message || "Ошибка применения резервной копии");
		} finally {
			setIsExecuting(false);
		}
	};

	return (
		<div
			style={{
				background: "var(--paper, #ffffff)",
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "12px",
				padding: "18px 22px",
				marginBottom: "16px",
				boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
			}}
			data-testid="emergency-restore-wizard"
		>
			{/* WIZARD STEPPER BAR */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: "20px",
					paddingBottom: "14px",
					borderBottom: "1px solid var(--line, #e2e8f0)",
				}}
			>
				<div>
					<h4
						style={{
							margin: 0,
							fontSize: "15px",
							fontWeight: 600,
							color: "var(--ink, #1e293b)",
						}}
					>
						Пошаговый визард аварийного восстановления
					</h4>
					<p
						style={{
							margin: "2px 0 0",
							fontSize: "12px",
							color: "var(--muted, #64748b)",
						}}
					>
						Аварийная накатка резервной копии с контролем транзакций и защитой отката
					</p>
				</div>

				{/* STEP INDICATOR PILLS */}
				<div style={{ display: "flex", gap: "6px" }}>
					{[
						{ num: 1, label: "Источник" },
						{ num: 2, label: "Сверка SHA-256" },
						{ num: 3, label: "Защита транзакций" },
						{ num: 4, label: "Готово" },
					].map((s) => (
						<span
							key={s.num}
							style={{
								fontSize: "11.5px",
								fontWeight: currentStep === s.num ? 700 : 500,
								padding: "3px 8px",
								borderRadius: "12px",
								background:
									currentStep === s.num
										? "var(--teal)"
										: currentStep > s.num
											? "rgba(16, 185, 129, 0.15)"
											: "var(--paper-soft)",
								color:
									currentStep === s.num
										? "#ffffff"
										: currentStep > s.num
											? "var(--ok-fg, #10b981)"
											: "var(--muted)",
							}}
						>
							{s.num}. {s.label}
						</span>
					))}
				</div>
			</div>

			{/* ERROR BANNER */}
			{errorMessage && (
				<div
					style={{
						marginBottom: "14px",
						padding: "10px 14px",
						borderRadius: "8px",
						background: "rgba(239, 68, 68, 0.1)",
						color: "var(--bad-fg)",
						fontSize: "12.5px",
						display: "flex",
						alignItems: "center",
						gap: "8px",
					}}
				>
					<AlertTriangle size={16} />
					<span>{errorMessage}</span>
				</div>
			)}

			{/* STEP 1 */}
			{currentStep === 1 && (
				<WizardSourceSelector
					vaultSnapshots={vaultSnapshots}
					selectedSnapshotId={selectedSnapshotId}
					setSelectedSnapshotId={setSelectedSnapshotId}
					uploadedFileName={uploadedFileName}
					handleFileUpload={handleFileUpload}
					passphrase={passphrase}
					setPassphrase={setPassphrase}
					onProceed={handleProceedToVerify}
				/>
			)}

			{/* STEP 2 OR 3 */}
			{(currentStep === 2 || currentStep === 3) && dryRunResult && (
				<WizardVerifyStage
					step={currentStep}
					dryRunResult={dryRunResult}
					pendingMutationsCount={pendingMutationsCount}
					autoPreBackupConfirmed={autoPreBackupConfirmed}
					setAutoPreBackupConfirmed={setAutoPreBackupConfirmed}
					onBack={() => setCurrentStep(currentStep === 3 ? 2 : 1)}
					onNext={() => setCurrentStep(3)}
					onExecuteRestore={handleExecuteFinalRestore}
					isExecuting={isExecuting}
				/>
			)}

			{/* STEP 4 */}
			{currentStep === 4 && restoreResult && (
				<WizardCompleteStage
					restoreResult={restoreResult}
					onComplete={onComplete}
				/>
			)}
		</div>
	);
};
