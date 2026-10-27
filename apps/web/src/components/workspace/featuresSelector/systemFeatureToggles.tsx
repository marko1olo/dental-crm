import React from "react";
import { CreditCard, LayoutGrid, MessageSquare, Server, ShieldPlus, Users } from "lucide-react";
import type { FeatureToggleDef } from "./featureToggleTypes";

export const SYSTEM_FEATURE_TOGGLES: readonly FeatureToggleDef[] = [
	{
		key: "hasAssistants",
		label: "Ассистенты",
		description: "Отключите, если ведёте приём без ассистента — подписание карты в 1 клик.",
		icon: <Users size={20} />,
		color: "hsl(262 80% 65%)",
	},
	{
		key: "hasMultipleChairs",
		label: "Несколько кресел",
		description: "Отключите для соло-кабинета — расписание превратится в чистый вертикальный таймлайн.",
		icon: <LayoutGrid size={20} />,
		color: "hsl(210 80% 60%)",
	},
	{
		key: "hasInsuranceCoPay",
		label: "Страховая оплата (ДМС)",
		description: "Отключите при отсутствии ДМС — в смете останется только прямая цена клиники.",
		icon: <ShieldPlus size={20} />,
		color: "hsl(40 85% 55%)",
	},
	{
		key: "hasInstallments",
		label: "Рассрочка платежей",
		description: "Калькулятор поэтапной оплаты и графика платежей в смете лечения.",
		icon: <CreditCard size={20} />,
		color: "hsl(340 75% 60%)",
	},
	{
		key: "hasPayrollModule",
		label: "Расчёт зарплат",
		description: "Прозрачный расчёт сдельной оплаты врачей и ассистентов от выполненных услуг.",
		icon: <LayoutGrid size={20} />,
		color: "hsl(140 70% 45%)",
	},
	{
		key: "hasMarketingModule",
		label: "Маркетинг и каналы",
		description: "Отслеживание источников первичных обращений пациентов и рекламных акций.",
		icon: <Users size={20} />,
		color: "hsl(35 90% 55%)",
	},
	{
		key: "hasAnalyticsModule",
		label: "Аналитика клиники",
		description: "Финансовые отчёты, загрузка кресел и показатели среднего чека.",
		icon: <LayoutGrid size={20} />,
		color: "hsl(280 80% 65%)",
	},
	{
		key: "hasInventoryModule",
		label: "Складской учёт",
		description: "Пакетное списание расходников по техкартам и контроль остатков.",
		icon: <LayoutGrid size={20} />,
		color: "hsl(220 80% 50%)",
	},
	{
		key: "hasLeadsKanban",
		label: "Канбан обращений",
		description: "Воронка новых пациентов: контроль первичных звонков и подтверждений записей.",
		icon: <LayoutGrid size={20} />,
		color: "hsl(25 80% 50%)",
	},
	{
		key: "hasOmnichannel",
		label: "Диалоги с пациентами",
		description: "Единая лента сообщений в WhatsApp и Telegram для подтверждения визитов.",
		icon: <MessageSquare size={20} />,
		color: "hsl(200 80% 45%)",
	},
	{
		key: "hasEngineeringStatus",
		label: "Инженерный статус",
		description: "Индикатор локальной синхронизации черновиков и технической отладки.",
		icon: <Server size={20} />,
		color: "hsl(215 16% 47%)",
	},
];
