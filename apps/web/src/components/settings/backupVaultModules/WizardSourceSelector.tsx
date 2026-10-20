import { ArrowRight, FileArchive } from "lucide-react";
import type React from "react";
import type { LocalVaultSnapshotMeta } from "../../../services/offline/offlineBackupService";

export interface WizardSourceSelectorProps {
	readonly vaultSnapshots: LocalVaultSnapshotMeta[];
	readonly selectedSnapshotId: string | null;
	readonly setSelectedSnapshotId: (id: string | null) => void;
	readonly uploadedFileName: string | null;
	readonly handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
	readonly passphrase: string;
	readonly setPassphrase: (pass: string) => void;
	readonly onProceed: () => void;
}

export const WizardSourceSelector: React.FC<WizardSourceSelectorProps> = ({
	vaultSnapshots,
	selectedSnapshotId,
	setSelectedSnapshotId,
	uploadedFileName,
	handleFileUpload,
	passphrase,
	setPassphrase,
	onProceed,
}) => {
	return (
		<div>
			<div style={{ marginBottom: "14px" }}>
				<label
					style={{
						display: "block",
						fontSize: "13px",
						fontWeight: 600,
						color: "var(--ink)",
						marginBottom: "6px",
					}}
				>
					Шаг 1: Выберите источник резервной копии
				</label>

				{/* LOCAL SNAPSHOTS */}
				{vaultSnapshots.length > 0 && (
					<div style={{ marginBottom: "12px" }}>
						<div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
							Локальный снимок из защищенного Vault:
						</div>
						<select
							value={selectedSnapshotId || ""}
							onChange={(e) => setSelectedSnapshotId(e.target.value)}
							style={{
								width: "100%",
								minHeight: "38px",
								padding: "0 10px",
								borderRadius: "8px",
								border: "1px solid var(--line)",
								background: "var(--paper-soft)",
								color: "var(--ink)",
								fontSize: "12.5px",
							}}
						>
							{vaultSnapshots.map((snap) => (
								<option key={snap.id} value={snap.id}>
									{snap.filename} ({new Date(snap.timestampMs).toLocaleDateString("ru-RU")},{" "}
									{(snap.sizeBytes / 1024).toFixed(1)} КБ)
								</option>
							))}
						</select>
					</div>
				)}

				{/* EXTERNAL FILE UPLOAD */}
				<div
					style={{
						border: "1px dashed var(--line)",
						borderRadius: "8px",
						padding: "14px",
						textAlign: "center",
						background: "var(--paper-soft)",
						marginTop: "8px",
					}}
				>
					<FileArchive
						size={24}
						style={{ color: "var(--muted)", margin: "0 auto 4px" }}
					/>
					<div style={{ fontSize: "12.5px", color: "var(--ink)", fontWeight: 500 }}>
						{uploadedFileName
							? `Загружен внешний файл: ${uploadedFileName}`
							: "Или загрузите внешний файл .dentalbackup"}
					</div>
					<label
						style={{
							display: "inline-block",
							marginTop: "8px",
							padding: "5px 12px",
							borderRadius: "6px",
							background: "var(--paper)",
							border: "1px solid var(--line)",
							fontSize: "12px",
							color: "var(--ink)",
							cursor: "pointer",
							fontWeight: 500,
						}}
					>
						Выбрать файл с диска
						<input
							type="file"
							accept=".dentalbackup,.dente,application/json"
							onChange={handleFileUpload}
							style={{ display: "none" }}
						/>
					</label>
				</div>

				{/* PASSPHRASE */}
				<div style={{ marginTop: "12px" }}>
					<label
						style={{
							display: "block",
							fontSize: "12px",
							fontWeight: 500,
							color: "var(--ink)",
							marginBottom: "4px",
						}}
					>
						Пароль расшифровки архива (если архив был защищен):
					</label>
					<input
						type="password"
						value={passphrase}
						onChange={(e) => setPassphrase(e.target.value)}
						placeholder="Ключ клиники или персональный пароль"
						style={{
							width: "100%",
							maxWidth: "360px",
							minHeight: "36px",
							padding: "0 10px",
							borderRadius: "6px",
							border: "1px solid var(--line)",
							background: "var(--paper-soft)",
							color: "var(--ink)",
							fontSize: "12.5px",
						}}
					/>
				</div>
			</div>

			{/* ACTIONS */}
			<div style={{ display: "flex", justifyContent: "flex-end" }}>
				<button
					type="button"
					onClick={onProceed}
					style={{
						minHeight: "38px",
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
					className="touch-manipulation"
				>
					<span>Далее: Сверка SHA-256</span>
					<ArrowRight size={15} />
				</button>
			</div>
		</div>
	);
};
