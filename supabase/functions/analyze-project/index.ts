import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GHFile {
  name: string;
  path: string;
  type: string;
  download_url: string | null;
}

// Known service patterns to detect from dependencies
const SERVICE_PATTERNS: Record<string, { type: string; icon: string }> = {
  "@supabase/supabase-js": { type: "backend", icon: "database" },
  firebase: { type: "backend", icon: "flame" },
  "firebase-admin": { type: "backend", icon: "flame" },
  stripe: { type: "payment", icon: "credit-card" },
  "@stripe/stripe-js": { type: "payment", icon: "credit-card" },
  "next-auth": { type: "auth", icon: "shield" },
  "@auth0/auth0-react": { type: "auth", icon: "shield" },
  clerk: { type: "auth", icon: "shield" },
  "@clerk/nextjs": { type: "auth", icon: "shield" },
  prisma: { type: "orm", icon: "database" },
  "@prisma/client": { type: "orm", icon: "database" },
  mongoose: { type: "database", icon: "database" },
  sequelize: { type: "orm", icon: "database" },
  typeorm: { type: "orm", icon: "database" },
  drizzle: { type: "orm", icon: "database" },
  tailwindcss: { type: "styling", icon: "palette" },
  "styled-components": { type: "styling", icon: "palette" },
  sass: { type: "styling", icon: "palette" },
  axios: { type: "http", icon: "globe" },
  express: { type: "server", icon: "server" },
  fastify: { type: "server", icon: "server" },
  "socket.io": { type: "realtime", icon: "radio" },
  redis: { type: "cache", icon: "database" },
  ioredis: { type: "cache", icon: "database" },
  aws: { type: "cloud", icon: "cloud" },
  "aws-sdk": { type: "cloud", icon: "cloud" },
  "@aws-sdk/client-s3": { type: "storage", icon: "cloud" },
  resend: { type: "email", icon: "mail" },
  nodemailer: { type: "email", icon: "mail" },
  sendgrid: { type: "email", icon: "mail" },
  "@sendgrid/mail": { type: "email", icon: "mail" },
  twilio: { type: "sms", icon: "phone" },
  openai: { type: "ai", icon: "brain" },
  langchain: { type: "ai", icon: "brain" },
  "@vercel/analytics": { type: "analytics", icon: "bar-chart" },
  "react-router-dom": { type: "routing", icon: "navigation" },
  "next": { type: "framework", icon: "layers" },
  react: { type: "framework", icon: "layers" },
  vue: { type: "framework", icon: "layers" },
  svelte: { type: "framework", icon: "layers" },
  vite: { type: "build", icon: "zap" },
  webpack: { type: "build", icon: "package" },
  jest: { type: "testing", icon: "check-circle" },
  vitest: { type: "testing", icon: "check-circle" },
  cypress: { type: "testing", icon: "check-circle" },
  playwright: { type: "testing", icon: "check-circle" },
  docker: { type: "devops", icon: "container" },
  sentry: { type: "monitoring", icon: "alert-triangle" },
  "@sentry/react": { type: "monitoring", icon: "alert-triangle" },
};

// Known env var patterns
const ENV_PATTERNS: Record<string, string> = {
  SUPABASE: "Supabase",
  FIREBASE: "Firebase",
  STRIPE: "Stripe",
  AWS: "AWS",
  OPENAI: "OpenAI",
  DATABASE_URL: "Database",
  REDIS: "Redis",
  SENDGRID: "SendGrid",
  TWILIO: "Twilio",
  GITHUB: "GitHub",
  GOOGLE: "Google",
  AUTH0: "Auth0",
  CLERK: "Clerk",
  VERCEL: "Vercel",
  NETLIFY: "Netlify",
  SENTRY: "Sentry",
  RESEND: "Resend",
  NEXT_PUBLIC: "Next.js Public",
  VITE_: "Vite Public",
};

async function fetchGH(url: string, token: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchFileContent(url: string, token: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3.raw",
    },
  });
  if (!res.ok) return null;
  return res.text();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get project
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (!project || project.platform !== "github" || !project.repo_url) {
      return new Response(JSON.stringify({ error: "GitHub project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get token
    const { data: profile } = await supabase
      .from("profiles")
      .select("github_token")
      .eq("user_id", user.id)
      .single();

    const token = profile?.github_token;
    if (!token) {
      return new Response(JSON.stringify({ error: "No GitHub token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const repoMatch = project.repo_url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!repoMatch) {
      return new Response(JSON.stringify({ error: "Invalid repo URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const owner = repoMatch[1];
    const repo = repoMatch[2].replace(/\.git$/, "");
    const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

    // 1. Get repo info
    const repoInfo = await fetchGH(apiBase, token);
    const links: Array<{ link_type: string; label: string; url?: string; value?: string; icon?: string }> = [];
    const services: Array<{ service_name: string; service_type: string; version?: string; config_found?: boolean; details?: Record<string, unknown> }> = [];
    const envVars: Array<{ var_name: string; var_value?: string | null; source_file: string; is_secret: boolean }> = [];

    if (repoInfo) {
      // Extract links from repo info
      links.push({ link_type: "repo", label: "GitHub Repository", url: repoInfo.html_url, icon: "github" });
      if (repoInfo.homepage) links.push({ link_type: "website", label: "אתר הפרויקט", url: repoInfo.homepage, icon: "globe" });
      if (repoInfo.has_wiki) links.push({ link_type: "wiki", label: "Wiki", url: `${repoInfo.html_url}/wiki`, icon: "book" });
      if (repoInfo.has_issues) links.push({ link_type: "issues", label: "Issues", url: `${repoInfo.html_url}/issues`, icon: "alert-circle" });
      links.push({ link_type: "info", label: "כוכבים", value: String(repoInfo.stargazers_count), icon: "star" });
      links.push({ link_type: "info", label: "Forks", value: String(repoInfo.forks_count), icon: "git-fork" });
      links.push({ link_type: "info", label: "גודל", value: `${Math.round(repoInfo.size / 1024)} MB`, icon: "hard-drive" });
      links.push({ link_type: "info", label: "ברנץ' ראשי", value: repoInfo.default_branch, icon: "git-branch" });
      if (repoInfo.license?.name) links.push({ link_type: "info", label: "רישיון", value: repoInfo.license.name, icon: "file-text" });
    }

    // 2. Get root files
    const rootFiles: GHFile[] = await fetchGH(`${apiBase}/contents`, token) || [];

    // 3. Analyze package.json
    const packageJsonFile = rootFiles.find((f) => f.name === "package.json");
    if (packageJsonFile?.download_url) {
      const content = await fetchFileContent(packageJsonFile.download_url, token);
      if (content) {
        try {
          const pkg = JSON.parse(content);
          const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

          for (const [dep, ver] of Object.entries(allDeps)) {
            const pattern = SERVICE_PATTERNS[dep];
            if (pattern) {
              services.push({
                service_name: dep,
                service_type: pattern.type,
                version: String(ver),
                config_found: true,
                details: { icon: pattern.icon },
              });
            }
          }

          // Extract scripts as useful info
          if (pkg.scripts) {
            const scriptEntries = Object.entries(pkg.scripts).slice(0, 10);
            for (const [name, cmd] of scriptEntries) {
              links.push({
                link_type: "script",
                label: `npm run ${name}`,
                value: String(cmd),
                icon: "terminal",
              });
            }
          }

          // Main fields
          if (pkg.name) links.push({ link_type: "info", label: "Package Name", value: pkg.name, icon: "package" });
          if (pkg.version) links.push({ link_type: "info", label: "גרסה", value: pkg.version, icon: "tag" });
        } catch {
          // invalid JSON
        }
      }
    }

    // 4. Look for env files (including .env itself)
    const envFileNames = [".env", ".env.example", ".env.local.example", ".env.sample", ".env.template", ".env.local", ".env.development", ".env.production"];
    for (const envFile of envFileNames) {
      const file = rootFiles.find((f) => f.name === envFile);
      if (file?.download_url) {
        const content = await fetchFileContent(file.download_url, token);
        if (content) {
          const lines = content.split("\n");
          for (const line of lines) {
            const match = line.match(/^([A-Z_][A-Z0-9_]*)(\s*=\s*(.*))?/);
            if (match) {
              const varName = match[1];
              const varValue = match[3]?.trim().replace(/^["']|["']$/g, "") || "";
              // Skip if already found with a value
              const existing = envVars.find(e => e.var_name === varName);
              if (existing) {
                if (!existing.var_value && varValue) {
                  existing.var_value = varValue;
                  existing.source_file = envFile;
                }
                continue;
              }
              envVars.push({
                var_name: varName,
                var_value: varValue || null,
                source_file: envFile,
                is_secret: !varName.startsWith("NEXT_PUBLIC") && !varName.startsWith("VITE_"),
              });
            }
          }
        }
      }
    }

    // 4b. Scan source code for Supabase and other service configs
    const codeScanFiles = [
      "src/integrations/supabase/client.ts",
      "src/lib/supabase.ts",
      "src/supabaseClient.ts",
      "src/utils/supabase.ts",
      "lib/supabase.ts",
      "utils/supabase.ts",
      "src/firebase.ts",
      "src/lib/firebase.ts",
    ];
    for (const filePath of codeScanFiles) {
      try {
        const content = await fetchFileContent(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${filePath}`, token);
        if (content) {
          // Look for URL patterns
          const urlMatches = content.matchAll(/(?:SUPABASE_URL|supabaseUrl|NEXT_PUBLIC_SUPABASE_URL|VITE_SUPABASE_URL)\s*[:=]\s*['"`]?(https?:\/\/[^'"`\s,;]+)/gi);
          for (const m of urlMatches) {
            if (!envVars.find(e => e.var_name === "SUPABASE_URL")) {
              envVars.push({ var_name: "SUPABASE_URL", var_value: m[1], source_file: filePath, is_secret: false });
            }
          }
          // Look for anon key patterns
          const keyMatches = content.matchAll(/(?:SUPABASE_ANON_KEY|SUPABASE_PUBLISHABLE_KEY|supabaseAnonKey|NEXT_PUBLIC_SUPABASE_ANON_KEY|VITE_SUPABASE_PUBLISHABLE_KEY)\s*[:=]\s*['"`]?(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/gi);
          for (const m of keyMatches) {
            if (!envVars.find(e => e.var_name.includes("ANON") || e.var_name.includes("PUBLISHABLE"))) {
              envVars.push({ var_name: "SUPABASE_ANON_KEY", var_value: m[1], source_file: filePath, is_secret: false });
            }
          }
          // Firebase config
          const firebaseMatches = content.matchAll(/apiKey\s*:\s*['"`]([^'"`]+)/gi);
          for (const m of firebaseMatches) {
            if (!envVars.find(e => e.var_name === "FIREBASE_API_KEY")) {
              envVars.push({ var_name: "FIREBASE_API_KEY", var_value: m[1], source_file: filePath, is_secret: false });
            }
          }
          const projectIdMatches = content.matchAll(/projectId\s*:\s*['"`]([^'"`]+)/gi);
          for (const m of projectIdMatches) {
            if (!envVars.find(e => e.var_name === "FIREBASE_PROJECT_ID")) {
              envVars.push({ var_name: "FIREBASE_PROJECT_ID", var_value: m[1], source_file: filePath, is_secret: false });
            }
          }
        }
      } catch {
        // File not found, skip
      }
    }

    // 5. Look for config files and extract info
    const configFiles = [
      { name: "vercel.json", service: "Vercel", type: "hosting" },
      { name: "netlify.toml", service: "Netlify", type: "hosting" },
      { name: "Dockerfile", service: "Docker", type: "devops" },
      { name: "docker-compose.yml", service: "Docker Compose", type: "devops" },
      { name: "docker-compose.yaml", service: "Docker Compose", type: "devops" },
      { name: ".github", service: "GitHub Actions", type: "ci-cd" },
      { name: "tailwind.config.ts", service: "Tailwind CSS", type: "styling" },
      { name: "tailwind.config.js", service: "Tailwind CSS", type: "styling" },
      { name: "tsconfig.json", service: "TypeScript", type: "language" },
      { name: "next.config.js", service: "Next.js", type: "framework" },
      { name: "next.config.mjs", service: "Next.js", type: "framework" },
      { name: "vite.config.ts", service: "Vite", type: "build" },
      { name: "prisma", service: "Prisma", type: "orm" },
      { name: "supabase", service: "Supabase", type: "backend" },
      { name: ".eslintrc.json", service: "ESLint", type: "linting" },
      { name: ".eslintrc.js", service: "ESLint", type: "linting" },
      { name: "eslint.config.js", service: "ESLint", type: "linting" },
      { name: ".prettierrc", service: "Prettier", type: "formatting" },
      { name: "jest.config.ts", service: "Jest", type: "testing" },
      { name: "vitest.config.ts", service: "Vitest", type: "testing" },
      { name: "playwright.config.ts", service: "Playwright", type: "testing" },
      { name: "cypress.config.ts", service: "Cypress", type: "testing" },
    ];

    for (const cfg of configFiles) {
      if (rootFiles.find((f) => f.name === cfg.name)) {
        // Avoid duplicates
        if (!services.find((s) => s.service_name === cfg.service)) {
          services.push({
            service_name: cfg.service,
            service_type: cfg.type,
            config_found: true,
          });
        }
      }
    }

    // 6. Get recent contributors
    const contributors = await fetchGH(`${apiBase}/contributors?per_page=5`, token);
    if (Array.isArray(contributors)) {
      for (const c of contributors) {
        links.push({
          link_type: "contributor",
          label: c.login,
          url: c.html_url,
          value: `${c.contributions} contributions`,
          icon: "user",
        });
      }
    }

    // 7. Get languages used
    const languages = await fetchGH(`${apiBase}/languages`, token);
    if (languages && typeof languages === "object") {
      for (const [lang, bytes] of Object.entries(languages)) {
        links.push({
          link_type: "language",
          label: lang,
          value: `${Math.round(Number(bytes) / 1024)} KB`,
          icon: "code",
        });
      }
    }

    // Clear old data and insert new
    await supabase.from("project_links").delete().eq("project_id", project_id);
    await supabase.from("project_services").delete().eq("project_id", project_id);
    await supabase.from("project_env_vars").delete().eq("project_id", project_id);

    if (links.length > 0) {
      await supabase.from("project_links").insert(
        links.map((l) => ({ ...l, project_id, user_id: user.id }))
      );
    }
    if (services.length > 0) {
      await supabase.from("project_services").insert(
        services.map((s) => ({ ...s, project_id, user_id: user.id }))
      );
    }
    if (envVars.length > 0) {
      await supabase.from("project_env_vars").insert(
        envVars.map((e) => ({ ...e, project_id, user_id: user.id }))
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        links_found: links.length,
        services_found: services.length,
        env_vars_found: envVars.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
