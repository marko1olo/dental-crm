import { Activity } from "lucide-react";
import React from "react";
import {
	Legend,
	RadialBar,
	RadialBarChart,
	ResponsiveContainer,
	Tooltip as RechartsTooltip,
} from "recharts";

interface ChairUtilizationWidgetProps {
	data: Array<{ name: string; value: number; fill: string }>;
}

export function ChairUtilizationWidget({ data }: ChairUtilizationWidgetProps) {
	const hasData = data && data.filter((x) => x.value > 0).length > 0;

	return (
		<article className="glass-widget">
			<h3>
				<Activity className="w-5 h-5 text-emerald-500" /> Загруженность кресел
			</h3>
			<div className="widget-chart-container">
				{hasData ? (
					<ResponsiveContainer width="100%" height="100%">
						<RadialBarChart
							cx="50%"
							cy="50%"
							innerRadius="20%"
							outerRadius="100%"
							barSize={16}
							data={data}
						>
							<RadialBar
								label={{
									position: "insideStart",
									fill: "#fff",
									fontSize: 11,
								}}
								background={{ fill: "#27272a" }}
								dataKey="value"
								cornerRadius={8}
							/>
							<Legend
								iconSize={10}
								layout="vertical"
								verticalAlign="middle"
								wrapperStyle={{ right: 0, color: "#a1a1aa" }}
							/>
							<RechartsTooltip
								contentStyle={{
									backgroundColor: "#18181b",
									borderColor: "#27272a",
									borderRadius: "8px",
								}}
								itemStyle={{ color: "#e4e4e7" }}
								formatter={(val: any) => `${val} приёмов`}
							/>
						</RadialBarChart>
					</ResponsiveContainer>
				) : (
					<div className="analytics-empty-state">
						Нет данных по загруженности
					</div>
				)}
			</div>
		</article>
	);
}
