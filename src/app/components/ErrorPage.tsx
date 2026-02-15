import { useNavigate } from "react-router";
import { Home } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

export function ErrorPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8 bg-gray-800 rounded-2xl border-2 border-[#FFD700] p-8 shadow-2xl">
        <div className="mx-auto w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center border-2 border-[#FFD700]/50">
          <span className="text-4xl font-bold text-[#FFD700]">?</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">{t("pageNotFound")}</h1>
          <p className="text-gray-400 text-sm">
            {t("pageNotFoundDesc")}
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#8B0000] to-[#B22222] hover:from-[#A52A2A] hover:to-[#DC143C] text-white px-6 py-4 rounded-xl font-semibold transition-all duration-200 active:scale-95 border-2 border-[#FFD700]/50 shadow-lg"
        >
          <Home size={22} />
          {t("returnToDashboard")}
        </button>
      </div>
    </div>
  );
}
