# 📞 Telephony Webhook & Patient Portal

This document explains the Telephony integration (Mango/Zadarma ATS webhooks) and the Patient Portal auth/UI pipeline.

---

## 📞 IP Telephony Webhook

The telephony system alerts clinic admins of incoming calls via a WebSocket push.

### 1. Webhook Endpoint (`apps/api/src/routes/telephony.ts`)
*   **Path:** `POST /api/telephony/:organizationId/webhook`
*   **Payload Shape:**
    ```json
    {
      "event": "ringing",
      "from": "+79991234567",
      "to": "+78005553535",
      "call_id": "mango_call_993"
    }
    ```
*   **Engine Logic:**
    1.  Extracts digits from `from` caller number.
    2.  If length >= 10, queries the `patients` database using `ilike(patients.phone, '%${last10Digits}%')`.
    3.  Dispatches WebSocket event to `wsBroker.broadcastToOrganization(organizationId, ...)` with type `TELEPHONY_INCOMING_CALL`.

### 2. Frontend Toast (`apps/web/src/components/IncomingCallToast.tsx`)
*   Listens to websocket messages at `ws://localhost:4100/api/ws/schedule`.
*   When a `TELEPHONY_INCOMING_CALL` message arrives, displays a floating toast at the bottom-right corner.
*   **Auto-hide:** Fades out after 30 seconds.
*   **Deep Link:** If a matching `patientId` exists, displays a button "Открыть карту пациента" which navigates to `/workspace/patients/:patientId`.

---

## 🚪 Patient Portal

The patient portal allows patients to check invoices, treatment stages, and visits.

### 1. APIs (`apps/api/src/routes/portal.ts`)
*   `POST /api/portal/auth/send-otp`
    *   Initiates login.
    *   *MVP Limitation:* Always succeeds and outputs sample OTP message.
*   `POST /api/portal/auth/verify-otp`
    *   Verifies the passcode (must be exactly `0000`).
    *   Finds matching patient using the last 10 digits of the phone number.
    *   Generates a JWT-like Base64 token: `Buffer.from("DENTE_TOKEN:" + patient.id).toString("base64")`.
*   `GET /api/portal/me`
    *   Requires `Authorization: Bearer <base64Token>` header.
    *   Decodes the token to fetch patient profile, visit diaries, treatment plans, and invoices.

### 2. Frontend Component (`apps/web/src/components/PatientPortal.tsx`)
*   A standalone layout for patients.
*   Uses `OTPInput` component to handle 4-digit code typing (advances active focus automatically, handles pasting numbers, backspaces).
*   Retrieves patient clinical data from `/api/portal/me` and renders invoices, treatment plans, and stages.
