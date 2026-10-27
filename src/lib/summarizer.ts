// Client-side smart extractive summarization engine (no external API key required)

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can",
  "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't",
  "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have",
  "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him",
  "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't",
  "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor",
  "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out",
  "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some",
  "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
  "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to",
  "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
  "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's",
  "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're",
  "you've", "your", "yours", "yourself", "yourselves", "hello", "hi", "hey", "ok", "okay", "yeah", "yes", "no"
]);

export interface ChatMessageForSummary {
  senderName: string;
  text: string;
  created_at?: string;
}

export interface SummaryResult {
  overview: string;
  bulletPoints: string[];
  actionItems: string[];
  keyTopics: string[];
  messageCount: number;
  participantCount: number;
  formattedCard: string;
}

export function generateChatSummary(
  messages: ChatMessageForSummary[],
  chatTitle: string
): SummaryResult {
  const validMessages = messages
    .filter((m) => m.text && m.text.trim().length > 0 && !m.text.startsWith("http"))
    .slice(-50);

  if (validMessages.length === 0) {
    return {
      overview: "No text messages available to summarize.",
      bulletPoints: ["Start a conversation to generate an AI summary."],
      actionItems: [],
      keyTopics: [],
      messageCount: 0,
      participantCount: 0,
      formattedCard: `📝 *AI Summary for ${chatTitle}*\n\nNo text messages found yet.`,
    };
  }

  // Count participants
  const participants = new Set(validMessages.map((m) => m.senderName));

  // Word frequency analysis
  const wordFreq: Record<string, number> = {};
  const sentences: { text: string; sender: string; score: number }[] = [];

  for (const msg of validMessages) {
    const rawSentences = msg.text.split(/[.!?\n]+/).map((s) => s.trim()).filter((s) => s.length > 5);
    const words = msg.text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];

    for (const w of words) {
      if (!STOP_WORDS.has(w)) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    }

    for (const s of rawSentences) {
      sentences.push({ text: s, sender: msg.senderName, score: 0 });
    }
  }

  // Top topics
  const sortedWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

  // Score sentences based on keyword frequencies and action triggers
  const actionTriggers = /\b(will|should|need to|let's|submit|due|please|action|task|deadline|presentation|meeting|prepare|check|done)\b/i;
  const actionItems: string[] = [];

  for (const s of sentences) {
    let score = 0;
    const words = s.text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    for (const w of words) {
      if (wordFreq[w]) score += wordFreq[w];
    }
    s.score = score;

    if (actionTriggers.test(s.text) && actionItems.length < 4) {
      actionItems.push(`${s.sender}: "${s.text}"`);
    }
  }

  // Pick top sentences for key discussion points
  const topSentences = [...sentences]
    .sort((a, b) => b.score - a.score)
    .filter((v, idx, arr) => arr.findIndex((x) => x.text === v.text) === idx)
    .slice(0, 4)
    .map((s) => `${s.sender}: ${s.text}`);

  const overview = `Discussion between ${Array.from(participants).slice(0, 3).join(", ")}${
    participants.size > 3 ? ` and ${participants.size - 3} others` : ""
  } focusing on ${sortedWords.length ? sortedWords.join(", ") : "general collaboration"}.`;

  const bulletPoints = topSentences.length > 0 ? topSentences : validMessages.slice(-3).map((m) => `${m.senderName}: ${m.text}`);

  // Format as a WhatsApp message card
  const cardLines = [
    `✨ *AI Discussion Summary · ${chatTitle}*`,
    `📊 *Activity*: ${validMessages.length} messages analyzed across ${participants.size} participant(s).`,
    "",
    `📌 *Key Topics*: ${sortedWords.length ? sortedWords.join(" • ") : "General"}`,
    "",
    `💡 *Key Highlights*:`,
    ...bulletPoints.map((b) => `• ${b}`),
  ];

  if (actionItems.length > 0) {
    cardLines.push("", `🎯 *Action Items & Tasks*:`, ...actionItems.map((a) => `✓ ${a}`));
  }

  const formattedCard = cardLines.join("\n");

  return {
    overview,
    bulletPoints,
    actionItems,
    keyTopics: sortedWords,
    messageCount: validMessages.length,
    participantCount: participants.size,
    formattedCard,
  };
}

// Extractive summary for assignment submissions
export function generateSubmissionSummary(content: string, fileName?: string): string {
  const trimmed = (content || "").trim();
  if (!trimmed && fileName) {
    return `Uploaded presentation / document: ${fileName}`;
  }
  if (!trimmed) {
    return "No content provided.";
  }

  const first200 = trimmed.slice(0, 200).replace(/\s+/g, " ");
  const words = trimmed.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (!STOP_WORDS.has(w)) freq[w] = (freq[w] || 0) + 1;
  }
  const topWords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

  const keywordText = topWords.length ? ` | Key topics: ${topWords.join(", ")}` : "";
  return `${first200}${trimmed.length > 200 ? "…" : ""}${keywordText}`;
}
