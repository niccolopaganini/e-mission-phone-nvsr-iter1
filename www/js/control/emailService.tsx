import React from 'react';

interface EmailHelperProps {
  window: Window;
  fetch: typeof fetch;
  Logger: LoggerPlugin;
}

const EmailHelper: React.FC<EmailHelperProps> = ({ window, fetch, Logger }) => {
  const getEmailConfig = async (): Promise<string[]> => {
    Logger.log(Logger.LEVEL_INFO, "About to get email config");
    await new Promise((resolve) => setTimeout(resolve, 1000)); 
    const emailConfig = "k.shankari@nrel.gov"; 
    Logger.log(Logger.LEVEL_DEBUG, "emailConfigString = " + emailConfig);
    return [emailConfig];
  };

  const hasAccount = async (): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      window['cordova'].plugins.email.hasAccount((hasAct: boolean) => {
        resolve(hasAct);
      });
    });
  };

  const sendEmail = (database: string) => {
    Promise.all([getEmailConfig(), hasAccount()]).then(([address, hasAct]) => {
      let parentDir = "unknown";

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

      Logger.log(Logger.LEVEL_INFO, "Going to email " + database);
      parentDir = parentDir + "/" + database;

      alert(i18next.t('email-service.going-to-email', { parentDir: parentDir }));

      const email = {
        to: address,
        attachments: [parentDir],
        subject: i18next.t('email-service.email-log.subject-logs'),
        body: i18next.t('email-service.email-log.body-please-fill-in-what-is-wrong'),
      };

      window['cordova'].plugins.email.open(email, () => {
        Logger.log("email app closed while sending, " + JSON.stringify(email) + " not sure if we should do anything");
        return;
      });
    });
  };

  return null;
};

export default EmailHelper;
