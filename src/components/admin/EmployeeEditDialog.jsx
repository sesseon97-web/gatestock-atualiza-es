import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function EmployeeEditDialog({ employee, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(employee?.name || "");
  const [pin_code, setPinCode] = useState(employee?.pin_code || "");
  const [tag_uid, setTagUid] = useState(employee?.tag_uid || "");
  const [active, setActive] = useState(employee?.active ?? true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () =>
      base44.entities.Employee.update(employee.id, { name, pin_code, tag_uid, active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", employee.client_id] });
      toast.success("Funcionário atualizado com sucesso!");
      onOpenChange(false);
    },
    onError: () => toast.error("Erro ao atualizar funcionário."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Employee.delete(employee.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", employee.client_id] });
      toast.success("Funcionário excluído.");
      onOpenChange(false);
    },
    onError: () => toast.error("Erro ao excluir funcionário."),
  });

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setConfirmDelete(false); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Funcionário</DialogTitle>
        </DialogHeader>

        {!confirmDelete ? (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="emp-name">Nome</Label>
              <Input id="emp-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-pin">Código PIN</Label>
              <Input
                id="emp-pin"
                value={pin_code}
                onChange={(e) => setPinCode(e.target.value)}
                maxLength={4}
                placeholder="4 dígitos"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-tag">UID da Tag (RFID/NFC)</Label>
              <Input
                id="emp-tag"
                value={tag_uid}
                onChange={(e) => setTagUid(e.target.value)}
                placeholder="UID da tag"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-sm font-medium">Funcionário ativo</span>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-lg bg-destructive/5 border border-destructive/20 p-4">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Excluir "{employee.name}"?
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Esta ação não pode ser desfeita. O funcionário será removido permanentemente.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {!confirmDelete ? (
            <>
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive mr-auto"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-4 h-4 mr-1" /> Excluir
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || !name.trim()}
              >
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Excluindo..." : "Excluir definitivamente"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}