import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        {description}
      </p>
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}

export function NoChatEmptyState() {
  const router = useRouter();

  return (
    <EmptyState
      title="No conversations yet"
      description="Start messaging with friends, colleagues, or create a new group chat."
      icon={<MessageSquare size={48} />}
      action={{
        label: "Start a new conversation",
        onClick: () => router.push("/chat/new"),
      }}
    />
  );
}
