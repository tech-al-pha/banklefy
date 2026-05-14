import { type Language } from "@/contexts/LanguageContext";

export const uploadUiCopyByLanguage: Record<
  Language,
  {
    readingDoc: string;
    detectAmounts: string;
    preparingOcr: string;
    categorizingData: string;
    invalidFile: string;
    pdfTooLarge: string;
    freeTierFileLimit: string;
    filesSelected: string;
    filesAddedReady: (count: number) => string;
    noFileSelected: string;
    selectStatementPrompt: string;
    processingFiles: string;
    startingBatch: string;
    limitReached: string;
    downloaded: string;
    downloadFailed: string;
    excelDownloaded: string;
    csvDownloaded: string;
    mergedDownloaded: string;
    fileDownloadedCount: (count: number) => string;
    downloadCsvFailed: string;
    downloadFileFailed: string;
    downloadFilesFailed: string;
    downloadMergedFailed: string;
  }
> = {
  en: {
    readingDoc: "Reading document...",
    detectAmounts: "Detecting amounts...",
    preparingOcr: "Preparing OCR pages...",
    categorizingData: "Categorizing data...",
    invalidFile: "Invalid file",
    pdfTooLarge: "PDF too large",
    freeTierFileLimit: "Free tier file limit",
    filesSelected: "Files Selected",
    filesAddedReady: (count) => `${count} file(s) added - Ready to convert`,
    noFileSelected: "No File Selected",
    selectStatementPrompt: "Please select a bank statement to convert",
    processingFiles: "Processing files",
    startingBatch: "Starting batch conversion...",
    limitReached: "Limit Reached",
    downloaded: "Downloaded!",
    downloadFailed: "Download failed",
    excelDownloaded: "Your Excel file has been downloaded.",
    csvDownloaded: "Your CSV file has been downloaded.",
    mergedDownloaded: "Your merged Excel file has been downloaded.",
    fileDownloadedCount: (count) => `${count} file(s) downloaded.`,
    downloadCsvFailed: "Failed to download CSV.",
    downloadFileFailed: "Failed to download the file.",
    downloadFilesFailed: "Failed to download the files.",
    downloadMergedFailed: "Failed to download the merged file.",
  },
  ar: {
    readingDoc: "جارٍ قراءة المستند...",
    detectAmounts: "جارٍ اكتشاف المبالغ...",
    preparingOcr: "جارٍ تجهيز صفحات OCR...",
    categorizingData: "جارٍ تصنيف البيانات...",
    invalidFile: "ملف غير صالح",
    pdfTooLarge: "ملف PDF كبير جدًا",
    freeTierFileLimit: "حد الملف في الخطة المجانية",
    filesSelected: "تم اختيار الملفات",
    filesAddedReady: (count) => `تمت إضافة ${count} ملف - جاهز للتحويل`,
    noFileSelected: "لم يتم اختيار ملف",
    selectStatementPrompt: "يرجى اختيار كشف حساب للتحويل",
    processingFiles: "جارٍ معالجة الملفات",
    startingBatch: "جارٍ بدء التحويل الدفعي...",
    limitReached: "تم بلوغ الحد",
    downloaded: "تم التنزيل!",
    downloadFailed: "فشل التنزيل",
    excelDownloaded: "تم تنزيل ملف Excel.",
    csvDownloaded: "تم تنزيل ملف CSV.",
    mergedDownloaded: "تم تنزيل ملف Excel المدمج.",
    fileDownloadedCount: (count) => `تم تنزيل ${count} ملف.`,
    downloadCsvFailed: "فشل تنزيل CSV.",
    downloadFileFailed: "فشل تنزيل الملف.",
    downloadFilesFailed: "فشل تنزيل الملفات.",
    downloadMergedFailed: "فشل تنزيل الملف المدمج.",
  },
  zh: {
    readingDoc: "正在读取文档...",
    detectAmounts: "正在识别金额...",
    preparingOcr: "正在准备 OCR 页面...",
    categorizingData: "正在分类数据...",
    invalidFile: "文件无效",
    pdfTooLarge: "PDF 文件过大",
    freeTierFileLimit: "免费套餐文件限制",
    filesSelected: "文件已选择",
    filesAddedReady: (count) => `已添加 ${count} 个文件，准备转换`,
    noFileSelected: "未选择文件",
    selectStatementPrompt: "请选择要转换的银行流水",
    processingFiles: "正在处理文件",
    startingBatch: "正在开始批量转换...",
    limitReached: "已达上限",
    downloaded: "已下载！",
    downloadFailed: "下载失败",
    excelDownloaded: "Excel 文件已下载。",
    csvDownloaded: "CSV 文件已下载。",
    mergedDownloaded: "合并后的 Excel 文件已下载。",
    fileDownloadedCount: (count) => `已下载 ${count} 个文件。`,
    downloadCsvFailed: "下载 CSV 失败。",
    downloadFileFailed: "下载文件失败。",
    downloadFilesFailed: "下载多个文件失败。",
    downloadMergedFailed: "下载合并文件失败。",
  },
  es: {
    readingDoc: "Leyendo documento...",
    detectAmounts: "Detectando importes...",
    preparingOcr: "Preparando páginas OCR...",
    categorizingData: "Categorizando datos...",
    invalidFile: "Archivo inválido",
    pdfTooLarge: "PDF demasiado grande",
    freeTierFileLimit: "Límite de archivo en plan gratis",
    filesSelected: "Archivos seleccionados",
    filesAddedReady: (count) => `${count} archivo(s) agregado(s) - Listo para convertir`,
    noFileSelected: "Ningún archivo seleccionado",
    selectStatementPrompt: "Selecciona un extracto bancario para convertir",
    processingFiles: "Procesando archivos",
    startingBatch: "Iniciando conversión por lotes...",
    limitReached: "Límite alcanzado",
    downloaded: "¡Descargado!",
    downloadFailed: "Descarga fallida",
    excelDownloaded: "Tu archivo Excel se descargó correctamente.",
    csvDownloaded: "Tu archivo CSV se descargó correctamente.",
    mergedDownloaded: "Tu archivo Excel combinado se descargó correctamente.",
    fileDownloadedCount: (count) => `${count} archivo(s) descargado(s).`,
    downloadCsvFailed: "No se pudo descargar el CSV.",
    downloadFileFailed: "No se pudo descargar el archivo.",
    downloadFilesFailed: "No se pudieron descargar los archivos.",
    downloadMergedFailed: "No se pudo descargar el archivo combinado.",
  },
  hi: {
    readingDoc: "डॉक्यूमेंट पढ़ा जा रहा है...",
    detectAmounts: "अमाउंट डिटेक्ट किए जा रहे हैं...",
    preparingOcr: "OCR पेज तैयार किए जा रहे हैं...",
    categorizingData: "डेटा कैटेगराइज़ किया जा रहा है...",
    invalidFile: "अमान्य फ़ाइल",
    pdfTooLarge: "PDF बहुत बड़ी है",
    freeTierFileLimit: "फ्री प्लान फ़ाइल लिमिट",
    filesSelected: "फ़ाइलें चुनी गईं",
    filesAddedReady: (count) => `${count} फ़ाइल जोड़ी गई - कन्वर्ट के लिए तैयार`,
    noFileSelected: "कोई फ़ाइल नहीं चुनी गई",
    selectStatementPrompt: "कन्वर्ट करने के लिए बैंक स्टेटमेंट चुनें",
    processingFiles: "फ़ाइलें प्रोसेस हो रही हैं",
    startingBatch: "बैच कन्वर्ज़न शुरू हो रहा है...",
    limitReached: "लिमिट पूरी हो गई",
    downloaded: "डाउनलोड हो गया!",
    downloadFailed: "डाउनलोड फेल हुआ",
    excelDownloaded: "आपकी Excel फ़ाइल डाउनलोड हो गई है।",
    csvDownloaded: "आपकी CSV फ़ाइल डाउनलोड हो गई है।",
    mergedDownloaded: "आपकी merged Excel फ़ाइल डाउनलोड हो गई है।",
    fileDownloadedCount: (count) => `${count} फ़ाइल डाउनलोड हुई।`,
    downloadCsvFailed: "CSV डाउनलोड नहीं हो सकी।",
    downloadFileFailed: "फ़ाइल डाउनलोड नहीं हो सकी।",
    downloadFilesFailed: "फ़ाइलें डाउनलोड नहीं हो सकीं।",
    downloadMergedFailed: "Merged फ़ाइल डाउनलोड नहीं हो सकी।",
  },
};
