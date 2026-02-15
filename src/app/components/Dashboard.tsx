import { useState, useEffect, useCallback } from "react";
import { Users, UserPlus, Grid3x3, LogOut } from "lucide-react";
import { useOutletContext } from "react-router";
import { supabase } from "../lib/supabase";
import { getPendingFriendRequests } from "../lib/friends";
import { getIncomingChallenges } from "../lib/challenges";
import { getGameboard } from "../lib/gameboard";
import { useLanguage } from "../contexts/LanguageContext";
import { ChallengeFriendModal } from "./ChallengeFriendModal";
import { AddFriendsModal } from "./AddFriendsModal";
import { CustomizeGameboardModal } from "./CustomizeGameboardModal";
import { LanguageToggle } from "./LanguageToggle";

const MIN_CHARACTERS = 24;

export function Dashboard() {
  const { user } = useOutletContext<{ user: { id: string; username: string } }>();
  const { t } = useLanguage();
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [addFriendsModalOpen, setAddFriendsModalOpen] = useState(false);
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [incomingChallengesCount, setIncomingChallengesCount] = useState(0);
  const [hasMinCharacters, setHasMinCharacters] = useState(false);

  const loadBoardCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const chars = await getGameboard(user.id);
      const filled = chars.filter((c) => c.name && c.imageUrl).length;
      setHasMinCharacters(filled >= MIN_CHARACTERS);
    } catch {
      setHasMinCharacters(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const loadCounts = async () => {
      try {
        const [requests, challenges] = await Promise.all([
          getPendingFriendRequests(user.id),
          getIncomingChallenges(user.id),
        ]);
        setPendingRequestsCount(requests.length);
        setIncomingChallengesCount(challenges.length);
      } catch {
        // ignore
      }
    };
    loadCounts();
    loadBoardCount();
    const channel = supabase
      .channel("dashboard-counts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests", filter: `to_user_id=eq.${user.id}` },
        () => loadCounts()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenges", filter: `challenged_id=eq.${user.id}` },
        () => loadCounts()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadBoardCount]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const totalNotifications = pendingRequestsCount + incomingChallengesCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="flex justify-between items-start mb-8 pt-2 gap-4">
        <div className="flex flex-col gap-3">
          <div className="bg-[#8B0000] text-white px-4 py-2 rounded-lg shadow-lg border-2 border-[#FFD700]">
            <div className="text-xs opacity-75">{t("welcome")}</div>
            <div className="font-bold">{user.username}</div>
            {totalNotifications > 0 && (
              <div className="text-xs mt-1 text-[#FFD700]">
                {incomingChallengesCount > 0 && `${incomingChallengesCount} ${incomingChallengesCount > 1 ? t("challenges") : t("challenge")}`}
                {incomingChallengesCount > 0 && pendingRequestsCount > 0 && " · "}
                {pendingRequestsCount > 0 && `${pendingRequestsCount} ${pendingRequestsCount > 1 ? t("friendRequests") : t("friendRequest")}`}
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-2 rounded-lg shadow-lg border-2 border-gray-700 hover:border-[#FFD700]/50 transition-all active:scale-95 flex items-center gap-2 min-h-[44px] w-fit"
          >
            <LogOut size={18} />
            <span className="font-semibold">{t("logout")}</span>
          </button>
        </div>
        <div className="shrink-0">
          <LanguageToggle />
        </div>
      </div>

      <div className="max-w-md mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-2">{t("guessWho")}</h1>
          <div className="h-1 w-24 bg-gradient-to-r from-[#8B0000] via-[#FFD700] to-[#8B0000] mx-auto rounded-full"></div>
        </div>

        <div className="space-y-4">
          <div>
            <button
              onClick={() => setChallengeModalOpen(true)}
              className="w-full py-6 rounded-2xl shadow-xl transition-all duration-300 flex items-center justify-center gap-3 border-2 relative bg-gradient-to-r from-[#8B0000] to-[#B22222] hover:from-[#A52A2A] hover:to-[#DC143C] text-white hover:scale-105 hover:shadow-2xl active:scale-95 border-[#FFD700]/30"
            >
              <Users size={28} />
              <span className="text-xl font-semibold">{t("challengeFriend")}</span>
              {(pendingRequestsCount > 0 || incomingChallengesCount > 0) && (
                <span className="absolute top-3 right-4 bg-[#FFD700] text-[#8B0000] text-xs font-bold rounded-full h-6 min-w-[24px] flex items-center justify-center px-1">
                  {pendingRequestsCount + incomingChallengesCount}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => setAddFriendsModalOpen(true)}
            className="w-full bg-gradient-to-r from-[#FFD700] to-[#FFC107] hover:from-[#FFE135] hover:to-[#FFD700] text-[#8B0000] py-6 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 flex items-center justify-center gap-3 border-2 border-[#8B0000]/30 relative"
          >
            <UserPlus size={28} />
            <span className="text-xl font-semibold">{t("addFriends")}</span>
            {pendingRequestsCount > 0 && (
              <span className="absolute top-3 right-4 bg-[#8B0000] text-[#FFD700] text-xs font-bold rounded-full h-6 min-w-[24px] flex items-center justify-center px-1">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCustomizeModalOpen(true)}
            className="w-full bg-gradient-to-r from-[#8B0000] to-[#B22222] hover:from-[#A52A2A] hover:to-[#DC143C] text-white py-6 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 flex items-center justify-center gap-3 border-2 border-[#FFD700]/30"
          >
            <Grid3x3 size={28} />
            <span className="text-xl font-semibold">{t("customizeGameboard")}</span>
          </button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm">
            {t("tapToGetStarted")}
          </p>
        </div>
      </div>

      <ChallengeFriendModal
        open={challengeModalOpen}
        onClose={() => setChallengeModalOpen(false)}
        userId={user.id}
        hasMinCharacters={hasMinCharacters}
      />
      <AddFriendsModal
        open={addFriendsModalOpen}
        onClose={() => setAddFriendsModalOpen(false)}
        userId={user.id}
      />
      <CustomizeGameboardModal
        open={customizeModalOpen}
        onClose={() => {
          setCustomizeModalOpen(false);
          loadBoardCount();
        }}
        userId={user.id}
      />
    </div>
  );
}
