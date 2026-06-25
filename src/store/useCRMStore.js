import { create } from "zustand";
import { persist } from "zustand/middleware";

const SAMPLE_LEADS = [
  {
    id: "1",
    businessName: "El Maizal",
    ownerName: "Carlos",
    phone: "(805) 555-0101",
    email: "",
    address: "2847 Tapo Canyon Rd, Simi Valley",
    type: "Walk-in",
    strength: 4,
    status: "Warm",
    lastTouchDate: "2026-06-22",
    followUpDate: "2026-06-25",
    notes:
      "Owner was receptive. Showed interest in a menu page update. Call Thursday.",
  },
  {
    id: "2",
    businessName: "La Cocina",
    ownerName: "",
    phone: "(805) 555-0184",
    email: "",
    address: "1120 Los Angeles Ave, Moorpark",
    type: "Walk-in",
    strength: 4,
    status: "Warm",
    lastTouchDate: "2026-06-22",
    followUpDate: "2026-06-26",
    notes:
      "Friendly staff. Manager asked to come back when owner is in — usually Thursdays.",
  },
  {
    id: "3",
    businessName: "Vapollo",
    ownerName: "",
    phone: "(805) 555-0237",
    email: "",
    address: "1436 Erringer Rd, Simi Valley",
    type: "Walk-in",
    strength: 3,
    status: "Contacted",
    lastTouchDate: "2026-06-20",
    followUpDate: "2026-06-27",
    notes:
      "First in-person pitch. Left card. No current site — good opportunity.",
  },
  {
    id: "4",
    businessName: "Luv 'n Eat Thai",
    ownerName: "",
    phone: "",
    email: "info@luvneat.com",
    address: "6660 Reseda Blvd, Reseda",
    type: "Cold Email",
    strength: 2,
    status: "Contacted",
    lastTouchDate: "2026-06-21",
    followUpDate: "2026-06-28",
    notes:
      "Sent cold email. No reply yet. Site looks outdated — strong pitch angle.",
  },
  {
    id: "5",
    businessName: "Hearth Coffee",
    ownerName: "",
    phone: "",
    email: "hello@hearthcoffee.com",
    address: "3040 Cochran St, Simi Valley",
    type: "Cold Email",
    strength: 2,
    status: "Cold",
    lastTouchDate: "2026-06-21",
    followUpDate: "2026-06-28",
    notes: "Sent intro email. Mobile site is broken. Good candidate.",
  },
  {
    id: "6",
    businessName: "Simi Wok",
    ownerName: "",
    phone: "(805) 555-0312",
    email: "",
    address: "950 Cochran St, Simi Valley",
    type: "Phone Call",
    strength: 2,
    status: "Cold",
    lastTouchDate: "",
    followUpDate: "2026-06-24",
    notes: "On the call list for tomorrow morning.",
  },
  {
    id: "7",
    businessName: "Tacos El Rancho",
    ownerName: "Miguel",
    phone: "(805) 555-0448",
    email: "",
    address: "4821 Alamo St, Simi Valley",
    type: "Phone Call",
    strength: 3,
    status: "Cold",
    lastTouchDate: "",
    followUpDate: "2026-06-24",
    notes: "No website at all. High priority call.",
  },
  {
    id: "8",
    businessName: "Giovanni's Pizzeria",
    ownerName: "",
    phone: "(805) 555-0509",
    email: "",
    address: "2233 First St, Simi Valley",
    type: "Yelp Message",
    strength: 1,
    status: "Cold",
    lastTouchDate: "",
    followUpDate: "2026-06-30",
    notes: "Sent Yelp message. Site exists but hasn't been updated since 2019.",
  },
  {
    id: "9",
    businessName: "Pho Simi",
    ownerName: "",
    phone: "(805) 555-0671",
    email: "",
    address: "1750 Erringer Rd, Simi Valley",
    type: "Phone Call",
    strength: 2,
    status: "Cold",
    lastTouchDate: "",
    followUpDate: "2026-06-24",
    notes: "Call list tomorrow. No mobile version of site.",
  },
  {
    id: "10",
    businessName: "The Greek Place",
    ownerName: "Nikos",
    phone: "(805) 555-0788",
    email: "nikos@thegreekplace.com",
    address: "3310 Cochran St, Simi Valley",
    type: "Cold Email",
    strength: 3,
    status: "Waiting",
    lastTouchDate: "2026-06-18",
    followUpDate: "2026-06-25",
    notes:
      "Owner said he's \"thinking about it.\" Follow up end of week — don't be pushy.",
  },
];

const useCRMStore = create(
  persist(
    (set, get) => ({
      leads: SAMPLE_LEADS,
      sortKey: "followUpDate",
      sortDir: "asc",

      addLead: (lead) => {
        const newLead = {
          ...lead,
          id: Date.now().toString(),
        };
        set((s) => ({ leads: [...s.leads, newLead] }));
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
    }),
    {
      name: "crm_leads",
    },
  ),
);

export default useCRMStore;
