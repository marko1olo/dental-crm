import React from 'react';
import { ShieldCheck, ShieldAlert, Lock, Check, Copy } from 'lucide-react';
import type { AuditVerificationResult } from './types';

export interface AuditTrailIntegrityBannerProps {
	readonly verificationResult: AuditVerificationResult;
	readonly copiedHash: string | null;
	readonly onCopyHash: (hash: string) => void;
}

export function AuditTrailIntegrityBanner({
	verificationResult,
	copiedHash,
	onCopyHash,
}: AuditTrailIntegrityBannerProps): React.JSX.Element {
	const latestHash = verificationResult.latestHash;
	const isCopied = copiedHash === latestHash;

	return (
		<div className={`audit-integrity-banner ${verificationResult.isValid ? 'valid' : 'invalid'}`}>
			<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
				{verificationResult.isValid ? (
					<>
						<ShieldCheck size={18} />
						<span>
							Цепочка криптографических хэшей SHA-256 валидна: {verificationResult.verifiedCount} блоков верифицировано. Несанкционированных изменений не обнаружено.
						</span>
					</>
				) : (
					<>
						<ShieldAlert size={18} />
						<span>
							КРИТИЧЕСКИЙ СБОЙ: Нарушена целостность на блоке #{verificationResult.brokenAtIndex !== undefined ? verificationResult.brokenAtIndex + 1 : '?'}. {verificationResult.reason}
						</span>
					</>
				)}
			</div>

			<button
				type="button"
				className="audit-hash-pill"
				onClick={() => onCopyHash(latestHash)}
				title="Нажмите, чтобы скопировать хэш последнего блока"
			>
				<Lock size={12} />
				<span>{latestHash.slice(0, 10)}...{latestHash.slice(-6)}</span>
				{isCopied ? (
					<Check size={12} color="var(--ok-fg)" />
				) : (
					<Copy size={12} />
				)}
			</button>
		</div>
	);
}
