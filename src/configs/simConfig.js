const themeConfig = {
  // Ganti tema ini sesuai kebutuhan
  currentTheme: "SIM", 
  
  // Mapping path PDF untuk setiap tema
  pdfPaths: {
    "SIM": "./test/data/Syarat-Pembuatan-SIM.pdf"
  },
  
  // Data tambahan spesifik tema
  additionalData: [
    {
      content: `
      PERBEDAAN PENTING SIM A UMUM DAN SIM A PERSEORANGAN:
      
      1. USIA MINIMAL:
         - SIM A Umum: 20 tahun (sesuai Peraturan Pemerintah No. 74 Tahun 2014)
         - SIM A Perseorangan: 17 tahun (khusus untuk kendaraan pribadi non-komersial)
      
      2. KAPASITAS KENDARAAN:
         - SIM A Umum: Maksimal 9 penumpang
         - SIM A Perseorangan: Maksimal 7 penumpang
      
      3. PENGGUNAAN:
         - SIM A Umum: Boleh untuk komersial
         - SIM A Perseorangan: Hanya untuk pribadi, tidak boleh komersial
      
      4. PROSES PEMBUATAN:
         - SIM A Umum: Memerlukan tes psikologi khusus
         - SIM A Perseorangan: Proses standar tanpa tes tambahan
      `,
      metadata: { 
        source: "regulasi-sim-nasional",
        priority: "high" 
      }
    },
    // Informasi tentang SIM B1
    {
      content: `
      PERSYARATAN PEMBUATAN SIM B1:
      
      1. USIA MINIMAL:
         - SIM B1: Minimal 20 tahun
      
      2. PERSYARATAN KHUSUS:
         - Harus sudah memiliki SIM A minimal 1 tahun
         - Bagi pemegang SIM A Umum: Bisa langsung membuat SIM B1 setelah 1 tahun
         - Bagi pemegang SIM A Perseorangan: Perlu mengikuti tes tambahan
      
      3. FUNGSI SIM B1:
         - Untuk mengemudikan kendaraan bermotor dengan berat lebih dari 3.500 kg
         - Dapat digunakan untuk kendaraan penumpang umum atau barang
      `,
      metadata: { 
        source: "regulasi-sim-nasional",
        priority: "high" 
      }
    }
  ],
  
  keywords: {
    comparison: ["perbedaan", "beda", "dibandingkan", "sama"],
    entities: ["SIM A Umum", "SIM A Perseorangan", "SIM", "kendaraan", "SIM B1"],
    ageRelated: ["umur", "usia", "minimal"],
    simTypes: ["SIM A", "SIM B1", "SIM C", "SIM B2"]
  },
  
  answerAdjustments: {
    replacements: [
      { pattern: /teman/gi, replacement: "Anda" },
      { pattern: /Kebetulan orang itu/gi, replacement: "Anda" },
      { pattern: /berdasarkan dokumen/gi, replacement: "Menurut Informasi" },
      { pattern: /Menurut dokumen,/gi, replacement: "Menurut informasi yang tersedia" },
      { pattern: /Menurut dokumen yang diberikan,/gi, replacement: "" },
      { pattern: /Dokumen tersebut/gi, replacement: "Informasi yang tersedia" },
      { pattern: /(sayang)(.*)(sayang)/gi, replacement: "$1$2" },
      { pattern: /so, unfortunately/gi, replacement: "jadi" },
      { pattern: /let's break it down/gi, replacement: "mari kita bahas" },
      { pattern: /firstly/gi, replacement: "pertama" },
      { pattern: /secondly/gi, replacement: "kedua" }
    ],
    specialCases: [
      { 
        pattern: /bisa ngapain/gi, 
        replacement: "Saya bisa membantu anda dalam membuat SIM secara online",
        theme: "SIM" // Hanya berlaku untuk tema SIM
      },
      { 
        pattern: /terimakasih,thankyou,thanks/gi, 
        replacement: "Sama-sama senang sekali bisa membantu anda!",
        universal: true // Berlaku untuk semua tema
      }
    ]
  }
};

// Ekspor konfigurasi agar bisa digunakan di file lain
export default themeConfig;