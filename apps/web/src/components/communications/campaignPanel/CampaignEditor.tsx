import {
	CampaignAudienceFilter,
	CampaignQuickPresets,
} from "./CampaignAudienceFilter.js";
import {
	type TemplateOption,
	type TemplateVariable,
	channelLabels,
} from "./types.js";

export type CampaignEditorProps = {
	templates: TemplateOption[];
	title: string;
	setTitle: (title: string) => void;
	templateId: string;
	setTemplateId: (id: string) => void;
	scope: "service" | "marketing";
	setScope: (scope: "service" | "marketing") => void;
	monthsSinceVisit: string;
	setMonthsSinceVisit: (months: string) => void;
	excludeBooked: boolean;
	setExcludeBooked: (exclude: boolean) => void;
	busy: boolean;
	createCampaign: () => Promise<void>;
	variables: TemplateVariable[];
};

export function CampaignEditor({
	templates,
	title,
	setTitle,
	templateId,
	setTemplateId,
	scope,
	setScope,
	monthsSinceVisit,
	setMonthsSinceVisit,
	excludeBooked,
	setExcludeBooked,
	busy,
	createCampaign,
	variables,
}: CampaignEditorProps) {
	return (
		<>
			<h3 className="ops-section-title">Новая рассылка</h3>
			{templates.length === 0 ? (
				<p className="ops-empty">
					Нет активных шаблонов — сначала создайте шаблон для нужного канала.
				</p>
			) : (
				<>
					<CampaignQuickPresets
						onApplyPreset={({
							title: presetTitle,
							scope: presetScope,
							months: presetMonths,
							excludeBooked: presetExclude,
						}) => {
							setTitle(presetTitle);
							setScope(presetScope);
							setMonthsSinceVisit(presetMonths);
							setExcludeBooked(presetExclude);
						}}
					/>
					<div className="ops-toolbar">
						<span className="ops-field ops-field--grow">
							<label htmlFor="campaign-title">Название</label>
							<input
								id="campaign-title"
								type="text"
								value={title}
								onChange={(event) => setTitle(event.target.value)}
								placeholder="Приглашение на осмотр"
							/>
						</span>
						<span className="ops-field">
							<label htmlFor="campaign-template">Шаблон</label>
							<select
								id="campaign-template"
								value={templateId}
								onChange={(event) => setTemplateId(event.target.value)}
							>
								<option value="">Выберите шаблон</option>
								{templates.map((template) => (
									<option key={template.id} value={template.id}>
										{template.title} ·{" "}
										{channelLabels[template.channel] ?? template.channel}
									</option>
								))}
							</select>
						</span>
						<CampaignAudienceFilter
							scope={scope}
							setScope={setScope}
							monthsSinceVisit={monthsSinceVisit}
							setMonthsSinceVisit={setMonthsSinceVisit}
							excludeBooked={excludeBooked}
							setExcludeBooked={setExcludeBooked}
						/>

						<button
							className="primary-button"
							type="button"
							disabled={busy}
							onClick={() => void createCampaign()}
						>
							Создать и посмотреть получателей
						</button>

						{variables.length > 0 ? (
							<p className="ops-hint ops-variable-catalog__title">
								<strong>Доступные переменные шаблонов:</strong>{" "}
								{variables
									.map((variable) => `{${variable.key}} (${variable.label})`)
									.join(", ")}
							</p>
						) : null}
					</div>
				</>
			)}
		</>
	);
}

export default CampaignEditor;
