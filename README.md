# 3D2PNG_GLB_Support
Update with three.js 162. The last Version of three.js with support of for WebGL 1. The software 3d2png depends on headless-gl, which only supports WebGL 1.

**Test: node --inspect 3d2png.js samples/DavidStatue.stl 640x480 test.png**

GLB files for testing: 
* https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf
* https://github.com/KhronosGroup/glTF-Sample-Models/tree/main/2.0

**Only very basis support yet. Many things don't work out of the box with headless gl.**

The images of the textures were extracted here and later used as DataTexture. **There are probably better ways.**

There are a lot of logs in the code, which must removed later.

TODOs:
* support image format WebP
* support of other image formats?
* support KTX2
* support multiple images (e.g. https://github.com/KhronosGroup/glTF-Sample-Models/tree/main/2.0/Avocado/glTF-Binary)
* support multiple textures
* support multiple meshes
* fitting the model better into the picture
* code clean up and review
* The lights need to be revised. RoomEnvironment is not working with headless rendering.
