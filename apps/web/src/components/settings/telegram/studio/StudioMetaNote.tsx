import React from "react";
import { Activity, Building2, Sparkles, Stethoscope, Users } from "lucide-react";
import type { BotPreset } from "../telegramBotPresets";
import type { BotChannelType } from "../TelegramPhoneSimulator";

function getPresetMetaIcon(iconName: string) {
	switch (iconName) {
		case "Users":
			return <Users size={16} className="text-emerald-500" />;
		case "Activity":
			return <Activity size={16} className="text-sky-500" />;
		case "Stethoscope":
			return <Stethoscope size={16} className="text-indigo-500" />;
		case "Building2":
			return <Building2 size={16} className="text-teal-500" />;
		default:
			return <Sparkles size={16} className="text-teal-500" />;
	}
}

export function StudioMetaNote({ preset, channel }: { preset: BotPreset; channel: BotChannelType }) {
	return (
		<div className="tg-simulator-meta-note">
			<div className="flex items-center gap-2">
				{getPresetMetaIcon(preset.icon)}
				<strong className="text-xs font-semibold text-slate-800 dark:text-slate-200">
					Активный клинический пресет: {preset.name}
				</strong>
			</div>
			<p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
				Канал: <strong>{channel.toUpperCase()}</strong>. Интерактивные кнопки переключают экраны in-place.
			</p>
		</div>
	);
}
