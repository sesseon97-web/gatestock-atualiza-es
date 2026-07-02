import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Users, User, KeyRound, Nfc } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ClientEmployees({ client }) {
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", client.id],
    queryFn: () => base44.entities.Employee.filter({ client_id: client.id }),
  });

  const activeEmployees = employees.filter((e) => e.active);

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" /> Funcionários Ativos
      </p>

      {isLoading ? (
        <div className="flex justify-center py-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : activeEmployees.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum funcionário ativo vinculado a este cliente.</p>
      ) : (
        <div className="space-y-2">
          {activeEmployees.map((emp) => (
            <div
              key={emp.id}
              className="flex items-center gap-3 bg-muted/40 rounded-xl border border-border px-3 py-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                <div className="flex items-center gap-3 flex-wrap mt-0.5">
                  {emp.pin_code && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <KeyRound className="w-3 h-3" /> PIN: {emp.pin_code}
                    </span>
                  )}
                  {emp.tag_uid && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Nfc className="w-3 h-3" /> Tag: {emp.tag_uid}
                    </span>
                  )}
                </div>
              </div>
              <Badge className="bg-green-500/10 text-green-600 text-xs">Ativo</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}