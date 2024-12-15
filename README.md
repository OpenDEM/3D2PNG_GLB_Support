# 3D2PNG_GLB_Support
three.js 162
No GLB Support yet

TODOs for Patch:
* The lights need to be revised. RoomEnvironment is not working with headless rendering.
* Eleminate vulnerabilities

Test: node --inspect 3d2png.js samples/DavidStatue.stl 640x480 test.png

Based on https://github.com/wikimedia/3d2png with three.js 88 
