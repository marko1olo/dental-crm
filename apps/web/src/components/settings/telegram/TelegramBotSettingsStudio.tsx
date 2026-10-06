import React, { useId } from "react";
import {
	Activity,
	Bell,
	Building2,
	FileText,
	Globe,
	Layers,
	MessageSquare,
	Mic,
	Phone,
	Sliders,
	Smartphone,
	Sparkles,
	Stethoscope,
	Users,
	Zap,
} from "lucide-react";
import {
	CLINICAL_BOT_PRESETS,
	type BotPreset,
	type BotTone,
} from "./telegramBotPresets";

export interface TelegramBotSettingsStudioProps {
	customTab: "presets" | "tone" | "texts" | "features" | "webapp";
	onCustomTabChange: (
		tab: "presets" | "tone" | "texts" | "features" | "webapp",
	) => void;
	selectedPresetId: BotPreset["id"];
	onSelectPreset: (presetId: BotPreset["id"]) => void;
	selectedTone: BotTone;
	onToneChange: (tone: BotTone) => void;
	customClinicName: string;
	onClinicNameChange: (val: string) => void;
	customWelcomeText: string;
	onWelcomeTextChange: (val: string) => void;
	customPrimaryActionLabel: string;
	onPrimaryActionLabelChange: (val: string) => void;
	enableCitoPain: boolean;
	onEnableCitoPainChange: (val: boolean) => void;
	enableVoiceIntake: boolean;
	onEnableVoiceIntakeChange: (val: boolean) => void;
	enablePostCareGuide: boolean;
	onEnablePostCareGuideChange: (val: boolean) => void;
	enableLeadReminders: boolean;
	onEnableLeadRemindersChange: (val: boolean) => void;
	enableMiniAppBooking: boolean;
	onEnableMiniAppBookingChange: (val: boolean) => void;
	webAppUrl: string;
	onWebAppUrlChange: (val: string) => void;
	clinicPhone: string;
	onClinicPhoneChange: (val: string) => void;
	mapsUrl: string;
	onMapsUrlChange: (val: string) => void;
}

function getPresetIcon(iconName: string) {
	switch (iconName) {
		case "Sparkles":
			return <Sparkles size={18} className="text-amber-500" />;
		case "Users":
			return <Users size={18} className="text-emerald-500" />;
		case "Activity":
			return <Activity size={18} className="text-sky-500" />;
		case "Stethoscope":
			return <Stethoscope size={18} className="text-indigo-500" />;
		case "Building2":
			return <Building2 size={18} className="text-teal-500" />;
		default:
			return <Sparkles size={18} className="text-teal-500" />;
	}
}

export function TelegramBotSettingsStudio(
	props: TelegramBotSettingsStudioProps,
) {
	const {
		customTab,
		onCustomTabChange,
		selectedPresetId,
		onSelectPreset,
		selectedTone,
		onToneChange,
		customClinicName,
		onClinicNameChange,
		customWelcomeText,
		onWelcomeTextChange,
		customPrimaryActionLabel,
		onPrimaryActionLabelChange,
		enableCitoPain,
		onEnableCitoPainChange,
		enableVoiceIntake,
		onEnableVoiceIntakeChange,
		enablePostCareGuide,
		onEnablePostCareGuideChange,
		enableLeadReminders,
		onEnableLeadRemindersChange,
		enableMiniAppBooking,
		onEnableMiniAppBookingChange,
		webAppUrl,
		onWebAppUrlChange,
		clinicPhone,
		onClinicPhoneChange,
		mapsUrl,
		onMapsUrlChange,
	} = props;

	const clinicNameId = useId();
	const welcomeTextId = useId();
	const primaryActionId = useId();
	const webAppUrlId = useId();
	const clinicPhoneId = useId();
	const mapsUrlId = useId();

	return (
		<div className="tg-studio-card tg-config-card">
			<div className="tg-card-header">
				<div className="tg-card-header-icon">
					<Layers size={20} className="text-teal-600 dark:text-teal-400" />
				</div>
				<div className="tg-card-header-body">
					<h3 className="tg-card-title">Клинические пресеты и кастомизация</h3>
					<p className="tg-card-subtitle">
						Выберите готовую концепцию под профиль клиники или настройте индивидуально.
					</p>
				</div>
			</div>

			<div className="tg-config-tabs" role="tablist">
				<button
					type="button"
					role="tab"
					aria-selected={customTab === "presets"}
					onClick={() => onCustomTabChange("presets")}
					className={`tg-tab-btn ${customTab === "presets" ? "active" : ""}`}
				>
					<Sparkles size={14} />
					<span>Готовые пресеты</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={customTab === "tone"}
					onClick={() => onCustomTabChange("tone")}
					className={`tg-tab-btn ${customTab === "tone" ? "active" : ""}`}
				>
					<MessageSquare size={14} />
					<span>Тон общения</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={customTab === "texts"}
					onClick={() => onCustomTabChange("texts")}
					className={`tg-tab-btn ${customTab === "texts" ? "active" : ""}`}
				>
					<Sliders size={14} />
					<span>Тексты и кнопки</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={customTab === "features"}
					onClick={() => onCustomTabChange("features")}
					className={`tg-tab-btn ${customTab === "features" ? "active" : ""}`}
				>
					<Zap size={14} />
					<span>Клинические модули</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={customTab === "webapp"}
					onClick={() => onCustomTabChange("webapp")}
					className={`tg-tab-btn ${customTab === "webapp" ? "active" : ""}`}
				>
					<Globe size={14} />
					<span>Онлайн-запись WebApp</span>
				</button>
			</div>

			{customTab === "presets" && (
				<div className="tg-tab-pane">
					<div className="tg-presets-grid">
						{Object.values(CLINICAL_BOT_PRESETS).map((p) => {
							const isSelected = p.id === selectedPresetId;
							return (
								<button
									key={p.id}
									type="button"
									onClick={() => onSelectPreset(p.id)}
									className={`tg-preset-card ${isSelected ? "tg-preset-selected" : ""}`}
								>
									<div className="tg-preset-head">
										<div className="tg-preset-icon-box">
											{getPresetIcon(p.icon)}
										</div>
										<div>
											<span className="tg-preset-badge">{p.badge}</span>
											<h4 className="tg-preset-title">{p.name}</h4>
										</div>
									</div>

									<p className="tg-preset-desc">{p.description}</p>

									<div className="tg-preset-features-list">
										{p.highlightFeatures.slice(0, 3).map((feat, idx) => (
											// biome-ignore lint/suspicious/noArrayIndexKey: feature chips
											<span key={idx} className="tg-preset-feat-tag">
												{feat}
											</span>
										))}
									</div>

									<div className="tg-preset-footer">
										<span className="tg-preset-cta-hint">
											{isSelected ? "Активный пресет" : "Выбрать этот пресет →"}
										</span>
									</div>
								</button>
							);
						})}
					</div>
				</div>
			)}

			{customTab === "tone" && (
				<div className="tg-tab-pane">
					<p className="tg-pane-intro">
						Выберите стиль коммуникации, который бот использует в ответах пациентам:
					</p>
					<div className="tg-tone-options">
						{[
							{
								id: "premium",
								title: "Премиум & Престиж",
								desc: "Подчеркнутая забота, премиальный сервис, персональный координатор, эстетические стандарты.",
							},
							{
								id: "caring",
								title: "Заботливый семейный",
								desc: "Максимально теплое обращение, акцент на безболезненное лечение, психологический комфорт для детей и родителей.",
							},
							{
								id: "concise",
								title: "Лаконичный медицинский",
								desc: "Четкий профессиональный стиль доказательной медицины, конкретные факты, прозрачные цены без лишней воды.",
							},
						].map((item) => (
							<label
								key={item.id}
								className={`tg-tone-card ${selectedTone === item.id ? "selected" : ""}`}
							>
								<input
									type="radio"
									name="tone_choice"
									checked={selectedTone === item.id}
									onChange={() => onToneChange(item.id as BotTone)}
									className="sr-only"
								/>
								<div>
									<h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
										{item.title}
									</h4>
									<p className="text-xs text-slate-600 dark:text-slate-400">
										{item.desc}
									</p>
								</div>
							</label>
						))}
					</div>
				</div>
			)}

			{customTab === "texts" && (
				<div className="tg-tab-pane">
					<div className="tg-form-group">
						<label htmlFor={clinicNameId} className="tg-label">
							Название клиники / бота в шапке
						</label>
						<input
							id={clinicNameId}
							type="text"
							value={customClinicName}
							onChange={(e) => onClinicNameChange(e.target.value)}
							className="tg-input"
						/>
					</div>

					<div className="tg-form-group">
						<label htmlFor={welcomeTextId} className="tg-label">
							Приветственное сообщение (/start)
						</label>
						<textarea
							id={welcomeTextId}
							rows={4}
							value={customWelcomeText}
							onChange={(e) => onWelcomeTextChange(e.target.value)}
							className="tg-textarea"
						/>
						<small className="tg-help-text">
							Отображается сразу после того, как пациент нажал «Запустить» в Telegram.
						</small>
					</div>

					<div className="tg-form-group">
						<label htmlFor={primaryActionId} className="tg-label">
							Текст главной кнопки действия (CTA)
						</label>
						<input
							id={primaryActionId}
							type="text"
							value={customPrimaryActionLabel}
							onChange={(e) => onPrimaryActionLabelChange(e.target.value)}
							className="tg-input"
						/>
					</div>
				</div>
			)}

			{customTab === "features" && (
				<div className="tg-tab-pane">
					<div className="tg-features-list">
						<label className="tg-feature-toggle-row">
							<div>
								<strong className="block text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
									<Zap size={14} className="text-amber-500" /> Кнопка экстренной помощи при острой боли (CITO)
								</strong>
								<span className="text-xs text-slate-500 dark:text-slate-400">
									Выводит памятку первой помощи и телефон дежурного врача для срочного приема.
								</span>
							</div>
							<input
								type="checkbox"
								checked={enableCitoPain}
								onChange={(e) => onEnableCitoPainChange(e.target.checked)}
								className="toggle-switch"
							/>
						</label>

						<label className="tg-feature-toggle-row">
							<div>
								<strong className="block text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
									<Mic size={14} className="text-sky-500" /> Прием голосовых обращений от пациентов
								</strong>
								<span className="text-xs text-slate-500 dark:text-slate-400">
									Пациент может надиктовать жалобы голосом — система переведет аудио в текст для администратора.
								</span>
							</div>
							<input
								type="checkbox"
								checked={enableVoiceIntake}
								onChange={(e) => onEnableVoiceIntakeChange(e.target.checked)}
								className="toggle-switch"
							/>
						</label>

						<label className="tg-feature-toggle-row">
							<div>
								<strong className="block text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
									<FileText size={14} className="text-teal-500" /> Авто-отправка памяток после стоматологических вмешательств
								</strong>
								<span className="text-xs text-slate-500 dark:text-slate-400">
									После закрытия визита бот присылает пациенту рекомендации по уходу.
								</span>
							</div>
							<input
								type="checkbox"
								checked={enablePostCareGuide}
								onChange={(e) => onEnablePostCareGuideChange(e.target.checked)}
								className="toggle-switch"
							/>
						</label>

						<label className="tg-feature-toggle-row">
							<div>
								<strong className="block text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
									<Bell size={14} className="text-indigo-500" /> Напоминания за 24ч и за 2ч с навигацией
								</strong>
								<span className="text-xs text-slate-500 dark:text-slate-400">
									Снижает неявку (No-Show) на прием до минимума.
								</span>
							</div>
							<input
								type="checkbox"
								checked={enableLeadReminders}
								onChange={(e) => onEnableLeadRemindersChange(e.target.checked)}
								className="toggle-switch"
							/>
						</label>
					</div>
				</div>
			)}

			{customTab === "webapp" && (
				<div className="tg-tab-pane">
					<div className="tg-form-group">
						<label className="tg-feature-toggle-row mb-4">
							<div>
								<strong className="block text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
									<Smartphone size={14} className="text-teal-500" /> Telegram Mini App (WebApp) для прямой онлайн-записи
								</strong>
								<span className="text-xs text-slate-500 dark:text-slate-400">
									При нажатии на кнопку в Telegram открывается полноценное окно выбора врача и времени.
								</span>
							</div>
							<input
								type="checkbox"
								checked={enableMiniAppBooking}
								onChange={(e) => onEnableMiniAppBookingChange(e.target.checked)}
								className="toggle-switch"
							/>
						</label>
					</div>

					<div className="tg-form-group">
						<label htmlFor={webAppUrlId} className="tg-label">
							URL защищенного пациентского портала / WebApp
						</label>
						<input
							id={webAppUrlId}
							type="url"
							value={webAppUrl}
							onChange={(e) => onWebAppUrlChange(e.target.value)}
							className="tg-input"
							placeholder="https://portal.clinic.ru"
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div className="tg-form-group">
							<label htmlFor={clinicPhoneId} className="tg-label">
								Телефон клиники
							</label>
							<input
								id={clinicPhoneId}
								type="tel"
								value={clinicPhone}
								onChange={(e) => onClinicPhoneChange(e.target.value)}
								className="tg-input"
							/>
						</div>
						<div className="tg-form-group">
							<label htmlFor={mapsUrlId} className="tg-label">
								Ссылка на Яндекс.Карты / 2GIS
							</label>
							<input
								id={mapsUrlId}
								type="url"
								value={mapsUrl}
								onChange={(e) => onMapsUrlChange(e.target.value)}
								className="tg-input"
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
