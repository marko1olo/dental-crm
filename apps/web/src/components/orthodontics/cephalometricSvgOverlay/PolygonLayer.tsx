import React from "react";
import type { LandmarkMap } from "../cephalometricMath";

interface PolygonLayerProps {
	landmarks: LandmarkMap;
}

export const PolygonLayer: React.FC<PolygonLayerProps> = ({ landmarks }) => {
	const S = landmarks.S;
	const N = landmarks.N;
	const A = landmarks.A;
	const B = landmarks.B;
	const Pog = landmarks.Pog;
	const Go = landmarks.Go;
	const U1t = landmarks.U1t;
	const U1a = landmarks.U1a;
	const L1t = landmarks.L1t;
	const L1a = landmarks.L1a;

	return (
		<g className="polygon-layer">
			{N && A && <line x1={N.x} y1={N.y} x2={A.x} y2={A.y} stroke="#10b981" strokeWidth="2" />}
			{N && B && <line x1={N.x} y1={N.y} x2={B.x} y2={B.y} stroke="#f59e0b" strokeWidth="2" />}
			{N && Pog && <line x1={N.x} y1={N.y} x2={Pog.x} y2={Pog.y} stroke="#e2e8f0" strokeWidth="1.8" strokeDasharray="4 2" />}
			{A && Pog && <line x1={A.x} y1={A.y} x2={Pog.x} y2={Pog.y} stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 3" />}
			{A && B && <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 2" />}
			{S && Go && <line x1={S.x} y1={S.y} x2={Go.x} y2={Go.y} stroke="#06b6d4" strokeWidth="1.8" />}
			{U1a && U1t && (
				<line
					x1={U1a.x - (U1t.x - U1a.x) * 0.4}
					y1={U1a.y - (U1t.y - U1a.y) * 0.4}
					x2={U1t.x + (U1t.x - U1a.x) * 0.4}
					y2={U1t.y + (U1t.y - U1a.y) * 0.4}
					stroke="#ec4899"
					strokeWidth="2.5"
				/>
			)}
			{L1a && L1t && (
				<line
					x1={L1a.x - (L1t.x - L1a.x) * 0.4}
					y1={L1a.y - (L1t.y - L1a.y) * 0.4}
					x2={L1t.x + (L1t.x - L1a.x) * 0.4}
					y2={L1t.y + (L1t.y - L1a.y) * 0.4}
					stroke="#8b5cf6"
					strokeWidth="2.5"
				/>
			)}
		</g>
	);
};
