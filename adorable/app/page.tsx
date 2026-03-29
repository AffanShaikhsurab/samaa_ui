import { redirect } from "next/navigation";

export default function Home() {
  // Default to Demo showcase
  redirect("/demo");
}
