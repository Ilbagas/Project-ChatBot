import readline from "readline";
import { loadPDF } from "./loader.js";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { Ollama } from "@langchain/community/llms/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

console.log("📄 Loading PDF...");
const docs = await loadPDF("./test/data/Dummy-LAA.pdf");
const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: "http://localhost:11434"
});
const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

// Konfigurasi Ollama dengan parameter CPU untuk menghindari error CUDA
const llm = new Ollama({
  model: "llama3.2",
  temperature: 0.3,
  top_p: 0.85,
  top_k: 40,
  repeat_penalty: 1.1,
  baseUrl: "http://localhost:11434",
  num_ctx: 2048,  // Kurangi ukuran konteks untuk menghemat memori
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Daftar kata kunci ambigu yang perlu penanganan khusus
const ambiguousKeywords = [
  "terlambat", "telat", "melewati batas", 
  "denda", "sanksi", "konsekuensi",
  "batas waktu", "deadline", "tenggat",
  "persyaratan", "syarat", "ketentuan",
  "prosedur", "cara", "langkah"
];

function adjustAnswer(text, query = "", context = "") {
    // Ekstrak kata kunci dari query
    const keywords = query ? query.match(/\b[A-Z][A-Za-z0-9]+\b/g) : [];
    
    // Normalisasi kata tidak formal
    let adjusted = text
        .replace(/teman|kamu|anda/gi, "Anda")
        .replace(/Kebetulan orang itu/gi, "Anda")
        .replace(/berdasarkan dokumen/gi, "Menurut Informasi")
        .replace(/Menurut dokumen,/gi, "Menurut informasi yang tersedia")
        .replace(/Menurut dokumen yang diberikan,/gi, "")
        .replace(/Dokumen tersebut/gi, "Informasi yang tersedia")
        .replace(/mahasiswa/gi,"anda")
        .replace(/konteks/gi,"informasi")
        .replace(/(sayang)(.*)(sayang)/gi, "$1$2")
        .trim();
    
    // Hapus frasa berbahasa Inggris
    adjusted = adjusted
        .replace(/so, unfortunately/gi, "jadi")
        .replace(/let's break it down/gi, "mari kita bahas")
        .replace(/firstly/gi, "pertama")
        .replace(/secondly/gi, "kedua")
        .replace(/however/gi, "namun")
        .replace(/therefore/gi, "oleh karena itu");
    
    // Penanganan kasus khusus
    if (/bisa ngapain/gi.test(adjusted)) {
        adjusted = "Saya bisa membantu Anda dalam membuat SIM secara online";
    }
    
    if (/terimakasih|thankyou|thanks/gi.test(adjusted)) {
        adjusted = "Sama-sama, senang sekali bisa membantu Anda!";
    }
    
    if (keywords) {
        keywords.forEach(keyword => {
            if (!adjusted.includes(keyword) && context.includes(keyword)) {
                adjusted += ` (Catatan: ${keyword} merupakan persyaratan penting)`;
            }
        });
    }
    
    // Hapus karakter aneh dan format ulang
    adjusted = adjusted
        .replace(/\s+/g, ' ')  // Normalisasi spasi
        .replace(/\n\s*\n/g, '\n')  // Hapus baris kosong berlebih
        .replace(/^\s+|\s+$/g, '');  // Trim whitespace
    
    return adjusted;
}

function checkBias(text) {
    const biasPatterns = [
        /(\b|^)(pria|laki-laki)(\b|$).*?harus/gi,  // Gender stereotyping
        /(\b|^)(wanita|perempuan)(\b|$).*?lebih/gi,
        /(\b|^)(jawa|sunda|batak|minang)(\b|$).*?biasa/gi,  // Etnis stereotyping
        /(\b|^)(islam|kristen|hindu|buddha)(\b|$).*?wajib/gi,  // Agama stereotyping
        /(\b|^)(pribumi|non-pribumi)(\b|$)/gi  // Suku stereotyping
    ];
    
    const foundBias = biasPatterns.some(pattern => pattern.test(text));
    if (foundBias) {
        console.warn("[WARNING] Potensi bias terdeteksi dalam jawaban!");
        return false;
    }
    return true;
}

// Fungsi untuk mengekstrak konteks dari query
function extractContextFromQuery(query, keyword) {
    // Hapus kata kunci dari query untuk mendapatkan konteks
    let context = query.toLowerCase().replace(keyword.toLowerCase(), '').trim();
    
    // Bersihkan dari kata-kata umum yang tidak relevan
    const commonWords = ["saya", "telah", "sudah", "akan", "ingin", "bisa", "dapat", "untuk", "dengan", "di", "ke", "pada"];
    context = context.split(' ').filter(word => !commonWords.includes(word)).join(' ');
    
    return context;
}

async function askQuestion() {
    rl.question("\n❓ Pertanyaan kamu (ketik 'keluar' untuk berhenti): ", async (query) => {
        // Validasi input
        if (!query.trim()) {
            console.log("Silakan masukkan pertanyaan yang valid.");
            return askQuestion();
        }
        
        // Perintah untuk keluar
        if (query.toLowerCase() === 'keluar' || query.toLowerCase() === 'exit') {
            console.log("Terima kasih telah menggunakan layanan ini. Sampai jumpa!");
            rl.close();
            return;
        }
        
        try {
            // Deteksi kata kunci ambigu
            let foundKeyword = null;
            for (const keyword of ambiguousKeywords) {
                if (query.toLowerCase().includes(keyword.toLowerCase())) {
                    foundKeyword = keyword;
                    break;
                }
            }
            
            let searchQuery = query;
            let contextInfo = "";
            
            if (foundKeyword) {
                console.log(`\n🔍 Mendeteksi kata kunci: ${foundKeyword}. Mencari informasi spesifik...`);
                
                // Ekstrak konteks dari query
                const context = extractContextFromQuery(query, foundKeyword);
                
                if (context) {
                    // Gunakan kombinasi kata kunci dan konteks untuk pencarian
                    searchQuery = `${foundKeyword} ${context}`;
                    contextInfo = ` tentang ${context}`;
                } else {
                    // Jika tidak ada konteks, gunakan hanya kata kunci
                    searchQuery = foundKeyword;
                }
                
                console.log(`Mencari informasi keterlambatan${contextInfo}...`);
            }
            
            // Batasi jumlah hasil pencarian untuk menghemat memori
            const results = await vectorStore.similaritySearchWithScore(searchQuery, 15);
            const filteredResults = results.filter(([doc, score]) => score > 0.5);
            
            // Perbaikan: Tambahkan pengecekan jika tidak ada hasil
            if (filteredResults.length === 0) {
                // Coba pencarian alternatif dengan hanya kata kunci
                if (foundKeyword && searchQuery !== foundKeyword) {
                    console.log("Tidak ditemukan hasil spesifik, mencoba dengan kata kunci umum...");
                    const altResults = await vectorStore.similaritySearchWithScore(foundKeyword, 15);
                    const altFilteredResults = altResults.filter(([doc, score]) => score > 0.5);
                    
                    if (altFilteredResults.length > 0) {
                        // Gunakan hasil alternatif
                        const context = altFilteredResults.map(([doc]) => doc.pageContent).join("\n---\n");
                        
                        const systemPrompt = `ANDA ADALAH ASISTEN YANG JAWAB HANYA BERDASARKAN DOKUMEN.
                        
                        INSTRUKSI:
                        1. Baca konteks dengan teliti
                        2. Jawab pertanyaan hanya menggunakan informasi dari konteks
                        3. Jangan tambahkan informasi di luar dokumen
                        4. Jangan berikan opini pribadi
                        5. Gunakan bahasa Indonesia yang formal dan jelas
                        6. Jawablah dengan kalimat yang singkat dan tidak terkesan aneh jika dibaca orang
                        7. Jangan ada penjelasan berulang
                        8. Hindari stereotip berdasarkan gender, suku, agama, atau daerah
                        9. Fokus pada informasi tentang ${foundKeyword} yang ada di konteks
                        
                        KONTEKS:
                        ${context}
                        
                        PERTANYAAN: ${query}
                        
                        JAWABAN:`;
                        
                        const answer = await llm.invoke(systemPrompt);
                        
                        if (!checkBias(answer)) {
                            console.log("\n🤖 Jawaban AI (setelah penyesuaian bias):");
                            const neutralAnswer = "Maaf, saya tidak dapat memberikan jawaban yang mungkin mengandung bias. Silakan ajukan pertanyaan dengan cara yang lebih netral.";
                            console.log(neutralAnswer);
                        } else {
                            const adjusted = adjustAnswer(answer, query, context);
                            console.log("\n🤖 Jawaban AI:");
                            console.log(adjusted);
                        }
                        
                        askQuestion();
                        return;
                    }
                }
                
                console.log("Maaf, tidak ditemukan informasi relevan dalam dokumen untuk pertanyaan Anda.");
                return askQuestion();
            }
            
            const context = filteredResults.map(([doc]) => doc.pageContent).join("\n---\n");
            
            // Modifikasi prompt untuk kasus kata kunci ambigu
            let systemPrompt = `ANDA ADALAH ASISTEN YANG JAWAB HANYA BERDASARKAN DOKUMEN.
            
            INSTRUKSI:
            1. Baca konteks dengan teliti
            2. Jawab pertanyaan hanya menggunakan informasi dari konteks
            3. Jangan tambahkan informasi di luar dokumen
            4. Jangan berikan opini pribadi
            5. Gunakan bahasa Indonesia yang formal dan jelas
            6. Jawablah dengan kalimat yang singkat dan tidak terkesan aneh jika dibaca orang
            7. Jangan ada penjelasan berulang
            8. Hindari stereotip berdasarkan gender, suku, agama, atau daerah`;
            
            // Tambahkan instruksi khusus jika ada kata kunci ambigu
            if (foundKeyword) {
                systemPrompt += `
            9. Fokus pada informasi tentang ${foundKeyword}${contextInfo} yang ada di konteks
            10. Berikan jawaban spesifik tentang ${foundKeyword}${contextInfo} sesuai konteks`;
            }
            
            systemPrompt += `
            
            KONTEKS:
            ${context}
            
            PERTANYAAN: ${query}
            
            JAWABAN:`;
            
            const answer = await llm.invoke(systemPrompt);
            
            // Perbaikan: Gunakan fungsi checkBias
            if (!checkBias(answer)) {
                console.log("\n🤖 Jawaban AI (setelah penyesuaian bias):");
                // Jika bias terdeteksi, berikan jawaban netral
                const neutralAnswer = "Maaf, saya tidak dapat memberikan jawaban yang mungkin mengandung bias. Silakan ajukan pertanyaan dengan cara yang lebih netral.";
                console.log(neutralAnswer);
            } else {
                const adjusted = adjustAnswer(answer, query, context);
                console.log("\n🤖 Jawaban AI:");
                console.log(adjusted);
            }
        } catch (error) {
            console.error("\n❌ Terjadi kesalahan:", error.message);
            // Perbaikan: Tambahkan opsi untuk keluar saat error
            rl.question("\nApakah Anda ingin melanjutkan? (y/n): ", (answer) => {
                if (answer.toLowerCase() !== 'y') {
                    console.log("Terima kasih telah menggunakan layanan ini.");
                    rl.close();
                    return;
                }
                askQuestion();
            });
            return; // Jangan lanjut ke askQuestion() di sini
        }
        
        askQuestion();
    });
}

console.log("Hei apakah ada yang bisa saya bantu?");
askQuestion();