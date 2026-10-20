import { FileArchive } from "lucide-react";
import type React from "react";

export interface DropzoneRestoreAreaProps {
	readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
	readonly handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
	readonly importFileName: string | null;
}

export const DropzoneRestoreArea: React.FC<DropzoneRestoreAreaProps> = ({
	fileInputRef,
	handleFileSelect,
	importFileName,
}) => {
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			fileInputRef.current?.click();
		}
	};

	return (
		<div>
			<input
				type="file"
				ref={fileInputRef}
				onChange={handleFileSelect}
				accept=".dente,.dentalbackup,application/json"
				style={{ display: "none" }}
				data-testid="backup-file-input"
			/>

			<div
				onClick={() => fileInputRef.current?.click()}
				onKeyDown={handleKeyDown}
				tabIndex={0}
				role="button"
				aria-label="Выбрать файл резервной копии клиники"
				style={{
					border: "2px dashed var(--line, #cbd5e1)",
					borderRadius: "10px",
					padding: "24px",
					textAlign: "center",
					cursor: "pointer",
					background: "var(--paper-soft)",
					marginBottom: "16px",
					transition: "border-color 0.15s ease, background-color 0.15s ease",
				}}
				className="touch-manipulation"
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
						: "Нажмите, чтобы выбрать архив .dentalbackup (.dente) с диска или перетащите сюда"}
				</div>
				<div
					style={{
						fontSize: "12px",
						color: "var(--muted, #64748b)",
						marginTop: "4px",
					}}
				>
					Поддерживаются защищённые автономные архивы DENTE Vault (.dentalbackup / .dente)
				</div>
			</div>
		</div>
	);
};
