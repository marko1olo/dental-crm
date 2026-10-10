export type CampaignAudienceFilterProps = {
	scope: "service" | "marketing";
	setScope: (scope: "service" | "marketing") => void;
	monthsSinceVisit: string;
	setMonthsSinceVisit: (months: string) => void;
	excludeBooked: boolean;
	setExcludeBooked: (exclude: boolean) => void;
	onApplyPreset: (preset: {
		title: string;
		scope: "service" | "marketing";
		months: string;
		excludeBooked: boolean;
	}) => void;
};

export function CampaignQuickPresets({
	onApplyPreset,
}: {
	onApplyPreset: CampaignAudienceFilterProps["onApplyPreset"];
}) {
	return (
		<div
			className="quick-chips-row mb-2"
			role="toolbar"
			aria-label="Быстрый выбор для врача"
		>
			<span className="ops-note">Быстрый выбор:</span>
			<button
				type="button"
				className="quick-chip"
				data-testid="preset-recall-6m"
				onClick={() =>
					onApplyPreset({
						title: "Приглашение на плановый профосмотр (6 мес.)",
						scope: "service",
						months: "6",
						excludeBooked: true,
					})
				}
			>
				Профосмотр 6 мес.
			</button>
			<button
				type="button"
				className="quick-chip"
				data-testid="preset-recall-12m"
				onClick={() =>
					onApplyPreset({
						title: "Приглашение на контрольный осмотр (12 мес.)",
						scope: "service",
						months: "12",
						excludeBooked: true,
					})
				}
			>
				Профосмотр 12 мес.
			</button>
			<button
				type="button"
				className="quick-chip"
				data-testid="preset-hygiene-3m"
				onClick={() =>
					onApplyPreset({
						title: "Плановый осмотр и гигиена (3 мес.)",
						scope: "service",
						months: "3",
						excludeBooked: true,
					})
				}
			>
				Гигиена 3 мес.
			</button>
		</div>
	);
}

export function CampaignAudienceFilter({
	scope,
	setScope,
	monthsSinceVisit,
	setMonthsSinceVisit,
	excludeBooked,
	setExcludeBooked,
}: Omit<CampaignAudienceFilterProps, "onApplyPreset">) {
	return (
		<>
			<span className="ops-field">
				<label htmlFor="campaign-scope">Вид</label>
				<select
					id="campaign-scope"
					value={scope}
					onChange={(event) =>
						setScope(event.target.value as "service" | "marketing")
					}
				>
					<option value="service">Сервисная — в рамках договора</option>
					<option value="marketing">
						Рекламная — нужно согласие пациента
					</option>
				</select>
			</span>
			<span className="ops-field">
				<label htmlFor="campaign-months">Не был, месяцев</label>
				<input
					id="campaign-months"
					type="number"
					min={0}
					max={120}
					value={monthsSinceVisit}
					onChange={(event) => setMonthsSinceVisit(event.target.value)}
				/>
			</span>
			<label className="ops-checkbox" htmlFor="campaign-exclude-booked">
				<input
					id="campaign-exclude-booked"
					type="checkbox"
					checked={excludeBooked}
					onChange={(event) => setExcludeBooked(event.target.checked)}
				/>{" "}
				Не писать тем, кто уже записан
			</label>
		</>
	);
}

export default CampaignAudienceFilter;
