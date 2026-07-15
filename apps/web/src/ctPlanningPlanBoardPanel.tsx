import type { DicomViewerToolStateBundleResponse } from "@dental/shared";
import type {
	CtPlanningArtifactCommand,
	CtPlanningArtifactCommandState,
} from "./ctPlanningArtifactCommands";
import {
	type CtImplantLibraryItem,
	type CtPlanningQuickAction,
	ctPlanningTools,
} from "./ctPlanningCatalog";

export type CtPlanningPlanBoardPanelProps = {
	canPlan: boolean;
	selectedImplant: CtImplantLibraryItem | null;
	activeQuickAction: CtPlanningQuickAction | null;
	activeActionArtifactStates: CtPlanningArtifactCommandState[];
	activeActionNextArtifact: CtPlanningArtifactCommandState | null;
	onCreateArtifact?: ((command: CtPlanningArtifactCommand) => void) | undefined;
	toolStateBundle: DicomViewerToolStateBundleResponse | null;
	bundleSummary: string;
};

const toolStateTargetLabels: Record<
	DicomViewerToolStateBundleResponse["target"],
	string
> = {
	cornerstone3d: "просмотрщик КТ",
	ohif: "OHIF",
	generic_json: "пакет состояния",
	external_viewer: "внешний просмотр",
};

export function CtPlanningPlanBoardPanel({
	canPlan,
	selectedImplant,
	activeQuickAction,
	activeActionArtifactStates,
	activeActionNextArtifact,
	onCreateArtifact,
	toolStateBundle,
	bundleSummary,
}: CtPlanningPlanBoardPanelProps) {
	const readyToolCount = ctPlanningTools.filter(
		(tool) => !tool.requiresVolume || canPlan,
	).length;

	return (
		<div
			className="ct-planning-plan-board"
			data-testid="ct-planning-plan-board"
			aria-label="Текущий КТ-план"
		>
			<article>
				<span>Инструменты</span>
				<strong>
					{readyToolCount}/{ctPlanningTools.length}
				</strong>
				<p>
					{canPlan
						? "Объемные инструменты доступны."
						: "Открыт справочник и план."}
				</p>
			</article>
			<article>
				<span>Имплант</span>
				<strong>
					{selectedImplant
						? `${selectedImplant.diameterMm} x ${selectedImplant.lengthMm} мм`
						: "не выбран"}
				</strong>
				<p>
					{selectedImplant
						? `${selectedImplant.line}, ${selectedImplant.platform}`
						: "Выберите типоразмер из библиотеки."}
				</p>
			</article>
			<article>
				<span>Действие</span>
				<strong>{activeQuickAction?.title ?? "не выбрано"}</strong>
				<p>
					{activeQuickAction
						? activeQuickAction.detail
						: "Выберите сценарий плоскости и инструмента."}
				</p>
				{activeActionArtifactStates.length > 0 ? (
					<div
						className="ct-planning-active-action-artifacts"
						data-testid="ct-planning-active-action-artifacts"
					>
						<div className="ct-planning-active-artifact-chips">
							{activeActionArtifactStates.map((item) => (
								<em className={item.status} key={item.command.id}>
									{item.command.title}: {item.statusLabel}
								</em>
							))}
						</div>
						{activeActionNextArtifact ? (
							<button
								type="button"
								disabled={
									activeActionNextArtifact.status === "blocked" ||
									!onCreateArtifact
								}
								onClick={() =>
									onCreateArtifact?.(activeActionNextArtifact.command)
								}
								aria-label={`${activeActionNextArtifact.actionLabel}: ${activeActionNextArtifact.command.title}`}
							>
								{activeActionNextArtifact.actionLabel}:{" "}
								{activeActionNextArtifact.command.title}
							</button>
						) : null}
					</div>
				) : null}
			</article>
			<article>
				<span>Пакет</span>
				<strong>
					{toolStateBundle
						? toolStateTargetLabels[toolStateBundle.target]
						: "не собран"}
				</strong>
				<p>{bundleSummary}</p>
			</article>
		</div>
	);
}
