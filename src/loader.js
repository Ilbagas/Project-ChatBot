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

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  const docs = await splitter.createDocuments([data.text]);
  return docs;
}


(async () => {
  try {
    console.time("⏱️ Waktu eksekusi"); 

    const docs = await loadPDF("./test/data/Syarat-Pembuatan-SIM.pdf");
    console.log("✅ Jumlah potongan:", docs.length);
    console.log("🔍 Contoh isi:", docs[0].pageContent.slice(0, 200));

    console.timeEnd("⏱️ Waktu eksekusi"); // end timer
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();
