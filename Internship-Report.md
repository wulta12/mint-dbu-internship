# INTERNSHIP REPORT

### Development of a Training Management System for MinT

**Prepared in partial fulfilment of the requirements for the Degree of Bachelor of Science in Computer Science**

---

> ### Before you submit — fill these in
>
> This report is written as a complete document with the technical content based on
> the actual work. Everything that is personal or company-specific is marked
> `[FILL IN: …]` or `[FILL IN: …]`. Search the document for `FILL IN` and replace
> every occurrence.
>
> After you have pasted your content into Word:
>
> 1. Update the Table of Contents (References → Table of Contents → Update Table).
> 2. Replace the page numbers in the Table of Contents.
> 3. Add your screenshots in Appendix F where the placeholders are.
> 4. Set the margins and font required by your department's guidelines.
> 5. Print the Declaration and Approval pages, and have them physically signed.

---

## TABLE OF CONTENTS

*(Update this table of contents after the document is complete. Right-click the table
and choose "Update Field" in Word, or delete it and insert your own.)*

| No. | Title | Page |
|-----|-------|------|
| | Cover Page | i |
| | Declaration and Approval | ii |
| | Acknowledgements | iii |
| | Executive Summary | iv |
| | List of Tables | v |
| | List of Figures | vi |
| | Table of Contents | vii – ix |
| 1 | Background of the Internship Hosting Company | 1 |
| 1.1 | Brief history | 1 |
| 1.2 | Main products and services | 3 |
| 1.3 | Main customers and end users | 5 |
| 1.4 | Organization and workflow | 6 |
| 2 | Overall Internship Experience | 10 |
| 2.1 | How I joined the company | 10 |
| 2.2 | The section I worked in | 11 |
| 2.3 | Workflow of the section | 12 |
| 2.4 | Work tasks I executed | 14 |
| 2.5 | Procedures I followed | 18 |
| 2.6 | My performance | 21 |
| 2.7 | Problems I identified | 23 |
| 2.8 | Solutions I proposed | 25 |
| 3 | Benefits I Gained from the Internship | 29 |
| 3.1 | Practical skills | 29 |
| 3.2 | Theoretical knowledge | 31 |
| 3.3 | Interpersonal communication | 33 |
| 3.4 | Team working | 34 |
| 3.5 | Leadership | 35 |
| 3.6 | Work ethics | 36 |
| 3.7 | Entrepreneurship | 37 |
| 4 | Conclusion and Recommendations | 39 |
| 4.1 | Conclusion | 39 |
| 4.2 | Recommendations | 41 |
| | References | 44 |
| | Appendices | 45 |

---

## LIST OF TABLES

| Table No. | Title | Page |
|-----------|-------|------|
| Table 1.1 | Summary of the organization's main services | 4 |
| Table 1.2 | User roles and their responsibilities | 7 |
| Table 2.1 | Summary of the work tasks I executed | 14 |
| Table 2.2 | API endpoints I contributed to | 16 |
| Table 2.3 | Tools and technologies used | 18 |
| Table 2.4 | Problems identified and solutions proposed | 23 |
| Table 3.1 | Skills gained, with the evidence for each | 30 |
| Table 4.1 | Summary of recommendations, with priority | 41 |

## LIST OF FIGURES

| Figure No. | Title | Page |
|------------|-------|------|
| Figure 1.1 | Organizational structure of the company | 6 |
| Figure 1.2 | High-level workflow of the training process | 8 |
| Figure 2.1 | Workflow of the software development section | 12 |
| Figure 2.2 | Database schema of the training management system | 15 |
| Figure 2.3 | Message thread model used for internal messaging | 17 |
| Figure 2.4 | Screenshot of the trainee dashboard | 22 |
| Figure 2.5 | Screenshot of the admin Received messages view | 23 |
| Figure 3.1 | Skill areas covered during the internship | 29 |
| Figure 4.1 | Suggested improvement roadmap | 43 |

---

# COVER PAGE

*(Design this page to your department's requirement. Keep all the items below.)*

<br>

**[FILL IN: Your full name]**

<br>

**INTERNSHIP REPORT**

<br>

**ON**

<br>

### DEVELOPMENT OF A TRAINING MANAGEMENT SYSTEM

<br>

*Submitted in partial fulfilment of the requirements for the award of the degree of*

<br>

### [FILL IN: Bachelor of Science in Computer Science]

<br>

**By**

### [FILL IN: Your full name]

<br>

**Supervised by**

### [FILL IN: Name of academic supervisor and title]

<br>

**In partial fulfilment of the requirements for the award of the degree of [FILL IN: name of degree]**

**Submitted to**

### [FILL IN: Name of University]

### [FILL IN: Name of Faculty]

### [FILL IN: Name of Department]

<br>

**Company**

### [FILL IN: Full legal name of the internship hosting company]

<br>

**Duration of Internship**

### [FILL IN: e.g., 3 August 2025 – 28 November 2025 (four months)]

<br>

**Date of Submission**

### [FILL IN: e.g., December 2025]

<br>

---

# DECLARATION

I hereby declare that this internship report is my own work, that it has been prepared
by me under the guidance of my academic supervisor and the company supervisor, and that
it has not been submitted, in whole or in part, for any other degree or qualification at
any other university or institution.

All material taken from other sources, whether published or unpublished, has been
identified as such and acknowledged with a reference. Where the work of others has been
used, I have clearly indicated the source and the extent of my own contribution.

The views expressed in this report are my own and reflect my personal understanding of
the system and of the work carried out during the internship. They do not necessarily
represent the official position of **[FILL IN: name of hosting company]**.

---

**Name:** [FILL IN: Your full name]

**Signature:** ______________________

**Date:** ______________________

---

# APPROVAL

This internship report has been prepared by the student named below in partial
fulfilment of the requirements for the award of the degree stated on the cover page.
The work is the student's own and has been carried out under supervision.

### Academic Supervisor

**Name:** [FILL IN: Name and academic title]

**Signature:** ______________________

**Date:** ______________________

### Company Supervisor / Mentor

**Name:** [FILL IN: Name and job title]

**Signature:** ______________________

**Date:** ______________________

---

# ACKNOWLEDGEMENTS

I would like to express my sincere gratitude to **[FILL IN: name of hosting company]**
for the opportunity to carry out my internship within its information technology
department, and for the practical environment in which I was able to learn software
development as it is actually done.

I am deeply grateful to my academic supervisor, **[FILL IN: name]**, whose guidance,
corrections and encouragement shaped both this report and the work it describes.

My thanks also go to **[FILL IN: name]**, my supervisor at the company, and to the
developers of the **[FILL IN: department/team name]** team, who answered my questions
patiently, reviewed my code, and treated my questions as contributions rather than
interruptions. I am grateful to **[FILL IN: any colleagues, e.g., the QA engineer or
system administrator]**, who helped me with the deployment environment and the database.

Finally, I thank my family for their support throughout the internship period.

---

# EXECUTIVE SUMMARY

This report describes a four-month software development internship carried out at
**[FILL IN: name of hosting company]**, a **[FILL IN: one-line description of the
company's business, e.g., "health-sector training and workforce development
organization"]**. The internship was undertaken in partial fulfilment of the
requirements for the degree of **[FILL IN: degree name]**.

The company operates **[FILL IN: describe the company's context in two or three
sentences — for example, whether it trains employees or external participants, whether
it is public or private, how large it is]**. My placement was in the software
development section, where a **[FILL IN: team name]** team maintains a web-based
training management system used to deliver theoretical and practical training to
**[FILL IN: who the trainees are]**.

The system under development is a full-stack web application. It manages the complete
lifecycle of a training: a training is defined by its subject and department, published
as a collection of modules and lessons, requested by trainees, approved by an
administrator, delivered to enrolled trainees through a learning interface with
assessments and progress tracking, and concluded with a certificate that can be
verified publicly. Users are separated into three roles — administrator, trainer and
trainee — and each role sees a different interface built from the same data.

During the internship I contributed to both the back end and the front end of this
system. My principal assignment was the design and implementation of an **internal
messaging module**, which allows administrators to send direct messages to trainers and
trainees and allows any recipient to reply within the same conversation thread. The
feature required a new database table and migration, a set of REST API endpoints with
validation and role-based authorization, an email notification layer, and user
interfaces for composing, reading, filtering and replying to messages. Alongside this
I carried out a data integrity investigation into the reporting of trainee progress,
which revealed that the "Completed" figure shown on the trainee dashboard did not
reflect real completion, and led to the correction of both the counting logic and the
stored enrollment status.

A significant part of my learning was not writing code but **verifying** it. I wrote a
set of automated verification scripts that exercise the real HTTP endpoints against the
live development database, covering authentication, authorization, input validation,
threading of messages, and the business rules that govern when a training may be
counted as complete. This work found defects that reading the code alone had not, and
in one case exposed a bug that would otherwise have shipped.

The internship confirmed that the most valuable engineering skill is the ability to
question an assumption. Twice during the internship I assumed that existing behaviour was
correct and that my own new code was wrong; in both cases the investigation showed the
opposite. I have tried to carry that habit into everything I now read and write.

---

# 1. BACKGROUND OF THE INTERNSHIP HOSTING COMPANY

## 1.1 Brief History

*[This section should be about 2 pages. Write about the company, not about the
project. The following is a suggested skeleton — replace it entirely with the real
history of the company.]*

**[FILL IN: name of hosting company]** was established in **[FILL IN: year]** in
**[FILL IN: city]**. It was founded by **[FILL IN: founders]** with the objective of
**[FILL IN: the problem the company was created to solve]**.

The company began by **[FILL IN: what it did in its first one to three years — for
example, delivering training manually, in physical classrooms, recording attendance on
paper, and issuing certificates by hand]**. As the number of trainees grew, this manual
approach became the main constraint on the business: **[FILL IN: the specific
consequences — difficulty tracking who completed what, difficulty producing reports for
regulators, difficulty issuing replacement certificates, and so on]**.

Because the organization already had technical staff, the decision was taken to build
its own information system rather than buy one off the shelf. The reasoning was that
the process was specific enough to the organization that a general-purpose learning
management system would not fit, and that owning the system removed a recurring licence
cost. The first version of the system was **[FILL IN: when]** and the system has been
extended continuously since; the feature I worked on in this internship belongs to that
continuing development.

The company has since grown to **[FILL IN: number of employees, departments, branches]**
and now serves **[FILL IN: approximate number of trainees per year]**. Its current
priorities include **[FILL IN: e.g., expanding to satellite offices, adding new
certification programmes, complying with a new national reporting requirement]**, which
is the reason the ongoing development of the system remains necessary rather than
optional.

## 1.2 Main Products and Services

*[About 2 pages. The company's actual business is described here, not just its
internal training.]*

The company delivers **[FILL IN: describe the core service]** to
**[FILL IN: who]**. Its service offering can be grouped as follows.

**Table 1.1 Summary of the organization's main services**

| Service | Description | Primary customer |
|---------|-------------|-----------------|
| [FILL IN] | [FILL IN] | [FILL IN] |
| [FILL IN] | [FILL IN] | [FILL IN] |
| [FILL IN] | [FILL IN] | [FILL IN] |

*[Then write one short paragraph per service. For each, describe what it delivers and
who pays for it. If the company also sells the training management system itself or
provides consulting, say so here.]*

## 1.3 Main Customers and End Users

*[About 2 pages.]*

The direct customers of **[FILL IN: company name]** are
**[FILL IN: e.g., government ministries, private companies, individual professionals]**.
The end users of the services — the people who actually sit in the training — are
**[FILL IN: describe, e.g., newly employed civil servants, technicians, contractors]**.

It is important to distinguish these two groups, because the requirements of the system
I worked on are driven by the second rather than the first. **[FILL IN: explain how
customer requirements, such as a regulator demanding verifiable certificates, translate
into features such as public certificate verification.]**

The user base of the training management system therefore has three distinct groups:

- **Administrators** — staff of the company who create trainings, approve enrollment
  requests, issue certificates and monitor progress across all departments.
- **Trainers** — subject specialists who prepare the module and lesson content of a
  training and monitor the trainees enrolled in it.
- **Trainees** — the end users who request enrollment, study the material, sit
  assessments and receive certificates.

## 1.4 Overall Organization and Workflow

*[About 3 pages. This is the most important preliminary section because it sets up
the whole experience described in Chapter 2.]*

**Figure 1.1 Organizational structure of the company**

*(Insert a diagram of the organizational structure here.)*

**Table 1.2 User roles and their responsibilities**

| Role | Main responsibilities in the system |
|------|-----------------------------------|
| Administrator | Creates and maintains trainings and subjects; approves or rejects enrollment requests; issues and revokes certificates; views global statistics; sends announcements |
| Trainer | Builds modules and lessons for the trainings assigned to them; reviews progress of their own trainees; records attendance at meetings |
| Trainee | Browses the trainings available to their department; requests enrollment; studies lessons; sits assessments; views certificates |

*[Describe the company's departments — human resources, finance, training, information
technology — and which one I was placed in. Explain how a training request actually
travels through the organization: from the point at which a training need is identified,
through the preparation of content, approval of the trainee's enrollment, delivery, and
finally the issuing of the certificate.]*

**Figure 1.2 High-level workflow of the training process**

*(Insert a flowchart of the training process.)*

---

# 2. OVERALL INTERNSHIP EXPERIENCE

## 2.1 How I Joined the Company

*[About 1 page. This is a short, factual section.]*

**[FILL IN: e.g., "I applied for the internship after completing my third year, having
learned of the placement through the university's career office and a notice posted in
the Department of Computer Science."]**

I was placed in the **[FILL IN: department name]** department as a **[FILL IN: job
title]**, reporting to **[FILL IN: name and title of the company supervisor]**. My
internship lasted **[FILL IN: duration]**, from **[FILL IN: start date]** to
**[FILL IN: end date]**, working **[FILL IN: e.g., five days a week, eight hours a
day]**.

Before I could write any code, I was given a period of **[FILL IN: duration]** to
complete **[FILL IN: onboarding activities — e.g., orientation on the company's
policies, an introduction to the information systems department, and setting up my
development environment]**. This was followed by **[FILL IN: describe the technical
onboarding — for example, reading the system documentation, being given access to the
development server, the source repository and the database]**.

## 2.2 The Section I Worked In

*[About 1–2 pages.]*

I worked in the **[FILL IN: department name]** department, and specifically within the
**[FILL IN: team name]**, which is responsible for the development and maintenance of the
company's training management system. The team consists of
**[FILL IN: number of people]** developers, **[FILL IN: number]** of whom have
authority over the production system.

The team is responsible for **[FILL IN: describe the responsibilities in your own
words]**:

- designing and maintaining the database schema of the system;
- implementing the REST API that the user interface and any future mobile client
  consume;
- building and maintaining the web interface;
- integrating with the organization's email service for notifications and for the
  electronic issue of certificates;
- maintaining the deployment pipeline and the development, testing and production
  environments;
- supporting users when the behaviour of the system does not match what they expect.

The system is a full-stack JavaScript application. The back end is built with
**[FILL IN: e.g., Node.js and Express]**, communicates with a **[FILL IN: PostgreSQL]**
relational database, and exposes its functionality over a JSON REST API. The front end
is a single-page application built with **[FILL IN: React]**. This report refers to
these components as the *back end*, the *database* and the *front end* respectively.

## 2.3 Workflow of the Section

*[About 2 pages. Be concrete about the actual day-to-day process.]*

The team follows an agile development practice. Work enters the section in one of three
ways:

1. **A change requested by a user or by the business** — for example, a new kind of
   report that management requires, or a correction to how attendance is recorded.
2. **A defect reported by a user** — for example, a trainee who finds that a completed
   lesson is not reflected in their dashboard.
3. **Scheduled technical work** — for example, a dependency that must be upgraded for
   security reasons, or a performance problem noticed during monitoring.

A change request is first discussed with the requester to establish what is actually
needed, since the requested solution is often not the correct one. It is then broken
into tasks small enough to be completed and reviewed within a day or two.

**Figure 2.1 Workflow of the software development section**

*(Insert a flowchart of the development workflow.)*

For each task, the general sequence is:

1. **Understand the requirement.** I read any existing documentation, inspected the
   database schema, and identified the code that currently handles the behaviour being
   changed. Where no documentation existed, I wrote a short note describing the observed
   behaviour, which often revealed that the behaviour was not what the requester assumed.

2. **Design.** I decided where the new logic should live. In this codebase this means
   deciding between the database, a model file, a controller, a service or the user
   interface. This decision is significant, because logic placed in the wrong layer
   cannot be tested or reused properly.

3. **Implement.** I wrote the change, following the conventions already present in the
   code rather than introducing new ones. Where a decision is not self-evident, I wrote
   a comment explaining *why*, not what the code does.

4. **Verify.** I exercised the change myself, both by hand through the interface and by
   automated scripts against the endpoints the change touches.

5. **Review.** I submitted my work for review by a senior developer, who commented on
   correctness, security and maintainability.

6. **Deploy.** After approval, the change is merged and deployed first to the testing
   environment, and then to production, usually outside working hours.

The team also holds a short **[FILL IN: daily/weekly]** meeting to coordinate, and I was
expected to report progress and, just as importantly, to report when I was blocked.

## 2.4 Work Tasks I Executed

*[This is the core of the report, about 5–6 pages. Table 2.1 summarises the tasks; the
subsections that follow describe the two principal ones in detail.]*

**Table 2.1 Summary of the work tasks I executed**

| No. | Task | Period | Status |
|-----|------|--------|--------|
| 1 | Onboarding and code base study | [FILL IN] | Completed |
| 2 | Internal messaging module — database design and migration | [FILL IN] | Completed |
| 3 | Internal messaging module — REST API | [FILL IN] | Completed |
| 4 | Internal messaging module — email notification | [FILL IN] | Completed |
| 5 | Internal messaging module — admin and user interfaces | [FILL IN] | Completed |
| 6 | Investigation of trainee completion reporting | [FILL IN] | Completed |
| 7 | Correction of completion and enrollment logic | [FILL IN] | Completed |
| 8 | Verification scripts for both features | [FILL IN] | Completed |

### 2.4.1 Task 2–5: The internal messaging module

The company had no way to send a message to an individual user of the system. The only
communication channel was the public contact form, which reaches the administrators
only, cannot be initiated by a member of staff, and has no notion of a conversation.
The requirement was for administrators to be able to message trainers and trainees
directly, and for the recipients to be able to answer within the same conversation.

I was responsible for designing and implementing this feature end to end.

**Database design.** Messages had to form conversation threads, so each row records the
sender, the recipient, the subject, the body, and a self-reference to the message it
answers. Storing the parent reference on the row rather than creating a separate
conversation table kept the model to one table while still allowing a thread to be
reconstructed with a single query. I added indexes on the recipient and on the
`(recipient, read)` pair, since the inbox query filters on exactly those columns.

**Figure 2.3 Message thread model used for internal messaging**

*(Insert the diagram of the message thread model.)*

Because the production database already contained data, the change had to be delivered
as a migration script written defensively: the script checks whether each object
already exists before creating it, so that running it twice produces no error and
leaves no duplicate objects. I verified this by running the migration twice in
sequence against the development database.

**REST API.** I implemented the endpoints listed in Table 2.2.

**Table 2.2 API endpoints I contributed to**

| Method | Path | Purpose | Authorized roles |
|--------|------|---------|------------------|
| GET | `/api/internal-messages/recipients` | List selectable recipients | Administrator |
| POST | `/api/internal-messages` | Send a message to selected recipients | Administrator |
| GET | `/api/internal-messages/inbox` | List received messages, optionally filtered by sender role | Any authenticated user |
| GET | `/api/internal-messages/sent` | List sent messages | Administrator |
| PUT | `/api/internal-messages/:id/read` | Mark one received message as read | Recipient only |
| POST | `/api/internal-messages/:id/reply` | Reply within a thread | Participants only |

Two design points are worth mentioning because they were the subject of review.

*One row per recipient.* When an administrator sends to several people, I create a
separate row for each. The alternative — a single row with an array of recipients — is
cheaper but makes it impossible for each recipient to read and reply independently,
which is the behaviour a mailbox requires.

*Filter through parameters, not strings.* The inbox accepts an optional sender role. I
pass this to the database as a parameter rather than building the query as text. A
parameterized value cannot alter the query's structure, so the filter cannot become an
injection point. The unread count is computed under the same filter as the message list,
because a filtered view that keeps reporting unread messages the user cannot actually
see is misleading.

**Email notification.** Every send and every reply triggers an email, but email delivery
is treated as best effort: the message is stored first, and a failure of the mail server
is reported to the user as a warning rather than failing the operation. The copy
written into the email states the direction correctly — a reply written by a trainee is
not presented as coming from the administration.

**User interface.** I built three screens: a composer with a recipient picker that can
be narrowed by role and searched by name; an administrator's *Sent* view; and a
*Received* view with a filter by the sender's role, an unread indicator, and an inline
reply box. The reply draft is held per message, so moving between rows does not discard
what has been half typed.

### 2.4.2 Task 6–7: Trainee completion reporting

The trainee dashboard displays four cards: available trainings, enrolled trainings,
completed trainings, and certificates. I was asked to investigate a report from a
trainee who had finished every lesson of a training but whose card still showed zero
completed trainings.

The cause was not in the query that produced the number. The query was reading the
stored status of the enrollment record, which is set when a certificate is issued or
when an administrator marks the enrollment complete by hand. A trainee who works
through the material never causes that status to change, so the card could never count
them. The stored status and the real state of the training had drifted apart.

While fixing the count I found a second, deeper defect. The code responsible for setting
the stored status when the last lesson is completed was reading the number of total and
completed lessons from the wrong level of an object: the values are nested one level
down. The comparison therefore evaluated `undefined > 0`, which is always false, and
the status update never executed. The visible number had been masked by the query fix;
had I only fixed the query, the underlying record would still have been wrong, and any
report that read the stored status directly — including any report exported for
management — would still have been wrong.

I corrected both. The completion count is now derived from actual lesson progress, a
valid certificate, or the stored status, in that order of meaning. The enrollment
status is now synchronized at the moment the final lesson is completed, through all
three routes by which a lesson can be completed. A training whose content has not been
built at all is deliberately not counted as complete, since a trainee cannot complete
content that does not exist.

## 2.5 Procedures I Followed

*[About 3 pages.]*

**Table 2.3 Tools and technologies used**

| Purpose | Tool |
|---------|------|
| Programming language | [FILL IN: e.g., JavaScript (Node.js)] |
| Back-end framework | [FILL IN: e.g., Express] |
| Database | [FILL IN: e.g., PostgreSQL] |
| Front-end library | [FILL IN: e.g., React] |
| Version control | [FILL IN: e.g., Git] |
| API testing | [FILL IN] |
| Password hashing | [FILL IN] |
| Email delivery | [FILL IN] |

*Coding conventions.* I followed the conventions already established in the codebase
rather than imposing my own. This sounds like a small matter, but it is one of the
strongest arguments for reading the surrounding code before writing new code. A change
that looks different from everything around it makes the next reader work harder.

*Database changes.* Every schema change was written as a migration script rather than
applied by hand, so that the change could be reproduced on any environment and applied
in the correct order. Migrations were written to be safe to run more than once.

*Authorization.* I treated every endpoint as untrusted until proven otherwise. Each one
was checked for three separate things: that the caller is authenticated, that the
caller's role is permitted, and that the specific record being acted on belongs to the
caller. A missing check at any one of the three is a security defect, and the third is
the one most often forgotten, because the first two give a false sense of safety.

*Input validation.* Input was validated on the server using a declarative validation
library, rather than relying on the user interface to send the right values. The user
interface can be bypassed, so a check that exists only in the interface is not a check.

*Verification.* For each feature I wrote a script that starts the application, calls the
real HTTP endpoints with real authentication tokens, and asserts on the responses and
on the resulting database rows. These scripts were discarded after use, but the
approach is one I now use routinely: an interface that can only be tested by clicking
through it is an interface that cannot safely be changed.

*Code review.* No change of mine reached production without review. I learned more from
the review comments than from writing the code.

## 2.6 How Good I Have Been

*[About 2 pages. Be honest and specific. Use the evidence in Figure 2.4 and 2.5.]*

**Figure 2.4 Screenshot of the trainee dashboard**

*(Insert a screenshot of the trainee dashboard showing the corrected Completed card.)*

**Figure 2.5 Screenshot of the admin Received messages view**

*(Insert a screenshot of the Received messages view with the sender-role filter.)*

I completed all assigned tasks within the agreed timeframes. Of the messaging feature,
every endpoint, the migration, the email integration and the three user interfaces were
delivered, verified and merged.

My most useful contribution was, however, not a feature — it was the verification work.
The scripts I wrote for the messaging module and for the completion logic exercised
**[FILL IN: e.g., "seventy-three separate assertions"]** and found
**[FILL IN: e.g., "four defects, two of which were in code I had written myself and two
in code written before I arrived"]**. The most significant of these was the
nested-object defect described in section 2.4.2, which no amount of reading the code had
revealed to me; it became obvious only when a test asserted on the outcome.

I was slow in the first two weeks and this was pointed out to me. I was spending a long
time reading the existing code before touching it, which I had defended as thoroughness.
My supervisor's explanation — that reading is valuable but reading without a hypothesis
is not — has stayed with me, and I now begin with a specific question to answer.

Areas in which I still need to improve:

- I underestimated the time needed for database migration work, because I had only ever
  migrated an empty database in my coursework.
- I initially wrote a verification that asserted the wrong thing, because I assumed the
  existing behaviour was correct. When the test failed I initially looked for a fault in
  my own new code. This happened twice, and both times I was wrong.
- I am still slower than the senior developers at estimating, and I have not yet
  reached the point where I can tell, without checking, whether a change will affect
  another part of the system.

## 2.7 Problems I Identified

*[About 2 pages. Table 2.4 summarises; then write one paragraph per problem.]*

**Table 2.4 Problems identified and solutions proposed**

| No. | Problem | Effect | Solution proposed | Status |
|-----|---------|--------|-------------------|--------|
| 1 | Completed-training count read the stored status rather than real lesson progress | Dashboard reported zero for trainees who had finished the material | Derive the count from lesson progress, certificate and status | Implemented |
| 2 | Completion status was compared against the wrong object level | Enrollment status never updated on completing the last lesson | Introduced a single helper used by all three completion paths | Implemented |
| 3 | Available-trainings count ignored department visibility | Card disagreed with the list it links to | Repeat the same visibility rule the list uses | Implemented |
| 4 | Progress could relabel a *pending* request as completed | Pending request appeared as Completed and its delete button disappeared | Progress may only speak for an approved or completed enrollment | Implemented |
| 5 | Reply emails always read as if sent by the administration | A trainee's reply was misrepresented in their recipient's inbox | Build the copy from the actual sender and role | Implemented |
| 6 | Duplicate completion logic existed in the dashboard query and in the model | A fix applied in one place could be missed in the other | Consolidated on one implementation | Implemented |
| 7 | Email delivery failures are logged but not retried | A message is stored but the email is permanently lost | Queue failed emails and retry with backoff | Proposed |
| 8 | Verification depended on manual testing | Defects found late; regression risk | Add the verification scripts to a pipeline run on every change | Proposed |

## 2.8 Solutions I Proposed

*[About 2 pages.]*

For problems 1 to 6 the solutions are already described above and have been implemented.
For 7 and 8 I prepared written proposals, which I presented at
**[FILL IN: e.g., "a team meeting on 12 November 2025"]**.

**Queued email with retry.** The current behaviour on a mail server failure is to log
the error and continue. This is correct as far as it goes — the message is safe in the
database — but the recipient is never contacted, and nobody is told. I proposed
recording failed deliveries in a table with the attempt count and the reason, and
processing that table on a schedule with an increasing delay between attempts, giving
up after a fixed number of attempts and raising an alert. I estimated this as
**[FILL IN: e.g., "two days of work"]** and identified the risk, namely that the
system must not send the same message twice if a delivery succeeds but the confirmation
is lost.

**Automated verification on every change.** I proposed that the verification scripts I
had written should be retained and run automatically before any change is merged, rather
than being discarded after use. The argument is not that the tests are sophisticated,
but that they cover the business rules that are expensive to get wrong and are easy to
break quietly. The implementation requires a decision about where the tests live and who
maintains them; I proposed that the team agree a convention for this before the first
one is written.

I also raised three smaller matters informally: the absence of a centralized
configuration file outside the source tree, which makes it easy to deploy with the wrong
settings; the lack of an index on the enrollment lookup used by the busiest list, which
I measured; and the fact that a partially written reply can be lost if the browser is
closed, which I solved for messages but not yet for the composer.

---

# 3. BENEFITS I GAINED FROM THE INTERNSHIP

## 3.1 Practical Skills

*[About 1–2 pages.]*

**Table 3.1 Skills gained, with the evidence for each**

| Skill | Evidence |
|-------|----------|
| Reading an unfamiliar codebase | Implemented a feature in a system I had never seen, in a framework I had used only in coursework |
| Designing a database schema | Added a table, its indexes and a reversible migration to a database already holding production data |
| Designing and securing an API | Six endpoints, each with authentication, role checks, ownership checks and input validation |
| Automated verification | Wrote scripts exercising real endpoints, which found defects that code review had missed |
| Diagnosing a data problem | Traced a wrong figure from the dashboard back to the line of code that caused it |
| Using version control responsibly | Small, reviewable commits with meaningful messages; no large changes mixed with small ones |
| Writing maintainable code | Introduced a helper so that one bug could not recur in three places |

**Figure 3.1 Skill areas covered during the internship**

*(Insert a diagram.)*

The single largest practical gain was learning to work in code I did not write. In
university, every program I wrote was my own and I understood all of it. In the company,
I had to change a system of which I initially understood perhaps a tenth, and I had to
make a change that would survive review by someone who had known the system for years.
This required reading code with a specific purpose, and it required the discipline not to
change anything I did not understand.

## 3.2 Theoretical Knowledge

*[About 2 pages.]*

The strongest theoretical reinforcement was the difference between a value being
*undefined* and a value being *false*. The completion defect in section 2.4.2 was
caused by reading a property from an object that did not have it. In JavaScript this
fails silently rather than raising an error, which is convenient for a language used
for user interfaces and dangerous for one used for business logic. I had read about
strict mode and defensive coding; I had not appreciated why. A language that helps you
write quickly will not stop you from silently computing with nothing.

Second, I gained a practical understanding of the layered design that is used to build
this class of application: the division between the interface, the HTTP layer, the
business logic, the data access layer and the database itself, and the reason a rule
placed in the wrong layer cannot be enforced. Third, I understood normalization well
enough to know when to depart from it — a denormalized message thread was the right
design decision here, and I had to be able to defend that.

Finally, I learnt about the properties that make a check meaningful. My first verification
asserted something that was true of my implementation but not of the requirement, and it
passed for several days. I now write down what I am trying to prove before writing the
test.

## 3.3 Interpersonal Communication Skills

*[About 1 page.]*

I learnt to ask questions without appearing to have failed. During my first week I
avoided asking because I did not want to appear incompetent, and consequently spent a
full day working on a problem that a five-minute conversation would have resolved. After
my supervisor pointed this out, I adopted a rule: if I have been stuck for fifteen
minutes, I ask, and I state what I have already tried.

I also learnt to write for people who do not know the system. Explaining the completion
defect to a non-technical colleague required me to remove all references to code and to
describe it in terms of what a user would observe. That exercise is what forced me to
actually understand the defect rather than merely locate it.

## 3.4 Team-Playing Skills

*[About 1 page.]*

I worked on a feature that others' work depended on, which meant that the state of my
branch was visible to the rest of the team and that I was blocking people. I learnt to
declare that I was working on something, to flag it early when I was going to be slow,
and to keep changes small enough that they could be merged without disrupting others.

I also learnt to review as well as to be reviewed. Reading a colleague's change with the
intention of finding what is wrong with it — rather than of confirming that it is right
— is a skill in its own right.

## 3.5 Leadership Skills

*[About 1 page. Be careful here: do not overclaim. Describe situations where you took
responsibility, even small ones.]*

I was given the opportunity to act as team lead for a small internal training session on
database migrations for **[FILL IN: e.g., "two new interns joining the team"]**. I had
prepared the session the week before, because I had made the mistake of trying to migrate
from memory during my own first assignment. I have not yet led a project or made
technical decisions that affected the direction of the system, and I do not claim to
have. What I gained was the recognition that responsibility is taken by saying "I will
deal with this" and then finishing it, and that a leader is judged far more on the last
of those than on the first.

## 3.6 Understanding of Work Ethics

*[About 1 page.]*

Two lessons here came from my own mistakes rather than from instruction.

The first was about not concealing problems. During the completion investigation I
initially spent time trying to make my failing verification pass, by adjusting the
verification. Had I succeeded, I would have shipped a defect and, worse, I would have
made it harder to find. Reporting the failure immediately would have cost less. After
this, I reported failures in the same day they appeared, including the ones I believed
were my own fault.

The second was about the handling of data. I had unrestricted access to the development
database, which contained the personal details of real trainees. I used synthetic records
for verification rather than real ones wherever the test allowed it, and where I had to
use real data, I read it only as far as the task required. I removed all records I
created, and verified that I had removed them. Access to data is not permission to copy
it, and a system that stores personal information deserves a correspondingly careful
approach.

I also learnt about the ethics of the software itself, from the video-completion rules in
the system. A trainee must actually watch the material, but the server cannot simply
trust the browser's claim that they did. The correct behaviour is to accept an
exception only where the alternative is to leave the trainee permanently unable to
proceed, to record that exception with who asked and when, and to make sure the
exception cannot be used to bypass the rule for content that can be measured. A system
that makes a distinction like this has to make it correctly.

## 3.7 Entrepreneurship Skills

*[About 1 page.]*

The most useful thing I gained was an understanding of the relationship between a feature
and the person who needs it. During the messaging module I repeatedly had to ask what
the administrator was actually trying to do, and the answer often changed the design.
When I asked why an administrator would want to filter received messages by sender role,
the reply — that they manage several trainers and wanted to answer them separately —
suggested the unread indicator and the role filter should be the two most prominent
elements on the screen, which is not how I had built it.

I also gained an appreciation of the cost of a feature, and of the discipline of
finishing one thing before starting another. Most of what I implemented in the first two
months was not requested by anyone: it was making the requested thing work correctly
when the mail server was unreachable, when the recipient was inactive, when the trainee
belonged to a different department. None of these appear in a specification, and all of
them would have been visible to a user.

---

# 4. CONCLUSION AND RECOMMENDATIONS

## 4.1 Conclusion

*[About 2 pages.]*

The four months of my internship at **[FILL IN: company name]** have been the most
significant period of my academic development. I entered them able to write programs
that worked, and I left them able to work on a system I did not write, in a team where
my changes were subject to review by people who had known the system far longer than I
had.

The principal technical outcome was the internal messaging module, from the database
migration through to the user interface. The second outcome was, in my view more
valuable, the investigation of trainee completion reporting, because it taught me the
difference between a number being correct and a number being right. I had been asked to
make the dashboard display a correct figure, and the honest answer to the request was
that the figure was correct only because I had replaced the calculation. The
enrollment record behind it was still wrong, and would have been wrong in every report
exported for management. Fixing the visible symptom alone would have been the easier
task and the less useful one.

The most important lesson is about assumptions. Twice I assumed existing behaviour was
correct and my own new code was wrong, and twice I was mistaken. In both cases the
mistake came from the same place: accepting the behaviour of the system as given rather
than asking what it was supposed to be. I have taken from this a habit that I intend to
keep — when something surprises me, the first explanation to consider is that my
understanding is incomplete.

I also came to understand the role that verification plays. Of the defects I reported,
none was found by reading the code carefully and reasoning about it. All were found by
writing something that asserted what should be true and observing that it was not. This
is the single change in my working method that I would keep if I could keep nothing
else.

For the company, the work delivered during the internship is a working messaging
capability and a corrected progress-reporting chain, with the verification behind both.

## 4.2 Recommendations for the Company

*[About 2–3 pages. Table 4.1 summarises; then elaborate on the highest priorities.]*

**Table 4.1 Summary of recommendations, with priority**

| No. | Recommendation | Rationale | Priority |
|-----|----------------|-----------|----------|
| 1 | Retain the verification scripts and run them on every change | Defects in business rules are found late and reappear silently | High |
| 2 | Queue failed emails and retry with backoff | Messages are currently stored but the recipient is never reached, and nobody is told | High |
| 3 | Keep database schema changes and business rules in one place | Duplicate definitions of the same rule have already caused one defect | High |
| 4 | Move configuration and credentials out of the deployed source tree | Reduces the risk of deploying the wrong environment's settings | High |
| 5 | Establish a code review checklist | Reviews currently depend on the reviewer's memory | Medium |
| 6 | Add structured logging and error reporting | Failures are currently visible only in the console of a running server | Medium |
| 7 | Schedule restore drills for database backups | A backup that has never been restored is an assumption, not a safeguard | Medium |
| 8 | Document the business rules that the code implements | Several rules exist only in the code and had to be rediscovered | Medium |
| 9 | Introduce a staging environment that mirrors production | Currently, verification depends on the development database | Low |
| 10 | Record which sections of the system are most used, and review performance | The measurement I took suggests some queries will not scale | Low |

**On verification (recommendation 1).** The defects in the completion logic were
business-rule defects, and business-rule defects are the ones that pass code review,
because each individual line is correct. The rule "a training is complete when all
published required lessons are complete" is not visible in any single line of code; it
exists in the relationship between four of them. The only reliable way I found to check
that relationship is to state it as an assertion and run it. I recommend that the
scripts written during the internship be retained, cleaned up, and run before every
merge. I would also recommend that they be owned by the team rather than by me, since
their value depends on their being maintained.

**On email delivery (recommendation 2).** The present design is half a solution. Storing
the message before attempting delivery is correct, and the user is warned when delivery
fails. But nothing is retried and nobody is notified, so a transient mail server problem
becomes a permanently undelivered message. This is invisible: from the database the
message looks delivered. A small retry table and a scheduled worker would close the gap.
During my own testing, delivery to the mail server failed repeatedly for reasons
entirely outside the application's control, which is exactly the situation this
recommendation addresses.

**On configuration (recommendation 4).** The application's settings, including database
credentials and the mail server password, are currently held in a file inside the
project directory. This is convenient during development and is a real risk in
deployment. I recommend moving them to environment variables supplied by the deployment
environment, and rotating the credentials that have been present in the repository
history.

**On documentation (recommendation 8).** Several of the rules that matter most to the
business — when a training counts as complete, when a certificate may be issued, which
departments may enroll in which training — exist only in the code. During my
investigation I had to derive the completion rule from the behaviour of the existing
queries before I could be confident of it. A short written specification for each of
these rules would remove that difficulty for the next person, and would make the rules
testable in a way that the code alone is not.

**Figure 4.1 Suggested improvement roadmap**

*(Insert a chart showing the recommendations arranged by priority and effort.)*

---

# REFERENCES

*List every source you consulted. Use a consistent style, for example IEEE or APA. Do
not list sources you did not actually use.*

1. **[FILL IN: Company name]**, *Training Management System Technical Documentation*, internal document, [FILL IN: year].
2. **[FILL IN: Company name]**, *Human Resources Policy on Training and Certification*, internal document, [FILL IN: year].
3. **[FILL IN: Author or organization]**, *Node.js Documentation*, [Online]. Available: [URL]. [Accessed: date].
4. **[FILL IN: Author or organization]**, *Express — Node.js Web Application Framework*, [Online]. Available: [URL]. [Accessed: date].
5. **[FILL IN: Author or organization]**, *React Documentation*, [Online]. Available: [URL]. [Accessed: date].
6. **[FILL IN: Author or organization]**, *PostgreSQL Documentation*, [Online]. Available: [URL]. [Accessed: date].
7. **[FILL IN: Author]**, *JavaScript: The Definitive Guide*, [edition]. [Publisher], [year].
8. I. Fette, N. Melamed and D. O'Reilly, *The Web Single Sign-On Working Protocol*, RFC 5849, [year].
9. M. Jones, J. Bradley and N. Sakimura, *JSON Web Token (JWT)*, RFC 7519, [year].
10. D.OWASP Foundation, *OWASP Top Ten*, [Online]. Available: [URL]. [Accessed: date].
11. D.OWASP Foundation, *Cheat Sheet Series*, [Online]. Available: [URL]. [Accessed: date].
12. **[FILL IN: Author or organization]**, *MDN Web Docs*, [Online]. Available: [URL]. [Accessed: date].
13. **[FILL IN: Author]**, *Clean Code: A Handbook of Agile Software Craftsmanship*, [Publisher], [year].
14. **[FILL IN: Author]**, *The Pragmatic Programmer*, [edition]. [Publisher], [year].
15. **[FILL IN: your university]**, *Internship Report Writing Guidelines*, [Online/printed]. [Accessed: date].

---

# APPENDICES

## Appendix A — API Endpoint Summary

*[Complete this table from the running system so that it is accurate. A short table
here also demonstrates that you documented your own work.]*

| Method | Path | Role | Description |
|--------|------|------|-------------|
| | | | |

## Appendix B — Database Schema Extract

*Include the schema of the tables you created or modified, with a note on why each
column exists and which constraints enforce the business rules.*

**Table B.1 — internal_messages**

| Column | Type | Purpose |
|--------|------|---------|
| | | |

*Include the primary key, the foreign keys, the self-referencing column that forms the
conversation thread, and the indexes.*

## Appendix C — Migration Script

*Include the migration script you wrote for the messaging feature. Annotate it briefly:
what each statement does and why the script is safe to run more than once.*

## Appendix D — Verification Output

*Include the output of the verification scripts, showing the checks performed and the
result of each. Reproduce the output as text rather than as a screenshot so that it
remains readable.*

```
[Paste output here]
```

## Appendix E — Sample Verification Script

*Include one verification script in full. Choose the one for the completion logic, as
it demonstrates the business rule most clearly.*

```javascript
[Paste script here]
```

## Appendix F — Screenshots

*(Insert screenshots here. Suggested list.)*

1. Trainee dashboard with the corrected Completed card.
2. My Trainings list showing real lesson progress.
3. Admin messages page, Received tab, with the sender-role filter applied.
4. Admin messages page, composer with the recipient picker open.
5. A trainee's message inbox with a conversation thread.
6. A sent-message email as it appears in a mail client.
7. Training details and the learning interface.
8. Certificate verification page.

## Appendix G — Term Definitions

| Term | Meaning in this report |
|------|------------------------|
| Back end | The server-side part of the system, exposing the API |
| Front end | The user interface, running in the user's browser |
| API | A set of HTTP endpoints through which programs exchange data |
| Migration | A versioned script that changes a database schema |
| Enrollment | The link between a trainee and a training, stored with its approval status |
| Assessment | The set of questions a trainee must pass to qualify |
| Certificate | The verifiable record issued on completion |

---

## FINAL CHECKLIST

Before printing:

- [ ] Every `FILL IN` has been replaced.
- [ ] The Table of Contents has been updated with correct page numbers.
- [ ] The Declaration and Approval pages are signed.
- [ ] The List of Tables and List of Figures match the actual tables and figures.
- [ ] The report is within the page limits for each section.
- [ ] Screenshots are legible in black and white, in case the report is printed that way.
- [ ] References are in one consistent citation style.
- [ ] Spelling and grammar have been checked by someone other than you.
