import { supabase } from "@/integrations/supabase/client";

const DEFAULT_OWNER_EMAILS = ["inspirexali@gmail.com"];

const getOwnerEmailSet = (): Set<string> => {
  const envList = (import.meta.env.VITE_OWNER_EMAILS as string | undefined) ?? "";
  const envEmails = envList
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_OWNER_EMAILS, ...envEmails]);
};

export const hasAdminAccess = async (user: { id: string; email?: string | null } | null): Promise<boolean> => {
  if (!user) return false;

  const ownerEmails = getOwnerEmailSet();
  const userEmail = (user.email ?? "").trim().toLowerCase();
  if (userEmail && ownerEmails.has(userEmail)) {
    return true;
  }

  const { data: roleRow, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleError) {
    return !!roleRow;
  }

  const { data, error } = await supabase.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });

  if (error) return false;
  return !!data;
};

