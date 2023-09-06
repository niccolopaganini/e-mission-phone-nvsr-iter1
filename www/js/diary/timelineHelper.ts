import moment from "moment";
import { getAngularService } from "../angular-react-helper";
import { getFormattedDate, getFormattedDateAbbr, getFormattedTimeRange, getLocalTimeString, getPercentages, isMultiDay } from "./diaryHelper";

/**
 * @description Unpacks composite trips into a Map object of timeline items, by id.
 *        The Map object is used here because 1) it is ordered, and 2) it prevents duplicate keys --
 *         this way trip A's end place is not duplicated as trip B's start place.
 * @param ctList a list of composite trips
 * @param unpackPlaces whether to unpack the start and end places of each composite trip into the Map
 * @returns a Map() of timeline items, by id
 */
export function compositeTrips2TimelineMap(ctList: any[], unpackPlaces?: boolean) {
  const timelineEntriesMap = new Map();
  ctList.forEach((cTrip) => {
    if (unpackPlaces) {
      const start_place = cTrip.start_confirmed_place;
      const end_place = cTrip.end_confirmed_place;
      if (start_place && (isNaN(start_place.duration) || start_place.duration >= 60)) {
        timelineEntriesMap.set(start_place._id.$oid, start_place);
      }
      timelineEntriesMap.set(cTrip._id.$oid, cTrip);
      if (end_place && (isNaN(end_place.duration) || end_place.duration >= 60)) {
        timelineEntriesMap.set(end_place._id.$oid, end_place);
      }
    } else {
      timelineEntriesMap.set(cTrip._id.$oid, cTrip);
    }
  });
  return timelineEntriesMap;
}

export function populateCompositeTrips(ctList, showPlaces, labelsFactory, labelsResultMap, notesFactory, notesResultMap) {
  ctList.forEach((ct, i) => {
    if (showPlaces && ct.start_confirmed_place) {
      const cp = ct.start_confirmed_place;
      cp.getNextEntry = () => ctList[i];
      labelsFactory.populateInputsAndInferences(cp, labelsResultMap);
      notesFactory.populateInputsAndInferences(cp, notesResultMap);
    }
    if (showPlaces && ct.end_confirmed_place) {
      const cp = ct.end_confirmed_place;
      cp.getNextEntry = () => ctList[i + 1];
      labelsFactory.populateInputsAndInferences(cp, labelsResultMap);
      notesFactory.populateInputsAndInferences(cp, notesResultMap);
      ct.getNextEntry = () => cp;
    } else {
      ct.getNextEntry = () => ctList[i + 1];
    }
    labelsFactory.populateInputsAndInferences(ct, labelsResultMap);
    notesFactory.populateInputsAndInferences(ct, notesResultMap);
  });
}

const getUnprocessedInputQuery = (pipelineRange) => ({
  key: "write_ts",
  startTs: pipelineRange.end_ts - 10,
  endTs: moment().unix() + 10
});

function getUnprocessedResults(labelsFactory, notesFactory, labelsPromises, notesPromises) {
  return Promise.all([...labelsPromises, ...notesPromises]).then((comboResults) => {
    const labelsConfirmResults = {};
    const notesConfirmResults = {};
    const labelResults = comboResults.slice(0, labelsPromises.length);
    const notesResults = comboResults.slice(labelsPromises.length);
    labelsFactory.processManualInputs(labelResults, labelsConfirmResults);
    notesFactory.processManualInputs(notesResults, notesConfirmResults);
    return [labelsConfirmResults, notesConfirmResults];
  });
}

/**
 * @description Gets unprocessed inputs (labels or Enketo responses) that were recorded after the given
 * pipeline range and have not yet been pushed to the server.
 * @param pipelineRange an object with start_ts and end_ts representing the range of time
 *     for which travel data has been processed through the pipeline on the server
 * @param labelsFactory the Angular factory for processing labels (MultilabelService or
 *     EnketoTripButtonService)
 * @param notesFactory the Angular factory for processing notes (EnketoNotesButtonService)
 * @returns Promise an array with 1) results for labels and 2) results for notes
 */
export function getLocalUnprocessedInputs(pipelineRange, labelsFactory, notesFactory) {
  const BEMUserCache = window['cordova'].plugins.BEMUserCache;
  const tq = getUnprocessedInputQuery(pipelineRange);
  const labelsPromises = labelsFactory.MANUAL_KEYS.map((key) =>
    BEMUserCache.getMessagesForInterval(key, tq, true).then(labelsFactory.extractResult)
  );
  const notesPromises = notesFactory.MANUAL_KEYS.map((key) =>
    BEMUserCache.getMessagesForInterval(key, tq, true).then(notesFactory.extractResult)
  );
  return getUnprocessedResults(labelsFactory, notesFactory, labelsPromises, notesPromises);
}

/**
 * @description Gets all unprocessed inputs (labels or Enketo responses) that were recorded after the given
 * pipeline range, including those on the phone and that and have been pushed to the server but not yet processed.
 * @param pipelineRange an object with start_ts and end_ts representing the range of time
 *     for which travel data has been processed through the pipeline on the server
 * @param labelsFactory the Angular factory for processing labels (MultilabelService or
 *     EnketoTripButtonService)
 * @param notesFactory the Angular factory for processing notes (EnketoNotesButtonService)
 * @returns Promise an array with 1) results for labels and 2) results for notes
 */
export function getAllUnprocessedInputs(pipelineRange, labelsFactory, notesFactory) {
  const UnifiedDataLoader = getAngularService('UnifiedDataLoader');
  const tq = getUnprocessedInputQuery(pipelineRange);
  const labelsPromises = labelsFactory.MANUAL_KEYS.map((key) =>
    UnifiedDataLoader.getUnifiedMessagesForInterval(key, tq, true).then(labelsFactory.extractResult)
  );
  const notesPromises = notesFactory.MANUAL_KEYS.map((key) =>
    UnifiedDataLoader.getUnifiedMessagesForInterval(key, tq, true).then(notesFactory.extractResult)
  );
  return getUnprocessedResults(labelsFactory, notesFactory, labelsPromises, notesPromises);
}
