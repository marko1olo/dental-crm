/**
 * @file CopilotSettingsGeneralTab.tsx
 * @description General AI configuration tab: Trust level, Model selection,
 * CoT reasoning, Specialization, Diary template, Clinical memory.
 * (Mandate 8b <= 200 lines, Mandate 8e, Mandate 8x).
 */

import React from "react";
import { Brain, Check, Cpu, Lock, ShieldAlert, ShieldCheck, Zap } from "lucide-react";
import type {
	AiProvider,
	AiSpeedMode,
	AiTrustLevel,
	ClinicalSpecialization,
	DiaryTemplate,
	GranularAgentPermissions,
	ModelRoutingMode,
} from "../../../store/copilotStore";
import { CopilotSettingsGranularPermissions } from "./CopilotSettingsGranularPermissions";
import { CopilotSettingsModelRouting, MODERN_BYOK_MODELS } from "./CopilotSettingsModelRouting";

export const AI_MODELS = MODERN_BYOK_MODELS;

export const TRUST_LEVELS: Array<{
	id: AiTrustLevel;
	title: string;
	badge: string;
	description: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
	{
		id: "confirm_all",
		title: "Максимальный контроль (Параноик)",
		badge: "100% подтверждений",
		description: "ИИ запрашивает явное подтверждение на каждое действие: одонтограмма, план, чтение файлов.",
		icon: Lock,
	},
	{
		id: "balanced",
		title: "Сбалансированный (Копайлот)",
		badge: "Рекомендуемый",
		description: "Безопасные действия выполняются сразу (поиск, черновик SOAP). Финансы требуют подтверждения.",
		icon: ShieldCheck,
	},
	{
		id: "autonomous",
		title: "Высокая автономия (Суперагент)",
		badge: "Турбо-скорость",
		description: "Фоновое применение рутинных клинических шагов без лишних вопросов с мгновенной отменой (Undo).",
		icon: Zap,
	},
];

export interface CopilotSettingsGeneralTabProps {
	trustLevel: AiTrustLevel; setTrustLevel: (lvl: AiTrustLevel) => void;
	granularPermissions?: GranularAgentPermissions; setGranularPermissions?: (perms: GranularAgentPermissions) => void;
	customInstructions?: string; setCustomInstructions?: (val: string) => void;
	model: string; setModel: (m: string) => void;
	modelRoutingMode?: ModelRoutingMode; setModelRoutingMode?: (mode: ModelRoutingMode) => void;
	byokProvider?: AiProvider; setByokProvider?: (p: AiProvider) => void;
	byokApiKey?: string; setByokApiKey?: (k: string) => void;
	byokModel?: string; setByokModel?: (m: string) => void;
	speedMode: AiSpeedMode; setSpeedMode: (mode: AiSpeedMode) => void;
	showThinkingProcess: boolean; setShowThinkingProcess: (val: boolean) => void;
	clinicalSpecialization: ClinicalSpecialization; setClinicalSpecialization: (spec: ClinicalSpecialization) => void;
	diaryTemplate: DiaryTemplate; setDiaryTemplate: (tmpl: DiaryTemplate) => void;
	memoryCount: number; onOpenMemory: () => void;
}

export function CopilotSettingsGeneralTab({
	trustLevel, setTrustLevel, granularPermissions, setGranularPermissions,
	customInstructions, setCustomInstructions, model, setModel,
	modelRoutingMode = "server_managed", setModelRoutingMode = () => {},
	byokProvider = "gemini", setByokProvider = () => {},
	byokApiKey = "", setByokApiKey = () => {},
	byokModel = "gemini-3.6-flash", setByokModel = () => {},
	speedMode, setSpeedMode, showThinkingProcess, setShowThinkingProcess,
	clinicalSpecialization, setClinicalSpecialization, diaryTemplate, setDiaryTemplate,
	memoryCount, onOpenMemory,
}: CopilotSettingsGeneralTabProps) {
	return (
		<div className="space-y-4 text-xs" data-testid="copilot-settings-general-tab">
			<section className="space-y-2">
				<label className="font-bold text-[var(--ink)] flex items-center gap-1.5">
					<ShieldAlert size={14} className="text-[var(--teal,#0d9488)]" />
					<span>Уровень доверия к действиям ИИ</span>
				</label>
				<div className="grid grid-cols-1 gap-2">
					{TRUST_LEVELS.map((lvl) => {
						const isSelected = trustLevel === lvl.id;
						const Icon = lvl.icon;
						return (
							<button
								key={lvl.id}
								type="button"
								onClick={() => setTrustLevel(lvl.id)}
								className={`p-2.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
									isSelected
										? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.08))] shadow-sm"
										: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								<div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
									isSelected ? "bg-[var(--teal,#0d9488)] text-white" : "bg-[var(--paper-soft)] text-[var(--muted)]"
								}`}>
									<Icon size={14} />
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between gap-2">
										<span className="font-bold text-[var(--ink)]">{lvl.title}</span>
										<span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
											isSelected ? "bg-[var(--teal,#0d9488)]/20 text-[var(--teal,#0d9488)]" : "bg-[var(--paper-soft)] text-[var(--muted)]"
										}`}>
											{lvl.badge}
										</span>
									</div>
									<p className="mt-0.5 text-[11px] text-[var(--muted)] leading-relaxed">{lvl.description}</p>
								</div>
							</button>
						);
					})}
				</div>
			</section>

			<CopilotSettingsModelRouting
				modelRoutingMode={modelRoutingMode}
				setModelRoutingMode={setModelRoutingMode}
				byokProvider={byokProvider}
				setByokProvider={setByokProvider}
				byokApiKey={byokApiKey}
				setByokApiKey={setByokApiKey}
				byokModel={byokModel}
				setByokModel={setByokModel}
			/>

			<section className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2.5">
				<div className="flex items-center justify-between gap-2">
					<div>
						<span className="font-bold text-[var(--ink)] flex items-center gap-1.5">
							<Brain size={14} className="text-[var(--teal,#0d9488)]" />
							<span>Режим клинического консилиума</span>
						</span>
						<p className="text-[10px] text-[var(--muted)]">Глубокое EBM рассуждение со скрытой цепочкой мыслей (CoT)</p>
					</div>
					<div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
						<button
							type="button"
							onClick={() => setSpeedMode("turbo")}
							className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
								speedMode === "turbo" ? "bg-[var(--teal,#0d9488)] text-white shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent"
							}`}
						>
							Турбо
						</button>
						<button
							type="button"
							onClick={() => setSpeedMode("deep_reasoning")}
							className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
								speedMode === "deep_reasoning" ? "bg-[var(--teal,#0d9488)] text-white shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent"
							}`}
						>
							Консилиум
						</button>
					</div>
				</div>
				<label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-[var(--ink)]">
					<input
						type="checkbox"
						checked={showThinkingProcess}
						onChange={(e) => setShowThinkingProcess(e.target.checked)}
						className="rounded text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)]"
					/>
					<span>Показывать блок цепочки рассуждений (CoT) при формировании ответа</span>
				</label>
			</section>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<section className="space-y-1.5">
					<label className="font-bold text-[var(--ink)]">Специализация врача</label>
					<select
						value={clinicalSpecialization}
						onChange={(e) => setClinicalSpecialization(e.target.value as ClinicalSpecialization)}
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs cursor-pointer focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					>
						{[
							["therapy", "Терапевтическая стоматология"], ["orthopedics", "Ортопедическая стоматология"],
							["surgery", "Хирургия и имплантология"], ["orthodontics", "Ортодонтия"],
							["perio", "Пародонтология"], ["pediatric", "Детская стоматология"]
						].map(([val, lbl]) => (<option key={val} value={val}>{lbl}</option>))}
					</select>
				</section>
				<section className="space-y-1.5">
					<label className="font-bold text-[var(--ink)]">Формат дневника приёма</label>
					<select
						value={diaryTemplate === "form043" ? "treatment_diary" : diaryTemplate}
						onChange={(e) => setDiaryTemplate(e.target.value as DiaryTemplate)}
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs cursor-pointer focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					>
						<option value="soap">SOAP (Субъективно, Объективно, Оценка, План)</option>
						<option value="treatment_diary">Медицинская карта приёма</option>
						<option value="express">Краткий экспресс-протокол приёма</option>
					</select>
				</section>
			</div>

			{granularPermissions && setGranularPermissions && (
				<CopilotSettingsGranularPermissions
					granularPermissions={granularPermissions}
					setGranularPermissions={setGranularPermissions}
				/>
			)}

			{setCustomInstructions && (
				<section className="space-y-1.5">
					<label className="font-bold text-[var(--ink)] flex items-center justify-between">
						<span>Индивидуальные инструкции и персональный стиль врача</span>
						<span className="text-[10px] text-[var(--muted)]">Промпт врача</span>
					</label>
					<textarea
						value={customInstructions || ""}
						onChange={(e) => setCustomInstructions(e.target.value)}
						placeholder="Например: Врач-микроскопист. При эндодонтии обязательный коффердам и ультразвук. Анестетик: Убистезин форте 1:100 000. Временная пломба: Каласепт..."
						rows={2}
						className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs leading-relaxed focus:ring-1 focus:ring-[var(--teal,#0d9488)] outline-none resize-none"
					/>
				</section>
			)}

			<div className="p-3 rounded-xl border border-[var(--line)] flex items-center justify-between gap-3">
				<div>
					<div className="font-bold text-[var(--ink)]">Клиническая память ИИ</div>
					<div className="text-[11px] text-[var(--muted)]">Сохранено предпочтений врача: {memoryCount} шт.</div>
				</div>
				<button
					type="button"
					onClick={onOpenMemory}
					className="secondary-button text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--line)] cursor-pointer"
				>
					Настроить память
				</button>
			</div>
		</div>
	);
}
