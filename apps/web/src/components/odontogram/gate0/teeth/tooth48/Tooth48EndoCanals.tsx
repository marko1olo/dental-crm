import type React from "react";
import { Tooth46SingleCanal } from "../../Tooth46SingleCanal";
import type { CanalCondition } from "../../tooth46Types";
import { Tooth48PulpChamber } from "./Tooth48PulpChamber";
import { TOOTH48_PULP_GEOMETRY } from "./tooth48PulpGeometry";

export interface Tooth48EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth48EndoCanals: React.FC<Tooth48EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = true,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH48_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isUnderfill = canalCondition === "underfill";
	const isOverfill = canalCondition === "overfill";
	const isBrokenFile = canalCondition === "broken_file";

	return (
		<g id="tooth48-endodontics" className={className}>
			{/* Coronal Pulp Chamber with 4 rounded horns */}
			{showPulp && (
				<Tooth48PulpChamber condition={canalCondition} isDark={isDark} />
			)}

			{/* C-shaped Converging Canals into Distal Curved Apex */}
			{showCanals && (
				<g id="tooth48-canals-tract">
					{/* C-shaped connecting isthmus in middle third */}
					<path
						d={p.cShapedIsthmus}
						fill={
							showGuttaPercha
								? "url(#dente-guttapercha-cone)"
								: isNecrotic
									? "url(#dente-pulp-necrotic)"
									: "url(#dente-pulp-vital)"
						}
						opacity="0.85"
					/>

					{p.canals.map((canal) => (
						<Tooth46SingleCanal
							key={canal.id}
							canal={canal as any}
							showGuttaPercha={showGuttaPercha}
							isNecrotic={isNecrotic}
							isUnderfill={isUnderfill}
						/>
					))}

					{/* Overfilled Apical Sealer Puff at Distally-Curved Apex */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth48-overfill-puffs">
							<path
								d="M 32.0,145.5 C 30.5,147.0 31.5,149.5 34.5,149.0 C 37.0,148.5 36.5,146.0 34.5,145.5 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
						</g>
					)}

					{/* Broken Instrument in Distal Curvature of Apical Third */}
					{isBrokenFile && (
						<g id="tooth48-broken-file">
							<path
								d="M 42.0,132.0 C 39.0,138.0 36.5,142.0 35.5,145.5"
								fill="none"
								stroke="#e2e8f0"
								strokeWidth="1.2"
								strokeLinecap="round"
							/>
							<path
								d="M 40.0,134.0 L 42.0,136.0 M 37.5,138.5 L 39.5,140.5"
								stroke="#0284c7"
								strokeWidth="0.8"
							/>
						</g>
					)}
				</g>
			)}
		</g>
	);
};
