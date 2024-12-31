import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createCanvas, Image } = require('canvas');
const { URL } = require('url');
import * as THREE from 'three';


// Create global self if it doesn't exist
if (typeof self === 'undefined') {
    global.self = globalThis;
}

// Add Image to global scope
if (typeof global.Image === 'undefined') {
    global.Image = Image;
}

function TextDecoder(encoding, options) {
    this.encoding = encoding || 'utf-8';
}

TextDecoder.prototype.decode = function (buffer) {
    return new Buffer(buffer).toString(this.encoding);
}

// Add canvas event listener support
function addCanvasEventListener() {
    const canvas = createCanvas(1, 1);
    if (!canvas.addEventListener) {
        canvas.addEventListener = function (type, listener) {
            // Stub implementation
        };
    }
    if (!canvas.removeEventListener) {
        canvas.removeEventListener = function (type, listener) {
            // Stub implementation
        };
    }
    return canvas;
}

const polyfills = {
    window: {
        addEventListener: function (eventName, callback) {
            // dummy
        },
        removeEventListener: function (eventName, callback) {
            // dummy
        },
        TextDecoder: TextDecoder,
        Image: Image  // Add Image to window
    },
    TextDecoder: TextDecoder,
    HTMLCanvasElement: {
        prototype: {
            addEventListener: function (type, listener) {
                // Stub implementation
            },
            removeEventListener: function (type, listener) {
                // Stub implementation
            }
        }
    },
    URL: URL,
    Image: Image,  // Add Image to polyfills
    createImageBitmap: async function (data) {
        const img = new Image();
        return new Promise((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = data;
        });
    }
};

// Apply polyfills to canvas
const canvas = addCanvasEventListener();

export default polyfills;
