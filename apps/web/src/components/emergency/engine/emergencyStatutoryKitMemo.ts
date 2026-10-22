/**
 * Statutory Emergency Kit Memo (Order 786n / 1144n / 1079n / 138n)
 */

import type { StatutoryEmergencyKitItem } from '../emergencyModules/emergencyDrugTypes';

export const STATUTORY_EMERGENCY_KIT_MEMO: readonly StatutoryEmergencyKitItem[] = [
	{
		drugId: 'adrenaline_epi_01',
		tradeNameRu: 'Адреналин (Эпинефрин) 0.1% (1 мг/мл)',
		dosageStandardRu: 'Взрослые: 0.5 мл (0.5 мг) в/м; Дети: 0.01 мг/кг (макс 0.3 мг)',
		routeRu: 'В/м в среднюю треть переднебоковой поверхности бедра',
		indicationsRu: 'Анафилактический шок, ангионевротический отек гортани, асистолия при СЛР',
		statutoryOrderRu: 'Приказ МЗ РФ № 786н (Прил. 11), КР345',
	},
	{
		drugId: 'prednisolone_30mg',
		tradeNameRu: 'Преднизолон 30 мг/мл (ампулы 1 мл)',
		dosageStandardRu: 'Взрослые: 90–120 мг (3–4 амп.) в/в или в/м; Дети: 2–3 мг/кг',
		routeRu: 'В/в струйно медленно на 10 мл 0.9% NaCl или в/м',
		indicationsRu: 'Анафилаксия (2-я линия), тяжелый бронхоспазм, токсико-аллергические реакции',
		statutoryOrderRu: 'Приказ МЗ РФ № 786н, 1144н',
	},
	{
		drugId: 'suprastin_2_percent',
		tradeNameRu: 'Супрастин (Хлоропирамин) 2% (20 мг/мл)',
		dosageStandardRu: 'Взрослые: 20 мг (1 мл) в/в или в/м; Дети: 0.25–0.5 мл',
		routeRu: 'В/в медленно или в/м глубоко',
		indicationsRu: 'Генерализованная крапивница, отек Квинке, зудящий дерматоз',
		statutoryOrderRu: 'Приказ МЗ РФ № 786н (Прил. 11)',
	},
	{
		drugId: 'salbutamol_spray',
		tradeNameRu: 'Сальбутамол аэрозоль 100 мкг/доза',
		dosageStandardRu: 'Взрослые и дети: 2–4 ингаляционные дозы',
		routeRu: 'Ингаляционно через рот (со спейсером)',
		indicationsRu: 'Острый бронхоспазм, приступ бронхиальной астмы',
		statutoryOrderRu: 'Приказ МЗ РФ № 786н (Прил. 11), 1144н',
	},
	{
		drugId: 'nitroglycerin_sublingual',
		tradeNameRu: 'Нитроглицерин 0.5 мг (таб. / спрей)',
		dosageStandardRu: '0.5 мг (1 таб.) под язык при АД сист > 100',
		routeRu: 'Сублингвально (под язык) строго сидя',
		indicationsRu: 'Острый коронарный синдром, стенокардия, ишемия миокарда',
		statutoryOrderRu: 'Приказ МЗ РФ № 786н (Прил. 11), 138н',
	},
	{
		drugId: 'glucose_dextrose_40',
		tradeNameRu: 'Глюкоза (Декстроза) 40%',
		dosageStandardRu: 'Взрослые: 20–60 мл; Дети: 2 мл/кг струйно',
		routeRu: 'В/в струйно до восстановления ясного сознания',
		indicationsRu: 'Гипогликемическое состояние / кома у диабетиков',
		statutoryOrderRu: 'Приказ МЗ РФ № 786н (Прил. 11)',
	},
];
