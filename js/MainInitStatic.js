var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild( renderer.domElement );

var controls = new THREE.OrbitControls( camera, renderer.domElement );

camera.position.y = 3;
camera.position.z = 6;
controls.target.y = 3;
controls.update();

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function clearScene() {
	while(scene.children.length > 0){
		if (scene.children[0].geometry != null) {
			scene.children[0].geometry.dispose();
		}
		if (scene.children[0].material != null) {
			scene.children[0].material.dispose();
		}
		scene.remove(scene.children[0]); 
	}
}

window.addEventListener('resize', resize);
resize();