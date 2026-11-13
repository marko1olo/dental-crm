import React from "react";
import { Box, Camera, CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { is3DScanUrl } from "./attachScanModules/labScanUrlUtils";
import { useLabAttachScanState } from "./attachScanModules/useLabAttachScanState";
import type { DentalLabOrderData } from "./labMath";

export { is3DScanUrl };

export interface LabAttachHeaderProps {
	readonly order: DentalLabOrderData;
	readonly onClose: () => void;
}

export function LabAttachHeader({
	order,
	onClose,
}: LabAttachHeaderProps) {
	return (
		<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]">
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border bg-teal-500/10 border-teal-500/25 text-teal-600 dark:text-teal-400">
					<Box className="w-4 h-4" />
				</div>
				<div className="min-w-0">
					<h3
						id="lab-attach-modal-title"
						className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] m-0 truncate"
					>
						Прикрепление 3D-скана / фото (ЗТЛ)
					</h3>
					<p className="text-[11px] text-[var(--muted,#64748b)] m-0 truncate">
						Наряд #{order.id ? order.id.slice(0, 8) : ""} ·{" "}
						{order.patientName || "Пациент"} (зуб {order.toothFdi || "—"})
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="min-h-[32px] min-w-[32px] rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] flex items-center justify-center transition-colors cursor-pointer"
				aria-label="Закрыть"
			>
				<X className="w-4 h-4" />
			</button>
		</div>
	);
}

export interface LabAttachFooterProps {
	readonly onClose: () => void;
	readonly isSubmitting: boolean;
	readonly canSubmit: boolean;
}

export function LabAttachFooter({
	onClose,
	isSubmitting,
	canSubmit,
}: LabAttachFooterProps) {
	return (
		<div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]">
			<button
				type="button"
				onClick={onClose}
				aria-busy={isSubmitting}
				className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] font-medium text-xs transition-colors cursor-pointer"
			>
				Отмена
			</button>
			<button
				type="submit"
				aria-busy={isSubmitting}
				className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-lg font-bold text-xs text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
				data-testid="lab-attach-scan-submit-btn"
			>
				{isSubmitting ? (
					<Loader2 className="w-3.5 h-3.5 animate-spin" />
				) : (
					<CheckCircle2 className="w-3.5 h-3.5" />
				)}
				<span>Сохранить файл</span>
			</button>
		</div>
	);
}

export interface LabAttachPathInputProps {
	readonly inputRef: React.RefObject<HTMLInputElement | null>;
	readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
	readonly filePath: string;
	readonly setFilePath: (p: string) => void;
	readonly fileSizeInfo: string | null;
	readonly onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function LabAttachPathInput({
	inputRef,
	fileInputRef,
	filePath,
	setFilePath,
	fileSizeInfo,
	onFileSelect,
}: LabAttachPathInputProps) {
	return (
		<div className="space-y-1.5">
			<label
				htmlFor="lab-attach-path-input"
				className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center justify-between"
			>
				<span>Путь к файлу скана или URL:</span>
				{fileSizeInfo && (
					<span className="text-[11px] font-mono text-teal-600 dark:text-teal-400 font-bold">
						Размер: {fileSizeInfo}
					</span>
				)}
			</label>
			<div className="flex gap-2">
				<input
					id="lab-attach-path-input"
					ref={inputRef}
					type="text"
					value={filePath}
					onChange={(e) => setFilePath(e.target.value)}
					placeholder="scans/upper_jaw_scan.stl или https://..."
					className="flex-1 h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
					data-testid="lab-attach-scan-path-input"
				/>
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					className="h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f1f5f9)] hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
					title="Выбрать файл"
				>
					<Upload className="w-3.5 h-3.5" />
					<span>Обзор...</span>
				</button>
				<input
					ref={fileInputRef}
					type="file"
					accept=".stl,.ply,.obj,.3mf,image/*"
					className="hidden"
					onChange={onFileSelect}
				/>
			</div>
		</div>
	);
}

export interface LabAttachPresetItem {
	readonly label: string;
	readonly path: string;
	readonly type: "stl" | "ply" | "photo";
}

export function LabAttachPresetList({
	presets,
	filePath,
	onSelect,
}: {
	readonly presets: readonly LabAttachPresetItem[];
	readonly filePath: string;
	readonly onSelect: (preset: LabAttachPresetItem) => void;
}) {
	return (
		<div className="space-y-1.5">
			<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">
				Быстрые пресеты клинических файлов:
			</span>
			<div className="flex flex-wrap gap-1.5">
				{presets.map((pr) => (
					<button
						key={pr.label}
						type="button"
						onClick={() => onSelect(pr)}
						className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer text-left ${
							filePath === pr.path
								? "bg-teal-500/15 border-teal-500/40 text-teal-800 dark:text-teal-200 font-bold"
								: "bg-[var(--paper-soft,#f1f5f9)] hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] border-[var(--line,#cbd5e1)]"
						}`}
					>
						{pr.label}
					</button>
				))}
			</div>
		</div>
	);
}

export interface LabAttachScanPresetsProps {
	readonly attachType: "stl" | "ply" | "photo";
	readonly setAttachType: (t: "stl" | "ply" | "photo") => void;
	readonly filePath: string;
	readonly setFilePath: (p: string) => void;
	readonly patientTag: string;
	readonly toothTag: string | number;
	readonly onPresetSelect?: () => void;
}

export function LabAttachScanPresets({
	attachType,
	setAttachType,
	filePath,
	setFilePath,
	patientTag,
	toothTag,
	onPresetSelect,
}: LabAttachScanPresetsProps) {
	const presets: readonly LabAttachPresetItem[] = [
		{
			label: "В/Ч Верхняя челюсть (STL)",
			path: `scans/${patientTag}_upper_${toothTag}.stl`,
			type: "stl",
		},
		{
			label: "Н/Ч Нижняя челюсть (STL)",
			path: `scans/${patientTag}_lower_${toothTag}.stl`,
			type: "stl",
		},
		{
			label: "Цветной скан прикуса (PLY)",
			path: `scans/${patientTag}_occlusion_bite.ply`,
			type: "ply",
		},
		{
			label: "Клиническое фото улыбки (JPG)",
			path: `photos/${patientTag}_clinical_view.jpg`,
			type: "photo",
		},
	];

	return (
		<div className="space-y-3.5">
			<div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#cbd5e1)]">
				<button
					type="button"
					onClick={() => {
						setAttachType("stl");
						if (!filePath.toLowerCase().endsWith(".stl"))
							setFilePath(`scans/${patientTag}_upper.stl`);
					}}
					className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						attachType === "stl"
							? "bg-[var(--paper,#ffffff)] text-teal-700 dark:text-teal-300 shadow-2xs border border-[var(--line,#cbd5e1)]"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
				>
					<Box className="w-3.5 h-3.5 text-teal-500" />
					<span>STL 3D-скан</span>
				</button>
				<button
					type="button"
					onClick={() => {
						setAttachType("ply");
						if (!filePath.toLowerCase().endsWith(".ply"))
							setFilePath(`scans/${patientTag}_bite.ply`);
					}}
					className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						attachType === "ply"
							? "bg-[var(--paper,#ffffff)] text-purple-700 dark:text-purple-300 shadow-2xs border border-[var(--line,#cbd5e1)]"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
				>
					<Box className="w-3.5 h-3.5 text-purple-500" />
					<span>PLY (Цветной 3D)</span>
				</button>
				<button
					type="button"
					onClick={() => {
						setAttachType("photo");
						if (is3DScanUrl(filePath))
							setFilePath(`photos/${patientTag}_bite.jpg`);
					}}
					className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						attachType === "photo"
							? "bg-[var(--paper,#ffffff)] text-sky-700 dark:text-sky-300 shadow-2xs border border-[var(--line,#cbd5e1)]"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
				>
					<Camera className="w-3.5 h-3.5 text-sky-500" />
					<span>Фото прикуса</span>
				</button>
			</div>

			<LabAttachPresetList
				presets={presets}
				filePath={filePath}
				onSelect={(pr) => {
					setFilePath(pr.path);
					setAttachType(pr.type);
					onPresetSelect?.();
				}}
			/>
		</div>
	);
}

export interface LabAttachScanModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly order: DentalLabOrderData | null;
	readonly initialType?: "stl" | "ply" | "photo";
	readonly onSave: (url: string) => Promise<void>;
}

export function LabAttachScanModal({
	isOpen,
	onClose,
	order,
	initialType = "stl",
	onSave,
}: LabAttachScanModalProps) {
	const state = useLabAttachScanState(isOpen, order, initialType, onSave);

	if (!isOpen || !order) return null;

	const patientTag = order.patientName
		? order.patientName.replace(/\s+/g, "_")
		: "patient";
	const toothTag = order.toothFdi || "arch";

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="lab-attach-modal-title"
			tabIndex={-1}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			<div className="w-full max-w-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#cbd5e1)] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
				<LabAttachHeader order={order} onClose={onClose} />
				<form onSubmit={state.handleSubmit} className="flex flex-col m-0">
					<div className="p-4 space-y-3.5">
						<LabAttachScanPresets
							attachType={state.attachType}
							setAttachType={state.setAttachType}
							filePath={state.filePath}
							setFilePath={state.setFilePath}
							patientTag={patientTag}
							toothTag={toothTag}
							onPresetSelect={() => state.inputRef.current?.focus()}
						/>
						<LabAttachPathInput
							inputRef={state.inputRef}
							fileInputRef={state.fileInputRef}
							filePath={state.filePath}
							setFilePath={state.setFilePath}
							fileSizeInfo={state.fileSizeInfo}
							onFileSelect={state.handleFileSelect}
						/>
					</div>
					<LabAttachFooter
						onClose={onClose}
						isSubmitting={state.isSubmitting}
						canSubmit={Boolean(state.filePath.trim())}
					/>
				</form>
			</div>
		</div>
	);
}
