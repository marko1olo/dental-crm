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
						background: "rgba(16, 185, 129, 0.12)",
						color: "var(--ok-fg)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<HardDrive size={24} />
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
						Зашифрованный экспорт базы клиники (.dente AES-GCM-256)
					</h3>
					<p
						style={{
							margin: "4px 0 0",
							fontSize: "13px",
							color: "var(--muted, #64748b)",
						}}
					>
						1-клик сохранение на USB-флешку или сетевой диск без подключения к
						интернету
					</p>
				</div>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
					gap: "12px",
					marginBottom: "16px",
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
						Мастер-пароль шифрования архива (опционально)
					</label>
					<div style={{ position: "relative" }}>
						<input
							type={showExportPassphrase ? "text" : "password"}
							value={exportPassphrase}
							onChange={(e) => setExportPassphrase(e.target.value)}
							placeholder="По умолчанию — защищенный ключ клиники"
							className="w-full h-11 min-h-[44px] pl-3 pr-12 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 text-xs box-border focus:outline-none focus:ring-2 focus:ring-teal-500"
						/>
						<button
							type="button"
							onClick={() => setShowExportPassphrase(!showExportPassphrase)}
							className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer touch-manipulation absolute right-0 top-1/2 -translate-y-1/2"
							aria-label={
								showExportPassphrase
									? "Скрыть мастер-пароль"
									: "Показать мастер-пароль"
							}
						>
							{showExportPassphrase ? <EyeOff size={18} /> : <Eye size={18} />}
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
						placeholder="Например: Плановый бэкап перед закрытием смены"
						className="w-full h-11 min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 text-xs box-border focus:outline-none focus:ring-2 focus:ring-teal-500"
					/>
				</div>
			</div>

			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: "10px",
					alignItems: "center",
				}}
			>
				<button
					type="button"
					onClick={() => handleExport(true)}
					disabled={isExporting}
					style={{
						minHeight: "44px",
						padding: "0 18px",
						borderRadius: "8px",
						background: "var(--ok-fg)",
						color: "var(--on-teal, #ffffff)",
						border: "none",
						fontWeight: "600",
						fontSize: "13px",
						cursor: isExporting ? "not-allowed" : "pointer",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "8px",
						boxShadow: "0 1px 3px rgba(5,150,105,0.2)",
						boxSizing: "border-box",
					}}
					className="touch-manipulation"
				>
					<Download size={16} />
					<span>
						{isExporting ? "Создание архива..." : "Выбрать диск / USB (.dente)"}
					</span>
				</button>

				<button
					type="button"
					onClick={() => handleExport(false)}
					disabled={isExporting}
					className="secondary-button min-h-[44px] px-4 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
				>
					<Download size={15} />
					<span>Скачать в Загрузки</span>
				</button>
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
						Архив успешно создан и зашифрован (AES-GCM-256)
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
							Контейнер: <strong>{lastExportResult.header.magic}</strong>
						</div>
						<div>
							SHA-256:{" "}
							<strong>
								{lastExportResult.header.payloadSha256.substring(0, 16)}...
							</strong>
						</div>
						<div>
							Мутаций: <strong>{lastExportResult.stats.mutations}</strong>
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
