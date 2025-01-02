#!/usr/bin/env node

/*
var THREE = require( 'three' ),
    GL = require( 'gl' ),
    fs = require( 'fs' ),
    yargs = require( 'yargs' ),
    STLLoader = require( './three-stl-loader.js' )( THREE ),
    polyfills = require( './polyfills.js' );
*/
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createRequire } from 'module';
import fs from 'fs';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import polyfills from './polyfills.js';
import { PMREMGenerator } from './PMREMGenerator.js';

// Setup require for packages that don't support ESM
const require = createRequire(import.meta.url);
const { Image, createCanvas } = require('canvas');
const Canvas = require('canvas');
// new for jpeg decompression
const sharp = require('sharp');
const GL = require('gl');

// Add this at the top of your file, before using THREE.js
global.ProgressEvent = class ProgressEvent {
    constructor(type, params = {}) {
        this.type = type;
        this.lengthComputable = params.lengthComputable || false;
        this.loaded = params.loaded || 0;
        this.total = params.total || 0;
    }
};

/**
 * Converts 3D files to PNG images
 * @constructor
 */
function ThreeDtoPNG(width, height) {
    this.width = width;
    this.height = height;
    this.gl = GL(this.width, this.height, { preserveDrawingBuffer: true });
    if (!this.gl) {
        throw new Error('Unable to initialize WebGL');
    }

    this.canvas = createCanvas(this.width, this.height);
    // Add event listeners to canvas
    if (!this.canvas.addEventListener) {
        this.canvas.addEventListener = function (type, listener) {
            // Stub implementation
        };
    }
    if (!this.canvas.removeEventListener) {
        this.canvas.removeEventListener = function (type, listener) {
            // Stub implementation
        };
    }

    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.001, 500000);
    this.camera.updateProjectionMatrix();

    this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        context: this.gl,
        antialias: true,
        preserveDrawingBuffer: true,
        alpha: true
    });

    // RoomEnvironment not possible with headless GL
    const environment = new RoomEnvironment( this.renderer );
    const pmremGenerator = new PMREMGenerator( this.renderer );

    this.scene = new THREE.Scene();
    this.scene.environment = pmremGenerator.fromScene( environment ).texture;

    environment.dispose();
    pmremGenerator.dispose();

}



/**
 * Sets up the Three environment (camera, renderer)
 */
ThreeDtoPNG.prototype.setupEnvironment = function () {

    // Add event listeners to canvas
    if (!this.canvas.addEventListener) {
        this.canvas.addEventListener = function (type, listener) {
            // Stub implementation
        };
    }
    if (!this.canvas.removeEventListener) {
        this.canvas.removeEventListener = function (type, listener) {
            // Stub implementation
        };
    }

    this.renderer.setClearColor(0x222222);
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.shadowMap.enabled = true;

    this.scene.add(this.camera);

    this.render();
};

/**
 * Converts geometry into a mesh with a default material
 * @param {THREE.BufferGeometry} geometry
 * @returns {THREE.Mesh} mesh
 */
ThreeDtoPNG.prototype.outputToObject = function (geometry) {
    var material = new THREE.MeshStandardMaterial({
        color: 0xf0ebe8,
        roughness: 1,
        metalness: 0,
        flatShading: true,
        side: THREE.DoubleSide,
        shadowSide: THREE.BackSide // for better shadow handling
    });
    return new THREE.Mesh(geometry, material);
};

/**
 * Returns the appropriate file loader for a given file
 * @param {string} filePath Full path to the file
 * @returns {THREE.Loader} File loader
 */
ThreeDtoPNG.prototype.getLoader = function () {
    // TODO XXX if more file formats are supported later, need a command line option
    // to signify the expected format of the input file.
    return new STLLoader();
};
ThreeDtoPNG.prototype.getLoaderGLB = function () {
    try {
        const ktx2Loader = new KTX2Loader();
        ktx2Loader.setTranscoderPath('lib/three/');

        // Wrap detectSupport in a try-catch since it's synchronous
        try {
            ktx2Loader.detectSupport(this.renderer);
        } catch (error) {
            console.warn('KTX2Loader support detection failed:', error);
            // Continue without KTX2 support
        }

        const loader = new GLTFLoader();

        try {
            loader.setKTX2Loader(ktx2Loader);
            loader.setMeshoptDecoder(MeshoptDecoder);
        } catch (error) {
            console.warn('Error setting up KTX2Loader:', error);
        }

        return loader;
    } catch (error) {
        console.error('Error creating GLB loader:', error);
        // Return a basic GLTFLoader without KTX2 support as fallback
        return new GLTFLoader();
    }
};




/**
 * Positions the camera relative to an object, at an angle
 * @param {THREE.Group|THREE.Mesh} object
 */
ThreeDtoPNG.prototype.center = function (object) {
    var radius;

    if (object.type == 'Group') {
        this.center(object.children[0]);
    } else if (object.type == 'Mesh') {
        object.geometry.center();
        object.geometry.computeBoundingSphere();

        radius = object.geometry.boundingSphere.radius;

        // `radius` is the edge of the object's sphere
        // We want to position our camera outside of that sphere.
        // We'll move `radius` (or more) in all directions (x, y, z), so that we're
        // looking at the object somewhat diagonally, which should always show something
        // useful (instead of possibly an uninteresting side or top...)
        // The exact position of the camera was arbitrarily decided by what looked
        // alright-ish for a few files I was testing with.
        // sketchfab.com has this at ( 0, -distance, 0 )
        // viewstl.com has this at ( 0, 0 distance )
        // openjscad.org has this at ( 0, -distance, distance )
        // thingiverse.com has this at ( -distance, -distance, distance )
        this.camera.position.set(-radius * 1.5, -radius * 1.5, radius);
    }
};


/**
 * Creates a data URL
 * todo other mime/types
 * @param {*} bytes
 * @param {*} mimeType
 * @returns
 */
function bytesToDataURL(bytes, mimeType = 'image/jpeg') {
    // Create a Uint8Array from the byte values
    const uint8Array = new Uint8Array(bytes);

    // Convert the Uint8Array to base64
    let binary = '';
    uint8Array.forEach(byte => {
        binary += String.fromCharCode(byte);
    });
    const base64String = btoa(binary);

    // Create and return the data URL
    return `data:${mimeType};base64,${base64String}`;
}

/**
 * Adds raw 3D data to the scene
 * @param {THREE.Loader} loader Data loader to use
 * @param {Buffer} data Raw 3D data
 */
ThreeDtoPNG.prototype.addDataToSceneGLB = function (loader, data, destinationPath) {


    console.log('addDataToSceneGLB ini');
    const self = this;
    self.gltf = {
        blobs: {}
    };

    // Create an object to store image information
    var images = [];
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);


    let textureimage = {};
    let imageHeigth;
    let imageWidth;
    let imageMime;

    function getImageDimensions(buffer) {
        // Check for JPEG magic number (FF D8)
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
            return getJPEGDimensions(buffer);
        }
        // Check for PNG magic number (89 50 4E 47)
        else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
            return getPNGDimensions(buffer);
        }
        return null;
    }

    function getJPEGDimensions(buffer) {
        let offset = 2;
        while (offset < buffer.length) {
            // Check for Start Of Frame markers
            if (buffer[offset] === 0xFF && (
                buffer[offset + 1] === 0xC0 || // SOF0
                buffer[offset + 1] === 0xC1 || // SOF1
                buffer[offset + 1] === 0xC2    // SOF2
            )) {
                // Height is at offset + 5 (2 bytes)
                // Width is at offset + 7 (2 bytes)
                const height = (buffer[offset + 5] << 8) | buffer[offset + 6];
                const width = (buffer[offset + 7] << 8) | buffer[offset + 8];
                return { width, height };
            }
            offset++;
        }
        return null;
    }

    function getPNGDimensions(buffer) {
        // PNG width and height are at fixed positions
        const width = (buffer[16] << 24) | (buffer[17] << 16) | (buffer[18] << 8) | buffer[19];
        const height = (buffer[20] << 24) | (buffer[21] << 16) | (buffer[22] << 8) | buffer[23];
        return { width, height };
    }

    // Log the GLB structure and extract the images before the GLTF Loader, since that does not work headless
    // todo multiple image support
    // todo support diffent types of images
    // todo remove logs in production
    function parseGLBStructure(arrayBuffer) {
        const headerView = new DataView(arrayBuffer, 0, 12);
        const magic = headerView.getUint32(0, true);
        const version = headerView.getUint32(4, true);
        const length = headerView.getUint32(8, true);

        console.log('GLB Header:');
        console.log('Magic:', magic.toString(16));
        console.log('Version:', version);
        console.log('Length:', length);

        let offset = 12; // Start after header

        while (offset < arrayBuffer.byteLength) {
            const chunkView = new DataView(arrayBuffer, offset, 8);
            const chunkLength = chunkView.getUint32(0, true);
            const chunkType = chunkView.getUint32(4, true);

            // Chunk type 0x4E4F534A is JSON
            if (chunkType === 0x4E4F534A) {
                const jsonData = new Uint8Array(arrayBuffer, offset + 8, chunkLength);
                const jsonString = new TextDecoder().decode(jsonData);
                const parsedJson = JSON.parse(jsonString);




                console.log('parsedJson.materials.length ' + parsedJson.materials.length);
                console.log('parsedJson.images.length ' + parsedJson.images.length);
                console.log('parsedJson.textures.length ' + parsedJson.textures.length);
                console.log('parsedJson.meshes.length ' + parsedJson.meshes.length);

                console.log('\nGLTF JSON Structure:');
                //    console.log(JSON.stringify(parsedJson, null, 2));

                // Parse image information

                if (parsedJson.images) {

                    parsedJson.images.forEach((image, index) => {
                        console.log(`\nImage ${index}:`);
                        console.log('MIME Type:', image.mimeType);

                        if (image.mimeType == 'image/ktx2' || image.mimeType == 'image/webp') {
                            return;
                        }
                        imageMime = image.mimeType

                        images.push({ image });
                        images[index].image.minetype = image.mimeType;


                        if (image.bufferView !== undefined) {
                            const bufferView = parsedJson.bufferViews[image.bufferView];
                            console.log('Buffer View:', {
                                index: image.bufferView,
                                byteOffset: bufferView.byteOffset,
                                byteLength: bufferView.byteLength
                            });

                            // Find the binary chunk to extract image data
                            let binaryChunkOffset = offset;
                            while (binaryChunkOffset < arrayBuffer.byteLength) {
                                const binaryChunkView = new DataView(arrayBuffer, binaryChunkOffset, 8);
                                const binaryChunkLength = binaryChunkView.getUint32(0, true);
                                const binaryChunkType = binaryChunkView.getUint32(4, true);

                                // Chunk type 0x004E4942 is BIN
                                if (binaryChunkType === 0x004E4942) {
                                    const imageDataOffset = binaryChunkOffset + 8 + bufferView.byteOffset;
                                    const imageData = new Uint8Array(arrayBuffer, imageDataOffset, bufferView.byteLength);


                                    // int8Array(1301460) [255, 216, 255, 224, ....
                                    textureimage = imageData;
                                    images[index].image.data = textureimage;

                                    //      console.log('Image Data Preview:');
                                    //     console.log('First 16 bytes:', Array.from(imageData.slice(0, 16)));
                                    //    console.log('Total image size:', bufferView.byteLength, 'bytes');


                                    const dimensions = getImageDimensions(textureimage);
                                    if (dimensions) {
                                        console.log(`Width: ${dimensions.width}, Height: ${dimensions.height}`);
                                        imageHeigth = dimensions.height;
                                        imageWidth = dimensions.width;
                                        images[index].image.height = dimensions.height;
                                        images[index].image.width = dimensions.width;
                                    }


                                    console.log(`Image ${index}:`, {
                                        width: dimensions?.width,
                                        height: dimensions?.height

                                    });



                                    // Optional: Save image to file for verification
                                    const fs = require('fs');
                                    fs.writeFileSync(`image_${index}.${image.mimeType.split('/')[1]}`,
                                        Buffer.from(imageData));
                                    console.log(`Image saved as image_${index}.${image.mimeType.split('/')[1]}`);


                                    break;
                                }
                                binaryChunkOffset += 8 + binaryChunkLength;
                            }
                        } else if (image.uri) {
                            console.log('Image URI:', image.uri);
                        }
                    });
                }

                // Parse texture information
                if (parsedJson.textures) {
                    console.log('\nTexture Information:');
                    parsedJson.textures.forEach((texture, index) => {
                        console.log(`\nTexture ${index}:`);
                        console.log('Source Image:', texture.source);
                        console.log('Sampler:', texture.sampler);

                        if (parsedJson.samplers && texture.sampler !== undefined) {
                            console.log('Sampler Details:', parsedJson.samplers[texture.sampler]);
                        }
                    });
                }
            }

            offset += 8 + chunkLength;
        }
    }


    // Log the structure before parsing
    console.log('\nAnalyzing GLB structure:');
    parseGLBStructure(arrayBuffer);

    loader.parse(arrayBuffer, '', function (gltf) {
        console.log('after parse, THREE.GLTFLoader: Couldn\'t load texture blob:nodedata:... ');


        const model = gltf.scene;
        let meshCount = 0;

        function traverseModel(model) {
            return new Promise((resolve, reject) => {
                try {
                    const promises = []; // Array to store all promises

                    model.traverse((node) => {
                        // If there's async work for each node, push the promise
                        if (node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                            meshCount++;
                            let image = new Canvas.Image();
                            const dataURL = bytesToDataURL(textureimage); // textureimage is Uint8Array

                            // Example: processing jpeg textures


                            images.forEach(function (item, index) {
                                //                                console.log(item, index)

                                const texturePromise = processNodeTexture(node, item.image.data);
                                promises.push(texturePromise);
                            });

                            //                            const texturePromise = processNodeTexture(node, textureimage);
                            //                           promises.push(texturePromise);
                        }
                        // Add other node processing as needed
                    });

                    // Wait for all promises to resolve
                    Promise.all(promises)
                        .then(() => resolve())
                        .catch(error => {
                            console.error('Error processing textures:', error);
                            resolve(); // Still resolve to allow the application to continue
                        });
                } catch (error) {
                    console.error('Error in model traversal:', error);
                    reject(error);
                }
            });
        }

        // Example function for processing node textures
        function processNodeTexture(node, textureimage) {
            return new Promise((resolve, reject) => {
                try {
                    sharp(textureimage)
                        .raw()                // Get raw pixel data
                        .ensureAlpha()       // Make sure we have an alpha channel
                        .resize(imageWidth, imageHeigth)  // Resize if needed
                        .toBuffer()
                        .then(rawBuffer => {
                            // rawBuffer is now a Buffer containing raw RGBA pixel data
                            const pixels = new Uint8Array(rawBuffer);
                            console.log('Decoded pixel data length:', pixels.length);
                            const texture = new THREE.DataTexture(
                                pixels,
                                imageWidth,
                                imageHeigth,
                                THREE.RGBAFormat,
                                THREE.UnsignedByteType
                            );
                            texture.needsUpdate = true;
                            texture.wrapS = THREE.RepeatWrapping;
                            texture.wrapT = THREE.RepeatWrapping;
                            texture.magFilter = THREE.LinearFilter;
                            texture.minFilter = THREE.LinearFilter;

                            // only one image
                            // but node.material.map = [] does not seem to be suported?
                            // todo support multiple images
                            node.material.map = texture;

                            node.material.needsUpdate = true;
                            // Do something with the processed texture
                            resolve();
                        })
                        .catch(err => {
                            console.warn('Error processing texture, using default texture:', err);
                            resolve();
                        });
                } catch (error) {
                    console.warn('Error in texture processing, using default texture:', error);
                    resolve();
                }
            });
        }

        traverseModel(model)
            .then(() => {
                console.log('All nodes processed successfully');
                // Continue with the rest of your code


                console.log('Found meshes:', meshCount);

                console.log('self.gltf.blobs');
                console.dir(self.gltf.blobs);

                // neu
                model.updateMatrixWorld();

                // Compute axis-aligned bounding box (AABB) and center (x, y, z) in
                // world space. Size, defined here as a cheap approximation of
                // model's maximum span in any direction, is computed from the AABB.
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3()).length();

                // Center content at the origin, (0, 0, 0).
                model.position.x -= center.x;
                model.position.y -= center.y;
                model.position.z -= center.z;


                // Constrain camera near and far planes to factors of size. Planes
                // should fit the content tightly enough that depth buffer
                // precision is utilized well, but not so tight that the model
                // clips the near/far planes easily while interacting with controls.
                self.camera.near = size / 100;
                self.camera.far = size * 100;
                self.camera.updateProjectionMatrix();

                // Default viewing angle is arbitrary and subjective, some models
                // may benefit from a more top-down or front-facing perspective. To
                // split the difference somewhat, we use a diagonal. Comparisons:
                // sketchfab.com: ( 0, -distance, 0 )
                // viewstl.com: ( 0, 0 distance )
                // openjscad.org: ( 0, -distance, distance )
                // thingiverse.com: ( -distance, -distance, distance )
                self.camera.position.x += size * 0.75;
                self.camera.position.y += size * 0.5;
                self.camera.position.z += size * 0.75;

                // Rotate the camera to look at the object's center, (0, 0, 0).
                self.camera.lookAt(model.position);

                // Add content to scene.

                self.scene.add(model);

                console.log('About to render...');
                self.render();
                console.log('Render complete');

                // Debug: try to read pixels to verify something was rendered
                const gl = self.renderer.getContext();
                const pixels = new Uint8Array(4);
                gl.readPixels(self.width / 2, self.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                console.log('Center pixel color:', pixels);


                const buffer = self.getCanvasStream();

                // console.log("Buffer:", buffer);

                // Write buffer to file
                console.log('write file glb')

                fs.writeFile(destinationPath, buffer, (err) => {

                });

            })
            .catch(error => {
                console.error('Error processing nodes:', error);
            });




    }, undefined, function (error) {
        console.error('Error loading GLB:', error);
    });
};


/**
 * Adds raw 3D data to the scene
 * @param {THREE.Loader} loader Data loader to use
 * @param {Buffer} data Raw 3D data
 */
ThreeDtoPNG.prototype.addDataToScene = function (loader, data) {
    // Convert the input data into an array buffer
    var arrayBuffer = new Uint8Array(data).buffer,
        // Parse the contents of the input buffer
        output = loader.parse(arrayBuffer),
        // Convert what the loader returns into an object we can add to the scene
        object = this.outputToObject(output);

    object.castShadow = true;
    object.receiveShadow = true;

    // Position the camera relative to the object
    // This allows us to look at the object from enough distance and from
    // an angle
    this.center(object);

    // Add the object to the scene
    this.scene.add(object);


    this.camera.up.set(0, 0, 1);

    // Point camera at the scene
    this.camera.lookAt(this.scene.position);
};

/**
 * Renders the scene
 */
ThreeDtoPNG.prototype.render = function () {
    this.renderer.render(this.scene, this.camera);

};

/**
 * Returns a stream to the render canvas
 * @returns {PNGStream} PNG image stream
 */
ThreeDtoPNG.prototype.getCanvasStream = function () {
    var pixels = new Uint8Array(this.width * this.height * 4);
    this.gl.readPixels(0, 0, this.width, this.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);

    var ctx = this.canvas.getContext('2d');
    const imgData = ctx.createImageData(this.width, this.height);

    // Flip the pixels vertically
    for (var i = 0; i < this.height; i++) {
        for (var j = 0; j < this.width; j++) {
            var sourcePixel = (i * this.width + j) * 4;
            var targetPixel = ((this.height - i - 1) * this.width + j) * 4;

            imgData.data[targetPixel] = pixels[sourcePixel];         // R
            imgData.data[targetPixel + 1] = pixels[sourcePixel + 1]; // G
            imgData.data[targetPixel + 2] = pixels[sourcePixel + 2]; // B
            imgData.data[targetPixel + 3] = pixels[sourcePixel + 3]; // A
        }
    }

    ctx.putImageData(imgData, 0, 0);

    // Return buffer instead of stream
    return this.canvas.toBuffer('image/png');
};

/**
 * Flips canvas over Y axis
 * @param {Canvas} canvas
 * @returns {Canvas}
 */
ThreeDtoPNG.prototype.flip = function (canvas) {
    var flipped = createCanvas(this.width, this.height),
        ctx = flipped.getContext('2d');

    ctx.globalCompositeOperation = 'copy';
    ctx.scale(1, -1);
    ctx.translate(0, -imgData.height);
    ctx.drawImage(canvas, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';

    return ctx.canvas;
};

/**
 * Converts a 3D model file into a PNG image
 * @param {string} sourcePath Full path to the source 3D model file
 * @param {string} destinationPath Full path to the destination PNG file
 * @param {Function} callback Called when conversion is complete
 */
ThreeDtoPNG.prototype.convert = function (sourcePath, destinationPath, callback) {
    var loader;
    var datatype;
    this.sourcePath = sourcePath;

    // Fix the file extension check
    if (sourcePath.toLowerCase().endsWith('.glb')) {
        datatype = 'glb';
        loader = this.getLoaderGLB();
    } else {
        datatype = 'stl';
        loader = this.getLoader();
    }

    var self = this;

    fs.readFile(sourcePath, function (err, data) {
        if (err) {
            if (callback) callback(err);
            return;
        }

        try {
            if (datatype === 'glb') {
                self.addDataToSceneGLB(loader, data, destinationPath);
            } else {
                self.addDataToScene(loader, data);
            }

            // For GLB files, the render happens in the loader callback
            if (datatype !== 'glb') {


                self.render();

                const buffer = self.getCanvasStream();

                // console.log("Buffer:", buffer);

                // wie kann das zuverlässig funktionieren????

                // Write buffer to file
                console.log('write file stl')
                fs.writeFile(destinationPath, buffer, (err) => {
                    if (err) {
                        if (callback) callback(err);
                        return;
                    }

                    // Reset the scene for future conversions
                    self.scene = new THREE.Scene();
                    if (callback) callback(null);
                });
            }

        } catch (error) {
            if (callback) callback(error);
        }
    });
};


// Create a function to handle the CLI execution
async function main() {
    try {
        const argv = yargs(hideBin(process.argv))
            .usage('Usage: $0 <model> <dimensions> <output.png>')
            .demandCommand(3)
            .argv;

        const dimensions = argv._[1].split('x');
        const width = parseInt(dimensions[0]);
        const height = parseInt(dimensions[1]);

        if (isNaN(width) || isNaN(height)) {
            throw new Error('Incorrect dimension format, should look like: 640x480');
        }

        const t = new ThreeDtoPNG(width, height);
        t.setupEnvironment();

        // Convert using promises
        await new Promise((resolve, reject) => {
            t.convert(argv._[0], argv._[2], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

// Export the class
export { ThreeDtoPNG };

// Run the main function if this file is being executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error(error);
        process.exit(1);
    });
}
/* exports.ThreeDtoPNG = ThreeDtoPNG;

if ( require.main === module ) { */

//export { ThreeDtoPNG };

// Check if file is being run directly
/*
if (import.meta.url === `file://${process.argv[1]}`) {


    var args = yargs.argv;

    if ( args._.length < 3 ) {
        throw 'Usage: 3drender <model> <dimensions> <output.png>';
    }

    var	dimensions = args._[ 1 ].split( 'x' ),
        width = parseInt( dimensions[0] ),
        height = parseInt( dimensions[1] );

    if ( isNaN( width ) || isNaN( height ) ) {
        throw 'Incorrect dimension format, should look like: 640x480';
    }

    var t = new ThreeDtoPNG( width, height );

    t.setupEnvironment();
    t.convert( args._[ 0 ], args._[2] );
}
*/
