import * as THREE from "https://threejs.org/build/three.module.js";
// import { GLTFLoader } from 'https://threejs.org/examples/jsm/loaders/GLTFLoader.js';

import { ARButton } from "https://threejs.org/examples/jsm/webxr/ARButton.js";

var container;
var camera, scene, renderer;
var controller;

var reticle;

var hitTestSource = null;
var hitTestSourceRequested = false;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  //

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  //

  let options = {
    requiredFeatures: ["hit-test"],
    optionalFeatures: ["dom-overlay"]
  };

  options.domOverlay = { root: document.getElementById("content") };

  document.body.appendChild(ARButton.createButton(renderer, options));
  //

  var geometry = new THREE.CylinderBufferGeometry(0.1, 0.1, 0.2, 32).translate(
    0,
    0.1,
    0
  );

  var gltfLoader = new THREE.GLTFLoader();
  gltfLoader.crossOrigin = true;

  gltfLoader.load(
    "https://github.com/etchng/TED/blob/main/3d/eye.glb?raw=true",

    function ecorcheLoader(object) {
      var localPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 2);
      // scene.add( localPlane );

      // var textureLoader = new THREE.TextureLoader();
      // var ecorcheNormal = textureLoader.load('/3D/ecorche NM.png');

      var newMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.5,

        //   normalMapType: 3,
        clippingPlanes: [localPlane],
        clipShadows: true,

        stencilWrite: true,
        stencilRef: 0,
        stencilFunc: THREE.NotEqualStencilFunc,
        stencilFail: THREE.ReplaceStencilOp,
        stencilZFail: THREE.ReplaceStencilOp,
        stencilZPass: THREE.ReplaceStencilOp
      });

      // gltf loads an entire scene. You could use the scene directly or pull the objects out of the scene like below:
      // let obj = object.scene.children[0];
      let obj = object.scene;
      obj.position.set(0, 0.1, 0);
      // obj.position.set(0, 0.35, 0);
      obj.traverse((n) => {
        if (n.isMesh) {
          n.castShadow = true;
          n.receiveShadow = true;

          if (n.material.map) n.material.map.anisotropy = 1;
        }
      });

      object.scene.children[0].traverse((o) => {
        if (o.isMesh) o.material = newMaterial;
        renderer.localClippingEnabled = true;
      });

      obj.scale.set(1.15, 1.15, 1.15);
      obj.rotation.set(0, 0.15, 0);
      console.log(obj);

      scene.add(obj);

      //         const slider = document.querySelector('.main__slider');

      //         slider.addEventListener('input', (event) => {

      //           const value = parseFloat(event.target.value);

      //           localPlane.constant = value * 0.05;

      //         });

      //         animate();
    }
  );

  function onSelect() {
    if (reticle.visible) {
      var material = new THREE.MeshPhongMaterial({
        color: 0xffffff * Math.random()
      });
      var mesh = new THREE.Mesh(geometry, material);
      mesh.position.setFromMatrixPosition(reticle.matrix);
      mesh.scale.y = Math.random() * 2 + 1;
      scene.add(mesh);
    }
  }

  controller = renderer.xr.getController(0);
  controller.addEventListener("select", onSelect);
  scene.add(controller);

  reticle = new THREE.Mesh(
    new THREE.RingBufferGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial()
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  //

  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
  if (frame) {
    var referenceSpace = renderer.xr.getReferenceSpace();
    var session = renderer.xr.getSession();

    if (hitTestSourceRequested === false) {
      session.requestReferenceSpace("viewer").then(function (referenceSpace) {
        session
          .requestHitTestSource({ space: referenceSpace })
          .then(function (source) {
            hitTestSource = source;
          });
      });

      session.addEventListener("end", function () {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });

      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      var hitTestResults = frame.getHitTestResults(hitTestSource);

      if (hitTestResults.length) {
        var hit = hitTestResults[0];

        reticle.visible = true;
        reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }

  renderer.render(scene, camera);
}
