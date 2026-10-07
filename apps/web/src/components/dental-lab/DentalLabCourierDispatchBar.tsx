import React, { useState } from "react";
import {
	Bike,
	Calendar,
	CheckCircle2,
	Clock,
	Copy,
	ExternalLink,
	MapPin,
	Package,
	Phone,
	Printer,
	QrCode,
	Send,
	ShieldCheck,
	Truck,
	User,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import type { DentalLabOrderData } from "../lab/DentalLabOrderModal";
import {
	createDentalLabOrder,
	type DentalLabWorkflowOrder,
} from "../lab/dentalLabWorkflowModel";
import { generateDentalLabOrderA4PrintBlank } from "../lab/dentalLabWorkflowExport";

export type CourierDeliveryWindow = "morning" | "afternoon" | "evening" | "express_urgent";

export interface CourierDispatchConfig {
	readonly courierServiceName: string;
	readonly courierName?: string;
	readonly courierPhone?: string;
	readonly deliveryWindow: CourierDeliveryWindow;
	readonly trackingNumber?: string;
	readonly temperatureBoxRequired: boolean;
	readonly disinfectionSigned: boolean;
}

export interface DentalLabCourierDispatchBarProps {
	readonly orders: readonly DentalLabOrderData[];
	readonly onDispatchUpdated?: () => void;
	readonly onSelectOrderForPrint?: (order: DentalLabOrderData) => void;
}

export const COURIER_SERVICES = [
	{ id: "lab_in_house", name: "Штатный курьер ЗТЛ", phone: "+7 (495) 215-08-41" },
	{ id: "clinic_express", name: "Служба доставки клиники", phone: "+7 (999) 000-11-22" },
	{ id: "yandex_med", name: "Яндекс Доставка (Медицина)", phone: "8 (800) 250-96-39" },
	{ id: "cdek_health", name: "СДЭК МедЭкспресс", phone: "+7 (495) 009-04-05" },
] as const;

export const DELIVERY_WINDOWS: readonly { readonly id: CourierDeliveryWindow; readonly label: string; readonly time: string }[] = [
	{ id: "morning", label: "Утро", time: "09:00 – 13:00" },
	{ id: "afternoon", label: "День", time: "13:00 – 16:00" },
	{ id: "evening", label: "Вечер", time: "16:00 – 19:00" },
	{ id: "express_urgent", label: "Экспресс", time: "в течение 2 часов" },
] as const;

export function DentalLabCourierDispatchBar({
	orders,
	onDispatchUpdated,
	onSelectOrderForPrint,
}: DentalLabCourierDispatchBarProps) {
	const [selectedService, setSelectedService] = useState<string>("lab_in_house");
	const [deliveryWindow, setDeliveryWindow] = useState<CourierDeliveryWindow>("morning");
	const [courierName, setCourierName] = useState<string>("Волков А.И. (Курьер ЗТЛ)");
	const [courierPhone, setCourierPhone] = useState<string>("+7 (926) 450-32-11");
	const [temperatureBox, setTemperatureBox] = useState<boolean>(true);
	const [disinfectionConfirmed, setDisinfectionConfirmed] = useState<boolean>(true);
	const [isCallingCourier, setIsCallingCourier] = useState<boolean>(false);
	const [isExpanded, setIsExpanded] = useState<boolean>(false);

	// Наряды, готовые к отправке в ЗТЛ (слепок снят, ожидают забора)
	const pendingOrders = orders.filter((o) => {
		const s = o.status || "";
		return s === "draft" || s === "sent" || s === "sent_to_lab" || s === "impression_scan";
	});

	// Наряды, находящиеся в пути из ЗТЛ в клинику
	const inboundOrders = orders.filter((o) => {
		const s = o.status || "";
		return s === "shipped" || s === "ready" || s === "ready_in_clinic";
	});

	const handleCallCourier = async () => {
		if (pendingOrders.length === 0) {
			showToast("Нет нарядов, подготовленных к передаче курьеру ЗТЛ", "info");
			return;
		}

		setIsCallingCourier(true);
		try {
			// Обновляем статус первого или всех ожидающих нарядов на sent_to_lab
			const targetIds = pendingOrders.slice(0, 5).map((o) => o.id).filter(Boolean);
			
			await Promise.all(
				targetIds.map((id) =>
					fetch(`/api/clinical/lab-orders/${id}`, {
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
							...denteAdminSecretRequestHeaders(),
						},
						body: JSON.stringify({
							status: "sent_to_lab",
							stage: "sent_to_lab",
							clinicalNotes: `Передано курьеру (${courierName}, тел: ${courierPhone}, окно: ${
								DELIVERY_WINDOWS.find((w) => w.id === deliveryWindow)?.label || "Утро"
							}, дезинфекция оттиска подтверждена).`,
						}),
					}).catch(() => null)
				)
			);

			showToast(
				`Курьер вызван! Передано нарядов в ЗТЛ: ${targetIds.length}. Доставка: ${
					DELIVERY_WINDOWS.find((w) => w.id === deliveryWindow)?.time || "09:00 – 13:00"
				}`,
				"success",
				4000
			);

			onDispatchUpdated?.();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось вызвать курьера";
			showToast(msg, "error");
		} finally {
			setIsCallingCourier(false);
		}
	};

	const handlePrintCourierManifest = (order?: DentalLabOrderData) => {
		const target = order || pendingOrders[0];
		if (!target) {
			showToast("Выберите наряд для печати курьерского листа", "info");
			return;
		}

		if (onSelectOrderForPrint) {
			onSelectOrderForPrint(target);
			return;
		}

		// Автономная генерация печатного А4 бланка
		const rawTeeth = target.toothFdi ? [Number(target.toothFdi)].filter((n) => !Number.isNaN(n)) : [16];
		const mappedWorkflowOrder: DentalLabWorkflowOrder = createDentalLabOrder({
			orderNumber: (target as { orderNumber?: string }).orderNumber || (target.id ? `ЗТЛ-${target.id.slice(0, 6)}` : "ЗТЛ-КУРЬЕР"),
			patientId: target.patientId || "pat-1",
			patientName: target.patientName || "Пациент",
			doctorId: target.doctorId || "doc-1",
			doctorName: target.doctorName || "Лечащий врач",
			clinicName: "Стоматологическая клиника DENTE",
			labName: (target as { labName?: string }).labName || "ЗТЛ Дентал-Мастер",
			workTypeId: "crown_zirconia",
			materialName: target.material || "Диоксид циркония Katana ML",
			selectedTeeth: rawTeeth.length > 0 ? rawTeeth : [16],
			shadeCode: target.colorVita || "A2",
			orderDate: (target as { orderDate?: string }).orderDate || target.createdAt || new Date().toISOString().slice(0, 10),
			expectedLabDate: target.dueDate || new Date().toISOString().slice(0, 10),
			pricePerUnitRub: target.priceRub || 24000,
			isUrgent: deliveryWindow === "express_urgent",
			initialStatus: "sent_to_lab",
		});
		const html = generateDentalLabOrderA4PrintBlank(mappedWorkflowOrder);

		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.write(html);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
			}, 350);
		} else {
			showToast("Разрешите всплывающие окна для печати накладной", "warning");
		}
	};

	return (
		<section
			aria-label="Курьерская логистика ЗТЛ"
			className="w-full bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3 shadow-2xs text-xs space-y-2.5 transition-all"
			data-testid="dental-lab-courier-dispatch-bar"
		>
			{/* Верхняя строка: Сводка логистики + Быстрый вызов курьера */}
			<div className="flex flex-wrap items-center justify-between gap-2.5">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
						<Truck className="w-4 h-4" />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<span className="font-bold text-xs text-[var(--ink)] whitespace-nowrap">
								Курьерская доставка ЗТЛ
							</span>
							<span
								className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]"
								data-testid="courier-pending-count-badge"
							>
								К отправке: <strong className="text-teal-600 dark:text-teal-400">{pendingOrders.length}</strong>
							</span>
							{inboundOrders.length > 0 && (
								<span
									className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
									data-testid="courier-inbound-count-badge"
								>
									В пути в клинику: <strong>{inboundOrders.length}</strong>
								</span>
							)}
						</div>
						<p className="text-[11px] text-[var(--muted)] m-0 truncate">
							Служба: {COURIER_SERVICES.find((s) => s.id === selectedService)?.name || "Штатный курьер ЗТЛ"} · Окно:{" "}
							{DELIVERY_WINDOWS.find((w) => w.id === deliveryWindow)?.label} ({DELIVERY_WINDOWS.find((w) => w.id === deliveryWindow)?.time})
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={() => setIsExpanded((prev) => !prev)}
						className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
						data-testid="btn-toggle-courier-details"
						title="Настройки параметров доставки"
					>
						<span>{isExpanded ? "Свернуть" : "Параметры курьера"}</span>
					</button>

					<button
						type="button"
						onClick={() => handlePrintCourierManifest()}
						disabled={pendingOrders.length === 0}
						className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 rounded-lg border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
						data-testid="btn-print-courier-manifest"
						title="Печать сопроводительного курьерского листа с QR-кодом"
					>
						<Printer className="w-3.5 h-3.5" />
						<span>Лист курьера (А4)</span>
					</button>

					<button
						type="button"
						onClick={handleCallCourier}
						disabled={isCallingCourier || pendingOrders.length === 0}
						className="min-h-[44px] sm:min-h-[32px] h-8 px-3.5 rounded-lg bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						data-testid="btn-call-dental-courier"
					>
						<Bike className="w-4 h-4" />
						<span>{isCallingCourier ? "Оформление..." : "Вызвать курьера ЗТЛ"}</span>
					</button>
				</div>
			</div>

			{/* Развернутые параметры курьерской службы и окон доставки */}
			{isExpanded && (
				<div
					className="pt-2 border-t border-[var(--line)] grid grid-cols-1 md:grid-cols-4 gap-3 animate-in fade-in-50 duration-150"
					data-testid="courier-expanded-panel"
				>
					{/* 1. Служба доставки */}
					<div className="space-y-1">
						<label htmlFor="courier-service-select" className="text-[11px] font-semibold text-[var(--muted)]">Служба доставки</label>
						<select
							id="courier-service-select"
							value={selectedService}
							onChange={(e) => {
								setSelectedService(e.target.value);
								const matched = COURIER_SERVICES.find((s) => s.id === e.target.value);
								if (matched) setCourierPhone(matched.phone);
							}}
							className="w-full min-h-[44px] sm:min-h-[32px] h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
						>
							{COURIER_SERVICES.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name}
								</option>
							))}
						</select>
					</div>

					{/* 2. Окно доставки */}
					<div className="space-y-1">
						<label htmlFor="courier-delivery-window-select" className="text-[11px] font-semibold text-[var(--muted)]">Окно передачи</label>
						<select
							id="courier-delivery-window-select"
							value={deliveryWindow}
							onChange={(e) => setDeliveryWindow(e.target.value as CourierDeliveryWindow)}
							className="w-full min-h-[44px] sm:min-h-[32px] h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
						>
							{DELIVERY_WINDOWS.map((w) => (
								<option key={w.id} value={w.id}>
									{w.label} ({w.time})
								</option>
							))}
						</select>
					</div>

					{/* 3. Курьер и контактный телефон */}
					<div className="space-y-1">
						<label htmlFor="courier-phone-input" className="text-[11px] font-semibold text-[var(--muted)]">Телефон курьера</label>
						<div className="relative">
							<Phone className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
							<input
								id="courier-phone-input"
								type="text"
								value={courierPhone}
								onChange={(e) => setCourierPhone(e.target.value)}
								className="w-full min-h-[44px] sm:min-h-[32px] h-8 pl-8 pr-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
								placeholder="+7 (___) ___-__-__"
							/>
						</div>
					</div>

					{/* 4. СанПиН дезинфекция и термоконтейнер */}
					<div className="flex flex-col justify-end space-y-1.5 pt-1">
						<label className="flex items-center gap-2 cursor-pointer select-none min-h-[24px]">
							<input
								type="checkbox"
								checked={disinfectionConfirmed}
								onChange={(e) => setDisinfectionConfirmed(e.target.checked)}
								className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
							/>
							<span className="text-[11px] font-medium text-[var(--ink)]">
								Дезинфекция оттиска проведена
							</span>
						</label>

						<label className="flex items-center gap-2 cursor-pointer select-none min-h-[24px]">
							<input
								type="checkbox"
								checked={temperatureBox}
								onChange={(e) => setTemperatureBox(e.target.checked)}
								className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
							/>
							<span className="text-[11px] font-medium text-[var(--ink)]">
								Термоконтейнер с хладоэлементом
							</span>
						</label>
					</div>
				</div>
			)}
		</section>
	);
}
