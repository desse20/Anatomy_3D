export interface QuizItem {
    text?: string;
    options?: string[];
    correctAnswer?: number;
    explanation?: string;
}

export function tryParseQuizJson(content: string): QuizItem[] | null {
    const trimmed = content.trim();
    const attempts = [trimmed];
    const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
    if (arrayMatch) attempts.push(arrayMatch[0]);

    for (const raw of attempts) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.text != null) {
                return parsed as QuizItem[];
            }
            if (parsed && typeof parsed === 'object' && parsed.text != null) {
                return [parsed as QuizItem];
            }
        } catch {
            /* next attempt */
        }
    }
    return null;
}

export function quizToMarkdown(items: QuizItem[], fr: boolean): string {
    return items
        .map((q, idx) => {
            const title = items.length > 1
                ? (fr ? `### Question ${idx + 1}` : `### Question ${idx + 1}`)
                : (fr ? '### Question' : '### Question');
            const lines: string[] = [title];
            if (q.text) lines.push('', q.text.replace(/^Le système est actuellement hors-ligne\. \(Généré depuis la DB\)\s*/i, '⚠️ *Mode hors-ligne — réponse depuis la base de données.*\n\n'));
            if (q.options?.length) {
                lines.push('');
                q.options.forEach((opt, i) => {
                    const mark = i === q.correctAnswer ? ' ✓' : '';
                    lines.push(`- **${opt}**${mark}`);
                });
            }
            if (q.explanation) {
                lines.push('', `**${fr ? 'Explication' : 'Explanation'}:** ${q.explanation}`);
            }
            return lines.join('\n');
        })
        .join('\n\n---\n\n');
}

/** Affichage lisible : JSON quiz → markdown, sinon texte brut */
export function formatChatContent(content: string, language: 'fr' | 'en' = 'fr'): string {
    const quiz = tryParseQuizJson(content);
    if (quiz) return quizToMarkdown(quiz, language === 'fr');
    return content;
}

export function getCopyText(content: string): string {
    const quiz = tryParseQuizJson(content);
    if (!quiz) return content;
    return quiz
        .map((q, i) => {
            const parts = [`${i + 1}. ${q.text ?? ''}`];
            if (q.options?.length) parts.push(q.options.map((o, j) => `   ${String.fromCharCode(65 + j)}. ${o}`).join('\n'));
            if (q.explanation) parts.push(`   → ${q.explanation}`);
            return parts.join('\n');
        })
        .join('\n\n');
}
