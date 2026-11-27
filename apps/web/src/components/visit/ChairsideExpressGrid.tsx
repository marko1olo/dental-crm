import React from "react";
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
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import {
	CHAIRSIDE_EXPRESS_SERVICES,
	resolveExpressServicesAgainstCatalog,
	type ChairsideExpressService,
} from "./completedServicesPlan";

export function getExpressIcon(id: string) {
	switch (id) {
		case "intraoral_xray":
			return <Camera className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />;
		case "local_anesthesia_articaine":
		case "conduction_anesthesia":
			return <Syringe className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />;
		case "consultation_inspection":
			return <Stethoscope className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />;
		case "cofferdam_isolation":
			return <Shield className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />;
		case "suture_removal":
			return <Scissors className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />;
		case "temp_filling":
			return <Clock className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />;
		case "dental_deposits_removal_1_tooth":
			return <Sparkles className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />;
		case "optg_panoramic":
			return <Camera className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />;
		default:
			return <Zap className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />;
	}
}

export interface ChairsideExpressGridProps {
	selectedTooth: string | null;
	onAddExpressService: (service: ChairsideExpressService) => void;
	catalog?: readonly unknown[] | undefined;
}

export const ChairsideExpressGrid: React.FC<ChairsideExpressGridProps> = ({
	selectedTooth,
	onAddExpressService,
	catalog,
}) => {
	const appLogic = useOptionalAppLogicContext();
	const effectiveCatalog =
		Array.isArray(catalog) && catalog.length > 0
			? catalog
			: Array.isArray(appLogic?.dashboard?.serviceCatalog)
				? appLogic.dashboard.serviceCatalog
				: [];
	const expressServices = React.useMemo(
		() =>
			effectiveCatalog.length > 0
				? resolveExpressServicesAgainstCatalog(effectiveCatalog)
				: CHAIRSIDE_EXPRESS_SERVICES,
		[effectiveCatalog],
	);

	return (
		<div className="mb-3 p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
			<div className="flex items-center justify-between gap-2 mb-2">
				<span className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
					<Zap className="w-3.5 h-3.5 text-[var(--primary)]" />
					Экспресс-услуги у кресла:
				</span>
				<span className="text-[11px] text-[var(--ink-muted)]">
					{selectedTooth
						? `привязка к зубу ${selectedTooth}`
						: "без привязки к зубу"}
				</span>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
				{expressServices.map((s) => (
					<button
						key={s.id}
						type="button"
						onClick={() => onAddExpressService(s)}
						className="flex flex-col justify-between p-2 rounded-md bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--primary)] hover:bg-[var(--paper-soft)] transition-all text-left group min-h-[48px]"
						title={`${s.title} (${money(s.priceRub)})${selectedTooth ? ` (зуб ${selectedTooth})` : ""}`}
					>
						<div className="w-full flex items-start justify-between gap-1.5">
							<div className="flex items-center gap-1.5 flex-1 min-w-0">
								{getExpressIcon(s.id)}
								<div className="flex flex-col min-w-0">
									<span className="text-xs font-medium text-[var(--ink)] group-hover:text-[var(--primary)] truncate">
										{s.title}
									</span>
									{s.code804n ? (
										<span className="text-[10px] text-[var(--ink-muted)] font-mono">
											{s.code804n}
										</span>
									) : null}
								</div>
							</div>
							<span className="text-xs font-bold text-[var(--ink)] font-mono shrink-0">
								{money(s.priceRub)}
							</span>
						</div>
						{selectedTooth ? (
							<div className="w-full flex items-center justify-end mt-1 text-[10px] text-[var(--ink-muted)]">
								<span className="text-[var(--primary)] font-medium">
									+ зуб {selectedTooth}
								</span>
							</div>
						) : null}
					</button>
				))}
			</div>
		</div>
	);
};
