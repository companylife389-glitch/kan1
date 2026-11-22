import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Search, User, Settings, LogOut, Heart,
  MessageCircle, Send, Image as ImageIcon, Video, Trash2,
  Reply, ChevronRight, ChevronLeft, Users,
  Check, X, Paperclip,
  Bookmark, Share2, Camera, Eye, EyeOff, MapPin,
  Link as LinkIcon, Calendar, MessageSquare, Mic,
  Palette, Play, Pause, Download, FileText, Smile, Film, Plus, Volume2, VolumeX, RefreshCw, PlayCircle, Sparkles, Copy, CheckCheck, Maximize, Minimize, Menu, ChevronsLeft, ChevronsRight, Bell, BellOff, LayoutGrid, Pencil
} from 'lucide-react';
import { supabase, isConfigured } from './supabase';

// ============ Types ============
interface ChatBackground {
  type: 'color' | 'gradient' | 'image';
  value: string;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string; // base64 image or empty
  bio: string;
  location: string;
  website: string;
  joinDate: string;
  followers: string[];
  following: string[];
}

interface Comment {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
  likes: string[];
  replies: Reply[];
}

interface Reply {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
  likes: string[];
}

interface Post {
  id: string;
  userId: string;
  text: string;
  media?: { type: 'image' | 'video' | 'file'; url: string; name?: string; size?: number };
  extraMedia?: { type: 'image' | 'video' | 'file'; url: string; name?: string; size?: number }[];
  isReel?: boolean;
  isVideo?: boolean;
  title?: string;
  coverUrl?: string;
  cursor: string;
  timestamp: number;
  likes: string[];
  comments: Comment[];
  bookmarks: string[];
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  read: boolean;
  delivered?: boolean;
  replyToId?: string;
  sharedPostId?: string;
  sharedCommentId?: string;
  editedAt?: number;
  reactions?: { userId: string; emoji: string }[];
  media?: { type: 'image' | 'video' | 'voice' | 'file'; url: string; duration?: number; name?: string; size?: number; path?: string };
}


interface GroupMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isSystem: boolean;
  editedAt?: number;
  readBy: string[];
  replyToId?: string;
  media?: { type: 'image' | 'video' | 'voice' | 'file'; url: string; duration?: number; name?: string; size?: number; path?: string };
  reactions: { userId: string; emoji: string }[];
}
interface Group {
  id: string;
  name: string;
  avatar: string;
  createdBy: string;
  lastActivity: number;
  members: { userId: string; role: 'admin' | 'member' }[];
  messages: GroupMessage[];
}

interface Conversation {
  id: string;
  participants: string[];
  messages: Message[];
  lastActivity: number;
  background?: ChatBackground;
}

// ============ Helpers ============
const CHAT_GRADIENTS = [
  'from-gray-900 to-gray-950',
  'from-violet-950 to-gray-950',
  'from-blue-950 to-gray-950',
  'from-emerald-950 to-gray-950',
  'from-rose-950 to-gray-950',
  'from-amber-950 to-gray-950',
  'from-indigo-950 to-purple-950',
  'from-cyan-950 to-blue-950',
  'from-pink-950 to-rose-950',
  'from-teal-950 to-emerald-950',
];

const formatTime = (ts: number) => {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'الآن';
  if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} د`;
  if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} س`;
  if (diff < 604800000) return `منذ ${Math.floor(diff / 86400000)} ي`;
  return new Date(ts).toLocaleDateString('ar-EG');
};

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ============ Storage ============
// ============ Avatar Component ============
// ============ Story ring on pictures (everywhere), configurable in Settings ============
type RingStyle = 'kan' | 'insta' | 'green' | 'off';
const RING_BG: Record<Exclude<RingStyle, 'off'>, string> = {
  kan: 'linear-gradient(135deg,#7c3aed,#d946ef,#06b6d4)',
  insta: 'linear-gradient(45deg,#facc15,#f43f5e,#a21caf)',
  green: 'linear-gradient(135deg,#22c55e,#10b981)',
};
const getRingStyle = (): RingStyle => {
  try { const v = localStorage.getItem('kan_story_ring'); return v === 'insta' || v === 'green' || v === 'off' ? v : 'kan'; } catch { return 'kan'; }
};
const setRingStyleStored = (v: RingStyle) => {
  try { localStorage.setItem('kan_story_ring', v); } catch { /* ignore */ }
  window.dispatchEvent(new Event('kan-ring-style'));
};
// user id -> 'new' (unseen story) | 'seen'
let storyRings = new Map<string, 'new' | 'seen'>();
const ringListeners = new Set<() => void>();
const setStoryRings = (m: Map<string, 'new' | 'seen'>) => { storyRings = m; ringListeners.forEach(f => f()); };
function useStoryRing(userId: string | undefined): { state: 'new' | 'seen' | null; style: RingStyle } {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force(n => n + 1);
    ringListeners.add(f);
    window.addEventListener('kan-ring-style', f);
    return () => { ringListeners.delete(f); window.removeEventListener('kan-ring-style', f); };
  }, []);
  return { state: userId ? storyRings.get(userId) ?? null : null, style: getRingStyle() };
}

function Avatar({ src, name, size = 'md', zoom = false, noRing = false, userId }: { src: string; name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; zoom?: boolean; noRing?: boolean; userId?: string }) {
  const [open, setOpen] = useState(false);
  const ring = useStoryRing(noRing ? undefined : userId);
  const showRing = ring.state !== null && ring.style !== 'off';
  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-20 h-20 text-3xl',
  };

  const bgColors = [
    'bg-violet-600', 'bg-cyan-600', 'bg-emerald-600', 'bg-rose-600',
    'bg-amber-600', 'bg-indigo-600', 'bg-pink-600', 'bg-teal-600',
  ];

  const colorIndex = name.charCodeAt(0) % bgColors.length;
  // The coloured ring is decided per person (user id), so it works for pictures and for initials alike.
  const wrap = (node: React.ReactNode) => (showRing ? (
    <div className="rounded-full p-[2px] flex-shrink-0" style={{ background: ring.state === 'new' && ring.style !== 'off' ? RING_BG[ring.style] : '#4b5563' }}>{node}</div>
  ) : node);

  if (src) {
    const picture = wrap(
      <div className={`${sizes[size]} rounded-full overflow-hidden flex-shrink-0 border-2 ${showRing ? 'border-gray-950' : 'border-gray-700'}`}>
        <img src={src} alt={name} className="w-full h-full object-cover" />
      </div>
    );
    if (!zoom) return picture;
    return (
      <>
        <button type="button" onClick={e => { e.stopPropagation(); setOpen(true); }} className="rounded-full flex-shrink-0 cursor-zoom-in active:scale-95 transition-transform" aria-label={`عرض صورة ${name}`}>
          {picture}
        </button>
        {open && <ImageViewer src={src} name={name} onClose={() => setOpen(false)} />}
      </>
    );
  }

  return wrap(
    <div className={`${sizes[size]} rounded-full ${bgColors[colorIndex]} flex items-center justify-center flex-shrink-0 font-bold text-white ${showRing ? 'border-2 border-gray-950' : ''}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ============ Image Upload Helper ============
function useImageUpload(maxSizeMB = 3) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const uploadFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        reject(`الحجم يجب أن لا يتجاوز ${maxSizeMB} ميجابايت`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject('فشل قراءة الملف');
      reader.readAsDataURL(file);
    });
  };

  return { uploading, error, setError, uploadFile, setUploading };
}

// ============ Supabase helpers ============
function shrinkImage(dataUrl: string, max = 256): Promise<string> {
  return new Promise(resolve => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function loadUsers(): Promise<User[]> {
  const [profiles, follows] = await Promise.all([
    supabase.from('profiles').select('id, username, display_name, avatar, bio, location, website, created_at'),
    supabase.from('follows').select('follower_id, following_id'),
  ]);
  if (profiles.error) throw profiles.error;
  if (follows.error) throw follows.error;
  const followers = new Map<string, string[]>();
  const following = new Map<string, string[]>();
  for (const f of follows.data ?? []) {
    followers.set(f.following_id, [...(followers.get(f.following_id) ?? []), f.follower_id]);
    following.set(f.follower_id, [...(following.get(f.follower_id) ?? []), f.following_id]);
  }
  return (profiles.data ?? []).map(p => ({
    id: p.id,
    username: p.username,
    displayName: p.display_name,
    avatar: p.avatar ?? '',
    bio: p.bio ?? '',
    location: p.location ?? '',
    website: p.website ?? '',
    joinDate: p.created_at,
    followers: followers.get(p.id) ?? [],
    following: following.get(p.id) ?? [],
  }));
}

const POST_MEDIA_BUCKET = 'post-media';

const MEDIA_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
};

// Storage path of a post's media, taken from its public URL.
function mediaPath(url: string): string | null {
  const marker = `/${POST_MEDIA_BUCKET}/`;
  const i = url.indexOf(marker);
  return i < 0 ? null : decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
}

interface PostRow {
  id: string;
  user_id: string;
  text: string;
  media_url: string | null;
  media_type: 'image' | 'video' | 'file' | null;
  media_name: string | null;
  media_size: number | null;
  is_reel: boolean;
  is_video: boolean;
  title: string | null;
  cover_url: string | null;
  media_extra?: { type: 'image' | 'video' | 'file'; url: string; name?: string; size?: number }[] | null;
  created_at: string;
  post_likes: { user_id: string }[];
  bookmarks: { user_id: string }[];
  comments: {
    id: string;
    parent_id: string | null;
    user_id: string;
    text: string;
    created_at: string;
    comment_likes: { user_id: string }[];
  }[];
}

const POST_SELECT = 'id, user_id, text, media_url, media_type, media_name, media_size, is_reel, is_video, title, cover_url, media_extra, created_at, post_likes(user_id), bookmarks(user_id), comments(id, parent_id, user_id, text, created_at, comment_likes(user_id))';

function rowToPost(row: PostRow): Post {
  const repliesByParent = new Map<string, Reply[]>();
  for (const c of row.comments) {
    if (!c.parent_id) continue;
    repliesByParent.set(c.parent_id, [
      ...(repliesByParent.get(c.parent_id) ?? []),
      { id: c.id, userId: c.user_id, text: c.text, timestamp: new Date(c.created_at).getTime(), likes: c.comment_likes.map(l => l.user_id) },
    ]);
  }
  return {
    id: row.id,
    userId: row.user_id,
    text: row.text,
    media: row.media_url && row.media_type
      ? { type: row.media_type, url: row.media_url, name: row.media_name ?? undefined, size: row.media_size ?? undefined }
      : undefined,
    extraMedia: Array.isArray(row.media_extra) && row.media_extra.length > 0 ? row.media_extra : undefined,
    isReel: row.is_reel,
    isVideo: row.is_video,
    title: row.title ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    cursor: row.created_at,
    timestamp: new Date(row.created_at).getTime(),
    likes: row.post_likes.map(l => l.user_id),
    bookmarks: row.bookmarks.map(b => b.user_id),
    comments: row.comments
      .filter(c => !c.parent_id)
      .map(c => ({
        id: c.id,
        userId: c.user_id,
        text: c.text,
        timestamp: new Date(c.created_at).getTime(),
        likes: c.comment_likes.map(l => l.user_id),
        replies: repliesByParent.get(c.id) ?? [],
      })),
  };
}

interface FetchPostsOptions {
  before?: string;           // only posts older than this created_at (for "load more")
  limit?: number;
  ids?: string[];
  userId?: string;
  kind?: 'reels' | 'videos'; // reels = every short video, videos = long videos with a title
  search?: string;
}

// Posts are loaded a page at a time, newest first.
async function fetchPosts(opts: FetchPostsOptions = {}): Promise<Post[]> {
  // Filters first, then ordering and the page size.
  let query = supabase.from('posts').select(POST_SELECT);
  if (opts.before) query = query.lt('created_at', opts.before);
  if (opts.ids) query = query.in('id', opts.ids);
  if (opts.userId) query = query.eq('user_id', opts.userId);
  if (opts.kind === 'videos') query = query.eq('is_video', true);
  if (opts.kind === 'reels') query = query.eq('media_type', 'video').eq('is_video', false);
  if (opts.search) {
    const term = opts.search.replace(/[%_,()*\\]/g, ' ').trim();
    if (term) query = query.or(`title.ilike.%${term}%,text.ilike.%${term}%`);
  }
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'comments', ascending: true })
    .limit(opts.limit ?? 12);
  if (error) throw error;
  return ((data ?? []) as unknown as PostRow[]).map(rowToPost);
}

function mergePosts(prev: Post[], incoming: Post[]): Post[] {
  const byId = new Map(prev.map(p => [p.id, p] as const));
  for (const p of incoming) byId.set(p.id, p);
  return [...byId.values()].sort((a, b) => b.timestamp - a.timestamp);
}

const FEED_PAGE = 12;

const CHAT_MEDIA_BUCKET = 'chat-media';
const SIGNED_URL_SECONDS = 60 * 60 * 12;

const CHAT_EXT: Record<string, string> = {
  ...MEDIA_EXT,
  'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3',
};

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  media_path: string | null;
  media_type: 'image' | 'video' | 'voice' | 'file' | null;
  media_duration: number | null;
  media_name: string | null;
  media_size: number | null;
  reply_to_id: string | null;
  shared_post_id?: string | null;
  shared_comment_id?: string | null;
  message_reactions?: { user_id: string; emoji: string }[];
  read_at: string | null;
  delivered_at?: string | null;
  edited_at?: string | null;
  created_at: string;
}

// Chat media is private: files are shown through short-lived signed URLs.
async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(paths)];
  if (unique.length === 0) return out;
  const { data, error } = await supabase.storage.from(CHAT_MEDIA_BUCKET).createSignedUrls(unique, SIGNED_URL_SECONDS);
  if (error) {
    console.error(error);
    return out;
  }
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) out.set(item.path, item.signedUrl);
  }
  return out;
}

function rowToMessage(r: MessageRow, urls: Map<string, string>): Message {
  const url = r.media_path ? urls.get(r.media_path) : undefined;
  return {
    id: r.id,
    senderId: r.sender_id,
    text: r.text,
    timestamp: new Date(r.created_at).getTime(),
    read: r.read_at !== null,
    delivered: r.read_at !== null || (r.delivered_at ?? null) !== null,
    replyToId: r.reply_to_id ?? undefined,
    sharedPostId: r.shared_post_id ?? undefined,
    sharedCommentId: r.shared_comment_id ?? undefined,
    editedAt: r.edited_at ? new Date(r.edited_at).getTime() : undefined,
    reactions: (r.message_reactions ?? []).map(x => ({ userId: x.user_id, emoji: x.emoji })),
    media: r.media_type && url
      ? { type: r.media_type, url, duration: r.media_duration ?? undefined, name: r.media_name ?? undefined, size: r.media_size ?? undefined, path: r.media_path ?? undefined }
      : undefined,
  };
}

// The recipient's app has the message: stamp it so the sender sees the second tick.
function markDelivered(me: string) {
  void supabase.from('messages').update({ delivered_at: new Date().toISOString() }).neq('sender_id', me).is('delivered_at', null).then(({ error }) => {
    if (error) console.error(error);
  });
}

async function loadConversations(me: string): Promise<Conversation[]> {
  const [convs, msgs, bgs] = await Promise.all([
    supabase.from('conversations').select('id, user_a, user_b, last_activity'),
    supabase
      .from('messages')
      .select('id, conversation_id, sender_id, text, media_path, media_type, media_duration, media_name, media_size, reply_to_id, shared_post_id, shared_comment_id, read_at, delivered_at, edited_at, created_at, message_reactions(user_id, emoji)')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('chat_backgrounds').select('conversation_id, type, value').eq('user_id', me),
  ]);
  if (convs.error) throw convs.error;
  if (msgs.error) throw msgs.error;
  if (bgs.error) throw bgs.error;

  const rows = ((msgs.data ?? []) as unknown as MessageRow[]).slice().reverse();
  const bgRows = (bgs.data ?? []) as { conversation_id: string; type: ChatBackground['type']; value: string }[];
  const imagePath = (value: string) => value.replace(/^storage:/, '');
  const urls = await signPaths([
    ...rows.flatMap(r => (r.media_path ? [r.media_path] : [])),
    ...bgRows.filter(b => b.type === 'image').map(b => imagePath(b.value)),
  ]);

  const backgrounds = new Map<string, ChatBackground>();
  for (const b of bgRows) {
    const value = b.type === 'image' ? urls.get(imagePath(b.value)) : b.value;
    if (value) backgrounds.set(b.conversation_id, { type: b.type, value });
  }
  const byConversation = new Map<string, Message[]>();
  for (const r of rows) {
    byConversation.set(r.conversation_id, [...(byConversation.get(r.conversation_id) ?? []), rowToMessage(r, urls)]);
  }
  markDelivered(me);
  return ((convs.data ?? []) as { id: string; user_a: string; user_b: string; last_activity: string }[]).map(c => ({
    id: c.id,
    participants: [c.user_a, c.user_b],
    messages: byConversation.get(c.id) ?? [],
    lastActivity: new Date(c.last_activity).getTime(),
    background: backgrounds.get(c.id),
  }));
}

// Finds the conversation between two people, creating it on the first message.
async function getOrCreateConversation(me: string, other: string): Promise<string> {
  const [a, b] = me < other ? [me, other] : [other, me];
  const find = () => supabase.from('conversations').select('id').eq('user_a', a).eq('user_b', b).maybeSingle();
  const existing = await find();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.id as string;
  const id = crypto.randomUUID();
  const { error } = await supabase.from('conversations').insert({ id, user_a: a, user_b: b });
  if (error) {
    const retry = await find();
    if (retry.data) return retry.data.id as string;
    throw error;
  }
  return id;
}

// Supabase Auth needs an email, so a username is mapped to an internal address
// (same mapping as supabase/functions/signup/index.ts). No email is ever sent to it.
const AUTH_EMAIL_DOMAIN = 'gmail.com';

async function usernameToEmail(username: string): Promise<string> {
  const normalized = username.normalize('NFC').trim().replace(/^@/, '').toLowerCase();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  const hex = Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24);
  return `kan.${hex}@${AUTH_EMAIL_DOMAIN}`;
}

function signupErrorMessage(code: string): string {
  switch (code) {
    case 'username_taken': return 'اسم المستخدم مستخدم بالفعل';
    case 'invalid_username': return 'اسم المستخدم من 3 إلى 30 حرفاً (حروف وأرقام و _ و . فقط)';
    case 'invalid_display_name': return 'الاسم المعروض غير صالح';
    case 'weak_password': return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    case 'too_many': return 'محاولات كثيرة، حاول لاحقاً';
    default: return 'تعذّر إنشاء الحساب، حاول مرة أخرى';
  }
}

// ============ Sound ============
let audioCtx: AudioContext | null = null;

function soundEnabled(): boolean {
  try { return localStorage.getItem('kan_sound') !== 'off'; } catch { return true; }
}
function setSoundEnabled(on: boolean) {
  try { localStorage.setItem('kan_sound', on ? 'on' : 'off'); } catch { /* ignore */ }
}
// The pop-up banner shown while you are using the app (separate from the phone's push notifications).
function toastsEnabled(): boolean {
  try { return localStorage.getItem('kan_toasts') !== 'off'; } catch { return true; }
}
function setToastsEnabled(on: boolean) {
  try { localStorage.setItem('kan_toasts', on ? 'on' : 'off'); } catch { /* ignore */ }
}

// Browsers only allow audio after a tap or key press, so the audio context is created on the first one.
function unlockAudio() {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume();
  } catch { /* audio not supported */ }
}

function playSound(kind: 'receive' | 'send') {
  if (!soundEnabled() || !audioCtx || audioCtx.state !== 'running') return;
  const ctx = audioCtx;
  const notes: [number, number, number][] = kind === 'receive'
    ? [[880, 0, 0.12], [1175, 0.12, 0.22]]
    : [[620, 0, 0.09]];
  const now = ctx.currentTime;
  for (const [freq, start, duration] of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(kind === 'receive' ? 0.3 : 0.15, now + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + duration + 0.05);
  }
}

// ============ Push notifications (work when the app is closed) ============
function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function getServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  const base = import.meta.env.BASE_URL as string;
  const existing = await navigator.serviceWorker.getRegistration(base);
  if (existing) return existing;
  return await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
}

// Attaches this browser's push subscription to the signed-in user.
async function savePushSubscription(reg: ServiceWorkerRegistration): Promise<boolean> {
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { data, error } = await supabase.functions.invoke('push', { method: 'GET' });
    const publicKey = (data as { publicKey?: string } | null)?.publicKey;
    if (error || !publicKey) return false;
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey });
  }
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
  const { error } = await supabase.rpc('register_push_subscription', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
  });
  return !error;
}

async function enablePush(): Promise<'ok' | 'denied' | 'unsupported' | 'error'> {
  if (!pushSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';
    const reg = await getServiceWorker();
    if (!reg) return 'unsupported';
    await navigator.serviceWorker.ready;
    return (await savePushSubscription(reg)) ? 'ok' : 'error';
  } catch (e) {
    console.error(e);
    return 'error';
  }
}

// Turn notifications off completely for this browser.
async function disablePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL as string);
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      await sub.unsubscribe();
    }
  } catch (e) {
    console.error(e);
  }
}

// On sign-out: stop sending this person's notifications to this browser (it re-attaches on next sign-in).
async function detachPush(): Promise<void> {
  try {
    if (!pushSupported()) return;
    const reg = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL as string);
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  } catch (e) {
    console.error(e);
  }
}

const LOGO_URL = `${import.meta.env.BASE_URL as string}icon-192.png`;

// ============ Video player (with a fallback when the device cannot play the file) ============
function fmtClock(t: number): string {
  if (!isFinite(t) || t < 0) t = 0;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = Math.floor(t % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

const PLAYER_SPEEDS = [1, 1.25, 1.5, 2, 0.5];

// KAN video player: big play button, double-tap to skip 10s, scrub bar with buffering, speed, volume, fullscreen.
function VideoPlayer({ src, poster, className = '', autoPlay = false }: {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const tapTimer = useRef<number | undefined>(undefined);
  const lastTap = useRef(0);
  const flashTimer = useRef<number | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [speedMenu, setSpeedMenu] = useState(false);
  const [showUi, setShowUi] = useState(true);
  const [scrubbing, setScrubbing] = useState(false);
  const [fs, setFs] = useState(false);
  const [flash, setFlash] = useState<{ side: 'back' | 'fwd'; n: number } | null>(null);
  const [boost, setBoost] = useState(false);
  const holdTimer = useRef<number | undefined>(undefined);
  const heldRef = useRef(false);

  const poke = () => {
    setShowUi(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowUi(false), 2800);
  };
  useEffect(() => {
    if (!playing || scrubbing || speedMenu) { window.clearTimeout(hideTimer.current); setShowUi(true); return; }
    poke();
    return () => window.clearTimeout(hideTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, scrubbing, speedMenu]);
  useEffect(() => () => { window.clearTimeout(tapTimer.current); window.clearTimeout(flashTimer.current); window.clearTimeout(holdTimer.current); }, []);
  // Scrolling the video out of view stops it (feed, profile, lists).
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.35) {
        if (document.fullscreenElement !== wrap) videoRef.current?.pause();
      }
    }, { threshold: [0, 0.35, 1] });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const onFs = () => setFs(document.fullscreenElement === wrapRef.current);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  if (failed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 bg-gray-900 border border-gray-800 rounded-xl p-6 text-center ${className}`}>
        <Film size={32} className="text-gray-500" />
        <p className="text-sm text-gray-300">لا يمكن تشغيل هذا الفيديو على هذا الجهاز. قد يكون بصيغة لا يدعمها المتصفح (مثل تسجيلات الآيفون HEVC).</p>
        <button onClick={() => { void downloadFile(src, 'video.mp4'); }} className="px-4 py-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-sm flex items-center gap-2">
          <Download size={14} /> تحميل الفيديو
        </button>
      </div>
    );
  }

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined); else v.pause();
  };
  const skip = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min((v.duration || 0) - 0.05, v.currentTime + delta));
    setFlash(f => ({ side: delta < 0 ? 'back' : 'fwd', n: (f?.n ?? 0) + 1 }));
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 650);
  };
  // One tap: show the controls / pause. Double tap on a side: skip 10 seconds.
  const startHold = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused) { heldRef.current = true; v.playbackRate = 2; setBoost(true); }
    }, 350);
  };
  const endHold = () => {
    window.clearTimeout(holdTimer.current);
    if (videoRef.current && heldRef.current) videoRef.current.playbackRate = speed;
    setBoost(false);
    if (heldRef.current) window.setTimeout(() => { heldRef.current = false; }, 80); // swallow the click that follows the release
  };
  const onSurfaceTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (heldRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const now = Date.now();
    if (now - lastTap.current < 280 && (ratio < 0.35 || ratio > 0.65)) {
      window.clearTimeout(tapTimer.current);
      lastTap.current = 0;
      skip(ratio < 0.35 ? -10 : 10);
      return;
    }
    lastTap.current = now;
    window.clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(() => { setSpeedMenu(false); toggle(); poke(); }, 280);
  };
  const seekFromPointer = (clientX: number) => {
    const bar = barRef.current;
    const v = videoRef.current;
    if (!bar || !v || !v.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    v.currentTime = ratio * v.duration;
    setCur(v.currentTime);
  };
  const toggleFullscreen = () => {
    const wrap = wrapRef.current;
    const v = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!wrap) return;
    if (document.fullscreenElement) { void document.exitFullscreen(); return; }
    if (wrap.requestFullscreen) void wrap.requestFullscreen().catch(() => undefined);
    else v?.webkitEnterFullscreen?.();
  };
  const changeSpeed = (r: number) => {
    setSpeed(r);
    if (videoRef.current) videoRef.current.playbackRate = r;
    setSpeedMenu(false);
  };

  const pct = dur > 0 ? (cur / dur) * 100 : 0;
  const bufPct = dur > 0 ? (buffered / dur) * 100 : 0;
  const wide = className.includes('w-auto');

  return (
    <div
      ref={wrapRef}
      dir="ltr"
      className={`relative bg-black overflow-hidden select-none ${fs ? '' : 'rounded-xl'} ${className}`}
      style={wide ? { width: 'fit-content', maxWidth: '100%' } : undefined}
      onMouseMove={() => playing && poke()}
    >
      <video
        ref={videoRef}
        src={poster ? src : `${src}#t=0.1`}
        poster={poster}
        playsInline
        autoPlay={autoPlay}
        muted={muted}
        preload="metadata"
        className="block w-full h-full max-h-[inherit] object-contain"
        onLoadedMetadata={e => { setDur(e.currentTarget.duration || 0); if (autoPlay) void e.currentTarget.play().catch(() => undefined); }}
        onDurationChange={e => setDur(e.currentTarget.duration || 0)}
        onTimeUpdate={e => { if (!scrubbing) setCur(e.currentTarget.currentTime); }}
        onProgress={e => { const b = e.currentTarget.buffered; if (b.length) setBuffered(b.end(b.length - 1)); }}
        onPlay={() => { setPlaying(true); setStarted(true); }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onError={() => setFailed(true)}
      />

      {/* Tap surface */}
      <div
        className="absolute inset-0 z-10 [-webkit-touch-callout:none]"
        onClick={onSurfaceTap}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        onContextMenu={e => e.preventDefault()}
      />

      {/* Skip: plain white symbol */}
      {flash && (
        <div key={flash.n} className={`absolute top-0 bottom-0 z-20 w-1/3 flex items-center justify-center pointer-events-none bg-white/10 ${flash.side === 'back' ? 'left-0 rounded-r-[100%]' : 'right-0 rounded-l-[100%]'}`}>
          <div className="flex flex-col items-center text-white text-xs font-semibold">
            {flash.side === 'back' ? <ChevronsLeft size={30} /> : <ChevronsRight size={30} />}
            10 ث
          </div>
        </div>
      )}

      {/* Press and hold: 2x */}
      {boost && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-black/60 backdrop-blur text-white text-xs font-semibold flex items-center gap-1 pointer-events-none">
          2x <ChevronsRight size={14} />
        </div>
      )}

      {/* Big centre button */}
      {(!playing || waiting) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-md ${started && !waiting ? 'bg-black/50' : 'bg-gradient-to-br from-violet-600/90 to-cyan-500/90 shadow-lg shadow-violet-500/30'}`}>
            {waiting
              ? <RefreshCw size={26} className="text-white animate-spin" />
              : <Play size={28} className="text-white translate-x-0.5" fill="white" />}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className={`absolute inset-x-0 bottom-0 z-30 transition-opacity duration-200 ${showUi || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-8 px-3 pb-2">
          <div
            ref={barRef}
            className="relative h-5 flex items-center cursor-pointer touch-none group"
            onPointerDown={e => { e.stopPropagation(); (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId); setScrubbing(true); seekFromPointer(e.clientX); }}
            onPointerMove={e => { if (scrubbing) seekFromPointer(e.clientX); }}
            onPointerUp={e => { setScrubbing(false); (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId); }}
            onClick={e => e.stopPropagation()}
          >
            <div className="relative w-full h-1 group-hover:h-1.5 rounded-full bg-white/25 transition-all">
              <div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${bufPct}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${pct}%` }} />
              <div className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white shadow ${scrubbing ? 'w-4 h-4' : 'w-3 h-3'} transition-all`} style={{ left: `${pct}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-1 text-white mt-0.5">
            <button onClick={e => { e.stopPropagation(); toggle(); }} className="p-1.5 rounded-full hover:bg-white/10" aria-label={playing ? 'إيقاف' : 'تشغيل'}>
              {playing ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
            </button>
            <button onClick={e => { e.stopPropagation(); setMuted(m => !m); }} className="p-1.5 rounded-full hover:bg-white/10" aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}>
              {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
            </button>
            <span className="text-[11px] tabular-nums text-white/80 mx-1">{fmtClock(cur)} / {fmtClock(dur)}</span>
            <div className="ml-auto flex items-center gap-1 relative">
              <button onClick={e => { e.stopPropagation(); changeSpeed(PLAYER_SPEEDS[(PLAYER_SPEEDS.indexOf(speed) + 1) % PLAYER_SPEEDS.length]); }} className="px-2 py-1 rounded-full hover:bg-white/10 text-xs font-semibold tabular-nums" aria-label="السرعة">
                {speed}x
              </button>
              <button onClick={e => { e.stopPropagation(); toggleFullscreen(); }} className="p-1.5 rounded-full hover:bg-white/10" aria-label="ملء الشاشة">
                {fs ? <Minimize size={19} /> : <Maximize size={19} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Full-screen image viewer ============
// ============ Uploads with a live percentage ============
async function uploadWithProgress(
  bucket: string, path: string, file: Blob, contentType: string, cacheControl: string,
  onProgress?: (pct: number) => void,
): Promise<{ error: Error | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${base}/storage/v1/object/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`);
    xhr.setRequestHeader('Authorization', `Bearer ${session?.access_token ?? anon}`);
    xhr.setRequestHeader('apikey', anon);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('Cache-Control', `max-age=${cacheControl}`);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress?.(Math.min(99, Math.round((e.loaded / e.total) * 100))); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { onProgress?.(100); resolve({ error: null }); }
      else resolve({ error: new Error(`upload failed ${xhr.status}: ${xhr.responseText.slice(0, 160)}`) });
    };
    xhr.onerror = () => resolve({ error: new Error('network error') });
    xhr.onabort = () => resolve({ error: new Error('upload aborted') });
    xhr.send(file);
  });
}

interface UploadState { done: number; total: number; pct: number }

function UploadBar({ upload }: { upload: UploadState }) {
  const overall = Math.min(100, Math.round(((upload.done + upload.pct / 100) / Math.max(1, upload.total)) * 100));
  return (
    <div className="mb-2 px-1" role="progressbar" aria-valuenow={overall} aria-valuemin={0} aria-valuemax={100}>
      <div className="flex items-center justify-between text-[11px] text-gray-300 mb-1">
        <span>جارٍ الإرسال{upload.total > 1 ? ` ${Math.min(upload.done + 1, upload.total)}/${upload.total}` : ''}</span>
        <span className="tabular-nums font-bold text-cyan-300">{overall}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width] duration-150" style={{ width: `${overall}%` }} />
      </div>
    </div>
  );
}

function QueueChip({ count, onClear }: { count: number; onClear: () => void }) {
  return (
    <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-xl bg-gray-800 text-xs text-gray-200">
      <ImageIcon size={14} className="text-cyan-300 shrink-0" />
      <span className="flex-1">+{count} ملفات أخرى جاهزة للإرسال</span>
      <button onClick={onClear} aria-label="إلغاء الملفات" className="p-1 text-gray-400 hover:text-white"><X size={14} /></button>
    </div>
  );
}

function takeFiles(e: React.ChangeEvent<HTMLInputElement>, hasPreview: boolean, onError: (msg: string) => void): { first: File | null; rest: File[] } {
  const files = Array.from(e.target.files ?? []) as File[];
  e.target.value = '';
  const ok = files.filter(f => f.size <= MAX_FILE_MB * 1024 * 1024);
  if (ok.length < files.length) onError(`تم تجاهل ${files.length - ok.length} ملف لتجاوزه ${MAX_FILE_MB} ميجابايت`);
  else onError('');
  if (ok.length === 0) return { first: null, rest: [] };
  return hasPreview ? { first: null, rest: ok } : { first: ok[0], rest: ok.slice(1) };
}

// ============ Themes ============
type ThemeKey = 'kan' | 'light' | 'dark';
const THEME_COLORS: Record<ThemeKey, string> = { kan: '#0b0b1a', light: '#f3f3f7', dark: '#000000' };
function getTheme(): ThemeKey {
  try {
    const t = localStorage.getItem('kan-theme');
    if (t === 'light' || t === 'dark') return t;
  } catch { /* storage blocked */ }
  return 'kan';
}
function applyTheme(t: ThemeKey) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[t]);
}
function setTheme(t: ThemeKey) {
  try { localStorage.setItem('kan-theme', t); } catch { /* storage blocked */ }
  applyTheme(t);
}
applyTheme(getTheme());

// Any screen can open a post (optionally scrolled to one comment); the App draws it.
// Filled by App: last chat activity per person (used to list recent chats first when sharing).
let recentChatActivity: () => Map<string, number> = () => new Map();
let openPostHandler: (postId: string, commentId?: string) => void = () => undefined;
function openPost(postId: string, commentId?: string) { openPostHandler(postId, commentId); }

// Any screen can open a profile; the App draws it on top of the screen stack.
let openProfileHandler: (userId: string) => void = () => undefined;
function openUserProfile(userId: string) { openProfileHandler(userId); }

// Links that open inside the app (GitHub Pages friendly: the part after # is never sent to the server).
function appBaseUrl() { return `${window.location.origin}${window.location.pathname}`; }
function postLink(postId: string, commentId?: string) { return `${appBaseUrl()}#/post/${postId}${commentId ? `/${commentId}` : ''}`; }

// Puts the page back to where it was, retrying for a moment while the screen below finishes drawing.
function restoreScroll(y: number) {
  let cancelled = false;
  const stop = () => { cancelled = true; };
  window.addEventListener('touchstart', stop, { once: true, passive: true });
  window.addEventListener('wheel', stop, { once: true, passive: true });
  const t0 = performance.now();
  const step = () => {
    if (cancelled) return;
    window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    if (Math.abs(window.scrollY - y) > 2 && performance.now() - t0 < 900) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Calls onSeen with the ids of messages (elements marked data-unread="1", ids in data-mids) once they are really on screen.
function useSeenObserver(root: React.RefObject<HTMLElement | null>, enabled: boolean, depKey: string, onSeen: (ids: string[]) => void) {
  const cb = useRef(onSeen);
  cb.current = onSeen;
  useEffect(() => {
    const el = root.current;
    if (!el || !enabled) return;
    const pending = new Set<string>();
    const done = new Set<string>();
    let timer: number | undefined;
    const flush = () => {
      if (pending.size === 0) return;
      const ids = [...pending];
      pending.clear();
      cb.current(ids);
    };
    const io = new IntersectionObserver(entries => {
      let any = false;
      for (const en of entries) {
        const h = en.rootBounds?.height ?? 0;
        if (!en.isIntersecting || !(en.intersectionRatio >= 0.6 || (h > 0 && en.intersectionRect.height >= h * 0.5))) continue;
        const target = en.target as HTMLElement;
        for (const id of (target.dataset.mids ?? '').split(',')) {
          if (id && !done.has(id)) { done.add(id); pending.add(id); any = true; }
        }
        io.unobserve(target);
      }
      if (any) { window.clearTimeout(timer); timer = window.setTimeout(flush, 350); }
    }, { root: el, threshold: [0.1, 0.3, 0.6, 1] });
    el.querySelectorAll<HTMLElement>('[data-unread="1"]').forEach(n => io.observe(n));
    return () => { io.disconnect(); window.clearTimeout(timer); flush(); };
  }, [enabled, depKey]); // eslint-disable-line react-hooks/exhaustive-deps
}

async function updateText(table: 'messages' | 'group_messages' | 'posts' | 'comments', id: string, text: string): Promise<boolean> {
  const { error } = await supabase.from(table).update({ text }).eq('id', id);
  if (error) { console.error(error); return false; }
  return true;
}

// One small sheet to edit text anywhere (post, comment, message). With initialTitle it also edits a headline.
function EditTextModal({ title, initial, initialTitle, maxLength, allowEmpty, onSave, onClose }: {
  title: string; initial: string; initialTitle?: string; maxLength: number; allowEmpty?: boolean;
  onSave: (text: string, headline: string) => Promise<boolean>; onClose: () => void;
}) {
  useBackLayer(true, onClose);
  const [value, setValue] = useState(initial);
  const [head, setHead] = useState(initialTitle ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = taRef.current;
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }, []);
  const save = async () => {
    if (busy) return;
    const v = value.trim();
    const h = head.trim();
    if (!v && !allowEmpty) { setErr('النص لا يمكن أن يكون فارغاً'); return; }
    if (v === initial.trim() && h === (initialTitle ?? '').trim()) { onClose(); return; }
    setBusy(true);
    setErr('');
    const ok = await onSave(v, h);
    setBusy(false);
    if (ok) onClose(); else setErr('تعذّر حفظ التعديل، حاول مرة أخرى');
  };
  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[150] flex items-center justify-center p-4" onClick={e => { e.stopPropagation(); onClose(); }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold kan-gradient-text">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400" aria-label="إغلاق"><X size={18} /></button>
        </div>
        {initialTitle !== undefined && (
          <input value={head} onChange={e => setHead(e.target.value.slice(0, 120))} placeholder="العنوان" className="w-full mb-2 px-3 py-2.5 bg-gray-800 rounded-xl text-[16px] text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-400" />
        )}
        <textarea
          ref={taRef}
          value={value}
          onChange={e => setValue(e.target.value.slice(0, maxLength))}
          rows={5}
          dir="auto"
          className="w-full px-3 py-2.5 bg-gray-800 rounded-xl text-[16px] text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none"
        />
        <div className="flex items-center justify-between mt-1 text-[11px] text-gray-500">
          <span>{err ? <span className="text-red-400">{err}</span> : ''}</span>
          <span>{value.length}/{maxLength}</span>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => void save()} disabled={busy} className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2">
            {busy ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />} حفظ
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-full bg-white/5 text-gray-300 text-sm">إلغاء</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ============ Back button: closes the top screen/sheet instead of leaving the app ============
// One history entry (the "sentinel") sits above the real page. Pressing Back consumes it, we close the top
// layer (or scroll Home to the top), then put the sentinel back. With nothing left to close, Back leaves the app.
// The sentinel is added after the first tap, because browsers skip history entries made without any user interaction.
interface BackLayer { id: number; prio: number; close: () => void }
const backStack: BackLayer[] = [];
let backSeq = 0;
let backListening = false;
let sentinelArmed = false;
let backFallback: () => boolean = () => false;
let lastExitPress = 0;

function setBackFallback(fn: () => boolean) { backFallback = fn; }

function armSentinel() {
  if (sentinelArmed && window.history.state?.kanSentinel) return;
  sentinelArmed = true;
  window.history.pushState({ kanSentinel: true }, '');
}

function ensureBackListener() {
  if (backListening) return;
  backListening = true;
  const arm = () => armSentinel();
  (['pointerup', 'click', 'keydown'] as const).forEach(ev => window.addEventListener(ev, arm, { capture: true, passive: true }));
  if ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive) armSentinel();
  window.addEventListener('pageshow', () => { sentinelArmed = false; });
  window.addEventListener('popstate', () => {
    if (!sentinelArmed) return;
    sentinelArmed = false; // the sentinel was just consumed by this Back press
    const top = backStack.pop();
    if (top) { top.close(); armSentinel(); return; }
    if (backFallback()) { armSentinel(); return; }
    // Nothing left to close: the first Back only warns, a second one within 2.2s really leaves.
    const now = Date.now();
    if (now - lastExitPress < 2200) { window.history.back(); return; }
    lastExitPress = now;
    armSentinel();
    window.dispatchEvent(new Event('kan-exit-hint'));
  });
}

// While `active`, this layer is on the back-button stack and onClose runs when Back is pressed.
// prio: higher closes first. Modals/viewers use the default (100); app screens use lower values so one Back
// always undoes the most recent thing in order: sheet -> profile/post screen -> chat -> tab -> home.
function useBackLayer(active: boolean, onClose: () => void, prio = 100) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    ensureBackListener();
    if (!active) return;
    const layer: BackLayer = { id: ++backSeq, prio, close: () => closeRef.current() };
    let at = backStack.length;
    while (at > 0 && backStack[at - 1].prio > prio) at--;
    backStack.splice(at, 0, layer);
    return () => {
      const i = backStack.indexOf(layer);
      if (i >= 0) backStack.splice(i, 1);
    };
  }, [active]);
}

interface GalleryItem { src: string; name?: string; type?: 'image' | 'video' }
// Full-screen viewer. With a `gallery` you can flip between photos/videos by swiping or with the arrows.
function ImageViewer({ src, name, gallery, onClose }: { src: string; name?: string; gallery?: GalleryItem[]; onClose: () => void }) {
  useBackLayer(true, onClose);
  const list: GalleryItem[] = gallery && gallery.length > 1 ? gallery : [{ src, name }];
  const [idx, setIdx] = useState(Math.max(0, list.findIndex(g => g.src === src)));
  const [zoomed, setZoomed] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const go = (d: number) => { setZoomed(false); setIdx(i => Math.min(list.length - 1, Math.max(0, i + d))); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(1);
      else if (e.key === 'ArrowRight') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [list.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = list[idx] ?? list[0];
  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between p-3" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="إغلاق"><X size={20} /></button>
        {list.length > 1 && <span className="text-white/80 text-sm tabular-nums">{idx + 1} / {list.length}</span>}
        <button
          onClick={() => { void downloadFile(cur.src, cur.name || (cur.type === 'video' ? 'video.mp4' : 'image.jpg')); }}
          className="px-4 py-2 rounded-full bg-white/10 text-white hover:bg-white/20 text-sm flex items-center gap-2"
        >
          <Download size={16} /> تحميل
        </button>
      </div>
      <div
        className={`relative flex-1 overflow-auto flex ${zoomed ? 'items-start justify-start' : 'items-center justify-center'}`}
        onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={e => {
          const t = touch.current; touch.current = null;
          if (!t || zoomed) return;
          const dx = e.changedTouches[0].clientX - t.x;
          const dy = e.changedTouches[0].clientY - t.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
        }}
      >
        {cur.type === 'video' ? (
          <video key={cur.src} src={cur.src} controls autoPlay playsInline onClick={e => e.stopPropagation()} className="max-w-full max-h-full" />
        ) : (
          <img
            key={cur.src}
            src={cur.src}
            alt=""
            draggable={false}
            onClick={e => { e.stopPropagation(); setZoomed(z => !z); }}
            className={zoomed ? 'max-w-none cursor-zoom-out m-auto' : 'max-w-full max-h-full object-contain cursor-zoom-in'}
          />
        )}
        {list.length > 1 && !zoomed && (
          <>
            {idx > 0 && <button onClick={e => { e.stopPropagation(); go(-1); }} aria-label="السابق" className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center active:scale-90"><ChevronRight size={22} /></button>}
            {idx < list.length - 1 && <button onClick={e => { e.stopPropagation(); go(1); }} aria-label="التالي" className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center active:scale-90"><ChevronLeft size={22} /></button>}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

// ============ KAN AI ============
type AIMode = 'summary' | 'reply' | 'analyze';
const AI_QUICK: { label: string; query: string; mode: AIMode }[] = [
  { label: '📝 لخّص الشات', query: 'لخّص المحادثة باختصار', mode: 'summary' },
  { label: '💡 اقترح رد', query: 'اقترح رد مناسب على آخر رسالة', mode: 'reply' },
  { label: '🔍 المطلوب مني؟', query: 'حلل المحادثة وقل لي ما المطلوب مني', mode: 'analyze' },
];
interface AISource { title: string; url: string }

function aiErrorMessage(code: string): string {
  switch (code) {
    case 'rate_limited': return 'استنى دقيقة وحاول تاني.';
    case 'daily_limit': return 'وصلت للحد اليومي لـ «اسأل KAN». جرّب بكرة.';
    case 'unauthorized': return 'سجّل الدخول من جديد وحاول تاني.';
    default: return 'اسأل KAN غير متاح الآن، حاول بعد شوية.';
  }
}

function KanAIModal({ messages, me, other, nameOf, onClose, onUseReply }: {
  messages: Message[];
  me: User;
  other: User;
  nameOf?: (id: string) => string;
  onClose: () => void;
  onUseReply: (text: string) => void;
}) {
  useBackLayer(true, onClose);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [sources, setSources] = useState<AISource[]>([]);
  // Earlier questions and answers of this session, so follow-ups ("and tomorrow?") make sense.
  const historyRef = useRef<{ q: string; a: string }[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ask = async (text: string, mode?: AIMode) => {
    const q = text.trim();
    if (!q || loading) return;
    setQuery(q);
    setLoading(true);
    setError('');
    setResponse('');
    setSources([]);
    setCopied(false);
    // The last 30 messages, oldest first. The server decides whether the question is about the chat.
    const context = messages.slice(-30)
      .map(m => ({ sender: nameOf ? nameOf(m.senderId) : m.senderId === me.id ? me.displayName : other.displayName, text: describeMessage(m) }))
      .filter(m => m.text);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('kan-ai', {
        body: {
          query: q,
          mode,
          context,
          history: historyRef.current.slice(-4),
          me: me.displayName,
          other: other.displayName,
        },
      });
      if (fnError) {
        let code = '';
        const res = (fnError as { context?: Response }).context;
        if (res && typeof res.json === 'function') {
          try { code = ((await res.json()) as { error?: string }).error ?? ''; } catch { /* ignore */ }
        }
        setError(aiErrorMessage(code));
      } else {
        const d = data as { response?: string; sources?: AISource[] } | null;
        const answer = (d?.response ?? '').trim() || '—';
        setResponse(answer);
        setSources(Array.isArray(d?.sources) ? d!.sources!.filter(x => /^https?:\/\//.test(x.url)).slice(0, 4) : []);
        historyRef.current = [...historyRef.current, { q, a: answer }].slice(-4);
      }
    } catch {
      setError(aiErrorMessage(''));
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[120] flex items-start justify-center pt-10 sm:pt-24 px-3">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85dvh] overflow-y-auto bg-gray-900 border border-white/10 rounded-2xl shadow-2xl shadow-violet-500/10">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="" className="w-10 h-10 rounded-full bg-white/10" />
            <h2 className="font-bold flex items-center gap-1.5"><Sparkles size={16} className="text-violet-300" /><span className="kan-gradient-text">اسأل KAN</span></h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full text-white" aria-label="إغلاق"><X size={20} /></button>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 bg-gray-800 rounded-full px-5 py-3 border border-gray-700 focus-within:border-violet-500">
            <Search size={18} className="text-gray-500 shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void ask(query)}
              placeholder="اسأل KAN أي سؤال أو اطلب منه يقرأ الشات..."
              className="flex-1 bg-transparent outline-none text-white placeholder-gray-500 min-w-0"
              autoFocus
            />
            {loading
              ? <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin shrink-0" />
              : <button onClick={() => void ask(query)} className="p-1.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white shrink-0" aria-label="إرسال"><Send size={14} /></button>}
          </div>
        </div>

        {error && <div className="px-4 pb-4"><div className="rounded-xl p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div></div>}

        {response && (
          <div className="px-4 pb-4">
            <div className="bg-gray-800/70 rounded-xl p-4 border border-white/10">
              <p className="text-gray-100 whitespace-pre-wrap leading-relaxed">{response}</p>
              {sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-1.5">
                  {sources.map(src => (
                    <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer"
                      className="max-w-full truncate px-2.5 py-1 rounded-full bg-gray-700/70 hover:bg-gray-600 text-[11px] text-cyan-300">
                      🔗 {src.title}
                    </a>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                <button
                  onClick={() => { void navigator.clipboard?.writeText(response); setCopied(true); }}
                  className="px-3 py-1.5 rounded-full bg-gray-700 hover:bg-gray-600 text-xs text-gray-100 flex items-center gap-1.5"
                >
                  <Copy size={13} /> {copied ? 'تم النسخ' : 'نسخ'}
                </button>
                <button
                  onClick={() => onUseReply(response)}
                  className="px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-xs text-white flex items-center gap-1.5"
                >
                  <Send size={13} /> استخدمه كرسالة
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 pb-4 flex gap-2 flex-wrap">
          {AI_QUICK.map(a => (
            <button
              key={a.label}
              onClick={() => void ask(a.query, a.mode)}
              disabled={loading}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-white/5 rounded-full text-sm text-gray-200 disabled:opacity-60"
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============ Emoji ============
const MAX_FILE_MB = 50;
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'];

const EMOJI_GROUPS: { icon: string; items: string[] }[] = [
  { icon: '😀', items: '😀 😃 😄 😁 😆 😅 😂 🤣 🥲 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫡 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 👽 🤖 🎃'.split(' ') },
  { icon: '👍', items: '👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤝 🙏 ✍️ 💪 👏 🙌 👐 🤲 🫶 🫰 🫵 💅 🙋 🙆 🙅 🤷 🤦 🙇'.split(' ') },
  { icon: '❤️', items: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 💯 💢 💥 💫 💦 💨 🔥 ✨ ⭐ 🌟 ⚡ 🎉 🎊 🎈 🎁 🏆 🥇 🏅 👑 💎'.split(' ') },
  { icon: '🐶', items: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🦆 🦅 🦉 🐺 🐴 🦄 🐝 🦋 🐌 🐢 🐍 🐙 🦀 🐠 🐬 🐳 🦈 🐘 🦒 🐪 🐑 🐐 🌵 🌴 🌳 🌹 🌸 🌼 🌻 🍀 🌍 🌙 ☀️ 🌈 ☁️ ❄️ 🌊'.split(' ') },
  { icon: '🍔', items: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🥕 🌽 🥔 🍞 🧀 🍗 🍖 🍔 🍟 🍕 🌭 🌮 🌯 🥙 🍳 🥗 🍝 🍜 🍲 🍣 🍤 🍩 🍪 🎂 🍰 🍫 🍬 🍭 🍯 ☕ 🍵 🥤 🍺 🍷'.split(' ') },
  { icon: '⚽', items: '⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥊 🎯 🎮 🎲 🎵 🎶 🎤 🎧 🎸 🎹 🥁 🎬 📷 📱 💻 ⌚ 💡 📚 ✏️ 📌 🔒 🔑 💰 💳 ✈️ 🚗 🚀 🏠 ⛺ 🕌 ⛰️ 🏖️'.split(' ') },
];

// ============ Share: send the post itself (media + text) to a chat or to other apps ============
async function postToFile(post: Post): Promise<File | null> {
  if (!post.media) return null;
  try {
    const res = await fetch(post.media.url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const type = blob.type || (post.media.type === 'image' ? 'image/jpeg' : post.media.type === 'video' ? 'video/mp4' : 'application/octet-stream');
    const name = post.media.name || `kan-${post.id.slice(0, 6)}.${CHAT_EXT[type] ?? 'bin'}`;
    return new File([blob], name, { type });
  } catch {
    return null;
  }
}

function postShareText(post: Post, author: User): string {
  return [`${author.displayName} (@${author.username}) على KAN`, post.title, post.text].filter(Boolean).join('\n').trim();
}

function ShareSheet({ post, author, users, currentUser, comment, onClose }: {
  post: Post; author: User; users: User[]; currentUser: User; comment?: { id: string; text: string; authorName: string }; onClose: () => void;
}) {
  useBackLayer(true, onClose);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const filePromise = useRef<Promise<File | null> | null>(null);
  const getFile = () => {
    if (!filePromise.current) filePromise.current = postToFile(post);
    return filePromise.current;
  };
  // Start fetching the media now, so the native share sheet can open instantly on tap.
  useEffect(() => { if (!comment) void getFile(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const link = postLink(post.id, comment?.id);
  const text = (comment ? `${comment.authorName}: ${comment.text}\n— ${author.displayName} (@${author.username}) على KAN` : postShareText(post, author)) + `\n${link}`;
  const recent = recentChatActivity();
  const people = users
    .filter(u => u.id !== currentUser.id && (u.displayName + ' ' + u.username).toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (recent.get(b.id) ?? 0) - (recent.get(a.id) ?? 0) || Number(currentUser.following.includes(b.id)) - Number(currentUser.following.includes(a.id)))
    .slice(0, 40);

  const flash = (msg: string) => { setNote(msg); window.setTimeout(() => setNote(''), 1800); };
  const nativeShare = async () => {
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: `${author.displayName} على KAN`, text: text.replace(`\n${link}`, '').slice(0, 300), url: link });
        onClose();
      } else {
        await navigator.clipboard.writeText(link);
        flash('تم نسخ الرابط');
      }
    } catch { /* the person closed the share sheet */ }
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(link); flash('تم نسخ الرابط'); } catch { flash('تعذّر النسخ'); }
  };
  const openExternal = (url: string) => { window.open(url, '_blank', 'noopener'); };
  // Puts the post on your own story for 24 hours (the story keeps a link back to the post).
  const shareToStory = async () => {
    if (busy) return;
    setBusy('story');
    try {
      const m = post.media;
      const cover = post.coverUrl;
      const url = m && m.type === 'image' ? m.url : m && m.type === 'video' ? m.url : cover ?? '';
      const type: 'image' | 'video' = m && m.type === 'video' ? 'video' : 'image';
      const hasVisual = Boolean(url) && (m?.type === 'image' || m?.type === 'video' || cover);
      const captionSource = comment ? comment.text : [post.title, post.text].filter(Boolean).join('\n');
      const { error } = await supabase.from('stories').insert({
        user_id: currentUser.id,
        media_url: hasVisual ? url : '',
        media_type: hasVisual ? type : 'image',
        caption: (captionSource || `${author.displayName} (@${author.username})`).slice(0, 300),
        shared_post_id: post.id,
      });
      if (error) throw error;
      notifyStoriesChanged();
      flash('تمت المشاركة في قصتك ✓');
      window.setTimeout(onClose, 900);
    } catch (e) {
      console.error(e);
      flash('تعذّرت المشاركة في القصة');
    }
    setBusy(null);
  };
  const actions: { key: string; label: string; Icon: typeof Copy; cls: string; run: () => void }[] = [
    { key: 'story', label: 'قصتك', Icon: Plus, cls: 'from-violet-600 via-fuchsia-500 to-cyan-400', run: () => void shareToStory() },
    { key: 'link', label: 'نسخ الرابط', Icon: Copy, cls: 'from-violet-600 to-fuchsia-500', run: () => void copyLink() },
    { key: 'wa', label: 'واتساب', Icon: MessageCircle, cls: 'from-emerald-500 to-green-600', run: () => openExternal(`https://wa.me/?text=${encodeURIComponent(text)}`) },
    { key: 'tg', label: 'تيليجرام', Icon: Send, cls: 'from-sky-500 to-cyan-500', run: () => openExternal(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text.replace(`\n${link}`, '').slice(0, 300))}`) },
    { key: 'more', label: 'المزيد', Icon: Share2, cls: 'from-gray-600 to-gray-500', run: () => void nativeShare() },
    ...(post.media && !comment ? [{ key: 'save', label: 'حفظ', Icon: Download, cls: 'from-gray-600 to-gray-500', run: () => { void downloadFile(post.media!.url, post.media!.name || (post.media!.type === 'video' ? 'video.mp4' : 'image.jpg')); } }] : []),
  ];

  const sendTo = async (u: User) => {
    if (busy || sentTo.includes(u.id)) return;
    setBusy(u.id);
    setNote('');
    let path: string | null = null;
    try {
      const convId = await getOrCreateConversation(currentUser.id, u.id);
      const f = comment ? null : await getFile();
      const head = comment ? `↪️ تعليق من ${comment.authorName}` : author.id === currentUser.id ? '↪️ منشور مني' : `↪️ منشور من ${author.displayName}`;
      const body = (comment ? [head, comment.text] : [head, post.title, post.text]).filter(Boolean).join('\n').slice(0, 1000);
      if (f && post.media) {
        path = `${convId}/${crypto.randomUUID()}.${CHAT_EXT[f.type] ?? safeExt(f.name)}`;
        const { error: upErr } = await supabase.storage.from(CHAT_MEDIA_BUCKET).upload(path, f, { contentType: f.type || 'application/octet-stream', cacheControl: '3600' });
        if (upErr) throw upErr;
      }
      const { error: insErr } = await supabase.from('messages').insert({
        id: crypto.randomUUID(),
        conversation_id: convId,
        sender_id: currentUser.id,
        text: body,
        media_path: path,
        media_type: path ? post.media!.type : null,
        media_duration: null,
        media_name: path && f ? f.name.slice(0, 200) : null,
        media_size: path && f ? f.size : null,
        reply_to_id: null,
        shared_post_id: post.id,
        shared_comment_id: comment?.id ?? null,
      });
      if (insErr) throw insErr;
      setSentTo(prev => [...prev, u.id]);
      playSound('send');
    } catch (e) {
      console.error(e);
      if (path) void supabase.storage.from(CHAT_MEDIA_BUCKET).remove([path]);
      setNote('تعذّر الإرسال، حاول مرة أخرى');
    }
    setBusy(null);
  };

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center" onClick={e => { e.stopPropagation(); onClose(); }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="relative w-full sm:max-w-md max-h-[85dvh] flex flex-col bg-gray-900 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-violet-900/30 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 w-10 rounded-full bg-white/20 mx-auto mt-2.5 sm:hidden" />
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h3 className="font-bold kan-gradient-text">مشاركة</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400" aria-label="إغلاق"><X size={18} /></button>
        </div>

        {/* what is being shared */}
        <div className="mx-4 mb-3 flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/10">
          {!comment && post.media?.type === 'image' && <img src={post.media.url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />}
          {!comment && post.media?.type === 'video' && (
            <div className="w-14 h-14 rounded-xl bg-black/60 flex items-center justify-center shrink-0 overflow-hidden relative">
              {post.coverUrl ? <img src={post.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" /> : null}
              <Play size={20} className="text-white relative" fill="white" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white font-medium truncate">{author.displayName}</div>
            <div className="text-xs text-gray-400 line-clamp-2" dir="auto">{comment ? comment.text : post.title || post.text || (post.media ? (post.media.type === 'image' ? 'صورة' : post.media.type === 'video' ? 'فيديو' : 'ملف') : '')}</div>
          </div>
        </div>

        <div className="flex gap-3.5 overflow-x-auto no-scrollbar px-5 pb-4">
          {actions.map(a => (
            <button key={a.key} onClick={a.run} className="flex flex-col items-center gap-1.5 shrink-0 w-[62px] active:scale-90 transition-transform">
              <span className={`w-14 h-14 rounded-full bg-gradient-to-br ${a.cls} flex items-center justify-center shadow-lg text-white`}><a.Icon size={22} /></span>
              <span className="text-[11px] text-gray-300 whitespace-nowrap">{a.label}</span>
            </button>
          ))}
        </div>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="أرسل في محادثة..." className="w-full pr-9 pl-3 py-2.5 bg-gray-800 rounded-full text-[16px] text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-400/50" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] min-h-[140px]">
          {people.length === 0 && <p className="text-center text-sm text-gray-500 py-6">لا يوجد أحد</p>}
          <div className="grid grid-cols-4 gap-x-2 gap-y-4 pt-2">
            {people.map(u => {
              const done = sentTo.includes(u.id);
              return (
                <button key={u.id} onClick={() => void sendTo(u)} disabled={busy !== null || done} className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform">
                  <span className="relative block">
                    <Avatar userId={u.id} src={u.avatar} name={u.displayName} size="lg" />
                    {done && <span className="absolute inset-0 rounded-full bg-cyan-500/75 flex items-center justify-center"><Check size={22} className="text-white" /></span>}
                    {busy === u.id && <span className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center"><RefreshCw size={18} className="text-white animate-spin" /></span>}
                  </span>
                  <span className="text-[11px] text-gray-300 truncate w-full text-center">{u.displayName}</span>
                </button>
              );
            })}
          </div>
        </div>
        {note && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-gray-800 border border-white/10 text-xs text-white shadow-lg">{note}</div>}
      </motion.div>
    </div>,
    document.body,
  );
}


type GroupMsgRow = {
  id: string; group_id: string; sender_id: string; text: string; is_system: boolean; created_at: string;
  reply_to_id?: string | null;
  media_path?: string | null; media_type?: 'image' | 'video' | 'voice' | 'file' | null;
  media_name?: string | null; media_size?: number | null; media_duration?: number | null;
  edited_at?: string | null;
  group_message_reads?: { user_id: string }[];
  group_message_reactions?: { user_id: string; emoji: string }[];
};

function groupRowToMessage(r: GroupMsgRow, urls: Map<string, string>): GroupMessage {
  const url = r.media_path ? urls.get(r.media_path) : undefined;
  return {
    id: r.id,
    senderId: r.sender_id,
    text: r.text,
    timestamp: new Date(r.created_at).getTime(),
    isSystem: r.is_system,
    editedAt: r.edited_at ? new Date(r.edited_at).getTime() : undefined,
    readBy: (r.group_message_reads ?? []).map(x => x.user_id),
    replyToId: r.reply_to_id ?? undefined,
    reactions: (r.group_message_reactions ?? []).map(x => ({ userId: x.user_id, emoji: x.emoji })),
    media: r.media_type && url
      ? { type: r.media_type, url, duration: r.media_duration ?? undefined, name: r.media_name ?? undefined, size: r.media_size ?? undefined, path: r.media_path ?? undefined }
      : undefined,
  };
}

function groupMsgPreview(m: GroupMessage): string {
  if (m.media) {
    const label = { image: '📷 صورة', video: '🎥 فيديو', voice: '🎤 رسالة صوتية', file: `📎 ${m.media.name || 'ملف'}` }[m.media.type];
    return m.text ? `${label} ${m.text}` : label;
  }
  return m.text;
}

async function loadGroups(): Promise<Group[]> {
  const [g, mem, msgs] = await Promise.all([
    supabase.from('chat_groups').select('id, name, avatar, created_by, last_activity'),
    supabase.from('chat_group_members').select('group_id, user_id, role'),
    supabase
      .from('group_messages')
      .select('id, group_id, sender_id, text, is_system, created_at, reply_to_id, media_path, media_type, media_name, media_size, media_duration, edited_at, group_message_reads(user_id), group_message_reactions(user_id, emoji)')
      .order('created_at', { ascending: false })
      .limit(600),
  ]);
  if (g.error) throw g.error;
  if (mem.error) throw mem.error;
  if (msgs.error) throw msgs.error;
  const rows = ((msgs.data ?? []) as unknown as GroupMsgRow[]).slice().reverse();
  const urls = await signPaths(rows.flatMap(r => (r.media_path ? [r.media_path] : [])));
  const byGroup = new Map<string, GroupMessage[]>();
  for (const r of rows) {
    const list = byGroup.get(r.group_id) ?? [];
    list.push(groupRowToMessage(r, urls));
    byGroup.set(r.group_id, list);
  }
  const members = (mem.data ?? []) as { group_id: string; user_id: string; role: 'admin' | 'member' }[];
  return ((g.data ?? []) as { id: string; name: string; avatar?: string | null; created_by: string; last_activity: string }[]).map(row => ({
    id: row.id,
    name: row.name,
    avatar: row.avatar ?? '',
    createdBy: row.created_by,
    lastActivity: new Date(row.last_activity).getTime(),
    members: members.filter(m => m.group_id === row.id).map(m => ({ userId: m.user_id, role: m.role })),
    messages: byGroup.get(row.id) ?? [],
  }));
}

const groupUnread = (g: Group, me: string) => g.messages.filter(m => !m.isSystem && m.senderId !== me && !m.readBy.includes(me)).length;

function GroupAvatar({ name, src = '', size = 'lg', zoom = false }: { name: string; src?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; zoom?: boolean }) {
  const [open, setOpen] = useState(false);
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-10 h-10 text-base', lg: 'w-12 h-12 text-lg', xl: 'w-20 h-20 text-3xl' };
  if (src) {
    const picture = (
      <div className={`${sizes[size]} rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-700 shadow-md shadow-violet-500/20`}>
        <img src={src} alt={name} className="w-full h-full object-cover" />
      </div>
    );
    if (!zoom) return picture;
    return (
      <>
        <button type="button" onClick={e => { e.stopPropagation(); setOpen(true); }} className="rounded-full flex-shrink-0 cursor-zoom-in active:scale-95 transition-transform" aria-label={`عرض صورة ${name}`}>{picture}</button>
        {open && <ImageViewer src={src} name={name} onClose={() => setOpen(false)} />}
      </>
    );
  }
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0 font-bold text-white shadow-md shadow-violet-500/20`}>
      {name.trim().charAt(0).toUpperCase() || <Users size={18} />}
    </div>
  );
}

// People picker used by "new group" and "add members".
function MemberPicker({ users, exclude, selected, onToggle, me }: {
  users: User[]; exclude: string[]; selected: string[]; onToggle: (id: string) => void; me: User;
}) {
  const [q, setQ] = useState('');
  const list = users
    .filter(u => u.id !== me.id && !exclude.includes(u.id) && (u.displayName + ' ' + u.username).toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(me.following.includes(b.id)) - Number(me.following.includes(a.id)))
    .slice(0, 60);
  return (
    <div>
      <div className="relative mb-2">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث عن شخص..." className="w-full pr-9 pl-3 py-2.5 bg-gray-800 rounded-full text-[16px] text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500" />
      </div>
      <div className="max-h-64 overflow-y-auto overscroll-contain -mx-1 px-1">
        {list.length === 0 && <p className="text-center text-sm text-gray-500 py-6">لا يوجد أحد</p>}
        {list.map(u => {
          const on = selected.includes(u.id);
          return (
            <button key={u.id} onClick={() => onToggle(u.id)} className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 text-right">
              <Avatar userId={u.id} src={u.avatar} name={u.displayName} size="md" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white truncate">{u.displayName}</div>
                <div className="text-xs text-gray-500 truncate">@{u.username}</div>
              </div>
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${on ? 'bg-gradient-to-br from-violet-600 to-cyan-500 border-transparent' : 'border-gray-600'}`}>
                {on && <Check size={14} className="text-white" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SheetShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useBackLayer(true, onClose);
  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center" onClick={onClose}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="relative w-full sm:max-w-md max-h-[88dvh] flex flex-col bg-gray-900 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-violet-900/30 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 w-10 rounded-full bg-white/20 mx-auto mt-2.5 sm:hidden" />
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h3 className="font-bold kan-gradient-text">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400" aria-label="إغلاق"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </motion.div>
    </div>,
    document.body,
  );
}

function CreateGroupSheet({ users, me, onClose, onCreated }: {
  users: User[]; me: User; onClose: () => void; onCreated: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError('');
    const { data, error: err } = await supabase.rpc('create_chat_group', { p_name: name.trim(), p_members: picked });
    setBusy(false);
    if (err || !data) { console.error(err); setError('تعذّر إنشاء المجموعة، حاول مرة أخرى'); return; }
    onCreated(data as string);
  };
  return (
    <SheetShell title="مجموعة جديدة" onClose={onClose}>
      <div className="flex items-center gap-3 mb-3">
        <GroupAvatar name={name || '؟'} size="lg" />
        <input value={name} maxLength={60} onChange={e => setName(e.target.value)} placeholder="اسم المجموعة" className="flex-1 min-w-0 px-4 py-2.5 bg-gray-800 rounded-xl text-[16px] text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500" />
      </div>
      <p className="text-xs text-gray-400 mb-2">اختر الأعضاء ({picked.length})</p>
      <MemberPicker users={users} exclude={[]} selected={picked} me={me} onToggle={id => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : p.length >= 49 ? p : [...p, id]))} />
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      <button onClick={() => void create()} disabled={!name.trim() || busy} className="w-full mt-4 py-3 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform">
        {busy ? 'جارٍ الإنشاء...' : 'إنشاء المجموعة'}
      </button>
    </SheetShell>
  );
}

function GroupInfoSheet({ group, users, me, reload, onClose, onLeft }: {
  group: Group; users: User[]; me: User; reload: () => Promise<void>; onClose: () => void; onLeft: () => void;
}) {
  const iAmAdmin = group.members.some(m => m.userId === me.id && m.role === 'admin');
  const admins = group.members.filter(m => m.role === 'admin').length;
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(group.name);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const avatarInput = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const pickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setNote('اختر صورة فقط'); return; }
    if (file.size > 8 * 1024 * 1024) { setNote('حجم الصورة يجب أن لا يتجاوز 8 ميجابايت'); return; }
    setAvatarBusy(true);
    setNote('');
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(file);
      });
      const small = await shrinkImage(dataUrl, 320);
      const { error } = await supabase.from('chat_groups').update({ avatar: small }).eq('id', group.id);
      if (error) throw error;
      await reload();
    } catch (err) {
      console.error(err);
      setNote('تعذّر تغيير الصورة');
    }
    setAvatarBusy(false);
  };
  const run = async (fn: () => PromiseLike<{ error: unknown }>, fail = 'تعذّر تنفيذ العملية') => {
    setBusy(true);
    setNote('');
    const { error } = await fn();
    if (error) { console.error(error); setNote(fail); }
    await reload();
    setBusy(false);
    return !error;
  };
  const addPicked = async () => {
    if (picked.length === 0) return;
    const ok = await run(() => supabase.from('chat_group_members').insert(picked.map(id => ({ group_id: group.id, user_id: id }))), 'تعذّرت الإضافة');
    if (ok) { setPicked([]); setAdding(false); }
  };
  const saveName = async () => {
    if (!name.trim() || name.trim() === group.name) { setRenaming(false); return; }
    const ok = await run(() => supabase.from('chat_groups').update({ name: name.trim().slice(0, 60) }).eq('id', group.id), 'تعذّر تغيير الاسم');
    if (ok) setRenaming(false);
  };
  const leave = async () => {
    if (iAmAdmin && admins === 1 && group.members.length > 1) { setNote('عيّن مشرفاً آخر قبل المغادرة'); return; }
    const ok = await run(() => supabase.from('chat_group_members').delete().eq('group_id', group.id).eq('user_id', me.id), 'تعذّرت المغادرة');
    if (ok) onLeft();
  };

  return (
    <SheetShell title="معلومات المجموعة" onClose={onClose}>
      <div className="flex flex-col items-center gap-2 mb-4">
        <div className="relative">
          <GroupAvatar name={group.name} src={group.avatar} size="xl" zoom />
          {iAmAdmin && (
            <>
              <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={e => void pickAvatar(e)} />
              <button onClick={() => avatarInput.current?.click()} disabled={avatarBusy} aria-label="تغيير صورة المجموعة" className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-white flex items-center justify-center ring-2 ring-gray-900 shadow-md active:scale-90 disabled:opacity-70">
                {avatarBusy ? <RefreshCw size={14} className="animate-spin" /> : <Camera size={15} />}
              </button>
            </>
          )}
        </div>
        {renaming ? (
          <div className="flex items-center gap-2 w-full">
            <input value={name} maxLength={60} onChange={e => setName(e.target.value)} className="flex-1 min-w-0 px-3 py-2 bg-gray-800 rounded-xl text-[16px] text-white focus:outline-none focus:ring-1 focus:ring-violet-500" />
            <button onClick={() => void saveName()} disabled={busy} className="px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm">حفظ</button>
          </div>
        ) : (
          <button onClick={() => iAmAdmin && setRenaming(true)} className="text-lg font-bold text-white">{group.name}</button>
        )}
        <p className="text-xs text-gray-400">{group.members.length} عضو</p>
      </div>

      {iAmAdmin && !adding && (
        <button onClick={() => setAdding(true)} className="w-full mb-3 py-2.5 rounded-full bg-gradient-to-r from-violet-600/25 to-cyan-500/20 border border-violet-400/30 text-white text-sm font-medium active:scale-[0.98]">
          + إضافة أعضاء
        </button>
      )}
      {adding && (
        <div className="mb-4 p-3 rounded-2xl bg-white/5 border border-white/10">
          <MemberPicker users={users} exclude={group.members.map(m => m.userId)} selected={picked} me={me} onToggle={id => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))} />
          <div className="flex gap-2 mt-3">
            <button onClick={() => void addPicked()} disabled={busy || picked.length === 0} className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-semibold disabled:opacity-50">إضافة ({picked.length})</button>
            <button onClick={() => { setAdding(false); setPicked([]); }} className="px-4 py-2.5 rounded-full bg-gray-800 text-gray-300 text-sm">إلغاء</button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {group.members.map(m => {
          const u = users.find(x => x.id === m.userId);
          if (!u) return null;
          return (
            <div key={m.userId} className="flex items-center gap-3 px-1 py-2">
              <Avatar userId={u.id} src={u.avatar} name={u.displayName} size="md" zoom />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white truncate">{u.displayName}{u.id === me.id ? ' (أنت)' : ''}</div>
                <div className="text-xs text-gray-500 truncate">@{u.username}</div>
              </div>
              {m.role === 'admin' && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/20 text-violet-300">مشرف</span>}
              {iAmAdmin && u.id !== me.id && (
                <div className="flex items-center gap-1">
                  {m.role !== 'admin' && (
                    <button disabled={busy} onClick={() => void run(() => supabase.from('chat_group_members').update({ role: 'admin' }).eq('group_id', group.id).eq('user_id', u.id))} className="px-2 py-1 rounded-full text-[11px] bg-gray-800 text-cyan-300">ترقية</button>
                  )}
                  <button disabled={busy} onClick={() => void run(() => supabase.from('chat_group_members').delete().eq('group_id', group.id).eq('user_id', u.id), 'تعذّرت الإزالة')} className="px-2 py-1 rounded-full text-[11px] bg-gray-800 text-red-400">إزالة</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {note && <p className="text-xs text-amber-300 mt-3 text-center">{note}</p>}
      <button onClick={() => void leave()} disabled={busy} className="w-full mt-4 py-2.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">مغادرة المجموعة</button>
    </SheetShell>
  );
}

function GroupChatView({ currentUser, group, users, setGroups, reload, onBack }: {
  currentUser: User; group: Group; users: User[];
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  reload: () => Promise<void>;
  onBack: () => void;
}) {
  const vp = useVisualViewport();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [media, setMedia] = useState<{ type: 'image' | 'video' | 'file'; url: string; file: File } | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [upload, setUpload] = useState<UploadState | null>(null);
  const keepProgress = useRef(false);
  const [replyingTo, setReplyingTo] = useState<GroupMessage | null>(null);
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null);
  const [editing, setEditing] = useState<GroupMessage | null>(null);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const [seenFor, setSeenFor] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ src: string; name?: string } | null>(null);
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const memberIds = group.members.map(m => m.userId);
  const others = memberIds.filter(id => id !== currentUser.id);
  const person = (id: string) => users.find(u => u.id === id);
  const nameOf = (id: string) => (id === currentUser.id ? 'أنت' : person(id)?.displayName ?? 'مستخدم');
  const nameColors = ['text-violet-300', 'text-cyan-300', 'text-emerald-300', 'text-rose-300', 'text-amber-300', 'text-pink-300', 'text-teal-300'];
  const patchMsgs = (fn: (list: GroupMessage[]) => GroupMessage[]) =>
    setGroups(prev => prev.map(g => g.id !== group.id ? g : { ...g, messages: fn(g.messages) }));

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Real read receipts: a message counts as seen only once it was on this person's screen.
  useSeenObserver(
    scrollRef,
    visible,
    group.messages.filter(m => !m.isSystem && m.senderId !== currentUser.id && !m.readBy.includes(currentUser.id)).map(m => m.id).join(','),
    ids => {
      patchMsgs(list => list.map(m => (ids.includes(m.id) && !m.readBy.includes(currentUser.id) ? { ...m, readBy: [...m.readBy, currentUser.id] } : m)));
      void supabase.from('group_message_reads').upsert(ids.map(id => ({ message_id: id, user_id: currentUser.id })), { onConflict: 'message_id,user_id', ignoreDuplicates: true }).then(({ error: err }) => {
        if (err) console.error(err);
      });
    },
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [group.messages.length]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { first, rest } = takeFiles(e, !!media, setError);
    if (first) {
      const kind = detectMediaKind(first);
      setMedia({ type: kind, url: kind === 'file' ? '' : URL.createObjectURL(first), file: first });
    }
    if (rest.length) setQueue(q => [...q, ...rest]);
  };

  const send = async (opts: { text?: string; file?: Blob; mediaType?: 'image' | 'video' | 'voice' | 'file'; fileName?: string; duration?: number }): Promise<boolean> => {
    const body = (opts.text ?? '').trim();
    if (!body && !opts.file) return false;
    setSending(true);
    setError('');
    const id = crypto.randomUUID();
    let path: string | null = null;
    try {
      if (opts.file) {
        const mime = (opts.file.type || '').split(';')[0];
        const ext = CHAT_EXT[mime] ?? (opts.fileName ? safeExt(opts.fileName) : opts.mediaType === 'voice' ? 'webm' : 'bin');
        path = `${group.id}/${crypto.randomUUID()}.${ext}`;
        setUpload(u => u ?? { done: 0, total: 1, pct: 0 });
        const { error: upErr } = await uploadWithProgress(CHAT_MEDIA_BUCKET, path, opts.file, mime || 'application/octet-stream', '3600', pct => setUpload(u => (u ? { ...u, pct } : u)));
        if (upErr) throw upErr;
      }
      const { error: insErr } = await supabase.from('group_messages').insert({
        id,
        group_id: group.id,
        sender_id: currentUser.id,
        text: body,
        media_path: path,
        media_type: path ? opts.mediaType ?? null : null,
        media_duration: opts.mediaType === 'voice' ? Math.round(opts.duration ?? 0) : null,
        media_name: path && opts.fileName ? opts.fileName.slice(0, 200) : null,
        media_size: opts.file ? opts.file.size : null,
        reply_to_id: replyingTo?.id ?? null,
      });
      if (insErr) throw insErr;
      const at = Date.now();
      const msg: GroupMessage = {
        id, senderId: currentUser.id, text: body, timestamp: at, isSystem: false, readBy: [currentUser.id], reactions: [],
        replyToId: replyingTo?.id,
        media: opts.file && opts.mediaType ? { type: opts.mediaType, url: URL.createObjectURL(opts.file), duration: opts.duration, name: opts.fileName, size: opts.file.size, path: path ?? undefined } : undefined,
      };
      setGroups(prev => prev.map(g => g.id !== group.id ? g : { ...g, lastActivity: at, messages: g.messages.some(m => m.id === id) ? g.messages : [...g.messages, msg] }));
      playSound('send');
      return true;
    } catch (e) {
      console.error(e);
      if (path) void supabase.storage.from(CHAT_MEDIA_BUCKET).remove([path]);
      setError('تعذّر إرسال الرسالة، حاول مرة أخرى');
      return false;
    } finally {
      setSending(false);
      if (!keepProgress.current) setUpload(null);
    }
  };

  const sendMessage = async () => {
    if ((!text.trim() && !media && queue.length === 0) || sending) return;
    const rest = queue;
    const total = (media ? 1 : 0) + rest.length;
    let done = 0;
    keepProgress.current = true;
    if (total > 0) setUpload({ done: 0, total, pct: 0 });
    let ok = true;
    if (text.trim() || media) {
      ok = await send({ text, file: media?.file, mediaType: media?.type, fileName: media?.file.name });
      if (ok) { if (media) done++; setText(''); setMedia(null); setReplyingTo(null); }
    }
    for (const f of ok ? rest : []) {
      setUpload({ done, total, pct: 0 });
      if (!(await send({ file: f, mediaType: detectMediaKind(f), fileName: f.name }))) break;
      done++;
      setQueue(q => q.filter(x => x !== f));
    }
    keepProgress.current = false;
    setUpload(null);
    inputRef.current?.focus();
  };
  const sendVoice = async (dataUrl: string, duration: number) => {
    setRecording(false);
    try {
      const blob = await (await fetch(dataUrl)).blob();
      if (await send({ file: blob, mediaType: 'voice', duration })) setReplyingTo(null);
    } catch (e) {
      console.error(e);
      setError('تعذّر إرسال الرسالة الصوتية');
    }
  };

  const deleteMessage = async (m: GroupMessage) => {
    setActiveMsgId(null);
    patchMsgs(list => list.filter(x => x.id !== m.id));
    const { error: err } = await supabase.from('group_messages').delete().eq('id', m.id);
    if (err) { console.error(err); setError('تعذّر حذف الرسالة'); void reload(); return; }
    if (m.media?.path) void supabase.storage.from(CHAT_MEDIA_BUCKET).remove([m.media.path]);
  };

  const react = async (m: GroupMessage, emoji: string) => {
    const mine = m.reactions.find(r => r.userId === currentUser.id);
    if (mine?.emoji === emoji) {
      patchMsgs(list => list.map(x => x.id === m.id ? { ...x, reactions: x.reactions.filter(r => r.userId !== currentUser.id) } : x));
      const { error: err } = await supabase.from('group_message_reactions').delete().eq('message_id', m.id).eq('user_id', currentUser.id);
      if (err) { console.error(err); void reload(); }
      return;
    }
    patchMsgs(list => list.map(x => x.id === m.id ? { ...x, reactions: [...x.reactions.filter(r => r.userId !== currentUser.id), { userId: currentUser.id, emoji }] } : x));
    const { error: err } = mine
      ? await supabase.from('group_message_reactions').update({ emoji }).eq('message_id', m.id).eq('user_id', currentUser.id)
      : await supabase.from('group_message_reactions').insert({ message_id: m.id, user_id: currentUser.id, emoji });
    if (err) { console.error(err); void reload(); }
  };

  const jumpTo = (id: string) => {
    document.getElementById(`gmsg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(id);
    window.setTimeout(() => setHighlightId(null), 1400);
  };

  const seenBy = (m: GroupMessage) => m.readBy.filter(id => id !== m.senderId && memberIds.includes(id));

  return (
    <div className="fixed left-0 right-0 z-[70] flex justify-center bg-gray-950" style={{ top: vp.top, height: vp.height }}>
      <div className="flex flex-col h-full w-full bg-gray-950">
        <div className="flex items-center gap-3 px-3 py-3 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 relative z-10">
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition-colors" aria-label="رجوع"><ChevronRight size={20} /></button>
          <button onClick={() => setInfoOpen(true)} className="flex items-center gap-3 flex-1 min-w-0 text-right">
            <GroupAvatar name={group.name} src={group.avatar} size="md" />
            <div className="min-w-0">
              <div className="font-medium text-white truncate">{group.name}</div>
              <div className="text-xs text-gray-500 truncate">{group.members.map(m => person(m.userId)?.displayName ?? '').filter(Boolean).slice(0, 4).join('، ')}{group.members.length > 4 ? '...' : ''}</div>
            </div>
          </button>
          <button onClick={() => setInfoOpen(true)} className="p-2 hover:bg-gray-800 rounded-full text-gray-400" aria-label="معلومات المجموعة"><Users size={18} /></button>
        </div>

        {editing && (
          <EditTextModal
            title="تعديل الرسالة"
            initial={editing.text}
            maxLength={4000}
            allowEmpty={!!editing.media}
            onClose={() => setEditing(null)}
            onSave={async v => {
              const ok = await updateText('group_messages', editing.id, v);
              if (ok) patchMsgs(list => list.map(m => (m.id === editing.id ? { ...m, text: v, editedAt: Date.now() } : m)));
              return ok;
            }}
          />
        )}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2" onClick={() => { setActiveMsgId(null); setReactingTo(null); }}>
          {group.messages.length === 0 && <p className="text-center text-gray-500 text-sm py-12">ابدأ المحادثة في المجموعة 👋</p>}
          {group.messages.map((m, i) => {
            if (m.isSystem) {
              return <div key={m.id} className="text-center"><span className="inline-block px-3 py-1 rounded-full bg-gray-800/80 text-[11px] text-gray-400">{person(m.senderId)?.displayName ?? 'مستخدم'} {m.text}</span></div>;
            }
            const mine = m.senderId === currentUser.id;
            const prev = group.messages[i - 1];
            const showName = !mine && (!prev || prev.senderId !== m.senderId || prev.isSystem);
            const sender = person(m.senderId);
            const seen = seenBy(m);
            const everyone = others.length > 0 && seen.length >= others.length;
            const replied = m.replyToId ? group.messages.find(x => x.id === m.replyToId) : undefined;
            const active = activeMsgId === m.id;
            const reactionGroups = new Map<string, string[]>();
            for (const r of m.reactions) reactionGroups.set(r.emoji, [...(reactionGroups.get(r.emoji) ?? []), r.userId]);
            return (
              <motion.div key={m.id} id={`gmsg-${m.id}`} data-unread={!mine && !m.readBy.includes(currentUser.id) ? '1' : undefined} data-mids={m.id} initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.18 }} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                {!mine && (showName && sender ? <button onClick={e => { e.stopPropagation(); openUserProfile(sender.id); }} className="shrink-0 self-end"><Avatar userId={sender.id} src={sender.avatar} name={sender.displayName} size="sm" /></button> : <div className="w-7 shrink-0" />)}
                <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  {showName && sender && <button onClick={e => { e.stopPropagation(); openUserProfile(sender.id); }} className={`text-[11px] font-semibold mb-0.5 px-1 text-right ${nameColors[sender.displayName.charCodeAt(0) % nameColors.length]}`}>{sender.displayName}</button>}
                  <div
                    {...messageGestures(
                      () => { setReplyingTo(m); window.setTimeout(() => inputRef.current?.focus(), 30); },
                      () => { setActiveMsgId(m.id); setReactingTo(m.id); },
                    )}
                    onClick={e => { e.stopPropagation(); setActiveMsgId(active ? null : m.id); setReactingTo(null); }}
                    className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words cursor-pointer select-none touch-pan-y transition-shadow ${highlightId === m.id ? 'ring-2 ring-cyan-400' : ''} ${mine ? 'bg-gradient-to-br from-violet-600 to-cyan-600 text-white rounded-bl-md' : 'bg-gray-800 text-white rounded-br-md'}`}
                  >
                    {m.replyToId && (
                      <button
                        onClick={e => { e.stopPropagation(); if (replied) jumpTo(replied.id); }}
                        className={`block w-full text-right mb-2 px-2.5 py-1.5 rounded-lg border-r-2 text-xs ${mine ? 'bg-white/15 border-white/60' : 'bg-black/25 border-cyan-400'}`}
                      >
                        <div className="font-medium opacity-90">{replied ? nameOf(replied.senderId) : 'رسالة'}</div>
                        <div className="opacity-80 truncate">{replied ? groupMsgPreview(replied) : 'رسالة غير متاحة'}</div>
                      </button>
                    )}
                    {m.media?.type === 'image' && (
                      <div className="mb-2 relative">
                        <img src={m.media.url} alt="" onClick={e => { e.stopPropagation(); setViewer({ src: m.media!.url, name: m.media!.name }); }} className="rounded-xl max-w-full max-h-56 object-cover cursor-zoom-in" />
                      </div>
                    )}
                    {m.media?.type === 'video' && (
                      <div className="mb-2 w-60 max-w-full" onClick={e => e.stopPropagation()}>
                        <VideoPlayer src={m.media.url} className="max-h-64" />
                      </div>
                    )}
                    {m.media?.type === 'voice' && (
                      <div onClick={e => e.stopPropagation()}><VoicePlayer url={m.media.url} knownDuration={m.media.duration} /></div>
                    )}
                    {m.media?.type === 'file' && (
                      <button onClick={e => { e.stopPropagation(); void downloadFile(m.media!.url, m.media!.name || 'file'); }} className={`mb-2 w-full flex items-center gap-3 p-2.5 rounded-xl text-right ${mine ? 'bg-white/15 hover:bg-white/25' : 'bg-black/25 hover:bg-black/40'}`}>
                        <FileText size={26} className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate" dir="auto">{m.media.name || 'ملف'}</div>
                          <div className="text-[11px] opacity-70">{formatBytes(m.media.size)}</div>
                        </div>
                        <Download size={16} className="shrink-0" />
                      </button>
                    )}
                    {m.text && <p className="whitespace-pre-wrap" dir="auto">{m.text}</p>}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                    {formatTime(m.timestamp)}{m.editedAt ? ' · معدّلة' : ''}
                    {mine && (seen.length === 0
                      ? <Check size={14} className="text-gray-500" aria-label="تم الإرسال" />
                      : <><CheckCheck size={14} className={everyone ? 'text-cyan-400' : 'text-gray-400'} aria-label="شوهدت" />
                          <span className={everyone ? 'text-cyan-400' : 'text-gray-400'}>{everyone ? 'شاهدها الكل' : `${seen.length}/${others.length}`}</span></>)}
                  </span>
                  {reactionGroups.size > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-1 ${mine ? 'justify-end' : ''}`}>
                      {[...reactionGroups.entries()].map(([emoji, ids]) => (
                        <button key={emoji} onClick={e => { e.stopPropagation(); void react(m, emoji); }} className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border ${ids.includes(currentUser.id) ? 'bg-violet-600/30 border-violet-500/50 text-white' : 'bg-gray-800 border-gray-700 text-gray-300'}`}>
                          <span>{emoji}</span>{ids.length > 1 && <span>{ids.length}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {active && reactingTo === m.id && (
                    <div className={`kan-pop flex flex-wrap items-center gap-0.5 mt-1 p-1 bg-gray-800 rounded-full shadow-lg ${mine ? 'flex-row-reverse' : ''}`} onClick={e => e.stopPropagation()}>
                      {QUICK_REACTIONS.map(em => (
                        <button key={em} onClick={() => { void react(m, em); setReactingTo(null); setActiveMsgId(null); }} className="w-9 h-9 text-xl rounded-full hover:bg-gray-700 active:scale-125 transition-transform">{em}</button>
                      ))}
                    </div>
                  )}
                  {active && (
                    <div className={`flex flex-wrap items-center gap-1.5 mt-1 ${mine ? 'flex-row-reverse' : ''}`} onClick={e => e.stopPropagation()}>
                      <button onClick={() => setReactingTo(p => (p === m.id ? null : m.id))} className="px-2.5 py-1 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs flex items-center gap-1"><Smile size={12} /> تفاعل</button>
                      <button onClick={() => { setReplyingTo(m); setActiveMsgId(null); inputRef.current?.focus(); }} className="px-2.5 py-1 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs flex items-center gap-1"><Reply size={12} /> رد</button>
                      {m.media && m.media.type !== 'voice' && (
                        <button onClick={() => { void downloadFile(m.media!.url, m.media!.name || (m.media!.type === 'video' ? 'video.mp4' : 'image.jpg')); setActiveMsgId(null); }} className="px-2.5 py-1 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs flex items-center gap-1"><Download size={12} /> تحميل</button>
                      )}
                      {mine && <button onClick={() => setSeenFor(seenFor === m.id ? null : m.id)} className="px-2.5 py-1 rounded-full bg-gray-800 hover:bg-gray-700 text-cyan-300 text-xs flex items-center gap-1"><Eye size={12} /> من شاهدها</button>}
                      {mine && m.media?.type !== 'voice' && <button onClick={() => { setEditing(m); setActiveMsgId(null); }} className="px-2.5 py-1 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs flex items-center gap-1"><Pencil size={12} /> تعديل</button>}
                      {mine && <button onClick={() => void deleteMessage(m)} className="px-2.5 py-1 rounded-full bg-gray-800 hover:bg-gray-700 text-red-400 text-xs flex items-center gap-1"><Trash2 size={12} /> حذف</button>}
                    </div>
                  )}
                  {mine && seenFor === m.id && (
                    <div className="mt-1 w-56 max-w-full p-2.5 rounded-2xl bg-gray-900 border border-white/10 text-right" onClick={e => e.stopPropagation()}>
                      <div className="text-[11px] font-semibold text-cyan-300 mb-1.5">شاهدها ({seen.length})</div>
                      {seen.length === 0 && <div className="text-[11px] text-gray-500">لم يشاهدها أحد بعد</div>}
                      {seen.map(id => (
                        <div key={id} className="flex items-center gap-2 py-0.5">
                          <Avatar userId={id} src={person(id)?.avatar ?? ''} name={person(id)?.displayName ?? '؟'} size="sm" />
                          <span className="text-xs text-gray-200 truncate">{person(id)?.displayName ?? 'مستخدم'}</span>
                        </div>
                      ))}
                      {others.filter(id => !seen.includes(id)).length > 0 && (
                        <div className="text-[11px] text-gray-500 mt-1.5">لم يشاهدها: {others.filter(id => !seen.includes(id)).map(id => person(id)?.displayName ?? '').filter(Boolean).join('، ')}</div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {!recording && (
          <div className="px-2 min-[400px]:px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-gray-900/95 backdrop-blur-md border-t border-gray-800 relative z-10">
            <input ref={fileRef} type="file" multiple onChange={handleFile} className="hidden" />
            {error && <p className="text-xs text-red-400 pb-1.5 px-1">{error}</p>}
            {replyingTo && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-gray-800 border-r-2 border-cyan-400 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="text-cyan-300 font-medium">رد على {nameOf(replyingTo.senderId)}</div>
                  <div className="truncate text-gray-400">{groupMsgPreview(replyingTo)}</div>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-400 hover:text-white" aria-label="إلغاء الرد"><X size={16} /></button>
              </div>
            )}
            {media && (
              <div className="flex items-center gap-3 mb-2 p-2 rounded-xl bg-gray-800">
                {media.type === 'image' && <img src={media.url} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                {media.type === 'video' && <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center"><Play size={18} className="text-white" fill="white" /></div>}
                {media.type === 'file' && <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center"><FileText size={20} /></div>}
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate" dir="auto">{media.file.name}</div>
                  <div className="text-[11px] text-gray-400">{formatBytes(media.file.size)}</div>
                </div>
                <button onClick={() => { if (media.url) URL.revokeObjectURL(media.url); setMedia(null); }} className="p-1.5 text-gray-400 hover:text-white" aria-label="إزالة"><X size={16} /></button>
              </div>
            )}
            <AnimatePresence>
              {toolsOpen && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.94 }} transition={{ type: 'spring', damping: 22, stiffness: 420 }} className="absolute bottom-full right-2 mb-2 z-20 flex items-center gap-2 p-2 rounded-2xl bg-gray-900/95 backdrop-blur border border-white/10 shadow-xl origin-bottom-right">
                  <button onClick={() => { fileRef.current?.click(); setToolsOpen(false); }} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-800 text-gray-200 text-xs hover:text-cyan-300 active:scale-95"><Paperclip size={16} /> صورة / فيديو / ملف</button>
                  <button
                    onPointerDown={e => e.preventDefault()}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { setAiOpen(true); setToolsOpen(false); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-r from-violet-600/30 to-cyan-500/20 border border-violet-400/30 text-white text-xs active:scale-95"
                    aria-label="اسأل KAN"
                  >
                    <Sparkles size={16} className="text-violet-300" /> اسأل KAN
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            {queue.length > 0 && <QueueChip count={queue.length} onClear={() => setQueue([])} />}
            {upload && <UploadBar upload={upload} />}
            <div className="flex items-center gap-1.5">
              <button onPointerDown={e => e.preventDefault()} onMouseDown={e => e.preventDefault()} onClick={() => setToolsOpen(o => !o)} className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${toolsOpen ? 'bg-violet-600 text-white rotate-45' : 'bg-gray-800 text-gray-300 hover:text-white'}`} aria-label="المزيد"><Plus size={20} /></button>
              <button
                onPointerDown={e => e.preventDefault()}
                onMouseDown={e => e.preventDefault()}
                onClick={() => { if (emojiOpen) { setEmojiOpen(false); inputRef.current?.focus(); } else { setToolsOpen(false); inputRef.current?.blur(); setEmojiOpen(true); } }}
                className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-90 ${emojiOpen ? 'bg-yellow-400/20 text-yellow-300' : 'bg-gray-800 text-gray-300 hover:text-white'}`}
                aria-label="إيموجي"
              ><Smile size={20} /></button>
              <input
                ref={inputRef}
                enterKeyHint="send"
                autoComplete="off"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="اكتب رسالة للمجموعة..."
                className="flex-1 min-w-0 h-10 px-4 bg-gray-800 rounded-full text-[16px] text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                onFocus={() => setEmojiOpen(false)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && void sendMessage()}
              />
              {text.trim() || media || queue.length > 0 ? (
                <motion.button whileTap={{ scale: 0.9 }} onPointerDown={e => e.preventDefault()} onMouseDown={e => e.preventDefault()} onClick={() => void sendMessage()} disabled={sending} aria-label="إرسال" className="shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full shadow-lg shadow-violet-500/30 disabled:opacity-60">
                  <Send size={18} className="text-white" />
                </motion.button>
              ) : (
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setRecording(true)} aria-label="تسجيل صوتي" className="shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full shadow-lg shadow-violet-500/30">
                  <Mic size={18} className="text-white" />
                </motion.button>
              )}
            </div>
          {emojiOpen && <EmojiPicker docked onPick={em => setText(t => t + em)} onClose={() => setEmojiOpen(false)} />}
          </div>
        )}
        {recording && (
          <div className="px-3 py-2 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 relative z-10">
            <VoiceRecorder onSend={sendVoice} onCancel={() => setRecording(false)} />
          </div>
        )}
        {viewer && <ImageViewer src={viewer.src} name={viewer.name} gallery={group.messages.flatMap(x => x.media && (x.media.type === 'image' || x.media.type === 'video') ? [{ src: x.media.url, name: x.media.name, type: x.media.type as 'image' | 'video' }] : [])} onClose={() => setViewer(null)} />}
        {aiOpen && (
          <KanAIModal
            messages={group.messages.filter(m => !m.isSystem).map(m => ({
              id: m.id, senderId: m.senderId, text: m.text, timestamp: m.timestamp, read: true,
              media: m.media ? { type: m.media.type, url: m.media.url, name: m.media.name, duration: m.media.duration, size: m.media.size } : undefined,
            })) as unknown as Message[]}
            me={currentUser}
            other={{ ...currentUser, id: group.id, displayName: group.name, avatar: group.avatar }}
            nameOf={id => person(id)?.displayName ?? 'مستخدم'}
            onClose={() => setAiOpen(false)}
            onUseReply={t => { setText(t); setAiOpen(false); window.setTimeout(() => inputRef.current?.focus(), 50); }}
          />
        )}
        {infoOpen && <GroupInfoSheet group={group} users={users} me={currentUser} reload={reload} onClose={() => setInfoOpen(false)} onLeft={() => { setInfoOpen(false); void reload(); onBack(); }} />}
      </div>
    </div>
  );
}

// ============ Notifications ============
type NotifType = 'like' | 'comment' | 'reply' | 'follow' | 'group_add';
interface AppNotification {
  id: string; type: NotifType; actorId: string | null; postId: string | null; groupId: string | null; commentId: string | null;
  snippet: string; createdAt: number; read: boolean;
}
type NotificationRow = {
  id: string; type: NotifType; actor_id: string | null; post_id: string | null; group_id: string | null; comment_id: string | null;
  snippet: string; created_at: string; read_at: string | null;
};
function rowToNotification(r: NotificationRow): AppNotification {
  return { id: r.id, type: r.type, actorId: r.actor_id, postId: r.post_id, groupId: r.group_id, commentId: r.comment_id, snippet: r.snippet, createdAt: new Date(r.created_at).getTime(), read: r.read_at !== null };
}
async function loadNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, actor_id, post_id, group_id, comment_id, snippet, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as unknown as NotificationRow[]).map(rowToNotification);
}

type PrefKey = 'like' | 'comment' | 'follow' | 'group' | 'message' | 'group_message';
type NotifPrefs = Partial<Record<PrefKey, { in_app?: boolean; push?: boolean }>>;
const PREF_ROWS: { key: PrefKey; label: string; hint: string; inApp: boolean }[] = [
  { key: 'like', label: 'الإعجابات', hint: 'عندما يعجب أحد بمنشورك', inApp: true },
  { key: 'comment', label: 'التعليقات والردود', hint: 'تعليق على منشورك أو رد على تعليقك', inApp: true },
  { key: 'follow', label: 'المتابعون الجدد', hint: 'عندما يتابعك شخص', inApp: true },
  { key: 'group', label: 'دعوات المجموعات', hint: 'عندما يضيفك أحد إلى مجموعة', inApp: true },
  { key: 'message', label: 'الرسائل الخاصة', hint: 'رسائل المحادثات العادية', inApp: false },
  { key: 'group_message', label: 'رسائل المجموعات', hint: 'رسائل جديدة في مجموعاتك', inApp: false },
];

function timeAgo(ts: number): string {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return 'الآن';
  const min = Math.floor(sec / 60);
  if (min < 60) return `منذ ${min} د`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${hr} س`;
  const day = Math.floor(hr / 24);
  return day < 7 ? `منذ ${day} يوم` : new Date(ts).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-gradient-to-r from-violet-600 to-cyan-500' : 'bg-gray-700'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'right-0.5' : 'right-[1.375rem]'}`} />
    </button>
  );
}

function NotificationsTab({ currentUser, users, notifications, setNotifications, onOpenProfile, onOpenMine, onOpenGroup, soundOn, bannersOn, onToggleSound, onToggleBanners }: {
  soundOn: boolean; bannersOn: boolean; onToggleSound: () => void; onToggleBanners: () => void;
  currentUser: User; users: User[];
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  onOpenProfile: (id: string) => void;
  onOpenMine: () => void;
  onOpenGroup: (id: string) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefs, setPrefs] = useState<NotifPrefs>({});
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [saveNote, setSaveNote] = useState('');
  const [testNote, setTestNote] = useState('');
  const unread = notifications.filter(n => !n.read).length;

  // Shows a real system notification (with your picture, sound and vibration) so you can tune the phone's settings.
  const testPush = async () => {
    setTestNote('');
    if (!pushSupported()) { setTestNote('جهازك أو متصفحك لا يدعم إشعارات الهاتف'); return; }
    const result = Notification.permission === 'granted' ? 'ok' : await enablePush();
    if (result !== 'ok') { setTestNote(result === 'denied' ? 'الإشعارات محظورة، فعّلها من إعدادات المتصفح' : 'تعذّر تفعيل الإشعارات'); return; }
    try {
      const reg = await getServiceWorker();
      await navigator.serviceWorker.ready;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const options = {
        body: 'هكذا ستظهر لك الرسائل خارج التطبيق 👋',
        icon: supabaseUrl ? `${supabaseUrl}/functions/v1/push?avatar=${currentUser.id}` : LOGO_URL,
        badge: LOGO_URL,
        tag: 'kan-test',
        renotify: true,
        silent: false,
        vibrate: [200, 100, 200],
        dir: 'rtl',
        lang: 'ar',
      };
      await reg?.showNotification(currentUser.displayName, options as NotificationOptions);
      setTestNote('أرسلت لك إشعاراً تجريبياً، اخرج من التطبيق لتراه');
    } catch (e) {
      console.error(e);
      setTestNote('تعذّر عرض الإشعار');
    }
  };

  useEffect(() => {
    let cancelled = false;
    void supabase.from('notification_prefs').select('prefs').eq('user_id', currentUser.id).maybeSingle().then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.error(error);
      setPrefs(((data?.prefs ?? {}) as NotifPrefs));
      setPrefsLoaded(true);
    });
    return () => { cancelled = true; };
  }, [currentUser.id]);

  const markAllRead = async () => {
    if (unread === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', currentUser.id).is('read_at', null);
    if (error) console.error(error);
  };
  const markOne = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    void supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).is('read_at', null).then(({ error }) => { if (error) console.error(error); });
  };
  const clearAll = async () => {
    setNotifications([]);
    const { error } = await supabase.from('notifications').delete().eq('user_id', currentUser.id);
    if (error) console.error(error);
  };

  const setPref = async (key: PrefKey, field: 'in_app' | 'push', value: boolean) => {
    const next: NotifPrefs = { ...prefs, [key]: { ...prefs[key], [field]: value } };
    setPrefs(next);
    const { error } = await supabase.from('notification_prefs').upsert({ user_id: currentUser.id, prefs: next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    setSaveNote(error ? 'تعذّر حفظ الإعداد' : 'تم الحفظ');
    window.setTimeout(() => setSaveNote(''), 1400);
    if (error) console.error(error);
  };
  const isOn = (key: PrefKey, field: 'in_app' | 'push') => prefs[key]?.[field] !== false;

  const open = (n: AppNotification) => {
    markOne(n.id);
    if (n.type === 'group_add' && n.groupId) onOpenGroup(n.groupId);
    else if (n.type === 'follow' && n.actorId) onOpenProfile(n.actorId);
    else if (n.postId) openPost(n.postId, n.commentId ?? undefined);
    else onOpenMine();
  };

  const meta: Record<NotifType, { icon: React.ReactNode; tint: string; text: (n: AppNotification) => string }> = {
    like: { icon: <Heart size={12} fill="currentColor" />, tint: 'bg-rose-500', text: () => 'أعجب بمنشورك' },
    comment: { icon: <MessageCircle size={12} />, tint: 'bg-cyan-500', text: n => `علّق على منشورك${n.snippet ? `: ${n.snippet}` : ''}` },
    reply: { icon: <Reply size={12} />, tint: 'bg-violet-500', text: n => `ردّ على تعليقك${n.snippet ? `: ${n.snippet}` : ''}` },
    follow: { icon: <User size={12} />, tint: 'bg-emerald-500', text: () => 'بدأ بمتابعتك' },
    group_add: { icon: <Users size={12} />, tint: 'bg-amber-500', text: n => `أضافك إلى مجموعة ${n.snippet}` },
  };

  const fresh = notifications.filter(n => !n.read);
  const older = notifications.filter(n => n.read);
  const renderItem = (n: AppNotification, i: number) => {
    const actor = n.actorId ? users.find(u => u.id === n.actorId) : undefined;
    const m = meta[n.type];
    return (
      <motion.button
        key={n.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(i, 8) * 0.03 }}
        onClick={() => open(n)}
        className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-right transition-colors ${n.read ? 'bg-gray-900/60 border-white/5 hover:border-white/10' : 'bg-violet-500/10 border-violet-400/25 hover:border-violet-400/40'}`}
      >
        <div className="relative shrink-0">
          <Avatar userId={actor?.id} src={actor?.avatar ?? ''} name={actor?.displayName ?? '؟'} size="md" />
          <span className={`absolute -bottom-1 -left-1 w-5 h-5 rounded-full ${m.tint} text-white flex items-center justify-center ring-2 ring-gray-950`}>{m.icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-200 leading-snug line-clamp-2" dir="auto"><span className="font-semibold text-white">{actor?.displayName ?? 'مستخدم'}</span> {m.text(n)}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{timeAgo(n.createdAt)}</p>
        </div>
        {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 shrink-0" />}
      </motion.button>
    );
  };

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Bell size={20} className="text-violet-300" /> الإشعارات</h2>
        <div className="flex items-center gap-1.5">
          {unread > 0 && <button onClick={() => void markAllRead()} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white">تحديد الكل كمقروء</button>}
          <button onClick={onToggleSound} aria-label={soundOn ? 'إيقاف الصوت' : 'تشغيل الصوت'} aria-pressed={soundOn} className={`w-9 h-9 rounded-full flex items-center justify-center border border-white/10 bg-white/5 active:scale-90 transition-all ${soundOn ? 'text-cyan-300' : 'text-gray-500'}`}>
            {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button onClick={onToggleBanners} aria-label={bannersOn ? 'إيقاف الإشعارات المنبثقة' : 'تشغيل الإشعارات المنبثقة'} aria-pressed={bannersOn} className={`w-9 h-9 rounded-full flex items-center justify-center border border-white/10 bg-white/5 active:scale-90 transition-all ${bannersOn ? 'text-violet-300' : 'text-gray-500'}`}>
            {bannersOn ? <Bell size={17} /> : <BellOff size={17} />}
          </button>
          <button onClick={() => setSettingsOpen(o => !o)} aria-label="إعدادات الإشعارات" className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${settingsOpen ? 'bg-violet-500/15 border-violet-400/30 text-violet-200' : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'}`}>
            <Settings size={17} />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {settingsOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
            <div className="rounded-2xl bg-gray-900/70 border border-white/10 p-3">
              <div className="flex items-center justify-between px-1 pb-2 text-[11px] text-gray-500">
                <span>اختر ما يصلك وما لا يصلك</span>
                <span className="flex items-center gap-5 pl-1"><span>في التطبيق</span><span>إشعار الهاتف</span></span>
              </div>
              {!prefsLoaded && <p className="text-xs text-gray-500 py-3 text-center">جارٍ التحميل...</p>}
              {prefsLoaded && PREF_ROWS.map(row => (
                <div key={row.key} className="flex items-center gap-3 py-2.5 border-t border-white/5 first:border-t-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white">{row.label}</div>
                    <div className="text-[11px] text-gray-500">{row.hint}</div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {row.inApp ? <Toggle on={isOn(row.key, 'in_app')} onChange={v => void setPref(row.key, 'in_app', v)} label={`${row.label} داخل التطبيق`} /> : <span className="w-11" />}
                    <Toggle on={isOn(row.key, 'push')} onChange={v => void setPref(row.key, 'push', v)} label={`${row.label} على الهاتف`} />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 text-[11px] text-gray-500">
                <span className="flex items-center gap-1"><BellOff size={12} /> لتصلك إشعارات الهاتف اسمح بالإشعارات في المتصفح</span>
                {saveNote && <span className="text-cyan-300">{saveNote}</span>}
              </div>
              <div className="mt-3 pt-3 border-t border-white/5">
                <button onClick={() => void testPush()} className="w-full py-2.5 rounded-full bg-gradient-to-r from-violet-600/25 to-cyan-500/20 border border-violet-400/30 text-white text-sm font-medium active:scale-[0.98] transition-transform">
                  جرّب إشعار الهاتف
                </button>
                {testNote && <p className="text-xs text-cyan-300 mt-2 text-center">{testNote}</p>}
                <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                  ليظهر الإشعار فوق الشاشة بصوت وأنت داخل تطبيق آخر: افتح إعدادات الهاتف ← التطبيقات ← KAN (أو المتصفح) ← الإشعارات، ثم فعّل الإشعارات المنبثقة والصوت والاهتزاز.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {notifications.length === 0 ? (
        <div className="text-center py-14">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-600/20 to-cyan-500/10 border border-white/10 flex items-center justify-center"><Bell size={32} className="text-violet-300" /></div>
          <p className="text-gray-300 mb-1">لا توجد إشعارات بعد</p>
          <p className="text-gray-500 text-sm">الإعجابات والتعليقات والمتابعون الجدد ستظهر هنا</p>
        </div>
      ) : (
        <div className="space-y-2">
          {fresh.length > 0 && <p className="text-xs font-semibold text-violet-300 px-1">جديد</p>}
          {fresh.map(renderItem)}
          {older.length > 0 && <p className="text-xs font-semibold text-gray-500 px-1 pt-2">سابقاً</p>}
          {older.map((n, i) => renderItem(n, i + fresh.length))}
          <button onClick={() => void clearAll()} className="w-full mt-2 py-2.5 rounded-full text-xs text-gray-500 hover:text-red-400">مسح كل الإشعارات</button>
        </div>
      )}
    </div>
  );
}

// ============ In-app banner (a new message or notification while you are browsing) ============
interface InAppToast { id: number; title: string; body: string; avatar?: string; group?: boolean; onOpen: () => void }

function messagePreviewText(text: string, mediaType?: string | null): string {
  const labels: Record<string, string> = { image: '📷 صورة', video: '🎥 فيديو', voice: '🎤 رسالة صوتية', file: '📎 ملف' };
  const label = mediaType ? labels[mediaType] ?? '' : '';
  return text ? (label ? `${label} ${text}` : text) : label || 'رسالة جديدة';
}

function notificationText(n: AppNotification): string {
  switch (n.type) {
    case 'like': return 'أعجب بمنشورك';
    case 'comment': return `علّق على منشورك${n.snippet ? `: ${n.snippet}` : ''}`;
    case 'reply': return `ردّ على تعليقك${n.snippet ? `: ${n.snippet}` : ''}`;
    case 'follow': return 'بدأ بمتابعتك';
    default: return `أضافك إلى مجموعة ${n.snippet}`;
  }
}

function ToastBanner({ toast, onClose }: { toast: InAppToast; onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 4800);
    return () => window.clearTimeout(t);
  }, [toast.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div dir="rtl" className="fixed inset-x-0 top-0 z-[160] flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pointer-events-none">
      <motion.button
        initial={{ y: -90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -90, opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 320 }}
        drag="y"
        dragConstraints={{ top: -90, bottom: 0 }}
        dragElastic={0.4}
        onDragEnd={(_, info) => { if (info.offset.y < -24) onClose(); }}
        onClick={() => { toast.onOpen(); onClose(); }}
        className="pointer-events-auto w-full max-w-md flex items-center gap-3 p-3 rounded-2xl bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 text-right"
      >
        {toast.group ? <GroupAvatar name={toast.title} src={toast.avatar} size="md" /> : <Avatar src={toast.avatar ?? ''} name={toast.title} size="md" />}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white truncate">{toast.title}</div>
          <div className="text-xs text-gray-300 truncate" dir="auto">{toast.body}</div>
        </div>
        <span className="w-2 h-2 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 shrink-0" />
      </motion.button>
    </div>
  );
}

// ============ Intro screen while the app starts ============
function SplashScreen() {
  return (
    <div dir="rtl" className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center overflow-hidden">
      <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(40rem 26rem at 50% 38%, rgba(124,58,237,0.30), transparent 62%), radial-gradient(28rem 20rem at 88% 88%, rgba(6,182,212,0.16), transparent 60%)' }} />
      <motion.div
        initial={{ scale: 0.55, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 13, stiffness: 120 }}
        className="relative"
      >
        {[0, 1].map(i => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute inset-0 rounded-[28px] border border-violet-400/40"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.8 + i * 0.5, opacity: 0 }}
            transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
          />
        ))}
        <img src={LOGO_URL} alt="KAN" className="relative w-24 h-24 rounded-[28px] shadow-2xl shadow-violet-500/40" />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="relative mt-7 text-5xl font-extrabold tracking-[0.3em] pl-[0.3em] kan-gradient-text">KAN</motion.h1>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.5 }} className="relative mt-2 text-sm text-gray-400">شبكة التواصل الاجتماعي</motion.p>
      <div dir="ltr" className="absolute bottom-[max(2.5rem,env(safe-area-inset-bottom))] w-40 h-1 rounded-full bg-white/10 overflow-hidden">
        <motion.div className="h-full w-1/2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" initial={{ x: '-100%' }} animate={{ x: '220%' }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} />
      </div>
    </div>
  );
}

// ============ Stories strip (design only, not wired up yet) ============
interface StoryItem { id: string; userId: string; url: string; type: 'image' | 'video'; caption: string; createdAt: number; sharedPostId?: string }
interface StoryGroup { userId: string; items: StoryItem[] }

type StoryRow = { id: string; user_id: string; media_url: string | null; media_type: 'image' | 'video'; caption: string; created_at: string; shared_post_id: string | null };
const STORY_SELECT = 'id, user_id, media_url, media_type, caption, created_at, shared_post_id';
const rowToStory = (r: StoryRow): StoryItem => ({
  id: r.id, userId: r.user_id, url: r.media_url ?? '', type: r.media_type, caption: r.caption,
  createdAt: new Date(r.created_at).getTime(), sharedPostId: r.shared_post_id ?? undefined,
});
const notifyStoriesChanged = () => window.dispatchEvent(new Event('kan-stories-changed'));

// The picture on a profile: a coloured ring when that person has an active story (24h); tap to watch it.
function ProfileStoryAvatar({ user, currentUser, users }: { user: User; currentUser: User; users: User[] }) {
  const [items, setItems] = useState<StoryItem[]>([]);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let off = false;
    const load = async () => {
      const { data, error } = await supabase.from('stories').select(STORY_SELECT)
        .eq('user_id', user.id).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: true }).limit(50);
      if (off) return;
      if (error) { console.error(error); return; }
      const list = ((data ?? []) as StoryRow[]).map(rowToStory);
      setItems(list);
      if (list.length > 0 && user.id !== currentUser.id) {
        const { data: v } = await supabase.from('story_views').select('story_id').eq('viewer_id', currentUser.id).in('story_id', list.map(s => s.id));
        if (!off) setSeen(new Set((v ?? []).map(x => (x as { story_id: string }).story_id)));
      }
    };
    void load();
    window.addEventListener('kan-stories-changed', load);
    return () => { off = true; window.removeEventListener('kan-stories-changed', load); };
  }, [user.id, currentUser.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (items.length === 0) return <Avatar noRing src={user.avatar} name={user.displayName} size="xl" zoom />;
  const unseen = user.id === currentUser.id || items.some(i => !seen.has(i.id));
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="عرض القصة" className="relative shrink-0 active:scale-95 transition-transform">
        <div className={`rounded-full p-[3px] ${unseen ? 'bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-cyan-400' : 'bg-gray-700'}`}>
          <div className="rounded-full bg-gray-950 p-[2px]"><Avatar noRing src={user.avatar} name={user.displayName} size="xl" /></div>
        </div>
      </button>
      {open && (
        <StoryViewer
          groups={[{ userId: user.id, items }]}
          startGroup={0}
          users={users}
          currentUser={currentUser}
          onSeen={id => setSeen(prev => (prev.has(id) ? prev : new Set(prev).add(id)))}
          onChanged={notifyStoriesChanged}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function StoriesBar({ users, currentUser }: { users: User[]; currentUser: User }) {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [openAt, setOpenAt] = useState<number | null>(null);
  const [composer, setComposer] = useState<File | null>(null);
  const [hint, setHint] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from('stories')
      .select(STORY_SELECT)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(400);
    if (error) { console.error(error); return; }
    setStories(((data ?? []) as StoryRow[]).map(rowToStory));
    const { data: v } = await supabase.from('story_views').select('story_id').eq('viewer_id', currentUser.id).gt('viewed_at', new Date(Date.now() - 86400000).toISOString());
    setSeen(new Set((v ?? []).map(x => (x as { story_id: string }).story_id)));
  };
  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 60000);
    const onChanged = () => void load();
    window.addEventListener('kan-stories-changed', onChanged);
    return () => { window.clearInterval(t); window.removeEventListener('kan-stories-changed', onChanged); };
  }, [currentUser.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (msg: string) => { setHint(msg); window.setTimeout(() => setHint(''), 2200); };
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) { flash('اختر صورة أو فيديو'); return; }
    if (f.size > 80 * 1024 * 1024) { flash('الملف كبير جداً (الحد 80 ميجا)'); return; }
    setComposer(f);
  };

  // Everyone's active stories show here (not only people you follow); people you follow come first.
  const byUser = new Map<string, StoryItem[]>();
  for (const s of stories) byUser.set(s.userId, [...(byUser.get(s.userId) ?? []), s]);
  const hasUnseen = (g: StoryGroup) => g.items.some(i => !seen.has(i.id));
  const followed = (g: StoryGroup) => currentUser.following.includes(g.userId);
  const others: StoryGroup[] = [...byUser.entries()]
    .filter(([id]) => id !== currentUser.id && users.some(u => u.id === id))
    .map(([userId, items]) => ({ userId, items }))
    .sort((a, b) => Number(hasUnseen(b)) - Number(hasUnseen(a)) || Number(followed(b)) - Number(followed(a)) || b.items[b.items.length - 1].createdAt - a.items[a.items.length - 1].createdAt);
  const mine = byUser.get(currentUser.id);
  const viewerGroups: StoryGroup[] = [...(mine ? [{ userId: currentUser.id, items: mine }] : []), ...others];
  const offset = mine ? 1 : 0;

  return (
    <div className="relative">
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="text-sm font-semibold text-gray-200">القصص</h3>
      </div>
      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={pick} />
      <div className="flex gap-3.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        <button onClick={() => (mine ? setOpenAt(0) : fileRef.current?.click())} className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] active:scale-95 transition-transform">
          <div className="relative">
            <div className={`w-[62px] h-[62px] rounded-full p-[2.5px] ${mine ? 'bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-cyan-400' : 'border-2 border-dashed border-violet-400/40'}`}>
              <div className={`w-full h-full rounded-full overflow-hidden ${mine ? 'bg-gray-950 p-[2px]' : ''}`}><Avatar noRing src={currentUser.avatar} name={currentUser.displayName} size="lg" /></div>
            </div>
            <span onClick={e => { e.stopPropagation(); fileRef.current?.click(); }} className="absolute -bottom-0.5 -left-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-white flex items-center justify-center ring-2 ring-gray-950 shadow-md"><Plus size={14} /></span>
          </div>
          <span className="text-[11px] text-gray-300 truncate w-full text-center">قصتك</span>
        </button>
        {others.map((g, i) => {
          const u = users.find(x => x.id === g.userId)!;
          const unseen = hasUnseen(g);
          return (
            <button key={g.userId} onClick={() => setOpenAt(offset + i)} className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] active:scale-95 transition-transform">
              <div className={`w-[62px] h-[62px] rounded-full p-[2.5px] ${unseen ? 'bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-cyan-400' : 'bg-gray-700'}`}>
                <div className="w-full h-full rounded-full bg-gray-950 p-[2px]"><div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"><Avatar noRing src={u.avatar} name={u.displayName} size="lg" /></div></div>
              </div>
              <span className={`text-[11px] truncate w-full text-center ${unseen ? 'text-gray-200' : 'text-gray-500'}`}>{u.displayName}</span>
            </button>
          );
        })}
        {others.length === 0 && !mine && [0, 1, 2].map(i => (
          <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] opacity-50">
            <div className="w-[62px] h-[62px] rounded-full border-2 border-dashed border-white/15 bg-white/[0.03]" />
            <span className="h-2 w-10 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
      <AnimatePresence>
        {hint && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute left-1/2 -translate-x-1/2 top-7 px-3.5 py-1.5 rounded-full bg-gray-800 border border-white/10 text-xs text-white shadow-lg z-10">{hint}</motion.div>
        )}
      </AnimatePresence>
      {composer && <StoryComposer file={composer} currentUser={currentUser} onClose={() => setComposer(null)} onDone={() => { setComposer(null); void load(); }} />}
      {openAt !== null && viewerGroups[openAt] && (
        <StoryViewer
          groups={viewerGroups}
          startGroup={openAt}
          users={users}
          currentUser={currentUser}
          onSeen={id => setSeen(prev => (prev.has(id) ? prev : new Set(prev).add(id)))}
          onChanged={() => void load()}
          onClose={() => setOpenAt(null)}
        />
      )}
    </div>
  );
}

function StoryComposer({ file, currentUser, onClose, onDone }: { file: File; currentUser: User; onClose: () => void; onDone: () => void }) {
  useBackLayer(true, onClose);
  const [previewUrl] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);
  const isVideo = file.type.startsWith('video/');
  const [caption, setCaption] = useState('');
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const publish = async () => {
    if (busy) return;
    setBusy(true);
    setErr('');
    const path = `${currentUser.id}/story-${crypto.randomUUID()}.${MEDIA_EXT[file.type] ?? safeExt(file.name)}`;
    try {
      const { error: upErr } = await uploadWithProgress(POST_MEDIA_BUCKET, path, file, file.type || 'application/octet-stream', '31536000', setPct);
      if (upErr) throw upErr;
      const url = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
      const { error: insErr } = await supabase.from('stories').insert({ user_id: currentUser.id, media_url: url, media_type: isVideo ? 'video' : 'image', caption: caption.trim().slice(0, 300) });
      if (insErr) { void supabase.storage.from(POST_MEDIA_BUCKET).remove([path]); throw insErr; }
      notifyStoriesChanged();
      onDone();
    } catch (e) {
      console.error(e);
      setErr('تعذّر نشر القصة، حاول مرة أخرى');
      setBusy(false);
    }
  };
  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[140] bg-black flex flex-col">
      <div className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <button onClick={onClose} disabled={busy} className="p-2 rounded-full bg-white/10 text-white" aria-label="إغلاق"><X size={20} /></button>
        <span className="text-white font-semibold text-sm">قصة جديدة</span>
        <span className="w-9" />
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center">
        {isVideo
          ? <video src={previewUrl} className="max-w-full max-h-full" controls playsInline muted />
          : <img src={previewUrl} alt="" className="max-w-full max-h-full object-contain" />}
      </div>
      <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-2">
        <input value={caption} onChange={e => setCaption(e.target.value.slice(0, 300))} placeholder="أضف تعليقاً..." className="flex-1 px-4 py-2.5 bg-white/10 rounded-full text-[16px] text-white placeholder-gray-400 focus:outline-none" />
        <button onClick={() => void publish()} disabled={busy} className="px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-70 active:scale-95 transition-transform">
          {busy ? <><RefreshCw size={15} className="animate-spin" /> {pct}%</> : <><Send size={15} /> نشر</>}
        </button>
      </div>
      {err && <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-red-500/90 text-white text-xs">{err}</div>}
    </div>,
    document.body,
  );
}

function StoryViewer({ groups, startGroup, users, currentUser, onSeen, onChanged, onClose }: {
  groups: StoryGroup[]; startGroup: number; users: User[]; currentUser: User;
  onSeen: (id: string) => void; onChanged: () => void; onClose: () => void;
}) {
  useBackLayer(true, onClose);
  useEffect(() => () => { window.dispatchEvent(new Event('kan-stories-changed')); }, []);
  const [gi, setGi] = useState(startGroup);
  const [si, setSi] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(5000);
  const [viewers, setViewers] = useState<string[] | null>(null);
  const [showViewers, setShowViewers] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likers, setLikers] = useState<string[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replyFocus, setReplyFocus] = useState(false);
  const [sentNote, setSentNote] = useState('');
  const [burst, setBurst] = useState(0);
  const group = groups[gi];
  const story = group?.items[si];
  const author = users.find(u => u.id === group?.userId);
  const isMine = story?.userId === currentUser.id;
  const videoRef = useRef<HTMLVideoElement>(null);
  const downY = useRef(0);
  const downX = useRef(0);
  const holdTimer = useRef<number | undefined>(undefined);
  const held = useRef(false);
  // Open someone's profile from inside the story (closes the story first).
  const openPerson = (id: string) => {
    onClose();
    window.setTimeout(() => openUserProfile(id), 60);
  };

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  const next = () => {
    if (!group) return;
    if (si < group.items.length - 1) setSi(si + 1);
    else if (gi < groups.length - 1) { setGi(gi + 1); setSi(0); }
    else onClose();
  };
  const prev = () => {
    if (si > 0) setSi(si - 1);
    else if (gi > 0) { setGi(gi - 1); setSi(Math.max(0, groups[gi - 1].items.length - 1)); }
    else setProgress(0);
  };

  useEffect(() => {
    setProgress(0);
    setDuration(5000);
    setShowViewers(false);
    setViewers(null);
    setLiked(false);
    setLikers([]);
    setReplyText('');
    setSentNote('');
    if (!story) return;
    let offLikes = false;
    void supabase.from('story_likes').select('user_id').eq('story_id', story.id).then(({ data }) => {
      if (offLikes) return;
      const ids = (data ?? []).map(r => (r as { user_id: string }).user_id);
      setLikers(ids);
      setLiked(ids.includes(currentUser.id));
    });
    if (story.userId !== currentUser.id) {
      onSeen(story.id);
      void supabase.from('story_views').upsert({ story_id: story.id, viewer_id: currentUser.id }, { onConflict: 'story_id,viewer_id', ignoreDuplicates: true }).then(({ error }) => { if (error) console.error(error); });
      return () => { offLikes = true; };
    } else {
      let off = false;
      void supabase.from('story_views').select('viewer_id').eq('story_id', story.id).then(({ data }) => {
        if (!off) setViewers((data ?? []).map(r => (r as { viewer_id: string }).viewer_id));
      });
      return () => { off = true; offLikes = true; };
    }
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleLike = async () => {
    if (!story) return;
    const was = liked;
    setLiked(!was);
    setLikers(l => (was ? l.filter(x => x !== currentUser.id) : [...l.filter(x => x !== currentUser.id), currentUser.id]));
    if (!was) setBurst(n => n + 1);
    const { error } = was
      ? await supabase.from('story_likes').delete().eq('story_id', story.id).eq('user_id', currentUser.id)
      : await supabase.from('story_likes').insert({ story_id: story.id, user_id: currentUser.id });
    if (error) {
      console.error(error);
      setLiked(was);
      setLikers(l => (was ? [...l, currentUser.id] : l.filter(x => x !== currentUser.id)));
    }
  };

  // A reply goes to the owner's private chat.
  const sendReply = async () => {
    const body = replyText.trim();
    if (!body || !story || story.userId === currentUser.id) return;
    setReplyText('');
    try {
      const convId = await getOrCreateConversation(currentUser.id, story.userId);
      const { error } = await supabase.from('messages').insert({
        id: crypto.randomUUID(), conversation_id: convId, sender_id: currentUser.id,
        text: `↪️ رد على قصتك\n${body}`.slice(0, 1000),
        media_path: null, media_type: null, media_duration: null, media_name: null, media_size: null, reply_to_id: null,
      });
      if (error) throw error;
      playSound('send');
      setSentNote('تم إرسال ردك ✓');
    } catch (e) {
      console.error(e);
      setReplyText(body);
      setSentNote('تعذّر إرسال الرد');
    }
    window.setTimeout(() => setSentNote(''), 1800);
  };

  // Pictures advance on a timer; videos report their own progress.
  useEffect(() => {
    if (!story || story.type !== 'image' || paused || showViewers || replyFocus) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setProgress(p => p + dt / duration);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [story?.id, paused, showViewers, replyFocus, duration]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (progress >= 1) next(); }, [progress]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused || showViewers || replyFocus) v.pause(); else void v.play().catch(() => undefined);
  }, [paused, showViewers, replyFocus, story?.id]);

  const remove = async () => {
    if (!story || !window.confirm('حذف هذه القصة؟')) return;
    const { error } = await supabase.from('stories').delete().eq('id', story.id);
    if (error) { console.error(error); return; }
    // A shared post's media belongs to the post, so only delete files this story uploaded itself.
    const p = story.sharedPostId ? null : mediaPath(story.url);
    if (p) void supabase.storage.from(POST_MEDIA_BUCKET).remove([p]);
    onChanged();
    notifyStoriesChanged();
    onClose();
  };

  if (!story || !group) return null;
  const ignore = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation(), onPointerUp: (e: React.PointerEvent) => e.stopPropagation() };

  return createPortal(
    <div
      dir="rtl"
      className="fixed inset-0 z-[140] bg-black flex items-center justify-center select-none"
      onTouchStart={e => { downY.current = e.touches[0].clientY; downX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        const dy = e.changedTouches[0].clientY - downY.current;
        const dx = e.changedTouches[0].clientX - downX.current;
        if (dy > 110 && Math.abs(dy) > Math.abs(dx)) { onClose(); return; }
        // Swipe sideways: jump straight to the next / previous person's story.
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          if (dx < 0) { if (gi < groups.length - 1) { setGi(gi + 1); setSi(0); } else onClose(); }
          else if (gi > 0) { setGi(gi - 1); setSi(0); }
        }
      }}
      onPointerDown={e => {
        held.current = false;
        downX.current = e.clientX;
        downY.current = e.clientY;
        window.clearTimeout(holdTimer.current);
        holdTimer.current = window.setTimeout(() => { held.current = true; setPaused(true); }, 220);
      }}
      onPointerUp={e => {
        window.clearTimeout(holdTimer.current);
        if (held.current) { setPaused(false); held.current = false; return; }
        // A drag (swipe) is not a tap.
        if (Math.abs(e.clientX - downX.current) > 25 || Math.abs(e.clientY - downY.current) > 25) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (rect.right - e.clientX < rect.width / 3) prev(); else next();
      }}
      onPointerCancel={() => { window.clearTimeout(holdTimer.current); setPaused(false); }}
    >
      <div className="relative w-full h-full max-w-md bg-black overflow-hidden">
        {!story.url
          ? (
            <div className="absolute inset-0 flex items-center justify-center p-8 bg-gradient-to-br from-violet-700 via-fuchsia-600 to-cyan-500">
              <p className="text-white text-2xl font-bold leading-10 text-center whitespace-pre-wrap break-words line-clamp-[10]" dir="auto">{story.caption}</p>
            </div>
          )
          : story.type === 'image'
          ? <img src={story.url} alt="" draggable={false} className="absolute inset-0 w-full h-full object-contain" />
          : (
            <video
              key={story.id}
              ref={videoRef}
              src={story.url}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-contain"
              onLoadedMetadata={e => setDuration((e.currentTarget.duration || 5) * 1000)}
              onTimeUpdate={e => { const d = e.currentTarget.duration; if (d > 0) setProgress(e.currentTarget.currentTime / d); }}
              onEnded={() => setProgress(1)}
              onError={() => setProgress(1)}
            />
          )}
        {/* Visible navigation: RTL, so the right arrow goes back and the left arrow goes forward. */}
        {(gi > 0 || si > 0) && (
          <button {...ignore} onClick={e => { e.stopPropagation(); prev(); }} aria-label="السابق" className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center active:scale-90 transition-transform">
            <ChevronRight size={22} />
          </button>
        )}
        <button {...ignore} onClick={e => { e.stopPropagation(); next(); }} aria-label="التالي" className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center active:scale-90 transition-transform">
          <ChevronLeft size={22} />
        </button>
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 px-3 pt-[max(0.6rem,env(safe-area-inset-top))]">
          <div className="flex gap-1">
            {group.items.map((it, i) => (
              <div key={it.id} className="h-[3px] flex-1 rounded-full bg-white/30 overflow-hidden">
                <div className="h-full bg-white" style={{ width: `${i < si ? 100 : i === si ? Math.min(100, progress * 100) : 0}%` }} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2.5 mt-2.5" {...ignore}>
            <button onClick={() => author && openPerson(author.id)} className="flex items-center gap-2.5 flex-1 min-w-0 text-right active:opacity-80">
              {author && <Avatar noRing src={author.avatar} name={author.displayName} size="md" />}
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold truncate">{isMine ? 'قصتك' : author?.displayName}</div>
                <div className="text-white/70 text-[11px]">{formatTime(story.createdAt)}</div>
              </div>
            </button>
            {isMine && <button onClick={() => void remove()} className="p-2 rounded-full bg-black/30 text-white" aria-label="حذف القصة"><Trash2 size={18} /></button>}
            <button onClick={onClose} className="p-2 rounded-full bg-black/30 text-white" aria-label="إغلاق"><X size={20} /></button>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16 px-4 bg-gradient-to-t from-black/70 to-transparent">
          {story.caption && story.url && <p className="text-white text-[15px] leading-6 text-center mb-3 whitespace-pre-wrap pointer-events-none" dir="auto">{story.caption}</p>}
          {story.sharedPostId && (
            <div className="flex justify-center mb-3" {...ignore}>
              <button onClick={() => { const id = story.sharedPostId!; onClose(); window.setTimeout(() => openPost(id), 60); }} className="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur text-white text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-transform">
                عرض المنشور ‹
              </button>
            </div>
          )}
          {sentNote && <div className="text-center text-xs text-cyan-300 mb-2 pointer-events-none">{sentNote}</div>}
          {isMine ? (
            <div className="flex items-center justify-center gap-2" {...ignore}>
              <button onClick={() => setShowViewers(v => !v)} className="px-4 py-1.5 rounded-full bg-white/15 text-white text-sm flex items-center gap-2">
                <Eye size={16} /> {viewers === null ? '...' : viewers.length}
              </button>
              <span className="px-4 py-1.5 rounded-full bg-white/15 text-white text-sm flex items-center gap-2"><Heart size={16} className="fill-rose-400 text-rose-400" /> {likers.length}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2" {...ignore} dir="rtl">
              <input
                value={replyText}
                onChange={e => setReplyText(e.target.value.slice(0, 500))}
                onFocus={() => setReplyFocus(true)}
                onBlur={() => setReplyFocus(false)}
                onKeyDown={e => { if (e.key === 'Enter') void sendReply(); }}
                enterKeyHint="send"
                placeholder={`رد على ${author?.displayName ?? ''}...`}
                className="flex-1 min-w-0 h-11 px-4 rounded-full bg-white/10 border border-white/25 backdrop-blur text-[16px] text-white placeholder-white/60 focus:outline-none focus:border-white/60"
              />
              {replyText.trim()
                ? <button onPointerDown={e => e.preventDefault()} onClick={() => void sendReply()} aria-label="إرسال الرد" className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white flex items-center justify-center active:scale-90 transition-transform"><Send size={18} /></button>
                : (
                  <button onClick={() => void toggleLike()} aria-label="إعجاب" className="relative w-11 h-11 shrink-0 rounded-full bg-white/10 border border-white/25 flex items-center justify-center active:scale-90 transition-transform">
                    <motion.span key={burst} initial={{ scale: 0.6 }} animate={{ scale: [0.6, 1.35, 1] }} transition={{ duration: 0.35 }} className="flex">
                      <Heart size={22} className={liked ? 'fill-rose-500 text-rose-500' : 'text-white'} />
                    </motion.span>
                  </button>
                )}
            </div>
          )}
        </div>
        {showViewers && isMine && (
          <div className="absolute inset-x-0 bottom-0 max-h-[55%] overflow-y-auto bg-gray-900 rounded-t-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" {...ignore}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-white text-sm">المشاهدات ({viewers?.length ?? 0})</h4>
              <button onClick={() => setShowViewers(false)} className="p-1 text-gray-400"><X size={18} /></button>
            </div>
            {(viewers ?? []).length === 0 && <p className="text-center text-gray-500 text-sm py-4">لم يشاهدها أحد بعد</p>}
            {(viewers ?? []).map(id => {
              const u = users.find(x => x.id === id);
              return u ? (
                <button key={id} onClick={() => openPerson(u.id)} className="w-full flex items-center gap-3 py-1.5 text-right rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors">
                  <Avatar noRing src={u.avatar} name={u.displayName} size="md" />
                  <span className="text-sm text-white flex-1 truncate">{u.displayName}</span>
                  {likers.includes(u.id) && <Heart size={15} className="fill-rose-500 text-rose-500 shrink-0" />}
                </button>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ============ Message gestures: swipe a bubble to reply, press and hold for reactions ============
interface GestureState { sx: number; sy: number; dx: number; timer?: number; swiping: boolean; fired: boolean; down: boolean; suppress: boolean }
const gestureStates = new WeakMap<HTMLElement, GestureState>();

function messageGestures(onReply: () => void, onLongPress: () => void) {
  const stateOf = (el: HTMLElement): GestureState => {
    let st = gestureStates.get(el);
    if (!st) { st = { sx: 0, sy: 0, dx: 0, swiping: false, fired: false, down: false, suppress: false }; gestureStates.set(el, st); }
    return st;
  };
  const finish = (el: HTMLElement, allowReply: boolean) => {
    const st = stateOf(el);
    window.clearTimeout(st.timer);
    if (st.swiping) {
      el.style.transition = 'transform 0.22s cubic-bezier(.2,.8,.2,1)';
      el.style.transform = '';
      if (allowReply && Math.abs(st.dx) > 56) { navigator.vibrate?.(8); onReply(); }
    }
    st.swiping = false;
    st.down = false;
    st.dx = 0;
  };
  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const el = e.currentTarget;
      const st = stateOf(el);
      st.sx = e.clientX; st.sy = e.clientY; st.dx = 0;
      st.swiping = false; st.fired = false; st.suppress = false; st.down = true;
      el.style.transition = '';
      window.clearTimeout(st.timer);
      st.timer = window.setTimeout(() => {
        if (st.down && !st.swiping) { st.fired = true; st.suppress = true; navigator.vibrate?.(12); onLongPress(); }
      }, 450);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const el = e.currentTarget;
      const st = stateOf(el);
      if (!st.down) return;
      const dx = e.clientX - st.sx;
      const dy = e.clientY - st.sy;
      if (!st.swiping) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { window.clearTimeout(st.timer); st.down = false; return; }
        if (Math.abs(dx) < 10) return;
        st.swiping = true; st.suppress = true;
        window.clearTimeout(st.timer);
      }
      st.dx = dx;
      el.style.transform = `translateX(${Math.sign(dx) * Math.min(Math.abs(dx) * 0.6, 90)}px)`;
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => finish(e.currentTarget, true),
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => finish(e.currentTarget, false),
    onPointerLeave: (e: React.PointerEvent<HTMLElement>) => { if (e.pointerType === 'mouse') finish(e.currentTarget, false); },
    onContextMenu: (e: React.MouseEvent<HTMLElement>) => e.preventDefault(),
    onClickCapture: (e: React.MouseEvent<HTMLElement>) => {
      const st = gestureStates.get(e.currentTarget);
      if (st?.suppress) { e.stopPropagation(); e.preventDefault(); st.suppress = false; }
    },
  };
}

function EmojiPicker({ onPick, onClose, docked = false, onSticker, startOnStickers = false }: { onPick: (emoji: string) => void; onClose: () => void; docked?: boolean; onSticker?: (st: SavedSticker) => void; startOnStickers?: boolean }) {
  const [group, setGroup] = useState(0);
  const [stk, setStk] = useState(!!onSticker && startOnStickers);
  return (
    <div dir="rtl" onPointerDown={e => e.preventDefault()} onMouseDown={e => e.preventDefault()} className={docked ? 'kan-pop mt-2 w-full bg-gray-900/70 border-t border-white/10' : 'absolute bottom-full mb-2 right-0 z-30 w-72 max-w-[92vw] bg-gray-900 border border-gray-700 rounded-2xl shadow-xl'}>
      <div className="flex items-center justify-between px-2 pt-2 border-b border-gray-800">
        <div className="flex">
          {onSticker && (
            <button onClick={() => setStk(true)} className={`px-2.5 py-1.5 text-xs font-semibold rounded-t-lg ${stk ? 'bg-gray-800 text-cyan-300' : 'text-gray-400 hover:text-white'}`}>ملصقات</button>
          )}
          {EMOJI_GROUPS.map((g, i) => (
            <button key={g.icon} onClick={() => { setStk(false); setGroup(i); }} className={`px-2 py-1.5 text-lg rounded-t-lg ${!stk && i === group ? 'bg-gray-800' : 'opacity-60 hover:opacity-100'}`}>
              {g.icon}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-white" aria-label="إغلاق"><X size={16} /></button>
      </div>
      {stk && onSticker ? <StickerPane onSend={onSticker} /> : (
      <div className={`grid gap-0.5 p-2 overflow-y-auto overscroll-contain ${docked ? 'grid-cols-8 min-[420px]:grid-cols-10 sm:grid-cols-14 h-60' : 'grid-cols-8 max-h-52'}`}>
        {EMOJI_GROUPS[group].items.map(e => (
          <button key={e} onClick={() => onPick(e)} className="h-9 text-2xl rounded-lg hover:bg-gray-800 active:scale-125 transition-transform">{e}</button>
        ))}
      </div>
      )}
    </div>
  );
}

// ============ Double-tap love: the burst follows the "like style" chosen in Settings ============
type LikeStyle = 'heart' | 'coin' | 'flames';
const getLikeStyle = (): LikeStyle => {
  try { const v = localStorage.getItem('kan_like_style'); return v === 'heart' || v === 'flames' ? v : 'coin'; } catch { return 'coin'; }
};
const setLikeStyleStored = (v: LikeStyle) => {
  try { localStorage.setItem('kan_like_style', v); } catch { /* ignore */ }
  window.dispatchEvent(new Event('kan-like-style'));
};
function useLikeStyle(): LikeStyle {
  const [v, setV] = useState<LikeStyle>(getLikeStyle);
  useEffect(() => {
    const on = () => setV(getLikeStyle());
    window.addEventListener('kan-like-style', on);
    return () => window.removeEventListener('kan-like-style', on);
  }, []);
  return v;
}

const KAN_GRAD = 'linear-gradient(135deg,#7c3aed,#06b6d4)';
function GradHeart({ px, id }: { px: number; id: string }) {
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" aria-hidden>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7c3aed" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
      <path fill={`url(#${id})`} d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.6 4.5 6.3 4.5c2 0 3.5 1.1 4.2 2.4h3c.7-1.3 2.2-2.4 4.2-2.4 3.7 0 5.4 3.9 3.9 7.3C19.5 16.400 12 21 12 21z" transform="translate(0 .5)" />
    </svg>
  );
}

// Coin broken into pieces that fly in and join into one coin.
const COIN_PIECES = [
  { clip: 'polygon(50% 50%, 0% 0%, 100% 0%)', from: { x: 0, y: -90, r: -50 } },
  { clip: 'polygon(50% 50%, 100% 0%, 100% 100%)', from: { x: 90, y: 0, r: 60 } },
  { clip: 'polygon(50% 50%, 100% 100%, 0% 100%)', from: { x: 0, y: 90, r: 40 } },
  { clip: 'polygon(50% 50%, 0% 100%, 0% 0%)', from: { x: -90, y: 0, r: -60 } },
];
function CoinBurst({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  const style = useLikeStyle();
  const big = size === 'lg';
  const dim = big ? 112 : 56;
  const k = big ? 1 : 0.5;
  let inner: React.ReactNode;
  if (style === 'heart') {
    inner = (
      <motion.div initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: [0.2, 1.3, 1, 1.1, 1], opacity: [0, 1, 1, 1, 0] }} transition={{ duration: 0.95, ease: 'easeOut' }} style={{ filter: 'drop-shadow(0 0 16px rgba(124,58,237,.7))' }}>
        <GradHeart px={dim} id={`gh-${size}`} />
      </motion.div>
    );
  } else if (style === 'flames') {
    const hearts = [{ x: -70, y: 40, d: 0 }, { x: 70, y: 40, d: 0.08 }, { x: 0, y: -60, d: 0.16 }];
    inner = (
      <div className="relative" style={{ width: dim, height: dim }}>
        {hearts.map((h, i) => (
          <motion.div key={i} className="absolute inset-0 flex items-center justify-center"
            initial={{ x: h.x * k, y: h.y * k, scale: 0.5, opacity: 0 }}
            animate={{ x: [h.x * k, h.x * k * 0.6, 0], y: [h.y * k, h.y * k * 0.6, 0], scale: [0.5, 0.8, i === 2 ? 1.25 : 0.4], opacity: [0, 1, i === 2 ? 1 : 0] }}
            transition={{ duration: 0.95, delay: h.d, ease: 'easeInOut' }}
            style={{ filter: 'drop-shadow(0 0 10px rgba(6,182,212,.8)) drop-shadow(0 0 14px rgba(124,58,237,.8))' }}>
            <GradHeart px={dim * 0.6} id={`gf-${size}-${i}`} />
            <motion.span className="absolute -top-2" animate={{ y: [0, -6, 0], opacity: [1, .6, 1] }} transition={{ duration: 0.4, repeat: 2 }} style={{ fontSize: dim * 0.28 }}>🔥</motion.span>
          </motion.div>
        ))}
      </div>
    );
  } else {
    inner = (
      <div className="relative" style={{ width: dim, height: dim }}>
        {COIN_PIECES.map((c, i) => (
          <motion.div key={i} className="absolute inset-0"
            initial={{ x: c.from.x * k, y: c.from.y * k, rotate: c.from.r, opacity: 0 }}
            animate={{ x: [c.from.x * k, 0, 0], y: [c.from.y * k, 0, 0], rotate: [c.from.r, 0, 0], opacity: [0, 1, 1, 1, 0] }}
            transition={{ duration: 1, ease: 'easeOut', times: [0, 0.55, 1] }}>
            <div className="w-full h-full rounded-full flex items-center justify-center font-extrabold tracking-wider text-white border-4 border-white/80"
              style={{ clipPath: c.clip, background: KAN_GRAD, boxShadow: '0 0 34px rgba(124,58,237,.6)', fontSize: dim * 0.27 }}>
              <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">KAN</span>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">{inner}</div>
  );
}

// Big photos are scaled down (max 1920px) before upload: same look on a phone, a fraction of the time to publish.
async function shrinkPhoto(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 600 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    const type = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise<Blob | null>(res => c.toBlob(res, type, 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + (type === 'image/webp' ? '.webp' : '.jpg'), { type });
  } catch { return file; }
}

// Grabs a frame of a video file to use as its cover (null when the browser cannot decode the file).
function captureVideoFrame(file: File): Promise<Blob | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = url;
    const finish = (blob: Blob | null) => { URL.revokeObjectURL(url); resolve(blob); };
    const timeout = window.setTimeout(() => finish(null), 8000);
    video.onerror = () => { window.clearTimeout(timeout); finish(null); };
    video.onloadedmetadata = () => { video.currentTime = Math.min(1, (video.duration || 2) / 3); };
    video.onseeked = () => {
      window.clearTimeout(timeout);
      const scale = Math.min(1, 1280 / Math.max(video.videoWidth, 1));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) { finish(null); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(b => finish(b), 'image/jpeg', 0.82);
    };
  });
}

// The visible area of the screen (shrinks when the on-screen keyboard is open).
function useVisualViewport() {
  const read = () => ({ height: window.visualViewport?.height ?? window.innerHeight, top: window.visualViewport?.offsetTop ?? 0 });
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const update = () => setVp(read());
    const vv = window.visualViewport;
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return vp;
}

// Any video file counts as a video (mp4, mov, mkv, avi, 3gp ...); a device that cannot play it gets a download button.
function detectMediaKind(file: File): 'image' | 'video' | 'file' {
  if (/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return 'image';
  if (file.type.startsWith('video/') || /\.(mp4|m4v|mov|webm|mkv|avi|3gp|3g2|wmv|flv|mpg|mpeg|ogv)$/i.test(file.name)) return 'video';
  return 'file';
}

// ============ Chat helpers ============
function safeExt(name?: string): string {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(name ?? '');
  return m ? m[1].toLowerCase() : 'bin';
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Short text shown when a message is quoted in a reply.
function describeMessage(m: Message): string {
  if (m.text) return m.text;
  if (isStickerName(m.media?.name)) return '🏷️ ملصق';
  switch (m.media?.type) {
    case 'image': return '📷 صورة';
    case 'video': return '🎥 فيديو';
    case 'voice': return '🎤 رسالة صوتية';
    case 'file': return `📎 ${m.media.name || 'ملف'}`;
    default: return '';
  }
}

// Saves a file to the device (works for private signed links too).
async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    const blobUrl = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch (e) {
    console.error(e);
    window.open(url, '_blank');
  }
}

// ============ Install as an app ============
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let installPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event('kan-install-change'));
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    window.dispatchEvent(new Event('kan-install-change'));
  });
}

function isInstalledApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

async function promptInstall(): Promise<boolean> {
  if (!installPrompt) return false;
  const prompt = installPrompt;
  installPrompt = null;
  await prompt.prompt();
  const choice = await prompt.userChoice;
  window.dispatchEvent(new Event('kan-install-change'));
  return choice.outcome === 'accepted';
}

function useInstallState() {
  const [, force] = useState(0);
  useEffect(() => {
    const update = () => force(n => n + 1);
    window.addEventListener('kan-install-change', update);
    return () => window.removeEventListener('kan-install-change', update);
  }, []);
  return { installed: isInstalledApp(), canPrompt: installPrompt !== null, ios: isIos() };
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'اسم المستخدم أو كلمة المرور غير صحيحة';
  if (m.includes('not confirmed')) return 'يرجى تأكيد بريدك الإلكتروني أولاً';
  if (m.includes('already registered')) return 'هذا البريد مسجّل بالفعل';
  if (m.includes('rate limit') || m.includes('too many')) return 'محاولات كثيرة، حاول لاحقاً';
  if (m.includes('password')) return 'كلمة المرور غير مقبولة (6 أحرف على الأقل)';
  if (m.includes('email')) return 'البريد الإلكتروني غير صالح';
  return 'حدث خطأ، حاول مرة أخرى';
}

function StatusScreen({ text, actions }: { text: string; actions?: { label: string; onClick: () => void }[] }) {
  return (
    <div dir="rtl" className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 p-4 text-center text-gray-300">
      <img src={LOGO_URL} alt="" className="w-16 h-16 rounded-2xl" />
      <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">KAN</h1>
      <p>{text}</p>
      {actions?.map(a => (
        <button key={a.label} onClick={a.onClick} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-white">
          {a.label}
        </button>
      ))}
    </div>
  );
}

// ============ Main App ============
export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedFrontier, setFeedFrontier] = useState(0);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const postsRef = useRef<Post[]>([]);
  postsRef.current = posts;
  const feedBusy = useRef(false);
  const feedCursor = useRef<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'reels' | 'videos' | 'search' | 'create' | 'profile' | 'settings' | 'messages' | 'notifications'>('feed');
  const [showLogin, setShowLogin] = useState(true);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  const currentUser = users.find(u => u.id === currentUserId) || null;
  useEffect(() => {
    if (!currentUserId) { setStoryRings(new Map()); return; }
    let off = false;
    const load = async () => {
      const { data } = await supabase.from('stories').select('id,user_id').gt('expires_at', new Date().toISOString()).limit(500);
      const { data: v } = await supabase.from('story_views').select('story_id').eq('viewer_id', currentUserId).gt('viewed_at', new Date(Date.now() - 86400000).toISOString());
      if (off) return;
      const seen = new Set((v ?? []).map(x => (x as { story_id: string }).story_id));
      const byUser = new Map<string, 'new' | 'seen'>();
      for (const r of (data ?? []) as { id: string; user_id: string }[]) {
        const unseen = r.user_id === currentUserId || !seen.has(r.id);
        if (unseen || !byUser.has(r.user_id)) byUser.set(r.user_id, unseen ? 'new' : 'seen');
      }
      setStoryRings(byUser);
    };
    void load();
    const t = window.setInterval(() => void load(), 60000);
    window.addEventListener('kan-stories-changed', load);
    return () => { off = true; window.clearInterval(t); window.removeEventListener('kan-stories-changed', load); };
  }, [currentUserId]);

  // Keys that failed to persist (quota exceeded, storage disabled, ...)
  const [failedKeys] = useState<string[]>([]);
  const storageError = failedKeys.length > 0;

  const [authReady, setAuthReady] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  const refreshUsers = async () => {
    try {
      setUsers(await loadUsers());
      setLoadError('');
    } catch (e) {
      console.error(e);
      setLoadError('تعذّر تحميل البيانات من الخادم');
    }
  };

  useEffect(() => {
    if (!isConfigured) { setAuthReady(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user.id ?? null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUserId) { setUsers([]); setLoadedFor(null); return; }
    refreshUsers().finally(() => setLoadedFor(currentUserId));
  }, [currentUserId]);

  // Feed: first page, then more as you scroll. New posts from other people wait behind a
  // "new posts" button until you refresh.
  const loadFeedFirst = async () => {
    if (feedBusy.current) return;
    feedBusy.current = true;
    setFeedLoading(true);
    try {
      const page = await fetchPosts({ limit: FEED_PAGE });
      setPosts(prev => mergePosts(prev, page));
      const last = page[page.length - 1];
      feedCursor.current = last ? last.cursor : null;
      setFeedFrontier(last ? last.timestamp : 0);
      setFeedHasMore(page.length === FEED_PAGE);
      setNewPostsCount(0);
    } catch (e) {
      console.error(e);
    } finally {
      feedBusy.current = false;
      setFeedLoading(false);
    }
  };

  const loadFeedMore = async () => {
    if (feedBusy.current || !feedHasMore || !feedCursor.current) return;
    feedBusy.current = true;
    setFeedLoading(true);
    try {
      const page = await fetchPosts({ before: feedCursor.current, limit: FEED_PAGE });
      setPosts(prev => mergePosts(prev, page));
      const last = page[page.length - 1];
      if (last) {
        feedCursor.current = last.cursor;
        setFeedFrontier(last.timestamp);
      }
      setFeedHasMore(page.length === FEED_PAGE);
    } catch (e) {
      console.error(e);
    } finally {
      feedBusy.current = false;
      setFeedLoading(false);
    }
  };

  // Used by the Reels / Videos tabs and profiles to load their own pages into the cache.
  const loadPostsPage = async (opts: FetchPostsOptions): Promise<Post[]> => {
    const page = await fetchPosts(opts);
    setPosts(prev => mergePosts(prev, page));
    return page;
  };

  useEffect(() => {
    if (!currentUserId) { setPosts([]); return; }
    void loadFeedFirst();
    let timer: number | undefined;
    // Likes and comments on posts you already see update live; new posts do not jump in.
    const refreshExisting = async () => {
      const ids = postsRef.current.slice(0, 60).map(p => p.id);
      if (ids.length === 0) return;
      try {
        const fresh = await fetchPosts({ ids, limit: 60 });
        const byId = new Map(fresh.map(p => [p.id, p] as const));
        setPosts(prev => prev.map(p => byId.get(p.id) ?? p));
      } catch (e) {
        console.error(e);
      }
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { void refreshExisting(); void refreshUsers(); }, 800);
    };
    const channel = supabase.channel('kan-live');
    for (const table of ['profiles', 'follows', 'comments', 'post_likes', 'comment_likes']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, schedule);
    }
    channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, payload => {
      const id = (payload.old as { id?: string }).id;
      if (id) setPosts(prev => prev.filter(p => p.id !== id));
    });
    channel.subscribe();
    const onVisible = () => { if (document.visibilityState === 'visible') schedule(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const conversationsRef = useRef<Conversation[]>([]);
  conversationsRef.current = conversations;
  recentChatActivity = () => {
    const m = new Map<string, number>();
    for (const c of conversationsRef.current) for (const id of c.participants) if (id !== currentUserId) m.set(id, Math.max(m.get(id) ?? 0, c.lastActivity));
    return m;
  };

  // Latest screen state for the live handlers (they live inside long-running subscriptions).
  const [toast, setToast] = useState<InAppToast | null>(null);
  const toastRef = useRef<(t: Omit<InAppToast, 'id'>) => void>(() => undefined);
  toastRef.current = t => { if (toastsEnabled()) setToast({ ...t, id: Date.now() }); };
  const [soundOn, setSoundOn] = useState(soundEnabled());
  const [bannersOn, setBannersOn] = useState(toastsEnabled());
  const toggleSoundQuick = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) { unlockAudio(); playSound('receive'); }
  };
  const toggleBannersQuick = () => {
    const next = !bannersOn;
    setBannersOn(next);
    setToastsEnabled(next);
    if (!next) setToast(null);
  };
  // First Back on the home screen only warns; a second one within a moment leaves the app.
  useEffect(() => {
    const onHint = () => setToast({ id: Date.now(), title: 'اضغط رجوع مرة أخرى للخروج', body: '', onOpen: () => undefined });
    window.addEventListener('kan-exit-hint', onHint);
    return () => window.removeEventListener('kan-exit-hint', onHint);
  }, []);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const uiRef = useRef<{ tab: string; chatWith: string | null; groupId: string | null; users: User[]; groups: Group[] }>({ tab: 'feed', chatWith: null, groupId: null, users: [], groups: [] });
  uiRef.current = { tab: activeTab, chatWith: selectedChat, groupId: activeGroupId, users, groups };
  const navRef = useRef<{ openChat: (id: string) => void; openGroup: (id: string) => void; openNotifs: () => void }>({ openChat: () => undefined, openGroup: () => undefined, openNotifs: () => undefined });

  // Groups: load, then apply new messages, reactions, read receipts and membership changes live.
  const reloadGroups = async () => {
    if (!currentUserId) return;
    try {
      setGroups(await loadGroups());
    } catch (e) {
      console.error(e);
    }
  };
  const reloadGroupsRef = useRef(reloadGroups);
  reloadGroupsRef.current = reloadGroups;
  useEffect(() => {
    if (!currentUserId) { setGroups([]); return; }
    void reloadGroupsRef.current();
    let timer: number | undefined;
    const soon = () => { window.clearTimeout(timer); timer = window.setTimeout(() => void reloadGroupsRef.current(), 300); };
    const channel = supabase
      .channel('kan-groups')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' }, async payload => {
        const row = payload.new as unknown as GroupMsgRow;
        if (row.sender_id !== currentUserId && !row.is_system) {
          playSound('receive');
          const ui = uiRef.current;
          if (document.visibilityState === 'visible' && !(ui.tab === 'messages' && ui.groupId === row.group_id)) {
            const g = ui.groups.find(x => x.id === row.group_id);
            const who = ui.users.find(x => x.id === row.sender_id)?.displayName ?? '';
            toastRef.current({ title: g?.name ?? 'مجموعة', body: `${who}: ${messagePreviewText(row.text, row.media_type)}`, avatar: g?.avatar, group: true, onOpen: () => navRef.current.openGroup(row.group_id) });
          }
        }
        const urls = row.media_path ? await signPaths([row.media_path]) : new Map<string, string>();
        const msg = groupRowToMessage(row, urls);
        setGroups(prev => {
          const g = prev.find(x => x.id === row.group_id);
          if (!g) { soon(); return prev; }
          if (g.messages.some(m => m.id === msg.id)) return prev;
          return prev.map(x => x.id !== row.group_id ? x : { ...x, lastActivity: msg.timestamp, messages: [...x.messages, msg] });
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'group_messages' }, payload => {
        const row = payload.new as { id?: string; text?: string; edited_at?: string | null };
        if (!row.id) return;
        setGroups(prev => prev.map(g => g.messages.some(m => m.id === row.id)
          ? { ...g, messages: g.messages.map(m => (m.id === row.id ? { ...m, text: row.text ?? m.text, editedAt: row.edited_at ? new Date(row.edited_at).getTime() : m.editedAt } : m)) }
          : g));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'group_messages' }, payload => {
        const old = payload.old as { id?: string };
        if (!old.id) return;
        setGroups(prev => prev.map(g => g.messages.some(m => m.id === old.id) ? { ...g, messages: g.messages.filter(m => m.id !== old.id) } : g));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_message_reads' }, payload => {
        const row = payload.new as { message_id: string; user_id: string };
        setGroups(prev => prev.map(g => g.messages.some(m => m.id === row.message_id)
          ? { ...g, messages: g.messages.map(m => m.id === row.message_id && !m.readBy.includes(row.user_id) ? { ...m, readBy: [...m.readBy, row.user_id] } : m) }
          : g));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_message_reactions' }, payload => {
        const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as { message_id?: string; user_id?: string; emoji?: string };
        if (!row.message_id || !row.user_id) return;
        const { message_id: messageId, user_id: userId } = row;
        const emoji = payload.eventType === 'DELETE' ? null : row.emoji ?? null;
        setGroups(prev => prev.map(g => g.messages.some(m => m.id === messageId)
          ? {
              ...g,
              messages: g.messages.map(m => m.id !== messageId ? m : {
                ...m,
                reactions: [...m.reactions.filter(r => r.userId !== userId), ...(emoji ? [{ userId, emoji }] : [])],
              }),
            }
          : g));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_group_members' }, soon)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_groups' }, soon)
      .subscribe();
    const onVisible = () => { if (document.visibilityState === 'visible') soon(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Notifications: likes, comments, follows, group invites. Live, and the phone gets a push for the ones you left on.
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  useEffect(() => {
    if (!currentUserId) { setNotifications([]); return; }
    let cancelled = false;
    void loadNotifications().then(list => { if (!cancelled) setNotifications(list); }).catch(e => console.error(e));
    const channel = supabase
      .channel('kan-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` }, payload => {
        const n = rowToNotification(payload.new as unknown as NotificationRow);
        playSound('receive');
        {
          const ui = uiRef.current;
          if (document.visibilityState === 'visible' && ui.tab !== 'notifications') {
            const actor = n.actorId ? ui.users.find(x => x.id === n.actorId) : undefined;
            toastRef.current({ title: actor?.displayName ?? 'إشعار جديد', body: notificationText(n), avatar: actor?.avatar, onOpen: () => (n.postId ? openPost(n.postId, n.commentId ?? undefined) : navRef.current.openNotifs()) });
          }
        }
        setNotifications(prev => (prev.some(x => x.id === n.id) ? prev : [n, ...prev].slice(0, 100)));
      })
      .subscribe();
    return () => { cancelled = true; void supabase.removeChannel(channel); };
  }, [currentUserId]);
  const notifUnread = notifications.filter(n => !n.read).length;
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  const refreshConversations = async () => {
    if (!currentUserId) return;
    try {
      setConversations(await loadConversations(currentUserId));
    } catch (e) {
      console.error(e);
    }
  };

  // Private chat: load conversations, then apply new messages and read receipts live.
  useEffect(() => {
    if (!currentUserId) { setConversations([]); return; }
    void refreshConversations();
    const channel = supabase
      .channel('kan-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async payload => {
        const row = payload.new as unknown as MessageRow;
        if (row.sender_id !== currentUserId) {
          playSound('receive');
          markDelivered(currentUserId);
          const ui = uiRef.current;
          if (document.visibilityState === 'visible' && !(ui.tab === 'messages' && ui.chatWith === row.sender_id)) {
            const sender = ui.users.find(x => x.id === row.sender_id);
            toastRef.current({ title: sender?.displayName ?? 'رسالة جديدة', body: messagePreviewText(row.text, row.media_type), avatar: sender?.avatar, onOpen: () => navRef.current.openChat(row.sender_id) });
          }
        }
        if (!conversationsRef.current.some(c => c.id === row.conversation_id)) {
          await refreshConversations();
          return;
        }
        const urls = row.media_path ? await signPaths([row.media_path]) : new Map<string, string>();
        const msg = rowToMessage(row, urls);
        setConversations(prev => prev.map(c =>
          c.id !== row.conversation_id || c.messages.some(m => m.id === msg.id)
            ? c
            : { ...c, messages: [...c.messages, msg], lastActivity: msg.timestamp }
        ));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
        const row = payload.new as unknown as MessageRow;
        setConversations(prev => prev.map(c =>
          c.id !== row.conversation_id
            ? c
            : { ...c, messages: c.messages.map(m => (m.id === row.id ? { ...m, text: row.text ?? m.text, editedAt: row.edited_at ? new Date(row.edited_at).getTime() : m.editedAt, read: row.read_at !== null, delivered: row.read_at !== null || (row.delivered_at ?? null) !== null } : m)) }
        ));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, payload => {
        const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as { message_id?: string; user_id?: string; emoji?: string };
        if (!row.message_id || !row.user_id) return;
        const { message_id: messageId, user_id: userId } = row;
        const emoji = payload.eventType === 'DELETE' ? null : row.emoji ?? null;
        setConversations(prev => prev.map(c =>
          c.messages.some(m => m.id === messageId)
            ? {
                ...c,
                messages: c.messages.map(m =>
                  m.id !== messageId
                    ? m
                    : { ...m, reactions: [...(m.reactions ?? []).filter(r => r.userId !== userId), ...(emoji ? [{ userId, emoji }] : [])] }
                ),
              }
            : c
        ));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
        const id = (payload.old as { id?: string }).id;
        if (!id) return;
        setConversations(prev => prev.map(c =>
          c.messages.some(m => m.id === id) ? { ...c, messages: c.messages.filter(m => m.id !== id) } : c
        ));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, () => {
        void refreshConversations();
      })
      .subscribe();
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshConversations(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Audio can only start after a tap; unlock it on the first one.
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Register the service worker and re-attach notifications to whoever is signed in.
  useEffect(() => {
    if (!currentUserId || !pushSupported()) return;
    void (async () => {
      try {
        const reg = await getServiceWorker();
        if (reg && Notification.permission === 'granted') {
          await navigator.serviceWorker.ready;
          await savePushSubscription(reg);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [currentUserId]);

  // Every profile / post you open goes on one stack, so Back (phone or arrow) returns to exactly where you were.
  type Screen = { k: 'profile'; id: string; y: number } | { k: 'post'; postId: string; commentId?: string };
  const [screens, setScreens] = useState<Screen[]>([]);
  const screensRef = useRef<Screen[]>([]);
  screensRef.current = screens;
  const viewedUserId = (() => {
    for (let i = screens.length - 1; i >= 0; i--) {
      const sc = screens[i];
      if (sc.k === 'profile') return sc.id;
    }
    return null;
  })();
  const topScreen = screens[screens.length - 1];
  const viewPost = topScreen && topScreen.k === 'post' ? topScreen : null;
  const pushScreen = (sc: Screen) => setScreens(prev => {
    const last = prev[prev.length - 1];
    if (last && last.k === 'profile' && sc.k === 'profile' && last.id === sc.id) return prev;
    if (last && last.k === 'post' && sc.k === 'post' && last.postId === sc.postId && last.commentId === sc.commentId) return prev;
    return [...prev.slice(-19), sc];
  });
  const popScreen = () => {
    const top = screensRef.current[screensRef.current.length - 1];
    if (!top) return;
    setScreens(prev => prev.slice(0, -1));
    if (top.k === 'profile') restoreScroll(top.y);
  };
  const goTab = (tab: typeof activeTab) => {
    setScreens([]);
    setActiveTab(tab);
  };
  navRef.current = {
    openChat: id => { setSelectedChat(id); goTab('messages'); },
    openGroup: id => { setOpenGroupId(id); goTab('messages'); },
    openNotifs: () => goTab('notifications'),
  };
  // Home button: already on the feed -> one tap scrolls to the top, a quick second tap refreshes it.
  const lastHomeTap = useRef(0);
  const [homeRefreshing, setHomeRefreshing] = useState(false);
  openPostHandler = (postId, commentId) => pushScreen({ k: 'post', postId, commentId });
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setIntroDone(true), 1500);
    return () => window.clearTimeout(t);
  }, []);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [menuOpen]);
  // Phone back button: profile -> chat -> tab -> home, like any app.
  useBackLayer(currentUserId !== null && screens.length > 0, popScreen, 30);
  useBackLayer(currentUserId !== null && selectedChat !== null, () => setSelectedChat(null), 20);
  useBackLayer(currentUserId !== null && activeTab !== 'feed', () => setActiveTab('feed'), 10);
  // Home, scrolled down: the phone's back button first takes you back to the top of the page.
  setBackFallback(() => {
    if (currentUserId !== null && activeTab === 'feed' && !viewedUserId && selectedChat === null && window.scrollY > 120) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (!feedBusy.current) {
        setHomeRefreshing(true);
        void loadFeedFirst().finally(() => window.setTimeout(() => setHomeRefreshing(false), 400));
      }
      return true;
    }
    return false;
  });
  const onHomeTap = () => {
    if (activeTab !== 'feed' || viewedUserId) { goTab('feed'); return; }
    const now = Date.now();
    if (now - lastHomeTap.current < 500) {
      lastHomeTap.current = 0;
      setHomeRefreshing(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      void loadFeedFirst().finally(() => window.setTimeout(() => setHomeRefreshing(false), 400));
      return;
    }
    lastHomeTap.current = now;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openProfile = (id: string) => {
    if (id === currentUserId) {
      goTab('profile');
    } else {
      pushScreen({ k: 'profile', id, y: window.scrollY });
      window.scrollTo(0, 0);
    }
  };
  openProfileHandler = openProfile;

  // Links such as  .../#/post/<id>  or  .../#/u/<id>  open the post / profile straight away, from anywhere.
  useEffect(() => {
    if (!currentUserId) return;
    const handle = () => {
      const m = window.location.hash.match(/^#\/(post|u)\/([0-9a-f-]{36})(?:\/([0-9a-f-]{36}))?/i);
      if (!m) return;
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
      if (m[1] === 'post') pushScreen({ k: 'post', postId: m[2], commentId: m[3] });
      else if (m[2] === currentUserId) goTab('profile');
      else pushScreen({ k: 'profile', id: m[2], y: 0 });
    };
    handle();
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, [currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const unreadCount = currentUser
    ? conversations
        .filter(c => c.participants.includes(currentUser.id))
        .reduce((sum, c) => sum + c.messages.filter(m => m.senderId !== currentUser.id && !m.read).length, 0)
      + groups.reduce((sum, g) => sum + groupUnread(g, currentUser.id), 0)
    : 0;

  const baseTitleRef = useRef(document.title);
  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitleRef.current}` : baseTitleRef.current;
  }, [unreadCount]);

  if (!isConfigured) {
    return <StatusScreen text="لم يتم ضبط اتصال Supabase (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY)." />;
  }
  if (!introDone || !authReady || (currentUserId && loadedFor !== currentUserId)) {
    return <SplashScreen />;
  }
  if (currentUserId && !currentUser) {
    return (
      <StatusScreen
        text={loadError || 'تعذّر العثور على ملفك الشخصي'}
        actions={[
          { label: 'إعادة المحاولة', onClick: () => { void refreshUsers(); } },
          { label: 'تسجيل الخروج', onClick: () => { void supabase.auth.signOut(); } },
        ]}
      />
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        onRefresh={refreshUsers}
        showLogin={showLogin}
        setShowLogin={setShowLogin}
      />
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-950 text-white font-sans">
      <AnimatePresence>{toast && <ToastBanner key={toast.id} toast={toast} onClose={() => setToast(null)} />}</AnimatePresence>
      {viewPost && <PostViewer target={viewPost} posts={posts} setPosts={setPosts} users={users} currentUser={currentUser} onOpenProfile={openProfile} onClose={popScreen} />}
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/70 backdrop-blur-xl border-b border-white/5">
        <div className="w-full px-3 min-[400px]:px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="" className="w-8 h-8 rounded-lg" />
            <h1 className="text-xl font-bold kan-gradient-text">
              KAN
            </h1>
          </div>
          <div ref={menuRef} className="relative flex items-center">
            <AnimatePresence initial={false}>
              {menuOpen && (
                <motion.div
                  key="bar"
                  initial={{ opacity: 0, x: 14, scale: 0.94 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 14, scale: 0.94 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="flex items-center gap-0.5 p-1 ml-2 rounded-full bg-gray-900/80 backdrop-blur-md border border-white/10 shadow-lg shadow-black/30"
                >
                  {([
                    { tab: 'notifications' as const, label: 'الإشعارات', Icon: Bell, badge: notifUnread },
                    { tab: 'messages' as const, label: 'الرسائل', Icon: MessageSquare, badge: unreadCount },
                    { tab: 'search' as const, label: 'بحث', Icon: Search, badge: 0 },
                    { tab: 'settings' as const, label: 'الإعدادات', Icon: Settings, badge: 0 },
                  ]).map(({ tab, label, Icon, badge }) => {
                    const on = activeTab === tab && !viewedUserId;
                    return (
                      <button
                        key={tab}
                        onClick={() => goTab(tab)}
                        aria-label={label}
                        className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${on ? 'bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-md shadow-violet-500/30' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                      >
                        <Icon size={18} />
                        {badge > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-rose-500 ring-2 ring-gray-950 rounded-full text-[10px] flex items-center justify-center font-bold text-white">{badge > 9 ? '9+' : badge}</span>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? 'إغلاق القائمة' : 'القائمة'}
              aria-expanded={menuOpen}
              className={`relative w-10 h-10 rounded-full flex items-center justify-center border transition-all active:scale-90 ${menuOpen ? 'bg-violet-500/15 border-violet-400/30 text-violet-200' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'}`}
            >
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
              {!menuOpen && unreadCount + notifUnread > 0 && <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-gray-950" />}
            </button>
          </div>
        </div>
      </header>

      {storageError && (
        <div
          role="alert"
          className="fixed top-14 left-0 right-0 z-40 bg-red-600/95 text-white text-sm text-center px-4 py-2"
        >
          ⚠️ مساحة التخزين في المتصفح ممتلئة — لن يتم حفظ آخر التغييرات. احذف بعض الصور أو الفيديوهات.
        </div>
      )}

      {/* Main Content */}
      <main className="kan-enter pt-16 pb-20 w-full min-h-screen md:px-4 lg:px-8">
        <InstallBanner />
        <AnimatePresence mode="wait" initial={false}>
          {viewedUserId && (
            <motion.div key={`user-${viewedUserId}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
              <UserProfile
                userId={viewedUserId}
                currentUser={currentUser}
                users={users}
                posts={posts}
                setUsers={setUsers}
                setPosts={setPosts}
                onOpenProfile={openProfile}
                onLoadPage={loadPostsPage}
                onStartChat={(otherUserId) => {
                  setSelectedChat(otherUserId);
                  goTab('messages');
                }}
                onBack={popScreen}
              />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'feed' && (
            <motion.div key="feed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
              <Feed posts={posts} setPosts={setPosts} users={users} currentUser={currentUser} onOpenProfile={openProfile} frontier={feedFrontier} hasMore={feedHasMore} loading={feedLoading} newCount={newPostsCount} onRefresh={loadFeedFirst} onLoadMore={loadFeedMore} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'search' && (
            <motion.div key="search" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
              <SearchTab
                users={users}
                currentUser={currentUser}
                setUsers={setUsers}
                onOpenProfile={openProfile}
                onStartChat={(otherUserId) => {
                  setSelectedChat(otherUserId);
                  goTab('messages');
                }}
              />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'reels' && (
            <motion.div key="reels" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
              <ReelsTab onBack={() => goTab('feed')} posts={posts} setPosts={setPosts} users={users} setUsers={setUsers} currentUser={currentUser} onOpenProfile={openProfile} onCreate={() => goTab('create')} onLoadPage={loadPostsPage} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'videos' && (
            <motion.div key="videos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
              <VideosTab posts={posts} setPosts={setPosts} users={users} currentUser={currentUser} onOpenProfile={openProfile} onCreate={() => goTab('create')} onLoadPage={loadPostsPage} setUsers={setUsers} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'create' && (
            <motion.div key="create" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
              <CreatePost currentUser={currentUser} setPosts={setPosts} setActiveTab={goTab} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
              <ProfileTab currentUser={currentUser} users={users} posts={posts} setUsers={setUsers} setPosts={setPosts} onOpenProfile={openProfile} onLoadPage={loadPostsPage} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'notifications' && (
            <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
              <NotificationsTab
                currentUser={currentUser}
                users={users}
                notifications={notifications}
                setNotifications={setNotifications}
                onOpenProfile={openProfile}
                onOpenMine={() => goTab('profile')}
                onOpenGroup={id => { setOpenGroupId(id); goTab('messages'); }}
                soundOn={soundOn} bannersOn={bannersOn} onToggleSound={toggleSoundQuick} onToggleBanners={toggleBannersQuick}
              />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
              <SettingsTab currentUser={currentUser} setUsers={setUsers} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'messages' && (
            <motion.div key="messages" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
              <MessagesTab
                currentUser={currentUser}
                users={users}
                conversations={conversations}
                setConversations={setConversations}
                groups={groups}
                setGroups={setGroups}
                reloadGroups={reloadGroups}
                openGroupId={openGroupId}
                onGroupOpened={() => setOpenGroupId(null)}
                onActiveGroupChange={setActiveGroupId}
                selectedChat={selectedChat}
                setSelectedChat={setSelectedChat}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} className="z-50 bg-gray-950/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-8px_24px_rgba(0,0,0,0.35)]">
        <div className="w-full grid grid-cols-[1fr_auto_1fr] items-end gap-1 px-[max(0.5rem,env(safe-area-inset-left))] md:px-6 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          {(() => {
            const tabs = {
              feed: { icon: Home, label: 'الرئيسية' },
              reels: { icon: Film, label: 'ريلز' },
              videos: { icon: PlayCircle, label: 'فيديوهات' },
              profile: { icon: User, label: 'حسابي' },
            };
            const tabButton = (tab: 'feed' | 'reels' | 'videos' | 'profile') => {
              const { icon: Icon, label } = tabs[tab];
              const active = activeTab === tab && !viewedUserId;
              return (
                <button
                  key={tab}
                  onClick={() => (tab === 'feed' ? onHomeTap() : goTab(tab))}
                  className={`relative flex-1 min-w-0 flex flex-col items-center gap-0.5 px-0.5 py-2 rounded-2xl transition-colors active:scale-95 ${active ? 'text-white' : 'text-gray-300 hover:text-white'}`}
                >
                  <Icon size={24} strokeWidth={active ? 2.4 : 2} className={`${active ? 'text-cyan-300' : ''} ${tab === 'feed' && homeRefreshing ? 'animate-spin' : ''}`} />
                  <span className={`text-[12px] leading-tight max-w-full ${active ? "font-bold text-white" : "font-semibold"}`}>{label}</span>
                  <span className={`h-0.5 w-5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`} />
                </button>
              );
            };
            const createActive = activeTab === 'create' && !viewedUserId;
            return (
              <>
                <div className="flex items-end">
                  {tabButton('feed')}
                  {tabButton('reels')}
                </div>
                <button onClick={() => goTab('create')} className="relative flex flex-col items-center -mt-6 px-2 pb-1.5 active:scale-95" aria-label="نشر">
                  <span className={`kan-fab w-12 h-12 min-[400px]:w-14 min-[400px]:h-14 rounded-full flex items-center justify-center ring-4 ring-gray-950 ${createActive ? 'scale-105' : ''}`}>
                    <Plus size={28} strokeWidth={2.6} className="text-white" />
                  </span>
                  <span className="mt-1 text-[11px] font-bold kan-gradient-text">نشر</span>
                </button>
                <div className="flex items-end">
                  {tabButton('videos')}
                  {tabButton('profile')}
                </div>
              </>
            );
          })()}
        </div>
      </nav>
    </div>
  );
}

// ============ Auth Screen ============
function AuthScreen({ onRefresh, showLogin, setShowLogin }: {
  onRefresh: () => Promise<void>;
  showLogin: boolean;
  setShowLogin: (v: boolean) => void;
}) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadFile, setError: setUploadError } = useImageUpload(2);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار صورة فقط');
      return;
    }
    try {
      const url = await shrinkImage(await uploadFile(file), 256);
      setAvatar(url);
      setUploadError('');
    } catch (err) {
      setError(err as string);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('أدخل اسم المستخدم وكلمة المرور');
      return;
    }
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: await usernameToEmail(username),
        password,
      });
      if (err) setError(translateAuthError(err.message));
    } catch {
      setError('حدث خطأ في الاتصال، حاول مرة أخرى');
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async () => {
    const uname = username.trim().replace(/^@/, '');
    const dname = displayName.trim();
    if (!uname || !dname || !password) {
      setError('جميع الحقول مطلوبة');
      return;
    }
    if (!/^[\p{L}\p{N}_.]{3,30}$/u.test(uname)) {
      setError(signupErrorMessage('invalid_username'));
      return;
    }
    if (password.length < 6) {
      setError(signupErrorMessage('weak_password'));
      return;
    }
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const { error: fnErr } = await supabase.functions.invoke('signup', {
        body: { username: uname, display_name: dname, password },
      });
      if (fnErr) {
        let code = '';
        const res = (fnErr as { context?: Response }).context;
        if (res && typeof res.json === 'function') {
          try { code = ((await res.json()) as { error?: string }).error ?? ''; } catch { /* ignore */ }
        }
        setError(signupErrorMessage(code));
        return;
      }
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: await usernameToEmail(uname),
        password,
      });
      if (signInErr || !data.user) {
        setInfo('تم إنشاء الحساب، سجّل الدخول الآن.');
        setShowLogin(true);
        return;
      }
      if (avatar) {
        await supabase.from('profiles').update({ avatar }).eq('id', data.user.id);
      }
      await onRefresh();
    } catch {
      setError('حدث خطأ في الاتصال، حاول مرة أخرى');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="" className="w-20 h-20 mx-auto mb-3 rounded-2xl shadow-lg shadow-violet-500/20" />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            KAN
          </h1>
          <p className="text-gray-400">شبكة التواصل الاجتماعي</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setShowLogin(true); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${
                showLogin ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => { setShowLogin(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${
                !showLogin ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              حساب جديد
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          {info && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm text-center">
              {info}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">اسم المستخدم</label>
              <input
                dir="ltr"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="username"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            {!showLogin && (
              <>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">الاسم المعروض</label>
                  <input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="الاسم الكامل"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Avatar Upload */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">الصورة الشخصية (اختياري)</label>
                  <div className="flex items-center gap-4">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="relative group"
                    >
                      {avatar ? (
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-violet-500">
                          <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 flex flex-col items-center justify-center text-gray-400 group-hover:border-violet-500 group-hover:text-violet-400 transition-all">
                          <Camera size={20} />
                          <span className="text-[10px] mt-1">اختر صورة</span>
                        </div>
                      )}
                    </button>
                    {avatar && (
                      <button
                        onClick={() => setAvatar('')}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        إزالة
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-sm text-gray-400 mb-1 block">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') (showLogin ? handleLogin : handleRegister)(); }}
                  placeholder="6 أحرف على الأقل"
                  className="w-full px-4 py-3 pl-12 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                />
                <button
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={showLogin ? handleLogin : handleRegister}
              disabled={busy}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-xl text-white font-medium shadow-lg shadow-violet-500/25 disabled:opacity-60"
            >
              {busy ? '...' : showLogin ? 'دخول' : 'إنشاء حساب'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============ Feed ============
function Feed({ posts, setPosts, users, currentUser, onOpenProfile, frontier, hasMore, loading, onRefresh, onLoadMore }: {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  users: User[];
  currentUser: User;
  onOpenProfile: (id: string) => void;
  frontier: number;
  hasMore: boolean;
  loading: boolean;
  newCount: number;
  onRefresh: () => void | Promise<unknown>;
  onLoadMore: () => void;
}) {
  const [mode, setMode] = useState<'all' | 'following' | 'files'>('all');
  const sentinel = useRef<HTMLDivElement>(null);
  const sorted = posts.filter(p => p.timestamp >= frontier).sort((a, b) => b.timestamp - a.timestamp);
  const displayPosts = mode === 'all'
    ? sorted
    : mode === 'files'
      ? sorted.filter(p => p.media?.type === 'file')
      : sorted.filter(p => p.userId === currentUser.id || currentUser.following.includes(p.userId));

  // Load the next page just before you reach the end.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loading) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) onLoadMore();
    }, { rootMargin: '700px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, displayPosts.length]);

  // Pull down at the top of the page: a spinner follows your finger, release to refresh (like Instagram).
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;
  const busyRef = useRef(false);
  const doRefresh = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRefreshing(true);
    setPull(54);
    try { await refreshRef.current(); } catch (e) { console.error(e); }
    window.setTimeout(() => { setRefreshing(false); setPull(0); busyRef.current = false; }, 350);
  };
  useEffect(() => {
    const TRIGGER = 64;
    const MAX = 120;
    let startY = 0;
    let pulling = false;
    let dist = 0;
    document.documentElement.style.overscrollBehaviorY = 'contain';
    const onStart = (e: TouchEvent) => {
      pulling = !busyRef.current && window.scrollY <= 0 && e.touches.length === 1;
      startY = e.touches[0].clientY;
      dist = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (!pulling) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0 || window.scrollY > 0) {
        if (dist > 0) { dist = 0; setPull(0); setDragging(false); }
        if (dy <= 0) pulling = false;
        return;
      }
      dist = Math.min(MAX, dy * 0.5);
      setDragging(true);
      setPull(dist);
    };
    const onEnd = () => {
      if (!pulling && dist === 0) return;
      pulling = false;
      setDragging(false);
      if (dist >= TRIGGER) void doRefresh(); else setPull(0);
      dist = 0;
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      document.documentElement.style.overscrollBehaviorY = '';
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="px-4 py-4 space-y-4" style={{ transform: pull > 0 ? `translateY(${pull * 0.55}px)` : undefined, transition: dragging ? 'none' : 'transform 0.25s ease' }}>
      {createPortal(
        <>
          <div className="pointer-events-none fixed left-0 right-0 z-40 flex justify-center" style={{ top: 64 }}>
            <div
              className="w-10 h-10 rounded-full bg-gray-800 border border-white/10 shadow-lg shadow-black/40 flex items-center justify-center"
              style={{ transform: `translateY(${pull - 44}px)`, opacity: Math.min(1, pull / 40), transition: dragging ? 'none' : 'transform 0.25s ease, opacity 0.25s ease' }}
            >
              <RefreshCw size={18} className={`text-violet-300 ${refreshing ? 'animate-spin' : ''}`} style={refreshing ? undefined : { transform: `rotate(${pull * 4}deg)` }} />
            </div>
          </div>
          {/* New posts never appear by themselves: pull down (or tap Home twice) to refresh. */}
        </>,
        document.body,
      )}
      <StoriesBar users={users} currentUser={currentUser} />
      <div className="seg flex gap-1 bg-gray-900/70 rounded-2xl p-1 border border-white/5">
        {([{ key: 'all', label: 'الكل', Icon: LayoutGrid }, { key: 'following', label: 'المتابَعون', Icon: Users }, { key: 'files', label: 'الملفات', Icon: FileText }] as const).map(t => (
          <button key={t.key} onClick={() => setMode(t.key)} className={`seg-btn relative flex-1 basis-0 px-1 py-2 rounded-xl text-sm font-medium transition-colors ${mode === t.key ? 'seg-on text-violet-100' : 'text-gray-500 hover:text-gray-300'}`}>
            {mode === t.key && <span className="seg-pill absolute inset-0 rounded-xl bg-violet-500/15 ring-1 ring-violet-400/25" />}
            <span className="relative flex items-center justify-center gap-1.5 whitespace-nowrap">
              <t.Icon size={15} className="shrink-0" />
              <span>{t.label}</span>
            </span>
          </button>
        ))}
      </div>
      {displayPosts.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-gray-400 mb-2">لا توجد منشورات بعد</p>
          <p className="text-gray-500 text-sm">
            {mode === 'following' ? 'تابع أشخاصاً لتظهر منشوراتهم هنا' : mode === 'files' ? 'لا توجد ملفات منشورة بعد. انشر أول ملف!' : 'انشر أول منشور لك!'}
          </p>
        </div>
      )}
      {displayPosts.map(post => (
        <PostCard key={post.id} post={post} setPosts={setPosts} users={users} currentUser={currentUser} onOpenProfile={onOpenProfile} />
      ))}
      <div ref={sentinel} className="h-8 flex items-center justify-center text-xs text-gray-500">
        {loading ? 'جارٍ التحميل...' : !hasMore && displayPosts.length > 0 ? 'وصلت لنهاية المنشورات' : ''}
      </div>
    </div>
  );
}

// ============ Post Card ============
// Instagram-style carousel: swipe sideways through every photo / video / file of the post.
function PostCarousel({ items, poster, onTap }: { items: NonNullable<Post['extraMedia']>; poster?: string; onTap?: (open: () => void) => void }) {
  const [viewer, setViewer] = useState<{ src: string; name?: string } | null>(null);
  const [cur, setCur] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const gallery: GalleryItem[] = items.filter(m => m.type !== 'file').map(m => ({ src: m.url, name: m.name, type: m.type as 'image' | 'video' }));
  const onScroll = () => {
    const el = ref.current;
    if (el && el.clientWidth) setCur(Math.round(el.scrollLeft / el.clientWidth));
  };
  const jump = (i: number) => ref.current?.scrollTo({ left: i * (ref.current?.clientWidth ?? 0), behavior: 'smooth' });
  return (
    <div className="relative">
      <div ref={ref} dir="ltr" onScroll={onScroll} className="flex overflow-x-auto snap-x snap-mandatory rounded-xl no-scrollbar" style={{ scrollbarWidth: 'none' }}>
        {items.map((m, i) => (
          <div key={`${m.url}-${i}`} className="relative w-full shrink-0 snap-center bg-gray-800/60 flex items-center justify-center">
            {m.type === 'image' ? (
              <img src={m.url} alt="" loading={i === 0 ? 'eager' : 'lazy'} draggable={false}
                onClick={e => { e.stopPropagation(); const open = () => setViewer({ src: m.url, name: m.name }); onTap ? onTap(open) : open(); }}
                className="w-full max-h-[70vh] object-cover cursor-zoom-in" />
            ) : m.type === 'video' ? (
              <VideoPlayer src={m.url} poster={i === 0 ? poster : undefined} className="w-full max-h-[70vh]" />
            ) : (
              <div className="w-full h-40 flex items-center gap-3 px-4" dir="rtl">
                <FileText size={32} className="text-cyan-400 shrink-0" />
                <div className="min-w-0 flex-1"><div className="text-white truncate" dir="auto">{m.name || 'ملف'}</div><div className="text-xs text-gray-400">{formatBytes(m.size)}</div></div>
                <button onClick={e => { e.stopPropagation(); void downloadFile(m.url, m.name || 'file'); }} className="px-3 py-1.5 bg-violet-600 rounded-full text-sm text-white flex items-center gap-1.5"><Download size={14} /> تحميل</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <>
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] tabular-nums pointer-events-none">{cur + 1}/{items.length}</span>
          <div className="flex justify-center gap-1.5 mt-2">
            {items.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); jump(i); }} aria-label={`الصورة ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === cur ? 'w-4 bg-violet-400' : 'w-1.5 bg-white/25'}`} />
            ))}
          </div>
        </>
      )}
      {viewer && <ImageViewer src={viewer.src} name={viewer.name} gallery={gallery} onClose={() => setViewer(null)} />}
    </div>
  );
}

function DownloadAllButton({ post }: { post: Post }) {
  const [busy, setBusy] = useState(false);
  const all = [...(post.media ? [post.media] : []), ...(post.extraMedia ?? [])];
  if (all.length < 2) return null;
  return (
    <button
      onClick={async () => {
        if (busy) return;
        setBusy(true);
        for (let i = 0; i < all.length; i++) {
          const m = all[i];
          await downloadFile(m.url, m.name || `kan-${i + 1}.${m.type === 'video' ? 'mp4' : m.type === 'image' ? 'jpg' : 'bin'}`);
          await new Promise(r => window.setTimeout(r, 350)); // browsers drop downloads fired all at once
        }
        setBusy(false);
      }}
      className="mt-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600/25 to-cyan-500/20 border border-violet-400/30 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
      disabled={busy}
    >
      {busy ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />} {busy ? 'جارٍ التحميل...' : `تحميل الكل (${all.length})`}
    </button>
  );
}

function PostViewer({ target, posts, setPosts, users, currentUser, onOpenProfile, onClose }: {
  target: { postId: string; commentId?: string };
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  users: User[];
  currentUser: User;
  onOpenProfile: (id: string) => void;
  onClose: () => void;
}) {
  const post = posts.find(p => p.id === target.postId);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (post) return;
    let cancelled = false;
    void fetchPosts({ ids: [target.postId], limit: 1 })
      .then(page => {
        if (cancelled) return;
        if (page.length === 0) setMissing(true);
        else setPosts(prev => mergePosts(prev, page));
      })
      .catch(() => { if (!cancelled) setMissing(true); });
    return () => { cancelled = true; };
  }, [target.postId]); // eslint-disable-line react-hooks/exhaustive-deps
  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[125] flex flex-col bg-gray-950">
      <div className="flex items-center gap-3 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
        <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors" aria-label="رجوع"><ChevronRight size={20} /></button>
        <h2 className="font-bold text-white">{target.commentId ? 'التعليق' : 'المنشور'}</h2>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {post ? (
          <PostCard post={post} setPosts={setPosts} users={users} currentUser={currentUser} onOpenProfile={onOpenProfile} focusCommentId={target.commentId} />
        ) : missing ? (
          <p className="text-center text-gray-500 py-16">هذا المنشور غير متاح، ربما تم حذفه</p>
        ) : (
          <div className="flex justify-center py-16"><RefreshCw size={22} className="text-violet-300 animate-spin" /></div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// Comment order: the one you were sent to, your fresh comments, then by likes/replies/recency (people you follow get a small boost).
function sortComments(list: Comment[], me: User, focusId?: string | null): Comment[] {
  const now = Date.now();
  const score = (c: Comment) => {
    const hours = Math.max(0, (now - c.timestamp) / 3600000);
    let v = c.likes.length * 3 + c.replies.length * 2 + 6 / (1 + hours / 6);
    if (me.following.includes(c.userId)) v += 2;
    if (c.userId === me.id && hours < 0.17) v += 100;
    if (c.id === focusId) v += 1000;
    return v;
  };
  return [...list].sort((a, b) => score(b) - score(a) || b.timestamp - a.timestamp);
}

function PostCard({ post, setPosts, users, currentUser, onOpenProfile, focusCommentId }: {
  post: Post;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  users: User[];
  currentUser: User;
  onOpenProfile: (id: string) => void;
  focusCommentId?: string;
}) {
  const [listModal, setListModal] = useState<{ title: string; ids: string[] } | null>(null);
  const [coinId, setCoinId] = useState(0);
  const [viewer, setViewer] = useState<{ src: string; name?: string } | null>(null);
  const coinTimer = useRef<number | undefined>(undefined);
  const tapTimer = useRef<number | undefined>(undefined);
  const lastTap = useRef(0);
  const [showComments, setShowComments] = useState(!!focusCommentId);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareComment, setShareComment] = useState<{ id: string; text: string; authorName: string } | null>(null);
  const [editPost, setEditPost] = useState(false);
  const [editC, setEditC] = useState<{ id: string; text: string } | null>(null);
  useEffect(() => {
    if (!focusCommentId) return;
    const t = window.setTimeout(() => document.getElementById(`comment-${focusCommentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500);
    return () => window.clearTimeout(t);
  }, [focusCommentId]);
  const author = users.find(u => u.id === post.userId);
  const isLiked = post.likes.includes(currentUser.id);
  const isBookmarked = post.bookmarks.includes(currentUser.id);

  if (!author) return null;


  const mutatePost = (fn: (p: Post) => Post) =>
    setPosts(prev => prev.map(p => (p.id === post.id ? fn(p) : p)));
  const me = currentUser.id;
  const setIn = (list: string[], on: boolean) => (on ? [...list.filter(id => id !== me), me] : list.filter(id => id !== me));

  const toggleLike = async () => {
    const was = isLiked;
    mutatePost(p => ({ ...p, likes: setIn(p.likes, !was) }));
    const { error } = was
      ? await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', me)
      : await supabase.from('post_likes').insert({ post_id: post.id, user_id: me });
    if (error) mutatePost(p => ({ ...p, likes: setIn(p.likes, was) }));
  };

  const toggleBookmark = async () => {
    const was = isBookmarked;
    mutatePost(p => ({ ...p, bookmarks: setIn(p.bookmarks, !was) }));
    const { error } = was
      ? await supabase.from('bookmarks').delete().eq('post_id', post.id).eq('user_id', me)
      : await supabase.from('bookmarks').insert({ post_id: post.id, user_id: me });
    if (error) mutatePost(p => ({ ...p, bookmarks: setIn(p.bookmarks, was) }));
  };

  const addComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    const id = crypto.randomUUID();
    const newComment: Comment = { id, userId: me, text, timestamp: Date.now(), likes: [], replies: [] };
    mutatePost(p => ({ ...p, comments: [...p.comments, newComment] }));
    setCommentText('');
    const { error } = await supabase.from('comments').insert({ id, post_id: post.id, user_id: me, text });
    if (error) {
      mutatePost(p => ({ ...p, comments: p.comments.filter(c => c.id !== id) }));
      setCommentText(text);
      window.alert('تعذّر إضافة التعليق، حاول مرة أخرى');
    }
  };

  const addReply = async (commentId: string) => {
    const text = replyText.trim();
    if (!text) return;
    const id = crypto.randomUUID();
    const newReply: Reply = { id, userId: me, text, timestamp: Date.now(), likes: [] };
    mutatePost(p => ({
      ...p,
      comments: p.comments.map(c => (c.id === commentId ? { ...c, replies: [...c.replies, newReply] } : c)),
    }));
    setReplyText('');
    setReplyTo(null);
    const { error } = await supabase.from('comments').insert({ id, post_id: post.id, parent_id: commentId, user_id: me, text });
    if (error) {
      mutatePost(p => ({
        ...p,
        comments: p.comments.map(c => (c.id === commentId ? { ...c, replies: c.replies.filter(r => r.id !== id) } : c)),
      }));
      window.alert('تعذّر إضافة الرد، حاول مرة أخرى');
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    const was = post.comments.find(c => c.id === commentId)?.likes.includes(me) ?? false;
    const apply = (on: boolean) =>
      mutatePost(p => ({
        ...p,
        comments: p.comments.map(c => (c.id === commentId ? { ...c, likes: setIn(c.likes, on) } : c)),
      }));
    apply(!was);
    const { error } = was
      ? await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', me)
      : await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: me });
    if (error) apply(was);
  };

  const deleteComment = async (commentId: string) => {
    if (!window.confirm('حذف هذا التعليق؟')) return;
    const snapshot = post.comments;
    mutatePost(p => ({ ...p, comments: p.comments.filter(c => c.id !== commentId) }));
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
      mutatePost(p => ({ ...p, comments: snapshot }));
      window.alert('تعذّر حذف التعليق، حاول مرة أخرى');
    }
  };

  const deleteReply = async (commentId: string, replyId: string) => {
    if (!window.confirm('حذف هذا الرد؟')) return;
    const snapshot = post.comments;
    mutatePost(p => ({
      ...p,
      comments: p.comments.map(c => (c.id === commentId ? { ...c, replies: c.replies.filter(r => r.id !== replyId) } : c)),
    }));
    const { error } = await supabase.from('comments').delete().eq('id', replyId);
    if (error) {
      mutatePost(p => ({ ...p, comments: snapshot }));
      window.alert('تعذّر حذف الرد، حاول مرة أخرى');
    }
  };

  // Double tap anywhere on the post content: like it and show the KAN coin.
  const handleContentTap = (onSingle?: () => void) => {
    const now = Date.now();
    window.clearTimeout(tapTimer.current);
    if (now - lastTap.current < 350) {
      lastTap.current = 0;
      setCoinId(n => n + 1);
      window.clearTimeout(coinTimer.current);
      coinTimer.current = window.setTimeout(() => setCoinId(0), 1000);
      if (!isLiked) void toggleLike();
    } else {
      lastTap.current = now;
      if (onSingle) tapTimer.current = window.setTimeout(onSingle, 350);
    }
  };

  const deletePost = async () => {
    const removed = post;
    setPosts(prev => prev.filter(p => p.id !== post.id));
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (error) {
      setPosts(prev => [removed, ...prev]);
      window.alert('تعذّر حذف المنشور، حاول مرة أخرى');
      return;
    }
    const path = removed.media ? mediaPath(removed.media.url) : null;
    if (path) void supabase.storage.from(POST_MEDIA_BUCKET).remove([path]);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }} className="post-card bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden [contain:layout_paint] [content-visibility:auto] [contain-intrinsic-size:auto_420px]">
      <div className="p-4 flex items-center gap-3">
        <button onClick={() => onOpenProfile(author.id)} className="flex items-center gap-3 flex-1 min-w-0 text-right">
          <Avatar userId={author.id} src={author.avatar} name={author.displayName} size="md" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white truncate hover:underline">{author.displayName}</div>
            <div className="text-xs text-gray-500">@{author.username} · {formatTime(post.timestamp)}</div>
          </div>
        </button>
        {post.userId === currentUser.id && (
          <>
            <button onClick={() => setEditPost(true)} className="p-2 text-gray-500 hover:text-cyan-300 transition-colors" aria-label="تعديل المنشور">
              <Pencil size={16} />
            </button>
            <button onClick={deletePost} className="p-2 text-gray-500 hover:text-red-400 transition-colors">
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>

      <div onClick={() => handleContentTap()} className="relative select-none touch-manipulation">
        {coinId > 0 && <CoinBurst key={coinId} />}
        {(post.title || post.isReel) && (
          <div className="px-4 pb-2 flex items-center gap-2">
            {post.isReel && <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-[11px] font-medium">🎬 ريل</span>}
            {post.title && <h3 className="text-white font-bold leading-snug">{post.title}</h3>}
          </div>
        )}
        {post.text && (
          <div className="px-4 pb-3">
            <p className="text-white text-[16px] leading-7 whitespace-pre-wrap">{post.text}</p>
          </div>
        )}

        {post.media && post.extraMedia && post.extraMedia.length > 0 && (
          <div className="px-4 pb-3">
            <PostCarousel items={[post.media, ...post.extraMedia]} poster={post.coverUrl} onTap={open => handleContentTap(open)} />
            <DownloadAllButton post={post} />
          </div>
        )}
        {post.media && !(post.extraMedia && post.extraMedia.length > 0) && (
          <div className="px-4 pb-3">
            {post.media.type === 'image' ? (
              <div className="relative">
                <img
                  src={post.media.url}
                  alt=""
                  onClick={e => { e.stopPropagation(); handleContentTap(() => setViewer({ src: post.media!.url, name: post.media!.name })); }}
                  className="w-full rounded-xl max-h-96 object-cover cursor-zoom-in"
                />
                <button
                  onClick={e => { e.stopPropagation(); void downloadFile(post.media!.url, post.media!.name || 'image.jpg'); }}
                  className="absolute bottom-2 left-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white"
                  aria-label="تحميل الصورة"
                >
                  <Download size={14} />
                </button>
              </div>
            ) : post.media.type === 'video' ? (
              <VideoPlayer
                src={post.media.url}
                poster={post.coverUrl}
                className={post.isReel ? 'max-h-[75vh] mx-auto w-auto max-w-full' : 'w-full max-h-[75vh]'}
              />
            ) : (
              <div className="flex items-center gap-3 p-3 bg-gray-800/60 border border-gray-700 rounded-xl">
                <FileText size={32} className="shrink-0 text-cyan-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-white font-medium truncate" dir="auto">{post.media.name || 'ملف'}</div>
                  <div className="text-xs text-gray-500">{formatBytes(post.media.size)}</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); void downloadFile(post.media!.url, post.media!.name || 'file'); }}
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-full text-sm text-white flex items-center gap-1.5"
                >
                  <Download size={14} /> تحميل
                </button>
              </div>
            )}
            <DownloadAllButton post={post} />
          </div>
        )}
      </div>

      <div className="px-4 py-3 flex items-center gap-1 border-t border-gray-800/50">
        <div className="flex items-center">
          <button onClick={toggleLike} className={`p-2 rounded-full transition-all ${isLiked ? 'text-red-400' : 'text-gray-500 hover:text-red-400'}`}>
            <Heart size={18} className={isLiked ? 'fill-red-400' : ''} />
          </button>
          {post.likes.length > 0 && (
            <button onClick={() => setListModal({ title: 'الإعجابات', ids: post.likes })} className="text-sm text-gray-400 hover:text-white pl-2 pr-0.5 py-2">
              {post.likes.length}
            </button>
          )}
        </div>
        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-gray-500 hover:text-violet-400 transition-all">
          <MessageCircle size={18} />
          <span className="text-sm">{post.comments.length || ''}</span>
        </button>
        <button onClick={toggleBookmark} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${isBookmarked ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'}`}>
          <Bookmark size={18} className={isBookmarked ? 'fill-yellow-400' : ''} />
        </button>
        <button onClick={() => setShareOpen(true)} aria-label="مشاركة" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all mr-auto text-gray-500 hover:text-cyan-400 active:scale-90">
          <Share2 size={18} />
        </button>
        {shareOpen && <ShareSheet post={post} author={author} users={users} currentUser={currentUser} onClose={() => setShareOpen(false)} />}
        {shareComment && <ShareSheet post={post} author={author} users={users} currentUser={currentUser} comment={shareComment} onClose={() => setShareComment(null)} />}
        {editPost && (
          <EditTextModal
            title="تعديل المنشور"
            initial={post.text}
            initialTitle={post.title !== undefined ? post.title : undefined}
            maxLength={2000}
            allowEmpty={!!post.media}
            onClose={() => setEditPost(false)}
            onSave={async (v, h) => {
              const hasTitle = post.title !== undefined;
              const { error } = await supabase.from('posts').update(hasTitle ? { text: v, title: h || null } : { text: v }).eq('id', post.id);
              if (error) { console.error(error); return false; }
              setPosts(prev => prev.map(p => (p.id === post.id ? { ...p, text: v, title: hasTitle ? (h || undefined) : p.title } : p)));
              return true;
            }}
          />
        )}
        {editC && (
          <EditTextModal
            title="تعديل التعليق"
            initial={editC.text}
            maxLength={1000}
            onClose={() => setEditC(null)}
            onSave={async v => {
              const ok = await updateText('comments', editC.id, v);
              if (ok) setPosts(prev => prev.map(p => (p.id !== post.id ? p : { ...p, comments: p.comments.map(c => (c.id === editC.id ? { ...c, text: v } : { ...c, replies: c.replies.map(r => (r.id === editC.id ? { ...r, text: v } : r)) })) })));
              return ok;
            }}
          />
        )}
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-gray-800/50 overflow-hidden">
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {sortComments(post.comments, currentUser, focusCommentId).map(comment => {
                const cAuthor = users.find(u => u.id === comment.userId);
                if (!cAuthor) return null;
                return (
                  <div key={comment.id} id={`comment-${comment.id}`} className={`space-y-2 rounded-xl transition-shadow ${focusCommentId === comment.id ? 'ring-2 ring-cyan-400/70 p-1' : ''}`}>
                    <div className="flex gap-2">
                      <button onClick={() => onOpenProfile(cAuthor.id)} className="self-start">
                        <Avatar userId={cAuthor.id} src={cAuthor.avatar} name={cAuthor.displayName} size="sm" />
                      </button>
                      <div className="flex-1 bg-gray-800/50 rounded-xl p-2.5">
                        <div className="flex items-center gap-2 mb-1">
                          <button onClick={() => onOpenProfile(cAuthor.id)} className="text-sm font-medium text-white hover:underline">{cAuthor.displayName}</button>
                          <span className="text-xs text-gray-500">{formatTime(comment.timestamp)}</span>
                        </div>
                        <p className="text-sm text-gray-300">{comment.text}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1">
                            <button onClick={() => toggleCommentLike(comment.id)} className={`text-xs ${comment.likes.includes(currentUser.id) ? 'text-red-400' : 'text-gray-500'}`}>
                              <Heart size={12} className={comment.likes.includes(currentUser.id) ? 'fill-red-400' : ''} />
                            </button>
                            {comment.likes.length > 0 && (
                              <button onClick={() => setListModal({ title: 'الإعجابات', ids: comment.likes })} className="text-xs text-gray-400 hover:text-white">
                                {comment.likes.length}
                              </button>
                            )}
                          </span>
                          <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="text-xs text-gray-500 hover:text-violet-400 flex items-center gap-1">
                            <Reply size={12} /> رد
                          </button>
                          <button onClick={() => setShareComment({ id: comment.id, text: comment.text, authorName: cAuthor.displayName })} className="text-xs text-gray-500 hover:text-cyan-400 flex items-center gap-1" aria-label="مشاركة التعليق">
                            <Share2 size={12} /> مشاركة
                          </button>
                          {comment.userId === currentUser.id && (
                            <button onClick={() => setEditC({ id: comment.id, text: comment.text })} className="text-xs text-gray-500 hover:text-cyan-400 flex items-center gap-1">
                              <Pencil size={12} /> تعديل
                            </button>
                          )}
                          {comment.userId === currentUser.id && (
                            <button onClick={() => deleteComment(comment.id)} className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1">
                              <Trash2 size={12} /> حذف
                            </button>
                          )}
                        </div>
                        {comment.replies.length > 0 && (
                          <div className="mt-2 space-y-2 pr-3 border-r border-gray-700">
                            {comment.replies.map(reply => {
                              const rAuthor = users.find(u => u.id === reply.userId);
                              if (!rAuthor) return null;
                              return (
                                <div key={reply.id} id={`comment-${reply.id}`} className={`flex gap-2 rounded-lg ${focusCommentId === reply.id ? 'ring-2 ring-cyan-400/70 p-1' : ''}`}>
                                  <button onClick={() => onOpenProfile(rAuthor.id)} className="self-start">
                                    <Avatar userId={rAuthor.id} src={rAuthor.avatar} name={rAuthor.displayName} size="sm" />
                                  </button>
                                  <div>
                                    <button onClick={() => onOpenProfile(rAuthor.id)} className="text-xs font-medium text-white hover:underline">{rAuthor.displayName}</button>
                                    <span className="text-xs text-gray-500 mr-2">{formatTime(reply.timestamp)}</span>
                                    {reply.userId === currentUser.id && (
                                      <button onClick={() => setEditC({ id: reply.id, text: reply.text })} className="text-xs text-gray-500 hover:text-cyan-400 mr-2 align-middle" aria-label="تعديل الرد">
                                        <Pencil size={11} className="inline" />
                                      </button>
                                    )}
                                    {reply.userId === currentUser.id && (
                                      <button onClick={() => deleteReply(comment.id, reply.id)} className="text-xs text-gray-500 hover:text-red-400 mr-2 align-middle" aria-label="حذف الرد">
                                        <Trash2 size={11} className="inline" />
                                      </button>
                                    )}
                                    <p className="text-xs text-gray-300">{reply.text}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {replyTo === comment.id && (
                          <div className="flex gap-2 mt-2">
                            <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="اكتب رداً..." className="flex-1 px-3 py-1.5 bg-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none" onKeyDown={e => e.key === 'Enter' && addReply(comment.id)} />
                            <button onClick={() => addReply(comment.id)} className="p-1.5 bg-violet-600 rounded-lg hover:bg-violet-500">
                              <Send size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 border-t border-gray-800/50 flex gap-2">
              <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="اكتب تعليقاً..." className="flex-1 px-4 py-2 bg-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500" onKeyDown={e => e.key === 'Enter' && addComment()} />
              <button onClick={addComment} className="px-4 py-2 bg-violet-600 rounded-xl hover:bg-violet-500 transition-colors">
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {listModal && (
        <UserListModal title={listModal.title} userIds={listModal.ids} users={users} onOpenProfile={onOpenProfile} onClose={() => setListModal(null)} />
      )}
      {viewer && <ImageViewer src={viewer.src} name={viewer.name} onClose={() => setViewer(null)} />}
    </motion.div>
  );
}

// ============ Reels ============
function togglePostLike(post: Post, me: string, setPosts: React.Dispatch<React.SetStateAction<Post[]>>) {
  const was = post.likes.includes(me);
  const apply = (on: boolean) =>
    setPosts(prev => prev.map(p =>
      p.id === post.id ? { ...p, likes: on ? [...p.likes.filter(id => id !== me), me] : p.likes.filter(id => id !== me) } : p
    ));
  apply(!was);
  void (async () => {
    const { error } = was
      ? await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', me)
      : await supabase.from('post_likes').insert({ post_id: post.id, user_id: me });
    if (error) apply(was);
  })();
}

function ReelItem({ post, author, users, setUsers, currentUser, muted, onToggleMute, setPosts, onOpenProfile, onOpenComments, onShowLikes }: {
  post: Post;
  author: User;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
  muted: boolean;
  onToggleMute: () => void;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  onOpenProfile: (id: string) => void;
  onOpenComments: () => void;
  onShowLikes: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [landscape, setLandscape] = useState(false);
  const [coinId, setCoinId] = useState(0);
  const coinTimer = useRef<number | undefined>(undefined);
  const lastTap = useRef(0);
  const tapTimer = useRef<number | undefined>(undefined);
  const isLiked = post.likes.includes(currentUser.id);
  const commentCount = post.comments.reduce((n, c) => n + 1 + c.replies.length, 0);
  const toggleFollow = makeToggleFollow(currentUser, setUsers);
  const isFollowing = currentUser.following.includes(author.id);
  const [shareOpen, setShareOpen] = useState(false);

  // Play only the reel that is on screen.
  useEffect(() => {
    const box = boxRef.current;
    const video = videoRef.current;
    if (!box || !video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        setPaused(false);
        void video.play().catch(() => undefined);
      } else {
        video.pause();
        video.currentTime = 0;
      }
    }, { threshold: [0, 0.6, 1] });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // One tap: pause / play. Double tap: love it with the KAN coin.
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      window.clearTimeout(tapTimer.current);
      setCoinId(n => n + 1);
      window.clearTimeout(coinTimer.current);
      coinTimer.current = window.setTimeout(() => setCoinId(0), 1000);
      if (!isLiked) togglePostLike(post, currentUser.id, setPosts);
      return;
    }
    lastTap.current = now;
    window.clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;
      if (video.paused) { void video.play().catch(() => undefined); setPaused(false); }
      else { video.pause(); setPaused(true); }
    }, 320);
  };

  return (
    <div ref={boxRef} className="relative h-full w-full snap-start snap-always bg-black overflow-hidden select-none touch-manipulation" onClick={handleTap}>
      <video
        ref={videoRef}
        src={post.media?.url}
        className={`absolute inset-0 w-full h-full ${landscape ? 'object-contain' : 'object-cover md:object-contain'}`}
        onLoadedMetadata={e => setLandscape(e.currentTarget.videoWidth > e.currentTarget.videoHeight)}
        loop
        muted={muted}
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
      />
      {failed && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6 text-center bg-gray-900">
          <Film size={34} className="text-gray-500" />
          <p className="text-sm text-gray-300">لا يمكن تشغيل هذا الفيديو على هذا الجهاز (صيغة غير مدعومة).</p>
          <button onClick={e => { e.stopPropagation(); void downloadFile(post.media!.url, 'video.mp4'); }} className="px-4 py-2 rounded-full bg-violet-600 text-white text-sm flex items-center gap-2">
            <Download size={14} /> تحميل
          </button>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />
      {coinId > 0 && <CoinBurst key={coinId} />}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/45 flex items-center justify-center"><Play size={30} className="text-white" /></div>
        </div>
      )}

      <button
        onClick={e => { e.stopPropagation(); onToggleMute(); }}
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-3 z-30 p-2 rounded-full bg-black/45 text-white"
        aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      <div className="absolute bottom-4 left-3 flex flex-col items-center gap-5" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center">
          <button onClick={() => togglePostLike(post, currentUser.id, setPosts)} className={`p-2.5 rounded-full bg-black/40 ${isLiked ? 'text-red-400' : 'text-white'}`} aria-label="إعجاب">
            <Heart size={26} className={isLiked ? 'fill-red-400' : ''} />
          </button>
          {post.likes.length > 0 && (
            <button onClick={onShowLikes} className="text-xs text-white mt-1 font-medium">{post.likes.length}</button>
          )}
        </div>
        <div className="flex flex-col items-center">
          <button onClick={onOpenComments} className="p-2.5 rounded-full bg-black/40 text-white" aria-label="التعليقات">
            <MessageCircle size={26} />
          </button>
          <span className="text-xs text-white mt-1 font-medium">{commentCount > 0 ? commentCount : ''}</span>
        </div>
        <div className="flex flex-col items-center">
          <button onClick={() => setShareOpen(true)} className="p-2.5 rounded-full bg-black/40 text-white active:scale-90" aria-label="مشاركة">
            <Share2 size={24} />
          </button>
          <span className="text-xs text-white mt-1 font-medium">مشاركة</span>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 left-20 text-right" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <button onClick={() => onOpenProfile(author.id)} className="flex items-center gap-2 min-w-0">
            <Avatar userId={author.id} src={author.avatar} name={author.displayName} size="sm" />
            <span className="text-white font-semibold text-sm truncate max-w-[9rem]">{author.displayName}</span>
            <span className="text-white/60 text-xs truncate max-w-[6rem]">@{author.username}</span>
          </button>
          {author.id !== currentUser.id && (
            <button
              onClick={() => toggleFollow(author.id)}
              className={`shrink-0 px-3.5 py-1 rounded-full text-xs font-semibold active:scale-95 transition-all ${isFollowing ? 'bg-white/15 text-white border border-white/25 backdrop-blur' : 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-md shadow-violet-500/30'}`}
            >
              {isFollowing ? 'متابَع' : 'متابعة'}
            </button>
          )}
        </div>
        {post.text && <p className="text-white text-sm leading-relaxed line-clamp-3 whitespace-pre-wrap">{post.text}</p>}
      </div>
      {shareOpen && <ShareSheet post={post} author={author} users={users} currentUser={currentUser} onClose={() => setShareOpen(false)} />}
    </div>
  );
}

function ReelComments({ post, users, currentUser, setPosts, onOpenProfile, onClose }: {
  post: Post;
  users: User[];
  currentUser: User;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  onOpenProfile: (id: string) => void;
  onClose: () => void;
}) {
  useBackLayer(true, onClose);
  const [text, setText] = useState('');
  const me = currentUser.id;
  const mutate = (fn: (p: Post) => Post) => setPosts(prev => prev.map(p => (p.id === post.id ? fn(p) : p)));

  const add = async () => {
    const body = text.trim();
    if (!body) return;
    const id = crypto.randomUUID();
    const comment: Comment = { id, userId: me, text: body, timestamp: Date.now(), likes: [], replies: [] };
    mutate(p => ({ ...p, comments: [...p.comments, comment] }));
    setText('');
    const { error } = await supabase.from('comments').insert({ id, post_id: post.id, user_id: me, text: body });
    if (error) {
      mutate(p => ({ ...p, comments: p.comments.filter(c => c.id !== id) }));
      setText(body);
      window.alert('تعذّر إضافة التعليق، حاول مرة أخرى');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('حذف هذا التعليق؟')) return;
    const snapshot = post.comments;
    mutate(p => ({
      ...p,
      comments: p.comments.filter(c => c.id !== id).map(c => ({ ...c, replies: c.replies.filter(r => r.id !== id) })),
    }));
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) {
      mutate(p => ({ ...p, comments: snapshot }));
      window.alert('تعذّر الحذف، حاول مرة أخرى');
    }
  };

  const rows: { id: string; userId: string; text: string; timestamp: number; reply: boolean }[] = [];
  for (const c of post.comments) {
    rows.push({ id: c.id, userId: c.userId, text: c.text, timestamp: c.timestamp, reply: false });
    for (const r of c.replies) rows.push({ id: r.id, userId: r.userId, text: r.text, timestamp: r.timestamp, reply: true });
  }

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[100] bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-md bg-gray-900 border-t border-white/10 rounded-t-2xl h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="font-bold text-white">التعليقات <span className="text-gray-500 text-sm font-normal">({rows.length})</span></h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white" aria-label="إغلاق"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {rows.length === 0 && <p className="text-center text-gray-500 py-10">لا توجد تعليقات بعد. كن أول من يعلّق!</p>}
          {rows.map(r => {
            const u = users.find(x => x.id === r.userId);
            if (!u) return null;
            return (
              <div key={r.id} className={`flex gap-2 ${r.reply ? 'mr-8' : ''}`}>
                <button onClick={() => { onClose(); onOpenProfile(u.id); }} className="self-start"><Avatar userId={u.id} src={u.avatar} name={u.displayName} size="sm" /></button>
                <div className="flex-1 bg-gray-800/60 rounded-xl p-2.5 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-white">{u.displayName}</span>
                    <span className="text-xs text-gray-500">{formatTime(r.timestamp)}</span>
                    {r.userId === me && (
                      <button onClick={() => remove(r.id)} className="mr-auto text-gray-500 hover:text-red-400" aria-label="حذف"><Trash2 size={13} /></button>
                    )}
                  </div>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{r.text}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-3 border-t border-gray-800 flex items-center gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="اكتب تعليقاً..."
            className="flex-1 min-w-0 w-full px-3 min-[400px]:px-4 py-2.5 bg-gray-800 rounded-full text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button onClick={add} className="p-2.5 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full text-white" aria-label="إرسال"><Send size={18} /></button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ReelsTab({ posts, setPosts, users, setUsers, currentUser, onOpenProfile, onCreate, onLoadPage, onBack }: {
  onBack: () => void;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
  onOpenProfile: (id: string) => void;
  onCreate: () => void;
  onLoadPage: (opts: FetchPostsOptions) => Promise<Post[]>;
}) {
  const [muted, setMuted] = useState(true);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [listModal, setListModal] = useState<{ title: string; ids: string[] } | null>(null);
  const reels = posts.filter(p => p.media?.type === 'video' && !p.isVideo).sort((a, b) => b.timestamp - a.timestamp);
  const commentPost = commentsFor ? posts.find(p => p.id === commentsFor) : undefined;

  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef(false);
  const loadMore = async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    try {
      const oldest = reels[reels.length - 1];
      const page = await onLoadPage({ kind: 'reels', before: oldest?.cursor, limit: 8 });
      if (page.length < 8) setHasMore(false);
    } catch (e) {
      console.error(e);
    } finally {
      loadingRef.current = false;
    }
  };
  useEffect(() => {
    if (reels.length < 5) void loadMore();
  }, []);

  if (reels.length === 0 && hasMore) {
    return <div className="py-20 text-center text-gray-500 text-sm">جارٍ التحميل...</div>;
  }

  if (reels.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl kan-fab flex items-center justify-center"><Film size={30} className="text-white" /></div>
        <p className="text-white font-semibold mb-1">لا توجد ريلز بعد</p>
        <p className="text-gray-500 text-sm mb-5">أي فيديو يُنشر يظهر هنا بتصميم الريلز</p>
        <button onClick={onCreate} className="px-6 py-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-medium">انشر ريل</button>
      </div>
    );
  }

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[60] bg-black">
      <div
        className="h-full overflow-y-scroll overscroll-contain snap-y snap-mandatory no-scrollbar"
        onScroll={e => {
          const el = e.currentTarget;
          if (el.scrollTop + el.clientHeight * 2.5 >= el.scrollHeight) void loadMore();
        }}
      >
        {reels.map(post => {
          const author = users.find(u => u.id === post.userId);
          if (!author) return null;
          return (
            <div key={post.id} className="h-full">
              <ReelItem
                post={post}
                author={author}
                users={users}
                setUsers={setUsers}
                currentUser={currentUser}
                muted={muted}
                onToggleMute={() => setMuted(m => !m)}
                setPosts={setPosts}
                onOpenProfile={onOpenProfile}
                onOpenComments={() => setCommentsFor(post.id)}
                onShowLikes={() => setListModal({ title: 'الإعجابات', ids: post.likes })}
              />
            </div>
          );
        })}
      </div>
      <div className="absolute inset-x-0 top-0 z-20 flex items-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-8 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <button onClick={onBack} className="pointer-events-auto p-2 rounded-full bg-black/40 text-white active:scale-90 transition-transform" aria-label="رجوع"><ChevronRight size={22} /></button>
        <span className="mx-3 text-lg font-extrabold tracking-[0.25em] kan-gradient-text">KAN</span>
        <span className="text-xs text-white/80 font-medium">ريلز</span>
      </div>
      {commentPost && (
        <ReelComments post={commentPost} users={users} currentUser={currentUser} setPosts={setPosts} onOpenProfile={onOpenProfile} onClose={() => setCommentsFor(null)} />
      )}
      {listModal && (
        <UserListModal title={listModal.title} userIds={listModal.ids} users={users} onOpenProfile={onOpenProfile} onClose={() => setListModal(null)} />
      )}
    </div>,
    document.body,
  );
}

// ============ Videos (YouTube style) ============
function VideoThumb({ post }: { post: Post }) {
  return post.coverUrl ? (
    <img src={post.coverUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
  ) : (
    <video src={`${post.media?.url}#t=0.5`} preload="metadata" muted playsInline className="w-full h-full object-cover bg-black" />
  );
}

function VideoCard({ post, author, onOpen }: { post: Post; author: User; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="text-right group block w-full">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900">
        <VideoThumb post={post} />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors">
          <div className="w-12 h-12 rounded-full bg-black/55 flex items-center justify-center">
            <Play size={22} className="text-white" />
          </div>
        </div>
      </div>
      <div className="flex gap-2.5 mt-2">
        <Avatar userId={author.id} src={author.avatar} name={author.displayName} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="text-white font-semibold text-sm leading-snug line-clamp-2">{post.title || post.text || 'فيديو'}</div>
          <div className="text-xs text-gray-400 mt-0.5">{author.displayName}</div>
          <div className="text-xs text-gray-500">{post.likes.length} إعجاب · {formatTime(post.timestamp)}</div>
        </div>
      </div>
    </button>
  );
}

function VideoWatch({ post, users, currentUser, setUsers, setPosts, related, onOpenProfile, onOpenRelated, onBack }: {
  post: Post;
  users: User[];
  currentUser: User;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  related: Post[];
  onOpenProfile: (id: string) => void;
  onOpenRelated: (id: string) => void;
  onBack: () => void;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [listModal, setListModal] = useState<{ title: string; ids: string[] } | null>(null);
  const author = users.find(u => u.id === post.userId);
  const toggleFollow = makeToggleFollow(currentUser, setUsers);
  const isLiked = post.likes.includes(currentUser.id);
  const isFollowing = author ? currentUser.following.includes(author.id) : false;
  const commentCount = post.comments.reduce((n, c) => n + 1 + c.replies.length, 0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [post.id]);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6 sm:px-4 pb-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm px-4 sm:px-0 py-3">
          <ChevronRight size={18} /> رجوع
        </button>
        <div className="aspect-video w-full bg-black sm:rounded-xl overflow-hidden">
          <VideoPlayer key={post.id} src={post.media!.url} poster={post.coverUrl} autoPlay className="w-full h-full object-contain" />
        </div>
        <div className="px-4 sm:px-0 mt-3">
          <h1 className="text-lg font-bold text-white leading-snug">{post.title || 'فيديو'}</h1>
          <div className="text-xs text-gray-500 mt-1">{formatTime(post.timestamp)}</div>
          {author && (
            <div className="flex items-center gap-3 mt-3">
              <button onClick={() => onOpenProfile(author.id)} className="flex items-center gap-2.5 min-w-0">
                <Avatar userId={author.id} src={author.avatar} name={author.displayName} size="md" />
                <div className="text-right min-w-0">
                  <div className="text-white font-semibold text-sm truncate">{author.displayName}</div>
                  <div className="text-xs text-gray-500">{author.followers.length} متابِع</div>
                </div>
              </button>
              {author.id !== currentUser.id && (
                <button
                  onClick={() => toggleFollow(author.id)}
                  className={`mr-auto px-4 py-1.5 rounded-full text-sm font-medium ${isFollowing ? 'bg-gray-800 text-gray-300' : 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white'}`}
                >
                  {isFollowing ? 'متابَع' : 'متابعة'}
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <div className="flex items-center bg-gray-900 border border-gray-800 rounded-full">
              <button onClick={() => togglePostLike(post, currentUser.id, setPosts)} className={`pl-2 pr-4 py-2 flex items-center gap-2 ${isLiked ? 'text-red-400' : 'text-gray-300'}`}>
                <Heart size={18} className={isLiked ? 'fill-red-400' : ''} />
              </button>
              <button onClick={() => post.likes.length > 0 && setListModal({ title: 'الإعجابات', ids: post.likes })} className="pl-4 pr-1 py-2 text-sm text-gray-300">
                {post.likes.length}
              </button>
            </div>
            <button onClick={() => setCommentsOpen(true)} className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-full text-sm text-gray-300 flex items-center gap-2">
              <MessageCircle size={18} /> {commentCount > 0 ? commentCount : 'تعليق'}
            </button>
            <button onClick={() => setShareOpen(true)} className="px-4 py-2 bg-gradient-to-r from-violet-600/25 to-cyan-500/20 border border-violet-400/30 rounded-full text-sm text-white flex items-center gap-2 active:scale-95 transition-transform">
              <Share2 size={16} className="text-cyan-300" /> مشاركة
            </button>
            <button onClick={() => { void downloadFile(post.media!.url, post.media!.name || 'video.mp4'); }} className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-full text-sm text-gray-300 flex items-center gap-2">
              <Download size={16} /> تحميل
            </button>
          </div>
          {post.text && (
            <div className="mt-3 bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 whitespace-pre-wrap">{post.text}</div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <aside className="px-4 sm:px-0 mt-6 lg:mt-12 space-y-4">
          <h2 className="text-white font-bold text-sm">المزيد من الفيديوهات</h2>
          {related.map(v => {
            const a = users.find(u => u.id === v.userId);
            return a ? <VideoCard key={v.id} post={v} author={a} onOpen={() => onOpenRelated(v.id)} /> : null;
          })}
        </aside>
      )}

      {commentsOpen && (
        <ReelComments post={post} users={users} currentUser={currentUser} setPosts={setPosts} onOpenProfile={onOpenProfile} onClose={() => setCommentsOpen(false)} />
      )}
      {shareOpen && author && <ShareSheet post={post} author={author} users={users} currentUser={currentUser} onClose={() => setShareOpen(false)} />}
      {listModal && (
        <UserListModal title={listModal.title} userIds={listModal.ids} users={users} onOpenProfile={onOpenProfile} onClose={() => setListModal(null)} />
      )}
    </div>
  );
}

function VideosTab({ posts, setPosts, users, currentUser, setUsers, onOpenProfile, onCreate, onLoadPage }: {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  users: User[];
  currentUser: User;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  onOpenProfile: (id: string) => void;
  onCreate: () => void;
  onLoadPage: (opts: FetchPostsOptions) => Promise<Post[]>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Post[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [watchId, setWatchId] = useState<string | null>(null);
  useBackLayer(watchId !== null, () => setWatchId(null), 20);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const videos = posts.filter(p => p.isVideo && p.media?.type === 'video').sort((a, b) => b.timestamp - a.timestamp);

  const loadMore = async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const oldest = videos[videos.length - 1];
      const page = await onLoadPage({ kind: 'videos', before: oldest?.cursor, limit: 12 });
      if (page.length < 12) setHasMore(false);
    } catch (e) {
      console.error(e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (videos.length < 8) void loadMore();
  }, []);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loading || query.trim()) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) void loadMore();
    }, { rootMargin: '600px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, videos.length, query]);

  // Search the titles and descriptions of every video, not only the ones already loaded.
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults(null); setSearching(false); return; }
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        setResults(await onLoadPage({ kind: 'videos', search: q, limit: 30 }));
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [query]);

  const fresh = (list: Post[]) => list.map(r => posts.find(p => p.id === r.id) ?? r);
  const shown = fresh(results ?? videos);
  const watching = watchId ? posts.find(p => p.id === watchId) : undefined;

  if (watching && watching.media) {
    return (
      <VideoWatch
        post={watching}
        users={users}
        currentUser={currentUser}
        setUsers={setUsers}
        setPosts={setPosts}
        related={videos.filter(v => v.id !== watching.id).slice(0, 10)}
        onOpenProfile={onOpenProfile}
        onOpenRelated={id => setWatchId(id)}
        onBack={() => setWatchId(null)}
      />
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="relative mb-5 w-full">
        <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="ابحث في الفيديوهات..."
          className="w-full pr-11 pl-10 py-3 bg-gray-900 border border-gray-800 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white" aria-label="مسح">
            <X size={16} />
          </button>
        )}
      </div>

      {shown.length === 0 && !loading && !searching && (
        <div className="text-center py-14">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl kan-fab flex items-center justify-center"><PlayCircle size={30} className="text-white" /></div>
          <p className="text-white font-semibold mb-1">{query ? 'لا توجد نتائج' : 'لا توجد فيديوهات بعد'}</p>
          {!query && <button onClick={onCreate} className="mt-4 px-6 py-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-medium">انشر فيديو</button>}
        </div>
      )}

      <div className="grid grid-cols-1 min-[560px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
        {shown.map(v => {
          const author = users.find(u => u.id === v.userId);
          return author ? <VideoCard key={v.id} post={v} author={author} onOpen={() => setWatchId(v.id)} /> : null;
        })}
      </div>
      <div ref={sentinel} className="h-10 flex items-center justify-center text-xs text-gray-500 mt-4">
        {loading || searching ? 'جارٍ التحميل...' : ''}
      </div>
    </div>
  );
}

// ============ Create Post ============
function CreatePost({ currentUser, setPosts, setActiveTab }: {
  currentUser: User;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  setActiveTab: (tab: 'feed' | 'reels' | 'videos' | 'search' | 'create' | 'profile' | 'settings' | 'messages') => void;
}) {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [media, setMedia] = useState<{ type: 'image' | 'video' | 'file'; url: string; file: File } | null>(null);
  const [cover, setCover] = useState<{ blob: Blob; url: string; custom: boolean } | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [kind, setKind] = useState<'post' | 'reel' | 'video'>('post');
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);
  const [postPct, setPostPct] = useState(0);
  const [extra, setExtra] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const videoOnly = kind !== 'post';

  const clearCover = () => {
    setCover(prev => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []) as File[];
    e.target.value = '';
    if (picked.length === 0) return;
    setError('');
    const usable = picked.filter(f => f.size <= MAX_FILE_MB * 1024 * 1024);
    if (usable.length < picked.length) setError(`تم تجاهل ${picked.length - usable.length} ملف لتجاوزه ${MAX_FILE_MB} ميجابايت`);
    if (usable.length === 0) return;
    if (videoOnly) {
      if (detectMediaKind(usable[0]) !== 'video') { setError('اختر ملف فيديو'); return; }
    } else if (media) {
      setExtra(prev => [...prev, ...usable]); // an album: they all go into one post
      return;
    }
    const file = usable[0];
    if (!videoOnly && usable.length > 1) setExtra(prev => [...prev, ...usable.slice(1)]);
    const fileKind = detectMediaKind(file);
    if (media && media.url) URL.revokeObjectURL(media.url);
    setMedia({ type: fileKind, url: fileKind === 'file' ? '' : URL.createObjectURL(file), file });
    if (kind === 'video') {
      // Use a frame of the video as the cover until you pick your own image.
      setCoverBusy(true);
      void captureVideoFrame(file).then(blob => {
        setCoverBusy(false);
        if (!blob) return;
        setCover(prev => (prev?.custom ? prev : { blob, url: URL.createObjectURL(blob), custom: false }));
      });
    }
  };

  const handleCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setError('الغلاف يجب أن يكون صورة JPG أو PNG أو WebP'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('حجم الغلاف يجب أن لا يتجاوز 5 ميجابايت'); return; }
    setError('');
    clearCover();
    setCover({ blob: file, url: URL.createObjectURL(file), custom: true });
  };

  const switchKind = (next: 'post' | 'reel' | 'video') => {
    setKind(next);
    setError('');
    if (next !== 'post' && media && media.type !== 'video') {
      if (media.url) URL.revokeObjectURL(media.url);
      setMedia(null);
    }
    if (next !== 'video') { clearCover(); setTitle(''); }
  };

  const handlePost = async () => {
    if (posting) return;
    if (videoOnly && media?.type !== 'video') { setError(kind === 'reel' ? 'اختر فيديو لنشره كريل' : 'اختر الفيديو أولاً'); return; }
    if (kind === 'video' && !title.trim()) { setError('اكتب عنواناً للفيديو'); return; }
    if (!text.trim() && !media) { setError('اكتب شيئاً أو أضف صورة أو فيديو أو ملف'); return; }
    setPosting(true);
    setPostPct(0);
    setError('');
    const uploaded: string[] = [];
    try {
      let mediaUrl: string | null = null;
      let coverUrl: string | null = null;
      // Photos are shrunk first and everything uploads 3 at a time, so publishing is much faster.
      const files: File[] = await Promise.all([...(media ? [media.file] : []), ...extra].map(shrinkPhoto));
      const pcts = files.map(() => 0);
      const results: string[] = new Array(files.length);
      let nextIdx = 0;
      const worker = async () => {
        while (nextIdx < files.length) {
          const i = nextIdx++;
          const f = files[i];
          const p = `${currentUser.id}/${crypto.randomUUID()}.${MEDIA_EXT[f.type] ?? safeExt(f.name)}`;
          const { error: upErr } = await uploadWithProgress(POST_MEDIA_BUCKET, p, f, f.type || 'application/octet-stream', '31536000', pct => {
            pcts[i] = pct;
            setPostPct(Math.round(pcts.reduce((x, y) => x + y, 0) / files.length));
          });
          if (upErr) throw upErr;
          uploaded.push(p);
          results[i] = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(p).data.publicUrl;
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      const offset = media ? 1 : 0;
      if (media) mediaUrl = results[0];
      const extraMedia: { type: 'image' | 'video' | 'file'; url: string; name: string; size: number }[] =
        files.slice(offset).map((f, k) => ({ type: detectMediaKind(f), url: results[offset + k], name: f.name.slice(0, 200), size: f.size }));
      if (kind === 'video' && cover) {
        const coverPath = `${currentUser.id}/${crypto.randomUUID()}-cover.${cover.blob.type === 'image/png' ? 'png' : cover.blob.type === 'image/webp' ? 'webp' : 'jpg'}`;
        const { error: coverErr } = await supabase.storage
          .from(POST_MEDIA_BUCKET)
          .upload(coverPath, cover.blob, { contentType: cover.blob.type || 'image/jpeg', cacheControl: '31536000' });
        if (coverErr) throw coverErr;
        uploaded.push(coverPath);
        coverUrl = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(coverPath).data.publicUrl;
      }
      const id = crypto.randomUUID();
      const { error: insErr } = await supabase.from('posts').insert({
        id,
        user_id: currentUser.id,
        text: text.trim(),
        media_url: mediaUrl,
        media_type: media ? media.type : null,
        media_name: media ? media.file.name.slice(0, 200) : null,
        media_size: media ? media.file.size : null,
        is_reel: kind === 'reel',
        is_video: kind === 'video',
        title: kind === 'video' ? title.trim().slice(0, 120) : null,
        cover_url: coverUrl,
        media_extra: extraMedia,
      });
      if (insErr) throw insErr;
      const newPost: Post = {
        id, userId: currentUser.id, text: text.trim(),
        media: mediaUrl && media ? { type: media.type, url: mediaUrl, name: media.file.name, size: media.file.size } : undefined,
        isReel: kind === 'reel',
        isVideo: kind === 'video',
        title: kind === 'video' ? title.trim().slice(0, 120) : undefined,
        coverUrl: coverUrl ?? undefined,
        extraMedia: extraMedia.length > 0 ? extraMedia : undefined,
        cursor: new Date().toISOString(),
        timestamp: Date.now(), likes: [], comments: [], bookmarks: [],
      };
      setPosts(prev => [newPost, ...prev.filter(p => p.id !== id)]);
      if (media && media.url) URL.revokeObjectURL(media.url);
      clearCover();
      setText('');
      setTitle('');
      setMedia(null);
      setExtra([]);
      // Everything you publish shows up on the home feed first.
      setActiveTab('feed');
    } catch (e) {
      console.error(e);
      if (uploaded.length > 0) void supabase.storage.from(POST_MEDIA_BUCKET).remove(uploaded);
      setError('تعذّر النشر، حاول مرة أخرى');
    } finally {
      setPosting(false);
    }
  };

  const heading = kind === 'reel' ? 'ريل جديد' : kind === 'video' ? 'فيديو جديد' : 'منشور جديد';

  return (
    <div className="px-4 py-4">
      <h2 className="text-xl font-bold text-white mb-4">{heading}</h2>
      <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800 mb-4">
        {([{ key: 'post' as const, label: 'منشور' }, { key: 'reel' as const, label: 'ريل 🎬' }, { key: 'video' as const, label: 'فيديو ▶️' }]).map(t => (
          <button
            key={t.key}
            onClick={() => switchKind(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${kind === t.key ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        {kind === 'video' && (
          <input
            value={title}
            onChange={e => setTitle(e.target.value.slice(0, 120))}
            placeholder="عنوان الفيديو"
            className="w-full px-4 py-3 mb-3 bg-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        )}
        <div className="flex gap-3 mb-4">
          <Avatar userId={currentUser.id} src={currentUser.avatar} name={currentUser.displayName} size="md" />
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            placeholder={kind === 'reel' ? 'اكتب وصفاً للريل...' : kind === 'video' ? 'وصف الفيديو (اختياري)...' : 'ماذا يدور في ذهنك؟'} rows={4}
            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none resize-none text-lg"
          />
        </div>
        {media && (
          <div className="mb-4 relative">
            {media.type === 'image' ? (
              <img src={media.url} alt="" className="w-full rounded-xl max-h-64 object-cover" />
            ) : media.type === 'video' ? (
              <video src={media.url} controls playsInline className="w-full rounded-xl max-h-64" />
            ) : (
              <div className="flex items-center gap-3 p-3 bg-gray-800/60 border border-gray-700 rounded-xl">
                <FileText size={32} className="shrink-0 text-cyan-400" />
                <div className="min-w-0">
                  <div className="text-white font-medium truncate" dir="auto">{media.file.name}</div>
                  <div className="text-xs text-gray-500">{formatBytes(media.file.size)}</div>
                </div>
              </div>
            )}
            <button onClick={() => { if (media.url) URL.revokeObjectURL(media.url); setMedia(null); clearCover(); }} className="absolute top-2 left-2 p-1.5 bg-gray-900/80 rounded-full text-white hover:bg-red-500">
              <X size={14} />
            </button>
          </div>
        )}
        {extra.length > 0 && (
          <div className="mb-4 rounded-xl bg-gray-800/60 border border-gray-700 p-3">
            <div className="flex items-center justify-between mb-2 text-xs text-gray-300">
              <span>+{extra.length} ملفات ستُنشر في نفس المنشور</span>
              <button onClick={() => setExtra([])} className="text-gray-400 hover:text-red-400">إزالة الكل</button>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {extra.map((f, i) => (
                <div key={`${f.name}-${i}`} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center">
                  {detectMediaKind(f) === 'image' ? <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" /> : detectMediaKind(f) === 'video' ? <Play size={20} className="text-white" fill="white" /> : <FileText size={22} className="text-cyan-400" />}
                  <button onClick={() => setExtra(prev => prev.filter((_, j) => j !== i))} className="absolute top-0.5 left-0.5 p-0.5 rounded-full bg-black/70 text-white" aria-label="إزالة"><X size={11} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
        {kind === 'video' && media && (
          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-2">صورة الغلاف</div>
            <div className="flex items-center gap-3">
              <div className="w-40 aspect-video rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
                {cover
                  ? <img src={cover.url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-xs text-gray-500">{coverBusy ? 'جارٍ الالتقاط...' : 'بدون غلاف'}</span>}
              </div>
              <button onClick={() => coverRef.current?.click()} className="px-4 py-2 rounded-full bg-gray-800 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2">
                <ImageIcon size={16} /> اختيار غلاف
              </button>
              <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCover} className="hidden" />
            </div>
          </div>
        )}
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <div className="flex items-center justify-between border-t border-gray-800 pt-3">
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" multiple={!videoOnly} accept={videoOnly ? 'video/*' : undefined} onChange={handleFile} className="hidden" />
            {!videoOnly && (
              <button onClick={() => fileRef.current?.click()} className="p-2 text-cyan-400 hover:bg-gray-800 rounded-full transition-colors" aria-label="صورة">
                <ImageIcon size={20} />
              </button>
            )}
            <button onClick={() => fileRef.current?.click()} className="p-2 text-green-400 hover:bg-gray-800 rounded-full transition-colors" aria-label="فيديو">
              <Video size={20} />
            </button>
            {!videoOnly && (
              <button onClick={() => fileRef.current?.click()} className="p-2 text-amber-400 hover:bg-gray-800 rounded-full transition-colors" aria-label="ملف">
                <Paperclip size={20} />
              </button>
            )}
            <div className="relative">
              <button onClick={() => setEmojiOpen(o => !o)} className="p-2 text-yellow-400 hover:bg-gray-800 rounded-full transition-colors" aria-label="إيموجي">
                <Smile size={20} />
              </button>
              {emojiOpen && <EmojiPicker onPick={e => setText(t => t + e)} onClose={() => setEmojiOpen(false)} />}
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handlePost} disabled={posting} className="px-6 py-2 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full text-white font-medium disabled:opacity-60">
            {posting ? (media ? `جارٍ النشر... ${postPct}%` : 'جارٍ النشر...') : kind === 'reel' ? 'نشر الريل' : kind === 'video' ? 'نشر الفيديو' : 'نشر'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ============ Search Tab ============
function SearchTab({ users, currentUser, setUsers, onStartChat, onOpenProfile }: {
  users: User[];
  currentUser: User;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  onStartChat: (userId: string) => void;
  onOpenProfile: (userId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = users.filter(u =>
    u.id !== currentUser.id &&
    (u.username.toLowerCase().includes(query.toLowerCase()) || u.displayName.toLowerCase().includes(query.toLowerCase()))
  );

  const toggleFollow = makeToggleFollow(currentUser, setUsers);

  return (
    <div className="px-4 py-4">
      <div className="relative mb-6">
        <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث عن أشخاص..." className="w-full pr-12 pl-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500" />
      </div>
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-8">
            <Users size={48} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">{query ? 'لا توجد نتائج' : 'ابدأ بالبحث عن أشخاص'}</p>
          </div>
        )}
        {filtered.map(user => {
          const isFollowing = currentUser.following.includes(user.id);
          return (
            <motion.div key={user.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded-xl">
              <button onClick={() => onOpenProfile(user.id)} className="flex items-center gap-3 flex-1 min-w-0 text-right">
                <Avatar userId={user.id} src={user.avatar} name={user.displayName} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{user.displayName}</div>
                  <div className="text-sm text-gray-500">@{user.username}</div>
                  {user.bio && <div className="text-xs text-gray-400 truncate mt-0.5">{user.bio}</div>}
                </div>
              </button>
              <div className="flex gap-2">
                <button onClick={() => onStartChat(user.id)} className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-gray-800 rounded-full transition-all" title="راسل">
                  <MessageSquare size={18} />
                </button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => toggleFollow(user.id)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${isFollowing ? 'bg-gray-800 text-gray-300 hover:bg-red-500/20 hover:text-red-400' : 'bg-violet-600 text-white hover:bg-violet-500'}`}>
                  {isFollowing ? 'متابَع' : 'متابعة'}
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============ Profile Tab ============
function ProfileTab({ currentUser, users, posts, setPosts, onOpenProfile, onLoadPage }: {
  currentUser: User; users: User[]; posts: Post[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  onOpenProfile: (id: string) => void;
  onLoadPage: (opts: FetchPostsOptions) => Promise<Post[]>;
}) {
  const [listModal, setListModal] = useState<{ title: string; ids: string[] } | null>(null);
  const [tab, setTab] = useState<'posts' | 'likes' | 'bookmarks'>('posts');

  // The feed only holds the newest posts, so fetch what this profile needs.
  useEffect(() => {
    void (async () => {
      try {
        if (tab === 'posts') {
          await onLoadPage({ userId: currentUser.id, limit: 40 });
          return;
        }
        const table = tab === 'likes' ? 'post_likes' : 'bookmarks';
        const { data } = await supabase.from(table).select('post_id').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(40);
        const ids = ((data ?? []) as { post_id: string }[]).map(r => r.post_id);
        if (ids.length > 0) await onLoadPage({ ids, limit: 40 });
      } catch (e) {
        console.error(e);
      }
    })();
  }, [tab]);
  const myPosts = posts.filter(p => p.userId === currentUser.id).sort((a, b) => b.timestamp - a.timestamp);
  const likedPosts = posts.filter(p => p.likes.includes(currentUser.id)).sort((a, b) => b.timestamp - a.timestamp);
  const bookmarkedPosts = posts.filter(p => p.bookmarks.includes(currentUser.id)).sort((a, b) => b.timestamp - a.timestamp);
  const displayPosts = tab === 'posts' ? myPosts : tab === 'likes' ? likedPosts : bookmarkedPosts;

  return (
    <div className="px-4 py-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
        <div className="flex items-start gap-4">
          <ProfileStoryAvatar user={currentUser} currentUser={currentUser} users={users} />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{currentUser.displayName}</h2>
            <p className="text-gray-500 text-sm">@{currentUser.username}</p>
            {currentUser.bio && <p className="text-gray-300 mt-2 text-sm">{currentUser.bio}</p>}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              {currentUser.location && <span className="flex items-center gap-1"><MapPin size={14} />{currentUser.location}</span>}
              {currentUser.website && <span className="flex items-center gap-1 text-cyan-400"><LinkIcon size={14} />{currentUser.website}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-800">
          <div className="text-center"><div className="text-lg font-bold text-white">{myPosts.length}</div><div className="text-xs text-gray-500">منشور</div></div>
          <button onClick={() => setListModal({ title: 'المتابِعون', ids: currentUser.followers })} className="text-center hover:opacity-80"><div className="text-lg font-bold text-white">{currentUser.followers.length}</div><div className="text-xs text-gray-500">متابِع</div></button>
          <button onClick={() => setListModal({ title: 'يتابع', ids: currentUser.following })} className="text-center hover:opacity-80"><div className="text-lg font-bold text-white">{currentUser.following.length}</div><div className="text-xs text-gray-500">متابَع</div></button>
          <div className="mr-auto text-xs text-gray-500 flex items-center gap-1">
            <Calendar size={14} />
            انضم {new Date(currentUser.joinDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>
      <div className="seg flex gap-1 mb-4 bg-gray-900/70 rounded-2xl p-1 border border-white/5">
        {[{ key: 'posts' as const, label: 'منشوراتي', Icon: FileText, n: myPosts.length }, { key: 'likes' as const, label: 'إعجاباتي', Icon: Heart, n: likedPosts.length }, { key: 'bookmarks' as const, label: 'محفوظاتي', Icon: Bookmark, n: bookmarkedPosts.length }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`seg-btn relative flex-1 basis-0 px-1 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t.key ? 'seg-on text-violet-100' : 'text-gray-500 hover:text-gray-300'}`}>
            {tab === t.key && <span className="seg-pill absolute inset-0 rounded-xl bg-violet-500/15 ring-1 ring-violet-400/25" />}
            <span className="relative flex items-center justify-center gap-1.5 whitespace-nowrap text-[13px] min-[400px]:text-sm">
              <t.Icon size={15} className="hidden min-[380px]:block shrink-0" />
              <span>{t.label}</span>
              {t.n > 0 && <span className="hidden min-[420px]:inline text-[10px] tabular-nums text-gray-500">{t.n}</span>}
            </span>
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {displayPosts.length === 0 ? (
          <div className="text-center py-8"><p className="text-gray-500">لا توجد منشورات</p></div>
        ) : displayPosts.map(post => (
          <PostCard key={post.id} post={post} setPosts={setPosts} users={users} currentUser={currentUser} onOpenProfile={onOpenProfile} />
        ))}
      </div>
      {listModal && (
        <UserListModal title={listModal.title} userIds={listModal.ids} users={users} onOpenProfile={onOpenProfile} onClose={() => setListModal(null)} />
      )}
    </div>
  );
}

// ============ Follow helper ============
function makeToggleFollow(currentUser: User, setUsers: React.Dispatch<React.SetStateAction<User[]>>) {
  const flipFollow = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === currentUser.id) {
        return { ...u, following: u.following.includes(userId) ? u.following.filter(id => id !== userId) : [...u.following, userId] };
      }
      if (u.id === userId) {
        return { ...u, followers: u.followers.includes(currentUser.id) ? u.followers.filter(id => id !== currentUser.id) : [...u.followers, currentUser.id] };
      }
      return u;
    }));
  };
  return async (userId: string) => {
    const already = currentUser.following.includes(userId);
    flipFollow(userId);
    const { error } = already
      ? await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', userId)
      : await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: userId });
    if (error) flipFollow(userId);
  };
}

// ============ People list (likes, followers, following) ============
function UserListModal({ title, userIds, users, onOpenProfile, onClose }: {
  title: string;
  userIds: string[];
  users: User[];
  onOpenProfile: (id: string) => void;
  onClose: () => void;
}) {
  useBackLayer(true, onClose);
  const list = userIds.map(id => users.find(u => u.id === id)).filter((u): u is User => Boolean(u));
  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl max-h-[75vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="font-bold text-white">{title} <span className="text-gray-500 text-sm font-normal">({list.length})</span></h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto p-2">
          {list.length === 0 ? (
            <p className="text-center text-gray-500 py-8">لا أحد بعد</p>
          ) : list.map(u => (
            <button key={u.id} onClick={() => { onClose(); onOpenProfile(u.id); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800 text-right">
              <Avatar userId={u.id} src={u.avatar} name={u.displayName} size="md" />
              <div className="min-w-0">
                <div className="text-white font-medium truncate">{u.displayName}</div>
                <div className="text-sm text-gray-500">@{u.username}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============ Another person's profile ============
function UserProfile({ userId, currentUser, users, posts, setUsers, setPosts, onOpenProfile, onStartChat, onBack, onLoadPage }: {
  userId: string;
  currentUser: User;
  users: User[];
  posts: Post[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  onOpenProfile: (id: string) => void;
  onStartChat: (id: string) => void;
  onBack: () => void;
  onLoadPage: (opts: FetchPostsOptions) => Promise<Post[]>;
}) {
  const [listModal, setListModal] = useState<{ title: string; ids: string[] } | null>(null);
  useEffect(() => {
    void onLoadPage({ userId, limit: 40 }).catch(e => console.error(e));
  }, [userId]);
  const user = users.find(u => u.id === userId);
  const toggleFollow = makeToggleFollow(currentUser, setUsers);

  const backButton = (
    <button onClick={onBack} className="flex items-center gap-1 text-gray-400 hover:text-white mb-3 text-sm">
      <ChevronRight size={18} /> رجوع
    </button>
  );

  if (!user) {
    return (
      <div className="px-4 py-4">
        {backButton}
        <p className="text-center text-gray-500 py-8">المستخدم غير موجود</p>
      </div>
    );
  }

  const userPosts = posts.filter(p => p.userId === user.id).sort((a, b) => b.timestamp - a.timestamp);
  const isFollowing = currentUser.following.includes(user.id);
  const followsYou = user.following.includes(currentUser.id);

  return (
    <div className="px-4 py-4">
      {backButton}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
        <div className="flex items-start gap-4">
          <ProfileStoryAvatar user={user} currentUser={currentUser} users={users} />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white">{user.displayName}</h2>
            <p className="text-gray-500 text-sm">
              @{user.username}
              {followsYou && <span className="mr-2 px-2 py-0.5 bg-gray-800 text-gray-300 rounded-full text-xs">يتابعك</span>}
            </p>
            {user.bio && <p className="text-gray-300 mt-2 text-sm">{user.bio}</p>}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
              {user.location && <span className="flex items-center gap-1"><MapPin size={14} />{user.location}</span>}
              {user.website && <span className="flex items-center gap-1 text-cyan-400"><LinkIcon size={14} />{user.website}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => toggleFollow(user.id)} className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${isFollowing ? 'bg-gray-800 text-gray-300 hover:bg-red-500/20 hover:text-red-400' : 'bg-violet-600 text-white hover:bg-violet-500'}`}>
            {isFollowing ? 'متابَع' : 'متابعة'}
          </motion.button>
          <button onClick={() => onStartChat(user.id)} className="px-5 py-2 rounded-full text-sm font-medium bg-gray-800 text-cyan-400 hover:bg-gray-700 flex items-center gap-2">
            <MessageSquare size={16} /> راسل
          </button>
        </div>
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-800">
          <div className="text-center"><div className="text-lg font-bold text-white">{userPosts.length}</div><div className="text-xs text-gray-500">منشور</div></div>
          <button onClick={() => setListModal({ title: 'المتابِعون', ids: user.followers })} className="text-center hover:opacity-80"><div className="text-lg font-bold text-white">{user.followers.length}</div><div className="text-xs text-gray-500">متابِع</div></button>
          <button onClick={() => setListModal({ title: 'يتابع', ids: user.following })} className="text-center hover:opacity-80"><div className="text-lg font-bold text-white">{user.following.length}</div><div className="text-xs text-gray-500">متابَع</div></button>
          <div className="mr-auto text-xs text-gray-500 flex items-center gap-1">
            <Calendar size={14} />
            انضم {new Date(user.joinDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {userPosts.length === 0 ? (
          <div className="text-center py-8"><p className="text-gray-500">لا توجد منشورات</p></div>
        ) : userPosts.map(post => (
          <PostCard key={post.id} post={post} setPosts={setPosts} users={users} currentUser={currentUser} onOpenProfile={onOpenProfile} />
        ))}
      </div>
      {listModal && (
        <UserListModal title={listModal.title} userIds={listModal.ids} users={users} onOpenProfile={onOpenProfile} onClose={() => setListModal(null)} />
      )}
    </div>
  );
}

// ============ Settings Tab ============
// ============ Install the site as an app ============
function InstallCard() {
  const { installed, canPrompt, ios } = useInstallState();
  const [busy, setBusy] = useState(false);
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4">
      <div className="flex items-center gap-3">
        <img src={LOGO_URL} alt="" className="w-12 h-12 rounded-xl" />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white">تثبيت التطبيق</h3>
          <p className="text-xs text-gray-500">افتح KAN من شاشتك الرئيسية مثل أي تطبيق</p>
        </div>
        {installed ? (
          <span className="text-xs text-emerald-400 flex items-center gap-1"><Check size={14} /> مثبّت</span>
        ) : canPrompt ? (
          <button
            onClick={async () => { setBusy(true); await promptInstall(); setBusy(false); }}
            disabled={busy}
            className="px-4 py-1.5 rounded-full text-sm font-medium bg-violet-600 text-white disabled:opacity-60"
          >
            تثبيت
          </button>
        ) : null}
      </div>
      {!installed && !canPrompt && (
        <p className="mt-3 text-xs text-gray-400">
          {ios
            ? 'على الآيفون: اضغط زر المشاركة في Safari ثم «إضافة إلى الشاشة الرئيسية».'
            : 'من قائمة المتصفح (⋮) اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». إن لم يظهر الخيار افتح الموقع في Chrome أو Edge.'}
        </p>
      )}
    </div>
  );
}

function InstallBanner() {
  const { installed, canPrompt } = useInstallState();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('kan_install_dismissed') === '1'; } catch { return false; }
  });
  if (installed || !canPrompt || dismissed) return null;
  return (
    <div className="mx-4 mt-3 p-3 bg-violet-600/15 border border-violet-500/30 rounded-xl flex items-center gap-3">
      <img src={LOGO_URL} alt="" className="w-9 h-9 rounded-lg" />
      <div className="flex-1 text-sm text-white">ثبّت KAN على جهازك</div>
      <button onClick={() => { void promptInstall(); }} className="px-3 py-1 bg-violet-600 hover:bg-violet-500 rounded-full text-xs text-white">تثبيت</button>
      <button
        onClick={() => { setDismissed(true); try { localStorage.setItem('kan_install_dismissed', '1'); } catch { /* ignore */ } }}
        className="p-1 text-gray-400 hover:text-white"
        aria-label="إخفاء"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ============ Notifications & sound settings ============
function NotificationSettings() {
  const supported = pushSupported();
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<string>(supported ? Notification.permission : 'unsupported');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [sound, setSound] = useState(soundEnabled());

  useEffect(() => {
    if (!supported) return;
    void (async () => {
      const reg = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL as string);
      const sub = await reg?.pushManager.getSubscription();
      setSubscribed(Boolean(sub) && Notification.permission === 'granted');
    })();
  }, []);

  const turnOn = async () => {
    setBusy(true);
    setMessage('');
    const result = await enablePush();
    setPermission(pushSupported() ? Notification.permission : 'unsupported');
    setSubscribed(result === 'ok');
    if (result === 'denied') setMessage('تم رفض الإذن. فعّل الإشعارات لهذا الموقع من إعدادات المتصفح ثم حاول مرة أخرى.');
    if (result === 'unsupported') setMessage('هذا المتصفح لا يدعم الإشعارات.');
    if (result === 'error') setMessage('تعذّر تفعيل الإشعارات، حاول مرة أخرى.');
    setBusy(false);
  };

  const turnOff = async () => {
    setBusy(true);
    await disablePush();
    setSubscribed(false);
    setBusy(false);
  };

  const sendTest = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL as string);
      await reg?.showNotification('KAN', { body: 'الإشعارات تعمل على هذا الجهاز ✅', icon: `${import.meta.env.BASE_URL as string}icon-192.png` });
    } catch (e) {
      console.error(e);
      setMessage('تعذّر عرض الإشعار التجريبي.');
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4 space-y-4">
      <h3 className="font-bold text-white">الإشعارات والصوت</h3>

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-white text-sm font-medium">صوت الرسائل</div>
          <div className="text-xs text-gray-500">نغمة عند وصول رسالة أو إرسالها</div>
        </div>
        <button
          onClick={() => { const next = !sound; setSound(next); setSoundEnabled(next); if (next) { unlockAudio(); playSound('receive'); } }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${sound ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          {sound ? 'مفعّل' : 'متوقف'}
        </button>
      </div>

      <div className="border-t border-gray-800 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-white text-sm font-medium">إشعارات الرسائل</div>
            <div className="text-xs text-gray-500">تصلك حتى لو كان الموقع مغلقاً</div>
          </div>
          {subscribed ? (
            <button onClick={turnOff} disabled={busy} className="px-4 py-1.5 rounded-full text-sm font-medium bg-gray-800 text-gray-300 disabled:opacity-60">إيقاف</button>
          ) : (
            <button onClick={turnOn} disabled={busy || !supported} className="px-4 py-1.5 rounded-full text-sm font-medium bg-violet-600 text-white disabled:opacity-60">
              {busy ? '...' : 'تفعيل'}
            </button>
          )}
        </div>
        {subscribed && (
          <button onClick={sendTest} className="mt-3 text-xs text-cyan-400 hover:underline">إرسال إشعار تجريبي</button>
        )}
        {permission === 'denied' && !subscribed && (
          <p className="mt-3 text-xs text-amber-400">الإشعارات محظورة لهذا الموقع. افتح إعدادات الموقع في المتصفح واسمح بالإشعارات.</p>
        )}
        {!supported && (
          <p className="mt-3 text-xs text-gray-400">
            على الآيفون: افتح الموقع في Safari، اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»، وافتح التطبيق من الأيقونة (يتطلب iOS 16.4 أو أحدث).
          </p>
        )}
        {message && <p className="mt-3 text-xs text-red-400">{message}</p>}
      </div>
    </div>
  );
}

function LikeStylePicker() {
  const cur = useLikeStyle();
  const [demo, setDemo] = useState(0);
  const opts: { id: LikeStyle; label: string; hint: string }[] = [
    { id: 'heart', label: 'قلب', hint: 'قلب عادي بألوان المنصة' },
    { id: 'coin', label: 'عملة', hint: 'عملة KAN مكسورة تتجمّع' },
    { id: 'flames', label: '3 قلوب', hint: 'ثلاث قلوب بنار المنصة تلتحم' },
  ];
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="text-sm font-semibold text-white mb-1">شكل الإعجاب</div>
      <p className="text-xs text-gray-400 mb-3">يظهر عند الضغط مرتين على المنشور أو الرسالة</p>
      <div className="grid grid-cols-3 gap-2">
        {opts.map(o => (
          <button key={o.id} onClick={() => { setLikeStyleStored(o.id); setDemo(n => n + 1); }}
            className={`rounded-xl border p-2.5 text-center active:scale-95 transition-transform ${cur === o.id ? 'border-violet-400 bg-violet-500/15 text-white' : 'border-white/10 bg-white/5 text-gray-300'}`}>
            <div className="text-sm font-semibold">{o.label}</div>
            <div className="text-[10px] text-gray-400 mt-0.5 leading-4">{o.hint}</div>
          </button>
        ))}
      </div>
      <div className="relative h-36 mt-3 rounded-xl bg-black/20 border border-white/5 overflow-hidden">
        {demo > 0 ? <CoinBurst key={demo} /> : <p className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">اختر شكلاً لمعاينته</p>}
      </div>
    </div>
  );
}

function RingStylePicker() {
  const [cur, setCur] = useState<RingStyle>(getRingStyle);
  const opts: { id: RingStyle; label: string }[] = [{ id: 'kan', label: 'KAN' }, { id: 'insta', label: 'ألوان دافئة' }, { id: 'green', label: 'أخضر' }, { id: 'off', label: 'إيقاف' }];
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="text-sm font-semibold text-white mb-1">حلقة القصة حول الصورة</div>
      <p className="text-xs text-gray-400 mb-3">تظهر حول صورة أي شخص لديه قصة نشطة، ورمادية بعد أن تشاهدها</p>
      <div className="grid grid-cols-4 gap-2">
        {opts.map(o => (
          <button key={o.id} onClick={() => { setCur(o.id); setRingStyleStored(o.id); }} className={`rounded-xl border p-2 flex flex-col items-center gap-1.5 active:scale-95 transition-transform ${cur === o.id ? 'border-violet-400 bg-violet-500/15' : 'border-white/10 bg-white/5'}`}>
            <span className="w-9 h-9 rounded-full p-[2px]" style={{ background: o.id === 'off' ? '#4b5563' : RING_BG[o.id] }}><span className="block w-full h-full rounded-full bg-gray-900" /></span>
            <span className="text-[11px] text-gray-200">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsTab({ currentUser, setUsers }: {
  currentUser: User;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}) {
  const [theme, setThemeState] = useState<ThemeKey>(getTheme());
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [bio, setBio] = useState(currentUser.bio);
  const [location, setLocation] = useState(currentUser.location);
  const [website, setWebsite] = useState(currentUser.website);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadFile } = useImageUpload(2);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSaveError('يرجى اختيار صورة فقط');
      return;
    }
    try {
      const url = await shrinkImage(await uploadFile(file), 256);
      setAvatar(url);
      setSaveError('');
    } catch (err) {
      setSaveError(typeof err === 'string' ? err : 'فشل رفع الصورة');
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      setSaveError('الاسم المعروض مطلوب');
      return;
    }
    setSaveError('');
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), bio, location, website, avatar })
      .eq('id', currentUser.id);
    if (error) {
      setSaveError('تعذّر حفظ التغييرات، حاول مرة أخرى');
      return;
    }
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, displayName: displayName.trim(), bio, location, website, avatar } : u));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <h2 className="text-xl font-bold text-white">الإعدادات</h2>
      <LikeStylePicker />
      <RingStylePicker />
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="text-sm font-semibold text-white mb-1">المظهر</div>
        <p className="text-xs text-gray-400 mb-3">اختر الثيم الذي يريحك</p>
        <div className="grid grid-cols-3 gap-2.5">
          {([
            { key: 'kan', label: 'KAN Theme', bg: '#0b0b1a', card: '#1b1b36', accent: 'linear-gradient(135deg,#7c3aed,#06b6d4)', line: '#35355a' },
            { key: 'light', label: 'فاتح', bg: '#f3f3f7', card: '#ffffff', accent: '#6366f1', line: '#d8d8e2' },
            { key: 'dark', label: 'داكن', bg: '#000000', card: '#121212', accent: '#5b5ef4', line: '#2a2a2e' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => { setTheme(t.key); setThemeState(t.key); }} className={`rounded-2xl p-2 border-2 transition-all active:scale-95 ${theme === t.key ? 'border-violet-500' : 'border-transparent'}`} aria-pressed={theme === t.key}>
              <div className="rounded-xl overflow-hidden h-16 relative" style={{ background: t.bg, boxShadow: `inset 0 0 0 1px ${t.line}` }}>
                <div className="absolute top-2 right-2 left-2 h-2.5 rounded-full" style={{ background: t.card }} />
                <div className="absolute top-6 right-2 left-6 h-4 rounded-md" style={{ background: t.card }} />
                <div className="absolute bottom-2 right-2 w-8 h-2 rounded-full" style={{ background: t.accent }} />
              </div>
              <div className={`mt-1.5 text-xs font-semibold ${theme === t.key ? 'text-white' : 'text-gray-400'}`}>{t.label}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        {/* Avatar Upload */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">الصورة الشخصية</label>
          <div className="flex items-center gap-4">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="relative group">
              {avatar ? (
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-violet-500">
                  <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 flex flex-col items-center justify-center text-gray-400 group-hover:border-violet-500 group-hover:text-violet-400 transition-all">
                  <Camera size={20} />
                  <span className="text-[10px] mt-1">اختر صورة</span>
                </div>
              )}
            </button>
            {avatar && (
              <button onClick={() => setAvatar('')} className="text-sm text-red-400 hover:text-red-300">إزالة الصورة</button>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1 block">الاسم المعروض</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-violet-500" />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">النبذة التعريفية</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="اكتب شيئاً عن نفسك..." className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none" />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">الموقع</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="مثال: القاهرة، مصر" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500" />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">الموقع الإلكتروني</label>
          <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500" />
        </div>
        {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-xl text-white font-medium flex items-center justify-center gap-2">
          {saved ? <><Check size={18} /> تم الحفظ</> : 'حفظ التغييرات'}
        </motion.button>
      </div>
      <InstallCard />
      <NotificationSettings />
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { void (async () => { await detachPush(); await supabase.auth.signOut(); })(); }} className="w-full py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-medium flex items-center justify-center gap-2">
        <LogOut size={18} /> تسجيل الخروج
      </motion.button>
    </div>
  );
}

// ============ Messages Tab ============
function MessagesTab({ currentUser, users, conversations, setConversations, groups, setGroups, reloadGroups, openGroupId, onGroupOpened, onActiveGroupChange, selectedChat, setSelectedChat }: {
  currentUser: User; users: User[];
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  groups: Group[];
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  reloadGroups: () => Promise<void>;
  openGroupId: string | null;
  onGroupOpened: () => void;
  onActiveGroupChange: (id: string | null) => void;
  selectedChat: string | null;
  setSelectedChat: (id: string | null) => void;
}) {
  const myConversations = conversations
    .filter(c => c.participants.includes(currentUser.id))
    .sort((a, b) => b.lastActivity - a.lastActivity);
  const [section, setSection] = useState<'direct' | 'groups'>('direct');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  useBackLayer(selectedGroup !== null, () => setSelectedGroup(null), 20);
  useEffect(() => { onActiveGroupChange(selectedGroup); }, [selectedGroup]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (openGroupId && groups.some(g => g.id === openGroupId)) {
      setSection('groups');
      setSelectedGroup(openGroupId);
      onGroupOpened();
    }
  }, [openGroupId, groups]); // eslint-disable-line react-hooks/exhaustive-deps
  const [creatingGroup, setCreatingGroup] = useState(false);
  const myGroups = groups.slice().sort((a, b) => b.lastActivity - a.lastActivity);
  const directUnread = myConversations.reduce((n, c) => n + c.messages.filter(m => m.senderId !== currentUser.id && !m.read).length, 0);
  const groupsUnread = myGroups.reduce((n, g) => n + groupUnread(g, currentUser.id), 0);
  const activeGroup = selectedGroup ? groups.find(g => g.id === selectedGroup) : undefined;

  const chatUser = selectedChat ? users.find(u => u.id === selectedChat) : null;
  const activeConversation = selectedChat
    ? conversations.find(c => c.participants.includes(currentUser.id) && c.participants.includes(selectedChat))
    : undefined;


  if (activeGroup) {
    return (
      <GroupChatView
        currentUser={currentUser}
        group={activeGroup}
        users={users}
        setGroups={setGroups}
        reload={reloadGroups}
        onBack={() => setSelectedGroup(null)}
      />
    );
  }

  if (selectedChat && chatUser) {
    return (
      <ChatView
        currentUser={currentUser}
        chatUser={chatUser}
        conversation={activeConversation}
        setConversations={setConversations}
        onBack={() => setSelectedChat(null)}
      />
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">المراسلة</h2>
        <button onClick={() => setCreatingGroup(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-xs font-semibold shadow-lg shadow-violet-500/25 active:scale-95 transition-transform">
          <Plus size={15} /> مجموعة جديدة
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1 p-1 mb-4 rounded-full bg-gray-900 border border-gray-800">
        {([['direct', 'الرسائل', directUnread], ['groups', 'المجموعات', groupsUnread]] as const).map(([key, label, count]) => (
          <button key={key} onClick={() => setSection(key)} className={`relative py-2 rounded-full text-sm font-medium transition-all ${section === key ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-md shadow-violet-500/25' : 'text-gray-400 hover:text-white'}`}>
            {label}
            {count > 0 && <span className={`mr-1.5 inline-flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full text-[10px] font-bold ${section === key ? 'bg-white/25 text-white' : 'bg-violet-500 text-white'}`}>{count > 9 ? '9+' : count}</span>}
          </button>
        ))}
      </div>
      {section === 'groups' ? (
        myGroups.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-gray-400 mb-2">لا توجد مجموعات بعد</p>
            <p className="text-gray-500 text-sm">أنشئ مجموعة وأضف أصدقاءك</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myGroups.map(g => {
              const last = [...g.messages].reverse()[0];
              const unread = groupUnread(g, currentUser.id);
              const lastName = last ? (last.senderId === currentUser.id ? 'أنت' : users.find(u => u.id === last.senderId)?.displayName ?? '') : '';
              return (
                <motion.button key={g.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onClick={() => setSelectedGroup(g.id)} className="w-full flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-all text-right">
                  <div className="relative">
                    <GroupAvatar name={g.name} src={g.avatar} size="lg" />
                    {unread > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-violet-500 rounded-full text-xs flex items-center justify-center font-bold">{unread > 9 ? '9+' : unread}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white truncate">{g.name}</span>
                      {last && <span className="text-xs text-gray-500">{formatTime(last.timestamp)}</span>}
                    </div>
                    <p className={`text-sm truncate mt-0.5 ${unread > 0 ? 'text-white font-medium' : 'text-gray-500'}`}>
                      {last ? (last.isSystem ? `${lastName} ${last.text}` : `${lastName}: ${groupMsgPreview(last)}`) : `${g.members.length} عضو`}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )
      ) : myConversations.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-gray-400 mb-2">لا توجد محادثات بعد</p>
          <p className="text-gray-500 text-sm">ابحث عن أشخاص وابدأ المحادثة!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myConversations.map(conv => {
            const otherUserId = conv.participants.find(id => id !== currentUser.id)!;
            const otherUser = users.find(u => u.id === otherUserId);
            if (!otherUser) return null;
            const lastMsg = conv.messages[conv.messages.length - 1];
            const unread = conv.messages.filter(m => m.senderId !== currentUser.id && !m.read).length;
            return (
              <motion.button key={conv.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onClick={() => setSelectedChat(otherUserId)} className="w-full flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-all text-right">
                <div className="relative">
                  <Avatar userId={otherUser.id} src={otherUser.avatar} name={otherUser.displayName} size="lg" />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-violet-500 rounded-full text-xs flex items-center justify-center font-bold">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white truncate">{otherUser.displayName}</span>
                    {lastMsg && <span className="text-xs text-gray-500">{formatTime(lastMsg.timestamp)}</span>}
                  </div>
                  <p className={`text-sm truncate mt-0.5 ${unread > 0 ? 'text-white font-medium' : 'text-gray-500'}`}>
                    {lastMsg
                      ? `${lastMsg.senderId === currentUser.id ? 'أنت: ' : ''}${lastMsg.media?.type === 'voice' ? '🎤 رسالة صوتية' : lastMsg.media ? '📷 وسائط' : lastMsg.text}`
                      : 'ابدأ المحادثة'
                    }
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
      {creatingGroup && (
        <CreateGroupSheet
          users={users}
          me={currentUser}
          onClose={() => setCreatingGroup(false)}
          onCreated={async id => { setCreatingGroup(false); await reloadGroups(); setSection('groups'); setSelectedGroup(id); }}
        />
      )}
    </div>
  );
}

// ============ Voice Recorder ============
function VoiceRecorder({ onSend, onCancel }: {
  onSend: (url: string, duration: number) => void;
  onCancel: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const streamRef = useRef<MediaStream | null>(null);
  // Mirrors `duration` so the (stale) onstop closure reads the real value.
  const durationRef = useRef(0);
  const unmountedRef = useRef(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (unmountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          onSend(reader.result as string, durationRef.current);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setDuration(0);
      durationRef.current = 0;
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }, 1000);
    } catch (err) {
      alert('لا يمكن الوصول للميكروفون. يرجى السماح بالوصول.');
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.onstop = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    onCancel();
  };

  useEffect(() => {
    unmountedRef.current = false;
    startRecording();
    return () => {
      unmountedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl"
    >
      <div className="flex items-center gap-2 flex-1">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <span className="text-red-400 font-mono text-sm">{formatDuration(duration)}</span>
        <div className="flex-1 flex items-center gap-0.5">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{ height: recording ? [4, Math.random() * 20 + 4, 4] : 4 }}
              transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
              className="w-1 bg-red-400 rounded-full"
              style={{ height: 4 }}
            />
          ))}
        </div>
      </div>
      <button onClick={cancelRecording} className="p-2 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-800">
        <X size={18} />
      </button>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={stopRecording}
        className="p-2.5 bg-red-500 rounded-full text-white"
      >
        <Send size={16} />
      </motion.button>
    </motion.div>
  );
}

// ============ Voice Message Player ============
function VoicePlayer({ url, knownDuration = 0 }: { url: string; knownDuration?: number }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  // MediaRecorder WebM blobs report `Infinity` as duration in Chrome, so prefer
  // the duration we measured while recording.
  const [duration, setDuration] = useState(knownDuration);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    const onTime = () => setProgress(audio.currentTime);
    const onEnd = () => { setPlaying(false); setProgress(0); };
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audioRef.current.currentTime = pct * duration;
  };

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button onClick={togglePlay} className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-1 bg-white/20 rounded-full cursor-pointer relative" onClick={seek}>
          <div className="h-full bg-white rounded-full transition-all" style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }} />
        </div>
        <span className="text-[10px] opacity-70 font-mono">{formatDuration(duration || 0)}</span>
      </div>
    </div>
  );
}

// ============ Chat Background Picker ============
function ChatBgPicker({ current, onChange, onImageUpload }: {
  current: ChatBackground | undefined;
  onChange: (bg: ChatBackground) => void;
  onImageUpload: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => onImageUpload(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed inset-x-3 top-[4.5rem] mx-auto max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-4 z-[80] shadow-2xl"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-white text-sm">خلفية المحادثة</h4>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
          <ImageIcon size={12} /> رفع صورة
        </button>
      </div>
      <div className="grid grid-cols-5 gap-2 mb-3">
        {CHAT_GRADIENTS.map((g, i) => (
          <button
            key={i}
            onClick={() => onChange({ type: 'gradient', value: g })}
            className={`h-10 rounded-lg bg-gradient-to-b ${g} border-2 transition-all ${
              current?.type === 'gradient' && current.value === g ? 'border-violet-400 scale-110' : 'border-transparent hover:border-gray-600'
            }`}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onChange({ type: 'color', value: '#0b0b1a' })}
          className={`flex-1 py-2 rounded-lg text-xs border-2 transition-all ${
            current?.type === 'color' ? 'border-violet-400 bg-gray-800' : 'border-gray-700 bg-gray-800 hover:border-gray-600'
          }`}
        >
          افتراضي
        </button>
        <button
          onClick={() => onChange({ type: 'color', value: '#1e1b4b' })}
          className={`flex-1 py-2 rounded-lg text-xs border-2 transition-all ${
            current?.value === '#1e1b4b' ? 'border-violet-400' : 'border-gray-700 hover:border-gray-600'
          }`}
          style={{ backgroundColor: '#1e1b4b' }}
        >
          نيلي
        </button>
        <button
          onClick={() => onChange({ type: 'color', value: '#14532d' })}
          className={`flex-1 py-2 rounded-lg text-xs border-2 transition-all ${
            current?.value === '#14532d' ? 'border-violet-400' : 'border-gray-700 hover:border-gray-600'
          }`}
          style={{ backgroundColor: '#14532d' }}
        >
          أخضر
        </button>
        <button
          onClick={() => onChange({ type: 'color', value: '#4c1d95' })}
          className={`flex-1 py-2 rounded-lg text-xs border-2 transition-all ${
            current?.value === '#4c1d95' ? 'border-violet-400' : 'border-gray-700 hover:border-gray-600'
          }`}
          style={{ backgroundColor: '#4c1d95' }}
        >
          بنفسجي
        </button>
      </div>
    </motion.div>
  );
}

// ============ Chat View ============
// ============ Stickers ============
// A sticker is an ordinary chat image/video whose file name starts with "kan-sticker"; the chat draws it without a bubble.
const isStickerName = (name?: string | null) => !!name && name.startsWith('kan-sticker');
interface SavedSticker { id: string; kind: 'image' | 'video'; blob: Blob; at: number }
const stkDb = () => new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open('kan_stickers', 1);
  r.onupgradeneeded = () => { r.result.createObjectStore('s', { keyPath: 'id' }); };
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
async function stkAll(): Promise<SavedSticker[]> {
  try {
    const db = await stkDb();
    return await new Promise(res => {
      const q = db.transaction('s').objectStore('s').getAll();
      q.onsuccess = () => res((q.result as SavedSticker[]).sort((a, b) => b.at - a.at));
      q.onerror = () => res([]);
    });
  } catch { return []; }
}
async function stkPut(st: SavedSticker) {
  try { const db = await stkDb(); db.transaction('s', 'readwrite').objectStore('s').put(st); } catch (e) { console.error(e); }
}
async function stkDel(id: string) {
  try { const db = await stkDb(); db.transaction('s', 'readwrite').objectStore('s').delete(id); } catch (e) { console.error(e); }
}
const stkExt = (b: Blob, kind: 'image' | 'video') => (b.type.split('/')[1] ?? (kind === 'video' ? 'webm' : 'webp')).split(';')[0];

function drawContain(ctx: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, size: number) {
  const k = Math.min(size / sw, size / sh);
  const w = sw * k, h = sh * k;
  ctx.drawImage(src, (size - w) / 2, (size - h) / 2, w, h);
}

// Picture -> 512px transparent WebP with rounded corners.
function imageToSticker(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = 512;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('canvas')); return; }
      const k = Math.min(size / img.naturalWidth, size / img.naturalHeight);
      const w = img.naturalWidth * k, h = img.naturalHeight * k;
      const x = (size - w) / 2, y = (size - h) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 36);
      ctx.clip();
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
      URL.revokeObjectURL(url);
      c.toBlob(b => (b ? resolve(b) : reject(new Error('blob'))), 'image/webp', 0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img')); };
    img.src = url;
  });
}

// Short video -> a looping square clip (up to 5 s) recorded from a canvas. Returns null when the browser cannot record video.
async function videoToSticker(file: File, start: number, len: number): Promise<Blob | null> {
  if (typeof MediaRecorder === 'undefined') return null;
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m));
  if (!mime) return null;
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.src = url;
  try {
    await new Promise<void>((res, rej) => { v.onloadedmetadata = () => res(); v.onerror = () => rej(new Error('video')); });
    v.currentTime = Math.min(start, Math.max(0, (v.duration || 1) - 0.1));
    await new Promise<void>(res => { v.onseeked = () => res(); });
    const size = 384;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const rec = new MediaRecorder(c.captureStream(30), { mimeType: mime, videoBitsPerSecond: 1_200_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise<void>(res => { rec.onstop = () => res(); });
    const t0 = v.currentTime;
    rec.start();
    await v.play();
    await new Promise<void>(res => {
      const tick = () => {
        ctx.clearRect(0, 0, size, size);
        drawContain(ctx, v, v.videoWidth, v.videoHeight, size);
        if (v.ended || v.currentTime - t0 >= len) { res(); return; }
        requestAnimationFrame(tick);
      };
      tick();
    });
    v.pause();
    rec.stop();
    await done;
    return new Blob(chunks, { type: mime.split(';')[0] });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function StickerThumb({ st, className }: { st: SavedSticker; className?: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(st.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [st.blob]);
  if (!url) return null;
  return st.kind === 'video'
    ? <video src={url} autoPlay loop muted playsInline className={className} />
    : <img src={url} alt="" draggable={false} className={className} />;
}

// Stickers live inside the emoji panel (it replaces the keyboard): tap one to send it.
function StickerPane({ onSend }: { onSend: (st: SavedSticker) => void }) {
  const [list, setList] = useState<SavedSticker[]>([]);
  const [making, setMaking] = useState<File | null>(null);
  const [manage, setManage] = useState(false);
  const pickRef = useRef<HTMLInputElement>(null);
  const reload = () => { void stkAll().then(setList); };
  useEffect(reload, []);
  return (
    <div className="h-60 overflow-y-auto overscroll-contain p-2">
      <input ref={pickRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setMaking(f); }} />
      <div className="grid grid-cols-4 min-[420px]:grid-cols-5 sm:grid-cols-8 gap-2">
        <button onClick={() => pickRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-violet-400/50 text-violet-300 flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-transform">
          <Plus size={20} /><span className="text-[10px]">جديد</span>
        </button>
        {list.map(st => (
          <div key={st.id} className="relative aspect-square rounded-xl bg-white/5 overflow-hidden">
            <button onClick={() => (manage ? undefined : onSend(st))} className="w-full h-full active:scale-90 transition-transform">
              <StickerThumb st={st} className="w-full h-full object-contain" />
            </button>
            {manage && <button onClick={() => { void stkDel(st.id).then(reload); }} aria-label="حذف الملصق" className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center"><X size={12} /></button>}
          </div>
        ))}
      </div>
      {list.length === 0 && <p className="text-center text-gray-500 text-xs pt-5 leading-6">اصنع أول ملصق من صورة أو فيديو قصير</p>}
      {list.length > 0 && <div className="flex justify-center pt-3"><button onClick={() => setManage(m => !m)} className={`px-4 py-1 rounded-full text-[11px] border ${manage ? 'bg-rose-500/20 border-rose-400/40 text-rose-200' : 'bg-white/5 border-white/10 text-gray-400'}`}>{manage ? 'تم' : 'حذف ملصقات'}</button></div>}
      {making && <div onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}><StickerMaker file={making} onClose={() => setMaking(null)} onSaved={st => { setMaking(null); reload(); onSend(st); }} /></div>}
    </div>
  );
}

function StickerMaker({ file, onClose, onSaved }: { file: File; onClose: () => void; onSaved: (st: SavedSticker) => void }) {
  const isVideo = file.type.startsWith('video/') || detectMediaKind(file) === 'video';
  const [url] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const [dur, setDur] = useState(0);
  const [start, setStart] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const vref = useRef<HTMLVideoElement>(null);
  const len = Math.min(5, Math.max(1, dur - start || 5));

  const make = async () => {
    setBusy(true); setErr('');
    try {
      let blob: Blob | null;
      let kind: 'image' | 'video' = 'image';
      if (isVideo) {
        blob = await videoToSticker(file, start, len);
        if (blob) kind = 'video';
        else { setErr('متصفحك لا يدعم تسجيل الفيديو'); setBusy(false); return; }
      } else {
        blob = await imageToSticker(file);
      }
      const st: SavedSticker = { id: crypto.randomUUID(), kind, blob, at: Date.now() };
      await stkPut(st);
      onSaved(st);
    } catch (e) {
      console.error(e);
      setErr('تعذّر إنشاء الملصق، جرّب ملفاً آخر');
      setBusy(false);
    }
  };

  return (
    <SheetShell title="ملصق جديد" onClose={busy ? () => undefined : onClose}>
      <div className="aspect-square max-h-72 mx-auto rounded-2xl bg-white/5 overflow-hidden flex items-center justify-center">
        {isVideo
          ? <video ref={vref} src={url} muted playsInline loop onLoadedMetadata={e => setDur(e.currentTarget.duration || 0)} className="w-full h-full object-contain" />
          : <img src={url} alt="" className="w-full h-full object-contain" />}
      </div>
      {isVideo && dur > 0 && (
        <div className="mt-3">
          <div className="text-xs text-gray-400 mb-1">من الثانية {start.toFixed(1)} (المدة {len.toFixed(1)} ث، بحد أقصى 5)</div>
          <input type="range" min={0} max={Math.max(0, dur - 1)} step={0.1} value={start} dir="ltr"
            onChange={e => { const v = Number(e.target.value); setStart(v); if (vref.current) { vref.current.currentTime = v; void vref.current.play().catch(() => undefined); } }}
            className="w-full accent-violet-500" />
        </div>
      )}
      {err && <p className="text-xs text-rose-300 mt-2 text-center">{err}</p>}
      <button onClick={() => void make()} disabled={busy} className="mt-4 w-full py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 active:scale-95 transition-transform">
        {busy ? <><RefreshCw size={15} className="animate-spin" /> جارٍ إنشاء الملصق...</> : <><Check size={15} /> إنشاء وإرسال الملصق</>}
      </button>
    </SheetShell>
  );
}

function ChatView({ currentUser, chatUser, conversation, setConversations, onBack }: {
  currentUser: User; chatUser: User;
  conversation: Conversation | undefined;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  onBack: () => void;
}) {
  const [text, setText] = useState('');
  const [media, setMedia] = useState<{ type: 'image' | 'video' | 'file'; url: string; file: File } | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [upload, setUpload] = useState<UploadState | null>(null);
  const keepProgress = useRef(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState === 'visible');
  useEffect(() => {
    const onVis = () => setPageVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const [coinMsgId, setCoinMsgId] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [stickerStart, setStickerStart] = useState(false);
  const lastTap = useRef<{ id: string; t: number }>({ id: '', t: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const messages = conversation?.messages || [];
  const bg = conversation?.background;

  // "Typing..." indicator: a lightweight live signal between the two people (nothing is stored).
  const [peerTyping, setPeerTyping] = useState(false);
  const typingTimer = useRef<number | undefined>(undefined);
  const lastTypingSent = useRef(0);
  const typingChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const convId = conversation?.id;

  useEffect(() => {
    if (!convId) return;
    const channel = supabase.channel(`typing:${convId}`, { config: { broadcast: { self: false } } });
    channel.on('broadcast', { event: 'typing' }, payload => {
      if ((payload.payload as { userId?: string } | undefined)?.userId !== chatUser.id) return;
      setPeerTyping(true);
      window.clearTimeout(typingTimer.current);
      typingTimer.current = window.setTimeout(() => setPeerTyping(false), 3500);
    });
    channel.subscribe();
    typingChannel.current = channel;
    return () => {
      window.clearTimeout(typingTimer.current);
      typingChannel.current = null;
      void supabase.removeChannel(channel);
    };
  }, [convId]);

  const notifyTyping = () => {
    const channel = typingChannel.current;
    const now = Date.now();
    if (!channel || now - lastTypingSent.current < 2000) return;
    lastTypingSent.current = now;
    void channel.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUser.id } });
  };

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.senderId === chatUser.id) setPeerTyping(false);
  }, [messages.length]);

  const getBgStyle = () => {
    if (!bg) return { background: '#0b0b1a' };
    if (bg.type === 'image') return { backgroundImage: `url("${bg.value}")`, backgroundSize: 'cover', backgroundPosition: 'center' };
    if (bg.type === 'color') return { background: bg.value };
    return {};
  };

  const getBgClass = () => {
    if (!bg || bg.type !== 'gradient') return '';
    return `bg-gradient-to-b ${bg.value}`;
  };

  const vp = useVisualViewport();
  const [viewer, setViewer] = useState<{ src: string; name?: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // A message turns "read" only after it has really been on screen (and the app is visible).
  useSeenObserver(
    scrollRef,
    pageVisible && !!convId,
    messages.filter(m => m.senderId !== currentUser.id && !m.read).map(m => m.id).join(','),
    ids => {
      if (!convId) return;
      setConversations(prev => prev.map(c => c.id !== convId ? c : { ...c, messages: c.messages.map(m => (ids.includes(m.id) && m.senderId !== currentUser.id ? { ...m, read: true } : m)) }));
      void supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', ids).neq('sender_id', currentUser.id).is('read_at', null).then(({ error }) => { if (error) console.error(error); });
    },
  );
  const stickUntil = useRef(Date.now() + 2500);
  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };
  // Always land on the latest message: when the chat opens, and whenever one arrives or is sent
  // (even if you had scrolled up). Pictures that finish loading keep it pinned for a moment.
  const keepAtBottom = () => {
    stickUntil.current = Date.now() + 2500;
    scrollToBottom();
    window.requestAnimationFrame(scrollToBottom);
    window.setTimeout(scrollToBottom, 150);
    window.setTimeout(scrollToBottom, 600);
  };
  useEffect(() => {
    keepAtBottom();
  }, [convId, messages.length]);
  useEffect(() => {
    keepAtBottom();
  }, [vp.height]);
  useEffect(() => {
    if (peerTyping) scrollToBottom();
  }, [peerTyping]);

  // Returns the conversation id, creating the conversation on the first message.
  const ensureConversation = async (): Promise<string> => {
    if (conversation) return conversation.id;
    const id = await getOrCreateConversation(currentUser.id, chatUser.id);
    setConversations(prev =>
      prev.some(c => c.id === id)
        ? prev
        : [...prev, { id, participants: [currentUser.id, chatUser.id], messages: [], lastActivity: Date.now() }]
    );
    return id;
  };

  const send = async (opts: { text?: string; file?: Blob; mediaType?: 'image' | 'video' | 'voice' | 'file'; duration?: number; fileName?: string; replyToId?: string }): Promise<boolean> => {
    const body = (opts.text ?? '').trim();
    if (!body && !opts.file) return false;
    if (sending) return false;
    setSending(true);
    setError('');
    let path: string | null = null;
    try {
      const convId = await ensureConversation();
      if (opts.file) {
        const ext = CHAT_EXT[opts.file.type] ?? safeExt(opts.fileName);
        path = `${convId}/${crypto.randomUUID()}.${ext}`;
        setUpload(u => u ?? { done: 0, total: 1, pct: 0 });
        const { error: upErr } = await uploadWithProgress(CHAT_MEDIA_BUCKET, path, opts.file, opts.file.type || 'application/octet-stream', '3600', pct => setUpload(u => (u ? { ...u, pct } : u)));
        if (upErr) throw upErr;
      }
      const id = crypto.randomUUID();
      const { error: insErr } = await supabase.from('messages').insert({
        id,
        conversation_id: convId,
        sender_id: currentUser.id,
        text: body,
        media_path: path,
        media_type: opts.file ? opts.mediaType ?? null : null,
        media_duration: opts.mediaType === 'voice' ? Math.round(opts.duration ?? 0) : null,
        media_name: opts.file && opts.fileName ? opts.fileName.slice(0, 200) : null,
        media_size: opts.file ? opts.file.size : null,
        reply_to_id: opts.replyToId ?? null,
      });
      if (insErr) throw insErr;
      const msg: Message = {
        id, senderId: currentUser.id, text: body, timestamp: Date.now(), read: false,
        replyToId: opts.replyToId,
        media: opts.file && opts.mediaType
          ? { type: opts.mediaType, url: URL.createObjectURL(opts.file), duration: opts.duration, name: opts.fileName, size: opts.file.size, path: path ?? undefined }
          : undefined,
      };
      setConversations(prev => prev.map(c =>
        c.id !== convId
          ? c
          : { ...c, messages: c.messages.some(m => m.id === id) ? c.messages : [...c.messages, msg], lastActivity: msg.timestamp }
      ));
      playSound('send');
      return true;
    } catch (e) {
      console.error(e);
      if (path) void supabase.storage.from(CHAT_MEDIA_BUCKET).remove([path]);
      setError('تعذّر إرسال الرسالة، حاول مرة أخرى');
      return false;
    } finally {
      setSending(false);
      if (!keepProgress.current) setUpload(null);
    }
  };

  const sendMessage = async () => {
    if (!text.trim() && !media && queue.length === 0) return;
    const rest = queue;
    const total = (media ? 1 : 0) + rest.length;
    let done = 0;
    keepProgress.current = true;
    if (total > 0) setUpload({ done: 0, total, pct: 0 });
    let ok = true;
    if (text.trim() || media) {
      ok = await send({ text, file: media?.file, mediaType: media?.type, fileName: media?.file.name, replyToId: replyingTo?.id });
      if (ok) { if (media) done++; setText(''); setMedia(null); setReplyingTo(null); }
    }
    for (const f of ok ? rest : []) {
      setUpload({ done, total, pct: 0 });
      if (!(await send({ file: f, mediaType: detectMediaKind(f), fileName: f.name }))) break;
      done++;
      setQueue(q => q.filter(x => x !== f));
    }
    keepProgress.current = false;
    setUpload(null);
    inputRef.current?.focus();
  };

  const sendVoice = async (dataUrl: string, duration: number) => {
    setRecording(false);
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const ok = await send({ file: blob, mediaType: 'voice', duration, replyToId: replyingTo?.id });
      if (ok) setReplyingTo(null);
    } catch (e) {
      console.error(e);
      setError('تعذّر إرسال الرسالة الصوتية');
    }
  };

  const saveBackground = async (convId: string, type: ChatBackground['type'], value: string) => {
    const { data: updated, error: updErr } = await supabase
      .from('chat_backgrounds')
      .update({ type, value })
      .eq('conversation_id', convId)
      .eq('user_id', currentUser.id)
      .select('conversation_id');
    if (updErr) throw updErr;
    if (!updated || updated.length === 0) {
      const { error: insErr } = await supabase
        .from('chat_backgrounds')
        .insert({ conversation_id: convId, user_id: currentUser.id, type, value });
      if (insErr) throw insErr;
    }
  };

  const changeBackground = async (newBg: ChatBackground) => {
    try {
      const convId = await ensureConversation();
      setConversations(prev => prev.map(c => (c.id === convId ? { ...c, background: newBg } : c)));
      await saveBackground(convId, newBg.type, newBg.value);
    } catch (e) {
      console.error(e);
      setError('تعذّر حفظ الخلفية');
    }
  };

  const handleBgImageUpload = async (dataUrl: string) => {
    setShowBgPicker(false);
    try {
      const convId = await ensureConversation();
      const blob = await (await fetch(await shrinkImage(dataUrl, 1280))).blob();
      const path = `${convId}/bg-${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from(CHAT_MEDIA_BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '3600' });
      if (upErr) throw upErr;
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, background: { type: 'image', value: URL.createObjectURL(blob) } } : c
      ));
      await saveBackground(convId, 'image', `storage:${path}`);
    } catch (e) {
      console.error(e);
      setError('تعذّر رفع صورة الخلفية');
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { first, rest } = takeFiles(e, !!media, setError);
    if (first) {
      const kind = detectMediaKind(first);
      if (media && media.url) URL.revokeObjectURL(media.url);
      setMedia({ type: kind, url: kind === 'file' ? '' : URL.createObjectURL(first), file: first });
    }
    if (rest.length) setQueue(q => [...q, ...rest]);
  };

  // One reaction per person per message: tap the same emoji again to remove it.
  const setReaction = async (msg: Message, emoji: string) => {
    if (!conversation) return;
    const convId = conversation.id;
    const mine = msg.reactions?.find(r => r.userId === currentUser.id);
    const apply = (next: string | null) =>
      setConversations(prev => prev.map(c =>
        c.id !== convId
          ? c
          : {
              ...c,
              messages: c.messages.map(m =>
                m.id !== msg.id
                  ? m
                  : { ...m, reactions: [...(m.reactions ?? []).filter(r => r.userId !== currentUser.id), ...(next ? [{ userId: currentUser.id, emoji: next }] : [])] }
              ),
            }
      ));
    const remove = mine?.emoji === emoji;
    apply(remove ? null : emoji);
    const query = supabase.from('message_reactions');
    const { error: rxErr } = remove
      ? await query.delete().eq('message_id', msg.id).eq('user_id', currentUser.id)
      : mine
        ? await query.update({ emoji }).eq('message_id', msg.id).eq('user_id', currentUser.id)
        : await query.insert({ message_id: msg.id, user_id: currentUser.id, emoji });
    if (rxErr) apply(mine?.emoji ?? null);
  };

  // One tap opens the actions, a double tap loves the message with the KAN coin.
  const handleBubbleTap = (msg: Message) => {
    const now = Date.now();
    if (lastTap.current.id === msg.id && now - lastTap.current.t < 350) {
      lastTap.current = { id: '', t: 0 };
      setActiveMsgId(null);
      setCoinMsgId(msg.id);
      window.setTimeout(() => setCoinMsgId(prev => (prev === msg.id ? null : prev)), 1000);
      const mine = msg.reactions?.find(r => r.userId === currentUser.id);
      if (!mine || mine.emoji !== '❤️') void setReaction(msg, '❤️');
      return;
    }
    lastTap.current = { id: msg.id, t: now };
    setActiveMsgId(prev => (prev === msg.id ? null : msg.id));
  };

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + emoji + text.slice(end));
    notifyTyping();
    window.requestAnimationFrame(() => {
      if (el && document.activeElement === el) el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const jumpTo = (id: string) => {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(id);
    window.setTimeout(() => setHighlightId(null), 1500);
  };

  const deleteMessage = async (msg: Message) => {
    if (!conversation || !window.confirm('حذف هذه الرسالة للجميع؟')) return;
    const convId = conversation.id;
    setActiveMsgId(null);
    if (replyingTo?.id === msg.id) setReplyingTo(null);
    setConversations(prev => prev.map(c => (c.id === convId ? { ...c, messages: c.messages.filter(m => m.id !== msg.id) } : c)));
    const { error: delErr } = await supabase.from('messages').delete().eq('id', msg.id);
    if (delErr) {
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, messages: [...c.messages, msg].sort((x, y) => x.timestamp - y.timestamp) } : c
      ));
      setError('تعذّر حذف الرسالة، حاول مرة أخرى');
      return;
    }
    if (msg.media?.path) void supabase.storage.from(CHAT_MEDIA_BUCKET).remove([msg.media.path]);
  };

  // Files sent together (same sender, within two minutes, no text) are shown as one album bubble.
  const albumMap = (() => {
    const first = new Map<string, Message[]>();
    const hidden = new Set<string>();
    let run: Message[] = [];
    const isVisual = (m: Message) => (m.media?.type === 'image' || m.media?.type === 'video') && !m.sharedPostId && !isStickerName(m.media?.name);
    const flush = () => {
      if (run.length > 1) { first.set(run[0].id, run); run.slice(1).forEach(m => hidden.add(m.id)); }
      run = [];
    };
    for (const m of messages) {
      const joins = run.length > 0 && isVisual(m) && !m.text && !m.replyToId && m.senderId === run[0].senderId && m.timestamp - run[run.length - 1].timestamp < 120000 && run.length < 10;
      if (joins) run.push(m);
      else { flush(); if (isVisual(m)) run = [m]; }
    }
    flush();
    return { first, hidden };
  })();
  const deleteAlbum = async (items: Message[]) => {
    if (!conversation || !window.confirm('حذف كل ملفات الألبوم للجميع؟')) return;
    const convId = conversation.id;
    const ids = items.map(i => i.id);
    setActiveMsgId(null);
    setConversations(prev => prev.map(c => (c.id === convId ? { ...c, messages: c.messages.filter(m => !ids.includes(m.id)) } : c)));
    const { error: delErr } = await supabase.from('messages').delete().in('id', ids);
    if (delErr) {
      setConversations(prev => prev.map(c => (c.id === convId ? { ...c, messages: [...c.messages, ...items].sort((x, y) => x.timestamp - y.timestamp) } : c)));
      setError('تعذّر حذف الألبوم، حاول مرة أخرى');
      return;
    }
    const paths = items.map(i => i.media?.path).filter((p): p is string => !!p);
    if (paths.length) void supabase.storage.from(CHAT_MEDIA_BUCKET).remove(paths);
  };

  const lastSeenId = [...messages].reverse().find(m => m.senderId === currentUser.id && m.read)?.id;

  return (
    <div className="fixed left-0 right-0 z-[70] flex justify-center bg-gray-950" style={{ top: vp.top, height: vp.height }}>
    <div className={`flex flex-col h-full w-full ${getBgClass()}`} style={!bg || bg.type !== 'gradient' ? getBgStyle() : {}}>
      {editing && (
        <EditTextModal
          title="تعديل الرسالة"
          initial={editing.text}
          maxLength={2000}
          allowEmpty={!!editing.media}
          onClose={() => setEditing(null)}
          onSave={async v => {
            const ok = await updateText('messages', editing.id, v);
            if (ok) setConversations(prev => prev.map(c => ({ ...c, messages: c.messages.map(m => (m.id === editing.id ? { ...m, text: v, editedAt: Date.now() } : m)) })));
            return ok;
          }}
        />
      )}
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 relative z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
          <ChevronRight size={20} />
        </button>
        <button onClick={() => openUserProfile(chatUser.id)} className="flex items-center gap-3 flex-1 min-w-0 text-right">
          <Avatar userId={chatUser.id} src={chatUser.avatar} name={chatUser.displayName} size="md" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white truncate">{chatUser.displayName}</div>
            {peerTyping
              ? <div className="text-xs text-cyan-400">يكتب الآن...</div>
              : <div className="text-xs text-gray-500">@{chatUser.username}</div>}
          </div>
        </button>
        <div className="relative">
          <button
            onClick={() => setShowBgPicker(!showBgPicker)}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400"
            title="تغيير الخلفية"
          >
            <Palette size={18} />
          </button>
          <AnimatePresence>
            {showBgPicker && (
              <ChatBgPicker
                current={bg}
                onChange={(newBg) => { changeBackground(newBg); setShowBgPicker(false); }}
                onImageUpload={handleBgImageUpload}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">👋</div>
            <p className="text-gray-400">ابدأ المحادثة مع {chatUser.displayName}</p>
          </div>
        )}
        {messages.map((msg, idx) => {
          if (albumMap.hidden.has(msg.id)) return null;
          const isMine = msg.senderId === currentUser.id;
          const showAvatar = idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
          return (
            <motion.div
              key={msg.id}
              id={`msg-${msg.id}`}
              data-unread={!isMine && !msg.read ? '1' : undefined}
              data-mids={(albumMap.first.get(msg.id) ?? [msg]).map(x => x.id).join(',')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}
            >
              {showAvatar && !isMine ? (
                <button onClick={() => openUserProfile(chatUser.id)} className="shrink-0"><Avatar userId={chatUser.id} src={chatUser.avatar} name={chatUser.displayName} size="sm" /></button>
              ) : !isMine ? <div className="w-7" /> : null}

              <div className={`max-w-[88%] sm:max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  {...messageGestures(
                    () => { setReplyingTo(msg); window.setTimeout(() => inputRef.current?.focus(), 30); },
                    () => { setActiveMsgId(msg.id); setReactingTo(msg.id); },
                  )}
                  onClick={() => handleBubbleTap(msg)}
                  className={`relative select-none touch-pan-y px-4 py-2.5 rounded-2xl cursor-pointer transition-shadow ${highlightId === msg.id ? 'ring-2 ring-cyan-400' : ''} ${
                    isStickerName(msg.media?.name) && !msg.text ? 'bg-transparent !p-0'
                    : isMine
                      ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-bl-sm'
                      : 'bg-gray-800/90 backdrop-blur-sm text-gray-200 rounded-br-sm'
                  }`}
                >
                  {coinMsgId === msg.id && <CoinBurst size="sm" />}
                  {msg.replyToId && (() => {
                    const replied = messages.find(m => m.id === msg.replyToId);
                    return (
                      <button
                        onClick={e => { e.stopPropagation(); if (replied) jumpTo(replied.id); }}
                        className={`block w-full text-right mb-2 px-2.5 py-1.5 rounded-lg border-r-2 text-xs ${isMine ? 'bg-white/15 border-white/60' : 'bg-black/25 border-cyan-400'}`}
                      >
                        <div className="font-medium opacity-90">
                          {replied ? (replied.senderId === currentUser.id ? 'أنت' : chatUser.displayName) : 'رسالة'}
                        </div>
                        <div className="opacity-80 truncate">{replied ? describeMessage(replied) : 'رسالة غير متاحة'}</div>
                      </button>
                    );
                  })()}
                  {albumMap.first.has(msg.id) && (() => {
                    const items = albumMap.first.get(msg.id)!;
                    return (
                      <div className={`mb-2 grid gap-1 max-w-full ${items.length > 4 ? 'grid-cols-3 w-64' : 'grid-cols-2 w-56'}`}>
                        {items.map(it => (
                          <div key={it.id} className="relative aspect-square rounded-xl overflow-hidden bg-black/40">
                            {it.media!.type === 'image'
                              ? <img src={it.media!.url} alt="" onLoad={() => { if (Date.now() < stickUntil.current) scrollToBottom(); }} onClick={e => { e.stopPropagation(); setViewer({ src: it.media!.url, name: it.media!.name }); }} className="w-full h-full object-cover cursor-zoom-in" />
                              : <video src={it.media!.url} controls playsInline preload="metadata" onClick={e => e.stopPropagation()} className="w-full h-full object-cover" />}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {!albumMap.first.has(msg.id) && isStickerName(msg.media?.name) && msg.media && (
                    msg.media.type === 'video'
                      ? <video src={msg.media.url} autoPlay loop muted playsInline className="w-36 h-36 object-contain pointer-events-none" />
                      : <img src={msg.media.url} alt="" draggable={false} onLoad={() => { if (Date.now() < stickUntil.current) scrollToBottom(); }} className="w-36 h-36 object-contain pointer-events-none" />
                  )}
                  {!albumMap.first.has(msg.id) && !isStickerName(msg.media?.name) && msg.media?.type === 'image' && (
                    <div className="mb-2 relative">
                      <img
                        src={msg.media.url}
                        alt=""
                        onLoad={() => { if (Date.now() < stickUntil.current) scrollToBottom(); }}
                        onClick={e => { e.stopPropagation(); if (msg.sharedPostId) openPost(msg.sharedPostId, msg.sharedCommentId); else setViewer({ src: msg.media!.url, name: msg.media!.name }); }}
                        className={`rounded-xl max-w-full max-h-48 object-cover ${msg.sharedPostId ? 'cursor-pointer' : 'cursor-zoom-in'}`}
                      />
                      <button
                        onClick={e => { e.stopPropagation(); void downloadFile(msg.media!.url, msg.media!.name || 'image.jpg'); }}
                        className="absolute bottom-2 left-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white"
                        aria-label="تحميل الصورة"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  )}
                  {!albumMap.first.has(msg.id) && msg.media?.type === 'video' && msg.sharedPostId && (
                    <button onClick={e => { e.stopPropagation(); openPost(msg.sharedPostId!, msg.sharedCommentId); }} className="mb-2 relative block w-56 max-w-full rounded-xl overflow-hidden bg-black active:scale-[0.98] transition-transform" aria-label="عرض المنشور">
                      <video src={`${msg.media.url}#t=0.1`} preload="metadata" muted playsInline className="block w-full max-h-48 object-cover pointer-events-none" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/25"><span className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600/90 to-cyan-500/90 flex items-center justify-center"><Play size={22} className="text-white" fill="white" /></span></span>
                    </button>
                  )}
                  {!albumMap.first.has(msg.id) && !isStickerName(msg.media?.name) && msg.media?.type === 'video' && !msg.sharedPostId && (
                    <div className="mb-2" onClick={e => e.stopPropagation()}>
                      <video
                        src={`${msg.media.url}#t=0.1`}
                        controls
                        playsInline
                        preload="metadata"
                        onLoadedMetadata={() => { if (Date.now() < stickUntil.current) scrollToBottom(); }}
                        className="rounded-xl max-w-full max-h-48 bg-black"
                      />
                    </div>
                  )}
                  {msg.media?.type === 'voice' && (
                    <div onClick={e => e.stopPropagation()}>
                      <VoicePlayer url={msg.media.url} knownDuration={msg.media.duration} />
                    </div>
                  )}
                  {msg.media?.type === 'file' && (
                    <button
                      onClick={e => { e.stopPropagation(); void downloadFile(msg.media!.url, msg.media!.name || 'file'); }}
                      className={`mb-2 w-full flex items-center gap-3 p-2.5 rounded-xl text-right ${isMine ? 'bg-white/15 hover:bg-white/25' : 'bg-black/25 hover:bg-black/40'}`}
                    >
                      <FileText size={26} className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate" dir="auto">{msg.media.name || 'ملف'}</div>
                        <div className="text-[11px] opacity-70">{formatBytes(msg.media.size)}</div>
                      </div>
                      <Download size={16} className="shrink-0" />
                    </button>
                  )}
                  {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
                  {msg.sharedPostId && (
                    <button
                      onClick={e => { e.stopPropagation(); openPost(msg.sharedPostId!, msg.sharedCommentId); }}
                      className="mt-2 w-full py-2 rounded-xl bg-black/25 hover:bg-black/40 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                    >
                      {msg.sharedCommentId ? 'عرض التعليق' : 'عرض المنشور'} ‹
                    </button>
                  )}
                </div>
                <span className={`text-[10px] text-gray-500 mt-1 ${isMine ? 'text-left' : 'text-right'}`}>
                  {formatTime(msg.timestamp)}{msg.editedAt ? ' · معدّلة' : ''}
                  {isMine && (msg.read
                    ? <CheckCheck size={14} className="inline mr-1 text-cyan-400" aria-label="تمت المشاهدة" />
                    : <Check size={14} className="inline mr-1 text-gray-500" aria-label="تم الإرسال" />)}
                  {isMine && msg.id === lastSeenId && <span className="mr-1 text-cyan-400">تمت المشاهدة</span>}
                </span>
                {msg.reactions && msg.reactions.length > 0 && (() => {
                  const groups = new Map<string, string[]>();
                  for (const r of msg.reactions) groups.set(r.emoji, [...(groups.get(r.emoji) ?? []), r.userId]);
                  return (
                    <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                      {[...groups.entries()].map(([emoji, ids]) => (
                        <button
                          key={emoji}
                          onClick={() => { void setReaction(msg, emoji); }}
                          className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border ${ids.includes(currentUser.id) ? 'bg-violet-600/30 border-violet-500/50 text-white' : 'bg-gray-800 border-gray-700 text-gray-300'}`}
                        >
                          <span>{emoji}</span>
                          {ids.length > 1 && <span>{ids.length}</span>}
                        </button>
                      ))}
                    </div>
                  );
                })()}
                {activeMsgId === msg.id && reactingTo === msg.id && (
                  <div className={`kan-pop flex flex-wrap items-center gap-0.5 mt-1 p-1 bg-gray-800 rounded-full shadow-lg ${isMine ? 'flex-row-reverse' : ''}`}>
                    {QUICK_REACTIONS.map(e => (
                      <button
                        key={e}
                        onClick={() => { void setReaction(msg, e); setReactingTo(null); setActiveMsgId(null); }}
                        className="w-9 h-9 text-xl rounded-full hover:bg-gray-700 active:scale-125 transition-transform"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
                {activeMsgId === msg.id && (
                  <div className={`flex items-center gap-1.5 mt-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                    <button
                      onClick={() => setReactingTo(prev => (prev === msg.id ? null : msg.id))}
                      className="px-2.5 py-1 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs flex items-center gap-1"
                    >
                      <Smile size={12} /> تفاعل
                    </button>
                    <button
                      onClick={() => { setReplyingTo(msg); setActiveMsgId(null); inputRef.current?.focus(); }}
                      className="px-2.5 py-1 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs flex items-center gap-1"
                    >
                      <Reply size={12} /> رد
                    </button>
                    {msg.media && msg.media.type !== 'voice' && (
                      <button
                        onClick={() => { void downloadFile(msg.media!.url, msg.media!.name || (msg.media!.type === 'video' ? 'video.mp4' : 'image.jpg')); setActiveMsgId(null); }}
                        className="px-2.5 py-1 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs flex items-center gap-1"
                      >
                        <Download size={12} /> تحميل
                      </button>
                    )}
                    {isMine && msg.media?.type !== 'voice' && (
                      <button
                        onClick={() => { setEditing(msg); setActiveMsgId(null); }}
                        className="px-2.5 py-1 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs flex items-center gap-1"
                      >
                        <Pencil size={12} /> تعديل
                      </button>
                    )}
                    {isMine && (
                      <button
                        onClick={() => (albumMap.first.has(msg.id) ? void deleteAlbum(albumMap.first.get(msg.id)!) : deleteMessage(msg))}
                        className="px-2.5 py-1 rounded-full bg-gray-800 hover:bg-red-500/20 text-red-400 text-xs flex items-center gap-1"
                      >
                        <Trash2 size={12} /> حذف
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        {peerTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Media Preview */}
      {media && (
        <div className="px-4 py-2 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 relative z-10">
          <div className="relative inline-block">
            {media.type === 'image' ? (
              <img src={media.url} alt="" className="h-20 rounded-lg" />
            ) : media.type === 'video' ? (
              <video src={media.url} className="h-20 rounded-lg" />
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg max-w-[240px]">
                <FileText size={22} className="shrink-0 text-cyan-400" />
                <div className="min-w-0">
                  <div className="text-sm text-white truncate" dir="auto">{media.file.name}</div>
                  <div className="text-[11px] text-gray-500">{formatBytes(media.file.size)}</div>
                </div>
              </div>
            )}
            <button onClick={() => setMedia(null)} className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {error && <div className="px-4 py-1 text-red-400 text-xs bg-gray-900/95">{error}</div>}

      {replyingTo && (
        <div className="px-4 py-2 bg-gray-900/95 border-t border-gray-800 relative z-10 flex items-center gap-2">
          <div className="flex-1 min-w-0 border-r-2 border-cyan-400 pr-2">
            <div className="text-xs text-cyan-400">
              {replyingTo.senderId === currentUser.id ? 'الرد على رسالتك' : `الرد على ${chatUser.displayName}`}
            </div>
            <div className="text-xs text-gray-400 truncate">{describeMessage(replyingTo)}</div>
          </div>
          <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-400 hover:text-white" aria-label="إلغاء الرد">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Voice Recording */}
      {recording && (
        <div className="px-3 py-2 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 relative z-10">
          <VoiceRecorder
            onSend={sendVoice}
            onCancel={() => setRecording(false)}
          />
        </div>
      )}

      {/* Input: one slim row [+] [message] [send], so the send button is always on screen */}
      {!recording && (
        <div className="px-2 min-[400px]:px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-gray-900/95 backdrop-blur-md border-t border-gray-800 relative z-10">
          <input ref={fileRef} type="file" multiple onChange={handleFile} className="hidden" />
          <AnimatePresence>
            {toolsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.94 }}
                transition={{ type: 'spring', damping: 22, stiffness: 420 }}
                className="absolute bottom-full right-2 mb-2 z-20 flex items-center gap-2 p-2 rounded-2xl bg-gray-900/95 backdrop-blur border border-white/10 shadow-xl origin-bottom-right"
              >
                <button onClick={() => { fileRef.current?.click(); setToolsOpen(false); }} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-800 text-gray-200 text-xs hover:text-cyan-300 active:scale-95">
                  <Paperclip size={16} /> إرفاق
                </button>
                <button onClick={() => { setToolsOpen(false); inputRef.current?.blur(); setStickerStart(true); setEmojiOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-800 text-gray-200 text-xs hover:text-cyan-300 active:scale-95">
                  <Smile size={16} /> ملصقات
                </button>
                <button
                  onPointerDown={e => e.preventDefault()}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { setAiOpen(true); setToolsOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-r from-violet-600/30 to-cyan-500/20 border border-violet-400/30 text-white text-xs active:scale-95"
                  aria-label="اسأل KAN"
                >
                  <Sparkles size={16} className="text-violet-300" /> اسأل KAN
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {queue.length > 0 && <QueueChip count={queue.length} onClear={() => setQueue([])} />}
          {upload && <UploadBar upload={upload} />}
          <div className="flex items-center gap-1.5">
            <button
              onPointerDown={e => e.preventDefault()}
              onMouseDown={e => e.preventDefault()}
              onClick={() => setToolsOpen(o => !o)}
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${toolsOpen ? 'bg-violet-600 text-white rotate-45' : 'bg-gray-800 text-gray-300 hover:text-white'}`}
              aria-label="المزيد"
            >
              <Plus size={20} /></button>
              <button
                onPointerDown={e => e.preventDefault()}
                onMouseDown={e => e.preventDefault()}
                onClick={() => { if (emojiOpen) { setEmojiOpen(false); inputRef.current?.focus(); } else { setToolsOpen(false); inputRef.current?.blur(); setEmojiOpen(true); } }}
                className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-90 ${emojiOpen ? 'bg-yellow-400/20 text-yellow-300' : 'bg-gray-800 text-gray-300 hover:text-white'}`}
                aria-label="إيموجي"
              ><Smile size={20} /></button>
            <input
              ref={inputRef}
              enterKeyHint="send"
              autoComplete="off"
              value={text} onChange={e => { setText(e.target.value); if (e.target.value) notifyTyping(); }}
              placeholder="اكتب رسالة..."
              className="flex-1 min-w-0 h-10 px-4 bg-gray-800 rounded-full text-[16px] text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              onFocus={() => setEmojiOpen(false)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            />
            {text.trim() || media || queue.length > 0 ? (
              <motion.button whileTap={{ scale: 0.9 }} onPointerDown={e => e.preventDefault()} onMouseDown={e => e.preventDefault()} onClick={sendMessage} disabled={sending} aria-label="إرسال" className="shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full shadow-lg shadow-violet-500/30 disabled:opacity-60">
                <Send size={18} className="text-white" />
              </motion.button>
            ) : (
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setRecording(true)} aria-label="تسجيل صوتي" className="shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full shadow-lg shadow-violet-500/30">
                <Mic size={18} className="text-white" />
              </motion.button>
            )}
          </div>
          {emojiOpen && <EmojiPicker key={stickerStart ? 's' : 'e'} docked onPick={insertEmoji} onClose={() => setEmojiOpen(false)} startOnStickers={stickerStart} onSticker={st => { void send({ file: st.blob, mediaType: st.kind, fileName: `kan-sticker.${stkExt(st.blob, st.kind)}` }); }} />}
        </div>
      )}
      {viewer && <ImageViewer src={viewer.src} name={viewer.name} gallery={messages.flatMap(x => x.media && !isStickerName(x.media.name) && (x.media.type === 'image' || x.media.type === 'video') ? [{ src: x.media.url, name: x.media.name, type: x.media.type as 'image' | 'video' }] : [])} onClose={() => setViewer(null)} />}
      {aiOpen && (
        <KanAIModal
          messages={messages}
          me={currentUser}
          other={chatUser}
          onClose={() => setAiOpen(false)}
          onUseReply={t => { setText(t); setAiOpen(false); window.setTimeout(() => inputRef.current?.focus(), 50); }}
        />
      )}
    </div>
    </div>
  );
}
