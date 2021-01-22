LSystem.Render = {
	drawTreeRough: function (rootNode, scene, alpha, radialDivisions = 8, leavesCutoff = 0.1,
							 leavesDensity = 10, matrix = new THREE.Matrix4()) {
		let stack = [];
		stack.push(rootNode);

		let branchesStack = [];
		let leavesStack = [];

		while (stack.length > 0) {
			let currNode = stack.pop();
			for (let i=0; i<currNode.childNode.length; i++) {
				stack.push(currNode.childNode[i]);
			}

			let vectorBranch = new THREE.Vector3(0,0,0).subVectors(currNode.p1, currNode.p0);
			let heightBranch = vectorBranch.length();

			let geometryBranch = new THREE.CylinderBufferGeometry(currNode.a1, currNode.a0, heightBranch, radialDivisions);
			//On fait une translation pour que le sommet p0 soit à l'origine
			geometryBranch.translate(0, heightBranch/2, 0);

			//Rotationner la branche
			//Pour trouver les angles on utilise le fait que heightBranch correspond au vecteur intial (0,height,0) et
			//vectorBranch correspond au vecteur final
			let eulerAngles = this.getEulerAngles(heightBranch, vectorBranch);
			this.rotateGeometry(geometryBranch, eulerAngles);
			geometryBranch.translate(currNode.p0.x, currNode.p0.y, currNode.p0.z);
			branchesStack.push(geometryBranch);

			//Feuilles
			if(currNode.a0 < alpha*leavesCutoff) {
				let heightLeaves = heightBranch;
				if (currNode.childNode.length == 0) {
					heightLeaves += alpha;
				}
				let leavesGeometry = this.getSquareLeaves(heightLeaves, leavesDensity, alpha);
				this.rotateGeometry(leavesGeometry, eulerAngles);
				leavesGeometry.translate(currNode.p0.x, currNode.p0.y, currNode.p0.z);
				leavesStack.push(leavesGeometry);
			}

		}

		//BRANCHES
		let branchesGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(branchesStack, false);
		let branchesMaterial = new THREE.MeshLambertMaterial({color: 0x8B5A2B});
		let branches = new THREE.Mesh(branchesGeometry, branchesMaterial);
		branches.applyMatrix4(matrix);
		scene.add(branches);

		//FEUILLES
		let leavesGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(leavesStack, false);
		let leavesMaterial = new THREE.MeshPhongMaterial({color: 0x3A5F0B});
		let leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
		leaves.applyMatrix4(matrix);
		scene.add(leaves);

	},

	//On obtient les angles d'Euler à partir THREE.quaternion
	//On considère qu'on départ la géométrie est centré en 0 et est sur le long de l'angle des y
	getEulerAngles: function(height, finalVector){
		let initialVector = new THREE.Vector3(0,height,0);
		initialVector.normalize();
		finalVector.normalize();

		let quaternion = new THREE.Quaternion();
		quaternion.setFromUnitVectors(initialVector, finalVector);
		let euler = new THREE.Euler();
		euler.setFromQuaternion(quaternion);
		return euler;
	},

	rotateGeometry: function(geometry, eulerAngles){
		geometry.rotateZ(eulerAngles.z);
		geometry.rotateY(eulerAngles.y);
		geometry.rotateX(eulerAngles.x);
	},

	//Utilisé pour faire les feuilles  de RenderRough
	getSquareLeaves: function(heightLeaves, leavesDensity, alpha){
		let leavesStack = [];
		for(var i=0; i<leavesDensity; i++){
			let leavesGeometry = new THREE.PlaneBufferGeometry(alpha,alpha);

			let randomAngle = Math.random()*2*Math.PI;
			let randomRadius = Math.random()*alpha/2;
			let randomHeight = Math.random()*heightLeaves;
			let randomInclination1 = Math.random()*2*Math.PI;
			let randomInclination2 = Math.random()*2*Math.PI;
			let randomInclination3 = Math.random()*2*Math.PI;

			let x = randomRadius*Math.sin(randomAngle);
			let z = randomRadius*Math.cos(randomAngle);
			let y = randomHeight;


			leavesGeometry.rotateX(randomInclination1);
			leavesGeometry.rotateY(randomInclination2);
			leavesGeometry.rotateZ(randomInclination3);
			leavesGeometry.translate(x,y,z);

			leavesStack.push(leavesGeometry);
		}
		return THREE.BufferGeometryUtils.mergeBufferGeometries(leavesStack, false);
	},
	
	drawTreeHermite: function (rootNode, scene, alpha, leavesCutoff = 0.1,
							   leavesDensity = 10, matrix = new THREE.Matrix4()) {

		let stack = [];
		stack.push(rootNode);
		let currentIndex = 0; //index pour les branches
		let leavesCurrentIndex = 0; //index pour les feuilles
		let leavesVertices = []; //Coordonnées des feuilles
		let leavesFacesIdx = []; //index des faces des feuilles
		const vertices = [];//Coordonnées des branches
		const facesIdx = [];//index des faces des branches


		while (stack.length > 0) {
			let currNode = stack.pop();
			for (let i=0; i<currNode.childNode.length; i++) {
				stack.push(currNode.childNode[i]);
			}

			let subIndexList=[];

			//On remplie les tableaux vertices et leavesVertices et on donne les indices aux noeuds
			for(let i=0; i<(currNode.sections.length); i++) {
				subIndexList = [];

				//On ajoute le milieu pour la branche racine
				if(currNode.parentNode==null && i==0) {
					let meanPoint = LSystem.Geometry.meanPoint(currNode.sections[i]);
					vertices.push(meanPoint.x,meanPoint.y,meanPoint.z);
					currNode.meanIdx = currentIndex;
					currentIndex++;
					//On ajoute la première section seulement pour la branche racine
					for (let j = 0; j < currNode.sections[i].length; j++) {
						vertices.push(currNode.sections[i][j].x, currNode.sections[i][j].y, currNode.sections[i][j].z);
						subIndexList.push(currentIndex);
						currentIndex++;
					}
				}else if(currNode.parentNode!=null && i==0){
					let position = currNode.parentNode.indexList.length-1;
					//Sinon la première section est la même que la dernière section du précédent
					for(let j=0; j<currNode.parentNode.indexList[position].length;j++){
						subIndexList.push(currNode.parentNode.indexList[position][j]);
					}
				}

				if(i!=0){
					//Si ce n'est pas la première section, on ajoute les vertices
					for (let j = 0; j < currNode.sections[i].length; j++) {
						vertices.push(currNode.sections[i][j].x, currNode.sections[i][j].y, currNode.sections[i][j].z);
						subIndexList.push(currentIndex);
						currentIndex++;
					}
				}


				currNode.indexList.push(subIndexList);

				//On ajoute le milieu pour les branches terminales
				if(currNode.childNode.length==0 && i==currNode.sections.length-1) {
					let meanPoint = LSystem.Geometry.meanPoint(currNode.sections[i]);
					vertices.push(meanPoint.x,meanPoint.y,meanPoint.z);
					currNode.meanIdx = currentIndex;
					currentIndex++;
				}
			}


			//On ajoute à faceIdx les index pour dessiner les triangles
			for(let i=0; i<(currNode.indexList.length-1);i++){
				let len = currNode.indexList[i].length;

				for(let j=0; j<len; j++){
					//Points utilisés pour les triangles entre les deux segments
					let point1 = currNode.indexList[i][j];
					let point2 = currNode.indexList[i][(j+1)%len];
					let point3 = currNode.indexList[i+1][j];
					let point4 = currNode.indexList[i+1][(j+1)%len];
					facesIdx.push(point1,point2,point3);
					facesIdx.push(point2,point4,point3);

					//On ferme la première branche (Root node)
					if(currNode.parentNode==null && i==0){
						facesIdx.push(currNode.meanIdx,point2,point1);
					}

					//On ferme les dernières branches (Leaf node)
					if(currNode.childNode.length==0 && i==currNode.sections.length-2){
						facesIdx.push(currNode.meanIdx,point3,point4);
					}

				}
			}

			//Feuilles
			if(currNode.a0 < alpha*leavesCutoff) {
				//On trouve l'angle de rotation de la branche
				let vectorBranch = new THREE.Vector3(0,0,0).subVectors(currNode.p1, currNode.p0);
				let heightLeaves = vectorBranch.length();
				let [axis,angle] = LSystem.Geometry.findRotation(new THREE.Vector3(0,heightLeaves,0), vectorBranch);

				//Si c'est une branche terminale, on fait dépasser les feuilles
				if (currNode.childNode.length == 0) {
					heightLeaves += alpha;
				}

				for(var i=0; i<leavesDensity; i++) {

					//On génère aléatoirement une feuille autour de la branche
					let [point1,point2,point3] = this.generateLeaf(currNode, alpha, heightLeaves);


					//On déplace les points selon la position et l'orientation de la branche
					let transformationMatrix = new THREE.Matrix4().makeRotationAxis(axis,angle);

					transformationMatrix.premultiply(new THREE.Matrix4().makeTranslation(currNode.p0.x, currNode.p0.y, currNode.p0.z));

					point1.applyMatrix4(transformationMatrix);
					point2.applyMatrix4(transformationMatrix);
					point3.applyMatrix4(transformationMatrix);


					//On ajoute les points de la feuille aux tableau de vertices
					let subLeavesIndex = [];
					leavesVertices.push(point1.x, point1.y, point1.z);

					subLeavesIndex.push(leavesCurrentIndex);
					leavesCurrentIndex++;

					leavesVertices.push(point2.x, point2.y, point2.z);
					subLeavesIndex.push(leavesCurrentIndex);
					leavesCurrentIndex++;

					leavesVertices.push(point3.x, point3.y, point3.z);
					subLeavesIndex.push(leavesCurrentIndex);
					leavesCurrentIndex++;


					//On ajoute les index au tableau d'index du noeud et au tableau des index des faces
					currNode.leavesIndexList.push(subLeavesIndex);
					leavesFacesIdx.push(subLeavesIndex[0],subLeavesIndex[1],subLeavesIndex[2]);

				}
			}

		}

		//BRANCHES
		const f32vertices = new Float32Array(vertices);
		const branchesGeometry = new THREE.BufferGeometry();
		branchesGeometry.setAttribute("position", new THREE.BufferAttribute(f32vertices, 3));
		branchesGeometry.setIndex(facesIdx);
		branchesGeometry.computeVertexNormals();

		let branchesMaterial = new THREE.MeshLambertMaterial({color: 0x8B5A2B});
		let branches = new THREE.Mesh(branchesGeometry, branchesMaterial);
		branches.applyMatrix4(matrix);
		scene.add(branches);

		//FEUILLES
		const f32verticesLeaves = new Float32Array(leavesVertices);
		const leavesGeometry = new THREE.BufferGeometry();

		leavesGeometry.setAttribute("position", new THREE.BufferAttribute(f32verticesLeaves, 3));
		leavesGeometry.setIndex(leavesFacesIdx);
		leavesGeometry.computeVertexNormals();

		let leavesMaterial = new THREE.MeshPhongMaterial({color: 0x3A5F0B, side:THREE.DoubleSide});
		let leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
		leaves.applyMatrix4(matrix);
		scene.add(leaves);


		return [branchesGeometry, leavesGeometry];
	},

	//On
	generateLeaf: function(currNode, alpha, heightLeaves){
		//On fait un triangle équilatéral centré en (0,0,0)
		//Alpha est la distance entre un sommet et la face du côté opposé
		let width = alpha / Math.tan(Math.PI / 3.0);
		let point1 = new THREE.Vector3(-width, -alpha / 2.0, 0);
		let point2 = new THREE.Vector3(0, alpha / 2.0, 0);
		let point3 = new THREE.Vector3(width, -alpha / 2.0, 0);

		//On applique une rotation pour modifier l'orientation des feuilles
		let randomInclination1 = new THREE.Matrix4().makeRotationX(Math.random() * 2 * Math.PI);
		let randomInclination2 = new THREE.Matrix4().makeRotationY(Math.random() * 2 * Math.PI);
		let randomInclination3 = new THREE.Matrix4().makeRotationZ(Math.random() * 2 * Math.PI);

		//On génère une position aléatoire sur la branche
		let randomAngle = Math.random() * 2 * Math.PI;
		let randomRadius = Math.random() * alpha / 2;
		let randomHeight = Math.random() * heightLeaves;

		let x = randomRadius * Math.sin(randomAngle);
		let z = randomRadius * Math.cos(randomAngle);
		let y = randomHeight;

		let transformationMatrix = new THREE.Matrix4().makeTranslation(x,y,z);
		transformationMatrix.multiply(randomInclination1.premultiply(randomInclination2).premultiply(randomInclination3));

		point1.applyMatrix4(transformationMatrix);
		point2.applyMatrix4(transformationMatrix);
		point3.applyMatrix4(transformationMatrix);


		return [point1,point2,point3]
	},
	
	updateTreeHermite: function (trunkGeometryBuffer, leavesGeometryBuffer, rootNode) {

		let stack = [];
		stack.push(rootNode);


		while (stack.length > 0) {
			let currentNode = stack.pop();
			for (let i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}


			//Mettre à jour le point représentant le bout des branches terminales
			if (currentNode.childNode.length == 0) {
				let index = currentNode.meanIdx * 3;
				let point = new THREE.Vector3(trunkGeometryBuffer[index], trunkGeometryBuffer[index + 1], trunkGeometryBuffer[index + 2]);

				point.applyMatrix4(currentNode.rotationMatrix);

				trunkGeometryBuffer[index] = point.x;
				trunkGeometryBuffer[index + 1] = point.y;
				trunkGeometryBuffer[index + 2] = point.z;
			}

			//Mettre à jour les branches
			for (let i = 1; i < currentNode.indexList.length; i++) {
				for (let j = 0; j < currentNode.indexList[i].length; j++) {
					let index = currentNode.indexList[i][j] * 3;

					let point = new THREE.Vector3(trunkGeometryBuffer[index], trunkGeometryBuffer[index + 1], trunkGeometryBuffer[index + 2]);

					point.applyMatrix4(currentNode.rotationMatrix);

					trunkGeometryBuffer[index] = point.x;
					trunkGeometryBuffer[index + 1] = point.y;
					trunkGeometryBuffer[index + 2] = point.z;

				}
			}

			//Mettre à jour les feuilles
			for (let i = 0; i < currentNode.leavesIndexList.length; i++) {
				for (let j = 0; j < currentNode.leavesIndexList[i].length; j++) {
					let index = currentNode.leavesIndexList[i][j] * 3;

					let point = new THREE.Vector3(leavesGeometryBuffer[index], leavesGeometryBuffer[index + 1], leavesGeometryBuffer[index + 2]);

					point.applyMatrix4(currentNode.rotationMatrix);


					leavesGeometryBuffer[index] = point.x;
					leavesGeometryBuffer[index + 1] = point.y;
					leavesGeometryBuffer[index + 2] = point.z;

				}
			}
		}

	},
	
	drawTreeSkeleton: function (rootNode, scene, color = 0xffffff, matrix = new THREE.Matrix4()) {
		
		var stack = [];
		stack.push(rootNode);
			
		var points = [];
		
		while (stack.length > 0) {
			var currentNode = stack.pop();
			
			for (var i=0; i<currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}
			
			points.push(currentNode.p0);
			points.push(currentNode.p1);
			
		}
		
		var geometry = new THREE.BufferGeometry().setFromPoints(points);
		var material = new THREE.LineBasicMaterial({color: color});
		var line = new THREE.LineSegments(geometry, material);
		line.applyMatrix4(matrix);
		scene.add(line);
		
		return line.geometry;
	},
	
	updateTreeSkeleton: function (geometryBuffer, rootNode) {
		
		var stack = [];
		stack.push(rootNode);
		
		var idx = 0;
		while (stack.length > 0) {
			var currentNode = stack.pop();
			
			for (var i=0; i<currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}
			geometryBuffer[idx * 6] = currentNode.p0.x;
			geometryBuffer[idx * 6 + 1] = currentNode.p0.y;
			geometryBuffer[idx * 6 + 2] = currentNode.p0.z;
			geometryBuffer[idx * 6 + 3] = currentNode.p1.x;
			geometryBuffer[idx * 6 + 4] = currentNode.p1.y;
			geometryBuffer[idx * 6 + 5] = currentNode.p1.z;
			
			idx++;
		}
	},
	
	
	drawTreeNodes: function (rootNode, scene, color = 0x00ff00, size = 0.05, matrix = new THREE.Matrix4()) {
		
		var stack = [];
		stack.push(rootNode);
			
		var points = [];
		
		while (stack.length > 0) {
			var currentNode = stack.pop();
			
			for (var i=0; i<currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}
			
			points.push(currentNode.p0);
			points.push(currentNode.p1);
			
		}
		
		var geometry = new THREE.BufferGeometry().setFromPoints(points);
		var material = new THREE.PointsMaterial({color: color, size: size});
		var points = new THREE.Points(geometry, material);
		points.applyMatrix4(matrix);
		scene.add(points);
		
	},
	
	
	drawTreeSegments: function (rootNode, scene, lineColor = 0xff0000, segmentColor = 0xffffff, orientationColor = 0x00ff00, matrix = new THREE.Matrix4()) {
		
		var stack = [];
		stack.push(rootNode);
			
		var points = [];
		var pointsS = [];
		var pointsT = [];
		
		while (stack.length > 0) {
			var currentNode = stack.pop();
			
			for (var i=0; i<currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}
			const segments = currentNode.sections;
			for (var i=0; i<segments.length-1; i++) {
				points.push(LSystem.Geometry.meanPoint(segments[i]));
				points.push(LSystem.Geometry.meanPoint(segments[i+1]));
			}
			for (var i=0; i<segments.length; i++) {
				pointsT.push(LSystem.Geometry.meanPoint(segments[i]));
				pointsT.push(segments[i][0]);
			}
			
			for (var i=0; i<segments.length; i++) {
				for (var j=0; j<segments[i].length-1; j++) {
					pointsS.push(segments[i][j]);
					pointsS.push(segments[i][j+1]);
				}
				pointsS.push(segments[i][0]);
				pointsS.push(segments[i][segments[i].length-1]);
			}
		}
		
		var geometry = new THREE.BufferGeometry().setFromPoints(points);
		var geometryS = new THREE.BufferGeometry().setFromPoints(pointsS);
		var geometryT = new THREE.BufferGeometry().setFromPoints(pointsT);

		var material = new THREE.LineBasicMaterial({color: lineColor});
		var materialS = new THREE.LineBasicMaterial({color: segmentColor});
		var materialT = new THREE.LineBasicMaterial({color: orientationColor});
		
		var line = new THREE.LineSegments(geometry, material);
		var lineS = new THREE.LineSegments(geometryS, materialS);
		var lineT = new THREE.LineSegments(geometryT, materialT);
		
		line.applyMatrix4(matrix);
		lineS.applyMatrix4(matrix);
		lineT.applyMatrix4(matrix);
		
		scene.add(line);
		scene.add(lineS);
		scene.add(lineT);
		
	}
}