type Props = { name: string; tone?: "ivoire" | "prune"; size?: number; className?: string };
export default function Picto({ name, tone = "ivoire", size = 24, className = "" }: Props) {
  const file = tone === "prune" ? `${name}-prune` : name;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/img/pictos/${file}.svg`} alt="" aria-hidden="true" width={size} height={size} className={className} />;
}
