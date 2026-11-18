# Dosthi Bandi Restaurant Dashboard
## Product Requirements & Mockup Specification — v4.1
**Status:** Updated architecture draft; mockups first, production implementation after approval  
**Date:** November 12, 2026  
**Primary goal:** Secure, mobile-friendly restaurant operations and financial dashboard with minimal ongoing infrastructure cost.

## 1. Product vision
Build one web application to monitor daily restaurant performance and enter or reconcile sales, Clover orders, catering, expenses, inventory, and notes. The dashboard must be reachable remotely from a mobile phone or desktop. Data must persist in a secure cloud database. Minimize manual entry and recurring hosting expenses without compromising access control, auditability, or payment-data security.

### Confirmed decisions
- Use the previously supplied Dosthi Bandi dashboard screenshot as the visual reference: dark navy sidebar, orange branding, light content area, summary cards, trends, charts, catering and notes.
- Keep daily sales and expense forms simple, matching the supplied screenshots.
- Open **New Daily Sale**, **New Catering Order**, and **New Expense** in a **right-side drawer** on desktop, not a separate page. On narrow mobile screens, use a full-screen sheet with the same fields.
- Catering list supports an accordion per order revealing item rows, quantities, assigned preparers, and payments.
- Automatic daily Clover sync is the desired default, with manual fallback and duplicate protection.
- Expense receipt upload is required.
- Complete and approve all mockup screens and workflows before implementing the production system.

## 2. Scope and delivery phases
### Phase A — Interactive mockups (next milestone)
All navigation, forms, drawers, accordions, validation states, mobile layouts, date filtering, mock charts, role previews, and sample-data workflows. Use realistic but explicitly **sample** values. Mockups do not represent connected Clover, WhatsApp, or production data.

### Phase B — Minimum viable production
Secure sign-in, owner/manager/staff permissions, cloud database, remote responsive dashboard, daily sales, notes, catering, expenses and receipt uploads, cash reconciliation, basic inventory entry, reporting, exports, and reliable Clover daily synchronization. Deployment and backup procedures.

### Phase C — Automation and intelligence
WhatsApp Business message ingestion with review/confirmation, improved expense-to-inventory extraction, receipt OCR/AI extraction with approval, advanced inventory usage and alerts, richer item profitability, and optional additional integrations.

**Priority:** Mockups first; WhatsApp and automatic receipt extraction are architecture considerations now, but should not block the core production release unless later promoted to MVP.

## 3. Information architecture
Recommended sidebar:
1. **Home / Dashboard**
2. **Orders Data** (Clover orders and item analytics)
3. **Daily Sales** (records and reconciliation)
4. **Catering Orders**
5. **Expenses**
6. **Inventory**
7. **Cash & Daily Closing**
8. **Reports**
9. **Exports** (owner only)
10. **Settings / Integrations / Users** (owner only; relevant restricted settings for manager if approved)

Persistent header: date or date-range picker, current business location (one location initially), sync status, current role/account. Mobile: compact navigation, large touch targets, responsive cards, no horizontal scrolling for primary actions.

## 4. Home / Dashboard
### Visual layout
- Header: Dashboard, selected business date, **+ New Daily Sale**.
- Summary cards: Total Sales, Cash Sales, Card Sales, Digital Cash, Cash In/Out (net movement), Catering Orders / Revenue.
- Sales trend: week, month, previous month and custom date range.
- Payment mix chart: Cash, Card, Digital Cash with mutually exclusive amounts and accurate percentages.
- Catering preview: upcoming orders, today’s scheduled orders, deposits/balances where appropriate.
- Daily notes: add, edit, view, and mark follow-up items (dues, stock shortage, reminders).
- Sync / reconciliation indicator: Clover last synced, missing days, discrepancies.
- Mobile: cards wrap to one or two columns; charts stack; action buttons remain reachable.

### Financial rules
- **Total sales = Cash sales + Card sales + Digital Cash sales** for the same business date and same accounting basis.
- Digital Cash (Zelle, UPI, other) is a distinct payment category and must not also be included in cash or card.
- Cash In/Out are movements, **not** additional sales.
- Catering order totals and deposits are tracked separately; avoid adding a catering total to sales if the payment is already included in daily payment transactions. Distinguish order booking, service date, payment date, and sales recognition policy.
- Sales, collections, pending dues, and open orders are different measures; never sum them indiscriminately.
- Charts must reconcile with summary cards. Show missing-data/reconciliation indicators rather than fabricating values.

## 5. Daily Sales Log
### Entry point
Dashboard **+ New Daily Sale** opens right drawer; also accessible from Daily Sales page. Date defaults to selected business date and can be changed.

### Form (based on screenshot)
- Date *
- Open Orders (count; optional/manual or Clover-derived, label source)
- Closed Orders * (count; Clover-derived when available)
- Zelle Received ($) * (part of Digital Cash, not all digital channels)
- Actual Cash ($) * — **definition to confirm:** cash sales collected vs physical cash counted
- Cash at Box ($) * — **definition to confirm:** physical cash remaining in drawer
- Amount Due / Pending ($) (outstanding receivables, not sales automatically)
- Daily Notes (multiline; follow-up flags optional)
- **Save Daily Sales**

### Required supporting fields/system behavior
- Card sales from Clover and separate other digital payment amounts (UPI/other) if applicable; source and import status shown.
- Clearly separate sales totals from cash-on-hand and pending dues.
- Date validation; nonnegative money fields except explicit signed adjustments; prevent accidental duplicate daily summaries.
- A date can be edited with audit history; edits to Clover-derived values require reconciliation/override workflow.
- Show calculated sales total and any difference from Clover after entry.
- If a required screenshot field cannot be derived automatically, allow manual entry.

## 6. Orders Data (Clover)
- Automatically ingest orders, order line items, payment details and statuses permitted by Clover API and account permissions.
- Default selected day; support date range, week, month, custom range.
- Filters: status (open/closed/refunded/voided where available), payment type, item, item category/type, date, order source.
- Summary: number of orders, closed/open counts, sales amount, average ticket, items sold, refunds/discounts where available.
- Table: order ID, date/time (restaurant local time), status, item count, order amount, payment method, source; expand row to view item quantities and modifiers if provided.
- Group-by views: day, week, month, item, category/item type, payment type, order status.
- Item analytics: quantity sold, sales by item, top items, frequently ordered item combinations, single-item vs multi-item orders.
- Exclude/label cancelled and refunded orders correctly. Distinguish orders from payments and ensure partial/multiple tenders do not duplicate orders.
- Sync indicator, error states, manual retry, import history and duplicate protection.

## 7. Catering Orders
### Main page
- List/table of orders, searchable and filterable by service date, status, customer, payment status.
- Each order shows customer, event date/time, head count, total, deposit paid, balance, status.
- **Accordion per order** expands to show all items, meal type, size/quantity, unit price, amount, **Prepared By**, special instructions and payment/deposit history.
- **+ New Order** opens right-side drawer; edit opens same drawer prefilled.

### New/Edit Order drawer (reference screenshot)
Customer details: full name*, phone*, email, party date*, head count, pickup/delivery, address if delivery, notes.

**Menu selection:** repeatable item rows with **+ Add New Row** and Remove:
- Meal type dropdown (Appetizer, Veg Entrée, Non-Veg Entrée, Rice, Bread, Dessert, Drinks, Other; configurable)
- Item name dropdown filtered by meal type; custom item text field
- Size / quantity (e.g. 2 medium trays), ideally structured quantity + unit/size for reporting
- Prepared By **free-text per item** (Chef, Person 1, Person 2, or arbitrary text)
- Unit price and calculated line total (optional if quote not finalized)

Order pricing and payments: order total, deposit(s), payment method/date, amount due, payment status. Statuses: New, Confirmed, Preparing, Ready, Completed/Delivered, Cancelled. Save, cancel, validation, unsaved-changes warning.

**Accounting:** deposits and later collections are payment events, not duplicate sales; the order’s service date may differ from payment date.

## 8. Expenses
### Main page
- Default filter: **current month**; selectable date range/day/month.
- Summary: total expenses, category breakdown, payment-method breakdown, missing receipts.
- Table: date, vendor, amount, category, payment method, receipt indicator, entered by; filtering/search and receipt preview.
- **+ New Expense** opens right-side drawer.

### Expense drawer (reference screenshot)
- Date *
- Store / Vendor Name *
- Total Amount ($) *
- Category (default Groceries / Inventory; configurable)
- Payment Method (e.g. Business Credit Card, Cash, Bank Transfer, Other)
- Notes / Items Purchased (optional multiline)
- Attach Receipt Photo (optional in form; feature required): mobile camera or file picker, upload progress, preview, replace/remove
- **Save Expense Entry**

Support multiple receipts if feasible, secure object storage, access checks and size/type validation. Store metadata and links, not publicly accessible receipt URLs. For cash expenses, reconcile to cash-out movements without double-counting.

## 9. Inventory Management
### MVP
- Inventory dashboard: purchased items this day/week/month, purchase spend, top vendors, categorized purchases, items needing review.
- Date picker with day/week/month/custom range.
- Inventory purchases list: date, item, quantity, unit, unit cost, vendor, linked expense, receipt, entry source.
- Manual add/edit inventory purchase item, link it to an expense, mark as reviewed.
- Expense-to-inventory extraction **from structured/manual item lines** when available; do not assume a generic expense total reveals item names or quantities.
- Distinguish purchases from stock on hand. Accurate on-hand quantities require opening stock, consumption, waste, transfers and adjustments; do not present purchases as current inventory.

### Future
- Receipt OCR/AI suggestions: identify item name, quantity, units and price; require human confirmation before posting.
- Stock counts, reorder thresholds, waste, recipe-level consumption, stock variance, alerts.
- User's unfinished phrase 'also have an option to …' remains an open requirement.

## 10. Cash & Daily Closing
- Opening cash, cash sales, cash in, cash out, cash-paid expenses, expected closing cash, counted closing cash, variance, notes, close/reopen with permissions.
- Explain differences between **Actual Cash** and **Cash at Box** once definitions are confirmed.
- Cash payments received for prior dues must be linked to receivables and not double-counted as new sales.
- Reconcile Clover card and any Clover cash tenders with manual summary; show unresolved differences.

## 11. Reports, exports and notes
- Reports: sales by day/week/month/year, payment mix, item/category sales, average ticket, catering performance, expenses, inventory purchases, cash variance, P&L where complete data supports it.
- P&L: distinguish cost of goods, labor, occupancy, utilities, operating expenses, taxes, owner draws, and cash flow; flag missing data.
- Exports: Excel/CSV for authorized owner; respect selected dates and filters; audit exports.
- Notes: date, author, text, optional category (due, stock, operations, catering), follow-up status, related order/customer where appropriate.

## 12. WhatsApp Business ingestion (planned integration)
### Desired workflow
Owner sends a structured or natural-language text from personal WhatsApp to the restaurant's WhatsApp Business number. The message is classified as sales, expense, inventory, catering, or daily note, parsed into fields, validated, and saved to the correct table **only after required checks/confirmation**.

### Example intents (illustrative)
- `Expense: Costco $84.25 groceries paid business card today; onions and rice`
- `Note: Follow up on $120 pending catering payment tomorrow`
- `Inventory: Bought 2 bags basmati rice at $28 each`

### Architecture and constraints
- **Do not assume ordinary personal-to-business WhatsApp messages can be automatically read** by the WhatsApp Business mobile app or Meta Business Suite. Programmatic ingestion generally requires an eligible WhatsApp Business Platform/API setup, registered number, webhooks, approved provider/configuration and compliance with Meta rules.
- Personal-number-to-business-number workflow feasibility, self-messaging restrictions, pricing, template/session rules and onboarding must be verified before commitment.
- Webhooks require a reachable HTTPS endpoint; a workflow running only on a laptop that is off cannot receive messages reliably. Use a hosted lightweight webhook or queue and let local n8n process later, or host the automation remotely.
- Parse into **draft records**, detect duplicates, validate category/amount/date, then send acknowledgement or request confirmation; maintain original message ID and processing/audit status.
- Minimize data shared with external processors; never send cardholder data or sensitive credentials over WhatsApp.
- WhatsApp should be an additional entry channel, not the sole method of recording critical financial information.

## 13. Architecture: low-cost and remotely available
### Approved design direction: two independent local jobs + cloud dashboard
- **Local host:** one Mac with 16 GB RAM; run Ollama for message parsing, n8n for orchestration, and a separate scheduled Python Clover sync process. Both jobs write to a cloud database via HTTPS with scoped credentials. Neither job is required for browsing already-synced data or submitting dashboard forms.
- **WhatsApp ingestion:** public HTTPS webhook verification and durable queue in cloud; local n8n polls and acknowledges only after successful processing. No public inbound port to the Mac is required.
- **Clover:** local scheduler executes incremental order/payment/item sync, plus daily reconciliation and missed-run backfill. No LLM in this job.
- **Reliability trade-off:** local jobs pause when the Mac sleeps, shuts down, or loses internet. Cloud dashboard stays online; data freshness and message processing lag are displayed.

### Recommended starting option
- **Frontend:** responsive static Next.js export or React/Vite SPA hosted on GitHub Pages, Cloudflare Pages or comparable free/low-cost static hosting. GitHub hosts **code/static files**, not the production database or privileged secrets.
- **Database/auth/storage:** managed PostgreSQL + auth + private receipt storage, e.g. Supabase, subject to current free-tier limits, retention and backup requirements.
- **Secure backend:** managed serverless/edge functions for Clover OAuth/token handling, sync jobs, privileged writes, webhook verification, and reports requiring elevated privileges. Options include Supabase Edge Functions, Cloudflare Workers or AWS Lambda + API Gateway.
- **Scheduled sync:** local OS scheduler or n8n trigger for the Clover batch, with a persisted checkpoint, bounded lookback, daily reconciliation, missed-run recovery, logs and manual retry. Optional cloud scheduler later if continuous availability becomes necessary.
- **Automation:** n8n locally for WhatsApp message processing and Ollama calls. The Clover batch is a separate local Python process. A cloud webhook relay and durable queue provide inbound-message buffering while the Mac is offline.
- **Remote access:** HTTPS public app with login; no local PC dependency for dashboard reads.

### Alternative AWS-centric option
Static frontend on S3/CloudFront (or Amplify), Lambda/API Gateway, managed auth and database. Compare AWS free-tier, networking, database and logging charges carefully; AWS is not automatically zero-cost and can be operationally more complex.

### Cost principles
- Aim for free tiers initially, **not a guarantee of $0**. Actual charges may arise from database storage, bandwidth, file uploads, scheduled jobs, WhatsApp messaging/provider fees, backups, domains and plan changes.
- Add budgets, billing alerts, retention limits and rate limiting.
- Avoid running an always-on VM just to serve a static dashboard.
- Never expose DB service keys, Clover tokens or WhatsApp secrets in static JavaScript or public GitHub repositories.
- Browser can access a managed database API **only under proper authentication and row-level security**; privileged integrations must remain server-side.

## 14. Roles and security
- **Owner:** full access, P&L, exports, user management, settings, integration setup, audit logs.
- **Manager:** operational sales entry, cash management, catering, expenses, daily closing; no P&L, unrestricted exports or user administration; restrict sensitive expense details.
- **Staff:** view-only approved operational data; no edits or financial reports.
- Enforce permissions on the server/database (e.g. RLS), not merely by hiding navigation items.
- Audit financial edits, imported data, receipts, deletions/voids, exports and close/reopen actions.
- Use encrypted transport, private receipt storage, backups and least-privilege API tokens. Do not store PAN/CVV.

## 15. Conceptual data model
- `users`, `roles`, `business_settings`
- `daily_sales` (business date, manual amounts, cash-count fields, dues, notes, reconciliation status)
- `sales_transactions` / `payments` (source, tender type, unique external ID, gross/net/refund fields)
- `clover_orders`, `clover_order_items`, `clover_sync_runs` (external IDs, item/category/modifier data where available)
- `cash_movements`, `daily_closings`
- `catering_orders`, `catering_items`, `catering_payments`
- `expenses`, `expense_receipts`, `expense_items`
- `inventory_items`, `inventory_purchases`, `inventory_adjustments` (adjustments may be future phase)
- `daily_notes`, `receivables` (if dues tracked as ledger)
- `inbound_messages`, `automation_runs`, `audit_logs`

Every financial row should record ID, business date, timestamp/timezone, source, created/updated by, status and relevant audit trail. External IDs must be unique per integration/source to make imports idempotent.

## 16. End-to-end user flows for mockups
1. **Daily sale:** Dashboard date → New Daily Sale → right drawer → enter fields/notes → validation → save → dashboard cards update → reconcile with Clover.
2. **Orders:** Orders Data → choose day/range → filter/group by item type → expand order → item analytics → export if authorized.
3. **Catering:** Catering Orders → New Order drawer → customer details → add/remove item rows → prepared-by per item → deposit → save → accordion expands → edit/status/payment update.
4. **Expense:** Expenses (current month) → New Expense drawer → vendor/category/payment → attach receipt → save → list updates → optionally review inventory purchase lines.
5. **Inventory:** Inventory → date range → purchased items from reviewed expense lines → add missing purchase item → link to expense → dashboard totals update.
6. **WhatsApp (simulated in prototype):** message received → classification → draft preview → validation/confirmation → save linked record → audit trail; include failed/ambiguous-message state.
7. **Daily closing:** review Clover sync → check sales/dues/cash → count cash → investigate variance → close day.
8. **Mobile:** login → dashboard → select date → open full-screen sales/expense/catering form → save → return to list.

## 17. Mockup inventory / acceptance checklist
- [ ] Desktop dashboard visually aligned with approved reference.
- [ ] Responsive mobile dashboard and navigation.
- [ ] Working date/range filters across all applicable screens.
- [ ] Daily Sale right drawer with screenshot fields, notes, calculations, save/edit validation.
- [ ] Clover Orders table with item accordion, filters, group-by and stats.
- [ ] Catering right drawer with repeatable item rows, dependent dropdown, custom item, prepared-by, deposits.
- [ ] Catering accordion on each saved order.
- [ ] Expense right drawer matching screenshot, including receipt selection/preview simulation.
- [ ] Inventory dashboard and purchase-item linkage to expenses.
- [ ] Cash and daily closing workflow.
- [ ] Reports, owner-only exports, settings, sync/error screens.
- [ ] Owner/manager/staff role previews with permission-sensitive views.
- [ ] WhatsApp ingestion **simulation** with approval and error states.
- [ ] Sample data reconciles correctly; no double-counted digital cash or catering payments.
- [ ] Explicit sample/mock data labels; no fake claims of connected services.
- [ ] User approves full flows before production implementation.

## 18. Open questions to resolve before production
1. Exact meaning of **Actual Cash** and **Cash at Box**, and whether **Open Orders** and **Closed Orders** are auto-populated from Clover.
2. Whether daily sales totals are **gross** or **net** of tax, tips, discounts and refunds; precise handling of Clover tender splits.
3. How pending dues are created, collected and cleared; whether they are tied to catering or other orders.
4. Which Clover account permissions, order/item fields and webhook/sync capabilities are available.
5. Whether the WhatsApp Business number is eligible for API onboarding and whether sending from the user's personal number to that number is supported as intended.
6. Whether inventory initially tracks **purchases only** or also physical stock counts, and completion of the unfinished inventory requirement.
7. Whether catering prices are required at order creation or can be added after quotation.
8. Preferred domain and whether free-tier usage/billing safeguards meet actual volume and reliability needs.
9. Data retention, backup frequency and recovery expectations.

## 19. Definition of done for the next step
The next deliverable is a **clickable, coherent full-app prototype** covering every screen and flow above, using local temporary/mock data only. No production database, Clover, WhatsApp, or payment integrations are required at mockup stage. After design approval, implement the MVP incrementally with explicit security and cost checks.


## 20. Mac 16 GB deployment profile (architecture decision)
### Runtime and model
- **Recommended:** Ollama running natively on macOS, with one quantized **Qwen3 4B** model loaded at a time. Alternative: quantized Gemma 3 4B. Benchmark JSON extraction on actual restaurant messages before selecting the production model. Use small context windows and bounded output; avoid concurrent large-model requests on a 16 GB machine.
- Apple Silicon is preferable for local inference. Intel Macs may run significantly slower; confirm chip, available storage, and macOS version before implementation. The 16 GB recommendation is a starting point, not a throughput guarantee.
- Run **n8n in Docker Compose** with persistent local volume, protected editor access, fixed encryption key and pinned image versions. Keep Ollama bound to localhost, not the public internet. On macOS, Ollama can run natively and n8n can access it through an appropriately configured Docker host endpoint.
- Run Clover sync as a **separate Python job** using `launchd` or a scheduler, with its own virtual environment, logs, retry/backoff and state. Avoid putting API credentials in source code or GitHub.
- Configure Mac sleep/power settings so expected scheduled jobs can run. Add catch-up sync after wake/restart; do not rely on scheduling alone for completeness.

## 21. Local job A — WhatsApp intake and AI extraction
### Data path
WhatsApp Business Platform → verified public HTTPS webhook → durable cloud inbox/queue → local n8n polling → Ollama → strict schema validator → duplicate/ambiguity checks → cloud database → processing acknowledgement.

### Requirements
1. Verify Meta webhook signature and deduplicate on provider message ID at the cloud ingress boundary. Respond quickly; never wait for local LLM inference inside webhook request.
2. Queue messages durably with statuses `received`, `claimed`, `parsed`, `needs_review`, `saved`, `failed`; use claim/lease semantics, retry caps and a dead-letter/review queue.
3. Extract **only** supported types: `expense`, `sales_payment`, `catering_payment`, `inventory_purchase`, `daily_note`, `unknown`. A message may contain multiple records.
4. Structured output includes source message ID, sender, original text reference, amount/currency, business date, category, vendor, payment method, confidence/validation flags and missing fields. Do not infer unknown prices, dates or payees silently.
5. Never allow model-generated SQL or arbitrary API actions. Use allowlisted operations and server-side validation. Require review for ambiguous payments, duplicates, unusually high amounts or conflicting data.
6. Avoid double-counting: a Zelle transfer is not automatically a new sale; reconcile against Clover, daily sales, catering deposits and receivables.
7. Save receipt/media attachments only with consent and through private storage. Apply access controls and data retention policies to message text, phone numbers and attachments.
8. Confirm actual WhatsApp Business Platform number eligibility, provider pricing, inbound-message behavior and permitted responses before production. Ordinary WhatsApp Business mobile app messages cannot be assumed accessible to n8n.

## 22. Local job B — Clover batch synchronization
### Data path
Mac scheduler → Clover authenticated API → paginated orders, line items, payments/refunds → deterministic transformation → cloud upsert → reconciliation → sync checkpoint.

### Requirements
1. Store merchant and integration configuration securely. Refresh/rotate tokens as supported by Clover's integration model.
2. Persist a checkpoint (`last_successful_sync_at`) plus a lookback window to capture late edits/refunds; use external IDs and upserts to prevent duplicates.
3. Handle pagination, rate limits, transient failures, partial batches and retries with exponential backoff.
4. Separate orders, order items, payments, taxes, tips, discounts, refunds and tender types where available. Never assume order total equals collected revenue.
5. Run incrementally during business hours if useful, plus overnight reconciliation. On restart, backfill all missed intervals.
6. Record sync-run start/end, item counts, failed records, checkpoint and status. Surface stale-data warnings in the dashboard.
7. Do not store card PAN, CVV or unnecessary payment credentials.

## 23. Cloud responsibilities and minimum security
- **Frontend:** React/Vite static SPA deployed to Cloudflare Pages or equivalent; mobile responsive, authenticated, accessible when Mac is offline.
- **Database:** Supabase Postgres with strict RLS, private receipt storage, role separation and backups appropriate to financial records.
- **Browser:** uses user authentication and RLS-limited client access; never receives privileged service keys.
- **Local jobs:** use a narrowly scoped ingestion API or database role with least privileges. Prefer server-side validation endpoints over exposing an unrestricted Supabase service-role key on the Mac.
- **Webhook relay:** cloud function/worker plus durable queue/inbox; verify provider signatures, restrict access, encrypt secrets and use replay protection.
- **Observability:** dashboard displays `last_whatsapp_processed_at`, `pending_message_count`, `last_clover_sync_at`, sync errors and retry status.
- **Backups:** plan export/restore testing and secure credential recovery; free tiers may not include the needed backup guarantees.

## 24. Local development and operational plan
1. Verify Mac chip (Apple Silicon vs Intel), macOS version, free disk and expected hours powered on.
2. Install Ollama and test Qwen3 4B on 20–50 representative, anonymized messages; measure extraction accuracy, latency and memory use.
3. Start n8n in Docker with persistent data, authentication and encryption key; keep management UI private.
4. Prototype WhatsApp processing with **manual sample payloads** before registering a live Meta number.
5. Implement a cloud inbox/queue with fake webhook events, leases, retries, idempotency and processing history.
6. Implement Clover batch against permitted test/sandbox access, using paginated data and safe upserts.
7. Deploy cloud DB, RLS, private storage, secure API and static dashboard; test all three roles.
8. Test outage cases: Mac sleeping, internet disconnected, duplicated webhook, Clover API failure, duplicate payment and interrupted batch.
9. Verify WhatsApp Business Platform setup and production permissions before enabling live ingestion.
10. Retain **mockups-first milestone**: architecture and workflow screens must be approved before production integration work.

## 25. Mockup additions and acceptance criteria for hybrid architecture
- Add an **Integrations & Job Health** screen with two independent cards: WhatsApp AI Processor and Clover Sync, each showing status, last run, pending count, error details and retry action (simulated in mockups).
- Add **WhatsApp Review Queue** for parsed drafts, uncertain classifications and duplicate warnings; owner/manager actions constrained by role.
- Add **Clover Reconciliation** view showing imported orders/payments versus manual daily sales, differences and last sync timestamp.
- Show offline/stale-source banners when the Mac jobs are not running, without disabling the cloud-hosted dashboard.
- Show a local architecture diagram and settings placeholders for webhook relay, queue, local worker credentials, model selection and job schedule. Never display actual secrets.
- Acceptance test: dashboard loads and permits authorized manual entry while the local Mac is off; queued WhatsApp events and missed Clover periods are processed once after the Mac returns online.

## 26. Remaining decisions
- Mac hardware chip (Apple Silicon/Intel) and whether it can remain awake during operating hours.
- WhatsApp Business Platform eligibility and whether the existing number can be connected without disrupting current business use.
- Whether incoming WhatsApp records require approval always, or only when ambiguous/high-value.
- Exact Clover sync frequency and local machine availability.
- Preferred hosting/provider free-tier constraints, backup retention and maximum acceptable data staleness.

## 24. Local deployment implementation profile (confirmed November 12, 2026)

**Confirmed hardware:** Mac, 16 GB RAM. **Not yet confirmed:** Apple Silicon vs Intel, free disk space, and whether the Mac remains awake 24/7.

### Services and isolation
- **Ollama:** install natively on macOS; run one quantized Qwen3 4B model as the default parser. Gemma 3 4B is a fallback to benchmark. Configure a narrow JSON schema, deterministic/low-temperature extraction, and no direct SQL-generation privileges.
- **n8n:** run as a Docker Compose service with a persistent volume, stable encryption key, editor authentication, pinned image version, and private-only admin access. The container connects to Ollama on the host through a configured Docker host address.
- **Job A (WhatsApp):** independently scheduled n8n polling of a durable cloud inbox fed by a verified WhatsApp Business Platform webhook. Parse via Ollama; validate and normalize; stage uncertain records for approval; write through a least-privilege ingestion endpoint; acknowledge queue messages only after successful durable write.
- **Job B (Clover):** independently scheduled Python job managed by macOS `launchd` (or equivalent). Fetch Clover orders, line items, payments and refunds using pagination and incremental checkpoints; upsert by source IDs; reconcile and log; run catch-up windows after downtime. Do not require Ollama for this job.
- **Cloud:** static React/Vite UI on Cloudflare Pages (or equivalent), Supabase Auth, PostgreSQL with RLS, private receipt storage, and narrowly scoped server-side functions for secure ingestion. Dashboard remains accessible while local jobs are offline; integration freshness timestamps and alerts remain visible.

### Initial operational settings (proposals, not approved production settings)
- Clover incremental synchronization every 30–60 minutes while the Mac is awake, plus overnight reconciliation; daily minimum and automatic catch-up on restart.
- WhatsApp inbox polling at short intervals, subject to provider rate limits and cloud free-tier capacity.
- Log per-run start/end, counts, validation errors, retries and last successful checkpoint for both jobs.
- Ensure data is encrypted in transit; keep tokens in local secrets storage/environment rather than Git; use separate credentials per job and least privilege.
- Test with synthetic/anonymized restaurant messages before handling live financial data.

### Acceptance criteria
1. Both jobs can run, fail, restart and recover independently.
2. The same WhatsApp message or Clover order cannot create duplicate financial entries on retry.
3. The dashboard works from mobile or desktop when the Mac is off, while showing stale integration status.
4. No direct public access to the Ollama API, n8n editor, local machine or database service-role credentials.
5. Financial entries derived from ambiguous WhatsApp text require review rather than silently affecting sales or P&L.
6. The full interactive mockup is approved before production development begins.

### Remaining hardware decision
Confirm whether the 16 GB Mac is Apple Silicon (M-series) or Intel before locking model quantization, performance expectations and Docker resource limits.

## Catering and payment-holder update — November 18, 2026

- Each catering order contains multiple item rows with quantity, whole-dollar integer unit price, and a Prepared by dropdown. Item total = quantity × unit price.
- Prepared by offers Chef, Sh, A, Md and preserves existing names. These names were confirmed by the owner; this replaces the earlier free-text form direction.
- Daily Sales and Catering Payments display Payment held by: Owner 1, Owner 2, Zelle, Bank. Holder/account is separate from payment method. A daily summary holds one selected holder; split allocations require a separate future ledger.
- Existing records retain unknown holders as Not recorded. Existing fractional item prices must be reviewed explicitly before converting their column to INTEGER; never round silently.


## Dashboard catering section — November 18, 2026

- Dashboard includes a separate catering panel filtered inclusively by order event date using the existing global date/range selection.
- Show selected orders with total, amount paid, amount due and expandable item details.
- Summary cards: order total, amount paid, amount due, Cash received, Zelle received, Bank received, and Card / other received. Group collections by payment method, independently of payment holder.
- Amount paid and method cards include the full payment history of selected orders, including deposits outside the event-date range. This is an event-order view, not a payment-date cash-flow report.
- Catered collections remain separate from daily sales revenue. Loading or failed catering requests show unavailable amounts, not zeros; catering failures do not hide daily sales.

- Dashboard catering collections also show a holder/account breakdown (Owner 1, Owner 2, Zelle, Bank, Not recorded), with Cash, Zelle, Bank, Card/other, and total received columns. Unassigned receipts remain visible. Holder totals use the same selected event orders as the collection cards. They are recorded receipts, not current balances or a transfer ledger.

- Collections by holder separates Catering cash, Daily sales cash, and Cash out. Cash out is assigned using a new `cash_out_holder` (Owner 1 / Owner 2), independent of the received-payment holder; there is no default payer and a payer must be selected when cash out is greater than zero. Existing cash-out records remain unassigned. Daily figures use business dates; catering figures use event dates. Keep the total catering-only so potentially overlapping sources are not summed automatically.
