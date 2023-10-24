import React, { useEffect } from 'react';

// Simulate Ionic and i18next
const ionic = {
  Platform: {
    isIOS: () => true,
    isAndroid: () => true,
  };

const i18next = {
  t: (text: string) => text,
};

interface EmailHelperProps {
  database: string;
}

const getEmailConfig = (): Promise<string[]> => {
  return new Promise<string[]>(function (resolve, reject) {
    window.Logger.log(window.Logger.LEVEL_INFO, "About to get email config");
    setTimeout(() => {
      const emailConfig = "k.shankari@nrel.gov"; // Simulated email address
      window.Logger.log(window.Logger.LEVEL_DEBUG, "emailConfigString = " + emailConfig);
      resolve([emailConfig]);
    });
  });
};

const sendEmail = ({ database }: EmailHelperProps) => {
  let parentDir = "unknown";

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

  alert(i18next.t('email-service.going-to-email', { parentDir: parentDir }));

  const email = {
    to: "k.shankari@nrel.gov", // Simulated email address
    attachments: [parentDir],
    subject: i18next.t('email-service.email-log.subject-logs'),
    body: i18next.t('email-service.email-log.body-please-fill-in-what-is-wrong'),
  };

  (window as any).cordova.plugins.email.open(email, function () {
    window.Logger.log("email app closed while sending, " + JSON.stringify(email) + " not sure if we should do anything");
    // alert(i18next.t('email-service.no-email-address-configured') + err);
    return;
  });
};

const EmailHelper: React.FC<EmailHelperProps> = ({ database }) => {
  useEffect(() => {
    sendEmail({ database });
  }, [database]);

  return <div>Send Email</div>;
};

export default EmailHelper;
