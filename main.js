import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import {Pane} from 'tweakpane'
import * as EssentialsPlugin from '@tweakpane/plugin-essentials'
import { Noise } from 'noisejs'

let scene, renderer, camera, controls
let sun, pgeo, pmat, plane
let fpsGraph

let noise = new Noise(Math.random());
let clock = new THREE.Clock();
console.log(clock)

let PARAMS = {
  sunPos: 90,
  sunDist: 500,
  complexity: 0.5,
  octaves: 6,
  color: 0xffffff,
  baseScale: 7,
  shiftSpeed: 5,
}

window.onload = (event) => {
  threeInit()
  uiInit()
  animate()
}

/*function updatePlane() {
  const vertCount = pgeo.attributes.position.count
  for (let i = 0; i < vertCount; i++) {
    const x = pgeo.attributes.position.getX(i)
    const y = pgeo.attributes.position.getY(i)
    const zval = PARAMS.mag1*noise.simplex2(x/100, y/100)
                +PARAMS.mag2*noise.simplex2((x+200)/50, y/50)*Math.pow(PARAMS.complexity, 1)
                +PARAMS.mag3*noise.simplex2((x+400)/25, y/25)*Math.pow(PARAMS.complexity, 2)
                +PARAMS.mag4*noise.simplex2((x+800)/12.5, y/12.5)*Math.pow(PARAMS.complexity, 3)
                +PARAMS.mag5*noise.simplex2((x+1600)/6.25, y/6.25)*Math.pow(PARAMS.complexity, 4)
                +PARAMS.mag6*noise.simplex2((x+3200)/3.125, y/3.125)*Math.pow(PARAMS.complexity, 5)
    pgeo.attributes.position.setZ(i, zval)
  }
  pgeo.computeVertexNormals()
  pgeo.attributes.position.needsUpdate = true
}*/

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
    antialias: true,
    canvas: document.querySelector( '#scene' ),
  })
  renderer.setPixelRatio( window.devicePixelRatio )
  renderer.setSize( window.innerWidth, window.innerHeight )

  // place a camera in the scene
  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 )
  camera.position.set( 100, 60, 100 )
  scene.add( camera )

  // allow 3js controls
  controls = new OrbitControls( camera, renderer.domElement )

  //create the sun
  sun = new THREE.PointLight( 0xffffff, 0.8, 1000 )
  sun.position.set( 0, PARAMS.sunDist, 0 )
  sun.castShadow = true
  scene.add( sun )

  const light = new THREE.AmbientLight( 0x040404 ); // soft white light
  scene.add( light );

  pgeo = new THREE.PlaneBufferGeometry(100, 100, 100, 100)
  pmat = new THREE.MeshPhongMaterial({color: 0x13fa03, wireframe: false})
  plane = new THREE.Mesh(pgeo, pmat)
  plane.rotation.x = - Math.PI / 2
  plane.receiveShadow = true
  plane.castShadow = true
  scene.add( plane )

}

function animate() {
  fpsGraph.begin()

  updatePlane()
  plane.material.color.setHex(PARAMS.color)

  requestAnimationFrame( animate )
	controls.update()
	renderer.render( scene, camera )

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
    title: "Terrain Controls"
  })
  terrainCtrls.addButton({
    title: 'Randomize Seed',
  }).on('click', function(event) {
    noise.seed(Math.random())
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
}
