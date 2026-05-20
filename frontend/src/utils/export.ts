import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import type { Question } from '../types';

function formatAnswers(q: Question): string {
  if (q.type === 'open') return '—';
  if (!q.options?.length) return '—';
  return q.correctAnswers
    .map((i) => `${String.fromCharCode(65 + i)}. ${q.options![i]}`)
    .join('; ');
}

export function exportJson(questions: Question[], filename = 'test.json') {
  const blob = new Blob([JSON.stringify({ questions }, null, 2)], {
    type: 'application/json',
  });
  saveAs(blob, filename);
}

export function exportPdf(questions: Question[], title = 'Test') {
  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(16);
  doc.text(title, 14, y);
  y += 12;
  doc.setFontSize(11);

  questions.forEach((q, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    const qText = `${idx + 1}. ${q.question}`;
    const lines = doc.splitTextToSize(qText, 180);
    doc.text(lines, 14, y);
    y += lines.length * 6 + 2;

    if (q.options) {
      q.options.forEach((opt, oi) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(`${String.fromCharCode(65 + oi)}. ${opt}`, 20, y);
        y += 6;
      });
    }
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFont(undefined, 'bold');
    doc.text(`Answer: ${formatAnswers(q)}`, 14, y);
    doc.setFont(undefined, 'normal');
    y += 10;
  });

  doc.save('test.pdf');
}

export async function exportDocx(questions: Question[], title = 'Test') {
  const children: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
    }),
  ];

  questions.forEach((q, idx) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${idx + 1}. ${q.question}`, bold: true }),
        ],
        spacing: { before: 240, after: 120 },
      }),
    );
    if (q.options) {
      q.options.forEach((opt, oi) => {
        children.push(
          new Paragraph({
            text: `${String.fromCharCode(65 + oi)}. ${opt}`,
            indent: { left: 360 },
          }),
        );
      });
    }
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Answer: ${formatAnswers(q)}`, italics: true }),
        ],
        spacing: { after: 200 },
      }),
    );
  });

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'test.docx');
}
