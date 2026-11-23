/**
 * apps/web/src/components/sanpin/SterilizerFleetManager.tsx
 *
 * Паспорт оборудования стерилизационной клиники (Мандаты 8b, 8e, 8n, 8x, 8am).
 * Реальный CRUD автоклавов через API /api/sanpin/sterilization/equipments.
 * Запрет потемкинских деревень (Мандат 8z/8wy).
 */

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2, ShieldCheck, AlertTriangle, Plus, Pencil, Archive, RefreshCw } from "lucide-react";
import type { SterilizerEquipment } from "@dental/shared";
import { SterilizerEquipmentModal } from "./SterilizerEquipmentModal";
import { SterilizerDecommissionModal } from "./SterilizerDecommissionModal";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { showToast } from "../GlobalToast";

export { SterilizerDecommissionModal } from "./SterilizerDecommissionModal";
export { SterilizerEquipmentModal } from "./SterilizerEquipmentModal";

export interface SterilizerFleetManagerProps {
	readonly onEquipmentsChange?: (equipments: SterilizerEquipment[]) => void;
	readonly compactMode?: boolean;
}

const DEMO_FALLBACK_EQUIPMENT: SterilizerEquipment[] = [
	{
		id: "11111111-1111-4111-a111-111111111101",
		organizationId: "demo-org-id",
		name: "АК-01 • Melag Vacuklav 23 B+",
		brandModel: "Melag Vacuklav 23 B+ (Германия)",
		serialNumber: "SN-MV23B-4081",
		inventoryNumber: "ИНВ-ЦСО-001",
		deviceType: "autoclave_steam",
		deviceClass: "autoclave_class_b",
		chamberVolumeLiters: 22,
		locationRoom: "ЦСО №1 (Стерилизационная)",
		verificationExpiryDate: "2027-12-31",
		lastMaintenanceDate: "2026-05-15",
		nextMaintenanceDate: "2027-05-15",
		commissioningDate: "2024-01-10",
		status: "active",
		isCommissioned: true,
		notes: "Основной паровой автоклав класса B с фракционированным вакуумом",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "11111111-1111-4111-a111-111111111102",
		organizationId: "demo-org-id",
		name: "АК-02 • W&H Lina 17",
		brandModel: "W&H Lina 17 (Австрия)",
		serialNumber: "SN-WHL17-1904",
		inventoryNumber: "ИНВ-ЦСО-002",
		deviceType: "autoclave_steam",
		deviceClass: "autoclave_class_b",
		chamberVolumeLiters: 17,
		locationRoom: "ЦСО №2 (Стерилизационная)",
		verificationExpiryDate: "2027-09-30",
		lastMaintenanceDate: "2026-08-20",
		nextMaintenanceDate: "2027-08-20",
		commissioningDate: "2024-03-15",
		status: "active",
		isCommissioned: true,
		notes: "Резервный паровой автоклав класса B",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
];

export function SterilizerFleetManager({
	onEquipmentsChange,
	compactMode = false,
}: SterilizerFleetManagerProps) {
	const [equipments, setEquipments] = useState<SterilizerEquipment[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	const [editingEquipment, setEditingEquipment] = useState<SterilizerEquipment | null>(null);
	const [decommissionTarget, setDecommissionTarget] = useState<SterilizerEquipment | null>(null);
	const [decommissionReason, setDecommissionReason] = useState<string>("");
	const [isDecommissioning, setIsDecommissioning] = useState<boolean>(false);

	const fetchEquipments = useCallback(async () => {
		setIsLoading(true);
		try {
			const res = await fetch("/api/sanpin/sterilization/equipments", {
				headers: { ...getDenteAuthHeaders() },
			});
			if (res.ok) {
				const json = await res.json();
				const list: SterilizerEquipment[] = Array.isArray(json) ? json : json?.data || [];
				if (list.length > 0) {
					setEquipments(list);
					onEquipmentsChange?.(list);
					return;
				}
			}
			if (isDemoShowcaseMode()) {
				setEquipments(DEMO_FALLBACK_EQUIPMENT);
				onEquipmentsChange?.(DEMO_FALLBACK_EQUIPMENT);
			} else {
				setEquipments([]);
				onEquipmentsChange?.([]);
			}
		} catch {
			if (isDemoShowcaseMode()) {
				setEquipments(DEMO_FALLBACK_EQUIPMENT);
				onEquipmentsChange?.(DEMO_FALLBACK_EQUIPMENT);
			} else {
				setEquipments([]);
				onEquipmentsChange?.([]);
			}
		} finally {
			setIsLoading(false);
		}
	}, [onEquipmentsChange]);

	useEffect(() => {
		void fetchEquipments();
	}, [fetchEquipments]);

	const handleOpenAdd = () => {
		setEditingEquipment(null);
		setIsModalOpen(true);
	};

	const handleOpenEdit = (eq: SterilizerEquipment) => {
		setEditingEquipment(eq);
		setIsModalOpen(true);
	};

	const handleOpenDecommission = (eq: SterilizerEquipment) => {
		setDecommissionTarget(eq);
		setDecommissionReason("");
	};

	const handleConfirmDecommission = async () => {
		if (!decommissionTarget) return;
		setIsDecommissioning(true);
		try {
			const res = await fetch(`/api/sanpin/sterilization/equipments/${decommissionTarget.id}`, {
				method: "DELETE",
				headers: {
					...getDenteAuthHeaders(),
					"Content-Type": "application/json",
					"Idempotency-Key": crypto.randomUUID(),
				},
				body: JSON.stringify({ reason: decommissionReason || "Вывод из эксплуатации" }),
			});
			if (!res.ok) {
				await fetch(`/api/sanpin/sterilization/equipments/${decommissionTarget.id}`, {
					method: "PUT",
					headers: {
						...getDenteAuthHeaders(),
						"Content-Type": "application/json",
						"Idempotency-Key": crypto.randomUUID(),
					},
					body: JSON.stringify({
						status: "decommissioned",
						isCommissioned: false,
						decommissioningDate: new Date().toISOString().slice(0, 10),
						notes: `${decommissionTarget.notes || ""} [Списан: ${decommissionReason || "по регламенту"}]`.trim(),
					}),
				});
			}
			showToast(`Аппарат «${decommissionTarget.name}» списан`, "success");
			setDecommissionTarget(null);
			await fetchEquipments();
		} catch {
			showToast("Не удалось списать аппарат", "error");
		} finally {
			setIsDecommissioning(false);
		}
	};

	return (
		<div className="sanpin-fleet-container flex flex-col gap-3.5 w-full text-xs">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<span className="font-semibold text-sm text-[var(--ink)]">Парк стерилизаторов клиники</span>
					<button
						type="button"
						onClick={fetchEquipments}
						className="h-7 w-7 rounded-md inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
						title="Обновить список оборудования"
					>
						<RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
					</button>
				</div>
				<button
					type="button"
					onClick={handleOpenAdd}
					data-testid="add-sterilizer-btn"
					className="h-8 px-2.5 rounded-md text-xs font-medium gap-1.5 inline-flex items-center justify-center shrink-0 bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors shadow-2xs"
				>
					<Plus size={14} />
					<span>Добавить аппарат</span>
				</button>
			</div>

			{equipments.length === 0 && !isLoading && (
				<div className="py-8 flex flex-col items-center text-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)]">
					<ShieldCheck size={32} className="opacity-40" />
					<p className="m-0 text-xs">Нет зарегистрированных автоклавов в клинике</p>
					<button
						type="button"
						onClick={handleOpenAdd}
						className="mt-1 h-8 px-3 rounded-md text-xs font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] cursor-pointer"
					>
						Зарегистрировать первый автоклав
					</button>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				{equipments.map((eq) => {
					const isActive = eq.status === "active";
					const isExp = eq.isVerificationExpired;
					return (
						<div
							key={eq.id}
							className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4 flex flex-col gap-2.5 shadow-2xs transition-shadow"
						>
							<div className="flex items-start justify-between gap-2">
								<div className="flex items-center gap-2.5 min-w-0">
									<div className="w-8 h-8 rounded-lg bg-[var(--paper-soft)] text-[var(--primary)] flex items-center justify-center shrink-0">
										<ShieldCheck size={18} />
									</div>
									<div className="min-w-0">
										<h4 className="text-sm font-bold m-0 text-[var(--ink)] truncate">{eq.name}</h4>
										<p className="text-xs text-[var(--ink-muted)] m-0 truncate">
											{eq.brandModel} • {eq.locationRoom || "ЦСО"}
										</p>
									</div>
								</div>

								<div className="flex items-center gap-1.5 shrink-0">
									<span
										className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
											isActive && !isExp
												? "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success)]/20"
												: isExp
												? "bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger)]/20"
												: "bg-[var(--paper-soft)] text-[var(--ink-muted)] border-[var(--line)]"
										}`}
									>
										{isActive && !isExp ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
										<span>{isActive ? (isExp ? "Поверка истекла" : "Годен к работе") : "Выведен из эксплуатации"}</span>
									</span>
								</div>
							</div>

							<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs space-y-1">
								<div className="flex justify-between">
									<span className="text-[var(--ink-muted)]">Серийный номер:</span>
									<strong className="text-[var(--ink)] font-mono">{eq.serialNumber}</strong>
								</div>
								<div className="flex justify-between">
									<span className="text-[var(--ink-muted)]">Класс аппарата:</span>
									<span className="text-[var(--ink)] font-medium">
										{eq.deviceClass === "autoclave_class_b" ? "Класс B (Паровой фракционный)" : eq.deviceClass}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-[var(--ink-muted)]">Объем камеры:</span>
									<span className="text-[var(--ink)] font-medium">{eq.chamberVolumeLiters} л</span>
								</div>
								{eq.verificationExpiryDate && (
									<div className="flex justify-between">
										<span className="text-[var(--ink-muted)]">Поверка действительна:</span>
										<strong className={isExp ? "text-[var(--danger)]" : "text-[var(--success)]"}>
											{eq.verificationExpiryDate}
										</strong>
									</div>
								)}
								{eq.nextMaintenanceDate && (
									<div className="flex justify-between">
										<span className="text-[var(--ink-muted)]">Следующее плановое ТО:</span>
										<span className="text-[var(--ink)]">{eq.nextMaintenanceDate}</span>
									</div>
								)}
							</div>

							<div className="flex items-center justify-end gap-1.5 pt-1 border-t border-[var(--line)]">
								<button
									type="button"
									onClick={() => handleOpenEdit(eq)}
									className="h-7 px-2.5 rounded-md text-[11px] font-medium inline-flex items-center gap-1 text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
								>
									<Pencil size={12} />
									<span>Паспорт / Изменить</span>
								</button>
								{isActive && (
									<button
										type="button"
										onClick={() => handleOpenDecommission(eq)}
										className="h-7 px-2 rounded-md text-[11px] font-medium inline-flex items-center gap-1 text-[var(--danger)] hover:bg-[var(--danger-soft)] cursor-pointer"
									>
										<Archive size={12} />
										<span>Списать</span>
									</button>
								)}
							</div>
						</div>
					);
				})}
			</div>

			<SterilizerEquipmentModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onSuccess={() => {
					setIsModalOpen(false);
					void fetchEquipments();
				}}
				editingEquipment={editingEquipment}
			/>

			<SterilizerDecommissionModal
				target={decommissionTarget}
				reason={decommissionReason}
				setReason={setDecommissionReason}
				submitting={isDecommissioning}
				onConfirm={handleConfirmDecommission}
				onCancel={() => setDecommissionTarget(null)}
			/>
		</div>
	);
}

export default SterilizerFleetManager;
