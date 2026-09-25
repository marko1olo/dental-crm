import type React from "react";
import {
	Camera,
	Clock,
	Scissors,
	Shield,
	Sparkles,
	Stethoscope,
	Syringe,
	Zap,
} from "lucide-react";
import { money } from "../../AppHelpers";
import {
	CHAIRSIDE_EXPRESS_SERVICES,
	type ChairsideExpressService,
} from "./completedServicesPlan";

export function getExpressIcon(id: string) {
	switch (id) {
		case "intraoral_xray":
			return <Camera className="w-4 h-4 text-sky-500 shrink-0" />;
		case "local_anesthesia_articaine":
		case "conduction_anesthesia":
			return <Syringe className="w-4 h-4 text-teal-500 shrink-0" />;
		case "consultation_inspection":
			return <Stethoscope className="w-4 h-4 text-indigo-500 shrink-0" />;
		case "cofferdam_isolation":
			return <Shield className="w-4 h-4 text-blue-500 shrink-0" />;
		case "suture_removal":
			return <Scissors className="w-4 h-4 text-amber-500 shrink-0" />;
		case "temp_filling":
			return <Clock className="w-4 h-4 text-orange-500 shrink-0" />;
		case "dental_deposits_removal_1_tooth":
			return <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />;
		case "optg_panoramic":
			return <Camera className="w-4 h-4 text-purple-500 shrink-0" />;
		default:
			return <Zap className="w-4 h-4 text-amber-500 shrink-0" />;
	}
}

export interface ChairsideExpressGridProps {
	selectedTooth: string | null;
	onAddExpressService: (service: ChairsideExpressService) => void;
}

export const ChairsideExpressGrid: React.FC<ChairsideExpressGridProps> = ({
	selectedTooth,
	onAddExpressService,
}) => {
	return (
		<div className="mb-3 p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/50">
			<div className="flex items-center justify-between gap-2 mb-2">
				<span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
					<Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
					Экспресс-услуги у кресла (1 клик, 804н):
				</span>
				<span className="text-[11px] text-slate-500 dark:text-slate-400">
					{selectedTooth
						? `привязка к зубу ${selectedTooth}`
						: "без привязки к зубу"}
				</span>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
				{CHAIRSIDE_EXPRESS_SERVICES.map((s) => (
					<button
						key={s.id}
						type="button"
						onClick={() => onAddExpressService(s)}
						className="flex flex-col justify-between p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/30 transition-all text-left group min-h-[48px]"
						title={`[${s.code804n}] ${s.title} (${money(s.priceRub)})${selectedTooth ? ` (зуб ${selectedTooth})` : ""}`}
					>
						<div className="w-full flex items-start justify-between gap-1.5">
							<div className="flex items-center gap-1.5 flex-1 min-w-0">
								{getExpressIcon(s.id)}
								<span className="text-xs font-medium text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 truncate">
									{s.title}
								</span>
							</div>
							<span className="text-xs font-bold text-slate-900 dark:text-slate-200 font-mono shrink-0">
								{money(s.priceRub)}
							</span>
						</div>
						<div className="w-full flex items-center justify-between mt-1 text-[10px] text-slate-500 dark:text-slate-400">
							<span className="font-mono">{s.code804n}</span>
							{selectedTooth && (
								<span className="text-indigo-600 dark:text-indigo-400 font-medium">
									+ зуб {selectedTooth}
								</span>
							)}
						</div>
					</button>
				))}
			</div>
		</div>
	);
};
