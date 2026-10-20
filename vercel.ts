import type { VercelConfig } from "@vercel/config/v1";

// No ignoreCommand: the README-update workflow commits after every merge, and a
// "skip docs-only changes" rule then cancelled every deploy.
export const config: VercelConfig = {
  trailingSlash: false,
};
