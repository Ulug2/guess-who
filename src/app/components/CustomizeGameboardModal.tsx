import React from "react";
import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Upload, Save, Trash2, Plus } from "lucide-react";
import { getGameboard, saveGameboard } from "../lib/gameboard";
import { uploadGameboardImage } from "../lib/storage";
import { resizeImageFile } from "../lib/resizeImage";
import { useLanguage } from "../contexts/LanguageContext";
import type { GameboardCharacter } from "../lib/types";

interface CustomizeGameboardModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

const DEFAULT_EMPTY: GameboardCharacter = { id: "", name: "", imageUrl: null };

function buildInitialCharacters(): GameboardCharacter[] {
  return Array.from({ length: 24 }, (_, i) => ({
    id: `char-${i + 1}`,
    name: "",
    imageUrl: null,
  }));
}

export function CustomizeGameboardModal({
  open,
  onClose,
  userId,
}: CustomizeGameboardModalProps) {
  const { t } = useLanguage();
  const [characters, setCharacters] = useState<GameboardCharacter[]>(buildInitialCharacters());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !userId) return;
    setError("");
    setLoading(true);
    getGameboard(userId)
      .then((saved) => {
        if (saved.length >= 24) {
          setCharacters(saved);
        } else {
          const merged = [...buildInitialCharacters()];
          saved.forEach((c, i) => {
            if (i < merged.length) merged[i] = { ...c, id: merged[i].id };
          });
          setCharacters(merged);
        }
      })
      .catch(() => setError(t("couldNotLoadBoard")))
      .finally(() => setLoading(false));
  }, [open, userId]);

  if (!open) return null;

  const currentCharacter = characters[currentIndex] ?? DEFAULT_EMPTY;
  const filledCount = characters.filter((c) => c.name && c.imageUrl).length;
  const maxCharacters = 36;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < characters.length - 1 ? prev + 1 : prev));
  };

  const handleNameChange = (name: string) => {
    const newCharacters = [...characters];
    newCharacters[currentIndex] = { ...currentCharacter, name };
    setCharacters(newCharacters);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setError("");
    setUploading(true);
    try {
      const resized = await resizeImageFile(file, {
        maxWidth: 800,
        maxHeight: 800,
        maxSizeBytes: 500 * 1024,
        quality: 0.85,
      });
      const charId = currentCharacter.id || `char-${currentIndex + 1}`;
      const url = await uploadGameboardImage(userId, charId, resized);
      const newCharacters = [...characters];
      newCharacters[currentIndex] = { ...currentCharacter, imageUrl: url };
      setCharacters(newCharacters);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed.";
      const hint = msg.includes("Bucket not found") || msg.includes("bucket") ? " Create the Storage bucket 'gameboard-images' in Supabase Dashboard (Storage) and run the RLS policies (see supabase/rls_policies.sql)." : "";
      setError(`${t("uploadFailed")}: ${msg}.${hint}`);
    } finally {
      setUploading(false);
    }
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!userId) return;
    setError("");
    setSaving(true);
    try {
      await saveGameboard(userId, characters);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch {
      setError(t("couldNotSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userId) return;
    let newCharacters: GameboardCharacter[];
    let nextIndex: number;
    if (characters.length > 24) {
      newCharacters = characters.filter((_, i) => i !== currentIndex);
      nextIndex = Math.min(currentIndex, newCharacters.length - 1);
    } else {
      newCharacters = [...characters];
      newCharacters[currentIndex] = {
        ...currentCharacter,
        name: "",
        imageUrl: null,
      };
      nextIndex = currentIndex;
    }
    setCharacters(newCharacters);
    setCurrentIndex(nextIndex);

    setError("");
    setSaving(true);
    try {
      await saveGameboard(userId, newCharacters);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch {
      setError(t("couldNotSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleAddCharacter = () => {
    if (characters.length < maxCharacters) {
      setCharacters([
        ...characters,
        { id: `char-${characters.length + 1}`, name: "", imageUrl: null },
      ]);
      setCurrentIndex(characters.length);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-gray-900 rounded-3xl shadow-2xl border-2 border-[#FFD700] overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-[#8B0000] to-[#B22222] p-6 flex items-center justify-between border-b-2 border-[#FFD700]">
          <div>
            <h2 className="text-2xl font-bold text-white">{t("customBoardTitle")}</h2>
            <p className="text-white/80 text-sm mt-1">
              {filledCount}/{characters.length} {t("charactersAdded")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full active:scale-95"
          >
            <X size={24} />
          </button>
        </div>
        {error && (
          <div className="mx-4 mt-2 bg-red-900/50 border border-red-500 rounded-xl p-2 text-red-200 text-sm">
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FFD700] border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="bg-gray-800 p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300 text-sm font-semibold">{t("progress")}</span>
                <span className="text-[#FFD700] text-sm font-semibold">
                  {Math.round((filledCount / 24) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#8B0000] to-[#FFD700] transition-all duration-500"
                  style={{ width: `${(filledCount / 24) * 100}%` }}
                />
              </div>
              <p className="text-gray-400 text-xs mt-2">
                {t("minimum24Max")} {maxCharacters} {t("allowed")}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="p-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:cursor-not-allowed text-white rounded-xl transition-all active:scale-95 disabled:scale-100 min-h-[48px] min-w-[48px]"
                >
                  <ChevronLeft size={24} />
                </button>
                <p className="text-gray-300 font-semibold">
                  {t("characterOf")} {currentIndex + 1} {t("of")} {characters.length}
                </p>
                <button
                  onClick={handleNext}
                  disabled={currentIndex === characters.length - 1}
                  className="p-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:cursor-not-allowed text-white rounded-xl transition-all active:scale-95 disabled:scale-100 min-h-[48px] min-w-[48px]"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              <div className="bg-gray-800 rounded-2xl p-6 border-2 border-gray-700 mb-6">
                <div className="aspect-square bg-gray-700 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
                  {currentCharacter.imageUrl ? (
                    <img
                      src={currentCharacter.imageUrl}
                      alt={currentCharacter.name || "Character"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-gray-500">
                      <Upload size={48} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t("noImageUploaded")}</p>
                    </div>
                  )}
                </div>
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2 font-semibold">{t("characterName")}</label>
                  <input
                    type="text"
                    value={currentCharacter.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder={t("enterName")}
                    className="w-full bg-gray-700 border-2 border-gray-600 focus:border-[#FFD700] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all"
                    maxLength={20}
                  />
                </div>
                <label className="block w-full bg-gradient-to-r from-[#FFD700] to-[#FFC107] hover:from-[#FFE135] hover:to-[#FFD700] text-[#8B0000] py-3 rounded-xl font-semibold transition-all duration-200 active:scale-95 cursor-pointer text-center mb-3 disabled:opacity-70">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <div className="flex items-center justify-center gap-2">
                    <Upload size={20} />
                    <span>{uploading ? t("uploading") : t("uploadImage")}</span>
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={filledCount < 24 || saving}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-all duration-200 active:scale-95 disabled:scale-100 flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    {saving ? t("saving") : t("save")}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-gray-700 disabled:opacity-70 text-white py-3 rounded-xl font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    {characters.length > 24 ? t("delete") : t("clear")}
                  </button>
                </div>
              </div>

              {characters.length < maxCharacters && (
                <button
                  onClick={handleAddCharacter}
                  className="w-full bg-gray-800 hover:bg-gray-700 border-2 border-dashed border-gray-600 hover:border-[#FFD700] text-gray-400 hover:text-white py-4 rounded-xl font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  {t("addAnotherCharacter")} ({characters.length}/{maxCharacters})
                </button>
              )}
            </div>
          </>
        )}

        {showSuccess && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-2 border-2 border-green-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-semibold">{t("boardSaved")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
