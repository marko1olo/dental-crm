/**
 * DentalLabHubModal.tsx — Канонический фасад хаба ЗТЛ (Мандат 8b: < 20 строк, SSOT).
 * 
 * Делегирует выполнение единому SSOT компоненту DentalLabOrdersHubModal.
 * Соответствует Высшей Конституции THE HAMMER и ликвидирует дублирование модалок.
 */

export * from "./DentalLabOrdersHubModal";
export {
	DentalLabOrdersHubModal as DentalLabHubModal,
	DentalLabOrdersHubModal as default,
} from "./DentalLabOrdersHubModal";
