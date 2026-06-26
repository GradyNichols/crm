import { create } from "zustand";
import { persist } from "zustand/middleware";

const useCRMStore = create(
  persist(
    (set) => ({
      leads: [],
      customColumns: [],
      sortKey: "followUpDate",
      sortDir: "asc",

      // ── Leads ──────────────────────────────────────────────
      addLead: (lead) => {
        set((s) => ({
          leads: [...s.leads, { ...lead, id: Date.now().toString() }],
        }));
      },

      updateLead: (id, updates) => {
        set((s) => ({
          leads: s.leads.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        }));
      },

      deleteLead: (id) => {
        set((s) => ({ leads: s.leads.filter((l) => l.id !== id) }));
      },

      setSort: (key) => {
        set((s) => ({
          sortKey: key,
          sortDir: s.sortKey === key && s.sortDir === "asc" ? "desc" : "asc",
        }));
      },

      // ── Custom columns ─────────────────────────────────────
      addCustomColumn: (col) => {
        const newCol = { ...col, id: `custom_${Date.now()}` };
        set((s) => ({ customColumns: [...s.customColumns, newCol] }));
      },

      deleteCustomColumn: (colId) => {
        set((s) => ({
          customColumns: s.customColumns.filter((c) => c.id !== colId),
          leads: s.leads.map((l) => {
            const updated = { ...l };
            delete updated[colId];
            return updated;
          }),
        }));
      },
    }),
    {
      name: "crm_leads",
      // Only persist data, never functions
      partialize: (s) => ({
        leads: s.leads,
        customColumns: s.customColumns,
        sortKey: s.sortKey,
        sortDir: s.sortDir,
      }),
    },
  ),
);

export default useCRMStore;
