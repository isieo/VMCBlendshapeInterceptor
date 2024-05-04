# VMC Blendshape Interceptor
This script intercepts Virtual Motion Capture's Protocol and allow you to animate or inject blenshapes.
I made this script to animate my company's mascott, iniitally the plan was to write this in unity but running vseeface alone already takes up most of the resources in the company's computer..
so i made this in nodejs, 

# Assumption and rationale
I am assuming that you will be using Virtual Motion Capture(VMC) - i have only tested with VMC
I also don't want to make a Unity app for this as i feel that it will add additional load to the system.

# Modes of operation

## Proxy mode
This will let the application live between the Performer(e.g. VMC) and the Marionette (Beatsaber VMC plugin, Vseeface, etc)
To set this up, you will have to set the "receive_port" to be the port number of your Performer software and then the "send_port" to the Marionette software's port
This will make the Performer connect to this script and this script will connect to Marionette allowing you to intercept or modify the vmc protocol sent

Use this mode when you need to read controller input or you need to modify the data being sent, this mode should be the primary way to use this script

## Assistant mode
This will act as a simple blendshape sender, "local_port" can be set to any unused port number as its not important. 
"send_host" should be the port number of the Performer's receiving port usually port 39540

# Hybrid mode (Reccomended)
This is probably the way forward. Set the "receive_port" to Performer's(e.g. VMC) send port, then Send Port to the Marionette (Beatsaber VMC plugin, Vseeface, etc)
set "send_blendshape_to_performer" to true and set the performer_port to the performer's vmc input. With this setup, any blendshape or camera data will also be reflected by 
the Performer. Remember to turn off "intercept" for blendshape config


# Installation / Requirments
Install Node 16.13.1 (will probably work for later versions too)

Run:
```
npm start
```

For windows users, download the Release versions, i have included the node standalone binary. All you need to do is to run Start.bat


# Configuration

Configuration should be done in config.json

The first few lines should be quite self explainatory

```
    "local_address": "0.0.0.0",  // Ip address or host of your computer, leave it at 0.0.0.0 to listen to all addresses
    "receive_port": 39538,       // The receiving port from VMC or any other sending software
    "send_host": "127.0.0.1",    // The destination Host or ip address if you are running this on the same computer where the game/marionette software is keep it at 127.0.0.1
    "send_port": 39539,          // The destination Port (Beatsaber vmc plugin, Vseeface, etc)
    "performer_port": 39540,     // the port that the prrformer can receive (usually from Assistants)
    "send_blendshape_to_performer": false, //send the blendshapes to the performer port instead of the game/marionette
    "debug_controller": false,   // For VR use, you might want to find the actual button names, set this to true then in steamvr, press the buttons it should appear in the console window (make sure steam menu is closed)
    "animationFPS": 60,          // How many "frames" should be sent per second when animating a blendshape
    "repeat_packets": false,          // Repeat all the packets to a different application, useful if want to have multiple marionette softwares
    "repeat_host": "127.0.0.1",  
    "repeat_port": 39542,
    "httpPort": 8088,            // HTTP Port that will be listening in localhost, this is useful to triggering blendshapes via an external application
```


Blendshape config
```
{
    "name":"Joy",   // The name of the blendshape, this should be case sensitive
    "toggle":true,                 // Should triggering this config "undo" it?
    "intercept":true,              // Prevent the performer from sending this blendshape to the target application?
    "initial_value":0,             // Value at the start when this block is triggered
    "target_value":1,              // Value at the end of the animation/trigger
    "trigger_type":"controller",   // Current Available options: "controller", "startup"
    "trigger_conditions":[         // used when options is set to "controller"
        {
            "button_name":"LeftClickXbutton",   // The button name that was triggered, use "debug_controller" to find out the names
            "trigger_debounce": 1000,           // Debounce the button, this is to prevent double execution, increase if it "doubleclicks"
            "max_held": 250,                    // How long to hold button to activate the trigger
            "value":1                  // 1=press, 0=release, 2=change Axis  (as per VMC protocol) for thumbstick or dpad it can be: "right", "left", "top", "bottom", "topleft", "topright", "bottomleft", "bottomright" or "none"
        },
        ... // you can have more buttons to handle button combinations
    ],
    "transition_type":"bezier",  // Animation easing, available options: "linear", "bezier"
    "transition_bezier":[       // You can get the values here from: https://cubic-bezier.com/ 
        0.59,
        0.1,
        0.34,
        1
    ],
    "transition_duration":1000,  // milliseconds of how long should this block transition from initial value to the target value?  
    "animation_type":"bounce"    /* Available options: "oneoff", "bounce".  when set to bounce, animation will reverse when it reaches its value
                                      bounce will animate until the trigger happens again or if another blendshape with the same name is triggered
                                */ 
}                                
                                    
```


Camera Config
The Camera Config is based on Beatsaber's CameraPlus to make it easy for someone to use existing movement scripts, please note that there are some minor differences
See: https://github.com/Snow1226/CameraPlus/wiki/MovementScript
To get camera coordinates, you can set "CameraCoordinates" as one of the blendshape and assign a key on it.

```
"camera_controls": {
   "MovementScript1": {  // Name of the movment script, use this in place of a Blendshape name in the Blendshape config to activate, values will be ignored in the blendshape config
      "Loop": true,                 // restart from begining when all motion has been performed
      "Movements": [                 //"Movements"        : Position description section of the moving camera.
         {
            "HeadBone": "Head",           // Name Of the Head Bone, you can change this to other body parts to override Head
                                          // Possible values are: "Hips", "LeftUpperLeg", "RightUpperLeg", "LeftLowerLeg", "RightLowerLeg", "LeftFoot", "RightFoot", "Spine", "Chest", "Neck", "Head", "LeftShoulder", "RightShoulder", "LeftUpperArm", "RightUpperArm", "LeftLowerArm",
                                          // "RightLowerArm", "LeftHand", "RightHand", "LeftToes", "RightToes", "LeftEye", "RightEye", "LeftThumbProximal", "LeftThumbIntermediate", "LeftThumbDistal", "LeftIndexProximal", "LeftIndexIntermediate", "LeftIndexDistal", "LeftMiddleProximal",
                                          // "LeftMiddleIntermediate", "LeftMiddleDistal", "LeftRingProximal", "LeftRingIntermediate", "LeftRingDistal", "LeftLittleProximal", "LeftLittleIntermediate", "LeftLittleDistal", "RightThumbProximal", "RightThumbIntermediate", "RightThumbDistal"
                                          // "RightIndexProximal", "RightIndexIntermediate", "RightIndexDistal", "RightMiddleProximal", "RightLittleProximal", "RightMiddleIntermediate", "RightMiddleDistal", "RightRingProximal", "RightRingIntermediate", "RightRingDistal", 
                                          // "RightLittleIntermediate", "RightLittleDistal", "UpperChest"
            "StartPos": {              //"StartPos"         : Camera start position (the center of the play area is 0,0,0).
                  "x": 2,
                  "y": 1.75,
                  "z": -2,
                  "FOV": 90              //"FOV"              : (Optional) StartFOV 
            },
            "StartRot": {              //"StartRot"         : The rotation at which the camera starts (0,0,0 looks straight at the main menu).
                  "x": 15,
                  "y": -15,
                  "z": 0
            },
            "StartHeadOffset": {       //"StartHeadOffset"  : (Optional) Only when TurnToHead or TurnToHeadUseCameraSetting is enabled
                  "x": 0,　　　　　　　　　　　　　　　　　　　　　 Offset when pointing the camera towards the HMD(the center of the HMD is 0,0,0).
                  "y": 0,
                  "z": 0
            },
            "EndPos": {                //"EndPos"           : The position where the camera ends.
                  "x": 2,
                  "y": 1,
                  "z": 9,
                  "FOV": 40              //"FOV"              : (Optional) EndFOV 
            },
            "EndRot": {                //"EndRot"           : The rotation at which the camera ends.
                  "x": 15,
                  "y": -40,
                  "z": 0
            },
            "EndHeadOffset": {         //"EndHeadOffset"    : (Optional) Only when TurnToHead or TurnToHeadUseCameraSetting is enabled
                  "x": 0,　　　　　　　　　　　　　　　　　　　　 　Offset when pointing the camera towards the HMD(the center of the HMD is 0,0,0).
                  "y": 0,
                  "z": 0
            },
            "CameraEffect":{
                  "enableDoF": false,
                  "dofAutoDistance": false,
                  "StartDoF": {
                        "dofFocusDistance": 1.0,
                        "dofFocusRange": 1.0,
                        "dofBlurRadius": 5.0
                  },
                  "EndDoF": {
                        "dofFocusDistance": 1.0,
                        "dofFocusRange": 1.0,
                        "dofBlurRadius": 5.0
                  },
                  "wipeType": "Circle",
                  "StartWipe": {
                        "wipeProgress": 0.0,
                        "wipeCircleCenter": {
                              "x": 0.0,
                              "y": 0.0
                        }
                  },
                  "EndWipe": {
                        "wipeProgress": 0.0,
                        "wipeCircleCenter": {
                              "x": 0.0,
                              "y": 0.0
                        }
                  },
                  "enableOutlineEffect": false,
                  "StartOutlineEffect": {
                        "outlineEffectOnly": 0.0,
                        "outlineColor":{
                              "r": 0.0,
                              "g": 0.0,
                              "b": 0.0
                        },
                        "outlineBackgroundColor":{
                              "r": 0.0,
                              "g": 0.0,
                              "b": 0.0
                        }
                  },
                  "EndOutlineEffect": {
                        "outlineEffectOnly": 0.0,
                        "outlineColor":{
                              "r": 0.0,
                              "g": 0.0,
                              "b": 0.0
                        },
                        "outlineBackgroundColor":{
                              "r": 0.0,
                              "g": 0.0,
                              "b": 0.0
                        }
                  }
            },
            "TurnToHead": false,       //"TurnToHead"       : If true, this section will point the camera at the HMD.
            "Duration": 4,             //"Duration"         : The time it takes for the transition to start / end / rotate.
            "Delay": 0,                //"Delay"            : the time to wait before proceeding to the next move.
            "EaseTransition": true     //"EaseTransition"   : If false, the transition between start / end will be linear. Otherwise, the transition is slower from the beginning to the end and faster.
            "EaseBezier": [           //"EaseBezier"        : Use this curve for easing, Note that this does not exist in cameraplus motion script, if left blank, default value is [0.34,0.1,0.34,1]
               0.34,
               0.1,
               0.34,
               1
            ]
         }
      ]
   }
}
```

# Example

BlendShape Config Example
```
        {
           "name":"A",
           "toggle":true,
           "intercept":true,
           "initial_value":0,
           "target_value":1,
           "trigger_type":"controller",
           "trigger_conditions":[
              {
                 "button_name":"LeftClickXbutton",
                 "value":1
              },
              {
                 "button_name":"RightClickAbutton",
                 "value":1
              }
           ],
           "transition_type":"bezier",
           "transition_bezier":[
              0.59,
              0.1,
              0.34,
              1
           ],
           "transition_duration":1000,
           "animation_type":"bounce"
        }
```



Upon pressing the X button and the A button on your VR controllers, this will set the value of the Blendshape "A" from 0 to 1 and 1 to 0  in a bezier curve for 1 second each cycle until the same button combination is pressed again


![Animated Mouth](/readme/demo.gif)




Camera script example
```
"blend_shapes": [
        {
           "name":"MotionScript1",
           "toggle":true,
           "intercept":true,
           "initial_value":0,
           "target_value":1,
           "trigger_type":"controller",
           "trigger_conditions":[
              {
                 "button_name":"RightClickAbutton",
                 "value":1
              }
           ],
           "transition_type":"bezier",
           "transition_bezier":[
              0.59,
              0.1,
              0.34,
              1
           ],
           "transition_duration":1000,
           "animation_type":"bounce"
        }
        ...
],
...
    "camera_motions": {
      "MovementScript1": {
         "Movements": [
         {
            "HeadBone": "Head",
            "StartPos": {
               "x": 2,
               "y": 1.75,
               "z": 2,
               "FOV": 90  
            },
            "StartRot": {   
               "x": 15,
               "y": -15,
               "z": 0
            },
            "StartHeadOffset": {   
               "x": 0,
               "y": 0,
               "z": 0
            },
            "EndPos": {
               "x": 2,
               "y": 1.75,
               "z": -2,
               "FOV": 90   
            },
            "EndRot": {           
               "x": 15,
               "y": -40,
               "z": 0
            },
            "EndHeadOffset": {     
               "x": 0,
               "y": 0,
               "z": 0
            },
            "TurnToHead": true, 
            "TurnToHeadHorizontal": false,
            "Duration": 2,
            "Delay": 0,
            "EaseTransition": false
         },
         {
            "HeadBone": "Head",
            "StartPos": {
               "x": 2,
               "y": 1.75,
               "z": -2,
               "FOV": 90  
            },
            "StartRot": {   
               "x": 15,
               "y": -15,
               "z": 0
            },
            "StartHeadOffset": {   
               "x": 0,
               "y": 0,
               "z": 0
            },
            "EndPos": {  
               "x": -2,
               "y": 1,
               "z": -2,
               "FOV": 90      
            },
            "EndRot": {           
               "x": 15,
               "y": -40,
               "z": 0
            },
            "EndHeadOffset": {     
               "x": 0,
               "y": 0,
               "z": 0
            },
            "TurnToHead": true, 
            "TurnToHeadHorizontal": false,
            "Duration": 2,
            "Delay": 0,
            "EaseTransition": false
         },
         {
            "HeadBone": "Head",
            "StartPos": {
               "x": -2,
               "y": 1,
               "z": -2,
               "FOV": 90  
            },
            "StartRot": {   
               "x": 15,
               "y": -15,
               "z": 0
            },
            "StartHeadOffset": {   
               "x": 0,
               "y": 0,
               "z": 0
            },
            "EndPos": {  
               "x": -2,
               "y": 1,
               "z": 2,
               "FOV": 90      
            },
            "EndRot": {           
               "x": 15,
               "y": -40,
               "z": 0
            },
            "EndHeadOffset": {     
               "x": 0,
               "y": 0,
               "z": 0
            },
            "TurnToHead": true, 
            "TurnToHeadHorizontal": false,
            "Duration": 2,
            "Delay": 0,
            "EaseTransition": false
         },
         {
            "HeadBone": "Head",
            "StartPos": {
               "x": -2,
               "y": 1,
               "z": 2,
               "FOV": 90  
            },
            "StartRot": {   
               "x": 15,
               "y": -15,
               "z": 0
            },
            "StartHeadOffset": {   
               "x": 0,
               "y": 0,
               "z": 0
            },
            "EndPos": {  
               "x": 2,
               "y": 1,
               "z": 2,
               "FOV": 90      
            },
            "EndRot": {           
               "x": 15,
               "y": -40,
               "z": 0
            },
            "EndHeadOffset": {     
               "x": 0,
               "y": 0,
               "z": 0
            },
            "TurnToHead": true, 
            "TurnToHeadHorizontal": false,
            "Duration": 2,
            "Delay": 0,
            "EaseTransition": false
         }
         ]
      },
    }
```



Upon pressing the A button on your VR controllers, this will set Start the Camera script motion

[[/readme/camerademo.gif|Camera Script Motion]]

![Camera Script Motion](/readme/camerademo.gif)


# Trigger Via HTTP

By default, a http server will start listening in port 8088.
open http://127.0.0.1:8088 to find the list of endpoints you can trigger via http
