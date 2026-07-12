"use client";

import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";

interface LocaleProviderProps {
  children: React.ReactNode;
  locale: string;
  messages: Record<string, unknown>;
}

export function LocaleProvider({
  children,
  locale,
  messages,
}: LocaleProviderProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

export async function getLocaleData(locale: string) {
  const messages = await getMessages({ locale });
  return { locale, messages };
}