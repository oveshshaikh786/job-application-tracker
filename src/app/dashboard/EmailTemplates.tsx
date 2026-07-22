"use client";

import { useState } from "react";

const TEMPLATES = [
  {
    category: "Follow-up after applying",
    subject: "Following up – [Role] at [Company]",
    body: `Hi [Name],

I recently applied for the [Role] position at [Company] and wanted to follow up on my application. I'm very excited about the opportunity to contribute to [Company]'s work, particularly [specific thing about company].

Please let me know if you need any additional information from me. I'm happy to chat at your convenience.

Best regards,
[Your Name]`,
  },
  {
    category: "After phone screen",
    subject: "Thank you – [Role] Interview",
    body: `Hi [Name],

Thank you for taking the time to speak with me today about the [Role] position. I really enjoyed learning more about [Company] and the team's work on [topic discussed].

Our conversation reinforced my enthusiasm for this role. I'm excited about the possibility of contributing to [specific goal/project].

Please don't hesitate to reach out if you need anything else. Looking forward to next steps!

Best,
[Your Name]`,
  },
  {
    category: "After technical/onsite",
    subject: "Thank you for the interview – [Role]",
    body: `Hi [Name],

Thank you for the opportunity to interview for the [Role] position at [Company]. I enjoyed speaking with the team and learning more about [specific technical area or project discussed].

The challenges you described around [problem] really resonated with me — I've dealt with similar situations at [previous company/project] and I'm excited about tackling them here.

I'm looking forward to hearing about next steps. Please feel free to reach out with any questions.

Best regards,
[Your Name]`,
  },
  {
    category: "No response (ghosting)",
    subject: "Re: [Role] Application – Checking in",
    body: `Hi [Name],

I hope you're doing well. I wanted to check in on my application for the [Role] position, which I submitted on [date]. I understand you may have a high volume of applicants, but I remain very interested in joining [Company].

If the position has been filled or my application is no longer under consideration, I completely understand — I just wanted to confirm either way.

Thank you for your time.

Best,
[Your Name]`,
  },
  {
    category: "Salary negotiation",
    subject: "Re: Offer – [Role] at [Company]",
    body: `Hi [Name],

Thank you so much for the offer — I'm genuinely excited about joining [Company] and the [Role] team.

After careful consideration, I'd like to discuss the base compensation. Based on my research and experience with [skills/years], I was hoping we could explore a base of [your target]. I believe this better reflects the value I can bring to the role.

I'm committed to making this work and open to discussing other aspects of the package as well. Would you be open to a brief call to discuss?

Thank you again for the offer.

Best,
[Your Name]`,
  },
  {
    category: "Declining an offer",
    subject: "Re: Offer – [Role] at [Company]",
    body: `Hi [Name],

Thank you so much for offering me the [Role] position at [Company]. After careful consideration, I've decided to decline the offer. This was not an easy decision — I have great respect for [Company] and the team.

I'm grateful for the time and consideration everyone invested in the interview process. I hope our paths cross again in the future.

Thank you again for the opportunity.

Warm regards,
[Your Name]`,
  },
];

export default function EmailTemplates() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <section className="email-templates-section">
      <button
        className="email-templates-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        <span>✉ Email Templates</span>
        <span style={{ color: "var(--text-2)", fontSize: 12 }}>{open ? "▲" : "▼"} {TEMPLATES.length} templates</span>
      </button>

      {open && (
        <div className="email-templates-list fade-in">
          {TEMPLATES.map((t) => {
            const key = t.category;
            const isExpanded = expanded === key;
            return (
              <div key={key} className="email-template-card">
                <div
                  className="email-template-header"
                  onClick={() => setExpanded(isExpanded ? null : key)}
                  role="button"
                  tabIndex={0}
                >
                  <div>
                    <div className="email-template-category">{t.category}</div>
                    <div className="email-template-subject">{t.subject}</div>
                  </div>
                  <span style={{ color: "var(--text-3)", fontSize: 12 }}>{isExpanded ? "▲" : "▼"}</span>
                </div>

                {isExpanded && (
                  <div className="email-template-body fade-in">
                    <pre className="email-template-pre">{t.body}</pre>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: 12 }}
                        onClick={() => copy(t.body, key + "-body")}
                      >
                        {copied === key + "-body" ? "Copied ✓" : "Copy body"}
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 12 }}
                        onClick={() => copy(t.subject, key + "-sub")}
                      >
                        {copied === key + "-sub" ? "Copied ✓" : "Copy subject"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
