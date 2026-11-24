// The built-in Round Logics T&C as editable Markdown.
// Wording matches the standard T&C page in src/pdf/InvoiceDocument.jsx and is filled in
// with the invoice's own values, so "Customise" starts from exactly what the PDF shows.
import {
  has, clean, money as formatMoney, toNumber, splitList, splitLines, countWord, activeItems, itemTitle,
} from '../pdf/format.js';
import { kindLabel } from '../pdf/docKinds.js';

const esc = (v) => String(v ?? '').replace(/\|/g, '\\|');

export function buildStandardTermsMarkdown(d = {}) {
  const money = (v) => formatMoney(v, d.currency || 'INR');
  const docWord = kindLabel(d).toLowerCase();
  const client = clean(d.clientName);
  const provider = clean(d.providerName) || 'Round Logics';
  const pages = splitList(d.pages);
  const items = activeItems(d.phases);
  const anyAmount = items.some((p) => has(p.amount));
  const total = anyAmount ? items.reduce((sum, p) => sum + toNumber(p.amount), 0) : '';
  const exclusions = splitLines(d.exclusions);
  const minorN = toNumber(d.includedMinorReviews);
  const majorN = toNumber(d.includedMajorReviews);
  const lastItem = items.length > 1 ? items[items.length - 1] : null;
  const hasBank = [d.bankAccountName, d.bankName, d.bankAccountNumber, d.bankIfsc, d.bankBranch, d.upiId].some(has);

  const reviews = [
    minorN > 0 && `${countWord(minorN)} (${minorN}) minor design review${minorN > 1 ? 's' : ''}`,
    majorN > 0 && `${countWord(majorN)} (${majorN}) major design review${majorN > 1 ? 's' : ''}`,
  ].filter(Boolean);

  let n = 0;
  const h = (title) => `## ${++n}. ${title}`;
  const out = [];
  const push = (...lines) => out.push(...lines.filter((l) => l !== false && l !== null && l !== undefined));

  push(h('Agreement'), '',
    `These Terms & Conditions ("Terms") govern the website design and development services provided by ${provider} ("Round Logics", "we") to ${client ? `${client} ("the Client")` : 'the Client'}. The Terms apply together with the ${docWord} that follows. By approving the project, making any payment or providing content for the work, the Client accepts these Terms.`, '');

  const scopeN = n + 1;
  push(h('Scope of Work'), '');
  if (pages.length) push(`**Agreed website pages (${pages.length}):** ${pages.join(', ')}.`, '');
  if (items.length) {
    push(items.length > 1
      ? `The work is delivered in the following phases. Each phase is billed separately, as shown on the ${docWord}.`
      : 'The work covered by this project:', '');
    push('| # | Description | Amount |', '|---|---|---:|');
    items.forEach((it, i) => {
      const desc = [has(it.title) && `**${esc(clean(it.title))}**`, has(it.deliverables) && esc(clean(it.deliverables))]
        .filter(Boolean).join(' — ');
      push(`| ${i + 1} | ${desc} | ${money(it.amount)} |`);
    });
    if (items.length > 1 && has(total)) push(`| | **Total project value** | **${money(total)}** |`);
    push('');
  }
  push('Any page, feature or service not listed above is outside the scope of this project and is quoted separately.', '');

  push(h('Workflow & Approval Stages'), '',
    '1. Kick-off: the Client shares content, images, brand assets and any required access (domain, hosting, accounts).',
    '2. Design: Round Logics prepares the website design for the agreed pages.',
    '3. Design review: the Client reviews the design and gives consolidated feedback; the revised design is then approved in writing (email or message is sufficient).',
    '4. Development: the approved design is built into a working website.',
    '5. Testing & client review: the Client reviews the developed website and reports any issues.',
    '6. Launch & handover: the website goes live and access is handed over to the Client.', '',
    'Work on each stage starts once the previous stage is approved. Approved designs are treated as final for development.', '');

  push(h('Revisions'), '');
  if (reviews.length) push(`The base scope includes ${reviews.join(' and ')}.`, '');
  push('- Minor revision: small changes within the approved layout, such as text, image replacements, colours, fonts or spacing.',
    '- Major revision: structural changes, such as reworking a page layout, adding or redesigning sections, or changing the design direction.',
    has(d.minorRevisionCharge) && `- Each additional minor revision is charged at ${money(d.minorRevisionCharge)}.`,
    has(d.majorRevisionCharge) && `- Each additional major revision is charged at ${money(d.majorRevisionCharge)}.`,
    '- Feedback should be shared in one consolidated list per review round. Requests that change the agreed scope are quoted separately.', '');

  push(h('Timeline & Client Dependencies'), '',
    (has(d.timelineDays)
      ? `The estimated project timeline is **${clean(d.timelineDays)} days**, subject to timely receipt of the Client's content, approvals and access. `
      : "The project timeline is subject to timely receipt of the Client's content, approvals and access. ") + 'The timeline depends on the Client:', '',
    '- providing final text, images, logos and other content in a usable format;',
    '- giving feedback and approvals promptly at each review stage;',
    '- providing domain, hosting and any third-party account access when requested.', '',
    'Delays in any of these extend the timeline by a corresponding period. Round Logics is not responsible for delays caused by the Client or third parties.', '');

  push(h('Payment Terms'), '');
  if (has(d.paymentTerms)) push(clean(d.paymentTerms), '');
  items.filter((it) => has(it.amount)).forEach((it, i) =>
    push(`- ${itemTitle(it, i)}: ${money(it.amount)}, billed as a separate line item on the ${docWord}.`));
  if (hasBank) push(`- Payments are made using the payment details provided on the ${docWord}.`);
  push('');

  push(h('Overdue Payments'), '',
    'Payments must be made by their due dates. ' +
    (has(d.suspensionDays)
      ? `If the ${lastItem ? `${itemTitle(lastItem, items.length - 1)} payment` : 'final payment'} remains unpaid **${clean(d.suspensionDays)} days** after its due date, Round Logics may, after giving the Client prior notice, suspend the website and related services until all outstanding amounts are paid. Services are restored once payment is received. `
      : '') +
    'Work on the project may be paused while a payment is overdue.', '');

  if (has(d.renewalCharge)) {
    push(h('Annual Domain & Hosting Renewal'), '',
      `Domain and hosting are renewed annually at **${money(d.renewalCharge)} per year**, payable before the renewal date. If the renewal is not paid in time, the domain or hosting may expire, which can take the website offline or lead to loss of the domain. Round Logics is not responsible for downtime or loss resulting from non-renewal.`, '');
  }

  push(h('Exclusions & Additional Work'), '');
  if (exclusions.length) {
    push('The following are not included in this project and, if required, will be quoted separately:', '');
    exclusions.forEach((e) => push(`- ${e}`));
    push('');
  }
  push(`Any work outside the scope in Section ${scopeN}, including new pages, new features or third-party costs, is quoted in writing and starts only after the Client approves the quotation.`, '');

  push(h('Testing & Handover'), '',
    'Round Logics tests the website on current versions of major browsers and on desktop and mobile screen sizes before launch. After launch and receipt of full payment, Round Logics hands over the relevant website access and login details to the Client. Issues reported after handover that are caused by changes made by the Client or third parties are outside the scope of this project.', '');

  push(h('Cancellation'), '',
    'Either party may cancel the project by written notice. If the project is cancelled, the Client pays for all work completed up to the cancellation date, and payments already made for completed work are non-refundable. If the Client does not respond or provide required content for an extended period, Round Logics may treat the project as paused and agree a revised timeline before resuming.', '');

  push(h('Content & Ownership'), '',
    'The Client confirms that it has the right to use all content, images and materials it provides. Ownership of the final website design and content passes to the Client on receipt of full payment. Round Logics may display the completed website in its portfolio unless the Client asks otherwise in writing.', '');

  push(h('Acceptance'), '',
    "The website is accepted when the Client approves it in writing or when it is published live at the Client's request. Approval of these Terms is confirmed by signing below or by written confirmation from the Client.");
  if (has(d.additionalNotes)) push('', `**Additional notes:** ${clean(d.additionalNotes)}`);

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
