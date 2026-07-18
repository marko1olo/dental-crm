import { BarChart3 } from "lucide-react";
import React from "react";
import {
	Bar,
	CartesianGrid,
	ComposedChart,
	ResponsiveContainer,
	Tooltip as RechartsTooltip,
	XAxis,
	YAxis,
} from "recharts";

interface PlanFunnelWidgetProps {
	data: Array<{ name: string; value: number; fill: string }>;
}

export function PlanFunnelWidget({ data }: PlanFunnelWidgetProps) {
	const hasData = data && data.filter((x) => x.value > 0).length > 0;

	return (
		<article className="glass-widget">
			<h3>
				<BarChart3 className="w-5 h-5 text-sky-500" /> Воронка планов лечения
			</h3>
			<div className="widget-chart-container">
				{hasData ? (
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart
							data={data}
							layout="vertical"
							margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
						>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="#27272a"
								horizontal={false}
							/>
							<XAxis
								type="number"
								stroke="#a1a1aa"
								fontSize={12}
								tickLine={false}
								axisLine={false}
							/>
							<YAxis
								dataKey="name"
								type="category"
								stroke="#a1a1aa"
								fontSize={12}
								tickLine={false}
								axisLine={false}
								width={90}
							/>
							<RechartsTooltip
								contentStyle={{
									backgroundColor: "#18181b",
									borderColor: "#27272a",
									borderRadius: "8px",
								}}
								itemStyle={{ color: "#e4e4e7" }}
								formatter={(val: any) => `${val} планов`}
							/>
							<Bar
								dataKey="value"
								name="Количество"
								barSize={32}
								radius={[0, 4, 4, 0]}
							/>
						</ComposedChart>
					</ResponsiveContainer>
				) : (
					<div className="analytics-empty-state">Нет данных по планам</div>
				)}
			</div>
		</article>
	);
}
