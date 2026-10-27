import { FaseEdital, faseLabels, faseColors } from "@/data/mockData";

export function StatusBadge({ status }: { status: FaseEdital }) {
  return (
    <span className={`status-badge ${faseColors[status] || 'bg-muted text-muted-foreground'}`}>
      {faseLabels[status] || status}
    </span>
  );
}
