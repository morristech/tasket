// USER
var User = Model.extend({
    type: "user",

    required: ["name"],

    defaults: {
        name: "",
        email: "",
        image: "",
        description: "",
        location: "",
        hubs: {
            owned: []
        },
        tasks: {
            owned: {
                "new": [],
                "claimed": [],
                "done": [],
                "verified": []
            },
            claimed: {
                "claimed": [],
                "done": [],
                "verified": []
            }
        }
    },

    constructor: function User() {
        Model.prototype.constructor.apply(this, arguments);
    },

    initialize: function(){
        Model.prototype.initialize.call(this, arguments);
        _.bindAll(this, "updateTasks");
        Tasket.bind("task:change:state", this.updateTasks);
    },

    // Returns true if user has claimed less tasks than the limit allows.
    canClaimTasks: function () {
        var limit = Tasket.settings.CLAIMED_LIMIT;
        return this.get("tasks.claimed.claimed").length < limit;
    },
    
    isAdmin: function(){
        return this.get("admin");
    },
    
    fullname: function(){
        return this.get("name") || this.get("username") || "";
    },

    // Updates the users tasks when the state of a task changes
    updateTasks: function (task) {
        var id = task.id,
            data = {},
            current  = task.get("state"),
            previous = task.previous("state"),
            newlyClaimed = (previous === Task.states.NEW) && (task.get("claimedBy") === this.id);

        _.each(["owned", "claimed"], function (group) {
            var previousKey = "tasks." + group + "." + previous,
                previousIds = this.get(previousKey),
                currentKey  = "tasks." + group + "." + current,
                currentIds;
            
            // When a task is rejected, it moves back to a "new" state. Since there is no "claimed.new" collection, then return.
            if (currentKey === "tasks.claimed." + Task.states.NEW){
                return;
            }

            // If the task is in the array of previous ids or we're iterating
            // through the claimed tasks and this is a new one (in which case
            // it won't be in an array) then update the data.
            if (_.indexOf(previousIds, id) >= 0 || (group === "claimed" && newlyClaimed)) {
                data[previousKey] = _.without(previousIds, id);

                currentIds = _.clone(this.get(currentKey));
                if (_.indexOf(currentIds, id) < 0) {
                    currentIds.push(id);
                }
                data[currentKey] = currentIds;
            }
        }, this);

        return this.set(data);
    },

    // Removes the task from the current users tasks.
    removeTask: function (task, options) {
        var data = {};

        _.each(["owned", "claimed"], function (group) {
            var key = "tasks." + group + "." + task.get("state"),
                ids = this.get(key);

            if (_.indexOf(ids, task.id) > -1) {
                data[key] = _.without(ids, task.id);
            }
        }, this);

        return this.set(data, options);
    },

    // Removes the hub from the current users hubs.
    removeHub: function (hub) {
        return this.set({
            "hubs.owned": _.without(this.get("hubs.owned"), hub.id)
        });
    }
});

// USERS COLLECTION
var UserList = CollectionModel.extend({
    model: User,
    constructor: function UserList(){
        CollectionModel.prototype.constructor.apply(this, arguments);
    }
});

