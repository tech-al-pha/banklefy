import { useEffect, useMemo, useState } from "react";
import { Gift, Sparkles, Trophy } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CENTENNIAL_BONUS_CREDITS,
  getCentennialBonusSeenKey,
  isCentennialBonusUser,
} from "@/lib/centennialBonus";

const balloonPalette = [
  "from-[#ffd76a] to-[#ff9f43]",
  "from-[#7cf7c5] to-[#2ed1a2]",
  "from-[#8ec5ff] to-[#4f8cff]",
  "from-[#ff9ad5] to-[#ff5ca8]",
];

export const CentennialBonusDialog = () => {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  const isEligible = isCentennialBonusUser({
    id: user?.id,
    email: user?.email,
  });

  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        id: index,
        left: `${6 + index * 5}%`,
        delay: `${(index % 6) * 0.18}s`,
        duration: `${3.4 + (index % 4) * 0.3}s`,
        rotate: `${(index % 2 === 0 ? 1 : -1) * (10 + index * 3)}deg`,
      })),
    [],
  );

  useEffect(() => {
    if (loading || !user || !isEligible) return;

    try {
      const seenKey = getCentennialBonusSeenKey(user.id);
      if (localStorage.getItem(seenKey) === "1") return;
      localStorage.setItem(seenKey, "1");
      setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [isEligible, loading, user]);

  if (!user || !isEligible) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="overflow-hidden border border-white/15 bg-[#120f0d] p-0 text-white shadow-[0_35px_120px_rgba(0,0,0,0.62)] sm:max-w-[640px]"
        fallbackTitle="Congratulations"
        fallbackDescription="Bonus credits unlocked"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,215,106,0.22),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(124,247,197,0.16),_transparent_32%),linear-gradient(135deg,_rgba(255,255,255,0.04),_rgba(255,255,255,0))]" />

          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              className="pointer-events-none absolute top-0 h-4 w-2 rounded-full opacity-90"
              style={{
                left: piece.left,
                animation: `bonus-confetti ${piece.duration} ease-in-out ${piece.delay} infinite`,
                transform: `rotate(${piece.rotate})`,
                background:
                  piece.id % 4 === 0
                    ? "#ffd76a"
                    : piece.id % 4 === 1
                      ? "#7cf7c5"
                      : piece.id % 4 === 2
                        ? "#8ec5ff"
                        : "#ff8ec2",
              }}
            />
          ))}

          <div className="relative grid gap-6 px-6 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-8">
            <div className="flex items-start justify-between gap-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f6c86c]/35 bg-[#f6c86c]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffd76a]">
                <Sparkles className="h-4 w-4" />
                Celebration Bonus
              </div>
              <div className="hidden sm:flex items-center gap-3">
                {balloonPalette.map((palette, index) => (
                  <div key={palette} className="flex flex-col items-center">
                    <div
                      className={`h-14 w-11 rounded-[999px] bg-gradient-to-b ${palette} shadow-[0_18px_35px_rgba(0,0,0,0.28)]`}
                      style={{ animation: `bonus-float ${2.7 + index * 0.35}s ease-in-out ${index * 0.15}s infinite` }}
                    />
                    <div className="h-10 w-px bg-white/35" />
                  </div>
                ))}
              </div>
            </div>

            <DialogHeader className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ffd76a]/30 bg-[#ffd76a]/12 text-[#ffd76a]">
                  <Trophy className="h-7 w-7" />
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#7cf7c5]/25 bg-[#7cf7c5]/10 text-[#7cf7c5]">
                  <Gift className="h-7 w-7" />
                </div>
              </div>
              <DialogTitle className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Congratulations!
              </DialogTitle>
              <DialogDescription className="max-w-[46ch] text-base leading-7 text-white/78">
                You are our 100th user. As a thank-you, we have added{" "}
                <span className="font-bold text-[#ffd76a]">{CENTENNIAL_BONUS_CREDITS} free credits</span> to your
                account.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-[1.25fr_0.85fr] sm:p-5">
              <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                  What you unlocked
                </p>
                <p className="mt-3 text-4xl font-black text-white">{CENTENNIAL_BONUS_CREDITS}</p>
                <p className="mt-1 text-sm text-white/72">Free basic conversion credits</p>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  This bonus keeps your account on basic formats only. Premium exports and paid-only features remain
                  locked.
                </p>
              </div>

              <div className="rounded-[22px] border border-[#ffd76a]/18 bg-[linear-gradient(145deg,rgba(255,215,106,0.12),rgba(255,255,255,0.03))] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ffd76a]">Formats included</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-semibold text-white">
                    XLSX
                  </span>
                  <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-semibold text-white">
                    CSV
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-white/68">
                  English confirmation only. No extra premium formats have been enabled for this bonus.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                className="rounded-full bg-gradient-to-r from-[#ffd76a] via-[#ffb454] to-[#ff8f57] px-6 text-black shadow-[0_18px_40px_rgba(255,180,84,0.28)] transition-transform hover:-translate-y-0.5"
                onClick={() => setOpen(false)}
              >
                Awesome, let&apos;s go
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CentennialBonusDialog;
