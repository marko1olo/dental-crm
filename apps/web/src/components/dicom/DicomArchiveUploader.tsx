import React, { useCallback, useState } from "react";
import * as fflate from "fflate";
import dicomParser from "dicom-parser";
import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader";

interface DicomArchiveUploaderProps {
  onImagesLoaded: (imageIds: string[]) => void;
}

export function DicomArchiveUploader({ onImagesLoaded }: DicomArchiveUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("Перетащите ZIP-архив или папку со снимками сюда");

  const processFile = async (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const byteArray = new Uint8Array(arrayBuffer);
          
          // Check DICOM magic number at offset 128
          if (byteArray.length < 132) {
            resolve(null);
            return;
          }
          
          const dicmPrefix = String.fromCharCode(byteArray[128] ?? 0, byteArray[129] ?? 0, byteArray[130] ?? 0, byteArray[131] ?? 0);
          if (dicmPrefix !== "DICM") {
            resolve(null);
            return;
          }

          // Generate imageId using cornerstone wado-uri fileManager
          const imageId = cornerstoneDICOMImageLoader.wadouri.fileManager.add(file);
          resolve(imageId);
        } catch (e) {
          console.error("Failed to parse file", file.name, e);
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsArrayBuffer(file.slice(0, 1024)); // Only read first 1KB for DICM check
    });
  };

  const MAX_SAFE_FILE_SIZE_BYTES = 1.5 * 1024 * 1024 * 1024; // 1.5 GB

  const processZip = async (zipFile: File) => {
    if (zipFile.size > MAX_SAFE_FILE_SIZE_BYTES) {
      setStatus("Файл слишком велик для обработки в памяти браузера. Используйте просмотр по срезам.");
      return;
    }

    setStatus("Распаковка ZIP-архива в память...");
    const buffer = new Uint8Array(await zipFile.arrayBuffer());
    
    return new Promise<void>((resolve, reject) => {
      const imageIds: string[] = [];
      let totalFiles = 0;
      let processedFiles = 0;

      fflate.unzip(buffer, (err, unzipped) => {
        if (err) {
          reject(err);
          return;
        }

        const entries = Object.keys(unzipped);
        totalFiles = entries.length;

        const processEntry = async (index: number) => {
          if (index >= entries.length) {
            if (imageIds.length > 0) {
              setStatus(`Загружено объектов DICOM: ${imageIds.length}`);
              onImagesLoaded(imageIds);
            } else {
              setStatus("Файлы DICOM в ZIP-архиве не найдены.");
            }
            resolve();
            return;
          }

          const filename = entries[index]!;
          const fileData = unzipped[filename];
          processedFiles++;
          
          if (processedFiles % 10 === 0) {
            setStatus(`Обработка ZIP: ${processedFiles}/${totalFiles}`);
          }

          if (fileData && fileData.length > 132) {
            const dicmPrefix = String.fromCharCode(fileData[128] ?? 0, fileData[129] ?? 0, fileData[130] ?? 0, fileData[131] ?? 0);
            if (dicmPrefix === "DICM") {
              const file = new File([fileData], filename);
              const imageId = cornerstoneDICOMImageLoader.wadouri.fileManager.add(file);
              imageIds.push(imageId);
            }
          }

          setTimeout(() => processEntry(index + 1), 0);
        };

        processEntry(0);
      });
    });
  };

  const traverseFileTree = async (item: any, path: string = ""): Promise<File[]> => {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file: File) => {
          resolve([file]);
        });
      } else if (item.isDirectory) {
        // БЫЛО: readEntries вызывался ОДИН раз. По спецификации FileSystem API он
        // отдаёт не больше ~100 записей за вызов и требует повторных вызовов,
        // пока не вернёт пустой массив. Папка КЛКТ на 400 срезов загружалась
        // на 100 файлов, реконструкция строилась по неполной челюсти,
        // а статус бодро сообщал «Загружено объектов DICOM: 100».
        const dirReader = item.createReader();
        const files: File[] = [];
        const readBatch = () => {
          dirReader.readEntries(async (entries: any[]) => {
            if (!entries || entries.length === 0) {
              resolve(files);
              return;
            }
            for (let i = 0; i < entries.length; i++) {
              const nestedFiles = await traverseFileTree(entries[i], path + item.name + "/");
              files.push(...nestedFiles);
            }
            readBatch();
          }, () => resolve(files));
        };
        readBatch();
      } else {
        resolve([]);
      }
    });
  };

  const onDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (loading) return;
    setLoading(true);

    // БЫЛО: тела обработчика без try/catch. Если processZip падал на битом или
    // зашифрованном архиве, setLoading(false) в конце не выполнялся: крутилка
    // висела вечно, статус замирал на «Распаковка ZIP-архива в память...»,
    // а проверка `if (loading) return` блокировала все следующие попытки.
    // Загрузчик умирал до перезагрузки страницы, и врач не видел причины.
    try {
    const items = e.dataTransfer.items;
    let allFiles: File[] = [];

    setStatus("Чтение выбранных файлов...");

    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]?.webkitGetAsEntry();
        if (item) {
          const files = await traverseFileTree(item);
          allFiles = allFiles.concat(files);
        }
      }
    } else if (e.dataTransfer.files) {
      allFiles = Array.from(e.dataTransfer.files);
    }

    const firstFile = allFiles[0];
    if (allFiles.length === 1 && firstFile && firstFile.name.toLowerCase().endsWith(".zip")) {
      await processZip(firstFile);
    } else {
      setStatus(`Сканирование файлов: ${allFiles.length}...`);
      const validImageIds: string[] = [];
      
      for (let i = 0; i < allFiles.length; i++) {
        if (i % 10 === 0) setStatus(`Сканирование файлов: ${i}/${allFiles.length}`);
        const f = allFiles[i];
        if (f) {
            const imageId = await processFile(f);
            if (imageId) validImageIds.push(imageId);
        }
      }

      if (validImageIds.length > 0) {
        setStatus(`Загружено объектов DICOM: ${validImageIds.length}`);
        onImagesLoaded(validImageIds);
      } else {
        setStatus("Подходящие файлы DICOM не найдены.");
      }
    }
    } catch (error) {
      console.error("[DicomArchiveUploader] Ошибка обработки:", error);
      setStatus(
        "Не удалось прочитать файлы: архив повреждён, зашифрован или не содержит DICOM. Попробуйте другой архив или распакуйте его вручную.",
      );
    } finally {
      setLoading(false);
    }
  }, [loading, onImagesLoaded]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => document.getElementById("dicom-folder-input")?.click()}
      className={`w-full h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
        isDragging ? "border-teal-500 bg-teal-500/10" : "border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800"
      }`}
    >
      <input
        id="dicom-folder-input"
        type="file"
        webkitdirectory="true"
        directory="true"
        multiple
        style={{ display: "none" }}
        onChange={async (e) => {
          if (loading || !e.target.files) return;
          setLoading(true);
          const allFiles = Array.from(e.target.files);
          setStatus(`Сканирование файлов: ${allFiles.length}...`);
          const validImageIds: string[] = [];
          for (let i = 0; i < allFiles.length; i++) {
            if (i % 10 === 0) setStatus(`Сканирование файлов: ${i}/${allFiles.length}`);
            const f = allFiles[i];
            if (f) {
                const imageId = await processFile(f);
                if (imageId) validImageIds.push(imageId);
            }
          }
          if (validImageIds.length > 0) {
            setStatus(`Загружено объектов DICOM: ${validImageIds.length}`);
            onImagesLoaded(validImageIds);
          } else {
            setStatus("Подходящие файлы DICOM не найдены.");
          }
          setLoading(false);
          // reset input
          e.target.value = '';
        }}
      />
      <div className="text-slate-700 dark:text-neutral-300 font-medium">{status} (Кликните для выбора или перетащите папку)</div>
      {loading && <div className="mt-2 w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>}
      <div className="text-xs text-slate-500 dark:text-neutral-500 mt-2">Локальная обработка в браузере. Данные не передаются на сторонние сервера.</div>
    </div>
  );
}

