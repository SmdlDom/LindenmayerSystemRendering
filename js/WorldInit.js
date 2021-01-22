function createWorld(scene) {
	const light = new THREE.DirectionalLight( 0xffffff, 1);
	light.position.set( 0, 10, 0 );
	light.castShadow = true;
	light.shadow.camera = new THREE.OrthographicCamera( -5, 5, 5, -5, 0.5, 1000 );
	light.shadow.mapSize.width = 2048*1;
	light.shadow.mapSize.height = 2048*1;
	scene.add(light);
	
	const alight = new THREE.AmbientLight( 0x404040 );
	scene.add(alight);

	const hlight = new THREE.HemisphereLight( 0xffffbb, 0x080820, 0.5 );
	scene.add(hlight);
	
	var planegeometry = new THREE.PlaneGeometry(2000, 2000);
	planegeometry.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
	var planematerial = new THREE.MeshLambertMaterial({color: 0x567d46})
	var planemesh = new THREE.Mesh(planegeometry, planematerial);
	planemesh.receiveShadow = true;
	scene.add(planemesh);
}

renderer.setClearColor( 0x87CEEB, 1 ); 
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.enabled = true;

createWorld(scene);

camera.position.y = 2;
camera.position.z = 8;
controls.target.y = 2;
controls.maxPolarAngle=Math.PI/2;
controls.update();