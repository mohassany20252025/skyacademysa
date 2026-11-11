import React from "react";
import { GAME_QUESTIONS, GAMES_METADATA } from "../../data/tafsirContent";

export const VocabMemoryGame: React.FC<{ onSelect: () => void }> = ({ onSelect }) => {
  const meta = GAMES_METADATA.find((g) => g.id === "vocab-memory")!;
  const questions = GAME_QUESTIONS["vocab-memory"];
  return (
    <div className="p-6 rounded-3xl bg-slate-900 border border-teal-500/30">
      <h3 className="text-xl font-extrabold text-white mb-2">{meta.title}</h3>
      <p className="text-sm text-slate-300 mb-4">{meta.description} ({questions.length} أسئلة)</p>
      <button onClick={onSelect} className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold">
        ابدأ اللعبة
      </button>
    </div>
  );
};
