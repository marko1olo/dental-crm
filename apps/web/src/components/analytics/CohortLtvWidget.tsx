import { TrendingUp } from "lucide-react";
import React from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip as RechartsTooltip,
	XAxis,
	YAxis,
} from "recharts";

interface CohortLtvWidgetProps {
	data: Array<{ cohort: string; "Month 1": number; "Month 12": number }>;
}

export function CohortLtvWidget({ data }: CohortLtvWidgetProps) {
	return (
		<article className="glass-widget">
			<h3>
				<TrendingUp className="w-5 h-5 text-dente-teal" /> Выручка по когортам
				(LTV)
			</h3>
			<div className="widget-chart-container">
				{data && data.length > 0 ? (
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart
							data={data}
							margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
						>
							<defs>
								<linearGradient id="colorMonth1" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8} />
									<stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
								</linearGradient>
								<linearGradient id="colorMonth12" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
									<stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
							<XAxis
								dataKey="cohort"
								stroke="#a1a1aa"
								fontSize={12}
								tickLine={false}
								axisLine={false}
							/>
							<YAxis
								stroke="#a1a1aa"
								fontSize={12}
								tickLine={false}
								axisLine={false}
								tickFormatter={(val) => `${Math.round(val / 1000)}k`}
							/>
							<RechartsTooltip
								contentStyle={{
									backgroundColor: "#18181b",
									borderColor: "#27272a",
									borderRadius: "8px",
									color: "#e4e4e7",
								}}
								itemStyle={{ color: "#e4e4e7" }}
								formatter={(val: any) => val.toLocaleString("ru-RU") + " ₽"}
							/>
							<Legend />
							<Area
								type="monotone"
								name="1-й месяц"
								dataKey="Month 1"
								stroke="#14b8a6"
								fillOpacity={1}
								fill="url(#colorMonth1)"
							/>
							<Area
								type="monotone"
								name="За год"
								dataKey="Month 12"
								stroke="#8b5cf6"
								fillOpacity={1}
								fill="url(#colorMonth12)"
							/>
						</AreaChart>
					</ResponsiveContainer>
				) : (
					<div className="analytics-empty-state">
						Недостаточно данных по когортам
					</div>
				)}
			</div>
		</article>
	);
}
