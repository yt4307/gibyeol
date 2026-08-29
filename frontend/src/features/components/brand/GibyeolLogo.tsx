"use client";

import Image from "next/image";

export type GibyeolLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function GibyeolLogo({ size = 36, className, priority = false }: GibyeolLogoProps) {
  return (
    <Image
      className={className}
      src="/brand/gibyeol-logo.svg"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      priority={priority}
      style={{ width: size, height: "auto" }}
    />
  );
}
