import type React from "react";

export interface PricelistImportModalFooterProps {
	readonly importMode: "csv" | "smart_text";
	readonly smartTextInput: string;
	readonly isIngestingApi: boolean;
	readonly onClose: () => void;
	readonly onIngest: () => void;
}

export const PricelistImportModalFooter: React.FC<
	PricelistImportModalFooterProps
> = ({ importMode, smartTextInput, isIngestingApi, onClose, onIngest }) => {
	return (
		<footer
			className="pricelist-footer-bar"
			style={{
				justifyContent: "flex-end",
				gap: "0.75rem",
				padding: "0.75rem 1.25rem",
			}}
		>
			<button
				type="button"
				className="pricelist-btn"
				style={{ minHeight: "36px", height: "36px", padding: "0 1rem" }}
				onClick={onClose}
			>
				Отмена
			</button>
			{importMode === "smart_text" && (
				<button
					type="button"
					className="pricelist-btn pricelist-btn-primary"
					style={{
						minHeight: "36px",
						height: "36px",
						padding: "0 1.25rem",
						fontWeight: 600,
					}}
					onClick={() => {
						if (!isIngestingApi && smartTextInput.trim()) {
							onIngest();
						}
					}}
					aria-busy={isIngestingApi}
				>
					{isIngestingApi ? "Анализ..." : "Распознать цены и услуги"}
				</button>
			)}
		</footer>
	);
};
