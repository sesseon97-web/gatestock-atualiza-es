import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package } from "lucide-react";

export default function ProductSelector({ value, onChange, filterFn }) {
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const filtered = filterFn ? products.filter(filterFn) : products;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-12 rounded-xl">
        <SelectValue placeholder="Selecione um produto" />
      </SelectTrigger>
      <SelectContent>
        {filtered.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span>{p.name}</span>
              <span className="text-muted-foreground text-xs">({p.quantity || 0} {p.unit || "un."})</span>
            </div>
          </SelectItem>
        ))}
        {filtered.length === 0 && (
          <div className="px-4 py-3 text-sm text-muted-foreground">Nenhum produto encontrado</div>
        )}
      </SelectContent>
    </Select>
  );
}