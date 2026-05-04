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

export default function BackOfficeClientsPage() {
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
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

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
  }, []);

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
        .eq("client_id", selectedClient.id);
      if (apptError) throw new Error(apptError.message);
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", selectedClient.id);
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

      // Détecter le séparateur (virgule ou point-virgule)
      const sep = lines[0].includes(";") ? ";" : ",";

      const parseCSVLine = (line: string) => {
        const result: string[] = [];
        let inQuote = false;
        let current = "";
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
            else inQuote = !inQuote;
          } else if (char === sep && !inQuote) {
            result.push(current.trim()); current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

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

      if (colFirst === -1 || colLast === -1 || colPhone === -1) {
        throw new Error("Colonnes introuvables. Le fichier doit avoir au minimum : Prénom, Nom, Téléphone.");
      }

      const rows = lines.slice(1).map((l) => parseCSVLine(l));

      // Récupérer les téléphones existants pour éviter les doublons
      const { data: existingData } = await supabase.from("clients").select("phone");
      const existingPhones = new Set((existingData ?? []).map((r: { phone: string }) => normalizePhone(r.phone)));

      const toInsert: { first_name: string; last_name: string; phone: string; email: string | null; notes: string | null }[] = [];
      let skipped = 0;

      for (const row of rows) {
        const first = (row[colFirst] ?? "").trim();
        const last = (row[colLast] ?? "").trim();
        const rawPhone = (row[colPhone] ?? "").trim();
        const phone = normalizePhone(rawPhone);
        const email = colEmail !== -1 ? (row[colEmail] ?? "").trim() || null : null;
        const notes = colNotes !== -1 ? (row[colNotes] ?? "").trim() || null : null;

        if (!first || !last || phone.length !== 10) { skipped++; continue; }
        if (existingPhones.has(phone)) { skipped++; continue; }

        existingPhones.add(phone);
        toInsert.push({ first_name: first, last_name: last, phone, email, notes });
      }

      if (toInsert.length === 0) {
        setImportMessage(`Aucun nouveau client à importer (${skipped} ignoré(s) — doublons ou données invalides).`);
        return;
      }

      const { error } = await supabase.from("clients").insert(toInsert);
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
    const term = search.trim().toLowerCase();
    if (!term) return clients;

    return clients.filter((client) => {
      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
      const reverseName = `${client.last_name} ${client.first_name}`.toLowerCase();
      const phone = client.phone.toLowerCase();
      const email = (client.email ?? "").toLowerCase();

      return fullName.includes(term) || reverseName.includes(term) || phone.includes(term) || email.includes(term);
    });
  }, [clients, search]);

  const clientsWithEmail = useMemo(() => clients.filter((client) => client.email).length, [clients]);
  const clientsWithNotes = useMemo(() => clients.filter((client) => client.notes).length, [clients]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff8ef_0,#f7efe4_38%,#f4eee7_100%)] text-[#1f1b17]">
      <header className="md:sticky top-0 z-30 border-b border-[#eadfce]/80 bg-[#fffaf4]/90 shadow-[0_10px_30px_rgba(80,55,25,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex w-[min(1400px,calc(100%-24px))] items-center justify-between gap-3 py-3 md:py-4">
          <Link href="/back-office" className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-[#eadfce] bg-[#f4eadc] shadow-[0_12px_26px_rgba(185,139,61,0.18)] md:h-14 md:w-14 md:rounded-[22px]">
              <Image
                src="/logo-pro.png"
                alt="Boucle d’Or Pro"
                width={56}
                height={56}
                priority
                className="h-full w-full object-cover"
              />
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--gold)] md:text-[11px]">
                Back office
              </div>
              <div className="mt-0.5 text-xl font-semibold leading-none text-[#1f1b17] md:mt-1 md:text-3xl">
                Boucle d’Or Pro
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-2 gap-1.5 md:flex md:items-center md:justify-end md:gap-2">
            <Link href="/back-office" className="rounded-xl border border-[#eadfce] bg-white/80 px-3 py-2 text-xs font-semibold text-[#4d453d] shadow-sm transition hover:-translate-y-0.5 hover:bg-white md:rounded-2xl md:px-4 md:py-3 md:text-sm">Agenda</Link>
            <Link href="/back-office/clients" className="rounded-xl bg-[#1f1b17] px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_22px_rgba(31,27,23,0.16)] transition hover:-translate-y-0.5 hover:opacity-90 md:rounded-2xl md:px-4 md:py-3 md:text-sm">Fiches clients</Link>
            <Link href="/back-office/gestion" className="rounded-xl border border-[#eadfce] bg-white/80 px-3 py-2 text-xs font-semibold text-[#4d453d] shadow-sm transition hover:-translate-y-0.5 hover:bg-white md:rounded-2xl md:px-4 md:py-3 md:text-sm">Gestion</Link>
            <button type="button" onClick={handleLogout} className="rounded-xl border border-[#f0d5cd] bg-[#fff5f2] px-3 py-2 text-xs font-semibold text-[#a33a3a] shadow-sm transition hover:-translate-y-0.5 hover:bg-white md:rounded-2xl md:px-4 md:py-3 md:text-sm">Déconnexion</button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-[min(1400px,calc(100%-24px))] gap-4 py-5 md:gap-6 md:py-8 lg:grid-cols-[310px_1fr]">
        <aside className="space-y-4 md:space-y-5">
          <div className="overflow-hidden rounded-[24px] border border-[#eadfce]/90 bg-white/75 shadow-[0_18px_45px_rgba(80,55,25,0.07)] backdrop-blur md:rounded-[30px]">
            <div className="p-4 md:p-6">
              <div className="mb-3 inline-flex rounded-full border border-[#eadfce] bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">
                Fiches clients
              </div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Clients</h1>
              <p className="mt-2 text-sm leading-6 text-[#6f6254]">Recherche rapide, coordonnées, notes et historique des rendez-vous.</p>
            </div>

            <div className="space-y-4 p-5">
              <label className="grid gap-2 text-sm font-medium text-[#6f6254]">
                Rechercher un client
                <div className="flex items-center gap-3 rounded-2xl border border-[#eadfce] bg-white/70 px-4 py-3 shadow-inner">
                  <span className="text-lg">⌕</span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nom, téléphone, email..."
                    className="w-full bg-transparent text-[#1f1b17] outline-none placeholder:text-[#a79a8b]"
                  />
                </div>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#eadfce] bg-white/70 p-4">
                  <div className="text-2xl font-semibold">{filteredClients.length}</div>
                  <div className="mt-1 text-xs text-[#6f6254]">résultat(s)</div>
                </div>
                <div className="rounded-2xl border border-[#eadfce] bg-white/70 p-4">
                  <div className="text-2xl font-semibold">{clients.length}</div>
                  <div className="mt-1 text-xs text-[#6f6254]">clients</div>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden sm:grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[26px] border border-[#eadfce] bg-white p-5 shadow-sm">
              <div className="text-sm text-[#6f6254]">Avec email</div>
              <div className="mt-2 text-3xl font-semibold">{clientsWithEmail}</div>
            </div>
            <div className="rounded-[26px] border border-[#eadfce] bg-white p-5 shadow-sm">
              <div className="text-sm text-[#6f6254]">Avec notes</div>
              <div className="mt-2 text-3xl font-semibold">{clientsWithNotes}</div>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={clients.length === 0}
              className="rounded-[26px] border border-[#eadfce] bg-white px-5 py-4 text-sm font-semibold text-[#4d453d] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fffdf9] disabled:opacity-40 text-left"
            >
              ↓ Exporter CSV
            </button>
            <label className={`cursor-pointer rounded-[26px] border border-[#eadfce] bg-white px-5 py-4 text-sm font-semibold text-[#4d453d] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fffdf9] text-left ${importing ? "opacity-50 pointer-events-none" : ""}`}>
              {importing ? "Importation..." : "↑ Importer CSV"}
              <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
          </div>
        </aside>

        <section className="rounded-[24px] border border-[#eadfce]/90 bg-white/75 p-4 shadow-[0_18px_45px_rgba(80,55,25,0.07)] backdrop-blur md:rounded-[30px] md:p-6 md:p-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 md:mb-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">Base clients</div>
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
            <div className="rounded-[26px] border border-dashed border-[#dccdbb] bg-white/70 px-6 py-14 text-center text-[#6f6254]">
              Chargement des clients...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-[#dccdbb] bg-white/70 px-6 py-14 text-center text-[#6f6254]">
              Aucun client trouvé.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-3 overflow-hidden">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => loadClientDetails(client)}
                  className="group w-full min-w-0 rounded-[28px] border border-[#eadfce] bg-[#fffdf9] p-5 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#d8bd91] hover:shadow-[0_18px_40px_rgba(83,58,31,0.10)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#1f1b17] to-[var(--gold)] text-sm font-bold text-white shadow-sm">
                      {getInitials(client)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-xl font-semibold">
                        {client.first_name} {client.last_name}
                      </h3>
                      <p className="mt-1 text-sm text-[#6f6254]">{client.phone}</p>
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1f1b17]/45 backdrop-blur-sm md:p-6">
          <div className="flex min-h-full items-start justify-center md:items-center md:p-4">
            <div className="w-full max-w-6xl overflow-hidden rounded-none border-0 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.22)] md:rounded-[34px] md:border md:border-[#eadfce]">
              <div className="sticky top-0 z-10 border-b border-[#eadfce] bg-white/90 p-4 backdrop-blur-xl md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#1f1b17] to-[var(--gold)] font-bold text-white shadow-sm">
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
                      className="rounded-2xl border border-[#eadfce] bg-white/70 px-4 py-2 text-sm font-semibold text-[#6f6254] transition hover:bg-white"
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
                        setEditPhone(selectedClient.phone);
                        setEditEmail(selectedClient.email ?? "");
                        setEditNotes(selectedClient.notes ?? "");
                      }}
                      className="rounded-2xl border border-[#eadfce] bg-white px-4 py-2 text-sm font-semibold text-[#6f6254] transition hover:bg-white/70"
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
                          className="rounded-2xl border border-[#eadfce] bg-white/70 px-4 py-2 text-sm font-semibold text-[#6f6254] transition hover:bg-white"
                        >
                          Annuler
                        </button>
                      </>
                    )}
                    <a
                      href={`tel:${selectedClient.phone}`}
                      className="rounded-2xl bg-[#1f1b17] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:opacity-90"
                    >
                      Appeler
                    </a>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-4 md:gap-6 md:p-6 lg:grid-cols-[320px_1fr]">
                <aside className="space-y-4">
                  <div className="rounded-[26px] border border-[#eadfce] bg-white/70 p-4 md:p-5">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Coordonnées</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 md:mt-4 md:block md:space-y-3 overflow-hidden">
                      <div className="rounded-2xl bg-white p-3 md:p-4">
                        <div className="text-xs text-[#6f6254]">Téléphone</div>
                        <div className="mt-1 font-semibold text-sm md:text-base">{selectedClient.phone}</div>
                      </div>
                      <div className="rounded-2xl bg-white p-3 md:p-4">
                        <div className="text-xs text-[#6f6254]">Email</div>
                        <div className="mt-1 break-words font-semibold text-sm md:text-base">{selectedClient.email || "Non renseigné"}</div>
                      </div>
                      <div className="rounded-2xl bg-white p-3 md:p-4 col-span-2 md:col-span-1">
                        <div className="text-xs text-[#6f6254]">Rendez-vous</div>
                        <div className="mt-1 font-semibold">{selectedClientAppointments.length}</div>
                      </div>
                    </div>
                  </div>

                  {selectedClient.notes ? (
                    <div className="rounded-[26px] border border-[#eadfce] bg-white p-5 shadow-sm">
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Notes</div>
                      <p className="mt-3 text-sm leading-6 text-[#6f6254]">{selectedClient.notes}</p>
                    </div>
                  ) : null}
                </aside>

                <section className="space-y-5">
                  {isEditingClient ? (
                    <div className="rounded-[28px] border border-[#eadfce] bg-[#fffdf9] p-5 shadow-sm">
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Modification</div>
                          <h3 className="mt-1 text-xl font-semibold">Informations client</h3>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveClient}
                          disabled={savingClient}
                          className="rounded-2xl bg-[#1f1b17] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
                        >
                          {savingClient ? "Enregistrement..." : "Enregistrer"}
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="grid gap-2 text-sm font-medium text-[#6f6254]">
                          Prénom
                          <input type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-[#1f1b17] outline-none focus:border-[var(--gold)]" />
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-[#6f6254]">
                          Nom
                          <input type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-[#1f1b17] outline-none focus:border-[var(--gold)]" />
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-[#6f6254]">
                          Téléphone
                          <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="06 00 00 00 00" className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-[#1f1b17] outline-none focus:border-[var(--gold)]" />
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-[#6f6254]">
                          E-mail
                          <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-[#1f1b17] outline-none focus:border-[var(--gold)]" />
                        </label>
                      </div>

                      <label className="mt-4 grid gap-2 text-sm font-medium text-[#6f6254]">
                        Notes
                        <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="min-h-[120px] rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-[#1f1b17] outline-none focus:border-[var(--gold)]" />
                      </label>
                    </div>
                  ) : null}

                  <div className="rounded-[28px] border border-[#eadfce] bg-[#fffdf9] p-5 shadow-sm">
                    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Historique</div>
                        <h3 className="mt-1 text-xl font-semibold">Rendez-vous</h3>
                      </div>
                      <span className="rounded-full border border-[#eadfce] bg-white px-4 py-2 text-sm text-[#6f6254]">{selectedClientAppointments.length} RDV</span>
                    </div>

                    {loadingClientDetails ? (
                      <div className="rounded-[24px] border border-dashed border-[#dccdbb] bg-white px-6 py-12 text-center text-[#6f6254]">
                        Chargement de l’historique...
                      </div>
                    ) : selectedClientAppointments.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-[#dccdbb] bg-white px-6 py-12 text-center text-[#6f6254]">
                        Aucun rendez-vous trouvé.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedClientAppointments.map((appointment) => (
                          <article key={appointment.id} className="rounded-[24px] border border-[#eadfce] bg-white p-4 transition hover:border-[#d8bd91]">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h4 className="text-lg font-semibold">{appointment.services?.name ?? "Prestation"}</h4>
                                <p className="mt-1 text-sm text-[#6f6254]">{appointment.services?.categories?.name ?? "Sans catégorie"}</p>
                              </div>
                              <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${getBadgeClasses(appointment.status)}`}>
                                {getStatusLabel(appointment.status)}
                              </span>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                              <div className="rounded-2xl bg-white/70 p-3">
                                <div className="text-xs text-[#6f6254]">Date</div>
                                <div className="mt-1 text-sm font-semibold">{formatFrenchDate(appointment.appointment_date)}</div>
                              </div>
                              <div className="rounded-2xl bg-white/70 p-3">
                                <div className="text-xs text-[#6f6254]">Heure</div>
                                <div className="mt-1 text-sm font-semibold">{formatTime(appointment.start_time)} → {formatTime(appointment.end_time)}</div>
                              </div>
                              <div className="rounded-2xl bg-white/70 p-3">
                                <div className="text-xs text-[#6f6254]">Tarif</div>
                                <div className="mt-1 text-sm font-semibold">{formatPrice(appointment.price_cents)}</div>
                              </div>
                            </div>

                            {appointment.client_message ? (
                              <div className="mt-3 rounded-2xl border border-[#eadfce] bg-white/70 p-3">
                                <div className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">Message client</div>
                                <p className="mt-2 text-sm leading-5 text-[#6f6254]">{appointment.client_message}</p>
                              </div>
                            ) : null}

                            {appointment.internal_note ? (
                              <div className="mt-3 rounded-2xl border border-[#eadfce] bg-white/70 p-3">
                                <div className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">Note interne</div>
                                <p className="mt-2 text-sm leading-5 text-[#6f6254]">{appointment.internal_note}</p>
                              </div>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
