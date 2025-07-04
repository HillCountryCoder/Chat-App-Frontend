// Helper function to convert duration strings to cookie expiry days
export const getExpiryDays = (duration: string): number => {
  if (duration === "15m") return 1 / 24 / 4; // 15 minutes in days (0.0104 days)
  if (duration === "7d") return 7;
  if (duration === "30d") return 30;
  return 1; // Default fallback
};
