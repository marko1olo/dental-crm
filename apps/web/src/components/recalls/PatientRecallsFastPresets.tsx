import type React from "react";
import { Clock, ShieldCheck, Sparkles, Users } from "lucide-react";
import type { RecallCycleType } from "./patientRecallEngine";

export interface PatientRecallsFastPresetsProps {
	readonly selectedCycle: RecallCycleType | "all";
	readonly onSelectedCycleChange: (cycle: RecallCycleType | "all") => void;
}

export const PatientRecallsFastPresets: React.FC<PatientRecallsFastPresetsProps> = ({
	selectedCycle,
	onSelectedCycleChange,
}) => {
	const btnCls = (cycle: RecallCycleType) =>
		`recall-preset-btn border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors ${
			selectedCycle === cycle ? "active border-[var(--teal)] bg-[var(--teal-surface,var(--paper-soft))]" : ""
		}`;

	const toggle = (cycle: RecallCycleType) => {
		onSelectedCycleChange(selectedCycle === cycle ? "all" : cycle);
	};

	return (
		<div className="recall-solo-presets" role="group" aria-label="1-Click пресеты для врача" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
			<button
				type="button"
				data-testid="preset-hygiene-6m"
				className={btnCls("standard_prophylaxis")}
				onClick={() => toggle("standard_prophylaxis")}
				title="1-Click: Пациенты на плановую профгигиену 6 мес."
			>
				<ShieldCheck size={14} />
				<span>1-Click: Профгигиена (6 мес.)</span>
			</button>
			<button
				type="button"
				data-testid="preset-implants-1y"
				className={btnCls("implant_monitoring")}
				onClick={() => toggle("implant_monitoring")}
				title="1-Click: Пациенты с имплантами на годовой рентген-контроль"
			>
				<Sparkles size={14} />
				<span>1-Click: Импланты (1 год)</span>
			</button>
			<button
				type="button"
				data-testid="preset-ortho-1m"
				className={btnCls("orthodontic_braces")}
				onClick={() => toggle("orthodontic_braces")}
				title="1-Click: Пациенты на плановую активацию брекетов (1 мес. / 4 нед.)"
			>
				<Clock size={14} />
				<span>1-Click: Орто-активация (1 мес.)</span>
			</button>
			<button
				type="button"
				data-testid="preset-pediatric-3m"
				className={btnCls("pediatric_fluoridation")}
				onClick={() => toggle("pediatric_fluoridation")}
				title="1-Click: Детский профилактический осмотр (3-4 мес.)"
			>
				<Users size={14} />
				<span>1-Click: Детский осмотр (3-4 мес.)</span>
			</button>
			<button
				type="button"
				data-testid="preset-endo-1m"
				className={btnCls("endodontic_check")}
				onClick={() => toggle("endodontic_check")}
				title="1-Click: Пациенты на контрольный рентген после эндодонтии (1 мес.)"
			>
				<Sparkles size={14} />
				<span>1-Click: Эндодонтия (1 мес.)</span>
			</button>
			<button
				type="button"
				data-testid="preset-perio-3m"
				className={btnCls("periodontal_maintenance")}
				onClick={() => toggle("periodontal_maintenance")}
				title="1-Click: Пациенты на поддерживающую пародонтологию (3 мес.)"
			>
				<ShieldCheck size={14} />
				<span>1-Click: Пародонтология (3 мес.)</span>
			</button>
		</div>
	);
};
