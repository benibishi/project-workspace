
import { jsPDF } from 'jspdf';
import { ProjectState, InspectionStatus } from '../types';

export const generatePDFReport = (project: ProjectState) => {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();
  let yPos = 20;

  // Title
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59);
  doc.text('FrameCheck Canvas Report', 105, yPos, { align: 'center' });
  yPos += 10;
  
  doc.setFontSize(12);
  doc.text(`Project: ${project.name}`, 105, yPos, { align: 'center' });
  yPos += 7;
  doc.text(`Generated: ${timestamp}`, 105, yPos, { align: 'center' });
  yPos += 15;

  // Iterate Levels (Now dynamic from project.levels)
  project.levels.forEach((level) => {
    // Check if there are any failures on this level
    const levelData = project.levelData[level] || {};
    const categoriesWithFails = Object.entries(levelData).filter(([_, items]) => 
      items.some(i => i.status === InspectionStatus.FAIL)
    );

    if (categoriesWithFails.length > 0) {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      
      // Level Header
      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235);
      doc.text(level.toUpperCase(), 15, yPos);
      yPos += 10;

      categoriesWithFails.forEach(([catId, items]) => {
        const category = project.categories.find(c => c.id === catId);
        doc.setFontSize(14);
        doc.setTextColor(51, 65, 85);
        doc.text(`Category: ${category?.name || 'Unknown'}`, 20, yPos);
        yPos += 8;

        items.filter(i => i.status === InspectionStatus.FAIL).forEach((item) => {
          if (yPos > 250) { doc.addPage(); yPos = 20; }

          // Round Color Logic
          if (item.round >= 2) {
            doc.setTextColor(220, 38, 38); // Red
            doc.setFont('helvetica', 'bold');
          } else {
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
          }

          doc.setFontSize(12);
          doc.text(`• ${item.name} - Round ${item.round}`, 25, yPos);
          yPos += 6;

          doc.setFont('helvetica', 'italic');
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139);
          
          // Handle Multiline Notes
          const notesText = item.notes || 'No notes';
          const splitNotes = doc.splitTextToSize(`Notes: ${notesText}`, 160);
          doc.text(splitNotes, 30, yPos);
          
          // Increment yPos based on number of lines
          yPos += (splitNotes.length * 5) + 3;

          // Photos
          if (item.photos.length > 0) {
            item.photos.forEach((photo) => {
              if (yPos > 220) { doc.addPage(); yPos = 20; }
              try {
                // Approximate sizing for images
                doc.addImage(photo.url, 'JPEG', 30, yPos, 80, 60);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.text(photo.label, 30, yPos + 65);
                yPos += 75;
              } catch (e) {
                console.error("PDF Image add failed", e);
              }
            });
          }

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
        });
        yPos += 5;
      });
    }
  });

  doc.save(`FrameCheck_Report_${project.name.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
};
