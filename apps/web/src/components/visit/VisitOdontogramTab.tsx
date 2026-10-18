import React from "react";
import { Sparkles } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { EgiszMonitor } from "../EgiszMonitor";
import { OdontogramModule } from "../odontogram/OdontogramModule";
import { VisitDiarySection } from "./VisitDiarySection";
import type { VisitOdontogramTabProps } from "./odontogramTab/visitOdontogramTabTypes";
import { useVisitOdontogramIds } from "./odontogramTab/useVisitOdontogramIds";
import { useVisitOdontogramDentition } from "./odontogramTab/useVisitOdontogramDentition";
import { useVisitAutoOpen } from "./odontogramTab/useVisitAutoOpen";
import { DentitionStatusBanner } from "./odontogramTab/DentitionStatusBanner";
import { VisitDiaryInitializer } from "./odontogramTab/VisitDiaryInitializer";

export * from "./odontogramTab/visitOdontogramTabTypes";
export { resolveValidVisitUuid } from "./odontogramTab/visitOdontogramResolve";

export const VisitOdontogramTab: React.FC<VisitOdontogramTabProps> = React.memo(
	function VisitOdontogramTab(props: VisitOdontogramTabProps = {}) {
		const ctx = useAppLogicContext();
		const activePatient = props?.activePatient ?? ctx?.activePatient;
		const activeAppointment = props?.activeAppointment ?? ctx?.activeAppointment;
		const dashboard = props?.dashboard ?? ctx?.dashboard;
		const workspaceFlags = useWorkspaceProfile();

		const { openVisitId, appointmentId, diaryVisitId, diaryPatientId } =
			useVisitOdontogramIds({ activePatient, activeAppointment, dashboard });

		const { isOpeningVisit, handleOpenVisitNow } = useVisitAutoOpen({
			appointmentId,
			rawAppointmentId: activeAppointment?.id,
			openVisitId,
		});

		const { dentitionPhaseBadge, smartDentitionMode, isPediatric } =
			useVisitOdontogramDentition(activePatient);

		if (!activePatient?.id) {
			return (
				<div className="text-center py-12 px-6 text-slate-500 dark:text-slate-400">
					<Sparkles className="w-8 h-8 text-teal-400 opacity-40 mx-auto mb-2" />
					<h4 className="text-base font-semibold text-slate-900 dark:text-white">
						Пациент не выбран
					</h4>
					<p className="text-sm m-0">
						Выберите пациента, чтобы открыть зубную формулу приёма.
					</p>
				</div>
			);
		}

		return (
			<div
				data-testid="visit-odontogram-tab"
				className="visit-odontogram-tab flex flex-col gap-2 w-full max-w-full my-0 p-0"
			>
				<DentitionStatusBanner
					badge={dentitionPhaseBadge}
					smartDentitionMode={smartDentitionMode}
				/>

				<div className="w-full">
					<OdontogramModule
						patientId={activePatient.id}
						pediatricMode={isPediatric}
						dentitionMode={smartDentitionMode}
					/>
				</div>

				<div className="w-full">
					{diaryVisitId && diaryPatientId ? (
						<>
							<VisitDiarySection
								key={diaryVisitId}
								visitId={diaryVisitId}
								patientId={diaryPatientId}
							/>
							{workspaceFlags.hasEngineeringStatus && (
								<div style={{ marginTop: "16px" }}>
									<EgiszMonitor
										visitId={diaryVisitId}
										patientId={diaryPatientId}
									/>
								</div>
							)}
						</>
					) : (
						<VisitDiaryInitializer
							appointmentId={appointmentId}
							isOpeningVisit={isOpeningVisit}
							onOpenVisitNow={() => void handleOpenVisitNow()}
						/>
					)}
				</div>
			</div>
		);
	},
);

VisitOdontogramTab.displayName = "VisitOdontogramTab";
