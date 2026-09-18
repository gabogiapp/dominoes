---
name: vercel
description: >-
  Comprehensive guide and workflows for deploying, configuring, and troubleshooting applications on Vercel.
  Use when the user wants to deploy projects to Vercel, authenticate with the Vercel CLI, configure vercel.json,
  manage custom domains, set environment variables, or fix routing and build errors on Vercel.
---

# Vercel Deployment & Management Skill

This skill provides procedures for deploying and managing web applications on Vercel, using both the Vercel CLI and Git integration.

## 1. Authentication (`vercel login`)

Before running deployment commands from the CLI, authenticate your machine with Vercel:

```bash
vercel login
```

- Choose your login provider (**Continue with GitHub**, **Email**, or **GitLab**).
- If prompted, open the verification link in your browser or enter the security code.
- To verify active login:
  ```bash
  vercel whoami
  ```

---

## 2. Deploying a Project

### Fast Interactive Deployment (Preview)
Run from the root of your project:
```bash
vercel
```
1. **Set up and deploy?**: `Y`
2. **Which scope?**: Select your account.
3. **Link to existing project?**: `N` (for new) or `Y` (to link).
4. **What’s your project’s name?**: Choose or accept default.
5. **In which directory is your code located?**: `./`
6. **Want to modify build settings?**: `N` (Vite, Next.js, and CRA are auto-detected).

### Production Deployment
To deploy directly to your production URL:
```bash
vercel --prod
```

---

## 3. SPA Routing & Configuration (`vercel.json`)

Single-Page Applications (React, Vue, Vite, etc.) using client-side routing (`BrowserRouter`) require a rewrite rule so deep links and page refreshes don't return 404:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Place `vercel.json` in the root directory of your project.

---

## 4. Environment Variables

- Add a variable:
  ```bash
  vercel env add KEY_NAME
  ```
- Pull production or preview environment variables to `.env.local`:
  ```bash
  vercel env pull .env.local
  ```

---

## 5. Custom Domains

- Add a custom domain to a project:
  ```bash
  vercel domains add yourdomain.com
  ```
- Check DNS records and certificate status:
  ```bash
  vercel domains inspect yourdomain.com
  ```

---

## 6. Common Issues & Solutions

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `Error: No existing credentials found` | CLI is not authenticated | Run `vercel login` or deploy via web at `vercel.com/new` |
| `404 Not Found` on subpages | Missing SPA rewrite rule | Add `{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}` in `vercel.json` |
| `command not found: vercel` | CLI binary not in PATH | Run via `npx vercel` or ensure `~/.local/bin` is in `$PATH` |
| `Build failed` | Build command error | Test locally with `npm run build` first |
