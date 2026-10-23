import React from "react";
import type { RadiologySnapshotItem } from "../visit/VisitSummaryModal";

export interface PremiumPrintRadiologySectionProps {
	radiologySnapshots: readonly RadiologySnapshotItem[];
}

export const PremiumPrintRadiologySection: React.FC<PremiumPrintRadiologySectionProps> = ({
	radiologySnapshots,
}) => {
	if (!radiologySnapshots || radiologySnapshots.length === 0) return null;

	return (
		<div className="doc-soap-section mt-3">
			<div className="doc-soap-heading">
				<span>Рентгенологическое обследование и данные радиовизиографии / КЛКТ</span>
			</div>
			<div className="doc-radiology-grid">
				{radiologySnapshots.map((snap, idx) => (
					<div key={snap.id || idx} className="doc-radiology-card">
						<img src={snap.thumbnailDataUri || snap.imageDataUri} alt={snap.title || `Снимок ${idx + 1}`} />
						<div className="doc-radiology-meta">
							<strong>{snap.toothCode ? `Зуб FDI № ${snap.toothCode}` : snap.title || "Рентгенологический снимок"}</strong>
							{snap.boneDensity && (
								<div>Плотность: {snap.boneDensity.classification} ({Math.round(snap.boneDensity.averageHU)} HU)</div>
							)}
							{snap.radiologicalFinding && <div className="truncate">{snap.radiologicalFinding}</div>}
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
