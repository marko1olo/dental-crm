import React from "react";
import { Eye, Package } from "lucide-react";
import { showToast } from "../../GlobalToast";
import type { ClinicalVisitItem } from "./types";

interface TimelineAttachmentsSectionProps {
	visit: ClinicalVisitItem;
}

export const TimelineAttachmentsSection: React.FC<TimelineAttachmentsSectionProps> = ({ visit }) => {
	const scansList = visit.attachedScans && visit.attachedScans.length > 0
		? visit.attachedScans
		: visit.attachedScan ? [visit.attachedScan] : [];

	if (scansList.length === 0 && (!visit.materialsDeducted || visit.materialsDeducted.length === 0)) {
		return null;
	}

	return (
		<div className="clinical-attachments-row">
			{scansList.length > 0 && (
				<div className="clinical-scans-section w-full">
					<div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5 mb-2">
						<Eye className="w-3.5 h-3.5 text-[var(--teal)]" />
						<span>Прикрепленные снимки и рентгенограммы ({scansList.length})</span>
					</div>
					<div className="clinical-scans-grid">
						{scansList.map((scan, sIdx) => (
							<div
								key={sIdx}
								className="clinical-scan-card"
								title={`${scan.title} — нажмите для просмотра`}
								onClick={(e) => { e.stopPropagation(); showToast(`Просмотр снимка: ${scan.title}`, "info"); }}
							>
								<div className="clinical-scan-thumb">
									<img src={scan.previewUrl} alt={scan.title} loading="lazy" />
									<span className="clinical-scan-kind-badge">{scan.kind}</span>
								</div>
								<div className="clinical-scan-meta">
									<span className="clinical-scan-title truncate">{scan.title}</span>
									{scan.tooth && <span className="clinical-scan-tooth">Зуб {scan.tooth}</span>}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{visit.materialsDeducted && visit.materialsDeducted.length > 0 && (
				<div className="clinical-materials-section w-full">
					<div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
						<Package className="w-3.5 h-3.5 text-purple-500" />
						<span>Списано со склада по техкарте:</span>
					</div>
					<div className="flex flex-wrap gap-1.5">
						{visit.materialsDeducted.map((mat, mIdx) => (
							<span key={mIdx} className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] font-medium inline-flex items-center gap-1">
								<span>{mat.name}</span>
								<strong className="text-[var(--teal)] font-mono">({mat.quantity} {mat.unit})</strong>
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
