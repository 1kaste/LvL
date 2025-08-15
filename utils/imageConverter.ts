
/**
 * Converts an image URL to a data URL suitable for embedding in a PDF.
 * It handles remote URLs, data URLs, and rasterizes SVGs to PNGs for better compatibility.
 * @param imageUrl The URL of the image to convert (can be http, https, or data URL).
 * @returns A promise that resolves with the data URL, or null if conversion fails.
 */
export const convertImageToDataUrl = async (imageUrl: string): Promise<string | null> => {
    if (!imageUrl) {
        return null;
    }

    // If it's already a non-SVG data URL, we're done.
    if (imageUrl.startsWith('data:image/') && !imageUrl.startsWith('data:image/svg+xml')) {
        return Promise.resolve(imageUrl);
    }

    try {
        // Fetching works for both remote URLs and data URLs (including SVGs).
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();

        // If it's an SVG, we need to rasterize it on a canvas.
        if (blob.type.includes('svg')) {
            const svgText = await blob.text();
            const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));

            return new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => {
                    URL.revokeObjectURL(url);
                    const canvas = document.createElement('canvas');
                    // Use a higher resolution for better quality in the PDF
                    canvas.width = 256; 
                    canvas.height = 256;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        return reject(new Error('Failed to get canvas 2D context.'));
                    }
                    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/png'));
                };
                image.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error('Error loading SVG into an Image element.'));
                };
                image.src = url;
            });
        } else {
            // For other image types (PNG, JPG), convert blob to data URL directly.
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                        resolve(reader.result);
                    } else {
                        reject(new Error('Failed to read image as data URL.'));
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }
    } catch (error) {
        console.error("Error converting image to data URL:", error);
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            console.error("This could be a CORS issue. The image server must be configured to allow cross-origin requests.");
        }
        return null; // Return null on any failure
    }
};
