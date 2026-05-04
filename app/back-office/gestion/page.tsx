"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
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

const cardClass = "rounded-[30px] border border-[#eadfce]/90 bg-white/75 shadow-[0_18px_45px_rgba(80,55,25,0.07)] backdrop-blur";
const panelClass = "rounded-[26px] border border-[#eadfce] bg-[#fffdf9] shadow-sm";
const fieldClass = "rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-[#1f1b17] outline-none transition focus:border-[var(--gold)]";
const primaryButtonClass = "rounded-2xl bg-[#1f1b17] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(31,27,23,0.16)] transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50";
const dangerButtonClass = "rounded-xl border border-[#f0d5cd] bg-[#fff5f2] px-4 py-2 text-sm font-bold text-[#a33a3a] transition hover:bg-white disabled:opacity-50";
const secondaryButtonClass = "rounded-2xl border border-[#eadfce] bg-white/80 px-4 py-3 text-sm font-semibold text-[#4d453d] shadow-sm transition hover:-translate-y-0.5 hover:bg-white";

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

  const [closures, setClosures] = useState<ClosureRow[]>([]);
  const [newClosureDate, setNewClosureDate] = useState("");
  const [newClosureAllDay, setNewClosureAllDay] = useState(false);
  const [newClosureStartTime, setNewClosureStartTime] = useState("09:00");
  const [newClosureEndTime, setNewClosureEndTime] = useState("18:00");
  const [newClosureReason, setNewClosureReason] = useState("");
  const [savingClosure, setSavingClosure] = useState(false);
  const [deletingClosureId, setDeletingClosureId] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(COLOR_OPTIONS[0]);
  const [savingCategory, setSavingCategory] = useState(false);
  const [updatingCategoryId, setUpdatingCategoryId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<string | null>(null);

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
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

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [staffSchedules, setStaffSchedules] = useState<StaffSchedule[]>([]);
  const [newStaffFirstName, setNewStaffFirstName] = useState("");
  const [newStaffLastName, setNewStaffLastName] = useState("");
  const [newStaffColor, setNewStaffColor] = useState("#EADCCB");
  const [savingStaff, setSavingStaff] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);
  const [confirmDeleteStaffId, setConfirmDeleteStaffId] = useState<string | null>(null);
  const [updatingStaffId, setUpdatingStaffId] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = selectedClient ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedClient]);

  useEffect(() => {
    loadGestionData();
  }, []);

  const loadGestionData = async () => {
    try {
      setLoading(true);
      setStatusMessage("");

      const [settingsRes, closuresRes, categoriesRes, servicesRes, clientsRes, staffRes, schedulesRes] = await Promise.all([
        supabase.from("salon_settings").select("*").limit(1).maybeSingle(),
        supabase.from("exception_closures").select("*").order("closure_date", { ascending: true }),
        supabase.from("categories").select("id, name, color").order("name", { ascending: true }),
        supabase
          .from("services")
          .select("id, name, duration_minutes, price_cents, category_id, display_order, is_visible, duration_before_break, break_duration, duration_after_break, categories(name, color)")
          .order("display_order", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("clients")
          .select("id, first_name, last_name, phone, email, notes")
          .order("last_name", { ascending: true })
          .order("first_name", { ascending: true }),
        supabase.from("staff").select("id, first_name, last_name, color, is_active").order("last_name", { ascending: true }),
        supabase.from("staff_schedules").select("*").order("day_of_week", { ascending: true }),
      ]);

      if (settingsRes.error) throw new Error(settingsRes.error.message);
      if (closuresRes.error) throw new Error(closuresRes.error.message);
      if (categoriesRes.error) throw new Error(categoriesRes.error.message);
      if (servicesRes.error) throw new Error(servicesRes.error.message);
      if (clientsRes.error) throw new Error(clientsRes.error.message);
      if (staffRes.error) throw new Error(staffRes.error.message);
      if (schedulesRes.error) throw new Error(schedulesRes.error.message);

      setSettings((settingsRes.data ?? null) as SalonSettings | null);
      setClosures((closuresRes.data ?? []) as ClosureRow[]);
      setCategories((categoriesRes.data ?? []) as CategoryRow[]);
      setServices((servicesRes.data ?? []) as unknown as ServiceRow[]);
      setClients((clientsRes.data ?? []) as ClientRow[]);
      setStaff((staffRes.data ?? []) as StaffRow[]);
      setStaffSchedules((schedulesRes.data ?? []) as StaffSchedule[]);
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
      const { data, error } = await supabase
        .from("salon_settings")
        .update({
          phone: settings.phone ?? null,
          address: settings.address ?? null,
          opening_time: settings.opening_time,
          closing_time: settings.closing_time,
          is_open_monday: settings.is_open_monday,
          is_open_tuesday: settings.is_open_tuesday,
          is_open_wednesday: settings.is_open_wednesday,
          is_open_thursday: settings.is_open_thursday,
          is_open_friday: settings.is_open_friday,
          is_open_saturday: settings.is_open_saturday,
          is_open_sunday: settings.is_open_sunday,
        })
        .eq("id", settings.id)
        .select("*")
        .single();
      if (error) throw new Error((error as Error).message);
      setSettings(data as SalonSettings);
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
      const { error } = await supabase.from("exception_closures").delete().eq("id", id);
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
      const { error } = await supabase.from("categories").insert({ name, color: newCategoryColor });
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

  const handleUpdateCategory = async (id: string, values: Partial<Pick<CategoryRow, "name" | "color">>) => {
    try {
      setUpdatingCategoryId(id);
      setStatusMessage("");
      const { error } = await supabase.from("categories").update(values).eq("id", id);
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
      const { error } = await supabase.from("categories").delete().eq("id", id);
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
      const { error } = await supabase.from("services").update(cleanValues).eq("id", id);
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
      const { error } = await supabase.from("services").delete().eq("id", id);
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
        first_name: first, last_name: last, color: newStaffColor, is_active: true,
      }).select("id").single();
      if (error) throw new Error(error.message);

      // Créer les 7 schedules par défaut (lun-ven ouverts, sam-dim fermés)
      const salonOpen = settings?.opening_time?.slice(0,5) ?? "09:00";
      const salonClose = settings?.closing_time?.slice(0,5) ?? "19:00";
      const defaultSchedules = [0,1,2,3,4,5,6].map((day) => ({
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
      setStatusMessage("Coiffeuse ajoutée ✅");
      await loadGestionData();
    } catch (err: unknown) {
      setStatusMessage(`Erreur : ${(err as Error).message}`);
    } finally { setSavingStaff(false); }
  };

  const handleUpdateStaff = async (id: string, values: Partial<StaffRow>) => {
    try {
      setUpdatingStaffId(id);
      const { error } = await supabase.from("staff").update(values).eq("id", id);
      if (error) throw new Error(error.message);
      setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...values } : s)));
    } catch (err: unknown) {
      setStatusMessage(`Erreur : ${(err as Error).message}`);
    } finally { setUpdatingStaffId(null); }
  };

  const handleUpdateSchedule = async (scheduleId: string, values: Partial<StaffSchedule>) => {
    try {
      const { error } = await supabase.from("staff_schedules").update(values).eq("id", scheduleId);
      if (error) throw new Error(error.message);
      setStaffSchedules((prev) => prev.map((s) => (s.id === scheduleId ? { ...s, ...values } : s)));
    } catch (err: unknown) {
      setStatusMessage(`Erreur : ${(err as Error).message}`);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      setDeletingStaffId(id);
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (error) throw new Error(error.message);
      setStaff((prev) => prev.filter((s) => s.id !== id));
      setConfirmDeleteStaffId(null);
      setStatusMessage("Coiffeuse supprimée ✅");
    } catch (err: unknown) {
      setStatusMessage(`Erreur : ${(err as Error).message}`);
    } finally { setDeletingStaffId(null); }
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
      setEditPhone(client.phone);
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
        .eq("id", selectedClient.id);

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

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;

    return clients.filter((client) => {
      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
      const reverseName = `${client.last_name} ${client.first_name}`.toLowerCase();
      const phone = client.phone.toLowerCase();
      const email = (client.email ?? "").toLowerCase();

      return (
        fullName.includes(term) ||
        reverseName.includes(term) ||
        phone.includes(term) ||
        email.includes(term)
      );
    });
  }, [clients, search]);

  const TABS = [
    { id: "salon",       label: "Salon",       icon: "🏪" },
    { id: "fermetures",  label: "Fermetures",  icon: "📆" },
    { id: "categories",  label: "Catégories",  icon: "🏷️" },
    { id: "prestations", label: "Prestations", icon: "✂️" },
    { id: "equipe",      label: "Équipe",      icon: "💇" },
  ] as const;
  type TabId = typeof TABS[number]["id"];
  const [activeTab, setActiveTab] = useState<TabId>("salon");

  const salonTabContent = settings ? (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
          Téléphone du salon
          <input type="text" value={settings.phone ?? ""} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} className={fieldClass} />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
          Heure d'ouverture
          <input type="time" value={settings.opening_time?.slice(0, 5)} onChange={(e) => setSettings({ ...settings, opening_time: e.target.value })} className={fieldClass} />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
          Heure de fermeture
          <input type="time" value={settings.closing_time?.slice(0, 5)} onChange={(e) => setSettings({ ...settings, closing_time: e.target.value })} className={fieldClass} />
        </label>
      </div>
      <div className="mt-4">
        <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
          Adresse du salon
          <input type="text" placeholder="12 rue des Fleurs, 13000 Marseille" value={settings.address ?? ""} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className={fieldClass} />
        </label>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-4 xl:grid-cols-7">
        {([
          ["Lundi", "is_open_monday"],
          ["Mardi", "is_open_tuesday"],
          ["Mercredi", "is_open_wednesday"],
          ["Jeudi", "is_open_thursday"],
          ["Vendredi", "is_open_friday"],
          ["Samedi", "is_open_saturday"],
          ["Dimanche", "is_open_sunday"],
        ] as [string, keyof SalonSettings][]).map(([label, key]) => (
          <label key={key} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${settings[key] ? "border-[#E8C9AD] bg-[#FFF6EE] text-[var(--gold)]" : "border-[#eadfce] bg-[#fffdf9] text-[#6f6254]"}`}>
            <span>{label}</span>
            <input type="checkbox" checked={Boolean(settings[key])} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked } as SalonSettings)} />
          </label>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button type="button" onClick={handleSaveSettings} disabled={savingSettings} className={primaryButtonClass}>
          {savingSettings ? "Enregistrement..." : "Enregistrer les réglages"}
        </button>
      </div>
    </>
  ) : (
    <div className="rounded-2xl border border-dashed border-[#D8CBBB] bg-[#fffdf9] px-6 py-8 text-center text-[#6f6254]">
      Aucune ligne trouvée dans <strong>salon_settings</strong>.
    </div>
  );

  const fermeturesTabContent = (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <div className={panelClass + " p-5"}>
        <div className="mb-4 text-lg font-black">Ajouter une fermeture</div>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
            Date
            <input type="date" value={newClosureDate} onChange={(e) => setNewClosureDate(e.target.value)} className={fieldClass} />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm font-semibold">
            <span>Journée entière</span>
            <input type="checkbox" checked={newClosureAllDay} onChange={(e) => setNewClosureAllDay(e.target.checked)} />
          </label>
          {!newClosureAllDay && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
                Début
                <input type="time" value={newClosureStartTime} onChange={(e) => setNewClosureStartTime(e.target.value)} className={fieldClass} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
                Fin
                <input type="time" value={newClosureEndTime} onChange={(e) => setNewClosureEndTime(e.target.value)} className={fieldClass} />
              </label>
            </div>
          )}
          <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
            Motif
            <input type="text" value={newClosureReason} onChange={(e) => setNewClosureReason(e.target.value)} placeholder="Formation, fermeture exceptionnelle, congé..." className={fieldClass} />
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={handleCreateClosure} disabled={savingClosure} className={primaryButtonClass}>
            {savingClosure ? "Ajout..." : "Ajouter la fermeture"}
          </button>
        </div>
      </div>
      <div className={panelClass + " p-5"}>
        <div className="mb-4 text-lg font-black">Fermetures enregistrées</div>
        <div className="grid gap-3">
          {closures.filter((c) => {
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            return c.closure_date >= today;
          }).length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#dccdbb] bg-white/70 px-4 py-5 text-sm text-[#6f6254]">
              Aucune fermeture exceptionnelle.
            </div>
          ) : closures.filter((c) => {
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            return c.closure_date >= today;
          }).map((closure) => (
            <div key={closure.id} className="rounded-2xl border border-[#eadfce] bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-black">{formatFrenchDate(closure.closure_date)}</div>
                  <div className="mt-1 text-sm text-[#6f6254]">
                    {closure.is_all_day ? "Fermé toute la journée" : `Fermé de ${formatTime(closure.start_time)} à ${formatTime(closure.end_time)}`}
                  </div>
                  {closure.reason && <div className="mt-1 text-sm text-[#6f6254]">Motif : {closure.reason}</div>}
                </div>
                <button type="button" onClick={() => handleDeleteClosure(closure.id)} disabled={deletingClosureId === closure.id} className={dangerButtonClass}>
                  {deletingClosureId === closure.id ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const categoriesTabContent = (
    <div className="grid gap-3">
      {categories.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[#dccdbb] bg-white/70 px-4 py-5 text-sm text-[#6f6254]">Aucune catégorie.</div>
      ) : categories.map((category) => (
        <div key={category.id} className="rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4">
          <input
            type="text"
            defaultValue={category.name}
            onBlur={(e) => { if (e.target.value !== category.name) handleUpdateCategory(category.id, { name: e.target.value }); }}
            className="w-full rounded-2xl border border-[#eadfce] bg-white px-4 py-3 font-semibold outline-none transition focus:border-[var(--gold)]"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((color) => {
              const isSelected = (category.color ?? "#EADCCB") === color;
              const isUsed = categories.some((c) => c.id !== category.id && c.color === color);
              return (
                <button key={color} type="button" disabled={isUsed}
                  onClick={() => { if ((category.color ?? "#EADCCB") !== color && !isUsed) handleUpdateCategory(category.id, { color }); }}
                  className="h-8 w-8 rounded-full transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30"
                  style={{ backgroundColor: color, border: isSelected ? "3px solid #111111" : "1px solid #d6d3d1" }}
                  title={isUsed ? "Couleur déjà utilisée" : color}
                />
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-[#6f6254]">{updatingCategoryId === category.id ? "Enregistrement..." : " "}</div>
            {confirmDeleteCategoryId === category.id ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => { handleDeleteCategory(category.id); setConfirmDeleteCategoryId(null); }} disabled={deletingCategoryId === category.id} className={dangerButtonClass}>
                  {deletingCategoryId === category.id ? "Suppression..." : "Confirmer"}
                </button>
                <button type="button" onClick={() => setConfirmDeleteCategoryId(null)} className="rounded-2xl border border-[#eadfce] bg-white px-4 py-2 text-sm font-semibold text-[#6f6254] transition hover:bg-white/70">Annuler</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDeleteCategoryId(category.id)} className={dangerButtonClass}>Supprimer</button>
            )}
          </div>
        </div>
      ))}
      <div className="mt-2 rounded-3xl border border-[#eadfce] bg-[#fffdf9] p-5">
        <div className="mb-4 text-lg font-black">Ajouter une catégorie</div>
        <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
          Nouvelle catégorie
          <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Ex : Femme" className={fieldClass} />
        </label>
        <div className="mt-4 grid gap-2 text-sm font-semibold text-[#6f6254]">
          <span>Couleur</span>
          <div className="flex flex-wrap gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 py-3">
            {COLOR_OPTIONS.map((color) => {
              const isSelected = newCategoryColor === color;
              const isUsed = categories.some((c) => c.color === color);
              return (
                <button key={color} type="button" disabled={isUsed}
                  onClick={() => { if (!isUsed) setNewCategoryColor(color); }}
                  className="h-8 w-8 rounded-full transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30"
                  style={{ backgroundColor: color, border: isSelected ? "3px solid #111111" : "1px solid #d6d3d1" }}
                  title={isUsed ? "Couleur déjà utilisée" : color}
                />
              );
            })}
          </div>
        </div>
        <button type="button" onClick={handleCreateCategory} disabled={savingCategory} className="mt-5 w-full rounded-2xl bg-[#1f1b17] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50">
          {savingCategory ? "Ajout..." : "Ajouter la catégorie"}
        </button>
      </div>
    </div>
  );

  const prestationsTabContent = (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setSelectedCategory("all")} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${selectedCategory === "all" ? "bg-[#1f1b17] text-white" : "border border-[#eadfce] bg-white text-[#4d453d]"}`}>
          Toutes
        </button>
        {categories.map((cat) => (
          <button key={cat.id} type="button" onClick={() => setSelectedCategory(cat.id)}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${selectedCategory === cat.id ? "bg-[#1f1b17] text-white" : "border border-[#eadfce] bg-white text-[#4d453d]"}`}
            style={selectedCategory === cat.id ? {} : { borderColor: cat.color ?? undefined }}>
            {cat.name}
          </button>
        ))}
      </div>

      {services.filter((s) => selectedCategory === "all" || s.category_id === selectedCategory).length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[#dccdbb] bg-white/70 px-4 py-8 text-center text-sm text-[#6f6254]">Aucune prestation.</div>
      ) : services.filter((s) => selectedCategory === "all" || s.category_id === selectedCategory).map((service) => {
        const before = service.duration_before_break ?? service.duration_minutes;
        const pause = service.break_duration ?? 0;
        const after = service.duration_after_break ?? 0;
        return (
          <div key={service.id} className={panelClass + " p-4"}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: service.categories?.color ?? "#EADCCB" }} />
                <span className="font-semibold">{service.name}</span>
                <span className="rounded-full border border-[#eadfce] bg-white px-3 py-1 text-xs text-[#6f6254]">
                  {before > 0 && `${before}min`}{pause > 0 && ` + ${pause}min + ${after}min`} · {formatPrice(service.price_cents)}
                </span>
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-[#eadfce] bg-white px-3 py-1.5 text-xs font-semibold cursor-pointer">
                <input type="checkbox" checked={service.is_visible} onChange={(e) => handleUpdateService(service.id, { is_visible: e.target.checked })} />
                Visible
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2 text-sm font-semibold text-[#6f6254] xl:col-span-2">
                Nom
                <input type="text" defaultValue={service.name} onBlur={(e) => { if (e.target.value !== service.name) handleUpdateService(service.id, { name: e.target.value }); }} className={fieldClass} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
                Temps 1 (min)
                <input type="number" defaultValue={before} onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== before) handleUpdateService(service.id, { duration_before_break: v }); }} className={fieldClass} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
                Pause (min)
                <input type="number" defaultValue={pause} onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== pause) handleUpdateService(service.id, { break_duration: v }); }} className={fieldClass} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
                Temps 2 (min)
                <input type="number" defaultValue={after} onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== after) handleUpdateService(service.id, { duration_after_break: v }); }} className={fieldClass} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
                Tarif €
                <input type="text" defaultValue={(service.price_cents / 100).toFixed(2)} onBlur={(e) => { const value = normalizePriceToCents(e.target.value); if (value !== service.price_cents) handleUpdateService(service.id, { price_cents: value }); }} className={fieldClass} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
                Ordre
                <input type="number" defaultValue={service.display_order} onBlur={(e) => { const value = Number(e.target.value) || 0; if (value !== service.display_order) handleUpdateService(service.id, { display_order: value }); }} className={fieldClass} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
                Catégorie
                <select defaultValue={service.category_id ?? ""} onChange={(e) => handleUpdateService(service.id, { category_id: e.target.value || null })} className={fieldClass}>
                  <option value="">Sans catégorie</option>
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              {confirmDeleteServiceId === service.id ? (
                <>
                  <button type="button" onClick={() => { handleDeleteService(service.id); setConfirmDeleteServiceId(null); }} disabled={deletingServiceId === service.id} className={dangerButtonClass}>
                    {deletingServiceId === service.id ? "Suppression..." : "Confirmer"}
                  </button>
                  <button type="button" onClick={() => setConfirmDeleteServiceId(null)} className="rounded-2xl border border-[#eadfce] bg-white px-4 py-2 text-sm font-semibold text-[#6f6254] transition hover:bg-white/70">Annuler</button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmDeleteServiceId(service.id)} className={dangerButtonClass}>Supprimer</button>
              )}
            </div>
            {updatingServiceId === service.id && <div className="mt-3 text-sm text-[#6f6254]">Enregistrement...</div>}
          </div>
        );
      })}

      <div className="mt-2 rounded-3xl border border-[#eadfce] bg-[#fffdf9] p-5">
        <div className="mb-4 text-lg font-black">Ajouter une prestation</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-semibold text-[#6f6254] xl:col-span-2">
            Nom
            <input type="text" value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} className={fieldClass} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
            Temps 1
            <input type="number" min={0} value={newServiceBeforeBreak} onChange={(e) => setNewServiceBeforeBreak(e.target.value)} className={fieldClass} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
            Pause
            <input type="number" min={0} value={newServiceBreakDuration} onChange={(e) => setNewServiceBreakDuration(e.target.value)} className={fieldClass} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
            Temps 2
            <input type="number" min={0} value={newServiceAfterBreak} onChange={(e) => setNewServiceAfterBreak(e.target.value)} className={fieldClass} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
            Tarif €
            <input type="text" value={newServicePrice} onChange={(e) => setNewServicePrice(e.target.value)} className={fieldClass} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
            Catégorie
            <select value={newServiceCategoryId} onChange={(e) => setNewServiceCategoryId(e.target.value)} className={fieldClass}>
              <option value="">Sans catégorie</option>
              {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[#6f6254]">
            Ordre d'affichage
            <input type="number" value={newServiceOrder} onChange={(e) => setNewServiceOrder(e.target.value)} className={fieldClass} />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm font-semibold">
            <span>Visible sur le site</span>
            <input type="checkbox" checked={newServiceVisible} onChange={(e) => setNewServiceVisible(e.target.checked)} />
          </label>
        </div>
        <div className="mt-4 rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm font-semibold text-[#6f6254]">
          Durée totale : {getTotalDuration(Math.max(0, Number(newServiceBeforeBreak) || 0), Math.max(0, Number(newServiceBreakDuration) || 0), Math.max(0, Number(newServiceAfterBreak) || 0))} min
        </div>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={handleCreateService} disabled={savingService} className={primaryButtonClass}>
            {savingService ? "Ajout..." : "Ajouter la prestation"}
          </button>
        </div>
      </div>
    </div>
  </div>
  );

  const equipeTabContent = (
    <div className="space-y-6">
      {staff.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[#dccdbb] bg-white/70 px-4 py-8 text-center text-sm text-[#6f6254]">Aucune coiffeuse enregistrée.</div>
      ) : staff.map((member) => {
        const usedColors = staff.filter((s) => s.id !== member.id).map((s) => s.color);
        const memberSchedules = staffSchedules.filter((s) => s.staff_id === member.id);
        const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
        const SALON_DAY_KEYS: (keyof SalonSettings)[] = ["is_open_sunday","is_open_monday","is_open_tuesday","is_open_wednesday","is_open_thursday","is_open_friday","is_open_saturday"];
        const salonOpen = settings?.opening_time?.slice(0,5) ?? "00:00";
        const salonClose = settings?.closing_time?.slice(0,5) ?? "23:59";
        return (
          <div key={member.id} className={panelClass + " p-4"}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 shrink-0 rounded-xl border border-[#eadfce]" style={{ backgroundColor: member.color }} />
                <div className="font-bold">{member.first_name} {member.last_name}</div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 rounded-xl border border-[#eadfce] bg-white px-3 py-1.5 text-xs font-semibold cursor-pointer">
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
            <div className="grid gap-2">
              {[1,2,3,4,5,6,0].map((dow) => {
                const sched = memberSchedules.find((s) => s.day_of_week === dow);
                if (!sched) return null;
                const salonDayOpen = settings ? (settings[SALON_DAY_KEYS[dow]] as boolean) : true;
                return (
                  <div key={dow} className={`rounded-2xl border px-3 py-2 transition ${!salonDayOpen ? "border-dashed border-[#e0d8cf] bg-[#f8f5f1] opacity-60" : sched.is_open ? "border-[#eadfce] bg-white" : "border-[#eadfce] bg-[#faf8f5]"}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 w-24 shrink-0">
                        <button type="button" disabled={!salonDayOpen}
                          onClick={() => { if (salonDayOpen) handleUpdateSchedule(sched.id, { is_open: !sched.is_open }); }}
                          className={`h-5 w-9 rounded-full transition-colors ${sched.is_open && salonDayOpen ? "bg-[#1f1b17]" : "bg-[#d8d0c8]"}`}>
                          <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${sched.is_open && salonDayOpen ? "translate-x-4" : "translate-x-0"}`} />
                        </button>
                        <span className={`text-xs font-bold ${sched.is_open && salonDayOpen ? "text-[#1f1b17]" : "text-[#a09890]"}`}>{DAY_LABELS[dow]}</span>
                      </div>
                      {sched.is_open && salonDayOpen && (
                        <>
                          <div className="flex items-center gap-1.5">
                            <input type="time" suppressHydrationWarning defaultValue={sched.opening_time.slice(0,5)} min={salonOpen} max={salonClose}
                              onBlur={(e) => { if (!e.target.value) return; const v = e.target.value; const c = v < salonOpen ? salonOpen : v > salonClose ? salonClose : v; handleUpdateSchedule(sched.id, { opening_time: c }); }}
                              className="rounded-xl border border-[#eadfce] bg-[#faf8f5] px-2 py-1 text-xs text-[#1f1b17] outline-none focus:border-[var(--gold)]" />
                            <span className="text-xs text-[#a09890]">→</span>
                            <input type="time" suppressHydrationWarning defaultValue={sched.closing_time.slice(0,5)} min={salonOpen} max={salonClose}
                              onBlur={(e) => { if (!e.target.value) return; const v = e.target.value; const c = v < salonOpen ? salonOpen : v > salonClose ? salonClose : v; handleUpdateSchedule(sched.id, { closing_time: c }); }}
                              className="rounded-xl border border-[#eadfce] bg-[#faf8f5] px-2 py-1 text-xs text-[#1f1b17] outline-none focus:border-[var(--gold)]" />
                          </div>
                          <label className="flex items-center gap-1.5 text-xs text-[#6f6254] cursor-pointer">
                            <input type="checkbox" checked={sched.has_break}
                              onChange={(e) => handleUpdateSchedule(sched.id, { has_break: e.target.checked, break_start: e.target.checked ? (sched.break_start ?? "12:00") : null, break_end: e.target.checked ? (sched.break_end ?? "14:00") : null })} />
                            Pause
                          </label>
                          {sched.has_break && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-[#a09890]">de</span>
                              <input type="time" suppressHydrationWarning defaultValue={(sched.break_start ?? "12:00").slice(0,5)} min={sched.opening_time.slice(0,5)} max={sched.closing_time.slice(0,5)}
                                onBlur={(e) => { if (e.target.value) handleUpdateSchedule(sched.id, { break_start: e.target.value }); }}
                                className="rounded-xl border border-[#eadfce] bg-[#fff8ee] px-2 py-1 text-xs text-[#1f1b17] outline-none focus:border-[var(--gold)]" />
                              <span className="text-xs text-[#a09890]">à</span>
                              <input type="time" suppressHydrationWarning defaultValue={(sched.break_end ?? "14:00").slice(0,5)} min={sched.opening_time.slice(0,5)} max={sched.closing_time.slice(0,5)}
                                onBlur={(e) => { if (e.target.value) handleUpdateSchedule(sched.id, { break_end: e.target.value }); }}
                                className="rounded-xl border border-[#eadfce] bg-[#fff8ee] px-2 py-1 text-xs text-[#1f1b17] outline-none focus:border-[var(--gold)]" />
                            </div>
                          )}
                        </>
                      )}
                      {!salonDayOpen && <span className="text-xs text-[#b0a89e]">Salon fermé</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 grid gap-1">
              <div className="text-xs font-semibold text-[#6f6254]">Couleur agenda</div>
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
            {updatingStaffId === member.id && <div className="mt-2 text-xs text-[#6f6254]">Enregistrement...</div>}
          </div>
        );
      })}
      <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4">
        <div className="mb-3 text-sm font-black">Ajouter une coiffeuse</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-[#6f6254]">
            Prénom
            <input type="text" value={newStaffFirstName} onChange={(e) => setNewStaffFirstName(e.target.value)} className={fieldClass} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[#6f6254]">
            Nom
            <input type="text" value={newStaffLastName} onChange={(e) => setNewStaffLastName(e.target.value)} className={fieldClass} />
          </label>
        </div>
        <div className="mt-3 grid gap-1">
          <div className="text-xs font-semibold text-[#6f6254]">Couleur agenda</div>
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
    </div>
    </div>
  );

  const tabContentMap: Record<TabId, React.ReactNode> = {
    salon: salonTabContent,
    fermetures: fermeturesTabContent,
    categories: categoriesTabContent,
    prestations: prestationsTabContent,
    equipe: equipeTabContent,
  };

  const tabTitles: Record<TabId, { icon: string; title: string; subtitle: string }> = {
    salon:       { icon: "🏪", title: "Salon",        subtitle: "Téléphone, horaires et jours d'ouverture" },
    fermetures:  { icon: "📆", title: "Fermetures",   subtitle: "Fermetures exceptionnelles à venir" },
    categories:  { icon: "🏷️", title: "Catégories",   subtitle: "Gérer les catégories de prestations" },
    prestations: { icon: "✂️", title: "Prestations",  subtitle: "Gérer les prestations du salon" },
    equipe:      { icon: "💇", title: "Équipe",        subtitle: "Coiffeuses, horaires et pauses" },
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff8ef_0,#f7efe4_38%,#f4eee7_100%)] text-[#1f1b17]">
      <header className="md:sticky top-0 z-30 border-b border-[#eadfce]/80 bg-[#fffaf4]/90 shadow-[0_10px_30px_rgba(80,55,25,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex w-[min(1400px,calc(100%-24px))] items-center justify-between gap-3 py-3 md:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-[#eadfce] bg-[#f4eadc] shadow-[0_12px_26px_rgba(185,139,61,0.18)] md:h-14 md:w-14 md:rounded-[22px]">
              <Image src="/logo-pro.png" alt="Boucle d'Or Pro" width={56} height={56} priority className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--gold)] md:text-[11px]">Back office</div>
              <div className="mt-0.5 text-xl font-semibold leading-none text-[#1f1b17] md:mt-1 md:text-3xl">{settings?.salon_name || "Boucle d'Or"} Pro</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 md:flex md:items-center md:justify-end md:gap-2">
            <Link href="/back-office" className="rounded-xl border border-[#eadfce] bg-white/80 px-3 py-2 text-xs font-semibold text-[#4d453d] shadow-sm transition hover:-translate-y-0.5 hover:bg-white md:rounded-2xl md:px-4 md:py-3 md:text-sm">Agenda</Link>
            <Link href="/back-office/clients" className="rounded-xl border border-[#eadfce] bg-white/80 px-3 py-2 text-xs font-semibold text-[#4d453d] shadow-sm transition hover:-translate-y-0.5 hover:bg-white md:rounded-2xl md:px-4 md:py-3 md:text-sm">Fiches clients</Link>
            <Link href="/back-office/gestion" className="rounded-xl bg-[#1f1b17] px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_22px_rgba(31,27,23,0.16)] transition hover:-translate-y-0.5 hover:opacity-90 md:rounded-2xl md:px-4 md:py-3 md:text-sm">Gestion</Link>
            <button type="button" onClick={handleLogout} className="rounded-xl border border-[#f0d5cd] bg-[#fff5f2] px-3 py-2 text-xs font-semibold text-[#a33a3a] shadow-sm transition hover:-translate-y-0.5 hover:bg-white md:rounded-2xl md:px-4 md:py-3 md:text-sm">Déconnexion</button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-[min(1400px,calc(100%-32px))] py-8">
        {statusMessage && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800 shadow-sm">{statusMessage}</div>
        )}
        {loading ? (
          <div className="rounded-[26px] border border-dashed border-[#dccdbb] bg-white/70 px-6 py-14 text-center text-[#6f6254] shadow-sm">Chargement de la gestion du salon...</div>
        ) : (
          <div className="flex gap-6 items-start">
            {/* Sidebar desktop */}
            <aside className="hidden md:flex flex-col gap-1 w-52 shrink-0 sticky top-24">
              <div className="mb-3 px-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--gold)]">Gestion salon</p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">Gestion</h1>
              </div>
              {TABS.map((tab) => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-left transition ${activeTab === tab.id ? "bg-[#1f1b17] text-white shadow-[0_8px_20px_rgba(31,27,23,0.18)]" : "text-[#4d453d] hover:bg-white/80 hover:shadow-sm border border-transparent hover:border-[#eadfce]"}`}>
                  <span className="text-base">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </aside>

            {/* Onglets mobile */}
            <div className="md:hidden flex gap-2 overflow-x-auto pb-1 w-full">
              {TABS.map((tab) => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 shrink-0 rounded-2xl px-4 py-2.5 text-xs font-semibold transition ${activeTab === tab.id ? "bg-[#1f1b17] text-white" : "border border-[#eadfce] bg-white text-[#4d453d]"}`}>
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
              <div className={cardClass + " p-5 md:p-7"}>
                <div className="mb-6">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--gold)]">
                    <span className="text-xl">{tabTitles[activeTab].icon}</span>
                    {tabTitles[activeTab].title}
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">{tabTitles[activeTab].subtitle}</h2>
                </div>
                {tabContentMap[activeTab]}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
