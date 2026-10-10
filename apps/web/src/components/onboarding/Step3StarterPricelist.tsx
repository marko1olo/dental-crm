import React from "react";
import {
	STARTER_15_ESSENTIAL_DENTAL_SERVICES,
	type StarterDentalService,
} from "@dental/shared";
import {
	BadgePercent,
	Check,
	CheckSquare,
	Clock,
	Coins,
	FileText,
	Info,
	Sparkles,
	Square,
	Zap,
} from "lucide-react";
import { useOnboardingStore } from "../../store/onboardingStore";

export function Step3StarterPricelist() {
	const {
		selectedServiceCodes,
		toggleServiceCode,
		selectAllServices,
		deselectAllServices,
		seedStarterPricelist,
		seedStatus,
		seedCount,
	} = useOnboardingStore();

	const categoryLabels: Record<string, { label: string; className: string }> = {
		consultation: { label: "Консультация", className: "cat-consultation" },
		therapy: { label: "Терапия", className: "cat-therapy" },
		surgery: { label: "Хирургия", className: "cat-surgery" },
		hygiene: { label: "Гигиена", className: "cat-hygiene" },
		imaging: { label: "Прицельный снимок / РВГ", className: "cat-imaging" },
		prosthetics: { label: "Ортопедия", className: "cat-prosthetics" },
		orthodontics: { label: "Ортодонтия", className: "cat-orthodontics" },
		periodontology: { label: "Пародонт", className: "cat-periodont" },
		documents: { label: "Документы", className: "cat-documents" },
		other: { label: "Прочее", className: "cat-other" },
	};

	const selectedServices = STARTER_15_ESSENTIAL_DENTAL_SERVICES.filter((s) =>
		selectedServiceCodes.includes(s.code),
	);

	const totalRub = selectedServices.reduce((sum, s) => sum + s.priceRub, 0);
	const allSelected = selectedServiceCodes.length === STARTER_15_ESSENTIAL_DENTAL_SERVICES.length;
	const noneSelected = selectedServiceCodes.length === 0;

	const formatPrice = (rub: number) => {
		return new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			maximumFractionDigits: 0,
		}).format(rub);
	};

	return (
		<div className="onboarding-step-body animate-fade-in">
			<div className="step-intro-header">
				<div className="step-intro-badge">
					<Coins size={14} aria-hidden="true" />
					<span>Шаг 3 из 3: Прейскурант</span>
				</div>
				<h3>Базовый прейскурант стоматологических услуг</h3>
				<p>
					15 ключевых стоматологических услуг с честными ценами в рублях и копейках.
					Прайс сразу готов к составлению планов лечения, нарядов и чеков.
				</p>
			</div>

			{/* 1-Click Fast Seeding Hero Bar */}
			<div className="starter-seed-hero-box">
				<div className="hero-text-block">
					<div className="hero-title-row">
						<Sparkles size={18} className="hero-sparkle-icon" aria-hidden="true" />
						<strong>Быстрое наполнение прайса</strong>
					</div>
					<p>
						Загружает готовый золотой стандарт: первичный осмотр, анестезия карпульная, лечение кариеса,
						пломбирование композитом, удаление зуба, профгигиена Air-Flow.
					</p>
				</div>
				<button
					type="button"
					className={`hero-seed-action-btn ${seedStatus === "seeded" ? "seeded" : ""}`}
					onClick={() => void seedStarterPricelist()}
					disabled={seedStatus === "seeding"}
				>
					{seedStatus === "seeding" ? (
						<>
							<span className="spinner-icon" aria-hidden="true" />
							Загрузка прейскуранта...
						</>
					) : seedStatus === "seeded" ? (
						<>
							<Check size={16} aria-hidden="true" />
							Услуги загружены ({seedCount || selectedServices.length})
						</>
					) : (
						<>
							<Zap size={16} aria-hidden="true" />
							Загрузить 15 услуг в 1 клик
						</>
					)}
				</button>
			</div>

			{/* Controls & Summary */}
			<div className="pricelist-toolbar-summary">
				<div className="pricelist-selection-actions">
					<button
						type="button"
						className="link-style-btn"
						onClick={selectAllServices}
						disabled={allSelected}
					>
						<CheckSquare size={14} aria-hidden="true" />
						Выбрать все (15)
					</button>
					<span className="toolbar-separator" aria-hidden="true">•</span>
					<button
						type="button"
						className="link-style-btn"
						onClick={deselectAllServices}
						disabled={noneSelected}
					>
						<Square size={14} aria-hidden="true" />
						Снять выбор
					</button>
				</div>

				<div className="pricelist-sum-badge">
					<span>Выбрано: <strong>{selectedServices.length}</strong> из 15</span>
					<span className="sum-divider" aria-hidden="true">|</span>
					<span className="sum-total">Итого: <strong>{formatPrice(totalRub)}</strong></span>
				</div>
			</div>

			{/* 15 Services List */}
			<div className="services-compact-list" role="list">
				{STARTER_15_ESSENTIAL_DENTAL_SERVICES.map((service: StarterDentalService) => {
					const isChecked = selectedServiceCodes.includes(service.code);
					const catInfo = categoryLabels[service.category] ?? {
						label: service.category,
						className: "cat-other",
					};

					return (
						<div
							key={service.code}
							className={`service-compact-row ${isChecked ? "active" : "inactive"}`}
							onClick={() => toggleServiceCode(service.code)}
							role="listitem"
							tabIndex={0}
							onKeyDown={(e) => {
								if (e.key === " " || e.key === "Enter") {
									e.preventDefault();
									toggleServiceCode(service.code);
								}
							}}
						>
							<div className="service-checkbox-cell">
								<input
									type="checkbox"
									checked={isChecked}
									onChange={() => toggleServiceCode(service.code)}
									onClick={(e) => e.stopPropagation()}
									aria-label={`Выбрать услугу ${service.title}`}
								/>
							</div>

							<div className="service-code-cell">
								<code>{service.code}</code>
							</div>

							<div className="service-info-cell">
								<div className="service-title-row">
									<strong className="service-title">{service.title}</strong>
									<span className={`service-cat-badge ${catInfo.className}`}>
										{catInfo.label}
									</span>
								</div>
								{service.description && (
									<span className="service-desc">{service.description}</span>
								)}
							</div>

							<div className="service-meta-cell">
								<span className="service-duration">
									<Clock size={12} aria-hidden="true" />
									{service.durationMinutes} мин
								</span>
								{service.taxDeductible && (
									<span className="service-tax-badge" title="Подлежит налоговому вычету 13% НДФЛ">
										<BadgePercent size={11} aria-hidden="true" />
										13%
									</span>
								)}
							</div>

							<div className="service-price-cell">
								<span className="service-price-amount">
									{formatPrice(service.priceRub)}
								</span>
								<small className="service-kopecks-hint">
									({service.priceKopecks.toLocaleString("ru-RU")} коп)
								</small>
							</div>
						</div>
					);
				})}
			</div>

			<div className="step-tip-box">
				<Info size={16} className="tip-icon" aria-hidden="true" />
				<span>
					Все цены и наименования услуг можно гибко скорректировать в разделе «Настройки → Прейскурант».
					Вы также сможете загрузить свой прайс-лист из Excel в любой момент.
				</span>
			</div>
		</div>
	);
}
