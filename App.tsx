import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Search, PlusCircle, User, Settings, LogOut, Heart,
  MessageCircle, Send, Image as ImageIcon, Video, Trash2,
  Reply, ChevronRight, Users,
  Check, X, Paperclip,
  Bookmark, Share2, Camera, Eye, EyeOff, MapPin,
  Link as LinkIcon, Calendar, MessageSquare, Mic,
  Palette, Play, Pause, Download, FileText, Smile, Film, Plus, Volume2, VolumeX, RefreshCw, PlayCircle
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
  replyToId?: string;
  reactions?: { userId: string; emoji: string }[];
  media?: { type: 'image' | 'video' | 'voice' | 'file'; url: string; duration?: number; name?: string; size?: number; path?: string };
}

interface Conversation {
  id: string;
  participants: string[];
  messages: Message[];
  lastActivity: number;
  background?: ChatBackground;
}

// ============ Helpers ============
const genId = () => Math.random().toString(36).slice(2, 11) + Date.now().toString(36);

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
const STORAGE_KEYS = {
  users: 'kan_users_v2',
  posts: 'kan_posts_v2',
  currentUser: 'kan_current_user_v2',
  conversations: 'kan_conversations_v2',
};

function loadData<T>(key: string, fallback: T): T {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : fallback;
  } catch { return fallback; }
}

// Returns false when the data could not be persisted (e.g. localStorage quota
// exceeded by large base64 images/videos) so the UI can warn the user.
function saveData(key: string, data: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn(`Could not save "${key}" to localStorage`, e);
    return false;
  }
}

// ============ Avatar Component ============
function Avatar({ src, name, size = 'md' }: { src: string; name: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
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

  if (src) {
    return (
      <div className={`${sizes[size]} rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-700`}>
        <img src={src} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`${sizes[size]} rounded-full ${bgColors[colorIndex]} flex items-center justify-center flex-shrink-0 font-bold text-white`}>
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

const POST_SELECT = 'id, user_id, text, media_url, media_type, media_name, media_size, is_reel, is_video, title, cover_url, created_at, post_likes(user_id), bookmarks(user_id), comments(id, parent_id, user_id, text, created_at, comment_likes(user_id))';

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
  message_reactions?: { user_id: string; emoji: string }[];
  read_at: string | null;
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
    replyToId: r.reply_to_id ?? undefined,
    reactions: (r.message_reactions ?? []).map(x => ({ userId: x.user_id, emoji: x.emoji })),
    media: r.media_type && url
      ? { type: r.media_type, url, duration: r.media_duration ?? undefined, name: r.media_name ?? undefined, size: r.media_size ?? undefined, path: r.media_path ?? undefined }
      : undefined,
  };
}

async function loadConversations(me: string): Promise<Conversation[]> {
  const [convs, msgs, bgs] = await Promise.all([
    supabase.from('conversations').select('id, user_a, user_b, last_activity'),
    supabase
      .from('messages')
      .select('id, conversation_id, sender_id, text, media_path, media_type, media_duration, media_name, media_size, reply_to_id, read_at, created_at, message_reactions(user_id, emoji)')
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
function VideoPlayer({ src, poster, className = '', autoPlay = false }: {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
}) {
  const [failed, setFailed] = useState(false);
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
  return (
    <video
      src={poster ? src : `${src}#t=0.1`}
      poster={poster}
      controls
      playsInline
      autoPlay={autoPlay}
      preload="metadata"
      className={`bg-black rounded-xl ${className}`}
      onClick={e => e.stopPropagation()}
      onError={() => setFailed(true)}
    />
  );
}

// ============ Full-screen image viewer ============
function ImageViewer({ src, name, onClose }: { src: string; name?: string; onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between p-3" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="إغلاق"><X size={20} /></button>
        <button
          onClick={() => { void downloadFile(src, name || 'image.jpg'); }}
          className="px-4 py-2 rounded-full bg-white/10 text-white hover:bg-white/20 text-sm flex items-center gap-2"
        >
          <Download size={16} /> تحميل
        </button>
      </div>
      <div className={`flex-1 overflow-auto flex ${zoomed ? 'items-start justify-start' : 'items-center justify-center'}`}>
        <img
          src={src}
          alt=""
          onClick={e => { e.stopPropagation(); setZoomed(z => !z); }}
          className={zoomed ? 'max-w-none cursor-zoom-out m-auto' : 'max-w-full max-h-full object-contain cursor-zoom-in'}
        />
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

function EmojiPicker({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  const [group, setGroup] = useState(0);
  return (
    <div dir="rtl" className="absolute bottom-full mb-2 right-0 z-30 w-72 max-w-[92vw] bg-gray-900 border border-gray-700 rounded-2xl shadow-xl">
      <div className="flex items-center justify-between px-2 pt-2 border-b border-gray-800">
        <div className="flex">
          {EMOJI_GROUPS.map((g, i) => (
            <button key={g.icon} onClick={() => setGroup(i)} className={`px-2 py-1.5 text-lg rounded-t-lg ${i === group ? 'bg-gray-800' : 'opacity-60 hover:opacity-100'}`}>
              {g.icon}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-white" aria-label="إغلاق"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-8 gap-0.5 p-2 max-h-52 overflow-y-auto">
        {EMOJI_GROUPS[group].items.map(e => (
          <button key={e} onClick={() => onPick(e)} className="h-8 text-xl rounded-lg hover:bg-gray-800">{e}</button>
        ))}
      </div>
    </div>
  );
}

// ============ Double-tap love: a gold coin stamped KAN ============
function CoinBurst({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  const dim = size === 'lg' ? 'w-28 h-28 text-3xl' : 'w-14 h-14 text-base';
  return (
    <motion.div
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: [0.3, 1.25, 1], opacity: [0, 1, 1, 0], rotateY: [-90, 0, 360] }}
      transition={{ duration: 1, ease: 'easeOut' }}
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
    >
      <div className={`${dim} rounded-full flex items-center justify-center font-extrabold tracking-wider text-white bg-gradient-to-br from-violet-600 via-violet-500 to-cyan-500 border-4 border-white/80 shadow-[0_0_34px_rgba(124,58,237,0.65)] ring-4 ring-cyan-400/30`}>
        <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">KAN</span>
      </div>
    </motion.div>
  );
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'reels' | 'videos' | 'search' | 'create' | 'profile' | 'settings' | 'messages'>('feed');
  const [showLogin, setShowLogin] = useState(true);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  const currentUser = users.find(u => u.id === currentUserId) || null;

  // Keys that failed to persist (quota exceeded, storage disabled, ...)
  const [failedKeys, setFailedKeys] = useState<string[]>([]);
  const storageError = failedKeys.length > 0;

  const persist = (key: string, data: unknown) => {
    const ok = saveData(key, data);
    setFailedKeys(prev =>
      ok ? prev.filter(k => k !== key) : prev.includes(key) ? prev : [...prev, key]
    );
  };

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
      setPosts(page);
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
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
      if ((payload.new as { user_id?: string }).user_id !== currentUserId) setNewPostsCount(n => n + 1);
    });
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
        if (row.sender_id !== currentUserId) playSound('receive');
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
            : { ...c, messages: c.messages.map(m => (m.id === row.id ? { ...m, read: row.read_at !== null } : m)) }
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

  const [viewedUserId, setViewedUserId] = useState<string | null>(null);
  const goTab = (tab: typeof activeTab) => {
    setViewedUserId(null);
    setActiveTab(tab);
  };
  const openProfile = (id: string) => {
    if (id === currentUserId) {
      goTab('profile');
    } else {
      setViewedUserId(id);
      window.scrollTo(0, 0);
    }
  };

  const unreadCount = currentUser
    ? conversations
        .filter(c => c.participants.includes(currentUser.id))
        .reduce((sum, c) => sum + c.messages.filter(m => m.senderId !== currentUser.id && !m.read).length, 0)
    : 0;

  const baseTitleRef = useRef(document.title);
  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitleRef.current}` : baseTitleRef.current;
  }, [unreadCount]);

  if (!isConfigured) {
    return <StatusScreen text="لم يتم ضبط اتصال Supabase (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY)." />;
  }
  if (!authReady || (currentUserId && loadedFor !== currentUserId)) {
    return <StatusScreen text="جارٍ التحميل..." />;
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/70 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="" className="w-8 h-8 rounded-lg" />
            <h1 className="text-xl font-bold kan-gradient-text">
              KAN
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goTab('messages')}
              className="relative p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <MessageSquare size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => goTab('search')}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              aria-label="بحث"
            >
              <Search size={20} />
            </button>
            <button
              onClick={() => goTab('settings')}
              className={`p-2 hover:bg-gray-800 rounded-full transition-colors ${activeTab === 'settings' && !viewedUserId ? 'text-violet-300' : ''}`}
              aria-label="الإعدادات"
            >
              <Settings size={20} />
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
      <main className={`pt-16 pb-20 mx-auto min-h-screen ${activeTab === 'videos' && !viewedUserId ? 'max-w-5xl' : 'max-w-2xl'}`}>
        <InstallBanner />
        <AnimatePresence mode="wait">
          {viewedUserId && (
            <motion.div key={`user-${viewedUserId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                onBack={() => setViewedUserId(null)}
              />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'feed' && (
            <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Feed posts={posts} setPosts={setPosts} users={users} currentUser={currentUser} onOpenProfile={openProfile} frontier={feedFrontier} hasMore={feedHasMore} loading={feedLoading} newCount={newPostsCount} onRefresh={loadFeedFirst} onLoadMore={loadFeedMore} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'search' && (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
            <motion.div key="reels" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ReelsTab posts={posts} setPosts={setPosts} users={users} currentUser={currentUser} onOpenProfile={openProfile} onCreate={() => goTab('create')} onLoadPage={loadPostsPage} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'videos' && (
            <motion.div key="videos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <VideosTab posts={posts} setPosts={setPosts} users={users} currentUser={currentUser} onOpenProfile={openProfile} onCreate={() => goTab('create')} onLoadPage={loadPostsPage} setUsers={setUsers} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'create' && (
            <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CreatePost currentUser={currentUser} setPosts={setPosts} setActiveTab={goTab} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ProfileTab currentUser={currentUser} users={users} posts={posts} setUsers={setUsers} setPosts={setPosts} onOpenProfile={openProfile} onLoadPage={loadPostsPage} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SettingsTab currentUser={currentUser} setUsers={setUsers} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'messages' && (
            <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MessagesTab
                currentUser={currentUser}
                users={users}
                conversations={conversations}
                setConversations={setConversations}
                selectedChat={selectedChat}
                setSelectedChat={setSelectedChat}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-xl border-t border-white/5">
        <div className="max-w-2xl mx-auto grid grid-cols-[1fr_auto_1fr] items-end px-1 pb-[env(safe-area-inset-bottom)]">
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
                  onClick={() => goTab(tab)}
                  className={`relative flex flex-col items-center gap-0.5 px-3 sm:px-4 py-2 transition-colors ${active ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <Icon size={22} className={active ? 'text-cyan-300' : ''} />
                  <span className="text-[10px]">{label}</span>
                  <span className={`h-0.5 w-5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`} />
                </button>
              );
            };
            const createActive = activeTab === 'create' && !viewedUserId;
            return (
              <>
                <div className="flex items-end justify-around">
                  {tabButton('feed')}
                  {tabButton('reels')}
                </div>
                <button onClick={() => goTab('create')} className="relative flex flex-col items-center -mt-6 px-3 pb-1.5" aria-label="نشر">
                  <span className={`kan-fab w-14 h-14 rounded-full flex items-center justify-center ring-4 ring-gray-950 ${createActive ? 'scale-105' : ''}`}>
                    <Plus size={28} strokeWidth={2.6} className="text-white" />
                  </span>
                  <span className="mt-1 text-[10px] font-semibold kan-gradient-text">نشر</span>
                </button>
                <div className="flex items-end justify-around">
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
function Feed({ posts, setPosts, users, currentUser, onOpenProfile, frontier, hasMore, loading, newCount, onRefresh, onLoadMore }: {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  users: User[];
  currentUser: User;
  onOpenProfile: (id: string) => void;
  frontier: number;
  hasMore: boolean;
  loading: boolean;
  newCount: number;
  onRefresh: () => void;
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

  // Pull down at the top of the page to refresh.
  useEffect(() => {
    let startY = 0;
    let pulling = false;
    const onStart = (e: TouchEvent) => {
      pulling = window.scrollY <= 0;
      startY = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      if (pulling && e.changedTouches[0].clientY - startY > 90) onRefresh();
      pulling = false;
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);

  return (
    <div className="px-4 py-4 space-y-4">
      {newCount > 0 && (
        <button
          onClick={() => { window.scrollTo({ top: 0 }); onRefresh(); }}
          className="sticky top-[4.5rem] z-30 mx-auto flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-medium shadow-lg shadow-violet-500/30"
        >
          <RefreshCw size={14} /> {newCount === 1 ? 'منشور جديد' : `${newCount} منشورات جديدة`} · اضغط للتحديث
        </button>
      )}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
          {[{ key: 'all' as const, label: 'الكل' }, { key: 'following' as const, label: 'المتابَعون' }, { key: 'files' as const, label: 'الملفات' }].map(t => (
            <button key={t.key} onClick={() => setMode(t.key)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === t.key ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={onRefresh} disabled={loading} className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white disabled:opacity-60" aria-label="تحديث">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
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
function PostCard({ post, setPosts, users, currentUser, onOpenProfile }: {
  post: Post;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  users: User[];
  currentUser: User;
  onOpenProfile: (id: string) => void;
}) {
  const [listModal, setListModal] = useState<{ title: string; ids: string[] } | null>(null);
  const [coinId, setCoinId] = useState(0);
  const [viewer, setViewer] = useState<{ src: string; name?: string } | null>(null);
  const coinTimer = useRef<number | undefined>(undefined);
  const tapTimer = useRef<number | undefined>(undefined);
  const lastTap = useRef(0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <button onClick={() => onOpenProfile(author.id)} className="flex items-center gap-3 flex-1 min-w-0 text-right">
          <Avatar src={author.avatar} name={author.displayName} size="md" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white truncate hover:underline">{author.displayName}</div>
            <div className="text-xs text-gray-500">@{author.username} · {formatTime(post.timestamp)}</div>
          </div>
        </button>
        {post.userId === currentUser.id && (
          <button onClick={deletePost} className="p-2 text-gray-500 hover:text-red-400 transition-colors">
            <Trash2 size={16} />
          </button>
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
            <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{post.text}</p>
          </div>
        )}

        {post.media && (
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
                className={post.isReel ? 'max-h-[75vh] mx-auto w-auto max-w-full' : 'w-full max-h-[28rem]'}
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
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-gray-500 hover:text-cyan-400 transition-all mr-auto">
          <Share2 size={18} />
        </button>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-gray-800/50 overflow-hidden">
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {post.comments.map(comment => {
                const cAuthor = users.find(u => u.id === comment.userId);
                if (!cAuthor) return null;
                return (
                  <div key={comment.id} className="space-y-2">
                    <div className="flex gap-2">
                      <button onClick={() => onOpenProfile(cAuthor.id)} className="self-start">
                        <Avatar src={cAuthor.avatar} name={cAuthor.displayName} size="sm" />
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
                                <div key={reply.id} className="flex gap-2">
                                  <button onClick={() => onOpenProfile(rAuthor.id)} className="self-start">
                                    <Avatar src={rAuthor.avatar} name={rAuthor.displayName} size="sm" />
                                  </button>
                                  <div>
                                    <button onClick={() => onOpenProfile(rAuthor.id)} className="text-xs font-medium text-white hover:underline">{rAuthor.displayName}</button>
                                    <span className="text-xs text-gray-500 mr-2">{formatTime(reply.timestamp)}</span>
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

function ReelItem({ post, author, currentUser, muted, onToggleMute, setPosts, onOpenProfile, onOpenComments, onShowLikes }: {
  post: Post;
  author: User;
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
  const [coinId, setCoinId] = useState(0);
  const coinTimer = useRef<number | undefined>(undefined);
  const lastTap = useRef(0);
  const tapTimer = useRef<number | undefined>(undefined);
  const isLiked = post.likes.includes(currentUser.id);
  const commentCount = post.comments.reduce((n, c) => n + 1 + c.replies.length, 0);

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
        className="absolute inset-0 w-full h-full object-cover"
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
        className="absolute top-3 left-3 p-2 rounded-full bg-black/45 text-white"
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
      </div>

      <div className="absolute bottom-4 right-4 left-20 text-right" onClick={e => e.stopPropagation()}>
        <button onClick={() => onOpenProfile(author.id)} className="flex items-center gap-2 mb-2">
          <Avatar src={author.avatar} name={author.displayName} size="sm" />
          <span className="text-white font-semibold text-sm">{author.displayName}</span>
          <span className="text-white/60 text-xs">@{author.username}</span>
        </button>
        {post.text && <p className="text-white text-sm leading-relaxed line-clamp-3 whitespace-pre-wrap">{post.text}</p>}
      </div>
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
                <button onClick={() => { onClose(); onOpenProfile(u.id); }} className="self-start"><Avatar src={u.avatar} name={u.displayName} size="sm" /></button>
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
            className="flex-1 px-4 py-2.5 bg-gray-800 rounded-full text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button onClick={add} className="p-2.5 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full text-white" aria-label="إرسال"><Send size={18} /></button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ReelsTab({ posts, setPosts, users, currentUser, onOpenProfile, onCreate, onLoadPage }: {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  users: User[];
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

  return (
    <div className="max-w-md mx-auto">
      <div
        className="h-[calc(100dvh-9rem)] overflow-y-scroll snap-y snap-mandatory no-scrollbar rounded-2xl"
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
      {commentPost && (
        <ReelComments post={commentPost} users={users} currentUser={currentUser} setPosts={setPosts} onOpenProfile={onOpenProfile} onClose={() => setCommentsFor(null)} />
      )}
      {listModal && (
        <UserListModal title={listModal.title} userIds={listModal.ids} users={users} onOpenProfile={onOpenProfile} onClose={() => setListModal(null)} />
      )}
    </div>
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
        <Avatar src={author.avatar} name={author.displayName} size="sm" />
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
                <Avatar src={author.avatar} name={author.displayName} size="md" />
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
      <div className="relative mb-5 max-w-xl mx-auto">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
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
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`حجم الملف يجب أن لا يتجاوز ${MAX_FILE_MB} ميجابايت`);
      return;
    }
    const fileKind: 'image' | 'video' | 'file' =
      /^image\/(jpeg|png|webp|gif)$/.test(file.type) ? 'image'
      : /^video\/(mp4|webm|quicktime)$/.test(file.type) ? 'video'
      : 'file';
    if (videoOnly && fileKind !== 'video') {
      setError('اختر فيديو (MP4 أو WebM أو MOV)');
      return;
    }
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
    setError('');
    const uploaded: string[] = [];
    try {
      let mediaUrl: string | null = null;
      let coverUrl: string | null = null;
      if (media) {
        const path = `${currentUser.id}/${crypto.randomUUID()}.${MEDIA_EXT[media.file.type] ?? safeExt(media.file.name)}`;
        const { error: upErr } = await supabase.storage
          .from(POST_MEDIA_BUCKET)
          .upload(path, media.file, { contentType: media.file.type || 'application/octet-stream', cacheControl: '31536000' });
        if (upErr) throw upErr;
        uploaded.push(path);
        mediaUrl = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
      }
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
      });
      if (insErr) throw insErr;
      const newPost: Post = {
        id, userId: currentUser.id, text: text.trim(),
        media: mediaUrl && media ? { type: media.type, url: mediaUrl, name: media.file.name, size: media.file.size } : undefined,
        isReel: kind === 'reel',
        isVideo: kind === 'video',
        title: kind === 'video' ? title.trim().slice(0, 120) : undefined,
        coverUrl: coverUrl ?? undefined,
        cursor: new Date().toISOString(),
        timestamp: Date.now(), likes: [], comments: [], bookmarks: [],
      };
      setPosts(prev => [newPost, ...prev.filter(p => p.id !== id)]);
      if (media && media.url) URL.revokeObjectURL(media.url);
      clearCover();
      setText('');
      setTitle('');
      setMedia(null);
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
          <Avatar src={currentUser.avatar} name={currentUser.displayName} size="md" />
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
            <input ref={fileRef} type="file" accept={videoOnly ? 'video/mp4,video/webm,video/quicktime' : undefined} onChange={handleFile} className="hidden" />
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
            {posting ? 'جارٍ النشر...' : kind === 'reel' ? 'نشر الريل' : kind === 'video' ? 'نشر الفيديو' : 'نشر'}
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
                <Avatar src={user.avatar} name={user.displayName} size="lg" />
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
          <Avatar src={currentUser.avatar} name={currentUser.displayName} size="xl" />
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
      <div className="flex gap-1 mb-4 bg-gray-900 rounded-xl p-1 border border-gray-800">
        {[{ key: 'posts' as const, label: 'منشوراتي' }, { key: 'likes' as const, label: 'إعجاباتي' }, { key: 'bookmarks' as const, label: 'محفوظاتي' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t.label}
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
              <Avatar src={u.avatar} name={u.displayName} size="md" />
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
          <Avatar src={user.avatar} name={user.displayName} size="xl" />
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

function SettingsTab({ currentUser, setUsers }: {
  currentUser: User;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}) {
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
function MessagesTab({ currentUser, users, conversations, setConversations, selectedChat, setSelectedChat }: {
  currentUser: User; users: User[];
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  selectedChat: string | null;
  setSelectedChat: (id: string | null) => void;
}) {
  const myConversations = conversations
    .filter(c => c.participants.includes(currentUser.id))
    .sort((a, b) => b.lastActivity - a.lastActivity);

  const chatUser = selectedChat ? users.find(u => u.id === selectedChat) : null;
  const activeConversation = selectedChat
    ? conversations.find(c => c.participants.includes(currentUser.id) && c.participants.includes(selectedChat))
    : undefined;

  const unreadInActive = activeConversation
    ? activeConversation.messages.filter(m => m.senderId !== currentUser.id && !m.read).length
    : 0;

  // Mark the other person's messages as read while this chat is open.
  useEffect(() => {
    if (!activeConversation || unreadInActive === 0) return;
    const cid = activeConversation.id;
    setConversations(prev => prev.map(c =>
      c.id === cid
        ? { ...c, messages: c.messages.map(m => m.senderId !== currentUser.id ? { ...m, read: true } : m) }
        : c
    ));
    void supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', cid)
      .neq('sender_id', currentUser.id)
      .is('read_at', null);
  }, [activeConversation?.id, unreadInActive]);

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
      <h2 className="text-xl font-bold text-white mb-4">المراسلة</h2>
      {myConversations.length === 0 ? (
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
                  <Avatar src={otherUser.avatar} name={otherUser.displayName} size="lg" />
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
      className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl p-4 z-50 shadow-xl"
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
function ChatView({ currentUser, chatUser, conversation, setConversations, onBack }: {
  currentUser: User; chatUser: User;
  conversation: Conversation | undefined;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  onBack: () => void;
}) {
  const [text, setText] = useState('');
  const [media, setMedia] = useState<{ type: 'image' | 'video' | 'file'; url: string; file: File } | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const [coinMsgId, setCoinMsgId] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
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
        const { error: upErr } = await supabase.storage
          .from(CHAT_MEDIA_BUCKET)
          .upload(path, opts.file, { contentType: opts.file.type || 'application/octet-stream', cacheControl: '3600' });
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
    }
  };

  const sendMessage = async () => {
    if (!text.trim() && !media) return;
    const ok = await send({ text, file: media?.file, mediaType: media?.type, fileName: media?.file.name, replyToId: replyingTo?.id });
    if (ok) {
      setText('');
      setMedia(null);
      setReplyingTo(null);
    }
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
    const { error: bgErr } = await supabase
      .from('chat_backgrounds')
      .upsert({ conversation_id: convId, user_id: currentUser.id, type, value }, { onConflict: 'conversation_id,user_id' });
    if (bgErr) throw bgErr;
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
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    const kind: 'image' | 'video' | 'file' =
      /^image\/(jpeg|png|webp|gif)$/.test(file.type) ? 'image'
      : /^video\/(mp4|webm|quicktime)$/.test(file.type) ? 'video'
      : 'file';
    const limitMb = MAX_FILE_MB;
    if (file.size > limitMb * 1024 * 1024) {
      setError(`حجم الملف يجب أن لا يتجاوز ${limitMb} ميجابايت`);
      return;
    }
    if (media && media.url) URL.revokeObjectURL(media.url);
    setMedia({ type: kind, url: kind === 'file' ? '' : URL.createObjectURL(file), file });
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
      el?.focus();
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
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

  return (
    <div className="fixed left-0 right-0 z-[70] flex justify-center bg-gray-950" style={{ top: vp.top, height: vp.height }}>
    <div className={`flex flex-col h-full w-full max-w-2xl md:border-x md:border-gray-800 ${getBgClass()}`} style={!bg || bg.type !== 'gradient' ? getBgStyle() : {}}>
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 relative z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
          <ChevronRight size={20} />
        </button>
        <Avatar src={chatUser.avatar} name={chatUser.displayName} size="md" />
        <div className="flex-1">
          <div className="font-medium text-white">{chatUser.displayName}</div>
          {peerTyping
            ? <div className="text-xs text-cyan-400">يكتب الآن...</div>
            : <div className="text-xs text-gray-500">@{chatUser.username}</div>}
        </div>
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
          const isMine = msg.senderId === currentUser.id;
          const showAvatar = idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
          return (
            <motion.div
              key={msg.id}
              id={`msg-${msg.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}
            >
              {showAvatar && !isMine ? (
                <Avatar src={chatUser.avatar} name={chatUser.displayName} size="sm" />
              ) : !isMine ? <div className="w-7" /> : null}

              <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  onClick={() => handleBubbleTap(msg)}
                  className={`relative select-none touch-manipulation px-4 py-2.5 rounded-2xl cursor-pointer transition-shadow ${highlightId === msg.id ? 'ring-2 ring-cyan-400' : ''} ${
                    isMine
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
                  {msg.media?.type === 'image' && (
                    <div className="mb-2 relative">
                      <img
                        src={msg.media.url}
                        alt=""
                        onLoad={() => { if (Date.now() < stickUntil.current) scrollToBottom(); }}
                        onClick={e => { e.stopPropagation(); setViewer({ src: msg.media!.url, name: msg.media!.name }); }}
                        className="rounded-xl max-w-full max-h-48 object-cover cursor-zoom-in"
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
                  {msg.media?.type === 'video' && (
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
                </div>
                <span className={`text-[10px] text-gray-500 mt-1 ${isMine ? 'text-left' : 'text-right'}`}>
                  {formatTime(msg.timestamp)}
                  {isMine && msg.read && <Check size={10} className="inline mr-1 text-cyan-400" />}
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
                  <div className={`flex flex-wrap items-center gap-0.5 mt-1 p-1 bg-gray-800 rounded-full ${isMine ? 'flex-row-reverse' : ''}`}>
                    {QUICK_REACTIONS.map(e => (
                      <button
                        key={e}
                        onClick={() => { void setReaction(msg, e); setReactingTo(null); setActiveMsgId(null); }}
                        className="w-8 h-8 text-lg rounded-full hover:bg-gray-700 hover:scale-110 transition-transform"
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
                    {isMine && (
                      <button
                        onClick={() => deleteMessage(msg)}
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

      {/* Input */}
      {!recording && (
        <div className="p-3 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 relative z-10">
          <input ref={fileRef} type="file" onChange={handleFile} className="hidden" />
          <div className="flex items-center gap-2">
            <button onClick={() => fileRef.current?.click()} className="p-2.5 text-gray-400 hover:text-cyan-400 hover:bg-gray-800 rounded-full transition-all">
              <Paperclip size={20} />
            </button>
            <div className="relative">
              <button onPointerDown={e => e.preventDefault()} onMouseDown={e => e.preventDefault()} onClick={() => setEmojiOpen(o => !o)} className="p-2.5 text-gray-400 hover:text-yellow-400 hover:bg-gray-800 rounded-full transition-all" aria-label="إيموجي">
                <Smile size={20} />
              </button>
              {emojiOpen && <EmojiPicker onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />}
            </div>
            <input
              ref={inputRef}
              enterKeyHint="send"
              autoComplete="off"
              value={text} onChange={e => { setText(e.target.value); if (e.target.value) notifyTyping(); }}
              placeholder="اكتب رسالة..."
              className="flex-1 px-4 py-2.5 bg-gray-800 rounded-full text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            />
            {text.trim() || media ? (
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onPointerDown={e => e.preventDefault()} onMouseDown={e => e.preventDefault()} onClick={sendMessage} disabled={sending} className="p-2.5 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full disabled:opacity-60">
                <Send size={18} />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setRecording(true)}
                className="p-2.5 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full"
              >
                <Mic size={18} />
              </motion.button>
            )}
          </div>
        </div>
      )}
      {viewer && <ImageViewer src={viewer.src} name={viewer.name} onClose={() => setViewer(null)} />}
    </div>
    </div>
  );
}
