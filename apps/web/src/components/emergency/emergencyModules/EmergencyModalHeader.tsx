/**
 * Emergency Modal Header (Layer 4)
 * Header with direct 112 call shortcut and statutory badge.
 */

import React from 'react';
import { AlertOctagon, PhoneCall, ShieldAlert, X } from 'lucide-react';

interface EmergencyModalHeaderProps {
	onCall112: () => void;
	onClose: () => void;
}

export function EmergencyModalHeader({ onCall112, onClose }: EmergencyModalHeaderProps) {
	const handleCall = () => {
		onCall112();
		if (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
			window.location.href = 'tel:112';
		}
	};

	return (
		<header className="emergency-modal-header">
			<div className="emergency-header-title-area">
				<AlertOctagon size={28} className="emergency-header-alert-icon" />
				<div>
					<h2 className="emergency-header-title" aria-label="Экстренная помощь у кресла">
						Экстренная помощь у кресла
					</h2>
					<span className="emergency-header-badge" data-statutory="786н">
						<ShieldAlert size={13} />
						Неотложная помощь
					</span>
				</div>
			</div>
			<div className="emergency-header-actions">
				<button
					type="button"
					className="emergency-call-112-btn"
					onClick={handleCall}
					data-testid="emergency-call-112-header-btn"
					title="Шпаргалка вызова 112 / 103 (быстрое копирование для диспетчера)"
				>
					<PhoneCall size={18} />
					<span>Вызов скорой помощи (112)</span>
				</button>
				<button
					type="button"
					className="emergency-close-btn"
					onClick={onClose}
					aria-label="Закрыть"
				>
					<X size={20} />
				</button>
			</div>
		</header>
	);
}
