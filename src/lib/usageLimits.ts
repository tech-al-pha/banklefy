export const DEFAULT_ANON_DAILY_PAGES = 2;
export const DEFAULT_AUTH_DAILY_PAGES = 5;

export const getDefaultDailyLimit = (isAuthenticated: boolean) =>
  isAuthenticated ? DEFAULT_AUTH_DAILY_PAGES : DEFAULT_ANON_DAILY_PAGES;
