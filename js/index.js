(function () {
    "use strict";

    var STREAM_TYPE = "hls";
    var REWIND_STEP = 6;
    var MAX_REWIND = 360;

    var OPEN_TIMEOUT = 24;

    var URL = "http://dvr1.b612.tightvideo.com/5_channel/1/index.m3u8";
    var TIMING_URL = "http://188.226.149.77:8090/timing";
    //var TIMING_URL = "http://dvr1.b612.tightvideo.com/5_channel/last_update";

    var PLAY_STATES = {
        play: "play",
        pause: "pause",
        rewinding: "rewinding",
        stop: "stop"
    };

    function getCurrentDate(){
        return Math.round(new Date().getTime() / 1000);
    }

    var AppModel = Backbone.Model.extend({

    });

    var AppView = Backbone.View.extend({

        el: ".app",

        initialize: function(){

            this.Player = new PlayerView({
                model: new Backbone.Model({
                    url: URL,
                    timingUrl: TIMING_URL
                })
            });

        }

    });

    var PlayerView = Backbone.View.extend({

        el: ".player",

        getStreamURL: function(offset){
            offset && (offset += OPEN_TIMEOUT);
            var url = (this.model.get('url') + (offset ? ("?shift=" + offset) : ""));
            console.log(url);
            return url;
        },

        initialize: function(){

            this.SBPlayer = Player;

            this.rewindBar = new RewindBarView({
                model: this.model
            });

            this.$controls = this.$('.player__controls');
            this.$playButton = this.$(".player__play");
            this.$forwardButton = this.$(".player__forward");
            this.$backwardButton = this.$(".player__backward");

            this.$playButton.on('click', _.bind(this.clickPlay, this));

            this.listenTo(this.model, 'change:playState', this.playStateChanged);
            this.listenTo(this.model, 'change:rewindOffset', this.onRewindOffsetChange);

            this.SBPlayer.on('ready', _.bind(function(){
                this.model.set({
                    playState: PLAY_STATES.play
                });
            }, this));

            this.$forwardButton.on('click ', _.bind(this.clickForward, this));
            this.$backwardButton.on('click', _.bind(this.clickBackward, this));

            this.updateTime()
            setInterval(_.bind(this.updateTime, this), 6000);

            this.model.set({
                rewindOffset: 0,
                pauseOffset: 0
            });

            this.play();

            $(document.body).on({
                'nav_key:left': _.bind(this.clickBackward, this),
                'nav_key:right': _.bind(this.clickForward, this),
                'nav_key:play': _.bind(this.clickPlay, this),
                'nav_key:pause': _.bind(this.clickPause, this),
                'nav_key:enter': _.bind(this.clickPlay, this),
                'nav_key:blue': _.bind(this.clickPause, this)
            });
            $$nav.on();

        },


        updateTime: function(){

            var currentServerTime = this.model.get('serverTime');

            if (!currentServerTime){
                this.model.set({
                    serverTime: getCurrentDate()
                });
                $.ajax({
                    url: this.model.get('timingUrl'),
                    success: _.bind(function(data){
                        this.model.set({
                            serverTime: parseInt(data)
                        });
                    }, this)
                });
            } else {
                this.model.set({
                    serverTime: currentServerTime + 6
                });
            }
        },

        clickPlay: function(){
            if ( this.model.get('playState') === PLAY_STATES.play){
                return;
            }
            this.play();
        },

        clickPause: function(){
            var state = this.model.get('playState');
            if (state === PLAY_STATES.play){
                this.pause();
            }
            if (state === PLAY_STATES.pause){
                this.play();
            }
        },

        play: function() {

            var currentState = this.model.get('playState');

            if (!currentState || currentState === PLAY_STATES.stop){

            }
            if (currentState === PLAY_STATES.pause){
                var pauseTime = this.model.get('pauseTime');
                var currentTime = this.model.get('serverTime');

                var pauseOffset = currentTime - pauseTime;

                this.model.set({
                    pauseOffset: (this.model.get('pauseOffset') + pauseOffset)
                });


                console.log(this.model.get('pauseOffset') , pauseOffset);
            }

            var currentOffset = this.model.get('pauseOffset') + this.model.get('rewindOffset');

            console.log('play', this.model.get('pauseOffset'), this.model.get('rewindOffset'));

            this.SBPlayer.stop();

            this.SBPlayer.play({
                url: this.getStreamURL(currentOffset),
                type: STREAM_TYPE
            });

        },

        pause: function(){

            this.model.set({
                pauseTime: this.model.get('serverTime')
            });

            this.SBPlayer.pause();

            this.model.set({
                playState: PLAY_STATES.pause
            });

        },

        rewindPause: function(){

            var currentState = this.model.get('playState');

            if (currentState === PLAY_STATES.rewinding){
                return;
            }

            this.SBPlayer.pause();

            this._preRewindState = currentState;

            this.model.set({
                playState: PLAY_STATES.rewinding
            });
        },

        playStateChanged: function(){
            this.renderPlayButton();
        },

        renderPlayButton: function(){

            var playState = this.model.get('playState');

            if (playState === PLAY_STATES.play){
                this.$playButton.text('pause');
            }
            if (playState === PLAY_STATES.pause) {
                this.$playButton.text('play');
            }
        },

        clickRewindButton: function(direction){

            this.controlsShow();

            var rewindOffset = this.model.get('rewindOffset');

            if (direction === "backward" && (rewindOffset + REWIND_STEP) <= MAX_REWIND){
                this.rewindPause();
                this.model.set({
                    rewindOffset: (rewindOffset + REWIND_STEP)
                });
            }
            if (direction === "forward" && (rewindOffset - REWIND_STEP) >= 0){
                this.rewindPause();
                this.model.set({
                    rewindOffset: (rewindOffset - REWIND_STEP)
                });
            }

            this._clickRewindTimeout && clearTimeout(this._clickRewindTimeout);
            this._clickRewindTimeout = setTimeout(_.bind(function(){

                this.rewind();

            }, this), 1000);

        },


        clickForward: function() {

            this.clickRewindButton('forward');

        },

        clickBackward: function() {

            this.clickRewindButton('backward');

        },

        rewind: function(){

            if (this._preRewindState === PLAY_STATES.play){
                this.play();
            }
            if (this._preRewindState === PLAY_STATES.pause){
                this.model.set({
                    playState: PLAY_STATES.pause
                });
            }

            setTimeout(_.bind(function(){
                this.controlsHide();
            }, this), 2000);

        },

        onRewindOffsetChange: function(){
        },

        controlsShow: function(){
            this.$controls.animate({
                opacity: 1,
                'margin-top': 0
            });
        },

        controlsHide: function(){
            this.$controls.animate({
                opacity: 0,
                'margin-top': 10
            });
        }

    });

    var RewindBarView = Backbone.View.extend({

        el: ".player__rewind",

        initialize: function(){

            this.$cursor = this.$(".player__rewind__cursor");
            this.$bar = this.$(".player__rewind__bar");
            this.$live = this.$(".player__rewind__live");

            this.step = this.$el.width() / (2 * MAX_REWIND);

            this.listenTo(this.model, 'change:rewindOffset', this.updateCursorPosition);
            this.listenTo(this.model, 'change:playState', this.onPlayStateChange);

        },

        updateCursorPosition: function(){

            var rewindOffset = this.model.get('rewindOffset');

            this.$cursor.css({
                right: (rewindOffset * this.step)
            });


        },

        onPlayStateChange: function(){
            var playState = this.model.get('playState');
            var rewindOffset = this.model.get('rewindOffset');

            if (playState === PLAY_STATES.play){

                this.$bar.animate({
                    width:  (MAX_REWIND  + rewindOffset) * this.step
                }, 1000);
                this.$live.animate({
                    left: (MAX_REWIND  + rewindOffset) * this.step
                }, 1000);

            }

        }

    });

    SB.ready(function(){

        var appModel = new AppModel();

        var app = new AppView({
            model: appModel
        });

    });

})();