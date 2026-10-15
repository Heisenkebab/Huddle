import { cn } from "@/lib/utils";

export default function PersonAvatar({
  name,
  color,
  size = 22,
  className,
  title,
}: {
  name: string;
  color: string;
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full font-bold text-white", className)}
      style={{ background: color, width: size, height: size, fontSize: Math.round(size * 0.45) }}
      title={title}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
