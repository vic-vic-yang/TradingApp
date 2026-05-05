import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Canonical English tier → UI label (Chinese). */
const EN_TO_ZH: Record<string, string> = {
  Buy: "买入",
  Overweight: "增持",
  Hold: "持有",
  Underweight: "减持",
  Sell: "卖出",
};

const ZH_TO_EN: Record<string, string> = {
  买入: "Buy",
  增持: "Overweight",
  持有: "Hold",
  减持: "Underweight",
  卖出: "Sell",
};

const POSITIVE = new Set(["Buy", "Overweight"]);
const NEGATIVE = new Set(["Sell", "Underweight"]);
const NEUTRAL = new Set(["Hold"]);

function toCanonicalEnglish(rating: string): string | undefined {
  const t = rating.trim();
  if (t in EN_TO_ZH) return t;
  if (t in ZH_TO_EN) return ZH_TO_EN[t];
  return undefined;
}

export function RatingBadge({
  rating,
  className,
}: {
  rating: string | null | undefined;
  className?: string;
}) {
  if (!rating?.trim()) {
    return (
      <Badge variant="outline" className={cn("font-normal", className)}>
        —
      </Badge>
    );
  }
  const raw = rating.trim();
  const canon = toCanonicalEnglish(raw);
  const variant = canon
    ? POSITIVE.has(canon)
      ? "default"
      : NEGATIVE.has(canon)
        ? "destructive"
        : NEUTRAL.has(canon)
          ? "secondary"
          : "outline"
    : "outline";
  const label = canon ? (EN_TO_ZH[canon] ?? raw) : raw;

  return (
    <Badge variant={variant} className={cn("font-medium", className)}>
      {label}
    </Badge>
  );
}
