import { CheckSquare, Globe, AtSign, Share2, Code } from 'lucide-react';
import { usePlatform } from '@/contexts/PlatformContext';

const footerLinks = {
  product: [
    { label: 'Features', href: '#' },
    { label: 'Roadmap', href: '#' },
    { label: 'API', href: '#' },
  ],
  company: [
    { label: 'About', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Blog', href: '#' },
  ],
  legal: [
    { label: 'Privacy', href: '#' },
    { label: 'Terms', href: '#' },
    { label: 'Cookies', href: '#' },
  ],
  support: [
    { label: 'Help Center', href: '#' },
    { label: 'Community', href: '#' },
  ],
};

const socialLinks = [
  { icon: Globe, href: '#', label: 'Website' },
  { icon: AtSign, href: '#', label: 'Email' },
  { icon: Share2, href: '#', label: 'Social' },
  { icon: Code, href: '#', label: 'GitHub' },
];

export function Footer() {
  const { settings } = usePlatform();

  return (
    <footer className="bg-white dark:bg-background-dark border-t border-slate-200 dark:border-border-dark px-6 md:px-16 lg:px-24 py-20">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-10">
          {/* Logo and Description */}
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <CheckSquare className="text-primary size-8" />
              <h2 className="text-slate-900 dark:text-white text-2xl font-bold">
                {settings.site_name}
              </h2>
            </div>
            <p className="text-slate-500 dark:text-text-muted text-base leading-relaxed max-w-sm">
              The next generation of task management for high-performing teams.
              Work smarter, not harder.
            </p>
          </div>

          {/* Product Links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wider">
              Product
            </h4>
            {footerLinks.product.map((link) => (
              <a
                key={link.label}
                className="text-slate-500 dark:text-text-muted text-sm hover:text-primary transition-colors"
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Company Links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wider">
              Company
            </h4>
            {footerLinks.company.map((link) => (
              <a
                key={link.label}
                className="text-slate-500 dark:text-text-muted text-sm hover:text-primary transition-colors"
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Legal Links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wider">
              Legal
            </h4>
            {footerLinks.legal.map((link) => (
              <a
                key={link.label}
                className="text-slate-500 dark:text-text-muted text-sm hover:text-primary transition-colors"
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Support Links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wider">
              Support
            </h4>
            {footerLinks.support.map((link) => (
              <a
                key={link.label}
                className="text-slate-500 dark:text-text-muted text-sm hover:text-primary transition-colors"
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-10 border-t border-slate-200 dark:border-border-dark flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-6">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                className="text-slate-400 dark:text-text-muted hover:text-primary transition-colors"
                href={social.href}
                aria-label={social.label}
              >
                <social.icon className="size-5" />
              </a>
            ))}
          </div>
          <p className="text-slate-500 dark:text-text-muted text-sm font-normal">
            © {new Date().getFullYear()} {settings.site_name} Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
