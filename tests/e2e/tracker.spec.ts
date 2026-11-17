import { test, expect, type Page } from "@playwright/test";
async function nav(page: Page, name: string) {
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: new RegExp(`^${name}(?:\\s|$)`) })
    .click();
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("dialog", { name: "A little walkthrough" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Skip walkthrough" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("captures, clarifies, completes, persists, and finds an item", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Add something/ }).click();
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Send a postcard");
  await page.getByRole("button", { name: "Capture to Inbox" }).click();
  await nav(page, "Inbox");
  await page
    .getByRole("button", { name: /Send a postcard/ })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Action Something to finish" })
    .click();
  await page.getByLabel("Life area", { exact: true }).fill("Relationships");
  await page.getByRole("button", { name: "Save changes" }).click();
  await nav(page, "Overview");
  await page
    .getByRole("button", { name: "Complete Send a postcard", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("textbox", { name: "Search everything" })
    .fill("Send a postcard");
  await expect(
    page.getByRole("button", { name: "Reopen Send a postcard", exact: true }),
  ).toBeVisible();
});
test("records partial practice progress and undoes it", async ({ page }) => {
  await page
    .getByRole("button", { name: "Open Get outside for a walk", exact: true })
    .click();
  await page.getByLabel("Progress amount", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Record progress" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("10 / 30 minutes today", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo check-in" }).click();
  await expect(
    page.getByRole("dialog").getByText("0 / 30 minutes today", { exact: true }),
  ).toBeVisible();
});
test("moves an interest to Later and resurfaces it in Review", async ({
  page,
}) => {
  await page
    .getByRole("textbox", { name: "Search everything" })
    .fill("Explore The Creative Independent");
  await page
    .getByRole("button", {
      name: "Open Explore The Creative Independent",
      exact: true,
    })
    .click();
  await page.getByLabel("Commitment", { exact: true }).selectOption("later");
  await page.getByLabel("Revisit on", { exact: true }).fill("2020-01-01");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await nav(page, "Review");
  const card = page
    .locator(".review-card")
    .filter({ hasText: "Explore The Creative Independent" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Make active", exact: true }).click();
  await expect(card).not.toBeVisible();
});
test("walkthrough can be replayed and full guide is available", async ({
  page,
}) => {
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("button", { name: "A little walkthrough", exact: true })
    .click();
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "Next little step" }).click();
  await page
    .getByRole("button", { name: "Make yourself at home", exact: true })
    .click();
  await page.goto("/guide");
  await expect(
    page.getByRole("heading", { name: "01. Start with what’s on your mind." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "07. Try things out in the local demo.",
    }),
  ).toBeVisible();
});
test("narrow layouts have no horizontal page overflow", async ({ page }) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
