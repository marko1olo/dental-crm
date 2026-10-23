/**
 * Intraoral Camera Video Stream & Preview Viewport
 */

import React from 'react';
import { AlertCircle, RefreshCw, Check } from 'lucide-react';

interface CameraViewportProps {
	videoRef: React.RefObject<HTMLVideoElement | null>;
	capturedDataUrl: string | null;
	isLoading: boolean;
	errorMessage: string | null;
	onRetryStream: () => void;
}

export const CameraViewport: React.FC<CameraViewportProps> = ({
	videoRef, capturedDataUrl, isLoading, errorMessage, onRetryStream,
}) => {
	return (
		<div className="relative flex-1 bg-black flex items-center justify-center min-h-[360px] max-h-[60vh] overflow-hidden">
			{errorMessage ? (
				<div className="p-6 text-center text-white max-w-md space-y-3">
					<AlertCircle className="w-10 h-10 text-[var(--bad-fg)] mx-auto" />
					<p className="text-sm">{errorMessage}</p>
					<button
						type="button"
						onClick={onRetryStream}
						className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper)] transition-colors border border-[var(--line)]"
					>
						<RefreshCw className="w-3.5 h-3.5" />
						<span>Повторить запуск камеры</span>
					</button>
				</div>
			) : capturedDataUrl ? (
				<div className="relative w-full h-full flex items-center justify-center">
					<img
						src={capturedDataUrl}
						alt="Стоп-кадр интраорального снимка"
						className="max-h-[60vh] w-auto object-contain"
					/>
					<div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-md backdrop-blur-xs font-mono flex items-center gap-1.5">
						<Check className="w-3.5 h-3.5 text-[var(--ok-fg)]" />
						<span>Стоп-кадр зафиксирован</span>
					</div>
				</div>
			) : (
				<div className="relative w-full h-full flex items-center justify-center">
					<video ref={videoRef} autoPlay playsInline muted className="max-h-[60vh] w-auto object-contain" />
					{isLoading && (
						<div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs gap-2">
							<RefreshCw className="w-4 h-4 animate-spin" />
							<span>Инициализация видеопотока...</span>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
