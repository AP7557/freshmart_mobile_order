import Image from "next/image";
import { cn } from "@/lib/utils";

export function FMLogo({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/fm-logo.png"
        alt="Freshmart"
        width={size}
        height={size}
        className="rounded-full object-contain"
        priority
      />
      <span
        className="font-bold tracking-tight text-fm-dark"
        style={{ fontSize: size * 0.55 }}
      >
        Freshmart
      </span>
    </div>
  );
}
