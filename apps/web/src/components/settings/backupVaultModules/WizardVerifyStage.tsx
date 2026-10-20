import type { DryRunRestoreResult } from "@dental/shared";
import {
	ArrowLeft,
	ArrowRight,
	Database,
	ShieldCheck,
	UploadCloud,
} from "lucide-react";
import type React from "react";

export interface WizardVerifyStageProps {
	readonly step: 2 | 3;
	readonly dryRunResult: DryRunRestoreResult;
	readonly pendingMutationsCount: number;
	readonly autoPreBackupConfirmed: boolean;
	readonly setAutoPreBackupConfirmed: (v: boolean) => void;
	readonly onBack: () => void;
	readonly onNext: () => void;
	readonly onExecuteRestore: () => void;
	readonly isExecuting: boolean;
}

export const WizardVerifyStage: React.FC<WizardVerifyStageProps> = ({
	step,
	dryRunResult,
	pendingMutationsCount,
	autoPreBackupConfirmed,
	setAutoPreBackupConfirmed,
	onBack,
	onNext,
	onExecuteRestore,
	isExecuting,
}) => {
	if (step === 2) {
		return (
			<div>
				<div style={{ marginBottom: "14px" }}>
					<label
						style={{
							display: "block",
							fontSize: "13px",
							fontWeight: 600,
							color: "var(--ink)",
							marginBottom: "8px",
						}}
					>
						Шаг 2: Валидация контрольной суммы и структуры данных
					</label>

					<div
						style={{
							padding: "12px",
							borderRadius: "8px",
							background: "var(--paper-soft)",
							border: "1px solid var(--line)",
							fontSize: "12.5px",
							lineHeight: "1.6",
						}}
					>
						<div>
							Контрольная сумма SHA-256:{" "}
							<strong style={{ color: "var(--ok-fg, #10b981)" }}>
								{dryRunResult.checksumVerified ? "Подтверждена" : "Ошибка"}
							</strong>
						</div>
						<div>
							Объектов в слепке: <strong>{dryRunResult.totalRecordsCount}</strong>
						</div>
						<div>
							Клинических мутаций:{" "}
							<strong>{dryRunResult.previewStats.mutations}</strong>
						</div>
						<div>
							Черновиков приёма: <strong>{dryRunResult.previewStats.drafts}</strong>
						</div>
						<div>
							Клинический кэш:{" "}
							<strong>{dryRunResult.previewStats.clinicalCache}</strong>
						</div>
					</div>
				</div>

				<div style={{ display: "flex", justifyContent: "space-between" }}>
					<button
						type="button"
						onClick={onBack}
						style={{
							minHeight: "36px",
							padding: "0 14px",
							borderRadius: "8px",
							background: "var(--paper-soft)",
							border: "1px solid var(--line)",
							color: "var(--ink)",
							fontSize: "12.5px",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<ArrowLeft size={14} />
						<span>Назад</span>
					</button>

					<button
						type="button"
						onClick={onNext}
						style={{
							minHeight: "36px",
							padding: "0 18px",
							borderRadius: "8px",
							background: "var(--teal)",
							color: "#ffffff",
							border: "none",
							fontWeight: 600,
							fontSize: "13px",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<span>Далее: Защита транзакций</span>
						<ArrowRight size={15} />
					</button>
				</div>
			</div>
		);
	}

	// STEP 3: TRANSACTION GUARD
	return (
		<div>
			<div style={{ marginBottom: "16px" }}>
				<label
					style={{
						display: "block",
						fontSize: "13px",
						fontWeight: 600,
						color: "var(--ink)",
						marginBottom: "8px",
					}}
				>
					Шаг 3: Защита актуальных транзакций от перезаписи
				</label>

				<div
					style={{
						padding: "12px 14px",
						borderRadius: "8px",
						background: "rgba(13, 148, 136, 0.08)",
						border: "1px solid rgba(13, 148, 136, 0.2)",
						marginBottom: "12px",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							fontSize: "13px",
							fontWeight: 600,
							color: "var(--ink)",
						}}
					>
						<ShieldCheck size={16} color="var(--teal)" />
						<span>Неотправленных операций в очереди: {pendingMutationsCount}</span>
					</div>
					<div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
						Перед накатом архива система зафиксирует текущий снимок базы. Если в архиве
						отсутствуют недавние визиты, они не будут стерты безвозвратно.
					</div>
				</div>

				<label
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						fontSize: "12.5px",
						cursor: "pointer",
						color: "var(--ink)",
					}}
				>
					<input
						type="checkbox"
						checked={autoPreBackupConfirmed}
						onChange={(e) => setAutoPreBackupConfirmed(e.target.checked)}
					/>
					<span>Создать моментальную точку отката перед восстановлением (рекомендуется)</span>
				</label>
			</div>

			<div style={{ display: "flex", justifyContent: "space-between" }}>
				<button
					type="button"
					onClick={onBack}
					disabled={isExecuting}
					style={{
						minHeight: "36px",
						padding: "0 14px",
						borderRadius: "8px",
						background: "var(--paper-soft)",
						border: "1px solid var(--line)",
						color: "var(--ink)",
						fontSize: "12.5px",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
					}}
				>
					<ArrowLeft size={14} />
					<span>Назад</span>
				</button>

				<button
					type="button"
					onClick={onExecuteRestore}
					disabled={isExecuting}
					style={{
						minHeight: "38px",
						padding: "0 20px",
						borderRadius: "8px",
						background: "var(--teal)",
						color: "#ffffff",
						border: "none",
						fontWeight: 600,
						fontSize: "13px",
						cursor: isExecuting ? "not-allowed" : "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "8px",
					}}
					data-testid="confirm-execute-restore-btn"
				>
					<UploadCloud size={16} />
					<span>{isExecuting ? "Применение архива..." : "Применить восстановление"}</span>
				</button>
			</div>
		</div>
	);
};
