export function issueAttestation(overrides = {}) {
  const signatureOverrides = overrides.signatureAttestation ?? {};
  return {
    signatureAttestation: {
      mode: "paper_signed",
      signedAt: "2026-05-23 10:06",
      recipientFullName: "Smoke Patient",
      recipientRole: "пациент",
      staffFullName: "Smoke Admin",
      staffRole: "администратор клиники",
      identityChecked: true,
      documentOpenedAndChecked: true,
      recipientSigned: true,
      clinicRepresentativeSigned: true,
      note: "smoke issue attestation",
      ...signatureOverrides
    }
  };
}
