import type React from "react";
import { Activity, Droplet, PackagePlus, ShieldAlert, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { DentalCrown } from "../../icons/DentalIcons.js";
import type { ClinicalBundleId } from "../treatmentPlanBundlesEngine.js";

export function getBundleIcon(id: ClinicalBundleId): React.ReactNode {
	switch (id) {
		case "caries_turnkey":
			return <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
		case "endo_1canal_turnkey":
			return <Activity size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />;
		case "endo_3canal_turnkey":
			return <Zap size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />;
		case "hygiene_turnkey":
			return <Droplet size={16} className="text-cyan-600 dark:text-cyan-400 shrink-0" />;
		case "extraction_turnkey":
			return <ShieldAlert size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />;
		case "implant_turnkey":
			return <ShieldCheck size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />;
		case "crown_metalloceramic_turnkey":
			return <DentalCrown size={16} className="text-[var(--teal,#0d9488)] shrink-0" />;
		case "crown_zirconia_turnkey":
			return <DentalCrown size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />;
		default:
			return <PackagePlus size={16} className="text-[var(--teal,#0d9488)] shrink-0" />;
	}
}

export function getStageBadge(stageNumber: number) {
	switch (stageNumber) {
		case 1:
			return { text: "Этап I: Терапия & Гигиена", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" };
		case 2:
			return { text: "Этап II: Хирургия & Имплантация", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" };
		case 3:
			return { text: "Этап III: Ортопедия", cls: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30" };
		default:
			return { text: "Клинический этап", cls: "bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] border-[var(--line,#cbd5e1)]" };
	}
}
