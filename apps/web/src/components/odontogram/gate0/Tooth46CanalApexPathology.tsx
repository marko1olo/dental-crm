import type React from "react";
import type { CanalCondition } from "./tooth46Types";

export interface Tooth46CanalApexPathologyProps {
	canalId: "MB" | "ML" | "D";
	apex: { x: number; y: number };
	condition: CanalCondition;
}

export const Tooth46CanalApexPathology: React.FC<
	Tooth46CanalApexPathologyProps
> = ({ canalId, apex, condition }) => {
	const underfillPath = `M ${apex.x - 0.7},${apex.y - 2.8} L ${apex.x - 0.5},${apex.y} L ${apex.x + 0.5},${apex.y} L ${apex.x + 0.7},${apex.y - 2.8} Z`;
	const normalSealerPath = `M ${apex.x - 0.8},${apex.y - 0.8} C ${apex.x - 0.8},${apex.y + 0.4} ${apex.x + 0.8},${apex.y + 0.4} ${apex.x + 0.8},${apex.y - 0.8} Z`;
	const overfillPuffPath = `M ${apex.x - 0.6},${apex.y} C ${apex.x - 1.4},${apex.y + 0.9} ${apex.x - 2.2},${apex.y + 2.4} ${apex.x - 1.0},${apex.y + 3.4} C ${apex.x - 0.3},${apex.y + 3.8} ${apex.x + 0.3},${apex.y + 3.8} ${apex.x + 1.0},${apex.y + 3.4} C ${apex.x + 2.2},${apex.y + 2.4} ${apex.x + 1.4},${apex.y + 0.9} ${apex.x + 0.6},${apex.y} Z`;

	return (
		<>
			{condition === "underfill" ? (
				<path
					d={underfillPath}
					fill="#1c1917"
					stroke="#0c0a09"
					strokeWidth="0.4"
				/>
			) : (
				<path d={normalSealerPath} fill="#be123c" />
			)}
			{condition === "overfill" && (
				<path
					d={overfillPuffPath}
					fill="#be123c"
					stroke="#881337"
					strokeWidth="0.3"
					opacity="0.95"
				/>
			)}
			{condition === "broken_file" && canalId === "MB" && (
				<path
					d="M 22.0,126.0 L 23.2,129.0 L 21.8,133.0 L 23.3,137.0 L 22.0,141.0 L 22.8,144.5"
					fill="none"
					stroke="url(#dente-niti-metal)"
					strokeWidth="1.2"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
		</>
	);
};
