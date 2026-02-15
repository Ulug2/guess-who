import { useLanguage } from "../contexts/LanguageContext";
import type { Locale } from "../lib/translations";

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex rounded-lg overflow-hidden border-2 border-[#FFD700]/50 bg-gray-800">
      {(["en", "ru"] as Locale[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLocale(lang)}
          className={`px-3 py-2 text-sm font-semibold min-w-[44px] min-h-[44px] transition-all ${
            locale === lang
              ? "bg-gradient-to-r from-[#8B0000] to-[#B22222] text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
