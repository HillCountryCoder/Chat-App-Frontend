import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Keep the exhaustive-deps rule but allow some flexibility
      "react-hooks/exhaustive-deps": "warn", // Change from error to warning
      
      // Allow explicit any in specific cases (like rich text editor)
      "@typescript-eslint/no-explicit-any": "warn",
      
    },
  },
];

export default eslintConfig;
