import Link from "next/link";

const navLinks = [
  { href: "/jobs", label: "Jobs" },
  { href: "/remote-jobs", label: "Remote Jobs" },
  { href: "/companies", label: "Companies" },
  { href: "/about", label: "About" },
];

export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-blue-700">
          HUNTARA
        </Link>
        <nav className="hidden gap-6 sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-700 hover:text-blue-700"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
