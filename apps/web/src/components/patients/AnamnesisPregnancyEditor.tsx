import { Baby } from "lucide-react";
import React from "react";

export interface AnamnesisPregnancyEditorProps {
	pregnancyStatus: string;
	setPregnancyStatus: (val: string) => void;
}

export const AnamnesisPregnancyEditor: React.FC<AnamnesisPregnancyEditorProps> = ({
	pregnancyStatus,
	setPregnancyStatus,
}) => {
	return (
		<div>
			<label
				style={{
					display: "flex",
					alignItems: "center",
					gap: "6px",
					fontWeight: 600,
					marginBottom: "12px",
				}}
			>
				<Baby size={16} color="var(--fuchsia-500)" /> Статус беременности
			</label>
			<div style={{ display: "flex", gap: "12px" }}>
				{[
					{ val: "none", label: "Нет" },
					{ val: "pregnant", label: "Беременность" },
					{ val: "lactating", label: "Лактация" },
				].map((opt) => (
					<button
						key={opt.val}
						type="button"
						className="text-button"
						onClick={() => setPregnancyStatus(opt.val)}
						style={{
							flex: 1,
							padding: "10px",
							borderRadius: "8px",
							background:
								pregnancyStatus === opt.val
									? "var(--fuchsia-500)"
									: "var(--slate-50)",
							color:
								pregnancyStatus === opt.val ? "white" : "var(--slate-700)",
							border: `1px solid ${pregnancyStatus === opt.val ? "var(--fuchsia-600)" : "var(--slate-200)"}`,
							fontWeight: pregnancyStatus === opt.val ? 600 : 400,
							transition: "all 0.2s",
						}}
					>
						{opt.label}
					</button>
				))}
			</div>
		</div>
	);
};
