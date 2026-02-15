import { useState, useRef, memo } from "react";
import { useLanguage } from "../contexts/LanguageContext";

interface Character {
  id: string;
  name: string;
  imageUrl: string;
}

interface CharacterCardProps {
  character: Character;
  isFlipped: boolean;
  isSelected: boolean;
  onFlip: () => void;
  onSelect: () => void;
}

function CharacterCardInner({
  character,
  isFlipped,
  isSelected,
  onFlip,
  onSelect,
}: CharacterCardProps) {
  const { t } = useLanguage();
  const [pressTimer, setPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const handlePointerDown = () => {
    longPressFired.current = false;
    const timer = setTimeout(() => {
      longPressFired.current = true;
      onSelect();
      if (navigator.vibrate) navigator.vibrate(100);
    }, 500);
    setPressTimer(timer);
  };

  const handlePointerUp = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    if (!longPressFired.current) {
      onFlip();
    }
  };

  const handlePointerCancel = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  return (
    <div
      className={`relative aspect-[3/4] rounded-xl cursor-pointer select-none touch-none ${
        isSelected ? "ring-4 ring-green-500 ring-offset-2 ring-offset-gray-900 shadow-lg shadow-green-500/50 z-10" : ""
      }`}
      style={{ perspective: "1000px" }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
    >
      {/* 3D flip container – only transform animates for performance */}
      <div
        className="relative w-full h-full rounded-xl"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateY(${isFlipped ? 180 : 0}deg)`,
          transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          willChange: "transform",
        }}
      >
        {/* Front: character face – image and overlay are pointer-events: none so long-press only selects card */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden border-2 border-[#FFD700]/40 bg-gray-800 shadow-lg"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <img
            src={character.imageUrl}
            alt={character.name}
            className="w-full h-full object-cover pointer-events-none select-none"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 pointer-events-none">
            <p className="text-white text-center font-semibold text-xs truncate drop-shadow">
              {character.name}
            </p>
          </div>
          {isSelected && (
            <div className="absolute top-1.5 right-1.5 bg-green-500 rounded-full p-1 animate-pulse">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {/* Back: card back design (visible when flipped / eliminated) */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden border-2 border-[#8B0000]/80 shadow-inner"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#8B0000] via-[#6B0000] to-[#8B0000]">
            {/* Pattern */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 8px,
                  rgba(255,215,0,0.15) 8px,
                  rgba(255,215,0,0.15) 16px
                )`,
              }}
            />
            {/* Center emblem */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FFD700] to-[#B8860B] flex items-center justify-center shadow-lg border-2 border-[#FFD700]/60">
                <span className="text-2xl font-bold text-[#8B0000]">?</span>
              </div>
            </div>
            {/* Bottom label */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/40 py-2">
              <p className="text-[#FFD700]/90 text-center font-semibold text-xs tracking-wide">
                {t("guessWhoCard")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const CharacterCard = memo(CharacterCardInner);
