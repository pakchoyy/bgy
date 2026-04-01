const form = document.getElementById("generator-form");
const output = document.getElementById("output");
const copyBtn = document.getElementById("copy-btn");
const exportDocxBtn = document.getElementById("export-docx-btn");
const exportPdfBtn = document.getElementById("export-pdf-btn");
const printArea = document.getElementById("print-area");

const mcqTemplates = {
  Mudah: [
    {
      prompt: "Konsep dasar {topic} dalam pelajaran {subject} adalah ....",
      correct: "Karena {topic} menjadi landasan penting dalam {subject}.",
      distractors: [
        "{topic} bertentangan dengan fokus utama {subject}.",
        "{topic} hanya relevan untuk mata pelajaran lain.",
        "{topic} tidak dipakai dalam aktivitas nyata di {subject}."
      ]
    },
    {
      prompt: "Pernyataan yang paling tepat tentang {topic} adalah ....",
      correct: "Karena {topic} menjelaskan prinsip dasar yang sering digunakan.",
      distractors: [
        "Karena {topic} menjelaskan hal yang tidak pernah terjadi.",
        "Karena {topic} justru mencampur konsep yang berbeda.",
        "Karena {topic} hanya untuk konteks yang jauh dari {subject}."
      ]
    },
    {
      prompt: "Dalam konteks {subject}, {topic} digunakan untuk ....",
      correct: "Karena {topic} membantu memecahkan masalah sehari-hari di {subject}.",
      distractors: [
        "Karena {topic} malah memperumit pemahaman yang sederhana.",
        "Karena {topic} membuat prinsip {subject} menjadi tidak konsisten.",
        "Karena {topic} tidak pernah digunakan dalam contoh nyata."
      ]
    }
  ],
  Sedang: [
    {
      prompt: "Contoh penerapan {topic} dalam kehidupan sehari-hari adalah ....",
      correct: "Karena {topic} membantu peserta didik menerapkan konsep {subject}.",
      distractors: [
        "Karena {topic} hanya berlaku untuk situasi sangat teoritis.",
        "Karena {topic} bertentangan dengan aturan dasar {subject}.",
        "Karena {topic} tidak dihubungkan dengan fenomena nyata."
      ]
    },
    {
      prompt: "Jika dikaitkan dengan {subject}, tujuan mempelajari {topic} adalah ....",
      correct: "Karena {topic} memperkuat pemahaman konsep lanjutan.",
      distractors: [
        "Karena {topic} malah mengalihkan fokus dari tujuan utama.",
        "Karena {topic} hanya relevan di bidang selain {subject}.",
        "Karena {topic} tidak menawarkan struktur logis untuk materi."
      ]
    },
    {
      prompt: "Manakah pernyataan yang menggambarkan prinsip {topic} secara tepat?",
      correct: "Karena {topic} menunjukkan proses sistematis di {subject}.",
      distractors: [
        "Karena {topic} memperkenalkan proses yang tidak konsisten.",
        "Karena {topic} merupakan contoh yang tidak dapat diuji.",
        "Karena {topic} hanya berlaku pada hipotesis palsu."
      ]
    }
  ],
  Sulit: [
    {
      prompt: "Analisis paling tepat terkait hubungan {topic} dengan konsep lain pada {subject} adalah ....",
      correct: "Karena {topic} menyatukan konsep kompleks yang saling memperkuat.",
      distractors: [
        "Karena {topic} justru memecah hubungan logis tersebut.",
        "Karena {topic} mendefinisikan hubungan yang tidak pernah dipelajari.",
        "Karena {topic} terlalu sempit untuk menjembatani konsep lain."
      ]
    },
    {
      prompt: "Kesimpulan yang valid dari pembahasan {topic} dalam {subject} adalah ....",
      correct: "Karena {topic} menghasilkan pemahaman mendalam dan terukur.",
      distractors: [
        "Karena {topic} menawarkan kesimpulan yang tidak berdasar.",
        "Karena {topic} hanya menegaskan ulang asumsi tanpa bukti.",
        "Karena {topic} mengabaikan fakta yang diketahui."
      ]
    },
    {
      prompt: "Strategi penyelesaian masalah berbasis {topic} yang paling efektif adalah ....",
      correct: "Karena {topic} menyusun langkah sistematis untuk solusi.",
      distractors: [
        "Karena {topic} menyebabkan langkah yang tidak sistematis.",
        "Karena {topic} mengutamakan pendekatan trial-and-error tanpa logika.",
        "Karena {topic} hanya cocok untuk situasi yang tidak realistis."
      ]
    }
  ]
};

const essayTemplates = {
  Mudah: [
    "Jelaskan pengertian {topic} dalam mata pelajaran {subject}.",
    "Sebutkan 2 contoh sederhana dari {topic}.",
    "Mengapa {topic} penting untuk dipelajari?"
  ],
  Sedang: [
    "Uraikan langkah-langkah memahami {topic} secara runtut.",
    "Bandingkan {topic} dengan konsep lain yang relevan dalam {subject}.",
    "Jelaskan penerapan {topic} dalam situasi nyata."
  ],
  Sulit: [
    "Analisis dampak jika konsep {topic} tidak diterapkan dengan benar.",
    "Buat argumen kritis terkait kelebihan dan keterbatasan {topic}.",
    "Rancang solusi masalah kompleks menggunakan pendekatan {topic}."
  ]
};

let latestDoc = null;

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function shuffle(arr) {
  const clone = [...arr];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function fillTemplate(template, data) {
  return template
    .replaceAll("{topic}", data.topic)
    .replaceAll("{subject}", data.subject);
}

function pickTemplate(templates, usedSet) {
  const available = templates.filter((t) => !usedSet.has(t));
  const chosen = available.length ? available[randomInt(available.length)] : templates[randomInt(templates.length)];
  usedSet.add(chosen);
  return chosen;
}

function buildMCQOptions(template, data) {
  const correct = fillTemplate(template.correct, data);
  const distractors = template.distractors.map((d) => fillTemplate(d, data));
  const options = shuffle([correct, ...distractors]);
  const answerIndex = options.indexOf(correct);
  return {
    options,
    answer: String.fromCharCode(65 + answerIndex)
  };
}

function generateMCQ(data, count) {
  const questions = [];
  const used = new Set();

  for (let i = 0; i < count; i += 1) {
    const template = pickTemplate(mcqTemplates[data.difficulty], used);
    const questionText = fillTemplate(template.prompt, data);
    const { options, answer } = buildMCQOptions(template, data);
    questions.push({ number: i + 1, text: questionText, options, answer });
  }
  return questions;
}

function generateEssay(data, count) {
  const questions = [];
  const used = new Set();

  for (let i = 0; i < count; i += 1) {
    const template = pickTemplate(essayTemplates[data.difficulty], used);
    const questionText = fillTemplate(template, data);
    questions.push({ number: i + 1, text: questionText });
  }
  return questions;
}

function formatDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function toPlainOutput(docData) {
  const lines = [
    `${docData.examTitle}`,
    `${docData.schoolName}`,
    `Tahun Pelajaran ${docData.academicYear}`,
    "",
    `Mata Pelajaran: ${docData.subject}`,
    `Kelas / Semester: ${docData.classSemester}`,
    `Tanggal: ${docData.dateLabel}`,
    "",
    `I. ${docData.type}`,
    docData.type === "Pilihan Ganda"
      ? "Berilah tanda silang (X) pada huruf jawaban yang paling benar!"
      : "Jawablah pertanyaan berikut dengan jelas!",
    ""
  ];

  for (const q of docData.questions) {
    lines.push(`${q.number}. ${q.text}`);
    if (docData.type === "Pilihan Ganda") {
      lines.push(`A. ${q.options[0]}`);
      lines.push(`B. ${q.options[1]}`);
      lines.push(`C. ${q.options[2]}`);
      lines.push(`D. ${q.options[3]}`);
    }
    lines.push("");
  }

  if (docData.type === "Pilihan Ganda") {
    lines.push("KUNCI JAWABAN");
    for (const q of docData.questions) {
      lines.push(`${q.number}. ${q.answer}`);
    }
  }
  return lines.join("\n");
}

function renderPreview(docData) {
  const titleEl = printArea.querySelector(".doc-title");
  const schoolEl = printArea.querySelector(".doc-school");
  const yearEl = printArea.querySelector(".doc-year");
  const sectionTitleEl = printArea.querySelector(".section-title");
  const sectionNoteEl = printArea.querySelector(".section-note");
  const metaEl = printArea.querySelector(".meta-grid");

  titleEl.textContent = docData.examTitle;
  schoolEl.textContent = docData.schoolName;
  yearEl.textContent = `Tahun Pelajaran ${docData.academicYear}`;
  sectionTitleEl.textContent = `I. ${docData.type}`;
  sectionNoteEl.textContent = docData.type === "Pilihan Ganda"
    ? "Berilah tanda silang (X) pada huruf jawaban yang paling benar!"
    : "Jawablah pertanyaan berikut dengan jelas!";

  metaEl.innerHTML = [
    "<div>Mata Pelajaran</div>", `<div>: ${docData.subject}</div>`,
    "<div>Nama</div>", "<div>: ____________________</div>",
    "<div>Kelas / Semester</div>", `<div>: ${docData.classSemester}</div>`,
    "<div>No. Absen</div>", "<div>: ____________________</div>",
    "<div>Tanggal</div>", `<div>: ${docData.dateLabel}</div>`,
    "<div>Nilai</div>", "<div>: ____________________</div>"
  ].join("");

  output.textContent = toPlainOutput(docData);
}

function collectData() {
  const data = {
    schoolName: document.getElementById("school-name").value.trim(),
    examTitle: document.getElementById("exam-title").value.trim(),
    academicYear: document.getElementById("academic-year").value.trim(),
    subject: document.getElementById("subject").value.trim(),
    topic: document.getElementById("topic").value.trim(),
    difficulty: document.getElementById("difficulty").value,
    type: document.getElementById("question-type").value,
    count: Number(document.getElementById("count").value),
    classSemester: "2 / Ganjil",
    dateLabel: formatDate(new Date().toISOString())
  };
  return data;
}

function generateDocumentData() {
  const data = collectData();
  if (!data.topic) {
    output.textContent = "Topik harus diisi.";
    return null;
  }
  if (!data.schoolName || !data.examTitle || !data.academicYear) {
    output.textContent = "Nama sekolah, judul ujian, dan tahun pelajaran wajib diisi.";
    return null;
  }
  if (!Number.isInteger(data.count) || data.count < 1 || data.count > 20) {
    output.textContent = "Jumlah soal harus antara 1 sampai 20.";
    return null;
  }

  const questions = data.type === "Pilihan Ganda"
    ? generateMCQ(data, data.count)
    : generateEssay(data, data.count);

  return {
    ...data,
    questions
  };
}

async function exportDocx(docData) {
  if (!window.docx || !window.saveAs) {
    alert("Library DOCX belum termuat.");
    return;
  }

  const d = window.docx;
  const children = [
    new d.Paragraph({
      alignment: d.AlignmentType.CENTER,
      children: [new d.TextRun({ text: docData.examTitle, bold: true, size: 30 })]
    }),
    new d.Paragraph({
      alignment: d.AlignmentType.CENTER,
      children: [new d.TextRun({ text: docData.schoolName, bold: true, size: 38 })]
    }),
    new d.Paragraph({
      alignment: d.AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new d.TextRun({ text: `Tahun Pelajaran ${docData.academicYear}`, size: 24 })]
    }),
    new d.Paragraph({
      children: [
        new d.TextRun(`Mata Pelajaran : ${docData.subject}`),
        new d.TextRun({ text: "\t\tNama : ____________________" })
      ],
      tabStops: [{ type: d.TabStopType.LEFT, position: 6500 }]
    }),
    new d.Paragraph({
      children: [
        new d.TextRun(`Kelas / Semester : ${docData.classSemester}`),
        new d.TextRun({ text: "\t\tNo. Absen : ____________________" })
      ],
      tabStops: [{ type: d.TabStopType.LEFT, position: 6500 }]
    }),
    new d.Paragraph({
      spacing: { after: 200 },
      children: [
        new d.TextRun(`Tanggal : ${docData.dateLabel}`),
        new d.TextRun({ text: "\t\tNilai : ____________________" })
      ],
      tabStops: [{ type: d.TabStopType.LEFT, position: 6500 }]
    }),
    new d.Paragraph({
      spacing: { before: 200, after: 120 },
      children: [new d.TextRun({ text: `I. ${docData.type}`, bold: true, underline: {} })]
    }),
    new d.Paragraph({
      spacing: { after: 180 },
      children: [new d.TextRun({
        text: docData.type === "Pilihan Ganda"
          ? "Berilah tanda silang (X) pada huruf jawaban yang paling benar!"
          : "Jawablah pertanyaan berikut dengan jelas!",
        italics: true
      })]
    })
  ];

  for (const q of docData.questions) {
    children.push(new d.Paragraph({ spacing: { after: 80 }, text: `${q.number}. ${q.text}` }));
    if (docData.type === "Pilihan Ganda") {
      children.push(new d.Paragraph({ text: `A. ${q.options[0]}` }));
      children.push(new d.Paragraph({ text: `B. ${q.options[1]}` }));
      children.push(new d.Paragraph({ text: `C. ${q.options[2]}` }));
      children.push(new d.Paragraph({ spacing: { after: 120 }, text: `D. ${q.options[3]}` }));
    } else {
      children.push(new d.Paragraph({ spacing: { after: 220 }, text: "" }));
    }
  }

  if (docData.type === "Pilihan Ganda") {
    children.push(new d.Paragraph({ pageBreakBefore: true, text: "KUNCI JAWABAN", heading: d.HeadingLevel.HEADING_2 }));
    for (const q of docData.questions) {
      children.push(new d.Paragraph({ text: `${q.number}. ${q.answer}` }));
    }
  }

  const doc = new d.Document({
    sections: [{
      properties: {},
      children
    }]
  });

  const blob = await d.Packer.toBlob(doc);
  window.saveAs(blob, `Soal_${docData.subject.replaceAll(" ", "_")}.docx`);
}

async function exportPdf() {
  if (!window.html2pdf) {
    alert("Library PDF belum termuat.");
    return;
  }
  const options = {
    margin: [12, 12, 12, 12],
    filename: "Soal_Ulangan.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };
  await window.html2pdf().set(options).from(printArea).save();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const docData = generateDocumentData();
  if (!docData) {
    latestDoc = null;
    return;
  }
  latestDoc = docData;
  renderPreview(docData);
});

copyBtn.addEventListener("click", async () => {
  try {
    const text = latestDoc ? toPlainOutput(latestDoc) : output.textContent;
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = "Tersalin";
    setTimeout(() => {
      copyBtn.textContent = "Salin";
    }, 1200);
  } catch (error) {
    copyBtn.textContent = "Gagal";
    setTimeout(() => {
      copyBtn.textContent = "Salin";
    }, 1200);
  }
});

exportDocxBtn.addEventListener("click", async () => {
  if (!latestDoc) {
    const docData = generateDocumentData();
    if (!docData) {
      return;
    }
    latestDoc = docData;
    renderPreview(docData);
  }
  exportDocxBtn.textContent = "Proses";
  await exportDocx(latestDoc);
  exportDocxBtn.textContent = "DOCX";
});

exportPdfBtn.addEventListener("click", async () => {
  if (!latestDoc) {
    const docData = generateDocumentData();
    if (!docData) {
      return;
    }
    latestDoc = docData;
    renderPreview(docData);
  }
  exportPdfBtn.textContent = "Proses";
  await exportPdf();
  exportPdfBtn.textContent = "PDF";
});
