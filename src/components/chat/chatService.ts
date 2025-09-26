import { db } from "../../lib/firebase/db";
import {
  ref, push, onChildAdded, get, child, DataSnapshot,
} from "firebase/database";

const MESSAGES_PATH = "messages";
const messagesRef = ref(db, MESSAGES_PATH);

export type ChatMessage = {
  text: string;              // texte ou "photo:<url>"
  timestamp: number;         // ms epoch
};

export type ShowAllOptions = {
  dateStr?: string;          // "DDMMYYYY" facultatif
  startHour?: number;        // 0..23
  endHour?: number;          // 0..23 (peut passer au jour suivant si <= startHour)
};

export type Unsub = () => void;

// ——— Envoi
export async function sendMessage(text: string) {
  const m: ChatMessage = { text, timestamp: Date.now() };
  await push(messagesRef, m);
}

// ——— Abonnement “live only” (ne remonte pas l’historique au mount)
export function subscribeRecent(onMsg: (m: ChatMessage) => void): Unsub {
  const now = Date.now();
  const off = onChildAdded(messagesRef, (snap: DataSnapshot) => {
    const val = snap.val();
    if (!val || typeof val.text !== "string") return;
    const ts = Number(val.timestamp);
    if (ts >= now) onMsg({ text: val.text, timestamp: ts });
  });
  return () => off();
}

// ——— Historique optionnel (ex: /all [date hh hh])
export async function fetchAllMessages(opts?: ShowAllOptions): Promise<ChatMessage[]> {
  const root = ref(db);
  const snap = await get(child(root, MESSAGES_PATH));
  if (!snap.exists()) return [];
  const data = snap.val() ?? {};
  let startTs = 0, endTs = Infinity;

  if (opts?.dateStr && Number.isFinite(opts.startHour) && Number.isFinite(opts.endHour)) {
    const day = parseInt(opts.dateStr.slice(0, 2));
    const month = parseInt(opts.dateStr.slice(2, 4)) - 1;
    const year = parseInt(opts.dateStr.slice(4, 8));
    const start = new Date(year, month, day, opts.startHour!, 0, 0, 0);
    const end = new Date(year, month, day, opts.endHour!, 0, 0, 0);
    if ((opts.endHour as number) <= (opts.startHour as number)) end.setDate(end.getDate() + 1);
    startTs = start.getTime(); endTs = end.getTime();
  }

  const list: ChatMessage[] = Object.values<any>(data)
    .filter(v => v && typeof v.text === "string")
    .map(v => ({ text: v.text, timestamp: Number(v.timestamp) }))
    .filter(m => m.timestamp >= startTs && m.timestamp <= endTs)
    .sort((a, b) => a.timestamp - b.timestamp);

  return list;
}

// ——— Callback photo (placeholder) : branche plus tard ton module photos
export async function loadAllPictures(cb: (url: string) => void) {
  // TODO: appelle ici Firebase Storage ou ton futur service
  // cb("https://.../photo1.jpg");
}

// ——— Local overlay (pour Logo, commandes, etc.)
type LocalSubscriber = (m: ChatMessage) => void;
const localSubs = new Set<LocalSubscriber>();

export function subscribeLocal(onMsg: LocalSubscriber): Unsub {
  localSubs.add(onMsg);
  return () => localSubs.delete(onMsg);
}

export function enqueueLocal(text: string) {
  const m: ChatMessage = { text, timestamp: Date.now() };
  localSubs.forEach(fn => fn(m));
}