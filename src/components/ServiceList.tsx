import { servicesByCategory, formatDuration, formatPrice } from "@/data/services";
import { categories } from "@/data/categories";

type Props = { categoryId: string; limit?: number; showTitle?: boolean };

export default function ServiceList({ categoryId, limit, showTitle = true }: Props) {
  const cat = categories.find((c) => c.id === categoryId);
  let list = servicesByCategory(categoryId);
  if (limit) list = list.slice(0, limit);
  return (
    <div className="services" data-fade>
      {showTitle && cat && <div className="lb services__cat">{cat.name}</div>}
      <ul className="services__list">
        {list.map((s) => {
          const price = formatPrice(s.priceCents);
          return (
            <li key={s.id} className="services__row">
              <span className="bod services__name">{s.name}</span>
              <span className="lb services__meta">
                {formatDuration(s.durationMin)}
                {price ? ` · ${price}` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
