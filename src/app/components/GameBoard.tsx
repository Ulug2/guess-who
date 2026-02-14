import { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router";
import { CharacterCard } from "./CharacterCard";
import { LogOut, Loader2 } from "lucide-react";
import { endChallenge, subscribeToChallenge, getChallenge, setChallengeGameCharacters } from "../lib/challenges";
import { getGameboard } from "../lib/gameboard";
import type { GameboardCharacter } from "../lib/types";

const MIN_PLAYABLE = 24;

/** Character with imageUrl required (for display) */
type DisplayCharacter = GameboardCharacter & { imageUrl: string };

function toDisplayCharacters(chars: GameboardCharacter[]): DisplayCharacter[] {
  return chars.filter((c): c is DisplayCharacter => !!c.name && !!c.imageUrl);
}

export function GameBoard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const challengeId = searchParams.get("challengeId");
  const { user } = useOutletContext<{ user: { id: string; username: string } }>();
  const [characters, setCharacters] = useState<DisplayCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [waitingForBoard, setWaitingForBoard] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [gameEndedByOpponent, setGameEndedByOpponent] = useState(false);

  const loadChallengeAndBoard = useCallback(async () => {
    if (!challengeId || !user?.id) return null;
    const challenge = await getChallenge(challengeId, user.id);
    if (!challenge) return null;
    const isChallenger = challenge.challenger_id === user.id;

    if (isChallenger) {
      const myBoard = await getGameboard(user.id);
      const display = toDisplayCharacters(myBoard);
      if (display.length >= MIN_PLAYABLE) {
        setCharacters(display);
        if (!challenge.game_characters || challenge.game_characters.length === 0) {
          await setChallengeGameCharacters(challengeId, user.id, myBoard.filter((c) => c.name && c.imageUrl));
        }
      }
      return { challenge, isChallenger, display };
    } else {
      const stored = challenge.game_characters;
      if (stored && stored.length >= MIN_PLAYABLE) {
        setCharacters(toDisplayCharacters(stored));
        setWaitingForBoard(false);
      } else {
        setWaitingForBoard(true);
      }
      return { challenge, isChallenger, display: stored ? toDisplayCharacters(stored) : [] };
    }
  }, [challengeId, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    if (challengeId) {
      setLoading(true);
      setWaitingForBoard(false);
      loadChallengeAndBoard().then((result) => {
        setLoading(false);
        if (!result && challengeId) {
          setCharacters([]);
        }
      });
    } else {
      getGameboard(user.id).then((board) => {
        setCharacters(toDisplayCharacters(board));
        setLoading(false);
      });
    }
  }, [challengeId, user?.id, loadChallengeAndBoard]);

  useEffect(() => {
    if (!challengeId) return;
    const unsub = subscribeToChallenge(challengeId, (status) => {
      if (status === "ended") setGameEndedByOpponent(true);
    });
    return () => {
      unsub.unsubscribe();
    };
  }, [challengeId]);

  useEffect(() => {
    if (!challengeId || !waitingForBoard || !user?.id) return;
    const t = setInterval(async () => {
      const challenge = await getChallenge(challengeId, user.id);
      if (challenge?.game_characters && challenge.game_characters.length >= MIN_PLAYABLE) {
        setCharacters(toDisplayCharacters(challenge.game_characters));
        setWaitingForBoard(false);
      }
    }, 2000);
    return () => clearInterval(t);
  }, [challengeId, waitingForBoard, user?.id]);

  const handleCardFlip = (cardId: string) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const handleCardSelect = (cardId: string) => {
    setSelectedCard((id) => (id === cardId ? null : cardId));
  };

  const handleEndGame = async () => {
    if (challengeId && user?.id) {
      try {
        await endChallenge(challengeId, user.id);
      } catch {
        // ignore
      }
    }
    navigate("/");
  };

  if (gameEndedByOpponent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-gray-800 rounded-2xl border-2 border-[#FFD700] p-8">
          <h1 className="text-2xl font-bold text-white">Game ended</h1>
          <p className="text-gray-300">The other player ended the game.</p>
          <button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-[#8B0000] to-[#B22222] text-white px-6 py-3 rounded-xl font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
          <p className="text-gray-300">Loading game…</p>
        </div>
      </div>
    );
  }

  if (waitingForBoard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-gray-800 rounded-2xl border-2 border-[#FFD700] p-8">
          <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin mx-auto" />
          <h1 className="text-xl font-bold text-white">Waiting for challenger&apos;s board</h1>
          <p className="text-gray-300 text-sm">The other player is setting up the game. This will update automatically.</p>
        </div>
      </div>
    );
  }

  if (characters.length < MIN_PLAYABLE) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-gray-800 rounded-2xl border-2 border-[#FFD700] p-8">
          <h1 className="text-xl font-bold text-white">Not enough characters</h1>
          <p className="text-gray-300 text-sm">
            {challengeId
              ? "The challenger needs at least 24 characters on their board to start."
              : "Add at least 24 characters in Customize Gameboard to play."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-[#8B0000] to-[#B22222] text-white px-6 py-3 rounded-xl font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 pb-8">
      <div className="flex items-center justify-between mb-6 pt-2">
        <div className="bg-[#8B0000] text-white px-4 py-2 rounded-lg shadow-lg border-2 border-[#FFD700]">
          <span className="opacity-75">Player: </span>
          <span className="font-bold">{user.username}</span>
        </div>
        <button
          onClick={handleEndGame}
          className="bg-gradient-to-r from-[#8B0000] to-[#B22222] hover:from-[#A52A2A] hover:to-[#DC143C] text-white px-5 py-2 rounded-lg transition-all duration-200 active:scale-95 flex items-center gap-2 border-2 border-[#FFD700] shadow-lg min-h-[44px]"
        >
          <LogOut size={18} />
          <span className="font-semibold">End Game</span>
        </button>
      </div>

      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white mb-1">Guess Who?</h1>
        <p className="text-gray-400">Tap to flip cards • Long press to select your character</p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-4 gap-3 sm:gap-4">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              isFlipped={flippedCards.has(character.id)}
              isSelected={selectedCard === character.id}
              onFlip={() => handleCardFlip(character.id)}
              onSelect={() => handleCardSelect(character.id)}
            />
          ))}
        </div>
      </div>

      {selectedCard === null && (
        <div className="mt-6 max-w-md mx-auto bg-gray-800/50 border border-[#FFD700]/30 rounded-xl p-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <p className="text-gray-300 text-sm">
            <span className="font-semibold text-[#FFD700]">Select your character</span> by holding down on a card, then eliminate other cards by tapping them!
          </p>
        </div>
      )}

      {selectedCard && (
        <div className="mt-6 max-w-md mx-auto bg-gradient-to-r from-[#8B0000] to-[#B22222] border-2 border-[#FFD700] rounded-xl p-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <p className="text-white font-semibold">
            Your character is {characters.find((c) => c.id === selectedCard)?.name}!
          </p>
          <p className="text-gray-200 text-sm mt-1">
            Don&apos;t let your opponent guess who it is!
          </p>
        </div>
      )}
    </div>
  );
}
