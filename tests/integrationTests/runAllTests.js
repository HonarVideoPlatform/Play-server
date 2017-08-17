const util = require('util');
const fs = require('fs');
const chai = require('chai');
const child_process = require('child_process');
const kalturaClient = require('../../lib/client/KalturaClient');
const testingHelper = require('./../infra/testingHelper');
const config = require('../../lib/utils/KalturaConfig');

const resourcesPath = KalturaConfig.config.testing.resourcesPath;
const serviceUrl = KalturaConfig.config.testing.serviceUrl;
const nginxHost = KalturaConfig.config.testing.nginxHost;
const nginxPass = KalturaConfig.config.testing.nginxPass;
const impersonatePartnerId = KalturaConfig.config.testing.impersonatePartnerId;
const secretImpersonatePartnerId = KalturaConfig.config.testing.secretImpersonatePartnerId;
const testsPath = KalturaConfig.config.testing.testsPath;

const playServerTestingHelper = testingHelper.PlayServerTestingHelper;
let sessionClient = null;

function testInit(client) {
    sessionClient = client;
    let entry;
    playServerTestingHelper.createEntry(sessionClient, resourcesPath + "/2MinVideo.mp4", null)
        .then(function (resultEntry) {
                entry = resultEntry;
                console.log(" got " + entry.id);
                console.log(" reading path: " + testsPath);
                var files = fs.readdirSync(testsPath);
                console.log(" got " + files);
                for (var i = 0; i < files.length; i++) {
                    let fileName = files[i];
                    if (fileName.split('.')[1] == 'js' && fileName != 'runAllTests.js'){
                        console.log("Serving " + fileName);
                        let command = 'env reRunTest=0 entryId=' + entry.id + ' mocha -R xunit ' + testsPath + '/' + fileName + ' | tee -a /tmp/results.xml';
                        console.log("Running: " + command);
                        let code = child_process.execSync(command);
                        playServerTestingHelper.printStatus(code);
                        playServerTestingHelper.execUpdateEntryVersion(entry.id);
                        sleepFor(2000);
                    }
                }

                playServerTestingHelper.deleteEntry(sessionClient, entry, 'true').then(function (results) {
                    playServerTestingHelper.printInfo("Run All Tests Finished");
                }, function (err) {
                    playServerTestingHelper.printError(err);
                });
            },
            function (err) {
                playServerTestingHelper.printError(err);
            });
}


function sleepFor( sleepDuration ){
    var now = new Date().getTime();
    while(new Date().getTime() < now + sleepDuration){ /* do nothing */ }
}

playServerTestingHelper.initTestHelper(serviceUrl, impersonatePartnerId, secretImpersonatePartnerId);
playServerTestingHelper.initClient(playServerTestingHelper.serverHost, playServerTestingHelper.partnerId, playServerTestingHelper.adminSecret, testInit);