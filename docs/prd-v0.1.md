# Product Requirements Document v0.1

## Direction Update

The product direction has shifted away from explicit gamification and adventure progression. The current focus is positive energy, funny tasks, encouragement, and useful explanations. The app can still feel playful and visually warm, but it should not rely on map progression, worlds, or reward mechanics as the main motivator.

## Product Name

Skaitļu prieks

## Product Vision

Create a Latvian-language daily math adventure app that helps children keep and grow their math skills during summer break without feeling like they are doing extra schoolwork.

The first version is designed specifically for Maija, who is finishing 1st grade but appears ready for stronger 2nd-grade-level challenges. The product should start small, but the foundation should be good enough to later support other children and families.

## Core Principles

- The app experience is fully in Latvian.
- The app should feel like a daily adventure, not a worksheet.
- Learning quality matters more than game complexity.
- No punishment mechanics: no lost lives, shame, scary failure screens, or negative streak pressure.
- Wrong answers should trigger encouragement, hints, and explanations.
- The app should adapt by topic, not by one generic score.
- The child sees adventure progress; the parent sees learning progress.

## Primary User

### Maija

Maija is finishing 1st grade. She has two older brothers and likely responds better to a capable, confident tone than to anything overly childish. She should feel like the main character of the experience.

Initial expectation: Maija may already handle two-digit addition and subtraction such as `23 + 55` and `78 - 25`, so the app should not begin at a low baseline for long.

## Language And Tone

All child-facing text must be in Latvian:

- UI labels
- exercises
- hints
- explanations
- rewards
- badges
- progress text
- narrator text

The narrator speaks directly to Maija. There is no mascot or guide character in the MVP.

Tone:

- calm
- encouraging
- a little mysterious
- confident
- not babyish
- never punitive

Example:

```text
Sveika, Maija. Noslēpumu zeme vēl ir apslēpta miglā.
Lai karte pamostos, atrisini pirmos skaitļu noslēpumus.
```

## MVP Scope

### In Scope

- One child profile: Maija
- Initial diagnostic quest
- Daily math quest
- Mixed math topics inside one continuous journey
- Adaptive topic selection after diagnostic
- Hints and explanations for wrong answers
- Unlockable map progress
- Achievement badges
- Simple parent report
- Web app first, with iOS app planned later

### Out Of Scope For MVP

- Multiple public users
- Payments/subscriptions
- Teacher/classroom features
- Complex multiplayer or social mechanics
- Full offline mode
- Large AI-generated content system
- Advanced parent controls
- Separate mascot/guide character

## Adventure Concept

Maija enters Noslēpumu zeme, a changing land with paths, gates, hidden places, and small mysteries. Each day she solves math tasks to move forward on the map.

The story is intentionally light. It supports the learning loop without overwhelming it.

Example locations:

- Miglas vārti
- Čukstu mežs
- Akmens tilts
- Zvaigžņu pļava
- Pulksteņu tornis
- Tirgus aleja
- Figūru dārzs
- Noslēptā bibliotēka

The map is initially linear. Branching paths can come later.

## Daily Session

Core target: about 10 minutes.

Optional extra practice may allow sessions to grow toward 30 minutes, but the app should not require that much time.

Daily quest structure:

- 2 warm-up or revision tasks
- 5-7 next-step tasks
- 1 story or challenge task
- 1 confidence-building finish

No skipping in MVP. If Maija struggles, the app gives a hint, then an explanation, then a simpler related task.

## Curriculum Direction

The app is loosely based on Skola2030 and should become topic-mapped over time.

For Maija, the initial range is:

- revision from 1st grade
- main work around 2nd grade
- stretch tasks from early 3rd-grade thinking when appropriate

### Revision Topics

- skaitīšana, skaitļi, cipari
- skaitļu virknes
- skaitļu salīdzināšana
- figūras, virzieni, novietojums
- saskaitīšana un atņemšana līdz 10
- saskaitīšana un atņemšana līdz 20
- "par tik vairāk" and "par tik mazāk"
- vienkārši sadzīves teksta uzdevumi
- nauda
- garums
- laiks
- vienkārša saskaitīšana un atņemšana līdz 100

### Next-Step Topics

- divciparu skaitļu saskaitīšana un atņemšana
- saskaitīšana ar pāreju pāri desmitam
- atņemšana ar aizņemšanos
- laika rēķini un plānošana
- naudas uzdevumi
- garuma mērīšana un salīdzināšana
- figūru veidošana un raksturošana
- izteiksmes veidošana
- reizināšana kā grupēšana
- dalīšana kā vienāda sadalīšana
- daudzsoļu teksta uzdevumi

## Diagnostic Quest

Working title: Karte pamostas

Purpose: estimate Maija's current level without making it feel like a test.

Intro:

```text
Sveika, Maija. Noslēpumu zeme vēl ir apslēpta miglā.
Lai karte pamostos, atrisini pirmos skaitļu noslēpumus.
Daži būs viegli, daži viltīgāki. Ja kaut kas nesanāk uzreiz, tas ir normāli.
```

### Diagnostic Questions v1

| # | Question | Answer | Measures |
|---|---|---:|---|
| 1 | `34 + 12 = ?` | 46 | Warm-up, two-digit addition without carrying |
| 2 | `23 + 55 = ?` | 78 | Two-digit addition, place value |
| 3 | `78 - 25 = ?` | 53 | Two-digit subtraction without borrowing |
| 4 | `47 + 28 = ?` | 75 | Addition with carrying |
| 5 | `72 - 38 = ?` | 34 | Subtraction with borrowing |
| 6 | `45 + __ = 73` | 28 | Missing number, inverse thinking |
| 7 | `Par cik 64 ir lielāks nekā 39?` | 25 | Difference comparison |
| 8 | `Sakārto skaitļus no mazākā līdz lielākajam: 58, 85, 49, 94` | 49, 58, 85, 94 | Number order to 100 |
| 9 | `Kāds skaitlis trūkst virknē? 6, 9, 12, __, 18` | 15 | Pattern, skip-counting by 3 |
| 10 | `Maijai ir 24 uzlīmes. Viņa 7 uzdāvina brālim un pēc tam saņem vēl 12. Cik uzlīmju Maijai ir tagad?` | 29 | Two-step word problem |
| 11 | `Grāmatā ir 64 lapas. Maija izlasīja 28 lapas. Cik lapu vēl jāizlasa?` | 36 | Subtraction in context |
| 12 | `Ir 4 grozi. Katrā grozā ir 3 āboli. Cik ābolu ir kopā?` | 12 | Early multiplication/grouping |
| 13 | `12 konfektes sadala vienādi 3 bērniem. Cik konfektes saņem katrs bērns?` | 4 | Early division/sharing |
| 14 | `Pulkstenis rāda 3:30. Pēc 1 stundas būs...?` | 4:30 | Time reasoning |
| 15 | `Annai ir 2 eiro. Viņa nopērk zīmuli par 75 centiem. Cik naudas paliek?` | 1 eiro 25 centi | Money, subtraction with euros/cents |

## Adaptation Rules v1

The app assigns levels by topic.

- If questions 1-3 are correct, skip most basic two-digit no-carry practice.
- If question 4 is wrong, add carrying strategy tasks.
- If question 5 or 11 is wrong, add borrowing and subtraction-in-context tasks.
- If question 6 or 7 is wrong, practice inverse thinking and difference language.
- If question 10 is wrong, practice one-step and two-step word problems.
- If questions 12-13 are correct, introduce multiplication/division through groups and sharing.
- If questions 14-15 are wrong, add time and money mini-quests.

## Feedback Rules

### Simple Arithmetic

Use short, direct explanations.

Example:

```text
Labs mēģinājums. Saskaiti atsevišķi desmitus un vienus:
40 + 20 = 60
7 + 8 = 15
60 + 15 = 75
```

### More Complex Tasks

Use a Socratic hint first.

Example:

```text
Pavediens: vispirms noskaidro, cik uzlīmju palika pēc dāvināšanas.
Pēc tam pieskaiti jaunās uzlīmes.
```

If the second attempt is still wrong, show the worked explanation.

```text
Sākumā Maijai ir 24 uzlīmes.
Viņa uzdāvina 7: 24 - 7 = 17.
Pēc tam saņem vēl 12: 17 + 12 = 29.
Tātad paliek 29 uzlīmes.
```

## Rewards

Rewards should support intrinsic motivation and adventure progress.

Initial reward types:

- unlocked map locations
- badges
- small collectible symbols or artifacts
- completion moments after daily quests

Possible badge names:

- Pirmā taka
- Skaitļu pētniece
- Pacietīgā risinātāja
- Teksta uzdevumu detektīve
- Desmitnieku meistare
- Drosmīgais mēģinājums
- Vērīgā pētniece

Avoid:

- public leaderboards
- negative streak pressure
- lives
- timers as default pressure
- loud arcade-style point systems

## Parent Report v1

The parent report should be short and useful.

After diagnostic:

```text
Maijas sākuma karte ir gatava.

Stiprās puses:
- divciparu skaitļu saskaitīšana un atņemšana
- skaitļu secība līdz 100
- vienkārši sadzīves aprēķini

Jāpārbauda tuvāk:
- atņemšana ar aizņemšanos
- divsoļu teksta uzdevumi
- laika un naudas uzdevumi
- reizināšana kā grupēšana

Ieteicamais sākuma līmenis:
2. klases sākuma/vidus viela ar atsevišķiem izaicinājumiem.
```

Weekly report should include:

- days practiced
- approximate time spent
- topics practiced
- strongest topics
- topics to revisit
- examples of common mistakes
- suggested focus for next week

## First Week Sketch

### Day 0: Karte pamostas

Diagnostic quest. The map unlocks after completion.

### Day 1: Miglas vārti

Mixed arithmetic and confidence-building tasks. Focus depends on diagnostic result.

### Day 2: Čukstu mežs

Number sense, missing numbers, and comparison language.

### Day 3: Akmens tilts

Crossing tens, carrying, borrowing, or higher challenge depending on Maija's result.

### Day 4: Tirgus aleja

Money and word problems.

### Day 5: Figūru dārzs

Shapes, patterns, measurement, and visual reasoning.

### Day 6: Pulksteņu tornis

Time, planning, and mixed review.

### Day 7: Noslēpumu vārti

Weekly challenge plus parent report.

## Open Questions

- Should Maija have a customizable avatar, or should progress be represented only through the map?
- Should optional extra practice after the 10-minute quest be framed as "turpināt ceļu" or as separate challenge rooms?
- Should the first web version be mobile-first for iPhone screens, laptop-first, or equally responsive from day one?
- Should the parent report be inside the app only, or also sent by email?
- Should explanations be fully template-based in MVP, or should AI assist with some explanations after guardrails are defined?
- How closely should the app map each task to official Skola2030 outcomes in the first version?

## Current Recommendation

Build a small, high-quality MVP around Maija's diagnostic and first week. Use curated task templates and deterministic adaptation first. Add AI only after the learning patterns, Latvian tone, and parent reporting format are proven.
