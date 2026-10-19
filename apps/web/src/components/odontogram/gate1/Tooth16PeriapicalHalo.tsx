import type React from "react";
import { TOOTH16_GEOMETRY } from "./tooth16GeometryConstants";

/**
 * DENTE Dental CRM — Periapical Pathology Halos for Tooth 16 / 26
 * 3 root apices periapical destruction halos.
 * Mandate 8b <= 120 lines.
 */
export const Tooth16PeriapicalHalo: React.FC = () => (
	<g id="tooth16-periapical-halo-group">
		{TOOTH16_GEOMETRY.periapicalAnchors.map((p) => (
			<circle
				key={p.id}
				cx={p.x}
				cy={p.y}
				r={p.r}
				fill="url(#dente16-periapical-halo)"
			/>
		))}
	</g>
);
