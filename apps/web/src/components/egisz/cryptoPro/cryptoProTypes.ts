/**
 * cryptoProTypes.ts — Types and contracts for CryptoPro CSP signing hook.
 * Mandate 8b compliant (<= 120 lines).
 */

import type { CertificateInfo } from "../../../lib/cryptopro";
import type { EgiszClinicInfo, EgiszDoctorInfo, GostSignatureInfo } from "../egiszRemdEngine";

export interface UseCryptoProSigningProps {
	readonly initialDoctorSig?: GostSignatureInfo | undefined;
	readonly initialMoSig?: GostSignatureInfo | undefined;
	readonly generatedXml: string;
	readonly doctor: EgiszDoctorInfo;
	readonly clinic: EgiszClinicInfo;
}

export interface UseCryptoProSigningReturn {
	readonly doctorSig: GostSignatureInfo | undefined;
	readonly setDoctorSig: (sig: GostSignatureInfo | undefined) => void;
	readonly moSig: GostSignatureInfo | undefined;
	readonly setMoSig: (sig: GostSignatureInfo | undefined) => void;
	readonly selectedCert: CertificateInfo | null;
	readonly setSelectedCert: (cert: CertificateInfo | null) => void;
	readonly availableCerts: CertificateInfo[];
	readonly isSigning: boolean;
	readonly isCheckingCerts: boolean;
	readonly refreshCerts: (isManual?: boolean) => Promise<void>;
	readonly handleUploadDetachedSig: (e: React.ChangeEvent<HTMLInputElement>) => void;
	readonly handleUploadDetachedMoSig: (e: React.ChangeEvent<HTMLInputElement>) => void;
	readonly handleSignDocument: () => Promise<void>;
	readonly handleSignMoDocument: () => Promise<void>;
	readonly handleSignBothInOneClick: () => Promise<void>;
}
