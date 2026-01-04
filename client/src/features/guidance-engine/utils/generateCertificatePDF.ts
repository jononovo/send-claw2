function formatCredentialId(userId?: string): string {
  const paddedId = (userId || "0").padStart(6, "0");
  return `${paddedId}-PE021`;
}

export async function generateCertificatePDF(
  recipientName: string,
  completionDate: string,
  userId?: string
): Promise<Uint8Array> {
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  
  const width = 842;
  const height = 595;
  const page = pdfDoc.addPage([width, height]);

  const darkBg = rgb(0.05, 0.05, 0.08);
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: darkBg,
  });

  const amberColor = rgb(0.96, 0.72, 0.15);
  const amberLight = rgb(0.99, 0.82, 0.4);
  const goldColor = rgb(0.85, 0.65, 0.13);
  const grayText = rgb(0.6, 0.6, 0.65);
  const whiteText = rgb(0.95, 0.95, 0.95);

  const borderWidth = 3;
  page.drawRectangle({
    x: borderWidth / 2,
    y: borderWidth / 2,
    width: width - borderWidth,
    height: height - borderWidth,
    borderColor: amberColor,
    borderWidth: borderWidth,
    opacity: 0.5,
  });

  const cornerSize = 40;
  const cornerOffset = 20;
  const cornerWidth = 4;

  page.drawLine({
    start: { x: cornerOffset, y: height - cornerOffset },
    end: { x: cornerOffset, y: height - cornerOffset - cornerSize },
    thickness: cornerWidth,
    color: amberColor,
    opacity: 0.6,
  });
  page.drawLine({
    start: { x: cornerOffset, y: height - cornerOffset },
    end: { x: cornerOffset + cornerSize, y: height - cornerOffset },
    thickness: cornerWidth,
    color: amberColor,
    opacity: 0.6,
  });

  page.drawLine({
    start: { x: width - cornerOffset, y: height - cornerOffset },
    end: { x: width - cornerOffset, y: height - cornerOffset - cornerSize },
    thickness: cornerWidth,
    color: amberColor,
    opacity: 0.6,
  });
  page.drawLine({
    start: { x: width - cornerOffset, y: height - cornerOffset },
    end: { x: width - cornerOffset - cornerSize, y: height - cornerOffset },
    thickness: cornerWidth,
    color: amberColor,
    opacity: 0.6,
  });

  page.drawLine({
    start: { x: cornerOffset, y: cornerOffset },
    end: { x: cornerOffset, y: cornerOffset + cornerSize },
    thickness: cornerWidth,
    color: amberColor,
    opacity: 0.6,
  });
  page.drawLine({
    start: { x: cornerOffset, y: cornerOffset },
    end: { x: cornerOffset + cornerSize, y: cornerOffset },
    thickness: cornerWidth,
    color: amberColor,
    opacity: 0.6,
  });

  page.drawLine({
    start: { x: width - cornerOffset, y: cornerOffset },
    end: { x: width - cornerOffset, y: cornerOffset + cornerSize },
    thickness: cornerWidth,
    color: amberColor,
    opacity: 0.6,
  });
  page.drawLine({
    start: { x: width - cornerOffset, y: cornerOffset },
    end: { x: width - cornerOffset - cornerSize, y: cornerOffset },
    thickness: cornerWidth,
    color: amberColor,
    opacity: 0.6,
  });

  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const awardY = height - 120;
  page.drawCircle({
    x: width / 2,
    y: awardY,
    size: 35,
    color: goldColor,
  });
  page.drawCircle({
    x: width / 2,
    y: awardY,
    size: 28,
    color: amberColor,
  });

  const programText = "5DUCKS GTM MASTERY PROGRAM";
  const programWidth = helvetica.widthOfTextAtSize(programText, 12);
  page.drawText(programText, {
    x: (width - programWidth) / 2,
    y: height - 175,
    size: 12,
    font: helvetica,
    color: amberLight,
  });

  const certNameText = "Prospecting & Email Campaigns";
  const certNameWidth = helveticaBold.widthOfTextAtSize(certNameText, 28);
  page.drawText(certNameText, {
    x: (width - certNameWidth) / 2,
    y: height - 215,
    size: 28,
    font: helveticaBold,
    color: whiteText,
  });

  const certifiesText = "This certifies that";
  const certifiesWidth = helvetica.widthOfTextAtSize(certifiesText, 14);
  page.drawText(certifiesText, {
    x: (width - certifiesWidth) / 2,
    y: height - 280,
    size: 14,
    font: helvetica,
    color: grayText,
  });

  const nameWidth = helveticaBold.widthOfTextAtSize(recipientName, 40);
  page.drawText(recipientName, {
    x: (width - nameWidth) / 2,
    y: height - 330,
    size: 40,
    font: helveticaBold,
    color: amberLight,
  });

  const descText = "has successfully completed all quests and demonstrated proficiency";
  const descWidth = helvetica.widthOfTextAtSize(descText, 10);
  page.drawText(descText, {
    x: (width - descWidth) / 2,
    y: height - 375,
    size: 10,
    font: helvetica,
    color: grayText,
  });

  const descText2 = "in B2B prospecting and email campaign management";
  const desc2Width = helvetica.widthOfTextAtSize(descText2, 10);
  page.drawText(descText2, {
    x: (width - desc2Width) / 2,
    y: height - 392,
    size: 10,
    font: helvetica,
    color: grayText,
  });

  // Signature (scrawled style)
  const darkInk = rgb(0.15, 0.15, 0.15);
  const signatureName = "Jm~rrsn";
  const signatureWidth = timesItalic.widthOfTextAtSize(signatureName, 24);
  page.drawText(signatureName, {
    x: (width - signatureWidth) / 2,
    y: height - 435,
    size: 24,
    font: timesItalic,
    color: darkInk,
  });

  // Signature line
  const sigLineY = height - 455;
  const sigLineWidth = 180;
  page.drawLine({
    start: { x: (width - sigLineWidth) / 2, y: sigLineY },
    end: { x: (width + sigLineWidth) / 2, y: sigLineY },
    thickness: 1,
    color: grayText,
    opacity: 0.6,
  });

  const sigTitle = "Director of GTM Programs";
  const sigTitleWidth = helvetica.widthOfTextAtSize(sigTitle, 10);
  page.drawText(sigTitle, {
    x: (width - sigTitleWidth) / 2,
    y: sigLineY - 15,
    size: 10,
    font: helvetica,
    color: grayText,
  });

  // Date below signature
  const dateWidth = helvetica.widthOfTextAtSize(completionDate, 10);
  page.drawText(completionDate, {
    x: (width - dateWidth) / 2,
    y: sigLineY - 30,
    size: 10,
    font: helvetica,
    color: grayText,
  });

  // Footer: copyright on left, credential ID on right
  const copyrightText = "© 5Ducks 2025, 10005 NY, USA";
  page.drawText(copyrightText, {
    x: 30,
    y: 12,
    size: 7,
    font: helvetica,
    color: grayText,
  });

  const credentialText = formatCredentialId(userId);
  const credentialWidth = helvetica.widthOfTextAtSize(credentialText, 7);
  page.drawText(credentialText, {
    x: width - 30 - credentialWidth,
    y: 12,
    size: 7,
    font: helvetica,
    color: grayText,
  });

  return pdfDoc.save();
}
