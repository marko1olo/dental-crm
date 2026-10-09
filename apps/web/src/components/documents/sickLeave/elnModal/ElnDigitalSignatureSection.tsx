import React, { useState } from "react";
import {
	ShieldCheck,
	Key,
	CheckCircle2,
	AlertCircle,
	Building2,
	UserCheck,
	FileCheck,
	RefreshCw
} from "lucide-react";
import type { ElnDigitalSignatureSectionProps } from "./types";

export function ElnDigitalSignatureSection({
	formState,
	doctorFio = "Врач-стоматолог",
	doctorSnils = "000-000-000 00",
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicOgrn = "1234567890123",
	signatureStatus,
	onSignDoctor,
	onSignOrganization,
	onVerifySignatures
}: ElnDigitalSignatureSectionProps) {
	const [activeCertType, setActiveCertType] = useState<'doctor' | 'org'>('doctor');

	return (
		<div className="sick-leave-section">
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<div>
					<h4 className="sick-leave-section-title">
						<Key size={16} />
						Электронная подпись ЭЛН (УКЭП КриптоПро CSP)
					</h4>
					<p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--muted, #64748b)' }}>
						Юридически значимое подписание электронного больничного по ГОСТ Р 34.10-2012 для отправки в ЕИИС «Соцстрах» (СФР).
					</p>
				</div>

				<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
					<span
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: '4px',
							fontSize: '0.75rem',
							padding: '4px 8px',
							borderRadius: '6px',
							backgroundColor: 'var(--surface-subtle, #f1f5f9)',
							color: 'var(--success, #16a34a)',
							fontWeight: 600
						}}
					>
						<ShieldCheck size={14} />
						КриптоПро CSP готов
					</span>
				</div>
			</div>

			{/* Signature Cards Grid */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
				{/* 1. Doctor Signature Card */}
				<div
					style={{
						padding: '1rem',
						borderRadius: '8px',
						border: '1px solid var(--border, #e2e8f0)',
						backgroundColor: signatureStatus.signedByDoctor ? 'var(--success-subtle, #f0fdf4)' : 'var(--surface, #ffffff)',
						display: 'flex',
						flexDirection: 'column',
						gap: '0.75rem'
					}}
				>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
							<UserCheck size={16} />
							<span>1. УКЭП лечащего врача</span>
						</div>
						{signatureStatus.signedByDoctor ? (
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--success, #16a34a)', fontSize: '0.75rem', fontWeight: 600 }}>
								<CheckCircle2 size={14} />
								Подписано
							</span>
						) : (
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--warning, #ca8a04)', fontSize: '0.75rem', fontWeight: 600 }}>
								<AlertCircle size={14} />
								Ожидает подписи
							</span>
						)}
					</div>

					<div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary, #475569)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
						<div>Владелец: <strong>{doctorFio}</strong></div>
						<div>СНИЛС: <strong>{doctorSnils}</strong></div>
						<div>Отпечаток: <code style={{ fontSize: '0.75rem' }}>{signatureStatus.doctorCertThumbprint || "7F4A...B91C"}</code></div>
						{signatureStatus.doctorSignedAt && (
							<div style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)' }}>
								Время подписи: {signatureStatus.doctorSignedAt}
							</div>
						)}
					</div>

					<div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
						<button
							type="button"
							className={`sick-leave-btn ${signatureStatus.signedByDoctor ? 'secondary' : 'primary'}`}
							style={{ width: '100%', minHeight: '40px' }}
							onClick={onSignDoctor}
						>
							<FileCheck size={16} />
							{signatureStatus.signedByDoctor ? 'Переподписать УКЭП врача' : 'Подписать УКЭП врача'}
						</button>
					</div>
				</div>

				{/* 2. Organization Signature Card */}
				<div
					style={{
						padding: '1rem',
						borderRadius: '8px',
						border: '1px solid var(--border, #e2e8f0)',
						backgroundColor: signatureStatus.signedByOrg ? 'var(--success-subtle, #f0fdf4)' : 'var(--surface, #ffffff)',
						display: 'flex',
						flexDirection: 'column',
						gap: '0.75rem'
					}}
				>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
							<Building2 size={16} />
							<span>2. УКЭП клиники (МО)</span>
						</div>
						{signatureStatus.signedByOrg ? (
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--success, #16a34a)', fontSize: '0.75rem', fontWeight: 600 }}>
								<CheckCircle2 size={14} />
								Подписано
							</span>
						) : (
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--warning, #ca8a04)', fontSize: '0.75rem', fontWeight: 600 }}>
								<AlertCircle size={14} />
								Ожидает подписи
							</span>
						)}
					</div>

					<div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary, #475569)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
						<div>Организация: <strong>{clinicName}</strong></div>
						<div>ОГРН: <strong>{clinicOgrn}</strong></div>
						<div>Отпечаток: <code style={{ fontSize: '0.75rem' }}>{signatureStatus.orgCertThumbprint || "3E8D...F204"}</code></div>
						{signatureStatus.orgSignedAt && (
							<div style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)' }}>
								Время подписи: {signatureStatus.orgSignedAt}
							</div>
						)}
					</div>

					<div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
						<button
							type="button"
							className={`sick-leave-btn ${signatureStatus.signedByOrg ? 'secondary' : 'primary'}`}
							style={{ width: '100%', minHeight: '40px' }}
							onClick={onSignOrganization}
						>
							<FileCheck size={16} />
							{signatureStatus.signedByOrg ? 'Переподписать УКЭП МО' : 'Подписать УКЭП клиники'}
						</button>
					</div>
				</div>
			</div>

			{/* Signature Verification Action */}
			<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
				<button
					type="button"
					className="sick-leave-btn secondary"
					style={{ minHeight: '40px' }}
					onClick={onVerifySignatures}
				>
					<RefreshCw size={14} />
					Проверить статус и валидность сертификатов
				</button>
			</div>
		</div>
	);
}
