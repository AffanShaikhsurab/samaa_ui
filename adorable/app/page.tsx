import { redirect } from "next/navigation";

export default function Home() {
  // Default to Flutter builder - redirect to /flutter
  redirect("/flutter");
}
