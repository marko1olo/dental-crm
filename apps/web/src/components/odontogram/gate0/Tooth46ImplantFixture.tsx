import React from "react";
import { TOOTH46_PATHOLOGY_GEOMETRY } from "./Tooth46PathologyGeometry";

export interface Tooth46ImplantFixtureProps {
	className?: string | undefined;
}

/**
 * DENTE Dental CRM — Inside-Bone Grade-5 Titanium Conical Fixture for Tooth 46
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth46ImplantFixture: React.FC<Tooth46ImplantFixtureProps> = ({
	className,
}) => {
	const imp = TOOTH46_PATHOLOGY_GEOMETRY.implant;

	return (
		<g id="tooth46-implant-fixture-group" className={className}>
			<path
				d={imp.fixtureBody}
				fill="url(#dente-titanium-body)"
				stroke="#334155"
				strokeWidth="0.8"
				strokeLinejoin="round"
			/>
			{imp.threads.map((t) => (
				<path
					key={`m-${t.slice(0, 10)}`}
					d={t}
					data-component="implant-macro-thread"
					fill="url(#dente-titanium-body)"
					stroke="#1e293b"
					strokeWidth="0.75"
				/>
			))}
			{imp.microThreads.map((m) => (
				<path
					key={`u-${m.slice(0, 10)}`}
					d={m}
					data-component="implant-micro-thread"
					fill="none"
					stroke="#475569"
					strokeWidth="0.6"
				/>
			))}
			<path d={imp.fluteLeft} fill="#0f172a" opacity="0.45" />
			<path d={imp.fluteRight} fill="#0f172a" opacity="0.45" />
			<path
				d={imp.collar}
				fill="url(#dente-titanium-collar)"
				stroke="#475569"
				strokeWidth="0.7"
			/>
		</g>
	);
};
