import { create } from "zustand";
import { persist } from "zustand/middleware";

const migrateNotes = (lead) => {
  if (Array.isArray(lead.notesLog)) return lead;
  const notesLog = lead.notes
    ? [
        {
          id: `n_${Date.now()}_${Math.random()}`,
          text: lead.notes,
          ts: lead.lastTouchDate || new Date().toISOString().slice(0, 10),
        },
      ]
    : [];
  const { notes, ...rest } = lead;
  return { ...rest, notesLog };
};

const id = (prefix = "id") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const todayStr = () => new Date().toISOString().slice(0, 10);

// ── Run helpers ────────────────────────────────────────────────────────────────
// The next stop that is neither completed nor skipped, searching forward from
// `from` and then wrapping to the front so skipped stops come back around at the
// end of the pass. Returns -1 when nothing is left to work.
const nextOpenIndex = (run, from) => {
  const n = run.queue.length;
  const open = (i) => !run.done[run.queue[i]] && !run.skipped[run.queue[i]];
  for (let i = Math.max(0, from); i < n; i++) if (open(i)) return i;
  for (let i = 0; i < Math.min(Math.max(0, from), n); i++)
    if (open(i)) return i;
  return -1;
};

const finishRun = (run) => ({
  activeRun: null,
  lastRun: { ...run, endedAt: new Date().toISOString() },
});

const useCRMStore = create(
  persist(
    (set) => ({
      leads: [],
      customColumns: [],
      groups: [],
      sortKey: "followUpDate",
      sortDir: "asc",
      refSections: [],

      // ── Leads ──────────────────────────────────────────────────────────────
      addLead: (lead) => {
        const notesLog = lead.notes
          ? [
              {
                id: id("n"),
                text: lead.notes,
                ts: new Date().toISOString().slice(0, 10),
              },
            ]
          : [];
        const { notes, ...rest } = lead;
        set((s) => ({
          leads: [...s.leads, { ...rest, notesLog, id: id("lead") }],
        }));
      },

      addLeadsBulk: (newLeads) => {
        const today = new Date().toISOString().slice(0, 10);
        const prepared = newLeads.map((lead) => {
          const notesLog = lead.notes
            ? [{ id: id("n"), text: lead.notes, ts: today }]
            : [];
          const { notes, ...rest } = lead;
          return { ...rest, notesLog, id: id("lead") };
        });
        set((s) => ({ leads: [...s.leads, ...prepared] }));
      },

      updateLead: (leadId, updates) => {
        set((s) => ({
          leads: s.leads.map((l) => {
            if (l.id !== leadId) return l;
            if (typeof updates.notes === "string") {
              const { notes, ...rest } = updates;
              const existing = l.notesLog || [];
              const notesLog = notes.trim()
                ? [
                    ...existing,
                    {
                      id: id("n"),
                      text: notes.trim(),
                      ts: new Date().toISOString().slice(0, 10),
                    },
                  ]
                : existing;
              return { ...l, ...rest, notesLog };
            }
            return { ...l, ...updates };
          }),
        }));
      },

      // ── Generated pitches ───────────────────────────────────────────────────
      // Stored on the lead, not in Reference: Reference holds stable
      // hand-written material, and a generated pitch has a completely different
      // lifecycle — it goes stale the moment the lead's story moves on.
      // `generatedPitch` is an optional key; leads without one are untouched.
      setLeadPitch: (leadId, pitch) => {
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id === leadId ? { ...l, generatedPitch: pitch } : l,
          ),
        }));
      },

      clearLeadPitch: (leadId) => {
        set((s) => ({
          leads: s.leads.map((l) => {
            if (l.id !== leadId) return l;
            const { generatedPitch, ...rest } = l;
            return rest;
          }),
        }));
      },

      // A sibling key rather than a `generated: { pitch, email }` wrapper: the
      // wrapper is tidier but would need a migration of live lead data, and a
      // lead can legitimately have both a spoken pitch and a written email.
      setLeadEmail: (leadId, email) => {
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id === leadId ? { ...l, generatedEmail: email } : l,
          ),
        }));
      },

      clearLeadEmail: (leadId) => {
        set((s) => ({
          leads: s.leads.map((l) => {
            if (l.id !== leadId) return l;
            const { generatedEmail, ...rest } = l;
            return rest;
          }),
        }));
      },

      deleteNoteEntry: (leadId, noteId) => {
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  notesLog: (l.notesLog || []).filter((n) => n.id !== noteId),
                }
              : l,
          ),
        }));
      },

      deleteLead: (leadId) => {
        set((s) => {
          const patch = { leads: s.leads.filter((l) => l.id !== leadId) };
          // Keep an in-flight run from pointing at a lead that no longer exists
          if (s.activeRun?.queue.includes(leadId)) {
            const run = s.activeRun;
            const idx = run.queue.indexOf(leadId);
            const queue = run.queue.filter((x) => x !== leadId);
            if (queue.length === 0) {
              patch.activeRun = null;
            } else {
              const { [leadId]: _d, ...done } = run.done;
              const { [leadId]: _s, ...skipped } = run.skipped;
              const cursor = Math.min(
                idx < run.cursor ? run.cursor - 1 : run.cursor,
                queue.length - 1,
              );
              patch.activeRun = { ...run, queue, done, skipped, cursor };
            }
          }
          return patch;
        });
      },

      setSort: (key) => {
        set((s) => ({
          sortKey: key,
          sortDir: s.sortKey === key && s.sortDir === "asc" ? "desc" : "asc",
        }));
      },

      logTouchpoint: (leadId, { type, note }) => {
        const today = new Date().toISOString().slice(0, 10);
        set((s) => ({
          leads: s.leads.map((l) => {
            if (l.id !== leadId) return l;
            const entry = note?.trim()
              ? [{ id: id("n"), text: `[${type}] ${note.trim()}`, ts: today }]
              : [];
            return {
              ...l,
              lastTouchDate: today,
              notesLog: [...(l.notesLog || []), ...entry],
            };
          }),
        }));
      },

      // ── Groups ──────────────────────────────────────────────────────────────
      addGroup: (name) => {
        set((s) => ({
          groups: [...s.groups, { id: id("grp"), name: name.trim() }],
        }));
      },

      renameGroup: (groupId, name) => {
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId ? { ...g, name: name.trim() } : g,
          ),
        }));
      },

      deleteGroup: (groupId) => {
        set((s) => ({
          groups: s.groups.filter((g) => g.id !== groupId),
          leads: s.leads.map((l) =>
            l.groupId === groupId ? { ...l, groupId: null } : l,
          ),
        }));
      },

      // ── Custom columns ──────────────────────────────────────────────────────
      addCustomColumn: (col) => {
        set((s) => ({
          customColumns: [...s.customColumns, { ...col, id: id("col") }],
        }));
      },

      deleteCustomColumn: (colId) => {
        set((s) => ({
          customColumns: s.customColumns.filter((c) => c.id !== colId),
          leads: s.leads.map((l) => {
            const u = { ...l };
            delete u[colId];
            return u;
          }),
        }));
      },

      // ── Reference sections ──────────────────────────────────────────────────
      addRefSection: (title) => {
        set((s) => ({
          refSections: [
            ...s.refSections,
            { id: id("sec"), title: title.trim(), cards: [] },
          ],
        }));
      },

      updateRefSection: (secId, title) => {
        set((s) => ({
          refSections: s.refSections.map((sec) =>
            sec.id === secId ? { ...sec, title } : sec,
          ),
        }));
      },

      deleteRefSection: (secId) => {
        set((s) => ({
          refSections: s.refSections.filter((sec) => sec.id !== secId),
        }));
      },

      moveRefSection: (secId, dir) => {
        set((s) => {
          const arr = [...s.refSections];
          const i = arr.findIndex((sec) => sec.id === secId);
          const j = i + dir;
          if (j < 0 || j >= arr.length) return {};
          [arr[i], arr[j]] = [arr[j], arr[i]];
          return { refSections: arr };
        });
      },

      addRefCard: (secId, { title, body }) => {
        set((s) => ({
          refSections: s.refSections.map((sec) =>
            sec.id === secId
              ? {
                  ...sec,
                  cards: [
                    ...sec.cards,
                    {
                      id: id("card"),
                      title: title.trim(),
                      body: body.trim(),
                      isPitchScript: false,
                    },
                  ],
                }
              : sec,
          ),
        }));
      },

      updateRefCard: (secId, cardId, { title, body }) => {
        set((s) => ({
          refSections: s.refSections.map((sec) =>
            sec.id === secId
              ? {
                  ...sec,
                  cards: sec.cards.map((c) =>
                    c.id === cardId ? { ...c, title, body } : c,
                  ),
                }
              : sec,
          ),
        }));
      },

      deleteRefCard: (secId, cardId) => {
        set((s) => ({
          refSections: s.refSections.map((sec) =>
            sec.id === secId
              ? { ...sec, cards: sec.cards.filter((c) => c.id !== cardId) }
              : sec,
          ),
        }));
      },

      moveRefCard: (secId, cardId, dir) => {
        set((s) => ({
          refSections: s.refSections.map((sec) => {
            if (sec.id !== secId) return sec;
            const arr = [...sec.cards];
            const i = arr.findIndex((c) => c.id === cardId);
            const j = i + dir;
            if (j < 0 || j >= arr.length) return sec;
            [arr[i], arr[j]] = [arr[j], arr[i]];
            return { ...sec, cards: arr };
          }),
        }));
      },

      // Marks/unmarks a reference card as usable inside Pitch Mode
      togglePitchScript: (secId, cardId) => {
        set((s) => ({
          refSections: s.refSections.map((sec) =>
            sec.id === secId
              ? {
                  ...sec,
                  cards: sec.cards.map((c) =>
                    c.id === cardId
                      ? { ...c, isPitchScript: !c.isPitchScript }
                      : c,
                  ),
                }
              : sec,
          ),
        }));
      },

      // ── Geocache ────────────────────────────────────────────────────────────
      geocache: {},

      notifSettings: {
        enabled: false,
        summary: true,
        overdue: true,
        stale: true,
      },

      setNotifSettings: (updates) => {
        set((s) => ({ notifSettings: { ...s.notifSettings, ...updates } }));
      },

      setGeocode: (address, coords) => {
        set((s) => ({ geocache: { ...s.geocache, [address]: coords } }));
      },

      // ── Home Base ──────────────────────────────────────────────────────────────
      homeBase: null,

      setHomeBase: (data) => {
        set({ homeBase: data });
      },

      // ── PageSpeed ─────────────────────────────────────────────────────────────
      pageSpeedCache: {},

      setPageSpeed: (url, data) => {
        set((s) => ({ pageSpeedCache: { ...s.pageSpeedCache, [url]: data } }));
      },

      // ── Pitch Mode ────────────────────────────────────────────────────────────
      portfolioUrl: "",

      setPortfolioUrl: (url) => {
        set({ portfolioUrl: url });
      },

      // ── Pipeline Advisor ──────────────────────────────────────────────────────
      // Persisted so the analysis survives navigating away and back
      pipelineAnalysis: null, // { result, analyzedAt, leadCount }

      setPipelineAnalysis: (data) => {
        set({ pipelineAnalysis: data });
      },

      clearPipelineAnalysis: () => {
        set({ pipelineAnalysis: null });
      },

      // ── Backup / Restore ────────────────────────────────────────────────────
      restoreBackup: (data) => {
        set({
          leads: (data.leads || []).map(migrateNotes),
          customColumns: data.customColumns || [],
          groups: data.groups || [],
          refSections: data.refSections || [],
          geocache: data.geocache || {},
          notifSettings: data.notifSettings || {
            enabled: false,
            summary: true,
            overdue: true,
            stale: true,
          },
          pageSpeedCache: data.pageSpeedCache || {},
          portfolioUrl: data.portfolioUrl || "",
          // A restored backup describes a pipeline, not a session in progress.
          activeRun: null,
          lastRun: null,
        });
      },

      mergeBackup: (data) => {
        set((s) => {
          const existingIds = new Set(s.leads.map((l) => l.id));
          const existingNames = new Set(
            s.leads.map((l) => l.businessName.toLowerCase()),
          );
          const newLeads = (data.leads || [])
            .map(migrateNotes)
            .filter(
              (l) =>
                !existingIds.has(l.id) &&
                !existingNames.has(l.businessName.toLowerCase()),
            );
          const existingGroupNames = new Set(
            s.groups.map((g) => g.name.toLowerCase()),
          );
          const newGroups = (data.groups || []).filter(
            (g) => !existingGroupNames.has(g.name.toLowerCase()),
          );
          return {
            leads: [...s.leads, ...newLeads],
            groups: [...s.groups, ...newGroups],
          };
        });
      },

      // ── Daily Plan ──────────────────────────────────────────────────────────────
      dailyPlan: [],
      // Seeded to today at store creation. Previously this started as null and the
      // only writer (clearDailyPlan) was gated on it already being non-null, so the
      // midnight rollover could never fire.
      lastPlanDate: todayStr(),
      lastPlanSummary: [],

      addToPlan: (leadId) => {
        set((s) => {
          if (s.dailyPlan.find((i) => i.leadId === leadId)) return {};
          return { dailyPlan: [...s.dailyPlan, { leadId, checkedAt: null }] };
        });
      },

      removeFromPlan: (leadId) => {
        set((s) => ({
          dailyPlan: s.dailyPlan.filter((i) => i.leadId !== leadId),
        }));
      },

      checkOffPlan: (leadId) => {
        set((s) => ({
          dailyPlan: s.dailyPlan.map((i) =>
            i.leadId === leadId
              ? { ...i, checkedAt: new Date().toISOString() }
              : i,
          ),
        }));
      },

      uncheckPlan: (leadId) => {
        set((s) => ({
          dailyPlan: s.dailyPlan.map((i) =>
            i.leadId === leadId ? { ...i, checkedAt: null } : i,
          ),
        }));
      },

      movePlanItem: (leadId, dir) => {
        set((s) => {
          const pending = s.dailyPlan.filter((i) => !i.checkedAt);
          const checked = s.dailyPlan.filter((i) => !!i.checkedAt);
          const idx = pending.findIndex((i) => i.leadId === leadId);
          const newIdx = idx + dir;
          if (newIdx < 0 || newIdx >= pending.length) return {};
          const arr = [...pending];
          [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
          return { dailyPlan: [...arr, ...checked] };
        });
      },

      clearDailyPlan: (today) => {
        set((s) => {
          const checked = s.dailyPlan.filter((i) => !!i.checkedAt);
          return {
            dailyPlan: s.dailyPlan.filter((i) => !i.checkedAt),
            lastPlanDate: today,
            lastPlanSummary: checked,
          };
        });
      },

      dismissPlanSummary: () => {
        set({ lastPlanSummary: [] });
      },

      // ── Runs ────────────────────────────────────────────────────────────────
      // activeRun is the one thing the app is doing right now. It survives
      // navigation, a refresh, and a force-quit in the field.
      //
      // {
      //   id, mode: "calls"|"walkins"|"mixed", origin: "plan"|"map"|"checklist"|"adhoc",
      //   startedAt, queue: [leadId], cursor: 0,
      //   done: { [leadId]: { at, outcome } },
      //   skipped: { [leadId]: true },
      // }
      activeRun: null,
      lastRun: null,

      startRun: ({ mode = "mixed", origin = "adhoc", queue = [] }) => {
        const clean = [...new Set(queue)].filter(Boolean);
        if (clean.length === 0) return null;
        const run = {
          id: id("run"),
          mode,
          origin,
          startedAt: new Date().toISOString(),
          queue: clean,
          cursor: 0,
          done: {},
          skipped: {},
        };
        set({ activeRun: run, lastRun: null });
        return run;
      },

      endRun: () => {
        set((s) => (s.activeRun ? finishRun(s.activeRun) : {}));
      },

      // Moves past the current stop without recording anything about it. The
      // stop comes back around at the end of the pass.
      skipRunStop: (leadId) => {
        set((s) => {
          if (!s.activeRun) return {};
          const run = {
            ...s.activeRun,
            skipped: { ...s.activeRun.skipped, [leadId]: true },
          };
          const idx = run.queue.indexOf(leadId);
          const next = nextOpenIndex(run, (idx === -1 ? run.cursor : idx) + 1);
          if (next === -1) return finishRun(run);
          return { activeRun: { ...run, cursor: next } };
        });
      },

      // Records an outcome for a stop, mirrors the completion into today's plan
      // if the lead is on it, and advances to the next open stop.
      completeRunStop: (leadId, outcome = "logged") => {
        set((s) => {
          const patch = {};
          if (s.dailyPlan.some((i) => i.leadId === leadId && !i.checkedAt)) {
            patch.dailyPlan = s.dailyPlan.map((i) =>
              i.leadId === leadId
                ? { ...i, checkedAt: new Date().toISOString() }
                : i,
            );
          }
          if (!s.activeRun) return patch;
          const { [leadId]: _skipped, ...skipped } = s.activeRun.skipped;
          const run = {
            ...s.activeRun,
            skipped,
            done: {
              ...s.activeRun.done,
              [leadId]: { at: new Date().toISOString(), outcome },
            },
          };
          const idx = run.queue.indexOf(leadId);
          const next = nextOpenIndex(run, (idx === -1 ? run.cursor : idx) + 1);
          if (next === -1) return { ...patch, ...finishRun(run) };
          return { ...patch, activeRun: { ...run, cursor: next } };
        });
      },

      // Jumping to a stop clears its skip flag — you're working it now.
      setRunCursor: (index) => {
        set((s) => {
          if (!s.activeRun) return {};
          if (index < 0 || index >= s.activeRun.queue.length) return {};
          const leadId = s.activeRun.queue[index];
          const { [leadId]: _skipped, ...skipped } = s.activeRun.skipped;
          return { activeRun: { ...s.activeRun, cursor: index, skipped } };
        });
      },

      // next: true inserts directly after the current stop, otherwise appends.
      addToRun: (leadId, { next = false } = {}) => {
        set((s) => {
          if (!s.activeRun || !leadId) return {};
          const run = s.activeRun;
          const { [leadId]: _skipped, ...skipped } = run.skipped;
          const existing = run.queue.indexOf(leadId);

          if (existing !== -1) {
            // Already the stop you're standing on — nothing to reorder.
            if (!next || existing === run.cursor)
              return { activeRun: { ...run, skipped } };
            const queue = run.queue.filter((x) => x !== leadId);
            const at = Math.min(
              queue.indexOf(run.queue[run.cursor]) + 1,
              queue.length,
            );
            queue.splice(at, 0, leadId);
            return {
              activeRun: {
                ...run,
                queue,
                skipped,
                cursor: queue.indexOf(run.queue[run.cursor]),
              },
            };
          }

          const queue = [...run.queue];
          if (next) queue.splice(run.cursor + 1, 0, leadId);
          else queue.push(leadId);
          return { activeRun: { ...run, queue, skipped } };
        });
      },

      removeFromRun: (leadId) => {
        set((s) => {
          if (!s.activeRun) return {};
          const run = s.activeRun;
          const idx = run.queue.indexOf(leadId);
          if (idx === -1) return {};
          const queue = run.queue.filter((x) => x !== leadId);
          if (queue.length === 0) return { activeRun: null };
          const { [leadId]: _d, ...done } = run.done;
          const { [leadId]: _s, ...skipped } = run.skipped;
          const cursor = Math.min(
            idx < run.cursor ? run.cursor - 1 : run.cursor,
            queue.length - 1,
          );
          return { activeRun: { ...run, queue, done, skipped, cursor } };
        });
      },

      moveRunStop: (leadId, dir) => {
        set((s) => {
          if (!s.activeRun) return {};
          const run = s.activeRun;
          const i = run.queue.indexOf(leadId);
          const j = i + dir;
          if (i === -1 || j < 0 || j >= run.queue.length) return {};
          const queue = [...run.queue];
          [queue[i], queue[j]] = [queue[j], queue[i]];
          const currentId = run.queue[run.cursor];
          return {
            activeRun: { ...run, queue, cursor: queue.indexOf(currentId) },
          };
        });
      },

      dismissRunRecap: () => {
        set({ lastRun: null });
      },

      // ── Danger Zone ─────────────────────────────────────────────────────────
      resetAllData: () => {
        set({
          leads: [],
          customColumns: [],
          groups: [],
          sortKey: "followUpDate",
          sortDir: "asc",
          refSections: [],
          geocache: {},
          notifSettings: {
            enabled: false,
            summary: true,
            overdue: true,
            stale: true,
          },
          dailyPlan: [],
          lastPlanDate: todayStr(),
          lastPlanSummary: [],
          homeBase: null,
          pageSpeedCache: {},
          portfolioUrl: "",
          pipelineAnalysis: null,
          activeRun: null,
          lastRun: null,
        });
      },
    }),
    {
      name: "crm_leads",
      partialize: (s) => ({
        leads: s.leads,
        customColumns: s.customColumns,
        groups: s.groups,
        sortKey: s.sortKey,
        sortDir: s.sortDir,
        refSections: s.refSections,
        geocache: s.geocache,
        notifSettings: s.notifSettings,
        dailyPlan: s.dailyPlan,
        lastPlanDate: s.lastPlanDate,
        lastPlanSummary: s.lastPlanSummary,
        homeBase: s.homeBase,
        pageSpeedCache: s.pageSpeedCache,
        portfolioUrl: s.portfolioUrl,
        pipelineAnalysis: s.pipelineAnalysis,
        activeRun: s.activeRun,
        lastRun: s.lastRun,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        leads: (persisted.leads || []).map(migrateNotes),
        groups: persisted.groups || [],
        refSections: persisted.refSections || [],
        geocache: persisted.geocache || {},
        notifSettings: persisted.notifSettings || {
          enabled: false,
          summary: true,
          overdue: true,
          stale: true,
        },
        dailyPlan: persisted.dailyPlan || [],
        lastPlanDate: persisted.lastPlanDate || todayStr(),
        lastPlanSummary: persisted.lastPlanSummary || [],
        homeBase: persisted.homeBase || null,
        pageSpeedCache: persisted.pageSpeedCache || {},
        portfolioUrl: persisted.portfolioUrl || "",
        pipelineAnalysis: persisted.pipelineAnalysis || null,
        // Runs written before `skipped` existed rehydrate with an empty map.
        activeRun: persisted.activeRun
          ? {
              done: {},
              skipped: {},
              cursor: 0,
              ...persisted.activeRun,
            }
          : null,
        lastRun: persisted.lastRun
          ? { done: {}, skipped: {}, ...persisted.lastRun }
          : null,
      }),
    },
  ),
);

export default useCRMStore;
