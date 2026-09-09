import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Inspector } from 'three/addons/inspector/Inspector.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { float, Fn, min, mul, mx_noise_float, mx_noise_vec3, positionLocal, rotate, time, uv, vec2, vec3 } from 'three/tsl'

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.threejs')

// Scene
const scene = new THREE.Scene()

// Loaders
const gltfLoader = new GLTFLoader()

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 8
camera.position.y = 10
camera.position.z = 12
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 3, 0)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGPURenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0x111111)
renderer.inspector = new Inspector()

/**
 * Model
 */
const model = await gltfLoader.loadAsync('./bakedModel.glb')
model.scene.getObjectByName('baked').material.map.anisotropy = 8
scene.add(model.scene)

/**
 * Smoke
 */
{
    // Geometry
    const geometry = new THREE.PlaneGeometry(1, 1, 16, 64)
    geometry.translate(0, 0.5, 0)
    geometry.scale(1.5, 6, 1.5)

    // Material
    const material = new THREE.MeshBasicNodeMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        wireframe: false,
        color: 0xdeccbe
    })
    material.positionNode = Fn(() => {
        const newPosition = positionLocal

        // twist
        const angle = positionLocal.y
            .mul(0.3)
            .sub(time.mul(0.2))
            .sin()
            .mul(3)
         
        newPosition.xz.assign(rotate(newPosition.xz, angle))

        // wind
        const windCoordinates = newPosition
            .sub(
                vec3(0, time.mul(0.3), 0)
            )
            .mul(0.4)
        const windStrength = uv().y.mul(5)
        const wind = mx_noise_vec3(windCoordinates)
            .mul(windStrength)
        newPosition.addAssign(wind)

        return newPosition
    })()

    const smoke = mx_noise_float(
        uv()
            .mul(vec2(3, 2)) // change frequency of pattern
            .sub(
                vec2(0, time.mul(0.1)) // pattern goes up
            )
    )
    
    const edgeFade = min(
        uv().y.mul(10),          // bottom
        uv().y.oneMinus(),       // top
        uv().x.mul(5),           // left
        uv().x.oneMinus().mul(5) // right
    )
    material.opacityNode = mul(smoke, edgeFade).clamp(0, 1)

    // Mesh
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = 1.83
    scene.add(mesh)
}

/**
 * Animate
 */
const timer = new THREE.Timer()

const tick = () => {
    timer.update()

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)
}

renderer.setAnimationLoop(tick)
