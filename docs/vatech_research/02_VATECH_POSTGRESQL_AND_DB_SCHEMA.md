# ВАТЕК-ИНКВИЗИЦИЯ №02: АНАТОМИЯ POSTGRESQL КЛАСТЕРА, ПОЛНАЯ СХЕМА БАЗ ДАННЫХ И СТРАТЕГИЯ СИНХРОНИЗАЦИИ С DENTAL-CRM
**Статус документа:** БЕЗОГОВОРОЧНЫЙ СТАНДАРТ БАЗ ДАННЫХ ЛУЧЕВОЙ ДИАГНОСТИКИ И CRM  
**Дата инспекции:** Октябрь 2026  
**Канонический документ:** [02_POSTGRES_SCHEMA_MAPPING.md](file:///C:/Clinic_MVP/dental-crm/docs/vatech_research/02_POSTGRES_SCHEMA_MAPPING.md)  
**Объект препарации:** Кластер PostgreSQL Vatech (`03_POSTGRES_DB`), модули File Manager и базы данных EzDent-i (`02_EZDENT_PROGRAMS\Common\FM`, `EzDent-i\LocalDB`, `EzDent-i\Setting`)  
**Субъект критики:** База данных `dental-crm` (`apps/api/src/db/schema/patients.ts`, `imaging.ts`, `clinical.ts`, `apps/api/src/db/imagingQuery.ts`)  
**Принцип ревизии:** 100% факты, презумпция дефекта абстрактных схем, нулевые моки, байт-в-байт верификация.

---

> Полный детальный документ размещен в каноническом файле:  
> [`docs/vatech_research/02_POSTGRES_SCHEMA_MAPPING.md`](file:///C:/Clinic_MVP/dental-crm/docs/vatech_research/02_POSTGRES_SCHEMA_MAPPING.md)

### Краткое оглавление и ключевые тезисы:
1. **Кластер Vatech:** PostgreSQL 9.2, порт 5432, кодировка UTF-8, таймзона `Europe/Moscow`, аутентификация `md5`, слушает `0.0.0.0/0`.
2. **Базы данных:**
   - `E2` (OID `16393`): 1 705 реальных пациентов (`e2_pat`), 6 965 реальных снимков визиографа (`e2_img`), отчеты (`e2_rpt`), 3D группы (`h2_data_group`).
   - `IMPLANT_DB` (OID `17036`): 3D STL геометрия тел имплантатов (`imp_model`), линейки (`imp_lnup`), производители (`imp_com`), хирургические наборы (`surgical_kit`).
   - `SC_DB` (OID `17124`): смарт-консультации и клинические демонстрационные кейсы (`sc_category`, `sc_content`).
   - `E3` / `E3New`: 3D объемные реконструкции КЛКТ (`Tbl_CTData`), калибровочные кривые Volume Rendering (`Tbl_TFData` с точными точками плотности кости, зубов и мягких тканей), эталоны плотности HU (`Tbl_Device`).
3. **Хранилище снимков:** Детерминированная структура каталогов `FMData\Files\Sub<YYMMD>\` (например, `Sub026062`), 4 файла на снимок: `.bmp` (8-бит растр), `.raw` (16-бит сырой детекторный кадр), `.tag` (зашифрованный метаконтейнер), `.jpg` (превью).
4. **Интеграционный мост EzBridge:** Синтаксис `VTEzBridge32.exe [/in:... /out:...] /run:"<ChartNo>"` для мгновенного разворачивания карточки пациента на мониторе врача.
5. **Сервис прямого чтения:** Готовый TypeScript модуль `VatechDirectBridgeService` для `@dental/api` с нулевой задержкой отображения снимков (< 40 мс) по Мандату 8e.
