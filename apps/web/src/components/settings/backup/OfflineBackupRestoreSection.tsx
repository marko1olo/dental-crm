import type { DryRunRestoreResult } from "@dental/shared";
import {
	AlertTriangle,
	CheckCircle2,
	Eye,
	EyeOff,
	FileArchive,
	ShieldAlert,
	ShieldCheck,
	UploadCloud,
	XCircle,
} from "lucide-react";
import type React from "react";
import type { RestoreBackupResult } from "../../../services/offline/offlineBackupService";

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
	return (
		<div
			style={{
				background: "transparent",
				border: "none",
				padding: "16px 0",
				boxShadow: "none",
			}}
		>
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
						Безопасное восстановление и Dry-Run валидатор (.dente)
					</h3>
					<p
						style={{
							margin: "4px 0 0",
							fontSize: "13px",
							color: "var(--muted, #64748b)",
						}}
					>
						Предварительная симуляция распаковки и сверка контрольной суммы
						SHA-256 перед записью в IndexedDB
					</p>
				</div>
			</div>

			<input
				type="file"
				ref={fileInputRef}
				onChange={handleFileSelect}
				accept=".dente,application/json"
				style={{ display: "none" }}
			/>

			<div
				onClick={() => fileInputRef.current?.click()}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						fileInputRef.current?.click();
					}
				}}
				tabIndex={0}
				role="button"
				style={{
					border: "2px dashed var(--glass-border-strong, #cbd5e1)",
					borderRadius: "10px",
					padding: "24px",
					textAlign: "center",
					cursor: "pointer",
					background: "var(--paper-strong, #ffffff)",
					marginBottom: "16px",
				}}
			>
				<FileArchive
					size={32}
					style={{ color: "var(--muted, #64748b)", marginBottom: "8px" }}
				/>
				<div
					style={{
						fontSize: "14px",
						fontWeight: "500",
						color: "var(--ink, #1e293b)",
					}}
				>
					{importFileName
						? `Выбран файл: ${importFileName}`
						: "Нажмите, чтобы выбрать файл .dente с флешки или перетащите сюда"}
				</div>
				<div
					style={{
						fontSize: "12px",
						color: "var(--muted, #64748b)",
						marginTop: "4px",
					}}
				>
					Поддерживаются форматы DENTE_ENCRYPTED_BACKUP_V2 (AES-GCM-256) и V1
				</div>
			</div>

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

			{/* DRY-RUN REPORT CARD */}
			{dryRunResult && (
				<div
					style={{
						marginBottom: "16px",
						padding: "16px",
						borderRadius: "8px",
						background:
							dryRunResult.integrityGrade === "EXCELLENT"
								? "rgba(16, 185, 129, 0.06)"
								: dryRunResult.integrityGrade === "WARNING"
									? "rgba(245, 158, 11, 0.06)"
									: "rgba(239, 68, 68, 0.06)",
						border:
							dryRunResult.integrityGrade === "EXCELLENT"
								? "1px solid rgba(16, 185, 129, 0.25)"
								: dryRunResult.integrityGrade === "WARNING"
									? "1px solid rgba(245, 158, 11, 0.25)"
									: "1px solid rgba(239, 68, 68, 0.25)",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							flexWrap: "wrap",
							gap: "8px",
							marginBottom: "10px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							{dryRunResult.integrityGrade === "EXCELLENT" ? (
								<ShieldCheck size={20} color="var(--ok-fg)" />
							) : dryRunResult.integrityGrade === "WARNING" ? (
								<AlertTriangle size={20} color="var(--warn-fg)" />
							) : (
								<ShieldAlert size={20} color="var(--bad-fg)" />
							)}
							<span
								style={{
									fontWeight: "600",
									fontSize: "14px",
									color: "var(--ink, #1e293b)",
								}}
							>
								Результат Dry-Run симуляции:
							</span>
							<span
								style={{
									fontSize: "12px",
									fontWeight: "700",
									padding: "2px 8px",
									borderRadius: "10px",
									background:
										dryRunResult.integrityGrade === "EXCELLENT"
											? "var(--ok-fg)"
											: dryRunResult.integrityGrade === "WARNING"
												? "var(--warn-fg)"
												: "var(--bad-fg)",
									color: "var(--on-teal, #ffffff)",
								}}
							>
								{dryRunResult.integrityGrade}
							</span>
						</div>
						<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
							Время проверки: {dryRunResult.executionDurationMs} мс
						</div>
					</div>

					<div
						style={{
							fontSize: "13px",
							color: "var(--ink, #334155)",
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
							gap: "8px",
							marginBottom: "12px",
						}}
					>
						<div>
							Контрольная сумма:{" "}
							<strong>
								{dryRunResult.checksumVerified ? "Подтверждена" : "Ошибка"}
							</strong>
						</div>
						<div>
							Всего объектов:{" "}
							<strong>{dryRunResult.totalRecordsCount}</strong>
						</div>
						<div>
							Мутаций:{" "}
							<strong>{dryRunResult.previewStats.mutations}</strong>
						</div>
						<div>
							Черновиков: <strong>{dryRunResult.previewStats.drafts}</strong>
						</div>
						<div>
							Клинический кэш:{" "}
							<strong>{dryRunResult.previewStats.clinicalCache}</strong>
						</div>
						<div>
							Пациентов:{" "}
							<strong>{dryRunResult.previewStats.patients ?? 0}</strong>
						</div>
					</div>

					{dryRunResult.warnings.length > 0 && (
						<div
							style={{
								fontSize: "12px",
								color: "var(--warn-fg)",
								marginBottom: "8px",
							}}
						>
							{dryRunResult.warnings.map((w, idx) => (
								<div
									key={idx}
									style={{ display: "flex", alignItems: "center", gap: "6px" }}
								>
									<AlertTriangle size={13} style={{ flexShrink: 0 }} />
									<span>{w}</span>
								</div>
							))}
						</div>
					)}

					{dryRunResult.errors.length > 0 && (
						<div style={{ fontSize: "12px", color: "var(--bad-fg)" }}>
							{dryRunResult.errors.map((err, idx) => (
								<div
									key={idx}
									style={{ display: "flex", alignItems: "center", gap: "6px" }}
								>
									<XCircle size={13} style={{ flexShrink: 0 }} />
									<span>{err}</span>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{importRawText && (
				<div
					style={{ display: "flex", flexDirection: "column", gap: "12px" }}
				>
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
							Пароль расшифровки архива
						</label>
						<div style={{ position: "relative", maxWidth: "420px" }}>
							<input
								type={showImportPassphrase ? "text" : "password"}
								value={importPassphrase}
								onChange={(e) =>
									handlePassphraseChangeForDryRun(e.target.value)
								}
								placeholder="По умолчанию — ключ клиники"
								className="w-full h-11 min-h-[44px] pl-3 pr-12 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 text-xs box-border focus:outline-none focus:ring-2 focus:ring-teal-500"
							/>
							<button
								type="button"
								onClick={() => setShowImportPassphrase(!showImportPassphrase)}
								className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer touch-manipulation absolute right-0 top-1/2 -translate-y-1/2"
								aria-label={
									showImportPassphrase
										? "Скрыть мастер-пароль"
										: "Показать мастер-пароль"
								}
							>
								{showImportPassphrase ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>
					</div>

					<div
						style={{
							display: "flex",
							gap: "12px",
							flexWrap: "wrap",
							alignItems: "center",
						}}
					>
						<button
							type="button"
							onClick={() => executeDryRun(importRawText, importPassphrase)}
							disabled={isExecutingDryRun}
							style={{
								minHeight: "44px",
								padding: "0 16px",
								borderRadius: "8px",
								background: "var(--paper, #f1f5f9)",
								color: "var(--ink, #334155)",
								border: "1px solid var(--glass-border, #cbd5e1)",
								fontWeight: "500",
								fontSize: "14px",
								cursor: isExecutingDryRun ? "not-allowed" : "pointer",
								display: "flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<ShieldCheck size={16} />
							{isExecutingDryRun ? "Проверка..." : "Повторить Dry-Run тест"}
						</button>

						<button
							type="button"
							onClick={handleRestore}
							disabled={isImporting || !dryRunResult?.dryRunSuccess}
							style={{
								minHeight: "44px",
								padding: "0 20px",
								borderRadius: "8px",
								background: dryRunResult?.dryRunSuccess
									? "var(--teal)"
									: "var(--muted, #94a3b8)",
								color: "var(--on-teal, #ffffff)",
								border: "none",
								fontWeight: "600",
								fontSize: "14px",
								cursor:
									isImporting || !dryRunResult?.dryRunSuccess
										? "not-allowed"
										: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "8px",
								boxShadow: dryRunResult?.dryRunSuccess
									? "0 2px 4px rgba(13,148,136,0.2)"
									: "none",
							}}
						>
							<UploadCloud size={18} />
							{isImporting
								? "Восстановление..."
								: "Расшифровать и восстановить данные"}
						</button>
					</div>
				</div>
			)}

			{restoreError && (
				<div
					style={{
						marginTop: "16px",
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

			{lastRestoreResult && (
				<div
					style={{
						marginTop: "16px",
						padding: "16px",
						borderRadius: "8px",
						background: "rgba(16, 185, 129, 0.08)",
						border: "1px solid rgba(16, 185, 129, 0.2)",
					}}
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
							gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
							gap: "8px",
						}}
					>
						<div>
							Мутаций:{" "}
							<strong>{lastRestoreResult.restoredCount.mutations}</strong>
						</div>
						<div>
							Черновиков:{" "}
							<strong>{lastRestoreResult.restoredCount.drafts}</strong>
						</div>
						<div>
							Расписаний:{" "}
							<strong>{lastRestoreResult.restoredCount.schedules}</strong>
						</div>
						<div>
							Пациентов:{" "}
							<strong>{lastRestoreResult.restoredCount.patients}</strong>
						</div>
						<div>
							Одонтограмм:{" "}
							<strong>{lastRestoreResult.restoredCount.odontograms}</strong>
						</div>
						<div>
							Клинический кэш:{" "}
							<strong>{lastRestoreResult.restoredCount.clinicalCache}</strong>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
