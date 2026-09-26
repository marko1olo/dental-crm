import React, { Suspense, lazy } from "react";
import { X } from "lucide-react";

const DicomArchiveUploader = lazy(() =>
	import("./DicomArchiveUploader").then((m) => ({
		default: m.DicomArchiveUploader,
	})),
);

export interface CornerstoneEmptyDropzoneProps {
	patientName?: string | undefined;
	studyDate?: string | undefined;
	onClose?: (() => void) | undefined;
	onImagesLoaded: (ids: string[]) => void;
}

export const CornerstoneEmptyDropzone: React.FC<CornerstoneEmptyDropzoneProps> = ({
	patientName,
	studyDate,
	onClose,
	onImagesLoaded,
}) => {
	return (
		<div
			data-testid="cornerstone-empty-volume-dropzone"
			style={{
				width: "100%",
				height: "100%",
				minHeight: "600px",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: "var(--paper, #09090b)",
				color: "var(--ink, #fafafa)",
				position: "relative",
				padding: "24px",
				fontFamily: "sans-serif",
			}}
		>
			{onClose && (
				<button
					type="button"
					data-testid="cbct-mpr-close-btn"
					aria-label="Закрыть 3D MPR"
					onClick={onClose}
					style={{
						position: "absolute",
						top: "16px",
						right: "16px",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: "32px",
						height: "32px",
						borderRadius: "8px",
						border: "1px solid var(--line, rgba(255,255,255,0.15))",
						backgroundColor: "rgba(255,255,255,0.05)",
						color: "var(--ink, #fff)",
						cursor: "pointer",
						transition: "all 0.15s",
					}}
					title="Закрыть просмотрщик"
				>
					<X className="w-4 h-4" />
				</button>
			)}

			<div style={{ maxWidth: "560px", width: "100%", textAlign: "center" }}>
				<h3
					style={{
						fontSize: "18px",
						fontWeight: 600,
						marginBottom: "8px",
						color: "var(--ink, #fff)",
					}}
				>
					3D КЛКТ / Мультипланарная реконструкция (MPR)
				</h3>
				{patientName && (
					<div
						className="truncate min-w-0"
						style={{
							fontSize: "13px",
							fontWeight: 500,
							color: "var(--brand-primary, #60a5fa)",
							marginBottom: "8px",
						}}
						title={`Пациент: ${patientName}${studyDate ? ` • ${studyDate}` : ""}`}
					>
						Пациент: {patientName}
						{studyDate ? ` • ${studyDate}` : ""}
					</div>
				)}
				<p
					style={{
						fontSize: "13px",
						color: "var(--muted, #a1a1aa)",
						marginBottom: "20px",
						lineHeight: 1.5,
					}}
				>
					Исследование КЛКТ не загружено. Перетащите DICOM-архив (.zip) или папку со срезами томографии для построения честных воксельных срезов (аксиального, сагиттального, коронального и панорамы).
				</p>

				<div
					style={{
						background: "rgba(255,255,255,0.03)",
						border: "1px dashed var(--line-strong, rgba(255,255,255,0.2))",
						borderRadius: "16px",
						padding: "24px",
					}}
				>
					<Suspense fallback={null}>
						<DicomArchiveUploader
							onImagesLoaded={onImagesLoaded}
						/>
					</Suspense>
				</div>
			</div>
		</div>
	);
};
