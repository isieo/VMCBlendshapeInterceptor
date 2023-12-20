# VMC Blendshape Interceptor
This script intercepts Virtual Motion Capture's Protocol and allow you to animate or inject blenshapes.

# Assumption and rationale
I am assuming that you will be using Virtual Motion Capture(VMC) - i have only tested with VMC, 
Instead of a "proxy", this script would have been better off being an "Assistant" script but to simplify VR controller inputs, i opted to do it this way so that i can simplify the controller events sent out by VMC.

I also don't want to make a Unity app for this as i feel that it will add additional load to the system.

# Configuration

Configuration should be done in config.json

The first few lines should be quite self explainatory

```
    "local_address": "0.0.0.0",  // Ip address or host of your computer, leave it at 0.0.0.0 to listen to all addresses
    "receive_port": 39538,       // The receiving port from VMC or any other sending software
    "send_host": "127.0.0.1",    // The destination Host or ip address if you are running this on the same computer where the game/marionette software is keep it at 127.0.0.1
    "send_port": 39539,          // The destination Port (Beatsaber vmc plugin, Vseeface, etc)
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
            "is_left":true,            // If this button is from the left controller or not
            "value":1                  // 1=press, 0=release, 2=change Axis  (as per VMC protocol)
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
