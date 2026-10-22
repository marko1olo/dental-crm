import React from "react";
import type { EndoCanalData } from "@dental/shared";
import { REFERENCE_POINT_OPTIONS } from "../endoCanalConstants";

interface DesktopReferenceCellProps {
	readonly canal: EndoCanalData;
	readonly onChange: (id: string, field: keyof EndoCanalData, value: any) => void;
}

export const DesktopReferenceCell: React.FC<DesktopReferenceCellProps> = ({
	canal,
	onChange,
}) => (
	<td className="py-1.5 px-3">
		<select
			aria-label={`Реперный ориентир канала ${canal.canalName}`}
			value={canal.referencePoint}
			onChange={(e) => onChange(canal.id, "referencePoint", e.target.value)}
			className="w-full h-8 sm:h-8.5 px-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none truncate min-w-0"
		>
			{REFERENCE_POINT_OPTIONS.map((opt) => (
				<option key={opt} value={opt}>
					{opt}
				</option>
			))}
		</select>
	</td>
);
