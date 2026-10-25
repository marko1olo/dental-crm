import type React from "react";
import { Camera } from "lucide-react";

export interface GuestLabPortalPhotoUploadProps {
	readonly isUploading: boolean;
	readonly onFileSelected: (file: File) => void;
}

export function GuestLabPortalPhotoUpload({
	isUploading,
	onFileSelected,
}: GuestLabPortalPhotoUploadProps): React.JSX.Element {
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			onFileSelected(file);
		}
		e.target.value = "";
	};

	return (
		<div
			style={{
				marginTop: "14px",
				marginBottom: "32px",
				padding: "12px 16px",
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: "10px",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				flexWrap: "wrap",
				gap: "10px",
			}}
			data-testid="guest-portal-photo-upload-panel"
		>
			<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
				<Camera size={18} style={{ color: "var(--teal)" }} />
				<div>
					<div style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>
						Фотография готового изделия
					</div>
					<div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
						Прикрепите фото коронки/протеза для врача перед отправкой курьером
					</div>
				</div>
			</div>

			<label
				className="secondary-button"
				style={{
					minHeight: "44px",
					padding: "8px 16px",
					display: "inline-flex",
					alignItems: "center",
					gap: "8px",
					fontWeight: 700,
					fontSize: "12px",
					cursor: isUploading ? "wait" : "pointer",
					background: "var(--teal-soft)",
					color: "var(--teal)",
					borderColor: "var(--teal)",
					borderRadius: "8px",
				}}
				data-testid="guest-portal-upload-photo-label"
			>
				<input
					type="file"
					accept="image/*"
					style={{ display: "none" }}
					disabled={isUploading}
					onChange={handleChange}
					data-testid="guest-portal-photo-input"
				/>
				<Camera size={15} />
				<span>{isUploading ? "Отправка фото..." : "Загрузить фото работы"}</span>
			</label>
		</div>
	);
}
