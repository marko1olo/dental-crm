# 📞 Telephony Highway, Doctor Sterile Zone & Patient Self-Checkin Portal


> 🧭 **Navigation:** [🗺️ Master Documentation Index (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Documentation Knowledge Hub (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)
> **Canonical Authority**: Mandates 8, 8c, 8e in [`.agents/AGENTS.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md) and [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md).  
> **Related Documents**: [INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) • [BILLING_AND_FINANCE.md](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md) • [WAREHOUSE_AND_SUPPLY.md](file:///C:/Clinic_MVP/dental-crm/.agents/WAREHOUSE_AND_SUPPLY.md) • [CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md) • [DOCUMENTS_LIFECYCLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md).

---

## 🎧 1. IP-телефония: АТС Webhook и WebSocket шина

Интеграционный шлюз DENTE поддерживает облачные АТС (Mango Office, Zadarma, UIS / CoMagic, Яндекс Телефония) в реальном времени связывая входящие вызовы с картотекой пациентов и софтфоном.

### 1.1. Вебхук входящего звонка (`apps/api/src/routes/telephony.ts`):
* **Маршрут**: `POST /api/telephony/:organizationId/webhook`
* **Контракт полезной нагрузки**:
  ```typescript
  interface TelephonyWebhookBody {
    event: "ringing" | "answered" | "ended";
    from: string;       // Номер звонящего (например, "+79991234567")
    to: string;         // Входящий номер клиники
    call_id?: string;   // Уникальный ID сессии АТС
  }
  ```
* **Пайплайн сопоставления**:
  1. Очистка номера от спецсимволов: `rawPhone.replace(/\D/g, "")`.
  2. Поиск пациента по суффиксу из последних 10 цифр (`ilike(patients.phone, '%${suffix}')`).
  3. Мгновенная диспетчеризация события `TELEPHONY_INCOMING_CALL` через `wsBroker.broadcastToOrganization(organizationId, payload)`.

### 1.2. WebSocket контракт (`TELEPHONY_INCOMING_CALL`):
```json
{
  "type": "TELEPHONY_INCOMING_CALL",
  "payload": {
    "callId": "call-session-98412",
    "phone": "+79137704199",
    "patientId": "uuid-patient-or-null",
    "patientName": "Смирнова Анна Викторовна",
    "status": "ringing",
    "timestamp": "2026-09-04T12:00:00Z"
  }
}
```

---

## 🛡️ 2. Иммунитет стерильной зоны врача (Doctor Sterile Zone Immunity)

> **Клинический инвариант (The Hammer Master Prompt Раздел VII & Фильтр изоляции ролей)**:  
> Врачебный экран (`VisitView` / роль `doctor`) — это **стерильная зона**. Врач у кресла в перчатках препарирует зуб или проводит хирургическую операцию. Любые всплывающие окна телефонии, неожиданные рингтоны или блокирующие экраны — это прямая угроза пациенту и врачебная диверсия.

### 2.1. Полная изоляция от звонков:
* **Кодовая гарантия (`IncomingCallPopup.tsx` и `TelephonyFloatingWidget.tsx`)**:
  ```typescript
  // Doctor sterile zone immunity: on visit view or for doctor role, telephony never invades chairside
  const selectedWorkspaceRole = useAppStore((s) => s.selectedWorkspaceRole);
  const currentView = useAppStore((s) => s.currentView);
  const isDoctorMode = selectedWorkspaceRole === "doctor" || currentView === "visit";

  if (isDoctorMode) {
    // Софтфон полностью беззвучен и скрыт. Рингтон Web Audio API глушится намертво.
    return null;
  }
  ```
* Звонки АТС адресованы исключительно регистраторам, координаторам лечения и операторам колл-центра.

---

## 🛎️ 3. Всплывающий Ambient Banner для регистратуры (Zero Modal Lock)

Экран регистратора — зона многозадачности. Администратор одновременно общается по телефону, просматривает расписание и заполняет договор.

### 3.1. Запрет на блокирующий оверлей (Anti-Modal Barrier):
* **Компоновка Dynamic Island Capsule**: баннер входящего звонка выезжает сверху (`fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-[9999]`) в виде компактной плашки:
  `[ 🟢 Смирнова А.В. (+7 913 770-41-99) • Ответить | Сброс | ▾ ]`
* **Категорически запрещен modal lock**: нет затемняющего оверлея `fixed inset-0 bg-black/60`. Фокус ввода в текущей форме не сбрасывается, клавиатура не перехватывается.

### 3.2. 1-Клик действия без потери данных:
* **Быстрая запись (Quick Booking)**: создание черновика записи в 1 клик (`Острая боль / Экстренный прием` или стандартный слот). **Категорически запрещено требовать обязательного выбора ассистента** при создании записи (Мандат 8e).
* **Боковая шторка карты пациента (Side Drawer)**: вызов карточки звонящего происходит во всплывающем Drawer без перехода по страницам и **без размонтирования активного дневника 043/у**.
* **Esc-дисмисс**: нажатие клавиши `Escape` закрывает шторку звонка, не сбрасывая соединение и не прерывая разговор.

---

## 📱 4. Пациентский портал саморегистрации (Mobile Self-Checkin)

Реализован в соответствии со стандартами Apple Health / iOS HIG (`MobileSelfCheckinModal.tsx` и `SomaticQuestionnaireEngine.ts`). Обеспечивает бесконтактную регистрацию пациента в холле клиники со смартфона за 30 секунд.

### 4.1. Авторизация и подписание согласий ПЭП (63-ФЗ):
1. **Беспарольный вход (Phone OTP)**: ввод номера телефона и проверочного кода.
2. **1-Клик подписание согласий ПЭП (63-ФЗ)**:
   * `ИДС-ТЕР-01` — Информированное добровольное согласие на терапевтическое лечение (ст. 20 № 323-ФЗ).
   * `ИДС-АНЕСТ-01` — Информированное согласие на местное обезболивание (карпульные анестетики).
   * `ПДН-152` — Согласие на обработку персональных данных (Федеральный закон № 152-ФЗ).
   * Кнопка **«Подписать всё ПЭП (63-ФЗ)»** проставляет валидный электронный штамп времени и цифровой след с кодом подтверждения в 1 тап.

### 4.2. Соматическая анкета: физиологическая норма по умолчанию (Mandate 8e):
* **Принцип «Норма по умолчанию»**: здоровая взрослая норма не требует ручного заполнения 50 полей.
* **1-Клик кнопка «Соматически здоров / физиологическая норма»**:
  ```typescript
  // Заполняет профиль физиологической нормой:
  // Аллергий нет, кардиорисков нет, диабета нет, нарушений гемостаза нет.
  const normData = createPhysiologicalNormSomaticQuestionnaire();
  ```
* Пациент или врач отмечают **только патологию** (например, «Аллергия на пенициллин» или «Прием антикоагулянтов»).
* **Движок оценки рисков (`evaluateSomaticRisks`)**: автоматически формирует семантические алерты для врача у кресла (`allergy`, `cardio`, `hemostasis`, `pregnancy`).

### 4.3. Генерация талона с QR-кодом:
После завершения саморегистрации генерируется посадочный QR-код формата `CK-YYYY-XXXX`, который считывается 2D-сканером на стойке администратора, мгновенно меняя статус записи в расписании на «Пациент явился / в клинике».

---

## 🔗 5. Карта файлов и компонентов

| Назначение | Frontend компонент | Backend маршрут |
| :--- | :--- | :--- |
| **АТС Webhook & Events** | [`telephony.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony.ts) | `POST /api/telephony/:orgId/webhook` |
| **Ambient Call Popup** | [`IncomingCallPopup.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/telephony/IncomingCallPopup.tsx) | `ws://localhost:4100/api/ws/schedule` |
| **SIP Софтфон Capsule** | [`TelephonyFloatingWidget.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/telephony/TelephonyFloatingWidget.tsx) | `useTelephonyStore.ts` |
| **Self-Checkin Portal** | [`MobileSelfCheckinModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/portal/selfCheckin/MobileSelfCheckinModal.tsx) | `POST /api/portal/auth/verify-otp` |
| **Соматическая норма** | [`SomaticQuestionnaireEngine.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/portal/selfCheckin/SomaticQuestionnaireEngine.ts) | `evaluateSomaticRisks()` |
| **Личный кабинет пациента**| [`PatientMobilePortalModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/portal/PatientMobilePortalModal.tsx) | `GET /api/portal/me` |

