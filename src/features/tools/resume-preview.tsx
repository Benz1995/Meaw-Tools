import { formatResumeDateRange, resumeHighlightLines, resumeLabels, resumeListItems, type ResumeDocument } from "@/lib/tools/resume";

function PreviewSection({ title, modern, children }: { title: string; modern: boolean; children: React.ReactNode }) {
  return (
    <section className="mt-5" aria-label={title}>
      <h3 className={`border-b pb-1.5 text-xs font-bold tracking-[0.12em] uppercase ${modern ? "border-teal-200 text-teal-800" : "border-slate-300 text-slate-700"}`}>{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function ResumePreview({ documentData }: { documentData: ResumeDocument }) {
  const modern = documentData.style === "modern";
  const copy = resumeLabels[documentData.locale];
  const contact = documentData.contact;
  const contactItems = [contact.email, contact.phone, contact.location, contact.website].filter((item) => item.trim());
  return (
    <article
      data-testid="resume-preview"
      aria-label="ตัวอย่างเรซูเม่"
      className={`mx-auto min-h-[720px] w-full max-w-[720px] overflow-hidden rounded-sm bg-white p-6 text-slate-900 shadow-sm sm:p-9 ${modern ? "border-t-[6px] border-teal-600" : "border-t-[6px] border-slate-700"}`}
    >
      <header className={`border-b pb-5 ${modern ? "border-teal-600" : "border-slate-500"}`}>
        <h2 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">{contact.fullName || (documentData.locale === "th" ? "ชื่อ–นามสกุล" : "Full Name")}</h2>
        <p className={`mt-1.5 break-words text-sm font-semibold ${modern ? "text-teal-700" : "text-slate-600"}`}>{contact.headline || (documentData.locale === "th" ? "ตำแหน่งงานเป้าหมาย" : "Target Role")}</p>
        {contactItems.length ? <p className="mt-2 break-words text-[11px] leading-5 text-slate-600">{contactItems.join("  |  ")}</p> : null}
      </header>

      {documentData.summary.trim() ? <PreviewSection title={copy.summary} modern={modern}><p className="whitespace-pre-line text-xs leading-5 text-slate-700">{documentData.summary}</p></PreviewSection> : null}

      {documentData.experiences.length ? (
        <PreviewSection title={copy.experience} modern={modern}>
          <div className="space-y-4">
            {documentData.experiences.map((item) => (
              <div key={item.id}>
                <h4 className="break-words text-sm font-bold">{item.role || (documentData.locale === "th" ? "ตำแหน่ง" : "Role")}</h4>
                <p className="mt-0.5 break-words text-[11px] leading-4 text-slate-600">{[item.employer, item.location, formatResumeDateRange(item.startDate, item.endDate, item.current, documentData.locale)].filter(Boolean).join("  |  ")}</p>
                {resumeHighlightLines(item.highlights).length ? <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-slate-700">{resumeHighlightLines(item.highlights).map((highlight, index) => <li key={`${item.id}-${index}`} className="break-words">{highlight}</li>)}</ul> : null}
              </div>
            ))}
          </div>
        </PreviewSection>
      ) : null}

      {documentData.education.length ? (
        <PreviewSection title={copy.education} modern={modern}>
          <div className="space-y-4">
            {documentData.education.map((item) => (
              <div key={item.id}>
                <h4 className="break-words text-sm font-bold">{item.degree || (documentData.locale === "th" ? "วุฒิการศึกษา" : "Degree")}</h4>
                <p className="mt-0.5 break-words text-[11px] leading-4 text-slate-600">{[item.institution, item.location, formatResumeDateRange(item.startDate, item.endDate, false, documentData.locale)].filter(Boolean).join("  |  ")}</p>
                {item.details.trim() ? <p className="mt-1.5 whitespace-pre-line text-xs leading-5 text-slate-700">{item.details}</p> : null}
              </div>
            ))}
          </div>
        </PreviewSection>
      ) : null}

      {resumeListItems(documentData.skills).length ? <PreviewSection title={copy.skills} modern={modern}><p className="break-words text-xs leading-5 text-slate-700">{resumeListItems(documentData.skills).join("  •  ")}</p></PreviewSection> : null}
      {resumeHighlightLines(documentData.languages).length ? <PreviewSection title={copy.languages} modern={modern}><p className="whitespace-pre-line text-xs leading-5 text-slate-700">{resumeHighlightLines(documentData.languages).join("  •  ")}</p></PreviewSection> : null}
      {resumeHighlightLines(documentData.certifications).length ? <PreviewSection title={copy.certifications} modern={modern}><p className="whitespace-pre-line text-xs leading-5 text-slate-700">{resumeHighlightLines(documentData.certifications).join("\n")}</p></PreviewSection> : null}
    </article>
  );
}
