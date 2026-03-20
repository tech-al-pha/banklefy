import { expect, test } from "@playwright/test";

type AuthUser = {
  id: string;
  email: string;
  aud: string;
  role: string;
  created_at: string;
  confirmed_at: string;
  email_confirmed_at: string;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
};

type AuthSession = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: AuthUser;
};

const EMAIL = "playwright.auth@example.com";
const PASSWORD = "Password123!";
const USER_ID = "11111111-1111-4111-8111-111111111111";

const nowIso = new Date().toISOString();

const makeUser = (email: string): AuthUser => ({
  id: USER_ID,
  email,
  aud: "authenticated",
  role: "authenticated",
  created_at: nowIso,
  confirmed_at: nowIso,
  email_confirmed_at: nowIso,
  user_metadata: { full_name: "Playwright User" },
  app_metadata: { provider: "email", providers: ["email"] },
});

const makeSession = (email: string, prefix: string): AuthSession => ({
  access_token: `${prefix}-access-token`,
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: `${prefix}-refresh-token`,
  user: makeUser(email),
});

test("signs up, logs in, opens profile, and signs out in the browser", async ({ page }) => {
  let signupCalls = 0;
  let loginCalls = 0;
  let logoutCalls = 0;

  await page.route("**/auth/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    const method = route.request().method();
    const body = method === "POST" ? (route.request().postDataJSON() as Record<string, unknown>) : null;

    if (pathname.endsWith("/signup")) {
      signupCalls += 1;
      expect(body?.email).toBe(EMAIL);
      expect(body?.password).toBe(PASSWORD);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: makeUser(EMAIL),
          session: null,
        }),
      });
      return;
    }

    if (pathname.endsWith("/token") && url.searchParams.get("grant_type") === "password") {
      loginCalls += 1;
      expect(body?.email).toBe(EMAIL);
      expect(body?.password).toBe(PASSWORD);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeSession(EMAIL, "login")),
      });
      return;
    }

    if (pathname.endsWith("/logout")) {
      logoutCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  await page.route("**/functions/v1/check-usage-limit*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        conversionsUsed: 1,
        conversionsLimit: 25,
        remaining: 24,
        limitReached: false,
        isAuthenticated: true,
        planType: "monthly_pro",
      }),
    });
  });

  await page.route("**/rest/v1/subscriptions*", async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("user_id")).toBe(`eq.${USER_ID}`);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        tier: "monthly_pro",
        conversions_limit: 25,
        conversions_used: 1,
        free_daily_limit: 5,
        free_daily_used: 1,
        monthly_limit: 25,
        monthly_used: 1,
        yearly_limit: 0,
        yearly_used: 0,
        pack_limit: 0,
        pack_used: 0,
      }),
    });
  });

  await page.route("**/rest/v1/user_roles*", async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("user_id")).toBe(`eq.${USER_ID}`);
    expect(url.searchParams.get("role")).toBe("eq.admin");

    await route.fulfill({
      status: 406,
      contentType: "application/json",
      body: JSON.stringify({
        message: "No admin role found",
      }),
    });
  });

  await page.route("**/rest/v1/rpc/has_role*", async (route) => {
    const body = route.request().method() === "POST" ? (route.request().postDataJSON() as Record<string, unknown>) : null;
    expect(body?._user_id).toBe(USER_ID);
    expect(body?._role).toBe("admin");

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(false),
    });
  });

  await page.route("**/rest/v1/profiles*", async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("id")).toBe(`eq.${USER_ID}`);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        full_name: "Playwright User",
        avatar_url: null,
      }),
    });
  });

  await page.route("**/rest/v1/conversions*", async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("user_id")).toBe(`eq.${USER_ID}`);

    if (route.request().method() === "HEAD") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "content-range": "0-0/7",
        },
        body: "",
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "content-range": "0-0/7",
      },
      body: JSON.stringify([]),
    });
  });

  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: "Banklefy" })).toBeVisible();

  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("checkbox", { name: "I agree to the Terms & Conditions" }).check();
  await page.getByRole("button", { name: "Sign Up", exact: true }).click();

  await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('input[name="email"]')).toHaveValue(EMAIL);

  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  await expect(page.getByRole("button", { name: "Profile", exact: true })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Profile", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Sign Out", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign Out", exact: true }).click();

  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('input[name="email"]')).toHaveValue(EMAIL);

  expect(signupCalls).toBe(1);
  expect(loginCalls).toBe(1);
  expect(logoutCalls).toBe(1);
});
