// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Metadata } from "next";
import Link from "next/link";
import { getCaseStudy } from "@/app/lib/project-case-studies";
import "@/app/styles/project-directory.css";

export const metadata: Metadata = {
  title: "Projects | Sam Bai",
  description: "Products, web applications, and developer tools by Sam Bai. Visit the websites and read about the engineering decisions behind them.",
  alternates: { canonical: "/work" },
  openGraph: { title: "Projects | Sam Bai", description: "The work and the thinking behind it.", url: "/work" },
};

const groups = [
  {
    title: "Products & web apps",
    id: "products",
    entries: [
      { slug: "trekky", status: "Live product", action: "Visit Trekky" },
      { slug: "entangle", status: "Research tool", action: "Open Entangle" },
    ],
  },
  {
    title: "Open-source tools",
    id: "tools",
    entries: [
      { slug: "rookhold", status: "Execution infrastructure", action: "Website & docs" },
      { slug: "portly", status: "Developer tools", action: "Source & downloads" },
      { slug: "agentscope", status: "Runtime observability", action: "Source & downloads" },
    ],
  },
];

export default function WorkPage() {
  return (
    <div className="work-directory">
      <a className="skip-link" href="#work-content">Skip to projects</a>
      <header className="work-directory-header">
        <Link href="/" prefetch={false}>← Back to site</Link>
        <Link className="work-directory-name" href="/" prefetch={false}>Sam Bai</Link>
        <a href="mailto:sambai.codes@gmail.com">Get in touch ↗</a>
      </header>
      <main id="work-content">
        <section className="work-directory-intro">
          <p className="work-directory-label">Selected work</p>
          <h1>The work.<br />The thinking behind it.</h1>
          <p>I build products and the tools that help them work. Here are the websites, the code I can share, and the decisions behind each project.</p>
          <nav aria-label="Project categories">
            <a href="#products">Products &amp; web apps ↓</a>
            <a href="#tools">Open-source tools ↓</a>
          </nav>
        </section>
        {groups.map((group) => (
          <section className="work-directory-group" id={group.id} key={group.id} aria-labelledby={`${group.id}-title`}>
            <h2 id={`${group.id}-title`}>{group.title}</h2>
            <ul>
              {group.entries.map((entry) => {
                const project = getCaseStudy(entry.slug);
                if (!project) return null;
                const website = project.links[0];
                return (
                  <li className="work-directory-project" key={entry.slug}>
                    <div className="work-directory-project-name">
                      <h3><Link href={`/work/${entry.slug}`} prefetch={false}>{project.title}</Link></h3>
                      <p>{entry.status}</p>
                    </div>
                    <div className="work-directory-project-detail">
                      <p>{project.summary}</p>
                      <nav aria-label={`${project.title} destinations`}>
                        {website && <a href={website.href} target="_blank" rel="noopener noreferrer">{entry.action} <span aria-hidden="true">↗</span></a>}
                        <Link href={`/work/${entry.slug}`} prefetch={false}>Read project notes <span aria-hidden="true">→</span></Link>
                      </nav>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        <p className="work-directory-colophon">This website is a project too. <Link href="/work/baios" prefetch={false}>Read about BaiOS →</Link></p>
      </main>
      <footer className="work-directory-footer">
        <a href="mailto:sambai.codes@gmail.com">sambai.codes@gmail.com ↗</a>
        <a href="https://github.com/sambai-dev" target="_blank" rel="noopener noreferrer">More on GitHub ↗</a>
      </footer>
    </div>
  );
}
