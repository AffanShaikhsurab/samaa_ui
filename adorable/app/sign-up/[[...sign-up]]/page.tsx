import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <SignUp
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
