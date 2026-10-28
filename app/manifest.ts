import type { MetadataRoute } from "next";

import { APP_NAME } from "@/config";

// Lets learners add Faqih to their home screen. On iPhone, web push (the
// daily wird reminder) only works for sites added to the home screen.
const manifest = (): MetadataRoute.Manifest => ({
  name: `${APP_NAME} | فقيه`,
  short_name: APP_NAME,
  description: "Learn the Quran, a few minutes a day.",
  start_url: "/learn",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#1b3a6b",
  icons: [{ src: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
});

export default manifest;
