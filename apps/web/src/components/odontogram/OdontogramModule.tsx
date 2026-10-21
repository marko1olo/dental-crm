import React, { useRef } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { panelStateText } from "../../lib/panelStateText";
import { PanelLoadFailure } from "../PanelLoadFailure";
import { OdontogramModuleMainView } from "./OdontogramModuleMainView";
import { OdontogramModuleModalsBridge } from "./OdontogramModuleModalsBridge";
import { TEETH_SUBJECT } from "./odontogramModuleConstants";
import { useOdontogramHotkeys } from "./useOdontogramHotkeys";
import { useOdontogramModuleModalsState } from "./useOdontogramModuleModalsState";
import { useOdontogramModuleSyncFacade } from "./useOdontogramModuleSyncFacade";
import { useOdontogramToothClickHandler } from "./useOdontogramToothClickHandler";
import "./odontogram.css";

export * from "./odontogramModuleConstants";

// Calibrated radial menu geometry SSOT (Mandate 8c):
// const menuH = 380; Math.max(10, Math.min(window.innerHeight - 400, y));

export interface OdontogramModuleProps {
	patientId: string;
	pediatricMode?: boolean | undefined;
	dentitionMode?: "adult" | "pediatric" | "mixed" | undefined;
}

export const OdontogramModule = React.memo(
	({
		patientId,
		pediatricMode,
		dentitionMode: propDentitionMode,
	}: OdontogramModuleProps) => {
		const { odontogramUseSurfaces, activePatient, activeDoctor, auth } =
			useAppLogicContext();
		const modals = useOdontogramModuleModalsState();

		const syncFacade = useOdontogramModuleSyncFacade({
			patientId,
			pediatricMode,
			propDentitionMode,
			activePatient,
			activeDoctor,
			onClearMenu: modals.clearMenu,
		});

		const { handleToothClick, handleApplyToothState } =
			useOdontogramToothClickHandler({
				selectedTeeth: syncFacade?.sync?.selectedTeeth ?? [],
				setSelectedTeeth: syncFacade?.sync?.setSelectedTeeth ?? (() => {}),
				activeSurfaces: syncFacade?.sync?.activeSurfaces ?? {},
				setActiveSurfaces: syncFacade?.sync?.setActiveSurfaces ?? (() => {}),
				isMultiSelectMode: syncFacade?.sync?.isMultiSelectMode ?? false,
				odontogramUseSurfaces,
				setMenuConfig: modals.setMenuConfig,
				setRadialMenuData: modals.setRadialMenuData,
				teethDataRef: syncFacade?.sync?.teethDataRef ?? { current: [] },
				updateToothState: syncFacade?.sync?.updateToothState ?? (() => {}),
				patientId,
			});

		useOdontogramHotkeys({
			menuConfig: modals.menuConfig,
			setMenuConfig: modals.setMenuConfig,
			handleApplyToothState,
		});
		const containerRef = useRef<HTMLDivElement>(null);

		return (
			<div className="flex flex-col gap-1.5 w-full text-[var(--odontogram-ink,#0f172a)]">
				<div
					className="w-full min-w-0 flex flex-col gap-1.5 relative"
					ref={containerRef}
				>
					{syncFacade?.sync?.teethLoad?.phase === "loading" && (
						<div role="status" aria-live="polite" className="sr-only">
							{panelStateText(TEETH_SUBJECT, { phase: "loading" }).title}
						</div>
					)}
					{syncFacade?.sync?.teethLoad?.phase === "failed" && (
						<PanelLoadFailure
							subject={TEETH_SUBJECT}
							status={syncFacade.sync.teethLoad.status}
							onRetry={() => syncFacade.sync.setTeethReloadToken((t) => t + 1)}
						/>
					)}

					<OdontogramModuleMainView
						patientId={patientId}
						syncFacade={syncFacade}
						modals={modals}
						handleToothClick={handleToothClick}
						odontogramUseSurfaces={odontogramUseSurfaces}
					/>

					<OdontogramModuleModalsBridge
						patientId={patientId}
						syncFacade={syncFacade}
						modals={modals}
						handleApplyToothState={handleApplyToothState}
						activePatient={activePatient}
						activeDoctor={activeDoctor}
						auth={auth}
						odontogramUseSurfaces={odontogramUseSurfaces}
					/>
				</div>
			</div>
		);
	},
	(prev, next) =>
		prev.patientId === next.patientId &&
		prev.pediatricMode === next.pediatricMode,
);

OdontogramModule.displayName = "OdontogramModule";
