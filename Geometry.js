
class Node {
	constructor (parentNode) {
		this.parentNode = parentNode; //Noeud parent
		this.childNode = []; //Noeud enfants
		
		this.p0 = null; //Position de depart de la branche
		this.p1 = null; //Position finale de la branche
		
		this.a0 = null; //Rayon de la branche a p0
		this.a1 = null; //Rayon de la branche a p1

		//Les axes des branches au point p0
		//Utilisé pour les splines
		this.axisX = new THREE.Vector3(1,0,0);
		this.axisY = new THREE.Vector3(0,1,0);
		this.axisZ = new THREE.Vector3(0,0,1);

		//Utilisé pour trouver la rotation d'une branche pour l'animation
		this.initialDir = new THREE.Vector3(0,0,0);
		this.rotationMatrix = new THREE.Matrix4();
		this.indexList = [];
		this.leavesIndexList = [];
		this.sections = null; //Liste contenant une liste de points representant les segments circulaires du cylindre generalise
	}
}

LSystem.Geometry = {
	rotateMat: function(matrix, angle, axis) {
		let rotationM = new THREE.Matrix4();
		rotationM.makeRotationAxis(axis, angle);

		return new THREE.Matrix4().multiplyMatrices(matrix,rotationM);
	},

	translateMat: function (matrix, x, y, z){
		var translationM = new THREE.Matrix4();
		translationM.makeTranslation(x, y, z)
		return new THREE.Matrix4().multiplyMatrices(matrix,translationM);
	},

	generateSkeleton: function (str, theta, alpha, decay) {
		let turtle = new THREE.Matrix4();
		let rootNode = new Node();
		let currNode = new Node();
		let init = false;
		let stack = [];

		for(let i = 0;i<str.length;i++) {
			switch(str[i]) {
				case "[":
					stack.push([currNode, (turtle)]);
					break;
				case "]":
					let prevState = stack.pop();
					currNode = prevState[0];
					turtle = prevState[1];
					break;
				case "+":
					turtle = this.rotateMat(turtle, theta, new THREE.Vector3(1,0,0));
					break;
				case "-":
					turtle = this.rotateMat(turtle, -theta, new THREE.Vector3(1,0,0));
					break;
				case "/":
					turtle = this.rotateMat(turtle, theta, new THREE.Vector3(0,1,0));
					break;
				case "\\":
					turtle = this.rotateMat(turtle, -theta, new THREE.Vector3(0,1,0));
					break;
				case "^":
					turtle = this.rotateMat(turtle, theta, new THREE.Vector3(0,0,1));
					break;
				case "_":
					turtle = this.rotateMat(turtle, -theta, new THREE.Vector3(0,0,1));
					break;
				default:
					if (!init) {
						rootNode.a0 = alpha;
						rootNode.p0 = new THREE.Vector3(0, 0, 0);
						rootNode.a1 = alpha * decay;
						rootNode.p1 = new THREE.Vector3(0,alpha,0);
						init = true;
						currNode = rootNode;
					} else {
						let newNode = new Node(currNode);
						newNode.a0 = newNode.parentNode.a1;
						newNode.p0 = newNode.parentNode.p1;
						newNode.a1 = newNode.a0 * decay;
						newNode.p1 = new THREE.Vector3(0,0,0).addVectors(
							newNode.p0, new THREE.Vector3(0,alpha,0).applyMatrix4(turtle));
						currNode.childNode.push(newNode);
						currNode = newNode;
					}
					break;
			}
		}
		return rootNode;
	},
	
	simplifySkeleton: function (rootNode, rotationThreshold = 0.0001) {

		let toTreat = [];

		if (rootNode.childNode.length > 1) {

			toTreat = rootNode.childNode;
			for (let i = 0; i < toTreat.length; i++) {
				this.simplifySkeleton(rootNode.childNode[i], rotationThreshold);
			}
		} else if (rootNode.childNode.length === 1) {
			let rotation = this.findRotation(new THREE.Vector3().subVectors(rootNode.p0, rootNode.p1),
				new THREE.Vector3().subVectors(rootNode.childNode[0].p0, rootNode.childNode[0].p1));
			if ( rotation[1] <= rotationThreshold) {
				rootNode.a1 = rootNode.childNode[0].a1;
				rootNode.p1 = rootNode.childNode[0].p1.clone();

				rootNode.childNode = rootNode.childNode[0].childNode;
				rootNode.childNode.parentNode = rootNode;
				this.simplifySkeleton(rootNode, rotationThreshold);
			} else this.simplifySkeleton(rootNode.childNode[0], rotationThreshold);
		}
		return rootNode;
	},

	generateSegmentsHermite: function (rootNode, lengthDivisions = 4, radialDivisions = 8) {
		//Paramètres pour la spline d'Hermite
		//h0 et h1 sont les points, v0 et v1 sont les vecteurs
		var stack = [];
		stack.push(rootNode);


		while (stack.length > 0) {
			var currentNode = stack.pop();
			for (var i = 0; i < currentNode.childNode.length; i++) {
				currentNode.childNode[i].parentNode = currentNode;
				stack.push(currentNode.childNode[i]);
			}
			currentNode.sections = [];
			let h0 = currentNode.p0.clone();
			let h1 = currentNode.p1.clone();
			let v0 = null;
			//S'il n'y a pas de parent, v0=v1
			if(currentNode.parentNode==null){
				v0 = h1.clone().sub(h0);

			}else{
				v0 = currentNode.parentNode.p1.clone().sub(currentNode.parentNode.p0);
			}
			let v1 = h1.clone().sub(h0);

			//On crée une quantité radialDivisions de sections avec la première section au point p0
			//Pour les branches finales, on ajoute une section qui représente p1
			for(let i=0; i<(lengthDivisions); i++){
				let section = [];
				//on calcul le point et la tangente (Hermite)
				let t = 0 + i/(lengthDivisions-1);
				let [p, dp] = this.hermite(h0,h1,v0,v1,t);

				//On calcul l'axe de rotation au point p0 du node (correspond à i=0) à partir de celui du parent
				if(i==0 && currentNode.parentNode!=null){
					currentNode.axisY = dp.clone();
					let rotationMatrix = this.getMatrixRotation(currentNode.parentNode.axisY, currentNode.axisY);
					currentNode.axisX = currentNode.parentNode.axisX.clone().applyMatrix4(rotationMatrix);
					currentNode.axisZ = currentNode.parentNode.axisZ.clone().applyMatrix4(rotationMatrix);
				}
				//On calcule les axes utilisés pour les segments
				let rotationMatrix = this.getMatrixRotation(currentNode.axisY, dp);
				let axisX = currentNode.axisX.clone().applyMatrix4(rotationMatrix);
				let axisZ = currentNode.axisZ.clone().applyMatrix4(rotationMatrix);

				//Rayon de la branche au segment, interpolation simple
				let a = currentNode.a0 + t*(currentNode.a1-currentNode.a0);



				for(let j=0; j<radialDivisions; j++){
					let angle = j /radialDivisions * (2 * Math.PI);
					let x = axisX.clone().multiplyScalar(a*Math.sin(angle));
					let z = axisZ.clone().multiplyScalar(a*Math.cos(angle));

					let point = new THREE.Vector3(0,0,0);
					point.addVectors(x,z);
					point.add(p);
					section.push(point);

				}
				currentNode.sections.push(section);
			}
		}
	},
	
	hermite: function (h0, h1, v0, v1, t) {


		let A = h0.clone();
		let B = new THREE.Vector3();
		B.addVectors(h0, v0.clone().multiplyScalar(1/3));
		let C = new THREE.Vector3();
		C.addVectors(h1, v1.clone().multiplyScalar(-1/3));
		let D = h1.clone();

		let AB = (A.clone().multiplyScalar(1-t)).add(B.clone().multiplyScalar(t));
		let BC = (B.clone().multiplyScalar(1-t)).add(C.clone().multiplyScalar(t));
		let CD = (C.clone().multiplyScalar(1-t)).add(D.clone().multiplyScalar(t));

		let AC = (AB.clone().multiplyScalar(1-t)).add(BC.clone().multiplyScalar(t));
		let BD = (BC.clone().multiplyScalar(1-t)).add(CD.clone().multiplyScalar(t));

		let AD = (AC.clone().multiplyScalar(1-t)).add(BD.clone().multiplyScalar(t));

		const p = AD;
		const dp = new THREE.Vector3(0,0,0).subVectors(BD, AC).normalize();

		return [p, dp];
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
	
	// Trouver l'axe et l'angle de rotation entre deux vecteurs
	findRotation: function (a, b) {
		const axis = new THREE.Vector3().crossVectors(a, b).normalize();
		var c = a.dot(b)/(a.length() * b.length());
		
		if (c < -1) {
			c = -1;
		} else if (c > 1) {
			c = 1;
		}
		
		const angle = Math.acos(c);
		
		return [axis, angle];
	},
	
	// Projeter un vecteur a sur b
	project: function (a, b) {
		return b.clone().multiplyScalar(a.dot(b) / (b.lengthSq()));
	},
	
	// Trouver le vecteur moyen d'une liste de vecteurs
	meanPoint: function (points) {
		var mp = new THREE.Vector3();
		
		for (var i=0; i<points.length; i++) {
			mp.add(points[i]);
		}
		
		return mp.divideScalar(points.length);
	}

};