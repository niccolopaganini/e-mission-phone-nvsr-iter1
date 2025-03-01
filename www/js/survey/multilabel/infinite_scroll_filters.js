'use strict';

/*
 * The general structure of this code is that all the timeline information for
 * a particular day is retrieved from the Timeline factory and put into the scope.
 * For best performance, all data should be loaded into the in-memory timeline,
 * and in addition to writing to storage, the data should be written to memory.
 * All UI elements should only use $scope variables.
 */

import angular from 'angular';

angular.module('emission.survey.multilabel.infscrollfilters',[
    'emission.plugin.logger'
  ])
.factory('MultiLabelInfScrollFilters', function(Logger){
    var sf = {};
    var unlabeledCheck = function(t) {
       return t.INPUTS
           .map((inputType, index) => !angular.isDefined(t.userInput[inputType]))
           .reduce((acc, val) => acc || val, false);
    }

    var invalidCheck = function(t) {
       const retVal = 
           (angular.isDefined(t.userInput['MODE']) && t.userInput['MODE'].value === 'pilot_ebike') &&
           (!angular.isDefined(t.userInput['REPLACED_MODE']) ||
            t.userInput['REPLACED_MODE'].value === 'pilot_ebike' ||
            t.userInput['REPLACED_MODE'].value === 'same_mode');
       return retVal;
    }

    var toLabelCheck = function(trip) {
        if (angular.isDefined(trip.expectation)) {
            console.log(trip.expectation.to_label)
            return trip.expectation.to_label && unlabeledCheck(trip);
        } else {
            return true;
        }
    }

    sf.UNLABELED = {
        key: "unlabeled",
        text: i18next.t("diary.unlabeled"),
        filter: unlabeledCheck,
        width: "col-50"
    }

    sf.INVALID_EBIKE = {
        key: "invalid_ebike",
        text: i18next.t("diary.invalid-ebike"),
        filter: invalidCheck
    }

    sf.TO_LABEL = {
        key: "to_label",
        text: i18next.t("diary.to-label"),
        filter: toLabelCheck,
        width: "col-50"
    }

    sf.configuredFilters = [
        sf.TO_LABEL,
        sf.UNLABELED
    ];
    return sf;
});
