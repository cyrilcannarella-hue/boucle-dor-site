"use client";

import Link from "next/link";
import { SalonNameGradient } from "@/components/SalonNameGradient";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useSalon } from "@/hooks/useSalon";

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r},${g},${b}`;
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
  color_accents?: string | null;
  color_contact_bg?: string | null;
  color_page_bg?: string | null;
  color_text_main?: string | null;
  color_text_secondary?: string | null;
  color_header_bg?: string | null;
  color_card_border?: string | null;
  color_nav_text?: string | null;
  color_gradient_end?: string | null;
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
  site_prestations?: Array<{ title: string; description: string; price: string }> | null;
  site_reviews?: Array<{ name: string; text: string }> | null;
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
  { label: "Neutres",  colors: ["#ffffff","#fafafa","#f5f5f5","#ebebeb","#e0e0e0","#d4d4d4","#c4c4c4","#b5b5b5","#9c9c9c","#878787","#737373","#636363","#595959","#484848","#404040","#333333","#2c2c2c","#262626","#1f1f1f","#1a1a1a","#111111","#0d0d0d","#0a0a0a","#000000"] },
  { label: "Taupes",  colors: ["#fffdf9","#faf5ef","#f5e9dc","#ede0cf","#e8d5be","#ddc9ad","#d4c0a4","#cbb498","#c2a98c","#b99c7a","#ae8d68","#9e7b56","#8a6a45","#7b5b37","#736058","#6e655c","#5c3d2e","#4a2f22","#3d2b1a","#2a1d12","#221610","#1f1b17","#140e09","#0f0b07"] },
  { label: "Ors",     colors: ["#fffbe6","#fff8d6","#fef3c7","#feeaa8","#fde68a","#f8da70","#f3d27a","#f0c855","#f0c040","#eabb30","#e8b830","#ddb030","#d8b56d","#d4af37","#d8a646","#cea030","#c49030","#b98b3d","#ae8030","#a07530","#8b6914","#6b4f0c","#4a3608","#2a1e04"] },
  { label: "Rouges",  colors: ["#fff5f5","#ffe8e8","#fee2e2","#fecaca","#fdb5b5","#fca5a5","#f98989","#f87171","#f55555","#f24040","#ef4444","#e02e2e","#dc2626","#cf1f1f","#c51c1c","#b91c1c","#a81818","#991b1b","#871717","#7f1d1d","#6b1515","#500f0f","#350808","#1a0000"] },
  { label: "Oranges", colors: ["#fff8f2","#fff7ed","#fff0e0","#ffedd5","#fde0b8","#fed7aa","#fec884","#fdba74","#fcaa58","#fb923c","#f97f28","#f97316","#f36810","#f06010","#ea580c","#e04e08","#d44e08","#c2410c","#ae3a0a","#9a3412","#7c2d12","#5c2009","#3a1204","#1c0500"] },
  { label: "Jaunes",  colors: ["#fffff0","#fefce8","#fefae0","#fef9c3","#fef6a8","#fef3a0","#fef08a","#fde870","#fde047","#fbd830","#facc15","#f8c400","#f5bc00","#edb400","#eab308","#dea800","#d4a200","#ca8a04","#b87a04","#a16207","#854d0e","#6b3d0a","#451a03","#1a0900"] },
  { label: "Verts",   colors: ["#f5fff7","#edfff2","#f0fdf4","#e0fce8","#dcfce7","#c8f9d4","#bbf7d0","#a0f2b8","#86efac","#60e890","#4ade80","#30d468","#22c55e","#18b452","#16a34a","#138f40","#15803d","#128038","#166534","#145c2e","#14532d","#0e3d21","#052e16","#010f06"] },
  { label: "Teals",   colors: ["#f0fffd","#e0fff9","#f0fdfa","#d0faf4","#ccfbf1","#b0f8ea","#99f6e4","#78f0d8","#5eead4","#42e0c4","#2dd4bf","#1ec8b0","#14b8a6","#0ea898","#0d9488","#0b8278","#0f766e","#0c6a64","#0c6660","#134e4a","#0e3d39","#042f2e","#011010","#000808"] },
  { label: "Bleus",   colors: ["#f5f9ff","#eef4ff","#eff6ff","#e4f0ff","#dbeafe","#cce0fe","#bfdbfe","#a8cffd","#93c5fd","#78b8fc","#60a5fa","#4a94f8","#3b82f6","#2e72ef","#2563eb","#2058de","#1d4ed8","#1b48ce","#1a44c4","#1e40af","#1e3a8a","#162060","#0a1628","#040d1c"] },
  { label: "Violets", colors: ["#faf5ff","#f7f0ff","#f5f3ff","#ede9fe","#e6e0fe","#ddd6fe","#d0c4fd","#c4b5fd","#b4a0fb","#a78bfa","#9878f8","#8b5cf6","#8048f0","#7c3aed","#7430e4","#6d28d9","#6522cc","#5e20c0","#5b21b6","#5018a8","#4c1d95","#3b166e","#2c1050","#0a0318"] },
  { label: "Roses",   colors: ["#fef0ff","#fde8ff","#fdf4ff","#fce0fe","#fae8ff","#f8d0fd","#f5d0fe","#f2bafd","#f0abfc","#ec92fa","#e879f9","#e060f0","#d946ef","#d030e0","#c828d8","#c020cc","#c026d3","#b81cc4","#ab1ebe","#a21caf","#86198f","#6b1472","#350838","#1a031e"] },
  { label: "Pinks",   colors: ["#fff5f8","#fff0f4","#fff1f2","#ffe8ec","#ffe4e6","#fed8dc","#fecdd3","#fdbfc6","#fda4af","#fc8898","#fb7185","#f85a72","#f43f5e","#f03050","#e82852","#e42050","#e11d48","#d81840","#cc1a42","#be123c","#9f1239","#7d0e2c","#3b0412","#1e0008"] },
];

const cardClass = "rounded-[30px] border border-[var(--card-border)]/90 bg-white/75 shadow-[0_18px_45px_rgba(80,55,25,0.07)] backdrop-blur";
const panelClass = "rounded-[26px] border border-[var(--card-border)] bg-[#fffdf9] shadow-sm";
const fieldClass = "rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3 text-[var(--text-main)] outline-none transition focus:border-[var(--gold)]";
const primaryButtonClass = "rounded-2xl bg-[var(--text-main)] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(31,27,23,0.16)] transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50";
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
  const { id: salonId } = useSalon();

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

  const [settings, setSettings] = useState<SalonSettings | null>(() => {
    try {
      const c = typeof window !== "undefined" && localStorage.getItem("bo_settings_cache");
      return c ? (JSON.parse(c) as SalonSettings) : null;
    } catch { return null; }
  });
  const [savingSettings, setSavingSettings] = useState(false);

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
  const [activeTab, setActiveTab] = useState<"closures" | "promotions" | "settings" | "staff" | "categories" | "services" | "questionnaire" | "apparence">("closures");
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoTextColor, setPromoTextColor] = useState("#ffffff");
  const [promoColorStars, setPromoColorStars] = useState("#d8a646");
  const [promoBgColorState, setPromoBgColorState] = useState("#111111");

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [updatingQuestionId, setUpdatingQuestionId] = useState<string | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [confirmDeleteQuestionId, setConfirmDeleteQuestionId] = useState<string | null>(null);

  const [appearanceTitles, setAppearanceTitles] = useState("#b98b3d");
  const [appearanceAccents, setAppearanceAccents] = useState("#d8a646");
  const [appearanceContactBg, setAppearanceContactBg] = useState("#111111");
  const [appearancePageBg, setAppearancePageBg] = useState("#f5e9dc");
  const [appearanceTextMain, setAppearanceTextMain] = useState("#1f1b17");
  const [appearanceTextSecondary, setAppearanceTextSecondary] = useState("#6e655c");
  const [appearanceSalonName, setAppearanceSalonName] = useState("");
  const [appearanceSalonSubtitle, setAppearanceSalonSubtitle] = useState("Salon de coiffure");
  const [appearanceHeroTagline, setAppearanceHeroTagline] = useState("L'élégance au naturel");
  const [appearanceHeroDescription, setAppearanceHeroDescription] = useState("");
  const [appearanceHeroFeatures, setAppearanceHeroFeatures] = useState(["Techniques de professionnels", "Produits de qualité", "Ambiance chaleureuse"]);
  const [savingHeroText, setSavingHeroText] = useState(false);
  const [appearancePrestations, setAppearancePrestations] = useState([
    { title: "Coupe & brushing", description: "Coupe sur-mesure, brushing, mise en forme", price: "À partir de 28€" },
    { title: "Coloration", description: "Coloration, mèches, balayage, ombré hair", price: "À partir de 45€" },
    { title: "Soins & traitements", description: "Soins profonds, lissage, botox capillaire", price: "À partir de 20€" },
    { title: "Coiffures", description: "Attaches, chignons, coiffures événementielles", price: "À partir de 35€" },
  ]);
  const [savingPrestations, setSavingPrestations] = useState(false);
  const [appearanceAproposTitle, setAppearanceAproposTitle] = useState("un salon à taille humaine");
  const [appearanceAproposText, setAppearanceAproposText] = useState("Chez nous, chaque rendez-vous est pensé comme un vrai moment de bien-être. Virginie vous accueille dans une ambiance conviviale, avec une attention particulière portée à l'écoute, au conseil et au résultat.");
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

  useEffect(() => {
    document.body.style.overflow = selectedClient ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedClient]);

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
      if (loadedSettings) { try { localStorage.setItem("bo_settings_cache", JSON.stringify(loadedSettings)); } catch {} }
      setSettings(loadedSettings);
      setAppearanceSalonName(loadedSettings?.salon_name ?? "");
      setAppearanceSalonSubtitle(loadedSettings?.salon_subtitle ?? "Salon de coiffure");
      if (loadedSettings?.promo_text_color) setPromoTextColor(loadedSettings.promo_text_color);
      if (loadedSettings?.promo_color_from) setPromoColorStars(loadedSettings.promo_color_from);
      if (loadedSettings?.promo_bg_color) setPromoBgColorState(loadedSettings.promo_bg_color);
      if (loadedSettings?.hero_tagline) setAppearanceHeroTagline(loadedSettings.hero_tagline);
      if (loadedSettings?.hero_description) setAppearanceHeroDescription(loadedSettings.hero_description);
      if (loadedSettings?.hero_features?.length) setAppearanceHeroFeatures(loadedSettings.hero_features);
      if (loadedSettings?.site_prestations?.length) setAppearancePrestations(loadedSettings.site_prestations);
      if (loadedSettings?.apropos_title) setAppearanceAproposTitle(loadedSettings.apropos_title);
      if (loadedSettings?.apropos_text) setAppearanceAproposText(loadedSettings.apropos_text);
      if (loadedSettings?.site_reviews?.length) {
        const loaded = loadedSettings.site_reviews as { name: string; text: string }[];
        const padded = [...loaded];
        while (padded.length < 5) padded.push({ name: "", text: "" });
        setAppearanceReviews(padded);
      }
      if (loadedSettings?.color_titles) setAppearanceTitles(loadedSettings.color_titles);
      if (loadedSettings?.color_accents) setAppearanceAccents(loadedSettings.color_accents);
      if (loadedSettings?.color_contact_bg) setAppearanceContactBg(loadedSettings.color_contact_bg);
      if (loadedSettings?.color_page_bg) setAppearancePageBg(loadedSettings.color_page_bg);
      if (loadedSettings?.color_text_main) setAppearanceTextMain(loadedSettings.color_text_main);
      if (loadedSettings?.color_text_secondary) setAppearanceTextSecondary(loadedSettings.color_text_secondary);
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
          sms_sender: settings.sms_sender ?? "BoucleDor",
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
        const before = Number(cleanValues.duration_before_break ?? current?.duration_before_break ?? current?.duration_minutes ?? 0);
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
          promo_color_from: promoColorStars,
          promo_text_color: promoTextColor,
          promo_bg_color: promoBgColorState,
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
        })
        .eq("id", settings.id)
        .eq("salon_id", salonId);
      if (error) throw new Error(error.message);
      setSettings((prev) => prev ? {
        ...prev,
        salon_name: appearanceSalonName.trim() || prev.salon_name,
        salon_subtitle: appearanceSalonSubtitle.trim() || null,
      } : prev);
      setStatusMessage("Nom du salon enregistré ✅");
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message}`);
    } finally {
      setSavingAppearanceMeta(false);
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
          promo_color_from: appearanceAccents,
          promo_color_to: appearanceTitles,
          promo_bg_color: appearanceContactBg,
          color_page_bg: appearancePageBg,
          color_text_main: appearanceTextMain,
          color_text_secondary: appearanceTextSecondary,
          color_header_bg: appearancePageBg,
          color_card_border: appearancePageBg,
          color_nav_text: appearanceTextMain,
          color_gradient_end: appearanceTitles,
        })
        .eq("id", settings.id)
        .eq("salon_id", salonId);
      if (error) throw new Error(error.message);
      setSettings((prev) => prev ? {
        ...prev,
        color_titles: appearanceTitles,
        color_accents: appearanceAccents,
        color_contact_bg: appearanceContactBg,
        promo_color_from: appearanceAccents,
        promo_color_to: appearanceTitles,
        promo_bg_color: appearanceContactBg,
        color_page_bg: appearancePageBg,
        color_text_main: appearanceTextMain,
        color_text_secondary: appearanceTextSecondary,
        color_header_bg: appearancePageBg,
        color_card_border: appearancePageBg,
        color_nav_text: appearanceTextMain,
        color_gradient_end: appearanceTitles,
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
      const { error: updateError } = await supabase
        .from("salon_settings")
        .update({ [column]: publicUrl })
        .eq("id", settings.id)
        .eq("salon_id", salonId);
      if (updateError) throw new Error(updateError.message);
      setSettings((prev) => prev ? { ...prev, [column]: publicUrl } : prev);
      const label = type === "hero" ? "hero" : type === "apropos" ? "à propos" : type === "logo-pro" ? "logo pro" : "logo";
      setStatusMessage(`Photo ${label} mise à jour ✅`);
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message}`);
    } finally {
      setUploading(false);
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

  const colorPageBg = settings?.color_page_bg || "#f5e9dc";
  const colorTitles = settings?.color_titles || "#b98b3d";
  const colorHeaderBg = settings?.color_header_bg || "#F2E8D9";
  const colorTextMain = settings?.color_text_main || "#1f1b17";
  const colorCardBorder = settings?.color_card_border || "#e7ddd0";
  const colorAccents = settings?.color_accents || "#d8a646";
  const colorNavText = settings?.color_nav_text || "#4d4034";
  const salonDisplayName = (settings?.salon_name || "Boucle d'Or").replace(/[\u0027\u2018\u2019\u201B]/g, "'");

  return (
    <main
      className="min-h-screen"
      style={{ color: colorTextMain, background: `radial-gradient(circle at top left, rgba(${hexToRgb(colorAccents)},0.10), transparent 34%), ${colorPageBg}` }}
    >
      <style>{`:root { --gold: ${colorTitles}; --card-border: ${colorCardBorder}; --nav-text: ${colorNavText}; --text-main: ${colorTextMain}; --page-bg: ${colorPageBg}; --accents: ${colorAccents}; }`}</style>
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border shadow-[0_12px_26px_rgba(185,139,61,0.18)] md:h-14 md:w-14 md:rounded-[22px]" style={{ borderColor: colorCardBorder, backgroundColor: colorPageBg }}>
              <img
                src={settings?.logo_pro_image_url || "/logo-pro.png"}
                alt="Boucle d’Or Pro"
                className="h-full w-full object-cover"
              />
            </div>

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
              className="rounded-xl border border-[var(--card-border)] bg-white/80 px-3 py-2 text-xs font-semibold text-[var(--nav-text)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white md:rounded-2xl md:px-4 md:py-3 md:text-sm"
            >
              Agenda
            </Link>

            <Link
              href="/back-office/clients"
              className="rounded-xl border border-[var(--card-border)] bg-white/80 px-3 py-2 text-xs font-semibold text-[var(--nav-text)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white md:rounded-2xl md:px-4 md:py-3 md:text-sm"
            >
              Fiches clients
            </Link>

            <Link
              href="/back-office/gestion"
              className="rounded-xl bg-[var(--text-main)] px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_22px_rgba(31,27,23,0.16)] transition hover:-translate-y-0.5 hover:opacity-90 md:rounded-2xl md:px-4 md:py-3 md:text-sm"
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
                  { id: "staff" as const, label: "Équipe", icon: "👥" },
                  { id: "categories" as const, label: "Catégories", icon: "🗂️" },
                  { id: "services" as const, label: "Prestations", icon: "⭐" },
                  { id: "questionnaire" as const, label: "Questionnaire", icon: "📋" },
                  { id: "apparence" as const, label: "Apparence", icon: "🎨" },
                ]).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold text-left transition ${
                      activeTab === tab.id
                        ? "bg-[var(--text-main)] text-white shadow-[0_8px_20px_rgba(31,27,23,0.2)]"
                        : "border border-[var(--card-border)] bg-white/80 text-[var(--nav-text)] hover:-translate-y-0.5 hover:bg-white"
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
                    style={{ background: `linear-gradient(to right, ${promoBgColorState}, ${promoColorStars}, ${promoBgColorState})` }}
                  >
                    <span className="animate-pulse" style={{ color: promoColorStars }}>✦</span>
                    <span style={{ color: promoTextColor }}>
                      {settings?.promo_text?.trim() || "Aperçu du texte du bandeau"}
                    </span>
                    <span className="animate-pulse" style={{ color: promoColorStars, animationDelay: "0.75s" }}>✦</span>
                  </div>

                  {/* Couleur du bandeau */}
                  <div className="border-t border-[var(--card-border)] bg-white">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 p-3 text-left"
                      onClick={() => setOpenColorPicker(openColorPicker === "promo-bg" ? null : "promo-bg")}
                    >
                      <div className="h-7 w-7 shrink-0 rounded-lg border border-[var(--card-border)] shadow-sm" style={{ backgroundColor: promoBgColorState }} />
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
                              <div className="flex gap-1">
                                {family.colors.map((c) => (
                                  <button key={c} type="button" onClick={() => setPromoBgColorState(c)} title={c}
                                    className={`h-4 w-4 rounded transition-transform ${promoBgColorState === c ? "scale-125 ring-2 ring-[#1f1b17] ring-offset-1" : "hover:scale-110"}`}
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
                      <div className="h-7 w-7 shrink-0 rounded-lg border border-[var(--card-border)] shadow-sm" style={{ backgroundColor: promoColorStars }} />
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
                              <div className="flex gap-1">
                                {family.colors.map((c) => (
                                  <button key={c} type="button" onClick={() => setPromoColorStars(c)} title={c}
                                    className={`h-4 w-4 rounded transition-transform ${promoColorStars === c ? "scale-125 ring-2 ring-[#1f1b17] ring-offset-1" : "hover:scale-110"}`}
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
                      <div className="h-7 w-7 shrink-0 rounded-lg border border-[var(--card-border)] shadow-sm" style={{ backgroundColor: promoTextColor }} />
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
                              <div className="flex gap-1">
                                {family.colors.map((c) => (
                                  <button key={c} type="button" onClick={() => setPromoTextColor(c)} title={c}
                                    className={`h-4 w-4 rounded transition-transform ${promoTextColor === c ? "scale-125 ring-2 ring-[#1f1b17] ring-offset-1" : "hover:scale-110"}`}
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

                        <div className="grid gap-2">
                          <label className="text-sm font-semibold text-[var(--nav-text)]">
                            Expéditeur SMS
                          </label>
                          <input
                            type="text"
                            maxLength={11}
                            value={settings.sms_sender ?? "BoucleDor"}
                            onChange={(e) => setSettings({ ...settings, sms_sender: e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 11) })}
                            className={fieldClass}
                          />
                          <span className="text-xs font-normal text-[var(--nav-text)] opacity-60">11 caractères maximum, sans espace ni apostrophe (limite opérateurs)</span>
                        </div>
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
                          <div key={openKey} className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 transition ${isOpen ? "border-[#E8C9AD] bg-[#FFF6EE]" : "border-[var(--card-border)] bg-[#fffdf9]"}`}>
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
                  <div className="rounded-2xl border border-dashed border-[#D8CBBB] bg-[#fffdf9] px-6 py-8 text-center text-[var(--nav-text)]">
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
                    <div className="mb-6 rounded-3xl border border-[var(--card-border)] bg-[#fffdf9] p-5">
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
                                  border: isSelected ? "3px solid #111111" : "1px solid #d6d3d1",
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
                        className="mt-5 w-full rounded-2xl bg-[var(--text-main)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
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
                        <div key={category.id} className="rounded-2xl border border-[var(--card-border)] bg-[#fffdf9] p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveCategory(index, -1)}
                                className="flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--card-border)] bg-white text-xs text-[var(--nav-text)] transition hover:border-[#b98b3d] disabled:cursor-not-allowed disabled:opacity-30"
                                title="Monter"
                              >▲</button>
                              <button
                                type="button"
                                disabled={index === categories.length - 1}
                                onClick={() => handleMoveCategory(index, 1)}
                                className="flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--card-border)] bg-white text-xs text-[var(--nav-text)] transition hover:border-[#b98b3d] disabled:cursor-not-allowed disabled:opacity-30"
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
                                    border: isSelected ? "3px solid #111111" : "1px solid #d6d3d1",
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
                                <div key={dow} className={`rounded-2xl border px-3 py-2 transition ${!salonDayOpen ? "border-dashed border-[#e0d8cf] bg-[#f8f5f1] opacity-60" : sched.is_open ? "border-[var(--card-border)] bg-white" : "border-[var(--card-border)] bg-[#faf8f5]"}`}>
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
                                            className="rounded-xl border border-[var(--card-border)] bg-[#faf8f5] px-2 py-1 text-xs text-[var(--text-main)] outline-none focus:border-[var(--gold)]" />
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
                                            className="rounded-xl border border-[var(--card-border)] bg-[#faf8f5] px-2 py-1 text-xs text-[var(--text-main)] outline-none focus:border-[var(--gold)]" />
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
                                              className="rounded-xl border border-[var(--card-border)] bg-[#fff8ee] px-2 py-1 text-xs text-[var(--text-main)] outline-none focus:border-[var(--gold)]" />
                                            <span className="text-xs text-[#a09890]">à</span>
                                            <input type="time"
                                              suppressHydrationWarning
                                              defaultValue={(sched.break_end ?? "14:00").slice(0,5)}
                                              min={sched.opening_time.slice(0,5)} max={sched.closing_time.slice(0,5)}
                                              onBlur={(e) => { if (e.target.value) handleUpdateSchedule(sched.id, { break_end: e.target.value }); }}
                                              className="rounded-xl border border-[var(--card-border)] bg-[#fff8ee] px-2 py-1 text-xs text-[var(--text-main)] outline-none focus:border-[var(--gold)]" />
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
                                    className={`h-7 w-7 rounded-lg border-2 transition ${isSelected ? "border-[#1f1b17] scale-110" : takenByOther ? "cursor-not-allowed opacity-30" : "border-transparent hover:scale-105"}`}
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
                  <div className="mt-4 rounded-2xl border border-[var(--card-border)] bg-[#fffdf9] p-4">
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
                              className={`h-7 w-7 rounded-lg border-2 transition ${newStaffColor === c ? "border-[#1f1b17] scale-110" : taken ? "cursor-not-allowed opacity-30" : "border-transparent hover:scale-105"}`}
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
                    <div className="mb-6 rounded-3xl border border-[var(--card-border)] bg-[#fffdf9] p-5">
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
                            className="rounded-2xl border bg-[#fffdf9] p-4 shadow-sm transition-colors"
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
                      <div key={q.id} className="rounded-2xl border border-[var(--card-border)] bg-[#fffdf9] p-4">
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

                <div className="mt-6 rounded-3xl border border-[var(--card-border)] bg-[#fffdf9] p-5">
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

              {activeTab === "apparence" && (
              <div className={cardClass + " p-5 md:p-7"}>
                <div className="mb-6 flex items-center gap-2 text-sm font-bold text-[var(--gold)]">
                  <span className="text-xl">🎨</span>
                  Apparence
                </div>
                <h2 className="mb-6 text-2xl font-black tracking-tight">Personnalisation du site</h2>

                <div className="grid gap-6">
                  {/* Nom du salon */}
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
                          placeholder="Boucle d'Or"
                          className={fieldClass}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-[var(--nav-text)]">
                        Sous-titre
                        <input
                          type="text"
                          value={appearanceSalonSubtitle}
                          onChange={(e) => setAppearanceSalonSubtitle(e.target.value)}
                          placeholder="Salon de coiffure"
                          className={fieldClass}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Couleurs */}
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
                        {savingAppearance ? "Enregistrement..." : "Enregistrer les couleurs"}
                      </button>
                    </div>

                    <div className="grid gap-3">
                      {(
                        [
                          { key: "titles", label: "Couleur principale", desc: "Titres, badges, prix et dégradé des grands titres", value: appearanceTitles, setter: setAppearanceTitles },
                          { key: "accents", label: "Couleur secondaire", desc: "Boutons CTA et accents décoratifs", value: appearanceAccents, setter: setAppearanceAccents },
                          { key: "contact", label: "Fond fenêtre", desc: "Section contact, carte hero et début du dégradé des titres", value: appearanceContactBg, setter: setAppearanceContactBg },
                          { key: "pagebg", label: "Fond de page", desc: "Fond de page, header, footer et bordures des cartes", value: appearancePageBg, setter: setAppearancePageBg },
                          { key: "textmain", label: "Texte principal", desc: "Titres, noms, liens de navigation", value: appearanceTextMain, setter: setAppearanceTextMain },
                          { key: "textsecondary", label: "Texte secondaire", desc: "Descriptions, avis, adresse, texte du footer", value: appearanceTextSecondary, setter: setAppearanceTextSecondary },
                        ] as { key: string; label: string; desc: string; value: string; setter: (v: string) => void }[]
                      ).map(({ key, label, desc, value, setter }) => (
                        <div key={key} className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-white">
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 p-4 text-left"
                            onClick={() => setOpenColorPicker(openColorPicker === key ? null : key)}
                          >
                            <div className="h-9 w-9 shrink-0 rounded-xl border border-[var(--card-border)] shadow-sm" style={{ backgroundColor: value }} />
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
                                    <div className="flex gap-1">
                                      {family.colors.map((c) => (
                                        <button
                                          key={c}
                                          type="button"
                                          onClick={() => setter(c)}
                                          title={c}
                                          className={`h-5 w-5 rounded transition-transform ${value === c ? "scale-125 ring-2 ring-[#1f1b17] ring-offset-1" : "hover:scale-110"}`}
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

                  {/* Carte hero */}
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
                          placeholder="L'élégance au naturel"
                          className={fieldClass}
                        />
                      </label>
                      <label className="grid gap-1.5 text-sm font-semibold text-[var(--nav-text)]">
                        Description
                        <textarea
                          value={appearanceHeroDescription}
                          rows={3}
                          onChange={(e) => setAppearanceHeroDescription(e.target.value)}
                          placeholder={`${settings?.salon_name || "Boucle d'Or"}, votre salon de coiffure à taille humaine à Rognac. Écoute, conseil et savoir-faire pour sublimer vos cheveux.`}
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

                  {/* Logo */}
                  <div className={panelClass + " p-5"}>
                    <div className="mb-5">
                      <div className="text-lg font-black">Logo</div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="overflow-hidden rounded-[22px] border shadow-sm shrink-0" style={{ borderColor: colorCardBorder, backgroundColor: colorPageBg }}>
                        <img
                          src={settings?.logo_image_url || "/icon-192.png"}
                          alt="Logo actuel"
                          className="h-24 w-24 object-cover"
                        />
                      </div>
                      <label className={`block cursor-pointer rounded-2xl border border-[var(--card-border)] bg-[#fffdf9] px-5 py-3 text-sm font-semibold text-[var(--nav-text)] transition hover:bg-white ${uploadingLogo ? "opacity-50 pointer-events-none" : ""}`}>
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
                    </div>
                  </div>

                  {/* Logo Pro */}
                  <div className={panelClass + " p-5"}>
                    <div className="mb-5">
                      <div className="text-lg font-black">Logo Pro</div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="overflow-hidden rounded-[22px] border shadow-sm shrink-0" style={{ borderColor: colorCardBorder, backgroundColor: colorPageBg }}>
                        <img
                          src={settings?.logo_pro_image_url || "/logo-pro.png"}
                          alt="Logo Pro actuel"
                          className="h-24 w-24 object-cover"
                        />
                      </div>
                      <label className={`block cursor-pointer rounded-2xl border border-[var(--card-border)] bg-[#fffdf9] px-5 py-3 text-sm font-semibold text-[var(--nav-text)] transition hover:bg-white ${uploadingLogoPro ? "opacity-50 pointer-events-none" : ""}`}>
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
                    </div>
                  </div>

                  {/* Photos */}
                  <div className={panelClass + " p-5"}>
                    <div className="mb-5">
                      <div className="text-lg font-black">Photos</div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      {/* Photo hero */}
                      <div className="rounded-2xl border border-[var(--card-border)] bg-white p-4">
                        <div className="mb-3 text-sm font-semibold text-[var(--nav-text)]">Photo principale (hero)</div>
                        <div className="mb-3 overflow-hidden rounded-xl border" style={{ borderColor: colorCardBorder, backgroundColor: colorPageBg }}>
                          <img
                            src={settings?.hero_image_url || "/images/hero-salon.jpg"}
                            alt="Photo hero actuelle"
                            className="h-40 w-full object-cover"
                          />
                        </div>
                        <label className={`block cursor-pointer rounded-2xl border border-[var(--card-border)] bg-[#fffdf9] px-4 py-3 text-center text-sm font-semibold text-[var(--nav-text)] transition hover:bg-white ${uploadingHero ? "opacity-50 pointer-events-none" : ""}`}>
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
                      </div>

                      {/* Photo à propos */}
                      <div className="rounded-2xl border border-[var(--card-border)] bg-white p-4">
                        <div className="mb-3 text-sm font-semibold text-[var(--nav-text)]">Photo "À propos"</div>
                        <div className="mb-3 overflow-hidden rounded-xl border" style={{ borderColor: colorCardBorder, backgroundColor: colorPageBg }}>
                          <img
                            src={settings?.apropos_image_url || "/images/apropos-salon.jpg"}
                            alt="Photo à propos actuelle"
                            className="h-40 w-full object-cover"
                          />
                        </div>
                        <label className={`block cursor-pointer rounded-2xl border border-[var(--card-border)] bg-[#fffdf9] px-4 py-3 text-center text-sm font-semibold text-[var(--nav-text)] transition hover:bg-white ${uploadingApropos ? "opacity-50 pointer-events-none" : ""}`}>
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
                      </div>
                    </div>
                  </div>

                  {/* Prestations */}
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
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* À propos */}
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
                          placeholder="un salon à taille humaine"
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

                  {/* Avis */}
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
                </div>
              </div>
              )}
              </div>
            </div>
          )}
      </section>
    </main>
  );
}
