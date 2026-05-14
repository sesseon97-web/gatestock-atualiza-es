import { cn } from "@/lib/utils";

export default function StatsCard({ title, value, icon: Icon, accent }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-2 text-foreground">{value}</p>
        </div>
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          accent === "primary" && "bg-primary/10 text-primary",
          accent === "accent" && "bg-accent/10 text-accent",
          accent === "destructive" && "bg-destructive/10 text-destructive",
          accent === "success" && "bg-green-500/10 text-green-600"
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}