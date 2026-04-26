import { create } from 'zustand';

// Tracks the audit currently in progress on the device.
// Persisted nowhere — restored on app launch from the SQLite draft (status='draft').
// All durable state lives in the visit_reports / audit_answers / audit_photos tables.
const INITIAL_STATE = {
  visitId: null,
  template: null,
  outletType: null,
  routePointId: null,
  customerId: null,
  answers: {},
  photosByQuestion: {},
  startedAt: null,
};

const useAuditStore = create((set, get) => ({
  ...INITIAL_STATE,

  startAudit: ({ visitId, template, outletType, routePointId, customerId }) => {
    set({
      visitId, template, outletType, routePointId, customerId,
      answers: {}, photosByQuestion: {},
      startedAt: new Date().toISOString(),
    });
  },

  loadDraft: ({ visit, answers, photosByQuestion, template }) => {
    set({
      visitId: visit.id,
      template,
      outletType: visit.outlet_type,
      routePointId: visit.route_point_id,
      customerId: visit.customer_id,
      answers: answers || {},
      photosByQuestion: photosByQuestion || {},
      startedAt: visit.created_at,
    });
  },

  setAnswer: (questionId, patch) => {
    const current = get().answers[questionId] || {};
    set({ answers: { ...get().answers, [questionId]: { ...current, ...patch } } });
  },

  addPhotoToQuestion: (questionId, photo) => {
    const list = get().photosByQuestion[questionId] || [];
    set({
      photosByQuestion: {
        ...get().photosByQuestion,
        [questionId]: [...list, photo],
      },
    });
  },

  removePhotoFromQuestion: (questionId, photoId) => {
    const list = get().photosByQuestion[questionId] || [];
    set({
      photosByQuestion: {
        ...get().photosByQuestion,
        [questionId]: list.filter((p) => p.id !== photoId),
      },
    });
  },

  // Targeted update — used by AuditScreen on focus to refresh photos without
  // touching answers/template (which would re-render every question card).
  setPhotosByQuestion: (photosByQuestion) => {
    set({ photosByQuestion: photosByQuestion || {} });
  },

  clear: () => set({ ...INITIAL_STATE }),
}));

export default useAuditStore;
