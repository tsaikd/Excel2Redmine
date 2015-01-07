Excel2Redmine
=============

[Excel2Redmine]: http://tsaikd.org/Excel2Redmine/
[Redmine]: http://www.redmine.org/
[Redmine CORS]: http://www.redmine.org/plugins/redmine_cors

Excel2Redmine is a web tool for importing excel data to redmine

## Requirement

* [Redmine][] 2.5.3
* [Redmine CORS][] Plugin

## [Redmine][] setup

* Enable REST web service and JSONP
	* Administration -> Settings -> Authentication
		* check `Enable REST web service`
		* check `Enable JSONP support`
* Install [Redmine CORS][] Plugin
	* See [official wiki](http://www.redmine.org/projects/redmine/wiki/Plugins) for more information

## [Excel2Redmine][] setup

* API Key
	* find the key from your Redmine -> My account -> API access key -> Show
* Redmine URL
	* fill with your Redmine URL, e.g. http://redmine.my.local.net or http://192.168.1.1

## Usage

* Go to Excel2Redmine tab
* Select project which you want to import issues
	* if you are using at first time, try to reload the web to get the latest project list
* Select excel file from your disk
	* or download xlsx file from [this Google Doc sample](https://docs.google.com/spreadsheets/d/1_MWLOIKyQRrqc0kyuWRmSbmpXdv12c5ciAp-N9fdQ7o/edit?usp=sharing)
* Check excel content is correct form
	* first row is headers
		* valid header will display in `GREEN` background
		* invalid header will display in `YELLOW` background and ignore
	* data start from second row
		* valid data will display in `GREEN` background
		* invalid data will display in `PINK` background
* Click `Import` to start to import data into your Redmine
	* each row will import as a issue
	* row with any invalid data will skip
* Import result will display at the left hand side of excel
	* success imported row will check the box in `GREEN` background
	* failure imported row will check the box in `RED` background

## Screenshot

![](doc/screenshot.png)
