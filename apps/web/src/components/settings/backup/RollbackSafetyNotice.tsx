import {
	AlertTriangle,
	CheckCircle2,
	Eye,
	EyeOff,
	RotateCcw,
	ShieldAlert,
	ShieldCheck,
	UploadCloud,
} from "lucide-react";
import type React from "react";
import type { RestoreBackupResult } from "../../../services/offline/offlineBackupService";

export interface RollbackSafetyNoticeProps {
	readonly importPassphrase: string;
	readonly showImportPassphrase: boolean;
	readonly setShowImportPassphrase: (v: boolean) => void;
	readonly handlePassphraseChangeForDryRun: (pass: string) => void;
	readonly executeDryRun: (rawText: string, pass: string) => void;
	readonly importRawText: string;
	readonly isExecutingDryRun: boolean;
	readonly handleRestore: () => void;
	readonly isImporting: boolean;
	readonly canRestore: boolean;
	readonly restoreError: string | null;
	readonly lastRestoreResult: RestoreBackupResult | null;
}

export const RollbackSafetyNotice: React.FC<RollbackSafetyNoticeProps> = ({
	importPassphrase,
	showImportPassphrase,
	setShowImportPassphrase,
	handlePassphraseChangeForDryRun,
	executeDryRun,
	importRawText,
	isExecutingDryRun,
	handleRestore,
	isImporting,
	canRestore,
	restoreError,
	lastRestoreResult,
}) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
			{/* ROLLBACK SAFETY BANNER */}
			<div
				style={{
					display: "flex",
					alignItems: "flex-start",
					gap: "10px",
					padding: "12px 14px",
					borderRadius: "8px",
					background: "var(--paper-soft, #f8fafc)",
					border: "1px solid var(--line, #e2e8f0)",
				}}
			>
				<RotateCcw
					size={18}
					style={{ color: "var(--teal)", flexShrink: 0, marginTop: "2px" }}
				/>
				<div>
					<div
						style={{
							fontSize: "13px",
							fontWeight: 600,
							color: "var(--ink, #1e293b)",
						}}
					>
						Защита отката и сохранность транзакций
					</div>
					<div
						style={{
							fontSize: "12px",
							color: "var(--muted, #64748b)",
							marginTop: "2px",
							lineHeight: "1.4",
						}}
					>
						Перед применением архива система создает моментальный слепок текущего состояния.
						Если в очереди были неотправленные приёмы, они будут сохранены в безопасный буфер.
					</div>
				</div>
			</div>

			{/* PASSPHRASE INPUT */}
			<div>
				<label
					style={{
						display: "block",
						fontSize: "13px",
						fontWeight: "500",
						marginBottom: "6px",
						color: "var(--ink, #1e293b)",
					}}
				>
					Пароль расшифровки архива (AES-GCM-256)
				</label>
				<div style={{ position: "relative", maxWidth: "420px" }}>
					<input
						type={showImportPassphrase ? "text" : "password"}
						value={importPassphrase}
						onChange={(e) => handlePassphraseChangeForDryRun(e.target.value)}
						placeholder="По умолчанию — ключ клиники"
						style={{
							width: "100%",
							minHeight: "40px",
							padding: "8px 40px 8px 12px",
							borderRadius: "8px",
							border: "1px solid var(--line)",
							background: "var(--paper-soft)",
							color: "var(--ink)",
							fontSize: "12.5px",
							boxSizing: "border-box",
						}}
						data-testid="restore-passphrase-input"
					/>
					<button
						type="button"
						onClick={() => setShowImportPassphrase(!showImportPassphrase)}
						style={{
							position: "absolute",
							right: "2px",
							top: "50%",
							transform: "translateY(-50%)",
							minHeight: "36px",
							minWidth: "36px",
							padding: "6px",
							borderRadius: "6px",
							border: "none",
							background: "transparent",
							color: "var(--muted)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							cursor: "pointer",
						}}
						aria-label={
							showImportPassphrase
								? "Скрыть пароль защиты"
								: "Показать пароль защиты"
						}
					>
						{showImportPassphrase ? <EyeOff size={18} /> : <Eye size={18} />}
					</button>
				</div>
			</div>

			{/* ACTION BUTTONS */}
			<div
				style={{
					display: "flex",
					gap: "12px",
					flexWrap: "wrap",
					alignItems: "center",
					marginTop: "4px",
				}}
			>
				<button
					type="button"
					onClick={() => executeDryRun(importRawText, importPassphrase)}
					disabled={isExecutingDryRun}
					style={{
						minHeight: "40px",
						padding: "0 16px",
						borderRadius: "8px",
						background: "var(--paper-soft, #f1f5f9)",
						color: "var(--ink, #334155)",
						border: "1px solid var(--line, #cbd5e1)",
						fontWeight: "500",
						fontSize: "13px",
						cursor: isExecutingDryRun ? "not-allowed" : "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
					}}
					className="touch-manipulation"
				>
					<ShieldCheck size={16} />
					{isExecutingDryRun ? "Проверка..." : "Повторить проверку"}
				</button>

				<button
					type="button"
					onClick={handleRestore}
					disabled={isImporting || !canRestore}
					style={{
						minHeight: "40px",
						padding: "0 20px",
						borderRadius: "8px",
						background: canRestore ? "var(--teal)" : "var(--muted, #94a3b8)",
						color: "var(--on-teal, #ffffff)",
						border: "none",
						fontWeight: "600",
						fontSize: "13px",
						cursor: isImporting || !canRestore ? "not-allowed" : "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "8px",
						boxShadow: canRestore
							? "0 2px 4px rgba(13,148,136,0.2)"
							: "none",
					}}
					className="touch-manipulation"
					data-testid="execute-restore-btn"
				>
					<UploadCloud size={18} />
					{isImporting
						? "Восстановление..."
						: "Расшифровать и восстановить данные"}
				</button>
			</div>

			{/* RESTORE ERROR */}
			{restoreError && (
				<div
					style={{
						marginTop: "8px",
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
					{restoreError}
				</div>
			)}

			{/* RESTORE RESULT SUCCESS */}
			{lastRestoreResult && (
				<div
					style={{
						marginTop: "8px",
						padding: "16px",
						borderRadius: "8px",
						background: "rgba(16, 185, 129, 0.08)",
						border: "1px solid rgba(16, 185, 129, 0.2)",
					}}
					data-testid="restore-success-report"
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							color: "var(--ok-fg)",
							fontWeight: "600",
							fontSize: "14px",
							marginBottom: "8px",
						}}
					>
						<CheckCircle2 size={18} />
						Данные успешно восстановлены и проверены
					</div>
					<div
						style={{
							fontSize: "13px",
							color: "var(--ink, #334155)",
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
							gap: "8px",
						}}
					>
						<div>
							Изменений: <strong>{lastRestoreResult.restoredCount.mutations}</strong>
						</div>
						<div>
							Черновиков: <strong>{lastRestoreResult.restoredCount.drafts}</strong>
						</div>
						<div>
							Расписаний: <strong>{lastRestoreResult.restoredCount.schedules}</strong>
						</div>
						<div>
							Пациентов: <strong>{lastRestoreResult.restoredCount.patients}</strong>
						</div>
						<div>
							Одонтограмм: <strong>{lastRestoreResult.restoredCount.odontograms}</strong>
						</div>
						<div>
							Клинический кэш: <strong>{lastRestoreResult.restoredCount.clinicalCache}</strong>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
