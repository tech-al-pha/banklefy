import { useLocation } from "react-router-dom";
import { Helmet } from "@dr.pogodin/react-helmet";
import { activeLanguages } from "@/contexts/languageData";
import {
  META_BY_PATH,
  DEFAULT_META,
  NO_INDEX_PREFIXES,
  normalizePathname,
  getSiteUrl,
  toAbsoluteUrl,
  getStructuredDataByRoute,
} from "@/lib/seo";

export const SEOManager = () => {
  const location = useLocation();
  const normalizedPathname = normalizePathname(location.pathname);
  const meta = META_BY_PATH[normalizedPathname] || DEFAULT_META;
  const siteUrl = getSiteUrl();
  const runtimeHost = typeof window !== "undefined" ? window.location.hostname : null;
  const canonical = `${siteUrl}${normalizedPathname === "/" ? "/" : normalizedPathname}`;
  const imageUrl = toAbsoluteUrl(meta.image || DEFAULT_META.image || "/og-banklefy.jpg", siteUrl);
  const shouldNoIndex =
    NO_INDEX_PREFIXES.some((path) => normalizedPathname.startsWith(path)) ||
    (runtimeHost ? runtimeHost.endsWith(".vercel.app") : false);
  const structuredData = getStructuredDataByRoute(normalizedPathname, canonical, siteUrl, meta);
  const alternateLanguageLinks = activeLanguages
    .filter((lang) => lang !== "en")
    .map((lang) => ({ lang, href: `${canonical}?lang=${lang}` }));

  return (
    <Helmet>
      <title>{meta.title}</title>
      <link rel="canonical" href={canonical} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />
      <link rel="alternate" hrefLang="en" href={canonical} />
      {alternateLanguageLinks.map((alt) => (
        <link key={`alt-${alt.lang}`} rel="alternate" hrefLang={alt.lang} href={alt.href} />
      ))}

      <meta name="description" content={meta.description} />
      <meta name="robots" content={shouldNoIndex ? "noindex, nofollow" : "index, follow"} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Banklefy" />
      <meta property="og:locale" content="en_US" />
      {alternateLanguageLinks.map((alt) => (
        <meta key={`og-alt-${alt.lang}`} property="og:locale:alternate" content={alt.lang} />
      ))}
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:secure_url" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Banklefy bank statement converter preview" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:url" content={canonical} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content="Banklefy bank statement converter preview" />

      {structuredData.map((schema, index) => (
        <script key={`jsonld-${index}`} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};
