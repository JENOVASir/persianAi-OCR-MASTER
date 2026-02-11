import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType, 
  Math as DocxMath, 
  MathRun, 
  MathFraction, 
  MathRadical, 
  MathSuperScript, 
  MathSubScript,
  BorderStyle,
  ShadingType
} from "docx";
import saveAs from "file-saver";
import { FileItem } from "../types";

// --- ARCHITECTURE: Text OCR -> Paragraph | Math OCR -> LaTeX -> Sanitizer -> Word Equation (OMML) ---

const SYMBOL_MAP: Record<string, string> = {
  // Greek
  "alpha": "α", "beta": "β", "gamma": "γ", "delta": "δ", "epsilon": "ε", "zeta": "ζ",
  "eta": "η", "theta": "θ", "iota": "ι", "kappa": "κ", "lambda": "λ", "mu": "μ",
  "nu": "ν", "xi": "ξ", "omicron": "ο", "pi": "π", "rho": "ρ", "sigma": "σ",
  "tau": "τ", "upsilon": "υ", "phi": "φ", "chi": "χ", "psi": "ψ", "omega": "ω",
  "Delta": "Δ", "Gamma": "Γ", "Theta": "Θ", "Lambda": "Λ", "Xi": "Ξ", "Pi": "Π",
  "Sigma": "Σ", "Phi": "Φ", "Psi": "Ψ", "Omega": "Ω",
  // Operators
  "times": "×", "div": "÷", "pm": "±", "mp": "∓", "cdot": "⋅", "ast": "∗",
  "leq": "≤", "geq": "≥", "neq": "≠", "approx": "≈", "equiv": "≡", "propto": "∝",
  "infty": "∞", "forall": "∀", "exists": "∃", "partial": "∂", "nabla": "∇",
  "in": "∈", "notin": "∉", "subset": "⊂", "supset": "⊃", "cup": "∪", "cap": "∩",
  "rightarrow": "→", "leftarrow": "←", "Rightarrow": "⇒", "Leftarrow": "⇐",
  "sum": "∑", "prod": "∏", "int": "∫"
};

const sanitizeLatex = (latex: string): string => {
  let clean = latex;
  clean = clean.replace(/\\begin\{aligned\}/g, '').replace(/\\end\{aligned\}/g, '');
  clean = clean.replace(/\\begin\{split\}/g, '').replace(/\\end\{split\}/g, '');
  clean = clean.replace(/\\begin\{equation\}/g, '').replace(/\\end\{equation\}/g, '');
  clean = clean.replace(/\\text\{([^}]+)\}/g, '$1'); // Unwrap simple text
  clean = clean.replace(/&/g, ' ');
  clean = clean.replace(/\\\\/g, ' ');
  return clean.trim();
};

/**
 * Advanced Recursive Descent Parser for LaTeX to Docx Math
 */
const parseLatexToDocxMath = (latex: string): any[] => {
  const children: any[] = [];
  let i = 0;

  const readGroup = (): any[] => {
    let groupContent = "";
    let depth = 0;
    
    // Skip initial { if present (sometimes implicit)
    if (latex[i] === '{') i++;

    while (i < latex.length) {
      const char = latex[i];
      if (char === '{') depth++;
      if (char === '}') {
        if (depth === 0) {
          i++; // Consume closing }
          break;
        }
        depth--;
      }
      groupContent += char;
      i++;
    }
    return parseLatexToDocxMath(groupContent);
  };

  while (i < latex.length) {
    const char = latex[i];

    // --- Commands ---
    if (char === '\\') {
      i++;
      let command = "";
      while (i < latex.length && /[a-zA-Z]/.test(latex[i])) {
        command += latex[i];
        i++;
      }

      // Brackets/Delimiters logic (\left( ... \right))
      if (command === "left") {
        // Skip whitespace
        while(i < latex.length && /\s/.test(latex[i])) i++;
        const openChar = latex[i++]; // e.g. '(' or '['
        
        // Find matching right. This is a simple implementation that assumes balanced structure in valid latex
        // We need to extract the content between \left. and \right.
        let contentStr = "";
        let balance = 1;
        let j = i;
        
        // Look ahead for \right
        while (j < latex.length) {
            if (latex.substring(j).startsWith("\\left")) balance++;
            if (latex.substring(j).startsWith("\\right")) {
                balance--;
                if (balance === 0) break;
            }
            j++;
        }
        
        contentStr = latex.substring(i, j);
        i = j; // Move i to \right position

        // Consume \right
        if (latex.substring(i).startsWith("\\right")) {
            i += 6; // length of \right
            while(i < latex.length && /\s/.test(latex[i])) i++;
            const closeChar = latex[i++] || ')'; // consume closing char

            // Fallback: Just add text runs for brackets and content
            // MathDelimiter is not exported in some versions of docx
            children.push(new MathRun(openChar === '{' ? '{' : openChar));
            children.push(...parseLatexToDocxMath(contentStr));
            children.push(new MathRun(closeChar === '}' ? '}' : closeChar));
        }
        continue;
      }

      // Basic Structures
      if (command === "frac") {
        const numerator = readGroup();
        const denominator = readGroup();
        children.push(new MathFraction({ numerator, denominator }));
      } 
      else if (command === "sqrt") {
        let degree = []; 
        if (latex[i] === '[') {
            i++;
            let degStr = "";
            while(i < latex.length && latex[i] !== ']') degStr += latex[i++];
            if(i < latex.length) i++;
            degree = [new MathRun(degStr)];
        }
        const content = readGroup();
        children.push(new MathRadical({ degree, content }));
      }
      // Functions
      else if (["sin", "cos", "tan", "log", "ln", "lim", "min", "max"].includes(command)) {
          // MathFunction not exported? Fallback to MathRun
          children.push(new MathRun(command));
      }
      // Symbols
      else if (SYMBOL_MAP[command]) {
        children.push(new MathRun(SYMBOL_MAP[command]));
      }
      // Spaces
      else if (command === "," || command === ";" || command === "quad") {
         children.push(new MathRun(" ")); 
      }
      // Formatting (ignore but process content)
      else if (command === "mathbf" || command === "mathrm" || command === "textit") {
          children.push(...readGroup());
      }
      else {
        // Unknown or just a char escape (e.g. \%)
        if (!command && i < latex.length) {
           // It was a single char symbol like \{
           // handled by loop re-entry or assume symbol
        } else {
           // fallback
           // If it's something like \limits, ignore
           if (command !== "limits") {
             // Treat as variable if unknown
           }
        }
      }
      continue;
    }

    // --- Superscript / Subscript ---
    if (char === '^' || char === '_') {
      const isSuper = char === '^';
      i++;
      const lastChild = children.pop();
      const scriptContent = latex[i] === '{' ? readGroup() : [new MathRun(latex[i++])];
      
      const safeBase = lastChild ? [lastChild] : [new MathRun("")];
      
      if (isSuper) {
        children.push(new MathSuperScript({ children: safeBase, superScript: scriptContent }));
      } else {
        children.push(new MathSubScript({ children: safeBase, subScript: scriptContent }));
      }
      continue;
    }

    // --- Grouping ---
    if (char === '{') {
      children.push(...readGroup());
      continue;
    }

    // --- Whitespace ---
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // --- Literals ---
    // Handle operators (+, -, =) specially if needed, but MathRun usually handles them
    children.push(new MathRun(char));
    i++;
  }

  return children;
};

const parseTextContent = (text: string): (TextRun | DocxMath)[] => {
  const regex = /\$([^$]+)\$/g; 
  const children: (TextRun | DocxMath)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      children.push(new TextRun({
          text: text.substring(lastIndex, match.index),
          rightToLeft: true,
          font: "Tahoma",
          size: 24, // 12pt
      }));
    }
    
    const rawLatex = match[1];
    if (rawLatex) {
       const clean = sanitizeLatex(rawLatex);
       try {
         const mathChildren = parseLatexToDocxMath(clean);
         children.push(new DocxMath({ children: mathChildren }));
       } catch (e) {
         children.push(new TextRun({ text: rawLatex, font: "Cambria Math" }));
       }
    }
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
     children.push(new TextRun({
         text: text.substring(lastIndex),
         rightToLeft: true,
         font: "Tahoma",
         size: 24,
     }));
  }
  return children;
};

export const generateDocx = async (item: FileItem) => {
  if (!item.result) return;
  const { result, file } = item;

  const docChildren: any[] = [];

  // --- 1. Document Header (Matching UI Style) ---
  docChildren.push(
    new Paragraph({
      text: "گزارش استخراج هوشمند",
      heading: HeadingLevel.HEADING_6, // Small label
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { after: 100 },
      run: { color: "06B6D4", font: "Tahoma", size: 18 } // Cyan-500 equivalent
    })
  );

  docChildren.push(
    new Paragraph({
      text: result.title || "بدون عنوان",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { after: 400 },
      border: { bottom: { color: "E2E8F0", space: 10, style: BorderStyle.SINGLE, size: 6 } }
    })
  );

  // --- 2. Content Segments ---
  for (const segment of result.segments) {
    
    // --- FORMULA ---
    if (segment.type === 'formula') {
      try {
        const cleanLatex = sanitizeLatex(segment.content);
        const mathChildren = parseLatexToDocxMath(cleanLatex);

        docChildren.push(
          new Paragraph({
            children: [
              new DocxMath({ children: mathChildren })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 300 },
            // Add a subtle border/background to mimic the "box" in UI?
            // Word formulas are usually clean. Let's keep it clean but spacious.
          })
        );
      } catch (e) {
        // Fallback for complex math that parser misses
        docChildren.push(new Paragraph({ 
            children: [new TextRun({ text: segment.content, font: "Cambria Math" })], 
            alignment: AlignmentType.CENTER 
        }));
      }
    } 
    
    // --- CHART DESCRIPTION (UI Match) ---
    else if (segment.type === 'chart_description') {
      // Create a "Box" look using Shading and Borders
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: "  تحلیل آماری نمودار", bold: true, color: "06B6D4", rightToLeft: true, font: "Tahoma", size: 22 }),
          ],
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          shading: { type: ShadingType.CLEAR, fill: "F0FDFA" }, // Very light cyan background (Cyber-ish but printable)
          spacing: { before: 200, after: 100 },
          border: { 
              left: { color: "06B6D4", space: 10, style: BorderStyle.THICK, size: 24 }, // Thick left border
              top: { color: "06B6D4", space: 1, style: BorderStyle.SINGLE, size: 2 },
              right: { color: "06B6D4", space: 1, style: BorderStyle.SINGLE, size: 2 },
          }
        })
      );
      
      docChildren.push(
        new Paragraph({
          children: [
             new TextRun({ text: segment.content, rightToLeft: true, font: "Tahoma", size: 22 })
          ],
          bidirectional: true,
          alignment: AlignmentType.BOTH, // Justified
          shading: { type: ShadingType.CLEAR, fill: "F0FDFA" }, // Same bg
          spacing: { after: 200 },
          indent: { left: 100, right: 100 },
          border: { 
              left: { color: "06B6D4", space: 10, style: BorderStyle.THICK, size: 24 },
              bottom: { color: "06B6D4", space: 1, style: BorderStyle.SINGLE, size: 2 },
              right: { color: "06B6D4", space: 1, style: BorderStyle.SINGLE, size: 2 },
          }
        })
      );
    } 
    
    // --- TEXT ---
    else {
      const lines = segment.content.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
           docChildren.push(
            new Paragraph({
              children: parseTextContent(line.trim()),
              bidirectional: true, 
              alignment: AlignmentType.BOTH, // Justify
              spacing: { after: 120, line: 360 } // 1.5 Line spacing
            })
          );
        }
      });
    }
  }

  // --- 3. Footer (Updated with Copyright) ---
  docChildren.push(
      new Paragraph({
          children: [
            new TextRun({ 
              text: "Developed by JENOVAS | GitHub: JENOVASir", 
              font: "Consolas", 
              size: 16,
              color: "64748B"
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 600 },
          border: { top: { color: "E2E8F0", space: 10, style: BorderStyle.SINGLE, size: 4 } }
      })
  );

  const doc = new Document({
    sections: [{
      properties: {},
      children: docChildren,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  saveAs(blob, `${originalName}_Analysis.docx`);
};