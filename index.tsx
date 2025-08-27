/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from '@google/genai';

// State variables
let uploadedImageData: {
    base64: string;
    mimeType: string;
} | null = null;
let selectedTheme: string | null = null;

// DOM Elements
const fileInput = document.getElementById('portrait-upload') as HTMLInputElement;
const imagePreviewContainer = document.getElementById('image-preview-container') as HTMLDivElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
const themeRadios = document.querySelectorAll<HTMLInputElement>('input[name="theme"]');
const loader = document.getElementById('loader') as HTMLDivElement;
const imageGallery = document.getElementById('image-gallery') as HTMLDivElement;

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-flash-image-preview';

/**
 * Checks the state and enables/disables the generate button.
 */
function updateButtonState() {
    generateBtn.disabled = !(uploadedImageData && selectedTheme);
}

/**
 * Handles the file input change event.
 */
function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            uploadedImageData = {
                base64: base64String,
                mimeType: file.type,
            };

            // Update preview
            imagePreviewContainer.innerHTML = ''; // Clear placeholder
            const img = new Image();
            img.src = reader.result as string;
            img.alt = 'User portrait preview';
            imagePreviewContainer.appendChild(img);
            
            updateButtonState();
        };
        reader.readAsDataURL(file);
    }
}

/**
 * Handles the theme selection change event.
 */
function handleThemeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    selectedTheme = target.value;
    updateButtonState();
}

/**
 * Handles the generate button click event.
 */
async function handleGenerateClick() {
    if (!uploadedImageData || !selectedTheme) {
        alert('Please upload an image and select a theme.');
        return;
    }

    // Show loader and clear previous results
    loader.hidden = false;
    imageGallery.innerHTML = '';
    generateBtn.disabled = true;

    try {
        const prompt = `Transform the person in this portrait into a superhero from the ${selectedTheme} universe. Maintain their key facial features but give them a suitable costume, a dynamic pose, and an epic background.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [{
                    inlineData: {
                        data: uploadedImageData.base64,
                        mimeType: uploadedImageData.mimeType,
                    },
                }, {
                    text: prompt,
                }, ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        if (response.candidates && response.candidates[0].content.parts) {
            let imageGenerated = false;
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    const mimeType = part.inlineData.mimeType;
                    const imageUrl = `data:${mimeType};base64,${base64ImageBytes}`;
                    
                    // Create a container for the image and button
                    const resultItem = document.createElement('div');
                    resultItem.className = 'result-item';

                    // Create the image element
                    const img = new Image();
                    img.src = imageUrl;
                    img.alt = `Generated ${selectedTheme} superhero`;

                    // Create the download button
                    const downloadLink = document.createElement('a');
                    downloadLink.href = imageUrl;
                    // Provide a filename for the download
                    downloadLink.download = `superhero-${selectedTheme?.toLowerCase()}-${Date.now()}.png`;
                    downloadLink.textContent = 'Download Image';
                    downloadLink.className = 'download-btn';
                    downloadLink.setAttribute('role', 'button');

                    // Append image and button to the container
                    resultItem.appendChild(img);
                    resultItem.appendChild(downloadLink);

                    // Append the container to the gallery
                    imageGallery.appendChild(resultItem);
                    imageGenerated = true;
                }
            }
             if (!imageGenerated) {
                throw new Error("API response did not contain an image.");
            }
        } else {
            throw new Error("Invalid response from API.");
        }

    } catch (error) {
        console.error("Error generating image:", error);
        imageGallery.innerHTML = `<p style="color: red; text-align: center;">Sorry, couldn't generate the image. Please try again. Check console for details.</p>`;
    } finally {
        // Hide loader and re-enable button based on state
        loader.hidden = true;
        updateButtonState();
    }
}

/**
 * Initializes the application by attaching event listeners.
 */
function initializeApp() {
    if (fileInput && generateBtn && themeRadios.length > 0 && imagePreviewContainer) {
        fileInput.addEventListener('change', handleFileChange);
        themeRadios.forEach(radio => radio.addEventListener('change', handleThemeChange));
        generateBtn.addEventListener('click', handleGenerateClick);
    } else {
        console.error("Initialization failed: One or more required DOM elements could not be found.");
        document.body.innerHTML = `<p style="color: red; font-size: 1.2rem; text-align: center; margin-top: 50px;">
                                   Application failed to load. A critical UI element is missing.
                                   </p>`;
    }
}

initializeApp();
