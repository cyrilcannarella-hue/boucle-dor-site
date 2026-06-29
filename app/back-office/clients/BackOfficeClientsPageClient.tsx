"use client";

import Link from "next/link";
import { SalonNameGradient } from "@/components/SalonNameGradient";
import { SiteFont } from "@/components/SiteFont";
import { SitePattern, getPatternBgLayer } from "@/components/SitePattern";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useSalon } from "@/hooks/useSalon";

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

type AppointmentAnswer = {
  question_text: string;
  answer: string;
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
  appointment_answers?: AppointmentAnswer[];
};

function formatPrice(priceCents: number) {
  return `${(priceCents / 100).toFixed(2).replace(".00", "")} €`;
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
  if (status === "confirmed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-violet-200 bg-violet-50 text-violet-700";
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function getInitials(client: ClientRow) {
  return `${client.first_name?.[0] ?? ""}${client.last_name?.[0] ?? ""}`.toUpperCase();
}

export type SalonSettings = {
  id: string;
  salon_name?: string | null;
  logo_pro_image_url?: string | null;
  color_page_bg?: string | null;
  color_header_bg?: string | null;
  color_text_main?: string | null;
  color_salon_name?: string | null;
  color_card_border?: string | null;
  color_accents?: string | null;
  color_nav_text?: string | null;
  site_font?: string | null;
  font_salon_name?: string | null;
  bg_pattern?: string | null;
};

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

function contrastText(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.40 ? "#111827" : "#ffffff";
}

function derivePanelBg(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const clamp = (v: number) => Math.min(255, v + 30);
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

export function BackOfficeClientsPageClient({ initialSettings }: { initialSettings: SalonSettings | null }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { id: salonId } = useSalon();
  const settings = initialSettings;
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [search, setSearch] = useState("");

  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [selectedClientAppointments, setSelectedClientAppointments] = useState<ClientAppointmentHistory[]>([]);
  const [loadingClientDetails, setLoadingClientDetails] = useState(false);

  const [isEditingClient, setIsEditingClient] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  useEffect(() => {
    document.body.style.overflow = selectedClient ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedClient]);

  const loadClients = async () => {
    try {
      setLoading(true);
      setStatusMessage("");

      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name, phone, email, notes")
        .eq("salon_id", salonId)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true })
        .limit(10000);

      if (error) throw new Error((error as Error).message);

      setClients((data ?? []) as ClientRow[]);
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message ?? "Impossible de charger les clients."}`);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [salonId]);

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
          ),
          appointment_answers (
            question_text,
            answer
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
    setConfirmDelete(false);
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

      if (existingPhoneError) throw new Error(existingPhoneError.message);

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
            `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, "fr")
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

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    try {
      setDeletingClient(true);
      setStatusMessage("");
      const { error: apptError } = await supabase
        .from("appointments")
        .delete()
        .eq("client_id", selectedClient.id)
        .eq("salon_id", salonId);
      if (apptError) throw new Error(apptError.message);
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", selectedClient.id)
        .eq("salon_id", salonId);
      if (error) throw new Error((error as Error).message);
      setClients((prev) => prev.filter((c) => c.id !== selectedClient.id));
      closeClientModal();
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message ?? "Impossible de supprimer le client."}`);
      setConfirmDelete(false);
    } finally {
      setDeletingClient(false);
    }
  };

  const handleExport = () => {
    const header = ["Prénom", "Nom", "Téléphone", "Email", "Notes"];
    const rows = clients.map((c) => [
      c.first_name,
      c.last_name,
      c.phone,
      c.email ?? "",
      (c.notes ?? "").replace(/\n/g, " "),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fiches-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImporting(true);
    setImportMessage("");

    try {
      const text = await file.text();
      const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
      if (lines.length < 2) throw new Error("Le fichier est vide ou ne contient pas de données.");

      const parseCSVLine = (line: string, separator: string) => {
        const result: string[] = [];
        let inQuote = false;
        let current = "";
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
            else inQuote = !inQuote;
          } else if (char === separator && !inQuote) {
            result.push(current.trim()); current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const normalizeHeader = (h: string) => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      // Planity ajoute parfois une ligne parasite (nom du fichier) avant les vraies
      // en-t\u00eates : on cherche la premi\u00e8re ligne qui ressemble \u00e0 un en-t\u00eate connu,
      // et on d\u00e9tecte le s\u00e9parateur (virgule ou point-virgule) sur cette ligne pr\u00e9cise.
      const KNOWN_HEADER_KEYS = ["prenom", "nom", "telephone", "phone", "mobile", "tel", "email", "mail"];
      let headerIdx = 0;
      for (let i = 0; i < Math.min(5, lines.length - 1); i++) {
        const candidateSep = lines[i].includes(";") ? ";" : ",";
        const candidateHeaders = parseCSVLine(lines[i], candidateSep).map(normalizeHeader);
        const matchCount = candidateHeaders.filter((h) => KNOWN_HEADER_KEYS.some((k) => h.includes(k))).length;
        if (matchCount >= 2) { headerIdx = i; break; }
      }

      const sep = lines[headerIdx].includes(";") ? ";" : ",";
      const headers = parseCSVLine(lines[headerIdx], sep).map(normalizeHeader);

      // Mapping colonnes Planity et format standard
      const findCol = (keys: string[]) => {
        for (const k of keys) {
          const idx = headers.findIndex((h) => h.includes(k));
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const colFirst = findCol(["prenom", "firstname", "first name", "prénom"]);
      const colLast = findCol(["nom", "lastname", "last name", "name"]);
      const colPhone = findCol(["telephone", "phone", "mobile", "tel", "tél"]);
      const colEmail = findCol(["email", "mail", "e-mail"]);
      const colNotes = findCol(["note", "commentaire", "comment"]);

      if (colLast === -1 || colPhone === -1) {
        throw new Error("Colonnes introuvables. Le fichier doit avoir au minimum : Prénom, Nom, Téléphone.");
      }

      // Planity exporte parfois un seul champ "Nom" avec prénom+nom mélangés
      // (ex : "MARTINEZ Evelyse") au lieu de deux colonnes séparées.
      const combinedName = colFirst === -1;

      const rows = lines.slice(headerIdx + 1).map((l) => parseCSVLine(l, sep));

      // Récupérer les téléphones existants pour éviter les doublons
      const { data: existingData } = await supabase.from("clients").select("phone").eq("salon_id", salonId).limit(10000);
      const existingPhones = new Set((existingData ?? []).filter((r: { phone: string | null }) => r.phone).map((r: { phone: string | null }) => normalizePhone(r.phone!)));

      // Téléphone Planity parfois au format international (+33/33) au lieu du format français à 10 chiffres
      const toFrenchPhone = (raw: string) => {
        let digits = normalizePhone(raw);
        if (digits.length === 11 && digits.startsWith("33")) digits = "0" + digits.slice(2);
        else if (digits.length === 13 && digits.startsWith("0033")) digits = "0" + digits.slice(4);
        return digits;
      };

      const toInsert: { first_name: string; last_name: string; phone: string; email: string | null; notes: string | null }[] = [];
      let skipped = 0;

      for (const row of rows) {
        let first: string;
        let last: string;
        if (combinedName) {
          const full = (row[colLast] ?? "").trim().replace(/\s+/g, " ");
          const parts = full.split(" ").filter(Boolean);
          if (parts.length >= 2) {
            first = parts[parts.length - 1];
            last = parts.slice(0, -1).join(" ");
          } else {
            first = full;
            last = "";
          }
        } else {
          first = (row[colFirst] ?? "").trim();
          last = (row[colLast] ?? "").trim();
        }
        const rawPhone = (row[colPhone] ?? "").trim();
        const phone = toFrenchPhone(rawPhone);
        const email = colEmail !== -1 ? (row[colEmail] ?? "").trim() || null : null;
        const notes = colNotes !== -1 ? (row[colNotes] ?? "").trim() || null : null;

        if ((!first && !last) || phone.length !== 10) { skipped++; continue; }
        if (existingPhones.has(phone)) { skipped++; continue; }

        existingPhones.add(phone);
        toInsert.push({ first_name: first, last_name: last, phone, email, notes });
      }

      if (toInsert.length === 0) {
        setImportMessage(`Aucun nouveau client à importer (${skipped} ignoré(s) — doublons ou données invalides).`);
        return;
      }

      const { error } = await supabase.from("clients").insert(toInsert.map((c) => ({ ...c, salon_id: salonId })));
      if (error) throw new Error(error.message);

      await loadClients();
      setImportMessage(`✅ ${toInsert.length} client(s) importé(s) avec succès${skipped > 0 ? ` · ${skipped} ignoré(s)` : ""}.`);
    } catch (err: unknown) {
      setImportMessage(`Erreur : ${(err as Error).message}`);
    } finally {
      setImporting(false);
    }
  };

  const filteredClients = useMemo(() => {
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const term = normalize(search.trim());
    if (!term) return clients;

    return clients.filter((client) => {
      const fullName = normalize(`${client.first_name} ${client.last_name}`);
      const reverseName = normalize(`${client.last_name} ${client.first_name}`);
      const phone = (client.phone ?? "");
      const email = normalize(client.email ?? "");

      return fullName.includes(term) || reverseName.includes(term) || phone.includes(term) || email.includes(term);
    });
  }, [clients, search]);

  const clientsWithEmail = useMemo(() => clients.filter((client) => client.email).length, [clients]);
  const clientsWithNotes = useMemo(() => clients.filter((client) => client.notes).length, [clients]);

  const colorPageBg = settings?.color_page_bg || "#ffffff";
  const bgPatternLayer = getPatternBgLayer(settings?.bg_pattern, colorPageBg);
  const colorHeaderBg = settings?.color_header_bg || "#ffffff";
  const colorTextMain = settings?.color_text_main || "#111827";
  const colorSalonName = settings?.color_salon_name || colorTextMain;
  const colorCardBorder = settings?.color_card_border || "#e5e7eb";
  const colorAccents = settings?.color_accents || "#4f46e5";
  const colorNavText = settings?.color_nav_text || "#111827";
  const colorPanelBg = derivePanelBg(colorPageBg);
  const colorPanelBgSecondary = derivePanelBgSecondary(colorPageBg);
  const colorSelectedBg = colorAccents;
  const colorSelectedText = contrastText(colorSelectedBg);
  const colorAvatarText = contrastText(colorAccents);
  const salonDisplayName = (settings?.salon_name || "Votre salon").replace(/[\u0027\u2018\u2019\u201B]/g, "'");

  return (
    <main
      className="min-h-screen"
      style={{ color: colorTextMain, background: `${bgPatternLayer ? bgPatternLayer + "," : ""}radial-gradient(circle at top left, rgba(${hexToRgb(colorAccents)},0.10), transparent 34%), ${colorPageBg}` }}
    >
      <style>{`:root { --gold: ${colorAccents}; --card-border: ${colorCardBorder}; --nav-text: ${colorNavText}; --text-main: ${colorTextMain}; --page-bg: ${colorPageBg}; --accents: ${colorAccents}; --panel-bg: ${colorPanelBg}; --panel-bg-secondary: ${colorPanelBgSecondary}; --selected-bg: ${colorSelectedBg}; --selected-text: ${colorSelectedText}; }`}</style>
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
          <Link href="/back-office" className="flex items-center gap-3">
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
              <div className="inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] md:text-[11px]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
                Back office
              </div>
              <div className="mt-0.5 text-xl font-semibold leading-none md:mt-1 md:text-3xl">
                <SalonNameGradient name={salonDisplayName} goldColor={colorSalonName} /> Pro
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-2 gap-1.5 md:flex md:items-center md:justify-end md:gap-2">
            <Link href="/back-office" className="rounded-xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--nav-text)] shadow-sm transition hover:-translate-y-1 hover:scale-[1.08] hover:bg-[var(--panel-bg)] md:rounded-2xl md:px-4 md:py-3 md:text-sm">Agenda</Link>
            <Link href="/back-office/clients" className="rounded-xl bg-[var(--selected-bg)] px-3 py-2 text-xs font-semibold text-[var(--selected-text)] shadow-sm transition hover:-translate-y-1 hover:scale-[1.08] hover:opacity-90 md:rounded-2xl md:px-4 md:py-3 md:text-sm">Fiches clients</Link>
            <Link href="/back-office/gestion" className="rounded-xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--nav-text)] shadow-sm transition hover:-translate-y-1 hover:scale-[1.08] hover:bg-[var(--panel-bg)] md:rounded-2xl md:px-4 md:py-3 md:text-sm">Admin</Link>
            <button type="button" onClick={handleLogout} className="rounded-xl border border-[#f0d5cd] bg-[#fff5f2] px-3 py-2 text-xs font-semibold text-[#a33a3a] shadow-sm transition hover:-translate-y-1 hover:scale-[1.08] hover:bg-[var(--panel-bg)] md:rounded-2xl md:px-4 md:py-3 md:text-sm">Déconnexion</button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-[min(1400px,calc(100%-24px))] gap-4 py-5 md:gap-6 md:py-8 lg:grid-cols-[310px_1fr]">
        <aside className="space-y-4 md:space-y-5">
          <div className="overflow-hidden rounded-[24px] border border-[var(--card-border)] bg-[var(--panel-bg)] shadow-[0_18px_45px_rgba(80,55,25,0.07)] md:rounded-[30px]">
            <div className="p-4 md:p-6">
              <div className="mb-3 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
                Fiches clients
              </div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Clients</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--nav-text)]">Recherche rapide, coordonnées, notes et historique des rendez-vous.</p>
            </div>

            <div className="space-y-4 p-5">
              <label className="grid gap-2 text-sm font-medium text-[var(--nav-text)]">
                Rechercher un client
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-white/70 px-4 py-3 shadow-inner">
                  <span className="text-lg">⌕</span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nom, téléphone, email..."
                    className="w-full bg-transparent text-[var(--text-main)] outline-none placeholder:text-[#a79a8b]"
                  />
                </div>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[var(--card-border)] bg-white/70 p-4">
                  <div className="text-2xl font-semibold">{filteredClients.length}</div>
                  <div className="mt-1 text-xs text-[var(--nav-text)]">résultat(s)</div>
                </div>
                <div className="rounded-2xl border border-[var(--card-border)] bg-white/70 p-4">
                  <div className="text-2xl font-semibold">{clients.length}</div>
                  <div className="mt-1 text-xs text-[var(--nav-text)]">clients</div>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden sm:grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <button
              type="button"
              onClick={handleExport}
              disabled={clients.length === 0}
              className="rounded-[26px] border border-[var(--card-border)] bg-white px-5 py-4 text-sm font-semibold text-[var(--nav-text)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white disabled:opacity-40 text-left"
            >
              ↓ Exporter CSV
            </button>
            <label className={`cursor-pointer rounded-[26px] border border-[var(--card-border)] bg-white px-5 py-4 text-sm font-semibold text-[var(--nav-text)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white text-left ${importing ? "opacity-50 pointer-events-none" : ""}`}>
              {importing ? "Importation..." : "↑ Importer CSV"}
              <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
          </div>
        </aside>

        <section className="rounded-[24px] border border-[var(--card-border)]/90 bg-white/75 p-4 shadow-[0_18px_45px_rgba(80,55,25,0.07)] backdrop-blur md:rounded-[30px] md:p-6 md:p-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 md:mb-6">
            <div>
              <div className="inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>Base clients</div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight md:mt-2 md:text-3xl">Toutes les fiches</h2>
            </div>

          </div>

          {importMessage ? (
            <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-medium ${importMessage.startsWith("✅") ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
              {importMessage}
            </div>
          ) : null}

          {statusMessage ? (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {statusMessage}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-[26px] border border-dashed border-[#dccdbb] bg-white/70 px-6 py-14 text-center text-[var(--nav-text)]">
              Chargement des clients...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-[#dccdbb] bg-white/70 px-6 py-14 text-center text-[var(--nav-text)]">
              Aucun client trouvé.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-3 pt-2">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => loadClientDetails(client)}
                  className="group w-full min-w-0 rounded-[28px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-5 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[var(--gold)] hover:shadow-[0_18px_40px_rgba(83,58,31,0.10)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--accents)] to-[var(--gold)] text-sm font-bold shadow-sm" style={{ color: colorAvatarText }}>
                      {getInitials(client)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-xl font-semibold">
                        {client.first_name} {client.last_name}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--nav-text)]">{client.phone}</p>
                    </div>
                  </div>

                  <div className="mt-4 text-sm font-semibold text-[var(--gold)] opacity-0 transition group-hover:opacity-100">Ouvrir la fiche →</div>
                </button>
              ))}
            </div>
          )}
        </section>
      </section>

      {selectedClient ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--text-main)]/45 backdrop-blur-sm md:p-6">
          <div className="flex min-h-full items-start justify-center md:items-center md:p-4">
            <div className="w-full max-w-6xl overflow-hidden rounded-none border-0 bg-[var(--panel-bg)] shadow-[0_30px_90px_rgba(0,0,0,0.22)] md:rounded-[34px] md:border md:border-[var(--card-border)]">
              <div className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-white/90 p-4 backdrop-blur-xl md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--accents)] to-[var(--gold)] font-bold shadow-sm" style={{ color: colorAvatarText }}>
                      {getInitials(selectedClient)}
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Fiche client</div>
                      <h2 className="mt-0.5 text-xl font-semibold md:text-3xl">
                        {selectedClient.first_name} {selectedClient.last_name}
                      </h2>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={closeClientModal}
                      className="rounded-2xl border border-[var(--card-border)] bg-white/70 px-4 py-2 text-sm font-semibold text-[var(--nav-text)] transition hover:bg-white"
                    >
                      Fermer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingClient((prev) => !prev);
                        setConfirmDelete(false);
                        setEditFirstName(selectedClient.first_name);
                        setEditLastName(selectedClient.last_name);
                        setEditPhone(selectedClient.phone ?? "");
                        setEditEmail(selectedClient.email ?? "");
                        setEditNotes(selectedClient.notes ?? "");
                      }}
                      className="rounded-2xl border border-[var(--card-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--nav-text)] transition hover:bg-white/70"
                    >
                      {isEditingClient ? "Annuler" : "Modifier"}
                    </button>
                    {!confirmDelete ? (
                      <button
                        type="button"
                        onClick={() => { setConfirmDelete(true); setIsEditingClient(false); }}
                        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        Supprimer
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleDeleteClient}
                          disabled={deletingClient}
                          className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
                        >
                          {deletingClient ? "Suppression..." : "Confirmer la suppression"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="rounded-2xl border border-[var(--card-border)] bg-white/70 px-4 py-2 text-sm font-semibold text-[var(--nav-text)] transition hover:bg-white"
                        >
                          Annuler
                        </button>
                      </>
                    )}
                    <a
                      href={`tel:${selectedClient.phone}`}
                      className="rounded-2xl bg-[var(--selected-bg)] px-4 py-2 text-sm font-semibold text-[var(--selected-text)] shadow-sm transition hover:-translate-y-0.5 hover:opacity-90"
                    >
                      Appeler
                    </a>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 md:space-y-6 md:p-6">
                {isEditingClient ? (
                  <div className="rounded-[28px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-5 shadow-sm">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Modification</div>
                        <h3 className="mt-1 text-xl font-semibold">Informations client</h3>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveClient}
                        disabled={savingClient}
                        className="rounded-2xl bg-[var(--selected-bg)] px-5 py-3 text-sm font-semibold text-[var(--selected-text)] shadow-sm transition hover:opacity-90 disabled:opacity-50"
                      >
                        {savingClient ? "Enregistrement..." : "Enregistrer"}
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium text-[var(--nav-text)]">
                        Prénom
                        <input type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3 text-[var(--text-main)] outline-none focus:border-[var(--gold)]" />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-[var(--nav-text)]">
                        Nom
                        <input type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3 text-[var(--text-main)] outline-none focus:border-[var(--gold)]" />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-[var(--nav-text)]">
                        Téléphone
                        <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="06 00 00 00 00" className="rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3 text-[var(--text-main)] outline-none focus:border-[var(--gold)]" />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-[var(--nav-text)]">
                        E-mail
                        <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3 text-[var(--text-main)] outline-none focus:border-[var(--gold)]" />
                      </label>
                    </div>

                    <label className="mt-4 grid gap-2 text-sm font-medium text-[var(--nav-text)]">
                      Notes
                      <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="min-h-[120px] rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3 text-[var(--text-main)] outline-none focus:border-[var(--gold)]" />
                    </label>
                  </div>
                ) : null}

                <div className="rounded-[28px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-5 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Coordonnées</div>
                  <div className="mt-3 grid grid-cols-3 gap-3 md:mt-4">
                    <div className="rounded-2xl bg-white p-3 md:p-4">
                      <div className="text-xs text-[var(--nav-text)]">Téléphone</div>
                      <a href={`tel:${selectedClient.phone}`} className="mt-1 block font-semibold text-sm underline decoration-[var(--gold)] underline-offset-4 md:text-base">
                        {selectedClient.phone}
                      </a>
                    </div>
                    <div className="rounded-2xl bg-white p-3 md:p-4">
                      <div className="text-xs text-[var(--nav-text)]">Email</div>
                      <div className="mt-1 break-words font-semibold text-sm md:text-base">{selectedClient.email || "Non renseigné"}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-3 md:p-4">
                      <div className="text-xs text-[var(--nav-text)]">Rendez-vous</div>
                      <div className="mt-1 font-semibold">{selectedClientAppointments.length}</div>
                    </div>
                  </div>
                  {selectedClient.notes ? (
                    <div className="mt-3 rounded-2xl bg-white p-3 md:p-4">
                      <div className="text-xs text-[var(--nav-text)]">Notes</div>
                      <p className="mt-1 text-sm leading-6 text-[var(--nav-text)]">{selectedClient.notes}</p>
                    </div>
                  ) : null}
                </div>

                {(() => {
                  const apptWithAnswers = selectedClientAppointments.filter(
                    (a) => a.appointment_answers && a.appointment_answers.length > 0
                  );
                  if (apptWithAnswers.length === 0) return null;
                  return (
                    <div className="rounded-[28px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-5 shadow-sm">
                      <div className="mb-5">
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Questionnaire</div>
                        <h3 className="mt-1 text-xl font-semibold">Réponses</h3>
                      </div>
                      <div className="space-y-4">
                        {apptWithAnswers.map((appointment) => (
                          <div key={appointment.id} className="rounded-[24px] border border-[var(--card-border)] bg-white p-4">
                            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nav-text)]">
                              {formatFrenchDate(appointment.appointment_date)}
                            </div>
                            <div className="space-y-3">
                              {appointment.appointment_answers!.map((a, i) => (
                                <div key={i}>
                                  <div className="text-xs font-bold text-[var(--nav-text)]">{a.question_text}</div>
                                  <div className="mt-0.5 text-sm text-[var(--nav-text)]">{a.answer}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="rounded-[28px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-5 shadow-sm">
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Historique</div>
                      <h3 className="mt-1 text-xl font-semibold">Rendez-vous</h3>
                    </div>
                    <span className="rounded-full border border-[var(--card-border)] bg-white px-4 py-2 text-sm text-[var(--nav-text)]">{selectedClientAppointments.length} RDV</span>
                  </div>

                  {loadingClientDetails ? (
                    <div className="rounded-[24px] border border-dashed border-[#dccdbb] bg-white px-6 py-12 text-center text-[var(--nav-text)]">
                      Chargement de l’historique...
                    </div>
                  ) : selectedClientAppointments.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-[#dccdbb] bg-white px-6 py-12 text-center text-[var(--nav-text)]">
                      Aucun rendez-vous trouvé.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedClientAppointments.map((appointment) => (
                        <article key={appointment.id} className="rounded-[24px] border border-[var(--card-border)] bg-white p-4 transition hover:border-[var(--gold)]">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h4 className="text-lg font-semibold">{appointment.services?.name ?? "Prestation"}</h4>
                              <p className="mt-1 text-sm text-[var(--nav-text)]">{appointment.services?.categories?.name ?? "Sans catégorie"}</p>
                            </div>
                            <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${getBadgeClasses(appointment.status)}`}>
                              {getStatusLabel(appointment.status)}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div className="rounded-2xl bg-white/70 p-3">
                              <div className="text-xs text-[var(--nav-text)]">Date</div>
                              <div className="mt-1 text-sm font-semibold">{formatFrenchDate(appointment.appointment_date)}</div>
                            </div>
                            <div className="rounded-2xl bg-white/70 p-3">
                              <div className="text-xs text-[var(--nav-text)]">Heure</div>
                              <div className="mt-1 text-sm font-semibold">{formatTime(appointment.start_time)} → {formatTime(appointment.end_time)}</div>
                            </div>
                            <div className="rounded-2xl bg-white/70 p-3">
                              <div className="text-xs text-[var(--nav-text)]">Tarif</div>
                              <div className="mt-1 text-sm font-semibold">{formatPrice(appointment.price_cents)}</div>
                            </div>
                          </div>

                          {appointment.client_message ? (
                            <div className="mt-3 rounded-2xl border border-[var(--card-border)] bg-white/70 p-3">
                              <div className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">Message client</div>
                              <p className="mt-2 text-sm leading-5 text-[var(--nav-text)]">{appointment.client_message}</p>
                            </div>
                          ) : null}

                          {appointment.internal_note ? (
                            <div className="mt-3 rounded-2xl border border-[var(--card-border)] bg-white/70 p-3">
                              <div className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">Note interne</div>
                              <p className="mt-2 text-sm leading-5 text-[var(--nav-text)]">{appointment.internal_note}</p>
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
