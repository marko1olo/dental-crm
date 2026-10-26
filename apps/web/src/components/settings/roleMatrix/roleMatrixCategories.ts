/**
 * apps/web/src/components/settings/roleMatrix/roleMatrixCategories.ts
 *
 * Category groupings for PermissionCategorySection (Mandates 8b, 8x).
 * Strictly <= 120 lines ceiling.
 */

import { Calendar, Coins, FileText, HeartPulse, Lock, MessageSquare, Shield, Stethoscope, Users } from "lucide-react";
import type React from "react";

export interface CategoryMeta {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const CATEGORY_METAS: readonly CategoryMeta[] = [
	{ id: "clinical", title: "ЭМК и протоколы приёма", description: "Дневники визита, зубная формула, диагнозы МКБ-10", icon: Stethoscope },
	{ id: "schedule", title: "Расписание и приёмы", description: "Сетка кресел, бронирование слотов и графики смен", icon: Calendar },
	{ id: "patients", title: "Картотека пациентов и защита данных", description: "Медицинские карты, согласия и маскирование телефонов", icon: Users },
	{ id: "finance_cashier", title: "Касса и приём оплат", description: "Оплата наличными, картой, СБП, депозиты и чеки", icon: Coins },
	{ id: "finance_reports", title: "Прибыль клиники и прейскурант", description: "P&L отчёты, маржинальность кресел и каталог услуг", icon: FileText },
	{ id: "payroll", title: "Зарплата и сдельная оплата", description: "Сдельная выработка, расчет мотивации и удержания ЗТЛ", icon: Coins },
	{ id: "inventory", title: "Склад и стерилизация", description: "Списание расходников на приёме, журналы автоклавов", icon: HeartPulse },
	{ id: "settings", title: "Настройки клиники и безопасность", description: "Управление правами доступа, реквизиты и филиалы", icon: Shield },
	{ id: "egisz", title: "Медицинские реестры и отчётность", description: "Электронные медицинские документы и выгрузки", icon: Lock },
	{ id: "communications", title: "Коммуникации и напоминания", description: "WhatsApp, Telegram и SMS рассылки пациентам", icon: MessageSquare },
];
