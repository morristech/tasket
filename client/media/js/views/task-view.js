var TaskView = View.extend({
    tagName: "li",
    className: "task",

    defaults: {},

    events: {
        //"click button": "completeTask"
    },

    constructor: function TaskView() {
        View.prototype.constructor.apply(this, arguments);
    },

    initialize: function () {
        View.prototype.initialize.apply(this, arguments);
        _.bindAll(this, "redraw", "render", "updateClaimedBy", "updateEstimate");
        this.model.bind("change", this.redraw);
    },

    cacheDimensions: function(){ // TODO: utilise
        this.width = this.elem.outerWidth();
        this.height = this.elem.outerHeight();
        return this;
    },

    redraw: function(){
        if (this.model.isOpen()){
            this.render();
        }
        // HubView will remove TaskView if its state === "verified"
        return this;
    },

    render: function(){
        var data = this.model.toJSON();

        data.isNew = this.model.isNew();
        data.isNotNew = !this.model.isNew();

        data.hubId = data.hub;
        data.canEdit = app.isCurrentUser(data.owner);
        data.isClaimed = !!data.claimedBy;

        data.estimate = this.model.humanEstimate();

        this.elem.html(tim("task", data));

        this.updateClaimedBy();
        this.updateControls();
        return this.offsetApply();
    },

    updateEstimate: function () {
        this.$('.estimate').text(this.model.humanEstimate());
    },

    updateControls: function () {
        var controls    = this.$(".controls"),
            template    = tim("task-control"),
            states      = Task.states,
            state       = this.model.get("state"),
            owner       = this.model.get("owner"),
            claimedById = this.model.get("claimedBy"),
            data;

        if (state === states.NEW) {
            data = {
                id: this.model.id,
                type: "claimed",
                text: "I'll do it",
                state: Task.states.CLAIMED
            };
        }
        else if (app.isCurrentUser(claimedById) && state === states.CLAIMED) {
            data = {
                id: this.model.id,
                type: "done",
                text: "I've done it",
                state: Task.states.DONE
            };
        }
        else if (app.isCurrentUser(owner) && state === states.DONE) {
            data = {
                id: this.model.id,
                type: "verify",
                text: "Verify",
                state: Task.states.VERIFIED
            };
        }

        if (data && app.currentUser) {
            controls.html(tim("task-control", data));
        } else {
            controls.empty();
        }

        return this;
    },

    updateClaimedBy: function () {
        var templateName = "task-claimed-by-user",
            claimedById = this.model.get("claimedBy"),
            isDone = !!this.model.get("doneTime"),
            status,
            model;

        if (!claimedById) {
            return this;
        }

        if (app.isCurrentUser(claimedById)) {
            model = app.currentUser;
            templateName = "task-claimed-by-you";

            status = isDone ? "have done" : "are doing";
        } else {
            model = Tasket.getUsers(claimedById).at(0);
            model.bind("change", this.updateClaimedBy);
            status = isDone ? "has done" : "is doing";
        }

        this.$(".claimedBy").html(tim(templateName, {
            id: model.id,
            name: model.get("name"),
            image: model.get("image"),
            status: status,
            url: model.url()
        }));

        return this;
    }
});
