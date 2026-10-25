import React from "react";
import { ClipboardList, FastForward, FileText, HeartPulse } from "lucide-react";
import type { Appointment, Dashboard } from "@dental/shared";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";
import {
	createSmartSequentialAppointment,
	detectRecommendedProtocol,
} from "../smartSequentialVisitsEngine";

interface Props {
	appointment: Appointment;
	pName: string;
	patObj?: any;
	dashboard: Dashboard;
	onCloseMenu: () => void;
}

export const GridAppointmentClinicalActions: React.FC<Props> = ({
	appointment: a,
	pName,
	patObj,
	dashboard,
	onCloseMenu,
}) => {
	const handleOpenView = (view: "visit" | "patients", hash: string, toastMsg: string) => {
		onCloseMenu();
		if (patObj?.id) {
			usePatientStore.getState().setSelectedPatientId(patObj.id);
		}
		useAppStore.getState().setCurrentView(view);
		if (typeof window !== "undefined") {
			window.location.hash = hash;
		}
		showToast(toastMsg, "info");
	};

	const handleNextStage = () => {
		onCloseMenu();
		const recKey = detectRecommendedProtocol({
			diagnosisMkb10: a.diagnosisMkb10 ?? null,
			reason: a.reason ?? null,
			clinicalStage: a.clinicalStage ?? null,
			toothNumber: a.toothNumber ?? null,
		});
		const allAppts = dashboard?.appointments || [];
		createSmartSequentialAppointment({
			parentAppointment: a as any,
			protocolKey: recKey,
			existingAppointments: allAppts,
		});
	};

	return (
		<div className="space-y-0.5 pb-1 border-b border-[var(--line)]" data-testid={`menu-clinical-hud-${a.id}`}>
			<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
				Клинические действия
			</div>
			<button
				type="button"
				onClick={() => handleOpenView("visit", "#visit", `Медицинская карта: ${pName}`)}
				className="w-full text-left min-h-[36px] px-2.5 py-1 rounded-lg flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold transition-colors cursor-pointer"
				title="Открыть медицинскую карту пациента"
				data-testid={`menu-emr-btn-${a.id}`}
			>
				<FileText size={14} className="text-[var(--teal)] shrink-0" />
				<span>Медицинская карта</span>
			</button>
			<button
				type="button"
				onClick={() => handleOpenView("patients", "#health-anamnesis", `Анкета здоровья: ${pName}`)}
				className="w-full text-left min-h-[36px] px-2.5 py-1 rounded-lg flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium transition-colors cursor-pointer"
				title="Заполнить анкету здоровья / соматический анамнез"
				data-testid={`menu-anamnesis-btn-${a.id}`}
			>
				<HeartPulse size={14} className="text-[var(--muted)] shrink-0" />
				<span>Анкета здоровья</span>
			</button>
			<button
				type="button"
				onClick={() => handleOpenView("patients", "#treatment-plans", `Планы лечения: ${pName}`)}
				className="w-full text-left min-h-[36px] px-2.5 py-1 rounded-lg flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium transition-colors cursor-pointer"
				title="Открыть планы лечения"
				data-testid={`menu-plans-btn-${a.id}`}
			>
				<ClipboardList size={14} className="text-[var(--muted)] shrink-0" />
				<span>Планы лечения</span>
			</button>
			<button
				type="button"
				onClick={handleNextStage}
				className="w-full text-left min-h-[36px] px-2.5 py-1 rounded-lg flex items-center justify-between gap-2 hover:bg-[var(--paper-soft)] text-[var(--teal)] font-bold transition-colors cursor-pointer"
				style={{ background: "rgba(13, 148, 136, 0.08)", border: "1px solid rgba(13, 148, 136, 0.28)", borderRadius: "8px", marginTop: "2px" }}
				title="Запланировать следующий этап лечения в 1 клик (с авто-подбором даты и Rollback Toast)"
				data-testid={`menu-next-stage-btn-${a.id}`}
			>
				<div className="flex items-center gap-2">
					<FastForward size={14} className="text-[var(--teal)] shrink-0" />
					<span>+ След. этап лечения</span>
				</div>
				<span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-[var(--teal,#0d9488)] text-white">
					1 клик
				</span>
			</button>
		</div>
	);
};
