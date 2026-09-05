// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  caseStudies,
  getCaseStudy,
} from "@/app/lib/project-case-studies";
import "@/app/styles/project-case-study.css";

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

const interfaceCaptions: Record<string, string> = {
  rookhold: "Console demo · v0.6",
  portly: "Documented README example",
  agentscope: "Simulator demo · v0.2.0",
  trekky: "Trekky light-theme sample dashboard · earlier capture, empty board",
  baios: "Actual Workbench desktop",
};

export function generateStaticParams() {
  return caseStudies.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getCaseStudy(slug);
  if (!project) notFound();

  const title = `${project.title} | Sam Bai`;
  const url = `/work/${project.slug}`;

  return {
    title,
    description: project.summary,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: project.summary,
      url,
      type: "article",
      ...(project.cover ? { images: [{ url: project.cover, alt: project.coverAlt ?? project.title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: project.summary,
      ...(project.cover ? { images: [project.cover] } : {}),
    },
  };
}

function Arrow({ direction = "up" }: { direction?: "up" | "left" | "right" }) {
  return (
    <svg
      className={`project-case-arrow project-case-arrow--${direction}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = getCaseStudy(slug);
  if (!project) notFound();

  const projectIndex = caseStudies.findIndex((item) => item.slug === project.slug);
  const nextProject = caseStudies[(projectIndex + 1) % caseStudies.length];
  const primaryLink = project.links[0];

  return (
    <div className="project-case" data-project={project.slug}>
      <a className="skip-link" href="#project-content">Skip to project</a>

      <header className="project-case-header project-case-gutter">
        <Link className="project-case-back" href="/work" prefetch={false}>
          <Arrow direction="left" />
          <span>All projects</span>
        </Link>
        <Link className="project-case-wordmark" href="/" prefetch={false}>Sam Bai</Link>
        <a className="project-case-workbench" href="mailto:sambai.codes@gmail.com">
          <span>Get in touch</span>
          <Arrow />
        </a>
      </header>

      <main id="project-content">
        <section className="project-case-hero project-case-gutter" aria-labelledby="project-title">
          <div className="project-case-kicker">
            <p>{project.eyebrow}</p>
            {project.year && <p>{project.year}</p>}
          </div>
          <h1 id="project-title">{project.title}</h1>
          <div className="project-case-hero-bottom">
            <p className="project-case-tagline">{project.tagline}</p>
            <div className="project-case-hero-actions">
              {primaryLink && (
                <a className="project-case-primary-link" href={primaryLink.href}>
                  <span>{primaryLink.label}</span>
                  <Arrow />
                </a>
              )}
              <a className="project-case-read" href="#about-project">
                <span>About the project</span>
                <Arrow direction="right" />
              </a>
            </div>
          </div>
        </section>

        {project.cover && <figure className="project-case-cover project-case-gutter">
          <div className="project-case-media-bar">
            <span>{project.title}</span>
            <span>Interface preview</span>
          </div>
          <a
            className="project-case-cover-image"
            href={project.cover}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View the ${project.title} screenshot at full size (opens in a new tab)`}
          >
            <Image
              src={project.cover}
              alt={project.coverAlt ?? `${project.title} interface`}
              fill
              sizes="(max-width: 700px) 94vw, 91vw"
              loading="eager"
              fetchPriority="high"
            />
          </a>
          <figcaption>
            <span>{interfaceCaptions[project.slug] ?? "Project interface"}</span>
            <a href={project.cover} target="_blank" rel="noopener noreferrer">
              Full-size image <Arrow />
            </a>
          </figcaption>
        </figure>}

        <section className="project-case-story project-case-gutter" id="about-project" aria-labelledby="project-overview">
          <div className="project-case-overview">
            <h2 className="project-case-label" id="project-overview">About the project</h2>
            <p>{project.summary}</p>
          </div>

          <div className="project-case-details">
            <aside className="project-case-facts" aria-label="Project details and links">
              <h2 className="project-case-facts-title">Project details</h2>
              <dl>
                {project.facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="project-case-label">{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
                <div>
                  <dt className="project-case-label">Built with</dt>
                  <dd>
                    <ul className="project-case-stack">
                      {project.stack.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </dd>
                </div>
              </dl>
              {project.links.length > 0 && (
                <nav className="project-case-links" aria-label={`${project.title} links`}>
                  {project.links.map((link) => (
                    <a key={link.href} href={link.href}>
                      <span>{link.label}</span>
                      <Arrow />
                    </a>
                  ))}
                </nav>
              )}
            </aside>

            <div className="project-case-chapters">
              {project.sections.map((section) => (
                <section className="project-case-chapter" key={section.title}>
                  <h2>{section.title}</h2>
                  {section.body.split(/\n\s*\n/).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </section>
              ))}
            </div>
          </div>
        </section>

        {nextProject && nextProject.slug !== project.slug && (
          <section className="project-case-next project-case-gutter" aria-labelledby="next-project-title">
            <p className="project-case-label">Next project</p>
            <Link href={`/work/${nextProject.slug}`} prefetch={false} className={`project-case-next-link${nextProject.cover ? "" : " project-case-next-link--text"}`}>
              <div className="project-case-next-copy">
                <h2 id="next-project-title">{nextProject.title}</h2>
                <p>{nextProject.tagline}</p>
                <span className="project-case-next-action">View project <Arrow direction="right" /></span>
              </div>
              {nextProject.cover && <div className="project-case-next-image" data-project={nextProject.slug}>
                <Image src={nextProject.cover} alt={nextProject.coverAlt ?? `${nextProject.title} interface`} fill sizes="(max-width: 700px) 90vw, 38vw" />
              </div>}
            </Link>
          </section>
        )}
      </main>

      <footer className="project-case-footer project-case-gutter">
        <Link href="/" prefetch={false}>Sam Bai <span>· Portfolio</span></Link>
        <a href="mailto:sambai.codes@gmail.com">Get in touch <Arrow /></a>
      </footer>
    </div>
  );
}
