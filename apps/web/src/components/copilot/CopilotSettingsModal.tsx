/**
 * @file CopilotSettingsModal.tsx
 * @description Dedicated AI & Copilot settings modal: Trust Level, Provider/Model,
 * Extended Thinking & CoT, Clinical Specialization, Desktop Dropzones (Mandate 8b <= 350 lines).
 */

import React, { useState } from "react";
import {
	Brain, Check, Cpu, Eye, HardDrive, Key, Layers, Lock,
	ShieldAlert, ShieldCheck, Sliders, Sparkles, X, Zap
} from "lucide-react";
import {
	useCopilotStore,
	type AiProvider,
	type AiSpeedMode,
	type AiTrustLevel,
	type ClinicalSpecialization,
	type DiaryTemplate,
} from "../../store/copilotStore";
import { showToast } from "../GlobalToast";

export interface CopilotSettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	onOpenMemoryTab?: () => void;
}

const TRUST_LEVELS: Array<{
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
		description: "ИИ запрашивает явное подтверждение на каждое действие: правка одонтограммы, назначение плана, чтение файлов.",
		icon: Lock,
	},
	{
		id: "balanced",
		title: "Сбалансированный (Копайлот)",
		badge: "Рекомендуемый",
		description: "Безопасные действия выполняются сразу (поиск, черновик SOAP, сверка норм). Финансы и удаления требуют подтверждения.",
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

const MODELS: Array<{ id: string; provider: AiProvider; label: string; note: string }> = [
	{ id: "gemini-2.5-flash", provider: "gemini", label: "Gemini 2.5 Flash", note: "Мгновенный отклик, оптимально у кресла" },
	{ id: "gemini-2.5-pro", provider: "gemini", label: "Gemini 2.5 Pro", note: "Глубокий анализ КЛКТ и сложных патологий" },
	{ id: "gpt-4o", provider: "openai", label: "OpenAI GPT-4o", note: "Мультимодальный клинический разбор" },
	{ id: "claude-3-7-sonnet", provider: "anthropic", label: "Claude 3.7 Sonnet", note: "Гибридный Reasoner с CoT" },
	{ id: "ollama-deepseek-r1", provider: "local", label: "Ollama / DeepSeek R1", note: "Локальный офлайн-контур на ПК" },
];

export function CopilotSettingsModal({ isOpen, onClose, onOpenMemoryTab }: CopilotSettingsModalProps) {
	const settings = useCopilotStore((s) => s.settings);
	const memoryCount = useCopilotStore((s) => s.memoryFacts.length);
	const updateSettings = useCopilotStore((s) => s.updateSettings);

	const [trustLevel, setTrustLevelState] = useState<AiTrustLevel>(settings.trustLevel);
	const [model, setModelState] = useState<string>(settings.model);
	const [speedMode, setSpeedModeState] = useState<AiSpeedMode>(settings.speedMode);
	const [showThinkingProcess, setShowThinkingState] = useState<boolean>(settings.showThinkingProcess);
	const [clinicalSpecialization, setSpecState] = useState<ClinicalSpecialization>(settings.clinicalSpecialization);
	const [diaryTemplate, setDiaryTemplateState] = useState<DiaryTemplate>(settings.diaryTemplate);
	const [localDropzonePath, setDropzoneState] = useState<string>(settings.localDropzonePath);

	React.useEffect(() => {
		if (!isOpen) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const handleSave = () => {
		const targetModel = MODELS.find((m) => m.id === model);
		updateSettings({
			trustLevel,
			model,
			provider: targetModel?.provider || "gemini",
			speedMode,
			showThinkingProcess,
			clinicalSpecialization,
			diaryTemplate,
			localDropzonePath,
		});
		showToast("Настройки ИИ успешно сохранены", "success");
		onClose();
	};

	return (
		<div className="fixed inset-0 z-[99995] flex items-center justify-center p-3 max-md:p-0 max-md:items-end">
			<div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
			<div className="relative z-10 w-full max-w-xl max-h-[92vh] flex flex-col bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-2xl max-md:rounded-b-none border border-[var(--line)] shadow-2xl overflow-hidden">
				{/* Шапка */}
				<header className="px-5 py-3.5 border-b border-[var(--line)] flex items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/12 border border-[var(--teal,#0d9488)]/30 flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
							<Sliders size={16} />
						</div>
						<div className="min-w-0">
							<h3 className="text-sm font-bold text-[var(--ink)] truncate">Настройки ИИ и Копилота</h3>
							<p className="text-[11px] text-[var(--muted)] truncate">Уровень доверия, нейросетевая модель и автономия у кресла</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="icon-button w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--line)] hover:bg-[var(--line)] cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={15} />
					</button>
				</header>

				{/* Контент настроек со скроллом */}
				<div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
					{/* 1. Уровень доверия к ИИ */}
					<section className="space-y-2">
						<div className="flex items-center justify-between">
							<label className="font-bold text-[var(--ink)] flex items-center gap-1.5">
								<ShieldAlert size={14} className="text-[var(--teal,#0d9488)]" />
								<span>Уровень доверия к действиям ИИ</span>
							</label>
							<span className="text-[10px] text-[var(--muted)]">Защита от случайных мутаций</span>
						</div>
						<div className="grid grid-cols-1 gap-2">
							{TRUST_LEVELS.map((lvl) => {
								const isSelected = trustLevel === lvl.id;
								const Icon = lvl.icon;
								return (
									<button
										key={lvl.id}
										type="button"
										onClick={() => setTrustLevelState(lvl.id)}
										className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
											isSelected
												? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.08))] shadow-sm"
												: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft,#f8fafc)]"
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
											<p className="mt-1 text-[11px] text-[var(--muted)] leading-relaxed">{lvl.description}</p>
										</div>
									</button>
								);
							})}
						</div>
					</section>

					{/* 2. Нейросетевая модель */}
					<section className="space-y-2">
						<label className="font-bold text-[var(--ink)] flex items-center gap-1.5">
							<Cpu size={14} className="text-[var(--teal,#0d9488)]" />
							<span>Клиническая языковая модель</span>
						</label>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							{MODELS.map((m) => {
								const isSelected = model === m.id;
								return (
									<button
										key={m.id}
										type="button"
										onClick={() => setModelState(m.id)}
										className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
											isSelected
												? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.08))]"
												: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)]"
										}`}
									>
										<div className="flex items-center justify-between">
											<span className="font-bold text-[var(--ink)]">{m.label}</span>
											{isSelected && <Check size={13} className="text-[var(--teal,#0d9488)]" />}
										</div>
										<p className="mt-0.5 text-[10px] text-[var(--muted)] truncate">{m.note}</p>
									</button>
								);
							})}
						</div>
					</section>

					{/* 3. Скорость и глубина рассуждения (Extended Thinking / CoT) */}
					<section className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] space-y-3">
						<div className="flex items-center justify-between gap-2">
							<div>
								<span className="font-bold text-[var(--ink)] flex items-center gap-1.5">
									<Brain size={14} className="text-[var(--teal,#0d9488)]" />
									<span>Режим клинического консилиума</span>
								</span>
								<p className="text-[10px] text-[var(--muted)]">Глубокое EBM рассуждение со скрытой цепочкой мыслей (CoT)</p>
							</div>
							<div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line)]">
								<button
									type="button"
									onClick={() => setSpeedModeState("turbo")}
									className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
										speedMode === "turbo" ? "bg-[var(--teal,#0d9488)] text-white shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent"
									}`}
								>
									Турбо
								</button>
								<button
									type="button"
									onClick={() => setSpeedModeState("deep_reasoning")}
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
								onChange={(e) => setShowThinkingState(e.target.checked)}
								className="rounded text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)]"
							/>
							<span>Показывать анимированный блок хода мыслей (CoT) при формировании ответов</span>
						</label>
					</section>

					{/* 4. Клиническая специализация и шаблоны */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<section className="space-y-1.5">
							<label className="font-bold text-[var(--ink)]">Специализация врача</label>
							<select
								value={clinicalSpecialization}
								onChange={(e) => setSpecState(e.target.value as ClinicalSpecialization)}
								className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs cursor-pointer focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
							>
								<option value="therapy">Терапевтическая стоматология</option>
								<option value="orthopedics">Ортопедическая стоматология</option>
								<option value="surgery">Хирургия и имплантология</option>
								<option value="orthodontics">Ортодонтия</option>
								<option value="perio">Пародонтология</option>
								<option value="pediatric">Детская стоматология</option>
							</select>
						</section>

						<section className="space-y-1.5">
							<label className="font-bold text-[var(--ink)]">Формат дневника приёма</label>
							<select
								value={diaryTemplate}
								onChange={(e) => setDiaryTemplateState(e.target.value as DiaryTemplate)}
								className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs cursor-pointer focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
							>
								<option value="soap">SOAP (Субъективно, Объективно, Оценка, План)</option>
								<option value="form043">Медицинская карта приёма</option>
								<option value="express">Краткий экспресс-протокол приёма</option>
							</select>
						</section>
					</div>

					{/* 5. Рабочая станция на ПК & Томографы */}
					<section className="space-y-1.5">
						<label className="font-bold text-[var(--ink)] flex items-center gap-1.5">
							<HardDrive size={14} className="text-[var(--teal,#0d9488)]" />
							<span>Сетевая папка визиографов (ПК Dropzone)</span>
						</label>
						<input
							type="text"
							value={localDropzonePath}
							onChange={(e) => setDropzoneState(e.target.value)}
							placeholder="C:\Radiology\Export или \\server\export"
							className="w-full h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono text-[11px] focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
						/>
						<p className="text-[10px] text-[var(--muted)]">ИИ автоматически считывает новые RVG/КЛКТ снимки из этой папки на рабочей станции ПК.</p>
					</section>

					{/* 6. Память ассистента */}
					<div className="p-3 rounded-xl border border-[var(--line)] flex items-center justify-between gap-3">
						<div>
							<div className="font-bold text-[var(--ink)]">Клиническая память ИИ</div>
							<div className="text-[11px] text-[var(--muted)]">Сохранено предпочтений врача: {memoryCount} шт.</div>
						</div>
						<button
							type="button"
							onClick={() => {
								onClose();
								onOpenMemoryTab?.();
							}}
							className="secondary-button text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--line)] cursor-pointer"
						>
							Настроить память
						</button>
					</div>
				</div>

				{/* Нижняя панель действий */}
				<footer className="px-5 py-3 border-t border-[var(--line)] bg-[var(--paper)] flex items-center justify-end gap-2 shrink-0">
					<button
						type="button"
						onClick={onClose}
						className="secondary-button h-10 px-4 rounded-xl border border-[var(--line)] text-xs font-semibold hover:bg-[var(--line)] cursor-pointer"
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={handleSave}
						className="primary-button h-10 px-5 rounded-xl bg-[var(--teal,#0d9488)] text-white text-xs font-bold shadow-sm hover:opacity-95 cursor-pointer"
					>
						Сохранить настройки
					</button>
				</footer>
			</div>
		</div>
	);
}
