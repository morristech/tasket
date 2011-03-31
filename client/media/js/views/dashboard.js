var Dashboard = View.extend({
    tagName: 'section',

    className: 'dashboard',

    classes: {
        detailShown: 'detail-active'
    },

    constructor: function Dashboard() {
        View.prototype.constructor.apply(this, arguments);
    },

    initialize: function () {
        View.prototype.initialize.apply(this, arguments);

        // Setup the user bindings.
        this.setUser(this.model);

        // Set up the detail instance.
        this.detail = new DashboardDetail();
        this.detail.bind('all', _.bind(function (event) {
            if (event === 'show') {
                this.elem.addClass(this.classes.detailShown);
            }
            else if (event === 'hide') {
                this.elem.removeClass(this.classes.detailShown);
            }
        }, this));
    },

    // Sets up bindings to update the dashbaord when the user changes.
    setUser: function (user, options) {
        var methodMap = {
            hubs:       ['UserHubs'],
            tasks:      ['UserTasks', 'ManagedTasks'],
            statistics: ['Notifications']
        };

        // Update the user object if nessecary.
        this.model = arguments.length ? user : this.model;

        if (this.model) {
            this.model.bind('change', _.bind(function (user) {
                _.each(methodMap, function (methods, property) {

                    // For each propery in the methodMap see if it has changed
                    // if so call the associated methods.
                    if (user.hasChanged(property)) {
                        _.each(methods, function (method) {
                            this['update' + method]();
                        }, this);
                    }
                }, this);
            }, this));

            if (!options || options.silent !== true) {
                this.render();
            }
        }

        return this;
    },

    render: function () {
        var rendered = tim('dashboard');
        this.elem.html(rendered);

        // Update each of the task lists.
        _.each(['Notifications', 'UserTasks', 'UserHubs', 'ManagedTasks'], function (method) {
            this['update' + method]();
        }, this);

        this.elem.append(this.detail.hide().render().el);

        return this;
    },
    
    userStatistics: function(){
        var user = this.model;
        return {
            ownedClaimed:  user.get('tasks.owned.claimed').length,
            adminedDone:     user.get('tasks.owned.done').length,      // TODO: if an admin, this should include all done tasks
            claimedVerified: user.get('tasks.claimed.verified').length // TODO: should be recent verified tasks
        };
    },

    // Updates the user status box.
    updateNotifications: function () {
        var stats = this.model && this.model.get('statistics'),
            notifications = this.$('.notifications');

        if (stats) {
            notifications.show();
            notifications.find('a').each(function () {
                var anchor = jQuery(this),
                    listItem = anchor.parent(),
                    type = this.getAttribute('data-type'),
                    elem = anchor.find('span');
                
                if (stats[type]) {
                    elem.text(stats[type]);
                    listItem.show();
                }
                else {
                    listItem.hide();
                }
            });
        } else {
            notifications.hide();
        }
    },

    // Updates the "Tasks I Manage" box.
    updateManagedTasks: function () {
        var tasks = null;
        if (this.model) {
            tasks = Tasket.tasks.filterByIds(this.model.get('tasks.owned.done'));
        }
        return this.updateList('.managed-tasks', tasks);
    },

    // Updates the "My Tasks" box.
    updateUserTasks: function () {
        var tasks = null;
        if (this.model) {
            tasks = Tasket.tasks.filterByIds(this.model.get('tasks.claimed.claimed'));
        }
        return this.updateList('.my-tasks', tasks);
    },

    // Updates the "My Projects" box.
    updateUserHubs: function () {
        var hubs = null;
        if (this.model) {
            hubs = Tasket.hubs.filterByIds(this.model.get('hubs.owned'));
        }
        return this.updateList('.my-projects', hubs);
    },

    // Updates a list of tasks/hubs based on the selector & collection.
    updateList: function(selector, models){
        var mapped;

        if (models) {
            mapped = models.map(function (model) {
                return {
                    href: '#/' + model.type + '/' + model.id,
                    title: model.get('title') || 'Missing title'
                };
            });
            this.$(selector).show().find('ul').html(tim('dashboard-link', {
                links: mapped
            }));
        } else {
            this.$(selector).hide();
        }

        return this;
    }
});

