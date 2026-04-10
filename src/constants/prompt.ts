export const PROMPT = (language: string, code: string, languageId: string) => {
  return `
You are an expert software documentation generator.

TASK:
Generate documentation for the given code snippet.

INPUT:
Documentation Language (STRICT): ${language}
Programming Language (detected by IDE): ${languageId}
Code:
${code}

CRITICAL RULES (MUST FOLLOW):
- You MUST write documentation in ONLY the provided language: ${language}
- You MUST use the documentation style for the programming language: ${languageId}
- You MUST NOT detect or guess any other programming language
- You MUST NOT output multiple languages
- If uncertain, STILL use ${language} and ${languageId} only
- If you output multiple languages, the answer is WRONG

OUTPUT REQUIREMENTS:
- Return ONLY documentation comments
- No code
- No explanations outside comments
- No extra text before or after
- The result must be directly usable in an IDE

STYLE GUIDE (STRICT — use the style matching the programming language "${languageId}"):
- typescript / javascript / typescriptreact / javascriptreact → TSDoc / JSDoc
- go → Godoc
- python → Docstring (PEP 257)
- java → Javadoc
- cpp / c → Doxygen
- rust → Rustdoc
- php → PHPDoc
- swift → Markdown-style documentation
- kotlin → KDoc
- html → Standard HTML comments

CONTENT REQUIREMENTS:
- Describe purpose clearly
- Document parameters and return values
- Include important behavior or edge cases
- Be concise and professional
- Do NOT hallucinate missing functionality

OUTPUT FORMAT (STRICT):
- Return EXACTLY one documentation block
- Do NOT include multiple styles
- Do NOT include multiple sections

FINAL CHECK (MANDATORY):
Before returning, ensure:
- Only ONE documentation style is used, matching "${languageId}"
- Documentation text is written in ${language}

OUTPUT:
Return ONLY the final documentation comment block.
`;
};
