import { useNavigate, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getChallenge, cancelChallenge, subscribeToChallenge } from "../lib/challenges";
import { useLanguage } from "../contexts/LanguageContext";

export function WaitingScreen() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const challengeId = searchParams.get("challengeId");
  const [challengedName, setChallengedName] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!challengeId) {
      navigate("/", { replace: true });
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const challenge = await getChallenge(challengeId, user.id);
        if (!challenge || cancelled) {
          if (!challenge) setError(t("challengeNotFound"));
          return;
        }
        if (challenge.status === "accepted") {
          navigate(`/game?challengeId=${challengeId}`, { replace: true });
          return;
        }
        if (challenge.status === "declined" || challenge.status === "cancelled") {
          setError(challenge.status === "declined" ? t("challengeDeclined") : t("challengeCancelled"));
          return;
        }
        const isChallenger = challenge.challenger_id === user.id;
        setChallengedName(
          isChallenger
            ? (challenge.challenged_profile?.username ?? t("someone"))
            : (challenge.challenger_profile?.username ?? t("someone"))
        );
      } catch {
        if (!cancelled) setError(t("couldNotLoadChallenge"));
      }
    };
    load();
    const unsub = subscribeToChallenge(challengeId, (status) => {
      if (status === "accepted") navigate(`/game?challengeId=${challengeId}`, { replace: true });
      if (status === "declined") setError(t("challengeDeclined"));
      if (status === "cancelled") setError(t("challengeCancelled"));
    });
    return () => {
      cancelled = true;
      unsub.unsubscribe();
    };
  }, [challengeId, navigate]);

  const handleCancel = async () => {
    if (!challengeId) {
      navigate("/");
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await cancelChallenge(challengeId, user.id);
    } catch {
      // ignore
    }
    navigate("/");
  };

  if (!challengeId) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="relative">
          <div className="w-32 h-32 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-8 border-gray-700"></div>
            <div className="absolute inset-0 rounded-full border-8 border-transparent border-t-[#8B0000] border-r-[#FFD700] animate-spin"></div>
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[#8B0000] to-[#FFD700] flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white">{t("waitingForOpponent")}</h1>
          {challengedName && (
            <p className="text-xl text-gray-300">
              {t("waitingForName")} <span className="text-[#FFD700] font-semibold">{challengedName}</span> {t("toAccept")}
            </p>
          )}
          {!challengedName && !error && (
            <p className="text-xl text-gray-300">{t("loading")}</p>
          )}
          {error && (
            <p className="text-red-300 font-semibold">{error}</p>
          )}

          <div className="flex justify-center gap-2 pt-4">
            <div className="w-3 h-3 rounded-full bg-[#8B0000] animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-3 h-3 rounded-full bg-[#FFD700] animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-3 h-3 rounded-full bg-[#8B0000] animate-bounce"></div>
          </div>
        </div>

        <div className="py-8">
          <div className="relative h-1 bg-gray-700 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#8B0000] via-[#FFD700] to-[#8B0000] animate-[shimmer_2s_infinite]"></div>
          </div>
        </div>

        <button
          onClick={handleCancel}
          className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-xl transition-all duration-200 active:scale-95 border-2 border-gray-700 hover:border-[#FFD700]/50 min-h-[56px]"
        >
          {t("cancelInvitation")}
        </button>

        <p className="text-gray-500 text-sm pt-4">
          {t("opponentNotified")}
        </p>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
