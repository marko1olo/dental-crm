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
			className={`flex flex-col items-center justify-center p-6 md:p-10 rounded-2xl border-2 border-dashed transition-all duration-200 text-center select-none shadow-2xl ${
				isDragOver
					? "scale-[1.01]"
					: "hover:border-teal-500/60"
			} ${className}`}
			style={{
				backgroundColor: isDragOver ? "rgba(4, 47, 46, 0.95)" : "rgba(15, 23, 42, 0.96)",
				borderColor: isDragOver ? "#2dd4bf" : "rgba(51, 65, 85, 0.8)",
				color: "#f8fafc",
			}}
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
				<div
					className="flex items-center justify-center w-20 h-20 rounded-2xl shadow-xl"
					style={{
						backgroundColor: "rgba(30, 41, 59, 0.95)",
						borderColor: "rgba(45, 212, 191, 0.4)",
						borderWidth: "1px",
						color: "#2dd4bf",
					}}
				>
					<Scan className="w-10 h-10 animate-pulse" />
				</div>
				<div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-teal-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md border border-teal-400/30">
					DICOM / RVG
				</div>
			</div>

			{/* Title & Subtitle */}
			<h3 className="text-base sm:text-lg md:text-xl font-bold tracking-tight mb-2" style={{ color: "#f8fafc" }}>
				{title}
			</h3>
			<p className="text-xs sm:text-sm max-w-md leading-relaxed mb-6 font-medium" style={{ color: "#94a3b8" }}>
				{subtitle}
			</p>

			{/* Supported Formats Tags */}
			<div className="flex flex-wrap items-center justify-center gap-2 mb-6 max-w-lg">
				<span
					className="px-2.5 py-1 text-[11px] font-semibold rounded-lg"
					style={{ backgroundColor: "rgba(30, 41, 59, 0.9)", border: "1px solid rgba(51, 65, 85, 0.8)", color: "#cbd5e1" }}
				>
					DICOM 3.0 (.dcm)
				</span>
				<span
					className="px-2.5 py-1 text-[11px] font-semibold rounded-lg"
					style={{ backgroundColor: "rgba(30, 41, 59, 0.9)", border: "1px solid rgba(51, 65, 85, 0.8)", color: "#cbd5e1" }}
				>
					16-bit Grayscale TIFF
				</span>
				<span
					className="px-2.5 py-1 text-[11px] font-semibold rounded-lg"
					style={{ backgroundColor: "rgba(30, 41, 59, 0.9)", border: "1px solid rgba(51, 65, 85, 0.8)", color: "#cbd5e1" }}
				>
					PNG / JPG высокой четкости
				</span>
				<span
					className="px-2.5 py-1 text-[11px] font-semibold rounded-lg"
					style={{ backgroundColor: "rgba(4, 47, 46, 0.8)", border: "1px solid rgba(13, 148, 136, 0.5)", color: "#5eead4", fontWeight: "bold" }}
				>
					Vatech / KaVo / Planmeca / Gendex
				</span>
			</div>

			{/* Error Notification */}
			{errorMessage && (
				<div
					className="flex items-center gap-2 px-4 py-2.5 mb-5 rounded-xl text-xs font-semibold max-w-md animate-in fade-in"
					style={{ backgroundColor: "rgba(69, 10, 10, 0.8)", border: "1px solid #991b1b", color: "#fecdd3" }}
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
					className="w-full sm:w-auto flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
					style={{
						backgroundColor: "rgba(30, 41, 59, 0.95)",
						border: "1px solid rgba(51, 65, 85, 0.8)",
						color: "#e2e8f0",
					}}
					data-testid="load-sample-radiograph-btn"
				>
					<HardDrive className="w-4 h-4 text-teal-400" />
					<span>Загрузить тестовый снимок пациента</span>
				</button>
			</div>

			<span className="text-[11px] mt-4 font-mono" style={{ color: "#64748b" }}>
				Стандарт СанПиН 2.6.1.1192-03 · Автоматическая калибровка пикселей
			</span>
		</div>
	);
};
