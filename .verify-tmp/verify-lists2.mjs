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
    const element =
      anchor?.nodeType === 3 ? anchor.parentElement : anchor instanceof Element ? anchor : null;
    return {
      anchorText: anchor?.nodeType === 3 ? anchor.textContent : anchor?.nodeName,
      collapsed: sel?.isCollapsed,
      inList: Boolean(element?.closest("li")),
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
  const read = async (label, button) => {
    await page.waitForTimeout(150);
    out[label] = {
      html: await editor.innerHTML(),
      pressed: await button.getAttribute("aria-pressed"),
      selection: await selInfo(),
    };
  };

  await editor.click();
  await page.keyboard.type("Poin satu");

  await bullet.click();
  await read("bulletOn", bullet);

  await bullet.click();
  await read("bulletOff", bullet);

  await ordered.click();
  await read("orderedOn", ordered);

  await ordered.click();
  await read("orderedOff", ordered);

  // Select just the text via keyboard, then apply a list.
  await page.keyboard.press("Control+A");
  out.selectedAll = await selInfo();
  await bullet.click();
  await read("bulletFromSelectAll", bullet);
} catch (error) {
  out.failure = String(error).slice(0, 600);
}

console.log(JSON.stringify(out, null, 1));
await browser.close();
