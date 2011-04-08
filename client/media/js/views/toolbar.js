// Setup the toolbar.
var Toolbar = View.extend({
    constructor: function Toolbar() {
        View.prototype.constructor.apply(this, arguments);
    },

    initialize: function () {
        var view = this,
            methods = ["toggleLogin", "updateUser", "updateTasks", "updateSignup"];

        this.toolbar  = $(this.el);
        this.login    = this.toolbar.find('.login');
        this.userbar  = this.toolbar.find('h2');
        this.tasks    = this.toolbar.find('.tasks');

        // Watch for changes to the current user and update the toolbar accordinly.
        app.bind('change:currentUser', function (user) {
            _.each(methods, function (method) {
                view[method](user);
            });

            // Watch the user model for changes. When they occur update
            // the appropraite areas.
            if (user) {
                user.bind('change', function () {
                    var taskKeys = ['tasks.claimed.claimed', 'tasks.claimed.verified', 'tasks.claimed.done'],
                        userKeys = ['name', 'image'],
                        changedAttr = user.changedAttributes(),
                        changedKeys = _.keys(changedAttr);

                    if (_.intersect(changedAttr, taskKeys).length) {
                        view.updateTasks(user);
                    }

                    if (_.intersect(changedAttr, userKeys)) {
                        view.updateUser(user);
                    }
                });
            }
        });
    },

    // Toggle the display of the login/logout buttons.
    toggleLogin: function (user) {
        var loginState  = user ? 'hide' : 'show',
            logoutState = user ? 'show' : 'hide';

        // Toggle the forms.
        this.login.find('a')[loginState]();
        this.login.find('form')[logoutState]();
    },

    // Update the current user box or hide it.
    updateUser: function (user) {
        if (user) {
            this.userbar.show();
            if (user.get('image')) {
                this.userbar.find('img').attr(
                    'src', Tasket.thumbnail(user.get('image'), 16, 16, true)
                );
            }
            this.userbar.find('a').text(user.get('name'));
        } else {
            this.userbar.hide();
        }
    },

    // Update the tasks status bar in the toolbar or hide it if there
    // is no current user.
    updateTasks: function (user) {
        var taskLists;
        if (user) {
            taskLists = user.get('tasks');
            this.tasks.show();
            this.tasks.find('.pending').text(
                user.get('tasks.claimed.claimed').length
            );
            this.tasks.find('.done').text(
                user.get('tasks.claimed.done').length + user.get('tasks.claimed.verified').length
            );
        } else {
            this.tasks.hide();
        }
    },

    // Toggles the sign up button.
    updateSignup: function (user) {
        var state = user ? 'hide' : 'show';
        this.toolbar.find('[href*=sign-up]')[state]();
    }
});
