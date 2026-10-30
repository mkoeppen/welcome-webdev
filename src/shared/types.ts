export type Cat = 'CSS' | 'HTML' | 'JS' | 'Sonstige';

export interface Feature {
  id: string;
  name: string;
  desc: string;
  cat: Cat;
  level: string;
  low: string;
  high: string;
}

export interface Features {
  newly: Feature[];
  widely: Feature[];
}

export interface NewsItem {
  source: string;
  title: string;
  link: string;
  date: number;
  desc: string;
  image: string;
}

export interface Mdn {
  at: number;
  map: Record<string, string>;
}

// Markierungen: Key "n:<link>" (News) / "f:<id>" (Feature)
export interface Mark {
  read?: 0 | 1;
  fav?: 0 | 1;
  hidden?: 0 | 1;
}
export type Marks = Record<string, Mark>;

export interface SplitFeatures {
  newlyRecent: Feature[];
  newlyOlder: Feature[];
  widelyRecent: Feature[];
  widelyOlder: Feature[];
}

// Alles, was die Webview zum Rendern braucht
export interface Payload {
  news: NewsItem[];
  features: SplitFeatures | null;
  mdn: Record<string, string>;
  at: string;
  failed: string[];
  marks: Marks;
}

export type ToHost = { type: 'ready' } | { type: 'refresh' } | { type: 'mark'; keys: string[]; patch: Mark };
export type ToWebview = { type: 'data'; payload: Payload } | { type: 'marks'; marks: Marks };
