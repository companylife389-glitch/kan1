import { useState, useEffect, useLayoutEffect, useRef, useMemo, useSyncExternalStore } from 'react';
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
  Gamepad2, Palette, Play, Pause, Download, FileText, Smile, Film, Plus, Volume2, VolumeX, RefreshCw, PlayCircle, Sparkles, Copy, CheckCheck, Maximize, Minimize, Menu, ChevronsLeft, ChevronsRight, Bell, BellOff, LayoutGrid, Pencil, Music, Flag, MoreHorizontal, Bookmark as BookmarkIcon, ChevronDown, Repeat, PictureInPicture2, BarChart3, HelpCircle, Clock, AtSign, Type as TypeIcon, Wand2,
  AlertTriangle, Info,
} from 'lucide-react';
import { supabase, isConfigured } from './supabase';

// ============ Language (Arabic is the default; English is added first for the main screens) ============
type Lang = 'ar' | 'en';
const getLang = (): Lang => { try { return localStorage.getItem('kan_lang') === 'en' ? 'en' : 'ar'; } catch { return 'ar'; } };
const LANG: Lang = getLang();
const setLangStored = (l: Lang) => { try { localStorage.setItem('kan_lang', l); } catch { /* ignore */ } window.location.reload(); };
if (typeof document !== 'undefined') { document.documentElement.lang = LANG; document.documentElement.dir = LANG === 'en' ? 'ltr' : 'rtl'; }
const EN: Record<string, string> = {
  'الرئيسية': 'Home', 'ريلز': 'Reels', 'فيديوهات': 'Videos', 'حسابي': 'Profile', 'نشر': 'Post',
  'الإشعارات': 'Notifications', 'الرسائل': 'Messages', 'بحث': 'Search', 'الإعدادات': 'Settings', 'القائمة': 'Menu', 'إغلاق القائمة': 'Close menu',
  'الكل': 'All', 'المتابَعون': 'Following', 'الملفات': 'Files', 'القصص': 'Stories', 'قصتك': 'Your story',
  'المراسلة': 'Messaging', 'المجموعات': 'Groups', 'مجموعة جديدة': 'New group',
  'لا توجد منشورات بعد': 'No posts yet', 'انشر أول منشور لك!': 'Share your first post!', 'جارٍ التحميل...': 'Loading...', 'وصلت لنهاية المنشورات': "You're all caught up",
  'تسجيل الدخول': 'Log in', 'حساب جديد': 'Sign up', 'اسم المستخدم': 'Username', 'كلمة المرور': 'Password', 'الاسم المعروض': 'Display name',
  'دخول': 'Enter', 'إنشاء حساب': 'Create account', 'شبكة التواصل الاجتماعي': 'Social network',
  'اكتب رسالة...': 'Type a message...', 'اكتب تعليقاً...': 'Write a comment...', 'اكتب رداً...': 'Write a reply...', 'ابحث عن أشخاص...': 'Search people...', 'ماذا يدور في ذهنك؟': "What's on your mind?",
  'منشور جديد': 'New post', 'ريل جديد': 'New reel', 'فيديو جديد': 'New video', 'منشور': 'Post', 'جارٍ النشر...': 'Posting...', 'نشر الريل': 'Post reel', 'نشر الفيديو': 'Post video',
  'المظهر': 'Appearance', 'اختر الثيم الذي يريحك': 'Pick the theme you like', 'فاتح': 'Light', 'داكن': 'Dark',
  'شكل الإعجاب': 'Like style', 'حلقة القصة حول الصورة': 'Story ring around pictures', 'اللغة': 'Language',
  'الصورة الشخصية': 'Profile picture', 'النبذة التعريفية': 'Bio', 'الموقع': 'Location', 'الموقع الإلكتروني': 'Website',
  'حفظ التغييرات': 'Save changes', 'تم الحفظ': 'Saved', 'تسجيل الخروج': 'Log out', 'تثبيت التطبيق': 'Install app', 'تثبيت': 'Install', 'مثبّت': 'Installed',
  'الإشعارات والصوت': 'Notifications & sound', 'صوت الرسائل': 'Message sound', 'مفعّل': 'On', 'متوقف': 'Off', 'تفعيل': 'Enable', 'إيقاف': 'Turn off',
  'منشوراتي': 'My posts', 'إعجاباتي': 'My likes', 'محفوظاتي': 'Saved', 'متابِع': 'Followers', 'متابَع': 'Following', 'متابعة': 'Follow', 'راسل': 'Message', 'رجوع': 'Back',
  'مشاركة': 'Share', 'تحميل': 'Download', 'حذف': 'Delete', 'تعديل': 'Edit', 'رد': 'Reply', 'تفاعل': 'React', 'حفظ': 'Save', 'إلغاء': 'Cancel',
  'لا توجد محادثات بعد': 'No chats yet', 'ابحث عن أشخاص وابدأ المحادثة!': 'Find people and start chatting!', 'ابدأ المحادثة': 'Start chatting',
  'الإشعارات الفورية': 'Push notifications', 'لا توجد إشعارات بعد': 'No notifications yet', 'تحديد الكل كمقروء': 'Mark all as read', 'جديد': 'New', 'سابقاً': 'Earlier',
  'أعجب بمنشورك': 'liked your post', 'بدأ بمتابعتك': 'started following you', 'يكتب الآن...': 'typing...', 'ملصقات': 'Stickers', 'إرفاق': 'Attach', 'اسأل KIX': 'Ask KIX',
  'الإعجابات': 'Likes', 'التعليقات': 'Comments', 'المتابِعون': 'Followers', 'يتابع': 'Following', 'أضف تعليقاً...': 'Add a comment...', 'إعجاب': 'Like', 'محفوظ': 'Saved', 'تشغيل الصوت': 'Unmute', 'كتم الصوت': 'Mute', 'إيقاف مؤقت': 'Pause', 'تشغيل': 'Play', 'حفظ الملصق': 'Save sticker', 'تم الحفظ ✓': 'Saved ✓', 'تعذّر حفظ الملصق': "Couldn't save the sticker", 'هذه المحادثة فقط': 'This chat only', 'كل المحادثات': 'All chats', 'تطبيق الخلفية على': 'Apply background to', 'خلفية المحادثة': 'Chat background', 'رفع صورة': 'Upload image', 'افتراضي': 'Default', 'نيلي': 'Indigo', 'أخضر': 'Green', 'بنفسجي': 'Purple', 'قلب كريستال': 'Crystal heart', 'عملة ذهبية': 'Gold coin', 'ألماسة': 'Diamond'
};
const DIR = LANG === 'en' ? 'ltr' : 'rtl';
const t = (ar: string): string => (LANG === 'en' ? EN[ar] ?? ar : ar);
// More English strings. The page text, placeholders and alerts are translated at runtime (see kanTr below).
Object.assign(EN, {
  "(أنت)": "(You)", "· معدّلة": "· edited", "6 أحرف على الأقل": "At least 6 characters", "أدخل اسم المستخدم وكلمة المرور": "Enter your username and password",
  "أرسل في محادثة...": "Send in a chat...", "أرسلت لك إشعاراً تجريبياً، اخرج من التطبيق لتراه": "A test notification was sent. Leave the app to see it",
  "ألوان دافئة": "Warm colors", "أنت": "You", "أنت:": "You:", "أنشئ مجموعة وأضف أصدقاءك": "Create a group and add your friends",
  "أي فيديو يُنشر يظهر هنا بتصميم الريلز": "Any video you post shows up here in reels style", "إخفاء": "Hide", "إرسال": "Send", "إرسال إشعار تجريبي": "Send a test notification",
  "إرسال الرد": "Send reply", "إزالة": "Remove", "إزالة الصورة": "Remove photo", "إزالة الكل": "Remove all", "إزالة الموسيقى": "Remove music", "إشعار الهاتف": "Phone notification",
  "إشعار جديد": "New notification", "إشعارات الرسائل": "Message notifications", "إعادة المحاولة": "Try again", "إعدادات الإشعارات": "Notification settings", "إغلاق": "Close",
  "إلغاء الرد": "Cancel reply", "إلغاء الملفات": "Cancel files", "إنشاء المجموعة": "Create group", "إنشاء وإرسال الملصق": "Create and send sticker", "إيقاف الإشعارات المنبثقة": "Turn off pop-up notifications",
  "إيقاف الصوت": "Mute", "إيموجي": "Emoji", "ابحث عن شخص...": "Search for a person...", "ابحث في الفيديوهات...": "Search videos...", "ابدأ المحادثة في المجموعة 👋": "Start the conversation in the group 👋",
  "ابدأ بالبحث عن أشخاص": "Start by searching for people", "اختر الفيديو أولاً": "Choose the video first", "اختر صورة": "Choose a photo", "اختر صورة أو فيديو": "Choose a photo or video",
  "اختر صورة فقط": "Choose a photo only", "اختر فيديو لنشره كريل": "Choose a video to post as a reel", "اختر ما يصلك وما لا يصلك": "Choose what reaches you", "اختر ملف صوت": "Choose an audio file", "اختر ملف فيديو": "Choose a video file",
  "اسأل KIX أي سؤال أو اطلب منه يقرأ الشات...": "Ask KIX anything or have it read the chat...", "اسأل KIX غير متاح الآن، حاول بعد شوية.": "Ask KIX is unavailable right now, try again later.", "استنى دقيقة وحاول تاني.": "Wait a minute and try again.",
  "اسم المجموعة": "Group name", "اسم المستخدم أو كلمة المرور غير صحيحة": "Wrong username or password", "اسم المستخدم مستخدم بالفعل": "Username is already taken",
  "اسم المستخدم من 3 إلى 30 حرفاً (حروف وأرقام و _ و . فقط)": "Username must be 3 to 30 characters (letters, numbers, _ and . only)", "اصنع أول ملصق من صورة أو فيديو قصير": "Make your first sticker from a photo or short video",
  "اضغط رجوع مرة أخرى للخروج": "Press back again to exit", "افتح KIX من شاشتك الرئيسية مثل أي تطبيق": "Open KIX from your home screen like any app", "اقترح رد مناسب على آخر رسالة": "Suggest a reply to the last message",
  "اكتب رسالة للمجموعة...": "Write a message to the group...", "اكتب شيئاً أو أضف صورة أو فيديو أو ملف": "Write something or add a photo, video or file", "اكتب شيئاً عن نفسك...": "Write something about yourself...",
  "اكتب عنواناً للفيديو": "Write a title for the video", "اكتب وصفاً للريل...": "Write a caption for the reel...", "الآن": "now", "الإشعارات تعمل على هذا الجهاز ✅": "Notifications are working on this device ✅",
  "الإشعارات محظورة لهذا الموقع. افتح إعدادات الموقع في المتصفح واسمح بالإشعارات.": "Notifications are blocked for this site. Open the site settings in your browser and allow notifications.",
  "الإشعارات محظورة، فعّلها من إعدادات المتصفح": "Notifications are blocked, enable them in your browser settings", "الإعجابات والتعليقات والمتابعون الجدد ستظهر هنا": "Likes, comments and new followers will show up here",
  "الاسم الكامل": "Full name", "الاسم المعروض غير صالح": "Invalid display name", "الاسم المعروض مطلوب": "Display name is required", "البريد الإلكتروني غير صالح": "Invalid email", "التالي": "Next", "التعليق": "Comment",
  "التعليقات والردود": "Comments and replies", "الرد على رسالتك": "Replied to your message", "الرسائل الخاصة": "Private messages", "السابق": "Previous", "السرعة": "Speed", "الصورة الشخصية (اختياري)": "Profile photo (optional)",
  "العربية": "العربية", "العنوان": "Title", "الغلاف يجب أن يكون صورة JPG أو PNG أو WebP": "The cover must be a JPG, PNG or WebP image", "المتابعون الجدد": "New followers", "المزيد": "More", "المزيد من الفيديوهات": "More videos",
  "المستخدم غير موجود": "User not found", "الملصقات المتحركة غير مدعومة في التعليقات": "Animated stickers are not supported in comments", "الملف كبير جداً (الحد 80 ميجا)": "The file is too large (80 MB limit)",
  "المنشور": "Post", "النص لا يمكن أن يكون فارغاً": "The text can't be empty", "انشر ريل": "Post a reel", "انشر فيديو": "Post a video", "بدون غلاف": "No cover", "تابع أشخاصاً لتظهر منشوراتهم هنا": "Follow people to see their posts here",
  "تحميل الصورة": "Download photo", "ترقية": "Promote", "تسجيل صوتي": "Voice recording", "تشغيل الإشعارات المنبثقة": "Turn on pop-up notifications", "تصلك حتى لو كان الموقع مغلقاً": "You get them even when the site is closed",
  "تظهر حول صورة أي شخص لديه قصة نشطة، ورمادية بعد أن تشاهدها": "Shows around the photo of anyone with an active story, and turns gray once you watch it", "تعديل التعليق": "Edit comment", "تعديل الرد": "Edit reply",
  "تعديل الرسالة": "Edit message", "تعديل المنشور": "Edit post", "تعذّر إرسال الرد": "Couldn't send the reply", "تعذّر إرسال الرسالة الصوتية": "Couldn't send the voice message", "تعذّر إرسال الرسالة، حاول مرة أخرى": "Couldn't send the message, try again",
  "تعذّر إرسال الملصق": "Couldn't send the sticker", "تعذّر إضافة التعليق، حاول مرة أخرى": "Couldn't add the comment, try again", "تعذّر إضافة الرد، حاول مرة أخرى": "Couldn't add the reply, try again",
  "تعذّر إنشاء الحساب، حاول مرة أخرى": "Couldn't create the account, try again", "تعذّر إنشاء المجموعة، حاول مرة أخرى": "Couldn't create the group, try again", "تعذّر إنشاء الملصق، جرّب ملفاً آخر": "Couldn't create the sticker, try another file",
  "تعذّر الإرسال، حاول مرة أخرى": "Couldn't send, try again", "تعذّر الحذف، حاول مرة أخرى": "Couldn't delete, try again", "تعذّر العثور على ملفك الشخصي": "Couldn't find your profile", "تعذّر النسخ": "Couldn't copy",
  "تعذّر النشر، حاول مرة أخرى": "Couldn't publish, try again", "تعذّر تحميل البيانات من الخادم": "Couldn't load data from the server", "تعذّر تغيير الاسم": "Couldn't change the name", "تعذّر تغيير الصورة": "Couldn't change the photo",
  "تعذّر تفعيل الإشعارات": "Couldn't enable notifications", "تعذّر تفعيل الإشعارات، حاول مرة أخرى.": "Couldn't enable notifications, try again.", "تعذّر تنفيذ العملية": "Couldn't complete the action",
  "تعذّر حذف الألبوم، حاول مرة أخرى": "Couldn't delete the album, try again", "تعذّر حذف التعليق، حاول مرة أخرى": "Couldn't delete the comment, try again", "تعذّر حذف الرد، حاول مرة أخرى": "Couldn't delete the reply, try again",
  "تعذّر حذف الرسالة": "Couldn't delete the message", "تعذّر حذف الرسالة، حاول مرة أخرى": "Couldn't delete the message, try again", "تعذّر حذف المنشور، حاول مرة أخرى": "Couldn't delete the post, try again",
  "تعذّر حفظ الإعداد": "Couldn't save the setting", "تعذّر حفظ التعديل، حاول مرة أخرى": "Couldn't save the edit, try again", "تعذّر حفظ التغييرات، حاول مرة أخرى": "Couldn't save the changes, try again",
  "تعذّر حفظ الخلفية": "Couldn't save the background", "تعذّر رفع صورة الخلفية": "Couldn't upload the background", "تعذّر عرض الإشعار": "Couldn't show the notification", "تعذّر عرض الإشعار التجريبي.": "Couldn't show the test notification.",
  "تعذّر نشر القصة، حاول مرة أخرى": "Couldn't post the story, try again", "تعذّرت الإزالة": "Couldn't remove", "تعذّرت الإضافة": "Couldn't add", "تعذّرت المشاركة في القصة": "Couldn't share to the story", "تعذّرت المغادرة": "Couldn't leave",
  "تعليق": "Comment", "تعليق على منشورك أو رد على تعليقك": "A comment on your post or a reply to your comment", "تغيير الخلفية": "Change background", "تغيير صورة المجموعة": "Change group photo", "تم": "Done",
  "تم إرسال ردك ✓": "Reply sent ✓", "تم إنشاء الحساب، سجّل الدخول الآن.": "Account created, log in now.", "تم الإرسال": "Sent", "تم النسخ": "Copied", "تم نسخ الرابط": "Link copied", "تمت المشاركة في قصتك ✓": "Shared to your story ✓", "تمت المشاهدة": "Seen",
  "تم رفض الإذن. فعّل الإشعارات لهذا الموقع من إعدادات المتصفح ثم حاول مرة أخرى.": "Permission denied. Enable notifications for this site in your browser settings and try again.", "تيليجرام": "Telegram", "ثبّت KIX على جهازك": "Install KIX on your device",
  "جارٍ إنشاء الملصق...": "Creating sticker...", "جارٍ الإنشاء...": "Creating...", "جارٍ الالتقاط...": "Capturing...", "جميع الحقول مطلوبة": "All fields are required", "جهازك أو متصفحك لا يدعم إشعارات الهاتف": "Your device or browser doesn't support phone notifications",
  "حجم الصورة يجب أن لا يتجاوز 8 ميجابايت": "The photo must not exceed 8 MB", "حجم الغلاف يجب أن لا يتجاوز 5 ميجابايت": "The cover must not exceed 5 MB", "حجم الموسيقى يجب أن لا يتجاوز 20 ميجابايت": "The music must not exceed 20 MB",
  "حدث خطأ في الاتصال، حاول مرة أخرى": "Connection error, try again", "حدث خطأ، حاول مرة أخرى": "Something went wrong, try again", "حذف الرد": "Delete reply", "حذف القصة": "Delete story", "حذف الملصق": "Delete sticker",
  "حذف كل ملفات الألبوم للجميع؟": "Delete all the album's files for everyone?", "حذف ملصقات": "Delete stickers", "حذف هذا التعليق؟": "Delete this comment?", "حذف هذا الرد؟": "Delete this reply?", "حذف هذه الرسالة للجميع؟": "Delete this message for everyone?", "حذف هذه القصة؟": "Delete this story?",
  "حلل المحادثة وقل لي ما المطلوب مني": "Analyze the chat and tell me what's expected of me", "دعوات المجموعات": "Group invites", "رسائل المجموعات": "Group messages", "رسائل المحادثات العادية": "Regular chat messages", "رسائل جديدة في مجموعاتك": "New messages in your groups",
  "رسالة": "Message", "رسالة جديدة": "New message", "رسالة غير متاحة": "Message unavailable", "ريل 🎬": "Reel 🎬", "سجّل الدخول من جديد وحاول تاني.": "Log in again and try again.", "شاهدها الكل": "Everyone saw it", "شوهدت": "Seen", "صورة": "Photo",
  "صورة / فيديو / ملف": "Photo / video / file", "صورة الغلاف": "Cover photo", "عرض التعليق": "View comment", "عرض القصة": "View story", "عرض المنشور": "View post",
  "على الآيفون: اضغط زر المشاركة في Safari ثم «إضافة إلى الشاشة الرئيسية».": "On iPhone: tap the Share button in Safari, then “Add to Home Screen”.", "عندما يتابعك شخص": "When someone follows you", "عندما يضيفك أحد إلى مجموعة": "When someone adds you to a group",
  "عندما يعجب أحد بمنشورك": "When someone likes your post", "عنوان الفيديو": "Video title", "عيّن مشرفاً آخر قبل المغادرة": "Assign another admin before leaving", "فتح الريل": "Open reel", "فشل رفع الصورة": "Photo upload failed", "فشل قراءة الملف": "Couldn't read the file",
  "في التطبيق": "In the app", "فيديو": "Video", "فيديو ▶️": "Video ▶️", "قصة جديدة": "New story", "كلمة المرور غير مقبولة (6 أحرف على الأقل)": "Password not accepted (at least 6 characters)", "كلمة المرور يجب أن تكون 6 أحرف على الأقل": "Password must be at least 6 characters",
  "لا أحد بعد": "No one yet", "لا توجد تعليقات بعد. كن أول من يعلّق!": "No comments yet. Be the first to comment!", "لا توجد ريلز بعد": "No reels yet", "لا توجد فيديوهات بعد": "No videos yet", "لا توجد مجموعات بعد": "No groups yet",
  "لا توجد ملفات منشورة بعد. انشر أول ملف!": "No files posted yet. Post the first one!", "لا توجد منشورات": "No posts", "لا توجد نتائج": "No results", "لا يمكن الوصول للميكروفون. يرجى السماح بالوصول.": "Can't access the microphone. Please allow access.",
  "لا يمكن تشغيل هذا الفيديو على هذا الجهاز (صيغة غير مدعومة).": "This video can't be played on this device (unsupported format).", "لا يمكن تشغيل هذا الفيديو على هذا الجهاز. قد يكون بصيغة لا يدعمها المتصفح (مثل تسجيلات الآيفون HEVC).": "This video can't be played on this device. It may be in a format the browser doesn't support (like iPhone HEVC recordings).",
  "لا يوجد أحد": "No one", "لتصلك إشعارات الهاتف اسمح بالإشعارات في المتصفح": "Allow notifications in the browser to get phone notifications", "لخّص المحادثة باختصار": "Summarize the chat briefly", "لم يشاهدها أحد بعد": "No one has seen it yet", "متصفحك لا يدعم تسجيل الفيديو": "Your browser doesn't support video recording",
  "مثال: القاهرة، مصر": "Example: Cairo, Egypt", "مجموعة": "Group", "محاولات كثيرة، حاول لاحقاً": "Too many attempts, try later", "مستخدم": "User", "مسح": "Clear", "مسح كل الإشعارات": "Clear all notifications", "مشاركة التعليق": "Share comment", "مشرف": "Admin",
  "معلومات المجموعة": "Group info", "مغادرة المجموعة": "Leave group", "ملء الشاشة": "Full screen", "ملصق جديد": "New sticker", "ملف": "File", "من شاهدها": "Who saw it", "موسيقى": "Music", "نسخ": "Copy", "نسخ الرابط": "Copy link",
  "نغمة عند وصول رسالة أو إرسالها": "A tone when a message arrives or is sent", "هذا البريد مسجّل بالفعل": "This email is already registered", "هذا المتصفح لا يدعم الإشعارات.": "This browser doesn't support notifications.", "هذا المنشور غير متاح، ربما تم حذفه": "This post isn't available, it may have been deleted",
  "هكذا ستظهر لك الرسائل خارج التطبيق 👋": "This is how messages will look outside the app 👋", "واتساب": "WhatsApp", "سينمائي": "Cinema", "نيون": "Neon", "غروب": "Sunset", "ذهبي": "Golden", "شتوي": "Winter", "بوب": "Pop", "ليلي": "Night", "حلم": "Dream", "عادي": "Normal", "دافئ": "Warm", "بارد": "Cool", "أبيض وأسود": "B&W", "ساطع": "Bright", "كلاسيك": "Classic", "دراما": "Drama", "🎨 فلتر": "🎨 Filter", "🎨 فلتر ✓": "🎨 Filter ✓", "صورة أو فيديو": "Photo or video", "🎨 الخلفية": "🎨 Background", "اكتب شيئاً...": "Write something...", "سرعة الصوت": "Voice speed", "نص": "Text", "ملصق": "Sticker", "استطلاع": "Poll", "سؤال": "Question", "جدولة": "Schedule", "الموضع": "Position", "الجميع": "Everyone", "تعديل القائمة": "Edit list", "إلغاء": "Cancel", "الهايلايت": "Highlights", "اكتب إجابتك...": "Write your answer...", "تم إرسال إجابتك ✓": "Answer sent ✓", "اختر وقتاً في المستقبل": "Pick a time in the future", "تم التثبيت في الهايلايت ⭐": "Pinned to highlights ⭐", "تمت الإزالة من الهايلايت": "Removed from highlights", "تابع بعض الأشخاص أولاً": "Follow some people first", "اكتب نصاً فوق الصورة...": "Write text on the picture...", "سؤال الاستطلاع": "Poll question", "الخيار الأول": "Option 1", "الخيار الثاني": "Option 2", "اطرح سؤالاً على متابعيك": "Ask your followers a question", "Aa نص": "Aa Text", "😀 ملصق": "😀 Sticker", "📊 استطلاع": "📊 Poll", "❓ سؤال": "❓ Question", "🕒 جدولة": "🕒 Schedule", "🕒 مجدولة ✓": "🕒 Scheduled ✓", "👥 الجمهور": "👥 Everyone", "👥 مقربين ✓": "👥 Close friends ✓", "أصدقاء مقربين": "Close friends", "صوت": "votes", "↪️ تفاعل على قصتك": "↪️ Reacted to your story", "ارفع إصبعك للإلغاء": "Release to cancel", "‹ اسحب للإلغاء": "‹ Slide to cancel", "وصف الفيديو (اختياري)...": "Video description (optional)...", "وصلت للحد اليومي لـ «اسأل KIX». جرّب بكرة.": "You've hit the daily limit for “Ask KIX”. Try tomorrow.",
  "يتابعك": "Follows you", "يرجى اختيار صورة فقط": "Please choose a photo only", "يرجى تأكيد بريدك الإلكتروني أولاً": "Please confirm your email first",
  "↪️ منشور مني": "↪️ A post from me", "🎤 رسالة صوتية": "🎤 Voice message", "🎥 فيديو": "🎥 Video", "🎬 ريل": "🎬 Reel", "🏷️ ملصق": "🏷️ Sticker", "💡 اقترح رد": "💡 Suggest a reply", "📎 ملف": "📎 File", "📝 لخّص الشات": "📝 Summarize chat", "📷 صورة": "📷 Photo", "📷 وسائط": "📷 Media", "🔍 المطلوب مني؟": "🔍 What's expected of me?",
  "أضف تعليقاً...": "Add a comment...", "متابعة": "Follow", "متابَع": "Following", "الصوت": "Sound", "كتم الصوت": "Mute", "تشغيل الصوت": "Unmute", "إيقاف مؤقت": "Pause", "تشغيل": "Play",
});
const EN_RULES: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^منذ (\d+) د$/, m => `${m[1]}m ago`], [/^منذ (\d+) س$/, m => `${m[1]}h ago`], [/^منذ (\d+) ي$/, m => `${m[1]}d ago`], [/^منذ (\d+) يوم$/, m => `${m[1]}d ago`],
  [/^(\d+) عضو$/, m => `${m[1]} members`], [/^جارٍ النشر\.\.\. (\d+)%$/, m => `Publishing... ${m[1]}%`], [/^الصورة (\d+)$/, m => `Photo ${m[1]}`], [/^تحميل الكل \((\d+)\)$/, m => `Download all (${m[1]})`],
  [/^(.*) على KIX$/, m => `${m[1]} on KIX`], [/^عرض صورة (.+)$/, m => `View ${m[1]}'s photo`], [/^الرد على (.+)$/, m => `Reply to ${m[1]}`], [/^رد على (.+)\.\.\.$/, m => `Reply to ${m[1]}...`],
  [/^تم تجاهل (\d+) ملف.*$/, m => `${m[1]} file(s) skipped because they exceed the allowed size`],
];
const kanTr = (raw: string): string => {
  const k = raw.trim();
  if (!k || !/[\u0600-\u06FF]/.test(k)) return raw;
  let out = EN[k];
  if (out === undefined) for (const [re, f] of EN_RULES) { const m = re.exec(k); if (m) { out = f(m); break; } }
  return out === undefined ? raw : raw.replace(k, out);
};
// Modern in-app dialogs: replace the browser's alert()/confirm() (rendered by <KanDialogHost/>).
type KanDlg = { id: number; kind: 'alert' | 'confirm'; tone: 'error' | 'danger' | 'info'; message: string; resolve: (v: boolean) => void };
let kanDlgSeq = 0;
let kanDlgQueue: KanDlg[] = [];
const kanDlgSubs = new Set<() => void>();
const kanDlgEmit = () => kanDlgSubs.forEach(f => f());
const kanDlgPush = (kind: KanDlg['kind'], message: string, tone: KanDlg['tone']) =>
  new Promise<boolean>(resolve => { kanDlgQueue = [...kanDlgQueue, { id: ++kanDlgSeq, kind, tone, message: LANG === 'en' ? kanTr(message) : message, resolve }]; kanDlgEmit(); });
const kanConfirm = (message: string, danger = true) => kanDlgPush('confirm', message, danger ? 'danger' : 'info');
const kanAlert = (message: string) => kanDlgPush('alert', message, /تعذّر|تعذر|فشل|لا يمكن|خطأ|error|fail|couldn/i.test(message) ? 'error' : 'info');
if (typeof window !== 'undefined') window.alert = (m?: unknown) => { void kanAlert(String(m ?? '')); };
// English mode: anything still written in Arabic on screen (text, placeholders, titles, alerts) is translated as it appears.
if (LANG === 'en' && typeof window !== 'undefined') {
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  const fixNode = (n: Node) => {
    if (n.nodeType === 3) { const v = n.nodeValue ?? ''; const o = kanTr(v); if (o !== v) n.nodeValue = o; return; }
    if (n.nodeType !== 1) return;
    const el = n as Element;
    for (const a of ATTRS) { const v = el.getAttribute(a); if (v) { const o = kanTr(v); if (o !== v) el.setAttribute(a, o); } }
    el.childNodes.forEach(fixNode);
  };
  const start = () => {
    fixNode(document.body);
    new MutationObserver(list => {
      for (const r of list) {
        if (r.type === 'childList') r.addedNodes.forEach(fixNode);
        else if (r.type === 'characterData') fixNode(r.target);
        else fixNode(r.target);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  if (document.body) start(); else window.addEventListener('DOMContentLoaded', start);
}


// ============ Types ============
interface ChatBackground {
  type: 'color' | 'gradient' | 'image';
  value: string;
  key?: string;
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
  music?: { url: string; name: string; start?: number; end?: number; vv?: number; mv?: number };
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
  return 'kan'; // one fixed KIX ring: gradient while unseen, gray once seen
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
    extraMedia: (Array.isArray(row.media_extra) ? row.media_extra : []).filter(m => !(m.name ?? '').startsWith('kan-music|')).length > 0
      ? (row.media_extra as NonNullable<PostRow['media_extra']>).filter(m => !(m.name ?? '').startsWith('kan-music|'))
      : undefined,
    music: (() => {
      const m = (Array.isArray(row.media_extra) ? row.media_extra : []).find(x => (x.name ?? '').startsWith('kan-music|'));
      return m ? { url: m.url, name: (m.name ?? '').slice(10) || 'موسيقى', start: typeof (m as { start?: number }).start === 'number' ? (m as { start?: number }).start : undefined, end: typeof (m as { end?: number }).end === 'number' ? (m as { end?: number }).end : undefined, vv: typeof (m as { vv?: number }).vv === 'number' ? (m as { vv?: number }).vv : undefined, mv: typeof (m as { mv?: number }).mv === 'number' ? (m as { mv?: number }).mv : undefined } : undefined;
    })(),
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
  return signPostsMedia(((data ?? []) as unknown as PostRow[]).map(rowToPost));
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
  const big = unique.filter(isB2);
  const small = unique.filter(p => !isB2(p));
  if (big.length) {
    try {
      const { urls } = await b2Call<{ urls: Record<string, string> }>({ action: 'get', bucket: CHAT_MEDIA_BUCKET, paths: big, seconds: SIGNED_URL_SECONDS });
      for (const [p, u] of Object.entries(urls)) out.set(p, u);
    } catch (e) { console.error(e); }
  }
  if (small.length === 0) return out;
  const { data, error } = await supabase.storage.from(CHAT_MEDIA_BUCKET).createSignedUrls(small, SIGNED_URL_SECONDS);
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
    if (value) {
      const key = b.type === 'image' ? imagePath(b.value) : undefined;
      backgrounds.set(b.conversation_id, { type: b.type, value, key });
      if (key) void cachedBgUrl(key, value);
    }
  }
  const byConversation = new Map<string, Message[]>();
  for (const r of rows) {
    const arr = byConversation.get(r.conversation_id);
    if (arr) arr.push(rowToMessage(r, urls)); else byConversation.set(r.conversation_id, [rowToMessage(r, urls)]);
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
// System notification (like WhatsApp) when the app is in the background, plus the unread count on the app icon.
function askNotifyPermission() {
  // After the person allows notifications, attach this phone to push right away (before, it waited for the next reload, so closed-app notifications never arrived).
  try { if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission().then(p => { if (p === 'granted') void enablePush(); }); } catch { /* ignore */ }
}
function systemNotify(title: string, body: string, tag: string, onOpen: () => void, icon?: string) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !toastsEnabled()) return;
    const opts = { body, tag, renotify: true, silent: false, vibrate: [200, 100, 200], dir: 'rtl', lang: 'ar', badge: LOGO_URL, icon: icon && /^(https?:|data:)/.test(icon) ? icon : LOGO_URL } as NotificationOptions;
    // Phones (Android Chrome / installed app) only allow notifications through the service worker.
    const viaWorker = (): Promise<boolean> => {
      if (!('serviceWorker' in navigator)) return Promise.resolve(false);
      return navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL as string)
        .then(reg => (reg ? reg.showNotification(title, opts).then(() => true) : false))
        .catch(() => false);
    };
    void viaWorker().then(ok => {
      if (ok) return;
      const n = new Notification(title, opts);
      n.onclick = () => { window.focus(); onOpen(); n.close(); };
    }).catch(() => { /* blocked */ });
  } catch { /* notifications unavailable */ }
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

const PLAYER_SPEEDS = [1, 1.25, 1.5, 1.75, 2, 0.5, 0.75];

// KIX video player: big play button, double-tap to skip 10s, scrub bar with buffering, speed, volume, fullscreen.
function VideoPlayer({ src, poster, className = '', autoPlay = false, onEnded }: {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
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
  const [loop, setLoop] = useState(false);
  const kbRef = useRef<(e: KeyboardEvent) => void>(() => undefined);
  const resumeKey = `kan-pos:${src.split('?')[0].slice(-120)}`;
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

  // Keyboard shortcuts (while the pointer is over the player or it is full screen).
  useEffect(() => {
    const h = (e: KeyboardEvent) => kbRef.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  // Long videos remember where you stopped.
  useEffect(() => {
    const id = window.setInterval(() => {
      const v = videoRef.current;
      if (!v || !v.duration || v.duration < 120) return;
      try {
        if (!v.paused && v.currentTime > 5 && v.currentTime < v.duration - 5) localStorage.setItem(resumeKey, String(Math.floor(v.currentTime)));
        else if (v.currentTime >= v.duration - 5) localStorage.removeItem(resumeKey);
      } catch { /* storage unavailable */ }
    }, 3000);
    return () => window.clearInterval(id);
  }, [resumeKey]);

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

  const togglePip = async () => {
    const v = videoRef.current as (HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> }) | null;
    try { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await v?.requestPictureInPicture?.(); } catch { /* not supported */ }
  };
  kbRef.current = (e: KeyboardEvent) => {
    const wrap = wrapRef.current, v = videoRef.current;
    if (!wrap || !v) return;
    const tg = e.target as HTMLElement | null;
    if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!(wrap.matches(':hover') || document.fullscreenElement === wrap)) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'k') { e.preventDefault(); toggle(); }
    else if (k === 'arrowleft' || k === 'j') { e.preventDefault(); skip(k === 'j' ? -10 : -5); }
    else if (k === 'arrowright' || k === 'l') { e.preventDefault(); skip(k === 'l' ? 10 : 5); }
    else if (k === 'm') setMuted(m => !m);
    else if (k === 'f') toggleFullscreen();
    else if (k === 'p') void togglePip();
    else if (k === '>' || k === '<') { const i = PLAYER_SPEEDS.slice().sort((a, b) => a - b); const at = i.indexOf(speed); changeSpeed(i[Math.max(0, Math.min(i.length - 1, at + (k === '>' ? 1 : -1)))]); }
    else if (/^[0-9]$/.test(k) && v.duration) v.currentTime = (v.duration * Number(k)) / 10;
    else return;
    poke();
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
        loop={loop}
        preload="metadata"
        className="block w-full h-full max-h-[inherit] object-contain"
        onLoadedMetadata={e => { const v = e.currentTarget; setDur(v.duration || 0); try { const p = Number(localStorage.getItem(resumeKey)); if (!autoPlay && v.duration >= 120 && p > 5 && p < v.duration - 5) v.currentTime = p; } catch { /* storage unavailable */ } if (autoPlay) void v.play().catch(() => undefined); }}
        onDurationChange={e => setDur(e.currentTarget.duration || 0)}
        onTimeUpdate={e => { if (!scrubbing) setCur(e.currentTarget.currentTime); }}
        onProgress={e => { const b = e.currentTarget.buffered; if (b.length) setBuffered(b.end(b.length - 1)); }}
        onPlay={() => { setPlaying(true); setStarted(true); }}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); onEnded?.(); }}
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
              <button onClick={e => { e.stopPropagation(); setLoop(l => !l); }} className={`p-1.5 rounded-full hover:bg-white/10 ${loop ? 'text-cyan-300' : ''}`} aria-label="تكرار"><Repeat size={17} /></button>
              {typeof document !== 'undefined' && document.pictureInPictureEnabled && <button onClick={e => { e.stopPropagation(); void togglePip(); }} className="p-1.5 rounded-full hover:bg-white/10" aria-label="صورة داخل صورة"><PictureInPicture2 size={18} /></button>}
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
// Files above B2_MIN_MB go straight from the browser to Backblaze B2 (signed by the b2-sign edge function),
// in parallel 32 MB parts for big files. Their storage path starts with "b2/". Smaller files stay on Supabase Storage.
const B2_MIN_MB = 4;
const B2_PART_MB = 6;
const B2_PARALLEL = 16;

// Background publishing: uploads keep running while you move around; the progress shows inside the publish box.
type PubExtra = { type: 'image' | 'video' | 'file'; url: string; name: string; size: number; start?: number; end?: number; vv?: number; mv?: number };
type PubJob = { id: string; label: string; pct: number; size?: number; status: 'run' | 'done' | 'fail'; postId?: string; extra: PubExtra[]; music: PubExtra | null };
let pubList: PubJob[] = [];
const pubSubs = new Set<() => void>();
const pubSet = (fn: (l: PubJob[]) => PubJob[]) => { pubList = fn(pubList); pubSubs.forEach(f => f()); };
const pubSubscribe = (cb: () => void) => { pubSubs.add(cb); return () => { pubSubs.delete(cb); }; };
const pubSnapshot = () => pubList;
const trackJob = (id: string, pct: number, label = '') => pubSet(l => {
  const j = l.find(x => x.id === id);
  if (!j) return [...l, { id, label, pct, status: 'run', extra: [], music: null }];
  return j.pct === pct ? l : l.map(x => (x.id === id ? { ...x, pct } : x));
});
const endJob = (id: string, ok: boolean, patch: Partial<PubJob> = {}) =>
  pubSet(l => l.map(j => (j.id === id ? { ...j, ...patch, pct: ok ? 100 : j.pct, status: ok ? 'done' : 'fail' } : j)));
const dropJob = (id: string) => pubSet(l => l.filter(j => j.id !== id));
// Cancel an upload that is still running: stops the transfer and removes it from the list.
const jobCtl = new Map<string, AbortController>();
const cancelJob = (id: string) => { jobCtl.get(id)?.abort(); jobCtl.delete(id); dropJob(id); };
const pathOfUrl = (u: string): string | null => {
  const m = /post-media\/([^?#]+)/.exec(u);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return null; }
};

const musicPath = (path: string, size: number) => (size > 49 * 1024 * 1024 ? `b2/${path}` : path);
const kanPath = (path: string, size: number) => (size > B2_MIN_MB * 1024 * 1024 ? `b2/${path}` : path);
const isB2 = (p: string) => p.startsWith('b2/');

async function b2Call<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('b2-sign', { body });
  if (error) {
    let msg = error.message || 'b2-sign failed';
    try { const j = await (error as { context?: Response }).context?.json(); if (j && j.error) msg = String(j.error); } catch { /* keep message */ }
    throw new Error(msg);
  }
  if (data && (data as { error?: string }).error) throw new Error(String((data as { error: string }).error));
  return data as T;
}

function kanPublicUrl(bucket: string, path: string): string {
  if (isB2(path)) return `kanb2://${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`; // private bucket: stable marker, signed when shown
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function kanRemove(bucket: string, paths: string[]) {
  const big = paths.filter(isB2);
  const small = paths.filter(p => !isB2(p));
  if (big.length) void b2Call({ action: 'delete', bucket, paths: big }).catch(e => console.error(e));
  return small.length ? supabase.storage.from(bucket).remove(small) : Promise.resolve({ data: [], error: null });
}

// ---- Private B2 bucket: the database keeps a stable marker (kanb2://post-media/b2/...); screens get short-lived signed URLs. ----
const B2_URL_RE = /\/post-media\/(b2\/[^?#]+)/;
const b2PathOf = (u?: string | null): string | null => {
  const m = u ? B2_URL_RE.exec(u) : null;
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return null; }
};
// Back to the stable form (a signed URL must never be saved in the database).
const stableUrl = (u: string): string => { const p = b2PathOf(u); return p ? `kanb2://${POST_MEDIA_BUCKET}/${p.split('/').map(encodeURIComponent).join('/')}` : u; };
const b2UrlCache = new Map<string, { url: string; exp: number }>();
async function signMediaUrls(urls: (string | null | undefined)[]): Promise<Map<string, string>> {
  const byPath = new Map<string, string[]>();
  for (const u of urls) { const p = u ? b2PathOf(u) : null; if (u && p) byPath.set(p, [...(byPath.get(p) ?? []), u]); }
  const now = Date.now();
  const missing = [...byPath.keys()].filter(p => (b2UrlCache.get(p)?.exp ?? 0) <= now);
  for (let i = 0; i < missing.length; i += 100) {
    try {
      const { urls: signed } = await b2Call<{ urls: Record<string, string> }>({ action: 'get', bucket: POST_MEDIA_BUCKET, paths: missing.slice(i, i + 100), seconds: SIGNED_URL_SECONDS });
      for (const [p, u] of Object.entries(signed)) b2UrlCache.set(p, { url: u, exp: now + (SIGNED_URL_SECONDS - 3600) * 1000 });
  if (b2UrlCache.size > 400) for (const key of [...b2UrlCache.keys()].slice(0, b2UrlCache.size - 300)) b2UrlCache.delete(key);
    } catch (e) { console.error(e); }
  }
  const out = new Map<string, string>();
  for (const [p, list] of byPath) { const hit = b2UrlCache.get(p); if (hit) for (const u of list) out.set(u, hit.url); }
  return out;
}
async function signPostsMedia(posts: Post[]): Promise<Post[]> {
  const all: (string | undefined)[] = [];
  for (const p of posts) all.push(p.media?.url, p.coverUrl, p.music?.url, ...(p.extraMedia ?? []).map(x => x.url));
  if (!all.some(u => b2PathOf(u))) return posts;
  const m = await signMediaUrls(all);
  const sg = (u: string) => m.get(u) ?? u;
  return posts.map(p => ({
    ...p,
    media: p.media ? { ...p.media, url: sg(p.media.url) } : undefined,
    extraMedia: p.extraMedia ? p.extraMedia.map(x => ({ ...x, url: sg(x.url) })) : undefined,
    music: p.music ? { ...p.music, url: sg(p.music.url) } : undefined,
    coverUrl: p.coverUrl ? sg(p.coverUrl) : undefined,
  }));
}
async function signStories(list: StoryItem[]): Promise<StoryItem[]> {
  const m = await signMediaUrls(list.flatMap(s => [s.url, s.extra?.m?.url]));
  return list.map(s => ({ ...s, url: m.get(s.url) ?? s.url, extra: s.extra?.m ? { ...s.extra, m: { ...s.extra.m, url: m.get(s.extra.m.url) ?? s.extra.m.url } } : s.extra }));
}

function putBlob(url: string, blob: Blob, headers: Record<string, string>, onBytes: (n: number) => void, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    if (signal) { if (signal.aborted) { reject(new Error('upload aborted')); return; } signal.addEventListener('abort', () => xhr.abort(), { once: true }); }
    xhr.open('PUT', url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onBytes(e.loaded); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.getResponseHeader('ETag') ?? '') : reject(new Error(`b2 upload ${xhr.status}: ${xhr.responseText.slice(0, 120)}`)));
    xhr.onerror = () => reject(new Error('network error'));
    xhr.onabort = () => reject(new Error('upload aborted'));
    xhr.send(blob);
  });
}

async function uploadToB2(
  bucket: string, path: string, file: Blob, contentType: string, cacheControl: string,
  onProgress?: (pct: number) => void, signal?: AbortSignal,
): Promise<{ error: Error | null }> {
  const cc = `max-age=${cacheControl}`;
  const report = (loaded: number) => onProgress?.(Math.min(99, Math.round((loaded / Math.max(1, file.size)) * 100)));
  let uploadId = '';
  try {
    if (file.size <= 10 * 1024 * 1024) {
      const r = await b2Call<{ url: string }>({ action: 'put', bucket, path });
      await putBlob(r.url, file, { 'Content-Type': contentType, 'Cache-Control': cc }, report, signal);
    } else {
      const init = await b2Call<{ uploadId: string }>({ action: 'mp_init', bucket, path, contentType, cacheControl: cc });
      uploadId = init.uploadId;
      const partSize = B2_PART_MB * 1024 * 1024;
      const count = Math.ceil(file.size / partSize);
      const loaded = new Array<number>(count).fill(0);
      const etags: { n: number; etag: string }[] = [];
      let next = 0;
      let allUrls: string[] | null = null;
      try {
        const r = await b2Call<{ urls: string[] }>({ action: 'mp_parts', bucket, path, uploadId, parts: Array.from({ length: count }, (_, k) => k + 1) });
        if (Array.isArray(r.urls) && r.urls.length === count) allUrls = r.urls;
      } catch { /* fall back to one signature per part */ }
      const worker = async () => {
        while (next < count && !signal?.aborted) {
          const i = next++;
          const n = i + 1;
          const chunk = file.slice(i * partSize, Math.min(file.size, (i + 1) * partSize));
          let lastErr: unknown = null;
          for (let attempt = 0; attempt < 4 && !signal?.aborted; attempt++) {
            try {
              const partUrl = allUrls?.[i] ?? (await b2Call<{ urls: string[] }>({ action: 'mp_parts', bucket, path, uploadId, parts: [n] })).urls[0];
              loaded[i] = 0;
              const etag = await putBlob(partUrl, chunk, {}, b => { loaded[i] = b; report(loaded.reduce((x, y) => x + y, 0)); }, signal);
              loaded[i] = chunk.size;
              etags.push({ n, etag });
              lastErr = null;
              break;
            } catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 800 * (attempt + 1))); }
          }
          if (lastErr) throw lastErr;
        }
        if (signal?.aborted) throw new Error('upload aborted');
      };
      await Promise.all(Array.from({ length: Math.min(B2_PARALLEL, count) }, () => worker()));
      await b2Call({ action: 'mp_complete', bucket, path, uploadId, parts: etags });
    }
    onProgress?.(100);
    return { error: null };
  } catch (e) {
    if (uploadId) void b2Call({ action: 'mp_abort', bucket, path, uploadId }).catch(() => { /* ignore */ });
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

async function uploadWithProgress(
  bucket: string, path: string, file: Blob, contentType: string, cacheControl: string,
  onProgress?: (pct: number) => void, signal?: AbortSignal,
): Promise<{ error: Error | null }> {
  if (isB2(path)) return uploadToB2(bucket, path, file, contentType, cacheControl, onProgress, signal);
  if (file.size > 50 * 1024 * 1024) return { error: new Error('file too large for direct storage') };
  const { data: { session } } = await supabase.auth.getSession();
  const supaUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    if (signal) { if (signal.aborted) { resolve({ error: new Error('upload aborted') }); return; } signal.addEventListener('abort', () => xhr.abort(), { once: true }); }
    xhr.open('POST', `${supaUrl}/storage/v1/object/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`);
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

function UploadBar({ ups }: { ups: Record<string, number> }) {
  const vals = Object.values(ups);
  const pct = Math.round(vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length));
  return (
    <div className="mb-2 px-1" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="flex items-center justify-between text-[11px] text-gray-300 mb-1">
        <span>جارٍ الإرسال{vals.length > 1 ? ` (${vals.length})` : ''}</span>
        <span className="tabular-nums font-bold text-cyan-300">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width] duration-150" style={{ width: `${pct}%` }} />
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
  const ok = files.filter(f => f.size <= maxMbFor(f) * 1024 * 1024);
  if (ok.length < files.length) onError(`تم تجاهل ${files.length - ok.length} ملف لتجاوزه الحد المسموح (${MAX_FILE_MB} ميجابايت للملفات، والفيديو يُضغط تلقائياً)`);
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
// Tapping a reel on the home feed opens it inside the Reels tab.
// "Use this audio" on a reel: opens the publish box with that sound ready.
let pendingAudio: { url: string; name: string } | null = null;
let createFromAudio: () => void = () => undefined;
let openReelHandler: (postId: string) => void = () => undefined;
function openReel(postId: string) { stopPostMusic(); openReelHandler(postId); }
// Only one piece of post music plays at a time.
let playingAudio: HTMLAudioElement | null = null;
function stopPostMusic() { if (playingAudio) { playingAudio.pause(); playingAudio = null; } }
if (typeof document !== 'undefined') document.addEventListener('play', e => { if (e.target instanceof HTMLVideoElement) stopPostMusic(); }, true);
let openPostHandler: (postId: string, commentId?: string) => void = () => undefined;
function openPost(postId: string, commentId?: string) { stopPostMusic(); openPostHandler(postId, commentId); }

// Any screen can open a profile; the App draws it on top of the screen stack.
let openProfileHandler: (userId: string) => void = () => undefined;
function openUserProfile(userId: string) { stopPostMusic(); openProfileHandler(userId); }

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
    <div dir={DIR} className="fixed inset-0 z-[150] flex items-center justify-center p-4" onClick={e => { e.stopPropagation(); onClose(); }}>
      <div className="absolute inset-0 bg-black/60" />
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
let sentinelDepth = 0;
let backFallback: () => boolean = () => false;

function setBackFallback(fn: () => boolean) { backFallback = fn; }

// Several history entries are pushed at once (during a real tap, so the browser never skips them);
// every Back press consumes one, and the next tap tops them up again.
const SENTINELS = 4;
function armSentinel() {
  const cur = window.history.state?.kanSentinel ? Number(window.history.state.n) || 0 : 0;
  sentinelDepth = cur;
  while (sentinelDepth < SENTINELS) {
    sentinelDepth++;
    window.history.pushState({ kanSentinel: true, n: sentinelDepth }, '');
  }
}

function ensureBackListener() {
  if (backListening) return;
  backListening = true;
  const arm = () => armSentinel();
  (['pointerup', 'click', 'keydown'] as const).forEach(ev => window.addEventListener(ev, arm, { capture: true, passive: true }));
  if ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive) armSentinel();
  window.addEventListener('pageshow', () => { sentinelDepth = window.history.state?.kanSentinel ? Number(window.history.state.n) || 0 : 0; });
  window.addEventListener('popstate', () => {
    const n = window.history.state?.kanSentinel ? Number(window.history.state.n) || 0 : 0;
    const wasBack = n < sentinelDepth;
    sentinelDepth = n;
    if (!wasBack) return; // forward move: nothing was pressed
    if (/^#\/(post|u)\//i.test(window.location.hash)) return; // a shared link opening, not the Back button
    const top = backStack.pop();
    if (top) { top.close(); return; }
    if (backFallback()) return;
    // Nothing left to close and Home is already at the top: only now may Back leave the app.
    window.history.go(-(n + 1));
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

// ============ KIX AI ============
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
    case 'daily_limit': return 'وصلت للحد اليومي لـ «اسأل KIX». جرّب بكرة.';
    case 'unauthorized': return 'سجّل الدخول من جديد وحاول تاني.';
    default: return 'اسأل KIX غير متاح الآن، حاول بعد شوية.';
  }
}

function KanAIModal({ messages, me, other, nameOf, chatKey, onClose, onUseReply }: {
  messages: Message[];
  me: User;
  other: User;
  nameOf?: (id: string) => string;
  chatKey: string;
  onClose: () => void;
  onUseReply: (text: string) => void;
}) {
  useBackLayer(true, onClose);
  type Turn = { role: 'user' | 'ai'; text: string; imgs?: number; sources?: AISource[] };
  // Each chat has its own KIX thread. It lives on this device until the person clears it.
  const storeKey = `kan_ai_${me.id}_${chatKey}`;
  const [turns, setTurns] = useState<Turn[]>(() => { try { const r = JSON.parse(localStorage.getItem(storeKey) ?? '[]'); return Array.isArray(r) ? (r as Turn[]) : []; } catch { return []; } });
  const [query, setQuery] = useState('');
  const [imgs, setImgs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // Follow the on-screen keyboard so the quick actions and the input stay right above it.
  const [vv, setVv] = useState<{ h: number; top: number } | null>(null);
  useEffect(() => {
    const v = window.visualViewport;
    if (!v) return;
    const f = () => setVv({ h: v.height, top: v.offsetTop });
    f();
    v.addEventListener('resize', f); v.addEventListener('scroll', f);
    return () => { v.removeEventListener('resize', f); v.removeEventListener('scroll', f); };
  }, []);

  useEffect(() => { try { localStorage.setItem(storeKey, JSON.stringify(turns.slice(-100))); } catch { /* ignore */ } }, [turns, storeKey]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [turns, loading]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const addImages = async (files: FileList | null) => {
    if (!files) return;
    const out: string[] = [];
    for (const f of Array.from(files).slice(0, Math.max(0, 4 - imgs.length))) {
      if (!f.type.startsWith('image/')) continue;
      const d = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error('read')); r.readAsDataURL(f); });
      try { out.push(await shrinkImage(d, 1024)); } catch { out.push(d); }
    }
    setImgs(p => [...p, ...out].slice(0, 4));
  };

  const ask = async (text: string, mode?: AIMode) => {
    const q = text.trim();
    if ((!q && imgs.length === 0) || loading) return;
    const sendImgs = imgs;
    const hist: { q: string; a: string }[] = [];
    for (let i = 0; i < turns.length - 1; i++) if (turns[i].role === 'user' && turns[i + 1].role === 'ai') hist.push({ q: turns[i].text, a: turns[i + 1].text });
    setTurns(t => [...t, { role: 'user', text: q || '📷', imgs: sendImgs.length || undefined }]);
    setQuery(''); setImgs([]); setLoading(true); setError('');
    // The last 30 messages, oldest first. The server decides whether the question is about the chat.
    const context = messages.slice(-30)
      .map(m => ({ sender: nameOf ? nameOf(m.senderId) : m.senderId === me.id ? me.displayName : other.displayName, text: describeMessage(m) }))
      .filter(m => m.text);
    const now = new Date();
    try {
      const { data, error: fnError } = await supabase.functions.invoke('kan-ai', {
        body: {
          query: q || 'حلّل الصورة وقولّي إيه فيها',
          mode,
          context,
          history: hist.slice(-8),
          images: sendImgs,
          me: me.displayName,
          other: other.displayName,
          now: now.toISOString(),
          today: now.toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Cairo' }),
          timezone: 'Africa/Cairo',
          platform: 'KIX',
          creator: 'Khaled Sharaf',
          instructions: 'Speak naturally and freely in the user language, as long or as short as the question deserves, in your own style. When images are attached, inspect them carefully (objects, visible text, people, colors, place, numbers) and answer exactly what was asked. You are KIX, the assistant of the KIX platform, created by Khaled Sharaf. Be exact with numbers, dates and facts. Use live web search for anything that can change (news, prices, scores, dates) and never guess; say so if you are not sure. If images are attached, look at them carefully and do what the user asks. Answer in the language of the question.',
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
        const sources = Array.isArray(d?.sources) ? d!.sources!.filter(x => /^https?:\/\//.test(x.url)).slice(0, 4) : undefined;
        setTurns(t => [...t, { role: 'ai', text: answer, sources }]);
      }
    } catch {
      setError(aiErrorMessage(''));
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div dir={DIR} className="fixed inset-x-0 top-0 bottom-0 z-[120] flex items-end sm:items-center justify-center sm:p-4" style={vv ? { top: vv.top, bottom: 'auto', height: vv.h } : undefined}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl h-[92%] sm:h-[88%] flex flex-col bg-gray-900 border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-violet-500/10 overflow-hidden">
        <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-br from-violet-700 via-fuchsia-600 to-cyan-500 shrink-0 overflow-hidden">
          <div className="absolute -top-10 -end-10 w-32 h-32 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <span className="relative w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xl ring-1 ring-white/40 flex items-center justify-center shadow-lg"><Sparkles size={22} className="text-white" /><span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-violet-700 animate-pulse" /></span>
            <div className="leading-tight"><h2 className="font-extrabold text-white text-base">KIX AI</h2><p className="text-[11px] text-white/80">مساعد ذكي</p></div>
          </div>
          <div className="relative flex items-center gap-1.5">
            {turns.length > 0 && <button onClick={async () => { if (await kanConfirm('مسح محادثة KIX الخاصة بالشات ده؟')) { setTurns([]); setError(''); } }} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 backdrop-blur ring-1 ring-white/25 text-white active:scale-90 transition-transform" aria-label="مسح المحادثة"><Trash2 size={17} /></button>}
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 backdrop-blur ring-1 ring-white/25 text-white active:scale-90 transition-transform" aria-label="إغلاق"><X size={19} /></button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {turns.length === 0 && !loading && (
            <div className="pt-8 pb-2 px-1">
              <style>{`@keyframes kixflow{0%{background-position:0% 50%}100%{background-position:300% 50%}}@keyframes kixrise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>
              <div className="flex items-center gap-2 mb-3" style={{ animation: 'kixrise .5s ease both' }}>
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-900/40"><Sparkles size={18} color="#fff" /></span>
                <span className="text-sm font-bold tracking-wide text-gray-300">KIX AI</span>
              </div>
              <h3 className="text-4xl sm:text-5xl font-extrabold leading-tight" style={{ animation: 'kixrise .6s .08s ease both' }}>
                <span style={{ backgroundImage: 'linear-gradient(90deg,#8b5cf6,#d946ef,#22d3ee,#8b5cf6)', backgroundSize: '300% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', animation: 'kixflow 6s linear infinite' }}>أهلاً يا {me.displayName}</span>
              </h3>
              <p className="text-3xl sm:text-4xl font-bold text-gray-500 mt-1" style={{ animation: 'kixrise .6s .16s ease both' }}>أقدر أساعدك في إيه النهاردة؟</p>
              <div className="grid grid-cols-2 gap-2.5 mt-8">
                {([[Search, 'أخبار النهاردة'], [FileText, 'اكتبلي رسالة رسمية'], [ImageIcon, 'حلّل لي صورة'], [MessageCircle, 'لخّص الشات']] as const).map(([Ic, x], i) => (
                  <button key={x} onClick={() => (i === 2 ? fileRef.current?.click() : void ask(i === 3 ? 'لخّص المحادثة باختصار' : x, i === 3 ? 'summary' : undefined))} className="text-start p-3.5 min-h-[88px] rounded-2xl bg-white/[0.06] hover:bg-white/10 ring-1 ring-white/10 flex flex-col justify-between active:scale-95 transition" style={{ animation: `kixrise .6s ${0.24 + i * 0.07}s ease both` }}>
                    <span className="text-sm text-gray-100 font-semibold" dir="auto">{x}</span>
                    <Ic size={20} color="#fff" className="self-end opacity-90" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {turns.map((t, i) => t.role === 'user' ? (
            <div key={i} className="ms-auto max-w-[85%] rounded-3xl rounded-se-md px-4 py-2.5 bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-lg shadow-violet-900/30 text-white text-sm whitespace-pre-wrap" dir="auto">
              {t.imgs ? <div className="text-xs opacity-80 mb-1">📷 {t.imgs} صورة</div> : null}{t.text}
            </div>
          ) : (
            <div key={i} className="me-auto max-w-[92%] rounded-3xl rounded-ss-md bg-white/[0.06] backdrop-blur border border-white/10 p-4 shadow-lg shadow-black/20">
              <p className="text-gray-100 whitespace-pre-wrap leading-7 text-[15px]" dir="auto">{t.text}</p>
              {t.sources && t.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-1.5">
                  {t.sources.map(src => (
                    <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer" className="max-w-full truncate px-2.5 py-1 rounded-full bg-cyan-500/10 ring-1 ring-cyan-400/30 hover:bg-cyan-500/20 text-[11px] text-cyan-300">🌐 {src.title}</a>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                <button onClick={() => void navigator.clipboard?.writeText(t.text)} className="px-3 py-1.5 rounded-full bg-gray-700 hover:bg-gray-600 text-xs text-gray-100 flex items-center gap-1.5"><Copy size={13} /> نسخ</button>
                <button onClick={() => onUseReply(t.text)} className="px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-xs text-white flex items-center gap-1.5"><Send size={13} /> استخدمه كرسالة</button>
              </div>
            </div>
          ))}
          {loading && <div className="me-auto rounded-2xl bg-gray-800/80 border border-white/10 px-4 py-3 flex items-center gap-2 text-gray-400 text-sm"><span className="flex gap-1">{[0, 1, 2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-gradient-to-br from-violet-400 to-cyan-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</span>بيفكّر...</div>}
          {error && <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}
          <div ref={endRef} />
        </div>

        <div className="p-3 border-t border-white/10 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gray-900">
          <div className="grid grid-cols-3 gap-2 mb-2.5">
            {AI_QUICK.map(a => {
              const [ic, ...rest] = a.label.split(' ');
              return (
                <button key={a.label} onClick={() => void ask(a.query, a.mode)} disabled={loading} className="min-w-0 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-2xl bg-gradient-to-br from-violet-600/25 to-cyan-500/15 border border-violet-400/30 text-gray-100 text-[13px] font-semibold active:scale-95 disabled:opacity-50 shadow-sm shadow-violet-900/20">
                  <span className="text-base leading-none shrink-0">{ic}</span><span className="truncate">{rest.join(' ')}</span>
                </button>
              );
            })}
          </div>
          {imgs.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto">
              {imgs.map((u, i) => (
                <div key={i} className="relative shrink-0">
                  <img src={u} alt="" className="w-16 h-16 rounded-xl object-cover" />
                  <button onClick={() => setImgs(p => p.filter((_, k) => k !== i))} className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center" aria-label="إزالة"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 bg-white/[0.07] backdrop-blur rounded-full ps-2 pe-3 py-2 ring-1 ring-white/15 focus-within:ring-violet-400/70 transition-shadow">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { void addImages(e.target.files); e.target.value = ''; }} />
            <button onClick={() => fileRef.current?.click()} disabled={imgs.length >= 4} className="p-2 rounded-full text-gray-300 hover:bg-white/10 disabled:opacity-40 shrink-0" aria-label="إرفاق صورة"><ImageIcon size={18} /></button>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void ask(query)}
              placeholder="اسأل KIX أي سؤال أو ابعتله صور..."
              className="flex-1 bg-transparent outline-none text-white placeholder-gray-500 min-w-0"
              autoFocus
            />
            <button onClick={() => void ask(query)} disabled={loading || (!query.trim() && imgs.length === 0)} className="p-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white shrink-0 disabled:opacity-50" aria-label="إرسال"><Send size={14} /></button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============ Emoji ============
const MAX_FILE_MB = 5120; // any file (big ones go to Backblaze B2)
const MAX_VIDEO_MB = 5120; // videos upload as-is, no compression
const maxMbFor = (f: File) => (f.type.startsWith('video/') ? MAX_VIDEO_MB : MAX_FILE_MB);
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
  return [`${author.displayName} (@${author.username}) على KIX`, post.title, post.text].filter(Boolean).join('\n').trim();
}

function ShareSheet({ post, author, users, currentUser, comment, onClose }: {
  post: Post; author: User; users: User[]; currentUser: User; comment?: { id: string; text: string; authorName: string }; onClose: () => void;
}) {
  useBackLayer(true, onClose);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [storyAsk, setStoryAsk] = useState(false);
  const [storyCaption, setStoryCaption] = useState('');
  const filePromise = useRef<Promise<File | null> | null>(null);
  const getFile = () => {
    if (!filePromise.current) filePromise.current = postToFile(post);
    return filePromise.current;
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const link = postLink(post.id, comment?.id);
  const text = (comment ? `${comment.authorName}: ${comment.text}\n— ${author.displayName} (@${author.username}) على KIX` : postShareText(post, author)) + `\n${link}`;
  const recent = recentChatActivity();
  const people = users
    .filter(u => u.id !== currentUser.id && (u.displayName + ' ' + u.username).toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (recent.get(b.id) ?? 0) - (recent.get(a.id) ?? 0) || Number(currentUser.following.includes(b.id)) - Number(currentUser.following.includes(a.id)))
    .slice(0, 40);

  const flash = (msg: string) => { setNote(msg); window.setTimeout(() => setNote(''), 1800); };
  const nativeShare = async () => {
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: `${author.displayName} على KIX`, text: text.replace(`\n${link}`, '').slice(0, 300), url: link });
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
        media_url: hasVisual ? stableUrl(url) : '',
        media_type: hasVisual ? type : 'image',
        caption: (storyCaption.trim() || captionSource || `${author.displayName} (@${author.username})`).slice(0, 300),
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
    { key: 'story', label: 'قصتك', Icon: Plus, cls: 'from-violet-600 via-fuchsia-500 to-cyan-400', run: () => setStoryAsk(true) },
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
      const f = null as File | null; // the shared post is a link: nothing is downloaded or re-uploaded
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
      if (path) void kanRemove(CHAT_MEDIA_BUCKET, [path]);
      setNote('تعذّر الإرسال، حاول مرة أخرى');
    }
    setBusy(null);
  };

  return createPortal(
    <div dir={DIR} className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center" onClick={e => { e.stopPropagation(); onClose(); }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60" />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'tween', duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        style={{ willChange: 'transform' }} className="relative w-full sm:max-w-md max-h-[85dvh] flex flex-col bg-gray-900 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-violet-900/30 overflow-hidden"
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
        {storyAsk && (
          <div className="absolute inset-0 z-20 bg-gray-900 flex flex-col p-4 gap-3">
            <h3 className="font-bold kan-gradient-text">نشر في قصتك؟</h3>
            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/10">
              {(post.media?.type === 'image' || post.coverUrl) && <img src={post.media?.type === 'image' ? post.media.url : post.coverUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />}
              <div className="min-w-0 flex-1 text-xs text-gray-300 line-clamp-3" dir="auto">{comment ? comment.text : post.title || post.text || author.displayName}</div>
            </div>
            <input value={storyCaption} onChange={e => setStoryCaption(e.target.value.slice(0, 300))} placeholder="اكتب شيئاً على القصة (اختياري)" className="w-full px-4 py-2.5 bg-gray-800 rounded-xl text-[16px] text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-400/50" />
            <div className="flex gap-2 mt-auto pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <button onClick={() => void shareToStory()} disabled={busy === 'story'} className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                {busy === 'story' ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />} نشر في القصة
              </button>
              <button onClick={() => setStoryAsk(false)} disabled={busy === 'story'} className="px-5 py-2.5 rounded-full bg-white/5 text-gray-300 text-sm">رجوع</button>
            </div>
          </div>
        )}
        {note && <div className="absolute z-30 bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-gray-800 border border-white/10 text-xs text-white shadow-lg">{note}</div>}
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
    <div dir={DIR} className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center" onClick={onClose}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60" />
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
  const [error, setError] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [media, setMedia] = useState<{ type: 'image' | 'video' | 'file'; url: string; file: File } | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [ups, setUps] = useState<Record<string, number>>({});
  const trackUp = (key: string, pct: number | null) => setUps(u => { const n = { ...u }; if (pct === null) delete n[key]; else n[key] = pct; return n; });
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

  const { fab, onScroll, onUserScroll, jumpDown } = useChatStick(scrollRef, group.messages, currentUser.id, group.id);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { first, rest } = takeFiles(e, !!media, setError);
    if (first) {
      const kind = detectMediaKind(first);
      setMedia({ type: kind, url: kind === 'file' ? '' : URL.createObjectURL(first), file: first });
    }
    if (rest.length) setQueue(q => [...q, ...rest]);
  };

  // Instant sending: shown at once, saved in the background (removed again only if it fails).
  const send = async (opts: { text?: string; file?: Blob; mediaType?: 'image' | 'video' | 'voice' | 'file'; fileName?: string; duration?: number; replyToId?: string }): Promise<boolean> => {
    const body = (opts.text ?? '').trim();
    if (!body && !opts.file) return false;
    setError('');
    const id = crypto.randomUUID();
    const replyId = opts.replyToId ?? replyingTo?.id;
    let path: string | null = null;
    let mime = '';
    if (opts.file) {
      mime = (opts.file.type || '').split(';')[0];
      const ext = CHAT_EXT[mime] ?? (opts.fileName ? safeExt(opts.fileName) : opts.mediaType === 'voice' ? 'webm' : 'bin');
      path = opts.file ? kanPath(`${group.id}/${crypto.randomUUID()}.${ext}`, opts.file.size) : `${group.id}/${crypto.randomUUID()}.${ext}`;
    }
    const at = Date.now();
    const msg: GroupMessage = {
      id, senderId: currentUser.id, text: body, timestamp: at, isSystem: false, readBy: [currentUser.id], reactions: [],
      replyToId: replyId,
      media: opts.file && opts.mediaType ? { type: opts.mediaType, url: URL.createObjectURL(opts.file), duration: opts.duration, name: opts.fileName, size: opts.file.size, path: path ?? undefined } : undefined,
    };
    setGroups(prev => prev.map(g => g.id !== group.id ? g : { ...g, lastActivity: at, messages: g.messages.some(m => m.id === id) ? g.messages : [...g.messages, msg] }));
    playSound('send');
    void (async () => {
      try {
        if (opts.file && path) {
          const upFile = opts.mediaType === 'image' && opts.file instanceof File && !isStickerName(opts.fileName) ? await shrinkPhoto(opts.file) : opts.file;
          const { error: upErr } = await uploadWithProgress(CHAT_MEDIA_BUCKET, path, upFile, upFile.type || mime || 'application/octet-stream', '3600', pct => { if (opts.mediaType !== 'voice' && !isStickerName(opts.fileName)) trackUp(id, pct); });
          trackUp(id, null);
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
          reply_to_id: replyId ?? null,
        });
        if (insErr) throw insErr;
      } catch (e) {
        console.error(e);
        trackUp(id, null);
        if (path) void kanRemove(CHAT_MEDIA_BUCKET, [path]);
        patchMsgs(list => list.filter(m => m.id !== id));
        setError('تعذّر إرسال الرسالة، حاول مرة أخرى');
      }
    })();
    return true;
  };

  const sendMessage = async () => {
    if (!text.trim() && !media && queue.length === 0) return;
    const rest = queue;
    const t = text, m = media, reply = replyingTo;
    setText(''); setMedia(null); setReplyingTo(null); setQueue([]);
    inputRef.current?.focus();
    if (t.trim() || m) await send({ text: t, file: m?.file, mediaType: m?.type, fileName: m?.file.name, replyToId: reply?.id });
    for (const f of rest) void send({ file: f, mediaType: detectMediaKind(f), fileName: f.name });
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
    if (m.media?.path) void kanRemove(CHAT_MEDIA_BUCKET, [m.media.path]);
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
        <div ref={scrollRef} onScroll={onScroll} onWheel={onUserScroll} onTouchMove={onUserScroll} className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2" onClick={() => { setActiveMsgId(null); setReactingTo(null); }}>
          {group.messages.length === 0 && <p className="text-center text-gray-500 text-sm py-12">ابدأ المحادثة في المجموعة 👋</p>}
          {group.messages.map((m, i) => {
            if (parseVote(m.text)) return null;
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
                <div className={`min-w-0 max-w-[85%] sm:max-w-[75%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  {showName && sender && <button onClick={e => { e.stopPropagation(); openUserProfile(sender.id); }} className={`text-[11px] font-semibold mb-0.5 px-1 text-right ${nameColors[sender.displayName.charCodeAt(0) % nameColors.length]}`}>{sender.displayName}</button>}
                  <div
                    {...messageGestures(
                      () => { setReplyingTo(m); window.setTimeout(() => inputRef.current?.focus(), 30); },
                      () => { setActiveMsgId(m.id); setReactingTo(m.id); },
                    )}
                    onClick={e => { e.stopPropagation(); setActiveMsgId(active ? null : m.id); setReactingTo(null); }}
                    className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words cursor-pointer select-none touch-pan-y transition-shadow ${highlightId === m.id ? 'ring-2 ring-cyan-400' : ''} ${isStickerName(m.media?.name) && !m.text ? 'bg-transparent !p-0' : mine ? 'bg-gradient-to-br from-violet-600 to-cyan-600 text-white rounded-bl-md' : 'bg-gray-800 text-white rounded-br-md'}`}
                  >
                    {m.replyToId && (
                      <button
                        onClick={e => { e.stopPropagation(); if (replied) jumpTo(replied.id); }}
                        className={`block w-0 min-w-full overflow-hidden text-right mb-2 px-2.5 py-1.5 rounded-lg border-r-2 text-xs ${mine ? 'bg-white/15 border-white/60' : 'bg-black/25 border-cyan-400'}`}
                      >
                        <div className="font-medium opacity-90">{replied ? nameOf(replied.senderId) : 'رسالة'}</div>
                        <div className="opacity-80 truncate">{replied ? groupMsgPreview(replied) : 'رسالة غير متاحة'}</div>
                      </button>
                    )}
                    {isStickerName(m.media?.name) && m.media && (
                      m.media.type === 'video'
                        ? <video src={m.media.url} autoPlay loop muted playsInline className="w-36 h-36 object-contain pointer-events-none" />
                        : <img src={m.media.url} alt="" draggable={false} className="w-36 h-36 object-contain pointer-events-none" />
                    )}
                    {!isStickerName(m.media?.name) && m.media?.type === 'image' && (
                      <div className="mb-2 relative">
                        <img src={m.media.url} alt="" onClick={e => { e.stopPropagation(); setViewer({ src: m.media!.url, name: m.media!.name }); }} className="rounded-xl max-w-full max-h-56 object-cover cursor-zoom-in" />
                      </div>
                    )}
                    {!isStickerName(m.media?.name) && m.media?.type === 'video' && (
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
                    {m.text && (parsePoll(m.text) ? <ChatPoll id={m.id} text={m.text} all={group.messages} meId={currentUser.id} onVote={i => void send({ text: VOTE_TAG + JSON.stringify({ p: m.id, i }) })} /> : <p className="whitespace-pre-wrap" dir="auto"><Linkified text={m.text} /></p>)}
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
                      {isStickerName(m.media?.name) && m.media && <SaveStickerBtn url={m.media.url} onDone={() => setActiveMsgId(null)} />}
                      {m.media && m.media.type !== 'voice' && !isStickerName(m.media.name) && (
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
          <ScrollDownFab fab={fab} onClick={jumpDown} />
        </div>

        {(
          <div className={`px-2 min-[400px]:px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-gray-900/95 backdrop-blur-md border-t border-gray-800 relative z-10 ${recording ? 'hidden' : ''}`}>
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
              {pollOpen && <PollComposer onClose={() => setPollOpen(false)} onSend={(q, o) => { setPollOpen(false); void send({ text: POLL_TAG + JSON.stringify({ q, o }) }); }} />}
              {toolsOpen && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.94 }} transition={{ type: 'spring', damping: 22, stiffness: 420 }} className="absolute bottom-full right-2 mb-2 z-20 flex items-center gap-2 p-2 rounded-2xl bg-gray-900/95 backdrop-blur border border-white/10 shadow-xl origin-bottom-right">
                  <button onClick={() => { setPollOpen(true); setToolsOpen(false); }} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-800 text-gray-200 text-xs active:scale-95">📊 استطلاع</button>
                  <button onClick={() => { fileRef.current?.click(); setToolsOpen(false); }} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-800 text-gray-200 text-xs hover:text-cyan-300 active:scale-95"><Paperclip size={16} /> صورة / فيديو / ملف</button>
                  <button
                    onPointerDown={e => e.preventDefault()}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { setAiOpen(true); setToolsOpen(false); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-r from-violet-600/30 to-cyan-500/20 border border-violet-400/30 text-white text-xs active:scale-95"
                    aria-label="اسأل KIX"
                  >
                    <Sparkles size={16} className="text-violet-300" /> اسأل KIX
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            {queue.length > 0 && <QueueChip count={queue.length} onClear={() => setQueue([])} />}
            {Object.keys(ups).length > 0 && <UploadBar ups={ups} />}
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
                <motion.button whileTap={{ scale: 0.9 }} onPointerDown={e => e.preventDefault()} onMouseDown={e => e.preventDefault()} onClick={() => void sendMessage()} aria-label="إرسال" className="shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full shadow-lg shadow-violet-500/30 disabled:opacity-60">
                  <Send size={18} className="text-white" />
                </motion.button>
              ) : (
                <motion.button whileTap={{ scale: 0.9 }} onPointerDown={e => { micHold.x = e.clientX; micHold.y = e.clientY; micHold.t = Date.now(); micHold.held = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } setRecording(true); }} onContextMenu={e => e.preventDefault()} style={{ touchAction: 'none' }} aria-label="تسجيل صوتي" className="shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full shadow-lg shadow-violet-500/30">
                  <Mic size={18} className="text-white" />
                </motion.button>
              )}
            </div>
          {emojiOpen && <EmojiPicker docked onPick={em => setText(t => t + em)} onClose={() => setEmojiOpen(false)} onSticker={st => { void send({ file: st.blob, mediaType: st.kind, fileName: `kan-sticker.${stkExt(st.blob, st.kind)}` }); }} />}
          </div>
        )}
        {recording && (
          <div className="px-3 py-2 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 relative z-10">
            <VoiceRecorder onSend={sendVoice} onCancel={() => setRecording(false)} />
          </div>
        )}
        {viewer && <ImageViewer src={viewer.src} name={viewer.name} gallery={group.messages.flatMap(x => x.media && !isStickerName(x.media.name) && (x.media.type === 'image' || x.media.type === 'video') ? [{ src: x.media.url, name: x.media.name, type: x.media.type as 'image' | 'video' }] : [])} onClose={() => setViewer(null)} />}
        {aiOpen && (
          <KanAIModal
            messages={group.messages.filter(m => !m.isSystem).map(m => ({
              id: m.id, senderId: m.senderId, text: m.text, timestamp: m.timestamp, read: true,
              media: m.media ? { type: m.media.type, url: m.media.url, name: m.media.name, duration: m.media.duration, size: m.media.size } : undefined,
            })) as unknown as Message[]}
            me={currentUser}
            other={{ ...currentUser, id: group.id, displayName: group.name, avatar: group.avatar }}
            nameOf={id => person(id)?.displayName ?? 'مستخدم'}
            chatKey={`g_${group.id}`}
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

// ============ "مفكرتي": tasks with a time + repeating reminders ============
type PlanTask = { id: string; title: string; note?: string; due?: number; repeat: number; color: string; done: boolean; doneAt?: number; lastFired?: number; snoozeUntil?: number };
const PLAN_COLORS = ['#8b5cf6', '#06b6d4', '#f472b6', '#f59e0b', '#22c55e'];
let planUid = '';
let planTasks: PlanTask[] = [];
const planSubs = new Set<() => void>();
const planEmit = () => planSubs.forEach(f => f());
const planSubscribe = (cb: () => void) => { planSubs.add(cb); return () => { planSubs.delete(cb); }; };
const planSnapshot = () => planTasks;
function planLoad(uid: string) {
  if (planUid === uid) return;
  planUid = uid;
  try { const v = JSON.parse(localStorage.getItem(`kan-planner:${uid}`) || '[]') as unknown; planTasks = Array.isArray(v) ? (v as PlanTask[]).filter(t => t && typeof t.id === 'string' && typeof t.title === 'string') : []; } catch { planTasks = []; }
  planEmit();
}
function planSet(fn: (l: PlanTask[]) => PlanTask[]) {
  planTasks = fn(planTasks);
  try { localStorage.setItem(`kan-planner:${planUid}`, JSON.stringify(planTasks)); } catch { /* storage blocked: keep in memory */ }
  planEmit();
}
const planOverdue = (t: PlanTask, now = Date.now()) => !t.done && !!t.due && t.due <= now;
const fmtDue = (ts: number) => {
  const d = new Date(ts), n = new Date();
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(n)) / 86400000);
  const time = d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' });
  if (diff === 0) return `اليوم ${time}`;
  if (diff === 1) return `بكرة ${time}`;
  if (diff === -1) return `إمبارح ${time}`;
  return `${d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })} ${time}`;
};

// Mounted once in the app: rings (banner + sound + device notification) for tasks that are due, and keeps ringing every few minutes while you are still browsing.
function PlannerReminders({ userId }: { userId: string }) {
  const tasks = useSyncExternalStore(planSubscribe, planSnapshot);
  const [ring, setRing] = useState<string[]>([]);
  useEffect(() => { planLoad(userId); }, [userId]);
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const fire = planTasks.filter(t => planOverdue(t, now) && (t.snoozeUntil ?? 0) <= now && (!t.lastFired || (t.repeat > 0 && now - t.lastFired >= t.repeat * 60000)));
      if (fire.length === 0) return;
      planSet(l => l.map(t => (fire.some(f => f.id === t.id) ? { ...t, lastFired: now } : t)));
      setRing(r => Array.from(new Set([...r, ...fire.map(f => f.id)])));
      playSound('receive');
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
        for (const t of fire) {
          const opts = { body: t.note || 'حان وقت المهمة', tag: `plan-${t.id}`, icon: LOGO_URL, renotify: true, dir: 'rtl', lang: 'ar' } as NotificationOptions;
          void getServiceWorker().then(reg => (reg ? reg.showNotification(`⏰ ${t.title}`, opts) : new Notification(`⏰ ${t.title}`, opts))).catch(() => undefined);
        }
      }
    };
    tick();
    const h = window.setInterval(tick, 15000);
    const vis = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', vis);
    return () => { window.clearInterval(h); document.removeEventListener('visibilitychange', vis); };
  }, [userId]);
  const live = ring.map(id => tasks.find(t => t.id === id)).filter((t): t is PlanTask => !!t && !t.done);
  if (live.length === 0) return null;
  return (
    <div className="fixed top-14 inset-x-0 z-[55] px-3 pt-2 space-y-2 pointer-events-none" dir="rtl">
      {live.slice(0, 3).map(t => (
        <div key={t.id} className="pointer-events-auto mx-auto max-w-md rounded-2xl bg-gradient-to-br from-violet-700/95 to-fuchsia-700/90 backdrop-blur border border-white/20 shadow-2xl px-3.5 py-3 text-white" style={{ boxShadow: `0 10px 40px -10px ${t.color}` }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl animate-bounce">⏰</span>
            <div className="min-w-0 flex-1"><div className="font-bold text-sm truncate" dir="auto">{t.title}</div><div className="text-[11px] opacity-80">{t.note || 'حان وقت المهمة'}{t.repeat ? ` · هفكّرك كل ${t.repeat} د` : ''}</div></div>
            <button onClick={() => setRing(r => r.filter(x => x !== t.id))} aria-label="إغلاق" className="p-1 opacity-70"><X size={16} /></button>
          </div>
          <div className="mt-2.5 flex gap-2">
            <button onClick={() => { planSet(l => l.map(x => (x.id === t.id ? { ...x, done: true, doneAt: Date.now() } : x))); setRing(r => r.filter(x => x !== t.id)); }} className="flex-1 py-1.5 rounded-full bg-white text-violet-700 text-xs font-bold active:scale-95">تمت ✓</button>
            <button onClick={() => { planSet(l => l.map(x => (x.id === t.id ? { ...x, snoozeUntil: Date.now() + 10 * 60000, lastFired: undefined } : x))); setRing(r => r.filter(x => x !== t.id)); }} className="flex-1 py-1.5 rounded-full bg-white/20 text-white text-xs font-bold active:scale-95">بعد 10 د</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanSheet({ task, onClose, onSave }: { task: PlanTask | null; onClose: () => void; onSave: (t: Omit<PlanTask, 'id' | 'done'>) => void }) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [note, setNote] = useState(task?.note ?? '');
  const [due, setDue] = useState<number | undefined>(task?.due);
  const [custom, setCustom] = useState(false);
  const [repeat, setRepeat] = useState(task?.repeat ?? 0);
  const [color, setColor] = useState(task?.color ?? PLAN_COLORS[0]);
  const at = (h: number, plusDays = 0) => { const d = new Date(); d.setDate(d.getDate() + plusDays); d.setHours(h, 0, 0, 0); return d.getTime(); };
  const tonight = at(21) > Date.now() ? at(21) : at(21, 1);
  const toLocal = (ts?: number) => { if (!ts) return ''; const d = new Date(ts - new Date(ts).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
  const chip = (on: boolean) => `px-3.5 py-2 rounded-full text-sm font-semibold ${on ? 'bg-white text-black' : 'bg-white/10 text-white'}`;
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/65" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-gray-900 border border-white/10 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()} dir="rtl">
        <div className="flex items-center justify-between mb-3"><h3 className="text-white font-bold">{task ? 'تعديل المهمة' : 'مهمة جديدة'}</h3><button onClick={onClose} className="p-1.5 text-gray-400" aria-label="إغلاق"><X size={18} /></button></div>
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="إيه المهمة؟" maxLength={120} className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-white text-[16px] placeholder-gray-500 focus:outline-none focus:border-violet-500" />
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="ملاحظات (اختياري)" rows={2} maxLength={300} className="w-full mt-2 rounded-2xl bg-gray-800 border border-gray-700 px-4 py-2.5 text-white text-[16px] placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none" />
        <p className="text-xs text-gray-400 mt-3 mb-2">⏰ امتى أفكّرك؟</p>
        <div className="flex flex-wrap gap-2">
          {([['بدون وقت', undefined], ['بعد 15 د', Date.now() + 15 * 60000], ['بعد ساعة', Date.now() + 3600000], ['الليلة 9 م', tonight], ['بكرة 9 ص', at(9, 1)]] as [string, number | undefined][]).map(([l, v]) => <button key={l} onClick={() => { setDue(v); setCustom(false); }} className={chip(!custom && (v === undefined ? due === undefined : !!due && Math.abs(due - v) < 60000))}>{l}</button>)}
          <button onClick={() => setCustom(true)} className={chip(custom)}>وقت محدد</button>
        </div>
        {custom && <input type="datetime-local" value={toLocal(due)} onChange={e => setDue(e.target.value ? new Date(e.target.value).getTime() : undefined)} className="w-full mt-2 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white text-[16px]" />}
        <p className="text-xs text-gray-400 mt-3 mb-2">🔁 التنبيه (الافتراضي مرة واحدة في الوقت اللي حددته بس)</p>
        <div className="flex flex-wrap gap-2">
          {([[0, 'مرة واحدة'], [5, 'كل 5 د'], [15, 'كل 15 د'], [30, 'كل 30 د'], [60, 'كل ساعة']] as const).map(([k, l]) => <button key={k} onClick={() => setRepeat(k)} className={chip(repeat === k)}>{l}</button>)}
        </div>
        <div className="flex items-center gap-2.5 mt-3.5"><span className="text-xs text-gray-400">اللون</span>{PLAN_COLORS.map(c => <button key={c} onClick={() => setColor(c)} aria-label={c} className={`w-7 h-7 rounded-full ring-2 ${color === c ? 'ring-white scale-110' : 'ring-white/10'}`} style={{ background: c }} />)}</div>
        <button disabled={!title.trim()} onClick={() => onSave({ title: title.trim(), note: note.trim() || undefined, due, repeat: due ? repeat : 0, color, lastFired: task && task.due === due ? task.lastFired : undefined, doneAt: task?.doneAt })} className="w-full mt-4 py-3 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-bold disabled:opacity-40 active:scale-[0.98]">حفظ</button>
      </div>
    </div>,
    document.body,
  );
}

function PlannerPane({ userId }: { userId: string }) {
  const tasks = useSyncExternalStore(planSubscribe, planSnapshot);
  const [now, setNow] = useState(Date.now());
  const [sheet, setSheet] = useState<PlanTask | 'new' | null>(null);
  const [quick, setQuick] = useState('');
  const [perm, setPerm] = useState<string>(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  useEffect(() => { planLoad(userId); const h = window.setInterval(() => setNow(Date.now()), 20000); return () => window.clearInterval(h); }, [userId]);
  const open = tasks.filter(t => !t.done);
  const overdue = open.filter(t => planOverdue(t, now));
  const rest = open.filter(t => !planOverdue(t, now));
  const done = tasks.filter(t => t.done);
  const todayN = open.filter(t => t.due && new Date(t.due).toDateString() === new Date(now).toDateString()).length;
  const pct = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;
  const move = (id: string, dir: -1 | 1) => planSet(l => { const i = l.findIndex(t => t.id === id); const j = i + dir; if (i < 0 || j < 0 || j >= l.length) return l; const n = l.slice(); [n[i], n[j]] = [n[j], n[i]]; return n; });
  const save = (v: Omit<PlanTask, 'id' | 'done'>) => {
    if (sheet && sheet !== 'new') { const id = sheet.id; planSet(l => l.map(t => (t.id === id ? { ...t, ...v, snoozeUntil: undefined } : t))); }
    else planSet(l => [{ id: crypto.randomUUID(), done: false, ...v }, ...l]);
    setSheet(null);
  };
  const addQuick = () => { const t = quick.trim(); if (!t) return; planSet(l => [{ id: crypto.randomUUID(), title: t.slice(0, 120), repeat: 0, color: PLAN_COLORS[0], done: false }, ...l]); setQuick(''); };
  const Card = ({ t, first, last }: { t: PlanTask; first: boolean; last: boolean }) => {
    const late = planOverdue(t, now);
    return (
      <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`relative flex items-start gap-3 ps-4 pe-2 py-3 rounded-2xl border overflow-hidden ${late ? 'bg-red-500/10 border-red-400/30' : 'bg-white/5 border-white/10'}`}>
        <span className="absolute inset-y-0 start-0 w-1.5" style={{ background: t.done ? '#4b5563' : t.color }} />
        <button onClick={() => planSet(l => l.map(x => (x.id === t.id ? { ...x, done: !x.done, doneAt: x.done ? undefined : Date.now(), lastFired: undefined } : x)))} aria-label={t.done ? 'إرجاع المهمة' : 'تمت'} className={`mt-0.5 w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${t.done ? 'bg-emerald-500 border-emerald-500' : 'border-white/40'}`}>{t.done && <Check size={14} className="text-white" strokeWidth={3} />}</button>
        <button onClick={() => setSheet(t)} className="min-w-0 flex-1 text-right">
          <div className={`text-[15px] font-semibold ${t.done ? 'line-through text-gray-500' : 'text-white'}`} dir="auto">{t.title}</div>
          {t.note && <div className="text-xs text-gray-400 mt-0.5 line-clamp-2" dir="auto">{t.note}</div>}
          {(t.due || t.repeat > 0) && <div className="flex flex-wrap gap-1.5 mt-1.5">
            {t.due && <span className={`px-2 py-0.5 rounded-full text-[11px] ${late ? 'bg-red-500/25 text-red-200' : 'bg-white/10 text-gray-300'}`}>⏰ {fmtDue(t.due)}</span>}
            {t.due && t.repeat > 0 && !t.done && <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/10 text-gray-300">🔁 كل {t.repeat} د</span>}
          </div>}
        </button>
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <button disabled={first} onClick={() => move(t.id, -1)} aria-label="فوق" className="p-0.5 text-gray-500 disabled:opacity-20"><ChevronDown size={16} className="rotate-180" /></button>
          <button disabled={last} onClick={() => move(t.id, 1)} aria-label="تحت" className="p-0.5 text-gray-500 disabled:opacity-20"><ChevronDown size={16} /></button>
        </div>
        <button onClick={() => planSet(l => l.filter(x => x.id !== t.id))} aria-label="حذف" className="p-1.5 text-gray-600 hover:text-red-400 shrink-0"><X size={15} /></button>
      </motion.div>
    );
  };
  const group = (title: string, list: PlanTask[], tint: string) => list.length > 0 && (
    <div className="space-y-2">
      <p className={`text-xs font-bold px-1 pt-1 ${tint}`}>{title} · {list.length}</p>
      {list.map(t => <Card key={t.id} t={t} first={tasks[0]?.id === t.id} last={tasks[tasks.length - 1]?.id === t.id} />)}
    </div>
  );
  const R = 26, C = 2 * Math.PI * R;
  return (
    <div className="space-y-3.5" dir="rtl">
      <div className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-br from-violet-700 via-fuchsia-600 to-cyan-500 text-white shadow-[0_12px_40px_-12px_rgba(139,92,246,.8)]">
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0 -rotate-90"><circle cx="32" cy="32" r={R} stroke="rgba(255,255,255,.25)" strokeWidth="7" fill="none" /><circle cx="32" cy="32" r={R} stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100} style={{ transition: 'stroke-dashoffset .5s' }} /></svg>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-lg leading-tight">📝 مفكرتي</div>
            <div className="text-xs opacity-90 mt-0.5">{tasks.length === 0 ? 'اكتب أول مهمة وأنا أفكّرك بيها' : `${done.length} من ${tasks.length} خلصت · ${pct}%`}</div>
          </div>
          <div className="flex gap-2 text-center shrink-0">
            <div className="rounded-2xl bg-black/20 px-3 py-1.5"><div className="text-lg font-extrabold tabular-nums">{overdue.length}</div><div className="text-[10px] opacity-80">متأخرة</div></div>
            <div className="rounded-2xl bg-black/20 px-3 py-1.5"><div className="text-lg font-extrabold tabular-nums">{todayN}</div><div className="text-[10px] opacity-80">النهارده</div></div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input value={quick} onChange={e => setQuick(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addQuick(); }} placeholder="اكتب مهمة وخلاص..." maxLength={120} className="flex-1 min-w-0 rounded-full bg-gray-800 border border-gray-700 px-4 py-2.5 text-white text-[16px] placeholder-gray-500 focus:outline-none focus:border-violet-500" />
        <button onClick={addQuick} disabled={!quick.trim()} aria-label="إضافة" className="w-11 h-11 shrink-0 rounded-full bg-white/10 text-white flex items-center justify-center disabled:opacity-40 active:scale-90"><Plus size={20} /></button>
        <button onClick={() => setSheet('new')} className="h-11 px-4 shrink-0 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-sm font-bold active:scale-95">⏰ بوقت</button>
      </div>
      {perm !== 'granted' && perm !== 'unsupported' && (
        <button onClick={() => { void Notification.requestPermission().then(p => setPerm(p)); }} className="w-full text-start rounded-2xl bg-amber-500/10 border border-amber-400/25 px-3.5 py-2.5 text-xs text-amber-200">🔔 {perm === 'denied' ? 'الإشعارات محظورة من إعدادات المتصفح، فعّلها عشان توصلك التذكيرات برّه التطبيق' : 'دوس هنا وفعّل إشعارات الجهاز عشان التذكير يوصلك حتى لو في تطبيق تاني'}</button>
      )}
      {tasks.length === 0 && <div className="text-center py-10"><div className="text-5xl mb-2">🗒️</div><p className="text-gray-400 text-sm">مفيش مهام لسه</p><p className="text-gray-600 text-xs mt-1">حط مهمة ووقتها، وهفضل أفكّرك لحد ما تخلصها</p></div>}
      {group('⚠️ متأخرة', overdue, 'text-red-300')}
      {group('📌 جاية', rest, 'text-violet-300')}
      {done.length > 0 && <div className="space-y-2"><div className="flex items-center justify-between px-1 pt-1"><p className="text-xs font-bold text-gray-500">✅ خلصت · {done.length}</p><button onClick={() => planSet(l => l.filter(t => !t.done))} className="text-[11px] text-gray-500 hover:text-red-400">مسح المنجز</button></div>{done.map(t => <Card key={t.id} t={t} first={tasks[0]?.id === t.id} last={tasks[tasks.length - 1]?.id === t.id} />)}</div>}
      <p className="text-[11px] text-gray-600 text-center pt-2">التذكيرات بتشتغل طول ما التطبيق مفتوح. المهام محفوظة على الجهاز ده.</p>
      {sheet && <PlanSheet task={sheet === 'new' ? null : sheet} onClose={() => setSheet(null)} onSave={save} />}
    </div>
  );
}

// Overdue tasks show up right inside the notifications list.
function PlannerDueCard({ userId, onOpen }: { userId: string; onOpen: () => void }) {
  const tasks = useSyncExternalStore(planSubscribe, planSnapshot);
  useEffect(() => { planLoad(userId); }, [userId]);
  const late = tasks.filter(t => planOverdue(t));
  if (late.length === 0) return null;
  return (
    <div className="mb-4 rounded-2xl bg-gradient-to-br from-violet-600/25 to-fuchsia-600/20 border border-violet-400/30 p-3 space-y-2" dir="rtl">
      <div className="flex items-center justify-between"><span className="text-sm font-bold text-white">⏰ مهام جه وقتها · {late.length}</span><button onClick={onOpen} className="text-xs text-violet-200 underline">فتح مفكرتي</button></div>
      {late.slice(0, 3).map(t => (
        <div key={t.id} className="flex items-center gap-2.5 rounded-xl bg-black/25 px-3 py-2">
          <span className="w-1.5 self-stretch rounded-full" style={{ background: t.color }} />
          <div className="min-w-0 flex-1"><div className="text-sm text-white truncate" dir="auto">{t.title}</div>{t.due && <div className="text-[11px] text-gray-400">{fmtDue(t.due)}</div>}</div>
          <button onClick={() => planSet(l => l.map(x => (x.id === t.id ? { ...x, done: true, doneAt: Date.now() } : x)))} className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold active:scale-95">تمت ✓</button>
        </div>
      ))}
    </div>
  );
}

function NotifPaneSwitch({ pane, setPane }: { pane: 'notifs' | 'planner'; setPane: (p: 'notifs' | 'planner') => void }) {
  const tasks = useSyncExternalStore(planSubscribe, planSnapshot);
  const late = tasks.filter(t => planOverdue(t)).length;
  return (
    <div className="grid grid-cols-2 gap-1 p-1 mb-4 rounded-full bg-white/5 border border-white/10">
      <button onClick={() => setPane('notifs')} className={`py-2 rounded-full text-sm font-bold ${pane === 'notifs' ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white' : 'text-gray-300'}`}>🔔 الإشعارات</button>
      <button onClick={() => setPane('planner')} className={`relative py-2 rounded-full text-sm font-bold ${pane === 'planner' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white' : 'text-gray-300'}`}>📝 مفكرتي{late > 0 && <span className="absolute top-1 end-3 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] font-bold">{late}</span>}</button>
    </div>
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
  const [pane, setPane] = useState<'notifs' | 'planner'>('notifs');
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

  if (pane === 'planner') return (
    <div className="px-4 py-4"><NotifPaneSwitch pane={pane} setPane={setPane} /><PlannerPane userId={currentUser.id} /></div>
  );
  return (
    <div className="px-4 py-4">
      <NotifPaneSwitch pane={pane} setPane={setPane} />
      <PlannerDueCard userId={currentUser.id} onOpen={() => setPane('planner')} />
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
                  ليظهر الإشعار فوق الشاشة بصوت وأنت داخل تطبيق آخر: افتح إعدادات الهاتف ← التطبيقات ← KIX (أو المتصفح) ← الإشعارات، ثم فعّل الإشعارات المنبثقة والصوت والاهتزاز.
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

function KanDialogHost() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force(n => n + 1); kanDlgSubs.add(f); return () => { kanDlgSubs.delete(f); }; }, []);
  const d = kanDlgQueue[0];
  const close = (v: boolean) => { if (!d) return; kanDlgQueue = kanDlgQueue.slice(1); d.resolve(v); kanDlgEmit(); };
  useEffect(() => {
    if (!d) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const bad = d?.tone !== 'info';
  return createPortal(
    <AnimatePresence>
      {d && (
        <motion.div key={d.id} dir={DIR} className="fixed inset-0 z-[400] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => close(false)}>
          <motion.div role="alertdialog" aria-modal="true" className="kan-theme-text w-full max-w-xs rounded-3xl bg-gray-900/95 border border-white/10 shadow-2xl p-5 text-center" initial={{ scale: 0.88, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }} onClick={e => e.stopPropagation()}>
            <div className={`mx-auto mb-3 w-14 h-14 rounded-2xl flex items-center justify-center ${d.tone === 'error' ? 'bg-red-500/15 text-red-400' : d.tone === 'danger' ? 'bg-amber-500/15 text-amber-400' : 'bg-cyan-500/15 text-cyan-300'}`}>
              {d.tone === 'error' ? <AlertTriangle size={28} /> : d.tone === 'danger' ? <Trash2 size={26} /> : <Info size={28} />}
            </div>
            <p className="text-[15px] leading-relaxed text-white font-semibold whitespace-pre-line" dir="auto">{d.message}</p>
            <div className="mt-5 flex gap-2">
              {d.kind === 'confirm' && <button onClick={() => close(false)} className="flex-1 py-2.5 rounded-full bg-white/10 text-gray-200 text-sm font-semibold active:scale-95 transition-transform">{LANG === 'en' ? 'Cancel' : 'إلغاء'}</button>}
              <button autoFocus onClick={() => close(true)} className={`flex-1 py-2.5 rounded-full text-white text-sm font-bold active:scale-95 transition-transform ${d.kind === 'confirm' && bad ? 'bg-gradient-to-r from-red-500 to-rose-500' : 'bg-gradient-to-r from-violet-600 to-cyan-500'}`}>{d.kind === 'confirm' ? (LANG === 'en' ? 'Confirm' : 'تأكيد') : (LANG === 'en' ? 'OK' : 'حسنًا')}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function ToastBanner({ toast, onClose }: { toast: InAppToast; onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 4800);
    return () => window.clearTimeout(t);
  }, [toast.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div dir={DIR} className="fixed inset-x-0 top-0 z-[160] flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pointer-events-none">
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
    <div dir={DIR} className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center overflow-hidden">
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
        <img src={LOGO_URL} alt="KIX" className="relative w-24 h-24 rounded-[28px] shadow-2xl shadow-violet-500/40" />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="relative mt-7 text-5xl font-extrabold tracking-[0.3em] pl-[0.3em] kan-gradient-text">KIX</motion.h1>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.5 }} className="relative mt-2 text-sm text-gray-400">شبكة التواصل الاجتماعي</motion.p>
      <div dir="ltr" className="absolute bottom-[max(2.5rem,env(safe-area-inset-bottom))] w-40 h-1 rounded-full bg-white/10 overflow-hidden">
        <motion.div className="h-full w-1/2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" initial={{ x: '-100%' }} animate={{ x: '220%' }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} />
      </div>
    </div>
  );
}

// ============ Stories strip (design only, not wired up yet) ============
interface StoryItem { id: string; userId: string; url: string; type: 'image' | 'video'; caption: string; createdAt: number; sharedPostId?: string; extra?: StoryExtra | null; highlight?: boolean }
interface StoryGroup { userId: string; items: StoryItem[] }

type StoryRow = { id: string; user_id: string; media_url: string | null; media_type: 'image' | 'video'; caption: string; created_at: string; shared_post_id: string | null; extra?: StoryExtra | null; highlight?: boolean };
const STORY_SELECT = 'id, user_id, media_url, media_type, caption, created_at, shared_post_id, extra, highlight';
const pubFilter = () => `publish_at.is.null,publish_at.lte.${new Date().toISOString()}`;
const rowToStory = (r: StoryRow): StoryItem => ({
  id: r.id, userId: r.user_id, url: r.media_url ?? '', type: r.media_type, caption: r.caption,
  createdAt: new Date(r.created_at).getTime(), sharedPostId: r.shared_post_id ?? undefined, extra: r.extra ?? null, highlight: !!r.highlight,
});
const notifyStoriesChanged = () => window.dispatchEvent(new Event('kan-stories-changed'));

// The picture on a profile: a coloured ring when that person has an active story (24h); tap to watch it.
function ProfileStoryAvatarBase({ user, currentUser, users }: { user: User; currentUser: User; users: User[] }) {
  const [items, setItems] = useState<StoryItem[]>([]);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let off = false;
    const load = async () => {
      const { data, error } = await supabase.from('stories').select(STORY_SELECT)
        .eq('user_id', user.id).gt('expires_at', new Date().toISOString()).or(pubFilter()).order('created_at', { ascending: true }).limit(50);
      if (off) return;
      if (error) { console.error(error); return; }
      const list = await signStories(((data ?? []) as StoryRow[]).map(rowToStory));
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
  const [addMenu, setAddMenu] = useState(false);
  const [textComposer, setTextComposer] = useState(false);
  const [hint, setHint] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from('stories')
      .select(STORY_SELECT)
      .gt('expires_at', new Date().toISOString())
      .or(pubFilter())
      .order('created_at', { ascending: true })
      .limit(400);
    if (error) { console.error(error); return; }
    setStories(await signStories(((data ?? []) as StoryRow[]).map(rowToStory)));
    const { data: v } = await supabase.from('story_views').select('story_id').eq('viewer_id', currentUser.id).gt('viewed_at', new Date(Date.now() - 86400000).toISOString());
    setSeen(new Set((v ?? []).map(x => (x as { story_id: string }).story_id)));
  };
  useEffect(() => {
    void load();
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 60000);
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
        <h3 className="text-sm font-semibold text-gray-200">{t('القصص')}</h3>
      </div>
      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={pick} />
      <div className="flex gap-3.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        <button onClick={() => (mine ? setOpenAt(0) : setAddMenu(true))} className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] active:scale-95 transition-transform">
          <div className="relative">
            <div className={`w-[62px] h-[62px] rounded-full p-[2.5px] ${mine ? 'bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-cyan-400' : 'border-2 border-dashed border-violet-400/40'}`}>
              <div className={`w-full h-full rounded-full overflow-hidden ${mine ? 'bg-gray-950 p-[2px]' : ''}`}><Avatar noRing src={currentUser.avatar} name={currentUser.displayName} size="lg" /></div>
            </div>
            <span onClick={e => { e.stopPropagation(); setAddMenu(true); }} className="absolute -bottom-0.5 -left-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-white flex items-center justify-center ring-2 ring-gray-950 shadow-md"><Plus size={14} /></span>
          </div>
          <span className="text-[11px] text-gray-300 truncate w-full text-center">{t('قصتك')}</span>
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
      {addMenu && createPortal(
        <div dir={DIR} className="fixed inset-0 z-[150] bg-black/60 flex items-end justify-center" onClick={() => setAddMenu(false)}>
          <div className="kan-theme-text kan-pop w-full max-w-md bg-gray-900 rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-white/10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />
            <h4 className="text-center text-base font-bold text-white mb-4">قصة جديدة</h4>
            <div className="grid grid-cols-3 gap-3">
              {([[ImageIcon, 'المعرض', 'from-violet-600 to-cyan-500', () => fileRef.current?.click()], [TypeIcon, 'نصوص', 'from-fuchsia-500 to-violet-600', () => { void renderTextStory(' ', 0).then(f => setComposer(new File([f], 'kix-text-story.jpg', { type: f.type }))).catch(() => setTextComposer(true)); }]] as const).map(([Ic, lb, g, fn]) => (
                <button key={lb} onClick={() => { setAddMenu(false); fn(); }} className="flex flex-col items-center gap-2.5 py-4 rounded-3xl bg-white/[0.06] backdrop-blur ring-1 ring-white/15 active:scale-95 transition-transform">
                  <span className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${g} ring-1 ring-white/30 flex items-center justify-center shadow-lg shadow-violet-900/40`}><Ic size={26} strokeWidth={2.3} color="#fff" /></span>
                  <span className="text-sm font-semibold text-white">{lb}</span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
      {textComposer && <TextStoryComposer onClose={() => setTextComposer(false)} onNext={f => { setTextComposer(false); setComposer(f); }} />}
      {composer && <StoryComposer file={composer} currentUser={currentUser} users={users} onClose={() => setComposer(null)} onDone={() => { setComposer(null); void load(); }} />}
      {openAt !== null && viewerGroups[openAt] && (
        <StoryViewer
          groups={viewerGroups}
          startGroup={openAt}
          users={users}
          currentUser={currentUser}
          onSeen={id => setSeen(prev => (prev.has(id) ? prev : new Set(prev).add(id)))}
          onChanged={() => void load()}
          onClose={() => setOpenAt(null)}
          onAdd={() => { setOpenAt(null); setAddMenu(true); }}
        />
      )}
    </div>
  );
}

// ============ Story extras: text + stickers, poll, question box, close friends, highlights ============
const STORY_BGS = ['linear-gradient(135deg,#6d28d9,#c026d3,#06b6d4)', 'linear-gradient(135deg,#f97316,#ec4899)', 'linear-gradient(135deg,#0ea5e9,#6366f1)', 'linear-gradient(135deg,#10b981,#0e7490)', 'linear-gradient(135deg,#ef4444,#7c2d12)', 'linear-gradient(135deg,#111827,#4b5563)'];
const STORY_FILTERS: { n: string; f: string }[] = [{ n: 'عادي', f: 'none' }, { n: 'دافئ', f: 'sepia(0.35) saturate(1.4) contrast(1.05)' }, { n: 'بارد', f: 'hue-rotate(185deg) saturate(1.1) brightness(1.05)' }, { n: 'أبيض وأسود', f: 'grayscale(1) contrast(1.1)' }, { n: 'ساطع', f: 'brightness(1.2) saturate(1.3)' }, { n: 'كلاسيك', f: 'sepia(0.7) contrast(0.95) brightness(1.05)' }, { n: 'دراما', f: 'contrast(1.4) saturate(0.9) brightness(0.92)' }, { n: 'سينمائي', f: 'contrast(1.25) sepia(0.2) hue-rotate(-12deg) saturate(1.2) brightness(0.95)' }, { n: 'نيون', f: 'saturate(2.1) contrast(1.2) hue-rotate(320deg) brightness(1.05)' }, { n: 'غروب', f: 'sepia(0.5) saturate(1.9) hue-rotate(-18deg) brightness(1.08)' }, { n: 'ذهبي', f: 'sepia(0.6) saturate(2) hue-rotate(-8deg) brightness(1.1) contrast(1.05)' }, { n: 'شتوي', f: 'hue-rotate(200deg) saturate(0.8) brightness(1.12) contrast(1.05)' }, { n: 'بوب', f: 'saturate(2.3) contrast(1.15) brightness(1.03)' }, { n: 'ليلي', f: 'brightness(0.82) contrast(1.3) hue-rotate(210deg) saturate(1.3)' }, { n: 'حلم', f: 'brightness(1.12) contrast(0.88) saturate(1.35) sepia(0.12)' }, { n: 'فيلم', f: 'contrast(1.15) sepia(0.15) saturate(0.85) brightness(0.97)' }, { n: 'مضيء', f: 'brightness(1.18) contrast(0.95) saturate(1.1)' }, { n: 'عميق', f: 'contrast(1.35) saturate(1.25) brightness(0.9)' }, { n: 'ربيع', f: 'hue-rotate(-10deg) saturate(1.5) brightness(1.08)' }, { n: 'ريترو', f: 'sepia(0.45) contrast(1.1) saturate(0.8) hue-rotate(-15deg)' }, { n: 'جليد', f: 'hue-rotate(170deg) saturate(0.7) brightness(1.15) contrast(1.1)' }, { n: 'قوي', f: 'contrast(1.5) saturate(1.5)' }, { n: 'فينتج', f: 'sepia(0.3) contrast(1.1) saturate(1.3) hue-rotate(-8deg) brightness(1.05)' }, { n: 'بورتريه', f: 'brightness(1.08) contrast(1.05) saturate(1.15) sepia(0.08)' }, { n: 'تباين', f: 'contrast(1.6) brightness(0.95)' }, { n: 'باستيل', f: 'saturate(0.7) brightness(1.2) contrast(0.9)' }, { n: 'سايبر', f: 'hue-rotate(260deg) saturate(1.8) contrast(1.15)' }, { n: 'فجر', f: 'sepia(0.25) hue-rotate(-30deg) saturate(1.6) brightness(1.1)' }, { n: 'غابة', f: 'hue-rotate(60deg) saturate(1.3) contrast(1.05) brightness(0.98)' }, { n: 'محيط', f: 'hue-rotate(150deg) saturate(1.4) brightness(1.05)' }, { n: 'توهج', f: 'brightness(1.25) contrast(0.9) saturate(1.4)' }, { n: 'ظلام', f: 'brightness(0.7) contrast(1.4) saturate(0.8)' }, { n: 'نقي', f: 'contrast(1.08) saturate(1.1) brightness(1.04)' }, { n: 'رمادي ناعم', f: 'grayscale(0.7) brightness(1.08) contrast(0.95)' }, { n: 'كرز', f: 'hue-rotate(-25deg) saturate(1.7) contrast(1.1)' }, { n: 'ليمون', f: 'hue-rotate(35deg) saturate(1.6) brightness(1.1)' }, { n: 'بنفسج', f: 'hue-rotate(250deg) saturate(1.4) brightness(1.02)' }, { n: 'كودك', f: 'sepia(0.35) saturate(1.5) contrast(1.15) brightness(1.02) hue-rotate(-6deg)' }, { n: 'نوار', f: 'grayscale(1) contrast(1.6) brightness(0.9)' }, { n: 'صيف', f: 'saturate(1.6) brightness(1.12) sepia(0.15)' }, { n: 'خريف', f: 'sepia(0.5) hue-rotate(-20deg) saturate(1.5) contrast(1.05)' }];
const bakeFilter = async (f: File, css: string): Promise<File | null> => {
  try {
    const bmp = await createImageBitmap(f);
    const sc = Math.min(1, 2160 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
    const ctx = c.getContext('2d');
    if (!ctx || !('filter' in ctx)) return null;
    ctx.filter = css;
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/jpeg', 0.92));
    return blob ? new File([blob], `${f.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' }) : null;
  } catch { return null; }
};
type StoryExtra = { d?: number; items?: { k: 'e' | 'i' | 't' | 'c'; v: string; x: number; y: number; s: number; c?: string; b?: boolean; r?: number; f?: number; l?: string }[]; bg?: number; filter?: number; m?: { url: string; name: string; start: number; end: number; cover?: string; style?: 'cover' | 'text' | 'none'; tp?: { x: number; y: number; r?: number } }; sp?: { x: number; y: number }; texts?: { t: string; y: number; x?: number; c?: string; s?: number; bg?: boolean; k?: 'loc' | 'men' | 'lnk'; u?: string; r?: number }[]; stickers?: string[]; poll?: { q: string; a: string; b: string; o?: string[] }; pp?: { x: number; y: number; s?: number; r?: number }; ap?: { x: number; y: number; s?: number; r?: number }; ask?: string };

type StoryItemEdit = { id: string; k: 'e' | 'i' | 't' | 'c'; v: string; x: number; y: number; s: number; c?: string; b?: boolean; r?: number; f?: number; l?: string; file?: File };
const STORY_FONTS = ['inherit', 'Georgia, "Times New Roman", serif', '"Courier New", monospace', '"Segoe Script", "Comic Sans MS", cursive'];
const STORY_FONT_NAMES = ['عادي', 'كلاسيك', 'آلة كاتبة', 'خط يد'];

function CountdownSticker({ target, title, size }: { target: string; title?: string; size: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  const cell = (n: number, l: string) => <div className="flex flex-col items-center min-w-[2.2em]"><span className="font-extrabold tabular-nums" style={{ fontSize: '1.5em', lineHeight: 1.1 }}>{String(n).padStart(2, '0')}</span><span className="opacity-80" style={{ fontSize: '0.5em' }}>{l}</span></div>;
  return (
    <div dir="auto" className="rounded-[1.2em] bg-gradient-to-br from-violet-600/85 to-cyan-500/85 backdrop-blur-xl ring-1 ring-white/40 text-white text-center px-[1em] py-[0.7em] shadow-xl select-none" style={{ fontSize: `${size / 3.6}cqw` }}>
      {title && <div className="font-bold mb-[0.3em]" style={{ fontSize: '0.7em' }}>{title}</div>}
      {diff === 0 ? <div className="font-extrabold">انتهى الوقت</div> : <div className="flex items-center justify-center gap-[0.5em]">{cell(Math.floor(diff / 86400000), 'يوم')}{cell(Math.floor((diff % 86400000) / 3600000), 'ساعة')}{cell(Math.floor((diff % 3600000) / 60000), 'دقيقة')}{cell(Math.floor((diff % 60000) / 1000), 'ثانية')}</div>}
    </div>
  );
}
const TXT_COLORS = ['#ffffff', '#fde047', '#fb7185', '#f472b6', '#a78bfa', '#22d3ee', '#4ade80', '#fb923c', '#000000'];
type StoryXf = { x: number; y: number; s?: number; r?: number };
const pollOptions = (p: { a: string; b: string; o?: string[] }): string[] => (p.o && p.o.length >= 2 ? p.o : [p.a, p.b]);
// Rotation snaps to every 45 degrees when you are within a few degrees of it.
const snapAng = (r: number) => { const n = ((((r + 540) % 360) + 360) % 360) - 180; const m = Math.round(n / 45) * 45; return Math.abs(n - m) < 3.5 ? m : n; };

function StoryOverlays({ extra, onMove, onScale, onRotate, onRemove, sel, onSelect, xsel, onXSelect, onXf, onXRemove, onMention }: {
  onMention?: (ref: string) => void; extra?: StoryExtra | null; onMove?: (k: 'text' | 'stk' | 'poll' | 'item', x: number, y: number, idx?: number) => void; onScale?: (idx: number, s: number) => void; onRotate?: (idx: number, r: number) => void; onRemove?: (idx: number) => void; sel?: number; onSelect?: (idx: number) => void; xsel?: '' | 'poll' | 'ask'; onXSelect?: (k: 'poll' | 'ask') => void; onXf?: (k: 'poll' | 'ask', p: Partial<StoryXf>) => void; onXRemove?: (k: 'poll' | 'ask') => void }) {
  const root = useRef<HTMLDivElement>(null);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; s: number; a: number; r: number } | null>(null);
  const xp = useRef<{ key: string; ptrs: Map<number, { x: number; y: number }>; pinch: { d: number; s: number; a: number; r: number } | null }>({ key: '', ptrs: new Map(), pinch: null });
  const [gd, setGd] = useState({ x: false, y: false });
  if (!extra) return null;
  const clamp = (n: number) => Math.max(4, Math.min(96, n));
  // Pointer position in % of the story, snapping to the centre lines (and showing a guide) when close.
  const pos = (cx: number, cy: number) => {
    const r = root.current!.getBoundingClientRect();
    let x = clamp(((cx - r.left) / r.width) * 100); let y = clamp(((cy - r.top) / r.height) * 100);
    const sx = Math.abs(x - 50) < 2.2; const sy = Math.abs(y - 50) < 2.2;
    if (sx) x = 50;
    if (sy) y = 50;
    setGd(g => (g.x === sx && g.y === sy ? g : { x: sx, y: sy }));
    return { x, y };
  };
  const endGd = () => setGd(g => (g.x || g.y ? { x: false, y: false } : g));
  const drag = (k: 'text' | 'stk' | 'poll', idx?: number) => (onMove ? {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => { e.currentTarget.setPointerCapture(e.pointerId); e.stopPropagation(); },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId) || !root.current) return;
      const p = pos(e.clientX, e.clientY);
      onMove(k, p.x, p.y, idx);
    },
    onPointerUp: endGd,
    onPointerCancel: endGd,
    className: 'pointer-events-auto cursor-grab touch-none',
  } : { className: '' });
  // Move / pinch-zoom / twist for the poll and the question box.
  const xfProps = (key: 'poll' | 'ask', cur: StoryXf) => ({
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId); e.stopPropagation();
      const st = xp.current;
      if (st.key !== key) { st.key = key; st.ptrs.clear(); st.pinch = null; }
      st.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      onXSelect?.(key);
      if (st.ptrs.size === 2) { const [a, b] = [...st.ptrs.values()]; st.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: cur.s ?? 1, a: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI, r: cur.r ?? 0 }; }
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const st = xp.current;
      if (st.key !== key || !st.ptrs.has(e.pointerId) || !root.current) return;
      st.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (st.ptrs.size >= 2 && st.pinch) {
        const [a, b] = [...st.ptrs.values()];
        onXf?.(key, { s: Math.max(0.5, Math.min(2.4, (st.pinch.s * Math.hypot(a.x - b.x, a.y - b.y)) / st.pinch.d)), r: snapAng(st.pinch.r + (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI - st.pinch.a) });
        return;
      }
      if (st.ptrs.size === 1) onXf?.(key, pos(e.clientX, e.clientY));
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => { const st = xp.current; st.ptrs.delete(e.pointerId); if (st.ptrs.size < 2) st.pinch = null; endGd(); },
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => { const st = xp.current; st.ptrs.delete(e.pointerId); st.pinch = null; endGd(); },
    onWheel: (e: React.WheelEvent<HTMLDivElement>) => onXf?.(key, { s: Math.max(0.5, Math.min(2.4, (cur.s ?? 1) - e.deltaY * 0.002)) }),
  });
  const xfCard = (key: 'poll' | 'ask', cur: StoryXf, body: React.ReactNode) => (
    <div key={key} {...xfProps(key, cur)} className="absolute w-[72%] rounded-2xl bg-black/55 p-3 text-white pointer-events-auto cursor-grab touch-none" style={{ left: `${cur.x}%`, top: `${cur.y}%`, transform: `translate(-50%,-50%) rotate(${cur.r ?? 0}deg) scale(${cur.s ?? 1})`, zIndex: 40 }}>
      {body}
      {xsel === key && <>
        <span className="absolute -inset-1.5 rounded-2xl ring-2 ring-white/80 pointer-events-none" />
        <button onPointerDown={e => e.stopPropagation()} onClick={() => onXRemove?.(key)} className="absolute -top-4 -end-4 w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shadow-lg" aria-label="حذف"><X size={14} /></button>
      </>}
    </div>
  );
  return (
    <div ref={root} className="absolute inset-0 pointer-events-none z-[5] kan-always-white" style={{ containerType: 'inline-size' } as React.CSSProperties}>
      {(extra.texts ?? []).map((x, i) => {
        const d = drag('text', i);
        const live = !onMove && !!x.k; // viewer: location opens Google Maps, mention opens the profile, link opens the page
        const go = () => {
          if (x.k === 'loc') window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.t)}`, '_blank', 'noopener');
          else if (x.k === 'men') onMention?.(x.u || x.t.replace(/^@/, ''));
          else if (x.k === 'lnk' && !x.t.trim().startsWith('#')) { const u = x.t.trim(); window.open(/^https?:\/\//i.test(u) ? u : `https://${u}`, '_blank', 'noopener'); }
        };
        const icon = x.k === 'loc' ? '📍 ' : x.k === 'lnk' && !x.t.trim().startsWith('#') ? '🔗 ' : '';
        return <div key={i} onPointerDown={live ? (e => e.stopPropagation()) : d.onPointerDown} onPointerMove={d.onPointerMove} onPointerUp={d.onPointerUp} onPointerCancel={d.onPointerCancel} onClick={live ? (e => { e.stopPropagation(); go(); }) : undefined} role={live ? 'link' : undefined} className={`absolute max-w-[88%] text-center text-white text-3xl font-extrabold leading-snug drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] whitespace-pre-wrap break-words ${live ? 'pointer-events-auto cursor-pointer active:scale-95' : d.className}`} style={{ left: `${x.x ?? 50}%`, top: `${x.y}%`, transform: `translate(-50%,-50%) rotate(${x.r ?? 0}deg)`, color: x.c, fontSize: x.s ? `${x.s}px` : undefined, ...(x.bg ? { background: 'rgba(0,0,0,0.55)', padding: '0.25em 0.6em', borderRadius: '0.6em', textShadow: 'none' } : null) }} dir="auto">{icon}{x.t}</div>;
      })}
      {(extra.items ?? []).map((it, i) => {
        const editable = !!onMove;
        const h = editable ? {
          onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
            e.currentTarget.setPointerCapture(e.pointerId); e.stopPropagation();
            ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            onSelect?.(i);
            if (ptrs.current.size === 2) { const [a, b] = [...ptrs.current.values()]; pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: it.s, a: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI, r: it.r ?? 0 }; }
          },
          onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
            if (!ptrs.current.has(e.pointerId) || !root.current) return;
            ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (ptrs.current.size >= 2 && pinch.current) {
              const [a, b] = [...ptrs.current.values()];
              onScale?.(i, Math.max(14, Math.min(360, (pinch.current.s * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.d)));
              onRotate?.(i, snapAng(pinch.current.r + (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI - pinch.current.a));
              return;
            }
            if (ptrs.current.size === 1) { const p = pos(e.clientX, e.clientY); onMove!('item', p.x, p.y, i); }
          },
          onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => { ptrs.current.delete(e.pointerId); if (ptrs.current.size < 2) pinch.current = null; endGd(); },
          onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => { ptrs.current.delete(e.pointerId); pinch.current = null; endGd(); },
          onWheel: (e: React.WheelEvent<HTMLDivElement>) => onScale?.(i, Math.max(14, Math.min(360, it.s - e.deltaY * 0.2))),
        } : {};
        return (
          <div key={`it${i}`} {...h} className={`absolute ${editable ? 'pointer-events-auto touch-none cursor-grab' : ''}`} style={{ left: `${it.x}%`, top: `${it.y}%`, transform: `translate(-50%,-50%) rotate(${it.r ?? 0}deg)`, zIndex: i + 1, maxWidth: it.k === 't' ? '88%' : undefined }}>
            {it.k === 'e'
              ? <span style={{ fontSize: `${it.s / 3.6}cqw`, lineHeight: 1, display: 'block' }} className="drop-shadow-lg select-none">{it.v}</span>
              : it.k === 'c'
                ? <CountdownSticker target={it.v} title={it.l} size={it.s} />
              : it.k === 't'
                ? <div dir="auto" className="font-extrabold text-center leading-snug whitespace-pre-wrap break-words select-none" style={{ fontSize: `${it.s / 3.6}cqw`, fontFamily: STORY_FONTS[it.f ?? 0], color: it.c ?? '#fff', ...(it.b ? { background: 'rgba(0,0,0,0.6)', padding: '0.2em 0.55em', borderRadius: '0.5em' } : { textShadow: '0 2px 8px rgba(0,0,0,0.85)' }) }}>{it.v}</div>
                : <img src={it.v} alt="" draggable={false} style={{ width: `${it.s / 3.6}cqw`, maxWidth: 'none' }} className="rounded-xl shadow-xl select-none pointer-events-none" />}
            {editable && sel === i && <>
              <span className="absolute -inset-1.5 rounded-xl ring-2 ring-white/80 pointer-events-none" />
              <button onPointerDown={e => e.stopPropagation()} onClick={() => onRemove?.(i)} className="absolute -top-4 -end-4 w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shadow-lg" aria-label="حذف"><X size={14} /></button>
            </>}
          </div>
        );
      })}
      {(extra.stickers ?? []).length > 0 && (() => {
        const d = drag('stk');
        return <div onPointerDown={d.onPointerDown} onPointerMove={d.onPointerMove} onPointerUp={d.onPointerUp} onPointerCancel={d.onPointerCancel} className={`absolute flex justify-center gap-3 text-6xl drop-shadow-lg ${d.className}`} style={{ left: `${extra.sp?.x ?? 50}%`, top: `${extra.sp?.y ?? 28}%`, transform: 'translate(-50%,-50%)' }}>{extra.stickers!.map((e, i) => <span key={i}>{e}</span>)}</div>;
      })()}
      {onMove && extra.poll && (() => {
        const opts = pollOptions(extra.poll);
        return xfCard('poll', { x: extra.pp?.x ?? 50, y: extra.pp?.y ?? 42, s: extra.pp?.s, r: extra.pp?.r }, <>
          <div className="text-center font-bold text-base mb-2" dir="auto">{extra.poll.q}</div>
          <div className={opts.length > 2 ? 'space-y-2' : 'grid grid-cols-2 gap-2'}>
            {opts.map((o, i) => <div key={i} className="rounded-xl border border-white/30 bg-white/10 px-2 py-2.5 text-sm font-bold text-center" dir="auto">{o}</div>)}
          </div>
        </>);
      })()}
      {onMove && extra.ask && xfCard('ask', { x: extra.ap?.x ?? 50, y: extra.ap?.y ?? 72, s: extra.ap?.s, r: extra.ap?.r }, <>
        <div className="text-center font-bold text-base mb-2" dir="auto">❓ {extra.ask}</div>
        <div className="h-10 rounded-full bg-white/15 border border-white/25 px-3 flex items-center text-sm text-white/60">اكتب إجابتك...</div>
      </>)}
      {onMove && gd.x && <div className="absolute inset-y-0 left-1/2 w-px bg-cyan-300/80 pointer-events-none z-[50]" />}
      {onMove && gd.y && <div className="absolute inset-x-0 top-1/2 h-px bg-cyan-300/80 pointer-events-none z-[50]" />}
    </div>
  );
}

function StoryPoll({ story, meId, isMine }: { story: StoryItem; meId: string; isMine: boolean }) {
  const poll = story.extra?.poll;
  const opts = poll ? pollOptions(poll) : [];
  const [mine, setMine] = useState<number | null>(null);
  const [counts, setCounts] = useState<number[]>([]);
  const loadCounts = async () => {
    const { data } = await supabase.rpc('story_poll_counts', { sid: story.id });
    const c: number[] = Array.from({ length: Math.max(opts.length, 2) }, () => 0);
    for (const r of (data ?? []) as { choice: number; n: number | string }[]) if (r.choice >= 0 && r.choice < c.length) c[r.choice] = Number(r.n);
    setCounts(c);
  };
  useEffect(() => {
    let off = false;
    void (async () => {
      const { data } = await supabase.from('story_votes').select('choice').eq('story_id', story.id).eq('user_id', meId).maybeSingle();
      if (!off) setMine(data ? (data as { choice: number }).choice : null);
      await loadCounts();
    })();
    return () => { off = true; };
  }, [story.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!poll) return null;
  const show = mine !== null || isMine;
  const total = counts.reduce((a, b) => a + b, 0);
  const pct = (i: number) => (total ? Math.round(((counts[i] ?? 0) / total) * 100) : 0);
  const vote = async (c: number) => {
    if (show) return;
    setMine(c);
    const { error } = await supabase.from('story_votes').insert({ story_id: story.id, user_id: meId, choice: c });
    if (error) { setMine(null); return; }
    void loadCounts();
  };
  return (
    <div className="kan-always-white rounded-2xl bg-black/55 backdrop-blur p-3 text-white">
      <div className="text-center font-bold text-base mb-2" dir="auto">{poll.q}</div>
      <div className={opts.length > 2 ? 'space-y-2' : 'grid grid-cols-2 gap-2'}>
        {opts.map((o, i) => (
          <button key={i} onClick={() => void vote(i)} className={`relative w-full overflow-hidden rounded-xl border px-2 py-2.5 text-sm font-bold ${mine === i ? 'border-white' : 'border-white/30'} bg-white/10`}>
            {show && <span className="absolute inset-y-0 start-0 bg-white/25" style={{ width: `${pct(i)}%` }} />}
            <span className="relative" dir="auto">{o}{show ? ` · ${pct(i)}%` : ''}</span>
          </button>
        ))}
      </div>
      {isMine && <div className="text-center text-[11px] text-white/70 mt-1.5">{total} صوت</div>}
    </div>
  );
}

function StoryAsk({ story, meId, isMine, onFocusChange }: { story: StoryItem; meId: string; isMine: boolean; onFocusChange: (b: boolean) => void }) {
  const [txt, setTxt] = useState('');
  const [sent, setSent] = useState(false);
  const q = story.extra?.ask;
  if (!q) return null;
  const send = async () => {
    const body = txt.trim();
    if (!body || sent || isMine) return;
    setSent(true);
    try {
      const convId = await getOrCreateConversation(meId, story.userId);
      const { error } = await supabase.from('messages').insert({
        id: crypto.randomUUID(), conversation_id: convId, sender_id: meId,
        text: `❓ ${q}\n${body}`.slice(0, 1000),
        media_path: null, media_type: null, media_duration: null, media_name: null, media_size: null, reply_to_id: null,
      });
      if (error) throw error;
      playSound('send');
      setTxt('');
    } catch (e) { console.error(e); setSent(false); }
  };
  return (
    <div className="kan-always-white rounded-2xl bg-black/55 backdrop-blur p-3 text-white">
      <div className="text-center font-bold text-base mb-2" dir="auto">❓ {q}</div>
      {!isMine && (sent
        ? <div className="text-center text-sm text-white/80">تم إرسال إجابتك ✓</div>
        : (
          <div className="flex items-center gap-2">
            <input value={txt} onChange={e => setTxt(e.target.value.slice(0, 300))} onFocus={() => onFocusChange(true)} onBlur={() => onFocusChange(false)} onKeyDown={e => { if (e.key === 'Enter') void send(); }} placeholder="اكتب إجابتك..." className="flex-1 min-w-0 h-10 px-3 rounded-full bg-white/15 border border-white/25 text-[16px] text-white placeholder-white/60 focus:outline-none" />
            <button onClick={() => void send()} aria-label="إرسال" className="w-10 h-10 shrink-0 rounded-full bg-white/25 text-white flex items-center justify-center"><Send size={16} /></button>
          </div>
        ))}
    </div>
  );
}

// Pick which of the people you follow are close friends (they alone see "close friends" stories).
function CloseFriendsModal({ meId, onClose }: { meId: string; onClose: () => void }) {
  useBackLayer(true, onClose);
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let off = false;
    void (async () => {
      const { data: f } = await supabase.from('follows').select('following_id').eq('follower_id', meId).limit(500);
      const ids = (f ?? []).map(x => (x as { following_id: string }).following_id);
      const { data: p } = ids.length ? await supabase.from('profiles').select('id, display_name').in('id', ids) : { data: [] };
      const { data: c } = await supabase.from('close_friends').select('friend_id').eq('user_id', meId);
      if (off) return;
      setPeople(((p ?? []) as { id: string; display_name: string }[]).map(x => ({ id: x.id, name: x.display_name })));
      setSel(new Set((c ?? []).map(x => (x as { friend_id: string }).friend_id)));
      setLoading(false);
    })();
    return () => { off = true; };
  }, [meId]);
  const toggle = async (id: string) => {
    const on = sel.has(id);
    setSel(prev => { const n = new Set(prev); if (on) n.delete(id); else n.add(id); return n; });
    const { error } = on
      ? await supabase.from('close_friends').delete().eq('user_id', meId).eq('friend_id', id)
      : await supabase.from('close_friends').insert({ user_id: meId, friend_id: id });
    if (error) { console.error(error); setSel(prev => { const n = new Set(prev); if (on) n.add(id); else n.delete(id); return n; }); }
  };
  return createPortal(
    <div dir={DIR} className="fixed inset-0 z-[160] bg-black/70 flex items-end justify-center" onClick={onClose}>
      <div className="kan-theme-text w-full max-w-md max-h-[75vh] bg-gray-900 rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white">أصدقاء مقربين ({sel.size})</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 text-white" aria-label="إغلاق"><X size={18} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
          {loading && <div className="text-center text-gray-400 text-sm py-6">...</div>}
          {!loading && people.length === 0 && <div className="text-center text-gray-400 text-sm py-6">تابع بعض الأشخاص أولاً</div>}
          {people.map(p => (
            <button key={p.id} onClick={() => void toggle(p.id)} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-gray-800 text-white">
              <span className="truncate">{p.name}</span>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${sel.has(p.id) ? 'bg-emerald-500 text-white' : 'border border-gray-500'}`}>{sel.has(p.id) ? '✓' : ''}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Small star on a profile picture: opens that person's pinned stories (highlights), which stay after 24h.
function HighlightBadge({ user, currentUser, users }: { user: User; currentUser: User; users: User[] }) {
  const [items, setItems] = useState<StoryItem[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let off = false;
    const load = async () => {
      const { data } = await supabase.from('stories').select(STORY_SELECT).eq('user_id', user.id).eq('highlight', true).order('created_at', { ascending: true }).limit(60);
      if (off) return;
      setItems(await signStories(((data ?? []) as StoryRow[]).map(rowToStory)));
    };
    void load();
    window.addEventListener('kan-stories-changed', load);
    return () => { off = true; window.removeEventListener('kan-stories-changed', load); };
  }, [user.id]);
  if (items.length === 0) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="الهايلايت" className="absolute -bottom-1 -end-1 z-10 w-8 h-8 rounded-full bg-amber-500 border-2 border-gray-950 flex items-center justify-center text-base leading-none active:scale-90">⭐</button>
      {open && (
        <StoryViewer groups={[{ userId: user.id, items }]} startGroup={0} users={users} currentUser={currentUser} onSeen={() => undefined} onChanged={notifyStoriesChanged} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function ProfileStoryAvatar({ user, currentUser, users }: { user: User; currentUser: User; users: User[] }) {
  return <div className="relative shrink-0"><ProfileStoryAvatarBase user={user} currentUser={currentUser} users={users} /><HighlightBadge user={user} currentUser={currentUser} users={users} /></div>;
}

async function renderTextStory(text: string, bg: number): Promise<File> {
  const W = 1080, H = 1920;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  const cols = STORY_BGS[bg].match(/#[0-9a-fA-F]{6}/g) ?? ['#6d28d9', '#06b6d4'];
  const g = ctx.createLinearGradient(0, 0, W, H);
  cols.forEach((col, i) => g.addColorStop(cols.length > 1 ? i / (cols.length - 1) : 0, col));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.direction = /[\u0600-\u06FF]/.test(text) ? 'rtl' : 'ltr';
  ctx.font = '800 84px system-ui, "Segoe UI", Tahoma, sans-serif';
  const maxW = W - 160; const lines: string[] = [];
  for (const para of text.split('\n')) {
    let cur = '';
    for (const w of para.split(/\s+/).filter(Boolean)) { const t = cur ? `${cur} ${w}` : w; if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = w; } else cur = t; }
    lines.push(cur);
  }
  const lh = 120; const y0 = H / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, W / 2, y0 + i * lh));
  const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/jpeg', 0.92));
  if (!blob) throw new Error('canvas export failed');
  return new File([blob], 'text-story.jpg', { type: 'image/jpeg' });
}

function TextStoryComposer({ onClose, onNext }: { onClose: () => void; onNext: (f: File) => void }) {
  useBackLayer(true, onClose);
  const [text, setText] = useState('');
  const [bg, setBg] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const publish = async () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    try { onNext(await renderTextStory(text.trim(), bg)); } catch (e) { console.error(e); setErr('تعذّر تجهيز النص، حاول مرة أخرى'); setBusy(false); }
  };
  return createPortal(
    <div dir={DIR} className="kan-always-white fixed inset-0 z-[140] flex flex-col" style={{ background: STORY_BGS[bg] }}>
      <div className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <button onClick={onClose} disabled={busy} className="p-2 rounded-full bg-black/25 text-white" aria-label="إغلاق"><X size={20} /></button>
        <button onClick={() => setBg(b => (b + 1) % STORY_BGS.length)} className="px-4 py-2 rounded-full bg-black/25 text-white text-sm font-semibold">🎨 الخلفية</button>
        <button onClick={() => void publish()} disabled={busy || !text.trim()} className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold disabled:opacity-50 active:scale-95 transition-transform">{busy ? '...' : 'التالي'}</button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center p-8">
        <textarea autoFocus value={text} onChange={e => setText(e.target.value.slice(0, 300))} placeholder="اكتب شيئاً..." dir="auto" className="w-full h-full max-h-[60vh] resize-none bg-transparent text-white text-3xl font-extrabold leading-snug text-center placeholder-white/60 focus:outline-none" style={{ boxShadow: 'none' }} />
      </div>
      {err && <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-red-500/90 text-white text-xs">{err}</div>}
    </div>,
    document.body,
  );
}

function StoryComposer({ file, currentUser, users, onClose, onDone }: { file: File; currentUser: User; users: User[]; onClose: () => void; onDone: () => void }) {
  useBackLayer(true, onClose);
  const [previewUrl] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);
  const isVideo = file.type.startsWith('video/');
  const [caption, setCaption] = useState('');
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [tool, setTool] = useState<'' | 'text' | 'sticker' | 'poll' | 'ask' | 'aud' | 'sched' | 'filter' | 'music' | 'frame'>(file.name === 'kix-text-story.jpg' ? 'text' : 'filter');
  const [music, setMusic] = useState<File | null>(null);
  const [mStart, setMStart] = useState(0);
  const [mEnd, setMEnd] = useState(0);
  const musicPick = useRef<HTMLInputElement>(null);
  const [remoteM, setRemoteM] = useState<{ url: string; name: string; cover?: string } | null>(null);
  const [mStyle, setMStyle] = useState<'cover' | 'text' | 'none'>('none');
  const [tp, setTp] = useState<Pct | undefined>(undefined);
  const [bgc, setBgc] = useState('#000000');
  const [rot, setRot] = useState(0);
  const [blurBg, setBlurBg] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [txt, setTxt] = useState('');
  const [txtY, setTxtY] = useState(50);
  const [txtX, setTxtX] = useState(50);
  const [txtC, setTxtC] = useState('#ffffff');
  const [txtS, setTxtS] = useState(30);
  const [txtB, setTxtB] = useState(false);
  const [stkPos, setStkPos] = useState({ x: 50, y: 28 });
  const [pollPos, setPollPos] = useState<StoryXf>({ x: 50, y: 42, s: 1, r: 0 });
  const [askPos, setAskPos] = useState<StoryXf>({ x: 50, y: 72, s: 1, r: 0 });
  const [xsel, setXsel] = useState<'' | 'poll' | 'ask'>('');
  const [pxs, setPxs] = useState<string[]>([]);
  const [flt, setFlt] = useState(0);
  const [fltName, setFltName] = useState('');
  const swipeX = useRef(0);
  const pickFlt = (i: number) => { const n = (i + STORY_FILTERS.length) % STORY_FILTERS.length; setFlt(n); setFltName(STORY_FILTERS[n].n); window.setTimeout(() => setFltName(''), 900); };
  const [stk, setStk] = useState<string[]>([]);
  const [pq, setPq] = useState('');
  const [pa, setPa] = useState('');
  const [pb, setPb] = useState('');
  const [ask, setAsk] = useState('');
  const [aud, setAud] = useState<'all' | 'close'>('all');
  const [sched, setSched] = useState('');
  const [cfOpen, setCfOpen] = useState(false);
  const [items, setItems] = useState<StoryItemEdit[]>([]);
  const [sel, setSel] = useState(-1);
  const itemPick = useRef<HTMLInputElement>(null);
  void setStk;
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const bp = useRef(new Map<number, { x: number; y: number }>());
  const bz = useRef<{ d: number; z: number } | null>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<{ c: string; w: number; pts: { x: number; y: number }[] }[]>([]);
  const [pen, setPen] = useState('#ffffff');
  const [penW, setPenW] = useState(10);
  const [, setDn] = useState(0);
  const [dur, setDur] = useState(5);
  const [tFont, setTFont] = useState(0);
  const [cTitle, setCTitle] = useState('');
  const [cWhen, setCWhen] = useState('');
  const [tNew, setTNew] = useState('');
  const [tCol, setTCol] = useState('#ffffff');
  const [tBg, setTBg] = useState(false);
  const moved = zoom !== 1 || off.x !== 0 || off.y !== 0 || bgc !== '#000000' || rot !== 0 || blurBg;
  const resetBase = () => { setZoom(1); setOff({ x: 0, y: 0 }); setBgc('#000000'); setRot(0); setBlurBg(false); };
  const redraw = () => {
    const c = cvs.current; const g = c?.getContext('2d'); if (!c || !g) return;
    g.clearRect(0, 0, c.width, c.height); g.lineCap = 'round'; g.lineJoin = 'round';
    for (const st of strokes.current) {
      g.strokeStyle = st.c; g.fillStyle = st.c; g.lineWidth = st.w;
      if (st.pts.length === 1) { g.beginPath(); g.arc(st.pts[0].x, st.pts[0].y, st.w / 2, 0, Math.PI * 2); g.fill(); continue; }
      g.beginPath(); st.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke();
    }
  };
  const undoStroke = () => { strokes.current.pop(); redraw(); setDn(n => n + 1); };
  const clearDraw = () => { strokes.current = []; redraw(); setDn(n => n + 1); };
  const bakeTransform = async (f: File): Promise<File> => {
    if (!moved) return f;
    try {
      const bmp = await createImageBitmap(f);
      const W = 1080; const H = 1920;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d'); if (!g) return f;
      g.fillStyle = bgc; g.fillRect(0, 0, W, H);
      if (blurBg) {
        // Soft blurred copy of the photo behind it (shrink + stretch works on every browser, unlike ctx.filter).
        const sw = 32, sh = Math.round((32 * H) / W);
        const t = document.createElement('canvas'); t.width = sw; t.height = sh;
        const tg = t.getContext('2d');
        if (tg) {
          const cs = Math.max(sw / bmp.width, sh / bmp.height);
          tg.imageSmoothingQuality = 'high';
          tg.drawImage(bmp, (sw - bmp.width * cs) / 2, (sh - bmp.height * cs) / 2, bmp.width * cs, bmp.height * cs);
          g.imageSmoothingQuality = 'high';
          g.drawImage(t, 0, 0, W, H);
        }
      }
      const sc = Math.min(W / bmp.width, H / bmp.height);
      g.save(); g.translate(W / 2 + (off.x / 100) * W, H / 2 + (off.y / 100) * H); g.rotate((rot * Math.PI) / 180); g.scale(zoom, zoom);
      g.drawImage(bmp, -(bmp.width * sc) / 2, -(bmp.height * sc) / 2, bmp.width * sc, bmp.height * sc); g.restore();
      const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/jpeg', 0.9));
      return blob ? new File([blob], 'story.jpg', { type: 'image/jpeg' }) : f;
    } catch { return f; }
  };
  const addItem = (k: 'e' | 'i' | 't' | 'c', v: string, file?: File, ex?: { c?: string; b?: boolean; f?: number; l?: string }) => {
    setItems(a => { const n = a.length; return [...a, { id: crypto.randomUUID(), k, v, x: 50 + ((n * 9) % 30) - 12, y: 42 + ((n * 11) % 24) - 8, s: k === 'e' ? 72 : k === 'i' ? 150 : k === 'c' ? 42 : 34, c: ex?.c, b: ex?.b, f: ex?.f, l: ex?.l, file }]; });
    setSel(items.length);
  };
  const removeItem = (i: number) => { setItems(a => { const it = a[i]; if (it?.file) URL.revokeObjectURL(it.v); return a.filter((_, k) => k !== i); }); setSel(-1); };
  const [loc, setLoc] = useState('');
  const [men, setMen] = useState('');
  const [lnk, setLnk] = useState('');
  const [locP, setLocP] = useState<Pct>({ x: 50, y: 66, r: 0 });
  const [menP, setMenP] = useState<Pct>({ x: 50, y: 74, r: 0 });
  const [lnkP, setLnkP] = useState<Pct>({ x: 50, y: 82, r: 0 });
  const menName = men.trim().replace(/^@/, '').toLowerCase();
  const menUser = menName ? users.find(u => u.id !== currentUser.id && u.username.toLowerCase() === menName) : undefined;
  const menHints = menName && !menUser ? users.filter(u => u.id !== currentUser.id && (u.username.toLowerCase().startsWith(menName) || u.displayName.toLowerCase().includes(menName))).slice(0, 5) : [];
  const extra: StoryExtra = {
    texts: (() => {
      const all: NonNullable<StoryExtra['texts']> = [];
      if (loc.trim()) all.push({ t: loc.trim().slice(0, 40), y: locP.y, x: locP.x, r: locP.r || undefined, s: 22, bg: true, k: 'loc' });
      if (menUser) all.push({ t: '@' + menUser.username, y: menP.y, x: menP.x, r: menP.r || undefined, c: '#a5f3fc', s: 24, bg: true, k: 'men', u: menUser.id });
      if (lnk.trim()) all.push({ t: lnk.trim().slice(0, 40), y: lnkP.y, x: lnkP.x, r: lnkP.r || undefined, s: 20, bg: true, k: 'lnk' });
      return all.length ? all : undefined;
    })(),
    sp: stk.length ? stkPos : undefined,
    items: items.length ? items.map(i => ({ k: i.k, v: i.v, x: i.x, y: i.y, s: i.s, c: i.c, b: i.b, r: i.r, f: i.f, l: i.l })) : undefined,
    filter: flt > 0 ? flt : undefined,
    stickers: stk.length ? stk : undefined,
    poll: pq.trim() && pa.trim() && pb.trim() ? { q: pq.trim().slice(0, 100), a: pa.trim().slice(0, 30), b: pb.trim().slice(0, 30), o: pxs.some(x => x.trim()) ? [pa.trim().slice(0, 30), pb.trim().slice(0, 30), ...pxs.map(x => x.trim().slice(0, 30)).filter(Boolean)] : undefined } : undefined,
    pp: pq.trim() && pa.trim() && pb.trim() ? pollPos : undefined,
    ap: ask.trim() ? askPos : undefined,
    ask: ask.trim() ? ask.trim().slice(0, 120) : undefined,
    d: !isVideo && dur !== 5 ? dur : undefined,
  };
  const hasExtra = Object.values(extra).some(Boolean);
  const publish = async () => {
    if (busy) return;
    const at = sched ? new Date(sched) : null;
    if (at && at.getTime() < Date.now() + 60000) { setErr('اختر وقتاً في المستقبل'); return; }
    setBusy(true);
    setErr('');
    const baseFile = isVideo ? file : await bakeTransform(file);
    let upFile: File = baseFile;
    let baked = false;
    if (!isVideo && flt > 0) { const b = await bakeFilter(baseFile, STORY_FILTERS[flt].f); if (b) { upFile = b; baked = true; } }
    if (!isVideo) upFile = await shrinkImageFile(upFile);
    const path = kanPath(`${currentUser.id}/story-${crypto.randomUUID()}.${MEDIA_EXT[upFile.type] ?? safeExt(upFile.name)}`, upFile.size);
    // Show this upload in the always-visible upload bar (with cancel), like posts do.
    const jobId = crypto.randomUUID();
    const ctl = new AbortController();
    jobCtl.set(jobId, ctl);
    trackJob(jobId, 0, 'قصة');
    pubSet(l => l.map(j => (j.id === jobId ? { ...j, size: upFile.size } : j)));
    let storyOk = false;
    try {
      const { error: upErr } = await uploadWithProgress(POST_MEDIA_BUCKET, path, upFile, upFile.type || 'application/octet-stream', '31536000', pc => { setPct(pc); trackJob(jobId, pc); }, ctl.signal);
      if (upErr) throw upErr;
      const url = kanPublicUrl(POST_MEDIA_BUCKET, path);
      let uploadedItems: StoryExtra['items'];
      if (items.length || strokes.current.length) {
        uploadedItems = [];
        for (const it of items) {
          if (it.k === 'i' && it.file) {
            const f = await shrinkImageFile(it.file);
            const ip = `${currentUser.id}/story-item-${crypto.randomUUID()}.${MEDIA_EXT[f.type] ?? safeExt(f.name)}`;
            const { error: iErr } = await uploadWithProgress(POST_MEDIA_BUCKET, ip, f, f.type || 'image/jpeg', '31536000');
            if (iErr) throw iErr;
            uploadedItems.push({ k: 'i', v: kanPublicUrl(POST_MEDIA_BUCKET, ip), x: it.x, y: it.y, s: it.s, r: it.r });
          } else uploadedItems.push({ k: it.k, v: it.v, x: it.x, y: it.y, s: it.s, c: it.c, b: it.b, r: it.r, f: it.f, l: it.l });
        }
        if (strokes.current.length && cvs.current) {
          const blob = await new Promise<Blob | null>(r => cvs.current!.toBlob(r, 'image/png'));
          if (blob) {
            const dp = `${currentUser.id}/story-draw-${crypto.randomUUID()}.png`;
            const { error: dErr } = await uploadWithProgress(POST_MEDIA_BUCKET, dp, blob, 'image/png', '31536000');
            if (dErr) throw dErr;
            uploadedItems.push({ k: 'i', v: kanPublicUrl(POST_MEDIA_BUCKET, dp), x: 50, y: 50, s: 360 });
          }
        }
      }
      let mObj: StoryExtra['m'];
      if (music) {
        const mp = musicPath(`${currentUser.id}/${crypto.randomUUID()}-music.${safeExt(music.name)}`, music.size);
        const { error: mErr } = await uploadWithProgress(POST_MEDIA_BUCKET, mp, music, music.type || 'audio/mpeg', '31536000');
        if (mErr) { void kanRemove(POST_MEDIA_BUCKET, [path]); setErr(`تعذّر رفع الموسيقى: ${(mErr as { message?: string }).message ?? ''}`); setBusy(false); return; }
        mObj = { url: kanPublicUrl(POST_MEDIA_BUCKET, mp), name: music.name.replace(/\.[^.]+$/, '').slice(0, 60), start: mStart, end: mEnd > mStart ? mEnd : mStart + 30, style: 'none' };
      } else if (remoteM) {
        mObj = { url: stableUrl(remoteM.url), name: remoteM.name.slice(0, 60), start: mStart, end: mEnd > mStart ? mEnd : mStart + 30, cover: remoteM.cover, style: mStyle === 'cover' && remoteM.cover ? 'cover' : 'none', ...(tp && mStyle === 'cover' ? { tp } : {}) };
      }
      const { error: insErr } = await supabase.from('stories').insert({ user_id: currentUser.id, media_url: url, media_type: isVideo ? 'video' : 'image', caption: caption.trim().slice(0, 300), extra: (() => { const eo: StoryExtra = { ...(baked ? { ...extra, filter: undefined } : extra), m: mObj, items: uploadedItems }; return Object.values(eo).some(Boolean) ? eo : null; })(), audience: aud, publish_at: at ? at.toISOString() : null, ...(at ? { expires_at: new Date(at.getTime() + 86400000).toISOString() } : {}) });
      if (insErr) { void kanRemove(POST_MEDIA_BUCKET, [path]); throw insErr; }
      notifyStoriesChanged();
      storyOk = true;
      onDone();
    } catch (e) {
      console.error(e);
      if (!ctl.signal.aborted) setErr(`تعذّر نشر القصة: ${(e as { message?: string })?.message ?? 'حاول مرة أخرى'}`);
      setBusy(false);
    } finally {
      jobCtl.delete(jobId);
      if (ctl.signal.aborted) dropJob(jobId); else endJob(jobId, storyOk);
    }
  };
  const selItem = sel >= 0 ? items[sel] : undefined;
  const patchSel = (p: Partial<StoryItemEdit>) => setItems(a => a.map((x, i) => (i === sel ? { ...x, ...p } : x)));
  const dupItem = () => {
    const it = items[sel]; if (!it) return;
    const copy: StoryItemEdit = { ...it, id: crypto.randomUUID(), x: Math.min(94, it.x + 6), y: Math.min(94, it.y + 6), v: it.k === 'i' && it.file ? URL.createObjectURL(it.file) : it.v };
    setItems(a => [...a, copy]); setSel(items.length);
  };
  const moveLayer = (d: 1 | -1) => {
    if (sel < 0) return;
    setItems(a => { const it = a[sel]; if (!it) return a; const rest = a.filter((_, k) => k !== sel); return d === 1 ? [...rest, it] : [it, ...rest]; });
    setSel(d === 1 ? items.length - 1 : 0);
  };
  const normAng = (r: number) => ((((r + 540) % 360) + 360) % 360) - 180;
  const xfControls = (k: 'poll' | 'ask') => {
    const v = k === 'poll' ? pollPos : askPos; const set = k === 'poll' ? setPollPos : setAskPos;
    return (
      <div className="space-y-2">
        <p className="text-white/70 text-[11px]">اسحب الصندوق على الصورة. بإصبعين: كبّر ولُفّ.</p>
        <div className="flex items-center gap-3 px-1"><span className="text-white/80 text-xs shrink-0">الحجم</span><input type="range" min={50} max={240} value={Math.round((v.s ?? 1) * 100)} onChange={e => set(o => ({ ...o, s: Number(e.target.value) / 100 }))} className="flex-1 accent-white" /></div>
        <div className="flex items-center gap-3 px-1"><span className="text-white/80 text-xs shrink-0">الدوران</span><input type="range" min={-180} max={180} value={v.r ?? 0} onChange={e => set(o => ({ ...o, r: Number(e.target.value) }))} className="flex-1 accent-white" /><button onClick={() => set(o => ({ ...o, r: 0, s: 1, x: 50 }))} className="shrink-0 px-3 h-8 rounded-full bg-white/15 text-white text-xs">إعادة ضبط</button></div>
      </div>
    );
  };
  const addText = (t: string, bg?: boolean) => { const v = t.trim(); if (!v) return; addItem('t', v, undefined, { c: tCol, b: bg ?? tBg, f: tFont }); setTNew(''); };
  const selControls = selItem ? (
    <div className="mt-2 space-y-2">
      {selItem.k === 't' && <input value={selItem.v} onChange={e => patchSel({ v: e.target.value.slice(0, 200) })} dir="auto" className="w-full px-4 py-2 bg-white/10 rounded-full text-[16px] text-white focus:outline-none" />}
      <div className="flex items-center gap-3 px-1"><span className="text-white/80 text-xs shrink-0">الحجم</span><input type="range" min={selItem.k === 't' ? 14 : 24} max={360} value={selItem.s} onChange={e => patchSel({ s: Number(e.target.value) })} className="flex-1 accent-white" /><button onClick={() => removeItem(sel)} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0" aria-label="حذف"><Trash2 size={16} color="#fff" /></button></div>
      {selItem.k === 't' && <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">{TXT_COLORS.map(c => <button key={c} onClick={() => patchSel({ c })} aria-label="لون" className={`shrink-0 w-7 h-7 rounded-full border-2 ${(selItem.c ?? '#ffffff') === c ? 'border-white scale-110' : 'border-white/30'}`} style={{ background: c }} />)}<button onClick={() => patchSel({ b: !selItem.b })} className={`shrink-0 px-3 h-8 rounded-full text-xs font-semibold ${selItem.b ? 'bg-white text-black' : 'bg-white/15 text-white'}`}>خلفية</button><button onClick={() => patchSel({ f: ((selItem.f ?? 0) + 1) % STORY_FONTS.length })} className="shrink-0 px-3 h-8 rounded-full bg-white/15 text-white text-xs font-semibold" style={{ fontFamily: STORY_FONTS[selItem.f ?? 0] }}>خط: {STORY_FONT_NAMES[selItem.f ?? 0]}</button></div>}
      {<div className="flex items-center gap-3 px-1"><span className="text-white/80 text-xs shrink-0">الدوران</span><input type="range" min={-180} max={180} value={selItem.r ?? 0} onChange={e => patchSel({ r: Number(e.target.value) })} className="flex-1 accent-white" /><button onClick={() => patchSel({ r: 0 })} className="shrink-0 px-3 h-8 rounded-full bg-white/15 text-white text-xs">0°</button></div>}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {([['⧉ نسخ', dupItem], ['↑ للأمام', () => moveLayer(1)], ['↓ للخلف', () => moveLayer(-1)], ['⟲ 15°', () => patchSel({ r: normAng((selItem.r ?? 0) - 15) })], ['⟳ 15°', () => patchSel({ r: normAng((selItem.r ?? 0) + 15) })], ['↔ توسيط', () => patchSel({ x: 50 })]] as const).map(([l, fn]) => <button key={l} onClick={fn} className="shrink-0 px-3 h-8 rounded-full bg-white/15 text-white text-xs font-semibold">{l}</button>)}
      </div>
    </div>
  ) : null;
  void [setTxt, setTxtC, setTxtS, setTxtB, txtC, txtS, txtB];
  return createPortal(
    <div dir={DIR} className="fixed inset-0 z-[140] bg-black flex flex-col overscroll-none select-none">
      <div className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <button onClick={onClose} disabled={busy} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-xl ring-1 ring-white/25 shadow-lg shadow-violet-900/30 text-white active:scale-90 transition-transform" aria-label="إغلاق"><X size={20} /></button>
        <span className="text-white font-semibold text-sm">قصة جديدة</span>
        <span className="w-9" />
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center">
        <div style={{ background: isVideo ? undefined : bgc }} className="relative h-full w-full sm:w-auto sm:max-w-full sm:aspect-[9/16] bg-black sm:rounded-[32px] overflow-hidden sm:ring-2 ring-violet-400/40 sm:shadow-[0_0_60px_-10px_rgba(139,92,246,0.6)] flex items-center justify-center">
          {isVideo
            ? <video src={previewUrl} className="w-full h-full object-contain" style={{ filter: STORY_FILTERS[flt].f }} controls playsInline muted loop autoPlay />
            : <>{blurBg && <img src={previewUrl} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl opacity-90 pointer-events-none" />}<img src={previewUrl} alt="" draggable={false} style={{ filter: STORY_FILTERS[flt].f, transform: `translate(${off.x}%, ${off.y}%) rotate(${rot}deg) scale(${zoom})` }} className="relative w-full h-full object-contain select-none pointer-events-none" /></>}
          {!isVideo && tool !== 'draw' && <div className="absolute inset-0 z-[4] touch-none cursor-grab"
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); bp.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); setSel(-1); setXsel(''); if (bp.current.size === 2) { const [p, q] = [...bp.current.values()]; bz.current = { d: Math.hypot(p.x - q.x, p.y - q.y) || 1, z: zoom }; } }}
            onPointerMove={e => {
              const prev = bp.current.get(e.pointerId); if (!prev) return;
              bp.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (bp.current.size >= 2 && bz.current) { const [p, q] = [...bp.current.values()]; setZoom(Math.max(0.5, Math.min(4, (bz.current.z * Math.hypot(p.x - q.x, p.y - q.y)) / bz.current.d))); return; }
              if (bp.current.size === 1) { const r = e.currentTarget.getBoundingClientRect(); const dx = ((e.clientX - prev.x) / r.width) * 100; const dy = ((e.clientY - prev.y) / r.height) * 100; setOff(o => ({ x: Math.max(-150, Math.min(150, o.x + dx)), y: Math.max(-150, Math.min(150, o.y + dy)) })); }
            }}
            onPointerUp={e => { bp.current.delete(e.pointerId); if (bp.current.size < 2) bz.current = null; }}
            onPointerCancel={e => { bp.current.delete(e.pointerId); bz.current = null; }}
            onWheel={e => setZoom(z => Math.max(0.5, Math.min(4, z - e.deltaY * 0.002)))}
            onDoubleClick={resetBase} />}
          <canvas ref={cvs} width={720} height={1280} className={`absolute inset-0 w-full h-full z-[15] ${tool === 'draw' ? 'touch-none cursor-crosshair' : 'pointer-events-none'}`}
            onPointerDown={e => { if (tool !== 'draw') return; e.currentTarget.setPointerCapture(e.pointerId); const r = e.currentTarget.getBoundingClientRect(); strokes.current.push({ c: pen, w: penW * 2, pts: [{ x: ((e.clientX - r.left) / r.width) * 720, y: ((e.clientY - r.top) / r.height) * 1280 }] }); redraw(); }}
            onPointerMove={e => { if (tool !== 'draw' || !e.currentTarget.hasPointerCapture(e.pointerId)) return; const st = strokes.current[strokes.current.length - 1]; if (!st) return; const r = e.currentTarget.getBoundingClientRect(); st.pts.push({ x: ((e.clientX - r.left) / r.width) * 720, y: ((e.clientY - r.top) / r.height) * 1280 }); redraw(); }}
            onPointerUp={() => setDn(n => n + 1)} />
          {moved && !isVideo && <button onClick={resetBase} className="absolute bottom-3 start-3 z-20 h-9 px-3 rounded-full bg-black/45 backdrop-blur-xl ring-1 ring-white/30 text-white text-xs font-semibold flex items-center gap-1.5 active:scale-95"><RefreshCw size={14} color="#fff" /> إعادة الضبط</button>}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent pointer-events-none z-[5]" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 to-transparent pointer-events-none z-[5]" />
          <span className="absolute top-3 start-3 px-2.5 py-1 rounded-full bg-gradient-to-r from-violet-600/50 to-cyan-500/50 backdrop-blur-xl ring-1 ring-white/25 text-white text-[11px] font-semibold pointer-events-none z-10 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />معاينة · 9:16</span>
          {remoteM && !music && mStyle === 'cover' && <StoryMusicTag m={{ name: remoteM.name, cover: remoteM.cover, style: 'cover' }} pos={tp} onMove={q => setTp(o => ({ ...q, r: o?.r }))} />}
          {fltName && <div className="absolute inset-x-0 top-1/3 text-center text-white text-3xl font-extrabold drop-shadow-lg pointer-events-none z-10">{fltName}</div>}
          <div className="absolute top-12 end-3 z-20 flex flex-col gap-2 max-h-[calc(100%-4rem)] overflow-y-auto no-scrollbar">
            {([['text', TypeIcon, 'نص', items.some(i => i.k === 't')], ['sticker', Smile, 'ملصق', items.length > 0], ['music', Music, 'موسيقى', !!music || !!remoteM], ['filter', Wand2, 'فلتر', flt > 0], ...(isVideo ? [] : [['frame', ImageIcon, 'الخلفية والتدوير', bgc !== '#000000' || rot !== 0] as const]), ['draw', Pencil, 'رسم', strokes.current.length > 0], ['tags', MapPin, 'موقع ومنشن', !!(loc.trim() || men.trim() || lnk.trim())], ['poll', BarChart3, 'استطلاع', !!extra.poll], ['ask', HelpCircle, 'سؤال', !!extra.ask], ['count', Clock, 'عدّاد', items.some(i => i.k === 'c')], ['dur', Play, 'مدة العرض', dur !== 5], ['aud', Users, 'مقربين', aud === 'close'], ['sched', Calendar, 'جدولة', !!sched]] as const).map(([k, Ic, label, on]) => (
              <button key={k} onClick={() => setTool(t => (t === k ? '' : k))} aria-label={label} title={label} className={`relative shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform ${tool === k ? 'bg-white/30 backdrop-blur-xl ring-2 ring-white' : 'bg-black/35 backdrop-blur-xl ring-1 ring-white/30'}`} style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.5))' }}><Ic size={22} strokeWidth={2.3} color="#fff" />{on && <span className="absolute -top-0.5 -end-0.5 w-3 h-3 rounded-full bg-white ring-2 ring-violet-600" />}</button>
            ))}
          </div>
          <StoryOverlays extra={extra} sel={sel} xsel={xsel} onXSelect={k => { setXsel(k); setSel(-1); setTool(k); }} onXf={(k, p) => (k === 'poll' ? setPollPos(o => ({ ...o, ...p })) : setAskPos(o => ({ ...o, ...p })))} onXRemove={k => { if (k === 'poll') { setPq(''); setPa(''); setPb(''); setPxs([]); } else setAsk(''); setXsel(''); }} onSelect={i => { setSel(i); setXsel(''); if (items[i]?.k === 't') setTool('text'); }} onRemove={removeItem} onScale={(i, sz) => setItems(a => a.map((x, k) => (k === i ? { ...x, s: sz } : x)))} onRotate={(i, r) => setItems(a => a.map((x, k) => (k === i ? { ...x, r } : x)))} onMove={(k, x, y, idx) => { if (k === 'text') { const tk = extra.texts?.[idx ?? -1]?.k; if (tk === 'loc') setLocP(o => ({ ...o, x, y })); else if (tk === 'men') setMenP(o => ({ ...o, x, y })); else if (tk === 'lnk') setLnkP(o => ({ ...o, x, y })); } else if (k === 'poll') setPollPos(o => ({ ...o, x, y })); else if (k === 'item' && idx !== undefined) setItems(a => a.map((it, i) => (i === idx ? { ...it, x, y } : it))); else setStkPos({ x, y }); }} />
        </div>
      </div>
      <div className={`absolute inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 ${tool ? 'rounded-3xl bg-black/70 backdrop-blur-2xl ring-1 ring-white/15 p-3 max-h-[42%] overflow-y-auto shadow-2xl' : 'hidden'}`}>
        {tool === 'text' && <div className="space-y-2 mb-1">
          <div className="flex gap-2"><input value={tNew} onChange={e => setTNew(e.target.value.slice(0, 200))} onKeyDown={e => { if (e.key === 'Enter') addText(tNew); }} placeholder="اكتب نصاً ثم اضغط +" dir="auto" className="flex-1 min-w-0 px-4 py-2 bg-white/10 rounded-full text-[16px] text-white placeholder-gray-400 focus:outline-none" /><button onClick={() => addText(tNew)} className="shrink-0 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center active:scale-90" aria-label="إضافة"><Plus size={20} /></button></div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button onClick={() => addText(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }), true)} className="shrink-0 px-3 h-8 rounded-full bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5"><Clock size={14} color="#fff" /> الوقت</button>
            <button onClick={() => addText(new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' }), true)} className="shrink-0 px-3 h-8 rounded-full bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5"><Calendar size={14} color="#fff" /> التاريخ</button>
            <span className="w-px h-5 bg-white/25 shrink-0" />
            {TXT_COLORS.map(c => <button key={c} onClick={() => setTCol(c)} aria-label="لون" className={`shrink-0 w-7 h-7 rounded-full border-2 ${tCol === c ? 'border-white scale-110' : 'border-white/30'}`} style={{ background: c }} />)}
            <button onClick={() => setTBg(v => !v)} className={`shrink-0 px-3 h-8 rounded-full text-xs font-semibold ${tBg ? 'bg-white text-black' : 'bg-white/15 text-white'}`}>خلفية</button>
            <button onClick={() => setTFont(f => (f + 1) % STORY_FONTS.length)} className="shrink-0 px-3 h-8 rounded-full bg-white/15 text-white text-xs font-semibold" style={{ fontFamily: STORY_FONTS[tFont] }}>خط: {STORY_FONT_NAMES[tFont]}</button>
          </div>
          {selControls}
        </div>}
        {tool === 'count' && <div className="space-y-2 mb-1">
          <input value={cTitle} onChange={e => setCTitle(e.target.value.slice(0, 40))} placeholder="عنوان العدّاد (مثلاً: حفلتي)" dir="auto" className="w-full px-4 py-2 bg-white/10 rounded-full text-[16px] text-white placeholder-gray-400 focus:outline-none" />
          <div className="flex gap-2"><input type="datetime-local" value={cWhen} onChange={e => setCWhen(e.target.value)} style={{ colorScheme: 'dark' }} className="flex-1 min-w-0 px-4 py-2 bg-white/10 rounded-full text-[16px] text-white focus:outline-none" /><button onClick={() => { const t = new Date(cWhen); if (!cWhen || t.getTime() < Date.now()) { setErr('اختر موعداً في المستقبل'); return; } addItem('c', t.toISOString(), undefined, { l: cTitle.trim() || undefined }); setCTitle(''); setCWhen(''); }} className="shrink-0 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center active:scale-90" aria-label="إضافة"><Plus size={20} /></button></div>
          {selControls}
        </div>}
        {tool === 'dur' && <div className="space-y-2 mb-1"><p className="text-white/80 text-xs">مدة ظهور الصورة في القصة{isVideo ? ' (الفيديو بياخد مدته الأصلية)' : ''}</p><div className="flex gap-2">{[5, 10, 15, 20].map(n => <button key={n} onClick={() => setDur(n)} disabled={isVideo} className={`flex-1 py-2 rounded-full text-sm font-semibold disabled:opacity-40 ${dur === n ? 'bg-white text-black' : 'bg-white/15 text-white'}`}>{n} ث</button>)}</div></div>}
        {tool === 'draw' && <div className="space-y-2 mb-1">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {TXT_COLORS.map(c => <button key={c} onClick={() => setPen(c)} aria-label="لون القلم" className={`shrink-0 w-8 h-8 rounded-full border-2 ${pen === c ? 'border-white scale-110' : 'border-white/30'}`} style={{ background: c }} />)}
          </div>
          <div className="flex items-center gap-3"><span className="text-white/80 text-xs shrink-0">السُمك</span><input type="range" min={3} max={36} value={penW} onChange={e => setPenW(Number(e.target.value))} className="flex-1 accent-white" /><button onClick={undoStroke} className="shrink-0 px-3 h-9 rounded-full bg-white/15 text-white text-xs font-semibold" disabled={!strokes.current.length}>تراجع</button><button onClick={clearDraw} className="shrink-0 w-9 h-9 rounded-full bg-white/15 flex items-center justify-center" aria-label="مسح"><Trash2 size={16} color="#fff" /></button></div>
        </div>}
        {tool === 'sticker' && <div className="mb-2">
          <input ref={itemPick} type="file" accept="image/*" multiple className="hidden" onChange={e => { const fs = (Array.from(e.target.files ?? []) as File[]).slice(0, 6); e.target.value = ''; for (const f of fs) if (f.type.startsWith('image/')) addItem('i', URL.createObjectURL(f), f); }} />
          <div className="flex gap-2 overflow-x-auto no-scrollbar items-center">
            <button onClick={() => itemPick.current?.click()} className="shrink-0 h-12 px-4 rounded-full bg-white/15 ring-1 ring-white/30 text-white text-sm font-semibold flex items-center gap-2 active:scale-95"><ImageIcon size={18} color="#fff" /> صورة</button>
            {['😍', '🔥', '😂', '🎉', '❤️', '😎', '🙏', '💯', '⭐', '👏', '🥰', '😭', '🤩', '😘', '🤝', '💪', '🌹', '☀️', '🌙', '✨', '🎶', '🥳', '😅', '🤔'].map(e => <button key={e} onClick={() => addItem('e', e)} className="text-3xl shrink-0 w-12 h-12 rounded-full bg-white/10 active:scale-90 transition-transform">{e}</button>)}
          </div>
          {selControls}
        </div>}
        {sel >= 0 && items[sel] && <div className="flex items-center gap-2 mb-2 rounded-2xl bg-white/10 px-3 py-2">
          <span className="text-white/80 text-xs shrink-0">تدوير العنصر</span>
          <input type="range" min={-180} max={180} step={1} value={Math.round(items[sel].r ?? 0)} onChange={e => patchSel({ r: Number(e.target.value) })} className="flex-1 min-w-0 accent-violet-400" />
          <span className="w-11 text-center text-white text-xs tabular-nums" dir="ltr">{Math.round(items[sel].r ?? 0)}°</span>
          <button onClick={() => patchSel({ r: ((items[sel].r ?? 0) + 90 > 180 ? (items[sel].r ?? 0) - 270 : (items[sel].r ?? 0) + 90) })} className="shrink-0 px-2.5 py-1 rounded-full bg-white/15 text-white text-xs font-semibold">90°</button>
        </div>}
        {tool === 'filter' && <div className="flex gap-2.5 overflow-x-auto no-scrollbar mb-2">{STORY_FILTERS.map((f, i) => <button key={f.n} onClick={() => pickFlt(i)} className="shrink-0 flex flex-col items-center gap-1 w-16"><span className={`block w-16 h-16 rounded-xl overflow-hidden ${flt === i ? 'ring-2 ring-white' : 'opacity-80'}`}>{isVideo ? <video src={`${previewUrl}#t=0.1`} preload="metadata" muted playsInline style={{ filter: f.f }} className="w-full h-full object-cover pointer-events-none" /> : <img src={previewUrl} alt="" style={{ filter: f.f }} className="w-full h-full object-cover" />}</span><span className={`text-[11px] ${flt === i ? 'text-white font-bold' : 'text-white/70'}`}>{f.n}</span></button>)}</div>}
        {tool === 'frame' && !isVideo && <div className="space-y-2.5 mb-1">
          <button onClick={() => setBlurBg(b => !b)} className={`w-full py-2 rounded-full text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] ${blurBg ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>🌫️ خلفية ضبابية من نفس الصورة {blurBg ? '✓' : ''}</button>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-white/80 text-xs shrink-0">لون الخلفية</span>
            {['#000000', '#ffffff', '#7c3aed', '#06b6d4', '#ec4899', '#f97316', '#22c55e', '#eab308', '#1e3a8a', '#6b7280'].map(c => <button key={c} onClick={() => setBgc(c)} aria-label="لون الخلفية" className={`shrink-0 w-8 h-8 rounded-full border-2 ${bgc === c ? 'border-white scale-110' : 'border-white/30'}`} style={{ background: c }} />)}
            <label className="shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 border-white/30 relative bg-gradient-to-br from-pink-500 via-yellow-400 to-cyan-400 flex items-center justify-center text-white text-sm font-bold">+<input type="color" value={bgc} onChange={e => setBgc(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" /></label>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRot(r => (r + 90 > 180 ? r - 270 : r + 90))} className="shrink-0 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold flex items-center gap-1"><RefreshCw size={13} /> 90°</button>
            <input type="range" min={-180} max={180} step={1} value={rot} onChange={e => setRot(Number(e.target.value))} className="flex-1 min-w-0 accent-violet-400" />
            <span className="w-10 text-center text-white text-xs tabular-nums" dir="ltr">{rot}°</span>
            {(bgc !== '#000000' || rot !== 0 || blurBg) && <button onClick={() => { setBgc('#000000'); setRot(0); setBlurBg(false); }} className="shrink-0 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs">إعادة</button>}
          </div>
        </div>}
        {tool === 'music' && <div className="mb-2">{music
          ? <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-2"><div className="flex items-center gap-2 px-2 pt-1 text-xs text-white"><Music size={14} className="text-fuchsia-300" /><span className="flex-1 truncate" dir="auto">{music.name}</span><button onClick={() => { setMusic(null); setMStart(0); setMEnd(0); }} className="p-1 text-white/60" aria-label="إزالة"><X size={14} /></button></div><div className="mt-2"><MusicTrimmer file={music} start={mStart} end={mEnd} onStart={setMStart} onEnd={setMEnd} /></div></div>
          : <div className="space-y-2">
              {remoteM && <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-2">
                <div className="flex items-center gap-2 px-2 pt-1 text-xs text-white"><Music size={14} className="text-fuchsia-300" /><span className="flex-1 truncate" dir="auto">{remoteM.name}</span><button onClick={() => { setRemoteM(null); setMStart(0); setMEnd(0); }} className="p-1 text-white/60" aria-label="إزالة"><X size={14} /></button></div>
                <div className="flex gap-2 px-2 mt-2">{([['cover', '🖼 غلاف'], ['none', '🚫 بدون غلاف']] as const).filter(([k]) => k !== 'cover' || !!remoteM.cover).map(([k, l]) => <button key={k} onClick={() => setMStyle(k)} className={`flex-1 py-1.5 rounded-full text-xs font-semibold ${mStyle === k ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>{l}</button>)}</div>
                {mStyle === 'cover' && <div className="mt-1.5 flex items-center gap-2 px-2"><span className="text-[11px] text-gray-300 shrink-0">اسحب الغلاف لتحريكه · تدوير</span><input type="range" min={-180} max={180} value={Math.round(tp?.r ?? 0)} onChange={e => setTp(o => ({ x: o?.x ?? 50, y: o?.y ?? 62, r: Number(e.target.value) }))} className="flex-1 min-w-0 accent-violet-400" /><span className="w-10 text-center text-white text-[11px] tabular-nums" dir="ltr">{Math.round(tp?.r ?? 0)}°</span></div>}
                <div className="mt-2"><MusicTrimmer key={remoteM.url} src={remoteM.url} name={remoteM.name} start={mStart} end={mEnd} onStart={setMStart} onEnd={setMEnd} /></div>
              </div>}
              {remoteM && !libOpen
                ? <button onClick={() => setLibOpen(true)} className="w-full py-2.5 rounded-2xl bg-white/10 text-white text-xs font-semibold">تغيير الأغنية</button>
                : <MusicLibrary onDevice={() => musicPick.current?.click()} onClose={remoteM ? () => setLibOpen(false) : undefined} onPick={t => { setMusic(null); setRemoteM(t); setMStart(t.start ?? 0); setMEnd(t.end ?? 0); setMStyle(t.cover ? 'cover' : 'none'); setLibOpen(false); }} />}
            </div>}
          <input ref={musicPick} type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { setMusic(f); setRemoteM(null); setMStart(0); setMEnd(0); } }} /></div>}
        {tool === 'tags' && <div className="space-y-2 mb-2">{([[MapPin, loc, setLoc, 'أضف موقعاً'], [AtSign, men, setMen, 'منشن لصديق (اسم المستخدم)'], [LinkIcon, lnk, setLnk, 'رابط أو هاشتاج']] as const).map(([Ic, v, set, ph]) => <div key={ph} className="flex items-center gap-2 bg-white/10 rounded-full ps-3"><Ic size={18} color="#fff" strokeWidth={2.2} /><input value={v} onChange={e => set(e.target.value)} placeholder={ph} className="flex-1 min-w-0 px-2 py-2 bg-transparent text-[16px] text-white placeholder-gray-400 focus:outline-none" /></div>)}
          {menHints.length > 0 && <div className="flex gap-2 overflow-x-auto no-scrollbar">{menHints.map(u => <button key={u.id} onClick={() => setMen(u.username)} className="shrink-0 flex items-center gap-2 pe-3 ps-1 py-1 rounded-full bg-white/10 text-white text-xs active:scale-95"><Avatar userId={u.id} src={u.avatar} name={u.displayName} size="sm" />@{u.username}</button>)}</div>}
          {menName && !menUser && menHints.length === 0 && <p className="text-[11px] text-amber-300 px-2">مفيش مستخدم بالاسم ده، اختار حد من المقترحات</p>}
          {menUser && <p className="text-[11px] text-emerald-300 px-2">✓ هيظهر @{menUser.username} وأي حد يدوس عليه يفتح بروفايله</p>}
          {(loc.trim() || menUser || lnk.trim()) && <p className="text-[11px] text-gray-400 px-2">اسحبهم على القصة لتحريكهم. الموقع بيفتح خرائط جوجل.</p>}
          {([[loc.trim(), '📍', locP, setLocP], [menUser ? '1' : '', '@', menP, setMenP], [lnk.trim(), '🔗', lnkP, setLnkP]] as const).filter(r => r[0]).map(([, ic, v, set]) => <div key={ic} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"><span className="text-sm shrink-0">{ic}</span><span className="text-white/70 text-[11px] shrink-0">تدوير</span><input type="range" min={-180} max={180} value={Math.round(v.r ?? 0)} onChange={e => set(o => ({ ...o, r: Number(e.target.value) }))} className="flex-1 min-w-0 accent-violet-400" /><span className="w-10 text-center text-white text-[11px] tabular-nums" dir="ltr">{Math.round(v.r ?? 0)}°</span></div>)}
        </div>}
        {(xsel === 'poll' || xsel === 'ask') && <div className="mb-2 space-y-1.5 rounded-2xl bg-white/10 px-3 py-2">
          {([['تدوير', -180, 180, 1, (xsel === 'poll' ? pollPos : askPos).r ?? 0, 'r', '°'], ['الحجم', 0.5, 2, 0.05, (xsel === 'poll' ? pollPos : askPos).s ?? 1, 's', '×']] as const).map(([lb, mn, mx, st, val, key, un]) => <div key={key} className="flex items-center gap-2"><span className="w-12 shrink-0 text-white/80 text-xs">{lb}</span><input type="range" min={mn} max={mx} step={st} value={val} onChange={e => (xsel === 'poll' ? setPollPos : setAskPos)(o => ({ ...o, [key]: Number(e.target.value) }))} className="flex-1 min-w-0 accent-violet-400" /><span className="w-11 text-center text-white text-xs tabular-nums" dir="ltr">{key === 'r' ? Math.round(val) : val.toFixed(2)}{un}</span></div>)}
        </div>}
        {tool === 'poll' && <div className="space-y-2 mb-2">
          <input value={pq} onChange={e => setPq(e.target.value)} placeholder="سؤال الاستطلاع" className="w-full px-4 py-2 bg-white/10 rounded-full text-[16px] text-white placeholder-gray-400 focus:outline-none" />
          {[pa, pb, ...pxs].map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={v} onChange={e => { const t = e.target.value.slice(0, 30); if (i === 0) setPa(t); else if (i === 1) setPb(t); else setPxs(a => a.map((x, k) => (k === i - 2 ? t : x))); }} placeholder={`الخيار ${i + 1}`} className="w-full px-4 py-2 bg-white/10 rounded-full text-[16px] text-white placeholder-gray-400 focus:outline-none" />
              {i >= 2 && <button onClick={() => setPxs(a => a.filter((_, k) => k !== i - 2))} className="w-9 h-9 shrink-0 rounded-full bg-white/15 text-white flex items-center justify-center" aria-label="حذف الخيار"><X size={14} /></button>}
            </div>
          ))}
          <div className="flex items-center gap-2">
            {pxs.length < 4 && <button onClick={() => setPxs(a => [...a, ''])} className="px-3 h-9 rounded-full bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5"><Plus size={14} /> إضافة خيار</button>}
            {extra.poll && <button onClick={() => { setPq(''); setPa(''); setPb(''); setPxs([]); setXsel(''); }} className="px-3 h-9 rounded-full bg-white/15 text-white text-xs font-semibold">حذف الاستطلاع</button>}
          </div>
          {extra.poll && xfControls('poll')}
        </div>}
        {tool === 'ask' && <div className="space-y-2 mb-2">
          <input value={ask} onChange={e => setAsk(e.target.value)} placeholder="اطرح سؤالاً على متابعيك" className="w-full px-4 py-2 bg-white/10 rounded-full text-[16px] text-white placeholder-gray-400 focus:outline-none" />
          {extra.ask && xfControls('ask')}
        </div>}
        {tool === 'aud' && <div className="flex gap-2 mb-2">{([['all', 'الجميع'], ['close', 'أصدقاء مقربين']] as const).map(([k, l]) => <button key={k} onClick={() => setAud(k)} className={`flex-1 py-2 rounded-full text-sm ${aud === k ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white'}`}>{l}</button>)}<button onClick={() => setCfOpen(true)} className="px-3 rounded-full bg-white/10 text-white text-sm">تعديل القائمة</button></div>}
        {tool === 'sched' && <div className="flex gap-2 mb-2"><input type="datetime-local" value={sched} onChange={e => setSched(e.target.value)} style={{ colorScheme: 'dark' }} className="flex-1 min-w-0 px-4 py-2 bg-white/10 rounded-full text-[16px] text-white placeholder-gray-400 focus:outline-none" />{sched && <button onClick={() => setSched('')} className="px-3 rounded-full bg-white/10 text-white text-sm">إلغاء</button>}</div>}
        <div className="hidden flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {([['text', 'Aa نص', !!txt.trim()], ['music', '🎵 موسيقى', !!music || !!remoteM], ['sticker', '😀 ملصق', stk.length > 0], ['filter', flt > 0 ? '🎨 فلتر ✓' : '🎨 فلتر', flt > 0], ['poll', '📊 استطلاع', !!extra.poll], ['ask', '❓ سؤال', !!extra.ask], ['aud', aud === 'close' ? '👥 مقربين ✓' : '👥 الجمهور', aud === 'close'], ['sched', sched ? '🕒 مجدولة ✓' : '🕒 جدولة', !!sched]] as const).map(([k, l, on]) => (
            <button key={k} onClick={() => setTool(t => (t === k ? '' : k))} className="shrink-0 w-[62px] flex flex-col items-center gap-1 active:scale-95">
              <span className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold ${tool === k ? 'bg-white text-black' : on ? 'bg-gradient-to-br from-violet-600 to-cyan-500 text-white' : 'bg-white/10 text-white ring-1 ring-white/10'}`}>{l.split(' ')[0]}</span>
              <span className="text-[11px] text-white/80 truncate max-w-full">{l.split(' ').slice(1).join(' ')}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-2 bg-white/[0.06] backdrop-blur-2xl border-t border-white/15 rounded-t-3xl">
        <input value={caption} onChange={e => setCaption(e.target.value.slice(0, 300))} placeholder="أضف تعليقاً..." className="flex-1 px-4 py-2.5 bg-white/10 backdrop-blur ring-1 ring-white/20 rounded-full text-[16px] text-white placeholder-gray-400 focus:outline-none focus:ring-violet-400/70" />
        <button onClick={() => void publish()} disabled={busy} className="px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 shadow-lg shadow-cyan-500/30 ring-1 ring-white/25 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-70 active:scale-95 transition-transform">
          {busy ? <><RefreshCw size={15} className="animate-spin" /> {pct}%</> : <><Send size={15} /> {sched ? 'جدولة' : 'نشر'}</>}
        </button>
      </div>
      {cfOpen && <CloseFriendsModal meId={currentUser.id} onClose={() => setCfOpen(false)} />}
      {err && <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-red-500/90 text-white text-xs">{err}</div>}
    </div>,
    document.body,
  );
}

async function shrinkImageFile(f: File): Promise<File> {
  try {
    if (!f.type.startsWith('image/') || f.type === 'image/gif' || f.size < 300000) return f;
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 1440 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.86));
    return blob && blob.size < f.size ? new File([blob], f.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }) : f;
  } catch { return f; }
}

type Pct = { x: number; y: number; r?: number };
// Drag an absolutely-positioned child around its parent; reports the position in % of the parent.
function pctDrag(onMove?: (p: Pct) => void) {
  return (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onMove) return;
    e.stopPropagation();
    const el = e.currentTarget;
    const box = el.parentElement?.getBoundingClientRect();
    if (!box) return;
    el.setPointerCapture(e.pointerId);
    const mv = (ev: PointerEvent) => onMove({ x: Math.max(12, Math.min(88, ((ev.clientX - box.left) / box.width) * 100)), y: Math.max(6, Math.min(94, ((ev.clientY - box.top) / box.height) * 100)) });
    const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };
}

function StoryMusicTag({ m, pos, onMove }: { m: { name: string; cover?: string; style?: 'cover' | 'text' | 'none' }; pos?: Pct; onMove?: (p: Pct) => void }) {
  if (m.style === 'none') return null;
  const cover = m.style === 'cover' && !!m.cover;
  const p = pos ?? (cover ? { x: 50, y: 62 } : { x: 50, y: 13 });
  return (
    <div onPointerDown={pctDrag(onMove)} style={{ left: `${p.x}%`, top: `${p.y}%`, transform: `translate(-50%,-50%) rotate(${p.r ?? 0}deg)`, touchAction: onMove ? 'none' : undefined, color: '#fff' }}
      className={`absolute z-10 w-fit max-w-[80%] kan-always-white ${onMove ? 'cursor-grab active:cursor-grabbing ring-1 ring-dashed ring-white/50 rounded-2xl' : 'pointer-events-none'}`}>
      {cover ? (
        <div className="flex items-center gap-3 p-2 pe-4 rounded-2xl bg-white/20 backdrop-blur-xl ring-1 ring-white/30 shadow-xl">
          <img src={m.cover} alt="" draggable={false} className="w-14 h-14 rounded-xl object-cover shrink-0" />
          <div className="min-w-0"><div className="flex items-center gap-1 text-[10px] opacity-80"><Music size={11} /> موسيقى</div><div className="text-sm font-bold truncate" dir="auto">{m.name}</div></div>
        </div>
      ) : (
        <div className="px-3.5 py-1.5 rounded-full bg-black/50 text-sm font-semibold flex items-center gap-1.5"><Music size={13} /><span className="truncate" dir="auto">{m.name}</span></div>
      )}
    </div>
  );
}

function StoryMusic({ m }: { m: { url: string; name: string; start: number; end: number; cover?: string; style?: 'cover' | 'text' | 'none'; tp?: Pct } }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [mute, setMute] = useState(false);
  const end = m.end > m.start ? m.end : m.start + 30;
  // Stay inside the chosen clip: start exactly at its beginning (even before metadata has loaded) and loop at its end.
  useEffect(() => {
    const a = ref.current; if (!a) return;
    const go = () => { a.currentTime = m.start; void a.play().catch(() => undefined); };
    if (a.readyState >= 1) go(); else a.addEventListener('loadedmetadata', go, { once: true });
    return () => { a.removeEventListener('loadedmetadata', go); a.pause(); };
  }, [m.url, m.start]);
  return (
    <>
      <audio ref={ref} src={m.url} muted={mute} preload="auto"
        onTimeUpdate={e => { const a = e.currentTarget; if (a.currentTime >= end || a.currentTime < m.start - 0.3) { a.currentTime = m.start; if (a.paused) void a.play().catch(() => undefined); } }}
        onEnded={e => { const a = e.currentTarget; a.currentTime = m.start; void a.play().catch(() => undefined); }} />
      <StoryMusicTag m={m} pos={m.tp} />
      <button onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setMute(v => !v); }} aria-label={mute ? 'تشغيل الصوت' : 'كتم الصوت'} className="absolute top-16 end-3 z-20 w-8 h-8 rounded-full bg-black/45 backdrop-blur ring-1 ring-white/30 flex items-center justify-center">{mute ? <VolumeX size={16} color="#fff" /> : <Volume2 size={16} color="#fff" />}</button>
    </>
  );
}

function StoryViewer({ groups, startGroup, users, currentUser, onSeen, onChanged, onClose, onAdd }: {
  groups: StoryGroup[]; startGroup: number; users: User[]; currentUser: User;
  onSeen: (id: string) => void; onChanged: () => void; onClose: () => void; onAdd?: () => void;
}) {
  useBackLayer(true, onClose);
  useEffect(() => { stopPostMusic(); return () => { window.dispatchEvent(new Event('kan-stories-changed')); }; }, []);
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
  const [pinned, setPinned] = useState<Record<string, boolean>>({});
  const [sentNote, setSentNote] = useState('');
  const [burst, setBurst] = useState(0);
  // Portrait/square media fills the whole screen; wide media keeps its full width (no cropping of landscape shots).
  const [coverFit, setCoverFit] = useState<Record<string, boolean>>({});
  const markFit = (id: string, w: number, h: number) => { if (w > 0 && h > 0) setCoverFit(c => (c[id] === (h >= w * 0.9) ? c : { ...c, [id]: h >= w * 0.9 })); };
  const group = groups[gi];
  const story = group?.items[si];
  const author = users.find(u => u.id === group?.userId);
  const isMine = story?.userId === currentUser.id;
  const isPinned = story ? (pinned[story.id] ?? !!story.highlight) : false;
  const togglePin = async () => {
    if (!story) return;
    const nv = !isPinned;
    setPinned(p => ({ ...p, [story.id]: nv }));
    const { error } = await supabase.from('stories').update({ highlight: nv }).eq('id', story.id);
    if (error) { console.error(error); setPinned(p => ({ ...p, [story.id]: !nv })); return; }
    setSentNote(nv ? 'تم التثبيت في الهايلايت ⭐' : 'تمت الإزالة من الهايلايت');
    window.setTimeout(() => setSentNote(''), 1800);
    notifyStoriesChanged();
  };
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
    const nx = groups[gi]?.items[si + 1] ?? groups[gi + 1]?.items[0];
    if (!nx || !nx.url) return;
    if (nx.type === 'image') { const im = new Image(); im.src = nx.url; }
    else { const pv = document.createElement('video'); pv.preload = 'metadata'; pv.src = nx.url; }
  }, [gi, si]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setProgress(0);
    setDuration(story?.type === 'image' ? (story.extra?.d ?? 5) * 1000 : 5000);
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
  const [flyEm, setFlyEm] = useState<{ e: string; k: number } | null>(null);
  const sendReaction = async (em: string) => {
    if (!story || story.userId === currentUser.id) return;
    setFlyEm({ e: em, k: Date.now() });
    window.setTimeout(() => setFlyEm(null), 1000);
    try {
      const convId = await getOrCreateConversation(currentUser.id, story.userId);
      await supabase.from('messages').insert({
        id: crypto.randomUUID(), conversation_id: convId, sender_id: currentUser.id,
        text: `↪️ تفاعل على قصتك\n${em}`,
        media_path: null, media_type: null, media_duration: null, media_name: null, media_size: null, reply_to_id: null,
      });
      playSound('send');
    } catch (e) { console.error(e); }
  };

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
  // Preload the next pictures so stories open instantly instead of waiting on each image.
  useEffect(() => {
    const upcoming = [...(group?.items.slice(si + 1, si + 4) ?? []), ...(groups[gi + 1]?.items.slice(0, 2) ?? [])];
    for (const s of upcoming) if (s.url && s.type === 'image') { const im = new window.Image(); im.src = s.url; }
  }, [gi, si]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused || showViewers || replyFocus) v.pause(); else void v.play().catch(() => undefined);
  }, [paused, showViewers, replyFocus, story?.id]);

  const remove = async () => {
    if (!story || !(await kanConfirm('حذف هذه القصة؟'))) return;
    const { error } = await supabase.from('stories').delete().eq('id', story.id);
    if (error) { console.error(error); return; }
    // A shared post's media belongs to the post, so only delete files this story uploaded itself.
    const p = story.sharedPostId ? null : mediaPath(story.url);
    if (p) void kanRemove(POST_MEDIA_BUCKET, [p]);
    onChanged();
    notifyStoriesChanged();
    onClose();
  };

  if (!story || !group) return null;
  const ignore = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation(), onPointerUp: (e: React.PointerEvent) => e.stopPropagation() };

  return createPortal(
    <div
      dir={DIR}
      className="fixed inset-0 z-[140] bg-black flex items-center justify-center select-none"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' } as React.CSSProperties}
      onContextMenu={e => e.preventDefault()}
      onDragStart={e => e.preventDefault()}
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
            <div className="absolute inset-0 flex items-center justify-center p-8 kan-always-white" style={{ background: STORY_BGS[story.extra?.bg ?? 0] ?? STORY_BGS[0] }}>
              <p className="text-white text-2xl font-bold leading-10 text-center whitespace-pre-wrap break-words line-clamp-[10]" dir="auto">{story.caption}</p>
            </div>
          )
          : story.type === 'image'
          ? <><img src={story.url} alt="" draggable={false} onContextMenu={e => e.preventDefault()} style={{ filter: STORY_FILTERS[story.extra?.filter ?? 0]?.f, WebkitTouchCallout: 'none' } as React.CSSProperties} onLoad={e => markFit(story.id, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)} className={`absolute inset-0 w-full h-full ${coverFit[story.id] ? 'object-cover' : 'object-contain'} pointer-events-none select-none`} />{story.extra?.m && <StoryMusic key={story.id} m={story.extra.m} />}</>
          : (
            <video
              key={story.id}
              ref={videoRef}
              src={story.url}
              autoPlay
              playsInline
              style={{ filter: STORY_FILTERS[story.extra?.filter ?? 0]?.f }}
              className={`absolute inset-0 w-full h-full ${coverFit[story.id] ? 'object-cover' : 'object-contain'} pointer-events-none select-none`}
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              onContextMenu={e => e.preventDefault()}
              onLoadedMetadata={e => { setDuration((e.currentTarget.duration || 5) * 1000); markFit(story.id, e.currentTarget.videoWidth, e.currentTarget.videoHeight); }}
              onTimeUpdate={e => { const d = e.currentTarget.duration; if (d > 0) setProgress(e.currentTarget.currentTime / d); }}
              onEnded={() => setProgress(1)}
              onError={() => setProgress(1)}
            />
          )}
        <StoryOverlays extra={story.extra} onMention={ref => { const u = users.find(x => x.id === ref || x.username.toLowerCase() === ref.toLowerCase()); if (u) { onClose(); openUserProfile(u.id); } }} />
        {(() => {
          const ex = story.extra;
          const stack = !!ex?.poll && !!ex?.ask && !ex?.ap;
          const xfStyle = (p: { x?: number; y?: number; s?: number; r?: number } | undefined): React.CSSProperties => ({ left: `${p?.x ?? 50}%`, top: `${p?.y ?? 46}%`, transform: `translate(-50%,-50%) rotate(${p?.r ?? 0}deg) scale(${p?.s ?? 1})` });
          return <>
            {ex?.poll && (
              <div {...ignore} className="absolute w-[72%] z-10 space-y-3" style={xfStyle(ex.pp)}>
                <StoryPoll key={`p${story.id}`} story={story} meId={currentUser.id} isMine={isMine} />
                {stack && <StoryAsk key={`a${story.id}`} story={story} meId={currentUser.id} isMine={isMine} onFocusChange={setPaused} />}
              </div>
            )}
            {ex?.ask && !stack && (
              <div {...ignore} className="absolute w-[72%] z-10" style={xfStyle(ex.ap ?? ex.pp)}>
                <StoryAsk key={`a${story.id}`} story={story} meId={currentUser.id} isMine={isMine} onFocusChange={setPaused} />
              </div>
            )}
          </>;
        })()}
        {/* Visible navigation: RTL, so the right arrow goes back and the left arrow goes forward. */}
        {(gi > 0 || si > 0) && (
          <button {...ignore} onClick={e => { e.stopPropagation(); prev(); }} aria-label="السابق" className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-gradient-to-br from-violet-600/45 to-cyan-500/45 backdrop-blur-xl ring-1 ring-white/30 shadow-lg shadow-violet-900/40 text-white flex items-center justify-center active:scale-90 transition-transform">
            <ChevronRight size={22} />
          </button>
        )}
        <button {...ignore} onClick={e => { e.stopPropagation(); next(); }} aria-label="التالي" className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-gradient-to-br from-violet-600/45 to-cyan-500/45 backdrop-blur-xl ring-1 ring-white/30 shadow-lg shadow-violet-900/40 text-white flex items-center justify-center active:scale-90 transition-transform">
          <ChevronLeft size={22} />
        </button>
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 px-3 pt-[max(0.6rem,env(safe-area-inset-top))]">
          <div className="flex gap-1">
            {group.items.map((it, i) => (
              <div key={it.id} className="h-[4px] flex-1 rounded-full bg-white/25 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-white to-cyan-200 shadow-[0_0_6px_rgba(255,255,255,0.7)]" style={{ width: `${i < si ? 100 : i === si ? Math.min(100, progress * 100) : 0}%` }} />
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
            {isMine && onAdd && <button onClick={onAdd} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-xl ring-1 ring-white/25 shadow-lg shadow-violet-900/30 text-white active:scale-90 transition-transform" aria-label="إضافة قصة"><Plus size={20} /></button>}
            {isMine && <button onClick={() => void remove()} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-xl ring-1 ring-white/25 shadow-lg shadow-violet-900/30 text-white active:scale-90 transition-transform" aria-label="حذف القصة"><Trash2 size={18} /></button>}
            {isMine && <button onClick={() => void togglePin()} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-xl ring-1 ring-white/25 shadow-lg shadow-violet-900/30 text-white active:scale-90 transition-transform text-base leading-none" aria-label="هايلايت"><Bookmark size={18} color="#fff" fill={isPinned ? '#fff' : 'none'} /></button>}
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-xl ring-1 ring-white/25 shadow-lg shadow-violet-900/30 text-white active:scale-90 transition-transform" aria-label="إغلاق"><X size={20} /></button>
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
            <div {...ignore} dir={DIR}>
              {!replyFocus && <div className="flex items-center justify-between gap-1 mb-2 px-1">{['🔥', '😂', '😍', '😮', '😢', '👏'].map(em => <button key={em} onClick={() => void sendReaction(em)} className="text-2xl w-11 h-11 rounded-full bg-white/10 active:scale-125 transition-transform">{em}</button>)}</div>}
              {flyEm && <motion.div key={flyEm.k} initial={{ opacity: 1, y: 0, scale: 0.6 }} animate={{ opacity: 0, y: -170, scale: 1.8 }} transition={{ duration: 0.9 }} className="fixed inset-x-0 bottom-40 text-center text-6xl pointer-events-none z-50">{flyEm.e}</motion.div>}
            <div className="flex items-center gap-2">
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
            </div>
          )}
        </div>
        {showViewers && isMine && (
          <div className="absolute inset-x-0 bottom-0 max-h-[55%] overflow-y-auto bg-[#15152b] text-white rounded-t-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" {...ignore}>
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
    <div dir={DIR} onPointerDown={e => e.preventDefault()} onMouseDown={e => e.preventDefault()} className={docked ? 'kan-pop mt-2 w-full bg-gray-900/70 border-t border-white/10' : 'absolute bottom-full mb-2 right-0 z-30 w-72 max-w-[92vw] bg-gray-900 border border-gray-700 rounded-2xl shadow-xl'}>
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
// Double-tap like: one heart in the KIX colours (violet to cyan) that pops where you tapped and fades.
const lastPointer = { x: -1, y: -1 };
if (typeof window !== 'undefined') window.addEventListener('pointerdown', e => { lastPointer.x = e.clientX; lastPointer.y = e.clientY; }, true);
function CoinBurst({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  const dim = size === 'lg' ? 96 : 48;
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const r = ref.current?.parentElement?.getBoundingClientRect();
    const { x, y } = lastPointer;
    if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) setAt({ x: x - r.left, y: y - r.top });
  }, []);
  return (
    <div ref={ref} className="pointer-events-none absolute z-20" style={at ? { left: at.x, top: at.y, transform: 'translate(-50%,-50%)' } : { inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: [0.3, 1.2, 1, 1], opacity: [0, 1, 1, 0] }} transition={{ duration: 0.9, ease: 'easeOut', times: [0, 0.3, 0.55, 1] }}
        style={{ filter: 'drop-shadow(0 4px 14px rgba(124,58,237,.55))' }}>
        <svg width={dim} height={dim} viewBox="0 0 24 24" aria-hidden>
          <defs><linearGradient id={`kan-heart-${size}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7c3aed" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
          <path fill={`url(#kan-heart-${size})`} d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </motion.div>
    </div>
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
const POLL_TAG = '⟦poll⟧';
const VOTE_TAG = '⟦vote⟧';
function parsePoll(t?: string | null): { q: string; o: string[] } | null {
  if (!t || !t.startsWith(POLL_TAG)) return null;
  try { const d = JSON.parse(t.slice(POLL_TAG.length)); return typeof d.q === 'string' && Array.isArray(d.o) ? { q: d.q, o: d.o.map(String) } : null; } catch { return null; }
}
function parseVote(t?: string | null): { p: string; i: number } | null {
  if (!t || !t.startsWith(VOTE_TAG)) return null;
  try { const d = JSON.parse(t.slice(VOTE_TAG.length)); return typeof d.p === 'string' && typeof d.i === 'number' ? { p: d.p, i: d.i } : null; } catch { return null; }
}

function PollComposer({ onClose, onSend }: { onClose: () => void; onSend: (q: string, o: string[]) => void }) {
  const [q, setQ] = useState('');
  const [o, setO] = useState(['', '']);
  const opts = o.map(x => x.trim()).filter(Boolean);
  const ok = q.trim().length > 0 && opts.length >= 2;
  return createPortal(
    <div dir={DIR} className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="kan-theme-text kan-pop relative w-full max-w-md bg-gray-900 rounded-t-3xl sm:rounded-3xl p-5 border border-white/10" onClick={e => e.stopPropagation()}>
        <h4 className="text-center font-bold text-white mb-3">📊 استطلاع رأي</h4>
        <input value={q} onChange={e => setQ(e.target.value.slice(0, 120))} placeholder="اكتب السؤال" className="w-full px-4 py-2.5 mb-2 bg-white/10 rounded-xl text-[16px] text-white placeholder-gray-400 outline-none" dir="auto" />
        {o.map((v, i) => (
          <input key={i} value={v} onChange={e => setO(a => a.map((x, k) => (k === i ? e.target.value.slice(0, 40) : x)))} placeholder={`الخيار ${i + 1}`} className="w-full px-4 py-2.5 mb-2 bg-white/10 rounded-xl text-[16px] text-white placeholder-gray-400 outline-none" dir="auto" />
        ))}
        {o.length < 4 && <button onClick={() => setO(a => [...a, ''])} className="text-sm text-violet-300 font-semibold mb-3">+ إضافة خيار</button>}
        <button disabled={!ok} onClick={() => onSend(q.trim(), opts)} className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold disabled:opacity-40">إرسال الاستطلاع</button>
      </div>
    </div>,
    document.body,
  );
}

function ChatPoll({ id, text, all, meId, onVote }: { id: string; text: string; all: { senderId: string; text?: string | null }[]; meId: string; onVote: (i: number) => void }) {
  const poll = parsePoll(text);
  if (!poll) return null;
  const by = new Map<string, number>();
  for (const m of all) { const v = parseVote(m.text); if (v && v.p === id && v.i >= 0 && v.i < poll.o.length) by.set(m.senderId, v.i); }
  const total = by.size;
  const mine = by.get(meId);
  const cnt = poll.o.map((_, i) => Array.from(by.values()).filter(x => x === i).length);
  return (
    <div className="min-w-[220px]">
      <div className="font-bold mb-2" dir="auto">📊 {poll.q}</div>
      <div className="space-y-1.5">
        {poll.o.map((o, i) => (
          <button key={i} onClick={() => onVote(i)} className={`relative w-full overflow-hidden rounded-xl border px-3 py-2 text-sm text-start ${mine === i ? 'border-white' : 'border-white/25'} bg-black/20`}>
            <span className="absolute inset-y-0 start-0 bg-white/25 transition-all" style={{ width: `${total ? Math.round((cnt[i] / total) * 100) : 0}%` }} />
            <span className="relative flex justify-between gap-2"><span dir="auto">{mine === i ? '✓ ' : ''}{o}</span><span>{total ? Math.round((cnt[i] / total) * 100) : 0}%</span></span>
          </button>
        ))}
      </div>
      <div className="text-[11px] opacity-70 mt-1.5">{total} صوت</div>
    </div>
  );
}

function describeMessage(m: Message): string {
  const gm = parseGame(m.text);
  if (gm) return gm.k === 'inv' ? '♟️ دعوة لعب شطرنج' : '♟️ شطرنج';
  const pl = parsePoll(m.text);
  if (pl) return '📊 ' + pl.q;
  if (parseVote(m.text)) return '🗳️ تصويت';
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

// ---- Downloads to the device: streamed with a live % and a cancel button (shown in the top bar and in "تحميلاتي"). ----
type DownJob = { id: string; name: string; pct: number; got: number; total: number; status: 'run' | 'done' | 'fail'; note?: string; barHidden?: boolean };
let downList: DownJob[] = [];
const downSubs = new Set<() => void>();
const downSet = (fn: (l: DownJob[]) => DownJob[]) => { downList = fn(downList); downSubs.forEach(f => f()); };
const downSubscribe = (cb: () => void) => { downSubs.add(cb); return () => { downSubs.delete(cb); }; };
const downSnapshot = () => downList;
const downPatch = (id: string, patch: Partial<DownJob>) => downSet(l => l.map(j => (j.id === id ? { ...j, ...patch } : j)));
const dropDown = (id: string) => downSet(l => l.filter(j => j.id !== id));
const downCtl = new Map<string, AbortController>();
const cancelDown = (id: string) => { downCtl.get(id)?.abort(); downCtl.delete(id); dropDown(id); };

type SaveStream = { write: (c: Uint8Array) => Promise<void>; close: () => Promise<void>; abort: () => Promise<void> };
const DIRECT_SAVE_MB = 150;   // desktop: above this, stream straight to disk (no memory limit)
const MEMORY_SAVE_MB = 800;   // other browsers: above this, hand the link to the browser's own download manager

// Saves a file to the device (works for private signed links too).
async function downloadFile(url: string, filename: string) {
  const id = crypto.randomUUID();
  const ctl = new AbortController();
  downCtl.set(id, ctl);
  downSet(l => [...l, { id, name: filename, pct: 0, got: 0, total: 0, status: 'run' }]);
  let sink: SaveStream | null = null;
  let handoff = false;
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    const total = Number(res.headers.get('content-length') || 0);
    downPatch(id, { total });
    const picker = (window as unknown as { showSaveFilePicker?: (o: { suggestedName: string }) => Promise<{ createWritable: () => Promise<SaveStream> }> }).showSaveFilePicker;
    if (picker && total > DIRECT_SAVE_MB * 1024 * 1024) {
      try { sink = await (await picker({ suggestedName: filename })).createWritable(); }
      catch (e) { if ((e as { name?: string })?.name === 'AbortError') { ctl.abort(); dropDown(id); return; } sink = null; }
    }
    if (!sink && total > MEMORY_SAVE_MB * 1024 * 1024) {
      handoff = true; ctl.abort();
      window.open(url, '_blank');
      downPatch(id, { pct: 100, status: 'done', note: 'اتفتح في تحميلات المتصفح' });
      return;
    }
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let blob: Blob | null = null;
    if (!reader) blob = await res.blob();
    else {
      let got = 0; let last = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        got += value.length;
        if (sink) await sink.write(value); else chunks.push(value);
        const now = performance.now();
        if (now - last > 150) { last = now; downPatch(id, { got, pct: total > 0 ? Math.min(99, Math.round((got / total) * 100)) : 0 }); }
      }
      downPatch(id, { got });
    }
    if (sink) { await sink.close(); sink = null; }
    else {
      const blobUrl = URL.createObjectURL(blob ?? new Blob(chunks as BlobPart[], { type: res.headers.get('content-type') || 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    }
    downPatch(id, { pct: 100, status: 'done' });
  } catch (e) {
    if (sink) void sink.abort().catch(() => undefined);
    if (ctl.signal.aborted && !handoff) return; // cancelled by the user: already removed from the list
    console.error(e);
    downPatch(id, { status: 'fail', note: 'اتفتح في المتصفح' });
    window.open(url, '_blank');
  } finally {
    downCtl.delete(id);
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
    <div dir={DIR} className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 p-4 text-center text-gray-300">
      <img src={LOGO_URL} alt="" className="w-16 h-16 rounded-2xl" />
      <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">KIX</h1>
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
// Always-visible transfer bar (every screen): uploads and downloads with %, cancel, and a confirmation when done.
let openFilesTab = false;
function GlobalUploadBar({ onOpen }: { onOpen: () => void }) {
  const jobs = useSyncExternalStore(pubSubscribe, pubSnapshot);
  const downs = useSyncExternalStore(downSubscribe, downSnapshot);
  const running = jobs.some(j => j.status === 'run') || downs.some(j => j.status === 'run');
  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [running]);
  useEffect(() => {
    const ids = jobs.filter(j => j.status === 'done').map(j => j.id);
    const dids = downs.filter(j => j.status === 'done' && !j.barHidden).map(j => j.id);
    if (ids.length === 0 && dids.length === 0) return;
    const h = window.setTimeout(() => { ids.forEach(dropJob); dids.forEach(i => downPatch(i, { barHidden: true })); }, 5000);
    return () => window.clearTimeout(h);
  }, [jobs, downs]);
  type Row = { id: string; down: boolean; label: string; sub: string; pct: number | null; status: 'run' | 'done' | 'fail'; cancel: () => void; close: () => void };
  const rows: Row[] = [
    ...downs.filter(j => !j.barHidden).map<Row>(j => ({ id: j.id, down: true, label: j.name, sub: j.note ?? (j.total ? `${formatBytes(j.got)} / ${formatBytes(j.total)}` : j.got ? formatBytes(j.got) : ''), pct: j.total ? j.pct : null, status: j.status, cancel: () => cancelDown(j.id), close: () => downPatch(j.id, { barHidden: true }) })),
    ...jobs.map<Row>(j => ({ id: j.id, down: false, label: j.label, sub: j.size ? formatBytes(j.size) : '', pct: Math.round(j.pct), status: j.status, cancel: () => cancelJob(j.id), close: () => dropJob(j.id) })),
  ];
  if (rows.length === 0) return null;
  return (
    <div className="fixed top-14 inset-x-0 z-50 px-3 pt-2 space-y-2 pointer-events-none">
      {rows.map(r => {
        const fail = r.status === 'fail'; const done = r.status === 'done';
        const pct = r.pct === null ? 0 : Math.max(0, Math.min(100, r.pct));
        const title = fail ? (r.down ? 'فشل التحميل' : 'فشل الرفع') : done ? (r.down ? 'تم التحميل ✓' : 'تم النشر ✓') : (r.down ? 'جاري تحميل الملف...' : 'جاري رفع الملف... لا تقفل التطبيق');
        return (
          <div key={r.id} className={`pointer-events-auto mx-auto max-w-md rounded-2xl backdrop-blur-xl border shadow-2xl px-3.5 py-2.5 ${fail ? 'bg-red-950/90 border-red-500/40 shadow-red-900/30' : done ? 'bg-gray-900/95 border-emerald-500/40' : 'bg-gray-900/95 border-white/10'}`}>
            <div className="flex items-center gap-2.5">
              <button onClick={onOpen} className="min-w-0 flex-1 text-right">
                <div className="text-[13px] text-white truncate" dir="auto">{title}{r.label ? ` · ${r.label}` : ''}</div>
                {r.sub ? <div className="text-[11px] text-gray-500" dir="auto">{r.sub}</div> : null}
              </button>
              {r.pct !== null && <span className={`tabular-nums text-sm font-bold shrink-0 ${fail ? 'text-red-400' : done ? 'text-emerald-400' : 'text-cyan-300'}`}>{fail ? '!' : `${pct}%`}</span>}
              {r.status === 'run'
                ? <button onClick={r.cancel} className="shrink-0 px-2.5 py-1 rounded-full bg-red-500/15 text-red-300 text-xs font-semibold">إلغاء</button>
                : <button onClick={r.close} aria-label="إغلاق" className="shrink-0 p-1 text-gray-500"><X size={14} /></button>}
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={r.pct === null ? undefined : pct} aria-valuemin={0} aria-valuemax={100}>
              <div className={`h-full rounded-full ${r.pct === null && !done && !fail ? 'w-1/3 animate-pulse bg-cyan-400' : `transition-all duration-300 ${fail ? 'bg-red-500' : done ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-500 to-cyan-400'}`}`} style={r.pct === null && !done && !fail ? undefined : { width: `${Math.max(4, done ? 100 : pct)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 60000);
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
      const ids = postsRef.current.slice(0, 24).map(p => p.id);
      if (ids.length === 0) return;
      try {
        const fresh = await fetchPosts({ ids, limit: 24 });
        const byId = new Map(fresh.map(p => [p.id, p] as const));
        setPosts(prev => prev.map(p => byId.get(p.id) ?? p));
      } catch (e) {
        console.error(e);
      }
    };
    let usersDirty = false;
    const schedule = (withUsers = false) => {
      if (withUsers) usersDirty = true;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { if (document.visibilityState !== 'visible') return; void refreshExisting(); if (usersDirty) { usersDirty = false; void refreshUsers(); } }, 2500);
    };
    const channel = supabase.channel('kan-live');
    for (const table of ['profiles', 'follows', 'comments', 'post_likes', 'comment_likes']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => schedule(table === 'profiles' || table === 'follows'));
    }
    channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, payload => {
      const id = (payload.old as { id?: string }).id;
      if (id) setPosts(prev => prev.filter(p => p.id !== id));
    });
    channel.subscribe();
    const onVisible = () => { if (document.visibilityState === 'visible') schedule(true); };
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
          if (document.visibilityState === 'hidden') {
            const g = ui.groups.find(x => x.id === row.group_id);
            const who = ui.users.find(x => x.id === row.sender_id)?.displayName ?? '';
            systemNotify(g?.name ?? 'مجموعة', `${who}: ${messagePreviewText(row.text, row.media_type)}`, `g-${row.group_id}`, () => navRef.current.openGroup(row.group_id), g?.avatar);
          }
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
          if (document.visibilityState === 'hidden') {
            const sender = ui.users.find(x => x.id === row.sender_id);
            systemNotify(sender?.displayName ?? 'رسالة جديدة', messagePreviewText(row.text, row.media_type), `dm-${row.sender_id}`, () => navRef.current.openChat(row.sender_id), sender?.avatar);
          }
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
  // Swipe left/right anywhere on the main screens walks through the tabs in nav order:
  // home -> reels -> create -> videos -> my profile (swipe left = next, right = back).
  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const swipeStart = (e: React.TouchEvent<HTMLElement>) => {
    const t = e.touches[0];
    const host = e.currentTarget;
    let ok = e.touches.length === 1 && !viewedUserId && screens.length === 0 && selectedChat === null && host.contains(e.target as Node);
    for (let el = e.target as HTMLElement | null; ok && el && el !== host; el = el.parentElement) {
      if (el.matches('input,textarea,select,canvas,[contenteditable="true"],[data-noswipe]')) ok = false; // sliders, text fields, drawing, trimmer keep their own drag
      else if (el.scrollWidth > el.clientWidth + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowX)) ok = false; // horizontal lists (stories, carousels)
    }
    swipeRef.current = ok ? { x: t.clientX, y: t.clientY, t: Date.now() } : null;
  };
  const swipeEnd = (e: React.TouchEvent<HTMLElement>) => {
    const s0 = swipeRef.current; swipeRef.current = null;
    if (!s0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s0.x, dy = t.clientY - s0.y;
    if (Math.abs(dx) < 90 || Math.abs(dx) < Math.abs(dy) * 2 || Date.now() - s0.t > 700) return;
    const order = ['feed', 'reels', 'create', 'videos', 'profile'] as const;
    const i = (order as readonly string[]).indexOf(activeTab);
    const next = i < 0 ? undefined : order[i + (dx < 0 ? 1 : -1)];
    if (next) goTab(next);
  };
  // Home button: already on the feed -> one tap scrolls to the top, a quick second tap refreshes it.
  const lastHomeTap = useRef(0);
  const [homeRefreshing, setHomeRefreshing] = useState(false);
  openPostHandler = (postId, commentId) => pushScreen({ k: 'post', postId, commentId });
  const [reelStart, setReelStart] = useState<string | null>(null);
  openReelHandler = id => { setReelStart(id); goTab('reels'); };
  createFromAudio = () => goTab('create');
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
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  };
  openProfileHandler = openProfile;
  // A profile always opens from its first line (the page below it may have been scrolled).
  useEffect(() => {
    if (!viewedUserId) return;
    const top = () => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    top();
    const raf = requestAnimationFrame(top);
    const t = window.setTimeout(top, 120);
    const t2 = window.setTimeout(top, 350);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(t); window.clearTimeout(t2); };
  }, [viewedUserId]);

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
    try {
      const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
      if (unreadCount > 0) void nav.setAppBadge?.(unreadCount); else void nav.clearAppBadge?.();
    } catch { /* ignore */ }
  }, [unreadCount]);
  useEffect(() => {
    const ask = () => askNotifyPermission();
    window.addEventListener('click', ask, { once: true }); // iPhone only accepts the permission prompt from a real tap
    return () => window.removeEventListener('click', ask);
  }, []);

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
    <div dir={LANG === 'en' ? 'ltr' : 'rtl'} className="min-h-screen bg-gray-950 text-white font-sans">
      <KanDialogHost />
      <AnimatePresence>{toast && <ToastBanner key={toast.id} toast={toast} onClose={() => setToast(null)} />}</AnimatePresence>
      {viewPost && <PostViewer target={viewPost} posts={posts} setPosts={setPosts} users={users} currentUser={currentUser} onOpenProfile={openProfile} onClose={popScreen} />}
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/70 backdrop-blur-xl border-b border-white/5">
        <div className="w-full px-3 min-[400px]:px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="" className="w-8 h-8 rounded-lg" />
            <h1 className="text-xl font-bold kan-gradient-text">
              KIX
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
                    { tab: 'notifications' as const, label: t('الإشعارات'), Icon: Bell, badge: notifUnread },
                    { tab: 'messages' as const, label: t('الرسائل'), Icon: MessageSquare, badge: unreadCount },
                    { tab: 'search' as const, label: t('بحث'), Icon: Search, badge: 0 },
                    { tab: 'settings' as const, label: t('الإعدادات'), Icon: Settings, badge: 0 },
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
              aria-label={menuOpen ? t('إغلاق القائمة') : t('القائمة')}
              aria-expanded={menuOpen}
              className={`relative w-10 h-10 rounded-full flex items-center justify-center border transition-all active:scale-90 ${menuOpen ? 'bg-violet-500/15 border-violet-400/30 text-violet-200' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'}`}
            >
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
              {!menuOpen && unreadCount + notifUnread > 0 && <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-gray-950" />}
            </button>
          </div>
        </div>
      </header>

      {currentUser && <PlannerReminders userId={currentUser.id} />}
      <GlobalUploadBar onOpen={() => { openFilesTab = true; window.dispatchEvent(new Event('kan-open-files')); goTab('profile'); }} />

      {storageError && (
        <div
          role="alert"
          className="fixed top-14 left-0 right-0 z-40 bg-red-600/95 text-white text-sm text-center px-4 py-2"
        >
          ⚠️ مساحة التخزين في المتصفح ممتلئة — لن يتم حفظ آخر التغييرات. احذف بعض الصور أو الفيديوهات.
        </div>
      )}

      {/* Main Content */}
      <main onTouchStart={swipeStart} onTouchEnd={swipeEnd} className="kan-enter pt-16 pb-20 w-full min-h-screen md:px-4 lg:px-8">
        <InstallBanner />
        <AnimatePresence mode="wait" initial={false}>
          {viewedUserId && (
            <motion.div key={`user-${viewedUserId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
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
            <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
              <Feed posts={posts} setPosts={setPosts} users={users} currentUser={currentUser} onOpenProfile={openProfile} frontier={feedFrontier} hasMore={feedHasMore} loading={feedLoading} newCount={newPostsCount} onRefresh={loadFeedFirst} onLoadMore={loadFeedMore} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'search' && (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
              <SearchTab
                users={users}
                posts={posts}
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
            <motion.div key="reels" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16, ease: 'easeOut' }}>
              <ReelsTab startId={reelStart} onBack={() => { setReelStart(null); goTab('feed'); }} posts={posts} setPosts={setPosts} users={users} setUsers={setUsers} currentUser={currentUser} onOpenProfile={openProfile} onCreate={() => goTab('create')} onLoadPage={loadPostsPage} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'videos' && (
            <motion.div key="videos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
              <VideosTab posts={posts} setPosts={setPosts} users={users} currentUser={currentUser} onOpenProfile={openProfile} onCreate={() => goTab('create')} onLoadPage={loadPostsPage} setUsers={setUsers} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'create' && (
            <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
              <CreatePost currentUser={currentUser} setPosts={setPosts} setActiveTab={goTab} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
              <ProfileTab currentUser={currentUser} users={users} posts={posts} setUsers={setUsers} setPosts={setPosts} onOpenProfile={openProfile} onLoadPage={loadPostsPage} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'notifications' && (
            <motion.div key="notifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
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
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
              <SettingsTab currentUser={currentUser} setUsers={setUsers} />
            </motion.div>
          )}
          {!viewedUserId && activeTab === 'messages' && (
            <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
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
              feed: { icon: Home, label: t('الرئيسية') },
              reels: { icon: Film, label: t('ريلز') },
              videos: { icon: PlayCircle, label: t('فيديوهات') },
              profile: { icon: User, label: t('حسابي') },
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
                  <Icon size={tab === 'reels' ? 31 : 24} strokeWidth={active ? 2.4 : 2} className={`${active ? 'text-cyan-300' : ''} ${tab === 'feed' && homeRefreshing ? 'animate-spin' : ''}`} />
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
                  <span className="mt-1 text-[11px] font-bold kan-gradient-text">{t('نشر')}</span>
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
    <div dir={DIR} className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="" className="w-20 h-20 mx-auto mb-3 rounded-2xl shadow-lg shadow-violet-500/20" />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            KIX
          </h1>
          <p className="text-gray-400">{t('شبكة التواصل الاجتماعي')}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setShowLogin(true); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${
                showLogin ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {t('تسجيل الدخول')}
            </button>
            <button
              onClick={() => { setShowLogin(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${
                !showLogin ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {t('حساب جديد')}
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
              <label className="text-sm text-gray-400 mb-1 block">{t('اسم المستخدم')}</label>
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
                  <label className="text-sm text-gray-400 mb-1 block">{t('الاسم المعروض')}</label>
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
              <label className="text-sm text-gray-400 mb-1 block">{t('كلمة المرور')}</label>
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
              {busy ? '...' : showLogin ? t('دخول') : t('إنشاء حساب')}
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
  const sorted = rankByInterests(posts.filter(p => p.timestamp >= frontier).sort((a, b) => b.timestamp - a.timestamp), currentUser.id);
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
    <div className="px-4 py-4 space-y-4 max-lg:px-0 max-lg:py-0 max-lg:space-y-0" style={{ transform: pull > 0 ? `translateY(${pull * 0.55}px)` : undefined, transition: dragging ? 'none' : 'transform 0.25s ease' }}>
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
        {([{ key: 'all', label: t('الكل'), Icon: LayoutGrid }, { key: 'following', label: t('المتابَعون'), Icon: Users }, { key: 'files', label: t('الملفات'), Icon: FileText }] as const).map(t => (
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
          <p className="text-gray-400 mb-2">{t('لا توجد منشورات بعد')}</p>
          <p className="text-gray-500 text-sm">
            {mode === 'following' ? 'تابع أشخاصاً لتظهر منشوراتهم هنا' : mode === 'files' ? 'لا توجد ملفات منشورة بعد. انشر أول ملف!' : 'انشر أول منشور لك!'}
          </p>
        </div>
      )}
      {displayPosts.map(post => (
        <PostCard key={post.id} post={post} setPosts={setPosts} users={users} currentUser={currentUser} onOpenProfile={onOpenProfile} />
      ))}
      <div ref={sentinel} className="h-8 flex items-center justify-center text-xs text-gray-500">
        {loading ? t('جارٍ التحميل...') : !hasMore && displayPosts.length > 0 ? t('وصلت لنهاية المنشورات') : ''}
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
              <div className="w-full h-40 flex items-center gap-3 px-4" dir={DIR}>
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
    <div dir={DIR} className="fixed inset-0 z-[125] flex flex-col bg-gray-950">
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

function MusicBar({ music, auto = false }: { music: { url: string; name: string; start?: number; end?: number }; auto?: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  const start = music.start ?? 0;
  const win = music.start !== undefined ? (music.end && music.end > start ? music.end - start : 30) : Infinity;
  const [on, setOn] = useState(false);
  useEffect(() => () => { const a = ref.current; if (a) { a.pause(); if (playingAudio === a) playingAudio = null; } }, []);
  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) {
      if (playingAudio && playingAudio !== a) playingAudio.pause();
      playingAudio = a;
      const go = () => { if (a.currentTime < start || a.currentTime >= start + win) a.currentTime = start; void a.play().catch(() => undefined); };
      if (a.readyState >= 1) go(); else { a.addEventListener('loadedmetadata', go, { once: true }); a.load(); }
    } else a.pause();
  };
  const [muted, setMuted] = useState(false);
  const holder = useRef<HTMLDivElement>(null);
  // Photo posts: the chosen 30-second part starts by itself when the post is on screen and stops when it leaves.
  useEffect(() => {
    if (!auto) return;
    const a = ref.current;
    const box = (holder.current?.closest('.post-card') as HTMLElement | null) ?? holder.current;
    if (!a || !box || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && en.intersectionRatio >= 0.5) {
        if (playingAudio && playingAudio !== a) playingAudio.pause();
        playingAudio = a;
        const go = () => { if (a.currentTime < start || a.currentTime >= start + win) a.currentTime = start; void a.play().catch(() => undefined); };
        if (a.readyState >= 1) go(); else { a.addEventListener('loadedmetadata', go, { once: true }); a.load(); }
      } else { a.pause(); }
    }, { threshold: [0, 0.5, 1] });
    io.observe(box);
    const hide = () => { if (document.hidden) a.pause(); };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', () => a.pause());
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', hide); a.pause(); if (playingAudio === a) playingAudio = null; };
  }, [auto, start, win]);
  if (auto) {
    return (
      <div ref={holder} className="absolute top-2 left-2 z-10" onClick={e => e.stopPropagation()}>
        <audio ref={ref} src={music.url} preload="none" muted={muted} onPlay={() => setOn(true)} onPause={() => setOn(false)} onTimeUpdate={e => { const a = e.currentTarget; if (a.currentTime >= start + win) a.currentTime = start; }} onEnded={e => { const a = e.currentTarget; a.currentTime = start; void a.play().catch(() => undefined); }} />
        <div className="flex items-center gap-1.5">
          <button onClick={() => setMuted(m => !m)} aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'} className="w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center opacity-70 active:scale-90">
            {muted || !on ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <SaveClipButton clip={{ url: music.url, name: music.name, start: music.start, end: music.end }} className="w-7 h-7 bg-black/40" />
        </div>
      </div>
    );
  }
  return (
    <div className="px-4 pb-3" onClick={e => e.stopPropagation()}>
      <audio ref={ref} src={music.url} preload="none" onPlay={() => setOn(true)} onPause={() => setOn(false)} onTimeUpdate={e => { const a = e.currentTarget; if (a.currentTime >= start + win) a.currentTime = start; }} onEnded={e => { const a = e.currentTarget; a.currentTime = start; void a.play().catch(() => undefined); }} />
      <div className="flex items-center gap-2">
      <button onClick={toggle} className="flex-1 min-w-0 flex items-center gap-3 p-2.5 rounded-2xl bg-gradient-to-r from-violet-600/20 to-cyan-500/15 border border-violet-400/25 active:scale-[0.99] transition-transform text-right">
        <span className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-white">{on ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="translate-x-px" />}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-white truncate" dir="auto">{music.name}</span>
          <span className="flex items-center gap-1 text-[11px] text-cyan-300"><Music size={12} /> موسيقى</span>
        </span>
        <span className="flex items-end gap-0.5 h-5 shrink-0" aria-hidden>
          {[0, 1, 2, 3].map(i => (
            <motion.span key={i} className="w-1 rounded-full bg-cyan-300" animate={{ height: on ? [4, 18, 7, 14, 4] : 4 }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.12 }} style={{ height: 4 }} />
          ))}
        </span>
      </button>
      <SaveClipButton clip={{ url: music.url, name: music.name, start: music.start, end: music.end }} className="w-10 h-10 bg-white/10" />
      </div>
    </div>
  );
}

function CommentText({ text, cls }: { text: string; cls: string }) {
  const m = /^\[\[sticker:(https?:\/\/[^\]\s]+)\]\]$/.exec(text.trim());
  if (m) return <img src={m[1]} alt="" draggable={false} loading="lazy" className="w-28 h-28 object-contain" />;
  return <p className={cls}>{text}</p>;
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
  const [cEmoji, setCEmoji] = useState<string | null>(null); // 'main' or a comment id (reply box)
  const [shareOpen, setShareOpen] = useState(false);
  const [shareComment, setShareComment] = useState<{ id: string; text: string; authorName: string } | null>(null);
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

  // A sticker in a comment is a small image kept in storage; the comment text is a marker the app draws as the sticker.
  const sendCommentSticker = async (st: SavedSticker, parentId: string | null) => {
    setCEmoji(null);
    if (st.kind !== 'image') { window.alert('الملصقات المتحركة غير مدعومة في التعليقات'); return; }
    const path = `${me}/cs-${crypto.randomUUID()}.${stkExt(st.blob, st.kind)}`;
    const { error: upErr } = await supabase.storage.from(POST_MEDIA_BUCKET).upload(path, st.blob, { contentType: st.blob.type || 'image/webp', cacheControl: '31536000' });
    if (upErr) { console.error(upErr); window.alert('تعذّر إرسال الملصق'); return; }
    const marker = `[[sticker:${kanPublicUrl(POST_MEDIA_BUCKET, path)}]]`;
    if (parentId) await addReply(parentId, marker); else await addComment(marker);
  };

  const addComment = async (override?: string) => {
    const text = (override ?? commentText).trim();
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

  const addReply = async (commentId: string, override?: string) => {
    const text = (override ?? replyText).trim();
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
    const was = post.comments.some(c => (c.id === commentId ? c.likes.includes(me) : c.replies.some(r => r.id === commentId && r.likes.includes(me))));
    const apply = (on: boolean) =>
      mutatePost(p => ({
        ...p,
        comments: p.comments.map(c => ({
          ...c,
          likes: c.id === commentId ? setIn(c.likes, on) : c.likes,
          replies: c.replies.map(r => (r.id === commentId ? { ...r, likes: setIn(r.likes, on) } : r)),
        })),
      }));
    apply(!was);
    const { error } = was
      ? await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', me)
      : await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: me });
    if (error) apply(was);
  };

  const deleteComment = async (commentId: string) => {
    if (!(await kanConfirm('حذف هذا التعليق؟'))) return;
    const snapshot = post.comments;
    mutatePost(p => ({ ...p, comments: p.comments.filter(c => c.id !== commentId) }));
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
      mutatePost(p => ({ ...p, comments: snapshot }));
      window.alert('تعذّر حذف التعليق، حاول مرة أخرى');
    }
  };

  const deleteReply = async (commentId: string, replyId: string) => {
    if (!(await kanConfirm('حذف هذا الرد؟'))) return;
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

  // Double tap anywhere on the post content: like it and show the KIX coin.
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

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }} className="post-card bg-gray-900 border border-gray-800 rounded-2xl max-lg:bg-transparent max-lg:border-x-0 max-lg:border-t-0 max-lg:rounded-none overflow-hidden [contain:layout_paint] [content-visibility:auto] [contain-intrinsic-size:auto_420px]">
      <div className="p-4 flex items-center gap-3">
        <button onClick={() => onOpenProfile(author.id)} className="flex items-center gap-3 flex-1 min-w-0 text-right">
          <Avatar userId={author.id} src={author.avatar} name={author.displayName} size="md" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white truncate hover:underline">{author.displayName}</div>
            <div className="text-xs text-gray-500">@{author.username} · {formatTime(post.timestamp)}</div>
          </div>
        </button>
        <PostMenu post={post} author={author} currentUser={currentUser} setPosts={setPosts} saved={isBookmarked} onToggleSave={() => void toggleBookmark()} />
      </div>

      <div onClick={() => handleContentTap()} className="relative select-none touch-manipulation">
        {coinId > 0 && <CoinBurst key={coinId} />}
        {(post.title || post.isReel) && (
          <div className="px-4 pb-2 flex items-center gap-2">
            {post.isReel && <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-[11px] font-medium">🎬 ريل</span>}
            {post.title && <h3 className="text-white font-bold leading-snug">{post.title}</h3>}
          </div>
        )}
        {post.music && <MusicBar music={post.music} auto={post.media?.type === 'image'} />}
        {post.text && (
          <div className="px-4 pb-3">
            <p className="text-white text-[16px] leading-7 whitespace-pre-wrap">{post.text}</p>
          </div>
        )}

        {post.media && post.extraMedia && post.extraMedia.length > 0 && (
          <div className="px-4 pb-3 max-lg:px-0">
            <PostCarousel items={[post.media, ...post.extraMedia]} poster={post.coverUrl} onTap={open => handleContentTap(open)} />
            <DownloadAllButton post={post} />
          </div>
        )}
        {post.media && !(post.extraMedia && post.extraMedia.length > 0) && (
          <div className={`pb-3 ${post.media.type === 'image' || post.media.type === 'video' ? 'px-4 max-lg:px-0' : 'px-4'}`}>
            {post.media.type === 'image' ? (
              <div className="relative">
                <img
                  src={post.media.url}
                  alt=""
                  onClick={e => { e.stopPropagation(); handleContentTap(() => setViewer({ src: post.media!.url, name: post.media!.name })); }}
                  className="w-full h-auto rounded-xl max-lg:rounded-none lg:max-h-96 lg:object-cover cursor-zoom-in"
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
              post.isReel ? (
                <button onClick={e => { e.stopPropagation(); openReel(post.id); }} className="relative block mx-auto w-full max-w-xs aspect-[9/16] max-h-[75vh] rounded-xl overflow-hidden bg-black active:scale-[0.985] transition-transform" aria-label="فتح الريل">
                  {post.coverUrl
                    ? <img src={post.coverUrl} alt="" className="w-full h-full object-cover pointer-events-none" />
                    : <video src={`${post.media.url}#t=0.5`} preload="metadata" muted playsInline className="w-full h-full object-cover pointer-events-none" />}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20"><span className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-600/90 to-cyan-500/90 flex items-center justify-center shadow-lg"><Play size={26} className="text-white" fill="white" /></span></span>
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-[11px]">🎬 ريل</span>
                </button>
              ) : (
              <VideoPlayer
                src={post.media.url}
                poster={post.coverUrl}
                className="w-full max-h-[75vh]"
              />
              )
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

      {showComments && <ReelComments post={post} users={users} currentUser={currentUser} setPosts={setPosts} onOpenProfile={onOpenProfile} onClose={() => setShowComments(false)} />}
      {listModal && (
        <UserListModal title={listModal.title} userIds={listModal.ids} users={users} onOpenProfile={onOpenProfile} onClose={() => setListModal(null)} />
      )}
      {viewer && <ImageViewer src={viewer.src} name={viewer.name} onClose={() => setViewer(null)} />}
      {cEmoji && createPortal(
        <div dir={DIR} className="fixed inset-x-0 bottom-0 z-[140] bg-gray-900 border-t border-white/10">
          <EmojiPicker
            docked
            onPick={em => (cEmoji === 'main' ? setCommentText(t => t + em) : setReplyText(t => t + em))}
            onClose={() => setCEmoji(null)}
            onSticker={st => { void sendCommentSticker(st, cEmoji === 'main' ? null : cEmoji); }}
          />
        </div>,
        document.body,
      )}
    </motion.div>
  );
}

// ============ Post menu (three dots): my post -> edit / delete; someone else's -> use audio / save / report ============
const swallow = (e: React.SyntheticEvent) => e.stopPropagation();
const swallowProps = { onClick: swallow, onPointerDown: swallow, onPointerUp: swallow, onPointerCancel: swallow, onPointerLeave: swallow };
const rawUrl = (u: string) => { const p = pathOfUrl(u); return p && p.startsWith('b2/') ? kanPublicUrl(POST_MEDIA_BUCKET, p) : u; };

function startReelWithAudio(post: Post, authorName: string) {
  const src = post.music?.url ?? post.media?.url;
  if (!src) return;
  pendingAudio = { url: rawUrl(src), name: (post.music?.name ?? `${t('الصوت الأصلي')} · ${authorName}`).slice(0, 80) };
  createFromAudio();
}

async function deleteMyPost(post: Post, setPosts: React.Dispatch<React.SetStateAction<Post[]>>) {
  setPosts(prev => prev.filter(p => p.id !== post.id));
  const { error } = await supabase.from('posts').delete().eq('id', post.id);
  if (error) { setPosts(prev => [post, ...prev]); window.alert('تعذّر حذف المنشور، حاول مرة أخرى'); return; }
  const paths = [post.media?.url, ...(post.extraMedia ?? []).map(x => x.url)].map(u => (u ? mediaPath(u) : null)).filter((x): x is string => !!x);
  if (paths.length) void kanRemove(POST_MEDIA_BUCKET, paths);
}

function MenuRow({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-base active:bg-white/10 ${danger ? 'text-red-400' : 'text-white'}`}>
      {icon}<span>{label}</span>
    </button>
  );
}

function ReportSheet({ post, me, onClose }: { post: Post; me: string; onClose: () => void }) {
  useBackLayer(true, onClose);
  const [reason, setReason] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'fail'>('idle');
  const send = async () => {
    const msg = reason.trim();
    if (!msg || state === 'busy') return;
    setState('busy');
    const { error } = await supabase.from('reports').insert({ post_id: post.id, reporter_id: me, reason: msg.slice(0, 500) });
    if (error && error.code !== '23505') { console.error(error); setState('fail'); return; }
    setState('done');
    window.setTimeout(onClose, 1200);
  };
  return createPortal(
    <div dir={DIR} {...swallowProps} className="fixed inset-0 z-[160] bg-black/60 flex items-end justify-center" onClick={e => { e.stopPropagation(); onClose(); }}>
      <div className="kan-theme-text w-full max-w-md bg-gray-900 rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={swallow}>
        {state === 'done' ? (
          <div className="py-8 flex flex-col items-center gap-2 text-white"><Check size={30} className="text-emerald-300" /><span className="font-bold">تم الإبلاغ</span></div>
        ) : (
          <>
            <h3 className="font-bold text-white mb-3">إبلاغ عن المنشور</h3>
            <textarea value={reason} onChange={e => setReason(e.target.value.slice(0, 500))} rows={4} autoFocus placeholder="اكتب سبب البلاغ"
              className="w-full px-3 py-2.5 bg-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none" />
            {state === 'fail' && <p className="text-red-400 text-sm mt-2">تعذّر إرسال البلاغ، حاول مرة أخرى</p>}
            <div className="flex gap-2 mt-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-200 text-sm">إلغاء</button>
              <button onClick={() => void send()} disabled={!reason.trim() || state === 'busy'} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-medium disabled:opacity-50">إرسال البلاغ</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function EditPostSheet({ post, setPosts, onClose }: { post: Post; setPosts: React.Dispatch<React.SetStateAction<Post[]>>; onClose: () => void }) {
  useBackLayer(true, onClose);
  type EditItem = { type: 'image' | 'video' | 'file'; url: string; name?: string; size?: number };
  const original: EditItem[] = [...(post.media ? [post.media] : []), ...(post.extraMedia ?? [])];
  const hasTitle = post.title !== undefined;
  const locked = !!(post.isReel || post.isVideo); // a reel or a video post keeps its video
  const [title, setTitle] = useState(post.title ?? '');
  const [text, setText] = useState(post.text);
  const [items, setItems] = useState<EditItem[]>(original);
  const [music, setMusic] = useState<{ url: string; name: string } | null>(post.music ?? null);
  const [newMusic, setNewMusic] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const musicRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    if (busy) return;
    if (!text.trim() && items.length === 0 && !music && !newMusic) { setErr('لا يمكن ترك المنشور فارغاً'); return; }
    setBusy(true); setErr('');
    let uploadedPath: string | null = null;
    try {
      const { data: row } = await supabase.from('posts').select('media_extra').eq('id', post.id).maybeSingle();
      const rows = Array.isArray(row?.media_extra) ? (row!.media_extra as PubExtra[]) : [];
      const oldRow = rows.find(x => (x.name ?? '').startsWith('kan-music|'));
      let musicItem: PubExtra | null = null;
      if (newMusic) {
        const mp = musicPath(`${post.userId}/${crypto.randomUUID()}-music.${safeExt(newMusic.name)}`, newMusic.size);
        const { error: upErr } = await uploadWithProgress(POST_MEDIA_BUCKET, mp, newMusic, newMusic.type || 'audio/mpeg', '31536000');
        if (upErr) throw upErr;
        uploadedPath = mp;
        musicItem = { type: 'file', url: kanPublicUrl(POST_MEDIA_BUCKET, mp), name: `kan-music|${newMusic.name.replace(/\.[^.]+$/, '').slice(0, 80)}`, size: newMusic.size };
      } else if (music) {
        musicItem = oldRow ?? { type: 'file', url: rawUrl(music.url), name: `kan-music|${music.name}`, size: 0, start: music.start, end: music.end };
      }
      const kept = items.map(it => ({ ...it, url: rawUrl(it.url) }));
      const [main, ...rest] = kept;
      const extraRows = rest.map(x => ({ type: x.type, url: x.url, name: (x.name ?? '').slice(0, 200), size: x.size ?? 0 }));
      const newTitle = title.trim().slice(0, 120);
      const patch = {
        text: text.trim(),
        ...(hasTitle ? { title: newTitle || null } : {}),
        media_url: main ? main.url : null,
        media_type: main ? main.type : null,
        media_name: main ? (main.name ?? '').slice(0, 200) : null,
        media_size: main ? (main.size ?? 0) : null,
        media_extra: musicItem ? [...extraRows, musicItem] : extraRows,
      };
      const { error } = await supabase.from('posts').update(patch).eq('id', post.id);
      if (error) throw error;
      const keptSet = new Set(kept.map(k => k.url));
      const gone = original.map(i => rawUrl(i.url)).filter(u => !keptSet.has(u)).map(u => pathOfUrl(u)).filter((x): x is string => !!x);
      if (oldRow && oldRow !== musicItem && oldRow.size > 0) { const op = pathOfUrl(oldRow.url); if (op) gone.push(op); }
      if (gone.length) void kanRemove(POST_MEDIA_BUCKET, gone);
      const base: Post = {
        ...post,
        text: patch.text,
        title: hasTitle ? (newTitle || undefined) : post.title,
        media: main ? { type: main.type, url: main.url, name: main.name, size: main.size } : undefined,
        extraMedia: rest.length ? rest.map(x => ({ type: x.type, url: x.url, name: x.name, size: x.size })) : undefined,
        music: musicItem ? { url: musicItem.url, name: musicItem.name.slice(10), start: musicItem.start, end: musicItem.end, vv: musicItem.vv, mv: musicItem.mv } : undefined,
      };
      const [shown] = await signPostsMedia([base]);
      setPosts(prev => prev.map(p => (p.id === post.id ? shown : p)));
      onClose();
    } catch (e) {
      console.error(e);
      if (uploadedPath) void kanRemove(POST_MEDIA_BUCKET, [uploadedPath]);
      setErr('تعذّر حفظ التعديل، حاول مرة أخرى');
      setBusy(false);
    }
  };

  return createPortal(
    <div dir={DIR} {...swallowProps} className="fixed inset-0 z-[160] bg-black/60 flex items-end justify-center" onClick={e => { e.stopPropagation(); onClose(); }}>
      <div className="kan-theme-text w-full max-w-md max-h-[88vh] overflow-y-auto bg-gray-900 rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={swallow}>
        <h3 className="font-bold text-white mb-3">تعديل المنشور</h3>
        {hasTitle && <input value={title} onChange={e => setTitle(e.target.value.slice(0, 120))} placeholder="عنوان الفيديو" className="w-full px-3 py-2.5 mb-2 bg-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500" />}
        <textarea value={text} onChange={e => setText(e.target.value.slice(0, 2000))} rows={4} placeholder="النص" dir="auto"
          className="w-full px-3 py-2.5 bg-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none" />
        {items.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-gray-400 mb-1.5">الملفات ({items.length}) · احذف ما تريد منها</div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {items.map((it, i) => (
                <div key={`${it.url}-${i}`} className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
                  {it.type === 'image' ? <img src={it.url} alt="" className="w-full h-full object-cover" /> : it.type === 'video' ? <Play size={22} className="text-white" fill="white" /> : <FileText size={24} className="text-cyan-300" />}
                  {!(locked && i === 0) && (
                    <button onClick={() => setItems(prev => prev.filter((_, k) => k !== i))} className="absolute top-1 left-1 p-1 rounded-full bg-black/70 text-white" aria-label="حذف هذا الملف"><X size={12} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-gray-800/60">
          <Music size={16} className="text-fuchsia-300 shrink-0" />
          <span className="flex-1 min-w-0 truncate text-sm text-gray-200" dir="auto">{newMusic ? newMusic.name : music ? music.name : 'بدون موسيقى'}</span>
          <input ref={musicRef} type="file" accept="audio/*" className="hidden" onChange={e => {
            const f = e.target.files?.[0]; e.target.value = '';
            if (!f) return;
            if (!f.type.startsWith('audio/') && !/\.(mp3|m4a|aac|wav|ogg|opus|flac)$/i.test(f.name)) { setErr('اختر ملفاً صوتياً'); return; }
            setErr(''); setNewMusic(f); setMusic(null);
          }} />
          <button onClick={() => musicRef.current?.click()} className="px-3 py-1.5 rounded-full bg-gray-900 text-xs text-fuchsia-300">{newMusic || music ? 'تغيير' : 'من الجهاز'}</button>
          {(newMusic || music) && <button onClick={() => { setNewMusic(null); setMusic(null); }} className="p-1 text-gray-400 hover:text-red-400" aria-label="حذف الموسيقى"><X size={14} /></button>}
        </div>
        {err && <p className="text-red-400 text-sm mt-2">{err}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-200 text-sm">إلغاء</button>
          <button onClick={() => void save()} disabled={busy} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-medium disabled:opacity-60">{busy ? 'جارٍ الحفظ...' : 'حفظ'}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PostMenu({ post, author, currentUser, setPosts, saved, onToggleSave, dark = false }: {
  post: Post; author: User; currentUser: User;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  saved: boolean; onToggleSave: () => void; dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<'edit' | 'report' | null>(null);
  const mine = post.userId === currentUser.id;
  const hasAudio = !!post.music || post.media?.type === 'video';
  const pick = (fn: () => void) => () => { setOpen(false); fn(); };
  return (
    <>
      <button onClick={e => { e.stopPropagation(); setOpen(true); }} onPointerDown={swallow}
        className={dark ? 'p-1.5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] active:scale-90' : 'p-2 text-gray-500 hover:text-white transition-colors'} aria-label="المزيد">
        <MoreHorizontal size={dark ? 24 : 20} />
      </button>
      {open && createPortal(
        <div dir={DIR} {...swallowProps} className="fixed inset-0 z-[150] bg-black/50 flex items-end justify-center" onClick={e => { e.stopPropagation(); setOpen(false); }}>
          <div className="kan-theme-text w-full max-w-md bg-gray-900 rounded-t-2xl p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]" onClick={swallow}>
            {mine ? (
              <>
                <MenuRow icon={<Pencil size={20} />} label="تعديل" onClick={pick(() => setSheet('edit'))} />
                <MenuRow icon={<Trash2 size={20} />} label="حذف" danger onClick={pick(async () => { if (await kanConfirm('حذف المنشور كله؟ لحذف ملف واحد منه اختر تعديل.')) void deleteMyPost(post, setPosts); })} />
              </>
            ) : (
              <>
                <MenuRow icon={<BookmarkIcon size={20} className={saved ? 'fill-yellow-400 text-yellow-400' : ''} />} label={saved ? 'إلغاء الحفظ' : 'حفظ'} onClick={pick(onToggleSave)} />
                <MenuRow icon={<Flag size={20} />} label="إبلاغ" danger onClick={pick(() => setSheet('report'))} />
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
      {sheet === 'edit' && <EditPostSheet post={post} setPosts={setPosts} onClose={() => setSheet(null)} />}
      {sheet === 'report' && <ReportSheet post={post} me={currentUser.id} onClose={() => setSheet(null)} />}
    </>
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

function ReelMusic({ music, videoRef, muted }: { music: { url: string; start?: number; end?: number; vv?: number; mv?: number }; videoRef: React.RefObject<HTMLVideoElement | null>; muted: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  const start = music.start ?? 0;
  const end = music.end && music.end > start ? music.end : start + 30;
  useEffect(() => {
    const v = videoRef.current; const a = ref.current;
    if (!v || !a) return;
    a.volume = music.mv ?? 0.85;
    v.volume = music.vv ?? 1;
    v.muted = muted || music.vv === 0;
    const go = () => { if (a.currentTime < start || a.currentTime >= end) a.currentTime = start; void a.play().catch(() => undefined); };
    const stop = () => a.pause();
    const tick = () => { if (a.currentTime >= end) a.currentTime = start; };
    v.addEventListener('play', go); v.addEventListener('pause', stop); v.addEventListener('ended', stop);
    a.addEventListener('timeupdate', tick);
    if (!v.paused) go();
    return () => { v.removeEventListener('play', go); v.removeEventListener('pause', stop); v.removeEventListener('ended', stop); a.removeEventListener('timeupdate', tick); a.pause(); };
  }, [videoRef, start, end, music.url, music.vv, music.mv, muted]);
  return <audio ref={ref} src={music.url} preload="auto" muted={muted || music.mv === 0} />;
}

function ReelItem({ post, author, users, setUsers, currentUser, muted, onToggleMute, setPosts, onOpenProfile, onOpenComments, onShowLikes, autoNext, onNext }: {
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
  autoNext?: boolean;
  onNext?: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [boost, setBoost] = useState(false);
  const holdTimer = useRef<number | undefined>(undefined);
  const holdPause = useRef(false);
  const held = useRef(false);
  const [prog, setProg] = useState(0);
  const [dur, setDur] = useState(0);
  const [scrub, setScrub] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [near, setNear] = useState(false);
  const activeRef = useRef(false);
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
  const isSaved = post.bookmarks.includes(currentUser.id);
  const toggleSave = async () => {
    const me = currentUser.id;
    const was = isSaved;
    const apply = (on: boolean) => setPosts(prev => prev.map(p => (p.id === post.id ? { ...p, bookmarks: on ? [...p.bookmarks.filter(i => i !== me), me] : p.bookmarks.filter(i => i !== me) } : p)));
    apply(!was);
    const { error } = was
      ? await supabase.from('bookmarks').delete().eq('post_id', post.id).eq('user_id', me)
      : await supabase.from('bookmarks').insert({ post_id: post.id, user_id: me });
    if (error) apply(was);
  };

  // Play only the reel that is on screen.
  useEffect(() => {
    const box = boxRef.current;
    const video = videoRef.current;
    if (!box || !video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        activeRef.current = true;
        setPaused(false);
        void video.play().catch(() => undefined);
      } else {
        activeRef.current = false;
        video.pause();
        video.currentTime = 0;
      }
    }, { threshold: [0, 0.6, 1] });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // Only reels near the screen keep their video loaded: less memory, smoother swiping.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const io = new IntersectionObserver(([en]) => setNear(en.isIntersecting), { rootMargin: '120% 0px' });
    io.observe(box);
    return () => io.disconnect();
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { void video.play().catch(() => undefined); setPaused(false); }
    else { video.pause(); setPaused(true); }
  };
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const seekTo = (clientX: number) => {
    const bar = barRef.current, v = videoRef.current;
    if (!bar || !v || !v.duration) return;
    const r = bar.getBoundingClientRect();
    const k = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    v.currentTime = k * v.duration;
    setProg(k);
  };

  // Hold the video: 2x speed while the finger stays down.
  const startHold = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget && (e.target as HTMLElement).tagName !== 'VIDEO') return;
    held.current = false;
    window.clearTimeout(holdTimer.current);
    const r = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    const center = fx > 0.25 && fx < 0.75 && fy > 0.2 && fy < 0.8;
    holdTimer.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (!v || v.paused) return;
      held.current = true;
      if (center) { holdPause.current = true; v.pause(); } else { v.playbackRate = 2; setBoost(true); }
    }, center ? 220 : 350);
  };
  const endHold = () => {
    window.clearTimeout(holdTimer.current);
    const v = videoRef.current;
    if (v) { v.playbackRate = 1; if (holdPause.current) { holdPause.current = false; void v.play().catch(() => undefined); } }
    setBoost(false);
  };

  // One tap: pause / play. Double tap: love it. Hold: 2x.
  const handleTap = () => {
    if (held.current) { held.current = false; return; }
    const now = Date.now();
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      window.clearTimeout(tapTimer.current);
      setCoinId(n => n + 1);
      window.clearTimeout(coinTimer.current);
      coinTimer.current = window.setTimeout(() => setCoinId(0), 1200);
      if (!isLiked) togglePostLike(post, currentUser.id, setPosts);
      return;
    }
    lastTap.current = now;
    window.clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(togglePlay, 320);
  };

  const audioName = post.music?.name ?? `${t('الصوت الأصلي')} · ${author.displayName}`;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div ref={boxRef} className="relative h-full w-full snap-start snap-always bg-black overflow-hidden select-none touch-manipulation" onClick={handleTap}
      onPointerDown={startHold} onPointerUp={endHold} onPointerLeave={endHold} onPointerCancel={endHold} onContextMenu={e => e.preventDefault()}>
      {post.music && near && <ReelMusic music={post.music} videoRef={videoRef} muted={muted} />}
      <video
        ref={videoRef}
        src={near ? post.media?.url : undefined}
        className={`absolute inset-0 w-full h-full ${landscape ? 'object-contain' : 'object-cover md:object-contain'}`}
        onLoadedMetadata={e => { if (activeRef.current) void e.currentTarget.play().catch(() => undefined); setLandscape(e.currentTarget.videoWidth > e.currentTarget.videoHeight); setDur(e.currentTarget.duration || 0); }}
        onTimeUpdate={e => { const v = e.currentTarget; if (!scrub && v.duration) setProg(v.currentTime / v.duration); }}
        loop={!autoNext}
        onEnded={() => { if (autoNext) onNext?.(); }}
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/35 pointer-events-none" />
      {coinId > 0 && <CoinBurst key={coinId} />}

      {boost && <div className="absolute top-[max(4rem,calc(env(safe-area-inset-top)+3.25rem))] inset-x-0 flex justify-center pointer-events-none z-30"><span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur text-white text-sm font-bold">2x</span></div>}
      {paused && !failed && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          <span className="w-16 h-16 rounded-full bg-white/25 backdrop-blur-md ring-1 ring-white/40 shadow-2xl flex items-center justify-center text-white">
            <Pause size={26} fill="white" strokeWidth={0} />
          </span>
          <button onClick={e => { e.stopPropagation(); onToggleMute(); }} onPointerDown={stop}
            className="mt-4 w-10 h-10 rounded-full bg-black/55 backdrop-blur ring-1 ring-white/20 text-white flex items-center justify-center pointer-events-auto active:scale-90"
            aria-label={muted ? t('تشغيل الصوت') : t('كتم الصوت')}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      )}

      {/* Side actions */}
      <div className="absolute end-3 bottom-[calc(env(safe-area-inset-bottom)+2rem)] flex flex-col items-center gap-3 z-20" onClick={stop} onPointerDown={stop}>
        <div className="flex flex-col items-center">
          <button onClick={() => togglePostLike(post, currentUser.id, setPosts)} className={`p-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] active:scale-90 ${isLiked ? 'text-red-400' : 'text-white'}`} aria-label={t('إعجاب')}>
            <Heart size={24} className={isLiked ? 'fill-red-400' : ''} />
          </button>
          {post.likes.length > 0 && (
            <button onClick={onShowLikes} className="text-[11px] text-white font-semibold drop-shadow">{post.likes.length}</button>
          )}
        </div>
        <div className="flex flex-col items-center">
          <button onClick={onOpenComments} className="p-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] text-white active:scale-90" aria-label={t('التعليقات')}>
            <MessageCircle size={24} />
          </button>
          {commentCount > 0 && <span className="text-[11px] text-white font-semibold drop-shadow">{commentCount}</span>}
        </div>
        <button onClick={() => setShareOpen(true)} className="p-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] text-white active:scale-90" aria-label={t('مشاركة')}>
          <Share2 size={23} />
        </button>
        <PostMenu post={post} author={author} currentUser={currentUser} setPosts={setPosts} saved={isSaved} onToggleSave={() => void toggleSave()} dark />
      </div>

      {/* Author + caption */}
      <div className="absolute start-4 end-16 bottom-[calc(env(safe-area-inset-bottom)+2rem)] text-start z-20" onClick={stop} onPointerDown={stop}>
        <div className="flex items-center gap-2 mb-1.5">
          <button onClick={() => onOpenProfile(author.id)} className="flex items-center gap-2 min-w-0">
            <Avatar userId={author.id} src={author.avatar} name={author.displayName} size="md" />
            <span className="text-white font-extrabold text-base truncate max-w-[11rem] drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">{author.displayName}</span>
          </button>
          {author.id !== currentUser.id && (
            <button
              onClick={() => toggleFollow(author.id)}
              className={`shrink-0 px-5 py-2 rounded-full text-sm font-extrabold active:scale-95 transition-all ${isFollowing ? 'bg-white/15 text-white border border-white/25' : 'bg-white/25 border border-white/40 text-white'}`}
            >
              {isFollowing ? t('متابَع') : t('متابعة')}
            </button>
          )}
        </div>
        {post.text && <p className="text-white text-sm leading-snug line-clamp-2 whitespace-pre-wrap" dir="auto">{post.text}</p>}
        <div className="mt-1.5 flex items-center gap-1.5 text-white/80 text-xs max-w-full"><Music size={12} className="shrink-0" /><span className="truncate" dir="auto">{audioName}</span>{(post.music?.url ?? post.media?.url) && <SaveClipButton clip={{ url: post.music?.url ?? post.media!.url, name: audioName.slice(0, 80), start: post.music?.start, end: post.music?.end }} className="w-6 h-6" />}</div>
      </div>

      {/* Bottom bar: thin line while playing, full seek bar while paused */}
      <div dir="ltr" className={`absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(0.35rem,env(safe-area-inset-bottom))] ${paused ? '' : 'hidden'}`} onClick={stop} onPointerDown={stop}>
        {paused && <div className="flex justify-between text-[11px] text-white/80 font-medium mb-0.5 px-0.5"><span>{fmt(prog * dur)}</span><span>{fmt(dur)}</span></div>}
        <div ref={barRef} className={`relative flex items-center touch-none h-6 cursor-pointer`}
          onPointerDown={e => { (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId); setScrub(true); seekTo(e.clientX); }}
          onPointerMove={e => { if (scrub) seekTo(e.clientX); }}
          onPointerUp={() => setScrub(false)} onPointerCancel={() => setScrub(false)}>
          <div className={`w-full rounded-full bg-white/30 overflow-hidden ${scrub ? 'h-2' : paused ? 'h-1.5' : 'h-1'} transition-all`}>
            <div className="h-full bg-white" style={{ width: `${prog * 100}%` }} />
          </div>
          {(paused || scrub) && <div className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white shadow ${scrub ? 'w-4 h-4' : 'w-3 h-3'}`} style={{ left: `${prog * 100}%` }} />}
        </div>
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
  useEffect(() => {
    const was = Array.from(document.querySelectorAll('video')).filter(v => !v.paused);
    was.forEach(v => v.pause());
    return () => { was.forEach(v => { if (v.isConnected) void v.play().catch(() => undefined); }); };
  }, []);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ parentId: string; name: string } | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const me = currentUser.id;
  const mutate = (fn: (p: Post) => Post) => setPosts(prev => prev.map(p => (p.id === post.id ? fn(p) : p)));

  const send = async (override?: string) => {
    const body = (override ?? text).trim();
    if (!body) return;
    const id = crypto.randomUUID();
    const parentId = replyTo?.parentId ?? null;
    if (parentId) {
      const reply: Reply = { id, userId: me, text: body, timestamp: Date.now(), likes: [] };
      mutate(p => ({ ...p, comments: p.comments.map(c => (c.id === parentId ? { ...c, replies: [...c.replies, reply] } : c)) }));
    } else {
      const comment: Comment = { id, userId: me, text: body, timestamp: Date.now(), likes: [], replies: [] };
      mutate(p => ({ ...p, comments: [...p.comments, comment] }));
    }
    if (override === undefined) setText('');
    setReplyTo(null);
    const { error } = await supabase.from('comments').insert(parentId
      ? { id, post_id: post.id, parent_id: parentId, user_id: me, text: body }
      : { id, post_id: post.id, user_id: me, text: body });
    if (error) {
      mutate(p => ({ ...p, comments: p.comments.filter(c => c.id !== id).map(c => ({ ...c, replies: c.replies.filter(r => r.id !== id) })) }));
      if (override === undefined) setText(body);
      window.alert('تعذّر إضافة التعليق، حاول مرة أخرى');
    }
  };

  // A sticker is a small image kept in storage; the comment text is a marker the app draws as the sticker.
  const sendSticker = async (st: SavedSticker) => {
    setEmojiOpen(false);
    if (st.kind !== 'image') { window.alert('الملصقات المتحركة غير مدعومة في التعليقات'); return; }
    const path = `${me}/cs-${crypto.randomUUID()}.${stkExt(st.blob, st.kind)}`;
    const { error: upErr } = await supabase.storage.from(POST_MEDIA_BUCKET).upload(path, st.blob, { contentType: st.blob.type || 'image/webp', cacheControl: '31536000' });
    if (upErr) { console.error(upErr); window.alert('تعذّر إرسال الملصق'); return; }
    await send(`[[sticker:${kanPublicUrl(POST_MEDIA_BUCKET, path)}]]`);
  };

  const remove = async (id: string) => {
    if (!(await kanConfirm('حذف هذا التعليق؟'))) return;
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

  const likeRow = async (id: string) => {
    const was = post.comments.some(c => (c.id === id ? c.likes.includes(me) : c.replies.some(r => r.id === id && r.likes.includes(me))));
    const toggle = (l: string[], on: boolean) => (on ? [...l.filter(x => x !== me), me] : l.filter(x => x !== me));
    const apply = (on: boolean) => mutate(p => ({
      ...p,
      comments: p.comments.map(c => ({
        ...c,
        likes: c.id === id ? toggle(c.likes, on) : c.likes,
        replies: c.replies.map(r => (r.id === id ? { ...r, likes: toggle(r.likes, on) } : r)),
      })),
    }));
    apply(!was);
    const { error } = was
      ? await supabase.from('comment_likes').delete().eq('comment_id', id).eq('user_id', me)
      : await supabase.from('comment_likes').insert({ comment_id: id, user_id: me });
    if (error) apply(was);
  };

  const rows: { id: string; top: string; userId: string; text: string; timestamp: number; reply: boolean; likes: string[]; username?: string }[] = [];
  for (const c of post.comments) {
    rows.push({ id: c.id, top: c.id, userId: c.userId, text: c.text, timestamp: c.timestamp, reply: false, likes: c.likes });
    for (const r of c.replies) rows.push({ id: r.id, top: c.id, userId: r.userId, text: r.text, timestamp: r.timestamp, reply: true, likes: r.likes });
  }

  return createPortal(
    <div dir={DIR} className="fixed inset-0 z-[135] bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div className="kan-theme-text w-full max-w-md bg-gray-900 border-t border-white/10 rounded-t-2xl h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
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
                    <button onClick={() => { onClose(); onOpenProfile(u.id); }} className="text-sm font-medium text-white hover:underline">{u.displayName}</button>
                    <span className="text-xs text-gray-500">{formatTime(r.timestamp)}</span>
                    {r.userId === me && (
                      <button onClick={() => remove(r.id)} className="mr-auto text-gray-500 hover:text-red-400" aria-label="حذف"><Trash2 size={13} /></button>
                    )}
                  </div>
                  <CommentText text={r.text} cls="text-sm text-gray-200 whitespace-pre-wrap break-words" />
                  <div className="mt-1 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <button onClick={() => void likeRow(r.id)} className={r.likes.includes(me) ? 'text-red-400' : 'text-gray-500'} aria-label="إعجاب"><Heart size={13} className={r.likes.includes(me) ? 'fill-red-400' : ''} /></button>
                      {r.likes.length > 0 && <span className="text-xs text-gray-400">{r.likes.length}</span>}
                    </span>
                    <button onClick={() => { setReplyTo({ parentId: r.top, name: u.displayName }); if (r.reply) setText(`@${u.username} `); }} className="text-xs text-gray-500 hover:text-cyan-300">رد</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {replyTo && (
          <div className="px-3 pt-2 flex items-center justify-between text-xs text-gray-400 border-t border-gray-800">
            <span className="truncate" dir="auto">الرد على {replyTo.name}</span>
            <button onClick={() => setReplyTo(null)} className="p-1 hover:text-white" aria-label="إلغاء الرد"><X size={14} /></button>
          </div>
        )}
        <div className="p-3 border-t border-gray-800 flex items-center gap-2">
          <button onClick={() => setEmojiOpen(o => !o)} className="p-2.5 bg-gray-800 rounded-full text-yellow-300" aria-label="إيموجي وملصقات"><Smile size={18} /></button>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void send()}
            placeholder={replyTo ? t('اكتب رداً...') : t('اكتب تعليقاً...')}
            className="flex-1 min-w-0 w-full px-3 min-[400px]:px-4 py-2.5 bg-gray-800 rounded-full text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button onClick={() => void send()} className="p-2.5 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full text-white" aria-label="إرسال"><Send size={18} /></button>
        </div>
      </div>
      {emojiOpen && createPortal(
        <div dir={DIR} className="fixed inset-x-0 bottom-0 z-[140] bg-gray-900 border-t border-white/10" onClick={e => e.stopPropagation()}>
          <EmojiPicker docked onPick={em => setText(v => v + em)} onClose={() => setEmojiOpen(false)} onSticker={st => { void sendSticker(st); }} />
        </div>,
        document.body,
      )}
    </div>,
    document.body
  );
}

function ReelsTab({ posts, setPosts, users, setUsers, currentUser, onOpenProfile, onCreate, onLoadPage, onBack, startId }: {
  startId: string | null;
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
  const autoNext = true;
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [lockH, setLockH] = useState<number | null>(null); // keyboard must not resize the reels list (that scrolled to the next reel)
  const [listModal, setListModal] = useState<{ title: string; ids: string[] } | null>(null);
  const reelsByTime = posts.filter(p => p.media?.type === 'video' && !p.isVideo).sort((a, b) => b.timestamp - a.timestamp);
  const reels = rankByInterests(reelsByTime, currentUser.id);
  const commentPost = commentsFor ? posts.find(p => p.id === commentsFor) : undefined;
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef(false);
  const loadMore = async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    try {
      const oldest = reelsByTime[reelsByTime.length - 1];
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

  // Coming from a reel on the home feed: jump straight to it.
  useEffect(() => {
    if (!startId) return;
    const go = () => document.getElementById(`reel-${startId}`)?.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
    go();
    const r = requestAnimationFrame(go);
    const t = window.setTimeout(go, 150);
    return () => { cancelAnimationFrame(r); window.clearTimeout(t); };
  }, [startId, reels.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div dir={DIR} className="fixed inset-0 z-[60] bg-black">
      <div
        className={`${lockH ? '' : 'h-full'} ${commentsFor ? 'overflow-y-hidden' : 'overflow-y-scroll'} overscroll-contain snap-y snap-mandatory no-scrollbar`}
        style={lockH ? { height: lockH } : undefined}
        onScroll={e => {
          const el = e.currentTarget;
          if (el.scrollTop + el.clientHeight * 2.5 >= el.scrollHeight) void loadMore();
        }}
      >
        {reels.map(post => {
          const author = users.find(u => u.id === post.userId);
          if (!author) return null;
          return (
            <div key={post.id} id={`reel-${post.id}`} className="h-full">
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
                onOpenComments={() => { setLockH(window.innerHeight); setCommentsFor(post.id); }}
                onShowLikes={() => setListModal({ title: 'الإعجابات', ids: post.likes })}
                autoNext={autoNext}
                onNext={() => { const n = reels[reels.findIndex(r => r.id === post.id) + 1]; if (n) document.getElementById(`reel-${n.id}`)?.scrollIntoView({ behavior: 'smooth' }); }}
              />
            </div>
          );
        })}
      </div>
      <div className="absolute inset-x-0 top-0 z-20 flex items-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-8 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <button onClick={onBack} className="pointer-events-auto p-2 rounded-full bg-black/40 text-white active:scale-90 transition-transform" aria-label="رجوع"><ChevronRight size={22} /></button>
        <span className="mx-3 text-lg font-extrabold tracking-[0.25em] kan-gradient-text">KIX</span>
        <span className="text-xs text-white/80 font-medium">ريلز</span>
      </div>
      {commentPost && (
        <ReelComments post={commentPost} users={users} currentUser={currentUser} setPosts={setPosts} onOpenProfile={onOpenProfile} onClose={() => { setCommentsFor(null); setLockH(null); }} />
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

function VideoCard({ post, author, onOpen, saved, onSave, onChannel, subs }: { post: Post; author: User; onOpen: () => void; saved: boolean; onSave: () => void; onChannel: () => void; subs: number }) {
  const resume = (() => { try { return Number(localStorage.getItem(`kan-pos:${(post.media?.url ?? '').split('?')[0].slice(-120)}`)) || 0; } catch { return 0; } })();
  return (
    <div onClick={onOpen} role="button" className="text-right group block w-full cursor-pointer">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900">
        <VideoThumb post={post} />
        {resume > 0 && <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/75 text-[11px] text-white">▶ {fmtClock(resume)}</span>}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors">
          <div className="w-12 h-12 rounded-full bg-black/55 flex items-center justify-center">
            <Play size={22} className="text-white" />
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onSave(); }} aria-label="مشاهدة لاحقاً" className={`absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center text-white ${saved ? 'bg-violet-600' : 'bg-black/55'}`}>
          <BookmarkIcon size={15} className={saved ? 'fill-white' : ''} />
        </button>
      </div>
      <div className="flex gap-2.5 mt-2">
        <button onClick={e => { e.stopPropagation(); onChannel(); }} aria-label="القناة"><Avatar userId={author.id} src={author.avatar} name={author.displayName} size="sm" /></button>
        <div className="min-w-0 flex-1">
          <div className="text-white font-semibold text-sm leading-snug line-clamp-2">{post.title || post.text || 'فيديو'}</div>
          <button onClick={e => { e.stopPropagation(); onChannel(); }} className="text-xs text-gray-400 mt-0.5 hover:text-white truncate max-w-full block">{author.displayName} · {subs} مشترك</button>
          <div className="text-xs text-gray-500">{post.likes.length} إعجاب · {formatTime(post.timestamp)}</div>
        </div>
      </div>
    </div>
  );
}

function VideoWatch({ post, users, currentUser, setUsers, setPosts, related, onOpenProfile, onOpenRelated, onBack, wl, onToggleWl, subsOf, onChannel }: {
  post: Post;
  users: User[];
  currentUser: User;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  related: Post[];
  onOpenProfile: (id: string) => void;
  onOpenRelated: (id: string) => void;
  onBack: () => void;
  wl: string[];
  onToggleWl: (id: string) => void;
  subsOf: (id: string) => number;
  onChannel: (id: string) => void;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [autoNext, setAutoNext] = useState(true);
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
          <ChevronRight size={18} /> {t('رجوع')}
        </button>
        <div className="aspect-video w-full bg-black sm:rounded-xl overflow-hidden">
          <VideoPlayer key={post.id} src={post.media!.url} poster={post.coverUrl} autoPlay onEnded={autoNext && related[0] ? () => onOpenRelated(related[0].id) : undefined} className="w-full h-full object-contain" />
        </div>
        <div className="px-4 sm:px-0 mt-3">
          <h1 className="text-lg font-bold text-white leading-snug">{post.title || 'فيديو'}</h1>
          <div className="text-xs text-gray-500 mt-1">{formatTime(post.timestamp)}</div>
          {author && (
            <div className="flex items-center gap-3 mt-3">
              <button onClick={() => onChannel(author.id)} className="flex items-center gap-2.5 min-w-0">
                <Avatar userId={author.id} src={author.avatar} name={author.displayName} size="md" />
                <div className="text-right min-w-0">
                  <div className="text-white font-semibold text-sm truncate">{author.displayName}</div>
                  <div className="text-xs text-gray-500">{author.followers.length} مشترك</div>
                </div>
              </button>
              {author.id !== currentUser.id && (
                <button
                  onClick={() => toggleFollow(author.id)}
                  className={`mr-auto px-4 py-1.5 rounded-full text-sm font-medium ${isFollowing ? 'bg-gray-800 text-gray-300' : 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white'}`}
                >
                  {isFollowing ? 'مشترك ✓' : 'اشتراك'}
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
            <button onClick={() => onToggleWl(post.id)} className={`px-4 py-2 border rounded-full text-sm flex items-center gap-2 ${wl.includes(post.id) ? 'bg-violet-600 border-violet-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-300'}`}>
              <BookmarkIcon size={16} className={wl.includes(post.id) ? 'fill-white' : ''} /> {wl.includes(post.id) ? 'محفوظ' : 'مشاهدة لاحقاً'}
            </button>
            <button onClick={() => setAutoNext(x => !x)} className={`px-4 py-2 border rounded-full text-sm ${autoNext ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200' : 'bg-gray-900 border-gray-800 text-gray-300'}`}>
              ⏭ تشغيل تلقائي
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
            return a ? <VideoCard key={v.id} post={v} author={a} onOpen={() => onOpenRelated(v.id)} saved={wl.includes(v.id)} onSave={() => onToggleWl(v.id)} onChannel={() => onChannel(a.id)} subs={subsOf(a.id)} /> : null;
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
  const [vf, setVf] = useState<'all' | 'subs' | 'saved'>('all');
  const [sort, setSort] = useState<'new' | 'top'>('new');
  const [channel, setChannel] = useState<string | null>(null);
  const wlKey = `kan_wl_${currentUser.id}`;
  const [wl, setWl] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(wlKey) || '[]'); } catch { return []; } });
  const toggleWl = (id: string) => setWl(l => { const n = l.includes(id) ? l.filter(x => x !== id) : [id, ...l]; try { localStorage.setItem(wlKey, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  const toggleFollow = makeToggleFollow(currentUser, setUsers);
  const subsOf = (id: string) => users.filter(u => u.following.includes(id)).length;

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
  const qn = query.trim().toLowerCase();
  const chMatches = qn ? users.filter(u => u.displayName.toLowerCase().includes(qn) && videos.some(x => x.userId === u.id)) : [];
  const merged = results ? [...results, ...videos.filter(x => chMatches.some(u => u.id === x.userId) && !results.some(r => r.id === x.id))] : videos;
  const base = vf === 'saved' && !results ? posts.filter(p => wl.includes(p.id) && p.isVideo && p.media?.type === 'video') : fresh(merged);
  const shown = base.filter(x => (channel ? x.userId === channel : vf === 'subs' ? currentUser.following.includes(x.userId) : true)).sort(sort === 'top' ? (x, y) => y.likes.length - x.likes.length : (x, y) => y.timestamp - x.timestamp);
  const chStrip = qn ? chMatches : users.filter(u => currentUser.following.includes(u.id) && videos.some(x => x.userId === u.id));
  const channelUser = channel ? users.find(u => u.id === channel) : undefined;
  const watching = watchId ? posts.find(p => p.id === watchId) : undefined;

  if (watching && watching.media) {
    return (
      <VideoWatch
        post={watching}
        users={users}
        currentUser={currentUser}
        setUsers={setUsers}
        setPosts={setPosts}
        related={[...videos.filter(x => x.id !== watching.id && x.userId === watching.userId), ...videos.filter(x => x.id !== watching.id && x.userId !== watching.userId)].slice(0, 12)}
        wl={wl}
        onToggleWl={toggleWl}
        subsOf={subsOf}
        onChannel={id => { setWatchId(null); setQuery(''); setVf('all'); setChannel(id); }}
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

      {channelUser ? (
        <div className="mb-5 flex items-center gap-3 p-3 rounded-2xl bg-gray-900 border border-gray-800">
          <Avatar userId={channelUser.id} src={channelUser.avatar} name={channelUser.displayName} size="md" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white truncate">{channelUser.displayName}</div>
            <div className="text-xs text-gray-400">{subsOf(channelUser.id)} مشترك · {videos.filter(v => v.userId === channelUser.id).length} فيديو</div>
          </div>
          {channelUser.id !== currentUser.id && <button onClick={() => toggleFollow(channelUser.id)} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${currentUser.following.includes(channelUser.id) ? 'bg-white/10 text-white' : 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white'}`}>{currentUser.following.includes(channelUser.id) ? 'مشترك ✓' : 'اشتراك'}</button>}
          <button onClick={() => setChannel(null)} className="p-1.5 text-gray-400" aria-label="إغلاق القناة"><X size={18} /></button>
        </div>
      ) : (
        <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
          {([['all', 'الكل'], ['subs', 'اشتراكاتي'], ['saved', `⏱ لاحقاً${wl.length ? ` (${wl.length})` : ''}`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setVf(k)} className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold ${vf === k ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>{l}</button>
          ))}
        </div>
      )}

      {!channelUser && chStrip.length > 0 && (
        <div className="flex gap-3 overflow-x-auto no-scrollbar mb-4">
          {chStrip.map(u => (
            <button key={u.id} onClick={() => { setChannel(u.id); setQuery(''); }} className="shrink-0 w-16 flex flex-col items-center gap-1">
              <Avatar userId={u.id} src={u.avatar} name={u.displayName} size="md" />
              <span className="text-[11px] text-gray-300 truncate w-full text-center">{u.displayName}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2 mb-4 text-xs">
        {([['new', 'الأحدث'], ['top', 'الأكثر إعجاباً']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setSort(k)} className={`px-3 py-1 rounded-full ${sort === k ? 'bg-violet-600 text-white' : 'bg-white/10 text-gray-300'}`}>{l}</button>
        ))}
      </div>

      {shown.length === 0 && !loading && !searching && (
        <div className="text-center py-14">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl kan-fab flex items-center justify-center"><PlayCircle size={30} className="text-white" /></div>
          <p className="text-white font-semibold mb-1">{query ? 'لا توجد نتائج' : vf === 'saved' ? 'لا توجد فيديوهات محفوظة' : vf === 'subs' ? 'اشترك في قنوات لتظهر هنا' : 'لا توجد فيديوهات بعد'}</p>
          {!query && <button onClick={onCreate} className="mt-4 px-6 py-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-medium">انشر فيديو</button>}
        </div>
      )}

      <div className="grid grid-cols-1 min-[560px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
        {shown.map(v => {
          const author = users.find(u => u.id === v.userId);
          return author ? <VideoCard key={v.id} post={v} author={author} onOpen={() => setWatchId(v.id)} saved={wl.includes(v.id)} onSave={() => toggleWl(v.id)} onChannel={() => setChannel(author.id)} subs={subsOf(author.id)} /> : null;
        })}
      </div>
      <div ref={sentinel} className="h-10 flex items-center justify-center text-xs text-gray-500 mt-4">
        {loading || searching ? 'جارٍ التحميل...' : ''}
      </div>
    </div>
  );
}

// ============ Create Post ============
function PublishQueue({ setPosts, userId }: { setPosts: React.Dispatch<React.SetStateAction<Post[]>>; userId: string }) {
  const jobs = useSyncExternalStore(pubSubscribe, pubSnapshot);
  const musicRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  if (jobs.length === 0) return null;

  const save = async (job: PubJob, extra: PubExtra[], music: PubExtra | null): Promise<boolean> => {
    if (!job.postId) return false;
    const { error } = await supabase.from('posts').update({ media_extra: music ? [...extra, music] : extra }).eq('id', job.postId);
    if (error) return false;
    pubSet(l => l.map(j => (j.id === job.id ? { ...j, extra, music } : j)));
    const [s] = await signPostsMedia([{ extraMedia: extra.length ? extra : undefined, music: music ? { url: music.url, name: music.name.slice(10), start: music.start, end: music.end } : undefined } as Post]);
    setPosts(prev => prev.map(p => (p.id === job.postId ? { ...p, extraMedia: s.extraMedia, music: s.music } : p)));
    return true;
  };
  const rmPath = (u?: string) => { const p = u ? pathOfUrl(u) : null; if (p) void kanRemove(POST_MEDIA_BUCKET, [p]); };
  const rmExtra = async (job: PubJob, i: number) => {
    setBusy(job.id);
    const gone = job.extra[i];
    if (await save(job, job.extra.filter((_, k) => k !== i), job.music)) rmPath(gone.url);
    setBusy(null);
  };
  const rmMusic = async (job: PubJob) => {
    setBusy(job.id);
    const old = job.music;
    if (await save(job, job.extra, null) && old && old.size > 0) rmPath(old.url);
    setBusy(null);
  };
  const addMusic = async (job: PubJob, f: File) => {
    setBusy(job.id);
    try {
      const mp = musicPath(`${userId}/${crypto.randomUUID()}-music.${safeExt(f.name)}`, f.size);
      const { error } = await uploadWithProgress(POST_MEDIA_BUCKET, mp, f, f.type || 'audio/mpeg', '31536000');
      if (error) throw error;
      const item: PubExtra = { type: 'file', url: kanPublicUrl(POST_MEDIA_BUCKET, mp), name: `kan-music|${f.name.replace(/\.[^.]+$/, '').slice(0, 80)}`, size: f.size };
      const old = job.music;
      if (await save(job, job.extra, item)) { if (old && old.size > 0) rmPath(old.url); } else rmPath(item.url);
    } catch (e) { console.error(e); }
    setBusy(null);
  };

  return (
    <div className="mb-3 space-y-2">
      <input ref={musicRef} type="file" accept="audio/*" className="hidden" onChange={e => {
        const f = e.target.files?.[0]; e.target.value = '';
        const j = jobs.find(x => x.id === target);
        if (f && j) void addMusic(j, f);
      }} />
      {jobs.map(job => (
        <div key={job.id} className="rounded-xl bg-gray-800/60 border border-gray-700 p-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-gray-200" dir="auto">
              {job.status === 'run' ? t('جارٍ النشر...') : job.status === 'done' ? t('تم النشر') : t('تعذّر النشر، حاول مرة أخرى')}{job.label ? ` · ${job.label}` : ''}
            </span>
            {job.status === 'run'
              ? <span className="flex items-center gap-2"><span className="tabular-nums font-bold text-cyan-300">{job.pct}%</span><button onClick={() => cancelJob(job.id)} aria-label="إلغاء الرفع" className="p-1 text-red-400 hover:text-red-300"><X size={14} /></button></span>
              : <button onClick={() => dropJob(job.id)} aria-label="إغلاق" className="p-1 text-gray-400 hover:text-white"><X size={14} /></button>}
          </div>
          {job.status === 'run' && (
            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={job.pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width] duration-150" style={{ width: `${job.pct}%` }} />
            </div>
          )}
          {job.status === 'done' && job.postId && (
            <div className={`mt-2 flex flex-wrap items-center gap-2 ${busy === job.id ? 'opacity-50 pointer-events-none' : ''}`}>
              <button onClick={() => { setTarget(job.id); musicRef.current?.click(); }} className="px-3 py-1.5 rounded-full bg-gray-900 text-xs text-fuchsia-300 flex items-center gap-1.5">
                <Music size={13} /> {job.music ? 'تغيير الموسيقى' : 'إضافة موسيقى'}
              </button>
              {job.music && <button onClick={() => void rmMusic(job)} className="px-3 py-1.5 rounded-full bg-gray-900 text-xs text-gray-300 hover:text-red-400">حذف الموسيقى</button>}
              {job.extra.map((x, i) => (
                <span key={`${x.url}-${i}`} className="flex items-center gap-1 ps-3 pe-1.5 py-1 rounded-full bg-gray-900 text-xs text-gray-300 max-w-[10rem]">
                  <span className="truncate" dir="auto">{x.name}</span>
                  <button onClick={() => void rmExtra(job, i)} aria-label="إزالة" className="text-gray-400 hover:text-red-400"><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Pick the part of the song that plays with the post (like Instagram): preview it and slide to the start you like.
// ============ Music library (Instagram-style: search songs, preview, add a 30s clip) ============
// ---- Saved audio clips (kept on this device): save the sound of any post/reel, pick it later from the music library. ----
type SavedClip = { url: string; name: string; cover?: string; start?: number; end?: number };
const SAVED_CLIPS_KEY = 'kix-saved-audio';
let savedClips: SavedClip[] | null = null;
const savedClipSubs = new Set<() => void>();
const savedClipsSnapshot = (): SavedClip[] => {
  if (savedClips) return savedClips;
  try {
    const v = JSON.parse(localStorage.getItem(SAVED_CLIPS_KEY) || '[]') as unknown;
    savedClips = Array.isArray(v) ? (v as SavedClip[]).filter(x => x && typeof x.url === 'string' && typeof x.name === 'string') : [];
  } catch { savedClips = []; }
  return savedClips;
};
const savedClipsSubscribe = (cb: () => void) => { savedClipSubs.add(cb); return () => { savedClipSubs.delete(cb); }; };
const clipKey = (u: string) => stableUrl(u).split('?')[0];
const isClipSaved = (list: SavedClip[], url: string) => list.some(c => clipKey(c.url) === clipKey(url));
function toggleSavedClip(c: SavedClip) {
  const cur = savedClipsSnapshot();
  const k = clipKey(c.url);
  const next = cur.some(x => clipKey(x.url) === k) ? cur.filter(x => clipKey(x.url) !== k) : [{ ...c, url: stableUrl(c.url) }, ...cur].slice(0, 100);
  savedClips = next;
  try { localStorage.setItem(SAVED_CLIPS_KEY, JSON.stringify(next)); } catch { /* storage blocked: keep in memory */ }
  savedClipSubs.forEach(f => f());
}
function SaveClipButton({ clip, className = '' }: { clip: SavedClip; className?: string }) {
  const list = useSyncExternalStore(savedClipsSubscribe, savedClipsSnapshot);
  const on = isClipSaved(list, clip.url);
  return (
    <button onClick={e => { e.stopPropagation(); toggleSavedClip(clip); }} aria-label={on ? 'إزالة الصوت من المحفوظات' : 'حفظ الصوت'} title={on ? 'محفوظ' : 'حفظ الصوت'} className={`shrink-0 flex items-center justify-center rounded-full active:scale-90 ${on ? 'text-cyan-300' : 'text-white/80'} ${className}`}>
      <Bookmark size={15} fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}

type LibTrack = { id: string; name: string; artist: string; cover: string; url: string };
const LIB_CHIPS: { label: string; term: string }[] = [
  { label: '🔥 رائج', term: '__chart' }, { label: '🎤 عربي', term: 'أغاني عربية' }, { label: '🎶 مهرجانات', term: 'مهرجانات' },
  { label: '🎧 راب', term: 'rap' }, { label: '🌙 هادي', term: 'chill' }, { label: '💃 رقص', term: 'dance' }, { label: '🎻 موسيقى', term: 'instrumental' },
];
function MusicLibrary({ onPick, onDevice, onClose }: { onPick: (t: { url: string; name: string; cover?: string; start?: number; end?: number }) => void; onDevice?: () => void; onClose?: () => void }) {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState(LIB_CHIPS[0].term);
  const [list, setList] = useState<LibTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  const au = useRef<HTMLAudioElement | null>(null);
  const [view, setView] = useState<'kix' | 'saved'>('kix');
  const saved = useSyncExternalStore(savedClipsSubscribe, savedClipsSnapshot);
  const [signed, setSigned] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (view !== 'saved') return;
    let dead = false;
    void signMediaUrls(saved.map(c => c.url)).then(m => { if (!dead) setSigned(m); });
    return () => { dead = true; };
  }, [view, saved]);
  useEffect(() => { au.current?.pause(); setPlaying(null); }, [view]);
  useEffect(() => () => { au.current?.pause(); au.current = null; }, []);
  useEffect(() => {
    const v = q.trim();
    if (!v) return;
    const h = window.setTimeout(() => setTerm(v), 450);
    return () => window.clearTimeout(h);
  }, [q]);
  useEffect(() => {
    let dead = false;
    setLoading(true); setErr('');
    supabase.functions.invoke('kan-music', { body: { q: term } })
      .then(({ data, error }) => {
        if (dead) return;
        if (error) { setErr('تعذّر تحميل الأغاني، تأكد من النت وحاول تاني'); setLoading(false); return; }
        const tr = (data as { tracks?: LibTrack[] } | null)?.tracks;
        setList(Array.isArray(tr) ? tr.filter(x => x && x.url && x.name) : []);
        setLoading(false);
      })
      .catch(() => { if (!dead) { setErr('تعذّر تحميل الأغاني، تأكد من النت وحاول تاني'); setLoading(false); } });
    return () => { dead = true; };
  }, [term]);
  const toggle = (t: { id: string; url: string }) => {
    if (playing === t.id) { au.current?.pause(); setPlaying(null); return; }
    au.current?.pause();
    const a = new Audio(t.url);
    au.current = a;
    a.onended = () => setPlaying(null);
    void a.play().catch(() => undefined);
    setPlaying(t.id);
  };
  const pick = (t: LibTrack) => { au.current?.pause(); onPick({ url: t.url, name: `${t.name} - ${t.artist}`.slice(0, 80), cover: t.cover }); onClose?.(); };
  const playUrl = (c: SavedClip) => signed.get(c.url) ?? c.url;
  const pickSaved = (c: SavedClip) => { au.current?.pause(); onPick({ url: playUrl(c), name: c.name, cover: c.cover, start: c.start, end: c.end }); onClose?.(); };
  return (
    <div className="rounded-2xl bg-gray-900/90 ring-1 ring-white/10 overflow-hidden">
      <div className="flex items-center gap-2 p-2">
        <div className={`flex-1 grid ${onDevice ? 'grid-cols-3' : 'grid-cols-2'} gap-1 p-1 bg-white/10 rounded-full`}>
          <button onClick={() => setView('kix')} className={`py-1.5 rounded-full text-xs font-bold text-center active:scale-95 ${view === 'kix' ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white' : 'text-gray-200'}`}>🎵 KIX</button>
          {onDevice && <button onClick={() => { au.current?.pause(); onDevice(); onClose?.(); }} className="py-1.5 rounded-full text-xs font-bold text-center text-gray-200 active:scale-95">📱 من الجهاز</button>}
          <button onClick={() => setView('saved')} className={`py-1.5 rounded-full text-xs font-bold text-center active:scale-95 ${view === 'saved' ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white' : 'text-gray-200'}`}>🔖 المحفوظة{saved.length > 0 ? ` ${saved.length}` : ''}</button>
        </div>
        {onClose && <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white shrink-0" aria-label="إغلاق"><X size={15} /></button>}
      </div>
      {view === 'saved' ? (
        <div className="max-h-56 overflow-y-auto px-2 pb-2">
          {saved.length === 0 && <p className="text-center text-gray-500 text-xs py-6 px-4">لسه ما حفظتش أي صوت. دوس على علامة الحفظ 🔖 جنب الصوت في أي منشور أو ريل.</p>}
          {saved.map(c => (
            <div key={c.url} className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-white/5">
              <button onClick={() => toggle({ id: c.url, url: playUrl(c) })} className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-gray-800 active:scale-95" aria-label="تشغيل">
                {c.cover && <img src={c.cover} alt="" loading="lazy" className="w-full h-full object-cover" />}
                <span className="absolute inset-0 bg-black/35 flex items-center justify-center text-white">{playing === c.url ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="translate-x-px" />}</span>
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate" dir="auto">{c.name}</div>
                <div className="text-[11px] text-gray-400">{c.start !== undefined ? `من ${Math.floor(c.start / 60)}:${String(Math.floor(c.start % 60)).padStart(2, '0')}` : 'مقطع محفوظ'}</div>
              </div>
              <button onClick={() => toggleSavedClip(c)} className="shrink-0 p-2 text-gray-400 active:scale-90" aria-label="حذف من المحفوظات"><X size={14} /></button>
              <button onClick={() => pickSaved(c)} className="shrink-0 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-xs font-bold active:scale-95">إضافة</button>
            </div>
          ))}
        </div>
      ) : (<>
      <div className="px-2">
        <div className="flex items-center gap-2 bg-gray-800 rounded-full px-4 py-2 border border-gray-700 focus-within:border-violet-500">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث: حمو المرشدي، زياد، Billie Eilish، The Weeknd..." className="flex-1 min-w-0 bg-transparent outline-none text-[16px] text-white placeholder-gray-500" />
          {q && <button onClick={() => setQ('')} className="text-gray-400" aria-label="مسح"><X size={14} /></button>}
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          {LIB_CHIPS.map(c => <button key={c.term} onClick={() => { setQ(''); setTerm(c.term); }} className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold ${term === c.term && !q ? 'bg-white text-black' : 'bg-white/10 text-gray-200'}`}>{c.label}</button>)}
        </div>
      </div>
      <div className="max-h-56 overflow-y-auto px-2 pb-2">
        {loading && <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /></div>}
        {!loading && err && <p className="text-center text-red-400 text-xs py-5">{err}</p>}
        {!loading && !err && list.length === 0 && <p className="text-center text-gray-500 text-xs py-5">ما لقيناش نتائج، جرّب اسم تاني أو بالإنجليزي</p>}
        {!loading && list.map(t => (
          <div key={t.id} className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-white/5">
            <button onClick={() => toggle(t)} className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-gray-800 active:scale-95" aria-label="تشغيل">
              {t.cover && <img src={t.cover} alt="" loading="lazy" className="w-full h-full object-cover" />}
              <span className="absolute inset-0 bg-black/35 flex items-center justify-center text-white">{playing === t.id ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="translate-x-px" />}</span>
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate" dir="auto">{t.name}</div>
              <div className="text-[11px] text-gray-400 truncate" dir="auto">{t.artist}</div>
            </div>
            <button onClick={() => pick(t)} className="shrink-0 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-xs font-bold active:scale-95">إضافة</button>
          </div>
        ))}
      </div>
      </>)}
    </div>
  );
}

function MusicTrimmer({ file, src, name, start, end, onStart, onEnd }: { file?: File; src?: string; name?: string; start: number; end: number; onStart: (n: number) => void; onEnd: (n: number) => void }) {
  const [url] = useState(() => src ?? URL.createObjectURL(file as File));
  useEffect(() => () => { if (!src) URL.revokeObjectURL(url); }, [url, src]);
  const ref = useRef<HTMLAudioElement>(null);
  const [dur, setDur] = useState(0);
  const [on, setOn] = useState(false);
  const [cur, setCur] = useState(0);
  const [bars, setBars] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  // Real waveform for normal-size files, a decorative one otherwise.
  useEffect(() => {
    let dead = false;
    const N = 72;
    const fake = () => Array.from({ length: N }, (_, i) => 0.3 + 0.55 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.43)));
    void (async () => {
      try {
        if (!file || file.size > 12 * 1024 * 1024) throw new Error('no local file / big');
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) throw new Error('no audio ctx');
        const ctx = new Ctx();
        const buf = await ctx.decodeAudioData(await file.arrayBuffer());
        void ctx.close();
        const ch = buf.getChannelData(0);
        const step = Math.max(1, Math.floor(ch.length / N));
        const raw = Array.from({ length: N }, (_, i) => {
          const s0 = i * step; const e0 = Math.min(ch.length, s0 + step); const jump = Math.max(1, Math.floor((e0 - s0) / 200));
          let m = 0;
          for (let k = s0; k < e0; k += jump) { const v = Math.abs(ch[k]); if (v > m) m = v; }
          return m;
        });
        const mx = Math.max(...raw, 0.001);
        if (!dead) setBars(raw.map(v => Math.max(0.12, v / mx)));
      } catch {
        if (!dead) setBars(fake());
      }
    })();
    return () => { dead = true; };
  }, [file]);
  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
  const round = (n: number) => Math.round(n * 10) / 10;
  const total = Math.max(1, dur);
  const eff = end > start ? Math.min(end, total) : Math.min(total, start + 30);
  const winLen = Math.max(1, eff - start);
  const play = (from: number) => { const a = ref.current; if (!a) return; a.currentTime = from; void a.play().catch(() => undefined); };
  // Put the clip window at `s` with length `l` (clamped to the song).
  const place = (s: number, l: number) => {
    const L = Math.min(l, total);
    const ns = round(Math.max(0, Math.min(s, total - L)));
    onStart(ns); onEnd(round(ns + L));
    if (on) play(ns);
  };
  // Drag the left handle (start), the right handle (end), or the middle (move the whole clip).
  const dragWin = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dur) return;
    const box = e.currentTarget;
    box.setPointerCapture(e.pointerId);
    const r = box.getBoundingClientRect();
    const toT = (x: number) => Math.max(0, Math.min(total, ((x - r.left) / r.width) * total));
    const px = (t: number) => r.left + (t / total) * r.width;
    const dl = Math.abs(e.clientX - px(start)); const dr = Math.abs(e.clientX - px(eff));
    const grab = 24;
    const mode: 'l' | 'r' | 'm' = dl <= grab && dl <= dr ? 'l' : dr <= grab ? 'r' : 'm';
    const s0 = start; const e0 = eff; const len = winLen;
    const mv = (x: number) => {
      const c = toT(x);
      if (mode === 'l') { const ns = round(Math.min(c, e0 - 1)); onStart(ns); onEnd(round(e0)); if (on) play(ns); }
      else if (mode === 'r') { onStart(round(s0)); onEnd(round(Math.max(c, s0 + 1))); }
      else place(c - len / 2, len);
    };
    mv(e.clientX);
    const move = (ev: PointerEvent) => mv(ev.clientX);
    const up = () => { box.removeEventListener('pointermove', move); box.removeEventListener('pointerup', up); box.removeEventListener('pointercancel', up); };
    box.addEventListener('pointermove', move); box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
  };
  const lens = [15, 30, 60].filter(o => o < total);
  const nudge = 'w-8 h-8 shrink-0 rounded-full bg-white/10 text-white text-base leading-none disabled:opacity-40';
  if (locked) return (
    <div className="mb-4 -mt-2 flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/30">
      <span className="w-8 h-8 shrink-0 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm">✓</span>
      <div className="min-w-0 flex-1 text-sm text-white" dir="ltr"><span className="font-bold">{fmt(start)} – {fmt(eff)}</span> <span className="text-emerald-300 text-xs">({Math.round(winLen)} ث) تم تأكيد المقطع</span></div>
      <button onClick={() => setLocked(false)} className="shrink-0 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold">تعديل</button>
    </div>
  );
  return (
    <div className="mb-4 -mt-2 p-3 rounded-2xl bg-gradient-to-b from-gray-800/80 to-gray-900/80 border border-white/10 space-y-3">
      <audio ref={ref} src={url} preload="metadata" onLoadedMetadata={e => setDur(e.currentTarget.duration || 0)} onPlay={() => setOn(true)} onPause={() => setOn(false)}
        onTimeUpdate={e => { const a = e.currentTarget; setCur(a.currentTime); if (a.currentTime >= eff) a.pause(); }} />
      <div className="flex items-center gap-3">
        <button onClick={() => { const a = ref.current; if (!a) return; if (on) a.pause(); else play(start); }} className="w-10 h-10 shrink-0 rounded-full bg-white text-gray-900 flex items-center justify-center shadow" aria-label="تشغيل المقطع">
          {on ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="translate-x-px" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-bold text-white truncate"><Music size={14} className="shrink-0 text-violet-300" /><span className="truncate">{(file?.name ?? name ?? 'موسيقى').replace(/\.[^.]+$/, '')}</span></div>
          <div className="text-[11px] text-gray-400">اسحب المقبض الأيسر للبداية والأيمن للنهاية، أو الإطار كله لنقله</div>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-white/10 text-white text-xs tabular-nums shrink-0">{Math.round(winLen)} ث</div>
      </div>
      <div data-noswipe dir="ltr" onPointerDown={dragWin} style={{ touchAction: 'none' }} className="relative h-16 rounded-xl bg-black/40 overflow-hidden cursor-grab active:cursor-grabbing select-none" aria-label="اسحب لتحديد المقطع">
        <div className="absolute inset-0 flex items-center gap-[2px] px-1">
          {bars.map((h, i) => {
            const t = ((i + 0.5) / bars.length) * total;
            return <span key={i} className={`flex-1 rounded-full ${t >= start && t <= eff ? 'bg-white' : 'bg-white/30'}`} style={{ height: `${Math.round(h * 100)}%` }} />;
          })}
        </div>
        <div className="absolute inset-y-0 left-0 bg-black/55 pointer-events-none" style={{ width: `${(start / total) * 100}%` }} />
        <div className="absolute inset-y-0 right-0 bg-black/55 pointer-events-none" style={{ width: `${Math.max(0, 100 - (eff / total) * 100)}%` }} />
        <div className="absolute inset-y-0 border-y-2 border-white pointer-events-none" style={{ left: `${(start / total) * 100}%`, width: `${(winLen / total) * 100}%` }}>
          <span className="absolute inset-y-0 -left-0 w-3 rounded-s-lg bg-white flex items-center justify-center"><span className="w-0.5 h-5 rounded bg-gray-500" /></span>
          <span className="absolute inset-y-0 -right-0 w-3 rounded-e-lg bg-white flex items-center justify-center"><span className="w-0.5 h-5 rounded bg-gray-500" /></span>
        </div>
        {on && <div className="absolute inset-y-0 w-0.5 bg-violet-400 pointer-events-none" style={{ left: `${(cur / total) * 100}%` }} />}
      </div>
      <div dir="ltr" className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">▶ بداية {fmt(start)}</span>
        <span className="text-gray-500">{Math.round(winLen)} ث من {dur ? fmt(total) : '--:--'}</span>
        <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-semibold">■ نهاية {fmt(eff)}</span>
      </div>
      <div dir="ltr" className="flex items-center gap-2">
        <button onClick={() => place(start - 1, winLen)} disabled={!dur} className={nudge} aria-label="ثانية للخلف">‹</button>
        <div className="flex-1 flex items-center justify-center gap-1.5">
          {lens.map(o => (
            <button key={o} onClick={() => place(start, o)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${Math.abs(winLen - o) < 0.6 ? 'bg-white text-gray-900' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>{o} ث</button>
          ))}
        </div>
        <button onClick={() => place(start + 1, winLen)} disabled={!dur} className={nudge} aria-label="ثانية للأمام">›</button>
      </div>
      <button onClick={() => { ref.current?.pause(); onStart(round(start)); onEnd(round(eff)); setLocked(true); }} disabled={!dur} className="w-full py-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-bold disabled:opacity-40 active:scale-[0.98]">✓ تأكيد المقطع</button>
    </div>
  );
}

function CreatePost({ currentUser, setPosts }: {
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
  const [remoteMusic, setRemoteMusic] = useState<{ url: string; name: string } | null>(() => null);
  const [editOpen, setEditOpen] = useState(false);
  useEffect(() => { pendingAudio = null; }, []);
  const [error, setError] = useState('');
  const [extra, setExtra] = useState<File[]>([]);
  const [music, setMusic] = useState<File | null>(null);
  const [musicStart, setMusicStart] = useState(0);
  const [musicEnd, setMusicEnd] = useState(0);
  const [videoVol, setVideoVol] = useState(1);
  const [musicVol, setMusicVol] = useState(0.85);
  const musicRef = useRef<HTMLInputElement>(null);
  const [libOpen, setLibOpen] = useState(false);
  useEffect(() => { if (music) setRemoteMusic(null); }, [music]);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const videoOnly = kind !== 'post';
  // Each icon opens only its own kind of file.
  const openPicker = (accept: string) => { const el = fileRef.current; if (!el) return; el.accept = accept; el.click(); };

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
    const usable = picked.filter(f => f.size <= maxMbFor(f) * 1024 * 1024);
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
    if (videoOnly && media?.type !== 'video') { setError(kind === 'reel' ? 'اختر فيديو لنشره كريل' : 'اختر الفيديو أولاً'); return; }
    if (kind === 'video' && !title.trim()) { setError('اكتب عنواناً للفيديو'); return; }
    if (!text.trim() && !media && !music && !remoteMusic) { setError('اكتب شيئاً أو أضف صورة أو فيديو أو ملف'); return; }
    const jobId = crypto.randomUUID();
    trackJob(jobId, 0, (text.trim() || title.trim() || media?.file.name || music?.name || '').slice(0, 40));
    const ctl = new AbortController();
    jobCtl.set(jobId, ctl);
    const totalBytes = (media?.file.size ?? 0) + extra.reduce((n, f) => n + f.size, 0) + (music?.size ?? 0);
    pubSet(l => l.map(j => (j.id === jobId ? { ...j, size: totalBytes } : j)));
    setError('');
    // Publishing continues in the background: the form is free right away and you can post something else.
    setText(''); setTitle(''); setMedia(null); setExtra([]); setMusic(null); setRemoteMusic(null); clearCover();
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
          const p = kanPath(`${currentUser.id}/${crypto.randomUUID()}.${MEDIA_EXT[f.type] ?? safeExt(f.name)}`, f.size);
          const { error: upErr } = await uploadWithProgress(POST_MEDIA_BUCKET, p, f, f.type || 'application/octet-stream', '31536000', pct => {
            pcts[i] = pct;
            trackJob(jobId, Math.round(pcts.reduce((x, y) => x + y, 0) / files.length));
          }, ctl.signal);
          if (upErr) throw upErr;
          uploaded.push(p);
          results[i] = kanPublicUrl(POST_MEDIA_BUCKET, p);
        }
      };
      await Promise.all(Array.from({ length: 8 }, () => worker()));
      const offset = media ? 1 : 0;
      if (media) mediaUrl = results[0];
      const extraMedia: { type: 'image' | 'video' | 'file'; url: string; name: string; size: number }[] =
        files.slice(offset).map((f, k) => ({ type: detectMediaKind(f), url: results[offset + k], name: f.name.slice(0, 200), size: f.size }));
      let musicItem: { type: 'file'; url: string; name: string; size: number; start?: number; end?: number } | null = null;
      if (music) {
        const mp = musicPath(`${currentUser.id}/${crypto.randomUUID()}-music.${safeExt(music.name)}`, music.size);
        const { error: mErr } = await uploadWithProgress(POST_MEDIA_BUCKET, mp, music, music.type || 'audio/mpeg', '31536000', undefined, ctl.signal);
        if (mErr) throw mErr;
        uploaded.push(mp);
        musicItem = { type: 'file', url: kanPublicUrl(POST_MEDIA_BUCKET, mp), name: `kan-music|${music.name.replace(/\.[^.]+$/, '').slice(0, 80)}`, size: music.size, start: musicStart, end: musicEnd > musicStart ? musicEnd : undefined, ...(media?.type === 'video' ? { vv: videoVol, mv: musicVol } : {}) };
      } else if (remoteMusic) {
        musicItem = { type: 'file', url: stableUrl(remoteMusic.url), name: `kan-music|${remoteMusic.name}`, size: 0, start: musicStart, end: musicEnd > musicStart ? musicEnd : undefined, ...(media?.type === 'video' ? { vv: videoVol, mv: musicVol } : {}) };
      }
      if (kind === 'video' && cover) {
        const coverPath = `${currentUser.id}/${crypto.randomUUID()}-cover.${cover.blob.type === 'image/png' ? 'png' : cover.blob.type === 'image/webp' ? 'webp' : 'jpg'}`;
        const { error: coverErr } = await supabase.storage
          .from(POST_MEDIA_BUCKET)
          .upload(coverPath, cover.blob, { contentType: cover.blob.type || 'image/jpeg', cacheControl: '31536000' });
        if (coverErr) throw coverErr;
        uploaded.push(coverPath);
        coverUrl = kanPublicUrl(POST_MEDIA_BUCKET, coverPath);
      }
      if (ctl.signal.aborted) throw new Error('cancelled');
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
        media_extra: musicItem ? [...extraMedia, musicItem] : extraMedia,
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
        music: musicItem ? { url: musicItem.url, name: musicItem.name.slice(10), start: musicItem.start, end: musicItem.end, vv: musicItem.vv, mv: musicItem.mv } : undefined,
        cursor: new Date().toISOString(),
        timestamp: Date.now(), likes: [], comments: [], bookmarks: [],
      };
      const [shownPost] = await signPostsMedia([newPost]);
      setPosts(prev => [shownPost, ...prev.filter(p => p.id !== id)]);
      if (media && media.url) URL.revokeObjectURL(media.url);
      endJob(jobId, true, { postId: id, extra: extraMedia, music: musicItem });
    } catch (e) {
      console.error(e);
      if (uploaded.length > 0) void kanRemove(POST_MEDIA_BUCKET, uploaded);
      if (ctl.signal.aborted) dropJob(jobId); else endJob(jobId, false);
    } finally {
      jobCtl.delete(jobId);
    }
  };

  const canMusic = media?.type === 'image' || (media?.type === 'video' && kind === 'reel');
  const heading = kind === 'reel' ? t('ريل جديد') : kind === 'video' ? t('فيديو جديد') : t('منشور جديد');

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
        <PublishQueue setPosts={setPosts} userId={currentUser.id} />
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
            placeholder={kind === 'reel' ? 'اكتب وصفاً للريل...' : kind === 'video' ? 'وصف الفيديو (اختياري)...' : t('ماذا يدور في ذهنك؟')} rows={4}
            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none resize-none text-lg"
          />
        </div>
        {media && (
          <div className="mb-4 relative">
            {media.type !== 'file' && <span className="absolute top-2 start-2 z-10 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] pointer-events-none">معاينة · {kind === 'reel' ? 'ريل 9:16' : kind === 'video' ? 'فيديو 16:9' : 'منشور'} · {(media.file.size / 1048576).toFixed(1)} MB</span>}
            {media.type === 'image' ? (
              <img src={media.url} alt="" className={`w-full rounded-xl object-cover ${kind === 'reel' ? 'aspect-[9/16] max-h-[26rem]' : kind === 'video' ? 'aspect-video' : 'max-h-72'}`} />
            ) : media.type === 'video' ? (
              <video ref={el => { if (el) el.volume = music || remoteMusic ? videoVol : 1; }} src={media.url} controls playsInline className={`w-full rounded-xl bg-black ${kind === 'reel' ? 'aspect-[9/16] max-h-[26rem]' : kind === 'video' ? 'aspect-video' : 'max-h-72'}`} />
            ) : (
              <div className="flex items-center gap-3 p-3 bg-gray-800/60 border border-gray-700 rounded-xl">
                <FileText size={32} className="shrink-0 text-cyan-400" />
                <div className="min-w-0">
                  <div className="text-white font-medium truncate" dir="auto">{media.file.name}</div>
                  <div className="text-xs text-gray-500">{formatBytes(media.file.size)}</div>
                </div>
              </div>
            )}
            <button onClick={() => { if (media.url) URL.revokeObjectURL(media.url); setMedia(null); clearCover(); setMusic(null); setRemoteMusic(null); setMusicStart(0); setMusicEnd(0); }} className="absolute top-2 left-2 p-1.5 bg-gray-900/80 rounded-full text-white hover:bg-red-500">
              <X size={14} />
            </button>
          </div>
        )}
        {canMusic && music && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm text-white mb-2 px-1">
              <Music size={16} className="text-fuchsia-300 shrink-0" />
              <span className="flex-1 truncate" dir="auto">{music.name}</span>
              <button onClick={() => { setMusic(null); setMusicStart(0); setMusicEnd(0); }} className="p-1 text-gray-400 hover:text-red-400" aria-label="إزالة الموسيقى"><X size={16} /></button>
            </div>
            <MusicTrimmer file={music} start={musicStart} end={musicEnd} onStart={setMusicStart} onEnd={setMusicEnd} />
          </div>
        )}
        {canMusic && remoteMusic && !music && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600/20 to-cyan-500/15 border border-violet-400/25 p-3 text-sm text-white">
            <Music size={16} className="text-fuchsia-300 shrink-0" />
            <span className="flex-1 truncate" dir="auto">{remoteMusic.name}</span>
            <button onClick={() => setLibOpen(true)} className="text-xs text-cyan-300 shrink-0">تغيير</button>
            <button onClick={() => setRemoteMusic(null)} className="p-1 text-gray-400 hover:text-red-400" aria-label="إزالة الموسيقى"><X size={16} /></button>
          </div>
        )}
        {canMusic && remoteMusic && !music && <MusicTrimmer key={remoteMusic.url} src={remoteMusic.url} name={remoteMusic.name} start={musicStart} end={musicEnd} onStart={setMusicStart} onEnd={setMusicEnd} />}
        {media?.type === 'video' && kind === 'reel' && (music || remoteMusic) && (
          <div className="mb-4 rounded-2xl bg-gray-800/60 border border-gray-700 p-3 space-y-2.5">
            <p className="text-xs text-gray-300 font-semibold">مستوى الصوت</p>
            {([['🎬 صوت الفيديو الأصلي', videoVol, setVideoVol], ['🎵 صوت الموسيقى', musicVol, setMusicVol]] as const).map(([label, v, set]) => (
              <div key={label} className="flex items-center gap-2" dir="ltr">
                <button onClick={() => set(v > 0 ? 0 : 1)} className="shrink-0 w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center" aria-label="كتم">{v > 0 ? <Volume2 size={15} /> : <VolumeX size={15} />}</button>
                <input type="range" min={0} max={1} step={0.05} value={v} onChange={e => set(Number(e.target.value))} className="flex-1 min-w-0 accent-violet-500" />
                <span className="w-10 text-xs text-gray-300 tabular-nums text-center">{Math.round(v * 100)}%</span>
                <span className="text-[11px] text-gray-400 w-28 shrink-0 text-right" dir="rtl">{label}</span>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setVideoVol(0); setMusicVol(1); }} className="flex-1 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold">🔇 اعزل الصوت الأصلي</button>
              <button onClick={() => { setVideoVol(1); setMusicVol(0.5); }} className="flex-1 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold">🎚 الاتنين مع بعض</button>
            </div>
          </div>
        )}
        {libOpen && <MusicLibrary onClose={() => setLibOpen(false)} onDevice={() => musicRef.current?.click()} onPick={t => { setMusic(null); setMusicStart(t.start ?? 0); setMusicEnd(t.end ?? 0); setRemoteMusic(t); }} />}
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
              <button onClick={() => openPicker('image/*')} className="p-2 text-cyan-400 hover:bg-gray-800 rounded-full transition-colors" aria-label="صورة">
                <ImageIcon size={20} />
              </button>
            )}
            <button onClick={() => openPicker('video/*')} className="p-2 text-green-400 hover:bg-gray-800 rounded-full transition-colors" aria-label="فيديو">
              <Video size={20} />
            </button>
            {canMusic && (
              <button onClick={() => setLibOpen(true)} className={`p-2 hover:bg-gray-800 rounded-full transition-colors ${music || remoteMusic ? 'text-fuchsia-300 bg-gray-800' : 'text-fuchsia-400'}`} aria-label="موسيقى"><Music size={20} /></button>
            )}
            <input ref={musicRef} type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; if (f.size > 20 * 1024 * 1024) { setError('حجم الموسيقى يجب أن لا يتجاوز 20 ميجابايت'); return; } setError(''); setMusic(f); setMusicStart(0); setMusicEnd(0); }} />
            {!videoOnly && (
              <button onClick={() => openPicker('*/*')} className="p-2 text-amber-400 hover:bg-gray-800 rounded-full transition-colors" aria-label="ملف">
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
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handlePost} className="px-6 py-2 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full text-white font-medium disabled:opacity-60">
            {kind === 'reel' ? 'نشر الريل' : kind === 'video' ? 'نشر الفيديو' : 'نشر'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ============ Search Tab ============
// ============ Interests (what a person searches for is shown to them more) ============
type InterestMap = Record<string, { w: number; t: number }>;
const interestKey = (uid: string) => `kan_interests_${uid}`;
const interestTokens = (text: string) => Array.from(new Set(text.toLowerCase().split(/[\s,.;:!?()"'#،؟]+/).filter(w => w.length >= 3))).slice(0, 6);
function readInterests(uid: string): InterestMap {
  try { const r = JSON.parse(localStorage.getItem(interestKey(uid)) ?? '{}'); return r && typeof r === 'object' ? (r as InterestMap) : {}; } catch { return {}; }
}
function bumpInterests(uid: string, text: string, amount = 2) {
  const now = Date.now();
  const cur = readInterests(uid);
  for (const k of interestTokens(text)) {
    const old = cur[k];
    const decayed = old ? old.w * Math.pow(0.5, (now - old.t) / (3 * 864e5)) : 0;
    cur[k] = { w: Math.min(decayed + amount, 20), t: now };
  }
  const top = Object.entries(cur).sort((a, b) => b[1].w - a[1].w).slice(0, 40);
  try { localStorage.setItem(interestKey(uid), JSON.stringify(Object.fromEntries(top))); } catch { /* ignore */ }
}
// Takes posts newest-first and lifts the ones that match the person's interests; everything else keeps its order.
function rankByInterests(list: Post[], uid: string): Post[] {
  const hour = Math.floor(Date.now() / 36e5) * 36e5;
  const entries = Object.entries(readInterests(uid))
    .map(([k, v]) => [k, v.w * Math.pow(0.5, (hour - v.t) / (3 * 864e5))] as const)
    .filter(([, w]) => w >= 0.3);
  if (entries.length === 0) return list;
  return list
    .map((p, i) => {
      const hay = `${p.text} ${p.title ?? ''} ${p.media?.name ?? ''}`.toLowerCase();
      let b = 0;
      for (const [k, w] of entries) if (hay.includes(k)) b += w;
      return { p, s: -i + Math.min(b, 12) * 4 };
    })
    .sort((a, b) => b.s - a.s)
    .map(x => x.p);
}

function SearchAI({ q, me, onPick }: { q: string; me: User; onPick: (w: string) => void }) {
  const [ans, setAns] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { setAns(''); setWords([]); setErr(''); }, [q]);
  const call = async (query: string) => {
    const now = new Date();
    const { data, error } = await supabase.functions.invoke('kan-ai', { body: { query, context: [], history: [], images: [], me: me.displayName, other: '', now: now.toISOString(), today: now.toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Cairo' }), timezone: 'Africa/Cairo', platform: 'KIX', creator: 'Khaled Sharaf', instructions: 'Speak naturally and freely in the user language, in your own style.' } });
    if (error) throw new Error('ai');
    return String((data as { response?: string } | null)?.response ?? '').trim();
  };
  const run = async (kind: 'ask' | 'words') => {
    if (busy) return;
    setBusy(true); setErr('');
    try {
      if (kind === 'ask') setAns(await call(q));
      else setWords((await call('اكتب 8 كلمات بحث مرتبطة بمعنى: ' + q + ' (عربي وإنجليزي) مفصولة بفاصلة فقط بدون أي شرح')).split(/[,،\n]/).map(x => x.trim()).filter(x => x && x.length < 30).slice(0, 8));
    } catch { setErr('KIX مش متاح دلوقتي، جرّب بعد شوية'); } finally { setBusy(false); }
  };
  return (
    <div className="mb-4 rounded-2xl bg-gray-900 border border-violet-500/30 p-3">
      <div className="flex gap-2">
        <button onClick={() => void run('ask')} disabled={busy} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-bold disabled:opacity-60">🤖 اسأل KIX</button>
        <button onClick={() => void run('words')} disabled={busy} className="flex-1 py-2 rounded-xl bg-white/10 text-white text-sm font-bold disabled:opacity-60">✨ بحث ذكي</button>
      </div>
      {busy && <div className="text-xs text-gray-400 mt-2 text-center">KIX بيفكر...</div>}
      {err && <div className="text-xs text-red-400 mt-2 text-center">{err}</div>}
      {ans && <p className="text-sm text-white mt-3 leading-6 whitespace-pre-wrap" dir="auto">{ans}</p>}
      {words.length > 0 && <div className="flex flex-wrap gap-2 mt-3">{words.map(w => <button key={w} onClick={() => onPick(w)} className="px-3 py-1 rounded-full bg-violet-600/25 text-violet-200 text-xs font-semibold">{w}</button>)}</div>}
    </div>
  );
}

function SearchTab({ users, posts, currentUser, setUsers, onStartChat, onOpenProfile }: {
  users: User[];
  posts: Post[];
  currentUser: User;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  onStartChat: (userId: string) => void;
  onOpenProfile: (userId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'people' | 'posts' | 'reels' | 'videos'>('all');
  const [found, setFound] = useState<Post[]>([]);
  const [searching, setSearching] = useState(false);
  const term = query.trim();
  const lq = term.toLowerCase();
  const filtered = lq.length === 0 ? [] : users.filter(u =>
    u.id !== currentUser.id &&
    (u.username.toLowerCase().includes(lq) || u.displayName.toLowerCase().includes(lq) || (u.bio ?? '').toLowerCase().includes(lq))
  );
  // Posts, reels and videos: what is already loaded shows at once, then the server adds the rest.
  useEffect(() => {
    if (term.length < 2) { setFound([]); setSearching(false); return; }
    const q = term.toLowerCase();
    setFound(posts.filter(p => `${p.text} ${p.title ?? ''}`.toLowerCase().includes(q)).sort((a, b) => b.timestamp - a.timestamp));
    let off = false;
    setSearching(true);
    const clean = term.replace(/[%_,()*\\]/g, ' ').trim();
    const h = window.setTimeout(async () => {
      const { data, error } = await supabase.from('posts').select(POST_SELECT).or(`text.ilike.%${clean}%,title.ilike.%${clean}%`).order('created_at', { ascending: false }).limit(40);
      if (off) return;
      if (!error && data) {
        const rows = (data as unknown as PostRow[]).map(rowToPost);
        setFound(rows);
        if (rows.length > 0) bumpInterests(currentUser.id, term, 2);
      }
      setSearching(false);
    }, 700);
    return () => { off = true; window.clearTimeout(h); };
  }, [term]); // eslint-disable-line react-hooks/exhaustive-deps
  const isReelP = (p: Post) => p.media?.type === 'video' && !p.isVideo;
  const postResults = filter === 'people' ? [] : found.filter(p => filter === 'reels' ? isReelP(p) : filter === 'videos' ? !!p.isVideo : filter === 'posts' ? (!isReelP(p) && !p.isVideo) : true).slice(0, 30);
  const showPeople = filter === 'all' || filter === 'people';

  const toggleFollow = makeToggleFollow(currentUser, setUsers);

  return (
    <div className="px-4 py-4">
      <div className="relative mb-6">
        <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && term.length >= 2) bumpInterests(currentUser.id, term, 2); }} placeholder={t('ابحث عن أشخاص، منشورات، ريلز، فيديوهات، #هاشتاج...')} className="w-full pr-12 pl-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-3 -mt-3">
        {([['all', 'الكل'], ['people', 'أشخاص'], ['posts', 'منشورات'], ['reels', 'ريلز'], ['videos', 'فيديوهات']] as const).map(([k, lb]) => (
          <button key={k} onClick={() => setFilter(k)} className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium ${filter === k ? 'bg-violet-600 text-white' : 'bg-gray-900 border border-gray-800 text-gray-300'}`}>{lb}</button>
        ))}
      </div>
      {term.length >= 2 && <SearchAI q={term} me={currentUser} onPick={w => setQuery(w)} />}
      <div className="space-y-3">
        {(!showPeople || filtered.length === 0) && postResults.length === 0 && (
          <div className="text-center py-8">
            <Users size={48} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">{term ? (searching ? 'بندوّر...' : 'لا توجد نتائج') : 'ابحث عن أي حاجة: أشخاص، منشورات، ريلز، فيديوهات أو هاشتاج'}</p>
          </div>
        )}
        {showPeople && filtered.slice(0, filter === 'all' ? 5 : 30).map(user => {
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
                  {isFollowing ? t('متابَع') : t('متابعة')}
                </motion.button>
              </div>
            </motion.div>
          );
        })}
        {postResults.map(post => (
          <PostCard key={post.id} post={post} setPosts={setFound} users={users} currentUser={currentUser} onOpenProfile={onOpenProfile} />
        ))}
        {searching && postResults.length > 0 && <p className="text-center text-xs text-gray-500 py-2">بندوّر أكتر...</p>}
      </div>
    </div>
  );
}

// ============ Profile Tab ============
// ============ "تحميلاتي": files being downloaded to this device (and finished ones), with % and cancel ============
function MyFilesPanel() {
  const downs = useSyncExternalStore(downSubscribe, downSnapshot);
  if (downs.length === 0) return <div className="text-center py-10"><Download size={28} className="mx-auto text-gray-700 mb-2" /><p className="text-gray-500 text-sm">مفيش ملفات بتتحمّل دلوقتي</p><p className="text-gray-600 text-xs mt-1">أي ملف تحمّله على جهازك هيظهر هنا بنسبة التحميل وتقدر تلغيه</p></div>;
  return (
    <div className="space-y-3">
      {[...downs].reverse().map(j => {
        const fail = j.status === 'fail'; const done = j.status === 'done';
        const known = j.total > 0;
        const pct = Math.max(0, Math.min(100, done ? 100 : j.pct));
        return (
          <div key={j.id} className="rounded-2xl bg-gray-900 border border-gray-800 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white truncate" dir="auto">{j.name}</div>
                <div className="text-[11px] text-gray-500" dir="auto">{fail ? 'فشل التحميل' : done ? 'تم التحميل ✓' : 'جاري التحميل...'}{known ? ` · ${formatBytes(j.got)} / ${formatBytes(j.total)}` : j.got ? ` · ${formatBytes(j.got)}` : ''}{j.note ? ` · ${j.note}` : ''}</div>
              </div>
              {known && <span className={`tabular-nums text-sm font-bold shrink-0 ${fail ? 'text-red-400' : done ? 'text-emerald-400' : 'text-cyan-300'}`}>{fail ? '!' : `${pct}%`}</span>}
              {j.status === 'run'
                ? <button onClick={() => cancelDown(j.id)} className="shrink-0 px-3 py-1.5 rounded-full bg-red-500/15 text-red-300 text-xs font-semibold ring-1 ring-red-400/25 active:scale-95">إلغاء</button>
                : <button onClick={() => dropDown(j.id)} aria-label="إخفاء" className="shrink-0 p-1.5 text-gray-500 hover:text-white"><X size={15} /></button>}
            </div>
            <div className="mt-2 h-2 rounded-full bg-gray-800 overflow-hidden">
              <div className={`h-full rounded-full ${!known && j.status === 'run' ? 'w-1/3 animate-pulse bg-cyan-400' : `transition-all duration-300 ${fail ? 'bg-red-500' : done ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-500 to-cyan-400'}`}`} style={!known && j.status === 'run' ? undefined : { width: `${Math.max(3, pct)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProfileTab({ currentUser, users, posts, setPosts, onOpenProfile, onLoadPage }: {
  currentUser: User; users: User[]; posts: Post[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  onOpenProfile: (id: string) => void;
  onLoadPage: (opts: FetchPostsOptions) => Promise<Post[]>;
}) {
  const [listModal, setListModal] = useState<{ title: string; ids: string[] } | null>(null);
  const [tab, setTab] = useState<'posts' | 'likes' | 'bookmarks' | 'files'>(() => { const f = openFilesTab; openFilesTab = false; return f ? 'files' : 'posts'; });
  useEffect(() => { const h = () => { openFilesTab = false; setTab('files'); }; window.addEventListener('kan-open-files', h); return () => window.removeEventListener('kan-open-files', h); }, []);

  // The feed only holds the newest posts, so fetch what this profile needs.
  useEffect(() => {
    void (async () => {
      try {
        if (tab === 'files') return;
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
  const activeUploads = useSyncExternalStore(downSubscribe, downSnapshot).filter(j => j.status === 'run').length;

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
        {[{ key: 'posts' as const, label: 'منشوراتي', Icon: FileText, n: myPosts.length }, { key: 'likes' as const, label: 'إعجاباتي', Icon: Heart, n: likedPosts.length }, { key: 'bookmarks' as const, label: 'محفوظاتي', Icon: Bookmark, n: bookmarkedPosts.length }, { key: 'files' as const, label: 'تحميلاتي', Icon: Download, n: activeUploads }].map(t => (
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
      {tab === 'files' ? <MyFilesPanel /> : (
      <div className="space-y-4">
        {displayPosts.length === 0 ? (
          <div className="text-center py-8"><p className="text-gray-500">لا توجد منشورات</p></div>
        ) : displayPosts.map(post => (
          <PostCard key={post.id} post={post} setPosts={setPosts} users={users} currentUser={currentUser} onOpenProfile={onOpenProfile} />
        ))}
      </div>
      )}
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
    <div dir={DIR} className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="kan-theme-text w-full sm:max-w-md bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl max-h-[75vh] flex flex-col" onClick={e => e.stopPropagation()}>
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
      <ChevronRight size={18} /> {t('رجوع')}
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
            {isFollowing ? t('متابَع') : t('متابعة')}
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
          <p className="text-xs text-gray-500">افتح KIX من شاشتك الرئيسية مثل أي تطبيق</p>
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
      <div className="flex-1 text-sm text-white">ثبّت KIX على جهازك</div>
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
      await reg?.showNotification('KIX', { body: 'الإشعارات تعمل على هذا الجهاز ✅', icon: `${import.meta.env.BASE_URL as string}icon-192.png` });
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

function LangPicker() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="text-sm font-semibold text-white mb-3">{t('اللغة')} / Language</div>
      <div className="grid grid-cols-2 gap-2">
        {([['ar', 'العربية'], ['en', 'English']] as const).map(([id, label]) => (
          <button key={id} onClick={() => { if (id !== LANG) setLangStored(id); }} className={`rounded-xl border py-2.5 text-sm font-semibold active:scale-95 transition-transform ${LANG === id ? 'border-violet-400 bg-violet-500/15 text-white' : 'border-white/10 bg-white/5 text-gray-300'}`}>{label}</button>
        ))}
      </div>
    </div>
  );
}

function RingStylePicker() {
  const [cur, setCur] = useState<RingStyle>(getRingStyle);
  const opts: { id: RingStyle; label: string }[] = [{ id: 'kan', label: 'KIX' }, { id: 'insta', label: 'ألوان دافئة' }, { id: 'green', label: 'أخضر' }, { id: 'off', label: 'إيقاف' }];
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
      <h2 className="text-xl font-bold text-white">{t('الإعدادات')}</h2>
      <LangPicker />
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="text-sm font-semibold text-white mb-1">{t('المظهر')}</div>
        <p className="text-xs text-gray-400 mb-3">اختر الثيم الذي يريحك</p>
        <div className="grid grid-cols-3 gap-2.5">
          {([
            { key: 'kan', label: 'KIX Theme', bg: '#0b0b1a', card: '#1b1b36', accent: 'linear-gradient(135deg,#7c3aed,#06b6d4)', line: '#35355a' },
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
          {saved ? <><Check size={18} /> {t('تم الحفظ')}</> : t('حفظ التغييرات')}
        </motion.button>
      </div>
      <InstallCard />
      <NotificationSettings />
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { void (async () => { await detachPush(); await supabase.auth.signOut(); })(); }} className="w-full py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-medium flex items-center justify-center gap-2">
        <LogOut size={18} /> {t('تسجيل الخروج')}
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
        allConvIds={myConversations.map(c => c.id)}
        onBack={() => setSelectedChat(null)}
      />
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">{t('المراسلة')}</h2>
        <button onClick={() => setCreatingGroup(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-xs font-semibold shadow-lg shadow-violet-500/25 active:scale-95 transition-transform">
          <Plus size={15} /> {t('مجموعة جديدة')}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1 p-1 mb-4 rounded-full bg-gray-900 border border-gray-800">
        {([['direct', t('الرسائل'), directUnread], ['groups', t('المجموعات'), groupsUnread]] as const).map(([key, label, count]) => (
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

// ============ Voice Recorder (WhatsApp style: hold to record, slide up to lock, slide sideways to cancel) ============
const micHold = { x: 0, y: 0, t: 0, held: false };
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
  const [locked, setLocked] = useState(!micHold.held);
  const [hint, setHint] = useState<'none' | 'cancel'>('none');
  const lockedRef = useRef(!micHold.held);
  const finishRef = useRef<'send' | 'cancel' | null>(null);

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
      if (finishRef.current) { const a = finishRef.current; finishRef.current = null; if (a === 'send') stopRecording(); else cancelRecording(); }
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
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
    const act = (a: 'send' | 'cancel') => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state !== 'recording') { finishRef.current = a; return; }
      if (a === 'send') stopRecording(); else cancelRecording();
    };
    const lock = () => { lockedRef.current = true; setLocked(true); };
    const move = (e: PointerEvent) => {
      if (!micHold.held || lockedRef.current) return;
      const dx = e.clientX - micHold.x, dy = e.clientY - micHold.y;
      if (dy < -70) { lock(); return; }
      setHint(Math.abs(dx) > 90 ? 'cancel' : 'none');
    };
    const up = (e: PointerEvent) => {
      if (!micHold.held) return;
      micHold.held = false;
      if (lockedRef.current) return;
      const dx = e.clientX - micHold.x;
      if (Math.abs(dx) > 90) act('cancel');
      else if (Date.now() - micHold.t < 450) lock();
      else act('send');
    };
    if (micHold.held) {
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    }
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      micHold.held = false;
      unmountedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  if (!locked) return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl select-none">
      <div className="absolute -top-20 end-3 w-11 h-16 rounded-full bg-gray-800 border border-gray-700 flex flex-col items-center justify-center text-base shadow-lg"><span>🔒</span><span className="text-gray-400 text-xs animate-bounce">↑</span></div>
      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      <span className="text-red-400 font-mono text-sm">{formatDuration(duration)}</span>
      <span className={`flex-1 text-center text-sm ${hint === 'cancel' ? 'text-red-400 font-bold' : 'text-gray-400'}`}>{hint === 'cancel' ? 'ارفع إصبعك للإلغاء' : '‹ اسحب للإلغاء'}</span>
    </motion.div>
  );
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
  const [rate, setRate] = useState<number>(() => { try { return Number(localStorage.getItem('kix_voice_rate')) || 1; } catch { return 1; } });
  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = rate; }, [rate, playing]);
  const cycleRate = () => setRate(r => { const n = r === 1 ? 1.5 : r === 1.5 ? 2 : 1; try { localStorage.setItem('kix_voice_rate', String(n)); } catch { /* ignore */ } return n; });

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
      <button onClick={e => { e.stopPropagation(); cycleRate(); }} aria-label="سرعة الصوت" className="shrink-0 min-w-[34px] px-1.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold tabular-nums">{rate}x</button>
    </div>
  );
}

// The chat wallpaper is kept on the device, so it shows at once instead of loading in front of you every time.
const bgMem = new Map<string, string>();
async function cachedBgUrl(key: string, url: string): Promise<string> {
  const mem = bgMem.get(key);
  if (mem) return mem;
  try {
    const c = await caches.open('kan-bg');
    const req = new Request(`https://kan.local/bg/${encodeURIComponent(key)}`);
    const hit = await c.match(req);
    if (hit) { const u = URL.createObjectURL(await hit.blob()); bgMem.set(key, u); return u; }
    const r = await fetch(url);
    if (r.ok) { await c.put(req, r.clone()); const u = URL.createObjectURL(await r.blob()); bgMem.set(key, u); return u; }
  } catch { /* fall back to the link */ }
  return url;
}

// ============ Chat Background Picker ============
function ChatBgPicker({ current, onChange, onImageUpload }: {
  current: ChatBackground | undefined;
  onChange: (bg: ChatBackground, all?: boolean) => void;
  onImageUpload: (url: string, all?: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [all, setAll] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => onImageUpload(reader.result as string, all);
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
      <div className="flex gap-1 p-1 mb-3 rounded-xl bg-gray-800">
        {([[false, 'هذه المحادثة فقط'], [true, 'كل المحادثات']] as const).map(([v, label]) => (
          <button key={label} onClick={() => setAll(v)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${all === v ? 'bg-violet-600 text-white' : 'text-gray-400'}`}>{t(label)}</button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2 mb-3">
        {CHAT_GRADIENTS.map((g, i) => (
          <button
            key={i}
            onClick={() => onChange({ type: 'gradient', value: g }, all)}
            className={`h-10 rounded-lg bg-gradient-to-b ${g} border-2 transition-all ${
              current?.type === 'gradient' && current.value === g ? 'border-violet-400 scale-110' : 'border-transparent hover:border-gray-600'
            }`}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onChange({ type: 'color', value: '#0b0b1a' }, all)}
          className={`flex-1 py-2 rounded-lg text-xs border-2 transition-all ${
            current?.type === 'color' ? 'border-violet-400 bg-gray-800' : 'border-gray-700 bg-gray-800 hover:border-gray-600'
          }`}
        >
          افتراضي
        </button>
        <button
          onClick={() => onChange({ type: 'color', value: '#1e1b4b' }, all)}
          className={`flex-1 py-2 rounded-lg text-xs border-2 transition-all ${
            current?.value === '#1e1b4b' ? 'border-violet-400' : 'border-gray-700 hover:border-gray-600'
          }`}
          style={{ backgroundColor: '#1e1b4b' }}
        >
          نيلي
        </button>
        <button
          onClick={() => onChange({ type: 'color', value: '#14532d' }, all)}
          className={`flex-1 py-2 rounded-lg text-xs border-2 transition-all ${
            current?.value === '#14532d' ? 'border-violet-400' : 'border-gray-700 hover:border-gray-600'
          }`}
          style={{ backgroundColor: '#14532d' }}
        >
          أخضر
        </button>
        <button
          onClick={() => onChange({ type: 'color', value: '#4c1d95' }, all)}
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
function Linkified({ text }: { text: string }) {
  const parts = text.split(/((?:https?:\/\/|www\.)[^\s<]+)/gi);
  return (
    <>
      {parts.map((p, i) => (i % 2 === 0 ? p : (
        <a key={i} href={/^www\./i.test(p) ? `https://${p}` : p} target="_blank" rel="noopener noreferrer" dir="ltr" className="underline text-cyan-300 break-all"
          onClick={e => {
            e.stopPropagation();
            const base = appBaseUrl();
            if (p.startsWith(base) && p.includes('#/')) { e.preventDefault(); window.location.hash = p.slice(p.indexOf('#')); }
          }}>{p}</a>
      )))}
    </>
  );
}
function SaveStickerBtn({ url, onDone }: { url: string; onDone: () => void }) {
  const [st, setSt] = useState<'idle' | 'busy' | 'done'>('idle');
  return (
    <button
      onClick={async () => {
        if (st !== 'idle') return;
        setSt('busy');
        try {
          const blob = await (await fetch(url)).blob();
          const kind: 'image' | 'video' = blob.type.startsWith('video/') ? 'video' : 'image';
          await stkPut({ id: crypto.randomUUID(), kind, blob, at: Date.now() });
          setSt('done');
          window.setTimeout(onDone, 800);
        } catch { setSt('idle'); window.alert(t('تعذّر حفظ الملصق')); }
      }}
      className="px-2.5 py-1 rounded-full bg-gray-800 hover:bg-gray-700 text-violet-300 text-xs flex items-center gap-1"
    >
      <Plus size={12} /> {st === 'done' ? t('تم الحفظ ✓') : t('حفظ الملصق')}
    </button>
  );
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

type ChatFab = { show: boolean; n: number };
// Chat scrolling: stay on the latest message only while you are at the bottom. If you scrolled up, new messages
// do not pull you down; a button with the unread count appears and takes you back to the last message.
function useChatStick(scrollRef: { current: HTMLDivElement | null }, items: { senderId: string }[], meId: string, resetKey: string | undefined) {
  const atBottom = useRef(true);
  const prevLen = useRef(0);
  const prevKey = useRef<string | undefined>('\u0000init');
  const stickUntil = useRef(Date.now() + 2500);
  const [fab, setFab] = useState<ChatFab>({ show: false, n: 0 });
  const toEnd = () => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; };
  const scrollToBottom = () => toEnd();
  const keepAtBottom = () => {
    stickUntil.current = Date.now() + 2500;
    toEnd();
    window.requestAnimationFrame(toEnd);
    window.setTimeout(toEnd, 150);
    window.setTimeout(toEnd, 600);
  };
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (dist < 80) { atBottom.current = true; setFab(f => (f.show || f.n ? { show: false, n: 0 } : f)); }
    else if (Date.now() > stickUntil.current) { atBottom.current = false; setFab(f => (f.show === dist > 200 ? f : { ...f, show: dist > 200 })); }
  };
  const onUserScroll = () => { stickUntil.current = 0; };
  const jumpDown = () => {
    const el = scrollRef.current;
    atBottom.current = true;
    stickUntil.current = Date.now() + 900;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setFab({ show: false, n: 0 });
  };
  useEffect(() => {
    const len = items.length;
    if (prevKey.current !== resetKey) { prevKey.current = resetKey; prevLen.current = len; atBottom.current = true; setFab({ show: false, n: 0 }); keepAtBottom(); return; }
    const added = len - prevLen.current;
    prevLen.current = len;
    if (added <= 0) return;
    const fresh = items.slice(-added);
    if (atBottom.current || fresh.some(m => m.senderId === meId)) { atBottom.current = true; setFab({ show: false, n: 0 }); keepAtBottom(); }
    else setFab(f => ({ show: true, n: f.n + fresh.filter(m => m.senderId !== meId).length }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, items.length]);
  return { atBottom, stickUntil, fab, scrollToBottom, keepAtBottom, onScroll, onUserScroll, jumpDown };
}
function ScrollDownFab({ fab, onClick }: { fab: ChatFab; onClick: () => void }) {
  if (!fab.show) return null;
  return (
    <div className="sticky bottom-2 h-0 flex justify-end pointer-events-none z-10">
      <button type="button" onClick={e => { e.stopPropagation(); onClick(); }} aria-label="الذهاب لآخر رسالة" className="pointer-events-auto relative -translate-y-full w-10 h-10 rounded-full bg-gray-800/95 border border-gray-600 text-white shadow-lg flex items-center justify-center kan-pop">
        <ChevronDown size={22} />
        {fab.n > 0 && <span className="absolute -top-2 -end-1 min-w-5 h-5 px-1 rounded-full bg-cyan-500 text-white text-[11px] font-bold flex items-center justify-center">{fab.n > 99 ? '99+' : fab.n}</span>}
      </button>
    </div>
  );
}

// ============ Games in chat (chess first) ============
// Everything travels as hidden chat messages (same trick as poll votes), so no new tables are needed:
// invite (with start time) -> accept/decline -> moves -> resign. Results and the win counter are derived from them.
const GAME_TAG = '⟦g⟧';
type GameMsg = { k: 'inv' | 'acc' | 'dec' | 'mv' | 'res' | 'dr' | 'da' | 'dd' | 'to'; g: string; at?: number; tc?: number; n?: number; m?: string };
function parseGame(t?: string | null): GameMsg | null {
  if (!t || !t.startsWith(GAME_TAG)) return null;
  try { const d = JSON.parse(t.slice(GAME_TAG.length)); return d && typeof d.g === 'string' && typeof d.k === 'string' ? (d as GameMsg) : null; } catch { return null; }
}
const gameText = (d: GameMsg) => GAME_TAG + JSON.stringify(d);

// ---- chess rules (board index 0 = a8 ... 63 = h1) ----
type CBoard = (string | null)[];
type CState = { b: CBoard; t: 'w' | 'b'; c: string; ep: number; h: number };
type CMove = { f: number; to: number; p?: string; ep?: boolean; cs?: 'K' | 'Q' };
const sqName = (i: number) => 'abcdefgh'[i % 8] + (8 - Math.floor(i / 8));
const sqIdx = (s: string) => (8 - Number(s[1])) * 8 + 'abcdefgh'.indexOf(s[0]);
function chessStart(): CState {
  const back = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  const b: CBoard = Array(64).fill(null);
  for (let i = 0; i < 8; i++) { b[i] = 'b' + back[i]; b[8 + i] = 'bP'; b[48 + i] = 'wP'; b[56 + i] = 'w' + back[i]; }
  return { b, t: 'w', c: 'KQkq', ep: -1, h: 0 };
}
function chessAttacked(b: CBoard, sq: number, by: 'w' | 'b'): boolean {
  const r = Math.floor(sq / 8), f = sq % 8;
  const at = (rr: number, ff: number) => (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 ? b[rr * 8 + ff] : null);
  const pr = by === 'w' ? r + 1 : r - 1;
  if (at(pr, f - 1) === by + 'P' || at(pr, f + 1) === by + 'P') return true;
  for (const [dr, df] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) if (at(r + dr, f + df) === by + 'N') return true;
  for (let dr = -1; dr <= 1; dr++) for (let df = -1; df <= 1; df++) if ((dr || df) && at(r + dr, f + df) === by + 'K') return true;
  for (const [dr, df, kinds] of [[1, 0, 'RQ'], [-1, 0, 'RQ'], [0, 1, 'RQ'], [0, -1, 'RQ'], [1, 1, 'BQ'], [1, -1, 'BQ'], [-1, 1, 'BQ'], [-1, -1, 'BQ']] as [number, number, string][]) {
    let rr = r + dr, ff = f + df;
    while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
      const p = b[rr * 8 + ff];
      if (p) { if (p[0] === by && kinds.includes(p[1])) return true; break; }
      rr += dr; ff += df;
    }
  }
  return false;
}
function chessPseudo(s: CState, from: number): CMove[] {
  const p = s.b[from];
  if (!p || p[0] !== s.t) return [];
  const me = s.t, op = me === 'w' ? 'b' : 'w', type = p[1], r = Math.floor(from / 8), f = from % 8;
  const out: CMove[] = [];
  const add = (to: number, extra: Partial<CMove> = {}) => out.push({ f: from, to, ...extra });
  if (type === 'P') {
    const dir = me === 'w' ? -1 : 1, start = me === 'w' ? 6 : 1, last = me === 'w' ? 0 : 7;
    const push = (to: number) => { if (Math.floor(to / 8) === last) { for (const q of ['q', 'r', 'b', 'n']) add(to, { p: q }); } else add(to); };
    const one = from + dir * 8;
    if (one >= 0 && one < 64 && s.b[one] === null) { push(one); if (r === start && s.b[one + dir * 8] === null) add(one + dir * 8); }
    for (const df of [-1, 1]) {
      const nf = f + df;
      if (nf < 0 || nf > 7 || one < 0 || one > 63) continue;
      const to = one + df;
      const tp = s.b[to];
      if (tp && tp[0] === op) push(to); else if (!tp && to === s.ep) add(to, { ep: true });
    }
    return out;
  }
  const step = (offs: number[][]) => { for (const [dr, df] of offs) { const rr = r + dr, ff = f + df; if (rr < 0 || rr > 7 || ff < 0 || ff > 7) continue; const t = s.b[rr * 8 + ff]; if (!t || t[0] === op) add(rr * 8 + ff); } };
  const slide = (dirs: number[][]) => { for (const [dr, df] of dirs) { let rr = r + dr, ff = f + df; while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) { const t = s.b[rr * 8 + ff]; if (!t) add(rr * 8 + ff); else { if (t[0] === op) add(rr * 8 + ff); break; } rr += dr; ff += df; } } };
  const ROOK = [[1, 0], [-1, 0], [0, 1], [0, -1]], BISH = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  if (type === 'N') step([[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]);
  else if (type === 'B') slide(BISH);
  else if (type === 'R') slide(ROOK);
  else if (type === 'Q') slide([...ROOK, ...BISH]);
  else if (type === 'K') {
    step([...ROOK, ...BISH]);
    const row = me === 'w' ? 56 : 0;
    if (from === row + 4 && !chessAttacked(s.b, from, op)) {
      const K = me === 'w' ? 'K' : 'k', Q = me === 'w' ? 'Q' : 'q';
      if (s.c.includes(K) && !s.b[row + 5] && !s.b[row + 6] && s.b[row + 7] === me + 'R' && !chessAttacked(s.b, row + 5, op) && !chessAttacked(s.b, row + 6, op)) add(row + 6, { cs: 'K' });
      if (s.c.includes(Q) && !s.b[row + 3] && !s.b[row + 2] && !s.b[row + 1] && s.b[row] === me + 'R' && !chessAttacked(s.b, row + 3, op) && !chessAttacked(s.b, row + 2, op)) add(row + 2, { cs: 'Q' });
    }
  }
  return out;
}
function chessApply(s: CState, m: CMove): CState {
  const b = s.b.slice();
  const p = b[m.f] as string, me = s.t, cap = b[m.to];
  b[m.to] = m.p ? me + m.p.toUpperCase() : p;
  b[m.f] = null;
  if (m.ep) b[m.to + (me === 'w' ? 8 : -8)] = null;
  if (m.cs) { const row = me === 'w' ? 56 : 0; if (m.cs === 'K') { b[row + 5] = b[row + 7]; b[row + 7] = null; } else { b[row + 3] = b[row]; b[row] = null; } }
  let c = s.c;
  if (p[1] === 'K') c = c.replace(me === 'w' ? /[KQ]/g : /[kq]/g, '');
  for (const [sq, ch] of [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']] as [number, string][]) if (m.f === sq || m.to === sq) c = c.replace(ch, '');
  const ep = p[1] === 'P' && Math.abs(m.to - m.f) === 16 ? (m.f + m.to) / 2 : -1;
  return { b, t: me === 'w' ? 'b' : 'w', c, ep, h: p[1] === 'P' || cap || m.ep ? 0 : s.h + 1 };
}
function chessLegal(s: CState, from?: number): CMove[] {
  const out: CMove[] = [];
  const opp = s.t === 'w' ? 'b' : 'w';
  for (let i = 0; i < 64; i++) {
    if (from !== undefined && i !== from) continue;
    for (const m of chessPseudo(s, i)) {
      const n = chessApply(s, m);
      const k = n.b.indexOf(s.t + 'K');
      if (k >= 0 && !chessAttacked(n.b, k, opp)) out.push(m);
    }
  }
  return out;
}
type ChessStatus = 'play' | 'check' | 'mate' | 'stalemate' | 'draw';
function chessStatus(s: CState): ChessStatus {
  const k = s.b.indexOf(s.t + 'K');
  const inCheck = k >= 0 && chessAttacked(s.b, k, s.t === 'w' ? 'b' : 'w');
  if (chessLegal(s).length === 0) return inCheck ? 'mate' : 'stalemate';
  const rest = (s.b.filter(Boolean) as string[]).filter(x => x[1] !== 'K');
  if (s.h >= 100 || rest.length === 0 || (rest.length === 1 && (rest[0][1] === 'N' || rest[0][1] === 'B'))) return 'draw';
  return inCheck ? 'check' : 'play';
}
const chessMoveStr = (m: { f: number; to: number; p?: string }) => sqName(m.f) + sqName(m.to) + (m.p ?? '');
const chessParse = (s: CState, str: string): CMove | undefined => chessLegal(s, sqIdx(str.slice(0, 2))).find(m => m.to === sqIdx(str.slice(2, 4)) && (m.p ?? '') === (str[4] ?? ''));

// ---- game state derived from the chat ----
type GameInfo = {
  g: string; inviter: string; invitee: string; at: number; ts: number; tc: number; // tc = minutes per player (0 = no clock)
  accepted: boolean | null; moves: string[]; st: CState; status: ChessStatus; last?: [number, number];
  startTs: number; lastTs: number; spent: { w: number; b: number };
  resignedBy?: string; drawBy?: string; agreed?: boolean; timeout?: 'w' | 'b'; winner: string | null;
};
function collectGames(msgs: Message[], meId: string, otherId: string): GameInfo[] {
  const by = new Map<string, GameInfo>();
  const acc = new Map<string, number>();
  const mv = new Map<string, Map<number, { m: string; ts: number }>>();
  const claims: { g: string; by: string; ts: number }[] = [];
  for (const m of [...msgs].sort((a, b) => a.timestamp - b.timestamp)) {
    const d = parseGame(m.text);
    if (!d) continue;
    if (d.k === 'inv') {
      if (!by.has(d.g)) by.set(d.g, { g: d.g, inviter: m.senderId, invitee: m.senderId === meId ? otherId : meId, at: d.at ?? m.timestamp, ts: m.timestamp, tc: Math.max(0, Math.min(60, d.tc ?? 0)), accepted: null, moves: [], st: chessStart(), status: 'play', startTs: 0, lastTs: 0, spent: { w: 0, b: 0 }, winner: null });
      continue;
    }
    const gi = by.get(d.g);
    if (!gi) continue;
    if (d.k === 'acc' && m.senderId !== gi.inviter && gi.accepted === null) { gi.accepted = true; acc.set(gi.g, m.timestamp); }
    else if (d.k === 'dec' && m.senderId !== gi.inviter && gi.accepted === null) gi.accepted = false;
    else if (d.k === 'mv' && gi.accepted && typeof d.n === 'number' && d.m) {
      let mm = mv.get(d.g);
      if (!mm) { mm = new Map(); mv.set(d.g, mm); }
      if (((m.senderId === gi.inviter) === (d.n % 2 === 0)) && !mm.has(d.n)) { mm.set(d.n, { m: d.m, ts: m.timestamp }); gi.drawBy = undefined; }
    } else if (d.k === 'res' && gi.accepted && !gi.resignedBy) gi.resignedBy = m.senderId;
    else if (d.k === 'dr' && gi.accepted) gi.drawBy = m.senderId;
    else if (d.k === 'dd' && gi.drawBy && gi.drawBy !== m.senderId) gi.drawBy = undefined;
    else if (d.k === 'da' && gi.drawBy && gi.drawBy !== m.senderId) gi.agreed = true;
    else if (d.k === 'to' && gi.accepted) claims.push({ g: gi.g, by: m.senderId, ts: m.timestamp });
  }
  for (const gi of by.values()) {
    if (!gi.accepted) continue;
    const mm = mv.get(gi.g);
    const budget = gi.tc * 60000;
    gi.startTs = Math.max(gi.at, acc.get(gi.g) ?? 0);
    gi.lastTs = gi.startTs;
    let s = chessStart();
    for (let n = 0; mm?.has(n); n++) {
      const e = mm.get(n) as { m: string; ts: number };
      const m = chessParse(s, e.m);
      if (!m) break;
      const side = s.t;
      const used = gi.spent[side] + Math.max(0, e.ts - gi.lastTs);
      if (budget > 0 && used > budget) { gi.timeout = side; break; } // moved after the flag fell
      gi.spent[side] = used;
      gi.lastTs = e.ts;
      gi.last = [m.f, m.to];
      s = chessApply(s, m);
      gi.moves.push(e.m);
    }
    gi.st = s;
    gi.status = chessStatus(s);
    if (!gi.timeout && budget > 0 && gi.status !== 'mate') {
      for (const c of claims) {
        if (c.g !== gi.g) continue;
        const loser = gi.st.t === 'w' ? gi.inviter : gi.invitee;
        if (c.by !== loser && gi.spent[gi.st.t] + Math.max(0, c.ts - gi.lastTs) >= budget - 1500) { gi.timeout = gi.st.t; break; }
      }
    }
    const colorId = (c: 'w' | 'b') => (c === 'w' ? gi.inviter : gi.invitee);
    if (gi.status === 'mate') gi.winner = colorId(s.t === 'w' ? 'b' : 'w'); // the side to move is the mated one
    else if (gi.status === 'stalemate' || gi.status === 'draw' || gi.agreed) gi.winner = 'draw';
    else if (gi.timeout) gi.winner = colorId(gi.timeout === 'w' ? 'b' : 'w');
    else if (gi.resignedBy) gi.winner = gi.resignedBy === gi.inviter ? gi.invitee : gi.inviter;
  }
  return [...by.values()].sort((a, b) => a.ts - b.ts);
}
function gameScore(games: GameInfo[], meId: string) {
  let me = 0, them = 0, draw = 0;
  for (const g of games) { if (g.winner === 'draw') draw++; else if (g.winner === meId) me++; else if (g.winner) them++; }
  return { me, them, draw };
}
const fmtCountdown = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60; return `${h > 0 ? h + ':' : ''}${String(m).padStart(h > 0 ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`; };
const fmtGameTime = (at: number) => new Date(at).toLocaleString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const PIECE_GLYPH: Record<string, string> = { K: '♚︎', Q: '♛︎', R: '♜︎', B: '♝︎', N: '♞︎', P: '♟︎' };
const PIECE_START: Record<string, number> = { Q: 1, R: 2, B: 2, N: 2, P: 8 };
// Pieces of `color` that are no longer on the board.
function chessLost(b: CBoard, color: 'w' | 'b'): string[] {
  const have: Record<string, number> = {};
  for (const p of b) if (p && p[0] === color) have[p[1]] = (have[p[1]] ?? 0) + 1;
  const out: string[] = [];
  for (const k of ['Q', 'R', 'B', 'N', 'P']) for (let i = 0; i < PIECE_START[k] - (have[k] ?? 0); i++) out.push(k);
  return out;
}

function GameInviteCard({ game, games, meId, other, onAccept, onDecline, onOpen }: { game: GameInfo; games: GameInfo[]; meId: string; other: User; onAccept: () => void; onDecline: () => void; onOpen: () => void }) {
  const [now, setNow] = useState(Date.now());
  const waiting = game.accepted === true && game.at > now && game.winner === null;
  useEffect(() => {
    if (!waiting) return;
    const h = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(h);
  }, [waiting]);
  const mine = game.inviter === meId;
  const sc = gameScore(games, meId);
  const done = game.winner !== null;
  return (
    <div className="min-w-[14.5rem] rounded-2xl bg-gradient-to-br from-[#2b2f3a] to-[#1b1e27] ring-1 ring-white/15 p-3.5 text-white shadow-lg">
      <div className="flex items-center gap-2.5">
        <span className="w-10 h-10 shrink-0 rounded-xl bg-[#ebecd0] text-[#2b2f3a] flex items-center justify-center text-2xl leading-none">♞</span>
        <div className="min-w-0"><div className="font-bold text-sm leading-tight">{mine ? `دعوة شطرنج لـ ${other.displayName}` : `${other.displayName} بيدعوك لشطرنج`}</div><div className="text-[11px] opacity-70 mt-0.5">⏰ {fmtGameTime(game.at)}{game.tc ? ` · ⏱ ${game.tc} د لكل لاعب` : ' · بدون ساعة'}</div></div>
      </div>
      <div className="mt-2.5 flex items-center justify-center gap-3 rounded-xl bg-black/30 py-1.5 text-xs">
        <span className="opacity-70">أنت</span><b className="text-base tabular-nums">{sc.me}</b><span className="opacity-50">–</span><b className="text-base tabular-nums">{sc.them}</b><span className="opacity-70 truncate max-w-[6rem]">{other.displayName}</span>{sc.draw ? <span className="opacity-60">· تعادل {sc.draw}</span> : null}
      </div>
      <div className="mt-2.5">
        {game.accepted === null && (mine
          ? <div className="text-xs opacity-80 text-center">في انتظار رد {other.displayName}...</div>
          : <div className="flex gap-2"><button onClick={onAccept} className="flex-1 py-2 rounded-full bg-emerald-500 text-white text-xs font-bold active:scale-95">قبول</button><button onClick={onDecline} className="flex-1 py-2 rounded-full bg-white/15 text-white text-xs font-bold active:scale-95">رفض</button></div>)}
        {game.accepted === false && <div className="text-xs text-red-300 text-center">الدعوة اترفضت</div>}
        {game.accepted === true && !done && (waiting
          ? <div className="text-xs text-center"><span className="opacity-80">تبدأ بعد </span><b className="tabular-nums">{fmtCountdown(game.at - now)}</b></div>
          : <button onClick={onOpen} className="w-full py-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-xs font-bold active:scale-95">{game.moves.length ? 'كمّل المباراة' : 'ادخل المباراة'}</button>)}
        {game.accepted === true && done && (
          <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold">{game.winner === 'draw' ? '🤝 تعادل' : game.winner === meId ? '🏆 فزت' : `🏆 فاز ${other.displayName}`}</span><button onClick={onOpen} className="px-3 py-1 rounded-full bg-white/15 text-xs">عرض</button></div>)}
      </div>
    </div>
  );
}

function GamePicker({ onClose, onInvite }: { onClose: () => void; onInvite: (at: number, tc: number) => void }) {
  const [step, setStep] = useState<'list' | 'time'>('list');
  const [pick, setPick] = useState<'now' | '15' | '60' | 'custom'>('now');
  const [custom, setCustom] = useState('');
  const [tc, setTc] = useState(10);
  const at = pick === 'now' ? Date.now() : pick === 'custom' ? (custom ? new Date(custom).getTime() : 0) : Date.now() + Number(pick) * 60000;
  const chip = (on: boolean) => `px-3.5 py-2 rounded-full text-sm font-semibold ${on ? 'bg-white text-black' : 'bg-white/10 text-white'}`;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-gray-900 border border-white/10 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()} dir="rtl">
        <div className="flex items-center justify-between mb-3"><h3 className="text-white font-bold">{step === 'list' ? 'العب مع صاحبك' : 'إعدادات المباراة'}</h3><button onClick={onClose} className="p-1.5 text-gray-400" aria-label="إغلاق"><X size={18} /></button></div>
        {step === 'list' ? (
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => setStep('time')} className="rounded-2xl bg-gradient-to-br from-violet-600/30 to-cyan-500/20 ring-1 ring-violet-400/40 p-4 text-center active:scale-95"><div className="text-4xl">♟️</div><div className="mt-1 text-white font-bold text-sm">شطرنج</div></button>
            {['❌⭕ إكس أو', '🎲 طاولة', '🃏 كوتشينة'].map(n => <div key={n} className="rounded-2xl bg-white/5 p-4 text-center opacity-50"><div className="text-white text-sm font-bold">{n}</div><div className="text-[11px] text-gray-400 mt-1">قريبًا</div></div>)}
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-400 mb-2">امتى تبدأ؟</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {([['now', 'دلوقتي'], ['15', 'بعد 15 دقيقة'], ['60', 'بعد ساعة'], ['custom', 'وقت محدد']] as const).map(([k, l]) => <button key={k} onClick={() => setPick(k)} className={chip(pick === k)}>{l}</button>)}
            </div>
            {pick === 'custom' && <input type="datetime-local" value={custom} onChange={e => setCustom(e.target.value)} className="w-full mb-3 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white text-[16px]" />}
            <p className="text-xs text-gray-400 mb-2">الوقت لكل لاعب</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {([[0, 'بدون ساعة'], [3, '3 د'], [5, '5 د'], [10, '10 د'], [15, '15 د']] as const).map(([k, l]) => <button key={k} onClick={() => setTc(k)} className={chip(tc === k)}>{l}</button>)}
            </div>
            <button disabled={pick === 'custom' && !custom} onClick={() => onInvite(Math.max(at, Date.now()), tc)} className="w-full py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold disabled:opacity-40 active:scale-[0.98]">إرسال الدعوة</button>
            <button onClick={() => setStep('list')} className="w-full mt-2 py-2 text-xs text-gray-400">رجوع</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function ChessGame({ game, games, meId, me, other, onMove, onResign, onDraw, onTimeout, onNew, onClose }: { game: GameInfo; games: GameInfo[]; meId: string; me: User; other: User; onMove: (mv: string) => void; onResign: () => void; onDraw: (k: 'dr' | 'da' | 'dd') => void; onTimeout: () => void; onNew: () => void; onClose: () => void }) {
  const myColor: 'w' | 'b' = game.inviter === meId ? 'w' : 'b';
  const oppColor: 'w' | 'b' = myColor === 'w' ? 'b' : 'w';
  const [sel, setSel] = useState<number | null>(null);
  const [promo, setPromo] = useState<{ f: number; to: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const over = game.winner !== null;
  const timed = game.tc > 0;
  const running = !over && game.accepted === true;
  useEffect(() => {
    if (!running || !timed) return;
    const h = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(h);
  }, [running, timed]);
  const budget = game.tc * 60000;
  const left = (c: 'w' | 'b') => (budget - game.spent[c] - (running && game.st.t === c ? Math.max(0, now - game.lastTs) : 0));
  // The opponent's flag fell: the winner's device reports it, which makes the result permanent for both.
  const claimed = useRef(false);
  useEffect(() => {
    if (running && timed && game.st.t === oppColor && left(oppColor) <= 0 && !claimed.current) { claimed.current = true; onTimeout(); }
  });
  const myTurn = running && game.st.t === myColor && (!timed || left(myColor) > 0);
  const legal = useMemo(() => (myTurn ? chessLegal(game.st) : []), [game.st, myTurn]);
  useEffect(() => { setSel(null); setPromo(null); }, [game.moves.length]);
  const targets = sel === null ? [] : legal.filter(m => m.f === sel);
  const sc = gameScore(games, meId);
  const kingSq = game.status === 'check' || game.status === 'mate' ? game.st.b.indexOf(game.st.t + 'K') : -1;
  const order = Array.from({ length: 64 }, (_, k) => (myColor === 'w' ? k : 63 - k));
  const tap = (i: number) => {
    if (!myTurn || promo) return;
    const hit = targets.filter(m => m.to === i);
    if (sel !== null && hit.length > 0) { if (hit.length > 1) setPromo({ f: sel, to: i }); else onMove(chessMoveStr(hit[0])); return; }
    const pc = game.st.b[i];
    setSel(pc && pc[0] === myColor && legal.some(m => m.f === i) ? i : null);
  };
  const reason = game.status === 'mate' ? 'كش مات' : game.status === 'stalemate' ? 'لا توجد حركات' : game.status === 'draw' ? 'تعادل' : game.agreed ? 'بالاتفاق' : game.timeout ? 'انتهى الوقت' : game.resignedBy ? 'استسلام' : '';
  const headline = !over ? (myTurn ? 'دورك' : `دور ${other.displayName}`) : game.winner === 'draw' ? '🤝 تعادل' : game.winner === meId ? '🏆 فزت!' : `🏆 فاز ${other.displayName}`;
  const Bar = ({ u, c, mineBar }: { u: User; c: 'w' | 'b'; mineBar: boolean }) => {
    const lost = chessLost(game.st.b, c === 'w' ? 'b' : 'w'); // what this player has captured
    const active = running && game.st.t === c;
    const ms = left(c);
    return (
      <div className={`w-full flex items-center gap-2.5 rounded-2xl px-3 py-2 ${active ? 'bg-white/10 ring-1 ring-emerald-400/50' : 'bg-white/5'}`}>
        <Avatar userId={u.id} src={u.avatar} name={u.displayName} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm text-white font-semibold truncate"><span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c === 'w' ? 'bg-white' : 'bg-gray-700 ring-1 ring-white/40'}`} />{mineBar ? 'أنت' : u.displayName}</div>
          <div dir="ltr" className="h-4 text-[13px] leading-4 text-gray-300 truncate">{lost.map((k, i) => <span key={i}>{PIECE_GLYPH[k]}</span>)}</div>
        </div>
        {timed && <span dir="ltr" className={`tabular-nums text-lg font-bold px-3 py-1 rounded-xl ${ms <= 0 ? 'bg-red-600 text-white' : ms < 30000 && active ? 'bg-red-500/25 text-red-300' : active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-black/30 text-gray-300'}`}>{fmtCountdown(Math.max(0, ms))}</span>}
      </div>
    );
  };
  return createPortal(
    <div className="fixed inset-0 z-[90] bg-[#161512] flex flex-col items-center overflow-y-auto" dir="rtl">
      <div className="w-full max-w-md px-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white" aria-label="إغلاق"><X size={18} /></button>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 text-sm">
          <span className="text-gray-400">أنت</span><b className="text-white text-base tabular-nums">{sc.me}</b><span className="text-gray-600">–</span><b className="text-white text-base tabular-nums">{sc.them}</b><span className="text-gray-400 truncate max-w-[5rem]">{other.displayName}</span>{sc.draw ? <span className="text-gray-500 text-xs">· {sc.draw} تعادل</span> : null}
        </div>
        <span className="w-9" />
      </div>
      <div className="w-full max-w-md px-3 mt-3"><Bar u={other} c={oppColor} mineBar={false} /></div>
      <div className="w-full max-w-md px-3 mt-2 text-center"><span className={`inline-block px-4 py-1 rounded-full text-xs font-bold ${over ? 'bg-amber-500/20 text-amber-300' : myTurn ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-gray-300'}`}>{headline}{over && reason ? ` · ${reason}` : game.status === 'check' && !over ? ' · كش!' : ''}</span></div>
      <div dir="ltr" className="relative mt-2 w-full max-w-md px-2">
        <div className="grid grid-cols-8 aspect-square w-full rounded-xl overflow-hidden shadow-[0_10px_40px_-8px_rgba(0,0,0,.8)] ring-4 ring-[#3a3631]">
          {order.map((i, k) => {
            const r = Math.floor(i / 8), f = i % 8;
            const dark = (r + f) % 2 === 1;
            const pc = game.st.b[i];
            const isLast = game.last && (game.last[0] === i || game.last[1] === i);
            const tgt = targets.some(m => m.to === i);
            const rankLbl = k % 8 === 0 ? String(8 - r) : '';
            const fileLbl = k >= 56 ? 'abcdefgh'[f] : '';
            return (
              <button key={i} onClick={() => tap(i)} className={`relative flex items-center justify-center ${dark ? 'bg-[#779556]' : 'bg-[#ebecd0]'} ${i === kingSq ? '!bg-red-500' : ''}`}>
                {isLast && <span className="absolute inset-0 bg-yellow-300/50 pointer-events-none" />}
                {sel === i && <span className="absolute inset-0 bg-sky-400/50 pointer-events-none" />}
                {rankLbl && <span className={`absolute top-0.5 left-1 text-[9px] font-bold ${dark ? 'text-[#ebecd0]' : 'text-[#779556]'}`}>{rankLbl}</span>}
                {fileLbl && <span className={`absolute bottom-0 right-1 text-[9px] font-bold ${dark ? 'text-[#ebecd0]' : 'text-[#779556]'}`}>{fileLbl}</span>}
                {pc && <span className={`relative leading-none select-none text-[clamp(28px,10.5vw,56px)] transition-transform ${sel === i ? 'scale-110' : ''} ${pc[0] === 'w' ? 'text-white [text-shadow:0_0_2px_#000,0_0_3px_#000,0_2px_3px_rgba(0,0,0,.6)]' : 'text-[#1b1b1b] [text-shadow:0_0_1.5px_rgba(255,255,255,.55),0_2px_3px_rgba(0,0,0,.35)]'}`}>{PIECE_GLYPH[pc[1]]}</span>}
                {tgt && <span className={`absolute rounded-full pointer-events-none ${pc ? 'inset-1 ring-[5px] ring-black/25' : 'w-[30%] h-[30%] bg-black/25'}`} />}
              </button>
            );
          })}
        </div>
        {promo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
            <div className="flex gap-2 rounded-2xl bg-gray-900 p-3 ring-1 ring-white/20">
              {(['q', 'r', 'b', 'n'] as const).map(q => <button key={q} onClick={() => { onMove(chessMoveStr({ f: promo.f, to: promo.to, p: q })); setPromo(null); }} className="w-14 h-14 rounded-xl bg-[#ebecd0] text-4xl text-gray-900 active:scale-95">{PIECE_GLYPH[q.toUpperCase()]}</button>)}
            </div>
          </div>
        )}
      </div>
      <div className="w-full max-w-md px-3 mt-3"><Bar u={me} c={myColor} mineBar /></div>
      <div className="w-full max-w-md px-3 mt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {over ? (
          <button onClick={onNew} className="w-full py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-bold active:scale-[0.98]">لعبة جديدة</button>
        ) : game.drawBy && game.drawBy !== meId ? (
          <div className="flex items-center gap-2 rounded-2xl bg-amber-500/15 ring-1 ring-amber-400/30 px-3 py-2"><span className="flex-1 text-sm text-amber-200">{other.displayName} بيعرض تعادل 🤝</span><button onClick={() => onDraw('da')} className="px-4 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold">قبول</button><button onClick={() => onDraw('dd')} className="px-4 py-1.5 rounded-full bg-white/15 text-white text-xs font-bold">رفض</button></div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => onDraw('dr')} disabled={game.drawBy === meId} className="flex-1 py-2.5 rounded-full bg-white/10 text-white text-sm font-semibold disabled:opacity-50 active:scale-[0.98]">{game.drawBy === meId ? 'بانتظار رده...' : '🤝 عرض تعادل'}</button>
            <button onClick={async () => { if (await kanConfirm('تستسلم في المباراة؟')) onResign(); }} className="flex-1 py-2.5 rounded-full bg-red-500/15 text-red-300 text-sm font-semibold active:scale-[0.98]">🏳️ استسلام</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function ChatView({ currentUser, chatUser, conversation, setConversations, onBack, allConvIds = [] }: {
  currentUser: User; chatUser: User; allConvIds?: string[];
  conversation: Conversation | undefined;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  onBack: () => void;
}) {
  const [text, setText] = useState('');
  const [media, setMedia] = useState<{ type: 'image' | 'video' | 'file'; url: string; file: File } | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [ups, setUps] = useState<Record<string, number>>({});
  const trackUp = (key: string, pct: number | null) => setUps(u => { const n = { ...u }; if (pct === null) delete n[key]; else n[key] = pct; return n; });
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
  const [pollOpen, setPollOpen] = useState(false);
  const stickerStart = false; // stickers now live only inside the emoji panel (its stickers tab)
  const lastTap = useRef<{ id: string; t: number }>({ id: '', t: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const messages = conversation?.messages || [];
  const [showGames, setShowGames] = useState(false);
  const [openGid, setOpenGid] = useState<string | null>(null);
  const games = useMemo(() => collectGames(messages, currentUser.id, chatUser.id), [messages, currentUser.id, chatUser.id]);
  const openGame = games.find(x => x.g === openGid) ?? null;
  const sendGame = (d: GameMsg) => { void send({ text: gameText(d) }); };
  const bg = conversation?.background;
  const [bgSrc, setBgSrc] = useState<string | null>(() => (bg?.type === 'image' ? ((bg.key && bgMem.get(bg.key)) || bg.value) : null));
  useEffect(() => {
    if (bg?.type !== 'image') { setBgSrc(null); return; }
    setBgSrc((bg.key && bgMem.get(bg.key)) || bg.value);
    if (bg.key) void cachedBgUrl(bg.key, bg.value);
  }, [bg?.type, bg?.key ?? bg?.value]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (bg.type === 'image') return bgSrc ? { backgroundImage: `url("${bgSrc}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: '#0b0b1a' };
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
  const { atBottom, stickUntil, fab, scrollToBottom, keepAtBottom, onScroll, onUserScroll, jumpDown } = useChatStick(scrollRef, messages, currentUser.id, convId);
  useEffect(() => {
    if (atBottom.current) keepAtBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp.height]);
  useEffect(() => {
    if (peerTyping && atBottom.current) scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Instant sending: the message appears at once; upload and save happen in the background (removed again only if they fail).
  const send = async (opts: { text?: string; file?: Blob; mediaType?: 'image' | 'video' | 'voice' | 'file'; duration?: number; fileName?: string; replyToId?: string }): Promise<boolean> => {
    const body = (opts.text ?? '').trim();
    if (!body && !opts.file) return false;
    setError('');
    let convId: string;
    try {
      convId = await ensureConversation();
    } catch (e) {
      console.error(e);
      setError('تعذّر إرسال الرسالة، حاول مرة أخرى');
      return false;
    }
    const id = crypto.randomUUID();
    const path = opts.file ? kanPath(`${convId}/${crypto.randomUUID()}.${CHAT_EXT[opts.file.type] ?? safeExt(opts.fileName)}`, opts.file.size) : null;
    const msg: Message = {
      id, senderId: currentUser.id, text: body, timestamp: Date.now(), read: false,
      replyToId: opts.replyToId,
      media: opts.file && opts.mediaType
        ? { type: opts.mediaType, url: URL.createObjectURL(opts.file), duration: opts.duration, name: opts.fileName, size: opts.file.size, path: path ?? undefined }
        : undefined,
    };
    setConversations(prev => prev.map(c =>
      c.id !== convId ? c : { ...c, messages: c.messages.some(m => m.id === id) ? c.messages : [...c.messages, msg], lastActivity: msg.timestamp }
    ));
    playSound('send');
    void (async () => {
      try {
        if (opts.file && path) {
          const upFile = opts.mediaType === 'image' && opts.file instanceof File && !isStickerName(opts.fileName) ? await shrinkPhoto(opts.file) : opts.file;
          const { error: upErr } = await uploadWithProgress(CHAT_MEDIA_BUCKET, path, upFile, upFile.type || 'application/octet-stream', '3600', pct => { if (opts.mediaType !== 'voice' && !isStickerName(opts.fileName)) trackUp(id, pct); });
          trackUp(id, null);
          if (upErr) throw upErr;
        }
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
      } catch (e) {
        console.error(e);
        trackUp(id, null);
        if (path) void kanRemove(CHAT_MEDIA_BUCKET, [path]);
        setConversations(prev => prev.map(c => (c.id === convId ? { ...c, messages: c.messages.filter(m => m.id !== id) } : c)));
        setError('تعذّر إرسال الرسالة، حاول مرة أخرى');
      }
    })();
    return true;
  };

  const sendMessage = async () => {
    if (!text.trim() && !media && queue.length === 0) return;
    const rest = queue;
    const t = text, m = media, reply = replyingTo;
    setText(''); setMedia(null); setReplyingTo(null); setQueue([]);
    inputRef.current?.focus();
    if (t.trim() || m) await send({ text: t, file: m?.file, mediaType: m?.type, fileName: m?.file.name, replyToId: reply?.id });
    for (const f of rest) void send({ file: f, mediaType: detectMediaKind(f), fileName: f.name });
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

  const changeBackground = async (newBg: ChatBackground, all = false) => {
    try {
      const convId = await ensureConversation();
      const ids = all ? Array.from(new Set([convId, ...allConvIds])) : [convId];
      setConversations(prev => prev.map(c => (ids.includes(c.id) ? { ...c, background: newBg } : c)));
      await Promise.all(ids.map(id => saveBackground(id, newBg.type, newBg.value)));
    } catch (e) {
      console.error(e);
      setError('تعذّر حفظ الخلفية');
    }
  };

  const handleBgImageUpload = async (dataUrl: string, all = false) => {
    setShowBgPicker(false);
    try {
      const convId = await ensureConversation();
      const blob = await (await fetch(await shrinkImage(dataUrl, 1280))).blob();
      const path = `${convId}/bg-${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from(CHAT_MEDIA_BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '3600' });
      if (upErr) throw upErr;
      const ids = all ? Array.from(new Set([convId, ...allConvIds])) : [convId];
      const local = URL.createObjectURL(blob);
      setConversations(prev => prev.map(c => (ids.includes(c.id) ? { ...c, background: { type: 'image', value: local } } : c)));
      await Promise.all(ids.map(id => saveBackground(id, 'image', `storage:${path}`)));
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

  // One tap opens the actions, a double tap loves the message with the KIX coin.
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
    if (!conversation || !(await kanConfirm('حذف هذه الرسالة للجميع؟'))) return;
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
    if (msg.media?.path) void kanRemove(CHAT_MEDIA_BUCKET, [msg.media.path]);
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
    if (!conversation || !(await kanConfirm('حذف كل ملفات الألبوم للجميع؟'))) return;
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
    if (paths.length) void kanRemove(CHAT_MEDIA_BUCKET, paths);
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
        {showGames && <GamePicker onClose={() => setShowGames(false)} onInvite={(at, tc) => { sendGame({ k: 'inv', g: crypto.randomUUID(), at, tc }); setShowGames(false); }} />}
        {openGame && <ChessGame game={openGame} games={games} meId={currentUser.id} me={currentUser} other={chatUser} onMove={mv => sendGame({ k: 'mv', g: openGame.g, n: openGame.moves.length, m: mv })} onResign={() => sendGame({ k: 'res', g: openGame.g })} onDraw={k => sendGame({ k, g: openGame.g })} onTimeout={() => sendGame({ k: 'to', g: openGame.g })} onNew={() => { sendGame({ k: 'inv', g: crypto.randomUUID(), at: Date.now(), tc: openGame.tc }); setOpenGid(null); }} onClose={() => setOpenGid(null)} />}
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
                onChange={(newBg, all) => { void changeBackground(newBg, all); setShowBgPicker(false); }}
                onImageUpload={handleBgImageUpload}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} onWheel={onUserScroll} onTouchMove={onUserScroll} className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">👋</div>
            <p className="text-gray-400">ابدأ المحادثة مع {chatUser.displayName}</p>
          </div>
        )}
        {messages.map((msg, idx) => {
          if (parseVote(msg.text)) return null;
          { const gm = parseGame(msg.text); if (gm && gm.k !== 'inv') return null; }
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

              <div className={`min-w-0 max-w-[88%] sm:max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  {...messageGestures(
                    () => { setReplyingTo(msg); window.setTimeout(() => inputRef.current?.focus(), 30); },
                    () => { setActiveMsgId(msg.id); setReactingTo(msg.id); },
                  )}
                  onClick={() => handleBubbleTap(msg)}
                  className={`relative select-none touch-pan-y max-w-full [overflow-wrap:anywhere] px-4 py-2.5 rounded-2xl cursor-pointer transition-shadow ${highlightId === msg.id ? 'ring-2 ring-cyan-400' : ''} ${
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
                        className={`block w-0 min-w-full overflow-hidden text-right mb-2 px-2.5 py-1.5 rounded-lg border-r-2 text-xs ${isMine ? 'bg-white/15 border-white/60' : 'bg-black/25 border-cyan-400'}`}
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
                  {msg.text && (parseGame(msg.text)?.k === 'inv' ? (() => { const gi = games.find(x => x.g === parseGame(msg.text)?.g); return gi ? <GameInviteCard game={gi} games={games} meId={currentUser.id} other={chatUser} onAccept={() => sendGame({ k: 'acc', g: gi.g })} onDecline={() => sendGame({ k: 'dec', g: gi.g })} onOpen={() => setOpenGid(gi.g)} /> : null; })() : parsePoll(msg.text) ? <ChatPoll id={msg.id} text={msg.text} all={messages} meId={currentUser.id} onVote={i => void send({ text: VOTE_TAG + JSON.stringify({ p: msg.id, i }) })} /> : <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" dir="auto"><Linkified text={msg.text} /></p>)}
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
                    {isStickerName(msg.media?.name) && msg.media && <SaveStickerBtn url={msg.media.url} onDone={() => setActiveMsgId(null)} />}
                    {msg.media && msg.media.type !== 'voice' && !isStickerName(msg.media.name) && (
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
        <ScrollDownFab fab={fab} onClick={jumpDown} />
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
      {(
        <div className={`px-2 min-[400px]:px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-gray-900/95 backdrop-blur-md border-t border-gray-800 relative z-10 ${recording ? 'hidden' : ''}`}>
          <input ref={fileRef} type="file" multiple onChange={handleFile} className="hidden" />
          <AnimatePresence>
            {pollOpen && <PollComposer onClose={() => setPollOpen(false)} onSend={(q, o) => { setPollOpen(false); void send({ text: POLL_TAG + JSON.stringify({ q, o }) }); }} />}
            {toolsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.94 }}
                transition={{ type: 'spring', damping: 22, stiffness: 420 }}
                className="absolute bottom-full right-2 mb-2 z-20 flex items-center gap-2 p-2 rounded-2xl bg-gray-900/95 backdrop-blur border border-white/10 shadow-xl origin-bottom-right"
              >
                <button onClick={() => { setPollOpen(true); setToolsOpen(false); }} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-800 text-gray-200 text-xs active:scale-95">📊 استطلاع</button>
                <button onClick={() => { fileRef.current?.click(); setToolsOpen(false); }} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-800 text-gray-200 text-xs hover:text-cyan-300 active:scale-95">
                  <Paperclip size={16} /> إرفاق
                </button>
                <button onClick={() => { setToolsOpen(false); inputRef.current?.blur(); setShowGames(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-800 text-gray-200 text-xs hover:text-white active:scale-95">
                  <Gamepad2 size={16} className="text-white" /> العب
                </button>
                <button
                  onPointerDown={e => e.preventDefault()}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { setAiOpen(true); setToolsOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-r from-violet-600/30 to-cyan-500/20 border border-violet-400/30 text-white text-xs active:scale-95"
                  aria-label="اسأل KIX"
                >
                  <Sparkles size={16} className="text-violet-300" /> اسأل KIX
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {queue.length > 0 && <QueueChip count={queue.length} onClear={() => setQueue([])} />}
            {Object.keys(ups).length > 0 && <UploadBar ups={ups} />}
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
              placeholder={t('اكتب رسالة...')}
              className="flex-1 min-w-0 h-10 px-4 bg-gray-800 rounded-full text-[16px] text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              onFocus={() => setEmojiOpen(false)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            />
            {text.trim() || media || queue.length > 0 ? (
              <motion.button whileTap={{ scale: 0.9 }} onPointerDown={e => e.preventDefault()} onMouseDown={e => e.preventDefault()} onClick={sendMessage} aria-label="إرسال" className="shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full shadow-lg shadow-violet-500/30 disabled:opacity-60">
                <Send size={18} className="text-white" />
              </motion.button>
            ) : (
              <motion.button whileTap={{ scale: 0.9 }} onPointerDown={e => { micHold.x = e.clientX; micHold.y = e.clientY; micHold.t = Date.now(); micHold.held = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } setRecording(true); }} onContextMenu={e => e.preventDefault()} style={{ touchAction: 'none' }} aria-label="تسجيل صوتي" className="shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full shadow-lg shadow-violet-500/30">
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
          chatKey={conversation?.id ?? chatUser.id}
          onClose={() => setAiOpen(false)}
          onUseReply={t => { setText(t); setAiOpen(false); window.setTimeout(() => inputRef.current?.focus(), 50); }}
        />
      )}
    </div>
    </div>
  );
}
