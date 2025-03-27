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
import { Eye, EyeOff } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { getPasswordStrength } from "@/utils/passwordStrength";
import PasswordStrengthMeter from "@/components/PasswordStrengthMeter";
import { ApiErrorDisplay } from "@/components/api-error";

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
      router.push("/"); // Redirect to home page after successful registration
    } catch (error) {
      // Error is handled by the mutation
      console.error("Registration failed", error);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  const handlePasswordChange = (value: string) => {
    setPasswordStrength(getPasswordStrength(value));
  };
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
      </div>

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
                    <Input {...field} />
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
                    <Input {...field} />
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
                  <Input type="email" {...field} />
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
                  <Input {...field} />
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
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      onClick={togglePasswordVisibility}
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

          {register.error && <ApiErrorDisplay error={register.error} />}

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
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              form.formState.isSubmitting ||
              register.isPending ||
              form.formState.isDirty === false
            }
          >
            {form.formState.isSubmitting || register.isPending
              ? "Creating Account..."
              : "CREATE ACCOUNT"}
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
