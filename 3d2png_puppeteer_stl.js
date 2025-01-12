/* Complete example.js */
import puppeteer from 'puppeteer';

// Define output path if not already defined
//const outputPath = './output.jpg'; // Adjust this path as needed
const outputPath = './output.png'; // Adjust this path as needed


// Configure launch parameters
const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--headless=new',
    '--use-angle=vulkan',
    '--enable-features=Vulkan',
    '--disable-vulkan-surface',
    '--enable-unsafe-webgpu',
    '--disable-web-security',  // Add this
    '--allow-running-insecure-content',  // Add this
    '--disable-features=IsolateOrigins,site-per-process',
    '--use-cmd-decoder=passthrough',
    '--enable-webgl',  // Add this
    '--ignore-gpu-blacklist',  // Add this
    '--use-gl=angle',  // Add this
    '--use-angle=default'  // Add this
  ]
  //,  devtools: true
});

const page = await browser.newPage();

try {

  // todo: relative paths cause problems
  // todo: Rewrite the code as in 3d2png.js 

  await page.setContent(`
<html>
<head>
    <script src='https://opendem.github.io/WikiMediaExtension3D_Test_GLB_Format/lib/three/three_all_in.js'></script>
    
    <style>
        body {
            margin: 0;
        }

        canvas {
            display: block;
        }
    </style>
</head>

<body>
    <script>
        window.addEventListener('load', function () {
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
            camera.position.set(0, 0, 2); 
            camera.lookAt(0, 0, 0);
            const renderer = new THREE.WebGLRenderer();

            const environment = new THREE.RoomEnvironment(renderer);
            const pmremGenerator = new THREE.PMREMGenerator(renderer);
            scene.environment = pmremGenerator.fromScene(environment).texture;
            environment.dispose();
            pmremGenerator.dispose();
            console.log('pmremGenerator');

            
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Increase intensity
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Increase intensity
            directionalLight.position.set(5, 5, 5); 
            scene.add(ambientLight);
            scene.add(directionalLight);


            renderer.setSize(800, 600);
            document.body.appendChild(renderer.domElement);
     
            var loader = new THREE.STLLoader();
            loader.load('https://opendem.github.io/WikiMediaExtension3D_Test_GLB_Format/models/ganesha_stl.stl',
                function (geometry) {
                    var material = new THREE.MeshPhongMaterial({
                        color: 0xff5533,
                        specular: 0x111111,
                        shininess: 200
                    });
                    var mesh = new THREE.Mesh(geometry, material);

                    mesh.position.set(0, 0, 0);
                    mesh.rotation.set(0, -Math.PI / 2, 0);                    

                    scene.add(mesh);

                    geometry.computeBoundingBox();
                    const center = geometry.boundingBox.getCenter(new THREE.Vector3());
                    camera.lookAt(center);

                    console.log('Model loaded successfully');
                },
                function (xhr) {
                    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                },
                function (error) {
                    console.error('Error loading model:', error);
                }
            );
            
            renderer.render(scene, camera);
            renderer.setSize(800, 600);
            

            function animate() {
               requestAnimationFrame(animate);
               renderer.render(scene, camera);
            }
           animate();
           document.body.appendChild(renderer.domElement);
           window.renderingComplete = true;
        });
    </script></body></html>
`, {
    waitUntil: 'networkidle0'
  });

  // Wait for canvas and model
  await page.waitForSelector('canvas');

  const html = await page.content();
  console.log(html);


  // Take the screenshot

  // Does not work reliably
  /*
  await page.screenshot({
   path: outputPath,
   type: 'jpeg',
   quality: 80
 });
*/

  setTimeout(function () {
    page.screenshot({
      path: outputPath,
      type: 'png'
    });

    // leads to an error
    // browser.close();
    console.log(`Screenshot saved to ${outputPath}`);

  }, 2000);



} catch (error) {
  console.error('Error:', error);
} finally {
  // await browser.close();
}