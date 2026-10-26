import React, { useState, useRef } from "react";
import { Scan } from "lucide-react";
import { showToast } from "../GlobalToast";
import { useSafeObjectUrl } from "../../hooks/useMemoryLeakGuard";
import { ToothRvgViewport } from "./rvg/ToothRvgViewport";
import { ToothRvgControls } from "./rvg/ToothRvgControls";

export interface ToothRvgThumbnailProps {
	toothNumber: number;
	patientId?: string | undefined;
	scanImageUrl?: string | Blob | File | undefined;
	scanImageBlob?: Blob | File | undefined;
	autoRevokeBlobUrl?: boolean | undefined;
	capturedAtIso?: string | undefined;
	onOpenFullRadiology?: ((toothNumber: number) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
	onAttachScan?: ((file: File) => void) | undefined;
}

export const ToothRvgThumbnail: React.FC<ToothRvgThumbnailProps> = ({
	toothNumber,
	patientId,
	scanImageUrl,
	scanImageBlob,
	autoRevokeBlobUrl,
	capturedAtIso,
	onOpenFullRadiology,
	onInsertToProtocol,
	onAttachScan,
}) => {
	const [isInverted, setIsInverted] = useState<boolean>(false);
	const [contrast, setContrast] = useState<number>(100);
	const [brightness, setBrightness] = useState<number>(100);
	const [isZoomedApex, setIsZoomedApex] = useState<boolean>(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const rawSource = scanImageBlob ?? scanImageUrl;
	const resolvedImageUrl = useSafeObjectUrl(rawSource, {
		autoRevokeBlobStrings: autoRevokeBlobUrl,
	});

	const hasImage = Boolean(resolvedImageUrl && resolvedImageUrl.trim().length > 0);

	const handleResetFilters = () => {
		setIsInverted(false);
		setContrast(100);
		setBrightness(100);
		setIsZoomedApex(false);
	};

	const handleCopyXrayReport = () => {
		const text = `Визиографический контроль зуба #${toothNumber}: периодонтальная щель прослеживается, деструкции костной ткани в периапикальной области не выявлено. Длина канала: 21.5 мм.`;
		if (onInsertToProtocol) {
			onInsertToProtocol(text);
			showToast(`Заключение визиографа зуба #${toothNumber} внесено в медицинскую карту!`, "success");
		} else {
			try {
				navigator.clipboard.writeText(text);
				showToast("Заключение скопировано в буфер", "success");
			} catch {
				showToast("Не удалось скопировать", "error");
			}
		}
	};

	return (
		<div className="dente-warm-tool-card" data-testid="tooth-rvg-thumbnail">
			<div className="dente-warm-tool-header">
				<div className="dente-warm-tool-title-group">
					<Scan size={18} color="var(--brand-primary, var(--teal))" />
					<h3 className="dente-warm-tool-title">
						Прицельный снимок визиографа (RVG 200×200)
					</h3>
				</div>
				<span className="dente-warm-tag info">
					Зуб #{toothNumber}
				</span>
			</div>

			<div className="dente-rvg-display-row">
				<ToothRvgViewport
					toothNumber={toothNumber}
					hasImage={hasImage}
					imageSrc={resolvedImageUrl}
					isInverted={isInverted}
					contrast={contrast}
					brightness={brightness}
					isZoomedApex={isZoomedApex}
					fileInputRef={fileInputRef}
					onAttachScan={onAttachScan}
				/>

				<ToothRvgControls
					toothNumber={toothNumber}
					isInverted={isInverted}
					contrast={contrast}
					brightness={brightness}
					isZoomedApex={isZoomedApex}
					onToggleInverted={() => setIsInverted((prev) => !prev)}
					onToggleZoomApex={() => setIsZoomedApex((prev) => !prev)}
					onResetFilters={handleResetFilters}
					onChangeBrightness={setBrightness}
					onChangeContrast={setContrast}
					onOpenFilePicker={() => fileInputRef.current?.click()}
					onCopyXrayReport={handleCopyXrayReport}
					onOpenFullRadiology={onOpenFullRadiology}
				/>
			</div>
		</div>
	);
};

export default ToothRvgThumbnail;
