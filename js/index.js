(function () {
    "use strict";

    var STREAM_TYPE = "hls";
    var TIME_PRECISION = 6;
    var REWIND_STEP = 3;
    var MAX_REWIND_BACK = 120;

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
                    url: 'http://europaplus.cdnvideo.ru/europaplus-live/eptv_main.sdp/playlist.m3u8',
                    timingUrl: 'http://localhost:3000/update',
                    rewindOffset: 0
                })
            });

        }

    });

    var PlayerView = Backbone.View.extend({

        el: ".player",

        initialize: function(){

            this.SBPlayer = Player;

            this.$playButton = this.$(".player__play");
            this.$forwardButton = this.$(".player__forward");
            this.$backwardButton = this.$(".player__backward");
            this.$rewindCursor = this.$(".player__rewind__cursor");
            this.$rewindBar = this.$(".player__rewind__bar");

            this.listenTo(this.model, 'change:play', this.playStateChanged);
            this.listenTo(this.model, 'change:rewindOffset', this.renderRewindBar);

            this.$playButton.on('click', _.bind(this.clickPlay, this));
            this.$forwardButton.on('click', _.bind(this.clickForward, this));
            this.$backwardButton.on('click', _.bind(this.clickBackward, this));

            setInterval(_.bind(this.updateTiming, this), 2000);

            this.rewindBarPosition = 0;
            this.rewindCursorPosition = 0;

        },

        updateTiming: function(){

            var view = this;

            $.ajax({
                url: view.model.get('timingUrl'),
                success: function(data){
                    view.model.set({
                        lastUpdate: data
                    });
                }
            });
        },

        clickPlay: function(event){
            this.model.set({
                play: !this.model.get('play')
            });
        },

        playStateChanged: function(){
            var playState = this.model.get('play');

            if (playState){
                if (this.SBPlayer.state === "stop"){
                    this.startPlay();
                }
                if (this.SBPlayer.state === "pause"){
                    this.resumePlay();
                }
            } else {
                this.pausePlay();
            }

            this.renderPlayButton(playState);

        },

        startPlay: function(){
            this.SBPlayer.play({
                url: this.model.get('url'),
                type: STREAM_TYPE
            });
        },

        resumePlay: function(){

            var pauseDate = this.model.get('pauseDate');
            var currentDate = getCurrentDate();

            var offset = currentDate - pauseDate;

            console.log(offset);

            this.SBPlayer.play({
                url: this.model.get('url'),
                type: STREAM_TYPE
            });
        },

        pausePlay: function(){

            this.model.set({
                pauseDate: this.model.get('lastUpdate')
            });

            this.SBPlayer.pause();
        },

        renderPlayButton: function(playState){
            if (playState){
                this.$playButton.text('pause');
            } else {
                this.$playButton.text('play');
            }
        },


        clickForward: function(event){


        },


        clickBackward: function(event){

            var offset = this.model.get('rewindOffset') + REWIND_STEP;

            this.rewindCursorPosition = this.rewindCursorPosition + REWIND_STEP;

            this.model.set({
                'rewindOffset': offset
            });

            if (this.clickBackTimeout){
                clearTimeout(this.clickBackTimeout);
            }
            if (this.barTickInterval){
                clearInterval(this.barTickInterval);
            }

            this.clickBackTimeout = setTimeout(_.bind(function(){

                this.barTickInterval = setInterval(_.bind(this.barTick, this), 1000);

                this.rewind();

            }, this), 1000);

        },

        rewind: function(){
            console.log('rewind', this.model.get('rewindOffset'));
        },

        renderRewindBar: function(animate){

            var animationLength = (animate === "animate" ? 1000 : 0);

            console.log('render',this.rewindBarPosition );

            this.$rewindBar.animate({
                width: ((this.rewindBarPosition / ( 2 * MAX_REWIND_BACK)) * 100 + 50 + "%" )
            }, animationLength, 'linear');

            this.$rewindCursor.animate({
                right: ((this.rewindCursorPosition / (2 * MAX_REWIND_BACK)) * 100 + 50 + "%")
            }, animationLength, 'linear');

        },

        barTick: function(){

            this.rewindBarPosition = this.rewindBarPosition + REWIND_STEP;
            this.rewindCursorPosition = this.rewindCursorPosition - REWIND_STEP;

            if (this.rewindCursorPosition >= 0){
                this.renderRewindBar('animate');
            }

            else {
                this.rewindBarPosition = this.rewindBarPosition - REWIND_STEP;
                this.rewindCursorPosition = 0;
                clearInterval(this.barTickInterval);
            }


        }



    });

    $(document).ready(function(){

    });



    SB.ready(function(){

        var appModel = new AppModel();

        var app = new AppView({
            model: appModel
        });

    });

})();