export const ACCESS_MODES = [
  {
    id: "open",
    label: "Anyone with the link",
    short: "Open link",
    description: "Guests can open, watch and download permitted files immediately.",
  },
  {
    id: "email",
    label: "Email before download",
    short: "Email gate",
    description: "Guests browse freely and share an email before their first download.",
  },
  {
    id: "invite",
    label: "Invited email only",
    short: "Invite only",
    description: "Approved emails unlock the gallery with a one-time code.",
  },
  {
    id: "password",
    label: "Gallery password",
    short: "Password",
    description: "Guests enter the studio's shared password to unlock the gallery.",
  },
] as const;

export type AccessMode = (typeof ACCESS_MODES)[number]["id"];

export function accessModeMeta(mode: string) {
  return ACCESS_MODES.find((m) => m.id === mode) ?? ACCESS_MODES[0];
}
