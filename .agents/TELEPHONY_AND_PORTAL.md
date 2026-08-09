# 📞 Telephony Webhook & Patient Portal

This document details the Telephony integration (Mango/Zadarma ATS webhooks), WebSocket message contracts, and the Patient Portal auth/UI pipeline.

---

## 📞 IP Telephony Webhook

The telephony integration links an incoming phone call to a patient card and notifies clinic administrators in real-time.

### 1. Webhook Endpoint (`apps/api/src/routes/telephony.ts`)
*   **Path:** `POST /api/telephony/:organizationId/webhook`
*   **Body Payload Schema:**
    ```typescript
    interface TelephonyWebhookBody {
      event: "ringing" | "answered" | "ended";
      from: string;       // Caller phone number (e.g. "+79991234567")
      to: string;         // Target clinic phone number
      call_id?: string;   // Unique call session identifier
    }
    ```
*   **Ringing Event Pipeline:**
    1.  Clears non-digit characters from the `from` phone number: `from.replace(/\D/g, "")`.
    2.  If the processed number is at least 10 digits long, queries Drizzle for a patient matching the last 10 digits:
        ```typescript
        const phoneSuffix = rawPhone.slice(-10);
        const match = await db.select().from(patients)
          .where(ilike(patients.phone, `%${phoneSuffix}%`))
          .limit(1);
        ```
    3.  If a patient is found, grabs their ID and formats their name: `LastName FirstName`.
    4.  Dispatches a WebSocket notification using `wsBroker` (see contract below).
    5.  Returns `{ success: true }` to Mango/Zadarma to acknowledge the webhook.

### 2. WebSocket Broadcast Event (`TELEPHONY_INCOMING_CALL`)
When a webhook triggers, the server broadcasts this JSON structure to all websocket connections active under `organizationId`:
```json
{
  "type": "TELEPHONY_INCOMING_CALL",
  "payload": {
    "phone": "+79991234567",
    "patientId": "uuid-patient-id-or-null",
    "patientName": "Иванов Иван" (or "Неизвестный номер"),
    "timestamp": "2026-07-15T11:22:00Z"
  }
}
```

### 3. Frontend Toast (`apps/web/src/components/IncomingCallToast.tsx`)
*   Instantiated globally inside `App.tsx` layout structure.
*   Connects to `ws://localhost:4100/api/ws/schedule?orgId=<orgId>` via `useWebsocket.ts`.
*   Listens for the `TELEPHONY_INCOMING_CALL` websocket type.
*   Displays a floating emerald card in the bottom-right corner.
*   **Swarm Routing:** Uses Zustand state setters `setSelectedPatientId` from `patientStore` and `setCurrentView("patients")` from `appStore` to switch panels and display the correct patient card instantly without `react-router-dom` navigation paths.

---

## 🚪 Patient Portal & Stateless Auth

The Patient Portal allows clinic clients to login and access invoices, treatment stages, and clinical visit history.

### 1. Stateless Authentication Pipeline (`apps/api/src/routes/portal.ts`)
*   **OTP Initiation (`POST /api/portal/auth/send-otp`):**
    *   Accepts `{ phone: string }`.
    *   *MVP Mode:* Bypasses SMS gateways and directly responds with `{ success: true, message: "OTP sent" }`. The code is always `0000`.
*   **OTP Verification (`POST /api/portal/auth/verify-otp`):**
    *   Accepts `{ phone: string, code: string }`.
    *   Enforces code `0000`.
    *   Sanitizes and checks phone suffix against the database.
    *   **JWT-less Base64 Token:** If verified, issues a stateless base64 session token containing the patient ID:
        ```typescript
        const token = Buffer.from(`DENTE_TOKEN:${patient.id}`).toString("base64");
        ```
*   **Protected Data Retrieval (`GET /api/portal/me`):**
    *   Decodes `Authorization: Bearer <base64Token>`.
    *   Extracts patient ID: `decodedStr.replace("DENTE_TOKEN:", "")`.
    *   Queries `visitDiaries`, `treatmentPlans`, and `patientInvoices` for that patient.

### 2. Frontend OTP Input (`apps/web/src/components/PatientPortal.tsx`)
*   Implements `OTPInput` component using an array of inputs `digits` (length 4).
*   Auto-advances focus to next digit element on input.
*   Supports backspace key jumps (clearing previous inputs and shifting focus back).
*   Handles clipboard paste events safely parsing only numerical digits.
