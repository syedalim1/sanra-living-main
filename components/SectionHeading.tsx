interface SectionHeadingProps {
  badge?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  as?: "h1" | "h2";
}

export default function SectionHeading({
  badge,
  title,
  subtitle,
  align = "center",
  as: Heading = "h2",
}: SectionHeadingProps) {
  return (
    <div className="sanra-page-heading" data-align={align} data-level={Heading}>
      {badge && <span className="sanra-label">{badge}</span>}
      <Heading>{title}</Heading>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
