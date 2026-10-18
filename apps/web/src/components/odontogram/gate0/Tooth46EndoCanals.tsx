import type React from "react";
import { TOOTH46_PULP_GEOMETRY } from "./Tooth46PulpGeometry";

export interface Tooth46EndoCanalsProps {
	showPulp?: boolean;
	showCanals?: boolean;
	showGuttaPercha?: boolean;
	isDark?: boolean;
	className?: string;
}

export const Tooth46EndoCanals: React.FC<Tooth46EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = true,
	className,
}) => {
	const p = TOOTH46_PULP_GEOMETRY;

	return (
		<g id="tooth46-endodontics" className={className}>
			{showPulp && (
				<g id="tooth46-pulp-chamber" opacity="0.48">
					<path
						d={p.coronalPulpChamber}
						fill="url(#dente-pulp-vital)"
						stroke="rgba(159, 18, 57, 0.50)"
						strokeWidth="0.7"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					{p.neuroPlexus.map((strand) => (
						<path
							key={`plexus-${strand.id}`}
							d={strand.d}
							fill="none"
							stroke="rgba(254, 205, 211, 0.70)"
							strokeWidth="0.5"
							strokeLinecap="round"
							vectorEffect="non-scaling-stroke"
						/>
					))}
				</g>
			)}

			{showCanals && (
				<g id="tooth46-canals-tract">
					{p.canals.map((canal) => (
						<g key={canal.id} id={`canal-${canal.id}`}>
							{showGuttaPercha ? (
								<>
									<path
										d={canal.taperedLumen}
										fill="url(#dente-guttapercha-cone)"
										stroke="url(#dente-guttapercha-sheath)"
										strokeWidth="0.8"
										strokeLinejoin="round"
										vectorEffect="non-scaling-stroke"
									/>
									<path
										d={canal.centerLine}
										fill="none"
										stroke="#ffffff"
										strokeWidth="0.7"
										strokeOpacity="0.9"
										strokeLinecap="round"
										vectorEffect="non-scaling-stroke"
									/>
									<circle
										cx={canal.apex.x}
										cy={canal.apex.y}
										r="1.1"
										fill="#be123c"
									/>
								</>
							) : (
								<>
									<path
										d={canal.taperedLumen}
										fill="url(#dente-pulp-vital)"
										stroke="rgba(153, 27, 27, 0.6)"
										strokeWidth="0.6"
										strokeLinejoin="round"
										vectorEffect="non-scaling-stroke"
									/>
									<path
										d={canal.centerLine}
										fill="none"
										stroke="rgba(254, 202, 202, 0.7)"
										strokeWidth="0.4"
										strokeLinecap="round"
										vectorEffect="non-scaling-stroke"
									/>
								</>
							)}
						</g>
					))}
				</g>
			)}
		</g>
	);
};
