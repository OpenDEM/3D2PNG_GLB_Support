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
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';


// Setup require for packages that don't support ESM
const require = createRequire(import.meta.url);

// Import required packages
const GL = require('gl');
const fs = require('fs');
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
const { createCanvas } = require('canvas');
//const polyfills = require('./polyfills.js');


// For local files, you have two options:

// Option 1: Convert polyfills.js to ESM and use import
 import polyfills from './polyfills.js';

// Option 2: Keep polyfills.js as CommonJS and use require
//const polyfills = require('./polyfills.js')



// const { createCanvas, Canvas } = require('canvas')

/*
for (item in polyfills) {
	global[item] = polyfills[item];
}
*/

/**
 * Converts 3D files to PNG images
 * @constructor
 */
function ThreeDtoPNG( width, height ) {
    this.width = width;
    this.height = height;
    this.gl = GL(this.width, this.height, { preserveDrawingBuffer: true });
    if (!this.gl) {
        throw new Error('Unable to initialize WebGL');
    }
    
    this.canvas = createCanvas(this.width, this.height);
    
    // Add event listeners to canvas
    if (!this.canvas.addEventListener) {
        this.canvas.addEventListener = function(type, listener) {
            // Stub implementation
        };
    }
    if (!this.canvas.removeEventListener) {
        this.canvas.removeEventListener = function(type, listener) {
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

	// new
	// RoomEnvironment is not directly available in headless Node.js environment because it relies on WebGL features that aren't fully supported in node-gl.

	//const environment = new THREE.RoomEnvironment( this.renderer );
	//const pmremGenerator = new THREE.PMREMGenerator( this.renderer );

    this.scene = new THREE.Scene();

	// new
//	this.scene.background = new THREE.Color( 0x0000000 );
//	this.scene.environment = pmremGenerator.fromScene( environment ).texture;
//	environment.dispose();
	
}

/**
 * Sets up the Three environment (ambient light, camera, renderer)
 */
ThreeDtoPNG.prototype.setupEnvironment = function() {
    var light;

    // Add event listeners to canvas
    if (!this.canvas.addEventListener) {
        this.canvas.addEventListener = function(type, listener) {
            // Stub implementation
        };
    }
    if (!this.canvas.removeEventListener) {
        this.canvas.removeEventListener = function(type, listener) {
            // Stub implementation
        };
    }

    this.renderer.setClearColor(0x222222);
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.shadowMap.enabled = true;


	this.camera.up.set( 0, 0, 1 );
	this.camera.add( new THREE.PointLight( 0xffffff, 0.3 ) );

	this.scene.add( new THREE.AmbientLight( 0x666666, 0.5 ) );
	this.scene.add( this.camera );

	// old
	/*
	light = new THREE.SpotLight( 0x999999, 1 );
	light.position.set( -100, 50, 25 );
	light.castShadow = true;
	light.shadow.mapSize.width = 4096;
	light.shadow.mapSize.height = 4096;
	this.camera.add( light );
	*/
	light = new THREE.SpotLight(0x999999, 1);
light.position.set(-100, 50, 25);
light.castShadow = true;
light.shadow.mapSize.width = 4096;
light.shadow.mapSize.height = 4096;
light.shadow.bias = -0.0001; // reduces shadow artifacts
light.shadow.normalBias = 0.0; // helps with shadow acne

	this.render();
};

/**
 * Converts geometry into a mesh with a default material
 * @param {THREE.BufferGeometry} geometry
 * @returns {THREE.Mesh} mesh
 */
ThreeDtoPNG.prototype.outputToObject = function ( geometry ) {
// old
	//	var material = new THREE.MeshPhongMaterial( { color: 0xf0ebe8, shininess: 5, flatShading: true, side: THREE.DoubleSide } );
	var material = new THREE.MeshPhongMaterial({ 
		color: 0xf0ebe8, 
		shininess: 5, 
		flatShading: true,
		side: THREE.DoubleSide,
		shadowSide: THREE.BackSide // for better shadow handling
	});
	return new THREE.Mesh( geometry, material );
};

/**
 * Returns the appropriate file loader for a given file
 * @param {string} filePath Full path to the file
 * @returns {THREE.Loader} File loader
 */
ThreeDtoPNG.prototype.getLoader = function() {
	// TODO XXX if more file formats are supported later, need a command line option
	// to signify the expected format of the input file.
	return new STLLoader();
};

/**
 * Positions the camera relative to an object, at an angle
 * @param {THREE.Group|THREE.Mesh} object
 */
ThreeDtoPNG.prototype.center = function( object ) {
	var radius;

	if ( object.type == 'Group' ) {
		this.center( object.children[ 0 ] );
	} else if ( object.type == 'Mesh' ) {
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
		this.camera.position.set( -radius * 1.5, -radius * 1.5, radius );
	}
};

/**
 * Adds raw 3D data to the scene
 * @param {THREE.Loader} loader Data loader to use
 * @param {Buffer} data Raw 3D data
 */
ThreeDtoPNG.prototype.addDataToScene = function( loader, data ) {
	// Convert the input data into an array buffer
	var arrayBuffer = new Uint8Array( data ).buffer,
		// Parse the contents of the input buffer
		output = loader.parse( arrayBuffer ),
		// Convert what the loader returns into an object we can add to the scene
		object = this.outputToObject( output );

	object.castShadow = true;
	object.receiveShadow = true;

	// Position the camera relative to the object
	// This allows us to look at the object from enough distance and from
	// an angle
	this.center( object );

	// Add the object to the scene
	this.scene.add( object );

	// Point camera at the scene
	this.camera.lookAt( this.scene.position );
};

/**
 * Renders the scene
 */
ThreeDtoPNG.prototype.render = function() {
	this.renderer.render( this.scene, this.camera );
};

/**
 * Returns a stream to the render canvas
 * @returns {PNGStream} PNG image stream
 */
ThreeDtoPNG.prototype.getCanvasStream = function() {
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
ThreeDtoPNG.prototype.flip = function( canvas ) {
	var flipped = createCanvas( this.width, this.height ),
		ctx = flipped.getContext( '2d' );

	ctx.globalCompositeOperation = 'copy';
	ctx.scale( 1, -1 );
	ctx.translate( 0, -imgData.height );
	ctx.drawImage( canvas, 0, 0 );
	ctx.setTransform( 1, 0, 0, 1, 0, 0 );
	ctx.globalCompositeOperation = 'source-over';

	return ctx.canvas;
};

/**
 * Converts a 3D model file into a PNG image
 * @param {string} sourcePath Full path to the source 3D model file
 * @param {string} destinationPath Full path to the destination PNG file
 * @param {Function} callback Called when conversion is complete
 */
ThreeDtoPNG.prototype.convert = function(sourcePath, destinationPath, callback) {
    var loader = this.getLoader(sourcePath),
        self = this;

    fs.readFile(sourcePath, function(err, data) {
        if (err) {
            if (callback) callback(err);
            return;
        }

        try {
            self.addDataToScene(loader, data);
            self.render();

            const buffer = self.getCanvasStream();
            
            // Write buffer to file
            fs.writeFile(destinationPath, buffer, (err) => {
                if (err) {
                    if (callback) callback(err);
                    return;
                }
                
                // Reset the scene for future conversions
                self.scene = new THREE.Scene();
                if (callback) callback(null);
            });

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