/**
 * Intraoral Camera Modal Footer Action Controls
 */

import React from 'react';
import { Camera, Check, RefreshCw } from 'lucide-react';

interface CameraFooterProps {
	capturedDataUrl: string | null;
	isProcessing: boolean;
	onCapture: () => void;
	onRetake: () => void;
	onConfirm: (keepCapturing: boolean) => void;
}

export const CameraFooter: React.FC<CameraFooterProps> = ({
	capturedDataUrl, isProcessing, onCapture, onRetake, onConfirm,
}) => {
	return (
		<div className="flex items-center justify-between border-t border-[var(--line)] px-4 py-3 bg-[var(--paper-soft)]">
			<div className="text-xs text-[var(--muted)] flex items-center gap-1.5">
				<span className="inline-block px-1.5 py-0.5 rounded bg-[var(--paper-strong)] border border-[var(--line)] font-mono text-[10px] text-[var(--ink)]">
					Пробел / Enter
				</span>
				<span>— {capturedDataUrl ? 'прикрепить снимок' : 'сделать снимок'}</span>
			</div>

			<div className="flex items-center gap-2">
				{capturedDataUrl ? (
					<>
						<button
							type="button"
							onClick={onRetake}
							className="min-h-[40px] px-3 py-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--ink)] flex items-center gap-1.5 transition-colors"
						>
							<RefreshCw className="w-3.5 h-3.5" />
							<span>Переснять</span>
						</button>
						<button
							type="button"
							onClick={() => onConfirm(true)}
							className="min-h-[40px] px-3 py-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--ink)] flex items-center gap-1.5 transition-colors"
							title="Прикрепить этот снимок и сразу сделать следующий"
						>
							<span>Прикрепить и снять ещё</span>
						</button>
						<button
							type="button"
							onClick={() => onConfirm(false)}
							className="min-h-[40px] px-4 py-1.5 text-xs rounded-lg bg-[var(--accent)] hover:opacity-90 text-white font-medium flex items-center gap-1.5 transition-opacity shadow-sm"
						>
							<Check className="w-3.5 h-3.5" />
							<span>{isProcessing ? 'Сохранение...' : 'Прикрепить к приёму'}</span>
						</button>
					</>
				) : (
					<button
						type="button"
						onClick={onCapture}
						className="min-h-[40px] px-5 py-2 text-xs rounded-lg bg-[var(--accent)] hover:opacity-90 text-white font-semibold flex items-center gap-2 transition-opacity shadow-sm"
					>
						<Camera className="w-4 h-4" />
						<span>Сделать снимок</span>
					</button>
				)}
			</div>
		</div>
	);
};
