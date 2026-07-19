import * as React from "react";
import { cn } from "../../lib/utils";

const tones = {
  moss: "bg-moss/10 text-moss ring-moss/20",
  coral: "bg-coral/10 text-coral ring-coral/20",
  saffron: "bg-saffron/12 text-[#805812] ring-saffron/25",
  iris: "bg-iris/10 text-iris ring-iris/20",
  graphite: "bg-graphite/8 text-ink ring-graphite/15"
};

export function Badge({
  tone = "graphite",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold ring-1",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
