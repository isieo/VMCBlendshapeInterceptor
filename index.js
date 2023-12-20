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
const animationFPS = CONFIG.animation_fps
const DEBUG_BUTTONS = CONFIG.debug_buttons

var blendShapeConfig = CONFIG.blend_shapes

var blendShapeState = {}

udpPort.on("message", function (oscMsg, timeTag, info) {
  if (oscMsg.address == "/VMC/Ext/Con") {
    if (DEBUG_BUTTONS) {
      console.log(oscMsg)
    }
    blendShapeConfig.forEach((blendShape) => {
      blendShape.trigger_conditions.forEach((trigger) => {
        if (trigger.button_name == oscMsg.args[1].value && trigger.is_left == oscMsg.args[2].value) {
          start_transition(blendShape)
        }
      })
    })
  }else if (oscMsg.address == "/VMC/Ext/Blend/Val") {
    let skip = false
    blendShapeConfig.forEach((blendShape) => {
      if (blendShape.name == oscMsg.args[0].value && blendShape.intercept) {
        skip = true
        return;
      }
    })
    if (skip) return;
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
  blendShapeState[blendShape.name] = {
    initial_value: blendShape.initial_value,
    target_value: blendShape.target_value,
    transition_duration: blendShape.transition_duration,
    animation_type: blendShape.animation_type,
    transition_bezier: blendShape.transition_bezier,
    transition_type: blendShape.transition_type,
    start_time: Date.now(),
    frame: 0,
    is_transitioning: true
  }

  if (bounce || (blendShape.toggle && blendShapeState[blendShape.name] && !blendShapeState[blendShape.name].is_transitioning)) {
    blendShapeState[blendShape.name].initial_value = blendShape.target_value
    blendShapeState[blendShape.name].target_value =  blendShape.initial_value
  }

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

function update_blend_shapes() {
  let blendShapeChanges = {}
  Object.keys(blendShapeState).forEach((blendShapeName) => {
    let blendShape = blendShapeState[blendShapeName]
    if (blendShape.current_value == undefined) {
      blendShape.current_value = blendShape.initial_value
    }
    if (blendShape.is_transitioning) {
      blendShape.current_value = transition_blend_shape(blendShape)
    }
    blendShapeChanges[blendShapeName] = blendShape.current_value
    if ( blendShape.is_transitioning &&
        (blendShape.direction == "increase" && blendShape.current_value >= blendShape.target_value) ||
        (blendShape.direction == "decrease" && blendShape.current_value <= blendShape.target_value)
      ) {
        if (blendShape.animation_type == "bounce") {
          start_transition(blendShapeConfig.find((b) =>{ return b.name == blendShapeName }), true)
        } else {
          blendShape.is_transitioning = false
        }
    }
  })
  Object.keys(blendShapeChanges).forEach((blendShapeName) => {
    sendBlendShape(blendShapeName, blendShapeChanges[blendShapeName])
  })
  commitBlendShape()
}

function sendBlendShape(shape, val, commit = false){
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
  }, host, port);

  if (commit) commitBlendShape();
}

function commitBlendShape(){
  udpPort.send({address: "/VMC/Ext/Blend/Apply"}, host , port);
}



// When the port is read, send an OSC message to, say, SuperCollider
udpPort.on("ready", function () {
  blendShapeConfig.forEach((blendShape) => {
    if (blendShape.trigger_type == "startup") {
      start_transition(blendShape)
    }
  })
});

setInterval(() => {
  update_blend_shapes()
},1000/animationFPS)