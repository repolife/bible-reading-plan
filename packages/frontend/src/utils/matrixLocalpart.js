export const MATRIX_SERVER = "ozark-fellowship.netlify.app";

// Mirrors server-side rules in packages/netlify/lib/matrix.ts; the server
// re-validates everything.
const LOCALPART_RE = /^[a-z0-9](?:[a-z0-9._-]{1,30})[a-z0-9]$/;
const RESERVED = ["abuse", "admin", "administrator", "bot", "help", "matrix", "mod", "moderator", "noreply", "notices", "postmaster", "provisioner", "root", "security", "server", "support", "synapse", "system", "webmaster"];

export const checkLocalpart = (value) => {
  if (!value) return "Enter a username";
  if (value !== value.toLowerCase()) return "Use lowercase letters only";
  if (!LOCALPART_RE.test(value) || /[._-]{2}/.test(value)) {
    return "3–32 characters: letters, digits, dots, dashes or underscores, starting and ending with a letter or digit";
  }
  if (value === "jared.duel") return "This account is blocked";
  if (RESERVED.includes(value)) return "This username is reserved";
  return null;
};

export const suggestLocalpart = (name) =>
  (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/[._-]{2,}/g, ".")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 32);
