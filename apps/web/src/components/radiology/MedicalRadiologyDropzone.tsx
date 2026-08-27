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
					? "border-teal-400 bg-teal-950/30 scale-[1.01] shadow-2xl"
					: "border-slate-700 bg-slate-900/95 hover:border-teal-500/60 shadow-2xl"
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
				<div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-800 border border-teal-500/40 text-teal-400 shadow-xl">
					<Scan className="w-10 h-10 animate-pulse" />
				</div>
				<div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-teal-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md border border-teal-400/30">
					DICOM / RVG
				</div>
			</div>

			{/* Title & Subtitle */}
			<h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-100 tracking-tight mb-2">
				{title}
			</h3>
			<p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed mb-6 font-medium">
				{subtitle}
			</p>

			{/* Supported Formats Tags */}
			<div className="flex flex-wrap items-center justify-center gap-2 mb-6 max-w-lg">
				<span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
					DICOM 3.0 (.dcm)
				</span>
				<span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
					16-bit Grayscale TIFF
				</span>
				<span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
					PNG / JPG высокой четкости
				</span>
				<span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-teal-950/60 border border-teal-700/40 text-teal-300 font-bold">
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
					className="w-full sm:w-auto flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
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
					className="w-full sm:w-auto flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-teal-500/60 text-slate-200 hover:text-teal-300 text-xs sm:text-sm font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
					data-testid="load-sample-radiograph-btn"
				>
					<HardDrive className="w-4 h-4 text-teal-400" />
					<span>Загрузить тестовый снимок пациента</span>
				</button>
			</div>

			<span className="text-[11px] text-slate-400 mt-4 font-mono">
				Стандарт СанПиН 2.6.1.1192-03 · Автоматическая калибровка пикселей
			</span>
		</div>
	);
};
