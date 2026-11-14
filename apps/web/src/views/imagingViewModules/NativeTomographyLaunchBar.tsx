import React, { useState } from "react";
import { ExternalLink, FolderOpen, Loader2 } from "lucide-react";
import { launchExternalCtViewer } from "../../native/desktop/ctViewerBridge";
import { showToast } from "../../components/GlobalToast";
import type { ImagingStudy } from "./imagingViewTypes";

export interface NativeTomographyLaunchBarProps {
	selectedImagingStudy: ImagingStudy | null;
	onOpenCbctStudio: () => void;
}

export function NativeTomographyLaunchBar({
	selectedImagingStudy,
	onOpenCbctStudio,
}: NativeTomographyLaunchBarProps) {
	const [launchingApp, setLaunchingApp] = useState<string | null>(null);

	const handleLaunchApp = async (viewerId: string, vendorName: string) => {
		setLaunchingApp(vendorName);
		try {
			const studyPath = (selectedImagingStudy as { filePath?: string } | null)?.filePath || selectedImagingStudy?.id || "";
			const res = await launchExternalCtViewer({
				viewerId,
				studyPath,
			});
			if (res.success) {
				showToast(`Запуск ${vendorName}...`, "success");
			} else {
				showToast(res.error || `Не удалось запустить ${vendorName}. Открываю встроенный просмотрщик...`, "info");
				if (res.canFallbackToInternalStudio) {
					onOpenCbctStudio();
				}
			}
		} catch (err: unknown) {
			console.warn("[NativeTomographyLaunchBar] Failed to launch external viewer:", err);
			showToast(`Сбой запуска ${vendorName}`, "error");
		} finally {
			setLaunchingApp(null);
		}
	};

	return (
		<div className="pt-2.5 border-t border-[var(--line-subtle)] flex flex-wrap items-center justify-between gap-2">
			<div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-muted)]">
				<ExternalLink size={13} className="text-[var(--primary)] shrink-0" />
				<span>Открыть во внешнем просмотрщике:</span>
			</div>

			<div className="flex flex-wrap items-center gap-1.5">
				<button
					type="button"
					data-testid="btn-launch-romexis"
					onClick={() => handleLaunchApp("planmeca-romexis-3d", "Planmeca Romexis")}
					className="h-8 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
					title="Открыть томограмму в Planmeca Romexis 3D (аппаратное ускорение видеокарты)"
				>
					{launchingApp === "Planmeca Romexis" ? (
						<Loader2 size={12} className="animate-spin text-blue-500 shrink-0" />
					) : (
						<span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
					)}
					<span>Romexis</span>
				</button>

				<button
					type="button"
					data-testid="btn-launch-ez3d"
					onClick={() => handleLaunchApp("vatech-ez3d-i", "Vatech Ez3D-i")}
					className="h-8 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
					title="Открыть томограмму в Vatech Ez3D-i / EzDent-i"
				>
					{launchingApp === "Vatech Ez3D-i" ? (
						<Loader2 size={12} className="animate-spin text-emerald-500 shrink-0" />
					) : (
						<span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
					)}
					<span>Ez3D-i</span>
				</button>

				<button
					type="button"
					data-testid="btn-launch-radiant"
					onClick={() => handleLaunchApp("radiant-dicom-viewer", "RadiAnt DICOM Viewer")}
					className="h-8 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
					title="Открыть томограмму в RadiAnt DICOM Viewer"
				>
					{launchingApp === "RadiAnt DICOM Viewer" ? (
						<Loader2 size={12} className="animate-spin text-cyan-500 shrink-0" />
					) : (
						<span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
					)}
					<span>RadiAnt</span>
				</button>

				<button
					type="button"
					data-testid="btn-launch-sidexis"
					onClick={() => handleLaunchApp("sirona-galileos-sidexis", "Dentsply Sirona Sidexis")}
					className="h-8 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
					title="Открыть томограмму в Dentsply Sirona Sidexis 4 / Galileos"
				>
					{launchingApp === "Dentsply Sirona Sidexis" ? (
						<Loader2 size={12} className="animate-spin text-amber-500 shrink-0" />
					) : (
						<span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
					)}
					<span>Sidexis 4</span>
				</button>

				<button
					type="button"
					data-testid="btn-launch-3shape"
					onClick={() => handleLaunchApp("3shape", "3Shape Dental System")}
					className="h-8 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
					title="Открыть в 3Shape / Exocad"
				>
					{launchingApp === "3Shape Dental System" ? (
						<Loader2 size={12} className="animate-spin text-purple-500 shrink-0" />
					) : (
						<span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
					)}
					<span>3Shape</span>
				</button>

				<button
					type="button"
					data-testid="btn-open-explorer-folder"
					onClick={() => handleLaunchApp("explorer", "Проводник Windows")}
					className="h-8 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
					title="Показать папку снимка в Проводнике Windows"
				>
					{launchingApp === "Проводник Windows" ? (
						<Loader2 size={12} className="animate-spin text-[var(--ink)] shrink-0" />
					) : (
						<FolderOpen size={13} className="shrink-0" />
					)}
					<span>Папка</span>
				</button>
			</div>
		</div>
	);
}
