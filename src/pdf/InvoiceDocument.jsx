import React from 'react';
import { Document, Page, View, Text, Svg, Path, StyleSheet } from '@react-pdf/renderer';
import { LOGO_PATHS, LOGO_VIEWBOX, LOGO_FILL } from './logo.js';
import { FONT_STACK } from './fonts.js';
import {
  has, val, money, toNumber, formatDate, splitList, splitLines, phaseLabel, countWord,
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
  return items.map((item, i) => (
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
        <Text>Round Logics · {client}</Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </>
  );
}

function PhaseTable({ phases, showTotal, total }) {
  return (
    <View style={s.table}>
      <View style={s.tr}>
        <Text style={[s.th, { width: 30 }]}>#</Text>
        <Text style={[s.th, { flex: 1 }]}>Phase & scope</Text>
        <Text style={[s.th, s.right, { width: 90 }]}>Amount</Text>
      </View>
      {phases.map((ph, i) => (
        <View key={i} style={i === phases.length - 1 && !showTotal ? s.trLast : s.tr} wrap={false}>
          <Text style={[s.td, { width: 30 }]}>{i + 1}</Text>
          <View style={[s.td, { flex: 1 }]}>
            <Text style={s.strong}>{val(ph.title, `${phaseLabel(i).toUpperCase()} TITLE`)}</Text>
            <Text style={{ color: MUTED }}>{val(ph.deliverables, `${phaseLabel(i).toUpperCase()} DELIVERABLES`)}</Text>
          </View>
          <Text style={[s.td, s.right, { width: 90, fontWeight: 600 }]}>{money(ph.amount)}</Text>
        </View>
      ))}
      {showTotal && (
        <View style={s.trLast} wrap={false}>
          <Text style={[s.td, { flex: 1, fontWeight: 700 }]}>Total project value</Text>
          <Text style={[s.td, s.right, { width: 90, fontWeight: 700 }]}>{money(total)}</Text>
        </View>
      )}
    </View>
  );
}

function KV({ k, v }) {
  return (
    <View style={s.kv}>
      <Text style={s.kvKey}>{k}</Text>
      <Text style={s.kvVal}>{v}</Text>
    </View>
  );
}

export default function InvoiceDocument({ data }) {
  const d = data;
  const client = val(d.clientName, 'CLIENT NAME');
  const provider = val(d.providerName, 'PROVIDER NAME');
  const pages = splitList(d.pages);
  const phases = d.phases?.length ? d.phases : [];
  const total = phases.reduce((sum, p) => sum + toNumber(p.amount), 0);
  const anyAmount = phases.some((p) => has(p.amount));
  const exclusions = splitLines(d.exclusions);
  const minorN = toNumber(d.includedMinorReviews);
  const majorN = toNumber(d.includedMajorReviews);
  const lastPhase = phases.length ? phaseLabel(phases.length - 1) : 'final phase';
  const invNo = val(d.invoiceNumber, 'INVOICE NUMBER');

  const reviewText = [
    `${countWord(minorN)} (${minorN}) minor design review`,
    `${countWord(majorN)} (${majorN}) major design review`,
  ].join(' and ');

  return (
    <Document
      title={`Round Logics – ${client} – Terms & Conditions and Invoice`}
      author="Round Logics"
      subject="Website project Terms & Conditions and Invoice"
    >
      {/* ---------------- TERMS & CONDITIONS ---------------- */}
      <Page size="A4" style={s.page}>
        <Chrome label="Terms & Conditions" client={client} />

        <Text style={s.title}>Terms & Conditions</Text>
        <Text style={s.subtitle}>Website design and development services</Text>

        <View style={s.metaRow}>
          <View style={s.metaCell}><Text style={s.metaLabel}>Service provider</Text><Text style={s.metaValue}>{provider}</Text></View>
          <View style={s.metaCell}><Text style={s.metaLabel}>Client</Text><Text style={s.metaValue}>{client}</Text></View>
          <View style={s.metaCell}><Text style={s.metaLabel}>Reference</Text><Text style={s.metaValue}>{invNo}</Text></View>
          <View style={s.metaCell}><Text style={s.metaLabel}>Date</Text><Text style={s.metaValue}>{formatDate(d.invoiceDate)}</Text></View>
        </View>

        <Section n={1} title="Agreement">
          <P>
            These Terms & Conditions ("Terms") govern the website design and development services provided by {provider} ("Round Logics", "we") to {client} ("the Client"). The Terms apply together with the invoice that follows. By approving the project, making any payment or providing content for the work, the Client accepts these Terms.
          </P>
        </Section>

        <Section n={2} title="Scope of Work">
          <P><B>Agreed website pages ({pages.length || 0}): </B>{pages.length ? pages.join(', ') : '[LIST OF WEBSITE PAGES]'}.</P>
          <P>The work is delivered in the following phases. Each phase is billed separately, as shown on the invoice.</P>
          <PhaseTable phases={phases} showTotal total={anyAmount ? total : ''} />
          <P>Any page, feature or service not listed above is outside the scope of this project and is handled as set out in Section 9.</P>
        </Section>

        <Section n={3} title="Workflow & Approval Stages">
          <Bullets
            marker="num"
            items={[
              'Kick-off: the Client shares content, images, brand assets and any required access (domain, hosting, accounts).',
              'Design: Round Logics prepares the website design for the agreed pages.',
              'Design review: the Client reviews the design and gives consolidated feedback; the revised design is then approved in writing (email or message is sufficient).',
              'Development: the approved design is built into a working website.',
              'Testing & client review: the Client reviews the developed website and reports any issues.',
              'Launch & handover: the website goes live and access is handed over as set out in Section 10.',
            ]}
          />
          <P>Work on each stage starts once the previous stage is approved. Approved designs are treated as final for development.</P>
        </Section>

        <Section n={4} title="Revisions">
          <P>The base scope includes {reviewText}.</P>
          <Bullets
            items={[
              'Minor revision: small changes within the approved layout, such as text, image replacements, colours, fonts or spacing.',
              'Major revision: structural changes, such as reworking a page layout, adding or redesigning sections, or changing the design direction.',
              `Each additional minor revision is charged at ${money(d.minorRevisionCharge, 'MINOR REVISION CHARGE')}.`,
              `Each additional major revision is charged at ${money(d.majorRevisionCharge, 'MAJOR REVISION CHARGE')}.`,
              'Feedback should be shared in one consolidated list per review round. Requests that change the agreed scope are quoted separately.',
            ]}
          />
        </Section>

        <Section n={5} title="Timeline & Client Dependencies">
          <P>
            The estimated project timeline is <B>{val(d.timelineDays, 'NUMBER OF')} days</B>, subject to timely receipt of the Client's content, approvals and access. The timeline depends on the Client:
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

        <Section n={6} title="Payment Terms">
          <P>{val(d.paymentTerms, 'PAYMENT TERMS')}</P>
          <Bullets
            items={[
              ...phases.map((ph, i) => `${phaseLabel(i)}: ${money(ph.amount)}, billed as a separate line item on the invoice.`),
              'Payments are made using the payment details provided on the invoice.',
            ]}
          />
        </Section>

        <Section n={7} title="Overdue Payments">
          <P>
            Payments must be made by their due dates. If the {lastPhase} payment remains unpaid <B>{val(d.suspensionDays, 'NUMBER OF')} days</B> after its due date, Round Logics may, after giving the Client prior notice, suspend the website and related services until all outstanding amounts are paid. Services are restored once payment is received. Work on any phase may also be paused while a payment for that project is overdue.
          </P>
        </Section>

        <Section n={8} title="Annual Domain & Hosting Renewal">
          <P>
            Domain and hosting are renewed annually at <B>{money(d.renewalCharge, 'RENEWAL CHARGE')} per year</B>, payable before the renewal date. If the renewal is not paid in time, the domain or hosting may expire, which can take the website offline or lead to loss of the domain. Round Logics is not responsible for downtime or loss resulting from non-renewal.
          </P>
        </Section>

        <Section n={9} title="Exclusions & Additional Work">
          <P>The following are not included in this project and, if required, will be quoted separately:</P>
          <Bullets items={exclusions.length ? exclusions : ['[LIST ADDITIONAL FEATURES, EXCLUSIONS OR SEPARATELY QUOTED WORK]']} />
          <P>Any work outside the scope in Section 2, including new pages, new features or third-party costs, is quoted in writing and starts only after the Client approves the quotation.</P>
        </Section>

        <Section n={10} title="Testing & Handover">
          <P>
            Round Logics tests the website on current versions of major browsers and on desktop and mobile screen sizes before launch. After launch and receipt of full payment, Round Logics hands over the relevant website access and login details to the Client. Issues reported after handover that are caused by changes made by the Client or third parties are outside the scope of this project.
          </P>
        </Section>

        <Section n={11} title="Cancellation">
          <P>
            Either party may cancel the project by written notice. If the project is cancelled, the Client pays for all work completed up to the cancellation date, and payments already made for completed work are non-refundable. If the Client does not respond or provide required content for an extended period, Round Logics may treat the project as paused and agree a revised timeline before resuming.
          </P>
        </Section>

        <Section n={12} title="Content & Ownership">
          <P>
            The Client confirms that it has the right to use all content, images and materials it provides. Ownership of the final website design and content passes to the Client on receipt of full payment. Round Logics may display the completed website in its portfolio unless the Client asks otherwise in writing.
          </P>
        </Section>

        <Section n={13} title="Acceptance">
          <P>
            The website is accepted when the Client approves it in writing or when it is published live at the Client's request. Approval of these Terms is confirmed by signing below or by written confirmation from the Client.
          </P>
          {has(d.additionalNotes) && <P><B>Additional notes: </B>{d.additionalNotes.trim()}</P>}
          <View style={s.signRow} wrap={false}>
            {[['For Round Logics', provider], ['For the Client', client]].map(([lbl, name]) => (
              <View key={lbl} style={s.signBox}>
                <Text style={s.strong}>{lbl}</Text>
                <Text style={s.small}>{name}</Text>
                <Text style={s.signLine}>Name:</Text>
                <Text style={s.signLine}>Signature:</Text>
                <Text style={s.signLine}>Date:</Text>
              </View>
            ))}
          </View>
        </Section>
      </Page>

      {/* ---------------- INVOICE (always a new page) ---------------- */}
      <Page size="A4" style={[s.page, { paddingTop: 44 }]}>
        <Chrome label="Invoice" client={client} header={false} />

        <View style={s.invTop}>
          <Logo width={150} />
          <View style={s.invMeta}>
            <Text style={s.invTitle}>INVOICE</Text>
            <View>
              <KV k="Invoice number" v={invNo} />
              <KV k="Invoice date" v={formatDate(d.invoiceDate)} />
              <KV k="Due date" v={has(d.dueDate) ? formatDate(d.dueDate) : 'As per payment terms'} />
            </View>
          </View>
        </View>

        <View style={s.partyRow}>
          <View style={s.party}>
            <Text style={s.metaLabel}>From</Text>
            <Text style={s.partyName}>{provider}</Text>
            <Text>{val(d.providerAddress, 'PROVIDER ADDRESS')}</Text>
            <Text>{val(d.providerEmail, 'PROVIDER EMAIL')}</Text>
            {has(d.providerPhone) && <Text>{d.providerPhone}</Text>}
          </View>
          <View style={s.party}>
            <Text style={s.metaLabel}>Bill to</Text>
            <Text style={s.partyName}>{client}</Text>
            {has(d.clientContactPerson) && <Text>Attn: {d.clientContactPerson}</Text>}
            <Text>{val(d.clientAddress, 'CLIENT ADDRESS')}</Text>
            <Text>{val(d.clientEmail, 'CLIENT EMAIL')}</Text>
            {has(d.clientPhone) && <Text>{d.clientPhone}</Text>}
          </View>
        </View>

        <Text style={[s.small, { marginBottom: 2 }]}>
          Project: Website design and development · Pages: {pages.length ? pages.join(', ') : '[LIST OF WEBSITE PAGES]'}
        </Text>
        <PhaseTable phases={phases} />

        <View style={s.totalsWrap}>
          <View style={s.totals}>
            {phases.map((ph, i) => (
              <View key={i} style={s.totalRow}>
                <Text style={{ color: MUTED }}>{phaseLabel(i)}</Text>
                <Text>{money(ph.amount)}</Text>
              </View>
            ))}
            <View style={s.grandRow}>
              <Text style={{ fontWeight: 700 }}>Total</Text>
              <Text style={{ fontWeight: 700 }}>{anyAmount ? money(total) : money('')}</Text>
            </View>
          </View>
        </View>

        <View style={s.box} wrap={false}>
          <Text style={[s.h2, { marginTop: 0 }]}>Payment instructions</Text>
          <KV k="Account name" v={val(d.bankAccountName, 'ACCOUNT NAME')} />
          <KV k="Bank" v={val(d.bankName, 'BANK NAME')} />
          <KV k="Account number" v={val(d.bankAccountNumber, 'ACCOUNT NUMBER')} />
          <KV k="IFSC" v={val(d.bankIfsc, 'IFSC CODE')} />
          {has(d.bankBranch) && <KV k="Branch" v={d.bankBranch} />}
          <KV k="UPI ID" v={val(d.upiId, 'UPI ID')} />
          <Text style={[s.small, { marginTop: 6 }]}>Please quote invoice number {invNo} as the payment reference.</Text>
        </View>

        <View style={[s.box, { backgroundColor: TINT, borderWidth: 0 }]} wrap={false}>
          <Text style={[s.h2, { marginTop: 0 }]}>Notes</Text>
          <Text>{val(d.paymentTerms, 'PAYMENT TERMS')}</Text>
          <Text style={{ marginTop: 3 }}>
            Annual domain and hosting renewal: {money(d.renewalCharge, 'RENEWAL CHARGE')} per year (billed separately). Additional revisions and out-of-scope work are charged as set out in the Terms & Conditions above.
          </Text>
        </View>

        <Text style={[s.small, { marginTop: 18, textAlign: 'center' }]}>
          Thank you for choosing Round Logics. For any questions about this invoice, contact {val(d.providerEmail, 'PROVIDER EMAIL')}.
        </Text>
      </Page>
    </Document>
  );
}
