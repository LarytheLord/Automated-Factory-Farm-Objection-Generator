"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, FileText, Sparkles } from "lucide-react";
import type { PersonaOption } from "./PersonaSelector";

type LetterMode = "concise" | "detailed";
type CompareSideKey = "left" | "right";

interface CompareSelection {
  persona: string;
  letterMode: LetterMode;
}

interface CompareDraft extends CompareSelection {
  letter: string;
}

interface CompareSideState extends CompareDraft {
  error: string | null;
  isLoading: boolean;
}

interface LetterComparisonPanelProps {
  permitTitle: string;
  personaOptions: PersonaOption[];
  defaultPersona: string;
  defaultLetterMode: LetterMode;
  onGenerate: (selection: CompareSelection) => Promise<string>;
  onUseDraft: (draft: CompareDraft) => void;
  onClose: () => void;
}

const FALLBACK_PERSONAS: PersonaOption[] = [
  {
    id: "general",
    label: "General (Environmental Law Expert)",
    category: "default",
    categoryLabel: "Default",
    description: "Comprehensive objection covering environmental, legal, and welfare concerns",
    icon: "Scale",
  },
];

function groupPersonas(personas: PersonaOption[]) {
  const groups: { key: string; categoryLabel: string; items: PersonaOption[] }[] = [];
  const seen = new Map<string, { key: string; categoryLabel: string; items: PersonaOption[] }>();

  for (const persona of personas) {
    const key = `${persona.category}:${persona.categoryLabel}`;
    let group = seen.get(key);
    if (!group) {
      group = {
        key,
        categoryLabel: persona.categoryLabel || "Stakeholder Perspectives",
        items: [],
      };
      seen.set(key, group);
      groups.push(group);
    }
    group.items.push(persona);
  }

  return groups;
}

function getAlternateMode(mode: LetterMode): LetterMode {
  return mode === "detailed" ? "concise" : "detailed";
}

function pickAlternatePersona(personas: PersonaOption[], currentPersona: string) {
  return personas.find((persona) => persona.id !== currentPersona)?.id || currentPersona;
}

function createSideState(selection: CompareSelection): CompareSideState {
  return {
    ...selection,
    letter: "",
    error: null,
    isLoading: false,
  };
}

function buildInitialState(
  personas: PersonaOption[],
  defaultPersona: string,
  defaultLetterMode: LetterMode,
) {
  return {
    left: createSideState({
      persona: defaultPersona,
      letterMode: defaultLetterMode,
    }),
    right: createSideState({
      persona: pickAlternatePersona(personas, defaultPersona),
      letterMode: getAlternateMode(defaultLetterMode),
    }),
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Could not generate this comparison draft.";
}

function SideCard({
  title,
  state,
  personaGroups,
  onSelectionChange,
  onGenerate,
  onUseDraft,
}: {
  title: string;
  state: CompareSideState;
  personaGroups: { key: string; categoryLabel: string; items: PersonaOption[] }[];
  onSelectionChange: (field: keyof CompareSelection, value: string) => void;
  onGenerate: () => void;
  onUseDraft: () => void;
}) {
  const modeLabel =
    state.letterMode === "detailed" ? "Detailed (Full Legal Context)" : "Concise (Most Impactful)";

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <p className="mt-2 text-sm text-slate-500">
            Compare this version using a different perspective or level of detail.
          </p>
        </div>
        {state.letter ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle className="h-3.5 w-3.5" />
            Ready
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">Perspective</span>
          <select
            value={state.persona}
            onChange={(event) => onSelectionChange("persona", event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-emerald-300 focus:bg-white focus:outline-none"
          >
            {personaGroups.map((group) => (
              <optgroup key={group.key} label={group.categoryLabel}>
                {group.items.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">Letter style</span>
          <select
            value={state.letterMode}
            onChange={(event) =>
              onSelectionChange(
                "letterMode",
                event.target.value === "detailed" ? "detailed" : "concise",
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-emerald-300 focus:bg-white focus:outline-none"
          >
            <option value="concise">Concise (Most Impactful)</option>
            <option value="detailed">Detailed (Full Legal Context)</option>
          </select>
        </label>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <span className="font-medium text-slate-700">Current setup:</span> {modeLabel}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={state.isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate draft
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onUseDraft}
          disabled={!state.letter || state.isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 transition-colors hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileText className="h-4 w-4" />
          Use this draft
        </button>
      </div>

      {state.error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      <div className="mt-4 min-h-[320px] max-h-[32rem] overflow-y-auto rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
        {state.isLoading ? (
          <div className="flex h-full min-h-[260px] items-center justify-center text-center text-slate-500">
            Drafting this objection letter now...
          </div>
        ) : state.letter ? (
          state.letter
        ) : (
          <div className="flex h-full min-h-[260px] items-center justify-center text-center text-slate-500">
            Generate this side to compare how the objection changes with a different perspective or writing mode.
          </div>
        )}
      </div>
    </div>
  );
}

export default function LetterComparisonPanel({
  permitTitle,
  personaOptions,
  defaultPersona,
  defaultLetterMode,
  onGenerate,
  onUseDraft,
  onClose,
}: LetterComparisonPanelProps) {
  const personas = personaOptions.length > 0 ? personaOptions : FALLBACK_PERSONAS;
  const personaGroups = useMemo(() => groupPersonas(personas), [personas]);
  const initialState = useMemo(
    () => buildInitialState(personas, defaultPersona, defaultLetterMode),
    [personas, defaultPersona, defaultLetterMode],
  );
  const [left, setLeft] = useState<CompareSideState>(initialState.left);
  const [right, setRight] = useState<CompareSideState>(initialState.right);

  useEffect(() => {
    setLeft(initialState.left);
    setRight(initialState.right);
  }, [initialState, permitTitle]);

  const updateSide = (
    side: CompareSideKey,
    updater: (previous: CompareSideState) => CompareSideState,
  ) => {
    if (side === "left") {
      setLeft(updater);
      return;
    }
    setRight(updater);
  };

  const handleSelectionChange = (
    side: CompareSideKey,
    field: keyof CompareSelection,
    value: string,
  ) => {
    updateSide(side, (previous) => ({
      ...previous,
      [field]: value,
      letter: "",
      error: null,
    }));
  };

  const runGeneration = async (side: CompareSideKey, selection: CompareSelection) => {
    updateSide(side, (previous) => ({
      ...previous,
      ...selection,
      letter: "",
      error: null,
      isLoading: true,
    }));

    try {
      const letter = await onGenerate(selection);
      updateSide(side, (previous) => ({
        ...previous,
        ...selection,
        letter,
        error: null,
        isLoading: false,
      }));
    } catch (error) {
      updateSide(side, (previous) => ({
        ...previous,
        ...selection,
        letter: "",
        error: getErrorMessage(error),
        isLoading: false,
      }));
    }
  };

  const handleGenerateBoth = async () => {
    const leftSelection: CompareSelection = {
      persona: left.persona,
      letterMode: left.letterMode,
    };
    const rightSelection: CompareSelection = {
      persona: right.persona,
      letterMode: right.letterMode,
    };

    await Promise.all([
      runGeneration("left", leftSelection),
      runGeneration("right", rightSelection),
    ]);
  };

  const isGenerating = left.isLoading || right.isLoading;

  return (
    <div className="glass-card mt-6 overflow-hidden border border-slate-200/80 p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
            Compare perspectives
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">
            Test two objection strategies for {permitTitle}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Generate two versions for the same permit, review them side by side, then keep the stronger
            draft in the main submission flow.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGenerateBoth}
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                Generating both...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate both drafts
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            Close compare view
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 2xl:grid-cols-2">
        <SideCard
          title="Option A"
          state={left}
          personaGroups={personaGroups}
          onSelectionChange={(field, value) => handleSelectionChange("left", field, value)}
          onGenerate={() =>
            runGeneration("left", {
              persona: left.persona,
              letterMode: left.letterMode,
            })
          }
          onUseDraft={() =>
            onUseDraft({
              persona: left.persona,
              letterMode: left.letterMode,
              letter: left.letter,
            })
          }
        />

        <SideCard
          title="Option B"
          state={right}
          personaGroups={personaGroups}
          onSelectionChange={(field, value) => handleSelectionChange("right", field, value)}
          onGenerate={() =>
            runGeneration("right", {
              persona: right.persona,
              letterMode: right.letterMode,
            })
          }
          onUseDraft={() =>
            onUseDraft({
              persona: right.persona,
              letterMode: right.letterMode,
              letter: right.letter,
            })
          }
        />
      </div>
    </div>
  );
}
