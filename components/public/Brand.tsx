import Link from "next/link";

export default function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" className="sanra-brand" aria-label="Sanra Living home" onClick={onClick}>
      <span className="sanra-brand-mark" aria-hidden="true"><i /><i /></span>
      <span className="sanra-brand-name" aria-hidden="true">SANRA<span> LIVING</span></span>
    </Link>
  );
}
