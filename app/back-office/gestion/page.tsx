"use client";

import Link from "next/link";
import { SalonNameGradient } from "@/components/SalonNameGradient";
import { SiteFont } from "@/components/SiteFont";
import { SitePattern, PATTERN_OPTIONS, getPatternBgLayer } from "@/components/SitePattern";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useSalon } from "@/hooks/useSalon";
import { FONT_OPTIONS } from "@/lib/fonts";

function contrastText(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.40 ? "#111827" : "#ffffff";
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

function deriveBorderColor(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const offset = luminance > 0.5 ? -20 : 20;
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  return `#${[r, g, b].map((c) => clamp(c + offset).toString(16).padStart(2, "0")).join("")}`;
}

function derivePanelBg(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance > 0.85) return "#ffffff";
  const clamp = (v: number) => Math.min(255, v + 15);
  return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, "0")).join("")}`;
}

function derivePanelBgSecondary(hex: string): string {
  const panel = derivePanelBg(hex);
  const clean = panel.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const offset = luminance > 0.5 ? -8 : 8;
  const clamp = (v: number) => Math.max(0, Math.min(255, v + offset));
  return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, "0")).join("")}`;
}

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

type ClientAppointmentHistory = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: "confirmed" | "cancelled" | "completed";
  price_cents: number;
  client_message: string | null;
  internal_note?: string | null;
  services: {
    name: string;
    categories: {
      name: string;
    } | null;
  } | null;
};

type SalonSettings = {
  id: string;
  salon_name?: string | null;
  phone?: string | null;
  sms_sender?: string | null;
  sms_provider?: string | null;
  brevo_api_key?: string | null;
  twilio_account_sid?: string | null;
  twilio_auth_token?: string | null;
  twilio_from_number?: string | null;
  twilio_sender_id?: string | null;
  ovh_app_key?: string | null;
  ovh_app_secret?: string | null;
  ovh_consumer_key?: string | null;
  ovh_service_name?: string | null;
  address?: string | null;
  opening_time: string;
  closing_time: string;
  is_open_monday: boolean;
  is_open_tuesday: boolean;
  is_open_wednesday: boolean;
  is_open_thursday: boolean;
  is_open_friday: boolean;
  is_open_saturday: boolean;
  is_open_sunday: boolean;
  opening_time_monday?: string | null;
  closing_time_monday?: string | null;
  opening_time_tuesday?: string | null;
  closing_time_tuesday?: string | null;
  opening_time_wednesday?: string | null;
  closing_time_wednesday?: string | null;
  opening_time_thursday?: string | null;
  closing_time_thursday?: string | null;
  opening_time_friday?: string | null;
  closing_time_friday?: string | null;
  opening_time_saturday?: string | null;
  closing_time_saturday?: string | null;
  opening_time_sunday?: string | null;
  closing_time_sunday?: string | null;
  promo_text?: string | null;
  promo_color_from?: string | null;
  promo_color_to?: string | null;
  promo_text_color?: string | null;
  color_titles?: string | null;
  color_badges?: string | null;
  color_subtitles?: string | null;
  color_accents?: string | null;
  color_contact_bg?: string | null;
  color_page_bg?: string | null;
  color_text_main?: string | null;
  color_text_secondary?: string | null;
  color_header_bg?: string | null;
  color_card_border?: string | null;
  color_nav_text?: string | null;
  color_gradient_end?: string | null;
  color_hero_bg?: string | null;
  color_hero_accent?: string | null;
  color_prestations_accent?: string | null;
  color_apropos_accent?: string | null;
  color_avis_accent?: string | null;
  site_font?: string | null;
  font_salon_name?: string | null;
  bg_pattern?: string | null;
  salon_subtitle?: string | null;
  logo_image_url?: string | null;
  logo_pro_image_url?: string | null;
  hero_image_url?: string | null;
  apropos_image_url?: string | null;
  hero_tagline?: string | null;
  hero_description?: string | null;
  hero_features?: string[] | null;
  apropos_title?: string | null;
  apropos_text?: string | null;
  site_prestations?: Array<{ title: string; description: string; price: string; link?: string }> | null;
  site_reviews?: Array<{ name: string; text: string }> | null;
  gallery_enabled?: boolean | null;
  site_gallery?: { title: string; text: string; photos: Array<{ url: string; caption: string }> } | null;
  email?: string | null;
  instagram_url?: string | null;
  promo_bg_color?: string | null;
};

type ClosureRow = {
  id: string;
  closure_date: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  reason: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  color: string | null;
  display_order: number;
};

type QuestionRow = {
  id: string;
  question: string;
  is_active: boolean;
  display_order: number;
};

type ServiceRow = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  category_id: string | null;
  display_order: number;
  is_visible: boolean;
  duration_before_break: number | null;
  break_duration: number | null;
  duration_after_break: number | null;
  categories: {
    name: string;
    color: string | null;
  } | null;
};

type StaffRow = {
  id: string;
  first_name: string;
  last_name: string;
  color: string;
  is_active: boolean;
};

type StaffSchedule = {
  id: string;
  staff_id: string;
  day_of_week: number; // 0=Dim, 1=Lun, 2=Mar, 3=Mer, 4=Jeu, 5=Ven, 6=Sam
  is_open: boolean;
  opening_time: string;
  closing_time: string;
  has_break: boolean;
  break_start: string | null;
  break_end: string | null;
};

const COLOR_OPTIONS = [
  "#EADCCB",
  "#F8D7DA",
  "#D7E8F8",
  "#DDEFD8",
  "#EFE1FF",
  "#FFE5C2",
  "#D8F3F0",
  "#F4D7E6",
  "#E7E1D8",
  "#FFF0B8",
];

const APPEARANCE_PALETTE: { label: string; colors: string[] }[] = [
  { label: "Neutres",  colors: ["#ffffff","#fdfdfd","#fafafa","#f8f8f8","#f5f5f5","#f0f0f0","#ebebeb","#e6e6e6","#e0e0e0","#dadada","#d4d4d4","#cccccc","#c4c4c4","#bdbdbd","#b5b5b5","#a9a9a9","#9c9c9c","#929292","#878787","#7d7d7d","#737373","#6b6b6b","#636363","#5e5e5e","#595959","#515151","#484848","#444444","#404040","#3a3a3a","#333333","#303030","#2c2c2c","#292929","#262626","#232323","#1f1f1f","#1d1d1d","#1a1a1a","#161616","#111111","#0f0f0f","#0d0d0d","#0c0c0c","#0a0a0a","#050505","#000000"] },
  { label: "Taupes",  colors: ["#fffdf9","#fdf9f4","#faf5ef","#f8efe6","#f5e9dc","#f1e5d6","#ede0cf","#ebdbc7","#e8d5be","#e3cfb6","#ddc9ad","#d9c5a9","#d4c0a4","#d0ba9e","#cbb498","#c7af92","#c2a98c","#bea383","#b99c7a","#b49571","#ae8d68","#a6845f","#9e7b56","#94734e","#8a6a45","#83633e","#7b5b37","#775e48","#736058","#71635a","#6e655c","#655145","#5c3d2e","#533628","#4a2f22","#442d1e","#3d2b1a","#342416","#2a1d12","#261a11","#221610","#211914","#1f1b17","#1a1510","#140e09","#120d08","#0f0b07"] },
  { label: "Ors",  colors: ["#fffbe6","#fffade","#fff8d6","#fff6cf","#fef3c7","#feefb8","#feeaa8","#fee899","#fde68a","#fbe07d","#f8da70","#f6d675","#f3d27a","#f2cd68","#f0c855","#f0c44b","#f0c040","#edbe38","#eabb30","#e9ba30","#e8b830","#e3b430","#ddb030","#dbb34f","#d8b56d","#d6b252","#d4af37","#d6ab3f","#d8a646","#d3a33b","#cea030","#c99830","#c49030","#bf8e37","#b98b3d","#b48637","#ae8030","#a77b30","#a07530","#966f22","#8b6914","#7b5c10","#6b4f0c","#5b430a","#4a3608","#3a2a06","#2a1e04"] },
  { label: "Rouges",  colors: ["#fff5f5","#ffefef","#ffe8e8","#ffe5e5","#fee2e2","#fed6d6","#fecaca","#fec0c0","#fdb5b5","#fdadad","#fca5a5","#fb9797","#f98989","#f97d7d","#f87171","#f76363","#f55555","#f44b4b","#f24040","#f14242","#ef4444","#e83939","#e02e2e","#de2a2a","#dc2626","#d62323","#cf1f1f","#ca1e1e","#c51c1c","#bf1c1c","#b91c1c","#b11a1a","#a81818","#a11a1a","#991b1b","#901919","#871717","#831a1a","#7f1d1d","#751919","#6b1515","#5e1212","#500f0f","#430c0c","#350808","#280404","#1a0000"] },
  { label: "Oranges",  colors: ["#fff8f2","#fff8f0","#fff7ed","#fff4e7","#fff0e0","#ffefdb","#ffedd5","#fee7c7","#fde0b8","#fedcb1","#fed7aa","#fed097","#fec884","#fec17c","#fdba74","#fdb266","#fcaa58","#fc9e4a","#fb923c","#fa8932","#f97f28","#f9791f","#f97316","#f66e13","#f36810","#f26410","#f06010","#ed5c0e","#ea580c","#e5530a","#e04e08","#da4e08","#d44e08","#cb480a","#c2410c","#b83e0b","#ae3a0a","#a4370e","#9a3412","#8b3112","#7c2d12","#6c270e","#5c2009","#4b1907","#3a1204","#2b0c02","#1c0500"] },
  { label: "Jaunes",  colors: ["#fefff1","#fffff0","#fffeec","#fefce8","#fefbe4","#fefae0","#fefad2","#fef9c3","#fef8b6","#fef6a8","#fef5a4","#fef3a0","#fef295","#fef08a","#feec7d","#fde870","#fde45c","#fde047","#fcdc3c","#fbd830","#fbd223","#facc15","#f9c80b","#f8c400","#f7c000","#f5bc00","#f1b800","#edb400","#ecb404","#eab308","#e4ae04","#dea800","#d9a500","#d4a200","#cf9602","#ca8a04","#c18204","#b87a04","#ad6e06","#a16207","#93580b","#854d0e","#78450c","#6b3d0a","#582c07","#451a03","#301202","#1a0900"] },
  { label: "Verts",  colors: ["#f5fff7","#f1fff5","#edfff2","#effef3","#f0fdf4","#e8fdee","#e0fce8","#defce8","#dcfce7","#d2fbde","#c8f9d4","#c2f8d2","#bbf7d0","#aef5c4","#a0f2b8","#93f1b2","#86efac","#73ec9e","#a9b8a7","#60e890","#55e388","#4ade80","#3dd974","#818f7f","#30d468","#29cd63","#22c55e","#1dbd58","#18b452","#17ac4e","#16a34a","#159945","#138f40","#14883f","#15803d","#14803b","#128038","#147336","#166534","#156131","#145c2e","#14582e","#14532d","#114827","#0e3d21","#0a361c","#052e16","#031f0e","#010f06"] },
  { label: "Teals",  colors: ["#f0fffd","#e8fffb","#e0fff9","#e8fefa","#f0fdfa","#e0fcf7","#d0faf4","#cefbf3","#ccfbf1","#befaee","#b0f8ea","#a5f7e7","#99f6e4","#89f3de","#78f0d8","#6bedd6","#5eead4","#50e5cc","#42e0c4","#38dac2","#2dd4bf","#26ceb8","#1ec8b0","#19c0ab","#14b8a6","#11b09f","#0ea898","#0e9e90","#0d9488","#0c8b80","#0b8278","#0d7c73","#0f766e","#0e7069","#0c6a64","#0c6862","#0c6660","#105a55","#134e4a","#114642","#0e3d39","#093634","#042f2e","#03201f","#011010","#010c0c","#000808"] },
  { label: "Bleus",  colors: ["#f5f9ff","#f2f7ff","#eef4ff","#eff5ff","#eff6ff","#eaf3ff","#e4f0ff","#e0edff","#dbeafe","#d4e5fe","#cce0fe","#c6defe","#bfdbfe","#b4d5fe","#a8cffd","#9ecafd","#93c5fd","#86bffd","#78b8fc","#6caffb","#60a5fa","#559df9","#4a94f8","#438bf7","#3b82f6","#357af3","#2e72ef","#2a6bed","#2563eb","#235ee5","#2058de","#1f53db","#1d4ed8","#1c4bd3","#1b48ce","#1b46c9","#1a44c4","#1c42ba","#1e40af","#1e3d9d","#1e3a8a","#1a2d75","#162060","#101b44","#0a1628","#071222","#040d1c"] },
  { label: "Violets",  colors: ["#faf5ff","#f9f3ff","#f7f0ff","#f6f2ff","#f5f3ff","#f1eeff","#ede9fe","#eae5fe","#e6e0fe","#e2dbfe","#ddd6fe","#d7cdfe","#d0c4fd","#cabdfd","#c4b5fd","#bcabfc","#b4a0fb","#ae96fb","#a78bfa","#a082f9","#9878f8","#926af7","#8b5cf6","#8652f3","#8048f0","#7e41ef","#7c3aed","#7835e9","#7430e4","#712cdf","#6d28d9","#6925d3","#6522cc","#6221c6","#5e20c0","#5d21bb","#5b21b6","#561daf","#5018a8","#4e1b9f","#4c1d95","#441a82","#3b166e","#34135f","#2c1050","#1b0a34","#0a0318"] },
  { label: "Roses",  colors: ["#fef0ff","#feecff","#fde8ff","#fdeeff","#fdf4ff","#fdeaff","#fce0fe","#fbe4ff","#fae8ff","#f9dcfe","#f8d0fd","#f7d0fe","#f5d0fe","#f4c5fe","#f2bafd","#f1b3fd","#f0abfc","#ee9ffb","#ec92fa","#ea86fa","#e879f9","#e46df5","#e060f0","#dd53f0","#d946ef","#d53be8","#d030e0","#cc2cdc","#c828d8","#c424d2","#c020cc","#c023d0","#c026d3","#bc21cc","#b81cc4","#b21dc1","#ab1ebe","#a71db7","#a21caf","#941b9f","#86198f","#791781","#6b1472","#500e55","#350838","#28062b","#1a031e"] },
  { label: "Pinks",  colors: ["#fff5f8","#fff3f6","#fff0f4","#fff1f3","#fff1f2","#ffedef","#ffe8ec","#ffe6e9","#ffe4e6","#ffdee1","#fed8dc","#fed3d8","#fecdd3","#fec6cd","#fdbfc6","#fdb2bb","#fda4af","#fd96a4","#fc8898","#fc7d8f","#fb7185","#fa667c","#f85a72","#f64d68","#f43f5e","#f23857","#f03050","#ec2c51","#e82852","#e62451","#e42050","#e31f4c","#e11d48","#dd1b44","#d81840","#d21941","#cc1a42","#c5163f","#be123c","#af123b","#9f1239","#8e1033","#7d0e2c","#5c091f","#3b0412","#2d020d","#1e0008"] },
];

const cardClass = "rounded-[30px] border border-[var(--card-border)]/90 bg-white/75 shadow-[0_18px_45px_rgba(80,55,25,0.07)] backdrop-blur";
const panelClass = "rounded-[26px] border border-[var(--card-border)] bg-[var(--panel-bg)] shadow-sm";
const fieldClass = "rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3 text-[var(--text-main)] outline-none transition focus:border-[var(--gold)]";
const primaryButtonClass = "rounded-2xl bg-[var(--selected-bg)] px-6 py-3 text-sm font-semibold text-[var(--selected-text)] shadow-[0_10px_22px_rgba(31,27,23,0.16)] transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50";
const dangerButtonClass = "rounded-xl border border-[#f0d5cd] bg-[#fff5f2] px-4 py-2 text-sm font-bold text-[#a33a3a] transition hover:bg-white disabled:opacity-50";
const secondaryButtonClass = "rounded-2xl border border-[var(--card-border)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--nav-text)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white";

function getTotalDuration(before: number, pause: number, after: number) {
  return before + pause + after;
}

function formatPrice(priceCents: number) {
  return `${(priceCents / 100).toFixed(2).replace(".00", "")} €`;
}


function normalizePriceToCents(value: string) {
  const normalized = value.replace(/[^0-9,.-]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.round(parsed * 100));
}

function formatTime(timeStr: string) {
  return timeStr.slice(0, 5);
}

function parseDateKey(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function formatFrenchDate(dateStr: string) {
  return parseDateKey(dateStr).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getStatusLabel(status: ClientAppointmentHistory["status"]) {
  if (status === "confirmed") return "Confirmé";
  if (status === "cancelled") return "Annulé";
  return "Terminé";
}

function getBadgeClasses(status: ClientAppointmentHistory["status"]) {
  if (status === "confirmed") return "bg-[#eef8f0] text-[#1f6a3a] border-[#cfe5d6]";
  if (status === "cancelled") return "bg-[#fff1f1] text-[#a33a3a] border-[#efc9c9]";
  return "bg-[#f3f0ff] text-[#5c46b5] border-[#d8d0fa]";
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export default function BackOfficeGestionPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { id: salonId, slug: salonSlug, is_test: isTestSalon } = useSalon();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [search, setSearch] = useState("");

  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [selectedClientAppointments, setSelectedClientAppointments] = useState<ClientAppointmentHistory[]>([]);
  const [loadingClientDetails, setLoadingClientDetails] = useState(false);

  const [isEditingClient, setIsEditingClient] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [settings, setSettings] = useState<SalonSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingSms, setSavingSms] = useState(false);

  const [closures, setClosures] = useState<ClosureRow[]>([]);
  const [newClosureDate, setNewClosureDate] = useState("");
  const [newClosureAllDay, setNewClosureAllDay] = useState(false);
  const [newClosureStartTime, setNewClosureStartTime] = useState("09:00");
  const [newClosureEndTime, setNewClosureEndTime] = useState("18:00");
  const [newClosureReason, setNewClosureReason] = useState("");
  const [savingClosure, setSavingClosure] = useState(false);
  const [deletingClosureId, setDeletingClosureId] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(COLOR_OPTIONS[0]);
  const [savingCategory, setSavingCategory] = useState(false);
  const [updatingCategoryId, setUpdatingCategoryId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<string | null>(null);

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAddService, setShowAddService] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceBeforeBreak, setNewServiceBeforeBreak] = useState("30");
  const [newServiceBreakDuration, setNewServiceBreakDuration] = useState("0");
  const [newServiceAfterBreak, setNewServiceAfterBreak] = useState("0");
  const [newServicePrice, setNewServicePrice] = useState("0");
  const [newServiceCategoryId, setNewServiceCategoryId] = useState("");
  const [newServiceOrder, setNewServiceOrder] = useState("0");
  const [newServiceVisible, setNewServiceVisible] = useState(true);
  const [savingService, setSavingService] = useState(false);
  const [updatingServiceId, setUpdatingServiceId] = useState<string | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [confirmDeleteServiceId, setConfirmDeleteServiceId] = useState<string | null>(null);
  const [serviceEdits, setServiceEdits] = useState<Record<string, {
    name: string; duration_before_break: number; break_duration: number;
    duration_after_break: number; price_raw: string; display_order: number;
    category_id: string; is_visible: boolean;
  }>>({});

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [staffSchedules, setStaffSchedules] = useState<StaffSchedule[]>([]);
  const [newStaffFirstName, setNewStaffFirstName] = useState("");
  const [newStaffLastName, setNewStaffLastName] = useState("");
  const [newStaffColor, setNewStaffColor] = useState("#EADCCB");
  const [savingStaff, setSavingStaff] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);
  const [confirmDeleteStaffId, setConfirmDeleteStaffId] = useState<string | null>(null);
  const [updatingStaffId, setUpdatingStaffId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"closures" | "promotions" | "settings" | "sms" | "staff" | "categories" | "services" | "questionnaire" | "galerie" | "apparence" | "agendaplus">("closures");
  const [appearanceSubTab, setAppearanceSubTab] = useState<"nom" | "motif" | "police" | "couleurs" | "hero" | "logos" | "photos" | "prestations" | "apropos" | "avis">("nom");
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoTextColor, setPromoTextColor] = useState("");
  const [promoColorStars, setPromoColorStars] = useState("");
  const [promoBgColorState, setPromoBgColorState] = useState("");

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [updatingQuestionId, setUpdatingQuestionId] = useState<string | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [confirmDeleteQuestionId, setConfirmDeleteQuestionId] = useState<string | null>(null);

  const [appearanceTitles, setAppearanceTitles] = useState("");
  const [appearanceBadges, setAppearanceBadges] = useState("");
  const [appearanceSubtitles, setAppearanceSubtitles] = useState("");
  const [appearanceAccents, setAppearanceAccents] = useState("");
  const [appearanceContactBg, setAppearanceContactBg] = useState("");
  const [appearancePageBg, setAppearancePageBg] = useState("");
  const [appearanceTextMain, setAppearanceTextMain] = useState("");
  const [appearanceTextSecondary, setAppearanceTextSecondary] = useState("");
  const [appearanceHeroBg, setAppearanceHeroBg] = useState("");
  const [appearanceHeroAccent, setAppearanceHeroAccent] = useState("");
  const [appearancePrestationsAccent, setAppearancePrestationsAccent] = useState("");
  const [appearanceAproposAccent, setAppearanceAproposAccent] = useState("");
  const [appearanceAvisAccent, setAppearanceAvisAccent] = useState("");
  const [appearanceSalonName, setAppearanceSalonName] = useState("");
  const [appearanceSalonSubtitle, setAppearanceSalonSubtitle] = useState("");
  const [appearanceFont, setAppearanceFont] = useState("");
  const [appearanceSalonNameFont, setAppearanceSalonNameFont] = useState("");
  const [appearancePattern, setAppearancePattern] = useState("none");
  const [savingFont, setSavingFont] = useState(false);
  const [savingPattern, setSavingPattern] = useState(false);
  const [fontSearch, setFontSearch] = useState("");
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const [salonNameFontSearch, setSalonNameFontSearch] = useState("");
  const [salonNameFontDropdownOpen, setSalonNameFontDropdownOpen] = useState(false);
  const salonNameFontDropdownRef = useRef<HTMLDivElement>(null);
  const [appearanceHeroTagline, setAppearanceHeroTagline] = useState("");
  const [appearanceHeroDescription, setAppearanceHeroDescription] = useState("");
  const [appearanceHeroFeatures, setAppearanceHeroFeatures] = useState(["", "", ""]);
  const [savingHeroText, setSavingHeroText] = useState(false);
  const [appearancePrestations, setAppearancePrestations] = useState([
    { title: "", description: "", price: "", link: "" },
    { title: "", description: "", price: "", link: "" },
    { title: "", description: "", price: "", link: "" },
    { title: "", description: "", price: "", link: "" },
    { title: "", description: "", price: "", link: "" },
    { title: "", description: "", price: "", link: "" },
    { title: "", description: "", price: "", link: "" },
    { title: "", description: "", price: "", link: "" },
  ]);
  const [savingPrestations, setSavingPrestations] = useState(false);
  const [appearanceAproposTitle, setAppearanceAproposTitle] = useState("");
  const [appearanceAproposText, setAppearanceAproposText] = useState("");
  const [savingApropos, setSavingApropos] = useState(false);
  const [savingAppearanceMeta, setSavingAppearanceMeta] = useState(false);
  const [openColorPicker, setOpenColorPicker] = useState<string | null>(null);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLogoPro, setUploadingLogoPro] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingApropos, setUploadingApropos] = useState(false);
  const [appearanceReviews, setAppearanceReviews] = useState([
    { name: "", text: "" },
    { name: "", text: "" },
    { name: "", text: "" },
    { name: "", text: "" },
    { name: "", text: "" },
  ]);
  const [savingReviews, setSavingReviews] = useState(false);

  const [galleryEnabled, setGalleryEnabled] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState("");
  const [galleryText, setGalleryText] = useState("");
  const [galleryPhotos, setGalleryPhotos] = useState<Array<{ url: string; caption: string }>>(
    Array.from({ length: 12 }, () => ({ url: "", caption: "" }))
  );
  const [savingGallery, setSavingGallery] = useState(false);
  const [uploadingGalleryIndex, setUploadingGalleryIndex] = useState<number | null>(null);

  const [campaignMessage, setCampaignMessage] = useState("");
  const [campaignOnlyWithAppointments, setCampaignOnlyWithAppointments] = useState(false);
  const [campaignClientCount, setCampaignClientCount] = useState<number | null>(null);
  const [campaignCheckingCount, setCampaignCheckingCount] = useState(false);
  const [campaignConfirm, setCampaignConfirm] = useState(false);
  const [campaignSending, setCampaignSending] = useState(false);
  const [campaignResult, setCampaignResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);

  useEffect(() => {
    document.body.style.overflow = selectedClient ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedClient]);

  useEffect(() => {
    if (!fontDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target as Node)) {
        setFontDropdownOpen(false);
        setFontSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [fontDropdownOpen]);

  useEffect(() => {
    if (!salonNameFontDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (salonNameFontDropdownRef.current && !salonNameFontDropdownRef.current.contains(e.target as Node)) {
        setSalonNameFontDropdownOpen(false);
        setSalonNameFontSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [salonNameFontDropdownOpen]);

  useEffect(() => {
    loadGestionData();
  }, [salonId]);

  const loadGestionData = async () => {
    try {
      setLoading(true);
      setStatusMessage("");

      const [settingsRes, closuresRes, categoriesRes, servicesRes, clientsRes, staffRes, schedulesRes, questionsRes] = await Promise.all([
        supabase.from("salon_settings").select("*").eq("salon_id", salonId).limit(1).maybeSingle(),
        supabase.from("exception_closures").select("*").eq("salon_id", salonId).order("closure_date", { ascending: true }),
        supabase.from("categories").select("id, name, color, display_order").eq("salon_id", salonId).order("display_order", { ascending: true }).order("name", { ascending: true }),
        supabase
          .from("services")
          .select("id, name, duration_minutes, price_cents, category_id, display_order, is_visible, duration_before_break, break_duration, duration_after_break, categories(name, color)")
          .eq("salon_id", salonId)
          .order("display_order", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("clients")
          .select("id, first_name, last_name, phone, email, notes")
          .eq("salon_id", salonId)
          .order("last_name", { ascending: true })
          .order("first_name", { ascending: true }),
        supabase.from("staff").select("id, first_name, last_name, color, is_active").eq("salon_id", salonId).order("last_name", { ascending: true }),
        supabase.from("staff_schedules").select("*").eq("salon_id", salonId).order("day_of_week", { ascending: true }),
        supabase.from("questionnaire_questions").select("id, question, is_active, display_order").eq("salon_id", salonId).order("display_order", { ascending: true }).order("created_at", { ascending: true }),
      ]);

      if (settingsRes.error) throw new Error(settingsRes.error.message);
      if (closuresRes.error) throw new Error(closuresRes.error.message);
      if (categoriesRes.error) throw new Error(categoriesRes.error.message);
      if (servicesRes.error) throw new Error(servicesRes.error.message);
      if (clientsRes.error) throw new Error(clientsRes.error.message);
      if (staffRes.error) throw new Error(staffRes.error.message);
      if (schedulesRes.error) throw new Error(schedulesRes.error.message);
      if (questionsRes.error) throw new Error(questionsRes.error.message);

      const loadedSettings = (settingsRes.data ?? null) as SalonSettings | null;
      setSettings(loadedSettings);
      setAppearanceSalonName(loadedSettings?.salon_name ?? "");
      setAppearanceSalonSubtitle(loadedSettings?.salon_subtitle ?? "");
      setAppearanceFont(loadedSettings?.site_font ?? "");
      setAppearanceSalonNameFont(loadedSettings?.font_salon_name ?? "");
      setAppearancePattern(loadedSettings?.bg_pattern ?? "none");
      if (loadedSettings?.promo_text_color) setPromoTextColor(loadedSettings.promo_text_color);
      if (loadedSettings?.promo_color_from) setPromoColorStars(loadedSettings.promo_color_from);
      if (loadedSettings?.promo_bg_color) setPromoBgColorState(loadedSettings.promo_bg_color);
      if (loadedSettings?.hero_tagline) setAppearanceHeroTagline(loadedSettings.hero_tagline);
      if (loadedSettings?.hero_description) setAppearanceHeroDescription(loadedSettings.hero_description);
      if (loadedSettings?.hero_features?.length) setAppearanceHeroFeatures(loadedSettings.hero_features);
      if (loadedSettings?.site_prestations?.length) {
        const loaded = (loadedSettings.site_prestations as { title: string; description: string; price: string; link?: string }[]).map((p) => ({ ...p, link: p.link ?? "" }));
        const padded = [...loaded];
        while (padded.length < 8) padded.push({ title: "", description: "", price: "", link: "" });
        setAppearancePrestations(padded);
      }
      if (loadedSettings?.apropos_title) setAppearanceAproposTitle(loadedSettings.apropos_title);
      if (loadedSettings?.apropos_text) setAppearanceAproposText(loadedSettings.apropos_text);
      if (loadedSettings?.site_reviews?.length) {
        const loaded = loadedSettings.site_reviews as { name: string; text: string }[];
        const padded = [...loaded];
        while (padded.length < 5) padded.push({ name: "", text: "" });
        setAppearanceReviews(padded);
      }
      setGalleryEnabled(loadedSettings?.gallery_enabled ?? false);
      setGalleryTitle(loadedSettings?.site_gallery?.title ?? "");
      setGalleryText(loadedSettings?.site_gallery?.text ?? "");
      {
        const loaded = loadedSettings?.site_gallery?.photos ?? [];
        const padded: Array<{ url: string; caption: string }> = [...loaded];
        while (padded.length < 12) padded.push({ url: "", caption: "" });
        setGalleryPhotos(padded);
      }
      setAppearanceTitles(loadedSettings?.color_titles ?? "");
      setAppearanceBadges(loadedSettings?.color_badges ?? "");
      setAppearanceSubtitles(loadedSettings?.color_subtitles ?? "");
      setAppearanceAccents(loadedSettings?.color_accents ?? "");
      setAppearanceContactBg(loadedSettings?.color_contact_bg ?? "");
      setAppearancePageBg(loadedSettings?.color_page_bg ?? "");
      setAppearanceTextMain(loadedSettings?.color_text_main ?? "");
      setAppearanceTextSecondary(loadedSettings?.color_text_secondary ?? "");
      setAppearanceHeroBg(loadedSettings?.color_hero_bg ?? loadedSettings?.color_contact_bg ?? "");
      setAppearanceHeroAccent(loadedSettings?.color_hero_accent ?? loadedSettings?.color_badges ?? "");
      setAppearancePrestationsAccent(loadedSettings?.color_prestations_accent ?? loadedSettings?.color_badges ?? "");
      setAppearanceAproposAccent(loadedSettings?.color_apropos_accent ?? loadedSettings?.color_badges ?? "");
      setAppearanceAvisAccent(loadedSettings?.color_avis_accent ?? loadedSettings?.color_badges ?? "");
      setClosures((closuresRes.data ?? []) as ClosureRow[]);
      setCategories((categoriesRes.data ?? []) as CategoryRow[]);
      setServices((servicesRes.data ?? []) as unknown as ServiceRow[]);
      setClients((clientsRes.data ?? []) as ClientRow[]);
      setStaff((staffRes.data ?? []) as StaffRow[]);
      setStaffSchedules((schedulesRes.data ?? []) as StaffSchedule[]);
      setQuestions((questionsRes.data ?? []) as QuestionRow[]);
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message ?? "Impossible de charger la gestion du salon."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      setSavingSettings(true);
      setStatusMessage("");

      const { data: oldData } = await supabase.from("salon_settings").select("*").eq("id", settings.id).eq("salon_id", salonId).single();
      const oldSettings = oldData as SalonSettings | null;

      const { data, error } = await supabase
        .from("salon_settings")
        .update({
          phone: settings.phone ?? null,
          address: settings.address ?? null,
          email: settings.email ?? null,
          instagram_url: settings.instagram_url ?? null,
          opening_time: settings.opening_time,
          closing_time: settings.closing_time,
          is_open_monday: settings.is_open_monday,
          is_open_tuesday: settings.is_open_tuesday,
          is_open_wednesday: settings.is_open_wednesday,
          is_open_thursday: settings.is_open_thursday,
          is_open_friday: settings.is_open_friday,
          is_open_saturday: settings.is_open_saturday,
          is_open_sunday: settings.is_open_sunday,
          opening_time_monday: settings.opening_time_monday ?? null,
          closing_time_monday: settings.closing_time_monday ?? null,
          opening_time_tuesday: settings.opening_time_tuesday ?? null,
          closing_time_tuesday: settings.closing_time_tuesday ?? null,
          opening_time_wednesday: settings.opening_time_wednesday ?? null,
          closing_time_wednesday: settings.closing_time_wednesday ?? null,
          opening_time_thursday: settings.opening_time_thursday ?? null,
          closing_time_thursday: settings.closing_time_thursday ?? null,
          opening_time_friday: settings.opening_time_friday ?? null,
          closing_time_friday: settings.closing_time_friday ?? null,
          opening_time_saturday: settings.opening_time_saturday ?? null,
          closing_time_saturday: settings.closing_time_saturday ?? null,
          opening_time_sunday: settings.opening_time_sunday ?? null,
          closing_time_sunday: settings.closing_time_sunday ?? null,
        })
        .eq("id", settings.id)
        .eq("salon_id", salonId)
        .select("*")
        .single();
      if (error) throw new Error((error as Error).message);
      setSettings(data as SalonSettings);

      if (oldSettings) {
        const DAYS = [
          { slug: "sunday",    dow: 0 },
          { slug: "monday",    dow: 1 },
          { slug: "tuesday",   dow: 2 },
          { slug: "wednesday", dow: 3 },
          { slug: "thursday",  dow: 4 },
          { slug: "friday",    dow: 5 },
          { slug: "saturday",  dow: 6 },
        ] as const;

        let schedulesChanged = false;

        for (const { slug, dow } of DAYS) {
          const oldOpen  = (oldSettings[`opening_time_${slug}` as keyof SalonSettings] as string | null)?.slice(0, 5) ?? oldSettings.opening_time?.slice(0, 5) ?? "09:00";
          const oldClose = (oldSettings[`closing_time_${slug}` as keyof SalonSettings] as string | null)?.slice(0, 5) ?? oldSettings.closing_time?.slice(0, 5) ?? "19:00";
          const newOpen  = (settings[`opening_time_${slug}` as keyof SalonSettings] as string | null)?.slice(0, 5) ?? settings.opening_time?.slice(0, 5) ?? "09:00";
          const newClose = (settings[`closing_time_${slug}` as keyof SalonSettings] as string | null)?.slice(0, 5) ?? settings.closing_time?.slice(0, 5) ?? "19:00";

          if (oldOpen === newOpen && oldClose === newClose) continue;

          for (const sched of staffSchedules.filter((s) => s.day_of_week === dow)) {
            const staffOpen  = sched.opening_time?.slice(0, 5) ?? "09:00";
            const staffClose = sched.closing_time?.slice(0, 5) ?? "19:00";

            let adjOpen  = staffOpen;
            let adjClose = staffClose;

            if (staffOpen === oldOpen) adjOpen = newOpen;
            else if (staffOpen < newOpen) adjOpen = newOpen;

            if (staffClose === oldClose) adjClose = newClose;
            else if (staffClose > newClose) adjClose = newClose;

            if (adjOpen >= adjClose) { adjOpen = newOpen; adjClose = newClose; }

            if (adjOpen !== staffOpen || adjClose !== staffClose) {
              await supabase.from("staff_schedules").update({ opening_time: adjOpen, closing_time: adjClose }).eq("id", sched.id).eq("salon_id", salonId);
              schedulesChanged = true;
            }
          }
        }

        if (schedulesChanged) {
          const { data: refreshed } = await supabase.from("staff_schedules").select("*").eq("salon_id", salonId).order("day_of_week", { ascending: true });
          if (refreshed) setStaffSchedules(refreshed as StaffSchedule[]);
        }
      }

      setStatusMessage("Réglages enregistrés ✅");
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message ?? "Impossible d’enregistrer les réglages."}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateClosure = async () => {
    if (!newClosureDate) {
      setStatusMessage("Choisis une date pour la fermeture.");
      return;
    }
    try {
      setSavingClosure(true);
      setStatusMessage("");
      const { error } = await supabase.from("exception_closures").insert({
        salon_id: salonId,
        closure_date: newClosureDate,
        is_all_day: newClosureAllDay,
        start_time: newClosureAllDay ? "00:00" : newClosureStartTime,
        end_time: newClosureAllDay ? "23:59" : newClosureEndTime,
        reason: newClosureReason.trim() || null,
      });
      if (error) throw new Error((error as Error).message);
      setNewClosureDate("");
      setNewClosureAllDay(false);
      setNewClosureStartTime("09:00");
      setNewClosureEndTime("18:00");
      setNewClosureReason("");
      setStatusMessage("Fermeture ajoutée ✅");
      await loadGestionData();
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message ?? "Impossible d’ajouter la fermeture."}`);
    } finally {
      setSavingClosure(false);
    }
  };

  const handleDeleteClosure = async (id: string) => {
    try {
      setDeletingClosureId(id);
      setStatusMessage("");
      const { error } = await supabase.from("exception_closures").delete().eq("id", id).eq("salon_id", salonId);
      if (error) throw new Error((error as Error).message);
      setClosures((prev) => prev.filter((closure) => closure.id !== id));
      setStatusMessage("Fermeture supprimée ✅");
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message ?? "Impossible de supprimer la fermeture."}`);
    } finally {
      setDeletingClosureId(null);
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      setStatusMessage("Indique un nom de catégorie.");
      return;
    }
    try {
      setSavingCategory(true);
      setStatusMessage("");
      const { error } = await supabase.from("categories").insert({ salon_id: salonId, name, color: newCategoryColor });
      if (error) throw new Error((error as Error).message);
      setNewCategoryName("");
      setNewCategoryColor(COLOR_OPTIONS[0]);
      setStatusMessage("Catégorie ajoutée ✅");
      await loadGestionData();
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message ?? "Impossible d’ajouter la catégorie."}`);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleMoveCategory = async (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= categories.length) return;
    const reordered = [...categories];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    const updated = reordered.map((c, i) => ({ ...c, display_order: i }));
    setCategories(updated);
    const supabase = createClient();
    await Promise.all(updated.map((c) => supabase.from("categories").update({ display_order: c.display_order }).eq("id", c.id).eq("salon_id", salonId)));
  };

  const handleUpdateCategory = async (id: string, values: Partial<Pick<CategoryRow, "name" | "color" | "display_order">>) => {
    try {
      setUpdatingCategoryId(id);
      setStatusMessage("");
      const { error } = await supabase.from("categories").update(values).eq("id", id).eq("salon_id", salonId);
      if (error) throw new Error((error as Error).message);
      setCategories((prev) => prev.map((category) => (category.id === id ? { ...category, ...values } : category)));
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message ?? "Impossible de modifier la catégorie."}`);
    } finally {
      setUpdatingCategoryId(null);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      setDeletingCategoryId(id);
      setStatusMessage("");
      const { error } = await supabase.from("categories").delete().eq("id", id).eq("salon_id", salonId);
      if (error) throw new Error((error as Error).message);
      setCategories((prev) => prev.filter((category) => category.id !== id));
      setStatusMessage("Catégorie supprimée ✅");
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message ?? "Impossible de supprimer la catégorie."}`);
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const handleCreateService = async () => {
    const name = newServiceName.trim();
    const before = Math.max(0, Number(newServiceBeforeBreak) || 0);
    const pause = Math.max(0, Number(newServiceBreakDuration) || 0);
    const after = Math.max(0, Number(newServiceAfterBreak) || 0);
    const total = getTotalDuration(before, pause, after);
    const priceCents = Math.max(0, Math.round((Number(newServicePrice) || 0) * 100));
    if (!name) {
      setStatusMessage("Indique un nom de prestation.");
      return;
    }
    if (total <= 0) {
      setStatusMessage("La durée totale doit être supérieure à 0 minute.");
      return;
    }
    try {
      setSavingService(true);
      setStatusMessage("");
      const { error } = await supabase.from("services").insert({
        salon_id: salonId,
        name,
        duration_minutes: total,
        duration_before_break: before,
        break_duration: pause,
        duration_after_break: after,
        price_cents: priceCents,
        category_id: newServiceCategoryId || null,
        display_order: Number(newServiceOrder) || 0,
        is_visible: newServiceVisible,
      });
      if (error) throw new Error((error as Error).message);
      setNewServiceName("");
      setNewServiceBeforeBreak("30");
      setNewServiceBreakDuration("0");
      setNewServiceAfterBreak("0");
      setNewServicePrice("0");
      setNewServiceCategoryId("");
      setNewServiceOrder("0");
      setNewServiceVisible(true);
      setStatusMessage("Prestation ajoutée ✅");
      await loadGestionData();
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message ?? "Impossible d’ajouter la prestation."}`);
    } finally {
      setSavingService(false);
    }
  };

  const handleUpdateService = async (id: string, values: Partial<ServiceRow>) => {
    try {
      setUpdatingServiceId(id);
      setStatusMessage("");
      const cleanValues: Record<string, any> = { ...values };
      delete cleanValues.categories;
      if ("duration_before_break" in cleanValues || "break_duration" in cleanValues || "duration_after_break" in cleanValues) {
        const current = services.find((service) => service.id === id);
        const pause_ = Number(cleanValues.break_duration ?? current?.break_duration ?? 0);
        const after_ = Number(cleanValues.duration_after_break ?? current?.duration_after_break ?? 0);
        const before = Number(cleanValues.duration_before_break ?? current?.duration_before_break ?? Math.max(0, (current?.duration_minutes ?? 0) - pause_ - after_));
        const pause = Number(cleanValues.break_duration ?? current?.break_duration ?? 0);
        const after = Number(cleanValues.duration_after_break ?? current?.duration_after_break ?? 0);
        cleanValues.duration_minutes = getTotalDuration(before, pause, after);
      }
      const { error } = await supabase.from("services").update(cleanValues).eq("id", id).eq("salon_id", salonId);
      if (error) throw new Error((error as Error).message);
      await loadGestionData();
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message ?? "Impossible de modifier la prestation."}`);
    } finally {
      setUpdatingServiceId(null);
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      setDeletingServiceId(id);
      setStatusMessage("");
      const { error } = await supabase.from("services").delete().eq("id", id).eq("salon_id", salonId);
      if (error) throw new Error((error as Error).message);
      setServices((prev) => prev.filter((service) => service.id !== id));
      setStatusMessage("Prestation supprimée ✅");
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message ?? "Impossible de supprimer la prestation."}`);
    } finally {
      setDeletingServiceId(null);
    }
  };

  const handleCreateStaff = async () => {
    const first = newStaffFirstName.trim();
    const last = newStaffLastName.trim();
    if (!first || !last) { setStatusMessage("Le prénom et le nom sont obligatoires."); return; }
    try {
      setSavingStaff(true);
      setStatusMessage("");
      const { data: newStaff, error } = await supabase.from("staff").insert({
        salon_id: salonId, first_name: first, last_name: last, color: newStaffColor, is_active: true,
      }).select("id").single();
      if (error) throw new Error(error.message);

      // Créer les 7 schedules par défaut (lun-ven ouverts, sam-dim fermés)
      const salonOpen = settings?.opening_time?.slice(0,5) ?? "09:00";
      const salonClose = settings?.closing_time?.slice(0,5) ?? "19:00";
      const defaultSchedules = [0,1,2,3,4,5,6].map((day) => ({
        salon_id: salonId,
        staff_id: newStaff.id,
        day_of_week: day,
        is_open: day >= 1 && day <= 5,
        opening_time: salonOpen,
        closing_time: salonClose,
        has_break: false,
        break_start: null,
        break_end: null,
      }));
      const { error: schedErr } = await supabase.from("staff_schedules").insert(defaultSchedules);
      if (schedErr) throw new Error(schedErr.message);

      setNewStaffFirstName(""); setNewStaffLastName(""); setNewStaffColor("#EADCCB");
      setStatusMessage("Prestataire ajoutée ✅");
      await loadGestionData();
    } catch (err: unknown) {
      setStatusMessage(`Erreur : ${(err as Error).message}`);
    } finally { setSavingStaff(false); }
  };

  const handleUpdateStaff = async (id: string, values: Partial<StaffRow>) => {
    try {
      setUpdatingStaffId(id);
      const { error } = await supabase.from("staff").update(values).eq("id", id).eq("salon_id", salonId);
      if (error) throw new Error(error.message);
      setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...values } : s)));
    } catch (err: unknown) {
      setStatusMessage(`Erreur : ${(err as Error).message}`);
    } finally { setUpdatingStaffId(null); }
  };

  const handleUpdateSchedule = async (scheduleId: string, values: Partial<StaffSchedule>) => {
    try {
      const { error } = await supabase.from("staff_schedules").update(values).eq("id", scheduleId).eq("salon_id", salonId);
      if (error) throw new Error(error.message);
      setStaffSchedules((prev) => prev.map((s) => (s.id === scheduleId ? { ...s, ...values } : s)));
    } catch (err: unknown) {
      setStatusMessage(`Erreur : ${(err as Error).message}`);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      setDeletingStaffId(id);
      const { error } = await supabase.from("staff").delete().eq("id", id).eq("salon_id", salonId);
      if (error) throw new Error(error.message);
      setStaff((prev) => prev.filter((s) => s.id !== id));
      setConfirmDeleteStaffId(null);
      setStatusMessage("Prestataire supprimée ✅");
    } catch (err: unknown) {
      setStatusMessage(`Erreur : ${(err as Error).message}`);
    } finally { setDeletingStaffId(null); }
  };

  const handleSavePromo = async () => {
    if (!settings) return;
    try {
      setSavingPromo(true);
      setStatusMessage("");
      const { data, error } = await supabase
        .from("salon_settings")
        .update({
          promo_text: settings.promo_text?.trim() || null,
          promo_color_from: promoColorStars || null,
          promo_text_color: promoTextColor || null,
          promo_bg_color: promoBgColorState || null,
        })
        .eq("id", settings.id)
        .eq("salon_id", salonId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      setSettings(data as SalonSettings);
      setStatusMessage("Promotion enregistrée ✅");
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message}`);
    } finally {
      setSavingPromo(false);
    }
  };

  const handleCreateQuestion = async () => {
    const text = newQuestion.trim();
    if (!text) { setStatusMessage("Indique le texte de la question."); return; }
    try {
      setSavingQuestion(true);
      setStatusMessage("");
      const maxOrder = questions.reduce((max, q) => Math.max(max, q.display_order), -1);
      const { error } = await supabase.from("questionnaire_questions").insert({ salon_id: salonId, question: text, is_active: true, display_order: maxOrder + 1 });
      if (error) throw new Error(error.message);
      setNewQuestion("");
      setStatusMessage("Question ajoutée ✅");
      await loadGestionData();
    } catch (err: unknown) {
      setStatusMessage(`Erreur : ${(err as Error).message}`);
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleUpdateQuestion = async (id: string, values: Partial<Pick<QuestionRow, "question" | "is_active" | "display_order">>) => {
    try {
      setUpdatingQuestionId(id);
      const { error } = await supabase.from("questionnaire_questions").update(values).eq("id", id).eq("salon_id", salonId);
      if (error) throw new Error(error.message);
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...values } : q)));
    } catch (err: unknown) {
      setStatusMessage(`Erreur : ${(err as Error).message}`);
    } finally {
      setUpdatingQuestionId(null);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      setDeletingQuestionId(id);
      const { error } = await supabase.from("questionnaire_questions").delete().eq("id", id).eq("salon_id", salonId);
      if (error) throw new Error(error.message);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setConfirmDeleteQuestionId(null);
      setStatusMessage("Question supprimée ✅");
    } catch (err: unknown) {
      setStatusMessage(`Erreur : ${(err as Error).message}`);
    } finally {
      setDeletingQuestionId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const loadClientDetails = async (client: ClientRow) => {
    try {
      setSelectedClient(client);
      setIsEditingClient(false);
      setEditFirstName(client.first_name);
      setEditLastName(client.last_name);
      setEditPhone(client.phone ?? "");
      setEditEmail(client.email ?? "");
      setEditNotes(client.notes ?? "");

      setLoadingClientDetails(true);
      setStatusMessage("");

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          price_cents,
          client_message,
          internal_note,
          services (
            name,
            categories (
              name
            )
          )
        `
        )
        .eq("salon_id", salonId)
        .eq("client_id", client.id)
        .order("appointment_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (error) throw new Error((error as Error).message);

      setSelectedClientAppointments((data ?? []) as unknown as ClientAppointmentHistory[]);
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message ?? "Impossible de charger la fiche client."}`);
      setSelectedClientAppointments([]);
    } finally {
      setLoadingClientDetails(false);
    }
  };

  const closeClientModal = () => {
    setSelectedClient(null);
    setSelectedClientAppointments([]);
    setIsEditingClient(false);
    setEditFirstName("");
    setEditLastName("");
    setEditPhone("");
    setEditEmail("");
    setEditNotes("");
  };

  const handleSaveClient = async () => {
    if (!selectedClient) return;

    const cleanPhone = normalizePhone(editPhone);

    if (!editFirstName.trim() || !editLastName.trim()) {
      setStatusMessage("Le prénom et le nom sont obligatoires.");
      return;
    }

    if (cleanPhone.length !== 10) {
      setStatusMessage("Le téléphone doit contenir exactement 10 chiffres.");
      return;
    }

    try {
      setSavingClient(true);
      setStatusMessage("");

      const { data: existingPhoneClient, error: existingPhoneError } = await supabase
        .from("clients")
        .select("id")
        .eq("salon_id", salonId)
        .eq("phone", cleanPhone)
        .neq("id", selectedClient.id)
        .maybeSingle();

      if (existingPhoneError) {
        throw new Error(existingPhoneError.message);
      }

      if (existingPhoneClient?.id) {
        setStatusMessage("Ce numéro est déjà utilisé par un autre client.");
        setSavingClient(false);
        return;
      }

      const { error } = await supabase
        .from("clients")
        .update({
          first_name: editFirstName.trim(),
          last_name: editLastName.trim(),
          phone: cleanPhone,
          email: editEmail.trim() || null,
          notes: editNotes.trim() || null,
        })
        .eq("id", selectedClient.id)
        .eq("salon_id", salonId);

      if (error) throw new Error((error as Error).message);

      const updatedClient: ClientRow = {
        ...selectedClient,
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        phone: cleanPhone,
        email: editEmail.trim() || null,
        notes: editNotes.trim() || null,
      };

      setSelectedClient(updatedClient);
      setClients((prev) =>
        [...prev.map((client) => (client.id === updatedClient.id ? updatedClient : client))].sort(
          (a, b) =>
            `${a.last_name} ${a.first_name}`.localeCompare(
              `${b.last_name} ${b.first_name}`,
              "fr"
            )
        )
      );

      setIsEditingClient(false);
      setStatusMessage("Fiche client mise à jour ✅");
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message ?? "Impossible de mettre à jour le client."}`);
    } finally {
      setSavingClient(false);
    }
  };

  const handleSaveHeroText = async () => {
    if (!settings) return;
    try {
      setSavingHeroText(true);
      setStatusMessage("");
      const { error } = await supabase
        .from("salon_settings")
        .update({
          hero_tagline: appearanceHeroTagline.trim() || null,
          hero_description: appearanceHeroDescription.trim() || null,
          hero_features: appearanceHeroFeatures,
        })
        .eq("id", settings.id)
        .eq("salon_id", salonId);
      if (error) throw new Error(error.message);
      setSettings((prev) => prev ? {
        ...prev,
        hero_tagline: appearanceHeroTagline.trim() || null,
        hero_description: appearanceHeroDescription.trim() || null,
        hero_features: appearanceHeroFeatures,
      } : prev);
      setStatusMessage("Carte hero enregistrée ✅");
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message}`);
    } finally {
      setSavingHeroText(false);
    }
  };

  const handleSavePrestations = async () => {
    if (!settings) return;
    try {
      setSavingPrestations(true);
      setStatusMessage("");
      const { error } = await supabase
        .from("salon_settings")
        .update({ site_prestations: appearancePrestations })
        .eq("id", settings.id)
        .eq("salon_id", salonId);
      if (error) throw new Error(error.message);
      setSettings((prev) => prev ? { ...prev, site_prestations: appearancePrestations } : prev);
      setStatusMessage("Prestations enregistrées ✅");
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message}`);
    } finally {
      setSavingPrestations(false);
    }
  };

  const handleSaveApropos = async () => {
    if (!settings) return;
    try {
      setSavingApropos(true);
      setStatusMessage("");
      const { error } = await supabase
        .from("salon_settings")
        .update({
          apropos_title: appearanceAproposTitle.trim() || null,
          apropos_text: appearanceAproposText.trim() || null,
        })
        .eq("id", settings.id)
        .eq("salon_id", salonId);
      if (error) throw new Error(error.message);
      setSettings((prev) => prev ? {
        ...prev,
        apropos_title: appearanceAproposTitle.trim() || null,
        apropos_text: appearanceAproposText.trim() || null,
      } : prev);
      setStatusMessage("Section À propos enregistrée ✅");
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message}`);
    } finally {
      setSavingApropos(false);
    }
  };

  const handleSaveReviews = async () => {
    if (!settings) return;
    try {
      setSavingReviews(true);
      setStatusMessage("");
      const { error } = await supabase
        .from("salon_settings")
        .update({ site_reviews: appearanceReviews })
        .eq("id", settings.id)
        .eq("salon_id", salonId);
      if (error) throw new Error(error.message);
      setSettings((prev) => prev ? { ...prev, site_reviews: appearanceReviews } : prev);
      setStatusMessage("Avis enregistrés ✅");
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message}`);
    } finally {
      setSavingReviews(false);
    }
  };

  const handleSaveAppearanceMeta = async () => {
    if (!settings) return;
    try {
      setSavingAppearanceMeta(true);
      setStatusMessage("");
      const { error } = await supabase
        .from("salon_settings")
        .update({
          salon_name: appearanceSalonName.trim() || settings.salon_name,
          salon_subtitle: appearanceSalonSubtitle.trim() || null,
          font_salon_name: appearanceSalonNameFont || null,
        })
        .eq("id", settings.id)
        .eq("salon_id", salonId);
      if (error) throw new Error(error.message);
      setSettings((prev) => prev ? {
        ...prev,
        salon_name: appearanceSalonName.trim() || prev.salon_name,
        salon_subtitle: appearanceSalonSubtitle.trim() || null,
        font_salon_name: appearanceSalonNameFont || null,
      } : prev);
      setStatusMessage("Nom du salon enregistré ✅");
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message}`);
    } finally {
      setSavingAppearanceMeta(false);
    }
  };

  const handleSaveSms = async () => {
    if (!settings) return;
    try {
      setSavingSms(true);
      setStatusMessage("");
      const { error } = await supabase
        .from("salon_settings")
        .update({
          sms_sender: settings.sms_sender ?? null,
          sms_provider: settings.sms_provider ?? "brevo",
          brevo_api_key: settings.brevo_api_key ?? null,
          twilio_account_sid: settings.twilio_account_sid ?? null,
          twilio_auth_token: settings.twilio_auth_token ?? null,
          twilio_from_number: settings.twilio_from_number ?? null,
          twilio_sender_id: settings.twilio_sender_id ?? null,
          ovh_app_key: settings.ovh_app_key ?? null,
          ovh_app_secret: settings.ovh_app_secret ?? null,
          ovh_consumer_key: settings.ovh_consumer_key ?? null,
          ovh_service_name: settings.ovh_service_name ?? null,
        })
        .eq("id", settings.id)
        .eq("salon_id", salonId);
      if (error) throw new Error(error.message);
      setStatusMessage("Réglages SMS enregistrés ✅");
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message}`);
    } finally {
      setSavingSms(false);
    }
  };

  const handleSaveGallery = async () => {
    if (!settings) return;
    try {
      setSavingGallery(true);
      setStatusMessage("");
      const site_gallery = { title: galleryTitle, text: galleryText, photos: galleryPhotos };
      const { error } = await supabase
        .from("salon_settings")
        .update({ gallery_enabled: galleryEnabled, site_gallery })
        .eq("id", settings.id)
        .eq("salon_id", salonId);
      if (error) throw new Error(error.message);
      setStatusMessage("Galerie enregistrée ✅");
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message}`);
    } finally {
      setSavingGallery(false);
    }
  };

  const removeStorageFile = async (url: string | null | undefined) => {
    if (!url) return;
    const path = url.split("/site-images/").pop();
    if (!path) return;
    await supabase.storage.from("site-images").remove([path]);
  };

  const handleUploadGalleryPhoto = async (index: number, file: File) => {
    if (!settings) return;
    try {
      setUploadingGalleryIndex(index);
      setStatusMessage("");
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `gallery-${salonId}-${index}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("site-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);
      const { data: urlData } = supabase.storage.from("site-images").getPublicUrl(path);
      const oldUrl = galleryPhotos[index]?.url;
      setGalleryPhotos((prev) => prev.map((p, i) => i === index ? { ...p, url: urlData.publicUrl } : p));
      await removeStorageFile(oldUrl);
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message}`);
    } finally {
      setUploadingGalleryIndex(null);
    }
  };

  const handleCheckCampaignCount = async () => {
    try {
      setCampaignCheckingCount(true);
      const res = await fetch("/api/send-sms-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true, onlyWithAppointments: campaignOnlyWithAppointments }),
      });
      const data = await res.json();
      setCampaignClientCount(data.count ?? 0);
    } catch {
      setCampaignClientCount(null);
    } finally {
      setCampaignCheckingCount(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!campaignMessage.trim()) return;
    try {
      setCampaignSending(true);
      setCampaignResult(null);
      const res = await fetch("/api/send-sms-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: campaignMessage, onlyWithAppointments: campaignOnlyWithAppointments }),
      });
      const data = await res.json();
      setCampaignResult(data);
      setCampaignConfirm(false);
    } catch (e: unknown) {
      setCampaignResult({ sent: 0, failed: 0, errors: [(e as Error).message] });
    } finally {
      setCampaignSending(false);
    }
  };

  const handleSaveFont = async () => {
    if (!settings) return;
    try {
      setSavingFont(true);
      setStatusMessage("");
      const { error } = await supabase
        .from("salon_settings")
        .update({ site_font: appearanceFont || null })
        .eq("id", settings.id)
        .eq("salon_id", salonId);
      if (error) throw new Error(error.message);
      setSettings((prev) => prev ? { ...prev, site_font: appearanceFont || null } : prev);
      setStatusMessage("Police enregistrée ✅");
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message}`);
    } finally {
      setSavingFont(false);
    }
  };

  const handleSavePattern = async () => {
    if (!settings) return;
    try {
      setSavingPattern(true);
      setStatusMessage("");
      const { error } = await supabase
        .from("salon_settings")
        .update({ bg_pattern: appearancePattern || "none" })
        .eq("id", settings.id)
        .eq("salon_id", salonId);
      if (error) throw new Error(error.message);
      setSettings((prev) => prev ? { ...prev, bg_pattern: appearancePattern || "none" } : prev);
      setStatusMessage("Motif enregistré ✅");
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message}`);
    } finally {
      setSavingPattern(false);
    }
  };

  const handleSaveAppearance = async () => {
    if (!settings) return;
    try {
      setSavingAppearance(true);
      setStatusMessage("");
      const { error } = await supabase
        .from("salon_settings")
        .update({
          color_titles: appearanceTitles,
          color_accents: appearanceAccents,
          color_contact_bg: appearanceContactBg,
          color_page_bg: appearancePageBg,
          color_text_main: appearanceTextMain,
          color_text_secondary: appearanceTextSecondary,
          color_header_bg: appearancePageBg,
          color_card_border: deriveBorderColor(appearancePageBg),
          color_nav_text: appearanceTextMain,
          color_gradient_end: appearanceTitles,
          color_badges: appearanceBadges || null,
          color_subtitles: appearanceSubtitles || null,
          color_hero_bg: appearanceHeroBg || null,
          color_hero_accent: appearanceHeroAccent || null,
          color_prestations_accent: appearancePrestationsAccent || null,
          color_apropos_accent: appearanceAproposAccent || null,
          color_avis_accent: appearanceAvisAccent || null,
        })
        .eq("id", settings.id)
        .eq("salon_id", salonId);
      if (error) throw new Error(error.message);
      setSettings((prev) => prev ? {
        ...prev,
        color_titles: appearanceTitles,
        color_accents: appearanceAccents,
        color_contact_bg: appearanceContactBg,
        color_page_bg: appearancePageBg,
        color_text_main: appearanceTextMain,
        color_text_secondary: appearanceTextSecondary,
        color_header_bg: appearancePageBg,
        color_card_border: appearancePageBg,
        color_nav_text: appearanceTextMain,
        color_badges: appearanceBadges || null,
        color_subtitles: appearanceSubtitles || null,
        color_gradient_end: appearanceTitles,
        color_hero_bg: appearanceHeroBg || null,
        color_hero_accent: appearanceHeroAccent || null,
        color_prestations_accent: appearancePrestationsAccent || null,
        color_apropos_accent: appearanceAproposAccent || null,
        color_avis_accent: appearanceAvisAccent || null,
      } : prev);
      setStatusMessage("Couleurs enregistrées ✅");
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message}`);
    } finally {
      setSavingAppearance(false);
    }
  };

  const handleUploadPhoto = async (type: "hero" | "apropos" | "logo" | "logo-pro", file: File) => {
    if (!settings) return;
    const setUploading =
      type === "hero" ? setUploadingHero :
      type === "apropos" ? setUploadingApropos :
      type === "logo-pro" ? setUploadingLogoPro :
      setUploadingLogo;
    try {
      setUploading(true);
      setStatusMessage("");
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${type}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("site-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);
      const { data: urlData } = supabase.storage.from("site-images").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const column =
        type === "hero" ? "hero_image_url" :
        type === "apropos" ? "apropos_image_url" :
        type === "logo-pro" ? "logo_pro_image_url" :
        "logo_image_url";
      const oldUrl = settings[column];
      const { data: saved, error: updateError } = await supabase
        .from("salon_settings")
        .update({ [column]: publicUrl })
        .eq("id", settings.id)
        .eq("salon_id", salonId)
        .select(column)
        .single();
      if (updateError) throw new Error(updateError.message);
      if (!saved) throw new Error("Sauvegarde échouée : aucune ligne mise à jour (vérifiez les permissions Supabase).");
      setSettings((prev) => prev ? { ...prev, [column]: publicUrl } : prev);
      await removeStorageFile(oldUrl);
      const label = type === "hero" ? "hero" : type === "apropos" ? "à propos" : type === "logo-pro" ? "logo pro" : "logo";
      setStatusMessage(`Photo ${label} mise à jour ✅`);
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (type: "hero" | "apropos" | "logo" | "logo-pro") => {
    if (!settings) return;
    const column =
      type === "hero" ? "hero_image_url" :
      type === "apropos" ? "apropos_image_url" :
      type === "logo-pro" ? "logo_pro_image_url" :
      "logo_image_url";
    try {
      const oldUrl = settings[column];
      const { error } = await supabase
        .from("salon_settings")
        .update({ [column]: null })
        .eq("id", settings.id)
        .eq("salon_id", salonId);
      if (error) throw new Error(error.message);
      setSettings((prev) => prev ? { ...prev, [column]: null } : prev);
      await removeStorageFile(oldUrl);
      const label = type === "hero" ? "hero" : type === "apropos" ? "à propos" : type === "logo-pro" ? "logo pro" : "logo";
      setStatusMessage(`Photo ${label} supprimée ✅`);
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message}`);
    }
  };

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;

    return clients.filter((client) => {
      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
      const reverseName = `${client.last_name} ${client.first_name}`.toLowerCase();
      const phone = (client.phone ?? "").toLowerCase();
      const email = (client.email ?? "").toLowerCase();

      return (
        fullName.includes(term) ||
        reverseName.includes(term) ||
        phone.includes(term) ||
        email.includes(term)
      );
    });
  }, [clients, search]);

  const colorPageBg = settings?.color_page_bg || "#ffffff";
  const bgPatternLayer = getPatternBgLayer(settings?.bg_pattern, colorPageBg);
  const colorTitles = settings?.color_titles || "#1a1a2e";
  const colorHeaderBg = settings?.color_header_bg || "#ffffff";
  const colorTextMain = settings?.color_text_main || "#111827";
  const colorCardBorder = settings?.color_card_border || "#e5e7eb";
  const colorAccents = settings?.color_accents || "#4f46e5";
  const colorNavText = settings?.color_nav_text || "#111827";
  const colorPanelBg = derivePanelBg(colorPageBg);
  const colorPanelBgSecondary = derivePanelBgSecondary(colorPageBg);
  const titlesLumG = (() => { const h = colorTitles.replace("#", ""); return (0.299 * parseInt(h.slice(0,2),16) + 0.587 * parseInt(h.slice(2,4),16) + 0.114 * parseInt(h.slice(4,6),16)) / 255; })();
  const accentsLumG = (() => { const h = colorAccents.replace("#", ""); return (0.299 * parseInt(h.slice(0,2),16) + 0.587 * parseInt(h.slice(2,4),16) + 0.114 * parseInt(h.slice(4,6),16)) / 255; })();
  const colorSelectedBg = titlesLumG <= 0.7 ? colorTitles : accentsLumG <= 0.7 ? colorAccents : "#1a1a2e";
  const colorSelectedText = contrastText(colorSelectedBg);
  const salonDisplayName = (settings?.salon_name || "Votre salon").replace(/[\u0027\u2018\u2019\u201B]/g, "'");

  return (
    <main
      className="min-h-screen"
      style={{ color: colorTextMain, background: `${bgPatternLayer ? bgPatternLayer + "," : ""}radial-gradient(circle at top left, rgba(${hexToRgb(colorAccents)},0.10), transparent 34%), ${colorPageBg}` }}
    >
      <style>{`:root { --gold: ${colorTitles}; --card-border: ${colorCardBorder}; --nav-text: ${colorNavText}; --text-main: ${colorTextMain}; --page-bg: ${colorPageBg}; --accents: ${colorAccents}; --panel-bg: ${colorPanelBg}; --panel-bg-secondary: ${colorPanelBgSecondary}; --selected-bg: ${colorSelectedBg}; --selected-text: ${colorSelectedText}; }`}</style>
      <SiteFont font={settings?.site_font} salonNameFont={settings?.font_salon_name} />
      <SitePattern pattern={settings?.bg_pattern} />
      <header
        className="relative md:sticky top-0 z-30 shadow-[0_14px_45px_rgba(80,55,25,0.10)] backdrop-blur-md"
        style={{ borderBottom: `1px solid ${colorCardBorder}88`, background: `linear-gradient(to bottom, ${colorHeaderBg}d8, ${colorHeaderBg}f4)` }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: `linear-gradient(to right, transparent, ${colorAccents}99, transparent)` }} />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 130%, ${colorAccents}28, transparent 55%)` }} />
          <div className="header-sweep absolute inset-y-0 w-1/3" style={{ background: `linear-gradient(to right, transparent, ${colorAccents}28, transparent)` }} />
        </div>
        <div className="mx-auto flex w-[min(1400px,calc(100%-24px))] items-center justify-between gap-3 py-3 md:py-4">
          <div className="flex items-center gap-3">
            {settings?.logo_pro_image_url && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border shadow-[0_12px_26px_rgba(185,139,61,0.18)] md:h-14 md:w-14 md:rounded-[22px]" style={{ borderColor: colorCardBorder, backgroundColor: colorPageBg }}>
                <img
                  src={settings.logo_pro_image_url}
                  alt={`${salonDisplayName} Pro`}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div>
              <div className="inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] md:text-[11px]" style={{ color: colorTitles, borderColor: `${colorTitles}40`, backgroundColor: `${colorTitles}12` }}>
                Back office
              </div>
              <div className="mt-0.5 text-xl font-semibold leading-none md:mt-1 md:text-3xl">
                <SalonNameGradient name={salonDisplayName} goldColor={colorTextMain} goldEndColor={colorAccents} /> Pro
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 md:flex md:items-center md:justify-end md:gap-2">
            <Link
              href="/back-office"
              className="rounded-xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--nav-text)] shadow-sm transition hover:-translate-y-1 hover:scale-[1.08] hover:bg-[var(--panel-bg)] md:rounded-2xl md:px-4 md:py-3 md:text-sm"
            >
              Agenda
            </Link>

            <Link
              href="/back-office/clients"
              className="rounded-xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--nav-text)] shadow-sm transition hover:-translate-y-1 hover:scale-[1.08] hover:bg-[var(--panel-bg)] md:rounded-2xl md:px-4 md:py-3 md:text-sm"
            >
              Fiches clients
            </Link>

            <Link
              href="/back-office/gestion"
              className="rounded-xl bg-[var(--selected-bg)] px-3 py-2 text-xs font-semibold text-[var(--selected-text)] shadow-sm transition hover:-translate-y-1 hover:scale-[1.08] hover:opacity-90 md:rounded-2xl md:px-4 md:py-3 md:text-sm"
            >
              Admin
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-[#f0d5cd] bg-[#fff5f2] px-3 py-2 text-xs font-semibold text-[#a33a3a] shadow-sm transition hover:-translate-y-0.5 hover:bg-white md:rounded-2xl md:px-4 md:py-3 md:text-sm"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-[min(1400px,calc(100%-24px))] py-5 md:py-8">
          {statusMessage ? (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800 shadow-sm">
              {statusMessage}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-[26px] border border-dashed border-[#dccdbb] bg-white/70 px-6 py-14 text-center text-[var(--nav-text)] shadow-sm">
              Chargement de la gestion du salon...
            </div>
          ) : (
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
              <nav className="flex flex-col gap-1.5 md:sticky md:top-[76px] md:w-44 md:shrink-0">
                {([
                  { id: "closures" as const, label: "Fermetures", icon: "📆" },
                  { id: "promotions" as const, label: "Promotions", icon: "🎁" },
                  { id: "settings" as const, label: "Salon", icon: "🏪" },
                  { id: "sms" as const, label: "SMS", icon: "💬" },
                  { id: "staff" as const, label: "Équipe", icon: "👥" },
                  { id: "categories" as const, label: "Catégories", icon: "🗂️" },
                  { id: "services" as const, label: "Prestations", icon: "⭐" },
                  { id: "questionnaire" as const, label: "Questionnaire", icon: "📋" },
                  { id: "galerie" as const, label: "Galerie", icon: "🖼️" },
                  { id: "apparence" as const, label: "Apparence", icon: "🎨" },
                  ...(!isTestSalon ? [{ id: "agendaplus" as const, label: "Agenda+", icon: "💳" }] : []),
                ]).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold text-left transition ${
                      activeTab === tab.id
                        ? "bg-[var(--selected-bg)] text-[var(--selected-text)] shadow-[0_8px_20px_rgba(31,27,23,0.2)]"
                        : "border border-[var(--card-border)] bg-[var(--panel-bg)] text-[var(--nav-text)] hover:-translate-y-1 hover:scale-[1.05] hover:bg-[var(--panel-bg)]"
                    }`}
                  >
                    <span className="text-base">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
              <div className="min-w-0 flex-1">
              {activeTab === "closures" && (
              <section className={cardClass + " p-5 md:p-7"}>
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--gold)]">
                      <span className="text-xl">📆</span>
                      Planning
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">
                      Fermetures exceptionnelles
                    </h2>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className={panelClass + " p-5"}>
                    <div className="mb-4 text-lg font-black">Ajouter une fermeture</div>

                    <div className="grid gap-4">
                      <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                        Date
                        <input
                          type="date"
                          value={newClosureDate}
                          onChange={(e) => setNewClosureDate(e.target.value)}
                          className={fieldClass}
                        />
                      </label>

                      <label className="flex items-center justify-between rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3 text-sm font-semibold">
                        <span>Journée entière</span>
                        <input
                          type="checkbox"
                          checked={newClosureAllDay}
                          onChange={(e) => setNewClosureAllDay(e.target.checked)}
                        />
                      </label>

                      {!newClosureAllDay ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                            Début
                            <input
                              type="time"
                              value={newClosureStartTime}
                              onChange={(e) => setNewClosureStartTime(e.target.value)}
                              className={fieldClass}
                            />
                          </label>

                          <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                            Fin
                            <input
                              type="time"
                              value={newClosureEndTime}
                              onChange={(e) => setNewClosureEndTime(e.target.value)}
                              className={fieldClass}
                            />
                          </label>
                        </div>
                      ) : null}

                      <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                        Motif
                        <input
                          type="text"
                          value={newClosureReason}
                          onChange={(e) => setNewClosureReason(e.target.value)}
                          placeholder="Formation, fermeture exceptionnelle, congé..."
                          className={fieldClass}
                        />
                      </label>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={handleCreateClosure}
                        disabled={savingClosure}
                        className={primaryButtonClass}
                      >
                        {savingClosure ? "Ajout..." : "Ajouter la fermeture"}
                      </button>
                    </div>
                  </div>

                  <div className={panelClass + " p-5"}>
                    <div className="mb-4 text-lg font-black">Fermetures enregistrées</div>

                    <div className="grid gap-3">
                      {(() => {
                        const now = new Date();
                        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                        const upcomingClosures = closures.filter((c) => c.closure_date >= today);
                        return upcomingClosures.length === 0 ? (
                        <div className="rounded-[24px] border border-dashed border-[#dccdbb] bg-white/70 px-4 py-5 text-sm text-[var(--nav-text)]">
                          Aucune fermeture exceptionnelle.
                        </div>
                      ) : (
                        upcomingClosures.map((closure) => (
                          <div
                            key={closure.id}
                            className="rounded-2xl border border-[var(--card-border)] bg-white p-4 shadow-sm"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div>
                                <div className="font-black">{formatFrenchDate(closure.closure_date)}</div>
                                <div className="mt-1 text-sm text-[var(--nav-text)]">
                                  {closure.is_all_day
                                    ? "Fermé toute la journée"
                                    : `Fermé de ${formatTime(closure.start_time)} à ${formatTime(closure.end_time)}`}
                                </div>
                                {closure.reason ? (
                                  <div className="mt-1 text-sm text-[var(--nav-text)]">Motif : {closure.reason}</div>
                                ) : null}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteClosure(closure.id)}
                                disabled={deletingClosureId === closure.id}
                                className={dangerButtonClass}
                              >
                                {deletingClosureId === closure.id ? "Suppression..." : "Supprimer"}
                              </button>
                            </div>
                          </div>
                        ))
                      );
                      })()}
                    </div>
                  </div>
                </div>
              </section>
              )}
              {activeTab === "promotions" && (
              <div className={cardClass + " p-5 md:p-7"}>
                <div className="mb-6">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--gold)]">
                    <span className="text-xl">🎁</span>
                    Promotion
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">Bandeau promotionnel</h2>
                  <p className="mt-1 text-sm text-[var(--nav-text)]">Affiché sur la page d'accueil juste sous la navigation. Laisser vide pour masquer le bandeau.</p>
                </div>

                <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                  Texte du bandeau
                  <textarea
                    value={settings?.promo_text ?? ""}
                    onChange={(e) => settings && setSettings({ ...settings, promo_text: e.target.value })}
                    placeholder="Ex : Offre spéciale printemps — 20% sur toutes les colorations jusqu'au 30 avril"
                    rows={3}
                    className={fieldClass + " resize-none"}
                  />
                </label>

                {/* Aperçu + color pickers */}
                <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--card-border)]">
                  {/* Aperçu */}
                  <div
                    className="flex items-center justify-center gap-2 px-4 py-3 text-lg font-semibold"
                    style={{ background: `linear-gradient(to right, ${promoBgColorState || "#111827"}, ${promoColorStars || "#4f46e5"}, ${promoBgColorState || "#111827"})` }}
                  >
                    <span className="animate-pulse" style={{ color: promoColorStars || "#4f46e5" }}>✦</span>
                    <span style={{ color: promoTextColor || contrastText(promoBgColorState || "#111827") }}>
                      {settings?.promo_text?.trim() || "Aperçu du texte du bandeau"}
                    </span>
                    <span className="animate-pulse" style={{ color: promoColorStars || "#4f46e5", animationDelay: "0.75s" }}>✦</span>
                  </div>

                  {/* Couleur du bandeau */}
                  <div className="border-t border-[var(--card-border)] bg-white">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 p-3 text-left"
                      onClick={() => setOpenColorPicker(openColorPicker === "promo-bg" ? null : "promo-bg")}
                    >
                      <div className="h-7 w-7 shrink-0 rounded-lg border border-[var(--card-border)] shadow-sm" style={promoBgColorState ? { backgroundColor: promoBgColorState } : { backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%)", backgroundSize: "10px 10px" }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-[var(--nav-text)]">Couleur du bandeau</div>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 shrink-0 text-[#a0927e] transition-transform ${openColorPicker === "promo-bg" ? "rotate-180" : ""}`}>
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {openColorPicker === "promo-bg" && (
                      <div className="border-t border-[var(--card-border)] p-3">
                        <div className="space-y-1">
                          {APPEARANCE_PALETTE.map((family) => (
                            <div key={family.label} className="flex items-center gap-1.5">
                              <span className="w-16 shrink-0 text-[10px] text-[#a0927e]">{family.label}</span>
                              <div className="flex min-w-0 flex-1 gap-1">
                                {family.colors.map((c) => (
                                  <button key={c} type="button" onClick={() => setPromoBgColorState(c)} title={c}
                                    className={`h-4 min-w-0 flex-1 rounded transition-transform ${promoBgColorState === c ? "scale-125 ring-2 ring-neutral-900 ring-offset-1" : "hover:scale-110"}`}
                                    style={{ backgroundColor: c }} />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Couleur des étoiles */}
                  <div className="border-t border-[var(--card-border)] bg-white">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 p-3 text-left"
                      onClick={() => setOpenColorPicker(openColorPicker === "promo-stars" ? null : "promo-stars")}
                    >
                      <div className="h-7 w-7 shrink-0 rounded-lg border border-[var(--card-border)] shadow-sm" style={promoColorStars ? { backgroundColor: promoColorStars } : { backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%)", backgroundSize: "10px 10px" }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-[var(--nav-text)]">Couleur des étoiles ✦</div>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 shrink-0 text-[#a0927e] transition-transform ${openColorPicker === "promo-stars" ? "rotate-180" : ""}`}>
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {openColorPicker === "promo-stars" && (
                      <div className="border-t border-[var(--card-border)] p-3">
                        <div className="space-y-1">
                          {APPEARANCE_PALETTE.map((family) => (
                            <div key={family.label} className="flex items-center gap-1.5">
                              <span className="w-16 shrink-0 text-[10px] text-[#a0927e]">{family.label}</span>
                              <div className="flex min-w-0 flex-1 gap-1">
                                {family.colors.map((c) => (
                                  <button key={c} type="button" onClick={() => setPromoColorStars(c)} title={c}
                                    className={`h-4 min-w-0 flex-1 rounded transition-transform ${promoColorStars === c ? "scale-125 ring-2 ring-neutral-900 ring-offset-1" : "hover:scale-110"}`}
                                    style={{ backgroundColor: c }} />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Couleur du texte */}
                  <div className="border-t border-[var(--card-border)] bg-white">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 p-3 text-left"
                      onClick={() => setOpenColorPicker(openColorPicker === "promo-text" ? null : "promo-text")}
                    >
                      <div className="h-7 w-7 shrink-0 rounded-lg border border-[var(--card-border)] shadow-sm" style={promoTextColor ? { backgroundColor: promoTextColor } : { backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%)", backgroundSize: "10px 10px" }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-[var(--nav-text)]">Couleur du texte</div>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 shrink-0 text-[#a0927e] transition-transform ${openColorPicker === "promo-text" ? "rotate-180" : ""}`}>
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {openColorPicker === "promo-text" && (
                      <div className="border-t border-[var(--card-border)] p-3">
                        <div className="space-y-1">
                          {APPEARANCE_PALETTE.map((family) => (
                            <div key={family.label} className="flex items-center gap-1.5">
                              <span className="w-16 shrink-0 text-[10px] text-[#a0927e]">{family.label}</span>
                              <div className="flex min-w-0 flex-1 gap-1">
                                {family.colors.map((c) => (
                                  <button key={c} type="button" onClick={() => setPromoTextColor(c)} title={c}
                                    className={`h-4 min-w-0 flex-1 rounded transition-transform ${promoTextColor === c ? "scale-125 ring-2 ring-neutral-900 ring-offset-1" : "hover:scale-110"}`}
                                    style={{ backgroundColor: c }} />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <p className="text-sm text-[#9a9089]">
                    {settings?.promo_text?.trim() ? "✅ Bandeau actif" : "⬜ Bandeau masqué"}
                  </p>
                  <button
                    type="button"
                    onClick={handleSavePromo}
                    disabled={savingPromo}
                    className={primaryButtonClass}
                  >
                    {savingPromo ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </div>
              )}
              {activeTab === "settings" && (
              <section className={cardClass + " p-5 md:p-7"}>
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--gold)]">
                      <span className="text-xl">🏪</span>
                      Salon
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">
                      Téléphone, horaires et jours d’ouverture
                    </h2>
                  </div>
                </div>

                {settings ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-4">
                        <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                          Téléphone du salon
                          <input
                            type="text"
                            value={settings.phone ?? ""}
                            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                            className={fieldClass}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2">
                      <span className="text-sm font-semibold text-[var(--nav-text)]">Horaires par jour</span>
                      {([
                        ["Lundi",    "is_open_monday",    "opening_time_monday",    "closing_time_monday"],
                        ["Mardi",    "is_open_tuesday",   "opening_time_tuesday",   "closing_time_tuesday"],
                        ["Mercredi", "is_open_wednesday", "opening_time_wednesday", "closing_time_wednesday"],
                        ["Jeudi",    "is_open_thursday",  "opening_time_thursday",  "closing_time_thursday"],
                        ["Vendredi", "is_open_friday",    "opening_time_friday",    "closing_time_friday"],
                        ["Samedi",   "is_open_saturday",  "opening_time_saturday",  "closing_time_saturday"],
                        ["Dimanche", "is_open_sunday",    "opening_time_sunday",    "closing_time_sunday"],
                      ] as [string, string, string, string][]).map(([label, openKey, openTimeKey, closeTimeKey]) => {
                        const isOpen = Boolean(settings[openKey as keyof SalonSettings]);
                        return (
                          <div key={openKey} className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 transition ${isOpen ? "border-[var(--accents)]/30 bg-[var(--accents)]/5" : "border-[var(--card-border)] bg-white"}`}>
                            <label className="flex w-28 shrink-0 cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isOpen}
                                onChange={(e) => setSettings({ ...settings, [openKey]: e.target.checked } as SalonSettings)}
                              />
                              <span className={`text-sm font-semibold ${isOpen ? "text-[var(--gold)]" : "text-[var(--nav-text)] opacity-50"}`}>{label}</span>
                            </label>
                            <div className={`flex items-center gap-2 transition ${!isOpen ? "opacity-40 pointer-events-none" : ""}`}>
                              <input
                                type="time"
                                value={(settings[openTimeKey as keyof SalonSettings] as string | null)?.slice(0, 5) ?? "09:00"}
                                onChange={(e) => setSettings({ ...settings, [openTimeKey]: e.target.value } as SalonSettings)}
                                className={fieldClass}
                              />
                              <span className="text-xs text-[var(--nav-text)] opacity-40">→</span>
                              <input
                                type="time"
                                value={(settings[closeTimeKey as keyof SalonSettings] as string | null)?.slice(0, 5) ?? "19:00"}
                                onChange={(e) => setSettings({ ...settings, [closeTimeKey]: e.target.value } as SalonSettings)}
                                className={fieldClass}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                        Adresse du salon
                        <input
                          type="text"
                          placeholder="12 rue des Fleurs, 13000 Marseille"
                          value={settings.address ?? ""}
                          onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                          className={fieldClass}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                        Email du salon
                        <input
                          type="email"
                          placeholder="contact@monsalon.fr"
                          value={settings.email ?? ""}
                          onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                          className={fieldClass}
                        />
                      </label>
                    </div>
                    <div className="mt-4">
                      <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                        URL Instagram
                        <input
                          type="url"
                          placeholder="https://www.instagram.com/monsalon"
                          value={settings.instagram_url ?? ""}
                          onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                          className={fieldClass}
                        />
                      </label>
                    </div>


                    <div className="mt-6 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        disabled={savingSettings}
                        className={primaryButtonClass}
                      >
                        {savingSettings ? "Enregistrement..." : "Enregistrer les réglages"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center text-[var(--nav-text)]">
                    Aucune ligne trouvée dans <strong>salon_settings</strong>.
                  </div>
                )}
              </section>
              )}
              {activeTab === "sms" && (
              <section className={cardClass + " p-5 md:p-7"}>
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--gold)]">
                      <span className="text-xl">💬</span>
                      SMS
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">
                      Confirmations et rappels par SMS
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={
                        settings?.sms_provider === "twilio"
                          ? "https://console.twilio.com/us1/billing/manage-billing/billing-summary"
                          : settings?.sms_provider === "ovh"
                          ? "https://www.ovhtelecom.fr/sms/"
                          : "https://app.brevo.com/billing/account/customize/message-credits"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-[var(--card-border)] px-5 py-2.5 text-sm font-semibold text-[var(--nav-text)] transition hover:bg-[var(--panel-bg-secondary)]"
                    >
                      Recharger →
                    </a>
                    <button
                      type="button"
                      onClick={handleSaveSms}
                      disabled={savingSms || !settings}
                      className={primaryButtonClass}
                    >
                      {savingSms ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  </div>
                </div>

                {settings ? (
                  <div className="grid gap-6">
                    <div className="grid gap-2 md:w-64">
                      <label className="text-sm font-semibold text-[var(--nav-text)]">
                        Fournisseur SMS
                      </label>
                      <select
                        value={settings.sms_provider ?? "brevo"}
                        onChange={(e) => setSettings({ ...settings, sms_provider: e.target.value })}
                        className={fieldClass}
                      >
                        <option value="brevo">Brevo</option>
                        <option value="twilio">Twilio</option>
                        <option value="ovh">OVH SMS</option>
                      </select>
                    </div>

                    {(settings.sms_provider ?? "brevo") === "brevo" && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <label className="text-sm font-semibold text-[var(--nav-text)]">
                            Expéditeur SMS
                          </label>
                          <input
                            type="text"
                            maxLength={11}
                            value={settings.sms_sender ?? ""}
                            onChange={(e) => setSettings({ ...settings, sms_sender: e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 11) })}
                            className={fieldClass}
                          />
                          <span className="text-xs font-normal text-[var(--nav-text)] opacity-60">11 caractères max, sans espace (limite opérateurs)</span>
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-semibold text-[var(--nav-text)]">
                            Clé API Brevo
                          </label>
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={settings.brevo_api_key ?? ""}
                            onChange={(e) => setSettings({ ...settings, brevo_api_key: e.target.value })}
                            className={fieldClass}
                          />
                          <span className="text-xs font-normal text-[var(--nav-text)] opacity-60">Laisser vide pour désactiver les SMS.</span>
                        </div>
                      </div>
                    )}

                    {settings.sms_provider === "ovh" && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <label className="text-sm font-semibold text-[var(--nav-text)]">
                            App Key
                          </label>
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={settings.ovh_app_key ?? ""}
                            onChange={(e) => setSettings({ ...settings, ovh_app_key: e.target.value })}
                            className={fieldClass}
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-semibold text-[var(--nav-text)]">
                            App Secret
                          </label>
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={settings.ovh_app_secret ?? ""}
                            onChange={(e) => setSettings({ ...settings, ovh_app_secret: e.target.value })}
                            className={fieldClass}
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-semibold text-[var(--nav-text)]">
                            Consumer Key
                          </label>
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={settings.ovh_consumer_key ?? ""}
                            onChange={(e) => setSettings({ ...settings, ovh_consumer_key: e.target.value })}
                            className={fieldClass}
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-semibold text-[var(--nav-text)]">
                            Nom du service SMS
                          </label>
                          <input
                            type="text"
                            placeholder="sms-xxxxx"
                            value={settings.ovh_service_name ?? ""}
                            onChange={(e) => setSettings({ ...settings, ovh_service_name: e.target.value })}
                            className={fieldClass}
                          />
                          <span className="text-xs font-normal text-[var(--nav-text)] opacity-60">Visible dans votre espace OVH : ex. sms-ab12345-1</span>
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-semibold text-[var(--nav-text)]">
                            Expéditeur SMS
                          </label>
                          <input
                            type="text"
                            maxLength={11}
                            value={settings.sms_sender ?? ""}
                            onChange={(e) => setSettings({ ...settings, sms_sender: e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 11) })}
                            className={fieldClass}
                          />
                          <span className="text-xs font-normal text-[var(--nav-text)] opacity-60">11 caractères max, sans espace</span>
                        </div>
                      </div>
                    )}

                    {settings.sms_provider === "twilio" && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <label className="text-sm font-semibold text-[var(--nav-text)]">
                            Account SID
                          </label>
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={settings.twilio_account_sid ?? ""}
                            onChange={(e) => setSettings({ ...settings, twilio_account_sid: e.target.value })}
                            className={fieldClass}
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-semibold text-[var(--nav-text)]">
                            Auth Token
                          </label>
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={settings.twilio_auth_token ?? ""}
                            onChange={(e) => setSettings({ ...settings, twilio_auth_token: e.target.value })}
                            className={fieldClass}
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-semibold text-[var(--nav-text)]">
                            Numéro expéditeur Twilio
                          </label>
                          <input
                            type="text"
                            placeholder="+33XXXXXXXXX"
                            value={settings.twilio_from_number ?? ""}
                            onChange={(e) => setSettings({ ...settings, twilio_from_number: e.target.value })}
                            className={fieldClass}
                          />
                          <span className="text-xs font-normal text-[var(--nav-text)] opacity-60">Format international : +33612345678</span>
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-semibold text-[var(--nav-text)]">
                            Expéditeur alphanumérique <span className="font-normal opacity-60">(optionnel)</span>
                          </label>
                          <input
                            type="text"
                            maxLength={11}
                            placeholder="MonSalon"
                            value={settings.twilio_sender_id ?? ""}
                            onChange={(e) => setSettings({ ...settings, twilio_sender_id: e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 11) })}
                            className={fieldClass}
                          />
                          <span className="text-xs font-normal text-[var(--nav-text)] opacity-60">Si renseigné, remplace le numéro — nécessite l'activation Alphanumeric Sender ID sur votre compte Twilio.</span>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-[var(--card-border)] pt-6">
                      <div className="mb-4">
                        <div className="mb-1 flex items-center gap-2 text-sm font-bold text-[var(--gold)]">
                          <span className="text-xl">📣</span>
                          Campagne SMS
                        </div>
                        <p className="text-sm text-[var(--nav-text)] opacity-70">
                          Envoyez un message à tous vos clients ayant un numéro de téléphone.
                        </p>
                      </div>

                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-[var(--nav-text)]">Message</label>
                            <span className={`text-xs ${campaignMessage.length > 160 ? "font-semibold text-amber-600" : "text-[var(--nav-text)] opacity-60"}`}>
                              {campaignMessage.length} car. · {Math.ceil(Math.max(1, campaignMessage.length) / 160)} SMS/destinataire
                            </span>
                          </div>
                          <textarea
                            rows={4}
                            placeholder="Bonjour ! Profitez de nos offres de printemps…"
                            value={campaignMessage}
                            onChange={(e) => {
                              setCampaignMessage(e.target.value);
                              setCampaignResult(null);
                              setCampaignConfirm(false);
                            }}
                            className={fieldClass + " resize-none"}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setCampaignOnlyWithAppointments((v) => !v);
                            setCampaignClientCount(null);
                            setCampaignConfirm(false);
                          }}
                          className={`self-start rounded-full px-4 py-2 text-sm font-semibold transition ${
                            campaignOnlyWithAppointments
                              ? "bg-[var(--selected-bg)] text-[var(--selected-text)] shadow-[0_8px_20px_rgba(31,27,23,0.2)]"
                              : "border border-[var(--card-border)] bg-[var(--panel-bg)] text-[var(--nav-text)] hover:bg-[var(--panel-bg)]"
                          }`}
                        >
                          {campaignOnlyWithAppointments ? "✓ " : ""}Uniquement les clients ayant eu un rendez-vous
                        </button>

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={handleCheckCampaignCount}
                            disabled={campaignCheckingCount}
                            className="rounded-2xl border border-[var(--card-border)] px-5 py-2.5 text-sm font-semibold text-[var(--nav-text)] transition hover:bg-[var(--panel-bg-secondary)] disabled:opacity-50"
                          >
                            {campaignCheckingCount ? "Vérification..." : "Vérifier les destinataires"}
                          </button>
                          {campaignClientCount !== null && (
                            <span className="text-sm text-[var(--nav-text)] opacity-70">
                              {campaignClientCount} client{campaignClientCount > 1 ? "s" : ""} avec un numéro
                            </span>
                          )}
                        </div>

                        {!campaignConfirm ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (!campaignMessage.trim()) return;
                              setCampaignConfirm(true);
                            }}
                            disabled={!campaignMessage.trim() || campaignSending}
                            className={primaryButtonClass + " self-start"}
                          >
                            Envoyer la campagne
                          </button>
                        ) : (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <p className="mb-3 text-sm font-semibold text-amber-800">
                              Confirmer l&apos;envoi{campaignClientCount !== null ? ` à ${campaignClientCount} destinataire${campaignClientCount > 1 ? "s" : ""}` : ""} ?
                            </p>
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={handleSendCampaign}
                                disabled={campaignSending}
                                className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                              >
                                {campaignSending ? "Envoi en cours..." : "Confirmer l'envoi"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setCampaignConfirm(false)}
                                className="rounded-xl border border-amber-200 px-5 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        )}

                        {campaignResult && (
                          <div className={`rounded-2xl border p-4 ${campaignResult.failed > 0 ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"}`}>
                            <p className={`text-sm font-semibold ${campaignResult.failed > 0 ? "text-amber-800" : "text-green-800"}`}>
                              {campaignResult.sent} SMS envoyé{campaignResult.sent > 1 ? "s" : ""}
                              {campaignResult.failed > 0 && ` · ${campaignResult.failed} échec${campaignResult.failed > 1 ? "s" : ""}`}
                            </p>
                            {campaignResult.errors.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {campaignResult.errors.map((err, i) => (
                                  <li key={i} className="text-xs text-amber-700">{err}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center text-[var(--nav-text)]">
                    Aucune ligne trouvée dans <strong>salon_settings</strong>.
                  </div>
                )}
              </section>
              )}
              {activeTab === "categories" && (
              <div className={cardClass + " p-5 md:p-7"}>
                  <div className="mb-6 flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--gold)]">
                        <span className="text-xl">🗂️</span>
                        Catégories
                      </div>
                      <h2 className="text-2xl font-black tracking-tight">Gérer les catégories</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddCategory((v) => !v)}
                      className={primaryButtonClass}
                    >
                      {showAddCategory ? "Fermer" : "+ Ajouter"}
                    </button>
                  </div>

                  {showAddCategory && (
                    <div className="mb-6 rounded-3xl border border-[var(--card-border)] bg-white p-5">
                      <div className="mb-4 text-lg font-black">Ajouter une catégorie</div>

                      <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                        Nouvelle catégorie
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Ex : Femme"
                          className={fieldClass}
                        />
                      </label>

                      <div className="mt-4 grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                        <span>Couleur</span>
                        <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3">
                          {COLOR_OPTIONS.map((color) => {
                            const isSelected = newCategoryColor === color;
                            const isUsed = categories.some((c) => c.color === color);

                            return (
                              <button
                                key={color}
                                type="button"
                                disabled={isUsed}
                                onClick={() => { if (!isUsed) setNewCategoryColor(color); }}
                                className="h-8 w-8 rounded-full transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30"
                                style={{
                                  backgroundColor: color,
                                  border: isSelected ? "3px solid #000000" : "1px solid #d6d3d1",
                                }}
                                aria-label={`Choisir la couleur ${color}`}
                                title={isUsed ? "Couleur déjà utilisée" : color}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        disabled={savingCategory}
                        className="mt-5 w-full rounded-2xl bg-[var(--selected-bg)] px-6 py-3 text-sm font-semibold text-[var(--selected-text)] shadow-sm transition hover:opacity-90 disabled:opacity-50"
                      >
                        {savingCategory ? "Ajout..." : "Ajouter la catégorie"}
                      </button>
                    </div>
                  )}

                  <div className="grid gap-3">
                    {categories.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-[#dccdbb] bg-white/70 px-4 py-5 text-sm text-[var(--nav-text)]">
                        Aucune catégorie.
                      </div>
                    ) : (
                      categories.map((category, index) => (
                        <div key={category.id} className="rounded-2xl border border-[var(--card-border)] bg-white p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveCategory(index, -1)}
                                className="flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--card-border)] bg-white text-xs text-[var(--nav-text)] transition hover:border-[var(--accents)] disabled:cursor-not-allowed disabled:opacity-30"
                                title="Monter"
                              >▲</button>
                              <button
                                type="button"
                                disabled={index === categories.length - 1}
                                onClick={() => handleMoveCategory(index, 1)}
                                className="flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--card-border)] bg-white text-xs text-[var(--nav-text)] transition hover:border-[var(--accents)] disabled:cursor-not-allowed disabled:opacity-30"
                                title="Descendre"
                              >▼</button>
                            </div>
                            <input
                              type="text"
                              defaultValue={category.name}
                            onBlur={(e) => {
                              if (e.target.value !== category.name) {
                                handleUpdateCategory(category.id, { name: e.target.value });
                              }
                            }}
                              className="w-full rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3 font-semibold outline-none transition focus:border-[var(--gold)]"
                            />
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map((color) => {
                              const isSelected = (category.color ?? "#EADCCB") === color;
                              const isUsed = categories.some((c) => c.id !== category.id && c.color === color);

                              return (
                                <button
                                  key={color}
                                  type="button"
                                  disabled={isUsed}
                                  onClick={() => {
                                    if ((category.color ?? "#EADCCB") !== color && !isUsed) {
                                      handleUpdateCategory(category.id, { color });
                                    }
                                  }}
                                  className="h-8 w-8 rounded-full transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30"
                                  style={{
                                    backgroundColor: color,
                                    border: isSelected ? "3px solid #000000" : "1px solid #d6d3d1",
                                  }}
                                  aria-label={`Couleur ${color}`}
                                  title={isUsed ? "Couleur déjà utilisée" : color}
                                />
                              );
                            })}
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <div className="text-sm text-[var(--nav-text)]">
                              {updatingCategoryId === category.id ? "Enregistrement..." : " "}
                            </div>
                            {confirmDeleteCategoryId === category.id ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => { handleDeleteCategory(category.id); setConfirmDeleteCategoryId(null); }}
                                  disabled={deletingCategoryId === category.id}
                                  className={dangerButtonClass}
                                >
                                  {deletingCategoryId === category.id ? "Suppression..." : "Confirmer"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteCategoryId(null)}
                                  className="rounded-2xl border border-[var(--card-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--nav-text)] transition hover:bg-white/70"
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteCategoryId(category.id)}
                                className={dangerButtonClass}
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
              </div>
              )}
              {activeTab === "staff" && (
              <div className={cardClass + " p-5 md:p-7"}>
                  <div className="mb-6">
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--gold)]">
                      <span className="text-xl">👥</span> Équipe
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight">Prestataires</h2>
                    <p className="mt-1 text-sm text-[var(--nav-text)]">Horaires et pauses par jour, dans les limites du salon.</p>
                  </div>

                  <div className="space-y-6">
                    {staff.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-[#dccdbb] bg-white/70 px-4 py-8 text-center text-sm text-[var(--nav-text)]">
                        Aucune prestataire enregistrée.
                      </div>
                    ) : staff.map((member) => {
                      const usedColors = staff.filter((s) => s.id !== member.id).map((s) => s.color);
                      const memberSchedules = staffSchedules.filter((s) => s.staff_id === member.id);
                      const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
                      const SALON_DAY_KEYS: (keyof SalonSettings)[] = ["is_open_sunday","is_open_monday","is_open_tuesday","is_open_wednesday","is_open_thursday","is_open_friday","is_open_saturday"];
                      const SALON_DAY_SLUGS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

                      return (
                        <div key={member.id} className={panelClass + " p-4"}>
                          {/* Header */}
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 shrink-0 rounded-xl border border-[var(--card-border)]" style={{ backgroundColor: member.color }} />
                              <div className="font-bold">{member.first_name}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-white px-3 py-1.5 text-xs font-semibold cursor-pointer">
                                <input type="checkbox" checked={member.is_active} onChange={(e) => handleUpdateStaff(member.id, { is_active: e.target.checked })} />
                                Active
                              </label>
                              {confirmDeleteStaffId === member.id ? (
                                <>
                                  <button type="button" onClick={() => handleDeleteStaff(member.id)} disabled={deletingStaffId === member.id} className={dangerButtonClass}>
                                    {deletingStaffId === member.id ? "..." : "Confirmer"}
                                  </button>
                                  <button type="button" onClick={() => setConfirmDeleteStaffId(null)} className={secondaryButtonClass + " !py-1.5 !px-3 !text-xs"}>Annuler</button>
                                </>
                              ) : (
                                <button type="button" onClick={() => setConfirmDeleteStaffId(member.id)} className={dangerButtonClass}>Supprimer</button>
                              )}
                            </div>
                          </div>

                          {/* Grille 7 jours */}
                          <div className="grid gap-2">
                            {[1,2,3,4,5,6,0].map((dow) => {
                              const sched = memberSchedules.find((s) => s.day_of_week === dow);
                              if (!sched) return null;
                              const salonDayOpen = settings ? (settings[SALON_DAY_KEYS[dow]] as boolean) : true;
                              const salonOpen = (settings?.[`opening_time_${SALON_DAY_SLUGS[dow]}` as keyof SalonSettings] as string | null)?.slice(0,5) ?? settings?.opening_time?.slice(0,5) ?? "09:00";
                              const salonClose = (settings?.[`closing_time_${SALON_DAY_SLUGS[dow]}` as keyof SalonSettings] as string | null)?.slice(0,5) ?? settings?.closing_time?.slice(0,5) ?? "19:00";
                              return (
                                <div key={dow} className={`rounded-2xl border px-3 py-2 transition ${!salonDayOpen ? "border-dashed border-[#e0d8cf] bg-gray-100/60 opacity-60" : sched.is_open ? "border-[var(--card-border)] bg-white" : "border-[var(--card-border)] bg-[var(--panel-bg-secondary)]"}`}>
                                  <div className="flex flex-wrap items-center gap-3">
                                    {/* Jour + toggle */}
                                    <div className="flex items-center gap-2 w-24 shrink-0">
                                      <button type="button"
                                        disabled={!salonDayOpen}
                                        onClick={() => { if (salonDayOpen) handleUpdateSchedule(sched.id, { is_open: !sched.is_open }); }}
                                        className={`h-5 w-9 rounded-full transition-colors ${sched.is_open && salonDayOpen ? "bg-[var(--text-main)]" : "bg-[#d8d0c8]"}`}>
                                        <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${sched.is_open && salonDayOpen ? "translate-x-4" : "translate-x-0"}`} />
                                      </button>
                                      <span className={`text-xs font-bold ${sched.is_open && salonDayOpen ? "text-[var(--text-main)]" : "text-[#a09890]"}`}>{DAY_LABELS[dow]}</span>
                                    </div>

                                    {sched.is_open && salonDayOpen && (
                                      <>
                                        {/* Horaires */}
                                        <div className="flex items-center gap-1.5">
                                          <input type="time"
                                            suppressHydrationWarning
                                            defaultValue={sched.opening_time.slice(0,5)}
                                            min={salonOpen} max={salonClose}
                                            onBlur={(e) => {
                                              if (!e.target.value) return;
                                              const v = e.target.value;
                                              const clamped = v < salonOpen ? salonOpen : v > salonClose ? salonClose : v;
                                              handleUpdateSchedule(sched.id, { opening_time: clamped });
                                            }}
                                            className="rounded-xl border border-[var(--card-border)] bg-[var(--panel-bg-secondary)] px-2 py-1 text-xs text-[var(--text-main)] outline-none focus:border-[var(--gold)]" />
                                          <span className="text-xs text-[#a09890]">→</span>
                                          <input type="time"
                                            suppressHydrationWarning
                                            defaultValue={sched.closing_time.slice(0,5)}
                                            min={salonOpen} max={salonClose}
                                            onBlur={(e) => {
                                              if (!e.target.value) return;
                                              const v = e.target.value;
                                              const clamped = v < salonOpen ? salonOpen : v > salonClose ? salonClose : v;
                                              handleUpdateSchedule(sched.id, { closing_time: clamped });
                                            }}
                                            className="rounded-xl border border-[var(--card-border)] bg-[var(--panel-bg-secondary)] px-2 py-1 text-xs text-[var(--text-main)] outline-none focus:border-[var(--gold)]" />
                                        </div>

                                        {/* Pause toggle */}
                                        <label className="flex items-center gap-1.5 text-xs text-[var(--nav-text)] cursor-pointer">
                                          <input type="checkbox" checked={sched.has_break}
                                            onChange={(e) => handleUpdateSchedule(sched.id, { has_break: e.target.checked, break_start: e.target.checked ? (sched.break_start ?? "12:00") : null, break_end: e.target.checked ? (sched.break_end ?? "14:00") : null })} />
                                          Pause
                                        </label>

                                        {/* Horaires pause */}
                                        {sched.has_break && (
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-[#a09890]">de</span>
                                            <input type="time"
                                              suppressHydrationWarning
                                              defaultValue={(sched.break_start ?? "12:00").slice(0,5)}
                                              min={sched.opening_time.slice(0,5)} max={sched.closing_time.slice(0,5)}
                                              onBlur={(e) => { if (e.target.value) handleUpdateSchedule(sched.id, { break_start: e.target.value }); }}
                                              className="rounded-xl border border-[var(--card-border)] bg-[var(--panel-bg-secondary)] px-2 py-1 text-xs text-[var(--text-main)] outline-none focus:border-[var(--gold)]" />
                                            <span className="text-xs text-[#a09890]">à</span>
                                            <input type="time"
                                              suppressHydrationWarning
                                              defaultValue={(sched.break_end ?? "14:00").slice(0,5)}
                                              min={sched.opening_time.slice(0,5)} max={sched.closing_time.slice(0,5)}
                                              onBlur={(e) => { if (e.target.value) handleUpdateSchedule(sched.id, { break_end: e.target.value }); }}
                                              className="rounded-xl border border-[var(--card-border)] bg-[var(--panel-bg-secondary)] px-2 py-1 text-xs text-[var(--text-main)] outline-none focus:border-[var(--gold)]" />
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {!salonDayOpen && (
                                      <span className="text-xs text-[#b0a89e]">Salon fermé</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Couleur */}
                          <div className="mt-4 grid gap-1">
                            <div className="text-xs font-semibold text-[var(--nav-text)]">Couleur agenda</div>
                            <div className="flex flex-wrap gap-1.5">
                              {COLOR_OPTIONS.map((c) => {
                                const takenByOther = usedColors.includes(c);
                                const isSelected = member.color === c;
                                return (
                                  <button key={c} type="button" disabled={takenByOther && !isSelected}
                                    onClick={() => { if (!takenByOther || isSelected) handleUpdateStaff(member.id, { color: c }); }}
                                    title={takenByOther && !isSelected ? "Déjà utilisée" : undefined}
                                    className={`h-7 w-7 rounded-lg border-2 transition ${isSelected ? "border-neutral-900 scale-110" : takenByOther ? "cursor-not-allowed opacity-30" : "border-transparent hover:scale-105"}`}
                                    style={{ backgroundColor: c }} />
                                );
                              })}
                            </div>
                          </div>
                          {updatingStaffId === member.id ? <div className="mt-2 text-xs text-[var(--nav-text)]">Enregistrement...</div> : null}
                        </div>
                      );
                    })}
                  </div>

                  {/* Ajouter */}
                  <div className="mt-4 rounded-2xl border border-[var(--card-border)] bg-white p-4">
                    <div className="mb-3 text-sm font-black">Ajouter une prestataire</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1 text-xs font-semibold text-[var(--nav-text)]">
                        Prénom
                        <input type="text" value={newStaffFirstName} onChange={(e) => setNewStaffFirstName(e.target.value)} className={fieldClass} />
                      </label>
                      <label className="grid gap-1 text-xs font-semibold text-[var(--nav-text)]">
                        Nom
                        <input type="text" value={newStaffLastName} onChange={(e) => setNewStaffLastName(e.target.value)} className={fieldClass} />
                      </label>
                    </div>
                    <div className="mt-3 grid gap-1">
                      <div className="text-xs font-semibold text-[var(--nav-text)]">Couleur agenda</div>
                      <div className="flex flex-wrap gap-1.5">
                        {COLOR_OPTIONS.map((c) => {
                          const taken = staff.some((s) => s.color === c);
                          return (
                            <button key={c} type="button" disabled={taken}
                              onClick={() => { if (!taken) setNewStaffColor(c); }}
                              title={taken ? "Déjà utilisée" : undefined}
                              className={`h-7 w-7 rounded-lg border-2 transition ${newStaffColor === c ? "border-neutral-900 scale-110" : taken ? "cursor-not-allowed opacity-30" : "border-transparent hover:scale-105"}`}
                              style={{ backgroundColor: c }} />
                          );
                        })}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-[#9a9089]">Les horaires par jour seront configurables après la création.</p>
                    <div className="mt-4 flex justify-end">
                      <button type="button" onClick={handleCreateStaff} disabled={savingStaff} className={primaryButtonClass}>
                        {savingStaff ? "Ajout..." : "Ajouter"}
                      </button>
                    </div>
                  </div>
              </div>
              )}
              {activeTab === "services" && (
              <div className={cardClass + " p-5 md:p-7"}>
                  <div className="mb-6 flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--gold)]">
                        <span className="text-xl">⭐</span>
                        Prestations
                      </div>
                      <h2 className="text-2xl font-black tracking-tight">Gérer les prestations</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!showAddService) {
                          const nextOrder = Math.max(0, ...services.map((s) => s.display_order ?? 0)) + 1;
                          setNewServiceOrder(String(nextOrder));
                        }
                        setShowAddService((v) => !v);
                      }}
                      className={primaryButtonClass}
                    >
                      {showAddService ? "Fermer" : "+ Ajouter"}
                    </button>
                  </div>

                  {showAddService && (
                    <div className="mb-6 rounded-3xl border border-[var(--card-border)] bg-white p-5">
                      <div className="mb-4 text-lg font-black">Ajouter une prestation</div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)] xl:col-span-2">
                          Nom
                          <input
                            type="text"
                            value={newServiceName}
                            onChange={(e) => setNewServiceName(e.target.value)}
                            className={fieldClass}
                          />
                        </label>

                        <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                          Temps 1
                          <input
                            type="number"
                            min={0}
                            value={newServiceBeforeBreak}
                            onChange={(e) => setNewServiceBeforeBreak(e.target.value)}
                            className={fieldClass}
                          />
                        </label>

                        <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                          Pause
                          <input
                            type="number"
                            min={0}
                            value={newServiceBreakDuration}
                            onChange={(e) => setNewServiceBreakDuration(e.target.value)}
                            className={fieldClass}
                          />
                        </label>

                        <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                          Temps 2
                          <input
                            type="number"
                            min={0}
                            value={newServiceAfterBreak}
                            onChange={(e) => setNewServiceAfterBreak(e.target.value)}
                            className={fieldClass}
                          />
                        </label>

                        <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                          Tarif €
                          <input
                            type="text"
                            value={newServicePrice}
                            onChange={(e) => setNewServicePrice(e.target.value)}
                            className={fieldClass}
                          />
                        </label>

                        <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                          Catégorie
                          <select
                            value={newServiceCategoryId}
                            onChange={(e) => setNewServiceCategoryId(e.target.value)}
                            className={fieldClass}
                          >
                            <option value="">Sans catégorie</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                          Ordre d’affichage
                          <input
                            type="number"
                            value={newServiceOrder}
                            onChange={(e) => setNewServiceOrder(e.target.value)}
                            className={fieldClass}
                          />
                        </label>

                        <label className="flex items-center justify-between rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3 text-sm font-semibold">
                          <span>Visible sur le site</span>
                          <input
                            type="checkbox"
                            checked={newServiceVisible}
                            onChange={(e) => setNewServiceVisible(e.target.checked)}
                          />
                        </label>
                      </div>

                      <div className="mt-4 rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--nav-text)]">
                        Durée totale :{" "}
                        {getTotalDuration(
                          Math.max(0, Number(newServiceBeforeBreak) || 0),
                          Math.max(0, Number(newServiceBreakDuration) || 0),
                          Math.max(0, Number(newServiceAfterBreak) || 0)
                        )}{" "}
                        min
                      </div>

                      <div className="mt-5 flex justify-end">
                        <button
                          type="button"
                          onClick={handleCreateService}
                          disabled={savingService}
                          className={primaryButtonClass}
                        >
                          {savingService ? "Ajout..." : "Ajouter la prestation"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-main)] outline-none focus:border-[var(--gold)]"
                    >
                      <option value="all">Toutes les catégories</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4">
                    {services.filter((s) => selectedCategory === "all" || s.category_id === selectedCategory).length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-[#dccdbb] bg-white/70 px-4 py-5 text-sm text-[var(--nav-text)]">
                        Aucune prestation.
                      </div>
                    ) : (
                      services.filter((s) => selectedCategory === "all" || s.category_id === selectedCategory).map((service) => {
                        const before = service.duration_before_break ?? service.duration_minutes ?? 0;
                        const pause = service.break_duration ?? 0;
                        const after = service.duration_after_break ?? 0;
                        const total = getTotalDuration(before, pause, after);
                        const categoryColor = categories.find((c) => c.id === service.category_id)?.color ?? "#EADCCB";

                        const e = serviceEdits[service.id];
                        const editName = e?.name ?? service.name;
                        const editBefore = e?.duration_before_break ?? before;
                        const editPause = e?.break_duration ?? pause;
                        const editAfter = e?.duration_after_break ?? after;
                        const editPriceRaw = e?.price_raw ?? (service.price_cents / 100).toFixed(2);
                        const editOrder = e?.display_order ?? service.display_order;
                        const editCategoryId = e?.category_id ?? service.category_id ?? "";
                        const editVisible = e?.is_visible ?? service.is_visible;
                        const isDirty = !!e;

                        const defaults = {
                          name: service.name, duration_before_break: before, break_duration: pause,
                          duration_after_break: after, price_raw: (service.price_cents / 100).toFixed(2),
                          display_order: service.display_order, category_id: service.category_id ?? "",
                          is_visible: service.is_visible,
                        };
                        const setEdit = (values: Partial<NonNullable<typeof e>>) =>
                          setServiceEdits((prev) => ({
                            ...prev,
                            [service.id]: { ...defaults, ...prev[service.id], ...values },
                          }));

                        const saveEdits = async () => {
                          if (!e) return;
                          await handleUpdateService(service.id, {
                            name: e.name,
                            duration_before_break: e.duration_before_break,
                            break_duration: e.break_duration,
                            duration_after_break: e.duration_after_break,
                            price_cents: normalizePriceToCents(e.price_raw),
                            display_order: e.display_order,
                            category_id: e.category_id || null,
                            is_visible: e.is_visible,
                          });
                          setServiceEdits((prev) => { const n = { ...prev }; delete n[service.id]; return n; });
                        };

                        return (
                          <div
                            key={service.id}
                            className="rounded-2xl border bg-white p-4 shadow-sm transition-colors"
                            style={{ borderColor: isDirty ? "var(--gold)" : categoryColor }}
                          >
                            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div className="flex items-center gap-3">
                                <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: categoryColor }} />
                                <div>
                                  <div className="font-black">{service.name}</div>
                                  <div className="text-sm text-[var(--nav-text)]">
                                    {service.categories?.name ?? "Sans catégorie"} • {formatPrice(service.price_cents)} • {total} min
                                    {pause > 0 ? ` • ${before} + ${pause} + ${after}` : null}
                                  </div>
                                </div>
                              </div>
                              <label className="flex items-center gap-2 text-sm font-semibold">
                                <span>Visible</span>
                                <input type="checkbox" checked={editVisible} onChange={(ev) => setEdit({ is_visible: ev.target.checked })} />
                              </label>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-8">
                              <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)] xl:col-span-2">
                                Nom
                                <input type="text" value={editName} onChange={(ev) => setEdit({ name: ev.target.value })} className={fieldClass} />
                              </label>
                              <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                                Temps 1
                                <input type="number" min={0} value={editBefore} onChange={(ev) => setEdit({ duration_before_break: Math.max(0, Number(ev.target.value) || 0) })} className={fieldClass} />
                              </label>
                              <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                                Pause
                                <input type="number" min={0} value={editPause} onChange={(ev) => setEdit({ break_duration: Math.max(0, Number(ev.target.value) || 0) })} className={fieldClass} />
                              </label>
                              <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                                Temps 2
                                <input type="number" min={0} value={editAfter} onChange={(ev) => setEdit({ duration_after_break: Math.max(0, Number(ev.target.value) || 0) })} className={fieldClass} />
                              </label>
                              <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                                Tarif €
                                <input type="text" value={editPriceRaw} onChange={(ev) => setEdit({ price_raw: ev.target.value })} className={fieldClass} />
                              </label>
                              <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                                Ordre
                                <input type="number" value={editOrder} onChange={(ev) => setEdit({ display_order: Number(ev.target.value) || 0 })} className={fieldClass} />
                              </label>
                              <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                                Catégorie
                                <select value={editCategoryId} onChange={(ev) => setEdit({ category_id: ev.target.value })} className={fieldClass}>
                                  <option value="">Sans catégorie</option>
                                  {categories.map((category) => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                  ))}
                                </select>
                              </label>
                            </div>

                            <div className="mt-4 flex justify-end gap-2">
                              {isDirty && (
                                <button type="button" onClick={saveEdits} disabled={updatingServiceId === service.id} className={primaryButtonClass}>
                                  {updatingServiceId === service.id ? "Enregistrement..." : "Enregistrer"}
                                </button>
                              )}
                              {confirmDeleteServiceId === service.id ? (
                                <>
                                  <button type="button" onClick={() => { handleDeleteService(service.id); setConfirmDeleteServiceId(null); }} disabled={deletingServiceId === service.id} className={dangerButtonClass}>
                                    {deletingServiceId === service.id ? "Suppression..." : "Confirmer"}
                                  </button>
                                  <button type="button" onClick={() => setConfirmDeleteServiceId(null)} className="rounded-2xl border border-[var(--card-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--nav-text)] transition hover:bg-white/70">
                                    Annuler
                                  </button>
                                </>
                              ) : (
                                <button type="button" onClick={() => setConfirmDeleteServiceId(service.id)} className={dangerButtonClass}>
                                  Supprimer
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
              </div>
              )}
              {activeTab === "questionnaire" && (
              <div className={cardClass + " p-5 md:p-7"}>
                <div className="mb-6">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--gold)]">
                    <span className="text-xl">📋</span>
                    Questionnaire
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">Questions à la réservation</h2>
                  <p className="mt-1 text-sm text-[var(--nav-text)]">Les questions actives apparaissent sous "message au salon". Toutes les réponses sont obligatoires.</p>
                </div>

                <div className="grid gap-3">
                  {questions.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-[#dccdbb] bg-white/70 px-4 py-5 text-sm text-[var(--nav-text)]">
                      Aucune question. Ajoutez-en une ci-dessous.
                    </div>
                  ) : (
                    questions.map((q) => (
                      <div key={q.id} className="rounded-2xl border border-[var(--card-border)] bg-white p-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuestion(q.id, { is_active: !q.is_active })}
                            className={`h-5 w-9 shrink-0 rounded-full transition-colors ${q.is_active ? "bg-[var(--text-main)]" : "bg-[#d8d0c8]"}`}
                          >
                            <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${q.is_active ? "translate-x-4" : "translate-x-0"}`} />
                          </button>

                          <input
                            type="text"
                            defaultValue={q.question}
                            onBlur={(e) => {
                              if (e.target.value.trim() && e.target.value !== q.question) {
                                handleUpdateQuestion(q.id, { question: e.target.value.trim() });
                              }
                            }}
                            className="flex-1 rounded-2xl border border-[var(--card-border)] bg-white px-4 py-2 text-sm font-semibold outline-none transition focus:border-[var(--gold)]"
                          />

                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className={`text-xs font-semibold ${q.is_active ? "text-[#1f6a3a]" : "text-[#9a9089]"}`}>
                            {q.is_active ? "Active" : "Inactive"}
                          </span>
                          {confirmDeleteQuestionId === q.id ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => { handleDeleteQuestion(q.id); setConfirmDeleteQuestionId(null); }}
                                disabled={deletingQuestionId === q.id}
                                className={dangerButtonClass}
                              >
                                {deletingQuestionId === q.id ? "Suppression..." : "Confirmer"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteQuestionId(null)}
                                className="rounded-2xl border border-[var(--card-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--nav-text)] transition hover:bg-white/70"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteQuestionId(q.id)}
                              className={dangerButtonClass}
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                        {updatingQuestionId === q.id ? <div className="mt-2 text-xs text-[var(--nav-text)]">Enregistrement...</div> : null}
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-6 rounded-3xl border border-[var(--card-border)] bg-white p-5">
                  <div className="mb-4 text-lg font-black">Ajouter une question</div>
                  <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                    Question
                    <input
                      type="text"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="Ex : Avez-vous des allergies ?"
                      className={fieldClass}
                    />
                  </label>
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={handleCreateQuestion}
                      disabled={savingQuestion}
                      className={primaryButtonClass}
                    >
                      {savingQuestion ? "Ajout..." : "Ajouter la question"}
                    </button>
                  </div>
                </div>
              </div>
              )}

              {activeTab === "galerie" && (
              <section className={cardClass + " p-5 md:p-7"}>
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--gold)]">
                      <span className="text-xl">🖼️</span>
                      Galerie
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">Photos du salon</h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveGallery}
                    disabled={savingGallery}
                    className={primaryButtonClass}
                  >
                    {savingGallery ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>

                <div className="grid gap-6">
                  {/* Toggle */}
                  <label className="flex cursor-pointer items-center gap-3">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={galleryEnabled}
                        onChange={(e) => setGalleryEnabled(e.target.checked)}
                      />
                      <div className={`h-6 w-11 rounded-full transition ${galleryEnabled ? "bg-[var(--selected-bg)]" : "bg-gray-200"}`} />
                      <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${galleryEnabled ? "translate-x-5" : "translate-x-0"}`} />
                    </div>
                    <span className="text-sm font-semibold text-[var(--nav-text)]">
                      Afficher la galerie sur le site
                    </span>
                  </label>

                  {/* Carte de présentation */}
                  <div className="rounded-2xl border border-[var(--card-border)] bg-white p-5">
                    <div className="mb-4 text-sm font-bold text-[var(--nav-text)]">Carte de présentation</div>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <label className="text-sm font-semibold text-[var(--nav-text)]">Titre</label>
                        <input
                          type="text"
                          value={galleryTitle}
                          onChange={(e) => setGalleryTitle(e.target.value)}
                          className={fieldClass}
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-semibold text-[var(--nav-text)]">Texte de présentation</label>
                        <textarea
                          rows={3}
                          value={galleryText}
                          onChange={(e) => setGalleryText(e.target.value)}
                          className={fieldClass + " resize-none"}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 12 photos */}
                  <div>
                    <div className="mb-3 text-sm font-bold text-[var(--nav-text)]">Photos (12 max)</div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {galleryPhotos.map((photo, i) => (
                        <div key={i} className="rounded-2xl border border-[var(--card-border)] bg-white p-4">
                          <div className="mb-2 text-xs font-semibold text-[var(--nav-text)] opacity-60">Photo {i + 1}</div>
                          {photo.url ? (
                            <div className="relative mb-3 overflow-hidden rounded-xl">
                              <img src={photo.url} alt={`Photo ${i + 1}`} className="h-36 w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => { void removeStorageFile(photo.url); setGalleryPhotos((prev) => prev.map((p, idx) => idx === i ? { ...p, url: "" } : p)); }}
                                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                                aria-label="Supprimer la photo"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <label className={`mb-3 flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--card-border)] bg-[var(--panel-bg)] text-sm font-semibold text-[var(--nav-text)] transition hover:bg-white ${uploadingGalleryIndex === i ? "opacity-50 pointer-events-none" : ""}`}>
                              {uploadingGalleryIndex === i ? "Importation..." : (
                                <>
                                  <span className="text-2xl">📷</span>
                                  Choisir une photo
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingGalleryIndex !== null}
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadGalleryPhoto(i, f); e.target.value = ""; }}
                              />
                            </label>
                          )}
                          <textarea
                            rows={3}
                            value={photo.caption}
                            onChange={(e) => setGalleryPhotos((prev) => prev.map((p, idx) => idx === i ? { ...p, caption: e.target.value } : p))}
                            className={fieldClass + " resize-none text-sm"}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
              )}

              {activeTab === "apparence" && (
              <div className={cardClass + " p-5 md:p-7"}>
                <div className="mb-6 flex items-center gap-2 text-sm font-bold text-[var(--gold)]">
                  <span className="text-xl">🎨</span>
                  Apparence
                </div>
                <h2 className="mb-6 text-2xl font-black tracking-tight">Personnalisation du site</h2>

                <div className="mb-6 flex flex-wrap gap-2 border-b border-[var(--card-border)] pb-4">
                  {([
                    { id: "nom" as const, label: "Nom du salon" },
                    { id: "motif" as const, label: "Motif de fond" },
                    { id: "police" as const, label: "Police" },
                    { id: "couleurs" as const, label: "Couleurs" },
                    { id: "hero" as const, label: "Carte hero" },
                    { id: "logos" as const, label: "Logos" },
                    { id: "photos" as const, label: "Photos" },
                    { id: "prestations" as const, label: "Prestations" },
                    { id: "apropos" as const, label: "À propos" },
                    { id: "avis" as const, label: "Avis" },
                  ]).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAppearanceSubTab(tab.id)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        appearanceSubTab === tab.id
                          ? "bg-[var(--selected-bg)] text-[var(--selected-text)] shadow-[0_8px_20px_rgba(31,27,23,0.2)]"
                          : "border border-[var(--card-border)] bg-[var(--panel-bg)] text-[var(--nav-text)] hover:bg-[var(--panel-bg)]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="grid gap-6">
                  {appearanceSubTab === "nom" && (
                  <div className={panelClass + " p-5"}>
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-black">Nom du salon</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveAppearanceMeta}
                        disabled={savingAppearanceMeta}
                        className={primaryButtonClass}
                      >
                        {savingAppearanceMeta ? "Enregistrement..." : "Enregistrer"}
                      </button>
                    </div>
                    <div className="grid gap-4">
                      <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                        Nom du salon
                        <input
                          type="text"
                          value={appearanceSalonName}
                          onChange={(e) => setAppearanceSalonName(e.target.value)}
                          className={fieldClass}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                        Sous-titre
                        <input
                          type="text"
                          value={appearanceSalonSubtitle}
                          onChange={(e) => setAppearanceSalonSubtitle(e.target.value)}
                          className={fieldClass}
                        />
                      </label>
                      <div className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                        Police du nom
                        <div className="relative" ref={salonNameFontDropdownRef}>
                          {salonNameFontDropdownOpen && (
                            <link
                              rel="stylesheet"
                              href={`https://fonts.googleapis.com/css2?${FONT_OPTIONS.map((f) => `family=${f.replace(/ /g, "+")}:wght@400;700`).join("&")}&display=swap`}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => { setSalonNameFontDropdownOpen((v) => !v); setSalonNameFontSearch(""); }}
                            className={`${fieldClass} flex w-full items-center justify-between`}
                            style={appearanceSalonNameFont ? { fontFamily: `'${appearanceSalonNameFont}', sans-serif` } : undefined}
                          >
                            <span className="font-normal">{appearanceSalonNameFont || "Par défaut"}</span>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`shrink-0 transition-transform ${salonNameFontDropdownOpen ? "rotate-180" : ""}`}>
                              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          {salonNameFontDropdownOpen && (
                            <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-2xl border border-[var(--card-border)] bg-white shadow-[0_18px_45px_rgba(80,55,25,0.14)]">
                              <div className="border-b border-[var(--card-border)] p-2">
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Rechercher une police..."
                                  value={salonNameFontSearch}
                                  onChange={(e) => setSalonNameFontSearch(e.target.value)}
                                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--panel-bg-secondary)] px-3 py-2 text-sm font-normal text-[var(--text-main)] outline-none focus:border-[var(--gold)]"
                                />
                              </div>
                              <div className="max-h-60 overflow-y-auto py-1">
                                {!salonNameFontSearch && (
                                  <button
                                    type="button"
                                    onClick={() => { setAppearanceSalonNameFont(""); setSalonNameFontDropdownOpen(false); }}
                                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--page-bg)] ${!appearanceSalonNameFont ? "font-semibold text-[var(--gold)]" : "font-normal text-[var(--nav-text)]"}`}
                                  >
                                    Par défaut
                                  </button>
                                )}
                                {FONT_OPTIONS.filter((f) => f.toLowerCase().includes(salonNameFontSearch.toLowerCase())).map((font) => (
                                  <button
                                    key={font}
                                    type="button"
                                    onClick={() => { setAppearanceSalonNameFont(font); setSalonNameFontDropdownOpen(false); setSalonNameFontSearch(""); }}
                                    className={`w-full px-4 py-2.5 text-left hover:bg-[var(--page-bg)] ${appearanceSalonNameFont === font ? "font-semibold text-[var(--gold)]" : "font-normal text-[var(--text-main)]"}`}
                                    style={{ fontFamily: `'${font}', sans-serif`, fontSize: "15px" }}
                                  >
                                    {font}
                                  </button>
                                ))}
                                {FONT_OPTIONS.filter((f) => f.toLowerCase().includes(salonNameFontSearch.toLowerCase())).length === 0 && (
                                  <div className="px-4 py-3 text-sm font-normal text-[var(--nav-text)]">Aucune police trouvée</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                  {appearanceSubTab === "motif" && (
                  <div className={panelClass + " p-5"}>
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-black">Motif de fond</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSavePattern}
                        disabled={savingPattern}
                        className={primaryButtonClass}
                      >
                        {savingPattern ? "Enregistrement..." : "Enregistrer"}
                      </button>
                    </div>
                    <div className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                      Motif de fond
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {PATTERN_OPTIONS.map((opt) => {
                          const previewStyles: Record<string, React.CSSProperties> = {
                            none: {},
                            lignes: { backgroundImage: "repeating-linear-gradient(0deg,rgba(0,0,0,0.08) 0px,rgba(0,0,0,0.08) 1px,transparent 1px,transparent 5px)" },
                            chevrons: { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='10'%3E%3Cpath d='M0 10L5 0L10 10L15 0L20 10' fill='none' stroke='rgba(0,0,0,0.12)' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: "20px 10px" },
                            vagues: { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='10'%3E%3Cpath d='M0 5 Q5 2 10 5 T20 5' fill='none' stroke='rgba(0,0,0,0.12)' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: "20px 10px" },
                            etoiles: { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14'%3E%3Cpath d='M7 0L8.5 5.5L14 7L8.5 8.5L7 14L5.5 8.5L0 7L5.5 5.5Z' fill='rgba(0,0,0,0.13)'/%3E%3C/svg%3E")`, backgroundSize: "14px 14px" },
                            grid: { backgroundImage: "linear-gradient(rgba(0,0,0,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.07) 1px,transparent 1px)", backgroundSize: "10px 10px" },
                            dots: { backgroundImage: "radial-gradient(circle,rgba(0,0,0,0.15) 1px,transparent 1px)", backgroundSize: "8px 8px" },
                            circles: { backgroundImage: "radial-gradient(circle at center,rgba(0,0,0,0.09) 5px,transparent 5px)", backgroundSize: "16px 16px" },
                            bubbles: { backgroundImage: "radial-gradient(circle at center,transparent 3px,rgba(0,0,0,0.09) 4px,rgba(0,0,0,0.09) 5px,transparent 6px)", backgroundSize: "16px 16px" },
                            diagonal: { backgroundImage: "repeating-linear-gradient(45deg,rgba(0,0,0,0.06) 0px,rgba(0,0,0,0.06) 1px,transparent 1px,transparent 6px)" },
                            grain: { backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 128 128' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`, backgroundSize: "64px 64px" },
                            hexagons: { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='25'%3E%3Cpath d='M7 1l6 3.5v7L7 15 1 11.5v-7z' fill='none' stroke='rgba(0%2C0%2C0%2C0.1)' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: "14px 25px" },
                          };
                          const isSelected = appearancePattern === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setAppearancePattern(opt.value)}
                              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-1.5 transition ${isSelected ? "border-[var(--accents)]" : "border-[var(--card-border)] hover:border-[var(--accents)]/40"}`}
                            >
                              <div
                                className="h-10 w-full rounded-lg border border-[var(--card-border)] bg-white"
                                style={previewStyles[opt.value] ?? {}}
                              />
                              <span className={`text-xs font-semibold ${isSelected ? "text-[var(--accents)]" : "text-[var(--nav-text)]"}`}>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  )}

                  {appearanceSubTab === "police" && (
                  <div className={panelClass + " p-5"}>
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-black">Police</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveFont}
                        disabled={savingFont}
                        className={primaryButtonClass}
                      >
                        {savingFont ? "Enregistrement..." : "Enregistrer"}
                      </button>
                    </div>
                    <div className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                      Police du site
                      <div className="relative" ref={fontDropdownRef}>
                        {fontDropdownOpen && (
                          <link
                            rel="stylesheet"
                            href={`https://fonts.googleapis.com/css2?${FONT_OPTIONS.map((f) => `family=${f.replace(/ /g, "+")}:wght@400;700`).join("&")}&display=swap`}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => { setFontDropdownOpen((v) => !v); setFontSearch(""); }}
                          className={`${fieldClass} flex w-full items-center justify-between`}
                          style={appearanceFont ? { fontFamily: `'${appearanceFont}', sans-serif` } : undefined}
                        >
                          <span className="font-normal">{appearanceFont || "Par défaut"}</span>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`shrink-0 transition-transform ${fontDropdownOpen ? "rotate-180" : ""}`}>
                            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {fontDropdownOpen && (
                          <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-2xl border border-[var(--card-border)] bg-white shadow-[0_18px_45px_rgba(80,55,25,0.14)]">
                            <div className="border-b border-[var(--card-border)] p-2">
                              <input
                                autoFocus
                                type="text"
                                placeholder="Rechercher une police..."
                                value={fontSearch}
                                onChange={(e) => setFontSearch(e.target.value)}
                                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--panel-bg-secondary)] px-3 py-2 text-sm font-normal text-[var(--text-main)] outline-none focus:border-[var(--gold)]"
                              />
                            </div>
                            <div className="max-h-60 overflow-y-auto py-1">
                              {!fontSearch && (
                                <button
                                  type="button"
                                  onClick={() => { setAppearanceFont(""); setFontDropdownOpen(false); }}
                                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--page-bg)] ${!appearanceFont ? "font-semibold text-[var(--gold)]" : "font-normal text-[var(--nav-text)]"}`}
                                >
                                  Par défaut
                                </button>
                              )}
                              {FONT_OPTIONS.filter((f) => f.toLowerCase().includes(fontSearch.toLowerCase())).map((font) => (
                                <button
                                  key={font}
                                  type="button"
                                  onClick={() => { setAppearanceFont(font); setFontDropdownOpen(false); setFontSearch(""); }}
                                  className={`w-full px-4 py-2.5 text-left hover:bg-[var(--page-bg)] ${appearanceFont === font ? "font-semibold text-[var(--gold)]" : "font-normal text-[var(--text-main)]"}`}
                                  style={{ fontFamily: `'${font}', sans-serif`, fontSize: "15px" }}
                                >
                                  {font}
                                </button>
                              ))}
                              {FONT_OPTIONS.filter((f) => f.toLowerCase().includes(fontSearch.toLowerCase())).length === 0 && (
                                <div className="px-4 py-3 text-sm font-normal text-[var(--nav-text)]">Aucune police trouvée</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  )}

                  {appearanceSubTab === "couleurs" && (
                  <div className={panelClass + " p-5"}>
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-black">Couleurs</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveAppearance}
                        disabled={savingAppearance}
                        className={primaryButtonClass}
                      >
                        {savingAppearance ? "Enregistrement..." : "Enregistrer"}
                      </button>
                    </div>

                    <div className="grid gap-6">
                      {(
                        [
                          {
                            title: "Fond de page",
                            items: [
                              { key: "pagebg", label: "Fond de page", desc: "Arrière-plan général, header, footer et bordures des cartes", value: appearancePageBg, setter: setAppearancePageBg },
                            ],
                          },
                          {
                            title: "Carte hero",
                            items: [
                              { key: "herobg", label: "Fond de la carte hero", desc: "Fond de la grande carte de présentation en haut du site", value: appearanceHeroBg, setter: setAppearanceHeroBg },
                              { key: "heroaccent", label: "Badge & points forts", desc: "Pastille au-dessus du nom du salon et icônes des points forts (hero)", value: appearanceHeroAccent, setter: setAppearanceHeroAccent },
                            ],
                          },
                          {
                            title: "Prestations",
                            items: [
                              { key: "prestationsaccent", label: "Badge & prix", desc: "Pastille \"Prestations\" et prix affiché sur chaque carte", value: appearancePrestationsAccent, setter: setAppearancePrestationsAccent },
                            ],
                          },
                          {
                            title: "À propos",
                            items: [
                              { key: "aproposaccent", label: "Badge", desc: "Pastille \"À propos\" au-dessus du texte de présentation", value: appearanceAproposAccent, setter: setAppearanceAproposAccent },
                            ],
                          },
                          {
                            title: "Avis",
                            items: [
                              { key: "avisaccent", label: "Badge & mise en valeur", desc: "Pastille \"Avis clients\", guillemets et nom des auteurs sur les cartes d'avis", value: appearanceAvisAccent, setter: setAppearanceAvisAccent },
                            ],
                          },
                          {
                            title: "Contact",
                            items: [
                              { key: "contactbg", label: "Fond de la section", desc: "Fond de la section Contact en bas de page", value: appearanceContactBg, setter: setAppearanceContactBg },
                              { key: "contactaccent", label: "Badge", desc: "Pastille \"Contact\" au-dessus des coordonnées du salon", value: appearanceBadges, setter: setAppearanceBadges },
                            ],
                          },
                          {
                            title: "Titres & sous-titres",
                            items: [
                              { key: "titles", label: "Titres", desc: "Fin du dégradé des grands titres (À propos, Prestations, Galerie) et survol des liens", value: appearanceTitles, setter: setAppearanceTitles },
                              { key: "subtitles", label: "Sous-titres du hero", desc: "Phrase d'accroche, description et points forts sous le nom du salon", value: appearanceSubtitles, setter: setAppearanceSubtitles },
                            ],
                          },
                          {
                            title: "Texte",
                            items: [
                              { key: "textmain", label: "Texte principal", desc: "Navigation, boutons et nom du salon dans le header", value: appearanceTextMain, setter: setAppearanceTextMain },
                              { key: "textsecondary", label: "Texte descriptif", desc: "Paragraphes, descriptions des prestations, texte des avis, horaires", value: appearanceTextSecondary, setter: setAppearanceTextSecondary },
                            ],
                          },
                          {
                            title: "Boutons & accents",
                            items: [
                              { key: "accents", label: "Couleur secondaire", desc: "Boutons, dégradés et accents décoratifs sur tout le site", value: appearanceAccents, setter: setAppearanceAccents },
                            ],
                          },
                        ] as { title: string; items: { key: string; label: string; desc: string; value: string; setter: (v: string) => void }[] }[]
                      ).map((group) => (
                        <div key={group.title} className="grid gap-3">
                          <div className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">{group.title}</div>
                          <div className="grid gap-3">
                            {group.items.map(({ key, label, desc, value, setter }) => (
                              <div key={key} className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-white">
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-3 p-4 text-left"
                                  onClick={() => setOpenColorPicker(openColorPicker === key ? null : key)}
                                >
                                  <div
                                    className="h-9 w-9 shrink-0 rounded-xl border border-[var(--card-border)] shadow-sm"
                                    style={value ? { backgroundColor: value } : { backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%)", backgroundSize: "12px 12px" }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold text-[var(--nav-text)]">{label}</div>
                                    <div className="text-xs text-[var(--nav-text)]">{desc}</div>
                                  </div>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className={`h-4 w-4 shrink-0 text-[#a0927e] transition-transform ${openColorPicker === key ? "rotate-180" : ""}`}
                                  >
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                {openColorPicker === key && (
                                  <div className="border-t border-[var(--card-border)] p-4">
                                    <div className="space-y-1.5">
                                      {APPEARANCE_PALETTE.map((family) => (
                                        <div key={family.label} className="flex items-center gap-1.5">
                                          <span className="w-16 shrink-0 text-[10px] text-[#a0927e]">{family.label}</span>
                                          <div className="flex min-w-0 flex-1 gap-1">
                                            {family.colors.map((c) => (
                                              <button
                                                key={c}
                                                type="button"
                                                onClick={() => setter(c)}
                                                title={c}
                                                className={`h-5 min-w-0 flex-1 rounded transition-transform ${value === c ? "scale-125 ring-2 ring-neutral-900 ring-offset-1" : "hover:scale-110"}`}
                                                style={{ backgroundColor: c }}
                                              />
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  {appearanceSubTab === "hero" && (
                  <div className={panelClass + " p-5"}>
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-black">Carte hero</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveHeroText}
                        disabled={savingHeroText}
                        className={primaryButtonClass}
                      >
                        {savingHeroText ? "Enregistrement..." : "Enregistrer"}
                      </button>
                    </div>
                    <div className="grid gap-4">
                      <label className="grid gap-1.5 text-sm font-semibold text-[var(--nav-text)]">
                        Slogan (sous le nom du salon)
                        <input
                          type="text"
                          value={appearanceHeroTagline}
                          onChange={(e) => setAppearanceHeroTagline(e.target.value)}
                          className={fieldClass}
                        />
                      </label>
                      <label className="grid gap-1.5 text-sm font-semibold text-[var(--nav-text)]">
                        Description
                        <textarea
                          value={appearanceHeroDescription}
                          rows={3}
                          onChange={(e) => setAppearanceHeroDescription(e.target.value)}
                          className={fieldClass + " resize-none"}
                        />
                      </label>
                      <div className="grid gap-1.5 text-sm font-semibold text-[var(--nav-text)]">
                        Badges (3 points forts)
                        <div className="grid gap-2">
                          {appearanceHeroFeatures.map((feat, i) => (
                            <input
                              key={i}
                              type="text"
                              value={feat}
                              onChange={(e) => setAppearanceHeroFeatures((prev) => prev.map((f, j) => j === i ? e.target.value : f))}
                              className={fieldClass}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                  {appearanceSubTab === "logos" && (
                  <div className={panelClass + " p-5"}>
                    <div className="mb-5">
                      <div className="text-lg font-black">Logos</div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="rounded-2xl border border-[var(--card-border)] bg-white p-4">
                        <div className="mb-3 text-sm font-semibold text-[var(--nav-text)]">Logo</div>
                        <div className="flex items-center gap-5">
                          {settings?.logo_image_url && (
                            <div className="overflow-hidden rounded-[22px] border shadow-sm shrink-0" style={{ borderColor: colorCardBorder, backgroundColor: colorPageBg }}>
                              <img
                                src={settings.logo_image_url}
                                alt="Logo actuel"
                                className="h-24 w-24 object-cover"
                              />
                            </div>
                          )}
                          <div className="flex flex-col gap-2">
                            <label className={`block cursor-pointer rounded-2xl border border-[var(--card-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--nav-text)] transition hover:bg-white ${uploadingLogo ? "opacity-50 pointer-events-none" : ""}`}>
                              {uploadingLogo ? "Importation..." : "Choisir un logo"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingLogo}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  e.target.value = "";
                                  if (file) void handleUploadPhoto("logo", file);
                                }}
                              />
                            </label>
                            {settings?.logo_image_url && (
                              <button
                                type="button"
                                onClick={() => void handleDeletePhoto("logo")}
                                className="rounded-2xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[var(--card-border)] bg-white p-4">
                        <div className="mb-3 text-sm font-semibold text-[var(--nav-text)]">Logo Pro</div>
                        <div className="flex items-center gap-5">
                          {settings?.logo_pro_image_url && (
                            <div className="overflow-hidden rounded-[22px] border shadow-sm shrink-0" style={{ borderColor: colorCardBorder, backgroundColor: colorPageBg, width: 96, height: 96 }}>
                              <img
                                src={settings.logo_pro_image_url}
                                alt="Logo Pro actuel"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex flex-col gap-2">
                            <label className={`block cursor-pointer rounded-2xl border border-[var(--card-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--nav-text)] transition hover:bg-white ${uploadingLogoPro ? "opacity-50 pointer-events-none" : ""}`}>
                              {uploadingLogoPro ? "Importation..." : "Choisir un logo pro"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingLogoPro}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  e.target.value = "";
                                  if (file) void handleUploadPhoto("logo-pro", file);
                                }}
                              />
                            </label>
                            {settings?.logo_pro_image_url && (
                              <button
                                type="button"
                                onClick={() => void handleDeletePhoto("logo-pro")}
                                className="rounded-2xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                  {appearanceSubTab === "photos" && (
                  <div className={panelClass + " p-5"}>
                    <div className="mb-5">
                      <div className="text-lg font-black">Photos</div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      {/* Photo hero */}
                      <div className="rounded-2xl border border-[var(--card-border)] bg-white p-4">
                        <div className="mb-3 text-sm font-semibold text-[var(--nav-text)]">Photo principale (hero)</div>
                        {settings?.hero_image_url && (
                          <div className="mb-3 overflow-hidden rounded-xl border" style={{ borderColor: colorCardBorder }}>
                            <img
                              src={settings.hero_image_url}
                              alt="Photo hero actuelle"
                              className="h-40 w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <label className={`flex-1 block cursor-pointer rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3 text-center text-sm font-semibold text-[var(--nav-text)] transition hover:bg-white ${uploadingHero ? "opacity-50 pointer-events-none" : ""}`}>
                            {uploadingHero ? "Importation..." : "Choisir une photo"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingHero}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = "";
                                if (file) void handleUploadPhoto("hero", file);
                              }}
                            />
                          </label>
                          {settings?.hero_image_url && (
                            <button
                              type="button"
                              onClick={() => void handleDeletePhoto("hero")}
                              className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 shrink-0"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Photo à propos */}
                      <div className="rounded-2xl border border-[var(--card-border)] bg-white p-4">
                        <div className="mb-3 text-sm font-semibold text-[var(--nav-text)]">Photo "À propos"</div>
                        {settings?.apropos_image_url && (
                          <div className="mb-3 overflow-hidden rounded-xl border" style={{ borderColor: colorCardBorder }}>
                            <img
                              src={settings.apropos_image_url}
                              alt="Photo à propos actuelle"
                              className="h-40 w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <label className={`flex-1 block cursor-pointer rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3 text-center text-sm font-semibold text-[var(--nav-text)] transition hover:bg-white ${uploadingApropos ? "opacity-50 pointer-events-none" : ""}`}>
                            {uploadingApropos ? "Importation..." : "Choisir une photo"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingApropos}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = "";
                                if (file) void handleUploadPhoto("apropos", file);
                              }}
                            />
                          </label>
                          {settings?.apropos_image_url && (
                            <button
                              type="button"
                              onClick={() => void handleDeletePhoto("apropos")}
                              className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 shrink-0"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                  {appearanceSubTab === "prestations" && (
                  <div className={panelClass + " p-5"}>
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-black">Prestations</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSavePrestations}
                        disabled={savingPrestations}
                        className={primaryButtonClass}
                      >
                        {savingPrestations ? "Enregistrement..." : "Enregistrer"}
                      </button>
                    </div>
                    <div className="grid gap-4">
                      {appearancePrestations.map((p, i) => (
                        <div key={i} className="rounded-2xl border border-[var(--card-border)] bg-white p-4">
                          <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Prestation {i + 1}</div>
                          <div className="grid gap-3">
                            <label className="grid gap-1.5 text-sm font-semibold text-[var(--nav-text)]">
                              Titre
                              <input
                                type="text"
                                value={p.title}
                                onChange={(e) => setAppearancePrestations((prev) => prev.map((item, j) => j === i ? { ...item, title: e.target.value } : item))}
                                className={fieldClass}
                              />
                            </label>
                            <label className="grid gap-1.5 text-sm font-semibold text-[var(--nav-text)]">
                              Description
                              <input
                                type="text"
                                value={p.description}
                                onChange={(e) => setAppearancePrestations((prev) => prev.map((item, j) => j === i ? { ...item, description: e.target.value } : item))}
                                className={fieldClass}
                              />
                            </label>
                            <label className="grid gap-1.5 text-sm font-semibold text-[var(--nav-text)]">
                              Tarif
                              <input
                                type="text"
                                value={p.price}
                                onChange={(e) => setAppearancePrestations((prev) => prev.map((item, j) => j === i ? { ...item, price: e.target.value } : item))}
                                className={fieldClass}
                              />
                            </label>
                            <label className="grid gap-1.5 text-sm font-semibold text-[var(--nav-text)]">
                              Lien (URL)
                              <input
                                type="url"
                                value={p.link ?? ""}
                                onChange={(e) => setAppearancePrestations((prev) => prev.map((item, j) => j === i ? { ...item, link: e.target.value } : item))}
                                placeholder="https://..."
                                className={fieldClass}
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  {appearanceSubTab === "apropos" && (
                  <div className={panelClass + " p-5"}>
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-black">À propos</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveApropos}
                        disabled={savingApropos}
                        className={primaryButtonClass}
                      >
                        {savingApropos ? "Enregistrement..." : "Enregistrer"}
                      </button>
                    </div>
                    <div className="grid gap-4">
                      <label className="grid gap-1.5 text-sm font-semibold text-[var(--nav-text)]">
                        Sous-titre (après le nom du salon)
                        <input
                          type="text"
                          value={appearanceAproposTitle}
                          onChange={(e) => setAppearanceAproposTitle(e.target.value)}
                          className={fieldClass}
                        />
                      </label>
                      <label className="grid gap-1.5 text-sm font-semibold text-[var(--nav-text)]">
                        Texte de présentation
                        <textarea
                          value={appearanceAproposText}
                          rows={4}
                          onChange={(e) => setAppearanceAproposText(e.target.value)}
                          className={fieldClass + " resize-none"}
                        />
                      </label>
                    </div>
                  </div>
                  )}

                  {appearanceSubTab === "avis" && (
                  <div className={panelClass + " p-5"}>
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-black">Avis</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveReviews}
                        disabled={savingReviews}
                        className={primaryButtonClass}
                      >
                        {savingReviews ? "Enregistrement..." : "Enregistrer"}
                      </button>
                    </div>
                    <div className="grid gap-4">
                      {appearanceReviews.map((review, i) => (
                        <div key={i} className="rounded-2xl border border-[var(--card-border)] bg-white p-4">
                          <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Avis {i + 1}</div>
                          <div className="grid gap-3">
                            <label className="grid gap-1.5 text-sm font-semibold text-[var(--nav-text)]">
                              Prénom
                              <input
                                type="text"
                                value={review.name}
                                onChange={(e) => setAppearanceReviews((prev) => prev.map((r, j) => j === i ? { ...r, name: e.target.value } : r))}
                                className={fieldClass}
                              />
                            </label>
                            <label className="grid gap-1.5 text-sm font-semibold text-[var(--nav-text)]">
                              Texte de l'avis
                              <textarea
                                value={review.text}
                                rows={3}
                                onChange={(e) => setAppearanceReviews((prev) => prev.map((r, j) => j === i ? { ...r, text: e.target.value } : r))}
                                className={fieldClass + " resize-none"}
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}
                </div>
              </div>
              )}

              {activeTab === "agendaplus" && (
              <section className={cardClass + " p-5 md:p-7"}>
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--gold)]">
                      <span className="text-xl">💳</span>
                      Abonnement
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">
                      Agenda+
                    </h2>
                  </div>
                </div>

                <div className={panelClass + " p-5"}>
                  <p className="mb-5 text-sm font-medium text-[var(--nav-text)]">
                    Mettez à jour votre carte bancaire, gérez vos factures, et tout ce qu&apos;il est possible de faire avec votre abonnement Agenda+.
                  </p>
                  <a
                    href={`https://agenda-plus.fr/abonnement/portail/${salonSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className={primaryButtonClass + " inline-block"}
                  >
                    Gérer mon abonnement
                  </a>
                </div>
              </section>
              )}
              </div>
            </div>
          )}
      </section>
    </main>
  );
}
