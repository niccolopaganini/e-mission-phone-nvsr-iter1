import React from 'react';

import LoggerPlugin from 'emission.plugin.logger';

    .service('EmailHelper', function (window, fetch, Logger) {

        const getEmailConfig = function (): Promise<string[]> {
            return new Promise(function (resolve, reject) {
              window.Logger.log(window.Logger.LEVEL_INFO, "About to get email config");
              setTimeout(() => {
                const emailConfig = "k.shankari@nrel.gov"; // Simulated email address
          
                window.Logger.log(window.Logger.LEVEL_DEBUG, "emailConfigString = " + emailConfig);
                resolve([emailConfig]);
              }, 1000); // Simulate an asynchronous operation
            });
          };
          

          const hasAccount = (): Promise<boolean> => {
            return new Promise<boolean>((resolve, reject) => {
              window['cordova'].plugins.email.hasAccount((hasAct: boolean) => {
                resolve(hasAct);
              });
            });
          };

          
        this.sendEmail = function (database) {
            Promise.all([getEmailConfig(), hasAccount()]).then(function([address, hasAct]) {
                var parentDir = "unknown";

                if (ionic.Platform.isIOS() && !hasAct) {
                    alert(i18next.t('email-service.email-account-not-configured'));
                    return;
                }

                if (ionic.Platform.isAndroid()) {
                    parentDir = "app://databases";
                }
                if (ionic.Platform.isIOS()) {
                    alert(i18next.t('email-service.email-account-mail-app'));
                    parentDir = cordova.file.dataDirectory + "../LocalDatabase";
                }

                if (parentDir === "unknown") {
                    alert(`parentDir unexpectedly = ${parentDir}!`);
                  }

                window.Logger.log(window.Logger.LEVEL_INFO, "Going to email " + database);
                parentDir = parentDir + "/" + database;
                /*
                window.Logger.log(window.Logger.LEVEL_INFO,
                    "Going to export logs to "+parentDir);
                 */
                alert(i18next.t('email-service.going-to-email', { parentDir: parentDir }));
                var email = {
                    to: address,
                    attachments: [
                        parentDir
                    ],
                    subject: i18next.t('email-service.email-log.subject-logs'),
                    body: i18next.t('email-service.email-log.body-please-fill-in-what-is-wrong')
                }

                window['cordova']plugins.email.open(email, function () {
                  Logger.log("email app closed while sending, "+JSON.stringify(email)+" not sure if we should do anything");
                  // alert(i18next.t('email-service.no-email-address-configured') + err);
                  return;
                  });
            });
        };
});