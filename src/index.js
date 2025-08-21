import readline from "readline";
import { loadPDF } from "./loader.js";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { Ollama } from "@langchain/community/llms/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

function adjustAnswer(text,query = "",context = ""){
    const keywords = query ? query.match(/\b[A-Z][A-Za-z0-9]+\b/g):null;
    let adjust1 = text
        .replace(/teman/gi,"Anda")
        .replace(/Kebetulan orang itu/gi,"Anda")
        .replace(/berdasarkan dokumen/gi,"Menurut Informasi")
        .replace(/Menurut dokumen,/gi,"Menurut informasi yang tersedia")
        .replace(/Menurut dokumen yang diberikan,/gi, "")
        .replace(/Dokumen tersebut/gi, "Informasi yang tersedia")
        .replace(/(sayang)(.*)(sayang)/gi, "$1$2")
        .trim();
    
    let adjust2 = adjust1
          .replace(/so, unfortunately/gi, "jadi")
          .replace(/let's break it down/gi, "mari kita bahas")
          .replace(/firstly/gi, "pertama")
          .replace(/secondly/gi, "kedua");

      if (keywords) {
        keywords.forEach(keyword => {
          if (!adjust2.includes(keyword) && context.includes(keyword)) {
            adjust2 += `\n\n⚠️ Catatan: "${keyword}" disebut dalam dokumen, tetapi tidak muncul di jawaban. Pastikan Anda memeriksa syarat/aturan terkait.`;
          }
        });
      }

    if (/bisa ngapain/gi.test(adjust2)){
        adjust2 = "Saya bisa membantu anda dalam membuat SIM secara online";
    }

    if(/terimakasih,thankyou,thanks/gi.test(adjust2)){
      adjust2 = "Sama-sama senang sekali bisa membantu anda!"
    }

    return adjust2;
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
      `Jawablah hanya berdasarkan dokumen, gunakan bahasa Indonesia yang sopan, jelas, dan tidak menambahkan opini pribadi atau candaan dan jangan memberitahu ke pengguna bahwa ai ini mengambil dari dokumen jika harus menyebutkan syarat sebutkan secara lengkap (jangan tulis "dokumen pendukung" atau istilah umum). :\n\n${context}\n\nPertanyaan: ${query}\nJawaban:`
    );

    const adjusted = adjustAnswer(answer);

    console.log("\n🤖 Jawaban AI:");
    console.log(adjusted);

    askQuestion();
  });
}

console.log("Hei apakah ada yang bisa saya bantu?");
askQuestion();
