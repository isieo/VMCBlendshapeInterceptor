# VMC Blendshape Interceptor
This script intercepts Virtual Motion Capture's Protocol and allow you to animate or inject blenshapes.

# Assumption and rationale
I am assuming that you will be using Virtual Motion Capture(VMC) - i have only tested with VMC
I also don't want to make a Unity app for this as i feel that it will add additional load to the system.

# Modes of operation

## Proxy mode
This will let the application live between the Performer(e.g. VMC) and the Marionette (Beatsaber VMC plugin, Vseeface, etc)
To set this up, you will have to set the "local_port" to be the port number of your Performer software and then the "send_port" to the Marionette software's port
This will make the Performer connect to this script and this script will connect to Marionette allowing you to intercept or modify the vmc protocol sent

Use this mode when you need to read controller input or you need to modify the data being sent, this mode should be the primary way to use this script

## Assistant mode
This will act as a simple blendshape sender, "local_port" can be set to any unused port number as its not important. 
"send_host" should be the port number of the Performer's receiving port usually port 39540

Use this mode if you only need to trigger blendshapes with "trigger_type": "startup", useful for setting up alternative costumes or persistant animations

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
            "button_name":"XButton",   // The button name that was triggered, use "debug_controller" to find out the names
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


# Example

Config
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



