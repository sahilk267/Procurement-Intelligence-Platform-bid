import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Building2, Loader2, UserCheck, ShoppingCart, Package } from "lucide-react";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  companyName: z.string().min(2, { message: "Company name is required" }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const ROLES = [
  {
    value: "company_owner",
    label: "Admin / Buyer",
    description: "Manage tenders, bids, team members, and full platform access",
    icon: UserCheck,
    color: "border-primary bg-primary/5",
  },
  {
    value: "supplier",
    label: "Supplier",
    description: "Browse open tenders, submit bids, and manage your proposals",
    icon: Package,
    color: "border-blue-500 bg-blue-50 dark:bg-blue-950",
  },
];

export default function Register() {
  const [, setLocation] = useLocation();
  const { login: setAuth } = useAuth();
  const { toast } = useToast();
  const registerMutation = useRegister();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", companyName: "" },
  });

  function onSubmit(data: RegisterFormValues) {
    registerMutation.mutate(
      { data: { name: data.name, email: data.email, password: data.password, companyName: data.companyName } },
      {
        onSuccess: (response) => {
          setAuth(response.token, response.user);
          toast({ title: "Account created!", description: `Welcome to ProcureIntel, ${data.name}.` });
          setLocation("/dashboard");
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || "Registration failed. Email may already be in use.";
          toast({ variant: "destructive", title: "Registration failed", description: msg });
        },
      }
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="bg-primary text-primary-foreground p-3 rounded-xl mb-2 shadow-lg">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">ProcureIntel</h1>
          <p className="text-sm text-muted-foreground">Create your procurement account</p>
        </div>

        <Card className="border-border shadow-md">
          <CardHeader>
            <CardTitle>Create an account</CardTitle>
            <CardDescription>Fill in your details to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {ROLES.map((role) => (
                    <div
                      key={role.value}
                      className={`rounded-xl border-2 p-3 cursor-default ${role.color}`}
                    >
                      <role.icon className="h-5 w-5 mb-1 text-primary" />
                      <p className="text-sm font-semibold">{role.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                    </div>
                  ))}
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Rajesh Kumar" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Technologies Pvt Ltd" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@company.in" {...field} />
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
                        <Input type="password" placeholder="Min. 6 characters" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</>
                  ) : "Create Account"}
                </Button>
              </form>
            </Form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
