/** Sections of a shared text, separated by a blank line; empty ones drop out. */
export const joinSections = (...sections: (string | false | null | undefined)[]) => sections.filter(Boolean).join('\n\n');

export const checkLine = (text: string, done: boolean | number) => `${done ? '☑' : '☐'} ${text}`;
