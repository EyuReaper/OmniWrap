`use client`;

import htmlToImage from 'html-to-image';
import { useRef } from 'react';

export default function ShareButton({ elementID }: { elementId: string }) {
    const handleShare = async () => {
        const node = document.getElementById(elementID);
        if (node) {
            const dataUrl = await htmlToImage.toPng(node);
            const link = document.createElement('a');
            link.download = 'omniwrap-card.png';
            link.href = dataUrl;
            link.click();
        }
    };

    return (
        <button onClick={handleShare} className="px-4 py-2 bg-blue-500 rounded mt-4">
            Share This Card
        </button>
    );
}