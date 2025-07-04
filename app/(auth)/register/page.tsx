"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RegisterFormData, registerSchema } from "@/lib/validators";
import { useRegister } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { ApiErrorDisplay } from "@/components/api-error";
import { getPasswordStrength } from "@/utils/passwordStrength";
import { ErrorCodes } from "@/lib/errors";
import PasswordStrengthMeter from "@/components/passwordStrengthMeter";

export default function RegisterPage() {
  const router = useRouter();
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const register = useRegister();
  const [passwordStrength, setPasswordStrength] = useState(0);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register.mutateAsync(data);
      router.push("/chat");
    } catch (error) {
      // Error is handled by the mutation and will be available in register.error
      console.error("Registration failed", error);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handlePasswordChange = (value: string) => {
    setPasswordStrength(getPasswordStrength(value));
  };

  // Define custom error actions for specific error types
  const getErrorActions = () => {
    if (!register.error) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((register.error as any).code === ErrorCodes.CONFLICT) {
      return (
        <Button variant="outline" size="sm" asChild className="mt-2">
          <Link href="/login">Go to Login</Link>
        </Button>
      );
    }

    return null;
  };

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
      </div>

      {/* Display API errors */}
      {register.error && (
        <ApiErrorDisplay
          error={register.error}
          className="mb-4"
          actions={getErrorActions()}
        />
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="given-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="family-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input type="email" {...field} autoComplete="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="username" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      {...field}
                      className="pr-10"
                      onChange={(e) => {
                        field.onChange(e);
                        handlePasswordChange(e.target.value);
                      }}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      onClick={togglePasswordVisibility}
                      tabIndex={-1}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={16} className="text-muted-foreground" />
                      ) : (
                        <Eye size={16} className="text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
                <div className="mt-2">
                  <PasswordStrengthMeter strength={passwordStrength} />
                </div>
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(!!checked)}
              />
              <label
                htmlFor="remember"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Remember me
              </label>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              form.formState.isSubmitting ||
              register.isPending ||
              !form.formState.isDirty ||
              passwordStrength < 3 // Require at least a "fair" password
            }
          >
            {register.isPending ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Account...</span>
              </div>
            ) : (
              "CREATE ACCOUNT"
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-6 text-center text-sm">
        <p className="text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </>
  );
}
