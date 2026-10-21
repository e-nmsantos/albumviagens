// Shared data shapes. The same shapes are stored in IndexedDB (local mode) and Supabase (cloud mode).

export type Memory = {
  id: string;
  user_id: string;
  title: string;
  place: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  text: string;
  /** Photo keys: `local/<uuid>.jpg` in local mode, `<user_id>/<uuid>.jpg` in the cloud bucket. */
  photos: string[];
  lat: number | null;
  lng: number | null;
  trip: string | null;
  is_public: boolean;
};

export type MemoryInput = Omit<Memory, "id" | "user_id"> & { id?: string | undefined };

export type Wish = {
  id: string;
  place: string;
  note: string;
  lat: number | null;
  lng: number | null;
  done: boolean;
  when_text: string;
  priority: number;
};

export type WishInput = Omit<Wish, "id" | "done">;

export type ItineraryDay = {
  id: string;
  day_number: number;
  time: string;
  title: string;
  place: string;
  notes?: string | undefined;
  /** Photo key, resolved like memory photos. */
  photo?: string | undefined;
  lat?: number | null | undefined;
  lng?: number | null | undefined;
};

export const EXPENSE_CATEGORIES = {
  alojamento: "Alojamento",
  transporte: "Transporte & Voos",
  alimentacao: "Alimentação & Restaurantes",
  atividades: "Atividades & Lazer",
  compras: "Compras & Lembranças",
  outros: "Outros",
} as const;

export type TripExpense = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: keyof typeof EXPENSE_CATEGORIES;
  date?: string | undefined;
};

export const RESERVATION_TYPES = {
  flight: "Voo",
  hotel: "Alojamento",
  ticket: "Bilhete",
  transport: "Transporte",
} as const;

export type TripReservation = {
  id: string;
  type: keyof typeof RESERVATION_TYPES;
  title: string;
  reference?: string | undefined;
  date_start: string;
  date_end?: string | undefined;
  location?: string | undefined;
  details?: string | undefined;
};

export const PACKING_CATEGORIES = {
  documentos: "📄 Documentos & Dinheiro",
  roupa: "👕 Roupa & Calçado",
  eletronica: "🔌 Eletrónica & Cabos",
  farmacia: "💊 Farmácia & Higiene",
  outros: "✨ Extras & Diversos",
} as const;

export type PackingItem = {
  id: string;
  category: keyof typeof PACKING_CATEGORIES;
  name: string;
  packed: boolean;
};

export type TripPlan = {
  id: string;
  title: string;
  dates: string;
  destination: string;
  notes: string;
  days: ItineraryDay[];
  /** Budget ceiling in EUR; 0 means no ceiling. */
  budget_limit: number;
  expenses: TripExpense[];
  reservations: TripReservation[];
  packing_list: PackingItem[];
  /** ISO timestamp; used to list the newest trips first. */
  created_at: string;
};

export type TripInput = Partial<TripPlan> & { title: string };

export type Backup = {
  version: number;
  exported_at: string;
  memories: Memory[];
  wishes: Wish[];
  trips: TripPlan[];
  /** Photo key → data URL. Absent in version 2 backups. */
  photos?: Record<string, string>;
};
