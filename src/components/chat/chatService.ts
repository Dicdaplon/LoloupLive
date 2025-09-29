// chatService.ts
import { db } from "../../lib/firebase/databaseConfiguration";
import {
  ref, push, set, onChildAdded, get, query,
  orderByChild, startAt, endAt, DataSnapshot, serverTimestamp
} from "firebase/database";

// --- Room par défaut (change-la si besoin, ou rends-la paramétrable)
const ROOM_ID = "jam";

// --- Référence messages sous rooms/{roomId}/messages
const messagesRef = ref(db, `rooms/${ROOM_ID}/messages`);

export type ChatMessage = {
  id?: string;
  text: string | null;        // texte du message OU null si photo seule
  photoUrl?: string | null;   // URL d'image (facultatif)
  userId?: string;            // futur: uid firebase
  userName?: string;          // futur: snapshot du pseudo
  createdAt: number;          // ms epoch (en lecture)
};

export type ShowAllOptions = {
  dateStr?: string;           // "DDMMYYYY" (facultatif)
  startHour?: number;         // 0..23 (facultatif)
  endHour?: number;           // 0..23 (facultatif)
};

export type Unsub = () => void;

/* ---------------------------------------------
 * Envoi d’un message
 * - Compatible avec sendMessage("coucou")
 * - Optionnel: user + photoUrl
 * --------------------------------------------- */
export async function sendMessage(
  text: string,
  opts?: { userId?: string; userName?: string; photoUrl?: string | null }
) {
  const payload = {
    text: text ?? null,
    photoUrl: opts?.photoUrl ?? null,
    userId: opts?.userId ?? "anonymous",
    userName: opts?.userName ?? "Invité",
    // serverTimestamp() est d’abord un placeholder; en lecture on récupère un number (ms)
    createdAt: serverTimestamp() as unknown as number
  };

  await push(messagesRef, payload);
}

/* ---------------------------------------------
 * Abonnement “live seulement” depuis maintenant
 * - Requête: orderByChild(createdAt) + startAt(now)
 * - Ne remonte pas l’historique passé
 * --------------------------------------------- */
export function subscribeRecent(onMsg: (m: ChatMessage) => void): Unsub {
  const now = Date.now();
  const q = query(messagesRef, orderByChild("createdAt"), startAt(now));

  const off = onChildAdded(q, (snap: DataSnapshot) => {
    const val = snap.val();
    if (!val) return;

    // En lecture, createdAt est un number (ms). Si ce n’est pas le cas, on ignore.
    const ts = Number(val.createdAt);
    if (!Number.isFinite(ts)) return;

    const m: ChatMessage = {
      id: snap.key ?? undefined,
      text: typeof val.text === "string" ? val.text : null,
      photoUrl: val.photoUrl ?? null,
      userId: val.userId ?? undefined,
      userName: val.userName ?? undefined,
      createdAt: ts
    };
    onMsg(m);
  });

  return () => off();
}

/* ---------------------------------------------
 * Historique optionnel (plage par date/heure)
 * - Utilise startAt/endAt si fournis
 * - Sinon renvoie tout, trié ascendant
 * --------------------------------------------- */
export async function fetchAllMessages(opts?: ShowAllOptions): Promise<ChatMessage[]> {
  let startTs = 0;
  let endTs = Number.MAX_SAFE_INTEGER;

  if (opts?.dateStr && Number.isFinite(opts.startHour) && Number.isFinite(opts.endHour)) {
    const day = parseInt(opts.dateStr.slice(0, 2), 10);
    const month = parseInt(opts.dateStr.slice(2, 4), 10) - 1;
    const year = parseInt(opts.dateStr.slice(4, 8), 10);

    const start = new Date(year, month, day, opts.startHour as number, 0, 0, 0);
    const end = new Date(year, month, day, opts.endHour as number, 0, 0, 0);
    if ((opts.endHour as number) <= (opts.startHour as number)) {
      end.setDate(end.getDate() + 1); // traverse minuit
    }
    startTs = start.getTime();
    endTs = end.getTime();
  }

  // Si filtrage demandé, on pousse la plage dans la requête.
  let qRef = query(messagesRef, orderByChild("createdAt"));
  if (startTs > 0) qRef = query(qRef, startAt(startTs));
  if (endTs < Number.MAX_SAFE_INTEGER) qRef = query(qRef, endAt(endTs));

  const snap = await get(qRef);
  if (!snap.exists()) return [];

  const list: ChatMessage[] = [];
  snap.forEach((child) => {
    const v = child.val();
    const ts = Number(v?.createdAt);
    if (!Number.isFinite(ts)) return;

    list.push({
      id: child.key ?? undefined,
      text: typeof v.text === "string" ? v.text : null,
      photoUrl: v.photoUrl ?? null,
      userId: v.userId ?? undefined,
      userName: v.userName ?? undefined,
      createdAt: ts
    });
  });

  // Sécurité: tri ascendant par createdAt
  list.sort((a, b) => a.createdAt - b.createdAt);
  return list;
}

/* ---------------------------------------------
 * Placeholder photos (à brancher plus tard)
 * --------------------------------------------- */
export async function loadAllPictures(cb: (url: string) => void) {
  // TODO: lister Storage et appeler cb(url) pour chaque image
  // Exemple plus tard: rooms/${ROOM_ID}/messages/{timestamp_filename}.jpg
}

/* ---------------------------------------------
 * Overlay local (inchangé)
 * --------------------------------------------- */
type LocalSubscriber = (m: ChatMessage) => void;
const localSubs = new Set<LocalSubscriber>();

export function subscribeLocal(onMsg: LocalSubscriber): Unsub {
  localSubs.add(onMsg);
  return () => localSubs.delete(onMsg);
}

export function enqueueLocal(text: string) {
  const m: ChatMessage = { text, createdAt: Date.now() };
  localSubs.forEach((fn) => fn(m));
}
