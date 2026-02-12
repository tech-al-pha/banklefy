import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const TMP_FILE = path.join(ROOT, '.tmp_lang', 'languageData.js');
const CACHE_FILE = path.join(ROOT, '.tmp_lang', 'translate-cache.json');
const OUTPUT_FILE = path.join(ROOT, 'src', 'contexts', 'languageData.ts');

const LANGUAGE_TARGETS = {
  ar: 'ar',
  zh: 'zh-CN',
  es: 'es',
  hi: 'hi',
};

const OUTPUT_LANGUAGES = ['en', 'ar', 'zh', 'es', 'hi'];

const PLACEHOLDER_PATTERN = /\{[^}]+\}/g;

const loadCache = async () => {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const saveCache = async (cache) => {
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
};

const escapeForRequest = (value) => encodeURIComponent(value).replace(/%20/g, '+');

const protectPlaceholders = (input) => {
  const placeholders = [];
  const protectedText = input.replace(PLACEHOLDER_PATTERN, (match) => {
    const index = placeholders.push(match) - 1;
    return `__AKRO_PLACEHOLDER_${index}__`;
  });
  return { protectedText, placeholders };
};

const restorePlaceholders = (input, placeholders) => {
  let result = input;
  placeholders.forEach((placeholder, index) => {
    result = result.replaceAll(`__AKRO_PLACEHOLDER_${index}__`, placeholder);
  });
  return result;
};

const parseTranslateResponse = (responseJson) => {
  if (!Array.isArray(responseJson) || !Array.isArray(responseJson[0])) return '';
  return responseJson[0].map((segment) => (Array.isArray(segment) ? segment[0] : '')).join('');
};

const translateText = async (sourceText, target, cache) => {
  const cacheKey = `${target}::${sourceText}`;
  if (cache[cacheKey]) return cache[cacheKey];

  const { protectedText, placeholders } = protectPlaceholders(sourceText);
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${target}` +
    `&dt=t&q=${escapeForRequest(protectedText)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Translation API failed (${response.status}) for target=${target}`);
  }

  const body = await response.json();
  const translated = parseTranslateResponse(body);
  const restored = restorePlaceholders(translated || sourceText, placeholders);
  cache[cacheKey] = restored;
  return restored;
};

const runWithConcurrency = async (items, concurrency, handler) => {
  const results = new Array(items.length);
  let current = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const index = current;
      current += 1;
      if (index >= items.length) break;
      results[index] = await handler(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
};

const generate = async () => {
  const moduleUrl = `${pathToFileURL(TMP_FILE).href}?t=${Date.now()}`;
  const loaded = await import(moduleUrl);
  const currentTranslations = loaded.translations;

  if (!currentTranslations?.en) {
    throw new Error('English translations not found in compiled module.');
  }

  const english = currentTranslations.en;
  const keys = Object.keys(english);
  const cache = await loadCache();

  const generatedByLanguage = {};

  for (const [lang, target] of Object.entries(LANGUAGE_TARGETS)) {
    const translatedValues = await runWithConcurrency(keys, 6, async (key) => {
      const source = english[key] ?? '';
      if (!source) return '';
      return translateText(source, target, cache);
    });

    const languageMap = {};
    keys.forEach((key, idx) => {
      languageMap[key] = translatedValues[idx] || english[key] || '';
    });
    generatedByLanguage[lang] = languageMap;
  }

  await saveCache(cache);

  const finalTranslations = {
    en: english,
    ar: generatedByLanguage.ar,
    zh: generatedByLanguage.zh,
    es: generatedByLanguage.es,
    hi: generatedByLanguage.hi,
  };

  const languageNames = {
    en: 'English',
    ar: 'Arabic',
    zh: 'Chinese',
    es: 'Spanish',
    hi: 'Hindi',
  };

  const output = [
    "export type Language = 'en' | 'ar' | 'zh' | 'es' | 'hi';",
    '',
    `export const translations: Record<Language, Record<string, string>> = ${JSON.stringify(finalTranslations, null, 2)};`,
    '',
    `export const languageNames: Record<Language, string> = ${JSON.stringify(languageNames, null, 2)};`,
    '',
  ].join('\n');

  await fs.writeFile(OUTPUT_FILE, output, 'utf8');
  console.log(`Generated ${OUTPUT_LANGUAGES.length} languages with ${keys.length} keys each.`);
};

generate().catch((error) => {
  console.error(error);
  process.exit(1);
});
