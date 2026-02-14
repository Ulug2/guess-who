// import React from "react";
import { useState } from "react";
import { X, Search, UserPlus, Check } from "lucide-react";
import { searchProfilesByUsername } from "../lib/profiles";
import { sendFriendRequest, hasPendingRequest, areFriends } from "../lib/friends";
import type { Profile } from "../lib/types";

interface AddFriendsModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export function AddFriendsModal({ open, onClose, userId }: AddFriendsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<Profile | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setError("");
    setSearchResult(null);
    setIsSearching(true);
    try {
      const profiles = await searchProfilesByUsername(q, userId);
      if (profiles.length === 0) {
        setSearchResult(null);
        setError("No user found with that username.");
      } else {
        setSearchResult(profiles[0]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Search failed.";
      setError(msg.includes("profiles") && msg.includes("exist") ? "Database not set up. Run the Supabase migration (see README)." : `Search failed: ${msg}`);
      setSearchResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async () => {
    if (!searchResult) return;
    setError("");
    try {
      const alreadyFriends = await areFriends(userId, searchResult.id);
      if (alreadyFriends) {
        setError("You are already friends.");
        return;
      }
      const pending = await hasPendingRequest(userId, searchResult.id);
      if (pending) {
        setError("Friend request already sent.");
        return;
      }
      await sendFriendRequest(userId, searchResult.id);
      setRequestSent(true);
      setTimeout(() => {
        setSearchQuery("");
        setSearchResult(null);
        setRequestSent(false);
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send request.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-gray-900 rounded-3xl shadow-2xl border-2 border-[#FFD700] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-[#FFD700] to-[#FFC107] p-6 flex items-center justify-between border-b-2 border-[#8B0000]">
          <h2 className="text-2xl font-bold text-[#8B0000]">Add Friends</h2>
          <button
            onClick={onClose}
            className="text-[#8B0000]/80 hover:text-[#8B0000] transition-colors p-2 hover:bg-[#8B0000]/10 rounded-full active:scale-95"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-gray-300 mb-2">Search by username</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Enter username..."
                className="flex-1 bg-gray-800 border-2 border-gray-700 focus:border-[#FFD700] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="bg-gradient-to-r from-[#8B0000] to-[#B22222] hover:from-[#A52A2A] hover:to-[#DC143C] disabled:from-gray-700 disabled:to-gray-700 text-white px-6 py-3 rounded-xl transition-all duration-200 active:scale-95 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[44px]"
              >
                <Search size={20} />
              </button>
            </div>
          </div>
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-xl p-3 text-red-200 text-sm">
              {error}
            </div>
          )}
          <div className="min-h-[200px]">
            {isSearching ? (
              <div className="flex items-center justify-center h-[200px]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FFD700] border-t-transparent" />
              </div>
            ) : searchResult ? (
              <div className="bg-gray-800 rounded-xl p-5 border-2 border-gray-700 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-4 mb-4">
                  {searchResult.avatar_url ? (
                    <img
                      src={searchResult.avatar_url}
                      alt=""
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8B0000] to-[#FFD700] flex items-center justify-center text-white text-xl font-bold">
                      {searchResult.username.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-white font-bold text-lg">{searchResult.username}</p>
                    <p className="text-gray-400 text-sm">Username</p>
                  </div>
                </div>
                <button
                  onClick={handleAddFriend}
                  disabled={requestSent}
                  className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 ${requestSent
                      ? "bg-green-600 text-white cursor-default"
                      : "bg-gradient-to-r from-[#FFD700] to-[#FFC107] hover:from-[#FFE135] hover:to-[#FFD700] text-[#8B0000]"
                    }`}
                >
                  {requestSent ? (
                    <>
                      <Check size={20} />
                      Friend Request Sent
                    </>
                  ) : (
                    <>
                      <UserPlus size={20} />
                      Add Friend
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-gray-400 text-center">
                <div>
                  <Search size={48} className="mx-auto mb-3 opacity-50" />
                  <p>Search by username to add friends</p>
                </div>
              </div>
            )}
          </div>
          <div className="bg-gray-800/50 border border-[#FFD700]/30 rounded-xl p-4">
            <p className="text-gray-300 text-sm">
              💡 <span className="font-semibold">Tip:</span> Search for your friend&apos;s username (they must have an account).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
