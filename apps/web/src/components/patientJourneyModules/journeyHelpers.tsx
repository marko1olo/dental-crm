import {
	AlertTriangle,
	Calendar,
	CircleDot,
	DollarSign,
	Layers,
	Package,
} from "lucide-react";
import type React from "react";
import {
	appointmentStatusLabels,
	insightCategoryLabels,
	insightRiskLabels,
	medicalDictionary,
	paymentMethodLabels,
	paymentStatusLabels,
} from "./journeyLabels";

export {
	appointmentStatusLabels,
	insightCategoryLabels,
	insightRiskLabels,
	medicalDictionary,
	paymentMethodLabels,
	paymentStatusLabels,
};

export function highlightMatch(text: string, query: string): React.ReactNode {
	if (!query.trim() || !text) return text;
	const trimmed = query.trim();
	const regex = new RegExp(
		`(${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
		"gi",
	);
	const parts = text.split(regex);
	return parts.map((part, i) =>
		regex.test(part) ? (
			<mark
				// biome-ignore lint/suspicious/noArrayIndexKey: pure text parts slicing
				key={`match-${i}`}
				className="bg-amber-300 dark:bg-amber-500/40 text-amber-950 dark:text-amber-100 rounded px-1 font-bold"
			>
				{part}
			</mark>
		) : (
			part
		),
	);
}

export function toFriendlyRussianProcedure(text: string): string {
	if (!text) return text;
	let friendly = text;
	for (const [pattern, replacement] of medicalDictionary) {
		friendly = friendly.replace(pattern, replacement);
	}
	return friendly;
}

export const renderEventIcon = (type: string) => {
	switch (type) {
		case "medical_alert":
			return <AlertTriangle size={15} className="text-amber-500" />;
		case "appointment":
			return <Calendar size={15} className="text-blue-500" />;
		case "transaction":
			return <DollarSign size={15} className="text-emerald-500" />;
		case "inventory_depletion":
			return <Package size={15} className="text-purple-500" />;
		case "lab_order":
			return <Layers size={15} className="text-teal-500" />;
		default:
			return <CircleDot size={15} className="text-slate-400" />;
	}
};
