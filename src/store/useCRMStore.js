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
        set((s) => ({ leads: s.leads.filter((l) => l.id !== leadId) }));
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
          // Unassign all leads in this group
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
                    { id: id("card"), title: title.trim(), body: body.trim() },
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

      // ── Geocache ────────────────────────────────────────────────────────────
      // Stores { address: { lat, lng } } to avoid re-geocoding the same address
      geocache: {},

      setGeocode: (address, coords) => {
        set((s) => ({ geocache: { ...s.geocache, [address]: coords } }));
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
      }),
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        leads: (persisted.leads || []).map(migrateNotes),
        groups: persisted.groups || [],
        refSections: persisted.refSections || [],
        geocache: persisted.geocache || {},
      }),
    },
  ),
);

export default useCRMStore;
