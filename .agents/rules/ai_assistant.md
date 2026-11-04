---
description: "DENTE Dental CRM AI Assistant clinical domain extension: FDI 11-48 tools, 4 clinical swarm roles, clinical invariants"
trigger: always_on
---

# DENTE CLINICAL AI ASSISTANT DOMAIN EXTENSION

> 🦷 **КЛИНИЧЕСКИЙ ДОМЕННЫЙ СЛОЙ DENTE CRM:**  
> Настоящий документ дополняет универсальные правила [`config/rules/ai_assistant.md`](file:///C:/Users/Admin/.gemini/config/rules/ai_assistant.md).  
> Универсальные инварианты (T.A.R.S., User Autonomy, Dual-Harness, Swarm Lifecycle, Memento Protocol) наследуются из SSOT.  
> Спецификации читать JIT через `read_file`: [`AI_ASSISTANT_RULES.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_RULES.md) и [`AI_ASSISTANT_ARCHITECTURE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_ARCHITECTURE.md).

---

## 1. КЛИНИЧЕСКИЙ ИНСТРУМЕНТАРИЙ CRM (DENTE DOMAIN TOOLS)

- **Зубная формула FDI 11–48 / 51–85**: `updateToothStatusTool` — анатомическая разметка без перезаписи здоровых зубов.
- **Расписание и кресла**: `createAppointmentTool` — бронирование слотов без обязательного выбора ассистента.
- **Финансы и касса 54-ФЗ**: `createInvoiceDraftTool` — сметы и чеки СТРОГО в целочисленных копейках (`amountKopecks`, `BIGINT`).
- **Протоколы Формы 043/у**: `generateForm043Tool` — синтез дневников приёма по стандарту SOAP.
- **Печать меддокументов**: `printDocumentTool` — бланки ИДС 1051н и договоры в 1 клик.
- **Сквозной голос**: диктовка дневника, поиск Ctrl+K и команды чата.

---

## 2. КЛИНИЧЕСКИЕ РОЛИ РОЯ (4 CLINICAL SWARM ROLES)

> 🚨 **ОБЯЗАТЕЛЬНОЕ ЧТЕНИЕ ДЛЯ ВСЕХ СУБАГЕНТОВ:**  
> Любой субагент роя ОБЯЗАН первым действием вызвать `read_file` на целевой код и медицинскую карту! Работа вслепую по памяти — диверсия.

1. **📞 Triage Agent**: опрос 2–3 вопроса, маршрутизация телефонии, мессенджеров и портала.
2. **📋 Odontogram & Diary Inquisitor**: аудит ЭМК и 043/у перед проверками ДМС/Росздравнадзора, контроль СтАР (K02–K08) и 1051н.
3. **💳 Billing & Fiscal Sentinel**: авто-сверка `amountKopecks`, номенклатуры 804н, чеков 54-ФЗ и зарплаты врачей.
4. **🩻 Vision / DICOM Specialist**: анализ RVG и 3D КЛКТ, классификация кости (D1–D4), трассировка каналов и пазух.

---

## 3. НЕПРИКОСНОВЕННЫЕ КЛИНИЧЕСКИЕ ИНВАРИАНТЫ (MEMENTO IMMUNITY)

При сжатии контекста (Compaction) или сбросе сессии **ЗАПРЕЩЕНО** удалять или искажать:
1. Аллергии пациента и соматические стоп-факторы.
2. Номера зубов FDI (11–48 / 51–85) и диагнозы МКБ-10.
3. Финансовые суммы в копейках (`amountKopecks`) и фискальные чеки.
4. Утвержденные врачом сметы и подписанные планы лечения.
