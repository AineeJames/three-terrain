import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { PixelShader } from 'three/examples/jsm/shaders/PixelShader.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { Pane } from 'tweakpane'
import * as EssentialsPlugin from '@tweakpane/plugin-essentials'
import { Noise } from 'noisejs'

let scene, renderer, camera, composer, bloomPass, pixelPass, controls
let sun, pgeo, pmat, plane
let fpsGraph

let noise = new Noise(Math.random());
let clock = new THREE.Clock();

let PARAMS = {
  sunPos: 90,
  sunDist: 500,
  complexity: 0.67,
  octaves: 5,
  color: 0xff0004,
  baseScale: 5,
  shiftSpeed: 5,
  pixelSize: 0,
}

window.onload = (event) => {
  threeInit()
  uiInit()
  animate()
}

window.addEventListener( 'resize', onWindowResize, false );
function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function updatePlane() {
  const vertCount = pgeo.attributes.position.count
  for (let i = 0; i < vertCount; i++) {
    const x = pgeo.attributes.position.getX(i) + clock.getElapsedTime()*PARAMS.shiftSpeed
    const y = pgeo.attributes.position.getY(i) + clock.getElapsedTime()*PARAMS.shiftSpeed
    let zval = 0;
    for (let j = 0; j < PARAMS.octaves; j++) {
      zval += (j+1)*PARAMS.baseScale * noise.simplex2((x+((2**j)*100))/(100/(j+1)), y/(100/(j+1)))*Math.pow(PARAMS.complexity, j)
    }
    pgeo.attributes.position.setZ(i, zval)
  }
  pgeo.computeVertexNormals()
  pgeo.attributes.position.needsUpdate = true
}

function threeInit() {
  // instantiate a 3js scene
  scene = new THREE.Scene()

  // create the renderer and set it's params
  renderer = new THREE.WebGLRenderer({ 
    canvas: document.querySelector( '#scene' ),
  })
  renderer.setPixelRatio( window.devicePixelRatio )
  renderer.setSize( window.innerWidth, window.innerHeight )

  // place a camera in the scene
  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 )
  camera.position.set( 120, 60, 120 )
  scene.add( camera )


  composer = new EffectComposer( renderer );
  const renderPass = new RenderPass( scene, camera );
  composer.addPass( renderPass );
  const params = {
    exposure: 1,
    bloomStrength: 0.6,
    bloomThreshold: 0,
    bloomRadius: 0.2,
  };
  bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ) );
  bloomPass.threshold = params.bloomThreshold;
  bloomPass.strength = params.bloomStrength;
  bloomPass.radius = params.bloomRadius;
  composer.addPass(bloomPass);
  pixelPass = new ShaderPass( PixelShader );
  pixelPass.uniforms[ 'resolution' ].value = new THREE.Vector2( window.innerWidth, window.innerHeight );
	pixelPass.uniforms[ 'resolution' ].value.multiplyScalar( window.devicePixelRatio );
  pixelPass.uniforms[ 'pixelSize' ].value = 1;
  composer.addPass(pixelPass)

  // allow 3js controls
  controls = new OrbitControls( camera, renderer.domElement )

  //create the sun
  sun = new THREE.PointLight( 0xffffff, 0.8, 1000 )
  sun.position.set( 0, PARAMS.sunDist, 0 )
  scene.add( sun )

  const light = new THREE.AmbientLight( 0x040404 ); // soft white light
  scene.add( light );

  pgeo = new THREE.PlaneBufferGeometry(100, 100, 100, 100)
  pmat = new THREE.MeshPhongMaterial({color: PARAMS.color, wireframe: true})
  plane = new THREE.Mesh(pgeo, pmat)
  plane.rotation.x = - Math.PI / 2
  scene.add( plane )
}

function animate() {
  fpsGraph.begin()

  updatePlane()
  plane.material.color.setHex(PARAMS.color)

  requestAnimationFrame( animate )
	controls.update()
  composer.render()

  fpsGraph.end()
}

function uiInit() {
  // create the ui and add fps counter plugin
  const ui = new Pane()
  ui.registerPlugin( EssentialsPlugin )

  // add the fps graph
  fpsGraph = ui.addBlade({
    view: 'fpsgraph',
    label: 'FPS',
  })

  // folder for terrain controls
  const terrainCtrls = ui.addFolder({
    title: "Terrain Controls",
  })
  terrainCtrls.addButton({
    title: 'Randomize Seed',
  }).on('click', function(event) {
    noise.seed(Math.random())
  })
  terrainCtrls.addButton({
    title: "Randomize Settings",
  }).on('click', function( event ) {
    PARAMS.complexity = (Math.random() * (1 - 0) + 0).toFixed(2)
    PARAMS.octaves = Math.random() * (10 - 1) + 1
    PARAMS.baseScale = Math.random() * (10 - 1) + 1
    PARAMS.shiftSpeed = Math.random() * (25 - 0) + 0
    PARAMS.color = `0x${Math.floor(Math.random() * 0xffffff).toString(16).padEnd(6, "0")}`
    plane.material.wireframe = Math.random() < 0.5 ? false : true
    ui.refresh()
  })
  terrainCtrls.addInput(PARAMS, 'complexity', {
    label: "Intensity",
    min: 0,
    max: 1,
    step: 0.01,
  })
  terrainCtrls.addInput(PARAMS, 'octaves', {
    label: "Octaves",
    min: 1,
    max: 10,
    step: 1,
  })
  terrainCtrls.addInput(PARAMS, 'baseScale', {
    label: "Amplitude",
    min: 1,
    max: 10,
    step: 1,
  })
  terrainCtrls.addInput(PARAMS, 'shiftSpeed', {
    label: "Shift Speed",
    min: 0,
    max: 25,
    step: 1,
  })
  terrainCtrls.addSeparator();
  terrainCtrls.addInput(PARAMS, 'color', {
    label: "Color",
    view: 'color',
    picker: 'inline',
    expanded: false,
  })
  terrainCtrls.addInput(plane.material, 'wireframe');

  //folder for camera and lighting
  const camCtrls = ui.addFolder({
    title: "Camera Settings",
    expanded: false,
  })
  camCtrls.addInput(PARAMS, 'sunPos', {
    label: "Sun Position",
    min: 0,
    max: 180,
    step: 1,
  }).on('change', function( event ) {
    sun.position.x = PARAMS.sunDist * Math.cos( event.value * Math.PI / 180)
    sun.position.y = PARAMS.sunDist * Math.sin( event.value * Math.PI / 180) / 2
  })
  camCtrls.addButton({
    title: "Randomize Bloom",
  }).on('click', function( event ) {
    bloomPass.radius = (Math.random() * (5 - 0) + 0).toFixed(1)
    bloomPass.strength = (Math.random() * (5 - 0) + 0).toFixed(1)
    ui.refresh()
  })
  camCtrls.addInput(bloomPass, 'radius', {
    label: "Bloom Radius",
    min: 0,
    max: 5,
    step: 0.1,
  })
  camCtrls.addInput(bloomPass, 'strength', {
    label: "Bloom Strength",
    min: 0,
    max: 5,
    step: 0.1,
  })
  camCtrls.addInput(pixelPass.uniforms[ 'pixelSize' ], 'value', {
    label: "Pixel Size",
    min: 1,
    max: 20,
   step: 1,
  })
}

