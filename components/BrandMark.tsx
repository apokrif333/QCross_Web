import Image from "next/image";
import Link from "next/link";

type BrandMarkProps = {
  variant?: "wordmark" | "square";
};

export function BrandMark({ variant = "wordmark" }: BrandMarkProps) {
  const isSquare = variant === "square";

  return (
    <Link className={`brand-mark${isSquare ? " brand-mark--square" : ""}`} href="/" aria-label="Quantum Cross Management — главная">
      <Image
        className="brand-mark__image"
        src={isSquare ? "/images/qcm-square-logo.png" : "/images/qcm-left-logo-current.png"}
        alt=""
        width={isSquare ? 1270 : 2172}
        height={isSquare ? 1239 : 724}
        priority
      />
    </Link>
  );
}
