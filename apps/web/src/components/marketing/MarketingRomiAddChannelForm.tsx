/**
 * DENTE Dental CRM — Marketing ROMI Add Channel Form.
 */

import React, { useState } from "react";
import type { AdvertisingChannelInput } from "@dental/shared";
import { QUICK_CHANNEL_PRESETS, type QuickChannelPreset } from "./marketingRomiPresets.js";

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
		const newEntry: AdvertisingChannelInput = {
			id: `ch_preset_${Date.now()}_${channelsCount + 1}`,
			channelKey: preset.channelKey,
			nameRu: preset.nameRu,
			categoryRu: preset.categoryRu,
			spentKopecks: Math.round(preset.spentRub * 100),
			leadsCount: preset.leadsCount,
			primaryPatientsCount: preset.patients,
			repeatVisitsCount: preset.repeatVisits,
			revenueKopecks: Math.round(preset.revenueRub * 100),
		};
		onSaveChannel(newEntry);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		const spentVal = Math.max(0, parseFloat(spentRub) || 0);
		const patVal = Math.max(0, parseInt(patients, 10) || 0);
		const leadVal = Math.max(patVal, parseInt(leads, 10) || Math.round(patVal * 1.25));
		const repVal = Math.max(0, parseInt(repeatVisits, 10) || 0);
		const revVal = Math.max(0, parseFloat(revenueRub) || 0);

		const newEntry: AdvertisingChannelInput = {
			id: `ch_custom_${Date.now()}`,
			channelKey: `custom_${Date.now()}`,
			nameRu: name.trim(),
			categoryRu: category.trim() || "Реклама",
			spentKopecks: Math.round(spentVal * 100),
			leadsCount: leadVal,
			primaryPatientsCount: patVal,
			repeatVisitsCount: repVal,
			revenueKopecks: Math.round(revVal * 100),
		};

		onSaveChannel(newEntry);
	};

	return (
		<form onSubmit={handleSubmit} className="romi-add-form" data-testid="romi-add-form">
			<h4 className="romi-add-title">Добавление рекламного канала</h4>

			<div style={{ marginBottom: "12px" }}>
				<span
					style={{
						fontSize: "11px",
						fontWeight: 700,
						color: "var(--muted)",
						display: "block",
						marginBottom: "6px",
					}}
				>
					Быстрое добавление типового канала:
				</span>
				<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
					{QUICK_CHANNEL_PRESETS.map((p) => (
						<button
							key={p.nameRu}
							type="button"
							onClick={() => handleAddPreset(p)}
							className="romi-action-btn secondary"
							style={{ fontSize: "11px", padding: "4px 10px", minHeight: "32px" }}
							title={`Добавить ${p.nameRu} (${p.categoryRu})`}
						>
							+ {p.nameRu}
						</button>
					))}
				</div>
			</div>

			<div
				className="romi-add-grid"
				style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}
			>
				<div>
					<label className="romi-form-label">Название канала</label>
					<input
						type="text"
						required
						placeholder="Например: Telegram-канал района"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="romi-input"
					/>
				</div>
				<div>
					<label className="romi-form-label">Категория</label>
					<input
						type="text"
						placeholder="Соцсети / Промо"
						value={category}
						onChange={(e) => setCategory(e.target.value)}
						className="romi-input"
					/>
				</div>
				<div>
					<label className="romi-form-label">Потрачено (₽)</label>
					<input
						type="number"
						min="0"
						step="100"
						placeholder="0"
						value={spentRub}
						onChange={(e) => setSpentRub(e.target.value)}
						className="romi-input"
					/>
				</div>
				<div>
					<label className="romi-form-label">Лидов (чел)</label>
					<input
						type="number"
						min="0"
						step="1"
						placeholder="0"
						value={leads}
						onChange={(e) => setLeads(e.target.value)}
						className="romi-input"
					/>
				</div>
				<div>
					<label className="romi-form-label">Первичных (чел)</label>
					<input
						type="number"
						min="0"
						step="1"
						placeholder="0"
						value={patients}
						onChange={(e) => setPatients(e.target.value)}
						className="romi-input"
					/>
				</div>
				<div>
					<label className="romi-form-label">Повторных (чел)</label>
					<input
						type="number"
						min="0"
						step="1"
						placeholder="0"
						value={repeatVisits}
						onChange={(e) => setRepeatVisits(e.target.value)}
						className="romi-input"
					/>
				</div>
				<div>
					<label className="romi-form-label">Выручка (₽)</label>
					<input
						type="number"
						min="0"
						step="1000"
						placeholder="0"
						value={revenueRub}
						onChange={(e) => setRevenueRub(e.target.value)}
						className="romi-input"
					/>
				</div>
			</div>
			<div className="romi-add-actions">
				<button type="submit" className="romi-action-btn primary">
					Сохранить канал
				</button>
				<button
					type="button"
					className="romi-action-btn secondary"
					onClick={onCancel}
				>
					Отмена
				</button>
			</div>
		</form>
	);
}
