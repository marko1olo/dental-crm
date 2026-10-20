import type React from "react";
import {
	AlertTriangle,
	CheckCircle2,
	Download,
	Eye,
	EyeOff,
	HardDrive,
} from "lucide-react";
import type { ExportBackupResult } from "../../../services/offline/offlineBackupService";

export interface OfflineBackupExportSectionProps {
	readonly exportPassphrase: string;
	readonly setExportPassphrase: (v: string) => void;
	readonly showExportPassphrase: boolean;
	readonly setShowExportPassphrase: (v: boolean) => void;
	readonly exportNotes: string;
	readonly setExportNotes: (v: string) => void;
	readonly isExporting: boolean;
	readonly handleExport: (saveAsFilePicker?: boolean) => void;
	readonly exportError: string | null;
	readonly lastExportResult: ExportBackupResult | null;
}

export const OfflineBackupExportSection: React.FC<
	OfflineBackupExportSectionProps
> = ({
	exportPassphrase,
	setExportPassphrase,
	showExportPassphrase,
	setShowExportPassphrase,
	exportNotes,
	setExportNotes,
	isExporting,
	handleExport,
	exportError,
	lastExportResult,
}) => {
	return (
		<div
			style={{
				background: "transparent",
				border: "none",
				padding: "4px 0",
				boxShadow: "none",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "10px",
					marginBottom: "10px",
				}}
			>
				<div
					style={{
						width: "36px",
						height: "36px",
						borderRadius: "8px",
						background: "rgba(16, 185, 129, 0.12)",
						color: "var(--ok-fg)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<HardDrive size={20} />
				</div>
				<div>
					<h3
						style={{
							margin: 0,
							fontSize: "15.5px",
							fontWeight: "600",
							color: "var(--ink, #1e293b)",
						}}
					>
						Зашифрованный архив базы клиники (.dente)
					</h3>
					<p
						style={{
							margin: "2px 0 0",
							fontSize: "12px",
							color: "var(--muted, #64748b)",
						}}
					>
						Прямое сохранение на USB-флешку или сетевой диск без подключения к
						интернету
					</p>
				</div>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "minmax(220px, 1fr) minmax(220px, 1fr) auto",
					gap: "12px",
					alignItems: "end",
				}}
			>
				<div>
					<label
						style={{
							display: "block",
							fontSize: "12px",
							fontWeight: "600",
							marginBottom: "4px",
							color: "var(--ink, #1e293b)",
						}}
					>
						Пароль защиты архива (необязательно)
					</label>
					<div style={{ position: "relative" }}>
						<input
							type={showExportPassphrase ? "text" : "password"}
							value={exportPassphrase}
							onChange={(e) => setExportPassphrase(e.target.value)}
							placeholder="По умолчанию — защищенный ключ клиники"
							style={{
								width: "100%",
								minHeight: "38px",
								padding: "6px 38px 6px 12px",
								borderRadius: "8px",
								border: "1px solid var(--line)",
								background: "var(--paper-soft)",
								color: "var(--ink)",
								fontSize: "12.5px",
								boxSizing: "border-box",
							}}
						/>
						<button
							type="button"
							onClick={() => setShowExportPassphrase(!showExportPassphrase)}
							style={{
								position: "absolute",
								right: "2px",
								top: "50%",
								transform: "translateY(-50%)",
								minHeight: "34px",
								minWidth: "34px",
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
								showExportPassphrase
									? "Скрыть пароль защиты"
									: "Показать пароль защиты"
							}
						>
							{showExportPassphrase ? <EyeOff size={16} /> : <Eye size={16} />}
						</button>
					</div>
				</div>

				<div>
					<label
						style={{
							display: "block",
							fontSize: "12px",
							fontWeight: "600",
							marginBottom: "4px",
							color: "var(--ink, #1e293b)",
						}}
					>
						Заметка / метка смены архива
					</label>
					<input
						type="text"
						value={exportNotes}
						onChange={(e) => setExportNotes(e.target.value)}
						placeholder="Например: Копия перед закрытием смены"
						style={{
							width: "100%",
							minHeight: "38px",
							padding: "6px 12px",
							borderRadius: "8px",
							border: "1px solid var(--line)",
							background: "var(--paper-soft)",
							color: "var(--ink)",
							fontSize: "12.5px",
							boxSizing: "border-box",
						}}
					/>
				</div>

				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "8px",
						alignItems: "center",
					}}
				>
					<button
						type="button"
						onClick={() => handleExport(false)}
						disabled={isExporting}
						data-testid="btn-create-backup"
						style={{
							minHeight: "38px",
							padding: "0 16px",
							borderRadius: "8px",
							background: "var(--teal)",
							color: "var(--on-teal, #ffffff)",
							border: "none",
							fontWeight: "600",
							fontSize: "12.5px",
							cursor: isExporting ? "not-allowed" : "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "6px",
							boxSizing: "border-box",
							whiteSpace: "nowrap",
						}}
						className="touch-manipulation"
					>
						<Download size={15} />
						<span>
							{isExporting ? "Создание архива..." : "Создать резервную копию"}
						</span>
					</button>

					<button
						type="button"
						onClick={() => handleExport(true)}
						disabled={isExporting}
						style={{
							minHeight: "38px",
							padding: "0 14px",
							borderRadius: "8px",
							background: "var(--paper-soft)",
							color: "var(--ink)",
							border: "1px solid var(--line)",
							fontWeight: "600",
							fontSize: "12.5px",
							cursor: isExporting ? "not-allowed" : "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "6px",
							boxSizing: "border-box",
							whiteSpace: "nowrap",
						}}
						className="secondary-button touch-manipulation"
					>
						<HardDrive size={14} />
						<span>Сохранить на диск / USB (.dente)</span>
					</button>
				</div>
			</div>

			{exportError && (
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
					{exportError}
				</div>
			)}

			{lastExportResult && (
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
						Архив успешно создан и защищён
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
							Файл: <strong>{lastExportResult.filename}</strong>
						</div>
						<div>
							Код целостности:{" "}
							<strong>
								{lastExportResult.header.payloadSha256.substring(0, 16)}...
							</strong>
						</div>
						<div>
							Изменений: <strong>{lastExportResult.stats.mutations}</strong>
						</div>
						<div>
							Черновиков: <strong>{lastExportResult.stats.drafts}</strong>
						</div>
						<div>
							Расписаний:{" "}
							<strong>{lastExportResult.stats.schedules ?? 0}</strong>
						</div>
						<div>
							Пациентов: <strong>{lastExportResult.stats.patients ?? 0}</strong>
						</div>
						<div>
							Клинический кэш:{" "}
							<strong>{lastExportResult.stats.clinicalCache}</strong>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
