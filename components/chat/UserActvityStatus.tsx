import { ChevronDown } from "lucide-react";

export const UserActivityStatus = () => {
  return (
    <div className="flex items-center gap-1 rounded-full bg-activity-indicator-bg px-2 py-1 text-sm">
      <div className="bg-activity-icon h-2 w-2 rounded-full"></div>
      <span className="text-xs text-activity-text">Active</span>
      <ChevronDown className="text-activity-icon w-4 h-4" />
    </div>
  );
};
