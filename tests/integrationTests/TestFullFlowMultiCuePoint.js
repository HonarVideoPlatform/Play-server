const os = require('os');
const util = require('util');
const fs = require('fs');
const chai = require('chai');
const child_process = require('child_process');
const kalturaClient = require('../../lib/client/KalturaClient');
const testingHelper = require('./../infra/testingHelper');
const config = require('../../lib/utils/KalturaConfig');

let Promise = require("bluebird");

const resourcesPath = KalturaConfig.config.testing.resourcesPath;
const outputDir = KalturaConfig.config.testing.outputPath;
const beaconTrackingDir = outputDir  + '/beaconTracking';
const serviceUrl = KalturaConfig.config.testing.serviceUrl;
const impersonatePartnerId = KalturaConfig.config.testing.impersonatePartnerId;
const secretImpersonatePartnerId = KalturaConfig.config.testing.secretImpersonatePartnerId;

let playServerTestingHelper = testingHelper.PlayServerTestingHelper;
let sessionClient = null;
let cuePointList = [];
let entry = null;
let DoneMethod = null;

class TestFullFlowMultiCuePoint {

	static ValidateAll(qrCodesResults) {
		return new Promise(function (resolve, reject) {
			playServerTestingHelper.printStatus('Validating Ads and Videos according to CuePoints...');
			let errorsArray = [];
			for (let i = 0; i < qrCodesResults.length; i++) {
				if (!TestFullFlowMultiCuePoint.validateQrResult(qrCodesResults[i])) {
					if (qrCodesResults[i].ad)
						errorsArray.push('FAIL - Found Ad thumb at time: [' + qrCodesResults[i].thumbTime + " seconds] from beginning if video but Ad cue point is not defined for that time");
					else
						errorsArray.push('FAIL - Found video thumb at time: [' + qrCodesResults[i].thumbTime + " seconds] from beginning if video but Ad cue point is defined for that time");
				}
			}
			if (errorsArray.length > 0) {
				for (let i = 0; i < errorsArray.length; i++)
					playServerTestingHelper.printError(errorsArray[i]);
				reject(false);
			} else {
				playServerTestingHelper.printOk('All Ads and Videos were Validated Successfully...');
				resolve(true);
			}
		});
	}

	static validateQrResult(qrCodeItem) {
		if (qrCodeItem.ad)
			return TestFullFlowMultiCuePoint.isValidAd(qrCodeItem);
		else // case of thumb not of a ad - should not be in time of a cuePoint
			return !TestFullFlowMultiCuePoint.isValidAd(qrCodeItem);
	}

	static isValidAd(qrCodeItem){
		let timeInMillis = qrCodeItem.thumbTime * 1000;
		for (let i = 0; i < cuePointList.length; i++) {
			if (timeInMillis >= cuePointList[i].startTime && timeInMillis <= (cuePointList[i].startTime + cuePointList[i].duration - 500)) {
				return true;
			}
		}
		return false;
	}

	runTest(input, resolve, reject) {
		playServerTestingHelper.generateThumbsFromM3U8Promise(input.m3u8Url, input.outputDir)
			.then(function () {
				playServerTestingHelper.getThumbsFileNamesFromDir(input.outputDir)
					.then(function (filenames) {
						playServerTestingHelper.readQrCodesFromThumbsFileNames(input.outputDir, filenames, function (results) {
							TestFullFlowMultiCuePoint.ValidateAll(results).then(function () {
									resolve(true);
								}
								, reject);
						}, reject);
					}).catch(function () {
					reject(false);
				});
			})
			.catch(function () {
				reject(false);
			});
	}

}



describe('test full flow', function () {
	it('test - Multi cue points', function (done) {
		this.timeout(480000);
		DoneMethod = done;
		playServerTestingHelper.initTestHelper(serviceUrl, impersonatePartnerId, secretImpersonatePartnerId);
		playServerTestingHelper.initClient(playServerTestingHelper.serverHost, playServerTestingHelper.partnerId, playServerTestingHelper.adminSecret, testInit);
	});
});

function finishTest(res) {
	if (res)
		playServerTestingHelper.printOk("test SUCCESS");
	else
		playServerTestingHelper.printError("test FAIL");
	playServerTestingHelper.deleteCuePoints(sessionClient, cuePointList, function () {
		playServerTestingHelper.deleteEntry(sessionClient, entry).then(function (results) {
			playServerTestingHelper.printInfo("return from delete entry");
			if (res)
				DoneMethod();
			else
				DoneMethod('Test FAIL');
		});
	}, function (err) {
		playServerTestingHelper.printError(err);
		if (res)
			DoneMethod();
		else
			DoneMethod('Test failed');
	});
}


function testInit(client) {
	cuePointList = [];	
	sessionClient = client;
	let testFullFlowMultiCuePoint = new TestFullFlowMultiCuePoint();
	let testName = 'fullFlowMultiCuePointTest';

	let videoThumbDir = outputDir + '/' + testName +'/';

	if (!fs.existsSync(videoThumbDir))
		fs.mkdirSync(videoThumbDir);
	let aggregateAdTime = 0;
	playServerTestingHelper.createEntry(sessionClient, resourcesPath + "/2MinVideo.mp4", process.env.entryId)
		.then(function (resultEntry) {
			entry = resultEntry;
			return playServerTestingHelper.createCuePoint(sessionClient, entry, 30000, 15000);
		})
		.then(function (cuePoint) {
			cuePoint.startTime = cuePoint.startTime + aggregateAdTime; //So we can know when the add will actually play
			aggregateAdTime += cuePoint.duration + 2000;//extra two seconds because we stitch the last two seconds to the end of the ad
			cuePointList.push(cuePoint);
			return playServerTestingHelper.createCuePoint(sessionClient, entry, 36000, 15000);
		})
		.then(function (cuePoint) {
			cuePoint.startTime = cuePoint.startTime + aggregateAdTime; //So we can know when the add will actually play
			aggregateAdTime += cuePoint.duration + 2000;//extra two seconds because we stitch the last two seconds to the end of the ad
			cuePointList.push(cuePoint);
			return playServerTestingHelper.createCuePoint(sessionClient, entry, 50000, 15000);
		})
		.then(function (cuePoint) {
			cuePoint.startTime = cuePoint.startTime + aggregateAdTime;
			aggregateAdTime += cuePoint.duration + 2000;//extra two seconds because we stitch the last two seconds to the end of the ad
			cuePointList.push(cuePoint);
			return playServerTestingHelper.createCuePoint(sessionClient, entry, 90000, 15000);
		})
		.then(function (cuePoint) {
			cuePoint.startTime = cuePoint.startTime + aggregateAdTime;
			aggregateAdTime += cuePoint.duration + 2000;
			cuePointList.push(cuePoint);
			return playServerTestingHelper.buildM3U8Url(sessionClient, entry);
		})
		.then(function (m3u8Url) {
			let input = [];
			input.m3u8Url = m3u8Url;
			input.outputDir = videoThumbDir;

			playServerTestingHelper.getVideoSecBySec(input.m3u8Url, 30, function () {
				let testFullFlowMultiCuePoint = new TestFullFlowMultiCuePoint();
				return playServerTestingHelper.testInvoker(testName, testFullFlowMultiCuePoint, input, null, finishTest);
			});
		})
		.catch(playServerTestingHelper.printError);
}
