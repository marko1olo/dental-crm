import React from 'react';
import { Shield, X } from 'lucide-react';

export interface AuditTrailHeaderProps {
	readonly onClose: () => void;
}

export function AuditTrailHeader({ onClose }: AuditTrailHeaderProps): React.JSX.Element {
	return (
		<div className="audit-modal-header">
			<div className="audit-header-title-box">
				<div className="audit-logo-box">
					<Shield size={22} />
				</div>
				<div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
						<span className="audit-title-main">
							Журнал аудита доступа и безопасности ПДн
						</span>
						<span className="audit-badge">152-ФЗ & Приказ ФСТЭК № 21</span>
					</div>
					<div className="audit-title-sub">
						Криптографический реестр обращений к 043/у, счетам, экспорту и согласиям
					</div>
				</div>
			</div>

			<button
				type="button"
				onClick={onClose}
				className="audit-btn-close"
				title="Закрыть окно"
			>
				<X size={20} />
			</button>
		</div>
	);
}
