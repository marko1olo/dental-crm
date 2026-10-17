import React from "react";
import { type LandmarkMap, type Point2D, projectPointOntoLine } from "../cephalometricMath";

interface PlanesLayerProps {
	landmarks: LandmarkMap;
}

export const PlanesLayer: React.FC<PlanesLayerProps> = ({ landmarks }) => {
	const S = landmarks.S;
	const N = landmarks.N;
	const Or = landmarks.Or;
	const Po = landmarks.Po;
	const A = landmarks.A;
	const B = landmarks.B;
	const Gn = landmarks.Gn ?? landmarks.Me;
	const Me = landmarks.Me ?? landmarks.Gn;
	const Go = landmarks.Go;
	const ANS = landmarks.ANS;
	const PNS = landmarks.PNS;
	const U1t = landmarks.U1t;
	const L1t = landmarks.L1t;

	const opAnt: Point2D | null = U1t && L1t
		? { x: (U1t.x + L1t.x) / 2, y: (U1t.y + L1t.y) / 2 }
		: ANS && Me
			? { x: (ANS.x + Me.x) / 2, y: (ANS.y + Me.y) / 2 }
			: null;

	const opPost: Point2D | null = PNS && Go
		? { x: (PNS.x + Go.x) / 2, y: (PNS.y + Go.y) / 2 }
		: opAnt
			? { x: opAnt.x - 160, y: opAnt.y - 12 }
			: null;

	const projA = A && opPost && opAnt ? projectPointOntoLine(A, opPost, opAnt) : null;
	const projB = B && opPost && opAnt ? projectPointOntoLine(B, opPost, opAnt) : null;

	return (
		<g className="planes-layer opacity-75">
			{S && N && (
				<line x1={S.x} y1={S.y} x2={N.x} y2={N.y} stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="6 3" />
			)}
			{Po && Or && (
				<line x1={Po.x - 30} y1={Po.y} x2={Or.x + 60} y2={Or.y} stroke="#0284c7" strokeWidth="2" strokeDasharray="5 2.5" />
			)}
			{PNS && ANS && (
				<line x1={PNS.x} y1={PNS.y} x2={ANS.x} y2={ANS.y} stroke="#10b981" strokeWidth="2" strokeDasharray="4 2" />
			)}
			{Go && (Me || Gn) && (
				<line x1={Go.x} y1={Go.y} x2={(Me ?? Gn)!.x} y2={(Me ?? Gn)!.y} stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="5 2.5" />
			)}
			{opPost && opAnt && (
				<line x1={opPost.x} y1={opPost.y} x2={opAnt.x + 30} y2={opAnt.y} stroke="#a855f7" strokeWidth="1.8" strokeDasharray="3 3" />
			)}
			{S && (Gn || Me) && (
				<line x1={S.x} y1={S.y} x2={(Gn ?? Me)!.x} y2={(Gn ?? Me)!.y} stroke="#eab308" strokeWidth="1.5" strokeDasharray="4 2" />
			)}
			{projA && A && (
				<line x1={A.x} y1={A.y} x2={projA.x} y2={projA.y} stroke="#ec4899" strokeWidth="1.5" strokeDasharray="2 2" />
			)}
			{projB && B && (
				<line x1={B.x} y1={B.y} x2={projB.x} y2={projB.y} stroke="#ec4899" strokeWidth="1.5" strokeDasharray="2 2" />
			)}
		</g>
	);
};
