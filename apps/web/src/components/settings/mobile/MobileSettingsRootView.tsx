/**
 * apps/web/src/components/settings/mobile/MobileSettingsRootView.tsx
 *
 * Root Mobile Settings View compliant with Apple iOS Settings Human Interface Guidelines:
 * - Large Title "Настройки клиники"
 * - Profile Inset Card of the clinic (mode, requisites preview, autonomy badge)
 * - Grouped Inset Lists partitioned into 5 statutory & operational sections:
 *   1. Клиника и филиалы (Реквизиты, Касса 54-ФЗ, График и кресла)
 *   2. Прейскурант и услуги 804н (Номенклатура, базовые цены, ИИ-импорт)
 *   3. Врачи и персонал (Сотрудники, Доступы RBAC, Мотивация)
 *   4. Клинические стандарты (Протоколы, Правила безопасности, Техкарты BOM)
 *   5. Интеграции и безопасность (Мессенджеры, Онлайн-запись, Перенос данных, Аудит 152-ФЗ)
 * - Rows min-height >= 52px, touch target >= 44x44px, ChevronRight
 * - Search filter for rapid setting lookup
 * - 0px horizontal drift
 */

import React, { useState, useMemo } from "react";
import {
	Building2,
	CalendarDays,
	ChevronRight,
	CreditCard,
	FileSpreadsheet,
	FileText,
	HardDriveDownload,
	Layers,
	Lock,
	MessageSquare,
	Percent,
	Search,
	ShieldAlert,
	ShieldCheck,
	Users,
	X,
	Globe,
	Tag,
} from "lucide-react";
import { SovereignScalePresetsCard } from "../../onboarding/SovereignScalePresetsCard";
import { useClinicCapabilities } from "../../../hooks/useClinicCapabilities";

export interface MobileSettingsRootViewProps {
	// biome-ignore lint/suspicious/noExplicitAny: app logic bag
	readonly appLogic: Record<string, any>;
	readonly onSelectSection: (sectionId: string) => void;
}

interface SettingItem {
	id: string;
	title: string;
	subtitle: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	iconBg: string;
	iconColor: string;
	badge?: string;
}

interface SettingGroup {
	id: string;
	header: string;
	items: SettingItem[];
}

export const MobileSettingsRootView: React.FC<MobileSettingsRootViewProps> = ({
	appLogic,
	onSelectSection,
}) => {
	const { dashboard } = appLogic;
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const capabilities = useClinicCapabilities(
		dashboard?.clinicSettings?.profile?.mode,
	);

	const SETTING_CATEGORIES = [
		{ id: "all", label: "Все" },
		{ id: "clinic_org", label: "Клиника" },
		{ id: "prices_services", label: "Прейскурант" },
		{ id: "staff_team", label: "Персонал" },
		{ id: "clinical_standards", label: "Стандарты" },
		{ id: "integrations_sync", label: "Интеграции" },
	];

	const clinicName =
		dashboard?.clinicSettings?.profile?.clinicName ||
		dashboard?.clinicName ||
		"Стоматология ДЕНТЕ";
	const serviceCatalogCount = (dashboard?.serviceCatalog ?? []).length;
	const staffCount = (dashboard?.clinicSettings?.staff ?? []).length;
	const chairsCount = (dashboard?.clinicSettings?.chairs ?? []).length;

	const SETTINGS_GROUPS: SettingGroup[] = useMemo(
		() => [
			{
				id: "clinic_org",
				header: "Клиника и филиалы",
				items: [
					{
						id: "clinic",
						title: "Реквизиты и юрлицо",
						subtitle: "ИНН, ОГРН, лицензия, адрес",
						icon: Building2,
						iconBg: "var(--paper-muted)",
						iconColor: "var(--teal)",
					},
					{
						id: "clinic_fiscal",
						title: "Касса и 54-ФЗ",
						subtitle: "ККТ, фискальные чеки, НДС",
						icon: CreditCard,
						iconBg: "var(--paper-muted)",
						iconColor: "var(--ink)",
					},
					{
						id: "clinic_schedule",
						title: "График работы и кресла",
						subtitle:
							chairsCount > 0
								? `Часы приёма, ${chairsCount} установок`
								: "Часы приёма, кресла",
						icon: CalendarDays,
						iconBg: "var(--paper-muted)",
						iconColor: "var(--ink)",
					},
				],
			},
			{
				id: "prices_services",
				header: "Прейскурант и услуги",
				items: [
					{
						id: "prices",
						title: "Прейскурант услуг",
						subtitle: "Номенклатура услуг, базовые тарифы",
						icon: Tag,
						iconBg: "var(--paper-muted)",
						iconColor: "var(--teal)",
						badge:
							serviceCatalogCount > 0 ? `${serviceCatalogCount} услуг` : "Настроить",
					},
					{
						id: "prices_import",
						title: "Импорт прайс-листа",
						subtitle: "Excel, CSV, сопоставление тарифов",
						icon: FileSpreadsheet,
						iconBg: "var(--paper-muted)",
						iconColor: "var(--ink)",
					},
				],
			},
			{
				id: "staff_team",
				header: "Врачи и персонал",
				items: [
					{
						id: "staff",
						title: "Врачи и сотрудники",
						subtitle: "Персонал клиники, график, телефоны",
						icon: Users,
						iconBg: "var(--paper-muted)",
						iconColor: "var(--teal)",
						badge: staffCount > 0 ? `${staffCount} в штате` : "Добавить",
					},
					{
						id: "access",
						title: "Права доступа",
						subtitle: "Роли сотрудников, матрица доступов",
						icon: Lock,
						iconBg: "var(--paper-muted)",
						iconColor: "var(--ink)",
					},
					{
						id: "commissions",
						title: "Комиссии и мотивация",
						subtitle: "Ставки врачей %, сдельная оплата",
						icon: Percent,
						iconBg: "var(--paper-muted)",
						iconColor: "var(--ink)",
					},
				],
			},
			{
				id: "clinical_standards",
				header: "Клинические стандарты",
				items: [
					{
						id: "protocols",
						title: "Протоколы лечения",
						subtitle: "Шаблоны дневника приёма, электронная карта",
						icon: FileText,
						iconBg: "var(--paper-muted)",
						iconColor: "var(--teal)",
					},
					{
						id: "rules",
						title: "Клинические правила и контроль",
						subtitle: "Безопасность приёма и уведомления",
						icon: ShieldCheck,
						iconBg: "var(--paper-muted)",
						iconColor: "var(--ink)",
					},
					{
						id: "procedure-boms",
						title: "Техкарты расхода материалов",
						subtitle: "Нормы списания расходных материалов",
						icon: Layers,
						iconBg: "var(--paper-muted)",
						iconColor: "var(--ink)",
					},
				],
			},
			{
				id: "integrations_sync",
				header: "Интеграции и модули",
				items: [
					{
						id: "messengers",
						title: "Мессенджеры и рассылки",
						subtitle: "WhatsApp, Telegram, напоминания",
						icon: MessageSquare,
						iconBg: "var(--paper-muted)",
						iconColor: "var(--teal)",
					},
					{
						id: "booking",
						title: "Онлайн-запись",
						subtitle: "Виджет для сайта клиники и карт",
						icon: Globe,
						iconBg: "var(--paper-muted)",
						iconColor: "var(--ink)",
					},
					{
						id: "imports",
						title: "Перенос данных",
						subtitle: "Импорт из IDENT, DentalPRO, Инфодент",
						icon: HardDriveDownload,
						iconBg: "var(--paper-muted)",
						iconColor: "var(--ink)",
					},
					{
						id: "audit",
						title: "Журнал аудита",
						subtitle: "Безопасность и журнал доступа",
						icon: ShieldAlert,
						iconBg: "var(--paper-muted)",
						iconColor: "var(--ink)",
					},
				],
			},
		],
		[serviceCatalogCount, staffCount, chairsCount],
	);

	// Search and category filtering across all sections
	const filteredGroups = useMemo(() => {
		let groups = SETTINGS_GROUPS;
		if (selectedCategory !== "all") {
			groups = groups.filter((g) => g.id === selectedCategory);
		}
		if (!searchQuery.trim()) return groups;
		const q = searchQuery.toLowerCase().trim();
		return groups
			.map((group) => {
				const matchingItems = group.items.filter(
					(item) =>
						item.title.toLowerCase().includes(q) ||
						item.subtitle.toLowerCase().includes(q) ||
						group.header.toLowerCase().includes(q),
				);
				return { ...group, items: matchingItems };
			})
			.filter((group) => group.items.length > 0);
	}, [SETTINGS_GROUPS, searchQuery, selectedCategory]);

	return (
		<div
			className="mobile-settings-root flex flex-col w-full max-w-[100vw] overflow-x-clip pb-24"
			data-testid="mobile-settings-root-view"
		>
			{/* Header */}
			<div className="px-4 pt-3 pb-1 flex flex-col gap-1.5">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--primary)] m-0">
						Конфигурация клиники
					</p>
					<span
						className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)] max-w-full"
					>
						<ShieldCheck size={12} className="shrink-0" />
						<span className="truncate">{capabilities.presetLabel}</span>
					</span>
				</div>
				<h1 className="text-[22px] font-extrabold text-[var(--ink)] tracking-tight leading-tight m-0">
					Настройки
				</h1>
			</div>

			{/* Search Input */}
			<div className="px-4 py-1.5">
				<div className="dente-search-wrap">
					<Search
						size={14}
						className="dente-search-icon"
						aria-hidden="true"
					/>
					<input
						type="search"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по параметрам клиники..."
						className="dente-search-input"
						data-testid="input-mobile-settings-search"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="dente-search-clear"
							aria-label="Очистить поиск"
						>
							<X size={14} />
						</button>
					)}
				</div>
			</div>

			{/* Category Filter Chips */}
			<div className="px-4 pb-2 overflow-x-auto">
				<div
					className="dente-filter-chips flex-nowrap"
					style={{ flexWrap: "nowrap", overflowX: "auto" }}
					role="group"
					aria-label="Категории настроек"
				>
					{SETTING_CATEGORIES.map((cat) => (
						<button
							key={cat.id}
							type="button"
							onClick={() => setSelectedCategory(cat.id)}
							className={`dente-filter-chip shrink-0 whitespace-nowrap ${selectedCategory === cat.id ? "active" : ""}`}
							data-active={selectedCategory === cat.id}
						>
							<span>{cat.label}</span>
						</button>
					))}
				</div>
			</div>

			{/* Clinic Identity Card */}
			{!searchQuery && (
				<div className="px-4 py-1">
					<div
						onClick={() => onSelectSection("clinic")}
						className="p-3.5 rounded-[16px] bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between gap-3 shadow-xs active:bg-[var(--paper-soft)] cursor-pointer transition-colors"
						role="button"
						tabIndex={0}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onSelectSection("clinic");
							}
						}}
						data-testid="mobile-clinic-profile-card"
					>
						<div className="flex items-center gap-3 min-w-0 flex-1">
							<div
								className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
								style={{
									backgroundColor: "var(--teal)",
									color: "#ffffff",
								}}
							>
								<Building2 size={22} />
							</div>
							<div className="min-w-0 flex-1">
								<h3 className="text-[15px] font-bold text-[var(--ink)] leading-snug break-words">
									{clinicName}
								</h3>
								<div className="flex items-center flex-wrap gap-1.5 mt-0.5">
									<span className="text-[12px] text-[var(--muted)]">
										{capabilities.presetLabel}
									</span>
								</div>
							</div>
						</div>
						<ChevronRight size={18} className="text-[var(--muted)] shrink-0" />
					</div>
				</div>
			)}

			{/* Grouped Inset Sections */}
			<div className="space-y-5 mt-2 px-4">
				{filteredGroups.map((group) => (
					<div key={group.id} className="space-y-1.5">
						{/* Group Header */}
						<h2 className="px-2 text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">
							{group.header}
						</h2>

						{/* Grouped Card Container */}
						<div className="rounded-[16px] bg-[var(--paper)] border border-[var(--line)] overflow-hidden divide-y divide-[var(--line-subtle)] shadow-xs">
							{group.items.map((item) => {
								const Icon = item.icon;
								return (
									<div
										key={item.id}
										onClick={() => onSelectSection(item.id)}
										className="flex items-center justify-between p-3.5 min-h-[54px] active:bg-[var(--paper-soft)] cursor-pointer transition-colors"
										role="button"
										tabIndex={0}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												onSelectSection(item.id);
											}
										}}
										data-testid={`mobile-settings-row-${item.id}`}
									>
										{/* Icon + Title/Subtitle */}
										<div className="flex items-center gap-3 min-w-0 pr-2 flex-1">
											<div
												className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
												style={{
													backgroundColor: item.iconBg,
													color: item.iconColor,
												}}
											>
												<Icon size={17} />
											</div>

											<div className="min-w-0 flex-1">
												<h4 className="text-[15px] font-semibold text-[var(--ink)] leading-snug">
													{item.title}
												</h4>
												<p className="text-[12px] text-[var(--muted)] leading-snug mt-0.5">
													{item.subtitle}
												</p>
											</div>
										</div>

										{/* Badge + Chevron */}
										<div className="flex items-center gap-2 shrink-0">
											{item.badge && (
												<span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]">
													{item.badge}
												</span>
											)}
											<ChevronRight
												size={16}
												className="text-[var(--muted)] shrink-0"
											/>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				))}

				{filteredGroups.length === 0 && (
					<div className="p-6 text-center rounded-2xl bg-[var(--paper)] border border-[var(--line)]">
						<Search size={28} className="text-[var(--muted)] mx-auto mb-2" />
						<p className="text-[14px] font-semibold text-[var(--ink)]">
							Ничего не найдено
						</p>
						<p className="text-[12px] text-[var(--muted)] mt-1">
							Попробуйте изменить поисковый запрос
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default MobileSettingsRootView;

