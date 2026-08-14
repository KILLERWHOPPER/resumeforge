"use client";

import { redirect, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function Home() {
  const router = useRouter();
  const t = useTranslations("common");

  // Redirect to dashboard or login
  router.push("/dashboard");
  return null;
}