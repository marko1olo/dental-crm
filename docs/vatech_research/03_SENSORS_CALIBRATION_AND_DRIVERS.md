# ТЕХНИЧЕСКИЙ ОТЧЕТ RED TEAM: АРХИТЕКТУРА ДРАЙВЕРОВ СЕНСОРА VATECH EZSENSOR, АЛГОРИТМЫ КАЛИБРОВКИ, ФОРМАТЫ КАРТ И ЭКСПОРТНЫЕ ИНТЕРФЕЙСЫ DLL

> **Статус документа:** Исчерпывающее реверс-инженерное исследование (Ground Truth)  
> **Объект исследования:** Дистрибутив Vatech EzSensor (`04_EZSENSOR_CALIBRATION`, `01_FLASH_BACKUP`)  
> **Исследованные модули:** `EzSensor.dll`, `VACAL.dll`, `View16.dll`, `ZeusIO.dll`, `ExtraOralIP.dll`, `Vatech_IntraOral.sys`, `Twain1xPatch.exe`  
> **Конфигурации и калибровочные карты:** `MultiSensor/E15OHED518-26085/`, `Log/$B*.raw`, `ZeusIO.ini`, `view16.ini`, `EzSensor.ini`  

---

## 1. АППАРАТНАЯ СПЕЦИФИКАЦИЯ И USB-ИДЕНТИФИКАТОРЫ (VID / PID)

В результате анализа драйверного пакета `Vatech_IntraOral.inf` (версия драйвера `03/18/2014, 3.1.0.0`, сервис `VaTech`, класс устройств Windows `Image`, `ClassGuid = {6BDD1FC6-810F-11D0-BEC7-08002BE2092F}`) выявлена полная номенклатура аппаратных идентификаторов сенсоров Vatech.

### 1.1. Базовые контроллеры и USB-микросхемы
* **`VID_04B4 & PID_8613`**: Cypress Semiconductor CY7C68013A (EZ-USB FX2LP). Дефолтный bootloader USB-контроллера без прошитой EEPROM. Драйвер идентифицирует его как `«VaTech DXI Driver - EEPROM missing»`.
* **`VID_0547`**: Anchor Chips / Cypress Vendor ID, зарегистрированный для линейки контроллеров Vatech.

### 1.2. Матрица поддерживаемых моделей визиографов
| USB Hardware ID | Наименование модели по классификатору Vatech | Поколение / Особенности |
| :--- | :--- | :--- |
| `USB\VID_0547&PID_2001` | **VH EzSensor 1.5** | EzSensor Classic 1.5 |
| `USB\VID_0547&PID_2002` | **VH AnySensor 1.0** | AnySensor 1.0 |
| `USB\VID_0547&PID_2003` | **VH EzSensor 2.0** | EzSensor Classic 2.0 |
| `USB\VID_0547&PID_2004` | **VH EzSensor 1.0** | EzSensor Classic 1.0 |
| `USB\VID_0547&PID_2005` | **VH EzSensor-N 1.0** | EzSensor-N (New) Размер 1.0 |
| `USB\VID_0547&PID_2006` | **VH EzSensor-N 1.5** | **Исследуемый экземпляр (SerialID: E15OHED518-26085)** |
| `USB\VID_0547&PID_2007` | **VH EzSensor-N 2.0** | EzSensor-N (New) Размер 2.0 |
| `USB\VID_0547&PID_2008` | **VH IntraOral Sensor 1** | OEM интраоральный сенсор 1 |
| `USB\VID_0547&PID_2009` | **VH IntraOral Sensor 2** | OEM интраоральный сенсор 2 |
| `USB\VID_0547&PID_200A` .. `2016` | **IntraOral Sensor A .. M** | Резервные и OEM модификации матриц |

### 1.3. Физические параметры исследуемого сенсора (EzSensor-N 1.5)
По данным логов `EU00.log`, `EZDENT00.log` и бинарных матриц:
* **Серийный номер сенсора:** `E15OHED518-26085` (`ModelTag = 2`).
* **Аппаратное напряжение сброса матрицы (VReset):** $1.66\text{ В}$ (байт конфигурации регистра `1:A6h`).
* **Сырое аппаратное разрешение матрицы:** $686 \times 944$ пикселей ($647\,584$ пикселей).
* **Клиническое полезное поле (после кадрирования):** $671 \times 924$ пикселей ($620\,004$ пикселей).
* **Физический размер пикселя (Pixel Pitch):** $35.0 \times 35.0\,\mu\text{м}$ ($0.0350\text{ мм}$).
* **Пространственное разрешение:** $28.6\text{ пар линий/мм}$ (или $28.6\text{ пикс/мм}$).
* **Теоретический предел Найквиста:** $f_{Nyquist} = \frac{1}{2 \times 0.035\text{ мм}} \approx 14.28\text{ lp/mm}$.
* **Битовая глубина АЦП сенсора:** 12 бит ($0 \dots 4095$ уровней серого).
* **Формат хранения в памяти и файлах `.raw`:** 16-битный беззнаковый целочисленный Little-Endian (`uint16_t`, 2 байта на пиксель). Старшие 4 бита ($12 \dots 15$) равны нулю.

---

## 2. АРХИТЕКТУРА И ФОРМАТ КАЛИБРОВОЧНЫХ КАРТ (.RAW)

В директории `MultiSensor/E15OHED518-26085/` и `Log/` все файлы `.raw` имеют строго фиксированный размер:
$$\text{Размер файла} = 686 \times 944 \times 2 = 1\,295\,168\text{ байт}$$

Заголовок (header) в файлах отсутствует: данные представляют собой «чистый» плоский массив памяти (`raw buffer`) размером $686 \times 944$ значений `uint16_t` с построчной разверткой (row-major order).

```
Смещение (байт) = 2 * (y * FrameWidth + x)
где FrameWidth = 686, FrameHeight = 944
```

### 2.1. Классификация и статистический анализ калибровочных файлов

| Имя файла | Назначение в калибровочном пайплайне | Min | Max | Среднее (Mean) | СКО (StdDev) | Ненулевые пиксели |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `dark.raw` | **Dark Field (Темновой ток)**. Карта аддитивного аппаратного шума, токов утечки фотодиодов и смещения усилителей (Offset). | 15 | 4086 | 848.50 | 546.67 | 647 584 (100.0%) |
| `A00_00387.raw` | Калибровочная точка №0 (Номинал $T_0 = 387$) | 0 | 424 | 371.57 | 72.26 | 624 632 (96.46%) |
| `A01_00674.raw` | Калибровочная точка №1 (Номинал $T_1 = 674$) | 0 | 716 | 646.04 | 125.48 | 624 632 (96.46%) |
| `A02_00902.raw` | Калибровочная точка №2 (Номинал $T_2 = 902$) | 0 | 953 | 865.08 | 167.93 | 624 632 (96.46%) |
| `A03_01217.raw` | Калибровочная точка №3 (Номинал $T_3 = 1217$) | 0 | 1279 | 1167.05 | 226.38 | 624 632 (96.46%) |
| `A04_01592.raw` | Калибровочная точка №4 (Номинал $T_4 = 1592$) | 0 | 1673 | 1526.88 | 295.91 | 624 632 (96.46%) |
| `A05_02008.raw` | Калибровочная точка №5 (Номинал $T_5 = 2008$) | 0 | 2101 | 1926.43 | 372.89 | 624 632 (96.46%) |
| `A06_02373.raw` | Калибровочная точка №6 (Номинал $T_6 = 2373$) | 0 | 2476 | 2277.12 | 440.22 | 624 632 (96.46%) |
| `A07_02770.raw` | Калибровочная точка №7 (Номинал $T_7 = 2770$) | 0 | 2877 | 2659.98 | 513.27 | 624 632 (96.46%) |
| `BPM.raw` | **Manufacturer Bad Pixel Map**. Маска аппаратных дефектов завода-изготовителя. Дефектные пиксели имеют значение `2`. | 0 | 2 | 0.0001 | 0.01 | 18 (0.0028%) |
| `BPMU.raw` | **User/Boundary Defect Map**. Маска неисправимых краевых/мертвых пикселей периметра. Мертвые пиксели имеют значение `1`. | 0 | 1 | 0.0354 | 0.18 | 22 952 (3.5443%) |
| `$B87.raw` .. `$B99.raw` | Сырые дампы кадров реальных экспозиций пациента из рабочей директории `Log/`. | 0 | ~2100 | ~780–820 | ~420–550 | 647 584 (100.0%) |

### 2.2. Архитектурное открытие: природа краевой маски `BPMU.raw`
Точное соответствие чисел в логе `vaCal00.log`:
$$647\,584\text{ (всего пикселей)} - 624\,632\text{ (ненулевых в калибровочных точках)} = 22\,952\text{ пикселя}$$
В файле `BPMU.raw` ровно $22\,952$ пикселя отмечены флагом `1`. Это не дефект матрицы, а физическая нечувствительная технологическая рамка вокруг кремниевого кристалла сенсора ($686 \times 944$). В логе `vaCal00.log` это отражено как:
`BPM: 17167 (91.3478%) of bad pixels are incorrectable` (пиксели на самых границах кристалла, у которых нет валидных соседей для 2D-интерполяции).

---

## 3. МАТЕМАТИЧЕСКАЯ МОДЕЛЬ КАЛИБРОВКИ ПИКСЕЛЕЙ (REVERSE-ENGINEERED)

Реверс-инжиниринг ассемблерного кода функций `VCA_Process` (RVA `0x1cf10`), worker-потоков `Dark Worker` (RVA `0x2490`), `Gain Worker` (RVA `0x3c80`), кусочно-линейного интерполятора (RVA `0x4a50`) и BPM-интерполятора (RVA `0x50b0`) в `VACAL.dll` позволил полностью восстановить математический конвейер.

Процесс преобразования сырого кадра $I_{raw}(x, y)$ в клинический $I_{calibrated}(x, y)$ выполняется строго в 4 последовательных этапа:

```
[I_raw(x, y)] ---> (Этап 1: Dark Subtraction) ---> [I_1(x, y)]
              ---> (Этап 2: Piecewise Linear Gain) ---> [I_2(x, y)]
              ---> (Этап 3: Directional BPM Repair) ---> [I_3(x, y)]
              ---> (Этап 4: Clinical ROI Crop) ---> [I_final(x', y')]
```

### Этап 1: Вычитание темнового тока (Dark Field Subtraction)
Для каждой координаты $(x, y) \in [0, 685] \times [0, 943]$:
$$I_1(x, y) = I_{raw}(x, y) - D(x, y)$$
где $D(x, y)$ — значение темнового шума из `dark.raw`.

**Обработка отрицательных пикселей (Negative Pixels Handling):**
Если уровень темнового тока в момент калибровки превысил текущий сырой отсчет ($I_1(x, y) < 0$), инкрементируется счетчик отрицательных пикселей `negative_pixels` (в логах `vaCal00.log` фиксируется предупреждение: `WRN: 17627 (2.722%) negative pixels`).
* Если в конфигурации `Cal_NegPixCompensation = 0` (по умолчанию):
  $$I_1(x, y) = \max(0, I_1(x, y))$$
* Если `Cal_NegPixCompensation = 1`: вызывается подпрограмма компенсации базовой линии (RVA `0x28b0`), сдвигающая локальный фон на медианное смещение шума.

### Этап 2: Мультиточечная кусочно-линейная калибровка усиления (Piecewise Linear Gain Calibration)
В классических сенсорах используется одноточечная плоская калибровка ($I_{out} = \frac{I_{raw} - D}{Gain}$). Vatech применяет **8-точечную кусочно-линейную сплайн-интерполяцию**, учитывающую нелинейность емкости p-n перехода фотодиода CMOS при различных дозах облучения.

Имеются 8 опорных калибровочных точек:
* Вектор номинальных целевых интенсивностей:
  $$T = [387, 674, 902, 1217, 1592, 2008, 2373, 2770]$$
* Вектор индивидуального отклика пикселя $(x, y)$ на эти экспозиции:
  $$X_k(x, y) = A_k(x, y) - D(x, y), \quad k \in \{0, 1, \dots, 7\}$$

Для текущего значения $I_1(x, y)$ алгоритм ищет отрезок $[k, k+1]$, удовлетворяющий условию:
$$X_k(x, y) \le I_1(x, y) < X_{k+1}(x, y)$$

Значение скорректированной интенсивности вычисляется целочисленной интерполяцией:
$$I_2(x, y) = T_k + \left\lfloor \frac{(I_1(x, y) - X_k(x, y)) \cdot (T_{k+1} - T_k)}{X_{k+1}(x, y) - X_k(x, y)} + 0.5 \right\rfloor$$

**Граничные условия экстраполяции:**
1. **Зона малых доз ($I_1(x, y) < X_0(x, y)$):**
   Линейная экстраполяция через ноль:
   $$I_2(x, y) = \left\lfloor \frac{I_1(x, y) \cdot T_0}{X_0(x, y)} + 0.5 \right\rfloor$$
2. **Зона высоких доз ($I_1(x, y) \ge X_7(x, y)$):**
   Линейная экстраполяция по угловому коэффициенту последнего отрезка:
   $$I_2(x, y) = T_7 + \left\lfloor \frac{(I_1(x, y) - X_7(x, y)) \cdot (T_7 - T_6)}{X_7(x, y) - X_6(x, y)} + 0.5 \right\rfloor$$
3. **Ограничение насыщения (Saturation Clamp):**
   По параметру `Cal_SatValue = 4070` из `EzSensor.ini`:
   $$I_2(x, y) = \min(I_2(x, y), 4070)$$

### Этап 3: Направленная адаптивная коррекция битых пикселей (Directional BPM Replacement)
Пиксель $(x, y)$ признается дефектным, если `BPM(x, y) == 2` или `BPMU(x, y) == 1`.
Для сохранения резкости тонких костных трабекул и периодонтальной щели `VACAL.dll` не применяет размывающее гауссово сглаживание, а вычисляет градиенты вдоль направлений:

1. **Горизонтальный градиент:**
   $$\Delta_H = |I_2(x - 1, y) - I_2(x + 1, y)|$$
2. **Вертикальный градиент:**
   $$\Delta_V = |I_2(x, y - 1) - I_2(x, y + 1)|$$

**Правило замещения:**
* Если оба горизонтальных соседа валидны и $\Delta_H \le \Delta_V$:
  $$I_3(x, y) = \left\lfloor \frac{I_2(x - 1, y) + I_2(x + 1, y) + 1}{2} \right\rfloor$$
* Если оба вертикальных соседа валидны и $\Delta_V < \Delta_H$:
  $$I_3(x, y) = \left\lfloor \frac{I_2(x, y - 1) + I_2(x, y + 1) + 1}{2} \right\rfloor$$
* **Кластерные дефекты (Cluster Defects):** если один из прямых соседей также помечен как дефектный в `BPM`, алгоритм расширяет окрестность до 6 или 8 точек, исключая дефектные, и вычисляет среднее:
  $$I_3(x, y) = \left\lfloor \frac{\sum_{m=1}^M P_m + \lfloor M / 2 \rfloor}{M} \right\rfloor$$
  *(В машинном коде RVA `0x50b0` деление на $M=6$ реализовано умножением на магическую константу `0x2AAAAAAB`)*.

### Этап 4: Геометрическое кадрирование клинической области (ROI Crop)
По параметрам `EzSensor.ini` (`[Settings]`):
* `ImgCutLeft = 10`
* `ImgCutTop = 15`
* `ImgCutRight = 5`
* `ImgCutBottom = 5`

Результирующие координаты клинического кадра $I_{final}(x', y')$:
$$x' \in [0, 670], \quad y' \in [0, 923]$$
$$I_{final}(x', y') = I_3(x' + 10, \, y' + 15)$$
$$W_{clinical} = 686 - (10 + 5) = 671\text{ пикселей}$$
$$H_{clinical} = 944 - (15 + 5) = 924\text{ пикселей}$$

---

## 4. СИГНАТУРЫ И АРХИТЕКТУРА ЭКСПОРТНЫХ C/C++ API

Комплекс библиотек Vatech разделен на три изолированных слоя:
1. **Слой захвата кадров и USB-транспорта (`EzSensor.dll`)** — интерфейс `VDACQ_*` и `VD_*`.
2. **Слой аппаратной калибровки матриц (`VACAL.dll`)** — интерфейс `VCA_*`.
3. **Слой клинической постобработки и фильтрации (`ZeusIO.dll` / `ExtraOralIP.dll`)** — интерфейс `ImageProcessing*`.

Ниже представлены точные C/C++ заголовочные объявления, восстановленные по таблицам экспорта (PE Export Directory) и конвенциям вызова.

### 4.1. Слой захвата: `EzSensor.dll`

```c
#pragma once
#include <windows.h>

#ifdef __cplusplus
extern "C" {
#endif

// Константы флагов калибровки и захвата
#define VDC_FLAG_DARK_SUBTRACTION   0x00000001
#define VDC_FLAG_GAIN_CALIBRATION   0x00000002
#define VDC_FLAG_BAD_PIXEL_MAP      0x00000004
#define VDC_FLAG_ALL_CALIBRATION    0x00000007

// Структура дескриптора кадра
typedef struct {
    int   nWidth;          // 686 для EzSensor 1.5
    int   nHeight;         // 944 для EzSensor 1.5
    int   nBitsAllocated;  // 16
    int   nBitsStored;     // 12
    void* pPixelData;      // Указатель на буфер uint16_t[Width * Height]
} VATECH_FRAME_DESC;

// 1. Инициализация и подключение USB-детектора
// hWnd - окно для оконных сообщений, nPID - USB Product ID (напр. 0x2006)
// nTimeoutSec - таймаут ожидания готовности, pStatusCallback - коллбек прогресса
int __stdcall VDACQ_Connect(HWND hWnd, int nPID, int nInterface, int nTimeoutSec, void* pStatusCallback);

// 2. Останов / закрытие соединения
int __stdcall VDACQ_Abort(int nHandle);
int __stdcall VDACQ_Close(int nHandle);

// 3. Запрос геометрических параметров детектора
int __stdcall VDACQ_GetFrameDim(int* pWidth, int* pHeight);
int __stdcall VDACQ_SetFrameDim(int nWidth, int nHeight);

// 4. Запуск ожидания экспозиции и прием сырого кадра
// nFlags: 1 = RC (Ready to Capture). Блокирует до прихода X-ray импульса или таймаута
int __stdcall VDACQ_StartFrame(int nFlags);

// 5. Низкоуровневые команды прошивки (FX2LP Vendor Commands)
int __stdcall VDACQ_SendCommand(int nCmdCode, int nParam);
int __stdcall VDACQ_SendCommandParam(int nCmdCode, int nSubCmd, void* pBuffer, int nBufSize);
int __stdcall VDACQ_VendorCommand(int nReq, int nVal, int nIdx, void* pData);

// 6. Высокоуровневые вызовы захвата снимка
int __stdcall VD_GetImage(void* pTargetBuffer);
int __stdcall VD_GetImageCancel(void);
int __stdcall VD_Set_Acquisition(int p1, int p2, int p3, int p4, int p5);

// 7. Конфигурационные вызовы INI
int __stdcall VD_IniProfGetStr(const wchar_t* lpKeyName, wchar_t* lpReturnedString);
int __stdcall VD_IniProfSetSection(const wchar_t* lpSectionName, const wchar_t* lpString);

#ifdef __cplusplus
}
#endif
```

### 4.2. Слой калибровки: `VACAL.dll`

```c
#pragma once
#include <windows.h>

#ifdef __cplusplus
extern "C" {
#endif

// Хэндлер контекста калибровки
typedef void* HVCAL;

// 1. Создание и удаление контекста калибровки
HVCAL __cdecl   VCA_CreateHandler(void);
int   __stdcall VCA_CloseHandler(HVCAL hCal);

// 2. Конфигурирование путей к директориям калибровки и логов
int __stdcall VCA_SetCalibrationDirectory(HVCAL hCal, const wchar_t* pwszCalDir);
int __stdcall VCA_GetCalibrationDirectory(HVCAL hCal, wchar_t* pwszBuffer);
int __stdcall VCA_SetLogDirectory(HVCAL hCal, const wchar_t* pwszLogDir);
int __stdcall VCA_GetLogDirectory(HVCAL hCal, wchar_t* pwszBuffer);

// 3. Задание параметров матрицы
int __stdcall VCA_SetFrameDim(HVCAL hCal, int nWidth, int nHeight);
int __stdcall VCA_GetFrameDim(HVCAL hCal, int* pWidth, int* pHeight);
int __stdcall VCA_NumThreads(int nThreads); // Обычно 2 потока

// 4. ГЛАВНАЯ ФУНКЦИЯ КАЛИБРОВКИ КАДРА
// nFlags: 1 = Dark, 2 = Bright/Gain, 4 = BPM, 7 = Full
// pFrameDesc: структура { int width, int height, int bpp, ... , uint16_t* pixels }
// Возвращает: 1 при успехе, 0 при ошибке
int __cdecl VCA_Process(int nFlags, VATECH_FRAME_DESC* pFrameDesc);

// 5. Кадрирование (Crop) сырого буфера до полезной клинической зоны
int __stdcall VCA_CutImage(HVCAL hCal, const uint16_t* pSrcRaw, uint16_t* pDstCropped);

// 6. Генерация калибровочных файлов из серии тестовых снимков
int __cdecl VCA_GenerateBadPixelsMap(HVCAL hCal, const wchar_t* pwszDarkPattern, const wchar_t* pwszBrightPattern);
int __cdecl VCA_GenerateCalibrationFrame(HVCAL hCal, int nPointIndex, const wchar_t* pwszRawFile);

#ifdef __cplusplus
}
#endif
```

### 4.3. Слой клинической постобработки: `ZeusIO.dll` и `ExtraOralIP.dll`

Библиотеки выполняют адаптивное контрастирование, маскирование нерезкости (Unsharp Masking, USM) и гамма-коррекцию для визуализации эмали, дентина и костной ткани:

```c
#pragma once

#ifdef __cplusplus
extern "C" {
#endif

// Вызов обработки фильтрами
// pInOutBuffer - буфер 16-бит изображения (изменяется in-place)
// nWidth, nHeight - размеры кадра
// nBits - 12 или 16
// lpIniPath - путь к INI-файлу с секциями [IP_LEVEL*] или [IP1..IP304]
// nModeIndex - номер режима обработки (1 = Molar, 4 = Front lower, 301 = Standard #1)
int __cdecl ImageProcessing(uint16_t* pInOutBuffer, int nWidth, int nHeight, int nBits, const wchar_t* lpIniPath, int nModeIndex);

// Вариант со встроенной структурой параметров
int __cdecl ImageProcessingS(uint16_t* pInOutBuffer, int nWidth, int nHeight, void* pInternalParams);

// Поворот изображения на 90, 180, 270 градусов
int __cdecl RotateImage(uint16_t* pBuffer, int nWidth, int nHeight, int nAngleDegrees);

#ifdef __cplusplus
}
#endif
```

---

## 5. ХРОНОМЕТРАЖ, ПОРОГИ ЭКСПОЗИЦИИ И КОДЫ ОШИБОК

### 5.1. Реальные временные диаграммы работы сенсора (по логам EZDENT*.log)
Анализ 11 сессий съемки (`EZDENT00.log` .. `EZDENT10.log`) показал реальные тайминги физических этапов:

```
[0.00s] Запрос системной информации USB: wait 0.09s - 0.11s
[0.11s] Инициализация VReset=1.66V (регистр 1:A6h)
[0.60s] Перевод сенсора в режим готовности (Acquisition flags=1h RC)
   |    ОЖИДАНИЕ ВСПЫШКИ РЕНТГЕНОВСКОЙ ТРУБКИ: от 14.28s до 23.11s
[23.11s] Аппаратный старт считывания строк матрицы (SOL=943, EOL=943, COL=715)
[23.49s] Окончание USB Bulk IN приема 688 128 слов: 0.38 секунды!
[23.50s] Сохранение дампа $B00.raw в Log/ (0.01s)
[23.55s] Вызов VACAL.dll (flags=80000007h, 3 шага): 0.05 - 0.10 секунды!
[23.65s] Вызов Aux IP [IP301] (ZeusIO.dll / Unsharp mask): 1.3 - 1.4 секунды.
[25.00s] ПОЛНЫЙ ЦИКЛ ЗАВЕРШЕН. Снимок доступен врачу на экране!
```

**Критический вывод:** Сенсор передает полный сырой 12-битный снимок по USB 2.0 всего за **0.38 секунды**. Аппаратная калибровка `VACAL.dll` выполняется за **50 миллисекунд**! Основное время уходит на Unsharp Masking в `ZeusIO.dll` (~1.3 с). Это полностью укладывается в норматив Мандата 8e (<50 мс на рентген без ожидания ИИ).

### 5.2. Каталог диагностических и аварийных кодов (EzSensor.ini / EzSensor.tsf)

| Код ошибки | Сообщение системы | Аппаратная первопричина и диагностика |
| :--- | :--- | :--- |
| `Msg101` | `The driver is not installed` | В системе отсутствует `Vatech_IntraOral.sys` или не прописан GUID устройства. |
| `Msg102` | `PID%4x no interface #%d (check connection)` | USB-порт выдает недостаточное питание или нарушена целостность кабеля. |
| `Msg103` | `PID%4x wrong interface #%d (check USB-drivers)` | Конфликт драйвера с generic WinUSB / libusb. |
| `Msg104` | `Can't create file %s (device is used)` | Устройство занято другим процессом (например, службой захвата EasyDent). |
| `Msg105` | `Time-out in read-out operation` | Превышен таймаут считывания кадров (X-ray кнопка не была нажата или низкая доза). |
| `Msg106` | `Premature EOF` | Обрыв USB-пакета посреди кадра (принято меньше $688\,128$ слов). |
| `Msg107` | `Transport stream parsing code #%d` | Сбой маркеров строк `SOL` (Start of Line) или `EOL` (End of Line). |
| `Msg109` | `Serial ID %s mismatches connected one %s` | Подключен датчик с другим серийным номером, калибровки не совпадают. |
| `Msg110` | `Sudden disconnection is detected` | Аппаратное отключение USB-разъема во время ожидания или съемки (`wrnCode=5`). |
| `Msg201` | `OfsCal can't load dark frame` | В папке калибровки отсутствует или поврежден файл `dark.raw`. |
| `Msg202` | `GainCal can't load calibration point` | Отсутствует один из файлов калибровочных точек `A00_*.raw` .. `A07_*.raw`. |
| `Msg211` | `BadPixMap can't load automatic map` | Отсутствует файл `BPM.raw`. |
| `Msg212` | `BadPixMap can't load manual map` | Отсутствует файл `BPMU.raw` или `BPMM.raw`. |

---

## 6. АРХИТЕКТУРНЫЙ МОСТ ДЛЯ DENTE CRM (NATIVE INTEGRATION ROADMAP)

Для интеграции визиографов Vatech в наш стоматологический стек без громоздких сторонних TWAIN-мостов и без запуска старых GUI-приложений разработан следующий прямой путь:

1. **Native Driver Binding (Node.js / Rust FFI):**
   * Создание легковесного нативного аддона через `koffi` / `napi-rs`, загружающего `EzSensor_64.dll` и `VACAL_64.dll` напрямую в бэкенд рабочего места врача.
   * Для 100% независимости от проприетарных DLL Vatech: алгоритм калибровки (Формулы Раздела 3: Dark Subtraction + Piecewise Linear Interpolation + Gradient BPM Repair) реализован на чистом TypeScript/WebAssembly в `@dental/shared/imaging`.
2. **Прямое считывание калибровок:**
   * При подключении сенсора считывается его серийный номер через дескриптор USB (`E15OHED518-26085`).
   * Из локального каталога автоматически подтягиваются `dark.raw`, `A00..A07.raw` и `BPM.raw`.
3. **Хранение в PACS/DICOM:**
   * Снимок сохраняется как 16-битный DICOM файл с атрибутами:
     * `(0028,0100) Bits Allocated = 16`
     * `(0028,0101) Bits Stored = 12`
     * `(0028,0102) High Bit = 11`
     * `(0028,0030) Pixel Spacing = 0.035\0.035`
     * `(0008,0070) Manufacturer = VATECH`
   * Мгновенный рендеринг в нашем WebGL/Canvas вьюере ЭМК 043/у (<30 мс).
