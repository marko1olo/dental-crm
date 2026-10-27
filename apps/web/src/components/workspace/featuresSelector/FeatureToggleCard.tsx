import React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { FeatureToggleDef } from "./featureToggleTypes";
import { ToggleSwitch } from "./ToggleSwitch";

export interface FeatureToggleCardProps {
	readonly def: FeatureToggleDef;
	readonly isOn: boolean;
	readonly isSaving: boolean;
	readonly isSaved: boolean;
	readonly failureText?: string | null | undefined;
	readonly onToggle: (value: boolean) => void;
}

export function FeatureToggleCard({
	def,
	isOn,
	isSaving,
	isSaved,
	failureText,
	onToggle,
}: FeatureToggleCardProps) {
	return (
		<div
			id={`feature-toggle-${def.key}`}
			className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border transition-all ${
				isOn
					? "bg-white dark:bg-slate-900/80 shadow-xs"
					: "bg-slate-50/60 dark:bg-slate-900/40 opacity-80"
			}`}
			style={{
				borderColor: isOn ? `${def.color}55` : "var(--line, #e2e8f0)",
			}}
		>
			<div
				className="mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
				style={{
					background: isOn ? `${def.color}20` : "var(--paper-soft, rgba(0,0,0,.04))",
					color: isOn ? def.color : "var(--muted, #64748b)",
				}}
			>
				{def.icon}
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-1">
					<span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
						{def.label}
					</span>
					{isSaving && (
						<Loader2 size={14} className="animate-spin text-slate-400" />
					)}
					{isSaved && (
						<CheckCircle2 size={14} className="text-emerald-500" />
					)}
				</div>
				<p className="m-0 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
					{def.description}
				</p>
				{failureText && (
					<p
						role="alert"
						className="mt-1.5 m-0 text-xs leading-relaxed text-rose-600 dark:text-rose-400 font-semibold"
					>
						{failureText}
					</p>
				)}
			</div>

			<div className="mt-0.5 shrink-0">
				<ToggleSwitch
					checked={isOn}
					onChange={onToggle}
					color={def.color}
					ariaLabel={`Переключить модуль ${def.label}`}
				/>
			</div>
		</div>
	);
}
