import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, Moon, Rss, Search, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";

import { SITE } from "@/lib/posts";

const NAV = [
  { to: "/blog/", label: "Blog" },
  { to: "/categories/", label: "Categories" },
  { to: "/tags/", label: "Tags" },
  { to: "/about/", label: "About" },
] as const;

/** Runs before paint (inlined in <head>) so the saved theme never flashes. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(!t)t="dark";document.documentElement.classList.toggle("dark",t==="dark");document.documentElement.style.colorScheme=t}catch(e){}})()`;

function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* storage unavailable: theme still applies for this visit */
    }
    setDark(next);
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="icon-btn"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title="Toggle theme"
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  useEffect(() => setOpen(false), [pathname]);

  // "/" jumps to search from anywhere, unless the user is typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      void navigate({ to: "/search/" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <header className="border-b border-border">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="container-wide flex h-16 items-center justify-between gap-4">
        <Link to="/" className="text-base font-semibold text-foreground">
          kevin<span className="text-accent">x</span>sec
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="nav-link"
              activeProps={{ "aria-current": "page" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Link to="/search/" className="icon-btn" aria-label="Search articles" title="Search (/)">
            <Search size={17} />
          </Link>
          <ThemeToggle />
          <button
            type="button"
            className="icon-btn md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="container-wide flex flex-col pb-4 md:hidden"
        >
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="nav-link py-2"
              activeProps={{ "aria-current": "page" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="container-wide flex flex-col gap-3 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          © 2026&nbsp;kevinxsec. Written for authorised, educational use.
        </p>
        <div className="flex items-center gap-4">
          <a href={SITE.github} className="link-quiet" rel="me noopener" target="_blank">
            GitHub
          </a>
          <a href="/rss.xml" className="link-quiet inline-flex items-center gap-1">
            <Rss size={14} /> RSS
          </a>
          <a href="/sitemap.xml" className="link-quiet">
            Sitemap
          </a>
        </div>
      </div>
    </footer>
  );
}
