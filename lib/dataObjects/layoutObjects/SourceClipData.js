/* global SOURCE_FLAG */
require('../PlayServerConstants');
/**
 * Source clip is reference to the real content video link
 * @param offset of the original content timeline
 * @param path to the mp4
 * @constructor
 */
class SourceClipData
{
	constructor(offset, path)
	{
		this.clipFrom = offset;
		this.path = path;
	}

	toJSON()
	{
		return { type: SOURCE_FLAG, path: this.path, clipFrom: this.clipFrom };
	}

}
module.exports = SourceClipData;
