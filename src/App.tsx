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
  Palette, Play, Pause
} from 'lucide-react';
import { supabase, isConfigured } from './lib/supabase';

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
  media?: { type: 'image' | 'video'; url: string };
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
  media?: { type: 'image' | 'video' | 'voice'; url: string; duration?: number };
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
  media_type: 'image' | 'video' | null;
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

async function loadPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, text, media_url, media_type, created_at, post_likes(user_id), bookmarks(user_id), comments(id, parent_id, user_id, text, created_at, comment_likes(user_id))')
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'comments', ascending: true })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as unknown as PostRow[]).map(row => {
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
      media: row.media_url && row.media_type ? { type: row.media_type, url: row.media_url } : undefined,
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
  });
}

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
  media_type: 'image' | 'video' | 'voice' | null;
  media_duration: number | null;
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
    media: r.media_type && url ? { type: r.media_type, url, duration: r.media_duration ?? undefined } : undefined,
  };
}

async function loadConversations(me: string): Promise<Conversation[]> {
  const [convs, msgs, bgs] = await Promise.all([
    supabase.from('conversations').select('id, user_a, user_b, last_activity'),
    supabase
      .from('messages')
      .select('id, conversation_id, sender_id, text, media_path, media_type, media_duration, read_at, created_at')
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'search' | 'create' | 'profile' | 'settings' | 'messages'>('feed');
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

  const refreshPosts = async () => {
    try {
      setPosts(await loadPosts());
    } catch (e) {
      console.error(e);
    }
  };

  // Load posts and keep them live (Realtime + refresh when the tab becomes visible).
  useEffect(() => {
    if (!currentUserId) { setPosts([]); return; }
    void refreshPosts();
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { void refreshPosts(); void refreshUsers(); }, 600);
    };
    const channel = supabase.channel('kan-live');
    for (const table of ['profiles', 'follows', 'posts', 'comments', 'post_likes', 'comment_likes']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, schedule);
    }
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            KAN
          </h1>
          <div className="flex items-center gap-2">
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
            >
              <Search size={20} />
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
      <main className="pt-16 pb-20 max-w-2xl mx-auto min-h-screen">
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
              <Feed posts={posts} setPosts={setPosts} users={users} currentUser={currentUser} onOpenProfile={openProfile} />
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
          {!viewedUserId && activeTab === 'create' && (
            <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CreatePost currentUser={currentUser} setPosts={setPosts} setActiveTab={goTab} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ProfileTab currentUser={currentUser} users={users} posts={posts} setUsers={setUsers} setPosts={setPosts} onOpenProfile={openProfile} />
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
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-around py-2">
          {[
            { tab: 'feed' as const, icon: Home, label: 'الرئيسية' },
            { tab: 'search' as const, icon: Search, label: 'بحث' },
            { tab: 'create' as const, icon: PlusCircle, label: 'نشر' },
            { tab: 'messages' as const, icon: MessageSquare, label: 'رسائل', badge: unreadCount },
            { tab: 'profile' as const, icon: User, label: 'حسابي' },
            { tab: 'settings' as const, icon: Settings, label: 'إعدادات' },
          ].map(({ tab, icon: Icon, label, badge }) => (
            <button
              key={tab}
              onClick={() => goTab(tab)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === tab ? 'text-violet-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px]">{label}</span>
              {badge && badge > 0 ? (
                <span className="absolute -top-0.5 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">
                  {badge > 9 ? '9+' : badge}
                </span>
              ) : null}
            </button>
          ))}
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
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl text-white font-medium shadow-lg shadow-violet-500/25 disabled:opacity-60"
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
function Feed({ posts, setPosts, users, currentUser, onOpenProfile }: {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  users: User[];
  currentUser: User;
  onOpenProfile: (id: string) => void;
}) {
  const [mode, setMode] = useState<'all' | 'following'>('all');
  const sorted = [...posts].sort((a, b) => b.timestamp - a.timestamp);
  const displayPosts = mode === 'all'
    ? sorted
    : sorted.filter(p => p.userId === currentUser.id || currentUser.following.includes(p.userId));

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
        {[{ key: 'all' as const, label: 'الكل' }, { key: 'following' as const, label: 'المتابَعون' }].map(t => (
          <button key={t.key} onClick={() => setMode(t.key)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === t.key ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {displayPosts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-gray-400 mb-2">لا توجد منشورات بعد</p>
          <p className="text-gray-500 text-sm">
            {mode === 'following' ? 'تابع أشخاصاً لتظهر منشوراتهم هنا' : 'انشر أول منشور لك!'}
          </p>
        </div>
      )}
      {displayPosts.map(post => (
        <PostCard key={post.id} post={post} setPosts={setPosts} users={users} currentUser={currentUser} onOpenProfile={onOpenProfile} />
      ))}
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

      {post.text && (
        <div className="px-4 pb-3">
          <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{post.text}</p>
        </div>
      )}

      {post.media && (
        <div className="px-4 pb-3">
          {post.media.type === 'image' ? (
            <img src={post.media.url} alt="" className="w-full rounded-xl max-h-96 object-cover" />
          ) : (
            <video src={post.media.url} controls className="w-full rounded-xl max-h-96" />
          )}
        </div>
      )}

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
    </motion.div>
  );
}

// ============ Create Post ============
function CreatePost({ currentUser, setPosts, setActiveTab }: {
  currentUser: User;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  setActiveTab: (tab: 'feed' | 'search' | 'create' | 'profile' | 'settings' | 'messages') => void;
}) {
  const [text, setText] = useState('');
  const [media, setMedia] = useState<{ type: 'image' | 'video'; url: string; file: File } | null>(null);
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    if (!MEDIA_EXT[file.type]) {
      setError('نوع الملف غير مدعوم (صور JPG/PNG/WebP/GIF أو فيديو MP4/WebM/MOV)');
      return;
    }
    const isVideo = file.type.startsWith('video/');
    if (isVideo && file.size > 20 * 1024 * 1024) {
      setError('حجم الفيديو يجب أن لا يتجاوز 20 ميجابايت');
      return;
    }
    if (!isVideo && file.size > 10 * 1024 * 1024) {
      setError('حجم الصورة يجب أن لا يتجاوز 10 ميجابايت');
      return;
    }
    if (media) URL.revokeObjectURL(media.url);
    setMedia({ type: isVideo ? 'video' : 'image', url: URL.createObjectURL(file), file });
  };

  const handlePost = async () => {
    if (posting) return;
    if (!text.trim() && !media) { setError('اكتب شيئاً أو أضف صورة/فيديو'); return; }
    setPosting(true);
    setError('');
    let uploadedPath: string | null = null;
    try {
      let mediaUrl: string | null = null;
      if (media) {
        const path = `${currentUser.id}/${crypto.randomUUID()}.${MEDIA_EXT[media.file.type]}`;
        const { error: upErr } = await supabase.storage
          .from(POST_MEDIA_BUCKET)
          .upload(path, media.file, { contentType: media.file.type, cacheControl: '31536000' });
        if (upErr) throw upErr;
        uploadedPath = path;
        mediaUrl = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
      }
      const id = crypto.randomUUID();
      const { error: insErr } = await supabase.from('posts').insert({
        id,
        user_id: currentUser.id,
        text: text.trim(),
        media_url: mediaUrl,
        media_type: media ? media.type : null,
      });
      if (insErr) throw insErr;
      const newPost: Post = {
        id, userId: currentUser.id, text: text.trim(),
        media: mediaUrl && media ? { type: media.type, url: mediaUrl } : undefined,
        timestamp: Date.now(), likes: [], comments: [], bookmarks: [],
      };
      setPosts(prev => [newPost, ...prev.filter(p => p.id !== id)]);
      if (media) URL.revokeObjectURL(media.url);
      setText('');
      setMedia(null);
      setActiveTab('feed');
    } catch (e) {
      console.error(e);
      if (uploadedPath) void supabase.storage.from(POST_MEDIA_BUCKET).remove([uploadedPath]);
      setError('تعذّر نشر المنشور، حاول مرة أخرى');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="px-4 py-4">
      <h2 className="text-xl font-bold text-white mb-4">منشور جديد</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <div className="flex gap-3 mb-4">
          <Avatar src={currentUser.avatar} name={currentUser.displayName} size="md" />
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            placeholder="ماذا يدور في ذهنك؟" rows={4}
            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none resize-none text-lg"
          />
        </div>
        {media && (
          <div className="mb-4 relative">
            {media.type === 'image' ? (
              <img src={media.url} alt="" className="w-full rounded-xl max-h-64 object-cover" />
            ) : (
              <video src={media.url} controls className="w-full rounded-xl max-h-64" />
            )}
            <button onClick={() => setMedia(null)} className="absolute top-2 left-2 p-1.5 bg-gray-900/80 rounded-full text-white hover:bg-red-500">
              <X size={14} />
            </button>
          </div>
        )}
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <div className="flex items-center justify-between border-t border-gray-800 pt-3">
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={handleFile} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="p-2 text-cyan-400 hover:bg-gray-800 rounded-full transition-colors">
              <ImageIcon size={20} />
            </button>
            <button onClick={() => fileRef.current?.click()} className="p-2 text-green-400 hover:bg-gray-800 rounded-full transition-colors">
              <Video size={20} />
            </button>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handlePost} disabled={posting} className="px-6 py-2 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-full text-white font-medium disabled:opacity-60">
            {posting ? 'جارٍ النشر...' : 'نشر'}
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
function ProfileTab({ currentUser, users, posts, setPosts, onOpenProfile }: {
  currentUser: User; users: User[]; posts: Post[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  onOpenProfile: (id: string) => void;
}) {
  const [listModal, setListModal] = useState<{ title: string; ids: string[] } | null>(null);
  const [tab, setTab] = useState<'posts' | 'likes' | 'bookmarks'>('posts');
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
function UserProfile({ userId, currentUser, users, posts, setUsers, setPosts, onOpenProfile, onStartChat, onBack }: {
  userId: string;
  currentUser: User;
  users: User[];
  posts: Post[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  onOpenProfile: (id: string) => void;
  onStartChat: (id: string) => void;
  onBack: () => void;
}) {
  const [listModal, setListModal] = useState<{ title: string; ids: string[] } | null>(null);
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
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl text-white font-medium flex items-center justify-center gap-2">
          {saved ? <><Check size={18} /> تم الحفظ</> : 'حفظ التغييرات'}
        </motion.button>
      </div>
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { void supabase.auth.signOut(); }} className="w-full py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-medium flex items-center justify-center gap-2">
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
          onClick={() => onChange({ type: 'color', value: '#030712' })}
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
  const [media, setMedia] = useState<{ type: 'image' | 'video'; url: string; file: File } | null>(null);
  const [recording, setRecording] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const messages = conversation?.messages || [];
  const bg = conversation?.background;

  const getBgStyle = () => {
    if (!bg) return { background: '#030712' };
    if (bg.type === 'image') return { backgroundImage: `url("${bg.value}")`, backgroundSize: 'cover', backgroundPosition: 'center' };
    if (bg.type === 'color') return { background: bg.value };
    return {};
  };

  const getBgClass = () => {
    if (!bg || bg.type !== 'gradient') return '';
    return `bg-gradient-to-b ${bg.value}`;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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

  const send = async (opts: { text?: string; file?: Blob; mediaType?: 'image' | 'video' | 'voice'; duration?: number }): Promise<boolean> => {
    const body = (opts.text ?? '').trim();
    if (!body && !opts.file) return false;
    if (sending) return false;
    setSending(true);
    setError('');
    let path: string | null = null;
    try {
      const convId = await ensureConversation();
      if (opts.file) {
        const ext = CHAT_EXT[opts.file.type];
        if (!ext) throw new Error('unsupported file type');
        path = `${convId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(CHAT_MEDIA_BUCKET)
          .upload(path, opts.file, { contentType: opts.file.type, cacheControl: '3600' });
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
      });
      if (insErr) throw insErr;
      const msg: Message = {
        id, senderId: currentUser.id, text: body, timestamp: Date.now(), read: false,
        media: opts.file && opts.mediaType
          ? { type: opts.mediaType, url: URL.createObjectURL(opts.file), duration: opts.duration }
          : undefined,
      };
      setConversations(prev => prev.map(c =>
        c.id !== convId
          ? c
          : { ...c, messages: c.messages.some(m => m.id === id) ? c.messages : [...c.messages, msg], lastActivity: msg.timestamp }
      ));
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
    const ok = await send({ text, file: media?.file, mediaType: media?.type });
    if (ok) {
      setText('');
      setMedia(null);
    }
  };

  const sendVoice = async (dataUrl: string, duration: number) => {
    setRecording(false);
    try {
      const blob = await (await fetch(dataUrl)).blob();
      await send({ file: blob, mediaType: 'voice', duration });
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
    if (!MEDIA_EXT[file.type]) {
      setError('نوع الملف غير مدعوم (صور JPG/PNG/WebP/GIF أو فيديو MP4/WebM/MOV)');
      return;
    }
    const isVideo = file.type.startsWith('video/');
    if (file.size > (isVideo ? 20 : 10) * 1024 * 1024) {
      setError(isVideo ? 'حجم الفيديو يجب أن لا يتجاوز 20 ميجابايت' : 'حجم الصورة يجب أن لا يتجاوز 10 ميجابايت');
      return;
    }
    if (media) URL.revokeObjectURL(media.url);
    setMedia({ type: isVideo ? 'video' : 'image', url: URL.createObjectURL(file), file });
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-9rem)] ${getBgClass()}`} style={!bg || bg.type !== 'gradient' ? getBgStyle() : {}}>
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 relative z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
          <ChevronRight size={20} />
        </button>
        <Avatar src={chatUser.avatar} name={chatUser.displayName} size="md" />
        <div className="flex-1">
          <div className="font-medium text-white">{chatUser.displayName}</div>
          <div className="text-xs text-gray-500">@{chatUser.username}</div>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}
            >
              {showAvatar && !isMine ? (
                <Avatar src={chatUser.avatar} name={chatUser.displayName} size="sm" />
              ) : !isMine ? <div className="w-7" /> : null}

              <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl ${
                    isMine
                      ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-bl-sm'
                      : 'bg-gray-800/90 backdrop-blur-sm text-gray-200 rounded-br-sm'
                  }`}
                >
                  {msg.media?.type === 'image' && (
                    <div className="mb-2">
                      <img src={msg.media.url} alt="" className="rounded-xl max-w-full max-h-48 object-cover" />
                    </div>
                  )}
                  {msg.media?.type === 'video' && (
                    <div className="mb-2">
                      <video src={msg.media.url} controls className="rounded-xl max-w-full max-h-48" />
                    </div>
                  )}
                  {msg.media?.type === 'voice' && (
                    <VoicePlayer url={msg.media.url} knownDuration={msg.media.duration} />
                  )}
                  {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
                </div>
                <span className={`text-[10px] text-gray-500 mt-1 ${isMine ? 'text-left' : 'text-right'}`}>
                  {formatTime(msg.timestamp)}
                  {isMine && msg.read && <Check size={10} className="inline mr-1 text-cyan-400" />}
                </span>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Media Preview */}
      {media && (
        <div className="px-4 py-2 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 relative z-10">
          <div className="relative inline-block">
            {media.type === 'image' ? (
              <img src={media.url} alt="" className="h-20 rounded-lg" />
            ) : (
              <video src={media.url} className="h-20 rounded-lg" />
            )}
            <button onClick={() => setMedia(null)} className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {error && <div className="px-4 py-1 text-red-400 text-xs bg-gray-900/95">{error}</div>}

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
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={handleFile} className="hidden" />
          <div className="flex items-center gap-2">
            <button onClick={() => fileRef.current?.click()} className="p-2.5 text-gray-400 hover:text-cyan-400 hover:bg-gray-800 rounded-full transition-all">
              <Paperclip size={20} />
            </button>
            <input
              value={text} onChange={e => setText(e.target.value)}
              placeholder="اكتب رسالة..."
              className="flex-1 px-4 py-2.5 bg-gray-800 rounded-full text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            />
            {text.trim() || media ? (
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={sendMessage} disabled={sending} className="p-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-full disabled:opacity-60">
                <Send size={18} />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setRecording(true)}
                className="p-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-full"
              >
                <Mic size={18} />
              </motion.button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
