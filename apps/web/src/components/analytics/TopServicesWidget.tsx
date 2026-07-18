import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function TopServicesWidget({ data }: { data: any[] }) {
	return (
		<div className="analytics-card">
			<h3>Топ услуг (по выручке)</h3>
			<div className="analytics-chart-wrapper">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
						<XAxis type="number" hide />
						<YAxis dataKey="name" type="category" width={150} tick={{ fill: "var(--fg-secondary, #a1a1aa)", fontSize: 12 }} />
						<Tooltip
							formatter={(val: any) => [`${(val || 0).toLocaleString()} ₽`, "Выручка"]}
							contentStyle={{ backgroundColor: "var(--bg-elevated, #18181b)", borderColor: "var(--border, #27272a)", color: "#fff" }}
						/>
						<Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
							{data.map((entry, index) => {
								const color = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"][index % 5];
								return <Cell key={`cell-${index}`} fill={color || "#8b5cf6"} />;
							})}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
