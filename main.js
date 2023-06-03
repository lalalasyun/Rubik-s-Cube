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
    position = { x: 0, y: 0, z: 0 };
    rotation = { x: 0, y: 0, z: 0 };
    pivot = null;
    history = [];
    nowHistory = 0;

    isAutoMode = false;

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

    scramble(angle = 1,limit = 1,interval=100) {
        const getRandomInt = (max) => {
            return Math.floor(Math.random() * max);
        }
        const axis = ['x','y','z'];
        let count = 0;
        this.isAutoMode = true;
        const scrambler = setInterval(()=>{
            let addRotation = [axis[getRandomInt(3)], getRandomInt(3),getRandomInt(2)?1:-1]
            this.addHistory(addRotation[0], addRotation[1], addRotation[2]);
            this.rotationMesh(addRotation[0], addRotation[1], angle,addRotation[2]);
            if (count > limit) {
                clearInterval(scrambler);
                this.isAutoMode = false;
            }
            count++;
        },interval)
    }

    prevHistory(angle=1,limit=1,interval=100) {
        if (this.nowHistory <= 0) return;
        let count = 0;
        this.isAutoMode = true;
        const auto = setInterval(()=>{
            this.nowHistory -= 1;
            const h = this.history[this.nowHistory];
            this.rotationMesh(h.axis,h.index,angle,h.direction * -1);
            count++;
            if (count >= limit) {
                this.isAutoMode = false;
                clearInterval(auto);
            }
        },interval)
    }

    nextHistory(angle) {
        if (this.nowHistory > this.history.length - 1) return;
        const h = this.history[this.nowHistory];
        this.nowHistory += 1;
        this.rotationMesh(h.axis,h.index,angle,h.direction);
    }

    addHistory(axis, index, direction) {
        this.history[this.nowHistory++] = {
            axis:axis,
            index:index,
            direction:direction
        };
    }

    rotationMesh(axis, index, angle, direction) {
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
        this.pivot = new Pivot(this.nowPivotList, index, axis, this);
        this.pivot.rotation(angle * direction);
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
        if (this.pivot !== null) {
            return this.pivot.isDuringRotation;
        }
        return false;
    }
}

class Pivot {
    isDuringRotation = false;
    constructor(pivot, index, axis, rubik) {
        this.pivot = pivot;
        this.index = index;
        this.axis = axis;
        this.rubik = rubik;
    }
    rotation(angle) {
        this.isDuringRotation = true;
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
                this.isDuringRotation = false;
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

function setPointer(event) {
    if (event.type.indexOf("touch") != -1) {
        pointer.x = ( event.touches[0].clientX / window.innerWidth ) * 2 - 1;
	    pointer.y = - ( event.touches[0].clientY / window.innerHeight ) * 2 + 1;
    }
    if (event.type.indexOf("mouse") != -1) {
        pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    }
}
function onPointerMove( event ) {
    if (!isMouseDown || rubik.isDuringRotation()) return;
    setPointer(event);
    render();
}

function onPointerDown( event ) {
    if (isMouseDown || rubik.isDuringRotation()) return;
    setPointer(event);
    raycaster.setFromCamera( pointer, camera );
	const intersects = raycaster.intersectObjects( scene.children );

    if (0 < intersects.length) {
        controls.enabled = false
        isMouseDown = true;
    }
}

let lastPosition = [];
let lastFaceIndex = 0;
function render() {
	raycaster.setFromCamera( pointer, camera );
	const intersects = raycaster.intersectObjects( scene.children );
    
    if (intersects.length === 0) return;
    const p = intersects[0].object.position;
    let nowPosition = [p.x,p.y,p.z];

    if (lastPosition.length) {
        if (lastPosition.toString() == nowPosition.toString()) return;
        let move = [0, 0, 0];
        for (let i = 0,isCheck = false; i < move.length; i++) {
            if ((lastPosition[i] - nowPosition[i]) !== 0) {
                move[i] = lastPosition[i] - nowPosition[i];
                if (isCheck) return;
                isCheck = true;
            }
        }
        const reverse1 = lastFaceIndex % 2 == 0 ? -1:1;
        const reverse2 = lastFaceIndex % 2 == 0 ? 1:-1;
        const index = Math.floor(lastFaceIndex / 2)

        let addRotation = [ ];
        if (index == 0) {
            if (move[1] !== 0) {
                addRotation = ['z', lastPosition[2]+1,  move[1] * reverse1];
            }
            if (move[2] !== 0) {
                addRotation = ['y', lastPosition[1]+1, move[2] * reverse2];
            }
        }
        if (index == 1) {
            if (move[0] !== 0) {
                addRotation = ['z', lastPosition[2]+1, move[0] * reverse2];
            }
            if (move[2] !== 0) {
                addRotation = ['x', lastPosition[0]+1, move[2] * reverse1];
            }
        }
        if (index == 2) {
            if (move[0] !== 0) {
                addRotation = ['y', lastPosition[1]+1, move[0] * reverse1];
            }
            if (move[1] !== 0) {
                addRotation = ['x', lastPosition[0]+1, move[1] * reverse2];
            }
        }
        if (addRotation.length !== 0) {
            rubik.addHistory(addRotation[0], addRotation[1], addRotation[2]);
            rubik.rotationMesh(addRotation[0], addRotation[1], 0.03 , addRotation[2]);
            lastPosition = [];
            lastFaceIndex = 0;
            isMouseDown = false;
        }
    } else {
        lastFaceIndex = intersects[0].face.materialIndex;
        lastPosition = [p.x,p.y,p.z];
    }
}

window.addEventListener('touchmove', onPointerMove);
window.addEventListener('touchstart', onPointerDown);
window.addEventListener('touchend', () => {
    controls.enabled = true;
    isMouseDown = false;
});


window.addEventListener('mousemove', onPointerMove);
window.addEventListener('mousedown', onPointerDown);
window.addEventListener('mouseup', () => {
    controls.enabled = true;
    isMouseDown = false;
});

function animate() {
    controls.update();
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

const scramble_btn = document.getElementById("controller_scramble");
const prev_btn = document.getElementById("controller_prev");
const next_btn = document.getElementById("controller_next");
const auto_btn = document.getElementById("controller_auto");
const speed_select = document.getElementById("controller_speed");

const speeds = [0.1, 0.2 ,0.3];

scramble_btn.addEventListener('click',()=>{
    if(rubik.isAutoMode || rubik.isDuringRotation()) return;
    rubik.scramble(speeds[speed_select.value],15,500);
});
prev_btn.addEventListener('click',()=>{
    if(rubik.isAutoMode || rubik.isDuringRotation()) return;
    rubik.prevHistory(speeds[speed_select.value]);
});
next_btn.addEventListener('click',()=>{
    if(rubik.isAutoMode || rubik.isDuringRotation()) return;
    rubik.nextHistory(speeds[speed_select.value]);
});
auto_btn.addEventListener('click',()=>{
    if(rubik.isAutoMode || rubik.isDuringRotation()) return;
    rubik.prevHistory(speeds[speed_select.value],rubik.nowHistory,500);
});

