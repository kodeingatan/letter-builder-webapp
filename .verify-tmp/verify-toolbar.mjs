import { chromium } from "playwright-core";

const BASE = "http://localhost:3000";
const TABLE = `${BASE}/app/tables/tbl_c5f868a0466f4b25`;
const results = {};
const errors = [];

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 400)}`);
});

try {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "admin@demo.id");
  await page.fill("#password", "Admin1234!");
  await Promise.all([
    page.waitForURL("**/app", { timeout: 45000 }),
    page.click("button[type=submit]"),
  ]);

  await page.goto(TABLE, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: /Data/ }).click();
  await page.getByRole("button", { name: "Baris", exact: true }).click();

  const dialog = page.getByRole("dialog");
  const editor = dialog.locator(".tiptap");
  await editor.waitFor({ state: "visible", timeout: 20000 });
  results.editorReady = true;

  await editor.click();
  await page.keyboard.type("Halo tiptap");
  results.typed = await editor.innerHTML();

  await page.keyboard.press("Control+A");
  const btn = (label) => dialog.getByRole("button", { name: label, exact: true });
  const pressed = (label) => btn(label).getAttribute("aria-pressed");

  await btn("Tebal").click();
  results.boldHtml = await editor.innerHTML();
  results.boldPressed = await pressed("Tebal");

  await btn("Miring").click();
  results.italicHtml = await editor.innerHTML();
  results.italicPressed = await pressed("Miring");

  await btn("Garis bawah").click();
  results.underlineHtml = await editor.innerHTML();
  results.underlinePressed = await pressed("Garis bawah");

  await btn("List tak berurut").click();
  results.bulletHtml = await editor.innerHTML();
  results.bulletPressed = await pressed("List tak berurut");

  await btn("List tak berurut").click();
  results.bulletOffHtml = await editor.innerHTML();
  results.bulletOffPressed = await pressed("List tak berurut");

  await btn("List berurut").click();
  results.orderedHtml = await editor.innerHTML();
  results.orderedPressed = await pressed("List berurut");

  await dialog.getByRole("button", { name: "Batal", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  results.addDialogClosed = true;

  // Edit dialog on an existing rich text cell.
  const editButton = page.getByRole("button", { name: "Edit Peraturan", exact: true }).first();
  if (await editButton.count()) {
    await editButton.click();
    const editDialog = page.getByRole("dialog");
    const editEditor = editDialog.locator(".tiptap");
    await editEditor.waitFor({ state: "visible", timeout: 20000 });
    results.editDialogOpened = (await editDialog.innerText()).includes("Edit Peraturan");
    results.editInitialEmpty = await editEditor.evaluate((el) => el.innerHTML.trim() === "<p></p>");

    await editEditor.click();
    await page.keyboard.press("Control+A");
    await editDialog.getByRole("button", { name: "Tebal", exact: true }).click();
    results.editBoldPressed = await editDialog
      .getByRole("button", { name: "Tebal", exact: true })
      .getAttribute("aria-pressed");
    await editDialog.getByRole("button", { name: "Miring", exact: true }).click();
    results.editItalicPressed = await editDialog
      .getByRole("button", { name: "Miring", exact: true })
      .getAttribute("aria-pressed");
    results.editHtml = await editEditor.innerHTML();

    await editDialog.getByRole("button", { name: "Batal", exact: true }).click();
    await editDialog.waitFor({ state: "hidden" });
    results.editDialogCancelled = true;
  } else {
    results.editDialogOpened = false;
  }
} catch (error) {
  results.failure = String(error).slice(0, 800);
}

results.errors = errors;
console.log(JSON.stringify(results, null, 1));
await browser.close();
