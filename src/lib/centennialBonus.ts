const CENTENNIAL_BONUS_USER_ID = "1f04b6ab-c06a-43a5-8090-fb3a1d704521";
const CENTENNIAL_BONUS_EMAIL = "bansalmittalassociates@gmail.com";

export const CENTENNIAL_BONUS_PLAN_TYPE = "bonus_free_basic";
export const CENTENNIAL_BONUS_CREDITS = 50;

type BonusUserInput = {
  id?: string | null;
  email?: string | null;
};

export const isCentennialBonusUser = (input?: BonusUserInput | null): boolean => {
  const id = (input?.id ?? "").trim().toLowerCase();
  const email = (input?.email ?? "").trim().toLowerCase();
  return id === CENTENNIAL_BONUS_USER_ID || email === CENTENNIAL_BONUS_EMAIL;
};

export const getCentennialBonusSeenKey = (userId: string) =>
  `banklefy:centennial-bonus-seen:${userId}`;
