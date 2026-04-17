import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <SignIn
        appearance={{
          elements: {
            formButtonPrimary: "bg-slate-900 hover:bg-slate-700 text-sm",
            card: "shadow-xl rounded-2xl",
          },
        }}
      />
    </div>
  );
}
