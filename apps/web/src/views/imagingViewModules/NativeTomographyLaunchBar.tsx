import React, { useState } from "react";
import { ExternalLink, FolderOpen } from "lucide-react";
import { launchExternalCtViewer } from "../../native/desktop/ctViewerBridge";
import { showToast } from "../../components/GlobalToast";

export interface NativeTomographyLaunchBarProps {
	selectedImagingStudy: any;
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
			const res = await launchExternalCtViewer({
				viewerId,
				studyPath: selectedImagingStudy?.filePath || selectedImagingStudy?.id || "",
			});
			if (res.success) {
				showToast(`Запуск ${vendorName}...`, "success");
			} else {
				showToast(res.error || `Не удалось запустить ${vendorName}. Открываю встроенный просмотрщик...`, "info");
				if (res.canFallbackToInternalStudio) {
					onOpenCbctStudio();
				}
			}
		} catch {
			showToast(`Сбой запуска ${vendorName}`, "error");
		} finally {
			setLaunchingApp(null);
		}
	};

	return (
		<div className="pt-2.5 border-t border-[var(--line-subtle)] flex flex-wrap items-center justify-between gap-2">
			<div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-muted)]">
				<ExternalLink size={13} className="text-[var(--primary)] shrink-0" />
				<span>Открыть в томографе (1 клик):</span>
			</div>

			<div className="flex flex-wrap items-center gap-1.5">
				<button
					type="button"
					data-testid="btn-launch-romexis"
					onClick={() => handleLaunchApp("planmeca-romexis-3d", "Planmeca Romexis")}
					disabled={Boolean(launchingApp)}
					className="h-8 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
					title="Открыть томограмму в Planmeca Romexis 3D (аппаратное ускорение видеокарты)"
				>
					<span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
					<span>Romexis</span>
				</button>

				<button
					type="button"
					data-testid="btn-launch-ez3d"
					onClick={() => handleLaunchApp("vatech-ez3d-i", "Vatech Ez3D-i")}
					disabled={Boolean(launchingApp)}
					className="h-8 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
					title="Открыть томограмму в Vatech Ez3D-i / EzDent-i"
				>
					<span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
					<span>Ez3D-i</span>
				</button>

				<button
					type="button"
					data-testid="btn-launch-sidexis"
					onClick={() => handleLaunchApp("sirona-galileos-sidexis", "Dentsply Sirona Sidexis")}
					disabled={Boolean(launchingApp)}
					className="h-8 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
					title="Открыть томограмму в Dentsply Sirona Sidexis 4 / Galileos"
				>
					<span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
					<span>Sidexis 4</span>
				</button>

				<button
					type="button"
					data-testid="btn-launch-3shape"
					onClick={() => handleLaunchApp("3shape", "3Shape Dental System")}
					disabled={Boolean(launchingApp)}
					className="h-8 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
					title="Открыть в 3Shape / Exocad"
				>
					<span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
					<span>3Shape</span>
				</button>

				<button
					type="button"
					data-testid="btn-open-explorer-folder"
					onClick={() => handleLaunchApp("explorer", "Проводник Windows")}
					disabled={Boolean(launchingApp)}
					className="h-8 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
					title="Показать папку снимка в Проводнике Windows"
				>
					<FolderOpen size={13} className="shrink-0" />
					<span>Папка</span>
				</button>
			</div>
		</div>
	);
}
