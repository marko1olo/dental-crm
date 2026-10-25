import React from "react";
import { Eye, Package, ShieldCheck } from "lucide-react";
import { showToast } from "../../GlobalToast";
import type { ClinicalVisitItem } from "./types";

interface DrawerScansAndMaterialsSectionProps {
	visit: ClinicalVisitItem;
}

export const DrawerScansAndMaterialsSection: React.FC<DrawerScansAndMaterialsSectionProps> = ({ visit }) => {
	const scansList = visit.attachedScans && visit.attachedScans.length > 0
		? visit.attachedScans
		: visit.attachedScan ? [visit.attachedScan] : [];

	return (
		<>
			{scansList.length > 0 && (
				<div className="space-y-2">
					<div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
						<Eye className="w-3.5 h-3.5 text-[var(--teal)]" />
						<span>Прикрепленные снимки ({scansList.length})</span>
					</div>
					<div className="grid grid-cols-2 gap-2">
						{scansList.map((scan, idx) => (
							<div
								key={idx}
								className="border border-[var(--line)] rounded-lg overflow-hidden bg-[var(--paper-soft)] cursor-pointer hover:border-[var(--teal)] transition-colors"
								onClick={() => showToast(`Просмотр снимка: ${scan.title}`, "info")}
							>
								<div className="relative aspect-video bg-black/5">
									<img src={scan.previewUrl} alt={scan.title} className="w-full h-full object-cover" loading="lazy" />
									<span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white">
										{scan.kind}
									</span>
								</div>
								<div className="p-2 text-[11px]">
									<div className="font-medium text-[var(--ink)] truncate">{scan.title}</div>
									{scan.tooth && <div className="text-[var(--muted)] text-[10px]">Зуб {scan.tooth}</div>}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{visit.materialsDeducted && visit.materialsDeducted.length > 0 && (
				<div className="space-y-2">
					<div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
						<Package className="w-3.5 h-3.5 text-purple-500" />
						<span>Списанные материалы со склада</span>
					</div>
					<div className="flex flex-wrap gap-1.5">
						{visit.materialsDeducted.map((mat, idx) => (
							<span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] font-medium inline-flex items-center gap-1">
								<span>{mat.name}</span>
								<strong className="text-[var(--teal)] font-mono">({mat.quantity} {mat.unit})</strong>
							</span>
						))}
					</div>
				</div>
			)}

			{visit.warrantyUntil && (
				<div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
					<ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
					<span>Гарантийный период на реставрацию: <strong>до {visit.warrantyUntil}</strong></span>
				</div>
			)}
		</>
	);
};
