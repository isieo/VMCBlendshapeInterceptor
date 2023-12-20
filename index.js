const fs = require('fs');
const osc = require("osc")

const CONFIG = JSON.parse(fs.readFileSync('config.json', 'utf8'));

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

var blendShapeConfig = CONFIG.blend_shapes

var blendShapeState = {}

var controllerButtons = {}

udpPort.on("message", function (oscMsg, timeTag, info) {
  if (oscMsg.address == "/VMC/Ext/Con") {
    if (DEBUG_BUTTONS) {
      console.log(oscMsg)
    }
    controllerButtons[oscMsg.args[1].value] = {value: oscMsg.args[0].value, is_left: oscMsg.args[2].value}
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
  }
  udpPort.send(oscMsg, host , port)
});


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



// When the port is read, send an OSC message to, say, SuperCollider
udpPort.on("ready", function () {
  blendShapeConfig.forEach((blendShape) => {
    startBlendshapeTimer()

    if (blendShape.trigger_type == "startup") {
      start_transition(blendShape)
    }
  })
});

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
        match &&= controllerButtons[trigger.button_name] && trigger.is_left == controllerButtons[trigger.button_name].is_left && trigger.value == controllerButtons[trigger.button_name].value
      })

      if (match){
         lastKeyCombiDelay[blendShape.name] = Date.now()
         console.log("Triggering " + blendShape.name)
	       start_transition(blendShape);
      }
    })
    startControllerTimer()
}

startControllerTimer()

function startBlendshapeTimer(){
  setTimeout(update_blend_shapes,1000/animationFPS)
}
