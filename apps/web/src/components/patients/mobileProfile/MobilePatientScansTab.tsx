/**
 * DENTE CRM — Mobile Patient Scans Tab (Снимки и КТ)
 * (Apple HIG & Anti-Desktop-Squeeze Mandate)
 *
 * Layer 4: Radiology Studies and DICOM/X-ray Previews (CLS = 0).
 */

import { Camera } from "lucide-react";
import React from "react";

export interface MobilePatientScansTabProps {
	patientStudies: any[];
}

export const MobilePatientScansTab: React.FC<MobilePatientScansTabProps> = ({
	patientStudies,
}) => {
	return (
		<div className="flex flex-col gap-3" data-testid="mobile-panel-scans">
			<div className="flex items-center justify-between">
				<h3 className="text-xs font-black uppercase tracking-wider text-[var(--muted)] m-0">
					Рентгенологические снимки и КТ ({patientStudies.length})
				</h3>
			</div>

			{patientStudies.length === 0 ? (
				<div className="p-8 text-center rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex flex-col items-center gap-2">
					<Camera size={32} className="text-[var(--muted)] opacity-50" />
					<p className="text-xs text-[var(--muted)] m-0">
						Рентгеновских снимков пока нет.
					</p>
				</div>
			) : (
				<div className="grid grid-cols-2 gap-2.5">
					{patientStudies.map((study: any) => (
						<div
							key={study.id}
							className="p-2.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-1.5"
							data-testid={`mobile-study-card-${study.id}`}
						>
							{/* Preview 200x200px style (CLS = 0) */}
							<div className="w-full aspect-square rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] overflow-hidden flex items-center justify-center relative">
								{study.previewUrl ? (
									<img
										src={study.previewUrl}
										alt={study.title || "Снимок"}
										className="w-full h-full object-cover"
										loading="lazy"
									/>
								) : (
									<Camera size={28} className="text-[var(--muted)] opacity-60" />
								)}
								{study.toothCode && (
									<span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/75 text-white font-mono text-[10px] font-bold">
										Зуб {study.toothCode}
									</span>
								)}
							</div>

							<h4 className="text-xs font-bold text-[var(--ink)] m-0 truncate" title={study.title}>
								{study.title || "Рентгенограмма"}
							</h4>
							<p className="text-[10px] text-[var(--muted)] m-0">
								{study.capturedAt
									? new Date(study.capturedAt).toLocaleDateString("ru-RU")
									: "Дата неизвестна"}
							</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
