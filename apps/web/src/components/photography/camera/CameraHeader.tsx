/**
 * Intraoral Camera Modal Header Component
 */

import React from 'react';
import { Video, X } from 'lucide-react';

interface CameraHeaderProps {
	videoDevices: MediaDeviceInfo[];
	selectedDeviceId: string;
	capturedDataUrl: string | null;
	onDeviceSelect: (deviceId: string) => void;
	onClose: () => void;
}

export const CameraHeader: React.FC<CameraHeaderProps> = ({
	videoDevices, selectedDeviceId, capturedDataUrl, onDeviceSelect, onClose,
}) => {
	return (
		<div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 bg-[var(--paper-soft)]">
			<div className="flex items-center gap-2">
				<Video className="w-4 h-4 text-[var(--accent)]" />
				<h3 className="text-sm font-semibold text-[var(--ink)]">
					Быстрый снимок: Интраоральная / Веб-камера
				</h3>
			</div>

			<div className="flex items-center gap-3">
				{videoDevices.length > 1 && !capturedDataUrl && (
					<select
						value={selectedDeviceId}
						onChange={(e) => onDeviceSelect(e.target.value)}
						className="text-xs bg-[var(--paper)] border border-[var(--line)] rounded-md px-2 py-1 text-[var(--ink)] max-w-[200px] truncate"
						title="Выберите интраоральную камеру или веб-камеру"
					>
						{videoDevices.map((dev, idx) => (
							<option key={dev.deviceId || idx} value={dev.deviceId}>
								{dev.label || `Камера ${idx + 1}`}
							</option>
						))}
					</select>
				)}

				<button
					type="button"
					onClick={onClose}
					className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--paper-strong)] hover:text-[var(--ink)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
					title="Закрыть (Esc)"
					aria-label="Закрыть"
				>
					<X className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
};
