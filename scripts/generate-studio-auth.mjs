import { emitKeypressEvents } from "node:readline";
import { randomBytes } from "node:crypto";
import { hashPassword, normalizedEmail } from "../lib/studioAuth.ts";

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  throw new Error("Run this setup command in an interactive terminal so the password stays hidden.");
}

const email = normalizedEmail(await ask("Owner email: "));
if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid owner email address.");
const password = await askHidden("Owner password (minimum 12 characters): ");
if (password.length < 12) throw new Error("Use a password with at least 12 characters.");
const confirmation = await askHidden("Repeat password: ");
if (password !== confirmation) throw new Error("The passwords did not match.");

const passwordHash = await hashPassword(password);
const sessionSecret = randomBytes(48).toString("base64url");
console.log("\nAdd these three server-side environment values to the Site. Do not commit them:\n");
console.log(`STUDIO_OWNER_EMAIL=${email}`);
console.log(`STUDIO_OWNER_PASSWORD_HASH=${passwordHash}`);
console.log(`STUDIO_SESSION_SECRET=${sessionSecret}`);

function ask(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.once("data", (data) => resolve(data.toString().trim()));
  });
}

function askHidden(prompt) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    emitKeypressEvents(input);
    process.stdout.write(prompt);
    let value = "";
    const priorRawMode = input.isRaw;
    input.setRawMode(true);
    input.resume();
    const cleanup = () => {
      input.off("keypress", onKeypress);
      input.setRawMode(priorRawMode ?? false);
    };
    const onKeypress = (character, key = {}) => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        process.stdout.write("\n");
        reject(new Error("Setup cancelled."));
      } else if (key.name === "return" || key.name === "enter") {
        cleanup();
        process.stdout.write("\n");
        resolve(value);
      } else if (key.name === "backspace") {
        value = value.slice(0, -1);
      } else if (!key.ctrl && !key.meta && character) {
        value += character;
      }
    };
    input.on("keypress", onKeypress);
  });
}
