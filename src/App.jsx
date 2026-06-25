import { useState } from "react";
import useCRMStore from "./store/useCRMStore";
import SummaryBar from "./components/SummaryBar";
import LeadTable from "./components/LeadTable";
import LeadModal from "./components/LeadModal";

export default function App() {
  const { leads, addLead, updateLead } = useCRMStore();
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  const handleSave = (form) => {
    if (editingLead) {
      updateLead(editingLead.id, form);
    } else {
      addLead(form);
    }
  };

  const handleEdit = (lead) => {
    setEditingLead(lead);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingLead(null);
  };

  const now = new Date();
  const lastUpdated = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <div className="min-h-screen bg-[#03060f] text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#030609f]/90 sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-100 tracking-tight">
              Restaurant CRM
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Last updated {lastUpdated}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingLead(null);
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white text-base font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            + Add Lead
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <SummaryBar leads={leads} />
        <LeadTable leads={leads} onEdit={handleEdit} />
      </main>

      {/* Modal */}
      {showModal && (
        <LeadModal
          onClose={handleClose}
          onSave={handleSave}
          existing={editingLead}
        />
      )}
    </div>
  );
}
