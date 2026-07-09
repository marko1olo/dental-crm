# DENTE Клиническое Руководство Пользователя (Offline/Hybrid)

## Гибридная Синхронизация и Cloud Vault
DENTE работает в режиме **Offline-First**. Ваши данные всегда сохраняются локально на компьютере клиники, обеспечивая независимость от интернета.
- **Фоновая Синхронизация**: При появлении подключения к интернету, фоновая служба автоматически и безопасно (с шифрованием) синхронизирует локальную базу данных с Cloud Vault.
- **Ежедневные Бэкапы**: Раз в сутки DENTE делает полный зашифрованный дамп базы данных (алгоритм AES-256) и сохраняет его в папку ackups.

## QR-Шлюз (QrGateway)
Для мгновенного доступа без паролей и ввода URL, в верхней панели DENTE доступна кнопка **QR-Доступ**.
- **Онлайн-Запись**: Позвольте пациентам отсканировать этот QR-код на ресепшене, чтобы они могли самостоятельно записаться на прием.
- **Личный Кабинет**: Пациент сканирует QR-код и мгновенно попадает в свой защищенный профиль, где видит историю приемов, подписанные документы и планы лечения.

## 🔧 Настройка Резервного Копирования (AES-256)
Администратору не нужно вручную запускать копирование. Служба `backupWorker` делает это автоматически каждый день:
1. Зашифрованный дамп базы (`.enc`) сохраняется в директорию `backups`.
2. Никто без ключа `CLINIC_ENCRYPTION_KEY` не сможет прочитать данные пациентов. Не теряйте этот ключ из файла конфигурации!

## 🧪 Интеграция с Внешней Лабораторией
Для передачи заказов в сторонние зуботехнические лаборатории:
- В карточке пациента (модуль Наряды) нажмите **Поделиться с Лабораторией**.
- Система сгенерирует защищенную ссылку и QR-код.
- Лаборатория при сканировании получает доступ *только* к обезличенному слепку зубов и техническому заданию, без доступа к финансовой и личной информации пациента.

## Executive BI Analytics (BI ���������)

����� ������ **BI ���������** ������������� ������������� � ���������� ������� ������ �������� ��� ����������� � ������������� ���������.

### �����������:
- **��������� ������ LTV**: ������������ ����������� ������� ��������� � ������� 1, 3, 6 � 12 �������.
- **������� ������ �������**: ������������ ��������� �� �������� ��������� (Draft) �� ������� ���������� (Completed).
- **�������� ������**: �������� ������������� ����������������� ��������� �� ��������� � 12-������� ������� �����.
- **�������������� ������**: ������� �������� ������������ (Leaderboard) � �������� ������ ������� (������� ����� ������������� � ������).

### ������ ������ (OOM)
��� �������������� ��������� ���������� ������� ������������� ����������� �� ������ (unmount), ����� ������������ ������������� �� ������ ������� �������.


### 4. Billing & Doctor Payouts

The **FinanceView** now includes a complete billing lifecycle management engine:

- **Invoice Splitting**: Cashiers can split invoice payments across multiple methods (Cash, Card, DMS) using the *InvoiceSplitPaymentModal*.
- **Thermal Receipts**: The system automatically generates an 80mm thermal receipt simulator displaying the patient's FDI tooth numbers and service codes, complete with a printable QR code.
- **Doctor Payout Audits**: The **DoctorPayoutDashboard** aggregates all *paid* invoices, subtracts material costs (based on procedure rules), and computes the final doctor commission.
- **Memory Safety**: The useBillingStore purges state upon unmount, preventing React memory leaks when navigating between patient records and the financial hub.



### 5. Multi-Tenant Isolation & Memory Safety

- **Multi-Tenant Security**: The system strictly enforces organizationId isolation across all database queries, including visit_templates, bi_analytics_snapshots, and clinical_events. Data from one clinic will never bleed into another.
- **OOM Safety Gates (Phase 5)**: The CRM employs aggressive unmount cleanup hooks. Whenever a user navigates away from heavy interfaces like VisitView, PatientsView, or DocumentsView, the associated Zustand slices are instantly flushed. This prevents memory leaks and ensures V8 can garbage collect heavy objects like odontograms, voice dictations, and large document arrays, ensuring stability on thin clients.
### 6. Multi-Tenant Security

All API routes are protected by mandatory organizationId query filtering to ensure strict cross-tenant data isolation. A user from Clinic A can never access Clinic B's patients, invoices, or visits, even with valid entity IDs.
