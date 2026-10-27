import { ChevronDown, ChevronUp } from "lucide-react";
import type React from "react";

interface ScheduleClipboardHeadingProps {
	isCollapsed: boolean;
	onToggleCollapse: () => void;
	itemCount: number;
}

export const ScheduleClipboardHeading: React.FC<ScheduleClipboardHeadingProps> = ({
	isCollapsed,
	onToggleCollapse,
	itemCount,
}) => {
	return (
		<button
			type="button"
			className="panel-heading"
			style={{
				cursor: "pointer",
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				width: "100%",
				background: "transparent",
				border: "none",
				padding: 0,
				textAlign: "inherit",
				font: "inherit",
			}}
			onClick={onToggleCollapse}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onToggleCollapse();
				}
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
				<h2 style={{ margin: 0 }}>Буфер расписания</h2>
				{itemCount > 0 ? (
					<span className="status-pill status-arrived">{itemCount}</span>
				) : null}
			</div>
			{isCollapsed ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
		</button>
	);
};
