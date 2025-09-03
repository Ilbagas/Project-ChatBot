import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const pdf = pkg.default || pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadPDF(filePath) {
  const absolutePath = path.resolve(__dirname, filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File tidak ditemukan: ${absolutePath}`);
  }

  console.log("📄 Membaca file:", absolutePath);

  const dataBuffer = fs.readFileSync(absolutePath);
  const data = await pdf(dataBuffer);

  // 🔹 Split per halaman
  const pages = data.text.split("\f").filter((p) => p.trim().length > 0);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 100,
  });

  // 🔹 Buat docs dengan metadata halaman
  let docs = [];
  for (let i = 0; i < pages.length; i++) {
    const pageDocs = await splitter.createDocuments([pages[i]], [
      { pageNumber: i + 1 },
    ]);
    docs = docs.concat(pageDocs);
  }

  return docs;
}

// Test loader
(async () => {
  try {
    console.time("⏱️ Waktu eksekusi");

    const docs = await loadPDF("./test/data/Dummy-LAA.pdf");
    console.log("✅ Jumlah potongan:", docs.length);
    console.log("📑 Contoh metadata:", docs[0]?.metadata);

    console.timeEnd("⏱️ Waktu eksekusi");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();
