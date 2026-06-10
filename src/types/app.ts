// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Buchungsuebersicht {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    gast_vorname?: string;
    gast_nachname?: string;
    zimmernummer?: string;
    anreise?: string; // Format: YYYY-MM-DD oder ISO String
    abreise?: string; // Format: YYYY-MM-DD oder ISO String
    anzahl_personen?: number;
    buchungsstatus?: LookupValue;
    hinweise?: string;
  };
}

export const APP_IDS = {
  BUCHUNGSUEBERSICHT: '6a293dfc0fbbb8ba791abca3',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'buchungsuebersicht': {
    buchungsstatus: [{ key: "bestaetigt", label: "Bestätigt" }, { key: "ausstehend", label: "Ausstehend" }, { key: "storniert", label: "Storniert" }, { key: "eingecheckt", label: "Eingecheckt" }, { key: "ausgecheckt", label: "Ausgecheckt" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'buchungsuebersicht': {
    'gast_vorname': 'string/text',
    'gast_nachname': 'string/text',
    'zimmernummer': 'string/text',
    'anreise': 'date/date',
    'abreise': 'date/date',
    'anzahl_personen': 'number',
    'buchungsstatus': 'lookup/select',
    'hinweise': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateBuchungsuebersicht = StripLookup<Buchungsuebersicht['fields']>;