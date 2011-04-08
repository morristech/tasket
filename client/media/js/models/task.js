// TASK STATES

var TaskStates = {
    NEW     : "new",
    CLAIMED : "claimed",
    DONE    : "done",
    VERIFIED: "verified"
};

var TaskEstimates = {
    'Ten Minutes':           60*10,
    'Half an Hour':          60*30,
    'One Hour':              60*60,
    'Two hours':             60*60*2,
    'Four hours':            60*60*4,
    'Eight hours':           60*60*8,
    'More than Eight hours': 60*60*12
};

// TASK
var Task = Model.extend({
    // required: owner

    type: "task",

    required: ["owner", "hub", "estimate"],

    defaults: { // TODO: sending empty values to and from server is a waste of bandwidth
        description: "",
        image: "",
        estimate: TaskEstimates["Half an Hour"],
        state: TaskStates.NEW
    },

    constructor: function Task() {
        Model.prototype.constructor.apply(this, arguments);
    },

    state: function(newState, userid){
        var task = this,
            currentState = this.get("state"),
            timestamp = Math.round(now() / 1000),
            error;

        if (!newState){
            return currentState;
        }

        error = function(){
            throw task.report(
                "Can't change state from '" + currentState + "' to '" + newState + "'" +
                (userid ?
                    "" :
                    " (no userid)"
                )
            );
        };

        switch (newState){
            case TaskStates.NEW:
                this.unset("claimedBy")
                    .unset("claimedTime")
                    .unset("doneBy")
                    .unset("doneTime")
                    .unset("verifiedBy")
                    .unset("verifiedTime")
                    .set({
                        state: newState
                    });
            break;

            case TaskStates.CLAIMED:
                if (userid && currentState === TaskStates.NEW){
                    this.set({
                        claimedBy: userid,
                        claimedTime: timestamp
                    });
                }
                else if (!this.get("claimedBy")){
                    error();
                }

                this.unset("doneBy")
                    .unset("doneTime")
                    .unset("verifiedBy")
                    .unset("verifiedTime")
                    .set({
                        state: newState
                    });
            break;

            case TaskStates.DONE:
                if (userid && currentState === TaskStates.CLAIMED){
                    this.set({
                        doneBy: userid,
                        doneTime: timestamp
                    });
                }
                else if (!this.get("doneBy")){
                    error();
                }

                this.unset("verifiedBy")
                    .unset("verifiedTime")
                    .set({
                        state: newState
                    });
            break;


            case TaskStates.VERIFIED:
                if (userid && currentState === TaskStates.DONE){
                    this.set({
                        verifiedBy: userid,
                        verifiedTime: timestamp
                    });
                }
                else if (!this.get("verifiedBy")){
                    error();
                }

                this.set({
                    state: newState
                });
            break;

            default:
            error();
        }

        return this;
    },

    isOpen: function(){
        return this.state() === TaskStates.VERIFIED;
    },

    initialize: function(){
        Model.prototype.initialize.apply(this, arguments);
    }
}, {
    ESTIMATES: TaskEstimates
});
Task.states = TaskStates;

// TASKS COLLECTION
var TaskList = CollectionModel.extend({
    model: Task
});
