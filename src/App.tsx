import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Award,
  Check,
  ChevronLeft,
  Compass,
  RotateCcw,
  Sparkles,
} from "lucide-react";

type QuestionType = "number" | "text" | "sequence";
type Phase = "intro" | "diagnostic" | "daily";

type QuestionVisual =
  | {
      kind: "clock";
      hour: number;
      minute: number;
    }
  | {
      kind: "items";
      item: "bird" | "candy" | "cake" | "cherry";
      groups: number[];
    }
  | {
      kind: "bowls";
      groups: number[];
    };

type DiagnosticQuestion = {
  id: number;
  title: string;
  prompt: string;
  answer: string;
  accepted: string[];
  skill: string;
  type: QuestionType;
  hint: string;
  explanation: string;
  inputLabel: string;
  visual?: QuestionVisual;
  easier?: DiagnosticQuestion;
};

type AnswerRecord = {
  questionId: number;
  value: string;
  correct: boolean;
  attempts: number;
  skill: string;
};

type FeedbackState = "idle" | "hint" | "explanation" | "correct";

type SavedSession = {
  phase: Phase;
  currentIndex: number;
  answer: string;
  attempts: number;
  feedback: FeedbackState;
  diagnosticRecords: AnswerRecord[];
  questRecords: AnswerRecord[];
  warmupQuestions: DiagnosticQuestion[];
  dailyQuestions: DiagnosticQuestion[];
  idlePrompt: string;
  correctMessage: string;
  hintOpener: string;
  explanationOpener: string;
};

const STORAGE_KEY = "skaitlu-prieks-session-v5";
const RECENT_TASKS_KEY = "skaitlu-prieks-recent-tasks-v1";
const RECENT_TASK_LIMIT = 140;
const BLOCKED_PROMPTS = new Set(["34 + 12 = ?", "23 + 55 = ?", "62 + 17 = ?"]);

function loadSavedSession(): SavedSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}

function clearSavedSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}

function questionMemoryKey(question: DiagnosticQuestion) {
  return `${question.prompt}|${question.answer}`;
}

function loadRecentTaskKeys() {
  try {
    const raw = window.localStorage.getItem(RECENT_TASKS_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rememberQuestions(questionsToRemember: DiagnosticQuestion[]) {
  try {
    const recent = loadRecentTaskKeys();
    const next = [...recent, ...questionsToRemember.map(questionMemoryKey)];
    window.localStorage.setItem(RECENT_TASKS_KEY, JSON.stringify(next.slice(-RECENT_TASK_LIMIT)));
  } catch {
    // If storage is unavailable, the generator still works for the current run.
  }
}

function isBlockedQuestion(question: DiagnosticQuestion, usedKeys: Set<string>, recentKeys: Set<string>) {
  const key = questionMemoryKey(question);
  return BLOCKED_PROMPTS.has(question.prompt) || usedKeys.has(key) || recentKeys.has(key);
}

const questions: DiagnosticQuestion[] = [
  {
    id: 1,
    title: "Skaitļu iesildīšanās bez stresa",
    prompt: "34 + 12 = ?",
    answer: "46",
    accepted: ["46"],
    skill: "Divciparu saskaitīšana bez pārejas",
    type: "number",
    hint: "Saskaiti desmitus un vienus atsevišķi.",
    explanation: "30 + 10 = 40, un 4 + 2 = 6. Kopā tas ir 46.",
    inputLabel: "Ieraksti atbildi",
  },
  {
    id: 2,
    title: "Divi skaitļi ienāk virtuvē",
    prompt: "23 + 55 = ?",
    answer: "78",
    accepted: ["78"],
    skill: "Vietvērtība un divciparu saskaitīšana",
    type: "number",
    hint: "Padomā par 20 + 50 un 3 + 5.",
    explanation: "20 + 50 = 70, un 3 + 5 = 8. Tātad 23 + 55 = 78.",
    inputLabel: "Ieraksti atbildi",
  },
  {
    id: 3,
    title: "Atņemšana, kas nekrīt panikā",
    prompt: "78 - 25 = ?",
    answer: "53",
    accepted: ["53"],
    skill: "Divciparu atņemšana bez aizņemšanās",
    type: "number",
    hint: "Atņem vispirms desmitus, pēc tam vienus.",
    explanation: "70 - 20 = 50, un 8 - 5 = 3. Kopā paliek 53.",
    inputLabel: "Ieraksti atbildi",
  },
  {
    id: 4,
    title: "Pāri desmitam ar nelielu lēcienu",
    prompt: "47 + 28 = ?",
    answer: "75",
    accepted: ["75"],
    skill: "Saskaitīšana ar pāreju pāri desmitam",
    type: "number",
    hint: "Pamēģini uztaisīt pilnu desmitu: 47 vajag vēl 3, lai būtu 50.",
    explanation: "47 + 28 var sadalīt tā: 47 + 3 = 50. No 28 paliek 25. Tad 50 + 25 = 75.",
    inputLabel: "Ieraksti atbildi",
  },
  {
    id: 5,
    title: "Aizņemšanās bez aizdomām",
    prompt: "72 - 38 = ?",
    answer: "34",
    accepted: ["34"],
    skill: "Atņemšana ar aizņemšanos",
    type: "number",
    hint: "Pamēģini pa soļiem: vispirms atņem 30, pēc tam vēl 8.",
    explanation:
      "72 - 30 = 42. Tad 42 - 8 = 34. Tā ir vieglāk nekā visu turēt galvā uzreiz.",
    inputLabel: "Ieraksti atbildi",
  },
  {
    id: 6,
    title: "Kur paslēpās skaitlis?",
    prompt: "45 + __ = 73",
    answer: "28",
    accepted: ["28"],
    skill: "Trūkstošais skaitlis un pretējā darbība",
    type: "number",
    hint: "Noskaidro, cik jāpieliek pie 45, lai nonāktu līdz 73.",
    explanation: "73 - 45 = 28, tāpēc trūkstošais skaitlis ir 28.",
    inputLabel: "Ieraksti trūkstošo skaitli",
  },
  {
    id: 7,
    title: "Kurš te ir lielāks?",
    prompt: "Par cik 64 ir lielāks nekā 39?",
    answer: "25",
    accepted: ["25"],
    skill: "Starpība un salīdzināšana",
    type: "number",
    hint: "Šeit jāatrod starpība: 64 - 39.",
    explanation: "64 - 39 = 25. Tātad 64 ir par 25 lielāks nekā 39.",
    inputLabel: "Ieraksti starpību",
  },
  {
    id: 8,
    title: "Skaitļi sastājas rindā",
    prompt: "Sakārto skaitļus no mazākā līdz lielākajam: 58, 85, 49, 94",
    answer: "49, 58, 85, 94",
    accepted: ["49,58,85,94", "49 58 85 94", "49;58;85;94"],
    skill: "Skaitļu secība līdz 100",
    type: "sequence",
    hint: "Sāc ar skaitli, kuram ir mazāk desmitu. Skaitļus vari atdalīt ar komatu, atstarpi vai semikolu.",
    explanation: "Vismazākais ir 49, pēc tam 58, tad 85, un vislielākais ir 94.",
    inputLabel: "Ieraksti skaitļus, atdalot ar komatu, atstarpi vai semikolu",
  },
  {
    id: 9,
    title: "Skaitļi dejo pa trim",
    prompt: "Kāds skaitlis trūkst virknē? 6, 9, 12, __, 18",
    answer: "15",
    accepted: ["15"],
    skill: "Skaitļu virknes un solis pa 3",
    type: "number",
    hint: "Katru reizi pieskaiti 3.",
    explanation: "6, 9, 12, 15, 18. Trūkstošais skaitlis ir 15.",
    inputLabel: "Ieraksti trūkstošo skaitli",
  },
  {
    id: 10,
    title: "Uzlīmju mazais haoss",
    prompt:
      "Ailai ir 24 uzlīmes. Viņa 7 uzdāvina Karlīnai un pēc tam saņem vēl 12. Cik uzlīmju Ailai ir tagad?",
    answer: "29",
    accepted: ["29"],
    skill: "Divsoļu teksta uzdevums",
    type: "number",
    hint: "Vispirms noskaidro, cik uzlīmju palika pēc dāvināšanas. Pēc tam pieskaiti jaunās.",
    explanation:
      "24 - 7 = 17. Pēc tam 17 + 12 = 29. Ailai tagad ir 29 uzlīmes.",
    inputLabel: "Ieraksti atbildi",
  },
  {
    id: 11,
    title: "Grāmata vēl nav padevusies",
    prompt: "Grāmatā ir 64 lapas. Lelde izlasīja 28 lapas. Cik lapu vēl jāizlasa?",
    answer: "36",
    accepted: ["36"],
    skill: "Atņemšana sadzīves situācijā",
    type: "number",
    hint: "Jānoskaidro, cik paliek: 64 - 28.",
    explanation: "64 - 28 = 36. Vēl jāizlasa 36 lapas.",
    inputLabel: "Ieraksti atbildi",
  },
  {
    id: 12,
    title: "Ābolu klubiņš",
    prompt: "Ir 4 grozi. Katrā grozā ir 3 āboli. Cik ābolu ir kopā?",
    answer: "12",
    accepted: ["12"],
    skill: "Reizināšana kā grupēšana",
    type: "number",
    hint: "Saskaiti 3 četras reizes: 3 + 3 + 3 + 3.",
    explanation: "4 grupas pa 3 āboliem nozīmē 3 + 3 + 3 + 3 = 12.",
    inputLabel: "Ieraksti atbildi",
  },
  {
    id: 13,
    title: "Godīgā konfekšu sadale",
    prompt: "Kristofers, Raivo un Aila sadala 12 konfektes vienādi. Cik konfektes saņem katrs?",
    answer: "4",
    accepted: ["4"],
    skill: "Dalīšana kā vienāda sadalīšana",
    type: "number",
    hint: "Sadali 12 trīs vienādās grupās.",
    explanation: "12 sadalot 3 vienādās daļās, katrā daļā ir 4.",
    inputLabel: "Ieraksti atbildi",
  },
  {
    id: 14,
    title: "Pulkstenis pamirkšķina",
    prompt: "Pulkstenis rāda 3:30. Pēc 1 stundas būs...?",
    answer: "4:30",
    accepted: ["4:30", "04:30", "4.30", "04.30"],
    skill: "Laika izpratne",
    type: "text",
    hint: "Minūtes paliek tās pašas, bet stunda kļūst par vienu lielāka.",
    explanation: "Pēc vienas stundas 3:30 kļūst par 4:30.",
    inputLabel: "Ieraksti laiku",
  },
  {
    id: 15,
    title: "Zīmulis apēd 75 centus",
    prompt: "Saulkrastu opim ir 2 eiro. Viņš nopērk zīmuli par 75 centiem. Cik naudas paliek?",
    answer: "1 eiro 25 centi",
    accepted: ["1.25", "1,25", "125", "1 eiro 25 centi", "1eur25", "1 euro 25"],
    skill: "Nauda un centi",
    type: "text",
    hint: "2 eiro ir 200 centi. Atņem 75 centus.",
    explanation: "200 centi - 75 centi = 125 centi. Tas ir 1 eiro un 25 centi.",
    inputLabel: "Ieraksti, cik paliek",
  },
];

const warmupVariants: DiagnosticQuestion[][] = [
  [
    {
      ...questions[0],
      id: 1001,
      title: "Skaitļu iesildīšanās bez stresa",
      prompt: "34 + 12 = ?",
      answer: "46",
      accepted: ["46"],
      hint: "Saskaiti desmitus un vienus atsevišķi.",
      explanation: "30 + 10 = 40, un 4 + 2 = 6. Kopā tas ir 46.",
    },
    {
      ...questions[0],
      id: 1002,
      title: "Divi skaitļi saskrienas gaitenī",
      prompt: "42 + 16 = ?",
      answer: "58",
      accepted: ["58"],
      hint: "Saskaiti 40 + 10 un 2 + 6.",
      explanation: "40 + 10 = 50, un 2 + 6 = 8. Kopā tas ir 58.",
    },
    {
      ...questions[0],
      id: 1003,
      title: "Ātrais plusiņš pamostas",
      prompt: "51 + 24 = ?",
      answer: "75",
      accepted: ["75"],
      hint: "Saskaiti desmitus, tad vienus.",
      explanation: "50 + 20 = 70, un 1 + 4 = 5. Kopā tas ir 75.",
    },
  ],
  [
    {
      ...questions[1],
      id: 2001,
      title: "Divi skaitļi ienāk virtuvē",
      prompt: "23 + 55 = ?",
      answer: "78",
      accepted: ["78"],
      hint: "Padomā par 20 + 50 un 3 + 5.",
      explanation: "20 + 50 = 70, un 3 + 5 = 8. Tātad 23 + 55 = 78.",
    },
    {
      ...questions[1],
      id: 2002,
      title: "Skaitļi sarīko brokastis",
      prompt: "31 + 46 = ?",
      answer: "77",
      accepted: ["77"],
      hint: "30 + 40 ir labs sākums.",
      explanation: "30 + 40 = 70, un 1 + 6 = 7. Kopā 77.",
    },
    {
      ...questions[1],
      id: 2003,
      title: "Plusiņš uzvelk kedas",
      prompt: "62 + 17 = ?",
      answer: "79",
      accepted: ["79"],
      hint: "62 + 10 = 72. Tad vēl pieskaiti 7.",
      explanation: "62 + 10 = 72, un 72 + 7 = 79.",
    },
  ],
  [
    {
      ...questions[2],
      id: 3001,
      title: "Atņemšana, kas nekrīt panikā",
      prompt: "78 - 25 = ?",
      answer: "53",
      accepted: ["53"],
      hint: "Atņem vispirms desmitus, pēc tam vienus.",
      explanation: "70 - 20 = 50, un 8 - 5 = 3. Kopā paliek 53.",
    },
    {
      ...questions[2],
      id: 3002,
      title: "Skaitlis paliek mierīgs",
      prompt: "86 - 34 = ?",
      answer: "52",
      accepted: ["52"],
      hint: "Atņem 30, pēc tam 4.",
      explanation: "86 - 30 = 56, un 56 - 4 = 52.",
    },
    {
      ...questions[2],
      id: 3003,
      title: "Atņemšana noņem cepuri",
      prompt: "69 - 27 = ?",
      answer: "42",
      accepted: ["42"],
      hint: "60 - 20 un 9 - 7 var rēķināt atsevišķi.",
      explanation: "60 - 20 = 40, un 9 - 7 = 2. Kopā 42.",
    },
  ],
  [
    questions[3],
    {
      ...questions[3],
      id: 4002,
      prompt: "58 + 27 = ?",
      answer: "85",
      accepted: ["85"],
      hint: "58 vajag vēl 2, lai būtu 60. Paņem tos 2 no 27.",
      explanation: "58 + 2 = 60. No 27 paliek 25. Tad 60 + 25 = 85.",
    },
    {
      ...questions[3],
      id: 4003,
      prompt: "36 + 49 = ?",
      answer: "85",
      accepted: ["85"],
      hint: "36 vajag vēl 4, lai būtu 40. Paņem tos 4 no 49.",
      explanation: "36 + 4 = 40. No 49 paliek 45. Tad 40 + 45 = 85.",
    },
  ],
  [
    questions[4],
    {
      ...questions[4],
      id: 5002,
      prompt: "83 - 47 = ?",
      answer: "36",
      accepted: ["36"],
      hint: "Pamēģini pa soļiem: vispirms atņem 40, pēc tam vēl 7.",
      explanation: "83 - 40 = 43. Tad 43 - 7 = 36.",
    },
    {
      ...questions[4],
      id: 5003,
      prompt: "91 - 56 = ?",
      answer: "35",
      accepted: ["35"],
      hint: "Pamēģini pa soļiem: vispirms atņem 50, pēc tam vēl 6.",
      explanation: "91 - 50 = 41. Tad 41 - 6 = 35.",
    },
  ],
  [
    questions[5],
    {
      ...questions[5],
      id: 6002,
      prompt: "37 + __ = 82",
      answer: "45",
      accepted: ["45"],
      hint: "Aprēķini 82 - 37.",
      explanation: "82 - 37 = 45, tāpēc trūkstošais skaitlis ir 45.",
    },
    {
      ...questions[5],
      id: 6003,
      prompt: "29 + __ = 61",
      answer: "32",
      accepted: ["32"],
      hint: "Aprēķini, cik tālu ir no 29 līdz 61.",
      explanation: "61 - 29 = 32, tāpēc trūkstošais skaitlis ir 32.",
    },
  ],
  [
    questions[6],
    {
      ...questions[6],
      id: 7002,
      prompt: "Par cik 72 ir lielāks nekā 48?",
      answer: "24",
      accepted: ["24"],
      hint: "Jāatrod starpība: 72 - 48.",
      explanation: "72 - 48 = 24. Tātad 72 ir par 24 lielāks.",
    },
    {
      ...questions[6],
      id: 7003,
      prompt: "Par cik 91 ir lielāks nekā 67?",
      answer: "24",
      accepted: ["24"],
      hint: "Jāatrod starpība: 91 - 67.",
      explanation: "91 - 67 = 24. Tātad 91 ir par 24 lielāks.",
    },
  ],
  [
    questions[7],
    {
      ...questions[7],
      id: 8002,
      prompt: "Sakārto skaitļus no mazākā līdz lielākajam: 73, 37, 88, 59",
      answer: "37, 59, 73, 88",
      accepted: ["37,59,73,88", "37 59 73 88", "37;59;73;88"],
      explanation: "Vismazākais ir 37, pēc tam 59, tad 73, un vislielākais ir 88.",
    },
    {
      ...questions[7],
      id: 8003,
      prompt: "Sakārto skaitļus no lielākā līdz mazākajam: 64, 46, 91, 19",
      answer: "91, 64, 46, 19",
      accepted: ["91,64,46,19", "91 64 46 19", "91;64;46;19"],
      hint: "Sāc ar skaitli, kuram ir visvairāk desmitu. Skaitļus vari atdalīt ar komatu, atstarpi vai semikolu.",
      explanation: "Vislielākais ir 91, pēc tam 64, tad 46, un vismazākais ir 19.",
    },
  ],
  [
    questions[8],
    {
      ...questions[8],
      id: 9002,
      prompt: "Kāds skaitlis trūkst virknē? 8, 12, 16, __, 24",
      answer: "20",
      accepted: ["20"],
      hint: "Katru reizi pieskaiti 4.",
      explanation: "8, 12, 16, 20, 24. Trūkstošais skaitlis ir 20.",
    },
    {
      ...questions[8],
      id: 9003,
      prompt: "Kāds skaitlis trūkst virknē? 5, 10, 15, __, 25",
      answer: "20",
      accepted: ["20"],
      hint: "Katru reizi pieskaiti 5.",
      explanation: "5, 10, 15, 20, 25. Trūkstošais skaitlis ir 20.",
    },
  ],
  [
    questions[9],
    {
      ...questions[9],
      id: 10002,
      prompt:
        "Karlīnai ir 31 uzlīme. Viņa 9 uzdāvina Ailai un pēc tam saņem vēl 14. Cik uzlīmju Karlīnai ir tagad?",
      answer: "36",
      accepted: ["36"],
      explanation: "31 - 9 = 22. Pēc tam 22 + 14 = 36. Karlīnai tagad ir 36 uzlīmes.",
    },
    {
      ...questions[9],
      id: 10003,
      prompt:
        "Kristoferam ir 28 uzlīmes. Viņš 6 uzdāvina Raivo un pēc tam saņem vēl 15. Cik uzlīmju Kristoferam ir tagad?",
      answer: "37",
      accepted: ["37"],
      explanation: "28 - 6 = 22. Pēc tam 22 + 15 = 37. Kristoferam tagad ir 37 uzlīmes.",
    },
  ],
  [
    questions[10],
    {
      ...questions[10],
      id: 11002,
      prompt: "Grāmatā ir 72 lapas. Evrika izlasīja 35 lapas. Cik lapu vēl jāizlasa?",
      answer: "37",
      accepted: ["37"],
      hint: "Jānoskaidro, cik paliek: 72 - 35.",
      explanation: "72 - 35 = 37. Vēl jāizlasa 37 lapas.",
    },
    {
      ...questions[10],
      id: 11003,
      prompt: "Grāmatā ir 58 lapas. Mežciema ome izlasīja 29 lapas. Cik lapu vēl jāizlasa?",
      answer: "29",
      accepted: ["29"],
      hint: "Jānoskaidro, cik paliek: 58 - 29.",
      explanation: "58 - 29 = 29. Vēl jāizlasa 29 lapas.",
    },
  ],
  [
    questions[11],
    {
      ...questions[11],
      id: 12002,
      prompt: "Ir 5 grozi. Katrā grozā ir 2 āboli. Cik ābolu ir kopā?",
      answer: "10",
      accepted: ["10"],
      hint: "Saskaiti 2 piecas reizes.",
      explanation: "5 grupas pa 2 āboliem nozīmē 2 + 2 + 2 + 2 + 2 = 10.",
    },
    {
      ...questions[11],
      id: 12003,
      prompt: "Ir 3 grozi. Katrā grozā ir 5 āboli. Cik ābolu ir kopā?",
      answer: "15",
      accepted: ["15"],
      hint: "Saskaiti 5 trīs reizes.",
      explanation: "3 grupas pa 5 āboliem nozīmē 5 + 5 + 5 = 15.",
    },
  ],
  [
    questions[12],
    {
      ...questions[12],
      id: 13002,
      prompt: "15 konfektes sadala vienādi 3 bērniem. Cik konfektes saņem katrs bērns?",
      answer: "5",
      accepted: ["5"],
      explanation: "15 sadalot 3 vienādās daļās, katrā daļā ir 5.",
    },
    {
      ...questions[12],
      id: 13003,
      prompt: "10 konfektes sadala vienādi 2 bērniem. Cik konfektes saņem katrs bērns?",
      answer: "5",
      accepted: ["5"],
      explanation: "10 sadalot 2 vienādās daļās, katrā daļā ir 5.",
    },
  ],
  [
    questions[13],
    {
      ...questions[13],
      id: 14002,
      prompt: "Pulkstenis rāda 2:30. Pēc 2 stundām būs...?",
      answer: "4:30",
      accepted: ["4:30", "04:30", "4.30", "04.30"],
      hint: "Minūtes paliek tās pašas, bet stundai pieskaiti 2.",
      explanation: "Pēc divām stundām 2:30 kļūst par 4:30.",
    },
    {
      ...questions[13],
      id: 14003,
      prompt: "Pulkstenis rāda 6:00. Pēc 3 stundām būs...?",
      answer: "9:00",
      accepted: ["9:00", "09:00", "9.00", "09.00"],
      hint: "Minūtes paliek tās pašas, bet stundai pieskaiti 3.",
      explanation: "Pēc trim stundām 6:00 kļūst par 9:00.",
    },
  ],
  [
    questions[14],
    {
      ...questions[14],
      id: 15002,
      prompt: "Mežciema omei ir 3 eiro. Viņa nopērk dzēšgumiju par 80 centiem. Cik naudas paliek?",
      answer: "2 eiro 20 centi",
      accepted: ["2.20", "2,20", "220", "2 eiro 20 centi", "2eur20", "2 euro 20"],
      hint: "3 eiro ir 300 centi. Atņem 80 centus.",
      explanation: "300 centi - 80 centi = 220 centi. Tas ir 2 eiro un 20 centi.",
    },
    {
      ...questions[14],
      id: 15003,
      prompt: "Armandam ir 5 eiro. Viņš nopērk piezīmju bloku par 1 eiro 50 centiem. Cik naudas paliek?",
      answer: "3 eiro 50 centi",
      accepted: ["3.50", "3,50", "350", "3 eiro 50 centi", "3eur50", "3 euro 50"],
      hint: "5 eiro ir 500 centi. Atņem 150 centus.",
      explanation: "500 centi - 150 centi = 350 centi. Tas ir 3 eiro un 50 centi.",
    },
  ],
];

function pickRandomQuestions(variants: DiagnosticQuestion[][], count = 12) {
  return variants.map((group) => group[Math.floor(Math.random() * group.length)]).slice(0, count);
}

const idlePrompts = [
  "Ieraksti atbildi, kad esi gatava.",
  "Te vieta tavai domai.",
  "Pamēģini. Skaitļi gaida.",
  "Raksti droši, šeit drīkst domāt skaļi.",
  "Kad doma noķerta, ieraksti to te.",
];

const correctFeedback = [
  "Labi izdomāts.",
  "Precīzi.",
  "Jā, tieši tā.",
  "Skaisti sanāca.",
  "Labs risinājums.",
  "Šis ir pareizi.",
  "Tev izdevās.",
  "Forši noķerts.",
  "Tieši desmitniekā.",
  "Labs darbs.",
  "Tā doma strādā.",
  "Pareizi izrēķināts.",
  "Jā, šis der.",
  "Lieliski.",
  "Ļoti labi.",
  "Smuki salikts.",
  "Skaitļi paklausīja.",
  "Labs pavērsiens.",
  "Atbilde ir vietā.",
  "Super, ejam tālāk.",
];

const hintOpeners = [
  "Labs mēģinājums.",
  "Gandrīz.",
  "Šis ir viltīgs.",
  "Pamēģinām citādi.",
  "Te ir mazs pavediens.",
  "Apskatām mierīgi.",
  "Doma ir tuvu.",
  "Šis prasa vienu papildu soli.",
];

const explanationOpeners = [
  "Paskatīsimies kopā.",
  "Saliekam pa soļiem.",
  "Te ir viens labs ceļš.",
  "Izjaucam piemēru pa gabaliņiem.",
  "Lūk, kā to var ieraudzīt.",
  "Pamēģinām skaidri un mierīgi.",
];

function pickRandomText(options: string[]) {
  return options[Math.floor(Math.random() * options.length)];
}

const people = [
  "Maija",
  "Kristofers",
  "Raivo",
  "Aila",
  "Karlīna",
  "Lelde",
  "Armands",
  "Evrika",
  "Saulkrastu ome",
  "Saulkrastu opis",
  "Mežciema ome",
  "Karamele",
];

let generatedQuestionId = 30000;

function nextQuestionId() {
  generatedQuestionId += 1;
  return generatedQuestionId + Math.floor(Math.random() * 1000);
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function choice<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function makeAdditionNoCarry(): DiagnosticQuestion {
  const tensA = randomBetween(2, 6) * 10;
  const tensB = randomBetween(1, 2) * 10;
  const onesA = randomBetween(1, 5);
  const onesB = randomBetween(1, 4);
  const a = tensA + onesA;
  const b = tensB + onesB;
  const answerValue = a + b;

  return {
    id: nextQuestionId(),
    title: choice(["Viegls plusiņš ieskrienas", "Skaitļi sasveicinās", "Plusiņš bez liela trokšņa"]),
    prompt: `${a} + ${b} = ?`,
    answer: String(answerValue),
    accepted: [String(answerValue)],
    skill: "Divciparu saskaitīšana bez pārejas",
    type: "number",
    hint: "Saskaiti desmitus un vienus atsevišķi.",
    explanation: `${tensA} + ${tensB} = ${tensA + tensB}. ${onesA} + ${onesB} = ${onesA + onesB}. Kopā tas ir ${answerValue}.`,
    inputLabel: "Ieraksti atbildi",
  };
}

function makeSubtractionNoBorrowing(): DiagnosticQuestion {
  const tensA = randomBetween(5, 9) * 10;
  const tensB = randomBetween(1, 3) * 10;
  const onesB = randomBetween(1, 5);
  const onesA = randomBetween(onesB, 9);
  const a = tensA + onesA;
  const b = tensB + onesB;
  const answerValue = a - b;

  return {
    id: nextQuestionId(),
    title: choice(["Atņemšana bez drāmas", "Mīnuss paņem tikai savu", "Skaitlis paliek mierīgs"]),
    prompt: `${a} - ${b} = ?`,
    answer: String(answerValue),
    accepted: [String(answerValue)],
    skill: "Divciparu atņemšana bez aizņemšanās",
    type: "number",
    hint: "Atņem desmitus un vienus atsevišķi.",
    explanation: `${tensA} - ${tensB} = ${tensA - tensB}. ${onesA} - ${onesB} = ${onesA - onesB}. Kopā paliek ${answerValue}.`,
    inputLabel: "Ieraksti atbildi",
  };
}

function makeAdditionCrossing(): DiagnosticQuestion {
  const onesA = randomBetween(5, 8);
  const onesB = randomBetween(6, 9);
  const tensA = randomBetween(2, 6) * 10;
  const tensB = randomBetween(1, 2) * 10;
  const a = tensA + onesA;
  const b = tensB + onesB;
  const toNextTen = 10 - onesA;
  const answerValue = a + b;

  return {
    id: nextQuestionId(),
    title: choice(["Plusiņš lec pāri desmitam", "Pilnais desmits glābj dienu", "Skaitļi pārlec peļķei"]),
    prompt: `${a} + ${b} = ?`,
    answer: String(answerValue),
    accepted: [String(answerValue)],
    skill: "Saskaitīšana ar pāreju pāri desmitam",
    type: "number",
    hint: `${a} vajag vēl ${toNextTen}, lai būtu ${a + toNextTen}. Paņem tos ${toNextTen} no ${b}.`,
    explanation: `${a} + ${toNextTen} = ${a + toNextTen}. No ${b} paliek ${b - toNextTen}. Tad ${a + toNextTen} + ${b - toNextTen} = ${answerValue}.`,
    inputLabel: "Ieraksti atbildi",
    easier: {
      id: nextQuestionId(),
      title: "Tas pats triks, tikai mazāks",
      prompt: `${onesA} + ${onesB} = ?`,
      answer: String(onesA + onesB),
      accepted: [String(onesA + onesB)],
      skill: "Saskaitīšana ar pāreju pāri desmitam",
      type: "number",
      hint: `${onesA} vajag vēl ${toNextTen}, lai būtu 10.`,
      explanation: `${onesA} + ${toNextTen} = 10. No ${onesB} paliek ${onesB - toNextTen}. Tātad 10 + ${onesB - toNextTen} = ${onesA + onesB}.`,
      inputLabel: "Ieraksti atbildi",
    },
  };
}

function makeSubtractionCrossing(): DiagnosticQuestion {
  const onesA = randomBetween(1, 4);
  const onesB = randomBetween(6, 9);
  const tensA = randomBetween(6, 9) * 10;
  const tensB = randomBetween(2, 4) * 10;
  const a = tensA + onesA;
  const b = tensB + onesB;
  const answerValue = a - b;

  return {
    id: nextQuestionId(),
    title: choice(["Atņemšana pa gabaliņiem", "Mīnus bez panikas", "Skaitlis mierīgi atkāpjas"]),
    prompt: `${a} - ${b} = ?`,
    answer: String(answerValue),
    accepted: [String(answerValue)],
    skill: "Atņemšana ar pāreju pāri desmitam",
    type: "number",
    hint: `Pamēģini pa soļiem: vispirms atņem ${tensB}, pēc tam vēl ${onesB}.`,
    explanation: `${a} - ${tensB} = ${a - tensB}. Tad ${a - tensB} - ${onesB} = ${answerValue}.`,
    inputLabel: "Ieraksti atbildi",
    easier: {
      id: nextQuestionId(),
      title: "Mazāks mīnus, tas pats paņēmiens",
      prompt: `${20 + onesA} - ${onesB} = ?`,
      answer: String(20 + onesA - onesB),
      accepted: [String(20 + onesA - onesB)],
      skill: "Atņemšana ar pāreju pāri desmitam",
      type: "number",
      hint: `Vispirms no ${20 + onesA} atņem ${onesA + 1}, lai nonāktu līdz 20.`,
      explanation: `${20 + onesA} - ${onesA + 1} = 20. Vēl jāatņem ${onesB - onesA - 1}. Rezultāts ir ${20 + onesA - onesB}.`,
      inputLabel: "Ieraksti atbildi",
    },
  };
}

function makeMissingNumber(): DiagnosticQuestion {
  const start = randomBetween(24, 49);
  const missing = randomBetween(12, 34);
  const total = start + missing;

  return {
    id: nextQuestionId(),
    title: choice(["Skaitlis paslēpās zem galda", "Trūkstošais ķeksis", "Kur pazuda gabaliņš?"]),
    prompt: `${start} + __ = ${total}`,
    answer: String(missing),
    accepted: [String(missing)],
    skill: "Trūkstošais skaitlis",
    type: "number",
    hint: `Noskaidro, cik tālu ir no ${start} līdz ${total}.`,
    explanation: `${total} - ${start} = ${missing}. Tātad trūkstošais skaitlis ir ${missing}.`,
    inputLabel: "Ieraksti trūkstošo skaitli",
  };
}

function makeClockQuestion(): DiagnosticQuestion {
  const hour = randomBetween(1, 11);
  const minute = choice([0, 15, 30, 45]);
  const answer = `${hour}:${String(minute).padStart(2, "0")}`;

  return {
    id: nextQuestionId(),
    title: choice(["Pulkstenis rāda bez vārdiem", "Divas bultiņas sarunājas", "Laika mīkla"]),
    prompt: "Cik rāda pulkstenis?",
    answer,
    accepted: [answer, answer.replace(":", "."), `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`],
    skill: "Laika nolasīšana no pulksteņa",
    type: "text",
    hint: "Īsākā bultiņa rāda stundu, garākā bultiņa rāda minūtes.",
    explanation: `Īsā bultiņa ir pie ${hour}, un garā bultiņa rāda ${minute} minūtes. Tātad pulkstenis rāda ${answer}.`,
    inputLabel: "Ieraksti laiku, piemēram 4:30",
    visual: { kind: "clock", hour, minute },
  };
}

function makeGroupingQuestion(): DiagnosticQuestion {
  const groups = randomBetween(2, 4);
  const perGroup = randomBetween(2, 5);
  const item = choice(["candy", "cake", "cherry", "bird"] as const);
  const owner = choice(people);
  const itemName =
    item === "candy" ? "konfektes" : item === "cake" ? "kūkas" : item === "bird" ? "putni" : "ķirši";
  const setup = choice([
    `${owner} saliek ${groups} rindas. Katrā rindā ir ${perGroup} ${itemName}. Cik kopā?`,
    `${owner} uzzīmē ${groups} kastītes. Katrā kastītē ir ${perGroup} ${itemName}. Cik kopā?`,
    `${owner} izdomā ${groups} mini komandas. Katrā komandā ir ${perGroup} ${itemName}. Cik kopā?`,
    `Uz galda ir ${groups} šķīvji. Uz katra šķīvja ir ${perGroup} ${itemName}. Cik kopā?`,
  ]);
  const answerValue = groups * perGroup;

  return {
    id: nextQuestionId(),
    title: choice([
      "Mazās grupas dara lielu darbu",
      "Mini komandas sanāk kopā",
      "Reizināšana bez tabulas panikas",
      "Vairākas rindas, viena doma",
    ]),
    prompt: setup,
    answer: String(answerValue),
    accepted: [String(answerValue)],
    skill: "Reizināšana kā vienādas grupas",
    type: "number",
    hint: `Saskaiti ${perGroup} ${groups} reizes.`,
    explanation: `${groups} grupas pa ${perGroup} nozīmē ${Array.from({ length: groups }, () => perGroup).join(" + ")} = ${answerValue}.`,
    inputLabel: "Ieraksti atbildi",
    visual: { kind: "items", item, groups: Array.from({ length: groups }, () => perGroup) },
  };
}

function makeSharingQuestion(): DiagnosticQuestion {
  const groups = choice([2, 3]);
  const perGroup = randomBetween(3, 6);
  const total = groups * perGroup;

  return {
    id: nextQuestionId(),
    title: choice(["Godīgā sadale", "Konfektes bez strīda", "Bļodiņu miers"]),
    prompt: `${total} konfektes sadala vienādi ${groups} bļodiņās. Cik konfekšu ir katrā bļodiņā?`,
    answer: String(perGroup),
    accepted: [String(perGroup)],
    skill: "Dalīšana kā vienāda sadalīšana",
    type: "number",
    hint: `Sadali ${total} ${groups} vienādās grupās.`,
    explanation: `${total} sadalot ${groups} vienādās daļās, katrā daļā ir ${perGroup}.`,
    inputLabel: "Ieraksti atbildi",
    visual: { kind: "bowls", groups: Array.from({ length: groups }, () => perGroup) },
  };
}

function makeBirdsQuestion(): DiagnosticQuestion {
  const birds = randomBetween(8, 14);
  const flewAway = randomBetween(2, 6);
  const answerValue = birds - flewAway;

  return {
    id: nextQuestionId(),
    title: "Putni uz vada sarīko pārkārtošanos",
    prompt: `Uz vada sēž ${birds} putni. ${flewAway} aizlido. Cik putnu paliek?`,
    answer: String(answerValue),
    accepted: [String(answerValue)],
    skill: "Atņemšana sadzīves situācijā",
    type: "number",
    hint: `Jāaprēķina ${birds} - ${flewAway}.`,
    explanation: `${birds} - ${flewAway} = ${answerValue}. Uz vada paliek ${answerValue} putni.`,
    inputLabel: "Ieraksti atbildi",
    visual: { kind: "items", item: "bird", groups: [birds] },
  };
}

function makeMoneyQuestion(): DiagnosticQuestion {
  const owner = choice(people);
  const euros = randomBetween(2, 6);
  const cents = choice([50, 75, 80, 120, 150, 175]);
  const totalCents = euros * 100;
  const left = totalCents - cents;
  const leftEuros = Math.floor(left / 100);
  const leftCents = left % 100;
  const answer = `${leftEuros} eiro ${leftCents} centi`;
  const thing = choice(["zīmuli", "dzēšgumiju", "piezīmju bloku", "smieklīgu uzlīmi"]);

  return {
    id: nextQuestionId(),
    title: choice(["Nauda negrib pazust", "Centu mazais triks", "Veikala mini mīkla"]),
    prompt: `${owner} ir ${euros} eiro. ${owner} nopērk ${thing} par ${cents} centiem. Cik naudas paliek?`,
    answer,
    accepted: [
      answer,
      `${leftEuros}.${String(leftCents).padStart(2, "0")}`,
      `${leftEuros},${String(leftCents).padStart(2, "0")}`,
      String(left),
    ],
    skill: "Nauda un centi",
    type: "text",
    hint: `${euros} eiro ir ${totalCents} centi. Atņem ${cents} centus.`,
    explanation: `${totalCents} centi - ${cents} centi = ${left} centi. Tas ir ${answer}.`,
    inputLabel: "Ieraksti, cik paliek",
  };
}

function makeComparisonQuestion(): DiagnosticQuestion {
  const a = randomBetween(45, 95);
  const diff = randomBetween(12, 34);
  const b = a - diff;

  return {
    id: nextQuestionId(),
    title: choice(["Kurš lielāks un par cik?", "Skaitļu sacensība", "Starpība uzlec uz galda"]),
    prompt: `Par cik ${a} ir lielāks nekā ${b}?`,
    answer: String(diff),
    accepted: [String(diff)],
    skill: "Starpība un salīdzināšana",
    type: "number",
    hint: `Jāatrod starpība: ${a} - ${b}.`,
    explanation: `${a} - ${b} = ${diff}. Tātad ${a} ir par ${diff} lielāks.`,
    inputLabel: "Ieraksti starpību",
  };
}

function makeMeasurementQuestion(): DiagnosticQuestion {
  const first = randomBetween(24, 68);
  const second = randomBetween(10, 29);
  const total = first + second;
  const owner = choice(people);

  return {
    id: nextQuestionId(),
    title: choice(["Centimetri izstiepjas", "Lineāla mazais piedzīvojums", "Garums pieliek klāt"]),
    prompt: `${owner} aukla ir ${first} cm gara. Pieliek vēl ${second} cm. Cik gara aukla ir tagad?`,
    answer: String(total),
    accepted: [String(total), `${total} cm`],
    skill: "Garuma aprēķini",
    type: "number",
    hint: `Saskaiti ${first} + ${second}.`,
    explanation: `${first} cm + ${second} cm = ${total} cm.`,
    inputLabel: "Ieraksti garumu centimetros",
  };
}

function makePatternQuestion(): DiagnosticQuestion {
  const step = choice([2, 3, 4, 5]);
  const start = randomBetween(3, 12);
  const values = [start, start + step, start + step * 2, start + step * 3, start + step * 4];

  return {
    id: nextQuestionId(),
    title: choice(["Skaitļi dejo ritmā", "Ritms negrib apstāties", "Kas nāk pēc tam?"]),
    prompt: `Kāds skaitlis trūkst virknē? ${values[0]}, ${values[1]}, ${values[2]}, __, ${values[4]}`,
    answer: String(values[3]),
    accepted: [String(values[3])],
    skill: `Skaitļu virknes un solis pa ${step}`,
    type: "number",
    hint: `Katru reizi pieskaiti ${step}.`,
    explanation: `${values.join(", ")}. Trūkstošais skaitlis ir ${values[3]}.`,
    inputLabel: "Ieraksti trūkstošo skaitli",
  };
}

function makeWordProblem(): DiagnosticQuestion {
  const owner = choice(people);
  const second = choice(people.filter((person) => person !== owner));
  const start = randomBetween(24, 48);
  const lost = randomBetween(6, 18);
  const gained = randomBetween(5, 14);
  const answerValue = start - lost + gained;

  return {
    id: nextQuestionId(),
    title: choice(["Mazais haoss ar labu galu", "Divi soļi un viens pārsteigums", "Skaitļi samaina kabatas"]),
    prompt: `${owner} ir ${start} ķirši. ${lost} aizceļo pie ${second}, bet vēlāk parādās vēl ${gained}. Cik ķiršu ir tagad?`,
    answer: String(answerValue),
    accepted: [String(answerValue)],
    skill: "Divsoļu teksta uzdevums",
    type: "number",
    hint: "Vispirms atņem, pēc tam pieskaiti.",
    explanation: `${start} - ${lost} = ${start - lost}. Pēc tam ${start - lost} + ${gained} = ${answerValue}.`,
    inputLabel: "Ieraksti atbildi",
    visual: { kind: "items", item: "cherry", groups: [Math.min(start, 18)] },
  };
}

function makeOrderingQuestion(): DiagnosticQuestion {
  const values = Array.from(new Set(Array.from({ length: 6 }, () => randomBetween(18, 96)))).slice(0, 4);
  while (values.length < 4) {
    values.push(randomBetween(18, 96));
  }
  const descending = Math.random() > 0.5;
  const sorted = [...values].sort((a, b) => (descending ? b - a : a - b));

  return {
    id: nextQuestionId(),
    title: descending ? "Skaitļi stāv no varenākā" : "Skaitļi sastājas rindā",
    prompt: `Sakārto skaitļus no ${descending ? "lielākā līdz mazākajam" : "mazākā līdz lielākajam"}: ${values.join(", ")}`,
    answer: sorted.join(", "),
    accepted: [sorted.join(","), sorted.join(" "), sorted.join(";")],
    skill: "Skaitļu secība līdz 100",
    type: "sequence",
    hint: `Skaitļus vari atdalīt ar komatu, atstarpi vai semikolu. ${descending ? "Sāc ar vislielāko." : "Sāc ar vismazāko."}`,
    explanation: `Pareizā secība ir ${sorted.join(", ")}.`,
    inputLabel: "Ieraksti skaitļus, atdalot ar komatu, atstarpi vai semikolu",
  };
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function createUniqueQuestion(
  factory: () => DiagnosticQuestion,
  usedKeys: Set<string>,
  recentKeys: Set<string>,
) {
  let question = factory();

  for (let attempt = 0; attempt < 60 && isBlockedQuestion(question, usedKeys, recentKeys); attempt += 1) {
    question = factory();
  }

  usedKeys.add(questionMemoryKey(question));
  return question;
}

function createWarmupSession() {
  const usedKeys = new Set<string>();
  const recentKeys = new Set(loadRecentTaskKeys());
  const factories = [
    makeAdditionNoCarry,
    makeSubtractionNoBorrowing,
    makeAdditionCrossing,
    makeSubtractionCrossing,
    makeMissingNumber,
    makeOrderingQuestion,
    makePatternQuestion,
    makeComparisonQuestion,
    makeWordProblem,
    makeMoneyQuestion,
    makeClockQuestion,
    choice([makeBirdsQuestion, makeMeasurementQuestion, makeSharingQuestion]),
  ];
  const session = shuffle(factories).map((factory) => createUniqueQuestion(factory, usedKeys, recentKeys));

  rememberQuestions(session);
  return session.slice(0, 12);
}

function createDailySession(priorRecords: AnswerRecord[] = []) {
  const needsCrossingTen = priorRecords.some(
    (record) =>
      !record.correct &&
      (record.skill.includes("pāreju pāri desmitam") ||
        record.skill.includes("aizņemšanos") ||
        record.skill.includes("Atņemšana ar pāreju")),
  );

  const usedKeys = new Set<string>();
  const recentKeys = new Set(loadRecentTaskKeys());
  const mustHaveFactories = [
    makeAdditionCrossing,
    makeSubtractionCrossing,
    makeClockQuestion,
    makeWordProblem,
  ];

  const flexibleFactories = [
    makeMissingNumber,
    makeGroupingQuestion,
    makeSharingQuestion,
    makeBirdsQuestion,
    makeOrderingQuestion,
    makeMoneyQuestion,
    makeComparisonQuestion,
    makeMeasurementQuestion,
    makePatternQuestion,
    needsCrossingTen ? makeAdditionCrossing : makeMoneyQuestion,
    needsCrossingTen ? makeSubtractionCrossing : makePatternQuestion,
    makeWordProblem,
  ];

  const session = shuffle([...mustHaveFactories, ...shuffle(flexibleFactories).slice(0, 8)]).map((factory) =>
    createUniqueQuestion(factory, usedKeys, recentKeys),
  );

  rememberQuestions(session);
  return session.slice(0, 12);
}

const starterDailyQuestions: DiagnosticQuestion[] = [
  {
    id: 101,
    title: "Pankūku starts",
    prompt: "56 + 17 = ?",
    answer: "73",
    accepted: ["73"],
    skill: "Saskaitīšana ar pāreju pāri desmitam",
    type: "number",
    hint: "56 vajag vēl 4, lai būtu 60. Paņem tos 4 no 17.",
    explanation: "56 + 4 = 60. No 17 paliek 13. Tad 60 + 13 = 73.",
    inputLabel: "Ieraksti atbildi",
  },
  {
    id: 102,
    title: "Zeķu detektīvs",
    prompt: "81 - 46 = ?",
    answer: "35",
    accepted: ["35"],
    skill: "Atņemšana ar aizņemšanos",
    type: "number",
    hint: "Pamēģini pa soļiem: vispirms atņem 40, pēc tam vēl 6.",
    explanation: "81 - 40 = 41. Tad 41 - 6 = 35.",
    inputLabel: "Ieraksti atbildi",
  },
  {
    id: 103,
    title: "Trūkstošais gurķis",
    prompt: "38 + __ = 64",
    answer: "26",
    accepted: ["26"],
    skill: "Trūkstošais skaitlis",
    type: "number",
    hint: "Atrodi starpību starp 64 un 38.",
    explanation: "64 - 38 = 26. Tātad pie 38 jāpieskaita 26.",
    inputLabel: "Ieraksti trūkstošo skaitli",
  },
  {
    id: 104,
    title: "Smieklīgais ritms",
    prompt: "Kāds skaitlis turpina virkni? 14, 18, 22, 26, __",
    answer: "30",
    accepted: ["30"],
    skill: "Skaitļu virknes un solis pa 4",
    type: "number",
    hint: "Katru reizi skaitlis kļūst par 4 lielāks.",
    explanation: "14, 18, 22, 26, 30. Trūkstošais skaitlis ir 30.",
    inputLabel: "Ieraksti trūkstošo skaitli",
  },
  {
    id: 105,
    title: "Kūku rindu tests",
    prompt:
      "Saulkrastu ome uzliek 3 šķīvjus. Uz katra šķīvja ir 4 mazas kūkas. Cik kūku ir kopā?",
    answer: "12",
    accepted: ["12"],
    skill: "Reizināšana kā vienādas grupas",
    type: "number",
    hint: "Saskaiti 4 trīs reizes: 4 + 4 + 4.",
    explanation: "3 šķīvji pa 4 kūkām nozīmē 4 + 4 + 4 = 12.",
    inputLabel: "Ieraksti atbildi",
  },
  {
    id: 106,
    title: "Konfekšu miers",
    prompt: "Armands sadala 18 konfektes vienādi 3 bļodiņās. Cik konfekšu ir katrā bļodiņā?",
    answer: "6",
    accepted: ["6"],
    skill: "Dalīšana kā vienāda sadalīšana",
    type: "number",
    hint: "Padomā, cik ir katrā bļodiņā, ja 18 sadala 3 vienādās daļās.",
    explanation: "18 sadalot 3 vienādās daļās, katrā daļā ir 6.",
    inputLabel: "Ieraksti atbildi",
  },
  {
    id: 107,
    title: "Karamele un purkšķu juceklis",
    prompt:
      "Karamele pagalmā atrod 45 akmentiņus. Raivo 18 ieliek kabatā, bet Karamele vēlāk atrod vēl 9. Cik akmentiņu ir tagad?",
    answer: "36",
    accepted: ["36"],
    skill: "Divsoļu teksta uzdevums",
    type: "number",
    hint: "Vispirms atņem tos akmentiņus, kas aizceļoja pie Raivo. Pēc tam pieskaiti vēlāk atrastos.",
    explanation: "45 - 18 = 27. Pēc tam 27 + 9 = 36. Kopā ir 36 akmentiņi. Karamele var lepni nopūst purkšķi.",
    inputLabel: "Ieraksti atbildi",
  },
  {
    id: 108,
    title: "Laika lēciens",
    prompt: "Pulkstenis rāda 9:30. Pēc 2 stundām būs...?",
    answer: "11:30",
    accepted: ["11:30", "11.30"],
    skill: "Laika aprēķini",
    type: "text",
    hint: "Minūtes paliek 30, bet stundai pieskaiti 2.",
    explanation: "9:30 + 2 stundas = 11:30.",
    inputLabel: "Ieraksti laiku",
  },
];

function TaskVisual({ visual }: { visual?: QuestionVisual }) {
  if (!visual) {
    return null;
  }

  if (visual.kind === "clock") {
    const hourAngle = (visual.hour % 12) * 30 + visual.minute * 0.5;
    const minuteAngle = visual.minute * 6;

    return (
      <div className="task-visual clock-visual" aria-label="Pulksteņa zīmējums">
        <div className="clock-face">
          {Array.from({ length: 60 }).map((_, index) => (
            <span
              className={`clock-tick ${index % 5 === 0 ? "hour-tick" : ""}`}
              key={index}
              style={{ transform: `translateX(-50%) rotate(${index * 6}deg)` }}
            />
          ))}
          <span className="clock-mark mark-12">12</span>
          <span className="clock-mark mark-3">3</span>
          <span className="clock-mark mark-6">6</span>
          <span className="clock-mark mark-9">9</span>
          <span className="clock-hand hour-hand" style={{ transform: `rotate(${hourAngle}deg)` }} />
          <span className="clock-hand minute-hand" style={{ transform: `rotate(${minuteAngle}deg)` }} />
          <span className="clock-pin" />
        </div>
      </div>
    );
  }

  if (visual.kind === "bowls") {
    return (
      <div className="task-visual bowl-visual" aria-label="Konfektes bļodiņās">
        {visual.groups.map((count, groupIndex) => (
          <div className="bowl" key={`bowl-${groupIndex}`}>
            <div className="bowl-candies">
              {Array.from({ length: count }).map((_, itemIndex) => (
                <span className="bowl-candy" key={`bowl-${groupIndex}-${itemIndex}`}>
                  🍬
                </span>
              ))}
            </div>
            <div className="bowl-shape" />
          </div>
        ))}
      </div>
    );
  }

  const itemIcon = {
    bird: "🐦",
    candy: "🍬",
    cake: "🧁",
    cherry: "🍒",
  }[visual.item];

  return (
    <div className="task-visual item-visual" aria-label="Uzdevuma zīmējums">
      {visual.groups.map((count, groupIndex) => (
        <div className="item-group" key={`${visual.item}-${groupIndex}`}>
          {Array.from({ length: count }).map((_, itemIndex) => (
            <span className="visual-item" key={`${visual.item}-${groupIndex}-${itemIndex}`}>
              {itemIcon}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function makeEasierFollowUp(question: DiagnosticQuestion): DiagnosticQuestion | undefined {
  if (question.title.includes("mazliet vieglāks")) {
    return undefined;
  }

  if (question.easier) {
    return {
      ...question.easier,
      id: nextQuestionId(),
    };
  }

  if (question.skill.includes("Dalīšana")) {
    return {
      id: nextQuestionId(),
      title: "Līdzīgs, mazliet vieglāks",
      prompt: "6 konfektes sadala vienādi 2 bļodiņās. Cik konfekšu ir katrā bļodiņā?",
      answer: "3",
      accepted: ["3"],
      skill: question.skill,
      type: "number",
      hint: "Sadali 6 divās vienādās daļās.",
      explanation: "6 sadalot 2 vienādās daļās, katrā daļā ir 3.",
      inputLabel: "Ieraksti atbildi",
      visual: { kind: "bowls", groups: [3, 3] },
    };
  }

  if (question.skill.includes("Reizināšana")) {
    return {
      id: nextQuestionId(),
      title: "Līdzīgs, mazliet vieglāks",
      prompt: "Ir 2 rindas. Katrā rindā ir 3 ķirši. Cik ķiršu ir kopā?",
      answer: "6",
      accepted: ["6"],
      skill: question.skill,
      type: "number",
      hint: "Saskaiti 3 divas reizes.",
      explanation: "2 grupas pa 3 nozīmē 3 + 3 = 6.",
      inputLabel: "Ieraksti atbildi",
      visual: { kind: "items", item: "cherry", groups: [3, 3] },
    };
  }

  if (question.skill.includes("Laika")) {
    return {
      id: nextQuestionId(),
      title: "Līdzīgs, mazliet vieglāks",
      prompt: "Cik rāda pulkstenis?",
      answer: "3:00",
      accepted: ["3:00", "03:00", "3.00", "03.00"],
      skill: question.skill,
      type: "text",
      hint: "Garā bultiņa rāda 12, tātad ir pilna stunda.",
      explanation: "Īsā bultiņa ir pie 3, garā pie 12. Pulkstenis rāda 3:00.",
      inputLabel: "Ieraksti laiku, piemēram 3:00",
      visual: { kind: "clock", hour: 3, minute: 0 },
    };
  }

  if (question.skill.includes("secība")) {
    return {
      id: nextQuestionId(),
      title: "Līdzīgs, mazliet vieglāks",
      prompt: "Sakārto skaitļus no mazākā līdz lielākajam: 12, 7, 19",
      answer: "7, 12, 19",
      accepted: ["7,12,19", "7 12 19", "7;12;19"],
      skill: question.skill,
      type: "sequence",
      hint: "Sāc ar vismazāko. Atstarpes vai komati der.",
      explanation: "Vismazākais ir 7, pēc tam 12, tad 19.",
      inputLabel: "Ieraksti skaitļus, atdalot ar komatu, atstarpi vai semikolu",
    };
  }

  if (question.skill.includes("Trūkstošais")) {
    return {
      id: nextQuestionId(),
      title: "Līdzīgs, mazliet vieglāks",
      prompt: "10 + __ = 14",
      answer: "4",
      accepted: ["4"],
      skill: question.skill,
      type: "number",
      hint: "Cik jāpieliek pie 10, lai būtu 14?",
      explanation: "14 - 10 = 4, tātad trūkstošais skaitlis ir 4.",
      inputLabel: "Ieraksti trūkstošo skaitli",
    };
  }

  return {
    id: nextQuestionId(),
    title: "Līdzīgs, mazliet vieglāks",
    prompt: "8 + 4 = ?",
    answer: "12",
    accepted: ["12"],
    skill: question.skill,
    type: "number",
    hint: "8 vajag vēl 2, lai būtu 10.",
    explanation: "8 + 2 = 10. No 4 paliek 2. Tātad 10 + 2 = 12.",
    inputLabel: "Ieraksti atbildi",
  };
}

function splitExplanation(explanation: string) {
  return explanation
    .split(/(?<=\.)\s+/)
    .map((step) => step.trim())
    .filter(Boolean);
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/€/g, "eiro")
    .replace(/eur/g, "eiro")
    .trim();

const compact = (value: string) => normalize(value).replace(/\s/g, "");

function isCorrect(question: DiagnosticQuestion, value: string) {
  const normalizedValue = normalize(value);
  const compactValue = compact(value);

  return question.accepted.some((accepted) => {
    const normalizedAccepted = normalize(accepted);
    return normalizedValue === normalizedAccepted || compactValue === compact(accepted);
  });
}

function App() {
  const [savedSession, setSavedSession] = useState<SavedSession | null>(() => loadSavedSession());
  const [phase, setPhase] = useState<Phase>(() => savedSession?.phase ?? "intro");
  const [currentIndex, setCurrentIndex] = useState(() => savedSession?.currentIndex ?? 0);
  const [answer, setAnswer] = useState(() => savedSession?.answer ?? "");
  const [attempts, setAttempts] = useState(() => savedSession?.attempts ?? 0);
  const [feedback, setFeedback] = useState<FeedbackState>(() => savedSession?.feedback ?? "idle");
  const [diagnosticRecords, setDiagnosticRecords] = useState<AnswerRecord[]>(
    () => savedSession?.diagnosticRecords ?? [],
  );
  const [questRecords, setQuestRecords] = useState<AnswerRecord[]>(
    () => savedSession?.questRecords ?? [],
  );
  const [warmupQuestions, setWarmupQuestions] = useState<DiagnosticQuestion[]>(() =>
    savedSession?.warmupQuestions?.length ? savedSession.warmupQuestions : createWarmupSession(),
  );
  const [dailyQuestions, setDailyQuestions] = useState<DiagnosticQuestion[]>(() =>
    savedSession?.dailyQuestions?.length ? savedSession.dailyQuestions : createDailySession(),
  );
  const [idlePrompt, setIdlePrompt] = useState(() => savedSession?.idlePrompt ?? pickRandomText(idlePrompts));
  const [correctMessage, setCorrectMessage] = useState(
    () => savedSession?.correctMessage ?? pickRandomText(correctFeedback),
  );
  const [hintOpener, setHintOpener] = useState(() => savedSession?.hintOpener ?? pickRandomText(hintOpeners));
  const [explanationOpener, setExplanationOpener] = useState(() =>
    savedSession?.explanationOpener ?? pickRandomText(explanationOpeners),
  );
  const answerInputRef = useRef<HTMLInputElement>(null);

  const activeQuestions = phase === "daily" ? dailyQuestions : warmupQuestions;
  const records = phase === "daily" ? questRecords : diagnosticRecords;
  const currentQuestion = activeQuestions[currentIndex];
  const isComplete = currentIndex >= activeQuestions.length;
  const progress = Math.round((Math.min(currentIndex, activeQuestions.length) / activeQuestions.length) * 100);

  const correctCount = records.filter((record) => record.correct).length;
  const needsPractice = records.filter((record) => !record.correct).map((record) => record.skill);
  const strongSkills = records.filter((record) => record.correct).map((record) => record.skill);

  const summaryText = useMemo(() => {
    if (!records.length) {
      return "Vēl nav redzams, kuri uzdevumi Maijai šodien dod visvairāk enerģijas.";
    }

    if (correctCount >= 12) {
      return "Maija var sākt ar 2. klases vidus līmeņa uzdevumiem un atsevišķiem izaicinājumiem.";
    }

    if (correctCount >= 9) {
      return "Maijai der 2. klases sākuma līmenis ar regulāriem tiltiem uz grūtākiem uzdevumiem.";
    }

    return "Maijai jāsāk ar pārliecības nostiprināšanu un pakāpenisku pāreju uz 2. klases tēmām.";
  }, [correctCount, records.length]);

  useEffect(() => {
    if (phase !== "intro" && !isComplete && feedback === "idle") {
      answerInputRef.current?.focus();
    }
  }, [currentIndex, feedback, isComplete, phase]);

  useEffect(() => {
    const hasOldStaticWarmup = phase !== "daily" && warmupQuestions.some((question) => question.id < 30000);
    const hasOldStaticDaily = phase === "daily" && dailyQuestions.some((question) => question.id < 30000);

    if (!hasOldStaticWarmup && !hasOldStaticDaily) {
      return;
    }

    clearSavedSession();
    setCurrentIndex(0);
    setAnswer("");
    setAttempts(0);
    setFeedback("idle");
    setWarmupQuestions(createWarmupSession());
    setDailyQuestions(createDailySession(diagnosticRecords));
    setDiagnosticRecords([]);
    setQuestRecords([]);
  }, [dailyQuestions, diagnosticRecords, phase, warmupQuestions]);

  useEffect(() => {
    const session: SavedSession = {
      phase,
      currentIndex,
      answer,
      attempts,
      feedback,
      diagnosticRecords,
      questRecords,
      warmupQuestions,
      dailyQuestions,
      idlePrompt,
      correctMessage,
      hintOpener,
      explanationOpener,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setSavedSession(session);
  }, [
    answer,
    attempts,
    correctMessage,
    currentIndex,
    diagnosticRecords,
    dailyQuestions,
    explanationOpener,
    feedback,
    hintOpener,
    idlePrompt,
    phase,
    questRecords,
    warmupQuestions,
  ]);

  function recordAnswer(correct: boolean, finalAttempts: number) {
    const setter = phase === "daily" ? setQuestRecords : setDiagnosticRecords;

    setter((existing) => [
      ...existing.filter((record) => record.questionId !== currentQuestion.id),
      {
        questionId: currentQuestion.id,
        value: answer.trim(),
        correct,
        attempts: finalAttempts,
        skill: currentQuestion.skill,
      },
    ]);
  }

  function goNext() {
    const followUp = feedback === "explanation" ? makeEasierFollowUp(currentQuestion) : undefined;

    if (followUp) {
      rememberQuestions([followUp]);

      if (phase === "daily") {
        setDailyQuestions((existing) => [
          ...existing.slice(0, currentIndex + 1),
          followUp,
          ...existing.slice(currentIndex + 1),
        ]);
      } else {
        setWarmupQuestions((existing) => [
          ...existing.slice(0, currentIndex + 1),
          followUp,
          ...existing.slice(currentIndex + 1),
        ]);
      }
    }

    setAnswer("");
    setAttempts(0);
    setFeedback("idle");
    setIdlePrompt(pickRandomText(idlePrompts));
    setCorrectMessage(pickRandomText(correctFeedback));
    setHintOpener(pickRandomText(hintOpeners));
    setExplanationOpener(pickRandomText(explanationOpeners));
    setCurrentIndex((index) => index + 1);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!answer.trim()) {
      return;
    }

    const nextAttempts = attempts + 1;
    const correct = isCorrect(currentQuestion, answer);
    setAttempts(nextAttempts);

    if (correct) {
      setFeedback("correct");
      recordAnswer(true, nextAttempts);
      return;
    }

    if (nextAttempts === 1) {
      setFeedback("hint");
      return;
    }

    setFeedback("explanation");
    recordAnswer(false, nextAttempts);
  }

  function restart() {
    clearSavedSession();
    setSavedSession(null);
    setPhase("intro");
    setCurrentIndex(0);
    setAnswer("");
    setAttempts(0);
    setFeedback("idle");
    setIdlePrompt(pickRandomText(idlePrompts));
    setCorrectMessage(pickRandomText(correctFeedback));
    setHintOpener(pickRandomText(hintOpeners));
    setExplanationOpener(pickRandomText(explanationOpeners));
    setWarmupQuestions(createWarmupSession());
    setDailyQuestions(createDailySession());
    setDiagnosticRecords([]);
    setQuestRecords([]);
  }

  function startDiagnostic() {
    clearSavedSession();
    setSavedSession(null);
    setPhase("diagnostic");
    setCurrentIndex(0);
    setAnswer("");
    setAttempts(0);
    setFeedback("idle");
    setIdlePrompt(pickRandomText(idlePrompts));
    setCorrectMessage(pickRandomText(correctFeedback));
    setHintOpener(pickRandomText(hintOpeners));
    setExplanationOpener(pickRandomText(explanationOpeners));
    setWarmupQuestions(createWarmupSession());
    setDailyQuestions(createDailySession());
    setDiagnosticRecords([]);
  }

  function startDailyQuest() {
    setPhase("daily");
    setCurrentIndex(0);
    setAnswer("");
    setAttempts(0);
    setFeedback("idle");
    setIdlePrompt(pickRandomText(idlePrompts));
    setCorrectMessage(pickRandomText(correctFeedback));
    setHintOpener(pickRandomText(hintOpeners));
    setExplanationOpener(pickRandomText(explanationOpeners));
    setDailyQuestions(createDailySession(diagnosticRecords));
    setQuestRecords([]);
  }

  function continueSavedSession() {
    const session = loadSavedSession();

    if (!session) {
      return;
    }

    setSavedSession(session);
    setPhase(session.phase);
    setCurrentIndex(session.currentIndex);
    setAnswer(session.answer);
    setAttempts(session.attempts);
    setFeedback(session.feedback);
    setDiagnosticRecords(session.diagnosticRecords);
    setQuestRecords(session.questRecords);
    setWarmupQuestions(session.warmupQuestions?.length ? session.warmupQuestions : createWarmupSession());
    setDailyQuestions(session.dailyQuestions?.length ? session.dailyQuestions : createDailySession());
    setIdlePrompt(session.idlePrompt);
    setCorrectMessage(session.correctMessage);
    setHintOpener(session.hintOpener);
    setExplanationOpener(session.explanationOpener);
  }

  if (phase === "intro") {
    return (
      <main className="app-shell intro-screen">
        <section className="intro-panel">
          <div className="brand-row">
            <span className="brand-mark">
              <Compass size={24} />
            </span>
            <span>Skaitļu prieks</span>
          </div>

          <div className="intro-copy">
            <p className="eyebrow">Šodienas iesildīšanās</p>
            <h1>Sveika, Maija.</h1>
            <p>
              Šodien skaitļi nebūs rindā kā parastā grāmatā. Tie mazliet
              jokosies, brīžiem paslēpsies, bet beigās tomēr ļausies atrisināt.
            </p>
            <p>
              Ja kaut kas nesanāk uzreiz, nekādas drāmas. Pagriezīsim piemēru
              citā leņķī un noķersim domu aiz astes.
            </p>
          </div>

          <button className="primary-action" onClick={startDiagnostic}>
            Aiziet, pārsteidz mani
            <ArrowRight size={20} />
          </button>

          {savedSession && savedSession.phase !== "intro" && (
            <div className="resume-strip">
              <div>
                <strong>Iepriekšējā iesildīšanās vēl nav pazudusi.</strong>
                <span>
                  Var turpināt no {savedSession.currentIndex + 1}. uzdevuma.
                </span>
              </div>
              <button className="secondary-action" onClick={continueSavedSession}>
                Turpināt
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  if (isComplete && phase === "diagnostic") {
    const uniquePractice = Array.from(new Set(needsPractice)).slice(0, 5);
    const uniqueStrong = Array.from(new Set(strongSkills)).slice(0, 5);

    return (
      <main className="app-shell result-screen">
        <section className="result-panel">
          <div className="result-badge">
            <Award size={34} />
          </div>
          <p className="eyebrow">Iesildīšanās gatava</p>
          <h1>Labs starts, Maija.</h1>
          <p className="summary-line">
            Pareizi atrisināti {correctCount} no {warmupQuestions.length} uzdevumiem. {summaryText}
          </p>

          <div className="report-grid">
            <article>
              <h2>Kas šodien gāja jaudīgi</h2>
              <ul>
                {(uniqueStrong.length ? uniqueStrong : ["Vēl jāapkopo pēc nākamā uzdevumu komplekta"]).map(
                  (skill) => (
                    <li key={skill}>{skill}</li>
                  ),
                )}
              </ul>
            </article>
            <article>
              <h2>Jānostiprina</h2>
              <ul>
                {(uniquePractice.length ? uniquePractice : ["Šajā reizē būtisku klupienu nebija"]).map(
                  (skill) => (
                    <li key={skill}>{skill}</li>
                  ),
                )}
              </ul>
            </article>
          </div>

          <div className="result-actions">
            <button className="secondary-action" onClick={restart}>
              <RotateCcw size={18} />
              Sākt no jauna
            </button>
            <button className="primary-action" onClick={startDailyQuest}>
              Doties uz jautrajiem uzdevumiem
              <Sparkles size={18} />
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (isComplete && phase === "daily") {
    const questCorrectCount = questRecords.filter((record) => record.correct).length;
    const practicedSkills = Array.from(new Set(questRecords.map((record) => record.skill))).slice(0, 5);

    return (
      <main className="app-shell result-screen">
        <section className="result-panel">
          <div className="result-badge">
            <Sparkles size={34} />
          </div>
          <p className="eyebrow">Jautrie uzdevumi pabeigti</p>
          <h1>Šodien skaitļi padevās labi.</h1>
          <p className="summary-line">
            Maija atrisināja {questCorrectCount} no {dailyQuestions.length} uzdevumiem.
            Laba enerģija, daži triki, un skaitļu muskulis kļuva stiprāks.
          </p>

          <div className="report-grid">
            <article>
              <h2>Šodien trenēts</h2>
              <ul>
                {practicedSkills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </article>
            <article>
              <h2>Nākamais solis</h2>
              <ul>
                <li>Turpināt ar pāreju pāri desmitam</li>
                <li>Ielikt vairāk teksta uzdevumu</li>
                <li>Pamazām stiprināt dalīšanu kā sadalīšanu</li>
              </ul>
            </article>
          </div>

          <div className="result-actions">
            <button className="secondary-action" onClick={restart}>
              <RotateCcw size={18} />
              Sākt no jauna
            </button>
            <button className="primary-action" onClick={startDailyQuest}>
              Vēl viens komplekts
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell quest-screen">
      <section className="quest-layout">
        <aside className="map-panel">
          <div className="map-topline">
            <Sparkles size={20} />
            <span>Šodienas enerģija</span>
          </div>
          <div className="map-art" aria-hidden="true">
            <span className="energy-card card-one">aha!</span>
            <span className="energy-card card-two">hmm...</span>
            <span className="energy-card card-three">klikšķis</span>
          </div>
          <p>
            {phase === "daily"
              ? "Mazliet joki, mazliet treniņš, un galva sāk strādāt asāk."
              : "Te krājas mazie “ā, skaidrs!” momenti."}
          </p>
        </aside>

        <section className="question-panel">
          <div className="progress-row">
            <button
              className="icon-button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
              aria-label="Atpakaļ"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="progress-track" aria-label={`Progress ${progress}%`}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-count">
              {currentIndex + 1}/{activeQuestions.length}
            </span>
          </div>

          <div className="question-copy">
            <p className="eyebrow">{currentQuestion.title}</p>
            <h1>{currentQuestion.prompt}</h1>
            <p>{currentQuestion.skill}</p>
          </div>

          <TaskVisual visual={currentQuestion.visual} />

          <form className="answer-form" onSubmit={handleSubmit}>
            <label htmlFor="answer">{currentQuestion.inputLabel}</label>
            <div className="answer-row">
              <input
                ref={answerInputRef}
                id="answer"
                inputMode={currentQuestion.type === "number" ? "numeric" : "text"}
                autoComplete="off"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                disabled={feedback === "correct" || feedback === "explanation"}
                autoFocus
              />
              <button
                className="primary-action compact"
                type={feedback === "correct" || feedback === "explanation" ? "button" : "submit"}
                onClick={feedback === "correct" || feedback === "explanation" ? goNext : undefined}
              >
                {feedback === "correct" || feedback === "explanation" ? "Tālāk" : "Pārbaudīt"}
                {feedback === "correct" || feedback === "explanation" ? (
                  <ArrowRight size={18} />
                ) : (
                  <Check size={18} />
                )}
              </button>
            </div>
          </form>

          <div className={`feedback-card ${feedback}`}>
            {feedback === "idle" && idlePrompt}
            {feedback === "hint" && (
              <>
                <strong>{hintOpener}</strong> {currentQuestion.hint}
              </>
            )}
            {feedback === "explanation" && (
              <div className="feedback-explanation">
                <strong>{explanationOpener}</strong>
                <div className="feedback-steps">
                  {splitExplanation(currentQuestion.explanation).map((step) => (
                    <span key={step}>{step}</span>
                  ))}
                </div>
              </div>
            )}
            {feedback === "correct" && (
              <>
                <strong>{correctMessage}</strong>
              </>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
