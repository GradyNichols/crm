import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import useCRMStore from "../store/useCRMStore";

// ── Icons ───────────────────────────────────────────────────────────────────────

function IconUp() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 15.75l7.5-7.5 7.5 7.5"
      />
    </svg>
  );
}

function IconDown() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
      />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"
      />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  );
}

function IconPin({ filled }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-3.5 h-3.5"
      fill={filled ? "currentColor" : "none"}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
      />
    </svg>
  );
}

// ── Delete confirm modal ─────────────────────────────────────────────────────────

function DeleteModal({ label, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm bg-[#0d1117] border border-slate-700 rounded-xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-950 flex items-center justify-center shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-slate-100 font-semibold text-base">Delete?</h3>
            <p className="text-slate-500 text-sm mt-0.5">
              <span className="text-slate-300">"{label}"</span> will be
              permanently removed.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="text-sm font-medium bg-red-700 hover:bg-red-600 text-white px-5 py-2 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────────

function RefCard({ card, secId, isFirst, isLast }) {
  const updateRefCard = useCRMStore((s) => s.updateRefCard);
  const deleteRefCard = useCRMStore((s) => s.deleteRefCard);
  const moveRefCard = useCRMStore((s) => s.moveRefCard);
  const togglePitchScript = useCRMStore((s) => s.togglePitchScript);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: card.title, body: card.body });
  const [deleteTarget, setDeleteTarget] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const saveEdit = () => {
    if (!draft.title.trim()) return;
    updateRefCard(secId, card.id, {
      title: draft.title.trim(),
      body: draft.body.trim(),
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-lg border border-blue-700/50 bg-slate-900/60 p-4 space-y-3">
        <input
          autoFocus
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder="Card title…"
          className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <textarea
          rows={5}
          value={draft.body}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          placeholder="Script, response, rule…"
          className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setEditing(false)}
            className="text-sm text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveEdit}
            className="text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-slate-800 bg-slate-900/20 hover:bg-slate-900/40 transition-colors group">
        {/* Card header */}
        <div
          className="flex items-center gap-2 px-4 py-3 cursor-pointer"
          onClick={() => setExpanded((e) => !e)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-3.5 h-3.5 text-slate-600 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
          <p className="text-slate-200 text-sm font-medium flex-1 select-none flex items-center gap-2">
            {card.title}
            {card.isPitchScript && (
              <span className="text-[10px] font-semibold text-purple-400 border border-purple-900/50 px-1.5 py-0.5 rounded-full shrink-0">
                PITCH
              </span>
            )}
          </p>

          {/* Action buttons — visible on hover */}
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => togglePitchScript(secId, card.id)}
              className={`p-1 transition-colors ${
                card.isPitchScript
                  ? "text-purple-400"
                  : "text-slate-600 hover:text-purple-400"
              }`}
              title={
                card.isPitchScript
                  ? "Remove from Pitch Mode"
                  : "Use in Pitch Mode"
              }
            >
              <IconPin filled={card.isPitchScript} />
            </button>
            <button
              onClick={() => moveRefCard(secId, card.id, -1)}
              disabled={isFirst}
              className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
              title="Move up"
            >
              <IconUp />
            </button>
            <button
              onClick={() => moveRefCard(secId, card.id, 1)}
              disabled={isLast}
              className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
              title="Move down"
            >
              <IconDown />
            </button>
            <button
              onClick={() => {
                setDraft({ title: card.title, body: card.body });
                setEditing(true);
              }}
              className="p-1 text-slate-600 hover:text-blue-400 transition-colors"
              title="Edit"
            >
              <IconEdit />
            </button>
            <button
              onClick={() => setDeleteTarget(true)}
              className="p-1 text-slate-600 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <IconTrash />
            </button>
          </div>
        </div>

        {/* Card body */}
        {expanded && (
          <div className="px-4 pb-4 border-t border-slate-800/60 pt-3">
            <p className="text-slate-400 text-sm whitespace-pre-wrap leading-relaxed">
              {card.body}
            </p>
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteModal
          label={card.title}
          onConfirm={() => {
            deleteRefCard(secId, card.id);
            setDeleteTarget(false);
          }}
          onCancel={() => setDeleteTarget(false)}
        />
      )}
    </>
  );
}

// ── Add Card Form ───────────────────────────────────────────────────────────────

function AddCardForm({ secId, onDone }) {
  const addRefCard = useCRMStore((s) => s.addRefCard);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    addRefCard(secId, { title, body });
    setTitle("");
    setBody("");
    setError("");
    onDone();
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 space-y-3">
      <div className="space-y-1">
        <input
          autoFocus
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError("");
          }}
          placeholder="Card title…"
          className={`w-full bg-slate-800/60 border ${error ? "border-red-500" : "border-slate-700"} text-slate-100 text-sm rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors`}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
      <textarea
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Script, response, or rule (supports line breaks)…"
        className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={onDone}
          className="text-sm text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleAdd}
          className="text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg transition-colors"
        >
          Add Card
        </button>
      </div>
    </div>
  );
}

// ── Section ─────────────────────────────────────────────────────────────────────

function RefSection({ section, isFirst, isLast }) {
  const updateRefSection = useCRMStore((s) => s.updateRefSection);
  const deleteRefSection = useCRMStore((s) => s.deleteRefSection);
  const moveRefSection = useCRMStore((s) => s.moveRefSection);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(section.title);
  const [addingCard, setAddingCard] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const saveTitle = () => {
    if (titleDraft.trim()) updateRefSection(section.id, titleDraft.trim());
    setEditingTitle(false);
  };

  return (
    <>
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        {/* Section header */}
        <div className="flex items-center gap-2 px-5 py-3.5 bg-slate-900/60 border-b border-slate-800 group">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-slate-600 hover:text-slate-400 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-4 h-4 transition-transform ${collapsed ? "-rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m19.5 8.25-7.5 7.5-7.5-7.5"
              />
            </svg>
          </button>

          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") setEditingTitle(false);
              }}
              className="flex-1 bg-slate-800 border border-blue-500 text-slate-100 text-sm font-semibold rounded-lg px-2 py-1 focus:outline-none"
            />
          ) : (
            <h3
              className="flex-1 text-slate-100 font-semibold text-base cursor-pointer select-none"
              onClick={() => setCollapsed((c) => !c)}
            >
              {section.title}
              <span className="text-slate-600 font-normal text-sm ml-2">
                ({section.cards.length})
              </span>
            </h3>
          )}

          {/* Section actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => moveRefSection(section.id, -1)}
              disabled={isFirst}
              className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
              title="Move up"
            >
              <IconUp />
            </button>
            <button
              onClick={() => moveRefSection(section.id, 1)}
              disabled={isLast}
              className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
              title="Move down"
            >
              <IconDown />
            </button>
            <button
              onClick={() => {
                setTitleDraft(section.title);
                setEditingTitle(true);
              }}
              className="p-1 text-slate-600 hover:text-blue-400 transition-colors"
              title="Rename"
            >
              <IconEdit />
            </button>
            <button
              onClick={() => setDeleteTarget(true)}
              className="p-1 text-slate-600 hover:text-red-400 transition-colors"
              title="Delete section"
            >
              <IconTrash />
            </button>
          </div>
        </div>

        {/* Cards */}
        {!collapsed && (
          <div className="p-4 space-y-2">
            {section.cards.length === 0 && !addingCard && (
              <p className="text-sm text-slate-700 text-center py-4">
                No cards yet. Add one below.
              </p>
            )}
            {section.cards.map((card, i) => (
              <RefCard
                key={card.id}
                card={card}
                secId={section.id}
                isFirst={i === 0}
                isLast={i === section.cards.length - 1}
              />
            ))}
            {addingCard && (
              <AddCardForm
                secId={section.id}
                onDone={() => setAddingCard(false)}
              />
            )}
            {!addingCard && (
              <button
                onClick={() => setAddingCard(true)}
                className="w-full text-sm text-slate-600 hover:text-slate-400 border border-dashed border-slate-800 hover:border-slate-700 rounded-lg py-2.5 transition-colors"
              >
                + Add card
              </button>
            )}
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteModal
          label={section.title}
          onConfirm={() => {
            deleteRefSection(section.id);
            setDeleteTarget(false);
          }}
          onCancel={() => setDeleteTarget(false)}
        />
      )}
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────────

export default function Reference() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const refSections = useCRMStore((s) => s.refSections) ?? [];
  const addRefSection = useCRMStore((s) => s.addRefSection);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [showNewSection, setShowNewSection] = useState(false);
  const [sectionError, setSectionError] = useState("");

  const sectionRefs = useRef({});

  useEffect(() => {
    const action = searchParams.get("action");
    const sectionId = searchParams.get("section");
    if (action === "new-section") {
      setShowNewSection(true);
      setSearchParams({}, { replace: true });
    } else if (sectionId) {
      setTimeout(() => {
        const el = sectionRefs.current[sectionId];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) {
      setSectionError("Name is required");
      return;
    }
    addRefSection(newSectionTitle);
    setNewSectionTitle("");
    setSectionError("");
    setShowNewSection(false);
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-slate-100">Reference</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Pitch scripts, objection responses, follow-up rules.
          </p>
        </div>
        <button
          onClick={() => setShowNewSection((s) => !s)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Section
        </button>
      </div>

      {/* New section form */}
      {showNewSection && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-5 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            New Section
          </p>
          <div className="space-y-1">
            <input
              autoFocus
              value={newSectionTitle}
              onChange={(e) => {
                setNewSectionTitle(e.target.value);
                setSectionError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSection();
                if (e.key === "Escape") setShowNewSection(false);
              }}
              placeholder="e.g. Pitch Scripts, Objection Responses, Follow-up Rules…"
              className={`w-full bg-slate-800/60 border ${sectionError ? "border-red-500" : "border-slate-700"} text-slate-100 text-sm rounded-lg px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors`}
            />
            {sectionError && (
              <p className="text-xs text-red-400">{sectionError}</p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setShowNewSection(false);
                setSectionError("");
              }}
              className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSection}
              className="text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg transition-colors"
            >
              Create Section
            </button>
          </div>
        </div>
      )}

      {/* Sections */}
      {refSections.length === 0 && !showNewSection ? (
        <EmptyState
          type="reference"
          title="No sections yet"
          subtitle="Create sections like Pitch Scripts, Objection Responses, or Follow-up Rules."
          action={{
            label: "Create your first section",
            onClick: () => setShowNewSection(true),
          }}
        />
      ) : (
        <div className="space-y-4">
          {refSections.map((sec, i) => (
            <div
              key={sec.id}
              ref={(el) => {
                sectionRefs.current[sec.id] = el;
              }}
            >
              <RefSection
                section={sec}
                isFirst={i === 0}
                isLast={i === refSections.length - 1}
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
