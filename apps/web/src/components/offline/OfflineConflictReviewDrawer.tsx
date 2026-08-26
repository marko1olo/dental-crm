/**
 * DENTE CRM — Offline Conflict Review Drawer (Tier 2 Context Sheet).
 *
 * Provides clinic staff and administrators with a high-level review
 * of concurrent edit collisions and launches visual split-brain resolution.
 */

import React, { useState } from "react";
import type { Clinical043DiaryRecord } from "../../services/sync/conflictResolver.js";
import { ClinicalConflictModal } from "./ClinicalConflictModal.js";
import "./OfflineConflictReviewDrawer.css";

export interface PendingConflictItem {
	readonly id: string;
	readonly entityKind: string;
	readonly entityId: string;
	readonly patientName?: string | undefined;
	readonly card043Number?: string | undefined;
	readonly doctorVersion: Clinical043DiaryRecord;
	readonly cloudVersion: Clinical043DiaryRecord;
	readonly conflictReason?: string | undefined;
	readonly detectedAt: string;
	readonly priority: "high" | "medium" | "low";
}

export interface OfflineConflictReviewDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly conflicts: readonly PendingConflictItem[];
	readonly onResolveConflict: (
		conflictId: string,
		resolvedRecord: Clinical043DiaryRecord,
		strategy: string,
	) => void;
	readonly onAutoResolveAllSafe?: () => void;
}

export const OfflineConflictReviewDrawer: React.FC<OfflineConflictReviewDrawerProps> = ({
	isOpen,
	onClose,
	conflicts,
	onResolveConflict,
	onAutoResolveAllSafe,
}) => {
	const [activeModalConflict, setActiveModalConflict] = useState<PendingConflictItem | null>(null);

	if (!isOpen) {
		return null;
	}

	const handleOpenModal = (item: PendingConflictItem) => {
		setActiveModalConflict(item);
	};

	const handleCloseModal = () => {
		setActiveModalConflict(null);
	};

	const handleModalResolve = (
		resolvedRecord: Clinical043DiaryRecord,
		strategy: "doctor" | "cloud" | "merge" | "custom",
	) => {
		if (activeModalConflict) {
			onResolveConflict(activeModalConflict.id, resolvedRecord, strategy);
			setActiveModalConflict(null);
		}
	};

	return (
		<>
			<div
				className="offline-conflict-drawer-backdrop"
				onClick={onClose}
				aria-hidden="true"
			/>
			<div
				className="offline-conflict-drawer"
				role="dialog"
				aria-modal="true"
				aria-labelledby="conflict-drawer-title"
			>
				{/* 1. Header */}
				<div className="offline-conflict-drawer__header">
					<div className="offline-conflict-drawer__title-area">
						<div className="offline-conflict-drawer__title-row">
							<h3 id="conflict-drawer-title" className="offline-conflict-drawer__title">
								Клинические расхождения
							</h3>
							<span className="offline-conflict-drawer__badge">
								{conflicts.length}
							</span>
						</div>
						<p className="offline-conflict-drawer__subtitle">
							Конфликты синхронизации офлайн-терминалов с сервером
						</p>
					</div>
					<button
						type="button"
						className="offline-conflict-drawer__close-btn"
						onClick={onClose}
						aria-label="Закрыть панель конфликтов"
					>
						✕
					</button>
				</div>

				{/* 2. List of Conflicts */}
				<div className="offline-conflict-drawer__body">
					{conflicts.length === 0 ? (
						<div className="offline-conflict-empty">
							<span className="offline-conflict-empty__icon">✨</span>
							<p className="offline-conflict-empty__text">
								Все медицинские записи синхронизированы без расхождений.
							</p>
						</div>
					) : (
						conflicts.map((item) => (
							<div
								key={item.id}
								className="offline-conflict-card"
								data-testid={`conflict-card-${item.id}`}
							>
								<div className="offline-conflict-card__top">
									<h4 className="offline-conflict-card__entity">
										{item.patientName ? `Пациент: ${item.patientName}` : `Запись ${item.entityKind}`}
									</h4>
									<span
										className={`offline-conflict-card__priority ${item.priority === "high" ? "offline-conflict-card__priority--high" : ""}`}
									>
										{item.priority === "high" ? "Карта 043/у" : "Синхронизация"}
									</span>
								</div>

								<p className="offline-conflict-card__desc">
									{item.conflictReason || "Параллельное редактирование дневника врачом и ассистентом"}
								</p>

								<button
									type="button"
									className="offline-conflict-card__action-btn"
									onClick={() => handleOpenModal(item)}
									data-testid={`btn-resolve-${item.id}`}
								>
									🔍 Разрешить расхождение (Side-by-Side)
								</button>
							</div>
						))
					)}
				</div>

				{/* 3. Footer */}
				{conflicts.length > 0 && onAutoResolveAllSafe && (
					<div className="offline-conflict-drawer__footer">
						<button
							type="button"
							className="clinical-conflict-btn clinical-conflict-btn--merge"
							onClick={onAutoResolveAllSafe}
							style={{ width: "100%", justifyContent: "center" }}
						>
							⚡ Авто-слияние безопасных записей
						</button>
					</div>
				)}
			</div>

			{/* Active Side-by-Side Modal */}
			{activeModalConflict && (
				<ClinicalConflictModal
					isOpen={true}
					onClose={handleCloseModal}
					onResolve={handleModalResolve}
					conflictItem={activeModalConflict}
				/>
			)}
		</>
	);
};

export default OfflineConflictReviewDrawer;
