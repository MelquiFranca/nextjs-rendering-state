import { redirect } from "next/navigation";

export default function Home() {
  redirect("/inventory?operator=A&mode=vulnerable&strategy=cached");
}
