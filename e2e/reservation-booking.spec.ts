import { test, expect, request as playwrightRequest } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createAdminClient, getSalonTestId } from "./admin-client";
import { BASE_URL } from "./env";
import { isOpenDayFromSettings, type DayFlagsSettings } from "../lib/availability";

const TEST_PHONE = "0799999199";
const HELPER_PHONE = "0799999198";

async function deleteClientByPhone(admin: ReturnType<typeof createAdminClient>, salonId: string, phone: string) {
  const { data: client } = await admin
    .from("clients")
    .select("id")
    .eq("salon_id", salonId)
    .eq("phone", phone)
    .maybeSingle();
  if (client) {
    await admin.from("appointments").delete().eq("client_id", client.id);
    await admin.from("clients").delete().eq("id", client.id);
  }
}

async function waitForAnySlot(page: Page, timeoutMs = 3000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  const slotLocator = page.locator('div[class*="grid-cols-3"] button:not([disabled])');
  while (Date.now() < deadline) {
    if ((await slotLocator.count()) > 0) return true;
    await page.waitForTimeout(150);
  }
  return false;
}

// Régression directe du bug du 22/06/2026 : book/route.ts ne revalidait
// jamais le créneau côté serveur — deux clients pouvaient réserver le même
// créneau/prestataire en même temps. Teste l'API directement (pas besoin de
// piloter le calendrier) : un créneau déjà pris doit être rejeté en 409.
test.describe("Réservation publique — revalidation serveur", () => {
  let admin: ReturnType<typeof createAdminClient>;
  let salonId: string;
  let staffId: string;
  let serviceId: string;
  let settings: DayFlagsSettings;
  let staffSchedules: { day_of_week: number; is_open: boolean; opening_time: string; closing_time: string }[];
  let helperAppointmentId: string | null = null;

  test.beforeAll(async () => {
    admin = createAdminClient();
    salonId = await getSalonTestId(admin);

    const { data: staff } = await admin
      .from("staff")
      .select("id")
      .eq("salon_id", salonId)
      .eq("is_active", true)
      .limit(1)
      .single();
    staffId = staff!.id;

    const { data: service } = await admin
      .from("services")
      .select("id")
      .eq("salon_id", salonId)
      .eq("is_visible", true)
      .limit(1)
      .single();
    serviceId = service!.id;

    const { data: settingsRow } = await admin
      .from("salon_settings")
      .select(
        "is_open_monday, is_open_tuesday, is_open_wednesday, is_open_thursday, is_open_friday, is_open_saturday, is_open_sunday",
      )
      .eq("salon_id", salonId)
      .single();
    settings = settingsRow as DayFlagsSettings;

    const { data: schedules } = await admin
      .from("staff_schedules")
      .select("day_of_week, is_open, opening_time, closing_time")
      .eq("salon_id", salonId)
      .eq("staff_id", staffId);
    staffSchedules = (schedules ?? []) as { day_of_week: number; is_open: boolean; opening_time: string; closing_time: string }[];
  });

  test.afterEach(async () => {
    if (helperAppointmentId) {
      await admin.from("appointments").delete().eq("id", helperAppointmentId);
      helperAppointmentId = null;
    }
    await deleteClientByPhone(admin, salonId, TEST_PHONE);
    await deleteClientByPhone(admin, salonId, HELPER_PHONE);
  });

  test("un créneau déjà pris par un autre client est rejeté (409)", async () => {
    // Cherche un jour ouvert sans aucun rendez-vous existant pour cette
    // prestataire, pour ne pas dépendre des données de seed déjà présentes
    // sur salon-test.
    let appointmentDate = "";
    for (let offset = 14; offset < 60; offset++) {
      const candidate = new Date();
      candidate.setDate(candidate.getDate() + offset);
      if (!isOpenDayFromSettings(candidate, settings)) continue;

      const schedule = staffSchedules.find((s) => s.day_of_week === candidate.getDay());
      if (!schedule || !schedule.is_open) continue;
      if (schedule.opening_time.slice(0, 5) > "10:30" || schedule.closing_time.slice(0, 5) < "16:00") continue;

      const candidateKey = candidate.toISOString().slice(0, 10);

      const { data: existing } = await admin
        .from("appointments")
        .select("id")
        .eq("salon_id", salonId)
        .eq("staff_id", staffId)
        .eq("appointment_date", candidateKey)
        .in("status", ["confirmed", "completed"])
        .limit(1);

      if (!existing || existing.length === 0) {
        appointmentDate = candidateKey;
        break;
      }
    }
    expect(appointmentDate).not.toBe("");

    const { data: helperClient } = await admin
      .from("clients")
      .insert({ salon_id: salonId, first_name: "Conflit", last_name: "E2E", phone: HELPER_PHONE })
      .select("id")
      .single();

    const { data: helperAppointment, error } = await admin
      .from("appointments")
      .insert({
        salon_id: salonId,
        client_id: helperClient!.id,
        service_id: serviceId,
        appointment_date: appointmentDate,
        start_time: "11:00:00",
        end_time: "11:30:00",
        status: "confirmed",
        source: "salon",
        price_cents: 0,
        staff_id: staffId,
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    helperAppointmentId = helperAppointment!.id;

    const apiContext = await playwrightRequest.newContext({ baseURL: BASE_URL });

    const conflictRes = await apiContext.post("/api/reservation/book", {
      data: {
        phone: TEST_PHONE,
        firstName: "Test",
        lastName: "E2E",
        serviceId,
        appointmentDate,
        startTime: "11:00",
        staffId,
      },
    });

    expect(conflictRes.status()).toBe(409);

    const freeRes = await apiContext.post("/api/reservation/book", {
      data: {
        phone: TEST_PHONE,
        firstName: "Test",
        lastName: "E2E",
        serviceId,
        appointmentDate,
        startTime: "15:00",
        staffId,
      },
    });

    expect(freeRes.ok()).toBeTruthy();
    const freeJson = await freeRes.json();
    expect(freeJson.appointmentId).toBeTruthy();

    await apiContext.dispose();
  });
});

// Parcours UI complet — confirme que le refactor des fetchs (booking-options,
// busy-appointments étendu) n'a rien cassé sur le chemin normal.
test.describe("Réservation publique — parcours UI", () => {
  let admin: ReturnType<typeof createAdminClient>;
  let salonId: string;

  test.beforeAll(async () => {
    admin = createAdminClient();
    salonId = await getSalonTestId(admin);
  });

  test.afterEach(async () => {
    await deleteClientByPhone(admin, salonId, TEST_PHONE);
  });

  test("service → date → créneau → confirmation", async ({ page }) => {
    await page.goto("/reservation");

    const firstService = page.locator("button:has(h3)").first();
    await expect(firstService).toBeVisible({ timeout: 15_000 });
    await firstService.click();

    const calendarDayButtons = page.locator('div[class*="grid-cols-7"] button:not([disabled])');
    await expect(calendarDayButtons.first()).toBeVisible({ timeout: 15_000 });

    const dayCount = await calendarDayButtons.count();
    let booked = false;

    for (let i = 0; i < Math.min(dayCount, 10) && !booked; i++) {
      await calendarDayButtons.nth(i).click();

      if (!(await waitForAnySlot(page))) continue;

      await page.locator('div[class*="grid-cols-3"] button:not([disabled])').first().click();

      await page.getByLabel("Prénom").fill("Test");
      await page.getByLabel("Nom", { exact: true }).fill("E2E");
      await page.getByLabel("Téléphone").fill(TEST_PHONE);

      await page.getByRole("button", { name: "Confirmer le rendez-vous" }).click();
      booked = true;
    }

    expect(booked).toBeTruthy();
    await expect(page.getByText(/rendez-vous|confirm/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
