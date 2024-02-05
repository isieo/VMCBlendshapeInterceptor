const fs = require('fs');
const osc = require("osc")
const CONFIG_FILE_NAME = process.argv[2] || 'config.json'

console.log("Using " + CONFIG_FILE_NAME)


const CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE_NAME, 'utf8'));

var udpPort = new osc.UDPPort({
  localAddress: CONFIG.local_address,
  localPort: CONFIG.receive_port,
  metadata: true
});

// Listen for incoming OSC messages.

// Open the socket.
udpPort.open();

const host = CONFIG.send_host
const port = CONFIG.send_port
const performer_port = CONFIG.performer_port
const animationFPS = CONFIG.animation_fps
const DEBUG_BUTTONS = CONFIG.debug_controller


var cameraMotions = CONFIG.camera_motions

var blendShapeConfig = CONFIG.blend_shapes

var cameraState = {x: 0, y: 0, z: -1, rx: 0, ry: 0, rz: 0, fov: 90}

var blendShapeState = {}

var controllerButtons = {}

var bonePositions = {}

var worldScale = {x: 1, y: 1,z :1}

udpPort.on("message", function (oscMsg, timeTag, info) {
  if (oscMsg.address == "/VMC/Ext/Con") {
    let side = oscMsg.args[2].value == 1 ? "Left" : "Right"
    if (DEBUG_BUTTONS) {
      console.log(side+oscMsg.args[1].value, oscMsg)
    }
    
    if (oscMsg.args[4].value > 0) { // if is dpad
      let dpadDirection = getDpadDirection(oscMsg.args[5].value, oscMsg.args[6].value)
        controllerButtons[side+oscMsg.args[1].value] = { value: dpadDirection, is_dpad: true, time: Date.now() }
    }else{
      controllerButtons[side+oscMsg.args[1].value] = { value: oscMsg.args[0].value, is_dpad: false, time: Date.now()}
    }
  }else if (oscMsg.address == "/VMC/Ext/Key") {
    if (DEBUG_BUTTONS) {
      console.log('Key'+oscMsg.args[1].value, oscMsg)
    }
    controllerButtons['Key'+oscMsg.args[1].value] = { value: oscMsg.args[0].value, is_dpad: false, time: Date.now()}
  }else if (oscMsg.address == "/VMC/Ext/Blend/Val") {
    let skip = false
    blendShapeConfig.forEach((blendShape) => {
      if (blendShape.name == oscMsg.args[0].value && blendShape.intercept) {
        skip = true
        return;
      }
    })
    if (!skip && blendShapeState[oscMsg.args[0].value] && !blendShapeState[oscMsg.args[0].value].is_transitioning){
	 blendShapeState[oscMsg.args[0].value].current_value = oscMsg.args[1].value;
    }
    if (skip) {
      return;
    }
  }else if (oscMsg.address == "/VMC/Ext/Root/Pos") {
    // /VMC/Ext/Root/Pos (string){name} (float){p.x} (float){p.y} (float){p.z} (float){q.x} (float){q.y} (float){q.z} (float){q.w} (float){s.x} (float){s.y} (float){s.z}
    //rootPosition = { x: oscMsg.args[1].value, y: oscMsg.args[2].value, z: oscMsg.args[3].value,rx: oscMsg.args[4].value, ry: oscMsg.args[5].value, rz: oscMsg.args[6].value, rw: oscMsg.args[7].value }
    bonePositions["Root"] = { x: oscMsg.args[1].value, y: oscMsg.args[2].value, z: oscMsg.args[3].value,rx: oscMsg.args[4].value, ry: oscMsg.args[5].value, rz: oscMsg.args[6].value, rw: oscMsg.args[7].value }
    worldScale = {x: oscMsg.args[8].value, y: oscMsg.args[9].value, z: oscMsg.args[10].value}
  }else if (oscMsg.address == "/VMC/Ext/Bone/Pos") {
    // /VMC/Ext/Bone/Pos (string){name} (float){p.x} (float){p.y} (float){p.z} (float){q.x} (float){q.y} (float){q.z} (float){q.w}  
    bonePositions[oscMsg.args[0].value] = { x: oscMsg.args[1].value, y: oscMsg.args[2].value, z: oscMsg.args[3].value,rx: oscMsg.args[4].value, ry: oscMsg.args[5].value, rz: oscMsg.args[6].value, rw: oscMsg.args[7].value }
  
  }else if (oscMsg.address == "/VMC/Ext/Cam") {
    let rot = quaternionToEuler(oscMsg.args[4].value,oscMsg.args[5].value,oscMsg.args[6].value,oscMsg.args[7].value)
    cameraState = { x: oscMsg.args[1].value, y: oscMsg.args[2].value, z: oscMsg.args[3].value, rx: rot.x, ry: rot.y, rz: rot.z, fov: oscMsg.args[8].value }
  }
  udpPort.send(oscMsg, host , port)
});


// Unity HumanBodyBones hirarchy
const boneHirarchy = {
  "Hips": "Root",
  "LeftUpperLeg": "Hips",
  "RightUpperLeg": "Hips",
  "LeftLowerLeg": "LeftUpperLeg",
  "RightLowerLeg": "RightUpperLeg",
  "LeftFoot": "LeftLowerLeg",
  "RightFoot": "RightLowerLeg",
  "Spine": "Hips",
  "Chest": "Spine",
  "Neck": "Chest",
  "Head": "Neck",
  "LeftShoulder": "Chest",
  "RightShoulder": "Chest",
  "LeftUpperArm": "LeftShoulder",
  "RightUpperArm": "RightShoulder",
  "LeftLowerArm": "LeftUpperArm",
  "RightLowerArm": "RightUpperArm",
  "LeftHand": "LeftLowerArm",
  "RightHand": "RightLowerArm",
  "LeftToes": "LeftFoot",
  "RightToes": "RightFoot",
  "LeftEye": "Head",
  "RightEye": "Head",
  "LeftThumbProximal": "LeftHand",
  "LeftThumbIntermediate": "LeftThumbProximal",
  "LeftThumbDistal": "LeftThumbIntermediate",
  "LeftIndexProximal": "LeftHand",
  "LeftIndexIntermediate": "LeftIndexProximal",
  "LeftIndexDistal": "LeftIndexIntermediate",
  "LeftMiddleProximal": "LeftHand",
  "LeftMiddleIntermediate": "LeftMiddleProximal",
  "LeftMiddleDistal": "LeftMiddleIntermediate",
  "LeftRingProximal": "LeftHand",
  "LeftRingIntermediate": "LeftRingProximal",
  "LeftRingDistal": "LeftRingIntermediate",
  "LeftLittleProximal": "LeftHand",
  "LeftLittleIntermediate": "LeftLittleProximal",
  "LeftLittleDistal": "LeftLittleIntermediate",
  "RightThumbProximal": "RightHand",
  "RightThumbIntermediate": "RightThumbProximal",
  "RightThumbDistal": "RightThumbIntermediate",
  "RightIndexProximal": "RightHand",
  "RightIndexIntermediate": "RightIndexProximal",
  "RightIndexDistal": "RightIndexIntermediate",
  "RightMiddleProximal": "RightHand",
  "RightLittleProximal": "RightHand",
  "RightMiddleIntermediate": "RightMiddleProximal",
  "RightMiddleDistal": "RightMiddleIntermediate",
  "RightRingProximal": "RightHand",
  "RightRingIntermediate": "RightRingProximal",
  "RightRingDistal": "RightRingIntermediate",
  "RightLittleProximal": "RightHand",
  "RightLittleIntermediate": "RightLittleProximal",
  "RightLittleDistal": "RightLittleIntermediate",
  "UpperChest": "Chest"
}

/* 
Calculate the bone position in world space based IK and FK of the boneHirarchy
the current bone position is the base position of the bone and the child bone's position is the end position of the current bone
the position of the bones are affected by the rotation of the parent bone
*/
function calculateBonePosition(boneName) {
  let finalQuat = [0,0,0,1]
  let finalPos = [0,0,0]
  let currentBone = boneName
  while (currentBone != "Root") {
    let bone = bonePositions[currentBone]
    let parentBone = boneHirarchy[currentBone]
    let parentBonePos = bonePositions[parentBone]
    let parentBoneQuat = [parentBonePos.rx, parentBonePos.ry, parentBonePos.rz, parentBonePos.rw]
    let boneQuat = [bone.rx, bone.ry, bone.rz, bone.rw]
    let bonePos = [bone.x, bone.y, bone.z]
    let newQuat = quaternionMultiply(parentBoneQuat, boneQuat)
    let newPos = quaternionRotateVector(parentBoneQuat, bonePos)
    newPos = [newPos[0] + parentBonePos.x, newPos[1] + parentBonePos.y, newPos[2] + parentBonePos.z]
    finalQuat = quaternionMultiply(finalQuat, newQuat)
    finalPos = [finalPos[0] + newPos[0], finalPos[1] + newPos[1], finalPos[2] + newPos[2]]
    currentBone = parentBone
  }
  finalPos = [finalPos[0] * worldScale.x, finalPos[1] * worldScale.y, finalPos[2] * worldScale.z]

  return {x: finalPos[0], y: finalPos[1], z: finalPos[2]}
}

function quaternionMultiply(q1, q2) {
  let w1 = q1[3], x1 = q1[0], y1 = q1[1], z1 = q1[2]
  let w2 = q2[3], x2 = q2[0], y2 = q2[1], z2 = q2[2]
  return [
    x1 * w2 + y1 * z2 - z1 * y2 + w1 * x2,
    -x1 * z2 + y1 * w2 + z1 * x2 + w1 * y2,
    x1 * y2 - y1 * x2 + z1 * w2 + w1 * z2,
    w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2
  ]
}


function quaternionRotateVector(quat, vec) {
  let x = vec[0], y = vec[1], z = vec[2]
  let qx = quat[0], qy = quat[1], qz = quat[2], qw = quat[3]
  let ix = qw * x + qy * z - qz * y
  let iy = qw * y + qz * x - qx * z
  let iz = qw * z + qx * y - qy * x
  let iw = -qx * x - qy * y - qz * z
  return [
    ix * qw + iw * -qx + iy * -qz - iz * -qy,
    iy * qw + iw * -qy + iz * -qx - ix * -qz,
    iz * qw + iw * -qz + ix * -qy - iy * -qx
  ]
}

// quartetion to euler
function quaternionToEuler(x, y, z, w) {
  let t0 = +2.0 * (w * x + y * z);
  let t1 = +1.0 - 2.0 * (x * x + y * y);
  let X = Math.atan2(t0, t1);
  let t2 = +2.0 * (w * y - z * x);
  t2 = t2 > 1.0 ? 1.0 : t2;
  t2 = t2 < -1.0 ? -1.0 : t2;
  let Y = Math.asin(t2);
  let t3 = +2.0 * (w * z + x * y);
  let t4 = +1.0 - 2.0 * (y * y + z * z);
  let Z = Math.atan2(t3, t4);
  return {
    x: X,
    y: Y,
    z: Z
  };
}

// rotation in dregrees
function eulerToDegree(x, y, z) {
  return {
    x: x * 180 / Math.PI,
    y: y * 180 / Math.PI,
    z: z * 180 / Math.PI
  };
}

// rotation in radians
function degreeToEuler(x, y, z) {
  return {
    x: x * Math.PI / 180,
    y: y * Math.PI / 180,
    z: z * Math.PI / 180
  };
}

function bezier(t, p0, p1, p2, p3) {
  return (1-t)*(1-t)*(1-t)*p0 + 3*(1-t)*(1-t)*t*p1 + 3*(1-t)*t*t*p2 + t*t*t*p3;
}

function start_transition(blendShape, bounce = false) {
  if (blendShapeState[blendShape.name] && blendShapeState[blendShape.name].is_transitioning){
    if (bounce && blendShapeState[blendShape.name].animation_type == "bounce") {
      blendShapeState[blendShape.name].is_transitioning = false
    }else{
      return
    }
  }
    if (blendShapeState[blendShape.name] == undefined) blendShapeState[blendShape.name] = {};

    if (bounce || (blendShape.toggle && blendShapeState[blendShape.name] && blendShapeState[blendShape.name].current_value)) {
      blendShapeState[blendShape.name].initial_value = blendShape.target_value
      blendShapeState[blendShape.name].target_value =  blendShape.initial_value
    }else{
      blendShapeState[blendShape.name].initial_value = blendShape.initial_value
      blendShapeState[blendShape.name].target_value = blendShape.target_value
    }
    blendShapeState[blendShape.name].transition_duration = blendShape.transition_duration
    blendShapeState[blendShape.name].animation_type = blendShape.animation_type
    blendShapeState[blendShape.name].transition_bezier = blendShape.transition_bezier
    blendShapeState[blendShape.name].transition_type = blendShape.transition_type
    blendShapeState[blendShape.name].start_time = Date.now()
    blendShapeState[blendShape.name].frame = 0
    blendShapeState[blendShape.name].is_transitioning = true
    blendShapeState[blendShape.name].direction =  (blendShapeState[blendShape.name].initial_value < blendShapeState[blendShape.name].target_value) ? "increase" : "decrease"
}




function transition_blend_shape(blendShape) {
  blendShape.frame += 1.0 / (blendShape.transition_duration/animationFPS) 
  let t = blendShape.frame
  let curve = 0
  if (blendShape.transition_type == "linear") {
      curve = bezier(t, 1,1,0,0)
  }else if (blendShape.transition_type == "bezier") {
      curve = bezier(t, blendShape.transition_bezier[0], blendShape.transition_bezier[1], blendShape.transition_bezier[2], blendShape.transition_bezier[3])
  }
  
  if (blendShape.direction == "decrease"){
    curve = 1 - curve
  }

  if (curve > 1) curve = 1;
  if (curve < 0) curve = 0;
  return curve
}

let blendShapeChanges = {}
function update_blend_shapes() {
  Object.keys(blendShapeState).forEach((blendShapeName) => {
    if (blendShapeState[blendShapeName].current_value == undefined) {
      blendShapeState[blendShapeName].current_value = blendShapeState[blendShapeName].initial_value
    }
    if (blendShapeState[blendShapeName].is_transitioning) {
      blendShapeState[blendShapeName].current_value = transition_blend_shape(blendShapeState[blendShapeName])
      blendShapeChanges[blendShapeName] = blendShapeState[blendShapeName].current_value
    }

    if ( blendShapeState[blendShapeName].is_transitioning &&
        (blendShapeState[blendShapeName].direction == "increase" && blendShapeState[blendShapeName].current_value >= blendShapeState[blendShapeName].target_value) ||
        (blendShapeState[blendShapeName].direction == "decrease" && blendShapeState[blendShapeName].current_value <= blendShapeState[blendShapeName].target_value)
      ) {
        if (blendShapeState[blendShapeName].animation_type == "bounce") {
          start_transition(blendShapeConfig.find((b) =>{ return b.name == blendShapeName }), true)
        } else {
          blendShapeState[blendShapeName].is_transitioning = false
        }
    }
  })

  Object.keys(blendShapeChanges).forEach((blendShapeName) => {
    sendBlendShape(blendShapeName, blendShapeChanges[blendShapeName])
  })
  if (Object.keys.length > 0)  commitBlendShape()
  startBlendshapeTimer()

}

function rotationToQuaternion(x,y,z){
  let qx = Math.sin(x/2) * Math.cos(y/2) * Math.cos(z/2) - Math.cos(x/2) * Math.sin(y/2) * Math.sin(z/2);
  let qy = Math.cos(x/2) * Math.sin(y/2) * Math.cos(z/2) + Math.sin(x/2) * Math.cos(y/2) * Math.sin(z/2);
  let qz = Math.cos(x/2) * Math.cos(y/2) * Math.sin(z/2) - Math.sin(x/2) * Math.sin(y/2) * Math.cos(z/2);
  let qw = Math.cos(x/2) * Math.cos(y/2) * Math.cos(z/2) + Math.sin(x/2) * Math.sin(y/2) * Math.sin(z/2);
  return [qx,qy,qz,qw]
}


// this is a 3d  lookat function accepts x,y,z of the camera and the position x,y,z of target
// it should return the x,y,z rotation of the camera
function lookAt(x, y, z, tx, ty, tz) {
  // Calculate the direction vector from the camera to the target
  const dx = tx - x;
  const dy = ty - y;
  const dz = tz - z;

  // Calculate the distance between the camera and the target
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Normalize the direction vector to get a unit vector
  const directionX = dx / distance;
  const directionY = dy / distance;
  const directionZ = dz / distance;

  // Calculate the camera's forward vector
  const forwardX = directionX;
  const forwardY = directionY;
  const forwardZ = directionZ;

  // Calculate the camera's up vector (assuming up is in the positive Y-axis)
  const upX = 0;
  const upY = 1;
  const upZ = 0;

  // Calculate the camera's right vector using cross product
  const rightX = upY * forwardZ - upZ * forwardY;
  const rightY = upZ * forwardX - upX * forwardZ;
  const rightZ = upX * forwardY - upY * forwardX;

  // Calculate the camera's pitch (rotation around the X-axis)
  const pitch = Math.asin(-forwardY);

  // Calculate the camera's yaw (rotation around the Y-axis)
  const yaw = Math.atan2(forwardX, forwardZ);

  // Calculate the camera's roll (rotation around the Z-axis)
  const roll = Math.atan2(rightY, upY);

  return {
    x: pitch,
    y: yaw,
    z: roll
  };
}

// EaseBezier is the bezier curve used for the transition default value is  [0.34,0.1,0.34,1]
let cameraMotionTimer = 0
let cameraDelayTimer = 0
function startCameraMotion(motion_key, index = 0){
  if (cameraMotions[motion_key] == undefined) return;
  let motion = cameraMotions[motion_key]
  if (motion.Movements[index] == undefined) {
    if (motion.Loop) {
      index = 0
    }else{
      return
    }
  }
  // we linearly interpolate the position and rotation
  clearInterval(cameraMotionTimer)
  clearTimeout(cameraDelayTimer)
  let start_time = Date.now()
  cameraMotionTimer = setInterval(() => {
    let elapsed_time = Date.now() - start_time
    let t = Math.min(1, elapsed_time / (motion.Movements[0].Duration * 1000))
    let p = motion.Movements[index]
    if (p.EaseTransition){
      if (p.EaseBezier == undefined) p.EaseBezier = [0.34,0.1,0.34,1]
      t = bezier(t, p.EaseBezier[0], p.EaseBezier[1], p.EaseBezier[2], p.EaseBezier[3])
    }
  
    if (p.TurnToHead){
      let headPos = calculateBonePosition(p.HeadBone)
      if (headPos == undefined) return
      let x = (1 - t) * p.StartPos.x + t * p.EndPos.x
      let y = (1 - t) * p.StartPos.y + t * p.EndPos.y
      let z = (1 - t) * p.StartPos.z + t * p.EndPos.z
      let fov = (1 - t) * p.StartPos.FOV + t * p.EndPos.FOV
      headPos = {
        x: headPos.x + p.StartHeadOffset.x,
        y: headPos.y + p.StartHeadOffset.y,
        z: headPos.z + p.StartHeadOffset.z
      }
      let lookAtRot = lookAt(x,y,z,headPos.x, headPos.y, headPos.z)
      sendCameraPosition(x, y, z, lookAtRot.x, lookAtRot.y, lookAtRot.z, fov)
    }else{
      let x = (1 - t) * p.StartPos.x + t * p.EndPos.x
      let y = (1 - t) * p.StartPos.y + t * p.EndPos.y
      let z = (1 - t) * p.StartPos.z + t * p.EndPos.z

      let startRot = degreeToEuler(p.StartRot.x, p.StartRot.y, p.StartRot.z)
      let endRot = degreeToEuler(p.EndRot.x, p.EndRot.y, p.EndRot.z)

      let rx = (1 - t) * startRot.x + t * endRot.x
      let ry = (1 - t) * startRot.y + t * endRot.y
      let rz = (1 - t) * startRot.z + t * endRot.z
      let fov = (1 - t) * p.StartPos.FOV + t * p.EndPos.FOV
      sendCameraPosition(x, y, z, rx, ry, rz, fov)
    }
    if (t >= 1) {
      clearInterval(cameraMotionTimer)
      cameraDelayTimer = setTimeout(() => {
        startCameraMotion(motion_key, index + 1)
      }, (p.Delay > 0 ? p.Delay * 1000 : 0 ) + 1)
    }
  })
}

// Reference:
// /VMC/Ext/Cam (string){Camera} (float){p.x} (float){p.y} (float){p.z} (float){q.x} (float){q.y} (float){q.z} (float){q.w} (float){fov} 
// p=Position
// q=Quaternion
//
function sendCameraPosition(x,y,z,rx,ry,rz,fov){
  var dport = port
  if (CONFIG.send_blendshape_to_performer) dport = performer_port

  quaternion = rotationToQuaternion(rx,ry,rz)
  udpPort.send({
      address: "/VMC/Ext/Cam",
      args: [
          {
              type: "s",
              value: "Camera"
          },
          {
              type: "f",
              value: x
          },
          {
              type: "f",
              value: y
          },
          {
              type: "f",
              value: z
          },
          {
              type: "f",
              value: quaternion[0]
          },
          {
              type: "f",
              value: quaternion[1]
          },
          {
              type: "f",
              value: quaternion[2]
          },
          {
              type: "f",
              value: quaternion[3]
          },
          {
              type: "f",
              value: fov
          }
      ]
  }, host, dport);
}

function sendBlendShape(shape, val, commit = false){
  var dport = port
  if (CONFIG.send_blendshape_to_performer) dport = performer_port
  udpPort.send({
      address: "/VMC/Ext/Blend/Val",
      args: [
          {
              type: "s",
              value: shape
          },
          {
              type: "f",
              value: val
          }
      ]
  }, host, dport);

  if (commit) commitBlendShape();
}

function commitBlendShape(){
  var dport = port
  if (CONFIG.send_blendshape_to_performer) dport = performer_port
  udpPort.send({address: "/VMC/Ext/Blend/Apply"}, host , dport);
}

/* 
  Get the direction of the dpad based on the x,y values
  x,y are the floats
  this function will normalize the values to 0,1,-1
  then return either "right", "left", "top", "bottom", "topleft", "topright", "bottomleft", "bottomright", "none"
*/
function getDpadDirection(x,y){
  let xdir = "none"
  let ydir = "none"
  if (x > 0.5) xdir = "right"
  if (x < -0.5) xdir = "left"
  if (y > 0.5) ydir = "top"
  if (y < -0.5) ydir = "bottom"
  if (xdir == "none" && ydir == "none") return "none"
  if (xdir == "none") return ydir
  if (ydir == "none") return xdir
  return ydir + xdir
}

// When the port is read, send an OSC message to, say, SuperCollider
udpPort.on("ready", function () {
  blendShapeConfig.forEach((blendShape) => {
    startBlendshapeTimer()

    if (blendShape.trigger_type == "startup") {
      if (cameraMotions[blendShape.name]) {
        setTimeout(()=>{startCameraMotion(blendShape.name)},1000)
       }else{
        start_transition(blendShape);
       }
    }
  })
});

function moveCameraForward(step=0.5){
  let headPos = bonePositions["Head"]
  let x = cameraState.x - headPos.x
  let y = cameraState.y - headPos.y
  let z = cameraState.z - headPos.z
  let distance = Math.sqrt(x*x + y*y + z*z)
  let dx = x / distance * step
  let dy = y / distance * step
  let dz = z / distance * step
  sendCameraPosition(cameraState.x + dx, cameraState.y + dy, cameraState.z + dz, cameraState.rx, cameraState.ry, cameraState.rz, cameraState.fov)
}

function moveCameraBackward(step=0.5){
  let headPos = bonePositions["Head"]
  let x = cameraState.x - headPos.x
  let y = cameraState.y - headPos.y
  let z = cameraState.z - headPos.z
  let distance = Math.sqrt(x*x + y*y + z*z)
  let dx = x / distance * step
  let dy = y / distance * step
  let dz = z / distance * step
  sendCameraPosition(cameraState.x - dx, cameraState.y - dy, cameraState.z - dz, cameraState.rx, cameraState.ry, cameraState.rz, cameraState.fov)
}

function lookAtHead(){
  let headPos = calculateBonePosition("Head")
  let x = cameraState.x
  let y = cameraState.y
  let z = cameraState.z
  let lookAtRot = lookAt(cameraState.x, cameraState.y, cameraState.z, headPos.x, headPos.y, headPos.z)
  sendCameraPosition(cameraState.x, cameraState.y, cameraState.z, lookAtRot.x, lookAtRot.y, lookAtRot.z, cameraState.fov)
}


function startControllerTimer(){
	setTimeout(checkControllerIO,100)
}

let lastKeyCombiDelay = {}
function checkControllerIO(){
      blendShapeConfig.forEach((blendShape) => {
      if (Date.now() - lastKeyCombiDelay[blendShape.name] < 1000) {
	      return;
      }
      if (blendShape.trigger_type != "controller") return;
      let match = blendShape.trigger_conditions.length > 0
      blendShape.trigger_conditions.forEach((trigger) => {
        match &&= controllerButtons[trigger.button_name] &&
                  trigger.value == controllerButtons[trigger.button_name].value &&
                  Date.now() - controllerButtons[trigger.button_name].time < (trigger.max_held ? trigger.max_held : 250)
      })

      if (match){
         lastKeyCombiDelay[blendShape.name] = Date.now()
         console.log("Triggering " + blendShape.name)
         if (cameraMotions[blendShape.name]) {
          setTimeout(()=>{startCameraMotion(blendShape.name)},1)
        }else if (blendShape.name == "moveCameraForward"){
          moveCameraForward()
         }else if (blendShape.name == "moveCameraBackward"){
          moveCameraBackward()
         }else if (blendShape.name == "lookAtHead"){
          lookAtHead()
         }else if (blendShape.name == "CameraCoordinates"){
          let rotation = eulerToDegree(cameraState.rx, cameraState.ry, cameraState.rz)
          hash = {"Pos": {
                        "x": cameraState.x,
                        "y":  cameraState.y,
                        "z":  cameraState.z,
                        "FOV": cameraState.fov
                    },
                    "Rot": {   
                        "x": rotation.x,
                        "y": rotation.y,
                        "z": rotation.z
                    }}

          //serealized hash to json
          console.log("Current Camera State", JSON.stringify(hash) )
         }else{
          start_transition(blendShape);
         }
      }
    })
    startControllerTimer()
}

startControllerTimer()

function startBlendshapeTimer(){
  setTimeout(update_blend_shapes,1000/animationFPS)
}
