import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const UNITS = ["unidade", "caixa", "pacote", "litro", "kg"];

export default function ProductForm({ product, onClose }) {
  const [form, setForm] = useState({
    name: product?.name || "",
    code: product?.code || "",
    category: product?.category || "Outros",
    quantity: product?.quantity || 0,
    min_quantity: product?.min_quantity || 5,
    unit: product?.unit || "unidade",
    location: product?.location || "",
  });

  const queryClient = useQueryClient();

  const { data: categoriesData = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.Category.list("name"),
  });

  const categories = categoriesData.map((c) => c.name);

  const mutation = useMutation({
    mutationFn: (data) =>
      product
        ? base44.entities.Product.update(product.id, data)
        : base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(product ? "Produto atualizado!" : "Produto criado!");
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input value={form.name} onChange={(e) => update("name", e.target.value)} required className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>Código *</Label>
          <Input value={form.code} onChange={(e) => update("code", e.target.value)} required className="rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={form.category} onValueChange={(v) => update("category", v)}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.length === 0 && <SelectItem value="Outros">Outros</SelectItem>}
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Unidade</Label>
          <Select value={form.unit} onValueChange={(v) => update("unit", v)}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Quantidade</Label>
          <Input type="number" min={0} value={form.quantity} onChange={(e) => update("quantity", Number(e.target.value))} className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>Qtd. Mínima</Label>
          <Input type="number" min={0} value={form.min_quantity} onChange={(e) => update("min_quantity", Number(e.target.value))} className="rounded-xl" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Localização</Label>
        <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Ex: Prateleira A3" className="rounded-xl" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending} className="rounded-xl">
          {mutation.isPending ? "Salvando..." : product ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  );
}