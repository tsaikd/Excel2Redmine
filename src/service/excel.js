app

.factory("Excel"
	, [       "$q", "$filter", "Redmine", "Config"
	, function($q,   $filter,   Redmine,   Config) {

	function Excel() {}

	var redmineParams = {
		limit: 5000
	};
	var cache = {};

	function loadRedmine() {
		var deferred = $q.defer();

		var cachekey = "loadRedmine";
		if (cache[cachekey]) {
			deferred.resolve(cache[cachekey]);
			return deferred.promise;
		}

		$q.all([
			Redmine.trackers({ params: redmineParams }),
			Redmine.Issue.status({ params: redmineParams }),
			Redmine.priorities({ params: redmineParams }),
			Redmine.customFields({ params: redmineParams })
		]).then(function(data) {
			cache[cachekey] = {
				trackers: data[0].data.trackers,
				issue_statuses: data[1].data.issue_statuses,
				issue_priorities: data[2].data.issue_priorities,
				custom_fields: data[3].data.custom_fields
			};
			deferred.resolve(cache[cachekey]);
		}, function(data) {
			deferred.reject(data);
		});

		return deferred.promise;
	};
	// preload and cache redmine request
	loadRedmine();

	function loadProjectInfo(projectId) {
		var deferred = $q.defer();

		if (!projectId) {
			deferred.reject({
				message: "invalid project id"
			});
			return deferred.promise;
		}

		var cachekey = "loadProjectInfo/" + projectId;
		if (cache[cachekey]) {
			deferred.resolve(cache[cachekey]);
			return deferred.promise;
		}

		$q.all([
			Redmine.Project.categories({ id:projectId, params: redmineParams }),
			Redmine.Project.memberships({ id:projectId, params: redmineParams }),
			Redmine.Project.versions({ id:projectId, params: redmineParams })
		]).then(function(data) {
			cache[cachekey] = {
				issue_categories: data[0].data.issue_categories,
				memberships: data[1].data.memberships,
				versions: data[2].data.versions
			};
			deferred.resolve(cache[cachekey]);
		}, function(data) {
			deferred.reject(data);
		});

		return deferred.promise;
	}

	function getDefFieldValue(defFieldValMap, key, defvalue) {
		if (defFieldValMap[key]) {
			return defFieldValMap[key].value;
		}
		return defvalue;
	}

	function genFieldInfos(projectId, defFieldValMap) {
		var deferred = $q.defer();

		$q.all([
			loadRedmine(),
			loadProjectInfo(projectId)
		]).then(function(data) {
			data = angular.extend({}, data[0], data[1]);
			var fieldInfos = [
				{
					key: "subject",
					names: ["Subject", "主旨"],
					field_format: "string",
					default_value: getDefFieldValue(defFieldValMap, "subject"),
					nullable: false
				},
				{
					key: "description",
					names: ["Description", "概述"],
					field_format: "string",
					default_value: getDefFieldValue(defFieldValMap, "description"),
					nullable: true
				},
				{
					key: "tracker_id",
					names: ["Tracker", "追蹤標籤"],
					field_format: "enum",
					default_value: getDefFieldValue(defFieldValMap, "tracker_id"),
					nullable: false,
					possible_values: data["trackers"]
				},
				{
					key: "status_id",
					names: ["Status", "狀態"],
					field_format: "enum",
					default_value: getDefFieldValue(defFieldValMap, "status_id"),
					nullable: false,
					possible_values: data["issue_statuses"]
				},
				{
					key: "priority_id",
					names: ["Priority", "優先權"],
					field_format: "enum",
					default_value: getDefFieldValue(defFieldValMap, "priority_id"),
					nullable: false,
					possible_values: data["issue_priorities"]
				},
				{
					key: "start_date",
					names: ["Start Date", "開始日期"],
					field_format: "date",
					default_value: getDefFieldValue(defFieldValMap, "start_date"),
					nullable: true
				},
				{
					key: "due_date",
					names: ["Due Date", "完成日期"],
					field_format: "date",
					default_value: getDefFieldValue(defFieldValMap, "due_date"),
					nullable: true
				},
				{
					key: "category_id",
					names: ["Category", "分類"],
					field_format: "enum",
					default_value: getDefFieldValue(defFieldValMap, "category_id"),
					nullable: true,
					possible_values: data["issue_categories"]
				},
				{
					key: "fixed_version_id",
					names: ["Target version", "版本"],
					field_format: "enum",
					default_value: getDefFieldValue(defFieldValMap, "fixed_version_id"),
					nullable: true,
					possible_values: data["versions"]
				},
				{
					key: "assigned_to_id",
					names: ["Assignee", "分派給"],
					field_format: "enum",
					default_value: getDefFieldValue(defFieldValMap, "assigned_to_id"),
					nullable: true,
					possible_values: data["memberships"].map(function(membership) {
						return membership.user;
					})
				},
				{
					key: "parent_issue_id",
					names: ["Parent task", "父問題"],
					field_format: "int",
					default_value: getDefFieldValue(defFieldValMap, "parent_issue_id"),
					nullable: true
				},
				{
					key: "watcher_user_ids",
					names: ["Watchers", "監看者"],
					field_format: "enum",
					default_value: getDefFieldValue(defFieldValMap, "watcher_user_ids"),
					nullable: true,
					possible_values: data["memberships"].map(function(membership) {
						return membership.user;
					})
				},
				{
					key: "is_private",
					names: ["Private", "私人"],
					field_format: "bool",
					default_value: getDefFieldValue(defFieldValMap, "is_private"),
					nullable: true
				},
				{
					key: "estimated_hours",
					names: ["Estimated time", "預估工時"],
					field_format: "int",
					default_value: getDefFieldValue(defFieldValMap, "estimated_hours"),
					nullable: true
				},
				{
					key: "done_ratio",
					names: ["% Done", "完成百分比"],
					field_format: "int",
					default_value: getDefFieldValue(defFieldValMap, "done_ratio"),
					nullable: true
				}
			];
			data["custom_fields"].forEach(function(field) {
				var defvalue = {};
				if (getDefFieldValue(defFieldValMap, field.name) !== undefined) {
					defvalue.default_value = getDefFieldValue(defFieldValMap, field.name);
				}

				fieldInfos.push(angular.extend({}, field, {
					key: "custom_fields",
					names: [field.name],
					nullable: true
				}, defvalue));
			});
			deferred.resolve(fieldInfos);
		}, function(data) {
			deferred.reject(data);
		});

		return deferred.promise;
	}

	function genFieldMap(projectId) {
		var deferred = $q.defer();
		var fieldMap = {};

		var field_filter_map = {
			"string": function(field, value) {
				value = value.trim();
				if (value) {
					return value;
				}
				return field.default_value || undefined;
			},
			"bool": function(field, value) {
				value = value.trim().toLowerCase() || field.default_value;
				switch (value) {
				case "1":
				case "true":
				case "yes":
				case "y":
				case "v":
				case "checked":
					return true;
				case "0":
				case "false":
				case "no":
				case "n":
				case "":
					return false;
				}
				return undefined;
			},
			"int": function(field, value) {
				value = parseInt(value);
				if (!isNaN(value)) {
					return value;
				}
				value = parseInt(field.default_value);
				if (!isNaN(value)) {
					return value;
				}
				return undefined;
			},
			"list": function(field, value) {
				if (Config.checkRedmineCustomFieldListInClient) {
					for (var i=0 ; i<field.possible_values.length ; i++) {
						if (value === field.possible_values[i].value) {
							return value;
						}
					}
					if (value) {
						return undefined;
					}
					return field.default_value || undefined;
				} else {
					return value || field.default_value || undefined;
				}
			},
			"enum": function(field, value) {
				var enumArray = field.possible_values;
				if (!enumArray || !enumArray.length) {
					return undefined;
				}
				if (value) {
					for (var i=0 ; i<enumArray.length ; i++) {
						var enumInfo = enumArray[i];
						if (value == enumInfo.name) {
							return +enumInfo.id;
						}
					}
					return undefined;
				}
				value = parseInt(field.default_value);
				if (!isNaN(value)) {
					return value;
				}
				return undefined;
			},
			"date": function(field, value) {
				var ma;
				var strdate;
				var date;
				value = value.trim() || field.default_value || "";
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

		var defFieldValMap = Config.defFieldValMap;
		genFieldInfos(projectId, defFieldValMap).then(function(fieldInfos){
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
		}, function(data) {
			deferred.reject(data);
		});

		return deferred.promise;
	}
	Excel.prototype.genFieldMap = genFieldMap;

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
			headerMap: {},
			xinfo: {},
			yinfo: {},
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
			sheet.yinfo[i] = { errorcount: 0 };
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

		var defFieldValMap = Config.defFieldValMap;

		// parse valid header row
		sheet.xaxis.forEach(function(x) {
			if (!sheet.data[x][1]) {
				return;
			}
			var headerInfo = fieldMap[sheet.data[x][1].value];
			if (!headerInfo) {
				return;
			}
			var header = {
				key: headerInfo.key,
				x: x,
				info: headerInfo
			};
			sheet.headers.push(header);
			sheet.headerMap[headerInfo.key] = header;
			sheet.xinfo[x].exist = true;

			sheet.yaxis.slice(1).forEach(function(y) {
				var data = sheet.data[x][y] = sheet.data[x][y] || { value: "" };
				data.filtered = headerInfo.filter(headerInfo, data.value);
				if (data.filtered === undefined) {
					if (data.value == "") {
						if (headerInfo.nullable) {
							data.valid = true;
						} else {
							data.valid = false;
						}
					} else {
						data.valid = false;
					}
				} else {
					switch (headerInfo.field_format) {
					case "date":
					case "enum":
					case "list":
						if (!data.value) {
							data.warn = true;
						}
						break;
					default:
						if (data.value != data.filtered) {
							data.warn = true;
						}
						break;
					}
					data.valid = true;
				}
				if (!data.valid) {
					sheet.yinfo[y].errorcount++;
				}
			});
		});

		return sheet;
	}

	function handleWorkbook(workbook, projectId) {
		var deferred = $q.defer();

		genFieldMap(projectId).then(function(fieldMap) {
			var sheets = [];
			workbook.SheetNames.forEach(function(sheetName) {
				var sheet = handleWorkbookSheet(workbook.Sheets[sheetName], sheetName, fieldMap);
				if (sheet) {
					sheets.push(sheet);
				}
			});
			deferred.resolve(sheets);
		}, function(data) {
			deferred.reject(data);
		});

		return deferred.promise;
	}

	Excel.prototype.parseFile = function(file, projectId) {
		var deferred = $q.defer();
		var startTime = new Date().getTime();

		var reader = new FileReader();
		reader.onload = function(e) {
			var data = e.target.result;
			var wb;
			try {
				wb = XLSX.read(data, {type: "binary"});
				handleWorkbook(wb, projectId).then(function(data) {
					ga("send", "timing", "excel", "parseFile", new Date().getTime() - startTime, "Success");
					deferred.resolve(data);
				}, function(data) {
					ga("send", "timing", "excel", "parseFile", new Date().getTime() - startTime, "Failure");
					deferred.reject(data);
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
