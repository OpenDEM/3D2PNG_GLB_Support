import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createCanvas } = require('canvas');

function TextDecoder(encoding, options) {
    this.encoding = encoding || 'utf-8';
}

TextDecoder.prototype.decode = function(buffer) {
    return new Buffer(buffer).toString(this.encoding);
}

// Add canvas event listener support
function addCanvasEventListener() {
    const canvas = createCanvas(1, 1);
    if (!canvas.addEventListener) {
        canvas.addEventListener = function(type, listener) {
            // Stub implementation
        };
    }
    if (!canvas.removeEventListener) {
        canvas.removeEventListener = function(type, listener) {
            // Stub implementation
        };
    }
    return canvas;
}

const polyfills = {
    window: {
        addEventListener: function(eventName, callback) {
            // dummy
        },
        removeEventListener: function(eventName, callback) {
            // dummy
        },
        TextDecoder: TextDecoder
    },
    TextDecoder: TextDecoder,
    // Add canvas event methods to prototype
    HTMLCanvasElement: {
        prototype: {
            addEventListener: function(type, listener) {
                // Stub implementation
            },
            removeEventListener: function(type, listener) {
                // Stub implementation
            }
        }
    }
};

// Apply polyfills to canvas
const canvas = addCanvasEventListener();

export default polyfills;
