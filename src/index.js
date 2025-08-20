import readline from "readline";
import { loadPDF } from "./loader.js";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { Ollama } from "@langchain/community/llms/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

function adjustAnswer(text){
    return text
    .replace(/Menurut dokumen,/gi,"Menurut informasi yang tersedia")
    .replace(/Menurut dokumen yang diberikan, /gi, "")
    .replace(/Dokumen tersebut/gi, "Informasi yang tersedia")
    .trim();
}

console.log("📄 Loading PDF...");
const docs = await loadPDF("./test/data/Syarat-Pembuatan-SIM.pdf");

const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
});

const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

const llm = new Ollama({
  model: "llama3",
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function askQuestion() {
  rl.question("\n❓ Pertanyaan kamu: ", async (query) => {

    const results = await vectorStore.similaritySearch(query, 3);
    const context = results.map(r => r.pageContent).join("\n---\n");

    const answer = await llm.invoke(
      `Jawablah pertanyaan berdasarkan dokumen berikut:\n\n${context}\n\nPertanyaan: ${query}\nJawaban:`
    );

    const adjusted = adjustAnswer(answer);

    console.log("\n🤖 Jawaban AI:");
    console.log(adjusted);

    askQuestion();
  });
}

console.log("Hei apakah ada yang bisa saya bantu?");
askQuestion();
