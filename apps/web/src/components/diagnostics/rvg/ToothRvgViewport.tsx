import React from "react";
import { Scan } from "lucide-react";
import { showToast } from "../../GlobalToast";

interface ToothRvgViewportProps {
	toothNumber: number;
	hasImage: boolean;
	imageSrc?: string | undefined;
	isInverted: boolean;
	contrast: number;
	brightness: number;
	isZoomedApex: boolean;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onAttachScan?: ((file: File) => void) | undefined;
}

export const ToothRvgViewport: React.FC<ToothRvgViewportProps> = ({
	toothNumber,
	hasImage,
	imageSrc,
	isInverted,
	contrast,
	brightness,
	isZoomedApex,
	fileInputRef,
	onAttachScan,
}) => {
	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		const file = e.dataTransfer.files?.[0];
		if (file) {
			onAttachScan?.(file);
			showToast(`Снимок прикреплен к зубу #${toothNumber}`, "success");
		}
	};

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			onAttachScan?.(file);
			showToast(`Снимок прикреплен к зубу #${toothNumber}`, "success");
		}
	};

	return (
		<div
			className="dente-rvg-viewport-frame"
			style={{
				backgroundColor: "var(--ink, #0f172a)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				position: "relative",
			}}
			onDragOver={(e) => {
				e.preventDefault();
				e.stopPropagation();
			}}
			onDrop={handleDrop}
		>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*,.dcm"
				data-testid="rvg-file-input"
				style={{ display: "none" }}
				onChange={handleFileInputChange}
			/>

			{hasImage ? (
				<>
					<img
						src={imageSrc}
						alt={`RVG визиограф зуба ${toothNumber}`}
						loading="lazy"
						decoding="async"
						className="dente-rvg-img"
						style={{
							filter: `invert(${isInverted ? 1 : 0}) contrast(${contrast}%) brightness(${brightness}%)`,
							transform: isZoomedApex ? "scale(1.4) translateY(-10%)" : "none",
						}}
					/>
					<div className="dente-rvg-grid-overlay pointer-events-none" />
					<div className="dente-rvg-scale-bar">
						<span>| 5мм |</span>
					</div>
				</>
			) : (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: "6px",
						padding: "12px",
						color: "var(--muted)",
						textAlign: "center",
						cursor: "pointer",
					}}
					onClick={() => fileInputRef.current?.click()}
					title="Нажмите, чтобы прикрепить снимок"
				>
					<Scan size={28} color="var(--teal)" />
					<span style={{ fontSize: "11px", fontWeight: 600, color: "var(--paper-soft, #e2e8f0)" }}>
						RVG #{toothNumber}
					</span>
					<span style={{ fontSize: "10px", color: "var(--muted)" }}>
						Нажмите для прикрепления снимка
					</span>
				</div>
			)}
		</div>
	);
};
