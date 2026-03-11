import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY environment variable is not set.');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

function getFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', 'public'].includes(file)) {
        getFiles(path.join(dir, file), fileList);
      }
    } else {
      if (file.match(/\.(ts|tsx|js|jsx|css|json)$/)) {
        fileList.push(path.join(dir, file));
      }
    }
  }
  return fileList;
}

async function run() {
  const issueTitle = process.env.ISSUE_TITLE || '';
  const issueBody = process.env.ISSUE_BODY || '';

  console.log(`Processing Issue: ${issueTitle}`);

  const dirsToScan = ['components', 'services', 'api', 'src', 'types'];
  let allFiles = [];
  for (const dir of dirsToScan) {
    allFiles = getFiles(path.join(process.cwd(), dir), allFiles);
  }

  let contextStr = 'Project Files:\n\n';
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    contextStr += `--- FILE: ${path.relative(process.cwd(), file)} ---\n${content}\n\n`;
  }

  const prompt = `
  You are an autonomous AI developer.
  An issue has been reported in the repository.
  
  ISSUE TITLE: ${issueTitle}
  ISSUE BODY: ${issueBody}
  
  Below is the codebase context.
  ${contextStr}
  
  Analyze the issue and the codebase. Determine which files need to be modified, created, or deleted to resolve the issue.
  Return a JSON array of objects. Each object must have:
  - "path": the relative path to the file (e.g., "components/App.tsx")
  - "content": the complete new content of the file.
  
  If no changes are needed, return an empty array [].
  `;

  console.log('Calling Gemini API...');
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            path: { type: Type.STRING },
            content: { type: Type.STRING }
          },
          required: ["path", "content"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) {
    console.log('No response from Gemini.');
    return;
  }

  const changes = JSON.parse(text);
  console.log(`Received ${changes.length} file changes.`);

  for (const change of changes) {
    const fullPath = path.join(process.cwd(), change.path);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, change.content, 'utf-8');
    console.log(`Updated file: ${change.path}`);
  }
}

run().catch((error) => {
  console.error('Fatal error in AI Developer script:', error);
  process.exit(1);
});
