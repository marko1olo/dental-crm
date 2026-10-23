/**
 * MarketingRomiAddChannelForm.tsx — Add Channel Inline Form for ROMI Table.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8e, 8am (Consistent Design System).
 */

import React, { useState } from "react";
import type { AdvertisingChannelInput } from "@dental/shared";
import type { QuickChannelPreset } from "./marketingRomiPresets.js";
import { MarketingRomiQuickPresets } from "./MarketingRomiQuickPresets.js";

export interface MarketingRomiAddChannelFormProps {
	readonly channelsCount: number;
	readonly onSaveChannel: (channel: AdvertisingChannelInput) => void;
	readonly onCancel: () => void;
}

export function MarketingRomiAddChannelForm({
	channelsCount,
	onSaveChannel,
	onCancel,
}: MarketingRomiAddChannelFormProps) {
	const [name, setName] = useState("");
	const [category, setCategory] = useState("Таргет / Медиа");
	const [spentRub, setSpentRub] = useState("");
	const [leads, setLeads] = useState("");
	const [patients, setPatients] = useState("");
	const [repeatVisits, setRepeatVisits] = useState("");
	const [revenueRub, setRevenueRub] = useState("");

	const handleAddPreset = (preset: QuickChannelPreset) => {
		onSaveChannel({
			id: `ch_preset_${Date.now()}_${channelsCount + 1}`,
			channelKey: preset.channelKey,
			nameRu: preset.nameRu,
			categoryRu: preset.categoryRu,
			spentKopecks: Math.round(preset.spentRub * 100),
			leadsCount: preset.leadsCount,
			primaryPatientsCount: preset.patients,
			repeatVisitsCount: preset.repeatVisits,
			revenueKopecks: Math.round(preset.revenueRub * 100),
		});
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		const spentVal = Math.max(0, parseFloat(spentRub) || 0);
		const patVal = Math.max(0, parseInt(patients, 10) || 0);
		const leadVal = Math.max(patVal, parseInt(leads, 10) || Math.round(patVal * 1.25));
		const repVal = Math.max(0, parseInt(repeatVisits, 10) || 0);
		const revVal = Math.max(0, parseFloat(revenueRub) || 0);

		onSaveChannel({
			id: `ch_custom_${Date.now()}`,
			channelKey: `custom_${Date.now()}`,
			nameRu: name.trim(),
			categoryRu: category.trim() || "Реклама",
			spentKopecks: Math.round(spentVal * 100),
			leadsCount: leadVal,
			primaryPatientsCount: patVal,
			repeatVisitsCount: repVal,
			revenueKopecks: Math.round(revVal * 100),
		});
	};

	return (
		<form onSubmit={handleSubmit} className="romi-add-form" data-testid="romi-add-form">
			<h4 className="romi-add-title">Добавление рекламного канала</h4>
			<MarketingRomiQuickPresets onSelectPreset={handleAddPreset} />
			<div className="romi-add-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
				<div>
					<label className="romi-form-label">Название канала</label>
					<input type="text" required placeholder="Например: Telegram-канал" value={name} onChange={(e) => setName(e.target.value)} className="romi-input" />
				</div>
				<div>
					<label className="romi-form-label">Категория</label>
					<input type="text" placeholder="Соцсети / Промо" value={category} onChange={(e) => setCategory(e.target.value)} className="romi-input" />
				</div>
				<div>
					<label className="romi-form-label">Потрачено (₽)</label>
					<input type="number" min="0" step="100" placeholder="0" value={spentRub} onChange={(e) => setSpentRub(e.target.value)} className="romi-input" />
				</div>
				<div>
					<label className="romi-form-label">Лидов (чел)</label>
					<input type="number" min="0" step="1" placeholder="0" value={leads} onChange={(e) => setLeads(e.target.value)} className="romi-input" />
				</div>
				<div>
					<label className="romi-form-label">Первичных (чел)</label>
					<input type="number" min="0" step="1" placeholder="0" value={patients} onChange={(e) => setPatients(e.target.value)} className="romi-input" />
				</div>
				<div>
					<label className="romi-form-label">Повторных (чел)</label>
					<input type="number" min="0" step="1" placeholder="0" value={repeatVisits} onChange={(e) => setRepeatVisits(e.target.value)} className="romi-input" />
				</div>
				<div>
					<label className="romi-form-label">Выручка (₽)</label>
					<input type="number" min="0" step="1000" placeholder="0" value={revenueRub} onChange={(e) => setRevenueRub(e.target.value)} className="romi-input" />
				</div>
			</div>
			<div className="romi-add-actions">
				<button type="submit" className="romi-action-btn primary min-h-[36px]">Сохранить канал</button>
				<button type="button" className="romi-action-btn secondary min-h-[36px]" onClick={onCancel}>Отмена</button>
			</div>
		</form>
	);
}
