// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Page not found | Sam Bai",
  description: "The requested sambai.dev route does not exist.",
};

export default function MissingPage() {
  notFound();
}
