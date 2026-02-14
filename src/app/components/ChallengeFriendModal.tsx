import { X, UserCheck, UserX } from "lucide-react";
import { useNavigate } from "react-router";
import { useState, useEffect } from "react";
import {
  getFriends,
  getPendingFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  type FriendRequestWithProfile,
} from "../lib/friends";
import {
  createChallenge,
  getIncomingChallenges,
  acceptChallenge,
  declineChallenge,
  type ChallengeWithProfiles,
} from "../lib/challenges";
import type { Profile } from "../lib/types";

interface ChallengeFriendModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export function ChallengeFriendModal({
  open,
  onClose,
  userId,
}: ChallengeFriendModalProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "challenges">("friends");
  const [friends, setFriends] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<FriendRequestWithProfile[]>([]);
  const [incomingChallenges, setIncomingChallenges] = useState<ChallengeWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [challenging, setChallenging] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !userId) return;
    setError("");
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [friendsList, requestsList, challengesList] = await Promise.all([
          getFriends(userId),
          getPendingFriendRequests(userId),
          getIncomingChallenges(userId),
        ]);
        if (!cancelled) {
          setFriends(friendsList);
          setRequests(requestsList);
          setIncomingChallenges(challengesList);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Failed to load.";
          setError(msg.includes("relation") && msg.includes("exist") ? "Database not set up. Run the Supabase migration (see README)." : `Failed to load: ${msg}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, userId]);

  const handleChallenge = async (friendId: string) => {
    setError("");
    setChallenging(friendId);
    try {
      const { id } = await createChallenge(userId, friendId);
      onClose();
      navigate(`/waiting?challengeId=${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send challenge.");
    } finally {
      setChallenging(null);
    }
  };

  const handleAccept = async (requestId: string) => {
    setError("");
    try {
      await acceptFriendRequest(requestId, userId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      const [friendsList, requestsList] = await Promise.all([
        getFriends(userId),
        getPendingFriendRequests(userId),
      ]);
      setFriends(friendsList);
      setRequests(requestsList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept.");
    }
  };

  const handleDecline = async (requestId: string) => {
    setError("");
    try {
      await declineFriendRequest(requestId, userId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not decline.");
    }
  };

  const handleAcceptChallenge = async (challengeId: string) => {
    setError("");
    try {
      await acceptChallenge(challengeId, userId);
      onClose();
      navigate(`/game?challengeId=${challengeId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept challenge.");
    }
  };

  const handleDeclineChallenge = async (challengeId: string) => {
    setError("");
    try {
      await declineChallenge(challengeId, userId);
      setIncomingChallenges((prev) => prev.filter((c) => c.id !== challengeId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not decline challenge.");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-gray-900 rounded-3xl shadow-2xl border-2 border-[#FFD700] overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-[#8B0000] to-[#B22222] p-6 flex items-center justify-between border-b-2 border-[#FFD700]">
          <h2 className="text-2xl font-bold text-white">Challenge Friend</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full active:scale-95"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex border-b-2 border-gray-700">
          <button
            onClick={() => setActiveTab("friends")}
            className={`flex-1 py-4 transition-all duration-200 ${
              activeTab === "friends"
                ? "bg-gradient-to-r from-[#8B0000] to-[#B22222] text-white border-b-4 border-[#FFD700]"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            <span className="font-semibold">Friends List</span>
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex-1 py-4 transition-all duration-200 relative ${
              activeTab === "requests"
                ? "bg-gradient-to-r from-[#8B0000] to-[#B22222] text-white border-b-4 border-[#FFD700]"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            <span className="font-semibold">Requests</span>
            {requests.length > 0 && (
              <span className="absolute top-2 right-4 bg-[#FFD700] text-[#8B0000] text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                {requests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("challenges")}
            className={`flex-1 py-4 transition-all duration-200 relative ${
              activeTab === "challenges"
                ? "bg-gradient-to-r from-[#8B0000] to-[#B22222] text-white border-b-4 border-[#FFD700]"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            <span className="font-semibold">Challenges</span>
            {incomingChallenges.length > 0 && (
              <span className="absolute top-2 right-4 bg-[#FFD700] text-[#8B0000] text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                {incomingChallenges.length}
              </span>
            )}
          </button>
        </div>
        {error && (
          <div className="mx-4 mt-2 bg-red-900/50 border border-red-500 rounded-xl p-2 text-red-200 text-sm">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FFD700] border-t-transparent" />
            </div>
          ) : activeTab === "friends" ? (
            <div className="p-4 space-y-3">
              {friends.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No friends yet.</p>
                  <p className="text-sm mt-2">Add friends to start challenging!</p>
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="bg-gray-800 rounded-xl p-4 flex items-center justify-between border border-gray-700 hover:border-[#FFD700]/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {friend.avatar_url ? (
                        <img
                          src={friend.avatar_url}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8B0000] to-[#FFD700] flex items-center justify-center text-white font-bold">
                          {friend.username.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-semibold">{friend.username}</p>
                        <p className="text-xs text-gray-400">Friend</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleChallenge(friend.id)}
                      disabled={challenging === friend.id}
                      className="px-4 py-2 rounded-lg font-semibold transition-all duration-200 active:scale-95 bg-gradient-to-r from-[#FFD700] to-[#FFC107] text-[#8B0000] hover:from-[#FFE135] hover:to-[#FFD700] shadow-lg hover:shadow-xl disabled:opacity-70"
                    >
                      {challenging === friend.id ? "Sending…" : "Challenge"}
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === "challenges" ? (
            <div className="p-4 space-y-3">
              {incomingChallenges.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No challenges yet.</p>
                </div>
              ) : (
                incomingChallenges.map((challenge) => (
                  <div
                    key={challenge.id}
                    className="bg-gray-800 rounded-xl p-4 border border-gray-700"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {challenge.challenger_profile?.avatar_url ? (
                        <img
                          src={challenge.challenger_profile.avatar_url}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8B0000] to-[#FFD700] flex items-center justify-center text-white font-bold">
                          {(challenge.challenger_profile?.username ?? "?").charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-semibold">
                          {challenge.challenger_profile?.username ?? "Someone"} challenged you
                        </p>
                        <p className="text-xs text-gray-400">Accept to play</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptChallenge(challenge.id)}
                        className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white py-2 rounded-lg font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <UserCheck size={18} />
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeclineChallenge(challenge.id)}
                        className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white py-2 rounded-lg font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <UserX size={18} />
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {requests.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No pending friend requests.</p>
                </div>
              ) : (
                requests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-gray-800 rounded-xl p-4 border border-gray-700"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {request.from_profile?.avatar_url ? (
                        <img
                          src={request.from_profile.avatar_url}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8B0000] to-[#FFD700] flex items-center justify-center text-white font-bold">
                          {(request.from_profile?.username ?? "?").charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-semibold">
                          {request.from_profile?.username ?? "Unknown"}
                        </p>
                        <p className="text-xs text-gray-400">wants to be friends</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(request.id)}
                        className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white py-2 rounded-lg font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <UserCheck size={18} />
                        Accept
                      </button>
                      <button
                        onClick={() => handleDecline(request.id)}
                        className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white py-2 rounded-lg font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <UserX size={18} />
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
