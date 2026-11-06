import { chromium } from "playwright-core";

const BASE = "http://localhost:3000";
const TABLE = `${BASE}/app/tables/tbl_c5f868a0466f4b25`;
const out = {};

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

const selInfo = () =>
  page.evaluate(() => {
    const sel = window.getSelection();
    const anchor = sel?.anchorNode;
    return {
      activeTag: document.activeElement?.className || document.activeElement?.tagName,
      anchor: anchor?.nodeType === 3 ? `#text:${anchor.textContent}` : anchor?.nodeName,
      offset: sel?.anchorOffset,
      collapsed: sel?.isCollapsed,
      inList: Boolean(anchor && (anchor.parentElement?.closest("li") || anchor.closest?.("li"))),
    };
  });

try {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "admin@demo.id");
  await page.fill("#password", "Admin1234!");
  await Promise.all([page.waitForURL("**/app"), page.click("button[type=submit]")]);
  await page.goto(TABLE, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: /Data/ }).click();
  await page.getByRole("button", { name: "Baris", exact: true }).click();

  const dialog = page.getByRole("dialog");
  const editor = dialog.locator(".tiptap");
  await editor.waitFor({ state: "visible" });

  const bullet = dialog.getByRole("button", { name: "List tak berurut", exact: true });
  const ordered = dialog.getByRole("button", { name: "List berurut", exact: true });
  const html = () => editor.innerHTML();
  const read = async (label) => {
    await page.waitForTimeout(150);
    out[label] = {
      html: await html(),
      pressed: await bullet.getAttribute("aria-pressed"),
      selection: await selInfo(),
    };
  };

  await editor.click();
  await page.keyboard.type("Baris satu");
  await page.keyboard.press("Control+A");
  await read("beforeBullet");

  await bullet.click();
  await read("afterBullet1");

  await bullet.click();
  await read("afterBullet2");

  await bullet.click();
  await read("afterBullet3");

  // Ordered list on fresh content in a reopened dialog.
  await dialog.getByRole("button", { name: "Batal", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Baris", exact: true }).click();
  const dialog2 = page.getByRole("dialog");
  const editor2 = dialog2.locator(".tiptap");
  await editor2.waitFor({ state: "visible" });
  await editor2.click();
  await page.keyboard.type("Poin satu");
  await page.keyboard.press("Control+A");
  const ordered2 = dialog2.getByRole("button", { name: "List berurut", exact: true });
  await ordered2.click();
  await page.waitForTimeout(150);
  out.ordered1 = {
    html: await editor2.innerHTML(),
    pressed: await ordered2.getAttribute("aria-pressed"),
    selection: await selInfo(),
  };
} catch (error) {
  out.failure = String(error).slice(0, 600);
}

console.log(JSON.stringify(out, null, 1));
await browser.close();
