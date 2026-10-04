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
	DollarSign,
	FileSpreadsheet,
	FileText,
	HardDriveDownload,
	Layers,
	Lock,
	MessageSquare,
	Percent,
	Puzzle,
	Search,
	ShieldAlert,
	ShieldCheck,
	SlidersHorizontal,
	Stethoscope,
	Users,
	Wand2,
	X,
	Globe,
	Tag,
} from "lucide-react";

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

	const clinicName = dashboard?.clinicSettings?.profile?.clinicName || dashboard?.clinicName || "Стоматология ДЕНТЕ";
	const clinicMode = dashboard?.clinicSettings?.profile?.mode || "small_clinic";
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
						subtitle: "ИНН, ОГРН, лицензия, юридический адрес",
						icon: Building2,
						iconBg: "rgba(59, 130, 246, 0.12)",
						iconColor: "#2563eb",
					},
					{
						id: "clinic_fiscal",
						title: "Касса и 54-ФЗ",
						subtitle: "Кассовый аппарат ККТ, чеки, ставки НДС",
						icon: CreditCard,
						iconBg: "rgba(16, 185, 129, 0.12)",
						iconColor: "#059669",
					},
					{
						id: "clinic_schedule",
						title: "График работы и кресла",
						subtitle: `Часы приёма, ${chairsCount || 1} стоматологических установок`,
						icon: CalendarDays,
						iconBg: "rgba(99, 102, 241, 0.12)",
						iconColor: "#4f46e5",
					},
				],
			},
			{
				id: "prices_services",
				header: "Прейскурант и услуги (804н)",
				items: [
					{
						id: "prices",
						title: "Прейскурант услуг",
						subtitle: "Официальная номенклатура 804н, базовые цены",
						icon: Tag,
						iconBg: "rgba(13, 148, 136, 0.12)",
						iconColor: "var(--teal)",
						badge: serviceCatalogCount > 0 ? `${serviceCatalogCount} услуг` : "Настроить",
					},
					{
						id: "prices_import",
						title: "Импорт прайс-листа",
						subtitle: "Excel, CSV, умный ИИ-разбор тарифов",
						icon: FileSpreadsheet,
						iconBg: "rgba(20, 184, 166, 0.12)",
						iconColor: "#0d9488",
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
						subtitle: "Список персонала, смены, телефоны",
						icon: Users,
						iconBg: "rgba(168, 85, 247, 0.12)",
						iconColor: "#9333ea",
						badge: staffCount > 0 ? `${staffCount} в штате` : "Добавить",
					},
					{
						id: "access",
						title: "Права доступа (RBAC)",
						subtitle: "Роли, секрет администратора, безопасность",
						icon: Lock,
						iconBg: "rgba(245, 158, 11, 0.12)",
						iconColor: "#d97706",
					},
					{
						id: "commissions",
						title: "Комиссии и мотивация",
						subtitle: "Ставки врачей %, сдельная оплата труда",
						icon: Percent,
						iconBg: "rgba(236, 72, 153, 0.12)",
						iconColor: "#db2777",
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
						subtitle: "Шаблоны дневника приёма, стандарты ЭМК",
						icon: FileText,
						iconBg: "rgba(59, 130, 246, 0.12)",
						iconColor: "#2563eb",
					},
					{
						id: "rules",
						title: "Клинические правила и алерты",
						subtitle: "Безопасность, соматика, аллергоанамнез",
						icon: ShieldCheck,
						iconBg: "rgba(16, 185, 129, 0.12)",
						iconColor: "#059669",
					},
					{
						id: "procedure-boms",
						title: "Техкарты расхода материалов (BOM)",
						subtitle: "Нормы автоматического списания расходников",
						icon: Layers,
						iconBg: "rgba(249, 115, 22, 0.12)",
						iconColor: "#ea580c",
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
						subtitle: "WhatsApp, Telegram, напоминания визитов",
						icon: MessageSquare,
						iconBg: "rgba(34, 197, 94, 0.12)",
						iconColor: "#16a34a",
					},
					{
						id: "booking",
						title: "Онлайн-запись",
						subtitle: "Виджет для сайта клиники и карт (Яндекс, 2ГИС)",
						icon: Globe,
						iconBg: "rgba(6, 182, 212, 0.12)",
						iconColor: "#0891b2",
					},
					{
						id: "imports",
						title: "Перенос данных (Миграция)",
						subtitle: "Импорт из IDENT, DentalPRO, Инфодент",
						icon: HardDriveDownload,
						iconBg: "rgba(100, 116, 139, 0.12)",
						iconColor: "#475569",
					},
					{
						id: "audit",
						title: "Журнал аудита",
						subtitle: "152-ФЗ, безопасность персональных данных",
						icon: ShieldAlert,
						iconBg: "rgba(239, 68, 68, 0.12)",
						iconColor: "#dc2626",
					},
				],
			},
		],
		[serviceCatalogCount, staffCount, chairsCount],
	);

	// Search filtering across all sections
	const filteredGroups = useMemo(() => {
		if (!searchQuery.trim()) return SETTINGS_GROUPS;
		const q = searchQuery.toLowerCase().trim();
		return SETTINGS_GROUPS.map((group) => {
			const matchingItems = group.items.filter(
				(item) =>
					item.title.toLowerCase().includes(q) ||
					item.subtitle.toLowerCase().includes(q) ||
					group.header.toLowerCase().includes(q),
			);
			return { ...group, items: matchingItems };
		}).filter((group) => group.items.length > 0);
	}, [SETTINGS_GROUPS, searchQuery]);

	return (
		<div
			className="mobile-settings-root flex flex-col w-full max-w-[100vw] overflow-x-clip pb-24"
			data-testid="mobile-settings-root-view"
		>
			{/* Apple iOS Large Title Header */}
			<div className="px-4 pt-4 pb-2">
				<p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--teal)] mb-0.5">
					Конфигурация DENTE
				</p>
				<h1 className="text-[28px] font-extrabold text-[var(--ink)] tracking-tight leading-tight">
					Настройки
				</h1>
			</div>

			{/* Search Input */}
			<div className="px-4 py-2">
				<div className="relative flex items-center w-full">
					<Search
						size={15}
						className="absolute left-3.5 text-[var(--muted)] pointer-events-none"
					/>
					<input
						type="search"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по параметрам клиники..."
						className="w-full h-10 min-h-[40px] pr-9 text-[14px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--teal)] transition-all mobile-settings-search-input"
						data-testid="input-mobile-settings-search"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="absolute right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] active:scale-95 transition-transform cursor-pointer"
							aria-label="Очистить поиск"
						>
							<X size={14} />
						</button>
					)}
				</div>
			</div>

			{/* Clinic Identity Card (Apple Health / Apple ID Profile Inset Style) */}
			{!searchQuery && (
				<div className="px-4 py-2">
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
							<div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--teal)] to-cyan-600 text-white flex items-center justify-center shrink-0 shadow-xs">
								<Building2 size={24} />
							</div>
							<div className="min-w-0 flex-1">
								<h3 className="text-[16px] font-bold text-[var(--ink)] truncate leading-tight">
									{clinicName}
								</h3>
								<div className="flex items-center gap-2 mt-0.5">
									<span className="text-[12px] text-[var(--muted)]">
										{clinicMode === "solo_doctor" ? "Частный кабинет" : "Стандартная клиника"}
									</span>
									<span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-800 dark:text-teal-300">
										<ShieldCheck size={10} /> Автономия
									</span>
								</div>
							</div>
						</div>
						<ChevronRight size={18} className="text-[var(--muted)] shrink-0" />
					</div>
				</div>
			)}

			{/* Grouped Inset Sections */}
			<div className="space-y-5 mt-1 px-4">
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
												<h4 className="text-[15px] font-semibold text-[var(--ink)] truncate leading-tight">
													{item.title}
												</h4>
												<p className="text-[12px] text-[var(--muted)] truncate mt-0.5">
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

			{/* Quiet Telemetry Footer */}
			<div className="mt-8 px-6 text-center text-[11px] text-[var(--muted)] space-y-1">
				<p>DENTE Dental CRM • Версия 0.1.0 (iOS Settings standard)</p>
				<p>Автономный медицинский контур • 127.0.0.1:5432</p>
			</div>
		</div>
	);
};

export default MobileSettingsRootView;
