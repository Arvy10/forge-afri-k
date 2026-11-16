import { describe, expect, it } from "vitest";
import {
  canActOnTask,
  canAddTaskFor,
  canReassignTask,
  canWork,
  OBSERVER_REASON,
  type Actor,
} from "@/lib/permissions";
import { badgeText, relanceText, unreadLabel } from "@/lib/notifications";

const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const member: Actor = { id: ME, isAdmin: false, isObserver: false };
const observer: Actor = { id: OTHER, isAdmin: false, isObserver: true };
const admin: Actor = { id: null, isAdmin: true, isObserver: false };

describe("ajouter une tâche", () => {
  it("un membre ajoute pour lui-même (ou sans préciser)", () => {
    expect(canAddTaskFor(member, ME).ok).toBe(true);
    expect(canAddTaskFor(member, null).ok).toBe(true);
  });
  it("un membre n'ajoute PAS de tâche à quelqu'un d'autre", () => {
    const v = canAddTaskFor(member, OTHER);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/Seul l'administrateur/);
  });
  it("l'administrateur ajoute à n'importe qui", () => {
    expect(canAddTaskFor(admin, OTHER).ok).toBe(true);
    expect(canAddTaskFor(admin, null).ok).toBe(true);
  });
  it("un observateur n'ajoute rien, ni pour lui ni pour un autre", () => {
    for (const target of [OTHER, ME, null]) {
      const v = canAddTaskFor(observer, target);
      expect(v.ok).toBe(false);
      if (!v.ok) expect(v.reason).toBe(OBSERVER_REASON);
    }
  });
  it("sans avoir choisi qui on est : refusé (sauf administrateur)", () => {
    expect(canAddTaskFor({ id: null, isAdmin: false, isObserver: false }, null).ok).toBe(false);
  });
});

describe("modifier ou cocher une tâche", () => {
  it("sa propre tâche : oui", () => {
    expect(canActOnTask(member, { member_id: ME }).ok).toBe(true);
  });
  it("la tâche d'un autre ou une tâche sans responsable : non", () => {
    expect(canActOnTask(member, { member_id: OTHER }).ok).toBe(false);
    expect(canActOnTask(member, { member_id: null }).ok).toBe(false);
  });
  it("l'administrateur : toutes", () => {
    expect(canActOnTask(admin, { member_id: OTHER }).ok).toBe(true);
    expect(canActOnTask(admin, { member_id: null }).ok).toBe(true);
  });
  it("un observateur : aucune, même une tâche à son nom", () => {
    expect(canActOnTask(observer, { member_id: OTHER }).ok).toBe(false);
    expect(canActOnTask(observer, { member_id: ME }).ok).toBe(false);
  });
});

describe("réassigner, travailler", () => {
  it("seul l'administrateur réassigne", () => {
    expect(canReassignTask(admin)).toBe(true);
    expect(canReassignTask(member)).toBe(false);
    expect(canReassignTask(observer)).toBe(false);
  });
  it("un observateur ne travaille pas ; un administrateur toujours", () => {
    expect(canWork(member)).toBe(true);
    expect(canWork(observer)).toBe(false);
    expect(canWork({ ...observer, isAdmin: true })).toBe(true);
  });
});

describe("notifications", () => {
  it("libellé des messages non lus", () => {
    expect(unreadLabel(1)).toBe("1 message non lu");
    expect(unreadLabel(2)).toBe("2 messages non lus");
  });
  it("badge rouge : 1 à 9, puis 9+", () => {
    expect(badgeText(3)).toBe("3");
    expect(badgeText(10)).toBe("9+");
  });
  it("texte d'un rappel", () => {
    expect(relanceText({ titre: "Montage vidéo", late: false })).toBe(
      "Petit rappel pour « Montage vidéo ».",
    );
    expect(relanceText({ titre: "Montage vidéo", late: true })).toBe(
      "Petit rappel : « Montage vidéo » est en retard.",
    );
    expect(relanceText({ titre: "A", late: false, note: " Merci ! " })).toBe(
      "Petit rappel pour « A ». Merci !",
    );
  });
});
