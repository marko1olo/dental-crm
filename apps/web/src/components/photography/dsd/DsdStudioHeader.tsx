import React, { RefObject } from 'react';
import { Sparkles, X, Upload, Image as ImageIcon } from 'lucide-react';
import type { DsdPatientPhotoOption } from './DsdAestheticStudioModal';

interface DsdStudioHeaderProps {
	patientName: string;
	doctorName: string;
	effectivePhotos: DsdPatientPhotoOption[];
	activePhotoUrl: string;
	setActivePhotoUrl: (url: string) => void;
	fileInputRef: RefObject<HTMLInputElement | null>;
	handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onClose: () => void;
}

export const DsdStudioHeader: React.FC<DsdStudioHeaderProps> = ({
	patientName,
	doctorName,
	effectivePhotos,
	activePhotoUrl,
	setActivePhotoUrl,
	fileInputRef,
	handleFileChange,
	onClose,
}) => {
	return (
		<header className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] flex items-center justify-between shrink-0">
			<div className="flex items-center gap-2 sm:gap-3">
				<div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-500/10 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0 border border-teal-500/20">
					<Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
				</div>
				<div>
					<div className="flex items-center gap-2">
						<h2 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] m-0">
							Digital Smile Design (DSD)
						</h2>
						<span className="hidden sm:inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
							Wheeler 2.5D
						</span>
					</div>
					<div className="text-xs text-[var(--muted,#64748b)] truncate">
						Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong> • Врач: {doctorName}
					</div>
				</div>
			</div>

			{/* Выбор снимков пациента при наличии нескольких ракурсов */}
			{effectivePhotos.length > 1 && (
				<div className="hidden md:flex items-center gap-1 bg-[var(--paper-soft,#f8fafc)] p-1 rounded-xl border border-[var(--line,#cbd5e1)]">
					{effectivePhotos.slice(0, 3).map((photo, idx) => (
						<button
							key={photo.id || idx}
							type="button"
							onClick={() => setActivePhotoUrl(photo.url)}
							className={`px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
								activePhotoUrl === photo.url
									? 'bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] shadow-xs font-bold'
									: 'text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]'
							}`}
						>
							<ImageIcon className="w-3 h-3" />
							<span>{photo.label || `Снимок ${idx + 1}`}</span>
						</button>
					))}
				</div>
			)}

			{/* Тулбар действий шапки */}
			<div className="flex items-center gap-1.5 sm:gap-2">
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-strong,#f1f5f9)] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer min-h-[36px]"
					title="Загрузить другое фото"
					data-testid="btn-dsd-upload-photo"
				>
					<Upload className="w-3.5 h-3.5" />
					<span className="hidden sm:inline">Загрузить фото</span>
				</button>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					className="hidden"
					onChange={handleFileChange}
				/>

				<button
					type="button"
					onClick={onClose}
					className="p-1.5 sm:p-2 rounded-lg border border-[var(--line,#cbd5e1)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
					title="Закрыть студию DSD"
					data-testid="btn-close-dsd-modal"
				>
					<X className="w-5 h-5" />
				</button>
			</div>
		</header>
	);
};

export default DsdStudioHeader;
