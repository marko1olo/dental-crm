/**
 * Interface for CryptoPro and Rutoken hardware/software integration.
 * Wraps browser plugins and falls back to Mock provider for development environments.
 */

export interface CertificateInfo {
	thumbprint: string;
	name: string;
	issuer: string;
	validFrom: string;
	validTo: string;
	provider: "cryptopro" | "rutoken";
}

export class DigitalSignatureService {
	private isMockMode: boolean = false;

	constructor() {
		// In a real environment, we'd check window.cryptoPro or window.rutoken.
		// For development, we'll force mock mode if the plugin isn't detected.
		if (typeof (window as any).cryptoPro === "undefined" && typeof (window as any).rutoken === "undefined") {
			this.isMockMode = true;
			console.log("[CryptoPro] Running in MOCK mode (plugins not found).");
		}
	}

	async getCertificates(): Promise<CertificateInfo[]> {
		if (this.isMockMode) {
			return this.getMockCertificates();
		}
		// Real implementation would invoke cadesplugin / rutoken SDK here
		return [];
	}

	async signData(thumbprint: string, data: string, pin?: string): Promise<{ signatureBase64: string; provider: string }> {
		if (this.isMockMode) {
			return this.mockSignData(thumbprint, data);
		}
		
		// Real implementation would hash the data (GOST) and call createDetachedSignature
		throw new Error("Plugin integration missing");
	}

	// --- Mock Implementation Details ---

	private async getMockCertificates(): Promise<CertificateInfo[]> {
		return [
			{
				thumbprint: "F2C99D8B...[MOCK]...A4E88",
				name: "Иванов Иван Иванович (Врач-стоматолог)",
				issuer: "ООО УЦ Тензор",
				validFrom: "2025-01-01",
				validTo: "2026-01-01",
				provider: "cryptopro",
			},
			{
				thumbprint: "D5E11F4A...[MOCK]...C2B99",
				name: "Рутокен ЭЦП 3.0 (Аппаратный)",
				issuer: "АО Актив-Софт",
				validFrom: "2024-05-10",
				validTo: "2027-05-10",
				provider: "rutoken",
			},
		];
	}

	private async mockSignData(thumbprint: string, data: string): Promise<{ signatureBase64: string; provider: string }> {
		// Simulate network / processing delay
		await new Promise((resolve) => setTimeout(resolve, 800));
		
		const mockHash = btoa(unescape(encodeURIComponent(data))).substring(0, 32);
		const signatureBase64 = `MIIB[MOCK_PKCS7_DETACHED_SIGNATURE_${mockHash}_${thumbprint}]==`;
		
		const provider = thumbprint.includes("D5E11F4A") ? "rutoken" : "cryptopro";

		return {
			signatureBase64,
			provider,
		};
	}
}

export const signatureService = new DigitalSignatureService();
