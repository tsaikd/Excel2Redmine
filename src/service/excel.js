app

.factory("Excel"
	, [       "$q", "$filter", "Redmine"
	, function($q,   $filter,   Redmine) {

	function Excel() {}

	var cache = {};

	function loadRedmine() {
		var deferred = $q.defer();

		if (cache["loadRedmine"]) {
			deferred.resolve(cache["loadRedmine"]);
			return deferred.promise;
		}

		$q.all([
			Redmine.trackers(),
			Redmine.Issue.status(),
			Redmine.priorities(),
			Redmine.customFields()
		]).then(function(data) {
			cache["loadRedmine"] = {
				trackers: data[0].data.trackers,
				issue_statuses: data[1].data.issue_statuses,
				issue_priorities: data[2].data.issue_priorities,
				custom_fields: data[3].data.custom_fields
			};
			deferred.resolve(cache["loadRedmine"]);
		}, function(data) {
			deferred.reject(data);
		});

		return deferred.promise;
	};
	// cache redmine request
	loadRedmine();

	function genFieldInfos() {
		var deferred = $q.defer();

		loadRedmine().then(function(data) {
			var fieldInfos = [
				{
					key: "subject",
					names: ["Subject", "主旨"],
					field_format: "string",
					nullable: false
				},
				{
					key: "description",
					names: ["Description", "概述"],
					field_format: "string",
					nullable: true
				},
				{
					key: "tracker_id",
					names: ["Tracker", "追蹤標籤"],
					field_format: "enum",
					nullable: false,
					possible_values: data["trackers"]
				},
				{
					key: "status_id",
					names: ["Status", "狀態"],
					field_format: "enum",
					nullable: false,
					possible_values: data["issue_statuses"]
				},
				{
					key: "priority_id",
					names: ["Priority", "優先權"],
					field_format: "enum",
					nullable: false,
					possible_values: data["issue_priorities"]
				},
				{
					key: "start_date",
					names: ["Start Date", "開始日期"],
					field_format: "date",
					nullable: true
				},
				{
					key: "due_date",
					names: ["Due Date", "完成日期"],
					field_format: "date",
					nullable: true
				}
			];
			data["custom_fields"].forEach(function(field) {
				fieldInfos.push(angular.extend({}, field, {
					key: "custom_fields",
					names: [field.name],
					nullable: true
				}));
			});
			deferred.resolve(fieldInfos);
		});

		return deferred.promise;
	}

	function genFieldMap() {
		var deferred = $q.defer();
		var fieldMap = {};

		var field_filter_map = {
			"string": function(field, value) {
				value = "" + value;
				value = value.trim();
				return value ? value : undefined;
			},
			"bool": function(field, value) {
				value = "" + value;
				value = value.trim();
				switch (value) {
				case "1":
				case "true":
				case "checked":
					return true;
				case "0":
				case "false":
				case "":
					return false;
				}
				return undefined;
			},
			"int": function(field, value) {
				value = +value;
				return value === NaN ? undefined : value;
			},
			"list": function(field, value) {
				return value;
				/* check in server side
				for (var i=0 ; i<field.possible_values.length ; i++) {
					if (value === field.possible_values[i].value) {
						return value;
					}
				}
				return undefined;
				*/
			},
			"enum": function(field, value) {
				var enumArray = field.possible_values;
				if (!value || !enumArray || !enumArray.length) {
					return undefined;
				}
				for (var i=0 ; i<enumArray.length ; i++) {
					var enumInfo = enumArray[i];
					if (value == enumInfo.name) {
						return +enumInfo.id;
					}
				}
				return undefined;
			},
			"date": function(field, value) {
				var ma;
				var strdate;
				var date;
				value = "" + value;
				value = value.trim();
				if (ma = value.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)) {
					strdate = ma[1] + "-" + ma[2] + "-" + ma[3];
				} else if (ma = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/)) {
					strdate = "20" + ma[3] + "-" + ma[1] + "-" + ma[2];
				}
				if (strdate) {
					date = new Date(strdate);
					if (date) {
						return $filter("date")(date, "yyyy-MM-dd");
					}
				}
				return undefined;
			}
		};

		genFieldInfos().then(function(fieldInfos){
			fieldInfos.forEach(function(fieldInfo) {
				fieldInfo.filter = field_filter_map[fieldInfo["field_format"]];
				if (!fieldInfo.filter) {
					console.error("unknown field format: " + fieldInfo["field_format"], fieldInfo);
				}
				fieldInfo.names.forEach(function(name) {
					fieldMap[name] = fieldInfo;
				});
			});
			deferred.resolve(fieldMap);
		});

		return deferred.promise;
	}

	function x_axis_to_num(x) {
		x = x.toUpperCase();
		var num = 0;
		for (var i=0 ; i<x.length ; i++) {
			var code = x[i].charCodeAt() - "A".charCodeAt() + 1;
			num = num * 26 + code;
		}
		return num;
	}

	function num_to_x_axis(num) {
		var x = "";
		var xnum;
		var code;
		while (num > 0) {
			xnum = (num-1) % 26;
			num = parseInt((num-1) / 26);
			code = "A".charCodeAt() + xnum;
			x = String.fromCharCode(code) + x;
		}
		return x;
	}

	function next_x_axis(x) {
		var num = x_axis_to_num(x);
		return num_to_x_axis(num + 1);
	}

	function handleWorkbookSheet(wbSheet, sheetName, fieldMap) {
		var formulae = XLSX.utils.get_formulae(wbSheet);
		if (!formulae) {
			return;
		}

		var sheet = {
			name: sheetName,
			data: {},
			headers: [],
			xinfo: {},
			yinfo: {},
			stat: {
				errorcount: 0
			},
			xaxis: [],
			yaxis: []
		};

		var ref = wbSheet["!ref"].split(":")[1];
		if (!ref) {
			return;
		}

		var refx = ref.match(/[a-z]+/i); refx = refx && refx[0];
		var refy = ref.match(/[0-9]+/); refy = refy && +refy[0];
		for (var x="A" ; ; x=next_x_axis(x)) {
			sheet.xaxis.push(x);
			sheet.data[x] = {};
			sheet.xinfo[x] = {};
			if (x == refx) {
				break;
			}
		}
		for (var i=1 ; i<=refy ; i++) {
			sheet.yaxis.push(i);
			sheet.yinfo[i] = {};
		}

		formulae.forEach(function(cellraw) {
			var cellsplit = cellraw.split("='");
			var xy = cellsplit.shift();
			var x = xy.match(/[a-z]+/i); x = x && x[0];
			var y = xy.match(/[0-9]+/); y = y && +y[0];
			var text = cellsplit.join("='");
			sheet.data[x][y] = {
				value: text
			};
		});

		// parse valid header row
		sheet.xaxis.forEach(function(x) {
			if (!sheet.data[x][1]) {
				return;
			}
			var headerInfo = fieldMap[sheet.data[x][1].value];
			if (!headerInfo) {
				return;
			}
			sheet.headers.push({
				key: headerInfo.key,
				x: x,
				info: headerInfo
			});
			sheet.xinfo[x].exist = true;

			sheet.yaxis.forEach(function(y) {
				var data = sheet.data[x][y] = sheet.data[x][y] || {};
				data.filtered = headerInfo.filter(headerInfo, data.value);
				if (data.filtered) {
					data.valid = true;
				} else if (headerInfo.nullable) {
					data.valid = true;
				} else {
					data.valid = false;
				}
				if (data.valid) {
					sheet.stat.errorcount++;
				}
			});
		});

		return sheet;
	}

	function handleWorkbook(workbook) {
		var deferred = $q.defer();

		genFieldMap().then(function(fieldMap) {
			var sheets = [];
			workbook.SheetNames.forEach(function(sheetName) {
				var sheet = handleWorkbookSheet(workbook.Sheets[sheetName], sheetName, fieldMap);
				if (sheet) {
					sheets.push(sheet);
				}
			});
			deferred.resolve(sheets);
		});

		return deferred.promise;
	}

	Excel.prototype.parseFile = function(file) {
		var deferred = $q.defer();

		var reader = new FileReader();
		reader.onload = function(e) {
			var data = e.target.result;
			var wb;
			try {
				wb = XLSX.read(data, {type: "binary"});
				handleWorkbook(wb).then(function(data) {
					deferred.resolve(data);
				});
			} catch(e) {
				deferred.reject(e);
			}
		};
		reader.readAsBinaryString(file);

		return deferred.promise;
	};

	return new Excel();
}])

;
