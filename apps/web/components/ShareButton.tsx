'use client';

import htmlToImage from 'html-to-image';

export default function ShareButton({ elementId }: { elementId: string }) {
    const handleShare = async () => {
        const node = document.getElementById(elementId);
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
