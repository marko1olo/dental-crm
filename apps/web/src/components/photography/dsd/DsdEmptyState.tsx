import React from 'react';
import { Camera, Upload } from 'lucide-react';

interface DsdEmptyStateProps {
	onUploadClick: () => void;
	onOpenQrClick?: () => void;
}

export const DsdEmptyState: React.FC<DsdEmptyStateProps> = ({
	onUploadClick,
	onOpenQrClick,
}) => {
	const handleQrOpen = () => {
		if (onOpenQrClick) {
			onOpenQrClick();
		} else if (typeof window !== 'undefined') {
			window.dispatchEvent(
				new CustomEvent('dente:open-photo-qr', { detail: { qrOnly: true } }),
			);
		}
	};

	return (
		<div
			data-testid="dsd-empty-state"
			className="flex flex-col items-center justify-center gap-3 p-8 text-center rounded-2xl bg-slate-900/90 border-2 border-dashed border-slate-700 max-w-md w-full mx-4 shadow-xl"
		>
			<div className="w-14 h-14 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center">
				<Camera size={28} />
			</div>
			<div className="flex flex-col gap-1">
				<h4 className="text-sm sm:text-base font-bold text-white m-0">
					Снимок не загружен
				</h4>
				<p className="text-xs text-slate-400 m-0 leading-relaxed">
					Перетащите фото анфас с улыбкой или откройте QR-код для съемки со смартфона
				</p>
			</div>
			<div className="flex items-center gap-2 flex-wrap justify-center pt-2">
				<button
					type="button"
					onClick={onUploadClick}
					className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-[var(--primary,#0d9488)] text-white hover:opacity-95 inline-flex items-center gap-2 shadow-sm cursor-pointer"
					data-testid="btn-upload-dsd-from-empty"
				>
					<Upload size={16} />
					Выбрать фотографию
				</button>
				<button
					type="button"
					onClick={handleQrOpen}
					className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 inline-flex items-center gap-2 cursor-pointer"
					data-testid="btn-dsd-qr-bridge"
				>
					<Camera size={16} />
					Снять на смартфон (QR)
				</button>
			</div>
		</div>
	);
};

export default DsdEmptyState;
