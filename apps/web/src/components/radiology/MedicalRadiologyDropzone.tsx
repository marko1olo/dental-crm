import {
	AlertCircle,
	CheckCircle2,
	FileUp,
	HardDrive,
	Image as ImageIcon,
	Scan,
	UploadCloud,
} from "lucide-react";
import type React from "react";
import { useCallback, useRef, useState } from "react";

export interface MedicalRadiologyDropzoneProps {
	onImageLoaded: (
		fileDataUrl: string,
		fileMeta?: { name: string; size: number; type: string },
	) => void;
	onLoadSample?: () => void;
	title?: string;
	subtitle?: string;
	className?: string;
	disabled?: boolean;
}

export const SAMPLE_PATIENT_RVG_URL = "/radiology/sample_rvg_tooth16.jpg";

/** Поддерживаемые расширения файлов лучевой диагностики */
export const SUPPORTED_RADIOLOGY_EXTENSIONS = [
	".dcm",
	".dicom",
	".tif",
	".tiff",
	".png",
	".jpg",
	".jpeg",
	".webp",
];

export const MedicalRadiologyDropzone: React.FC<
	MedicalRadiologyDropzoneProps
> = ({
	onImageLoaded,
	onLoadSample,
	title = "Загрузка цифровой рентгенограммы / DICOM",
	subtitle = "Перетащите файл радиовизиографии (DICOM .dcm, TIFF, PNG, JPG) или выберите с диска",
	className = "",
	disabled = false,
}) => {
	const [isDragOver, setIsDragOver] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const processFile = useCallback(
		(file: File) => {
			setErrorMessage(null);
			setIsLoading(true);

			const lowerName = file.name.toLowerCase();
			const isDicom = lowerName.endsWith(".dcm") || lowerName.endsWith(".dicom");
			const isSupported =
				SUPPORTED_RADIOLOGY_EXTENSIONS.some((ext) => lowerName.endsWith(ext)) ||
				file.type.startsWith("image/");

			if (!isSupported && !isDicom) {
				setErrorMessage(
					`Неподдерживаемый формат файла: ${file.name}. Допустимы форматы: DICOM (.dcm), TIFF, PNG, JPG.`,
				);
				setIsLoading(false);
				return;
			}

			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result;
				if (typeof result === "string") {
					onImageLoaded(result, {
						name: file.name,
						size: file.size,
						type: file.type || (isDicom ? "application/dicom" : "image/jpeg"),
					});
				}
				setIsLoading(false);
			};

			reader.onerror = () => {
				setErrorMessage(`Ошибка чтения файла: ${file.name}`);
				setIsLoading(false);
			};

			reader.readAsDataURL(file);
		},
		[onImageLoaded],
	);

	const handleDragOver = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			e.stopPropagation();
			if (!disabled) {
				setIsDragOver(true);
			}
		},
		[disabled],
	);

	const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragOver(false);

			if (disabled) return;

			const files = e.dataTransfer.files;
			if (files && files.length > 0 && files[0]) {
				processFile(files[0]);
			}
		},
		[disabled, processFile],
	);

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0 && files[0]) {
			processFile(files[0]);
		}
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleLoadSamplePatientRadiograph = () => {
		setErrorMessage(null);
		if (onLoadSample) {
			onLoadSample();
		} else {
			onImageLoaded(SAMPLE_PATIENT_RVG_URL, {
				name: "SMIRNOVA_E_V_tooth16_RVG_postop.jpg",
				size: 700609,
				type: "image/jpeg",
			});
		}
	};

	return (
		<div
			className={`flex flex-col items-center justify-center p-6 md:p-10 rounded-2xl border-2 border-dashed transition-all duration-200 text-center select-none ${
				isDragOver
					? "border-[var(--teal)] bg-[var(--teal-surface)]/30 scale-[1.01] shadow-2xl"
					: "border-[var(--line,#334155)] bg-[var(--paper-soft,#0f172a)]/95 hover:border-[var(--teal-soft,#38bdf8)]/60"
			} ${className}`}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			data-testid="medical-radiology-dropzone"
		>
			<input
				ref={fileInputRef}
				type="file"
				accept=".dcm,.dicom,.tif,.tiff,.png,.jpg,.jpeg,.webp,image/*"
				className="hidden"
				onChange={handleFileInputChange}
				data-testid="dropzone-file-input"
			/>

			{/* Medical Sensor Icon Badge */}
			<div className="relative mb-5">
				<div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--paper,#1e293b)] border border-[var(--teal-soft,#38bdf8)]/40 text-[var(--teal,#06b6d4)] shadow-xl">
					<Scan className="w-10 h-10 animate-pulse" />
				</div>
				<div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] text-[10px] font-extrabold uppercase tracking-wider shadow-md">
					DICOM / RVG
				</div>
			</div>

			{/* Title & Subtitle */}
			<h3 className="text-base sm:text-lg md:text-xl font-bold text-[var(--ink,#f8fafc)] tracking-tight mb-2">
				{title}
			</h3>
			<p className="text-xs sm:text-sm text-[var(--muted,#94a3b8)] max-w-md leading-relaxed mb-6 font-medium">
				{subtitle}
			</p>

			{/* Supported Formats Tags */}
			<div className="flex flex-wrap items-center justify-center gap-2 mb-6 max-w-lg">
				<span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[var(--paper,#1e293b)] border border-[var(--line,#334155)] text-[var(--ink,#cbd5e1)]">
					DICOM 3.0 (.dcm)
				</span>
				<span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[var(--paper,#1e293b)] border border-[var(--line,#334155)] text-[var(--ink,#cbd5e1)]">
					16-bit Grayscale TIFF
				</span>
				<span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[var(--paper,#1e293b)] border border-[var(--line,#334155)] text-[var(--ink,#cbd5e1)]">
					PNG / JPG высокой четкости
				</span>
				<span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[var(--teal-surface)] border border-[var(--teal-soft)]/30 text-[var(--teal)] font-bold">
					Vatech / KaVo / Planmeca / Gendex
				</span>
			</div>

			{/* Error Notification */}
			{errorMessage && (
				<div
					className="flex items-center gap-2 px-4 py-2.5 mb-5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs font-semibold max-w-md animate-in fade-in"
					data-testid="dropzone-error-message"
				>
					<AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
					<span className="text-left">{errorMessage}</span>
				</div>
			)}

			{/* Interactive Action Buttons */}
			<div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
				{/* Button 1: Browse File from Disk */}
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					disabled={disabled || isLoading}
					className="w-full sm:w-auto flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] text-xs sm:text-sm font-bold shadow-lg hover:opacity-95 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
					data-testid="dropzone-browse-file-btn"
				>
					<FileUp className="w-4 h-4" />
					<span>{isLoading ? "Загрузка файла..." : "Выбрать файл снимка"}</span>
				</button>

				{/* Button 2: Load Sample Patient Radiograph */}
				<button
					type="button"
					onClick={handleLoadSamplePatientRadiograph}
					disabled={disabled || isLoading}
					className="w-full sm:w-auto flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--paper,#1e293b)] border border-[var(--line,#334155)] hover:border-[var(--teal-soft,#38bdf8)] text-[var(--ink,#cbd5e1)] hover:text-[var(--teal,#06b6d4)] text-xs sm:text-sm font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
					data-testid="load-sample-radiograph-btn"
				>
					<HardDrive className="w-4 h-4 text-[var(--teal)]" />
					<span>Загрузить тестовый снимок пациента</span>
				</button>
			</div>

			<span className="text-[11px] text-[var(--muted,#94a3b8)] mt-4 font-mono">
				Стандарт СанПиН 2.6.1.1192-03 · Автоматическая калибровка пикселей
			</span>
		</div>
	);
};
