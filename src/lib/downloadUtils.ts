import React from 'react';
import { toPng } from 'html-to-image';

/**
 * Captures a DOM element and downloads it as a PNG image.
 * @param ref The React ref of the element to capture.
 * @param fileName The name of the file to save as (without extension).
 * @param backgroundColor Optional background color.
 */
export const downloadAsPng = async (ref: React.RefObject<HTMLElement | null>, fileName: string, backgroundColor?: string) => {
  if (ref.current === null) {
    console.error('Element ref is null');
    return;
  }

  try {
    const dataUrl = await toPng(ref.current, {
      cacheBust: true,
      backgroundColor: backgroundColor || undefined,
      pixelRatio: 3, // Even higher quality for printing/sharing
      skipAutoScale: true,
    });
    
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('Failed to download image:', err);
  }
};
