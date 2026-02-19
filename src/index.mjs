import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

// ==========================================
// 🚨 FORCE CLEAR WEBGL (แก้ Error หน้าจอเต็มของ CodeSandbox)
// ==========================================
// ค้นหาจอ 3D เก่าและสั่งลบทิ้งคืนเมมโมรี่ให้การ์ดจอ
const oldCanvases = document.querySelectorAll("canvas");
oldCanvases.forEach((canvas) => {
  const gl =
    canvas.getContext("webgl") ||
    canvas.getContext("webgl2") ||
    canvas.getContext("experimental-webgl");
  if (gl && gl.getExtension("WEBGL_lose_context")) {
    gl.getExtension("WEBGL_lose_context").loseContext();
  }
  canvas.remove();
});

// ล้าง UI เก่าๆ ออกให้หมดกันการซ้อนทับ
const oldUIs = document.querySelectorAll("div[style*='absolute']");
oldUIs.forEach((ui) => ui.remove());

// --- ล้างค่าขอบหน้าจอ ---
document.body.style.margin = "0";
document.body.style.overflow = "hidden";

// --- 0. CSS & Sniper Crosshair ---
const styleId = "sniper-style";
if (!document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.innerHTML = `
        #crosshair-container {
            position: absolute; top: 50%; left: 50%; width: 120px; height: 120px;
            transform: translate(-50%, -50%); pointer-events: none;
        }
        .scope-circle { position: absolute; width: 100%; height: 100%; border: 2px solid rgba(0,0,0,0.8); border-radius: 50%; }
        .scope-inner { position: absolute; width: 60%; height: 60%; top: 20%; left: 20%; border: 1px dashed rgba(0,0,0,0.4); border-radius: 50%; }
        .scope-dot { position: absolute; top: 50%; left: 50%; width: 4px; height: 4px; background: red; border-radius: 50%; transform: translate(-50%, -50%); z-index: 10; }
        .scope-line-v { position: absolute; left: 50%; width: 1px; height: 100%; background: black; }
        .scope-line-h { position: absolute; top: 50%; width: 100%; height: 1px; background: black; }
    `;
  document.head.appendChild(style);
}

const chUI = document.createElement("div");
chUI.id = "crosshair-container";
chUI.innerHTML = `<div class="scope-circle"></div><div class="scope-inner"></div><div class="scope-line-v"></div><div class="scope-line-h"></div><div class="scope-dot"></div>`;
chUI.style.display = "none";
document.body.appendChild(chUI);

// --- 1. ตั้งค่าฉาก (Scene Setup - สว่างยามเช้า) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0d8ef);
scene.fog = new THREE.Fog(0xa0d8ef, 100, 1000);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2500
);
const playerHeight = 10;
camera.position.y = playerHeight;
scene.add(camera);

// สร้าง Renderer ใหม่แบบป้องกันเออเร่อ
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.display = "block";
document.body.appendChild(renderer.domElement);

// --- 2. แสงสว่างและสิ่งแวดล้อมเมือง ---
const light = new THREE.HemisphereLight(0xffffff, 0x444455, 0.8);
scene.add(light);
const dirLight = new THREE.DirectionalLight(0xfffbd1, 1.2);
dirLight.position.set(100, 200, 50);
scene.add(dirLight);

const floorGeometry = new THREE.PlaneGeometry(3000, 3000);
const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const gridHelper = new THREE.GridHelper(3000, 150, 0x555555, 0x666666);
gridHelper.position.y = 0.1;
scene.add(gridHelper);

const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
const mat1 = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
const mat2 = new THREE.MeshLambertMaterial({ color: 0xcccccc });
const mat3 = new THREE.MeshLambertMaterial({ color: 0x99aaff });

for (let i = 0; i < 200; i++) {
  const x = (Math.random() - 0.5) * 2000;
  const z = (Math.random() - 0.5) * 2000;
  if (Math.abs(x) < 150 && Math.abs(z) < 150) continue;
  const height = 50 + Math.random() * 250;
  const randomMat =
    Math.random() < 0.4 ? mat1 : Math.random() < 0.7 ? mat2 : mat3;
  const building = new THREE.Mesh(buildingGeo, randomMat);
  building.position.set(x, height / 2, z);
  building.scale.set(20 + Math.random() * 40, height, 20 + Math.random() * 40);
  scene.add(building);
}

// --- 3. UI ---
const damageOverlay = document.createElement("div");
damageOverlay.style.position = "absolute";
damageOverlay.style.top = "0";
damageOverlay.style.left = "0";
damageOverlay.style.width = "100%";
damageOverlay.style.height = "100%";
damageOverlay.style.pointerEvents = "none";
damageOverlay.style.background =
  "radial-gradient(circle, transparent 40%, rgba(255,0,0,0.8) 100%)";
damageOverlay.style.opacity = "0";
damageOverlay.style.transition = "opacity 0.2s, background 0.1s";
document.body.appendChild(damageOverlay);

// เป้าปืนกลางจอ (ย่อขนาดให้เล็กคม)
const crosshair = document.createElement("div");
crosshair.style.position = "absolute";
crosshair.style.top = "50%";
crosshair.style.left = "50%";
crosshair.style.width = "4px";
crosshair.style.height = "4px";
crosshair.style.backgroundColor = "#00ff00";
crosshair.style.borderRadius = "50%";
crosshair.style.transform = "translate(-50%, -50%)";
crosshair.style.pointerEvents = "none";
crosshair.style.transition = "all 0.2s";
document.body.appendChild(crosshair);

const weaponUI = document.createElement("div");
weaponUI.style.position = "absolute";
weaponUI.style.bottom = "60px";
weaponUI.style.right = "30px";
weaponUI.style.color = "#ffff00";
weaponUI.style.fontSize = "24px";
weaponUI.style.fontFamily = "Arial, sans-serif";
weaponUI.style.fontWeight = "bold";
weaponUI.style.textShadow = "2px 2px 4px #000000";
document.body.appendChild(weaponUI);

const skillUI = document.createElement("div");
skillUI.style.position = "absolute";
skillUI.style.bottom = "100px";
skillUI.style.right = "30px";
skillUI.style.color = "cyan";
skillUI.style.fontSize = "16px";
skillUI.style.fontFamily = "Arial, sans-serif";
skillUI.style.fontWeight = "bold";
skillUI.style.textShadow = "2px 2px 4px #000000";
document.body.appendChild(skillUI);

const ammoUI = document.createElement("div");
ammoUI.style.position = "absolute";
ammoUI.style.bottom = "20px";
ammoUI.style.right = "30px";
ammoUI.style.color = "white";
ammoUI.style.fontSize = "32px";
ammoUI.style.fontFamily = "Arial, sans-serif";
ammoUI.style.fontWeight = "bold";
ammoUI.style.textShadow = "2px 2px 4px #000000";
document.body.appendChild(ammoUI);

const healthUI = document.createElement("div");
healthUI.style.position = "absolute";
healthUI.style.bottom = "20px";
healthUI.style.left = "30px";
healthUI.style.color = "#ff4444";
healthUI.style.fontSize = "32px";
healthUI.style.fontFamily = "Arial, sans-serif";
healthUI.style.fontWeight = "bold";
healthUI.style.textShadow = "2px 2px 4px #000000";
document.body.appendChild(healthUI);

const waveUI = document.createElement("div");
waveUI.style.position = "absolute";
waveUI.style.top = "20px";
waveUI.style.left = "50%";
waveUI.style.transform = "translateX(-50%)";
waveUI.style.color = "white";
waveUI.style.fontSize = "36px";
waveUI.style.fontFamily = "Arial, sans-serif";
waveUI.style.fontWeight = "bold";
waveUI.style.textShadow = "2px 2px 4px #000000";
document.body.appendChild(waveUI);

// Admin UI
const adminUI = document.createElement("div");
adminUI.style.position = "absolute";
adminUI.style.top = "80px";
adminUI.style.left = "30px";
adminUI.style.color = "#00ff00";
adminUI.style.fontFamily = "monospace";
adminUI.style.fontSize = "18px";
adminUI.style.background = "rgba(0,0,0,0.8)";
adminUI.style.padding = "20px";
adminUI.style.border = "2px solid #00ff00";
adminUI.style.borderRadius = "10px";
adminUI.style.display = "none";
adminUI.style.textShadow = "0 0 5px #00ff00";
adminUI.innerHTML = `
    <b style="color:#ff3333; font-size:24px; text-shadow: 0 0 5px red;">[ ADMIN MODE ACTIVE ]</b><br/><br/>
    <b style="color:cyan">Z</b> : Kill All (ล้างแมพ)<br/>
    <b style="color:cyan">X</b> : Set Wave (กำหนดเวฟ)<br/>
    <b style="color:cyan">C</b> : Toggle Fly (เปิด/ปิด บิน)<br/>
    <b style="color:cyan">V</b> : NUKE (ระเบิดนิวเคลียร์)
`;
document.body.appendChild(adminUI);

const MAX_AMMO = 30;
let ammo = MAX_AMMO;
let maxHealth = 100;
let health = maxHealth;
let isDead = false;
let currentWeapon = 1;

let skillActive = false,
  skillT = 0,
  skillKey = "";
let currentWave = 1,
  enemiesRemaining = 0,
  isWaveTransitioning = false;
let lastDamageTime = 0;
const HEAL_DELAY = 4000,
  HEAL_RATE = 15;
let isAdminMode = false,
  isFlying = false;

function updateWeaponUI() {
  if (currentWeapon === 1) {
    weaponUI.innerHTML = `[1] GUN`;
    weaponUI.style.color = "#ffff00";
    ammoUI.style.display = "block";
    skillUI.innerHTML = "Hold L-Click: Auto Fire";
    chUI.style.display = "none";
    crosshair.style.display = "block";
    crosshair.style.width = "4px";
    crosshair.style.height = "4px";
    crosshair.style.backgroundColor = "#00ff00";
    crosshair.style.borderRadius = "50%";
    crosshair.style.border = "none";
    crosshair.style.transform = "translate(-50%, -50%)";
  } else if (currentWeapon === 2) {
    weaponUI.innerHTML = `[2] SWORD`;
    weaponUI.style.color = "#ffff00";
    ammoUI.style.display = "none";
    skillUI.innerHTML = "L-Click: Slash | R-Click: Wave | Hold R: Dash";
    chUI.style.display = "none";
    crosshair.style.display = "block";
    crosshair.style.width = "10px";
    crosshair.style.height = "10px";
    crosshair.style.backgroundColor = "transparent";
    crosshair.style.border = "2px solid cyan";
    crosshair.style.borderRadius = "0%";
    crosshair.style.transform = "translate(-50%, -50%) rotate(45deg)";
  } else if (currentWeapon === 3) {
    weaponUI.innerHTML = `[3] FIRE FRUIT`;
    weaponUI.style.color = "#ff5500";
    ammoUI.style.display = "none";
    skillUI.innerHTML =
      "Z: Fire Fist | X: Fire Gun | C: Fire Dash | V: Flame Emperor";
    skillUI.style.color = "#ffaa00";
    chUI.style.display = "none";
    crosshair.style.display = "block";
    crosshair.style.width = "6px";
    crosshair.style.height = "6px";
    crosshair.style.backgroundColor = "#ff4400";
    crosshair.style.borderRadius = "50%";
    crosshair.style.border = "1px solid yellow";
    crosshair.style.transform = "translate(-50%, -50%)";
  }
}

function updateAmmoUI() {
  ammoUI.innerHTML = `Ammo: ${ammo} / ${MAX_AMMO}`;
}
function updateHealthUI() {
  healthUI.innerHTML = `HP: ${Math.ceil(Math.max(0, health))}`;
  if (!isDead)
    damageOverlay.style.opacity = ((1.0 - health / maxHealth) * 0.8).toString();
}
function updateWaveUI() {
  const isBossStage = currentWave % 5 === 0;
  let bossName = "";
  if (isBossStage) {
    if (currentWave % 20 === 0) bossName = "[BOSS: Orbital Beamer]";
    else if (currentWave % 15 === 5) bossName = "[BOSS: Titan Smasher]";
    else if (currentWave % 15 === 10) bossName = "[BOSS: Hellfire Shooter]";
    else bossName = "[BOSS: Toxic Dasher]";
  }
  waveUI.innerHTML = `WAVE ${currentWave} <span style='color:red;'>${bossName}</span> | Enemies: ${enemiesRemaining}`;
}
updateWeaponUI();
updateAmmoUI();
updateHealthUI();

// --- 4. สร้างโมเดล 3D อาวุธ ---
const darkGreyMat = new THREE.MeshStandardMaterial({
  color: 0x333333,
  roughness: 0.5,
});
const blackMat = new THREE.MeshStandardMaterial({
  color: 0x111111,
  roughness: 0.8,
});
const armSkinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });

// Gun
const gunGroup = new THREE.Group();
const barrel = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.2, 1.5),
  darkGreyMat
);
const handle = new THREE.Mesh(
  new THREE.BoxGeometry(0.18, 0.4, 0.18),
  darkGreyMat
);
handle.position.set(0, -0.25, 0.2);
handle.rotation.x = Math.PI / 6;
const mag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.15), blackMat);
const magLockedPos = new THREE.Vector3(0, -0.25, -0.15);
mag.position.copy(magLockedPos);
const armRightGun = new THREE.Mesh(
  new THREE.BoxGeometry(0.25, 0.25, 2),
  armSkinMat
);
armRightGun.position.set(0.1, -0.4, 1.0);
armRightGun.rotation.y = -Math.PI / 12;
gunGroup.add(barrel);
gunGroup.add(handle);
gunGroup.add(mag);
gunGroup.add(armRightGun);
const defaultGunPos = new THREE.Vector3(0.5, -0.4, -1.2);
const aimGunPos = new THREE.Vector3(0, -0.18, -0.8);
const currentGunPos = new THREE.Vector3().copy(defaultGunPos);
camera.add(gunGroup);

const armLeft = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.2, 1.8),
  armSkinMat
);
const armLeftHiddenPos = new THREE.Vector3(-1.0, -2.0, -0.5);
armLeft.position.copy(armLeftHiddenPos);
armLeft.rotation.set(Math.PI / 3, -Math.PI / 6, 0);
camera.add(armLeft);

// Sword
const swordGroup = new THREE.Group();
const bladeMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.1,
  metalness: 0.9,
  emissive: 0x000000,
  emissiveIntensity: 0.5,
});
const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.8, 0.3), bladeMat);
blade.position.set(0, 1.4, 0);
const guard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.6), blackMat);
guard.position.set(0, 0, 0);
const swordHandle = new THREE.Mesh(
  new THREE.BoxGeometry(0.12, 0.7, 0.15),
  darkGreyMat
);
swordHandle.position.set(0, -0.35, 0);
const armRightSword = new THREE.Mesh(
  new THREE.BoxGeometry(0.25, 0.25, 2),
  armSkinMat
);
armRightSword.position.set(0.1, -0.6, 0.5);
swordGroup.add(blade);
swordGroup.add(guard);
swordGroup.add(swordHandle);
swordGroup.add(armRightSword);
const defaultSwordPos = new THREE.Vector3(0.7, -0.5, -1.1);
swordGroup.position.copy(defaultSwordPos);
swordGroup.rotation.x = Math.PI / 3.5;
swordGroup.rotation.y = Math.PI / 10;
camera.add(swordGroup);
swordGroup.visible = false;

// Fire Fruit
const fireGroup = new THREE.Group();
const fireMat = new THREE.MeshStandardMaterial({
  color: 0xffaa00,
  emissive: 0xff3300,
  emissiveIntensity: 2.0,
});
const fireHand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1.5), fireMat);
fireHand.position.set(1.2, -0.8, -1.5);
fireGroup.add(fireHand);
camera.add(fireGroup);
fireGroup.visible = false;

// --- 5. ระบบควบคุม ---
const controls = new PointerLockControls(camera, document.body);
const instructions = document.createElement("div");
instructions.style.position = "absolute";
instructions.style.top = "50%";
instructions.style.left = "50%";
instructions.style.transform = "translate(-50%, -50%)";
instructions.style.width = "100%";
instructions.style.textAlign = "center";
instructions.style.color = "#ffffff";
instructions.style.textShadow = "2px 2px 4px black";
instructions.style.fontFamily = "Arial, sans-serif";
instructions.innerHTML = `
    <h1 style="font-size: 60px; margin-bottom: 10px; color: cyan;">MORNING CITY SURVIVAL</h1>
    <p style="font-size: 18px; color: #ffeb3b;"><b>เปลี่ยนอาวุธ: 1 (ปืน) | 2 (ดาบ) | 3 (ผลไฟ) | 9 (ADMIN)</b></p>
    <div style="display: inline-block; text-align: left; margin-top: 20px; color: #dddddd; background: rgba(0,0,0,0.6); padding: 20px; border-radius: 10px;">
        WASD = เดิน | Shift = วิ่ง | Space = กระโดด<br/>
        <b>ปืน:</b> กดค้าง คลิกซ้าย=ยิงออโต้ | คลิกขวา=ซูม | R=รีโหลด<br/>
        <b>ดาบ:</b> คลิกซ้าย=ฟันสับ | คลิกขวา=คลื่นดาบ | คลิกขวาค้าง=ชาร์จพุ่ง<br/>
        <b>ไฟ:</b> Z=หมัดไฟ | X=ปืนไฟ | C=พุ่งตัวเพลิง | V=จักรพรรดิเพลิง
    </div>
    <p style="font-size: 24px; margin-top:30px; color: cyan; animation: pulse 1s infinite;">>>> คลิกเพื่อเริ่มเกม <<<</p>
`;
const stylePulse = document.createElement("style");
stylePulse.innerHTML = `@keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }`;
document.head.appendChild(stylePulse);
document.body.appendChild(instructions);

document.addEventListener("click", (e) => {
  if (e.target.id === "respawnBtn") respawnPlayer();
  else if (!controls.isLocked && !isDead) controls.lock();
});
controls.addEventListener("lock", () => (instructions.style.display = "none"));
controls.addEventListener("unlock", () => {
  if (!isDead) instructions.style.display = "block";
});

// --- 6. Input Logic ---
let moveForward = false,
  moveBackward = false,
  moveLeft = false,
  moveRight = false;
let isAiming = false,
  isReloading = false,
  isSprinting = false,
  canJump = true;
let reloadProgress = 0,
  recoilZ = 0,
  recoilX = 0;
let isSwinging = false,
  swingType = 0,
  swingProgress = 0,
  isChargingSword = false,
  rmbPressTime = 0;
let isDashing = false,
  dashTime = 0,
  dashDirection = new THREE.Vector3(),
  dashHitEnemies = new Set();
let isFiring = false,
  lastShootTime = 0;
const FIRE_RATE = 100;

const swordWaves = [];
const fireballs = [];
const particles = [];

function switchWeapon(wpn) {
  if (isSwinging || isReloading || isDead || isDashing || skillActive) return;
  currentWeapon = wpn;
  isAiming = false;
  isChargingSword = false;
  bladeMat.emissive.setHex(0x000000);
  isFiring = false;
  gunGroup.visible = currentWeapon === 1;
  swordGroup.visible = currentWeapon === 2;
  fireGroup.visible = currentWeapon === 3;
  if (currentWeapon === 2) {
    swordGroup.rotation.set(Math.PI / 3.5, Math.PI / 10, 0);
    swordGroup.position.copy(defaultSwordPos);
  }
  updateWeaponUI();
  chUI.style.display = "none";
}

function adminKillAll() {
  targets.forEach((t) => {
    if (t && !t.userData.isDead) applyDamageToEnemy(t, 999999);
  });
}

function adminSetWave() {
  controls.unlock();
  setTimeout(() => {
    const input = prompt("🔥 ADMIN: ระบุ Wave ที่ต้องการวาร์ปไป", currentWave);
    if (input !== null && !isNaN(parseInt(input)) && parseInt(input) > 0) {
      currentWave = parseInt(input);
      spawnWave(currentWave);
    }
  }, 100);
}
function adminToggleFly() {
  isFlying = !isFlying;
  if (!isFlying) velocity.y = 0;
}
function adminNuke() {
  damageOverlay.style.background = "white";
  damageOverlay.style.opacity = "1";
  setTimeout(() => {
    damageOverlay.style.background =
      "radial-gradient(circle, transparent 40%, rgba(255,0,0,0.8) 100%)";
    if (!isDead) updateHealthUI();
  }, 1500);
  const nukeMesh = new THREE.Mesh(
    new THREE.SphereGeometry(20, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
    })
  );
  nukeMesh.position.copy(camera.position);
  scene.add(nukeMesh);
  fireballs.push({
    mesh: nukeMesh,
    dir: new THREE.Vector3(),
    speed: 0,
    life: 3.0,
    dmg: 0,
    aoe: 0,
    isExplosion: true,
    expandSpeed: 200,
    owner: "player",
  });
  adminKillAll();
}

const onKeyDown = (e) => {
  if (isDead) return;
  if (e.code === "Digit9") {
    isAdminMode = !isAdminMode;
    adminUI.style.display = isAdminMode ? "block" : "none";
    return;
  }
  if (isAdminMode) {
    if (e.code === "KeyZ") {
      adminKillAll();
      return;
    }
    if (e.code === "KeyX") {
      adminSetWave();
      return;
    }
    if (e.code === "KeyC") {
      adminToggleFly();
      return;
    }
    if (e.code === "KeyV") {
      adminNuke();
      return;
    }
  }
  switch (e.code) {
    case "KeyW":
      moveForward = true;
      break;
    case "KeyA":
      moveLeft = true;
      break;
    case "KeyS":
      moveBackward = true;
      break;
    case "KeyD":
      moveRight = true;
      break;
    case "ShiftLeft":
      isSprinting = true;
      break;
    case "Space":
      if (!isFlying && canJump) {
        velocity.y = 150;
        canJump = false;
      }
      break;
    case "Digit1":
      switchWeapon(1);
      break;
    case "Digit2":
      switchWeapon(2);
      break;
    case "Digit3":
      switchWeapon(3);
      break;
    case "KeyZ":
    case "KeyX":
    case "KeyC":
    case "KeyV":
      if (currentWeapon === 3 && !isAdminMode) useFireSkill(e.code);
      break;
    case "KeyR":
      if (currentWeapon === 1 && !isReloading && ammo < MAX_AMMO) {
        isReloading = true;
        reloadProgress = 0;
        isAiming = false;
        crosshair.style.display = "block";
        chUI.style.display = "none";
      }
      break;
  }
};
const onKeyUp = (e) => {
  switch (e.code) {
    case "KeyW":
      moveForward = false;
      break;
    case "KeyA":
      moveLeft = false;
      break;
    case "KeyS":
      moveBackward = false;
      break;
    case "KeyD":
      moveRight = false;
      break;
    case "ShiftLeft":
      isSprinting = false;
      break;
  }
};

document.addEventListener("mousedown", (e) => {
  if (!controls.isLocked || isDead) return;
  if (currentWeapon === 1) {
    if (e.button === 0) {
      isFiring = true;
      if (performance.now() - lastShootTime > FIRE_RATE) {
        shoot();
        lastShootTime = performance.now();
      }
    } else if (e.button === 2 && !isReloading) {
      isAiming = true;
      crosshair.style.display = "none";
      chUI.style.display = "block";
    }
  } else if (currentWeapon === 2) {
    if (!isSwinging && !isDashing) {
      if (e.button === 0) swingSword(1);
      else if (e.button === 2) {
        isChargingSword = true;
        rmbPressTime = performance.now();
      }
    }
  }
});
document.addEventListener("mouseup", (e) => {
  if (e.button === 0) isFiring = false;
  if (e.button === 2) {
    if (currentWeapon === 1) {
      isAiming = false;
      crosshair.style.display = "block";
      chUI.style.display = "none";
    } else if (currentWeapon === 2 && isChargingSword) {
      isChargingSword = false;
      bladeMat.emissive.setHex(0x000000);
      if (performance.now() - rmbPressTime < 300) fireSwordWave();
      else startDashAttack();
    }
  }
});
document.addEventListener("keydown", onKeyDown);
document.addEventListener("keyup", onKeyUp);

// --- 7. ศัตรู และ ระบบบอส 4 รูปแบบ ---
const targets = [];
const boxGeometry = new THREE.BoxGeometry(15, 15, 15);
const boxMaterial = new THREE.MeshLambertMaterial({ color: 0xcc0000 });

const bossGeometry = new THREE.BoxGeometry(40, 40, 40);
const bossMatSmasher = new THREE.MeshLambertMaterial({
  color: 0x550055,
  emissive: 0x220022,
});
const bossMatShooter = new THREE.MeshLambertMaterial({
  color: 0xaa2200,
  emissive: 0x441100,
});
const bossMatDasher = new THREE.MeshLambertMaterial({
  color: 0x00aa00,
  emissive: 0x003300,
});
const bossMatBeam = new THREE.MeshLambertMaterial({
  color: 0x00ffff,
  emissive: 0x004444,
});

const hpBgGeo = new THREE.PlaneGeometry(15, 1.5);
const hpBgMat = new THREE.MeshBasicMaterial({
  color: 0x330000,
  depthTest: false,
});
const hpFgGeo = new THREE.PlaneGeometry(15, 1.5);
hpFgGeo.translate(7.5, 0, 0);
const hpFgMat = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  depthTest: false,
});

const bossHpBgGeo = new THREE.PlaneGeometry(40, 3);
const bossHpFgGeo = new THREE.PlaneGeometry(40, 3);
bossHpFgGeo.translate(20, 0, 0);

function spawnWave(waveNum) {
  // ล้างกระดานให้สะอาด ป้องกันบั๊กซากศพ
  targets.forEach((box) => {
    box.userData.isDead = true;
    scene.remove(box);
  });
  targets.length = 0;

  let isBossStage = waveNum % 5 === 0;
  let numEnemies = waveNum * 5;
  enemiesRemaining = numEnemies + (isBossStage ? 1 : 0);
  updateWaveUI();

  for (let i = 0; i < numEnemies; i++) {
    const box = new THREE.Mesh(boxGeometry, boxMaterial.clone());
    let spawnX, spawnZ, distToPlayer;
    do {
      spawnX = (Math.random() - 0.5) * 1500;
      spawnZ = (Math.random() - 0.5) * 1500;
      distToPlayer = Math.sqrt(
        Math.pow(spawnX - camera.position.x, 2) +
          Math.pow(spawnZ - camera.position.z, 2)
      );
    } while (distToPlayer < 250);
    box.position.set(spawnX, 7.5, spawnZ);

    const hpGroup = new THREE.Group();
    const hpBg = new THREE.Mesh(hpBgGeo, hpBgMat);
    const hpFg = new THREE.Mesh(hpFgGeo, hpFgMat);
    hpFg.position.set(-7.5, 0, 0.1);
    hpGroup.add(hpBg);
    hpGroup.add(hpFg);
    hpGroup.position.y = 11;
    box.add(hpGroup);

    box.userData = {
      isBoss: false,
      isDead: false,
      lastShotTime: performance.now() + 2000 + Math.random() * 1000,
      hp: 100,
      maxHp: 100,
      hpGroup: hpGroup,
      hpFg: hpFg,
    };
    scene.add(box);
    targets.push(box);
  }

  if (isBossStage) {
    let bType = 1;
    let bMat = bossMatSmasher;
    if (waveNum % 20 === 0) {
      bType = 4;
      bMat = bossMatBeam;
    } else if (waveNum % 15 === 10) {
      bType = 2;
      bMat = bossMatShooter;
    } else if (waveNum % 15 === 0) {
      bType = 3;
      bMat = bossMatDasher;
    }

    const boss = new THREE.Mesh(bossGeometry, bMat.clone());
    let spawnX, spawnZ, distToPlayer;
    do {
      spawnX = (Math.random() - 0.5) * 1500;
      spawnZ = (Math.random() - 0.5) * 1500;
      distToPlayer = Math.sqrt(
        Math.pow(spawnX - camera.position.x, 2) +
          Math.pow(spawnZ - camera.position.z, 2)
      );
    } while (distToPlayer < 350);
    boss.position.set(spawnX, 20, spawnZ);

    const bossHpGroup = new THREE.Group();
    const bossHpBg = new THREE.Mesh(bossHpBgGeo, hpBgMat);
    const bossHpFg = new THREE.Mesh(bossHpFgGeo, hpFgMat);
    bossHpFg.position.set(-20, 0, 0.1);
    bossHpGroup.add(bossHpBg);
    bossHpGroup.add(bossHpFg);
    bossHpGroup.position.y = 30;
    boss.add(bossHpGroup);

    const bossHealth = 500 + waveNum * 300;
    boss.userData = {
      isBoss: true,
      isDead: false,
      bossType: bType,
      lastShotTime: performance.now() + 2000,
      skillTimer: performance.now() + 5000,
      isJumping: false,
      jumpTime: 0,
      isDashing: false,
      dashTime: 0,
      dashDir: new THREE.Vector3(),
      isChargingBeam: false,
      isFiringBeam: false,
      beamTimer: 0,
      beamDir: new THREE.Vector3(),
      beamMesh: null,
      hp: bossHealth,
      maxHp: bossHealth,
      hpGroup: bossHpGroup,
      hpFg: bossHpFg,
      originalColor: bMat.color.getHex(),
      originalEmissive: bMat.emissive.getHex(),
    };
    scene.add(boss);
    targets.push(boss);
  }
  isWaveTransitioning = false;
}
spawnWave(currentWave);

function checkWaveProgress() {
  isWaveTransitioning = true;
  currentWave++;
  waveUI.innerHTML = `<span style="color: cyan; text-shadow: 0 0 10px cyan;">WAVE ${currentWave} INCOMING...</span>`;
  setTimeout(() => {
    if (!isDead) spawnWave(currentWave);
  }, 4000);
}

function createDeathParticles(position, isBoss = false) {
  const particleCount = isBoss ? 40 : 15;
  const size = isBoss ? 5 : 2;
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshBasicMaterial({
    color: isBoss ? 0xaa00ff : 0xff0000,
  });
  for (let i = 0; i < particleCount; i++) {
    const particle = new THREE.Mesh(geometry, material);
    particle.position.copy(position);
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * (isBoss ? 150 : 80),
      (Math.random() - 0.5) * 80 + (isBoss ? 80 : 50),
      (Math.random() - 0.5) * (isBoss ? 150 : 80)
    );
    particles.push({ mesh: particle, velocity: velocity, life: 1.0 });
    scene.add(particle);
  }
}

// 🚨 ดักบั๊กการอ่านค่าศพที่ลบไปแล้วแบบเนียนกริบ
function applyDamageToEnemy(enemy, damage) {
  if (!enemy || !enemy.userData || enemy.userData.isDead) return;

  enemy.userData.hp -= damage;

  if (enemy.material && enemy.material.color) {
    const originColor = enemy.userData.isBoss
      ? enemy.userData.originalColor
      : 0xcc0000;
    const originEmissive = enemy.userData.isBoss
      ? enemy.userData.originalEmissive
      : 0x000000;
    enemy.material.color.setHex(0xffffff);
    if (enemy.material.emissive) enemy.material.emissive.setHex(0x555555);
    setTimeout(() => {
      if (
        enemy &&
        !enemy.userData.isDead &&
        enemy.material &&
        enemy.material.color
      ) {
        enemy.material.color.setHex(originColor);
        if (enemy.material.emissive)
          enemy.material.emissive.setHex(originEmissive);
      }
    }, 80);
  }

  if (enemy.userData.hp <= 0) {
    enemy.userData.isDead = true;
    enemy.visible = false;
    if (enemy.userData.hpGroup) enemy.userData.hpGroup.visible = false;
    if (enemy.userData.beamMesh) scene.remove(enemy.userData.beamMesh);
    createDeathParticles(enemy.position, enemy.userData.isBoss);
    enemiesRemaining--;
    updateWaveUI();
  } else {
    if (enemy.userData && enemy.userData.hpFg && enemy.userData.hpFg.scale) {
      let hpPercent = enemy.userData.hp / enemy.userData.maxHp;
      enemy.userData.hpFg.scale.x = Math.max(0.01, hpPercent);
      if (hpPercent < 0.3) enemy.userData.hpFg.material.color.setHex(0xff3300);
      else if (hpPercent < 0.6)
        enemy.userData.hpFg.material.color.setHex(0xffaa00);
    }
  }
}

function takeDamage(amount) {
  if (isDead) return;
  health -= amount;
  lastDamageTime = performance.now();
  damageOverlay.style.background = "rgba(200, 0, 0, 0.6)";
  damageOverlay.style.opacity = "1";
  setTimeout(() => {
    if (!isDead) updateHealthUI();
  }, 100);

  if (health <= 0) {
    health = 0;
    isDead = true;
    controls.unlock();
    instructions.innerHTML = `
        <b style="font-size: 80px; color: red; text-shadow: 0 0 20px darkred;">YOU DIED</b><br/>
        <p style="font-size: 30px; color: white;">Reached Wave: <span style="color:cyan;">${currentWave}</span></p><br/>
        <button id="respawnBtn" style="padding: 15px 40px; font-size: 24px; cursor: pointer; background: #ff4444; color: white; border: none; border-radius: 5px; font-weight: bold; box-shadow: 0 5px 15px rgba(255,0,0,0.4); transition: all 0.2s;">RESPAWN</button>
    `;
    instructions.style.display = "block";
    damageOverlay.style.opacity = "1";
  }
  updateHealthUI();
}

function respawnPlayer() {
  isDead = false;
  health = maxHealth;
  ammo = MAX_AMMO;
  lastDamageTime = performance.now();
  camera.position.set(0, playerHeight, 0);
  velocity.set(0, 0, 0);
  moveForward = moveBackward = moveLeft = moveRight = isSprinting = false;
  isFlying = false;
  isAdminMode = false;
  adminUI.style.display = "none";
  isFiring = false;
  switchWeapon(1);
  currentWave = 1;
  spawnWave(currentWave);
  updateHealthUI();
  updateAmmoUI();
  instructions.innerHTML = `
        <h1 style="font-size: 60px; margin-bottom: 10px; color: cyan;">MORNING CITY SURVIVAL</h1>
        <p style="font-size: 18px; color: #ffeb3b;"><b>เปลี่ยนอาวุธ: 1 (ปืน) | 2 (ดาบ) | 3 (ผลไฟ) | 9 (ADMIN)</b></p>
        <div style="display: inline-block; text-align: left; margin-top: 20px; color: #dddddd; background: rgba(0,0,0,0.6); padding: 20px; border-radius: 10px;">
            WASD = เดิน | Shift = วิ่ง | Space = กระโดด<br/>
            <b>ปืน:</b> กดค้าง คลิกซ้าย=ยิงออโต้ | คลิกขวา=ซูม | R=รีโหลด<br/>
            <b>ดาบ:</b> คลิกซ้าย=ฟันสับ | คลิกขวา=คลื่นดาบ | คลิกขวาค้าง=ชาร์จพุ่ง<br/>
            <b>ไฟ:</b> Z=หมัดไฟ | X=ปืนไฟ | C=พุ่งตัวเพลิง | V=จักรพรรดิเพลิง
        </div>
        <p style="font-size: 24px; margin-top:30px; color: cyan; animation: pulse 1s infinite;">>>> คลิกเพื่อเริ่มเกม <<<</p>
    `;
  controls.lock();
}

// --- 8. ระบบอาวุธและฟิสิกส์ ---
const raycaster = new THREE.Raycaster();

function shoot() {
  if (isReloading || isDead) return;
  if (ammo > 0) {
    ammo--;
    updateAmmoUI();
    recoilZ = isAiming ? 0.05 : 0.15;
    recoilX = isAiming ? 0.02 : 0.08;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(
      targets.filter((t) => !t.userData.isDead)
    );
    if (intersects.length > 0) {
      const hitInfo = intersects[0];
      const spark = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0xffdd44 })
      );
      spark.position.copy(hitInfo.point);
      scene.add(spark);
      setTimeout(() => scene.remove(spark), 80);
      applyDamageToEnemy(hitInfo.object, 25);
    }
  } else {
    if (!isReloading) {
      isReloading = true;
      reloadProgress = 0;
      isAiming = false;
      chUI.style.display = "none";
      crosshair.style.display = "block";
    }
  }
}

function swingSword(type) {
  isSwinging = true;
  swingType = type;
  swingProgress = 0;
  if (type === 3) return;
  const damage = type === 1 ? 100 : 0;
  const attackRange = 30;
  for (let i = targets.length - 1; i >= 0; i--) {
    const enemy = targets[i];
    if (!enemy || enemy.userData.isDead) continue;
    const effectiveRange = enemy.userData.isBoss
      ? attackRange + 20
      : attackRange;
    if (camera.position.distanceTo(enemy.position) < effectiveRange) {
      const dirToEnemy = new THREE.Vector3()
        .subVectors(enemy.position, camera.position)
        .normalize();
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
        camera.quaternion
      );
      if (forward.angleTo(dirToEnemy) < Math.PI / 2.2) {
        const hitPos = enemy.position.clone();
        applyDamageToEnemy(enemy, damage);
        const spark = new THREE.Mesh(
          new THREE.BoxGeometry(4, 4, 4),
          new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
          })
        );
        spark.position.copy(hitPos);
        spark.position.y += 5;
        scene.add(spark);
        setTimeout(() => scene.remove(spark), 100);
      }
    }
  }
}

function fireSwordWave() {
  swingSword(3);
  const wave = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 4),
    new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    })
  );
  wave.position.copy(camera.position);
  wave.quaternion.copy(camera.quaternion);
  wave.rotateX(-Math.PI / 2);
  scene.add(wave);
  swordWaves.push({
    mesh: wave,
    direction: new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion),
    life: 1.5,
  });
}

function startDashAttack() {
  isDashing = true;
  dashTime = 0.25;
  dashDirection.set(0, 0, -1).applyQuaternion(camera.quaternion);
  dashDirection.y = 0;
  dashDirection.normalize();
  dashHitEnemies.clear();
  swingSword(2);
}

function useFireSkill(key) {
  if (skillActive || isDead || isDashing) return;
  skillActive = true;
  skillT = 0;
  skillKey = key;
  const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(
    camera.quaternion
  );

  if (key === "KeyZ") {
    const fbMesh = new THREE.Mesh(
      new THREE.SphereGeometry(4, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff4400 })
    );
    fbMesh.position.copy(camera.position);
    scene.add(fbMesh);
    fireballs.push({
      mesh: fbMesh,
      dir: forwardDir,
      speed: 250,
      life: 2.0,
      dmg: 120,
      aoe: 20,
      isExplosion: false,
      owner: "player",
    });
  } else if (key === "KeyX") {
    for (let i = 0; i < 5; i++) {
      const fbMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffaa00 })
      );
      fbMesh.position.copy(camera.position);
      const spreadDir = new THREE.Vector3(
        forwardDir.x + (Math.random() - 0.5) * 0.2,
        forwardDir.y + (Math.random() - 0.5) * 0.2,
        forwardDir.z + (Math.random() - 0.5) * 0.2
      ).normalize();
      scene.add(fbMesh);
      fireballs.push({
        mesh: fbMesh,
        dir: spreadDir,
        speed: 400,
        life: 1.0,
        dmg: 30,
        aoe: 5,
        isExplosion: false,
        owner: "player",
      });
    }
  } else if (key === "KeyC") {
    isDashing = true;
    dashTime = 0.35;
    dashDirection.copy(forwardDir);
    dashDirection.y = 0;
    dashDirection.normalize();
    dashHitEnemies.clear();
  } else if (key === "KeyV") {
    targets.forEach((t) => {
      if (
        t &&
        !t.userData.isDead &&
        t.position.distanceTo(camera.position) < (t.userData.isBoss ? 170 : 150)
      )
        applyDamageToEnemy(t, 250);
    });
    const explosion = new THREE.Mesh(
      new THREE.SphereGeometry(60, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      })
    );
    explosion.position.copy(camera.position);
    scene.add(explosion);
    fireballs.push({
      mesh: explosion,
      dir: new THREE.Vector3(),
      speed: 0,
      life: 0.5,
      dmg: 0,
      aoe: 0,
      isExplosion: true,
      expandSpeed: 25,
      owner: "player",
    });
  }
}

// --- 9. Game Loop ---
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let prevTime = performance.now();

function lerp(start, end, t) {
  return start * (1 - t) + end * t;
}

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  if (!isDead && health < maxHealth && time - lastDamageTime > HEAL_DELAY) {
    health += HEAL_RATE * delta;
    if (health > maxHealth) health = maxHealth;
    updateHealthUI();
  }

  if (
    isFiring &&
    currentWeapon === 1 &&
    !isReloading &&
    controls.isLocked &&
    !isDead
  ) {
    if (time - lastShootTime > FIRE_RATE) {
      shoot();
      lastShootTime = time;
    }
  }

  // อัปเดต Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.life -= delta;
    p.mesh.position.addScaledVector(p.velocity, delta);
    p.velocity.y -= 200 * delta;
    p.mesh.rotation.x += delta * 5;
    p.mesh.rotation.z += delta * 5;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
    }
  }

  // อัปเดตคลื่นดาบ
  for (let i = swordWaves.length - 1; i >= 0; i--) {
    let sw = swordWaves[i];
    sw.life -= delta;
    sw.mesh.position.addScaledVector(sw.direction, 220 * delta);
    let hitSomething = false;
    for (let j = targets.length - 1; j >= 0; j--) {
      let enemy = targets[j];
      if (!enemy || enemy.userData.isDead) continue;
      const checkDist = enemy.userData.isBoss ? 35 : 15;
      if (sw.mesh.position.distanceTo(enemy.position) < checkDist) {
        const hitPos = enemy.position.clone();
        applyDamageToEnemy(enemy, 50);
        const spark = new THREE.Mesh(
          new THREE.BoxGeometry(3, 3, 3),
          new THREE.MeshBasicMaterial({ color: 0x00ffff })
        );
        spark.position.copy(hitPos);
        scene.add(spark);
        setTimeout(() => scene.remove(spark), 100);
        hitSomething = true;
      }
    }
    if (sw.life <= 0 || hitSomething) {
      scene.remove(sw.mesh);
      swordWaves.splice(i, 1);
    }
  }

  // อัปเดตลูกไฟและเอฟเฟกต์
  for (let i = fireballs.length - 1; i >= 0; i--) {
    let fb = fireballs[i];
    fb.life -= delta;
    if (fb.isExplosion) {
      if (fb.isNuke) {
        fb.mesh.scale.addScalar(delta * 200);
        fb.mesh.material.opacity -= delta * 0.3;
      } else {
        fb.mesh.scale.addScalar(delta * (fb.isAura ? 15 : 10));
        fb.mesh.material.opacity -= delta * 2;
      }
    } else if (fb.isHazard) {
      fb.mesh.material.opacity -= delta;
      if (camera.position.distanceTo(fb.mesh.position) < fb.aoe) {
        takeDamage(fb.dmg);
        fb.life = 0;
      }
    } else {
      fb.mesh.position.addScaledVector(fb.dir, fb.speed * delta);
      let hitSomething = false;

      if (fb.owner === "player") {
        for (let j = targets.length - 1; j >= 0; j--) {
          let enemy = targets[j];
          if (!enemy || enemy.userData.isDead) continue;
          const checkDist = fb.aoe + (enemy.userData.isBoss ? 25 : 10);
          if (fb.mesh.position.distanceTo(enemy.position) < checkDist) {
            const hitPos = enemy.position.clone();
            applyDamageToEnemy(enemy, fb.dmg);
            const spark = new THREE.Mesh(
              new THREE.BoxGeometry(fb.aoe, fb.aoe, fb.aoe),
              new THREE.MeshBasicMaterial({ color: 0xff5500 })
            );
            spark.position.copy(hitPos);
            scene.add(spark);
            setTimeout(() => scene.remove(spark), 100);
            hitSomething = true;
          }
        }
      } else if (fb.owner === "boss") {
        if (fb.mesh.position.distanceTo(camera.position) < fb.aoe + 10) {
          takeDamage(fb.dmg);
          const spark = new THREE.Mesh(
            new THREE.BoxGeometry(10, 10, 10),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
          );
          spark.position.copy(camera.position);
          scene.add(spark);
          setTimeout(() => scene.remove(spark), 100);
          hitSomething = true;
        }
      }
      if (hitSomething) fb.life = 0;
    }
    if (fb.life <= 0) {
      scene.remove(fb.mesh);
      fireballs.splice(i, 1);
    }
  }

  if (controls.isLocked && !isDead) {
    if (isFlying) {
      let currentSpeed = (isSprinting ? 1200.0 : 600.0) * delta;
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      if (moveForward) camera.position.addScaledVector(camDir, currentSpeed);
      if (moveBackward) camera.position.addScaledVector(camDir, -currentSpeed);
      const rightDir = new THREE.Vector3()
        .crossVectors(camDir, camera.up)
        .normalize();
      if (moveRight) camera.position.addScaledVector(rightDir, currentSpeed);
      if (moveLeft) camera.position.addScaledVector(rightDir, -currentSpeed);
      velocity.set(0, 0, 0);
    } else if (isDashing) {
      dashTime -= delta;
      const dashSpeed = currentWeapon === 3 ? 800 : 450;
      camera.position.addScaledVector(dashDirection, dashSpeed * delta);
      if (currentWeapon === 3) {
        const trail = new THREE.Mesh(
          new THREE.BoxGeometry(3, 3, 3),
          new THREE.MeshBasicMaterial({ color: 0xff4400 })
        );
        trail.position.copy(camera.position);
        scene.add(trail);
        setTimeout(() => scene.remove(trail), 200);
      }
      for (let i = targets.length - 1; i >= 0; i--) {
        let enemy = targets[i];
        if (!enemy || enemy.userData.isDead) continue;
        const checkDist = enemy.userData.isBoss ? 55 : 35;
        if (
          camera.position.distanceTo(enemy.position) < checkDist &&
          !dashHitEnemies.has(enemy)
        ) {
          dashHitEnemies.add(enemy);
          applyDamageToEnemy(enemy, currentWeapon === 3 ? 100 : 150);
          const sparkColor = currentWeapon === 3 ? 0xff4400 : 0xff3333;
          const spark = new THREE.Mesh(
            new THREE.BoxGeometry(6, 6, 6),
            new THREE.MeshBasicMaterial({ color: sparkColor })
          );
          spark.position.copy(enemy.position);
          scene.add(spark);
          setTimeout(() => scene.remove(spark), 100);
        }
      }
      if (dashTime <= 0) isDashing = false;
    }

    if (!isDashing && !isFlying) {
      velocity.x -= velocity.x * 10.0 * delta;
      velocity.z -= velocity.z * 10.0 * delta;
      velocity.y -= 400.0 * delta;
      let baseSpeed = isSprinting ? 800.0 : 400.0;
      if (isAiming) baseSpeed = 150.0;
      let healthModifier = Math.max(0.3, health / maxHealth);
      let currentSpeed = baseSpeed * healthModifier;

      direction.z = Number(moveForward) - Number(moveBackward);
      direction.x = Number(moveRight) - Number(moveLeft);
      direction.normalize();
      if (moveForward || moveBackward)
        velocity.z -= direction.z * currentSpeed * delta;
      if (moveLeft || moveRight)
        velocity.x -= direction.x * currentSpeed * delta;
      controls.moveRight(-velocity.x * delta);
      controls.moveForward(-velocity.z * delta);
    }

    camera.position.y += velocity.y * delta;
    if (!isFlying && camera.position.y <= playerHeight) {
      camera.position.y = playerHeight;
      velocity.y = 0;
      canJump = true;
    }

    // --- AI ศัตรู และ บอส ---
    if (!isWaveTransitioning) {
      for (let i = targets.length - 1; i >= 0; i--) {
        let enemy = targets[i];
        if (!enemy || enemy.userData.isDead) continue;
        const dist = enemy.position.distanceTo(camera.position);

        if (enemy.userData.hpGroup)
          enemy.userData.hpGroup.lookAt(
            camera.position.x,
            camera.position.y,
            camera.position.z
          );

        const directionToPlayer = new THREE.Vector3().subVectors(
          camera.position,
          enemy.position
        );
        directionToPlayer.y = 0;
        directionToPlayer.normalize();
        enemy.lookAt(camera.position.x, enemy.position.y, camera.position.z);

        const attackRadius = enemy.userData.isBoss ? 35 : 18;

        if (
          !enemy.userData.isJumping &&
          !enemy.userData.isDashing &&
          !enemy.userData.isChargingBeam &&
          !enemy.userData.isFiringBeam
        ) {
          if (dist > attackRadius) {
            let enemySpeed = enemy.userData.isBoss
              ? 20.0 + currentWave * 0.4
              : 25.0 + currentWave * 0.6;
            if (enemy.userData.bossType === 3) enemySpeed *= 1.5;
            enemy.position.addScaledVector(
              directionToPlayer,
              enemySpeed * delta
            );
          } else {
            if (
              time - enemy.userData.lastShotTime > 1500 &&
              Math.abs(camera.position.y - enemy.position.y) < 30
            ) {
              enemy.userData.lastShotTime = time;
              const lungeDist = enemy.userData.isBoss ? 8 : 4;
              enemy.position.addScaledVector(directionToPlayer, lungeDist);
              setTimeout(() => {
                if (enemy && !enemy.userData.isDead)
                  enemy.position.addScaledVector(directionToPlayer, -lungeDist);
              }, 150);
              takeDamage(enemy.userData.isBoss ? 25 : 15);
            }
          }
        }

        // --- สกิลบอส 4 แบบ ---
        if (enemy.userData.isBoss && !enemy.userData.isDead) {
          // Boss 1: Smasher (ทุบพื้น)
          if (enemy.userData.bossType === 1) {
            if (
              time - enemy.userData.skillTimer > 5000 &&
              !enemy.userData.isJumping
            ) {
              enemy.userData.skillTimer = time;
              enemy.userData.isJumping = true;
              enemy.userData.jumpTime = 0;
              enemy.material.emissive.setHex(0xff0000);
            }
            if (enemy.userData.isJumping) {
              enemy.userData.jumpTime += delta * 1.5;
              let jt = enemy.userData.jumpTime;
              if (jt < 1) {
                enemy.position.y = 20 + Math.sin(jt * Math.PI) * 60;
              } else {
                enemy.position.y = 20;
                enemy.userData.isJumping = false;
                enemy.material.emissive.setHex(enemy.userData.originalEmissive);
                const smashAura = new THREE.Mesh(
                  new THREE.TorusGeometry(5, 2, 16, 100),
                  new THREE.MeshBasicMaterial({
                    color: 0xaa00ff,
                    transparent: true,
                    opacity: 0.8,
                  })
                );
                smashAura.position.copy(enemy.position);
                smashAura.position.y = 1;
                smashAura.rotation.x = -Math.PI / 2;
                scene.add(smashAura);
                fireballs.push({
                  mesh: smashAura,
                  dir: new THREE.Vector3(),
                  speed: 0,
                  life: 0.8,
                  dmg: 0,
                  aoe: 0,
                  isExplosion: true,
                  expandSpeed: 100,
                });
                if (camera.position.distanceTo(enemy.position) < 80) {
                  takeDamage(40);
                  velocity.addScaledVector(directionToPlayer, -800);
                  velocity.y = 300;
                }
              }
            }
          }
          // Boss 2: Shooter (ยิงลูกไฟ)
          else if (
            enemy.userData.bossType === 2 &&
            time - enemy.userData.skillTimer > 4000
          ) {
            enemy.userData.skillTimer = time;
            const fbDir = new THREE.Vector3()
              .subVectors(camera.position, enemy.position)
              .normalize();
            const bFb = new THREE.Mesh(
              new THREE.SphereGeometry(8, 16, 16),
              new THREE.MeshBasicMaterial({ color: 0xff3300 })
            );
            bFb.position.copy(enemy.position);
            bFb.position.y += 10;
            scene.add(bFb);
            fireballs.push({
              mesh: bFb,
              dir: fbDir,
              speed: 200,
              life: 4.0,
              dmg: 40,
              aoe: 15,
              isExplosion: false,
              owner: "boss",
            });
          }
          // Boss 3: Dasher (พุ่งชน)
          else if (enemy.userData.bossType === 3) {
            if (
              time - enemy.userData.skillTimer > 6000 &&
              dist > 40 &&
              !enemy.userData.isDashing
            ) {
              enemy.userData.skillTimer = time;
              enemy.userData.isDashing = true;
              enemy.userData.dashTime = 0;
              enemy.userData.dashDir = new THREE.Vector3()
                .subVectors(camera.position, enemy.position)
                .setY(0)
                .normalize();
              enemy.material.emissive.setHex(0x00ff00);
            }
            if (enemy.userData.isDashing) {
              enemy.userData.dashTime += delta;
              if (enemy.userData.dashTime > 0.5) {
                enemy.position.addScaledVector(
                  enemy.userData.dashDir,
                  600 * delta
                );
                const trail = new THREE.Mesh(
                  new THREE.BoxGeometry(10, 10, 10),
                  new THREE.MeshBasicMaterial({
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.5,
                  })
                );
                trail.position.copy(enemy.position);
                scene.add(trail);
                fireballs.push({
                  mesh: trail,
                  dir: new THREE.Vector3(),
                  speed: 0,
                  life: 1.0,
                  dmg: 10,
                  aoe: 15,
                  isHazard: true,
                });
                if (
                  enemy.userData.dashTime > 1.0 ||
                  camera.position.distanceTo(enemy.position) < 25
                ) {
                  enemy.userData.isDashing = false;
                  enemy.material.emissive.setHex(
                    enemy.userData.originalEmissive
                  );
                  const explosion = new THREE.Mesh(
                    new THREE.SphereGeometry(30, 16, 16),
                    new THREE.MeshBasicMaterial({
                      color: 0x00ff00,
                      transparent: true,
                      opacity: 0.6,
                    })
                  );
                  explosion.position.copy(enemy.position);
                  scene.add(explosion);
                  fireballs.push({
                    mesh: explosion,
                    dir: new THREE.Vector3(),
                    speed: 0,
                    life: 0.5,
                    dmg: 0,
                    aoe: 0,
                    isExplosion: true,
                    expandSpeed: 30,
                  });
                  if (camera.position.distanceTo(enemy.position) < 40)
                    takeDamage(45);
                }
              }
            }
          }
          // Boss 4: Orbital Beamer (เวฟ 20)
          else if (enemy.userData.bossType === 4) {
            if (
              !enemy.userData.isChargingBeam &&
              !enemy.userData.isFiringBeam &&
              time - enemy.userData.skillTimer > 8000
            ) {
              enemy.userData.skillTimer = time;
              enemy.userData.isChargingBeam = true;
              enemy.userData.beamTimer = 0;
              enemy.userData.beamDir = new THREE.Vector3()
                .subVectors(camera.position, enemy.position)
                .normalize();
            }

            if (enemy.userData.isChargingBeam) {
              enemy.userData.beamTimer += delta;
              enemy.lookAt(
                camera.position.x,
                enemy.position.y,
                camera.position.z
              );
              enemy.material.emissiveIntensity =
                1 + enemy.userData.beamTimer * 2;

              const cSpark = new THREE.Mesh(
                new THREE.BoxGeometry(2, 2, 2),
                new THREE.MeshBasicMaterial({ color: 0xffffff })
              );
              cSpark.position.copy(enemy.position);
              cSpark.position.add(
                new THREE.Vector3(
                  (Math.random() - 0.5) * 30,
                  (Math.random() - 0.5) * 30,
                  (Math.random() - 0.5) * 30
                )
              );
              scene.add(cSpark);
              fireballs.push({
                mesh: cSpark,
                dir: new THREE.Vector3(),
                speed: 0,
                life: 0.2,
                dmg: 0,
                aoe: 0,
                isExplosion: true,
                expandSpeed: -10,
              });

              if (enemy.userData.beamTimer >= 2.0) {
                enemy.userData.isChargingBeam = false;
                enemy.userData.isFiringBeam = true;
                enemy.userData.beamTimer = 0;
                enemy.userData.beamDir
                  .subVectors(camera.position, enemy.position)
                  .normalize();

                const beamGeo = new THREE.CylinderGeometry(10, 10, 1000, 16);
                beamGeo.translate(0, 500, 0);
                const beamMat = new THREE.MeshBasicMaterial({
                  color: 0x00ffff,
                  transparent: true,
                  opacity: 0.9,
                  blending: THREE.AdditiveBlending,
                });
                const beam = new THREE.Mesh(beamGeo, beamMat);
                beam.position.copy(enemy.position);
                beam.quaternion.setFromUnitVectors(
                  new THREE.Vector3(0, 1, 0),
                  enemy.userData.beamDir
                );
                scene.add(beam);
                enemy.userData.beamMesh = beam;
              }
            } else if (enemy.userData.isFiringBeam) {
              enemy.userData.beamTimer += delta;

              if (enemy.userData.beamMesh) {
                enemy.userData.beamMesh.scale.x = 1 + Math.random() * 0.5;
                enemy.userData.beamMesh.scale.z = 1 + Math.random() * 0.5;
              }

              const beamStart = enemy.position;
              const playerToBeam = new THREE.Vector3().subVectors(
                camera.position,
                beamStart
              );
              const projectionLength = playerToBeam.dot(enemy.userData.beamDir);

              if (projectionLength > 0 && projectionLength < 1000) {
                const pointOnBeam = new THREE.Vector3()
                  .copy(beamStart)
                  .addScaledVector(enemy.userData.beamDir, projectionLength);
                const distToBeam = camera.position.distanceTo(pointOnBeam);

                if (distToBeam < 15) {
                  takeDamage(2);
                  damageOverlay.style.background = "rgba(0, 255, 255, 0.4)";
                  setTimeout(() => {
                    damageOverlay.style.background =
                      "radial-gradient(circle, transparent 40%, rgba(255,0,0,0.8) 100%)";
                  }, 50);
                }
              }

              if (enemy.userData.beamTimer >= 2.5) {
                enemy.userData.isFiringBeam = false;
                scene.remove(enemy.userData.beamMesh);
                enemy.userData.beamMesh = null;
                enemy.material.emissiveIntensity = 0.5;
              }
            }
          }
        }
      }
    }

    // ลบศพจริงๆ
    for (let i = targets.length - 1; i >= 0; i--) {
      if (targets[i].userData.isDead) targets.splice(i, 1);
    }

    if (enemiesRemaining <= 0 && !isWaveTransitioning && !isDead) {
      checkWaveProgress();
    }

    // --- อนิเมชั่นอาวุธ ---
    if (currentWeapon === 1) {
      const targetFOV = isAiming ? 45 : 75;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.15);
      camera.updateProjectionMatrix();
      const targetP = isAiming ? aimGunPos : defaultGunPos;
      currentGunPos.lerp(targetP, 0.15);
      gunGroup.position.set(
        currentGunPos.x,
        currentGunPos.y,
        currentGunPos.z + recoilZ
      );

      if (isReloading) {
        reloadProgress += delta;
        const p = Math.min(1.0, reloadProgress / 2.2);
        const armGrabPos = new THREE.Vector3(0.2, -0.6, -0.7);
        if (p < 0.25) {
          const t = p / 0.25;
          gunGroup.rotation.z = lerp(0, Math.PI / 4, t);
          gunGroup.rotation.x = lerp(0, Math.PI / 12, t);
          armLeft.position.lerpVectors(armLeftHiddenPos, armGrabPos, t);
        } else if (p < 0.5) {
          const t = (p - 0.25) / 0.25;
          mag.position.y = lerp(magLockedPos.y, -1.5, t);
          armLeft.position.y = lerp(armGrabPos.y, -1.8, t);
          armLeft.position.x = lerp(armGrabPos.x, 0.3, t);
        } else if (p < 0.7) {
          const t = (p - 0.5) / 0.2;
          mag.position.x = lerp(0, -2.0, t);
          mag.position.y = lerp(-1.5, -4.0, t);
          armLeft.position.x = lerp(0.3, -0.5, t);
        } else if (p < 0.9) {
          const t = (p - 0.7) / 0.2;
          if (t < 0.1) mag.position.x = 0;
          mag.position.y = lerp(-3.0, magLockedPos.y, t);
          armLeft.position.y = lerp(-3.3, armGrabPos.y, t);
          armLeft.position.x = lerp(-0.5, armGrabPos.x, t);
        } else if (p < 1.0) {
          const t = (p - 0.9) / 0.1;
          gunGroup.rotation.z = lerp(Math.PI / 4, 0, t);
          gunGroup.rotation.x = lerp(Math.PI / 12, 0, t);
          armLeft.position.lerpVectors(armGrabPos, armLeftHiddenPos, t);
        } else {
          gunGroup.rotation.set(0, 0, 0);
          mag.position.copy(magLockedPos);
          armLeft.position.copy(armLeftHiddenPos);
          isReloading = false;
          ammo = MAX_AMMO;
          updateAmmoUI();
        }
      } else {
        if (recoilZ > 0) recoilZ = Math.max(0, recoilZ - delta * 2);
        if (recoilX > 0) recoilX = Math.max(0, recoilX - delta * 2);
        gunGroup.rotation.x = recoilX;
      }
    } else if (currentWeapon === 2) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, 75, 0.15);
      camera.updateProjectionMatrix();
      if (isChargingSword) {
        swordGroup.rotation.y = lerp(swordGroup.rotation.y, Math.PI / 1.8, 0.1);
        swordGroup.rotation.z = lerp(swordGroup.rotation.z, Math.PI / 12, 0.1);
        swordGroup.position.z = lerp(
          swordGroup.position.z,
          defaultSwordPos.z + 0.8,
          0.1
        );
        bladeMat.emissive.setHex(0xff0000);
        bladeMat.emissiveIntensity = 1.5;
      } else if (isSwinging) {
        let speedMap = { 1: 3.5, 2: 5.0, 3: 6.0 };
        swingProgress += delta * speedMap[swingType];
        if (swingProgress > 1.0) {
          isSwinging = false;
          swordGroup.rotation.set(Math.PI / 3.5, Math.PI / 10, 0);
          swordGroup.position.copy(defaultSwordPos);
        } else {
          const p = Math.pow(Math.sin(swingProgress * Math.PI), 0.7);
          if (swingType === 1) {
            swordGroup.rotation.x = lerp(Math.PI / 3.5, -Math.PI / 2.5, p);
            swordGroup.position.y = lerp(
              defaultSwordPos.y,
              defaultSwordPos.y - 2.0,
              p
            );
            swordGroup.position.z = lerp(
              defaultSwordPos.z,
              defaultSwordPos.z + 1.0,
              p
            );
          } else if (swingType === 2) {
            swordGroup.rotation.y = lerp(Math.PI / 10, -Math.PI / 1.2, p);
            swordGroup.rotation.x = lerp(Math.PI / 3.5, 0, p);
            swordGroup.position.x = lerp(defaultSwordPos.x, -0.5, p);
          } else if (swingType === 3) {
            swordGroup.rotation.x = lerp(Math.PI / 3.5, -Math.PI / 6, p);
            swordGroup.rotation.z = lerp(0, -Math.PI / 4, p);
            swordGroup.position.z = lerp(
              defaultSwordPos.z,
              defaultSwordPos.z - 1.0,
              p
            );
          }
        }
      } else {
        swordGroup.rotation.set(Math.PI / 3.5, Math.PI / 10, 0);
        swordGroup.position.copy(defaultSwordPos);
      }
    } else if (currentWeapon === 3) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, 75, 0.15);
      camera.updateProjectionMatrix();
      if (skillActive) {
        skillT += delta * 4;
        fireHand.position.z = lerp(-1.5, -3.0, Math.sin(skillT * Math.PI));
        if (skillT > 1) {
          skillActive = false;
          fireHand.position.z = -1.5;
        }
      } else {
        fireHand.position.y = -0.8 + Math.sin(time * 0.005) * 0.05;
      }
    }
  }

  prevTime = time;
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
