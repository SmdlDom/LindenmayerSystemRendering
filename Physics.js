
LSystem.Physics = {
	
	initTree: function (rootNode) {
		
		this.computeTreeMass(rootNode);
		
		var stack = [];
		stack.push(rootNode);
		
		while (stack.length > 0) {
			var currentNode = stack.pop();
			for (var i=0; i<currentNode.childNode.length; i++) {
				currentNode.childNode[i].parentNode=currentNode;
				stack.push(currentNode.childNode[i]);
			}

			currentNode.initialDir.subVectors(currentNode.p1,currentNode.p0);
			currentNode.bp0 = currentNode.p0.clone();
			currentNode.bp1 = currentNode.p1.clone();
			currentNode.rp0 = currentNode.p0.clone();
			currentNode.rp1 = currentNode.p1.clone();
			currentNode.vel = new THREE.Vector3();
			currentNode.strength = currentNode.a0;
		}
	},
	
	computeTreeMass: function (node) {
		var mass = 0;
		
		for (var i=0; i<node.childNode.length; i++) {
			mass += this.computeTreeMass(node.childNode[i]);
		}
		mass += node.a1;
		node.mass = mass;
		
		return mass;
	},
	
	applyForces: function (node, dt, time, rotationMatrix = new THREE.Matrix4()) {

		var u = Math.sin(1 * time) * 4;
		u += Math.sin(2.5 * time) * 2;
		u += Math.sin(5 * time) * 0.4;

		var v = Math.cos(1 * time + 56485) * 4;
		v += Math.cos(2.5 * time + 56485) * 2;
		v += Math.cos(5 * time + 56485) * 0.4;

		// Ajouter le vent
		node.vel.add(new THREE.Vector3(u / Math.sqrt(node.mass), 0, v / Math.sqrt(node.mass)).multiplyScalar(dt));
		// Ajouter la gravite
		node.vel.add(new THREE.Vector3(0, -node.mass, 0).multiplyScalar(dt));

		// TODO: Projection du mouvement, force de restitution et amortissement de la velocite


		//On commence par appliquer la rotation des branches parentes
		node.p1.applyMatrix4(rotationMatrix);

		//On calcul le nouveau vecteur (qui ne conserve pas la longueur)
		let initialVector = node.p1.clone().sub(node.p0);

		let p1NotProjected = node.p1.clone().add(node.vel.clone().multiplyScalar(dt));
		let finalVector = p1NotProjected.clone().sub(node.p0);

		//Matrice de la rotation entre le vecteur avant la vélocité et après
		let transformationMatrix = this.getMatrixRotation(initialVector, finalVector);
		//On fait les translations pour que la rotation soit fait avec node.p0 comme origin
		transformationMatrix.multiply(new THREE.Matrix4().makeTranslation(-node.p0.x, -node.p0.y, -node.p0.z));
		transformationMatrix.premultiply(new THREE.Matrix4().makeTranslation(node.p0.x, node.p0.y, node.p0.z));

		//On applique la transformation au noeud p1
		node.p1.applyMatrix4(transformationMatrix);

		//On change la vélocité pour la projeté
		let dir = new THREE.Vector3(0,0,0).subVectors(node.p1, initialVector.add(node.p0));
		node.vel = LSystem.Geometry.project(node.vel,dir)

		//On ajoute la transformation pour les prochains noeuds de l'arbre
		rotationMatrix.premultiply(transformationMatrix);

		node.rotationMatrix = rotationMatrix.clone();


		//RESTITUTION DE LA BRANCHE


		let nodeInitialDir = node.initialDir.clone();

		//Si ce n'est pas le rootNode
		if(node.parentNode!=null) {
			let currentParentDir = new THREE.Vector3(0,0,0);
			currentParentDir.subVectors(node.parentNode.p1, node.parentNode.p0);

			//Matrice de rotation du vecteur du parent initial vers le vecteur du parent présent
			let rotationParent = this.getMatrixRotation(node.parentNode.initialDir, currentParentDir);

			//Appliquer la rotation du parent à la position initial du p1 de ce noeud
			nodeInitialDir.add(node.parentNode.initialDir);
			nodeInitialDir.applyMatrix4(rotationParent);

			//On obtient la valeur de p1 "naturel" de la branche de ce noeud au temps présent
			nodeInitialDir.add(node.parentNode.p0).sub(node.p0);

		}

		//Vecteur de la branche présentement
		let nodeCurrentDir = new THREE.Vector3(0,0,0);
		nodeCurrentDir.subVectors(node.p1,node.p0);

		//Vecteur normal et angle de restitution
		let restitutionVector = (nodeInitialDir.clone().sub(nodeCurrentDir)).normalize();
		let [axis, angle] = LSystem.Geometry.findRotation(nodeInitialDir,nodeCurrentDir);

		restitutionVector.multiplyScalar(Math.pow(angle,2)*1000*node.strength);


		//Mise à jour de la vélocité
		node.vel.add(restitutionVector).multiplyScalar(0.7);


		// Appel recursif sur les enfants
		for (var i=0; i<node.childNode.length; i++) {
			node.childNode[i].p0 = node.p1;
			this.applyForces(node.childNode[i], dt, time, rotationMatrix.clone());
		}
	},

	getMatrixRotation: function(initialVector, finalVector){
		let initial = initialVector.clone().normalize();
		let final = finalVector.clone().normalize();

		let quaternion = new THREE.Quaternion();
		quaternion.setFromUnitVectors(initial, final);
		let matrix = new THREE.Matrix4();
		matrix.makeRotationFromQuaternion(quaternion);
		return matrix;
	},
	
	
	
}