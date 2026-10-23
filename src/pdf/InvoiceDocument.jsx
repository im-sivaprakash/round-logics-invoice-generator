import React from 'react';
import { Document, Page, View, Text, Svg, Path, StyleSheet } from '@react-pdf/renderer';
import { LOGO_PATHS, LOGO_VIEWBOX, LOGO_FILL } from './logo.js';
import { FONT_STACK } from './fonts.js';
import { kindLabel, kindShort, isOffer, tracksPayment, paymentSummary } from './docKinds.js';
import {
  has, clean, money as formatMoney, toNumber, usesQty, formatQty, itemRate, formatDate, splitList, splitLines, countWord, activeItems, itemTitle, itemShort,
} from './format.js';

const INK = '#0c0c0c';
const MUTED = '#5b5f66';
const RULE = '#d9dbde';
const TINT = '#f4f5f6';

const s = StyleSheet.create({
  page: {
    fontFamily: FONT_STACK,
    fontSize: 9.4,
    lineHeight: 1.5,
    color: INK,
    paddingTop: 70,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },
  header: {
    position: 'absolute', top: 26, left: 50, right: 50,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 0.6, borderBottomColor: RULE, paddingBottom: 8,
  },
  headerTitle: { fontSize: 8, color: MUTED, letterSpacing: 0.6, textTransform: 'uppercase' },
  footer: {
    position: 'absolute', bottom: 26, left: 50, right: 50,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 0.6, borderTopColor: RULE, paddingTop: 7,
    fontSize: 7.5, color: MUTED,
  },
  title: { fontSize: 19, fontWeight: 700, lineHeight: 1.25, marginBottom: 3 },
  subtitle: { fontSize: 10, color: MUTED, lineHeight: 1.3, marginBottom: 14 },
  metaRow: {
    flexDirection: 'row', backgroundColor: TINT, borderRadius: 3,
    paddingVertical: 8, paddingHorizontal: 10, marginBottom: 14,
  },
  metaCell: { flex: 1 },
  metaLabel: { fontSize: 7, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 9.4, fontWeight: 600 },
  section: { marginBottom: 10 },
  h2: { fontSize: 11, fontWeight: 700, marginBottom: 4, marginTop: 4 },
  p: { marginBottom: 4, textAlign: 'justify' },
  bulletRow: { flexDirection: 'row', marginBottom: 2.5, paddingLeft: 4 },
  bulletDot: { width: 12 },
  bulletText: { flex: 1 },
  strong: { fontWeight: 700 },
  table: { borderWidth: 0.6, borderColor: RULE, borderRadius: 3, marginVertical: 5 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.6, borderBottomColor: RULE },
  trLast: { flexDirection: 'row' },
  th: {
    backgroundColor: TINT, fontSize: 7.6, fontWeight: 700, color: MUTED,
    textTransform: 'uppercase', letterSpacing: 0.4, paddingVertical: 5, paddingHorizontal: 7,
  },
  td: { paddingVertical: 6, paddingHorizontal: 7 },
  right: { textAlign: 'right' },
  signRow: { flexDirection: 'row', marginTop: 10, gap: 24 },
  signBox: { flex: 1, borderTopWidth: 0.8, borderTopColor: INK, paddingTop: 6 },
  signLine: { marginTop: 14, borderBottomWidth: 0.6, borderBottomColor: RULE, paddingBottom: 2, color: MUTED, fontSize: 8.4 },
  invTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  invTitle: { fontSize: 26, fontWeight: 700, letterSpacing: 2, lineHeight: 1.2, textAlign: 'right', marginBottom: 6 },
  invMeta: { width: 230 },
  partyRow: { flexDirection: 'row', gap: 18, marginBottom: 16 },
  party: { flex: 1, backgroundColor: TINT, borderRadius: 3, padding: 10 },
  partyName: { fontSize: 11, fontWeight: 700, marginBottom: 2 },
  totalsWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  totals: { width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 7 },
  grandRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, paddingHorizontal: 7,
    backgroundColor: INK, color: '#ffffff', borderRadius: 3, marginTop: 3,
  },
  box: { borderWidth: 0.6, borderColor: RULE, borderRadius: 3, padding: 10, marginTop: 14 },
  kv: { flexDirection: 'row', marginBottom: 2 },
  kvKey: { width: 100, color: MUTED },
  kvVal: { flex: 1, fontWeight: 600 },
  small: { fontSize: 8, color: MUTED },
  badge: {
    alignSelf: 'flex-end', fontSize: 8, fontWeight: 700, letterSpacing: 1, paddingVertical: 3, paddingHorizontal: 8,
    borderRadius: 3, borderWidth: 1, marginBottom: 6,
  },
  paidBadge: { color: '#17733a', borderColor: '#17733a', backgroundColor: '#e7f6ec' },
  partBadge: { color: '#8a5a00', borderColor: '#b07a12', backgroundColor: '#fdf3dc' },
  paidText: { color: '#17733a', fontWeight: 700 },
  dueText: { color: '#a3261d', fontWeight: 600 },
  payMeta: { fontSize: 7.6, color: MUTED, lineHeight: 1.35 },
});

function Logo({ width }) {
  const [, , w, h] = LOGO_VIEWBOX.split(' ').map(Number);
  return (
    <Svg viewBox={LOGO_VIEWBOX} style={{ width, height: (width * h) / w }}>
      {LOGO_PATHS.map((d, i) => <Path key={i} d={d} fill={LOGO_FILL} />)}
    </Svg>
  );
}

const P = ({ children }) => <Text style={s.p}>{children}</Text>;
const B = ({ children }) => <Text style={s.strong}>{children}</Text>;

function Bullets({ items, marker = '•' }) {
  return items.filter(Boolean).map((item, i) => (
    <View key={i} style={s.bulletRow} wrap={false}>
      <Text style={s.bulletDot}>{marker === 'num' ? `${i + 1}.` : marker}</Text>
      <Text style={s.bulletText}>{item}</Text>
    </View>
  ));
}

function Section({ n, title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.h2} minPresenceAhead={40}>{n}. {title}</Text>
      {children}
    </View>
  );
}

function Chrome({ label, client, header = true }) {
  return (
    <>
      {header && (
        <View style={s.header} fixed>
          <Logo width={78} />
          <Text style={s.headerTitle}>{label}</Text>
        </View>
      )}
      <View style={s.footer} fixed>
        <Text>{['Round Logics', client].filter(Boolean).join(' · ')}</Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </>
  );
}

function ItemTable({ items, total, money, showStatus, dueOn }) {
  const showTotal = has(total);
  const qtyCols = usesQty(items);
  return (
    <View style={s.table}>
      <View style={s.tr}>
        <Text style={[s.th, { width: 30 }]}>#</Text>
        <Text style={[s.th, { flex: 1 }]}>Description</Text>
        {qtyCols && <Text style={[s.th, s.right, { width: 38 }]}>Qty</Text>}
        {qtyCols && <Text style={[s.th, s.right, { width: 72 }]}>Unit price</Text>}
        {showStatus && <Text style={[s.th, { width: 98 }]}>Status</Text>}
        <Text style={[s.th, s.right, { width: 84 }]}>Amount</Text>
      </View>
      {items.map((it, i) => (
        <View key={i} style={i === items.length - 1 && !showTotal ? s.trLast : s.tr} wrap={false}>
          <Text style={[s.td, { width: 30 }]}>{i + 1}</Text>
          <View style={[s.td, { flex: 1 }]}>
            {has(it.title) && <Text style={s.strong}>{clean(it.title)}</Text>}
            {has(it.deliverables) && <Text style={{ color: MUTED }}>{clean(it.deliverables)}</Text>}
          </View>
          {qtyCols && <Text style={[s.td, s.right, { width: 38 }]}>{has(it.amount) ? formatQty(it) : ''}</Text>}
          {qtyCols && <Text style={[s.td, s.right, { width: 72 }]}>{money(itemRate(it))}</Text>}
          {showStatus && (
            <View style={[s.td, { width: 98 }]}>
              {has(it.amount) && (
                <>
                  <Text style={it.paid ? s.paidText : s.dueText}>{it.paid ? 'Paid' : 'Due'}</Text>
                  {it.paid && has(it.paidMethod) && <Text style={s.payMeta}>{clean(it.paidMethod)}</Text>}
                  {it.paid && has(it.paidDate) && <Text style={s.payMeta}>{shortDate(it.paidDate)}</Text>}
                  {!it.paid && has(dueOn) && <Text style={s.payMeta}>by {shortDate(dueOn)}</Text>}
                </>
              )}
            </View>
          )}
          <Text style={[s.td, s.right, { width: 84, fontWeight: 600 }]}>{money(it.amount)}</Text>
        </View>
      ))}
      {showTotal && (
        <View style={s.trLast} wrap={false}>
          <Text style={[s.td, { flex: 1, fontWeight: 700 }]}>Total project value</Text>
          <Text style={[s.td, s.right, { width: 84, fontWeight: 700 }]}>{money(total)}</Text>
        </View>
      )}
    </View>
  );
}

const shortDate = (iso) => {
  if (!has(iso)) return '';
  const dt = new Date(`${iso}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? String(iso) : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

function KV({ k, v }) {
  if (!has(v)) return null;
  return (
    <View style={s.kv}>
      <Text style={s.kvKey}>{k}</Text>
      <Text style={s.kvVal}>{v}</Text>
    </View>
  );
}

function Meta({ label, value }) {
  if (!has(value)) return null;
  return (
    <View style={s.metaCell}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue}>{value}</Text>
    </View>
  );
}

// Any field left blank is simply left out of the PDF.
export default function InvoiceDocument({ data }) {
  const d = data;
  const money = (v) => formatMoney(v, d.currency || 'INR');
  const withTerms = d.docType !== 'invoice';
  const label = kindLabel(d);            // "Invoice", "Quotation", "Receipt"…
  const short = kindShort(d);            // "Invoice", "Quote"…
  const docWord = label.toLowerCase();
  const offer = isOffer(d);
  const tracks = tracksPayment(d);
  const pay = paymentSummary(d, d.recordStatus);
  const showPay = tracks && pay.paid > 0;
  const client = clean(d.clientName);
  const provider = clean(d.providerName) || 'Round Logics';
  const pages = splitList(d.pages);
  const items = activeItems(d.phases);
  const anyAmount = items.some((p) => has(p.amount));
  const total = anyAmount ? items.reduce((sum, p) => sum + toNumber(p.amount), 0) : '';
  const exclusions = splitLines(d.exclusions);
  const minorN = toNumber(d.includedMinorReviews);
  const majorN = toNumber(d.includedMajorReviews);
  const invNo = clean(d.invoiceNumber);
  const invDate = formatDate(d.invoiceDate);
  const dueDate = formatDate(d.dueDate);
  const lastItem = items.length > 1 ? items[items.length - 1] : null;

  const reviews = [
    minorN > 0 && `${countWord(minorN)} (${minorN}) minor design review${minorN > 1 ? 's' : ''}`,
    majorN > 0 && `${countWord(majorN)} (${majorN}) major design review${majorN > 1 ? 's' : ''}`,
  ].filter(Boolean);

  const bank = [
    ['Account name', d.bankAccountName], ['Bank', d.bankName], ['Account number', d.bankAccountNumber],
    ['IFSC', d.bankIfsc], ['Branch', d.bankBranch], ['UPI ID', d.upiId],
  ].filter(([, v]) => has(v));

  // Sections are numbered as they are included.
  let n = 0;
  const next = () => ++n;
  const sec = {};

  return (
    <Document
      title={['Round Logics', client, withTerms ? `Terms & Conditions and ${label}` : label].filter(Boolean).join(' – ')}
      author="Round Logics"
      subject="Website project Terms & Conditions and Invoice"
    >
      {/* ---------------- TERMS & CONDITIONS (skipped for "Invoice only") ---------------- */}
      {withTerms && (
      <Page size="A4" style={s.page}>
        <Chrome label="Terms & Conditions" client={client} />

        <Text style={s.title}>Terms & Conditions</Text>
        <Text style={s.subtitle}>Website design and development services</Text>

        <View style={s.metaRow}>
          <Meta label="Service provider" value={provider} />
          <Meta label="Client" value={client} />
          <Meta label="Reference" value={invNo} />
          <Meta label="Date" value={invDate} />
        </View>

        <Section n={(sec.agreement = next())} title="Agreement">
          <P>
            These Terms & Conditions ("Terms") govern the website design and development services provided by {provider} ("Round Logics", "we") to {client ? `${client} ("the Client")` : 'the Client'}. The Terms apply together with the {docWord} that follows. By approving the project, making any payment or providing content for the work, the Client accepts these Terms.
          </P>
        </Section>

        <Section n={(sec.scope = next())} title="Scope of Work">
          {pages.length > 0 && (
            <P><B>Agreed website pages ({pages.length}): </B>{pages.join(', ')}.</P>
          )}
          {items.length > 0 && (
            <>
              <P>{items.length > 1 ? `The work is delivered in the following phases. Each phase is billed separately, as shown on the ${docWord}.` : 'The work covered by this project:'}</P>
              <ItemTable items={items} total={items.length > 1 ? total : ''} money={money} />
            </>
          )}
          <P>Any page, feature or service not listed above is outside the scope of this project and is quoted separately.</P>
        </Section>

        <Section n={next()} title="Workflow & Approval Stages">
          <Bullets
            marker="num"
            items={[
              'Kick-off: the Client shares content, images, brand assets and any required access (domain, hosting, accounts).',
              'Design: Round Logics prepares the website design for the agreed pages.',
              'Design review: the Client reviews the design and gives consolidated feedback; the revised design is then approved in writing (email or message is sufficient).',
              'Development: the approved design is built into a working website.',
              'Testing & client review: the Client reviews the developed website and reports any issues.',
              'Launch & handover: the website goes live and access is handed over to the Client.',
            ]}
          />
          <P>Work on each stage starts once the previous stage is approved. Approved designs are treated as final for development.</P>
        </Section>

        <Section n={next()} title="Revisions">
          {reviews.length > 0 && <P>The base scope includes {reviews.join(' and ')}.</P>}
          <Bullets
            items={[
              'Minor revision: small changes within the approved layout, such as text, image replacements, colours, fonts or spacing.',
              'Major revision: structural changes, such as reworking a page layout, adding or redesigning sections, or changing the design direction.',
              has(d.minorRevisionCharge) && `Each additional minor revision is charged at ${money(d.minorRevisionCharge)}.`,
              has(d.majorRevisionCharge) && `Each additional major revision is charged at ${money(d.majorRevisionCharge)}.`,
              'Feedback should be shared in one consolidated list per review round. Requests that change the agreed scope are quoted separately.',
            ]}
          />
        </Section>

        <Section n={next()} title="Timeline & Client Dependencies">
          <P>
            {has(d.timelineDays)
              ? <>The estimated project timeline is <B>{clean(d.timelineDays)} days</B>, subject to timely receipt of the Client's content, approvals and access. </>
              : 'The project timeline is subject to timely receipt of the Client\'s content, approvals and access. '}
            The timeline depends on the Client:
          </P>
          <Bullets
            items={[
              'providing final text, images, logos and other content in a usable format;',
              'giving feedback and approvals promptly at each review stage;',
              'providing domain, hosting and any third-party account access when requested.',
            ]}
          />
          <P>Delays in any of these extend the timeline by a corresponding period. Round Logics is not responsible for delays caused by the Client or third parties.</P>
        </Section>

        <Section n={next()} title="Payment Terms">
          {has(d.paymentTerms) && <P>{clean(d.paymentTerms)}</P>}
          <Bullets
            items={[
              ...items
                .filter((it) => has(it.amount))
                .map((it, i) => `${itemTitle(it, i)}: ${money(it.amount)}, billed as a separate line item on the ${docWord}.`),
              bank.length > 0 && `Payments are made using the payment details provided on the ${docWord}.`,
            ]}
          />
        </Section>

        <Section n={next()} title="Overdue Payments">
          <P>
            Payments must be made by their due dates.{' '}
            {has(d.suspensionDays) && (
              <>
                If the {lastItem ? `${itemTitle(lastItem, items.length - 1)} payment` : 'final payment'} remains unpaid <B>{clean(d.suspensionDays)} days</B> after its due date, Round Logics may, after giving the Client prior notice, suspend the website and related services until all outstanding amounts are paid. Services are restored once payment is received.{' '}
              </>
            )}
            Work on the project may be paused while a payment is overdue.
          </P>
        </Section>

        {has(d.renewalCharge) && (
          <Section n={next()} title="Annual Domain & Hosting Renewal">
            <P>
              Domain and hosting are renewed annually at <B>{money(d.renewalCharge)} per year</B>, payable before the renewal date. If the renewal is not paid in time, the domain or hosting may expire, which can take the website offline or lead to loss of the domain. Round Logics is not responsible for downtime or loss resulting from non-renewal.
            </P>
          </Section>
        )}

        <Section n={next()} title="Exclusions & Additional Work">
          {exclusions.length > 0 && (
            <>
              <P>The following are not included in this project and, if required, will be quoted separately:</P>
              <Bullets items={exclusions} />
            </>
          )}
          <P>Any work outside the scope in Section {sec.scope}, including new pages, new features or third-party costs, is quoted in writing and starts only after the Client approves the quotation.</P>
        </Section>

        <Section n={next()} title="Testing & Handover">
          <P>
            Round Logics tests the website on current versions of major browsers and on desktop and mobile screen sizes before launch. After launch and receipt of full payment, Round Logics hands over the relevant website access and login details to the Client. Issues reported after handover that are caused by changes made by the Client or third parties are outside the scope of this project.
          </P>
        </Section>

        <Section n={next()} title="Cancellation">
          <P>
            Either party may cancel the project by written notice. If the project is cancelled, the Client pays for all work completed up to the cancellation date, and payments already made for completed work are non-refundable. If the Client does not respond or provide required content for an extended period, Round Logics may treat the project as paused and agree a revised timeline before resuming.
          </P>
        </Section>

        <Section n={next()} title="Content & Ownership">
          <P>
            The Client confirms that it has the right to use all content, images and materials it provides. Ownership of the final website design and content passes to the Client on receipt of full payment. Round Logics may display the completed website in its portfolio unless the Client asks otherwise in writing.
          </P>
        </Section>

        <Section n={next()} title="Acceptance">
          <P>
            The website is accepted when the Client approves it in writing or when it is published live at the Client's request. Approval of these Terms is confirmed by signing below or by written confirmation from the Client.
          </P>
          {has(d.additionalNotes) && <P><B>Additional notes: </B>{clean(d.additionalNotes)}</P>}
          <View style={s.signRow} wrap={false}>
            {[['For Round Logics', provider], ['For the Client', client]].map(([lbl, name]) => (
              <View key={lbl} style={s.signBox}>
                <Text style={s.strong}>{lbl}</Text>
                {has(name) && <Text style={s.small}>{name}</Text>}
                <Text style={s.signLine}>Name:</Text>
                <Text style={s.signLine}>Signature:</Text>
                <Text style={s.signLine}>Date:</Text>
              </View>
            ))}
          </View>
        </Section>
      </Page>
      )}

      {/* ---------------- INVOICE (always its own page) ---------------- */}
      <Page size="A4" style={[s.page, { paddingTop: 44, paddingBottom: 70 }]}>
        <Chrome label={label} client={client} header={false} />

        <View style={s.invTop}>
          <Logo width={150} />
          <View style={s.invMeta}>
            <Text style={[s.invTitle, label.length > 10 && { fontSize: label.length > 16 ? 15 : 19, letterSpacing: 1 }]}>
              {label.toUpperCase()}
            </Text>
            {tracks && pay.state === 'paid' && <Text style={[s.badge, s.paidBadge]}>PAID</Text>}
            {tracks && pay.state === 'partial' && <Text style={[s.badge, s.partBadge]}>PARTLY PAID</Text>}
            <View>
              <KV k={`${short} number`} v={invNo} />
              <KV k={`${short} date`} v={invDate} />
              <KV k={offer ? 'Valid until' : 'Due date'} v={dueDate} />
            </View>
          </View>
        </View>

        <View style={s.partyRow}>
          <View style={s.party}>
            <Text style={s.metaLabel}>From</Text>
            <Text style={s.partyName}>{provider}</Text>
            {has(d.providerAddress) && <Text>{clean(d.providerAddress)}</Text>}
            {has(d.providerEmail) && <Text>{clean(d.providerEmail)}</Text>}
            {has(d.providerPhone) && <Text>{clean(d.providerPhone)}</Text>}
          </View>
          {client && (
            <View style={s.party}>
              <Text style={s.metaLabel}>{offer ? 'Prepared for' : 'Bill to'}</Text>
              <Text style={s.partyName}>{client}</Text>
              {has(d.clientContactPerson) && <Text>Attn: {clean(d.clientContactPerson)}</Text>}
              {has(d.clientAddress) && <Text>{clean(d.clientAddress)}</Text>}
              {has(d.clientEmail) && <Text>{clean(d.clientEmail)}</Text>}
              {has(d.clientPhone) && <Text>{clean(d.clientPhone)}</Text>}
            </View>
          )}
        </View>

        {pages.length > 0 && (
          <Text style={[s.small, { marginBottom: 2 }]}>
            Project: Website design and development · Pages: {pages.join(', ')}
          </Text>
        )}
        {items.length > 0 && <ItemTable items={items} money={money} showStatus={showPay} dueOn={d.dueDate} />}

        {anyAmount && (
          <View style={s.totalsWrap}>
            <View style={s.totals}>
              {items.length > 1 && !showPay && items.map((it, i) => has(it.amount) && (
                <View key={i} style={s.totalRow}>
                  <Text style={{ color: MUTED }}>{itemShort(it, i)}</Text>
                  <Text>{money(it.amount)}</Text>
                </View>
              ))}
              {showPay ? (
                <>
                  <View style={[s.totalRow, { borderTopWidth: 0.6, borderTopColor: RULE }]}>
                    <Text style={{ fontWeight: 700 }}>Total</Text>
                    <Text style={{ fontWeight: 700 }}>{money(total)}</Text>
                  </View>
                  <View style={s.totalRow}>
                    <Text style={{ color: '#17733a' }}>Amount paid</Text>
                    <Text style={{ color: '#17733a' }}>− {money(pay.paid)}</Text>
                  </View>
                  <View style={s.grandRow}>
                    <Text style={{ fontWeight: 700 }}>Balance due</Text>
                    <Text style={{ fontWeight: 700 }}>{money(pay.balance)}</Text>
                  </View>
                </>
              ) : (
                <View style={s.grandRow}>
                  <Text style={{ fontWeight: 700 }}>{offer ? 'Total (estimated)' : 'Total'}</Text>
                  <Text style={{ fontWeight: 700 }}>{money(total)}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {showPay && pay.paidItems.length > 0 && (
          <View style={[s.box, { marginTop: 10, paddingVertical: 8 }]} wrap={false}>
            <Text style={[s.h2, { marginTop: 0, marginBottom: 3 }]}>Payments received</Text>
            {pay.paidItems.map((it, i) => (
              <View key={i} style={[s.kv, { marginBottom: 1 }]}>
                <Text style={{ flex: 1 }}>
                  <Text style={s.strong}>{money(it.amount)}</Text>
                  {'  '}{itemShort(it, items.indexOf(it))}
                </Text>
                <Text style={{ color: MUTED }}>
                  {[shortDate(it.paidDate), clean(it.paidMethod), has(it.paidRef) && `Ref ${clean(it.paidRef)}`].filter(Boolean).join('  ·  ')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {bank.length > 0 && !offer && pay.state !== 'paid' && (
          <View style={[s.box, showPay && { marginTop: 10 }]} wrap={false}>
            <Text style={[s.h2, { marginTop: 0 }]}>Payment instructions</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {bank.map(([k, v]) => (
                <View key={k} style={{ width: '50%', paddingRight: 8 }}>
                  <KV k={k} v={clean(v)} />
                </View>
              ))}
            </View>
            {invNo && <Text style={[s.small, { marginTop: 6 }]}>Please quote {short.toLowerCase()} number {invNo} as the payment reference.</Text>}
          </View>
        )}

        {(has(d.paymentTerms) || has(d.renewalCharge)) && (
          <View style={[s.box, { backgroundColor: TINT, borderWidth: 0 }, showPay && { marginTop: 10 }]} wrap={false}>
            <Text style={[s.h2, { marginTop: 0 }]}>Notes</Text>
            {has(d.paymentTerms) && <Text>{clean(d.paymentTerms)}</Text>}
            {has(d.renewalCharge) && (
              <Text style={{ marginTop: 3 }}>
                Annual domain and hosting renewal: {money(d.renewalCharge)} per year (billed separately).
              </Text>
            )}
            {withTerms && (
              <Text style={{ marginTop: 3 }}>
                Additional revisions and out-of-scope work are charged as set out in the Terms & Conditions above.
              </Text>
            )}
          </View>
        )}

        <Text style={[s.small, { position: 'absolute', bottom: 42, left: 50, right: 50, textAlign: 'center' }]} fixed>
          Thank you for choosing Round Logics.{has(d.providerEmail) ? ` For any questions about this ${docWord}, contact ${clean(d.providerEmail)}.` : ''}
        </Text>
      </Page>
    </Document>
  );
}
