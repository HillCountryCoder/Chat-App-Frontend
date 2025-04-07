import { format, isToday, isYesterday, isThisWeek } from "date-fns";

interface MessageDateProps {
  date: string | Date;
}

export default function MessageDate({ date }: MessageDateProps) {
  const messageDate = new Date(date);
  if (isToday(messageDate)) {
    return (
      <div className="text-center text-xs text-muted-foreground my-4">
        Today
      </div>
    );
  }

  if (isYesterday(messageDate)) {
    return (
      <div className="text-center text-xs text-muted-foreground my-4">
        Yesterday
      </div>
    );
  }

  if (isThisWeek(messageDate)) {
    return (
      <div className="text-center text-xs text-muted-foreground my-4">
        {format(messageDate, "EEEE")}
      </div>
    );
  }

  return (
    <div className="text-center text-xs text-muted-foreground my-4">
      {format(messageDate, "MMMM d, yyyy")}
    </div>
  );
}
