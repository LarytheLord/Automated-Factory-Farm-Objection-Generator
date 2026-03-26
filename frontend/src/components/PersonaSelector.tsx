"use client";

import {
  Baby,
  Building,
  CheckCircle,
  Droplets,
  HeartPulse,
  Home as HomeIcon,
  Landmark,
  Scale,
  Stethoscope,
  Store,
  TreePine,
  Truck,
  User,
  Wheat,
  type LucideIcon,
} from "lucide-react";

export interface PersonaOption {
  id: string;
  label: string;
  category: string;
  categoryLabel: string;
  description: string;
  icon?: string;
}

interface PersonaSelectorProps {
  options: PersonaOption[];
  value: string;
  onChange: (personaId: string) => void;
}

const PERSONA_ICON_MAP: Record<string, LucideIcon> = {
  Baby,
  Building,
  Droplets,
  HeartPulse,
  Home: HomeIcon,
  Landmark,
  Scale,
  Stethoscope,
  Store,
  TreePine,
  Truck,
  User,
  Wheat,
};

const FALLBACK_OPTIONS: PersonaOption[] = [
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

export default function PersonaSelector({
  options,
  value,
  onChange,
}: PersonaSelectorProps) {
  const personas = options.length > 0 ? options : FALLBACK_OPTIONS;
  const groups = groupPersonas(personas);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.key} className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {group.categoryLabel}
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {group.items.map((persona) => {
              const Icon = PERSONA_ICON_MAP[persona.icon || ""] || User;
              const isSelected = value === persona.id;

              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => onChange(persona.id)}
                  aria-pressed={isSelected}
                  className={`group relative flex h-full items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50 shadow-[0_14px_35px_rgba(16,185,129,0.14)]"
                      : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-colors ${
                      isSelected
                        ? "border-emerald-200 bg-emerald-500 text-black"
                        : "border-slate-200 bg-slate-100 text-slate-600 group-hover:border-emerald-200 group-hover:text-emerald-600"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {persona.label}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                          {persona.description}
                        </p>
                      </div>
                      {isSelected ? (
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
