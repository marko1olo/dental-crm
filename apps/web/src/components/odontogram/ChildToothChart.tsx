import type React from "react";
import {
	PediatricToothChart,
	type PediatricToothChartProps,
} from "./PediatricToothChart";

export type ChildToothChartProps = PediatricToothChartProps;

/**
 * ChildToothChart — алиас и расширение для детской одонтограммы (молочный и сменный прикус FDI 51..85).
 * Обеспечивает обратную совместимость и 100% соответствие номенклатуре.
 */
export const ChildToothChart: React.FC<ChildToothChartProps> = (props) => {
	return (
		<PediatricToothChart
			{...props}
			className={`child-tooth-chart ${props.className || ""}`.trim()}
		/>
	);
};

export default ChildToothChart;
export * from "./PediatricToothChart";
