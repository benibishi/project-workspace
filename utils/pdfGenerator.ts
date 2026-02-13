
import { jsPDF } from 'jspdf';
import { ProjectState, InspectionStatus, Category, ItemResult } from '../types';

// PDF Design Constants
const STYLES = {
  colors: {
    primary: [26, 31, 255] as [number, number, number], // brand-600
    danger: [220, 38, 38] as [number, number, number],
    text: [30, 41, 59] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
    border: [226, 232, 240] as [number, number, number],
  },
  spacing: {
    margin: 20,
    pageBottom: 270,
    itemIndent: 10,
  }
};

/**
 * Main function to generate the professional inspection report
 */
export const generatePDFReport = (project: ProjectState) => {
  const doc = new jsPDF();
  let state = { yPos: STYLES.spacing.margin, pageCount: 1 };

  // 1. Render Cover/Header
  renderHeader(doc, project, state);

  // 2. Iterate Levels
  project.levels.forEach((levelName) => {
    const levelData = project.levelData[levelName] || {};
    const categories = project.levelCategories[levelName] || [];
    
    // Only include categories that actually have failed items
    const failedCategories = categories.filter(cat => 
      (levelData[cat.id] || []).some(item => item.status === InspectionStatus.FAIL)
    );

    if (failedCategories.length > 0) {
      checkPageSpace(doc, state, 30);
      renderLevelHeader(doc, levelName, state);

      failedCategories.forEach(category => {
        const items = levelData[category.id].filter(i => i.status === InspectionStatus.FAIL);
        renderCategorySection(doc, category, items, state);
      });
    }
  });

  // 3. Add Footer (Total Deficiencies)
  renderFinalSummary(doc, project, state);

  doc.save(`FrameCheck_${project.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};

// --- HELPER RENDERERS ---

const checkPageSpace = (doc: jsPDF, state: { yPos: number, pageCount: number }, needed: number) => {
  if (state.yPos + needed > STYLES.spacing.pageBottom) {
    doc.addPage();
    state.yPos = STYLES.spacing.margin;
    state.pageCount++;
    renderPageNumber(doc, state.pageCount);
  }
};

const renderPageNumber = (doc: jsPDF, page: number) => {
  doc.setFontSize(8);
  doc.setTextColor(...STYLES.colors.muted);
  doc.text(`Page ${page}`, 105, 285, { align: 'center' });
};

const renderHeader = (doc: jsPDF, project: ProjectState, state: { yPos: number }) => {
  const timestamp = new Date().toLocaleString();
  
  // App Identity
  doc.setFillColor(...STYLES.colors.primary);
  doc.roundedRect(STYLES.spacing.margin, state.yPos, 10, 10, 2, 2, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...STYLES.colors.primary);
  doc.text('FRAMECHECK PRO', STYLES.spacing.margin + 13, state.yPos + 7);

  state.yPos += 15;

  // Title
  doc.setFontSize(26);
  doc.setTextColor(...STYLES.colors.text);
  doc.text('Field Inspection Report', STYLES.spacing.margin, state.yPos);
  
  state.yPos += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...STYLES.colors.muted);
  doc.text(`Project: ${project.name}`, STYLES.spacing.margin, state.yPos);
  
  doc.text(`Generated: ${timestamp}`, 190, state.yPos, { align: 'right' });
  
  state.yPos += 5;
  doc.setDrawColor(...STYLES.colors.border);
  doc.line(STYLES.spacing.margin, state.yPos, 190, state.yPos);
  
  state.yPos += 15;
};

const renderLevelHeader = (doc: jsPDF, levelName: string, state: { yPos: number }) => {
  doc.setFillColor(248, 250, 252); // bg-slate-50
  doc.rect(STYLES.spacing.margin, state.yPos, 170, 10, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...STYLES.colors.primary);
  doc.text(levelName.toUpperCase(), STYLES.spacing.margin + 5, state.yPos + 7);
  
  state.yPos += 18;
};

const renderCategorySection = (doc: jsPDF, category: Category, items: ItemResult[], state: { yPos: number, pageCount: number }) => {
  checkPageSpace(doc, state, 15);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...STYLES.colors.text);
  doc.text(`Category: ${category.name}`, STYLES.spacing.margin, state.yPos);
  
  state.yPos += 8;

  items.forEach(item => {
    renderItemDetail(doc, item, state);
  });
};

const renderItemDetail = (doc: jsPDF, item: ItemResult, state: { yPos: number, pageCount: number }) => {
  checkPageSpace(doc, state, 20);

  // Round Indicator
  const isEscalated = item.round >= 3;
  if (isEscalated) {
    doc.setTextColor(...STYLES.colors.danger);
    doc.setFont('helvetica', 'bold');
  } else {
    doc.setTextColor(...STYLES.colors.text);
    doc.setFont('helvetica', 'bold');
  }

  doc.setFontSize(11);
  doc.text(`• ${item.name}`, STYLES.spacing.margin + 5, state.yPos);
  
  const roundText = `Round ${item.round}`;
  const roundX = 190 - doc.getTextWidth(roundText);
  doc.text(roundText, roundX, state.yPos);

  state.yPos += 6;

  // Notes
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...STYLES.colors.muted);
  
  const notes = item.notes || 'No specific deficiency notes provided.';
  const splitNotes = doc.splitTextToSize(notes, 160);
  doc.text(splitNotes, STYLES.spacing.margin + 10, state.yPos);
  
  state.yPos += (splitNotes.length * 5) + 5;

  // Photos (Two per row)
  if (item.photos.length > 0) {
    const imgWidth = 75;
    const imgHeight = 55;
    let currentX = STYLES.spacing.margin + 10;

    item.photos.forEach((photo, index) => {
      // If adding another photo would exceed vertical space
      if (state.yPos + imgHeight + 10 > STYLES.spacing.pageBottom) {
        doc.addPage();
        state.yPos = STYLES.spacing.margin;
        state.pageCount++;
        renderPageNumber(doc, state.pageCount);
      }

      try {
        doc.addImage(photo.url, 'JPEG', currentX, state.yPos, imgWidth, imgHeight);
        
        // Photo label
        doc.setFontSize(7);
        doc.setTextColor(...STYLES.colors.muted);
        doc.text(photo.label, currentX, state.yPos + imgHeight + 4, { maxWidth: imgWidth });
        
        // Grid logic: move to next column or next row
        if ((index + 1) % 2 === 0 || index === item.photos.length - 1) {
          state.yPos += imgHeight + 12;
          currentX = STYLES.spacing.margin + 10;
        } else {
          currentX += imgWidth + 10;
        }
      } catch (e) {
        console.error("PDF Image add failed", e);
      }
    });
  }

  state.yPos += 5;
};

const renderFinalSummary = (doc: jsPDF, project: ProjectState, state: { yPos: number, pageCount: number }) => {
  let totalFails = 0;
  Object.values(project.levelData).forEach(level => {
    Object.values(level).forEach(items => {
      totalFails += items.filter(i => i.status === InspectionStatus.FAIL).length;
    });
  });

  checkPageSpace(doc, state, 30);
  
  state.yPos += 10;
  doc.setDrawColor(...STYLES.colors.border);
  doc.line(STYLES.spacing.margin, state.yPos, 190, state.yPos);
  state.yPos += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...STYLES.colors.text);
  doc.text('Summary of Deficiencies', STYLES.spacing.margin, state.yPos);
  
  doc.setFontSize(20);
  const color = totalFails > 0 ? STYLES.colors.danger : [34, 197, 94] as [number, number, number];
  doc.setTextColor(...color);
  doc.text(`${totalFails}`, 190, state.yPos + 1, { align: 'right' });
  
  doc.setFontSize(8);
  doc.setTextColor(...STYLES.colors.muted);
  doc.text('Total issues remaining', 190, state.yPos + 6, { align: 'right' });
  
  renderPageNumber(doc, state.pageCount);
};
