import React from "react";

export interface ImagingMprPlaneGridProps {
	cbctWorkbenchPlanes?: any[] | undefined;
	cbctWorkbenchProjections?: string[] | undefined;
	mprControlsReady: boolean;
	mprSeriesRequiredProjectionLabel?: string | undefined;
	mprUnavailableProjectionLabel?: string | undefined;
	mprProjection?: string | undefined;
	setMprProjection: (proj: string) => void;
}

export function ImagingMprPlaneGrid({
	cbctWorkbenchPlanes,
	cbctWorkbenchProjections,
	mprControlsReady,
	mprSeriesRequiredProjectionLabel,
	mprUnavailableProjectionLabel,
	mprProjection,
	setMprProjection,
}: ImagingMprPlaneGridProps) {
	return (
		<div className="mpr-plane-grid">
			{(cbctWorkbenchPlanes ?? []).map((plane: any) => {
				const planeSupported = (cbctWorkbenchProjections ?? []).includes(plane.key);
				const planeAvailable = mprControlsReady && planeSupported;
				const planeUnavailableReason = !mprControlsReady
					? mprSeriesRequiredProjectionLabel
					: planeSupported
						? ""
						: mprUnavailableProjectionLabel;
				return (
					<button
						className={`mpr-plane ${mprProjection === plane.key ? "active" : ""}`}
						key={plane.key}
						type="button"
						onClick={() => setMprProjection(plane.key)}
						disabled={!planeAvailable}
						aria-pressed={mprProjection === plane.key}
						aria-label={`${plane.title}: ${plane.detail}${planeUnavailableReason ? `; ${planeUnavailableReason}` : ""}`}
					>
						<strong>{plane.title}</strong>
						<span>{plane.detail}</span>
						{planeUnavailableReason ? (
							<small className="mpr-plane-unavailable">{planeUnavailableReason}</small>
						) : null}
					</button>
				);
			})}
		</div>
	);
}
