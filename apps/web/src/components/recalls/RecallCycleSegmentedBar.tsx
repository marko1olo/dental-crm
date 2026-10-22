import type React from "react";
import { Clock, ShieldCheck, Sparkles, Users } from "lucide-react";
import type { RecallCycleType } from "./patientRecallEngine";

export interface RecallCycleSegmentedBarProps {
	readonly selectedCycle: RecallCycleType | "all";
	readonly onSelectedCycleChange: (cycle: RecallCycleType | "all") => void;
	readonly countsByCycle?: Partial<Record<RecallCycleType | "all", number>> | undefined;
}

export const RecallCycleSegmentedBar: React.FC<RecallCycleSegmentedBarProps> = ({
	selectedCycle,
	onSelectedCycleChange,
	countsByCycle,
}) => {
	const allCount = countsByCycle?.all;
	const hygieneCount = countsByCycle?.standard_prophylaxis;
	const implantCount = countsByCycle?.implant_monitoring;
	const orthoCount = countsByCycle?.orthodontic_braces;
	const pediatricCount = countsByCycle?.pediatric_fluoridation;

	return (
		<div
			className="recall-solo-presets"
			role="group"
			aria-label="Быстрый фильтр циклов возврата"
		>
			<button
				type="button"
				className={`recall-preset-btn ${selectedCycle === "all" ? "active" : ""}`}
				onClick={() => onSelectedCycleChange("all")}
				data-testid="preset-all-urgent"
				title="Все пациенты, подошедшие к сроку"
				style={{ minHeight: "44px" }}
			>
				<span>Все (срочные)</span>
				{typeof allCount === "number" && <span className="recall-chip-badge">{allCount}</span>}
			</button>

			<button
				type="button"
				data-testid="preset-hygiene-6m"
				className={`recall-preset-btn ${selectedCycle === "standard_prophylaxis" ? "active" : ""}`}
				onClick={() =>
					onSelectedCycleChange(
						selectedCycle === "standard_prophylaxis" ? "all" : "standard_prophylaxis",
					)
				}
				title="1-Click: Пациенты на плановую профгигиену 6 мес."
				style={{ minHeight: "44px" }}
			>
				<ShieldCheck size={16} />
				<span className="recall-preset-label-full">1-Click: Профгигиена (6 мес.)</span>
				<span className="recall-preset-label-short">Профгигиена (6м)</span>
				{typeof hygieneCount === "number" && (
					<span className="recall-chip-badge">{hygieneCount}</span>
				)}
			</button>

			<button
				type="button"
				data-testid="preset-implants-1y"
				className={`recall-preset-btn ${selectedCycle === "implant_monitoring" ? "active" : ""}`}
				onClick={() =>
					onSelectedCycleChange(
						selectedCycle === "implant_monitoring" ? "all" : "implant_monitoring",
					)
				}
				title="1-Click: Пациенты с имплантами на годовой рентген-контроль"
				style={{ minHeight: "44px" }}
			>
				<Sparkles size={16} />
				<span className="recall-preset-label-full">1-Click: Импланты (1 год)</span>
				<span className="recall-preset-label-short">Импланты (1г)</span>
				{typeof implantCount === "number" && (
					<span className="recall-chip-badge">{implantCount}</span>
				)}
			</button>

			<button
				type="button"
				data-testid="preset-ortho-1m"
				className={`recall-preset-btn ${selectedCycle === "orthodontic_braces" ? "active" : ""}`}
				onClick={() =>
					onSelectedCycleChange(
						selectedCycle === "orthodontic_braces" ? "all" : "orthodontic_braces",
					)
				}
				title="1-Click: Пациенты на плановую активацию брекетов (1 мес.)"
				style={{ minHeight: "44px" }}
			>
				<Clock size={16} />
				<span className="recall-preset-label-full">1-Click: Орто-активация (1 мес.)</span>
				<span className="recall-preset-label-short">Орто-активация (1м)</span>
				{typeof orthoCount === "number" && (
					<span className="recall-chip-badge">{orthoCount}</span>
				)}
			</button>

			<button
				type="button"
				data-testid="preset-pediatric-3m"
				className={`recall-preset-btn ${selectedCycle === "pediatric_fluoridation" ? "active" : ""}`}
				onClick={() =>
					onSelectedCycleChange(
						selectedCycle === "pediatric_fluoridation" ? "all" : "pediatric_fluoridation",
					)
				}
				title="1-Click: Детский профилактический осмотр (3-4 мес.)"
				style={{ minHeight: "44px" }}
			>
				<Users size={16} />
				<span className="recall-preset-label-full">1-Click: Детский осмотр (3-4 мес.)</span>
				<span className="recall-preset-label-short">Детский осмотр (3м)</span>
				{typeof pediatricCount === "number" && (
					<span className="recall-chip-badge">{pediatricCount}</span>
				)}
			</button>
		</div>
	);
};
