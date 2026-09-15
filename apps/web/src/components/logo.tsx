import Image from "next/image";

import { cn } from "@/lib/utils";

export const Logo = ({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) => {
  return (
    <Image
      src="/logo.png"
      alt="Pluginin"
      width={138}
      height={50}
      className={cn("h-8 w-auto", className)}
      priority={priority}
    />
  );
};
