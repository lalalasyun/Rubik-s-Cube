import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
const canvas = renderer.domElement
document.body.appendChild(canvas);

const controls = new OrbitControls(camera, canvas);

controls.enableDamping = true;
controls.dampingFactor = 0.2;


class Rubiks {
    model = new THREE.Object3D();
    rubik = new THREE.Object3D();
    nowPivotList = new THREE.Object3D();
    position = { x: 0, y: 0, z: 0 }
    rotation = { x: 0, y: 0, z: 0 }

    constructor(w, h, z) {
        this._size = { x: w, y: h, z: z };
        this.offset = { x: (w - 1) / 2, y: (h - 1) / 2, z: (z - 1) / 2 };
        this.initCubeList();
        this.initMeshList();
        this.model.add(this.rubik);
    }
    get model() { return this.model; }

    setRubikPosition(x = 0, y = 0, z = 0, multiply = false) {
        if (multiply) {
            this.position.x += x;
            this.position.y += y;
            this.position.z += z;
        } else {
            this.position = { x: x, y: y, z: z };
        }
        this.updateRubik();
    }

    setRubikRotation(x = 0, y = 0, z = 0, multiply = false) {
        if (multiply) {
            this.rotation.x += x;
            this.rotation.y += y;
            this.rotation.z += z;
        } else {
            this.rotation = { x: x, y: y, z: z };
        }
        this.updateRubik();
    }

    updateRubik() {
        this.rubik.position.set(this.position.x, this.position.y, this.position.z);
        this.rubik.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
        this.nowPivotList.position.set(this.position.x, this.position.y, this.position.z);
        this.nowPivotList.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
    }

    threeDimensionalArray(func) {
        for (let z = 0; z < this._size.z; z++) {
            for (let y = 0; y < this._size.y; y++) {
                for (let x = 0; x < this._size.x; x++) {
                    func(z, y, x);
                }
            }
        }
    }

    drawMeshList() {
        this.threeDimensionalArray((z, y, x) => {
            this.nowMeshList[z][y][x].removeFromParent();
        })
        for (let i = 1; i < this.model.children.length; i++) {
            this.model.children[i].removeFromParent();
        }
        this.initMeshList();
        this.threeDimensionalArray((z, y, x) => {
            this.rubik.add(this.nowMeshList[z][y][x]);
        })
    }


    initMeshList() {
        const resultCubes = this.getList();
        this.threeDimensionalArray((z, y, x) => {
            const mesh = Cube.makeMesh(this._cubes[z][y][x].materialMap);
            mesh.position.set(x - this.offset.x, y - this.offset.y, z - this.offset.z);
            resultCubes[z][y][x] = mesh;
        })
        this.nowMeshList = resultCubes;
    }

    initCubeList() {
        this._cubes = this.getList();
        this.threeDimensionalArray((z, y, x) => {
            this._cubes[z][y][x] = new Cube();
        })
    }

    rotationMesh(axis, index, angle) {
        this.nowPivotList = new THREE.Object3D();
        const getRotationAllMesh = (ax, index) => {
            this.threeDimensionalArray((z, y, x) => {
                if ((ax == 'x' && index == x) || (ax == 'y' && index == y) || (ax == 'z' && index == z)) {
                    const mesh = Cube.makeMesh(this._cubes[z][y][x].materialMap);
                    mesh.position.set(x - this.offset.x, y - this.offset.y, z - this.offset.z);
                    this.nowPivotList.add(mesh);
                    this.nowMeshList[z][y][x].removeFromParent();
                }
            });
        }
        getRotationAllMesh(axis, index);
        this.updateRubik();
        this.model.add(this.nowPivotList);
        const pivot = new Pivot(this.nowPivotList, index, axis, this);
        pivot.rotation(angle);
    }

    rotationCubes(axis, index, direction) {
        let list = this.getList();
        this.threeDimensionalArray((z, y, x) => {
            let idx;
            if (axis == 'x' && x == index) {
                idx = direction?[y,2 - z,x]:[2 - y,z,x]
            } else if (axis == 'y' && y == index) {
                idx = direction?[2 - x,y,z]:[x,y,2 - z]
            } else if (axis == 'z' && z == index) {
                idx = direction?[z,x,2 - y]:[z,2 - x,y]
            } else {
                list[z][y][x] = this._cubes[z][y][x];
                return;
            }
            list[z][y][x] = this._cubes[idx[0]][idx[1]][idx[2]];
            list[z][y][x].rotationMaterialMap(axis,direction);
        });
        this._cubes = list;
    }

    getList() {
        let resultCubes = new Array(this.z);
        for (let z = 0; z < this._size.z; z++) {
            resultCubes[z] = new Array(this.h);
            for (let y = 0; y < this._size.y; y++) {
                resultCubes[z][y] = new Array(this.w);
            }
        }
        return resultCubes;
    }

    isDuringRotation() {
        return Pivot.isDuringRotation;
    }
}

class Pivot {
    static isDuringRotation = false;
    constructor(pivot, index, axis, rubik) {
        this.pivot = pivot;
        this.index = index;
        this.axis = axis;
        this.rubik = rubik;
    }
    rotation(angle) {
        Pivot.isDuringRotation = true;
        let nowRadius = 0;
        let direction = angle < 0;
        const intervalId = setInterval(() => {
            const quaternion = this.pivot.quaternion;
            const target = new THREE.Quaternion();

            target.setFromAxisAngle(
                new THREE.Vector3(this.axis == 'x' ? 1 : 0, this.axis == 'y' ? 1 : 0, this.axis == 'z' ? 1 : 0).normalize(), angle);
            quaternion.multiply(target);
            if (Math.abs(nowRadius += angle) > (Math.PI / 2) - angle) {
                clearInterval(intervalId);
                this.rubik.rotationCubes(this.axis,this.index, direction);
                this.rubik.drawMeshList();
                Pivot.isDuringRotation = false;
            }
        }, 1000 / 60);
    }
}

class Cube {
    materialMap = [0, 1, 2, 3, 4, 5];
    constructor(materialMap) {
        if (materialMap) {
            this.materialMap = [...materialMap];
        }
    }

    get materialMap() {
        return this.materialMap;
    }
    rotationMaterialMap(axis,direction=false) {
        //x orange -> yellow -> red -> blue
        //y blue -> white -> yellow -> green
        //z orange -> green -> red -> white 
        const RX = [2, 5, 3, 4, 0, 1];
        const RY = [4, 1, 5, 0, 2, 3];
        const RZ = [2, 0, 3, 1, 4, 5];

        const R = {"x":RX, "y":RY, "z":RZ};
        let rotationMaterialMap = new Array(6);
        for (let i = 0; i < 4; i++) {
            let index = direction?[3,0,1,2][i]:[1,2,3,0][i];
            rotationMaterialMap[R[axis][i]] = this.materialMap[R[axis][index]];
        }
        
        rotationMaterialMap[R[axis][4]] = this.materialMap[R[axis][4]];
        rotationMaterialMap[R[axis][5]] = this.materialMap[R[axis][5]];

        this.materialMap = rotationMaterialMap;
    }

    static makeMesh(materialMap) {
        const colors = {
            whtie: 0xffffff,
            yellow: 0xffff00,
            blue: 0x0000ff,
            red: 0xff0000,
            green: 0x008000,
            orange: 0xffa500
        };
        const wireframe = false
        const geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);

        const MATERIAL = [
            new THREE.MeshBasicMaterial({ color: colors.green, wireframe: wireframe }),//back
            new THREE.MeshBasicMaterial({ color: colors.whtie, wireframe: wireframe }),//front
            new THREE.MeshBasicMaterial({ color: colors.orange, wireframe: wireframe }),//up
            new THREE.MeshBasicMaterial({ color: colors.red, wireframe: wireframe }),//down
            new THREE.MeshBasicMaterial({ color: colors.blue, wireframe: wireframe }),//right
            new THREE.MeshBasicMaterial({ color: colors.yellow, wireframe: wireframe })];//left

        let material = new Array(6);
        for (const i in materialMap) {
            material[i] = MATERIAL[materialMap[i]];
        }

        return new THREE.Mesh(geometry, material);
    }
}

camera.position.z = 10;

const rubik = new Rubiks(3, 3, 3);
rubik.setRubikRotation(0.5, 0.5);
scene.add(rubik.model);

rubik.drawMeshList();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let isMouseDown = false;
function onPointerMove( event ) {
    if (!isMouseDown) return;
    if (event.type === "touchmove") {
        pointer.x = ( event.touches[0].clientX / window.innerWidth ) * 2 - 1;
	    pointer.y = - ( event.touches[0].clientY / window.innerHeight ) * 2 + 1;
    }
    if (event.type === "mousemove") {
        pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    }
    render();
}

let lastPosition = [];
let lastFaceIndex = 0;
function render() {
    if (rubik.isDuringRotation()) return;
    
	raycaster.setFromCamera( pointer, camera );
	const intersects = raycaster.intersectObjects( scene.children );

    if (intersects.length == 0) return; 

    controls.enabled = false
    const p = intersects[0].object.position;
    let nowPosition = [p.x,p.y,p.z];

    if (lastPosition.length) {
        if (lastPosition.toString() == nowPosition.toString()) return;
        let move = []
        for (let i in lastPosition) {
            move.push(lastPosition[i] - nowPosition[i]);
        }
        let reverse1 = lastFaceIndex % 2 == 0 ? -1:1;
        let reverse2 = lastFaceIndex % 2 == 0 ? 1:-1;
        const index = Math.floor(lastFaceIndex / 2)
        if (index == 0) {
            if (move[1] !== 0) {
                rubik.rotationMesh('z', lastPosition[2]+1, 0.03 * move[1] * reverse1);
            }
            if (move[2] !== 0) {
                rubik.rotationMesh('y', lastPosition[1]+1, 0.03 * move[2] * reverse2);
            }
        }
        if (index == 1) {
            if (move[0] !== 0) {
                rubik.rotationMesh('z', lastPosition[2]+1, 0.03 * move[0] * reverse2);
            }
            if (move[2] !== 0) {
                rubik.rotationMesh('x', lastPosition[0]+1, 0.03 * move[2] * reverse1);
            }
        }
        if (index == 2) {
            if (move[0] !== 0) {
                rubik.rotationMesh('y', lastPosition[1]+1, 0.03 * move[0] * reverse1);
            }
            if (move[1] !== 0) {
                rubik.rotationMesh('x', lastPosition[0]+1, 0.03 * move[1] * reverse2);
            }
        }
        lastPosition = [];
        lastFaceIndex = 0;
    } else {
        lastFaceIndex = intersects[0].face.materialIndex;
        lastPosition = [p.x,p.y,p.z];
    }
}

window.addEventListener('touchmove', onPointerMove);
window.addEventListener('touchstart', ()=>{
    isMouseDown = true;
});
window.addEventListener('touchend', ()=>{
    controls.enabled = true;
    isMouseDown = false;
});


window.addEventListener('mousemove', onPointerMove);
window.addEventListener('mousedown', ()=>{
    isMouseDown = true;
});
window.addEventListener('mouseup', ()=>{
    controls.enabled = true;
    isMouseDown = false;
});

function animate() {
    controls.update();
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
