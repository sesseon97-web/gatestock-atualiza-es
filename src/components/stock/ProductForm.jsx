import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";

const UNITS = ["unidade", "caixa", "pacote", "litro", "kg"];

export default function ProductForm({ product, onClose }) {
  const [form, setForm] = useState({
    name: product?.name || "",
    code: product?.code || "",
    category: product?.category || "Outros",
    unit: product?.unit || "unidade",
    manufacturer_name: product?.manufacturer_name || "",
    manufacturer_code: product?.manufacturer_code || "",
    image_url: product?.image_url || "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

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
    mutation.mutate({ ...form });
  };

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update("image_url", file_url);
    setUploadingImage(false);
  };

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
          <Label>Nome do Fabricante</Label>
          <Input value={form.manufacturer_name} onChange={(e) => update("manufacturer_name", e.target.value)} placeholder="Ex: Bosch" className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>Código do Fabricante</Label>
          <Input value={form.manufacturer_code} onChange={(e) => update("manufacturer_code", e.target.value)} placeholder="Ex: BOS-4521" className="rounded-xl" />
        </div>
      </div>
      {/* Foto do produto */}
      <div className="space-y-2">
        <Label>Foto do Produto</Label>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        {form.image_url ? (
          <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border">
            <img src={form.image_url} alt="Produto" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => update("image_url", "")}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ImagePlus className="w-6 h-6" />
            <span className="text-xs">{uploadingImage ? "Enviando..." : "Clique para adicionar foto"}</span>
          </button>
        )}
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