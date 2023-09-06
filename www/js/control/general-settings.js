'use strict';

import angular from 'angular';
import ProfileSettings from './ProfileSettings';

angular.module('emission.main.control',['emission.services',
                                        'emission.i18n.utils',
                                        'emission.main.control.collection',
                                        'emission.main.control.sync',
                                        'emission.splash.localnotify',
                                        'emission.splash.notifscheduler',
                                        'ionic-datepicker',
                                        'ionic-toast',
                                        'ionic-datepicker.provider',
                                        'emission.splash.startprefs',
                                        'emission.main.metrics.factory',
                                        'emission.stats.clientstats',
                                        'emission.plugin.kvstore',
                                        'emission.survey.enketo.demographics',
                                        'emission.plugin.logger',
                                        'emission.config.dynamic',
                                        ProfileSettings.module])

.controller('ControlCtrl', function($scope, $window,
               $ionicScrollDelegate, $ionicPlatform,
               $state, $ionicPopup, $ionicActionSheet, $ionicPopover,
               $ionicModal, $stateParams,
               $rootScope, KVStore, ionicDatePicker, ionicToast,
               StartPrefs, ControlHelper, EmailHelper, UploadHelper,
               ControlCollectionHelper, ControlSyncHelper,
               CarbonDatasetHelper, NotificationScheduler, LocalNotify,
               i18nUtils,
               CalorieCal, ClientStats, CommHelper, Logger, DynamicConfig) {

    console.log("controller ControlCtrl called without params");

    var datepickerObject = {
      todayLabel: i18next.t('list-datepicker-today'),  //Optional
      closeLabel: i18next.t('list-datepicker-close'),  //Optional
      setLabel: i18next.t('list-datepicker-set'),  //Optional
      monthsList: moment.monthsShort(),
      weeksList: moment.weekdaysMin(),
      titleLabel: i18next.t('general-settings.choose-date'),
      setButtonType : 'button-positive',  //Optional
      todayButtonType : 'button-stable',  //Optional
      closeButtonType : 'button-stable',  //Optional
      inputDate: moment().subtract(1, 'week').toDate(),  //Optional
      from: new Date(2015, 1, 1),
      to: new Date(),
      mondayFirst: true,  //Optional
      templateType: 'popup', //Optional
      showTodayButton: 'true', //Optional
      modalHeaderColor: 'bar-positive', //Optional
      modalFooterColor: 'bar-positive', //Optional
      callback: ControlHelper.getMyData, //Mandatory
      dateFormat: 'dd MMM yyyy', //Optional
      closeOnSelect: true //Optional
    }

    $scope.overallAppStatus = false;

    $ionicModal.fromTemplateUrl('templates/control/app-status-modal.html', {
        scope: $scope
    }).then(function(modal) {
        $scope.appStatusModal = modal;
        if ($stateParams.launchAppStatusModal == true) {
            $scope.$broadcast("recomputeAppStatus");
            $scope.appStatusModal.show();
        }
    });

    $scope.openDatePicker = function(){
      ionicDatePicker.openDatePicker(datepickerObject);
    };

    //this function used in ProfileSettings to viewPrivacyPolicy
    $scope.viewPrivacyPolicy = function($event) {
        // button -> list element -> scroll
        // const targetEl = $event.currentTarget.parentElement.parentElement;
        if ($scope.ppp) {
            $scope.ppp.show($event);
        } else {
            i18nUtils.geti18nFileName("templates/", "intro/consent-text", ".html").then((consentFileName) => {
                $scope.consentTextFile = consentFileName;
                $ionicPopover.fromTemplateUrl("templates/control/main-consent.html", {scope: $scope}).then((p) => {
                    $scope.ppp = p;
                    $scope.ppp.show($event);
                });
            }).catch((err) => Logger.displayError("Error while displaying privacy policy", err));
        }
    }

    //this function used in ProfileSettings to send DummyNotification
    $scope.dummyNotification = () => {
        cordova.plugins.notification.local.addActions('dummy-actions', [
            { id: 'action', title: 'Yes' },
            { id: 'cancel', title: 'No' }
        ]);
        cordova.plugins.notification.local.schedule({
            id: new Date().getTime(),
            title: 'Dummy Title',
            text: 'Dummy text',
            actions: 'dummy-actions',
            trigger: {at: new Date(new Date().getTime() + 5000)},
        });
    }

    //called in ProfileSettings on the AppStatus row
    $scope.fixAppStatus = function() {
        $scope.$broadcast("recomputeAppStatus");
        $scope.appStatusModal.show();
    }

    $scope.appStatusChecked = function() {
        // Hardcoded value so we can publish the hacky version today and then debug/fix the
        // infinite loop around waiting_for_trip_start -> tracking_error
        $window.cordova.plugins.notification.local.clearAll();
        $scope.appStatusModal.hide();
    }

    $scope.userData = []
    $scope.getUserData = function() {
        return CalorieCal.get().then(function(userDataFromStorage) {
        $scope.rawUserData = userDataFromStorage;
        if ($scope.userDataSaved()) {
            $scope.userData = []
            var height = userDataFromStorage.height.toString();
            var weight = userDataFromStorage.weight.toString();
            var temp  =  {
                age: userDataFromStorage.age,
                height: height + (userDataFromStorage.heightUnit == 1? ' cm' : ' ft'),
                weight: weight + (userDataFromStorage.weightUnit == 1? ' kg' : ' lb'),
                gender: userDataFromStorage.gender == 1? i18next.t('gender-male') : i18next.t('gender-female')
            }
            for (var i in temp) {
                $scope.userData.push({key: i, val: temp[i]}); //needs to be val for the data table!
            }
        }
        });
    }

    $scope.userDataSaved = function() {
        if (angular.isDefined($scope.rawUserData) && $scope.rawUserData != null) {
            return $scope.rawUserData.userDataSaved;
        } else {
            return false;
        }
    }
    $ionicPlatform.ready().then(function() {
        DynamicConfig.configReady().then(function(newConfig) {
            $scope.ui_config = newConfig;
            // backwards compat hack to fill in the raw_data_use for programs that don't have it
            const default_raw_data_use = {
                "en": `to monitor the ${newConfig.intro.program_or_study}, send personalized surveys or provide recommendations to participants`,
                "es": `para monitorear el ${newConfig.intro.program_or_study}, enviar encuestas personalizadas o proporcionar recomendaciones a los participantes`
            }
            Object.entries(newConfig.intro.translated_text).forEach(([lang, val]) => {
                val.raw_data_use = val.raw_data_use || default_raw_data_use[lang];
            });
            // TODO: we should be able to use $translate for this, right?
            $scope.template_text = newConfig.intro.translated_text[$scope.lang];
            if (!$scope.template_text) {
                $scope.template_text = newConfig.intro.translated_text["en"]
            }
            // Backwards compat hack to fill in the `app_required` based on the
            // old-style "program_or_study"
            // remove this at the end of 2023 when all programs have been migrated over
            if ($scope.ui_config.intro.app_required == undefined) {
                $scope.ui_config.intro.app_required = $scope.ui_config?.intro.program_or_study == 'program';
            }
            $scope.ui_config.opcode = $scope.ui_config.opcode || {};
            if ($scope.ui_config.opcode.autogen == undefined) {
                $scope.ui_config.opcode.autogen = $scope.ui_config?.intro.program_or_study == 'study';
            }
            $scope.refreshScreen();
        });
    });

    $scope.getConnectURL = function() {
        ControlHelper.getSettings().then(function(response) {
            $scope.$apply(function() {
                $scope.settings.connect.url = response.connectUrl;
                console.log(response);
            });
        }, function(error) {
            Logger.displayError("While getting connect url", error);
        });
    };

    $scope.getSyncSettings = function() {
        ControlSyncHelper.getSyncSettings().then(function(showConfig) {
            $scope.$apply(function() {
                $scope.settings.sync.show_config = showConfig;
            })
        });
    };

    $scope.getOPCode = function() {
        ControlHelper.getOPCode().then(function(opcode) {
           console.log("opcode = "+opcode);
            $scope.$apply(function() {
                if (opcode == null) {
                  $scope.settings.auth.opcode = "Not logged in";
                } else {
                  $scope.settings.auth.opcode = opcode;
                }
            });
        }, function(error) {
            Logger.displayError("while getting opcode, ",error);
        });
    };
    //in ProfileSettings in DevZone
    $scope.showLog = function() {
        $state.go("root.main.log");
    }
    //inProfileSettings in DevZone
    $scope.showSensed = function() {
        $state.go("root.main.sensed");
    }
    $scope.getState = function() {
        return ControlCollectionHelper.getState().then(function(response) {
            /* collect state is now stored in ProfileSettings' collectSettings */
            // $scope.$apply(function() {
            //     $scope.settings.collect.state = response;
            // });
            return response;
        }, function(error) {
            Logger.displayError("while getting current state", error);
        });
    };

    var clearUsercache = function() {
        $ionicPopup.alert({template: "WATCH OUT! If there is unsynced data, you may lose it. If you want to keep the data, use 'Force Sync' before doing this"})
        .then(function(result) {
            if (result) {
                window.cordova.plugins.BEMUserCache.clearAll()
                .then(function(result) {
                    $scope.$apply(function() {
                        $ionicPopup.alert({template: 'success -> '+result});
                    });
                }, function(error) {
                    Logger.displayError("while clearing user cache, error ->", error);
               });
            }
        });
    }

    //in ProfileSettings in DevZone
    $scope.invalidateCache = function() {
        window.cordova.plugins.BEMUserCache.invalidateAllCache().then(function(result) {
            $scope.$apply(function() {
                $ionicPopup.alert({template: 'success -> '+result});
            });
        }, function(error) {
            Logger.displayError("while invalidating cache, error->", error);
        });
    }

    $scope.$on('$ionicView.afterEnter', function() {
        console.log("afterEnter called with stateparams", $stateParams);
        $ionicPlatform.ready().then(function() {
            $scope.refreshScreen();
            if ($stateParams.launchAppStatusModal == true) {
                $scope.$broadcast("recomputeAppStatus");
                $scope.appStatusModal.show();
                $stateParams.launchAppStatusModal = false;
            }
            if ($stateParams.openTimeOfDayPicker) {
                $('input[name=timeOfDay]').focus();
            }
        });
    })

    // Execute action on hidden popover
    $scope.$on('control.update.complete', function() {
        $scope.refreshScreen();
    });

    $scope.$on('popover.hidden', function() {
        $scope.refreshScreen();
    });

    //in ProfileSettings in DevZone
    $scope.refreshScreen = function() {
        console.log("Refreshing screen");
        $scope.settings = {};
        $scope.settings.sync = {};
        $scope.settings.auth = {};
        $scope.settings.connect = {};
        $scope.settings.clientAppVer = ClientStats.getAppVersion();
        $scope.getConnectURL();
        $scope.getSyncSettings();
        $scope.getOPCode();
        $scope.getUserData();
    };

    //this feature has been eliminated (as of right now)
    // $scope.copyToClipboard = (textToCopy) => {
    //     navigator.clipboard.writeText(textToCopy).then(() => {
    //         ionicToast.show('{Copied to clipboard!}', 'bottom', false, 2000);
    //     });
    // }  

    //used in ProfileSettings at the profile/logout/opcode row
    $scope.logOut = function() {
        $ionicPopup.confirm({
            title: i18next.t('general-settings.are-you-sure'),
            template: i18next.t('general-settings.log-out-warning'),
            cancelText: i18next.t('general-settings.cancel'),
            okText: i18next.t('general-settings.confirm')
        }).then(function(res) {
            if (!res) return; // user cancelled
            
            // reset the saved config, then trigger a hard refresh
            DynamicConfig.resetConfigAndRefresh();
        });
    };

    var getStartTransitionKey = function() {
        if($scope.isAndroid()) {
            return "local.transition.exited_geofence";
        }
        else if($scope.isIOS()) {
            return "T_EXITED_GEOFENCE";
        }
    }

    var getEndTransitionKey = function() {
        if($scope.isAndroid()) {
            return "local.transition.stopped_moving";
        }
        else if($scope.isIOS()) {
            return "T_TRIP_ENDED";
        }
    }

    var getOngoingTransitionState = function() {
        if($scope.isAndroid()) {
            return "local.state.ongoing_trip";
        }
        else if($scope.isIOS()) {
            return "STATE_ONGOING_TRIP";
        }
    }

    $scope.forceSync = function() {
        ClientStats.addEvent(ClientStats.getStatKeys().BUTTON_FORCE_SYNC).then(
            function() {
                console.log("Added "+ClientStats.getStatKeys().BUTTON_FORCE_SYNC+" event");
            });
        ControlSyncHelper.forceSync().then(function() {
            /*
             * Change to sensorKey to "background/location" after fixing issues
             * with getLastSensorData and getLastMessages in the usercache
             * See https://github.com/e-mission/e-mission-phone/issues/279 for details
             */
            var sensorKey = "statemachine/transition";
            return window.cordova.plugins.BEMUserCache.getAllMessages(sensorKey, true);
        }).then(function(sensorDataList) {
            Logger.log("sensorDataList = "+JSON.stringify(sensorDataList));
            // If everything has been pushed, we should
            // only have one entry for the battery, which is the one that was
            // inserted on the last successful push.
            var isTripEnd = function(entry) {
                if (entry.metadata.key == getEndTransitionKey()) {
                    return true;
                } else {
                    return false;
                }
            };
            var syncLaunchedCalls = sensorDataList.filter(isTripEnd);
            var syncPending = (syncLaunchedCalls.length > 0);
            Logger.log("sensorDataList.length = "+sensorDataList.length+
                       ", syncLaunchedCalls.length = "+syncLaunchedCalls.length+
                       ", syncPending? = "+syncPending);
            return syncPending;
        }).then(function(syncPending) {
            Logger.log("sync launched = "+syncPending);
            if (syncPending) {
                Logger.log("data is pending, showing confirm dialog");
                $ionicPopup.confirm({template: 'data pending for push'}).then(function(res) {
                    if (res) {
                        $scope.forceSync();
                    } else {
                        Logger.log("user refused to re-sync");
                    }
                });
            } else {
                $ionicPopup.alert({template: 'all data pushed!'});
            }
        }).catch(function(error) {
            Logger.displayError("Error while forcing sync", error);
        });
    };

    var getTransition = function(transKey) {
        var entry_data = {};
        return $scope.getState().then(function(curr_state) {
            entry_data.curr_state = curr_state;
            if (transKey == getEndTransitionKey()) {
                entry_data.curr_state = getOngoingTransitionState();
            }
            entry_data.transition = transKey;
            entry_data.ts = moment().unix();
            return entry_data;
        })
    }

    //in ProfileSettings in DevZone
    $scope.endForceSync = function() {
        /* First, quickly start and end the trip. Let's listen to the promise
         * result for start so that we ensure ordering */
        var sensorKey = "statemachine/transition";
        return getTransition(getStartTransitionKey()).then(function(entry_data) {
            return window.cordova.plugins.BEMUserCache.putMessage(sensorKey, entry_data);
        }).then(function() {
                return getTransition(getEndTransitionKey()).then(function(entry_data) {
                    return window.cordova.plugins.BEMUserCache.putMessage(sensorKey, entry_data);
                })
        }).then($scope.forceSync);
    }

    $scope.isAndroid = function() {
        return ionic.Platform.isAndroid();
    }

    $scope.isIOS = function() {
        return ionic.Platform.isIOS();
    }

    $ionicPopover.fromTemplateUrl('templates/control/main-sync-settings.html', {
        scope: $scope
    }).then(function(popover) {
        $scope.syncSettingsPopup = popover;
    });

    //in ProfileSettings in UserData
    $scope.eraseUserData = function() {
        CalorieCal.delete().then(function() {
            $ionicPopup.alert({template: i18next.t('general-settings.user-data-erased')});
        });
    }
    //in ProfileSettings in DevZone -- part of force/edit state
    $scope.parseState = function(state) {
        if (state) {
            if($scope.isAndroid()){
                return state.substring(12);
            } else if ($scope.isIOS()) {
                return state.substring(6);
            }
        }
    }
    // //in ProfileSettings change carbon set
    // $scope.changeCarbonDataset = function() {
    //     $ionicActionSheet.show({
    //       buttons: CarbonDatasetHelper.getCarbonDatasetOptions(),
    //       titleText: i18next.t('general-settings.choose-dataset'),
    //       cancelText: i18next.t('general-settings.cancel'),
    //       buttonClicked: function(index, button) {
    //         console.log("changeCarbonDataset(): chose locale " + button.value);
    //         CarbonDatasetHelper.saveCurrentCarbonDatasetLocale(button.value);
    //         $scope.carbonDatasetString = i18next.t('general-settings.carbon-dataset') + ": " + CarbonDatasetHelper.getCurrentCarbonDatasetCode();
    //         return true;
    //       }
    //     });
    // };

    var handleNoConsent = function(resultDoc) {
        $ionicPopup.confirm({template: i18next.t('general-settings.consent-not-found')})
        .then(function(res){
            if (res) {
               $state.go("root.reconsent");
            } else {
               $ionicPopup.alert({
                template: i18next.t('general-settings.no-consent-message')});
            }
        });
    }

    var handleConsent = function(resultDoc) {
        $scope.consentDoc = resultDoc;
        $ionicPopup.confirm({
            template: i18next.t('general-settings.consented-to',{protocol_id: $scope.consentDoc.protocol_id,approval_date: $scope.consentDoc.approval_date}),
            scope: $scope,
            title: i18next.t('general-settings.consent-found'),
            buttons: [
            // {text: "<a href='https://e-mission.eecs.berkeley.edu/consent'>View</a>",
            //  type: 'button-calm'},
            {text: "<b>"+ i18next.t('general-settings.consented-ok') +"</b>",
             type: 'button-positive'} ]
        }).finally(function(res) {
            $scope.consentDoc = null;
        });
    }

    //in ProfileSettings in DevZone (above two functions are helpers)
    $scope.checkConsent = function() {
        StartPrefs.getConsentDocument().then(function(resultDoc){
            if (resultDoc == null) {
                handleNoConsent(resultDoc);
            } else {
                handleConsent(resultDoc);
            }
        }, function(error) {
            Logger.displayError("Error reading consent document from cache", error)
        });
    }

    var prepopulateMessage = {
        message: i18next.t('general-settings.share-message'), // not supported on some apps (Facebook, Instagram)
        subject: i18next.t('general-settings.share-subject'), // fi. for email
        url: i18next.t('general-settings.share-url')
    }

    $scope.share = function() {
        window.plugins.socialsharing.shareWithOptions(prepopulateMessage, function(result) {
            console.log("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
            console.log("Shared to app: " + result.app); // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
        }, function(msg) {
            console.log("Sharing failed with message: " + msg);
        });
    }

    $scope.shareQR = function() {
        /*code adapted from demo of react-qr-code
        selector below gets svg element out of angularized QRCode 
        this will change upon later migration*/
        const svg = document.querySelector("qr-code svg");
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();

        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL("image/png");

            var prepopulateQRMessage = {}; 
            prepopulateQRMessage.files = [pngFile];
            prepopulateQRMessage.url = $scope.settings.auth.opcode;
    
            window.plugins.socialsharing.shareWithOptions(prepopulateQRMessage, function(result) {
                console.log("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
                console.log("Shared to app: " + result.app); // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
            }, function(msg) {
                console.log("Sharing failed with message: " + msg);
            });
        }
        img.src =  `data:image/svg+xml;base64,${btoa(svgData)}`;
    }

});
