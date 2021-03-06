// UI SETTINGS

var cache = new Cache(Tasket.namespace),
    app = _.extend({
        // Sets up the app. Called by init()
        setup: function () {
            // Cache the body element
            this.bodyElem = jQuery("body");

            // app properties
            _.extend(this, {
                slugs: {
                    hubs: "projects",
                    tasks: "tasks",
                    users: "users"
                },
                wallBuffer: 50, // Pixels margin that project nodes should keep away from the walls of the tank
                hubBuffer: 10,
                taskBuffer: 10,
                tankResizeThrottle: 1000,
                successNotificationHideDelay: 3500, // milliseconds before success notification is hidden; use `0` to not hide at all
                hubDescriptionTruncate: 45, // No. of chars to truncate hub description to
                taskDescriptionTruncate: 140, // No. of chars to truncate task description to
                hubImageWidth: 30,
                hubImageHeight: 30,
                hubPlaceholderImage: "tank/images/placeholder-hub.png",
                userInTaskImageWidth: 14,
                userInTaskImageHeight: 14,
                userPlaceholderImage: "tank/images/placeholder-user.png",
                animateHubs: false,
                animateTasks: false,
                loaded: false,
                useCsrfToken: true,
                useSessionId: true,
                authtoken: null,
                csrftoken: null,
                currentUser: null,
                selectedHub: null,
                allDoneTasks: null,
                cache: cache,
                statistics:     {tasks: this.blankTaskStatistics()},
                toolbar:        new Toolbar({el: jQuery(".header-container")[0]}),
                notification:   new Notification(),
                lightbox:       new Lightbox(),
                dashboard:      new Dashboard(),
                showCreatedByOnHubs: false,
                showCreatedByOnTasks: false
            });


            // BIND EVENTS
            Tasket.bind("task:change:state", this.updateTaskStatistics);

            // Listen for changes to the app.allDoneTasks collection, and redraw the dashboard tasks accordingly
            app.bind("change:currentUser", this._onChangeUser)
               .bind("change:currentUser", this._cacheChangesToCurrentUser);

            // Manage and restore the dashboard state.
            if (this.cache.get("dashboard-hidden") === true) {
                this.dashboard.hide();
            }

            this.dashboard.bind("all", function (eventName) {
                if (eventName === "show" || eventName === "hide") {
                    this.cache.set("dashboard-hidden", eventName === "hide");
                }
            }, this);

            this.setupCSSSupport();

            return this.trigger("setup", this);
        },

        // Add a class to the html element for all css properties that are
        // not supported. eg. class="no-transform no-transition".
        setupCSSSupport: function () {
            var root = document.documentElement;
            _.each(["transform"], function (prop) {
                var supported = getCSSProperty(prop);
                if (!supported) {
                    root.className += " no-" + prop;
                }
            });
        },

        // Create routes for all templates prefixed with "static-". When this
        // route is triggered the contents of the template will be loaded into
        // the lightbox.
        setupStaticTemplates: function () {
            var staticPrefix = "static-",
                prefixLength = staticPrefix.length;

            _.each(tim.templates(), function(template, name) {
                var route;

                if (name.indexOf(staticPrefix) === 0){
                    route = name.slice(prefixLength);
                    app.router.route("/" + route + "/", route, function () {
                        app.lightbox.content(template).show();
                    });
                }
            });

            return this;
        },
        
        // Override the value of Tasket.settings with the
        // values returned from the server
        _cacheServerSettings: function(){
            return Tasket.settings(function (data) {
                _.extend(Tasket.settings, data);
                app.trigger("change:settings", Tasket.settings);
            });
        },
        
        _cacheStatistics: function(){
            return Tasket.statistics(function (data) {
                _.each(data.tasks, function (value, key) {
                    data.tasks[key] = parseInt(value, 10);
                });
                app.statistics = data;
                app.trigger("change:statistics", app.statistics, app);
            });
        },

        _cacheChangesToCurrentUser: function(user){
            user.bind("change", function cacheOnChange(user){
                // Cache currentUser to localStorage
                if (app.currentUser && app.currentUser.id === user.id){
                    app.cacheCurrentUser(user);
                }
                else {
                    user.unbind("change", cacheOnChange);
                }
            });
        },

        _onChangeUser: function(user){
            // Update all done tasks in system if currentUser is an admin and needs to see that information
            if (app.currentUserIsAdmin()){
                if (!app.allDoneTasks){
                    Tasket.bind("task:change:state", app.updateAllDoneTasks)
                          .bind("task:remove", app.updateAllDoneTasks);
                          
                    app.fetchAllDoneTasks();
                }
            }
            else {
                app.allDoneTasks = null;
                Tasket.unbind("task:change:state", app.updateAllDoneTasks);
            }
        },

        // Sets up the app. Called by init() on app "ready".
        ready: function () {
            var options;
            
            this.router = new Backbone.Router();
            options = {router: this.router};
            
            _.extend(this, {
                // The controllers will make Ajax calls on their init, so are created after app init
                tank: new TankController(options),
                accountController: new AccountController(options),
                dashController: new DashboardController(options)
            });

            // Set up routes for static templates
            this.setupStaticTemplates();
            
            /////

            // THE TANK

            this.tank
                .bind("hub:select", function(hubView){
                    app.selectedHubView = hubView;
                    app.selectedHub = hubView.model.id; // TODO: this should be changed to cache the whole model object, not just the id
                    app.bodyElem.addClass("hubSelected");
                    app.dashboard.hubAnchorSelect();
                })
                .bind("hub:deselect", function(hubView){
                    if (hubView.model.id === app.selectedHub){
                        app.selectedHubView = app.selectedHub = null;
                        app.bodyElem.removeClass("hubSelected");
                    }
                });
                
            // Route views' requests for window.location changes to the tank controller
            app.bind("request:change:location", function(view){
                var url = app.tank.clientUrl(view.model);
                if (url){
                    app.tank.navigate(url, true);
                }
            });

            /////

            return this.trigger("ready", this);
        },

        // init() accepts jQuery deferred objects as returned by jQuery.ajax() or
        // created manually using new jQuery.Deferred(). These objects are
        // are queued up. When the method is called with no arguments it waits
        // until all deferreds are resolved and triggers the "success" event.
        //
        // All init functions should be passed to this method then it should
        // be called with no arguments to kickstart the app. Any dependancies can
        // listen for the "success" and "error" events.
        init: (function () {
            var callbacks = [];

            return function (deferred) {
                if (callbacks && deferred) {
                    // Push the callbacks into our queue.
                    callbacks.push(deferred);
                }
                else if (callbacks === null) {
                    throw "Cannot add more callbacks. init() has already been run";
                }
                else if (app.loaded !== true) {
                    // Setup app properties that are not dependant on anything.
                    app.setup();

                    // Kick off init(). Trigger "success" if all deferreds return
                    // successfully. Else trigger an "error" event.
                    jQuery.when.apply(null, callbacks).then(
                        function () {
                            app.ready();
                            app.loaded = true;
                        },
                        function () {
                            app.trigger("error", app);
                        }
                    );
                    callbacks = null;
                }
                return app;
            };
        }()),

        truncate: function(str, charLimit, continuationStr){
            if (str && str.length > charLimit){
                continuationStr = continuationStr || "…";
                return str
                    .slice(0, charLimit + continuationStr.length)
                    .replace(/\W*(\w*|\W*)$/, "") +
                    continuationStr;
            }
            return str;
        },

        // Convert between bottom-zeroed and top-zeroed coordinate systems
        invertY: function(y, maxValue){
            maxValue = maxValue || app.tank.tankHeight;

            return maxValue - y;
        },

        isCurrentUser: function (id) {
            return !!(app.currentUser && id === app.currentUser.id);
        },

        currentUserIsAdmin: function(){
            return !!(app.currentUser && app.currentUser.isAdmin());
        },

        isCurrentUserOrAdmin: function(id){
            return app.isCurrentUser(id) || app.currentUserIsAdmin();
        },

        restoreCache: function(){
            var currentUserData = app.cache.get("currentUser"),
                currentUser, username;

            // If we don't have a session cookie, destroy the cache. Django will
            // continually set this cookie so this will only really work if the
            // cookie itself expires.
            if (!this.getCookie("sessionid")) {
                if (currentUserData) {
                    username = currentUserData.username;

                    // Redirect to login form
                    window.location.hash = "/login/";

                    // Pre-populate the username field
                    setTimeout(function () {
                        jQuery('#field-username').val(username);
                    }, 200);
                }

                // Destroy the cache.
                this.destroyCache();
            }

            else if (currentUserData){
                currentUser = app.updateCurrentUser(new User(currentUserData), false);
                currentUser.fetch({
                    success: app.updateCurrentUser
                }); // Store to cache again
            }

            app.authtoken = app.cache.get("authtoken");
            app.csrftoken = app.cache.get("csrftoken");
            
            return app;
        },

        destroyCache: function () {
            app.cache
                .remove("currentUser")
                .remove("authtoken")
                .remove("csrftoken");
        },

        cacheCurrentUser: function(user){
            app.cache.set("currentUser", user.toJSON());
            return app;
        },

        updateCurrentUser: function (user, saveToCache) {
            if (user){
                if (!Tasket.users.get(user.id)){
                    Tasket.users.add(user);
                }
                app.currentUser = user;

                if (saveToCache !== false){
                    app.cacheCurrentUser(user);
                }
                app.trigger("change:currentUser", app.currentUser); // see dashboard.js > Dashboard.setUser()
            }
            return app.currentUser;
        },

        _triggerAllDoneTasksChange: function(){
            app.trigger("change:allDoneTasks", app.allDoneTasks);
            return app;
        },

        fetchAllDoneTasks: function(){
            Tasket.getTasksByState("done", function(allDoneTasks){
                if (allDoneTasks){
                    app.allDoneTasks = allDoneTasks;
                }
                // There was a server/connectivity error, and we haven't yet fetched the list of done tasks. Use an empty tasks collection.
                else if (!app.allDoneTasks){
                    app.allDoneTasks = new TaskList();
                }
                else {
                    return;
                }

                // Trigger on app whenever the allDoneTasks collection changes
                allDoneTasks
                    .bind("change", app._triggerAllDoneTasksChange)
                    .bind("remove", app._triggerAllDoneTasksChange);

                // Trigger now
                app._triggerAllDoneTasksChange();
            });

            return app;
        },

        updateAllDoneTasks: function(task){ // based on user.updateTask(); called when task changes state
            var allDoneTasks = app.allDoneTasks,
                id, isDone, wasDone, wasDeleted, storedTask;

            if (allDoneTasks){
                isDone  = task.get("state") === Task.states.DONE;
                wasDone = task.previous("state") === Task.states.DONE;

                // Remove this task from the allDoneTasks collection
                if (isDone || wasDone){
                    id = task.id;
                    wasDeleted = !Tasket.tasks.get(id);
                    storedTask = allDoneTasks.detect(function(doneTask){
                        return id === doneTask.id;
                    });

                    // Add the task, if it is in the DONE state
                    if (!storedTask && isDone){
                        allDoneTasks.add(task, {silent: true});
                    }

                    // Remove the task, if it is no longer in the DONE state
                    else if (storedTask && !isDone || storedTask && wasDeleted){
                        allDoneTasks.remove(storedTask, {silent: true});
                    }
                }
            }

            return app;
        },

        setAuthtoken: function(authtoken){
            app.authtoken = authtoken;
            app.cache.set("authtoken", app.authtoken);
            return app.trigger("change:authtoken", authtoken); // see dashboard.js > Dashboard.setUser()
        },

        // Update the location bar with a previous hash.
        back: function(historyCount){
            var prev = Backbone.history.getPrevious(historyCount);
            if (!prev) {
                prev = "/";
            }
            Backbone.history.navigate(prev);
            return app;
        },

        getCookie: function(name){
            var docCookie = window.document.cookie,
                cookieValue, cookies, cookie, i;

            if (docCookie && docCookie !== "") {
                cookies = docCookie.split(";");

                for (i = 0; i < cookies.length; i+=1) {
                    cookie = jQuery.trim(cookies[i]);
                    // Does this cookie string begin with the name we want?
                    if (cookie.substring(0, name.length + 1) === (name + "=")) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        },

        sendCsrfToken: function(xhr){
            var csrftoken = app.csrftoken;
            if (!csrftoken){
                csrftoken = app.csrftoken = this.getCookie("csrftoken");
            }
            if (csrftoken){
                xhr.setRequestHeader("X-CSRFToken", this.getCookie("csrftoken"));
            }
            return xhr;
        },

        sendSessionId: function(xhr){
            if (app.authtoken){
                xhr.setRequestHeader("Authorization", app.authtoken);
            }
            return xhr;
        },

        sendAuthorization: function(xhr, url){
            // Only send authorisation for requests sent to the Tasket API
            if (url.indexOf(Tasket.endpoint) === 0){
                xhr.withCredentials = true;

                if (app.useCsrfToken){
                    app.sendCsrfToken(xhr);
                }
                if (app.useSessionId){
                    app.sendSessionId(xhr);
                }
            }
            return xhr;
        },

        setupAuthentication: function(){
            jQuery.ajaxSetup({
                beforeSend: function(xhr, settings){
                    app.sendAuthorization(xhr, settings.url);
                }
            });
            return app;
        },

        // Returns true if the browser supports Tasket's tech
        isSupported: (function () {
            var supportsSVG, supportsLocalStorage;

            // SVG SUPPORT
            // from http://diveintohtml5.org/everything.html#svg
            supportsSVG = !!(document.createElementNS && document.createElementNS("http://www.w3.org/2000/svg", "svg").createSVGRect);

            // LOCAL STORAGE SUPPORT
            // This has already been determined by cache.js, so we'll use that
            supportsLocalStorage = !!cache.localStorage;

            return function () {
                return supportsSVG && supportsLocalStorage;
            };
        }()),

        blankTaskStatistics: function(){
            return {
                "new": 0,
                "claimed": 0,
                "done": 0,
                "verified": 0
            };
        },

        // Update the global statistics object when a task state changes. This
        // is a callback fruntion for the Tasket "task:change:state" event.
        updateTaskStatistics: function (model) {
            var current, previous,
                wasAlreadyAccountedFor = !model.previous("estimate"); // NOTE: this is a check to see if this task was an empty scaffold, created in Tasket.getModels and the fetched from the server and populated. If it was, then it has already been taken into account by the intial statistics fetch in init.js

            if (wasAlreadyAccountedFor){
                return;
            }

            current  = model.get("state");
            previous = model.previous("state");

            app.statistics.tasks[current]  += 1;
            app.statistics.tasks[previous] -= 1;

            app.trigger("change:statistics", app.statistics, app);
        }
    }, Backbone.Events);
