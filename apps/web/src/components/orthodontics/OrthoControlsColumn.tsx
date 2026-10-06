import React from "react";
import {
	ORTHODONTIC_STAGE_TABS,
	ANTERIOR_TEETH,
	type OrthodonticStageFilter,
	type TargetArch,
} from "./orthoProtocolTypes";
import { OrthoPhotoAndCephProtocolSection } from "./OrthoPhotoAndCephProtocolSection";
import { OrthoClinicalPresetsSection } from "./OrthoClinicalPresetsSection";
import { OrthoDiagnosticsSection } from "./OrthoDiagnosticsSection";
import { OrthoDentalArchSection } from "./OrthoDentalArchSection";
import {
	OrthoBracketProtocolSection,
	type BracketSlot,
} from "./OrthoBracketProtocolSection";
import {
	OrthoArchwireSelector,
	type ArchwireMaterial,
	type ArchwireSection,
	type WorkhorseArchwireOption,
} from "./OrthoArchwireSelector";
import { OrthoClinicalActionsChecklist } from "./OrthoClinicalActionsChecklist";
import type {
	AnbClass,
	AngleClass,
	SagittalAnomaly,
	VerticalAnomaly,
	TransversalAnomaly,
	TmjStatus,
} from "@dental/shared";

export interface OrthoControlsColumnProps {
	stageFilter: OrthodonticStageFilter;
	setStageFilter: (filter: OrthodonticStageFilter) => void;
	setBracketSystem: (system: string) => void;
	setArchwireMaterial: (mat: ArchwireMaterial) => void;
	setArchwireSection: (sec: ArchwireSection) => void;
	selectedActions: string[];
	setSelectedActions: React.Dispatch<React.SetStateAction<string[]>>;

	// Photo & Ceph
	isPhotoProtocolOpen: boolean;
	setIsPhotoProtocolOpen: (open: boolean) => void;
	isPhotoProtocolCompleted: boolean;
	onTogglePhotoProtocolCompleted: () => void;
	isCephModalOpen: boolean;
	setIsCephModalOpen: (open: boolean) => void;
	anbClass: AnbClass;
	setAnbClass: (cls: AnbClass) => void;
	anbAngle: number;
	setAnbAngle: (angle: number) => void;
	onSetAnbNorm: () => void;
	patientId?: string | undefined;
	patientName: string;
	doctorName: string;
	clinicName: string;
	onInsertCephToProtocol: (text: string) => void;

	// Presets
	activePreset: "activation" | "wire_change" | "bonding" | "debonding" | null;
	onPresetActivation: () => void;
	onPresetWireChange: () => void;
	onPresetBonding: () => void;
	onPresetDebonding: () => void;
	onPresetAlignerLabOrder: () => void;
	onPresetRetainerLabOrder: () => void;
	onPresetPlateLabOrder: () => void;
	onPresetSplintLabOrder: () => void;
	alignerStep: number;
	alignerTotal: number;

	// Diagnostics
	angleClass: AngleClass;
	setAngleClass: (cls: AngleClass) => void;
	onSetAngleClassNorm: () => void;
	sagittalAnomaly: SagittalAnomaly;
	setSagittalAnomaly: (anomaly: SagittalAnomaly) => void;
	sagittalGapMm: number;
	setSagittalGapMm: (gap: number) => void;
	verticalAnomaly: VerticalAnomaly;
	setVerticalAnomaly: (anomaly: VerticalAnomaly) => void;
	transversalAnomaly: TransversalAnomaly;
	setTransversalAnomaly: (anomaly: TransversalAnomaly) => void;
	onSetOcclusionNorm: () => void;
	tmjStatus: TmjStatus;
	setTmjStatus: (status: TmjStatus) => void;
	onSetTmjNorm: () => void;

	// Dental Arch
	targetArch: TargetArch;
	onSelectArch: (arch: TargetArch) => void;
	selectedTeeth: number[];
	onToggleTooth: (tooth: number) => void;
	setSelectedTeeth: React.Dispatch<React.SetStateAction<number[]>>;

	// Bracket & Aligner Protocol
	bracketSlot: BracketSlot;
	setBracketSlot: (slot: BracketSlot) => void;
	bracketSystem: string;
	onSelectBracketSystem: (sys: string) => void;
	plateActivationTurns: number;
	setPlateActivationTurns: (turns: number) => void;
	activeAttachmentPreset: string | null;
	onSelectAttachmentPreset: (presetId: string) => void;
	isSplitArchAligners: boolean;
	setIsSplitArchAligners: React.Dispatch<React.SetStateAction<boolean>>;
	setAlignerStep: React.Dispatch<React.SetStateAction<number>>;
	setAlignerTotal: React.Dispatch<React.SetStateAction<number>>;
	alignerStepUpper: number;
	setAlignerStepUpper: React.Dispatch<React.SetStateAction<number>>;
	alignerTotalUpper: number;
	setAlignerTotalUpper: React.Dispatch<React.SetStateAction<number>>;
	alignerStepLower: number;
	setAlignerStepLower: React.Dispatch<React.SetStateAction<number>>;
	alignerTotalLower: number;
	setAlignerTotalLower: React.Dispatch<React.SetStateAction<number>>;
	alignerDaysPerStep: number;
	setAlignerDaysPerStep: React.Dispatch<React.SetStateAction<number>>;
	nextAlignerDateStr: string;
	alignerProgressPercent: number;
	onSendAlignerReminder: () => void;
	onIssueAlignerSet: (count: number, days: number) => void;
	onApplyAttachmentsProtocol: () => void;
	alignerSetIssuedCount?: number | undefined;

	// Archwire & Elastics
	archwireMaterial: ArchwireMaterial;
	archwireSection: ArchwireSection;
	onSelectWorkhorseArchwire: (wire: WorkhorseArchwireOption) => void;
	torquePreset: string;
	setTorquePreset: (preset: string) => void;
	angulationPreset: string;
	setAngulationPreset: (preset: string) => void;
	elasticScheme: string;
	setElasticScheme: (scheme: string) => void;
	elasticSize: string;
	setElasticSize: (size: string) => void;
	onElasticSizeInteraction: () => void;

	// Actions Checklist
	onToggleAction: (actionId: string) => void;
}

export const OrthoControlsColumn: React.FC<OrthoControlsColumnProps> = ({
	stageFilter,
	setStageFilter,
	setBracketSystem,
	setArchwireMaterial,
	setArchwireSection,
	selectedActions,
	setSelectedActions,
	isPhotoProtocolOpen,
	setIsPhotoProtocolOpen,
	isPhotoProtocolCompleted,
	onTogglePhotoProtocolCompleted,
	isCephModalOpen,
	setIsCephModalOpen,
	anbClass,
	setAnbClass,
	anbAngle,
	setAnbAngle,
	onSetAnbNorm,
	patientId,
	patientName,
	doctorName,
	clinicName,
	onInsertCephToProtocol,
	activePreset,
	onPresetActivation,
	onPresetWireChange,
	onPresetBonding,
	onPresetDebonding,
	onPresetAlignerLabOrder,
	onPresetRetainerLabOrder,
	onPresetPlateLabOrder,
	onPresetSplintLabOrder,
	alignerStep,
	alignerTotal,
	angleClass,
	setAngleClass,
	onSetAngleClassNorm,
	sagittalAnomaly,
	setSagittalAnomaly,
	sagittalGapMm,
	setSagittalGapMm,
	verticalAnomaly,
	setVerticalAnomaly,
	transversalAnomaly,
	setTransversalAnomaly,
	onSetOcclusionNorm,
	tmjStatus,
	setTmjStatus,
	onSetTmjNorm,
	targetArch,
	onSelectArch,
	selectedTeeth,
	onToggleTooth,
	setSelectedTeeth,
	bracketSlot,
	setBracketSlot,
	bracketSystem,
	onSelectBracketSystem,
	plateActivationTurns,
	setPlateActivationTurns,
	activeAttachmentPreset,
	onSelectAttachmentPreset,
	isSplitArchAligners,
	setIsSplitArchAligners,
	setAlignerStep,
	setAlignerTotal,
	alignerStepUpper,
	setAlignerStepUpper,
	alignerTotalUpper,
	setAlignerTotalUpper,
	alignerStepLower,
	setAlignerStepLower,
	alignerTotalLower,
	setAlignerTotalLower,
	alignerDaysPerStep,
	setAlignerDaysPerStep,
	nextAlignerDateStr,
	alignerProgressPercent,
	onSendAlignerReminder,
	onIssueAlignerSet,
	onApplyAttachmentsProtocol,
	alignerSetIssuedCount,
	archwireMaterial,
	archwireSection,
	onSelectWorkhorseArchwire,
	torquePreset,
	setTorquePreset,
	angulationPreset,
	setAngulationPreset,
	elasticScheme,
	setElasticScheme,
	elasticSize,
	setElasticSize,
	onElasticSizeInteraction,
	onToggleAction,
}) => {
	return (
		<div className="lg:col-span-7 p-4 sm:p-5 flex flex-col gap-4 border-b lg:border-b-0 lg:border-r border-[var(--line,#e2e8f0)] dark:border-slate-800 overflow-y-auto">
			{/* 0. Stages Filter Bar */}
			<div
				data-testid="ortho-stages-toolbar"
				className="min-h-[36px] h-9 p-0.5 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 border border-[var(--line,#e2e8f0)] dark:border-slate-700/60 flex items-center gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0"
			>
				{ORTHODONTIC_STAGE_TABS.map((stage) => {
					const isSelected = stageFilter === stage.id;
					return (
						<button
							key={stage.id}
							type="button"
							onClick={() => {
								setStageFilter(stage.id);
								if (stage.id === "aligners") {
									setBracketSystem("aligners");
								} else if (stage.id === "leveling") {
									setArchwireMaterial("NiTi");
									setArchwireSection(".014");
								} else if (stage.id === "working") {
									setArchwireMaterial("SS");
									setArchwireSection(".019x.025");
								} else if (stage.id === "finishing") {
									setArchwireMaterial("TMA");
									setArchwireSection(".017x.025");
								} else if (stage.id === "retention") {
									if (!selectedActions.includes("debonding")) {
										setSelectedActions((prev) => [...prev, "debonding"]);
									}
								}
							}}
							data-testid={`ortho-stage-tab-${stage.id}`}
							className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 ${
								isSelected
									? "bg-blue-600 text-white font-black shadow-xs ring-1 ring-blue-400"
									: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--muted,#64748b)] dark:text-slate-300 hover:text-[var(--ink,#0f172a)] hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-transparent"
							}`}
							title={stage.desc}
						>
							<span>{stage.label}</span>
						</button>
					);
				})}
			</div>

			{/* Photo Protocol & Cephalometric TRG Section */}
			<OrthoPhotoAndCephProtocolSection
				isPhotoProtocolOpen={isPhotoProtocolOpen}
				setIsPhotoProtocolOpen={setIsPhotoProtocolOpen}
				isPhotoProtocolCompleted={isPhotoProtocolCompleted}
				onTogglePhotoProtocolCompleted={onTogglePhotoProtocolCompleted}
				isCephModalOpen={isCephModalOpen}
				setIsCephModalOpen={setIsCephModalOpen}
				anbClass={anbClass}
				setAnbClass={setAnbClass}
				anbAngle={anbAngle}
				setAnbAngle={setAnbAngle}
				onSetAnbNorm={onSetAnbNorm}
				patientId={patientId}
				patientName={patientName}
				doctorName={doctorName}
				clinicName={clinicName}
				onInsertCephToProtocol={onInsertCephToProtocol}
			/>

			{/* Clinical Presets & ZTL Lab Orders */}
			<OrthoClinicalPresetsSection
				activePreset={activePreset}
				onPresetActivation={onPresetActivation}
				onPresetWireChange={onPresetWireChange}
				onPresetBonding={onPresetBonding}
				onPresetDebonding={onPresetDebonding}
				onPresetAlignerLabOrder={onPresetAlignerLabOrder}
				onPresetRetainerLabOrder={onPresetRetainerLabOrder}
				onPresetPlateLabOrder={onPresetPlateLabOrder}
				onPresetSplintLabOrder={onPresetSplintLabOrder}
				alignerStep={alignerStep}
				alignerTotal={alignerTotal}
			/>

			{/* Angle & Occlusal & TMJ Diagnostics */}
			<OrthoDiagnosticsSection
				angleClass={angleClass}
				setAngleClass={setAngleClass}
				onSetAngleClassNorm={onSetAngleClassNorm}
				sagittalAnomaly={sagittalAnomaly}
				setSagittalAnomaly={setSagittalAnomaly}
				sagittalGapMm={sagittalGapMm}
				setSagittalGapMm={setSagittalGapMm}
				verticalAnomaly={verticalAnomaly}
				setVerticalAnomaly={setVerticalAnomaly}
				transversalAnomaly={transversalAnomaly}
				setTransversalAnomaly={setTransversalAnomaly}
				onSetOcclusionNorm={onSetOcclusionNorm}
				tmjStatus={tmjStatus}
				setTmjStatus={setTmjStatus}
				onSetTmjNorm={onSetTmjNorm}
			/>

			{/* Dental Arch Formula */}
			<OrthoDentalArchSection
				targetArch={targetArch}
				onSelectArch={onSelectArch}
				selectedTeeth={selectedTeeth}
				onToggleTooth={onToggleTooth}
				onSelectAnterior={() => setSelectedTeeth(ANTERIOR_TEETH)}
				onClearTeeth={() => setSelectedTeeth([])}
			/>

			{/* Bracket System & Aligner Protocol Section */}
			<OrthoBracketProtocolSection
				bracketSlot={bracketSlot}
				setBracketSlot={setBracketSlot}
				bracketSystem={bracketSystem}
				onSelectBracketSystem={onSelectBracketSystem}
				plateActivationTurns={plateActivationTurns}
				setPlateActivationTurns={setPlateActivationTurns}
				onAddExpansionScrewAction={() => {
					if (!selectedActions.includes("expansion_screw_activation")) {
						setSelectedActions((prev) => [...prev, "expansion_screw_activation"]);
					}
				}}
				activeAttachmentPreset={activeAttachmentPreset}
				onSelectAttachmentPreset={onSelectAttachmentPreset}
				isSplitArchAligners={isSplitArchAligners}
				setIsSplitArchAligners={setIsSplitArchAligners}
				alignerStep={alignerStep}
				setAlignerStep={setAlignerStep}
				alignerTotal={alignerTotal}
				setAlignerTotal={setAlignerTotal}
				alignerStepUpper={alignerStepUpper}
				setAlignerStepUpper={setAlignerStepUpper}
				alignerTotalUpper={alignerTotalUpper}
				setAlignerTotalUpper={setAlignerTotalUpper}
				alignerStepLower={alignerStepLower}
				setAlignerStepLower={setAlignerStepLower}
				alignerTotalLower={alignerTotalLower}
				setAlignerTotalLower={setAlignerTotalLower}
				alignerIntervalDays={alignerDaysPerStep}
				setAlignerIntervalDays={setAlignerDaysPerStep}
				nextAlignerDateStr={nextAlignerDateStr}
				alignerProgressPercent={alignerProgressPercent}
				onSendAlignerReminder={onSendAlignerReminder}
				onIssueAlignerSet={onIssueAlignerSet}
				onApplyAttachmentsProtocol={onApplyAttachmentsProtocol}
				alignerSetIssuedCount={alignerSetIssuedCount}
			/>

			{/* Archwire, Torque & Elastics Section */}
			<OrthoArchwireSelector
				archwireMaterial={archwireMaterial}
				setArchwireMaterial={setArchwireMaterial}
				archwireSection={archwireSection}
				setArchwireSection={setArchwireSection}
				onSelectWorkhorseArchwire={onSelectWorkhorseArchwire}
				torquePreset={torquePreset}
				setTorquePreset={setTorquePreset}
				angulationPreset={angulationPreset}
				setAngulationPreset={setAngulationPreset}
				elasticScheme={elasticScheme}
				setElasticScheme={setElasticScheme}
				elasticSize={elasticSize}
				setElasticSize={setElasticSize}
				onElasticSizeInteraction={onElasticSizeInteraction}
			/>

			{/* Clinical Actions Checklist */}
			<OrthoClinicalActionsChecklist
				selectedActions={selectedActions}
				onToggleAction={onToggleAction}
			/>
		</div>
	);
};
