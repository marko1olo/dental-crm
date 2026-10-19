import type React from "react";
import type { CanalCondition } from "./tooth46Types";

export interface Tooth46CanalApexPathologyProps {
	canalId: "MB" | "ML" | "D";
	apex: { x: number; y: number };
	condition: CanalCondition;
}

export const Tooth46CanalApexPathology: React.FC<
	Tooth46CanalApexPathologyProps
> = ({ canalId, apex, condition }) => (
	<>
		{condition === "underfill" ? (
			<circle cx={apex.x} cy={apex.y - 1.5} r="1.6" fill="#1e293b" />
		) : (
			<circle cx={apex.x} cy={apex.y} r="1.1" fill="#be123c" />
		)}
		{condition === "overfill" && (
			<ellipse
				cx={apex.x}
				cy={apex.y + 2.5}
				rx="2.4"
				ry="1.8"
				fill="#be123c"
				opacity="0.95"
			/>
		)}
		{condition === "broken_file" && canalId === "MB" && (
			<path
				d="M 22,112 L 23.5,116 L 22,120 L 23.5,124 L 22,128 L 22.8,131"
				fill="none"
				stroke="#94a3b8"
				strokeWidth="1.2"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
		)}
	</>
);
