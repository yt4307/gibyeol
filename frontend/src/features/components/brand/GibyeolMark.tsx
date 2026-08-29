"use client";

import Image from "next/image";
import styled from "@emotion/styled";

export type GibyeolMarkProps = {
  size?: number;
  variant?: "sealed" | "open";
  className?: string;
  priority?: boolean;
};

const symbolSources = {
  sealed: "/brand/gibyeol-symbol-sealed.png",
  open: "/brand/gibyeol-symbol-open.png",
} as const;

export function GibyeolMark({ size = 44, variant = "sealed", className, priority = false }: GibyeolMarkProps) {
  return (
    <Mark
      className={className}
      src={symbolSources[variant]}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      priority={priority}
    />
  );
}

const Mark = styled(Image)`
  flex: 0 0 auto;
  width: auto;
  height: auto;
  object-fit: contain;
`;
